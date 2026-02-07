/**
 * CRC Admin Module
 * 
 * Shared utilities for all admin/dashboard pages.
 * Handles role detection, permission checks, and common Supabase operations.
 * 
 * Role hierarchy:
 *   super_admin  → Everything. Site owner (is_admin = true in runner_profiles)
 *   admin        → Runs, games, profiles site-wide (moderators.can_manage_moderators)
 *   verifier     → Runs for assigned games only (moderators.assigned_games)
 *   user         → No dashboard access
 * 
 * Usage:
 *   import { CRCAdmin } from '/assets/js/admin.js';
 *   const role = await CRCAdmin.init();
 *   if (!role) { showAccessDenied(); return; }
 *   const runs = await CRCAdmin.getPendingRuns();
 */

import { CRCAuth } from './auth.js';

// =============================================================================
// State
// =============================================================================

let _role = null;          // 'super_admin' | 'admin' | 'verifier' | null
let _assignedGames = [];   // game_id[] for verifiers
let _profile = null;       // runner_profiles row
let _modRecord = null;     // moderators row (if exists)
let _initialized = false;
let _workerUrl = null;     // Cloudflare Worker URL for /approve endpoint

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initialize the admin module.
 * Checks auth, loads role from database.
 * Returns the role string, or null if no access.
 */
async function init() {
  if (_initialized) return _role;

  // Pick up Worker URL from page context (set by turnstile.html or admin pages)
  _workerUrl = window.CRC_RUN_SUBMIT_ENDPOINT || window.CRC_WORKER_URL || null;

  // Ensure auth is ready
  await CRCAuth.init();

  if (!CRCAuth.isSignedIn()) {
    _initialized = true;
    return null;
  }

  const supabase = CRCAuth.getSupabaseClient();
  const user = CRCAuth.getUser();
  if (!supabase || !user) {
    _initialized = true;
    return null;
  }

  try {
    // Load runner profile
    const { data: profile } = await supabase
      .from('runner_profiles')
      .select('runner_id, display_name, is_admin, role, avatar_url')
      .eq('user_id', user.id)
      .single();

    _profile = profile;

    // Check super admin
    if (profile?.is_admin === true) {
      _role = 'super_admin';
      _assignedGames = []; // no restrictions
      _initialized = true;

      // Also load moderator record if exists (for display)
      const { data: mod } = await supabase
        .from('moderators')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      _modRecord = mod;

      return _role;
    }

    // Check moderators table
    const { data: mod } = await supabase
      .from('moderators')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    _modRecord = mod;

    if (mod) {
      if (mod.can_manage_moderators) {
        _role = 'admin';
        _assignedGames = [];
      } else {
        _role = 'verifier';
        _assignedGames = mod.assigned_games || [];
      }
      _initialized = true;
      return _role;
    }

    // SECURITY (Item 4): Removed hardcoded username fallback.
    // Admin access must come from the database (is_admin flag or moderators table).
    // If you need to bootstrap a new admin, set is_admin=true directly in Supabase.

  } catch (err) {
    console.error('[Admin] Init error:', err);
  }

  _initialized = true;
  return null;
}

// =============================================================================
// Role Checks
// =============================================================================

function getRole() { return _role; }
function getAssignedGames() { return _assignedGames; }
function getProfile() { return _profile; }
function getModRecord() { return _modRecord; }

function isSuperAdmin() { return _role === 'super_admin'; }
function isAdmin() { return _role === 'super_admin' || _role === 'admin'; }
function isVerifier() { return _role === 'verifier'; }
function hasAccess() { return !!_role; }

/**
 * Check if user can manage a specific game
 */
function canManageGame(gameId) {
  if (isAdmin()) return true; // admins manage all games
  if (isVerifier()) {
    // Verifiers with empty assigned_games can't manage any
    // (they need explicit game assignment)
    return _assignedGames.length > 0 && _assignedGames.includes(gameId);
  }
  return false;
}

/**
 * Get sections this role can access
 */
function getAccessibleSections() {
  if (!_role) return [];

  const sections = [];

  // Verifiers: only runs for their games
  if (_role === 'verifier') {
    sections.push('runs');
  }

  // Admins: runs, games, profiles
  if (_role === 'admin') {
    sections.push('runs', 'games', 'profiles');
  }

  // Super admins: everything
  if (_role === 'super_admin') {
    sections.push('runs', 'games', 'profiles', 'users', 'financials', 'health', 'test');
  }

  return sections;
}

// =============================================================================
// Pending Runs
// =============================================================================

/**
 * Get pending runs, filtered by role.
 * Verifiers only see runs for their assigned games.
 * @param {Object} opts - { status, gameId, limit, offset }
 */
async function getPendingRuns(opts = {}) {
  const supabase = CRCAuth.getSupabaseClient();
  if (!supabase) return { data: [], count: 0, error: 'Not connected' };

  const { status = 'pending', gameId = null, limit = 50, offset = 0 } = opts;

  let query = supabase
    .from('pending_runs')
    .select('*', { count: 'exact' })
    .order('submitted_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Filter by status
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  // Filter by game (explicit filter or verifier restriction)
  if (gameId) {
    query = query.eq('game_id', gameId);
  } else if (isVerifier() && _assignedGames.length > 0) {
    query = query.in('game_id', _assignedGames);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error('[Admin] getPendingRuns error:', error);
    return { data: [], count: 0, error: error.message };
  }

  return { data: data || [], count: count || 0, error: null };
}

/**
 * Get a single run by ID
 */
async function getRun(runId) {
  const supabase = CRCAuth.getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('pending_runs')
    .select('*')
    .eq('id', runId)
    .single();

  if (error) {
    console.error('[Admin] getRun error:', error);
    return null;
  }
  return data;
}

/**
 * Approve a run
 */
async function approveRun(runId, notes = '') {
  const supabase = CRCAuth.getSupabaseClient();
  const user = CRCAuth.getUser();
  if (!supabase || !user) return { error: 'Not connected' };

  // If Worker URL is configured, call /approve → creates GitHub file + updates Supabase
  if (_workerUrl) {
    try {
      const session = await supabase.auth.getSession();
      const accessToken = session?.data?.session?.access_token;
      if (!accessToken) {
        return { error: 'No active session. Please sign in again.' };
      }

      const res = await fetch(`${_workerUrl}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          run_id: runId,
          token: accessToken,
          notes: notes || ''
        })
      });

      const result = await res.json();

      if (!res.ok) {
        console.error('[Admin] Worker /approve error:', result);
        return { error: result.error || `Worker error (${res.status})` };
      }

      // Worker succeeded — fetch the updated row for the UI
      const { data } = await supabase
        .from('pending_runs')
        .select('*')
        .eq('id', runId)
        .single();

      return {
        data: data || { id: runId, status: 'verified' },
        filename: result.filename,
        error: null
      };
    } catch (err) {
      console.error('[Admin] Worker /approve fetch error:', err);
      return { error: 'Failed to connect to approval service: ' + err.message };
    }
  }

  // Fallback: direct Supabase update (no GitHub file created)
  console.warn('[Admin] No Worker URL — approving in Supabase only (no GitHub file)');
  const { data, error } = await supabase
    .from('pending_runs')
    .update({
      status: 'verified',
      verified_by: user.id,
      verified_at: new Date().toISOString(),
      verifier_notes: notes || null
    })
    .eq('id', runId)
    .select()
    .single();

  if (error) {
    console.error('[Admin] approveRun error:', error);
    return { error: error.message };
  }

  return { data, error: null };
}

/**
 * Set the Worker URL programmatically
 */
function setWorkerUrl(url) {
  _workerUrl = url;
}

/**
 * Reject a run
 */
async function rejectRun(runId, reason, notes = '') {
  const supabase = CRCAuth.getSupabaseClient();
  const user = CRCAuth.getUser();
  if (!supabase || !user) return { error: 'Not connected' };

  const { data, error } = await supabase
    .from('pending_runs')
    .update({
      status: 'rejected',
      verified_by: user.id,
      verified_at: new Date().toISOString(),
      rejection_reason: reason,
      verifier_notes: notes || null
    })
    .eq('id', runId)
    .select()
    .single();

  if (error) {
    console.error('[Admin] rejectRun error:', error);
    return { error: error.message };
  }

  return { data, error: null };
}

/**
 * Request changes on a run
 */
async function requestChanges(runId, reason) {
  const supabase = CRCAuth.getSupabaseClient();
  const user = CRCAuth.getUser();
  if (!supabase || !user) return { error: 'Not connected' };

  const { data, error } = await supabase
    .from('pending_runs')
    .update({
      status: 'needs_changes',
      verified_by: user.id,
      verified_at: new Date().toISOString(),
      verifier_notes: reason
    })
    .eq('id', runId)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data, error: null };
}

// =============================================================================
// Counts (for dashboard stats)
// =============================================================================

async function getCounts() {
  const supabase = CRCAuth.getSupabaseClient();
  if (!supabase) return {};

  const counts = {};

  // Pending runs
  let runsQuery = supabase
    .from('pending_runs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (isVerifier() && _assignedGames.length > 0) {
    runsQuery = runsQuery.in('game_id', _assignedGames);
  }
  const { count: runsCount } = await runsQuery;
  counts.pendingRuns = runsCount || 0;

  // Only admins+ see profile and game counts
  if (isAdmin()) {
    const { count: profilesCount } = await supabase
      .from('pending_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    counts.pendingProfiles = profilesCount || 0;

    const { count: gamesCount } = await supabase
      .from('pending_games')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    counts.pendingGames = gamesCount || 0;

    const { count: totalRunners } = await supabase
      .from('runner_profiles')
      .select('*', { count: 'exact', head: true });
    counts.totalRunners = totalRunners || 0;
  }

  return counts;
}

// =============================================================================
// Pending Profiles (admin only)
// =============================================================================

async function getPendingProfiles(opts = {}) {
  const supabase = CRCAuth.getSupabaseClient();
  if (!supabase || !isAdmin()) return { data: [], count: 0 };

  const { status = 'pending', limit = 50, offset = 0 } = opts;

  let query = supabase
    .from('pending_profiles')
    .select('*', { count: 'exact' })
    .order('submitted_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, count, error } = await query;
  if (error) return { data: [], count: 0, error: error.message };
  return { data: data || [], count: count || 0, error: null };
}

/**
 * Get a single pending profile by ID
 */
async function getProfileById(profileId) {
  const supabase = CRCAuth.getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('pending_profiles')
    .select('*')
    .eq('id', profileId)
    .single();

  if (error) {
    console.error('[Admin] getProfileById error:', error);
    return null;
  }
  return data;
}

/**
 * Approve a pending profile.
 * If Worker URL is configured, calls /approve-profile → creates _runners/ file + updates Supabase.
 * Falls back to direct Supabase update if no Worker.
 */
async function approveProfile(profileId, notes = '') {
  const supabase = CRCAuth.getSupabaseClient();
  const user = CRCAuth.getUser();
  if (!supabase || !user || !isAdmin()) return { error: 'Not authorized' };

  if (_workerUrl) {
    try {
      const session = await supabase.auth.getSession();
      const accessToken = session?.data?.session?.access_token;
      if (!accessToken) return { error: 'No active session. Please sign in again.' };

      const res = await fetch(`${_workerUrl}/approve-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: profileId,
          token: accessToken,
          notes: notes || ''
        })
      });

      const result = await res.json();
      if (!res.ok) {
        console.error('[Admin] Worker /approve-profile error:', result);
        return { error: result.error || `Worker error (${res.status})` };
      }

      const { data } = await supabase
        .from('pending_profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      return {
        data: data || { id: profileId, status: 'approved' },
        filename: result.filename,
        error: null
      };
    } catch (err) {
      console.error('[Admin] Worker /approve-profile fetch error:', err);
      return { error: 'Failed to connect to approval service: ' + err.message };
    }
  }

  // Fallback: direct Supabase update (no GitHub file created)
  console.warn('[Admin] No Worker URL — approving profile in Supabase only (no GitHub file)');
  const { data, error } = await supabase
    .from('pending_profiles')
    .update({
      status: 'approved',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      reviewer_notes: notes || null
    })
    .eq('id', profileId)
    .select()
    .single();

  if (error) {
    console.error('[Admin] approveProfile error:', error);
    return { error: error.message };
  }
  return { data, error: null };
}

/**
 * Reject a pending profile
 */
async function rejectProfile(profileId, reason, notes = '') {
  const supabase = CRCAuth.getSupabaseClient();
  const user = CRCAuth.getUser();
  if (!supabase || !user || !isAdmin()) return { error: 'Not authorized' };

  const { data, error } = await supabase
    .from('pending_profiles')
    .update({
      status: 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason,
      reviewer_notes: notes || null
    })
    .eq('id', profileId)
    .select()
    .single();

  if (error) {
    console.error('[Admin] rejectProfile error:', error);
    return { error: error.message };
  }
  return { data, error: null };
}

/**
 * Request changes on a pending profile
 */
async function requestProfileChanges(profileId, reason) {
  const supabase = CRCAuth.getSupabaseClient();
  const user = CRCAuth.getUser();
  if (!supabase || !user || !isAdmin()) return { error: 'Not authorized' };

  const { data, error } = await supabase
    .from('pending_profiles')
    .update({
      status: 'needs_changes',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      reviewer_notes: reason
    })
    .eq('id', profileId)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data, error: null };
}

// =============================================================================
// Pending Games (admin only)
// =============================================================================

async function getPendingGames(opts = {}) {
  const supabase = CRCAuth.getSupabaseClient();
  if (!supabase || !isAdmin()) return { data: [], count: 0 };

  const { status = 'pending', limit = 50, offset = 0 } = opts;

  let query = supabase
    .from('pending_games')
    .select('*', { count: 'exact' })
    .order('submitted_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, count, error } = await query;
  if (error) return { data: [], count: 0, error: error.message };
  return { data: data || [], count: count || 0, error: null };
}

/**
 * Approve a pending game.
 * If Worker URL is configured, calls /approve-game → creates _games/ file + generates pages + updates Supabase.
 * Falls back to direct Supabase update if no Worker.
 */
async function approveGame(gameId, notes = '') {
  const supabase = CRCAuth.getSupabaseClient();
  const user = CRCAuth.getUser();
  if (!supabase || !user || !isAdmin()) return { error: 'Not authorized' };

  if (_workerUrl) {
    try {
      const session = await supabase.auth.getSession();
      const accessToken = session?.data?.session?.access_token;
      if (!accessToken) return { error: 'No active session. Please sign in again.' };

      const res = await fetch(`${_workerUrl}/approve-game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          token: accessToken,
          notes: notes || ''
        })
      });

      const result = await res.json();
      if (!res.ok) {
        console.error('[Admin] Worker /approve-game error:', result);
        return { error: result.error || `Worker error (${res.status})` };
      }

      const { data } = await supabase
        .from('pending_games')
        .select('*')
        .eq('id', gameId)
        .single();

      return {
        data: data || { id: gameId, status: 'approved' },
        filename: result.filename,
        error: null
      };
    } catch (err) {
      console.error('[Admin] Worker /approve-game fetch error:', err);
      return { error: 'Failed to connect to approval service: ' + err.message };
    }
  }

  // Fallback: direct Supabase update (no GitHub file created)
  console.warn('[Admin] No Worker URL — approving game in Supabase only (no GitHub file)');
  const { data, error } = await supabase
    .from('pending_games')
    .update({
      status: 'approved',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      reviewer_notes: notes || null
    })
    .eq('id', gameId)
    .select()
    .single();

  if (error) {
    console.error('[Admin] approveGame error:', error);
    return { error: error.message };
  }
  return { data, error: null };
}

/**
 * Reject a pending game
 */
async function rejectGame(gameId, reason, notes = '') {
  const supabase = CRCAuth.getSupabaseClient();
  const user = CRCAuth.getUser();
  if (!supabase || !user || !isAdmin()) return { error: 'Not authorized' };

  const { data, error } = await supabase
    .from('pending_games')
    .update({
      status: 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason,
      reviewer_notes: notes || null
    })
    .eq('id', gameId)
    .select()
    .single();

  if (error) {
    console.error('[Admin] rejectGame error:', error);
    return { error: error.message };
  }
  return { data, error: null };
}

/**
 * Request changes on a pending game
 */
async function requestGameChanges(gameId, reason) {
  const supabase = CRCAuth.getSupabaseClient();
  const user = CRCAuth.getUser();
  if (!supabase || !user || !isAdmin()) return { error: 'Not authorized' };

  const { data, error } = await supabase
    .from('pending_games')
    .update({
      status: 'needs_changes',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      reviewer_notes: reason
    })
    .eq('id', gameId)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data, error: null };
}

/**
 * Get a single pending game by ID
 */
async function getGame(gameId) {
  const supabase = CRCAuth.getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('pending_games')
    .select('*')
    .eq('id', gameId)
    .single();

  if (error) {
    console.error('[Admin] getGame error:', error);
    return null;
  }
  return data;
}

// =============================================================================
// UI Helpers
// =============================================================================

/**
 * Format a date string for display
 */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Format a timestamp for display
 */
function formatTimestamp(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format interval string for display
 */
function formatTime(intervalStr) {
  if (!intervalStr) return '—';
  // PostgreSQL intervals come back as "HH:MM:SS" or descriptive
  // If it's already in HH:MM:SS format, return as-is
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(intervalStr)) return intervalStr;
  // Try to parse descriptive format: "1 hours 23 minutes 45 seconds"
  const h = intervalStr.match(/(\d+)\s*hour/)?.[1] || 0;
  const m = intervalStr.match(/(\d+)\s*min/)?.[1] || 0;
  const s = intervalStr.match(/(\d+)\s*sec/)?.[1] || 0;
  if (h || m || s) {
    return `${String(h).padStart(1, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return intervalStr;
}

/**
 * Get status badge HTML
 */
function statusBadge(status) {
  const colors = {
    pending: '#f0ad4e',
    verified: '#28a745',
    rejected: '#dc3545',
    needs_changes: '#17a2b8'
  };
  const labels = {
    pending: 'Pending',
    verified: 'Verified',
    rejected: 'Rejected',
    needs_changes: 'Needs Changes'
  };
  const color = colors[status] || '#6c757d';
  const label = labels[status] || status;
  return `<span class="status-badge" style="background:${color};color:white;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:600;text-transform:uppercase">${label}</span>`;
}

/**
 * Format game_id for display (hades-2 → Hades 2)
 */
function formatGameId(gameId) {
  if (!gameId) return '—';
  return gameId
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Format array for display
 */
function formatArray(arr) {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return '—';
  return arr.map(s => s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())).join(', ');
}

/**
 * Get video embed URL from video_url
 */
function getVideoEmbed(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();

    // YouTube
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = u.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1);
      if (id) return `https://www.youtube.com/embed/${id}`;
    }

    // Twitch
    if (host === 'twitch.tv' || host === 'm.twitch.tv') {
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts[0] === 'videos' && parts[1]) {
        return `https://player.twitch.tv/?video=${parts[1]}&parent=${window.location.hostname}`;
      }
    }
  } catch { /* ignore */ }
  return null;
}

/**
 * Role display label
 */
function roleLabel(role) {
  const labels = {
    super_admin: '⭐ Super Admin',
    admin: '🛡️ Admin',
    verifier: '✅ Verifier'
  };
  return labels[role] || role;
}

// =============================================================================
// Export
// =============================================================================

export const CRCAdmin = {
  init,
  getRole,
  getAssignedGames,
  getProfile,
  getModRecord,

  isSuperAdmin,
  isAdmin,
  isVerifier,
  hasAccess,
  canManageGame,
  getAccessibleSections,
  setWorkerUrl,

  getPendingRuns,
  getRun,
  approveRun,
  rejectRun,
  requestChanges,

  getCounts,
  getPendingProfiles,
  getProfileById,
  approveProfile,
  rejectProfile,
  requestProfileChanges,
  getPendingGames,
  approveGame,
  rejectGame,
  requestGameChanges,
  getGame,

  formatDate,
  formatTimestamp,
  formatTime,
  statusBadge,
  formatGameId,
  formatArray,
  getVideoEmbed,
  roleLabel
};

export default CRCAdmin;

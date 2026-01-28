/**
 * Challenge Run Central - Authentication Module
 * 
 * Handles Supabase authentication with Discord and Twitch OAuth providers.
 * 
 * Usage:
 *   import { CRCAuth } from '/assets/js/auth.js';
 *   
 *   // Initialize (call once on page load)
 *   await CRCAuth.init();
 *   
 *   // Sign in
 *   await CRCAuth.signInWithDiscord();
 *   await CRCAuth.signInWithTwitch();
 *   
 *   // Get current user
 *   const user = CRCAuth.getUser();
 *   const profile = await CRCAuth.getProfile();
 *   
 *   // Sign out
 *   await CRCAuth.signOut();
 */

// =============================================================================
// Configuration
// =============================================================================

// These values should be set from your site's config
// In production, inject these from Jekyll or environment variables
const SUPABASE_URL = window.CRC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = window.CRC_SUPABASE_ANON_KEY || '';

// Auth configuration
const AUTH_CONFIG = {
  // Minimum account age in days to create a profile
  minAccountAgeDays: 30,
  
  // Redirect URL after OAuth
  redirectTo: window.location.origin + '/auth/callback/',
  
  // Scopes to request from providers
  scopes: {
    discord: 'identify email guilds',
    twitch: 'user:read:email'
  }
};

// =============================================================================
// Supabase Client Initialization
// =============================================================================

let supabase = null;
let currentUser = null;
let currentProfile = null;
let authStateListeners = [];

/**
 * Initialize the Supabase client
 * Must be called before using any auth functions
 */
async function initSupabase() {
  if (supabase) return supabase;
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('CRCAuth: Supabase credentials not configured');
    return null;
  }
  
  // Load Supabase client from CDN if not already loaded
  if (typeof window.supabase === 'undefined') {
    await loadSupabaseClient();
  }
  
  // Create the client
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });
  
  // Set up auth state listener
  supabase.auth.onAuthStateChange(handleAuthStateChange);
  
  // Check for existing session
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUser = session.user;
    await loadProfile();
  }
  
  return supabase;
}

/**
 * Load Supabase client library from CDN
 */
function loadSupabaseClient() {
  return new Promise((resolve, reject) => {
    if (typeof window.supabase !== 'undefined') {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load Supabase client'));
    document.head.appendChild(script);
  });
}

/**
 * Handle auth state changes
 */
async function handleAuthStateChange(event, session) {
  console.log('Auth state change:', event);
  
  if (event === 'SIGNED_IN' && session) {
    currentUser = session.user;
    await loadProfile();
    await syncLinkedAccount(session);
  } else if (event === 'SIGNED_OUT') {
    currentUser = null;
    currentProfile = null;
  } else if (event === 'TOKEN_REFRESHED' && session) {
    currentUser = session.user;
  }
  
  // Notify listeners
  authStateListeners.forEach(listener => {
    try {
      listener(event, currentUser, currentProfile);
    } catch (err) {
      console.error('Auth state listener error:', err);
    }
  });
}

/**
 * Load user's profile from database
 */
async function loadProfile() {
  if (!currentUser || !supabase) return null;
  
  try {
    // First check for approved profile
    const { data: profile, error } = await supabase
      .from('runner_profiles')
      .select('*')
      .eq('user_id', currentUser.id)
      .single();
    
    if (profile) {
      currentProfile = profile;
      return profile;
    }
    
    // Check for pending profile
    const { data: pending } = await supabase
      .from('pending_profiles')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('status', 'pending')
      .single();
    
    if (pending) {
      currentProfile = { ...pending, _isPending: true };
      return currentProfile;
    }
    
    return null;
  } catch (err) {
    console.error('Error loading profile:', err);
    return null;
  }
}

/**
 * Sync linked account information after sign-in
 */
async function syncLinkedAccount(session) {
  if (!session || !supabase) return;
  
  const user = session.user;
  const provider = user.app_metadata?.provider;
  const providerAccountId = user.user_metadata?.provider_id || user.user_metadata?.sub;
  
  if (!provider || !providerAccountId) return;
  
  try {
    // Upsert linked account
    const { error } = await supabase
      .from('linked_accounts')
      .upsert({
        user_id: user.id,
        provider: provider,
        provider_user_id: providerAccountId,
        provider_username: user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.preferred_username,
        provider_avatar_url: user.user_metadata?.avatar_url,
        provider_email: user.email,
        provider_metadata: user.user_metadata,
        provider_account_created_at: user.user_metadata?.created_at || null,
        last_login_at: new Date().toISOString()
      }, {
        onConflict: 'provider,provider_user_id'
      });
    
    if (error) {
      console.error('Error syncing linked account:', error);
    }
  } catch (err) {
    console.error('Error syncing linked account:', err);
  }
}

// =============================================================================
// Public API
// =============================================================================

export const CRCAuth = {
  /**
   * Initialize the auth system
   * @returns {Promise<boolean>} Success status
   */
  async init() {
    const client = await initSupabase();
    return !!client;
  },
  
  /**
   * Sign in with Discord OAuth
   * @returns {Promise<{error: Error|null}>}
   */
  async signInWithDiscord() {
    if (!supabase) {
      return { error: new Error('Auth not initialized') };
    }
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: AUTH_CONFIG.redirectTo,
        scopes: AUTH_CONFIG.scopes.discord
      }
    });
    
    return { data, error };
  },
  
  /**
   * Sign in with Twitch OAuth
   * @returns {Promise<{error: Error|null}>}
   */
  async signInWithTwitch() {
    if (!supabase) {
      return { error: new Error('Auth not initialized') };
    }
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'twitch',
      options: {
        redirectTo: AUTH_CONFIG.redirectTo,
        scopes: AUTH_CONFIG.scopes.twitch
      }
    });
    
    return { data, error };
  },
  
  /**
   * Sign out the current user
   * @returns {Promise<{error: Error|null}>}
   */
  async signOut() {
    if (!supabase) {
      return { error: new Error('Auth not initialized') };
    }
    
    const { error } = await supabase.auth.signOut();
    currentUser = null;
    currentProfile = null;
    
    return { error };
  },
  
  /**
   * Get the current authenticated user
   * @returns {Object|null} User object or null
   */
  getUser() {
    return currentUser;
  },
  
  /**
   * Get the current user's profile
   * @returns {Object|null} Profile object or null
   */
  getProfile() {
    return currentProfile;
  },
  
  /**
   * Check if user is signed in
   * @returns {boolean}
   */
  isSignedIn() {
    return !!currentUser;
  },
  
  /**
   * Check if user has an approved profile
   * @returns {boolean}
   */
  hasProfile() {
    return !!currentProfile && !currentProfile._isPending;
  },
  
  /**
   * Check if user has a pending profile
   * @returns {boolean}
   */
  hasPendingProfile() {
    return !!currentProfile && currentProfile._isPending;
  },
  
  /**
   * Get linked accounts for current user
   * @returns {Promise<Array>} Array of linked accounts
   */
  async getLinkedAccounts() {
    if (!currentUser || !supabase) return [];
    
    const { data, error } = await supabase
      .from('linked_accounts')
      .select('*')
      .eq('user_id', currentUser.id);
    
    if (error) {
      console.error('Error fetching linked accounts:', error);
      return [];
    }
    
    return data || [];
  },
  
  /**
   * Submit a new profile for approval
   * @param {Object} profileData - Profile data
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async submitProfile(profileData) {
    if (!currentUser || !supabase) {
      return { data: null, error: new Error('Not signed in') };
    }
    
    // Validate runner_id format
    const runnerId = profileData.runner_id?.toLowerCase().trim();
    if (!runnerId || !/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(runnerId)) {
      return { data: null, error: new Error('Invalid runner ID format') };
    }
    
    // Check if runner_id is already taken
    const { data: existing } = await supabase
      .from('runner_profiles')
      .select('runner_id')
      .eq('runner_id', runnerId)
      .single();
    
    if (existing) {
      return { data: null, error: new Error('Runner ID already taken') };
    }
    
    // Check for existing pending profile
    const { data: pending } = await supabase
      .from('pending_profiles')
      .select('id')
      .eq('user_id', currentUser.id)
      .eq('status', 'pending')
      .single();
    
    if (pending) {
      return { data: null, error: new Error('You already have a pending profile') };
    }
    
    // Submit the profile
    const { data, error } = await supabase
      .from('pending_profiles')
      .insert({
        user_id: currentUser.id,
        requested_runner_id: runnerId,
        display_name: profileData.display_name?.trim() || '',
        pronouns: profileData.pronouns?.trim() || null,
        location: profileData.location?.trim() || null,
        bio: profileData.bio?.trim() || null,
        avatar_url: profileData.avatar_url || null,
        socials: profileData.socials || {},
        games: profileData.games || []
      })
      .select()
      .single();
    
    if (!error && data) {
      currentProfile = { ...data, _isPending: true };
    }
    
    return { data, error };
  },
  
  /**
   * Update the current user's profile
   * @param {Object} updates - Fields to update
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async updateProfile(updates) {
    if (!currentUser || !currentProfile || !supabase) {
      return { data: null, error: new Error('No profile to update') };
    }
    
    // If pending, update pending_profiles
    if (currentProfile._isPending) {
      const { data, error } = await supabase
        .from('pending_profiles')
        .update({
          display_name: updates.display_name,
          pronouns: updates.pronouns,
          location: updates.location,
          bio: updates.bio,
          socials: updates.socials,
          games: updates.games
        })
        .eq('user_id', currentUser.id)
        .eq('status', 'pending')
        .select()
        .single();
      
      if (!error && data) {
        currentProfile = { ...data, _isPending: true };
      }
      
      return { data, error };
    }
    
    // Update approved profile
    const { data, error } = await supabase
      .from('runner_profiles')
      .update({
        display_name: updates.display_name,
        pronouns: updates.pronouns,
        location: updates.location,
        bio: updates.bio,
        socials: updates.socials,
        games: updates.games,
        featured_runs: updates.featured_runs
      })
      .eq('user_id', currentUser.id)
      .select()
      .single();
    
    if (!error && data) {
      currentProfile = data;
    }
    
    return { data, error };
  },
  
  /**
   * Check if a runner_id is available
   * @param {string} runnerId - Runner ID to check
   * @returns {Promise<boolean>}
   */
  async isRunnerIdAvailable(runnerId) {
    if (!supabase) return false;
    
    const normalized = runnerId?.toLowerCase().trim();
    if (!normalized) return false;
    
    // Check approved profiles
    const { data: approved } = await supabase
      .from('runner_profiles')
      .select('runner_id')
      .eq('runner_id', normalized)
      .single();
    
    if (approved) return false;
    
    // Check pending profiles
    const { data: pending } = await supabase
      .from('pending_profiles')
      .select('requested_runner_id')
      .eq('requested_runner_id', normalized)
      .eq('status', 'pending')
      .single();
    
    return !pending;
  },
  
  /**
   * Add a listener for auth state changes
   * @param {Function} listener - Callback function(event, user, profile)
   * @returns {Function} Unsubscribe function
   */
  onAuthStateChange(listener) {
    authStateListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = authStateListeners.indexOf(listener);
      if (index > -1) {
        authStateListeners.splice(index, 1);
      }
    };
  },
  
  /**
   * Get user metadata from OAuth provider
   * @returns {Object} Provider metadata
   */
  getProviderMetadata() {
    if (!currentUser) return {};
    
    return {
      provider: currentUser.app_metadata?.provider,
      providerUsername: currentUser.user_metadata?.full_name || 
                        currentUser.user_metadata?.name ||
                        currentUser.user_metadata?.preferred_username,
      providerAvatar: currentUser.user_metadata?.avatar_url,
      email: currentUser.email,
      emailVerified: currentUser.email_confirmed_at != null
    };
  },
  
  /**
   * Get the raw Supabase client (for advanced usage)
   * @returns {Object|null} Supabase client
   */
  getSupabaseClient() {
    return supabase;
  }
};

// =============================================================================
// Auto-initialization
// =============================================================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => CRCAuth.init());
} else {
  CRCAuth.init();
}

// Export for ES modules
export default CRCAuth;

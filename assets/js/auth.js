/**
 * Challenge Run Central - Authentication Module (Simplified)
 * 
 * Handles Supabase authentication with Discord and Twitch OAuth providers.
 * Uses redirect flow (not popups) for maximum browser compatibility.
 */

// =============================================================================
// Configuration
// =============================================================================

let SUPABASE_URL = '';
let SUPABASE_ANON_KEY = '';

const AUTH_CONFIG = {
  get redirectTo() {
    return window.location.origin + '/auth/callback/';
  },
  scopes: {
    discord: 'identify email',
    twitch: 'user:read:email'
  }
};

// =============================================================================
// State
// =============================================================================

let supabase = null;
let currentUser = null;
let currentProfile = null;
let initPromise = null;
let authStateListeners = [];

// =============================================================================
// Supabase Client
// =============================================================================

function loadSupabaseClient() {
  return new Promise((resolve, reject) => {
    if (typeof window.supabase !== 'undefined') {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.3/dist/umd/supabase.min.js';
    script.integrity = 'sha384-aRAaCbKYByQpx0fjPuC0PQ9P9moWMEsHXP9tyzP7tbyD5fPK6oTp+THsxdWiq02L';
    script.crossOrigin = 'anonymous';
    script.async = true;
    script.onload = () => {
      // Small delay to ensure the library is fully initialized
      setTimeout(resolve, 50);
    };
    script.onerror = () => reject(new Error('Failed to load Supabase client'));
    document.head.appendChild(script);
  });
}

async function initSupabase() {
  // Return existing promise if already initializing
  if (initPromise) return initPromise;
  
  // Return existing client if already initialized
  if (supabase) return supabase;
  
  initPromise = (async () => {
    try {
      // Read credentials
      SUPABASE_URL = window.CRC_SUPABASE_URL || '';
      SUPABASE_ANON_KEY = window.CRC_SUPABASE_ANON_KEY || '';
      
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.error('CRCAuth: Supabase credentials not configured');
        return null;
      }
      
      // Load Supabase library
      if (typeof window.supabase === 'undefined') {
        await loadSupabaseClient();
      }
      
      // Create client
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        }
      });
      
      // Listen for auth changes
      supabase.auth.onAuthStateChange((event, session) => {
        console.log('CRCAuth: Auth state changed:', event);
        
        if (session) {
          currentUser = session.user;
        } else {
          currentUser = null;
          currentProfile = null;
        }
        
        // Notify listeners
        authStateListeners.forEach(fn => {
          try { fn(event, currentUser, currentProfile); } catch (e) { console.error(e); }
        });
      });
      
      // Get current session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('CRCAuth: Error getting session:', error.message);
      }
      
      if (session) {
        console.log('CRCAuth: Found existing session');
        currentUser = session.user;
        // Try to load profile, but don't fail if tables don't exist
        await loadProfileSafe();
      } else {
        console.log('CRCAuth: No session found');
      }
      
      return supabase;
    } catch (err) {
      console.error('CRCAuth: Init error:', err);
      return null;
    }
  })();
  
  return initPromise;
}

/**
 * Safely load profile - won't fail if tables don't exist
 */
async function loadProfileSafe() {
  if (!currentUser || !supabase) return null;
  
  try {
    // Try to get approved profile
    const { data: profile, error } = await supabase
      .from('runner_profiles')
      .select('*')
      .eq('user_id', currentUser.id)
      .maybeSingle();
    
    if (error && !error.message.includes('does not exist')) {
      console.warn('CRCAuth: Error loading profile:', error.message);
    }
    
    if (profile) {
      currentProfile = profile;
      return profile;
    }
    
    // Try to get pending profile
    const { data: pending, error: pendingError } = await supabase
      .from('pending_profiles')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('status', 'pending')
      .maybeSingle();
    
    if (pendingError && !pendingError.message.includes('does not exist')) {
      console.warn('CRCAuth: Error loading pending profile:', pendingError.message);
    }
    
    if (pending) {
      currentProfile = { ...pending, _isPending: true };
      return currentProfile;
    }
    
    return null;
  } catch (err) {
    // Tables might not exist yet - that's OK
    console.warn('CRCAuth: Could not load profile (tables may not exist yet)');
    return null;
  }
}

// =============================================================================
// Public API
// =============================================================================

export const CRCAuth = {
  /**
   * Initialize auth system
   */
  async init() {
    const client = await initSupabase();
    return !!client;
  },
  
  /**
   * Sign in with Discord (redirect flow)
   */
  async signInWithDiscord() {
    if (!supabase) {
      await this.init();
    }
    
    if (!supabase) {
      return { data: null, error: new Error('Auth not initialized') };
    }
    
    // Store current URL to redirect back after auth
    try {
      sessionStorage.setItem('crc_auth_redirect', window.location.pathname);
    } catch (e) { /* ignore */ }
    
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
   * Sign in with Twitch (redirect flow)
   */
  async signInWithTwitch() {
    if (!supabase) {
      await this.init();
    }
    
    if (!supabase) {
      return { data: null, error: new Error('Auth not initialized') };
    }
    
    // Store current URL to redirect back after auth
    try {
      sessionStorage.setItem('crc_auth_redirect', window.location.pathname);
    } catch (e) { /* ignore */ }
    
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
   * Sign out
   */
  async signOut() {
    if (!supabase) {
      await this.init();
    }
    
    if (!supabase) {
      return { error: new Error('Auth not initialized') };
    }
    
    try {
      const { error } = await supabase.auth.signOut();
      currentUser = null;
      currentProfile = null;
      return { error };
    } catch (err) {
      console.error('CRCAuth: Sign out error:', err);
      // Force clear local state even if API fails
      currentUser = null;
      currentProfile = null;
      return { error: err };
    }
  },
  
  /**
   * Get current user
   */
  getUser() {
    return currentUser;
  },
  
  /**
   * Get current profile
   */
  getProfile() {
    return currentProfile;
  },
  
  /**
   * Check if signed in
   */
  isSignedIn() {
    return !!currentUser;
  },
  
  /**
   * Check if has approved profile
   */
  hasProfile() {
    return !!currentProfile && !currentProfile._isPending;
  },
  
  /**
   * Check if has pending profile
   */
  hasPendingProfile() {
    return !!currentProfile && currentProfile._isPending;
  },
  
  /**
   * Get provider metadata
   */
  getProviderMetadata() {
    if (!currentUser) return {};
    
    return {
      provider: currentUser.app_metadata?.provider,
      providerUsername: currentUser.user_metadata?.full_name || 
                        currentUser.user_metadata?.name ||
                        currentUser.user_metadata?.preferred_username ||
                        currentUser.user_metadata?.custom_claims?.global_name,
      providerAvatar: currentUser.user_metadata?.avatar_url,
      email: currentUser.email,
      emailVerified: currentUser.email_confirmed_at != null
    };
  },
  
  /**
   * Add auth state change listener
   */
  onAuthStateChange(listener) {
    authStateListeners.push(listener);
    return () => {
      const idx = authStateListeners.indexOf(listener);
      if (idx > -1) authStateListeners.splice(idx, 1);
    };
  },
  
  /**
   * Check if runner ID is available
   */
  async isRunnerIdAvailable(runnerId) {
    if (!supabase) return false;
    
    const normalized = runnerId?.toLowerCase().trim();
    if (!normalized) return false;
    
    try {
      const { data } = await supabase
        .from('runner_profiles')
        .select('runner_id')
        .eq('runner_id', normalized)
        .maybeSingle();
      
      if (data) return false;
      
      const { data: pending } = await supabase
        .from('pending_profiles')
        .select('requested_runner_id')
        .eq('requested_runner_id', normalized)
        .eq('status', 'pending')
        .maybeSingle();
      
      return !pending;
    } catch (err) {
      console.warn('CRCAuth: Error checking runner ID:', err);
      return true; // Assume available if we can't check
    }
  },
  
  /**
   * Submit profile for approval
   */
  async submitProfile(profileData) {
    if (!currentUser || !supabase) {
      return { data: null, error: new Error('Not signed in') };
    }
    
    const runnerId = profileData.runner_id?.toLowerCase().trim();
    
    // Validate runner ID:
    // - Min 3 characters
    // - Only lowercase letters, numbers, hyphens (no underscores)
    // - Cannot start or end with hyphen
    if (!runnerId || runnerId.length < 3) {
      return { data: null, error: new Error('Runner ID must be at least 3 characters') };
    }
    
    if (!/^[a-z0-9-]+$/.test(runnerId)) {
      return { data: null, error: new Error('Runner ID can only contain lowercase letters, numbers, and hyphens') };
    }
    
    if (/^-|-$/.test(runnerId)) {
      return { data: null, error: new Error('Runner ID cannot start or end with a hyphen') };
    }
    
    try {
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
          games: profileData.games || [],
          status: 'pending'
        })
        .select()
        .single();
      
      if (!error && data) {
        currentProfile = { ...data, _isPending: true };
      }
      
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  },
  
  /**
   * Get raw Supabase client
   */
  getSupabaseClient() {
    return supabase;
  },
  
  /**
   * Reload profile from database
   */
  async reloadProfile() {
    return loadProfileSafe();
  }
};

// =============================================================================
// Auto-init
// =============================================================================

// Don't auto-init - let pages call init() explicitly
// This prevents race conditions

export default CRCAuth;

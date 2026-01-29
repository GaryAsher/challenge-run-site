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

// These values will be read from window at init time (set by Jekyll from _data/supabase-config.yml)
// Do NOT read them here - they may not be set yet when the module is parsed
let SUPABASE_URL = '';
let SUPABASE_ANON_KEY = '';

// Auth configuration
const AUTH_CONFIG = {
  // Minimum account age in days to create a profile
  minAccountAgeDays: 30,
  
  // Redirect URL after OAuth
  get redirectTo() {
    return window.location.origin + '/auth/callback/';
  },
  
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
  
  // Read credentials at init time (not module load time)
  SUPABASE_URL = window.CRC_SUPABASE_URL || '';
  SUPABASE_ANON_KEY = window.CRC_SUPABASE_ANON_KEY || '';
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('CRCAuth: Supabase credentials not configured. Make sure _data/supabase-config.yml exists and has supabase_url and supabase_anon_key.');
    console.error('CRCAuth: window.CRC_SUPABASE_URL =', window.CRC_SUPABASE_URL);
    console.error('CRCAuth: window.CRC_SUPABASE_ANON_KEY =', window.CRC_SUPABASE_ANON_KEY ? '[SET]' : '[NOT SET]');
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
      detectSessionInUrl: true,
      // Use localStorage for session persistence
      storage: window.localStorage,
      storageKey: 'sb-' + SUPABASE_URL.split('//')[1].split('.')[0] + '-auth-token'
    }
  });
  
  // Set up auth state listener
  supabase.auth.onAuthStateChange(handleAuthStateChange);
  
  // Check for existing session
  // Try multiple times in case of timing issues with localStorage
  let session = null;
  let attempts = 0;
  const maxAttempts = 3;
  
  while (!session && attempts < maxAttempts) {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('CRCAuth: Error getting session:', error);
    }
    session = data?.session;
    
    if (!session && attempts < maxAttempts - 1) {
      // Wait a bit and try again - sometimes localStorage needs time to sync
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    attempts++;
  }
  
  if (session) {
    console.log('CRCAuth: Session found, user:', session.user?.email || session.user?.id);
    currentUser = session.user;
    await loadProfile();
  } else {
    console.log('CRCAuth: No session found after', attempts, 'attempts');
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

/**
 * Open OAuth flow in a popup window
 * @param {string} url - The OAuth URL to open
 * @param {string} title - Window title
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
function openAuthPopup(url, title = 'Sign In') {
  return new Promise((resolve) => {
    // Calculate popup position (centered)
    const width = 500;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    // Open the popup
    const popup = window.open(
      url,
      title,
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );
    
    if (!popup) {
      resolve({ data: null, error: new Error('Popup was blocked. Please allow popups for this site.') });
      return;
    }
    
    // Poll for popup close and auth state change
    let resolved = false;
    
    const checkClosed = setInterval(async () => {
      if (popup.closed) {
        clearInterval(checkClosed);
        if (!resolved) {
          resolved = true;
          
          // Give localStorage time to sync across windows
          await new Promise(r => setTimeout(r, 300));
          
          // Force the Supabase client to re-check the session from storage
          // The popup window stored the session in localStorage, so we need to refresh
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (session) {
            // Update our local state
            currentUser = session.user;
            await loadProfile();
            
            // Notify listeners manually since we're checking storage, not getting a real-time event
            authStateListeners.forEach(listener => {
              try {
                listener('SIGNED_IN', currentUser, currentProfile);
              } catch (err) {
                console.error('Auth state listener error:', err);
              }
            });
            
            resolve({ data: session, error: null });
          } else {
            resolve({ data: null, error: new Error('Sign in was cancelled or failed') });
          }
        }
      }
    }, 500);
    
    // Also listen for auth state change (may fire in some cases)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && !resolved) {
        resolved = true;
        clearInterval(checkClosed);
        subscription.unsubscribe();
        
        // Close the popup if it's still open
        try { popup.close(); } catch (e) { /* ignore */ }
        
        resolve({ data: session, error: null });
      }
    });
    
    // Timeout after 5 minutes
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        clearInterval(checkClosed);
        subscription.unsubscribe();
        try { popup.close(); } catch (e) { /* ignore */ }
        resolve({ data: null, error: new Error('Sign in timed out') });
      }
    }, 5 * 60 * 1000);
  });
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
   * Sign in with Discord OAuth (popup window)
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async signInWithDiscord() {
    if (!supabase) {
      return { data: null, error: new Error('Auth not initialized') };
    }
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: AUTH_CONFIG.redirectTo,
        scopes: AUTH_CONFIG.scopes.discord,
        skipBrowserRedirect: true // Don't redirect, we'll handle it with a popup
      }
    });
    
    if (error) {
      return { data: null, error };
    }
    
    // Open popup window
    if (data?.url) {
      const result = await openAuthPopup(data.url, 'Discord Sign In');
      return result;
    }
    
    return { data: null, error: new Error('No auth URL returned') };
  },
  
  /**
   * Sign in with Twitch OAuth (popup window)
   * @returns {Promise<{data: Object|null, error: Error|null}>}
   */
  async signInWithTwitch() {
    if (!supabase) {
      return { data: null, error: new Error('Auth not initialized') };
    }
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'twitch',
      options: {
        redirectTo: AUTH_CONFIG.redirectTo,
        scopes: AUTH_CONFIG.scopes.twitch,
        skipBrowserRedirect: true // Don't redirect, we'll handle it with a popup
      }
    });
    
    if (error) {
      return { data: null, error };
    }
    
    // Open popup window
    if (data?.url) {
      const result = await openAuthPopup(data.url, 'Twitch Sign In');
      return result;
    }
    
    return { data: null, error: new Error('No auth URL returned') };
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

-- =============================================================================
-- Challenge Run Central - Supabase Database Schema
-- =============================================================================
-- Run this in Supabase SQL Editor to set up all required tables
-- =============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ENUMS
-- =============================================================================

-- Profile status enum
CREATE TYPE profile_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- Account provider enum
CREATE TYPE auth_provider AS ENUM ('discord', 'twitch');

-- =============================================================================
-- RUNNER PROFILES TABLE
-- Main table for approved runner profiles
-- =============================================================================

CREATE TABLE IF NOT EXISTS runner_profiles (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Link to Supabase auth.users
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Core profile info
  runner_id TEXT UNIQUE NOT NULL,  -- URL-safe slug (e.g., "gary-asher")
  display_name TEXT NOT NULL,       -- Display name (e.g., "Gary_Asher")
  
  -- Optional profile info
  pronouns TEXT,
  location TEXT,
  bio TEXT,
  avatar_url TEXT,
  
  -- Social links (stored as JSONB for flexibility)
  socials JSONB DEFAULT '{}'::jsonb,
  -- Expected structure:
  -- {
  --   "twitch": "https://twitch.tv/...",
  --   "youtube": "https://youtube.com/...",
  --   "discord": "https://discord.gg/...",
  --   "twitter": "https://twitter.com/...",
  --   "bluesky": "https://bsky.app/...",
  --   "steam": "https://steamcommunity.com/...",
  --   "website": "https://..."
  -- }
  
  -- Games the runner participates in
  games TEXT[] DEFAULT '{}',
  
  -- Featured runs (stored as JSONB array)
  featured_runs JSONB DEFAULT '[]'::jsonb,
  -- Expected structure:
  -- [
  --   { "game_id": "hades-2", "category": "underworld-any", "achievement": "First Hitless" }
  -- ]
  
  -- Badges (future feature - placeholder)
  badges JSONB DEFAULT '[]'::jsonb,
  
  -- Profile status
  status profile_status DEFAULT 'approved',
  is_public BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT runner_id_format CHECK (runner_id ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' OR runner_id ~ '^[a-z0-9]$'),
  CONSTRAINT display_name_length CHECK (char_length(display_name) >= 2 AND char_length(display_name) <= 50),
  CONSTRAINT bio_length CHECK (bio IS NULL OR char_length(bio) <= 1000)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_runner_profiles_runner_id ON runner_profiles(runner_id);
CREATE INDEX IF NOT EXISTS idx_runner_profiles_user_id ON runner_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_runner_profiles_status ON runner_profiles(status);

-- =============================================================================
-- PENDING PROFILES TABLE
-- Holds profiles awaiting moderator approval
-- =============================================================================

CREATE TABLE IF NOT EXISTS pending_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Link to Supabase auth.users
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Requested profile info (same structure as runner_profiles)
  requested_runner_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  pronouns TEXT,
  location TEXT,
  bio TEXT,
  avatar_url TEXT,
  socials JSONB DEFAULT '{}'::jsonb,
  games TEXT[] DEFAULT '{}',
  
  -- Request metadata
  status profile_status DEFAULT 'pending',
  rejection_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT pending_runner_id_format CHECK (requested_runner_id ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' OR requested_runner_id ~ '^[a-z0-9]$'),
  CONSTRAINT pending_display_name_length CHECK (char_length(display_name) >= 2 AND char_length(display_name) <= 50)
);

-- Index for moderator queue
CREATE INDEX IF NOT EXISTS idx_pending_profiles_status ON pending_profiles(status);
CREATE INDEX IF NOT EXISTS idx_pending_profiles_created_at ON pending_profiles(created_at);

-- =============================================================================
-- LINKED ACCOUNTS TABLE
-- Tracks Discord/Twitch accounts linked to profiles
-- Enforces one profile per OAuth account
-- =============================================================================

CREATE TABLE IF NOT EXISTS linked_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Link to user
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- OAuth provider info
  provider auth_provider NOT NULL,
  provider_user_id TEXT NOT NULL,           -- Discord/Twitch user ID (immutable)
  provider_username TEXT,                    -- Current username (may change)
  provider_avatar_url TEXT,
  provider_email TEXT,
  
  -- Account metadata from provider
  provider_metadata JSONB DEFAULT '{}'::jsonb,
  -- For Discord: { "discriminator": "1234", "verified": true, "created_at": "..." }
  -- For Twitch: { "broadcaster_type": "", "created_at": "..." }
  
  -- Account age verification
  provider_account_created_at TIMESTAMPTZ,
  
  -- Timestamps
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one profile per provider account
  CONSTRAINT unique_provider_account UNIQUE (provider, provider_user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_linked_accounts_user_id ON linked_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_linked_accounts_provider ON linked_accounts(provider, provider_user_id);

-- =============================================================================
-- PROFILE AUDIT LOG
-- Tracks changes to profiles for moderation purposes
-- =============================================================================

CREATE TABLE IF NOT EXISTS profile_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- What was changed
  profile_id UUID,  -- Can be null if profile was deleted
  user_id UUID REFERENCES auth.users(id),
  
  -- Change details
  action TEXT NOT NULL,  -- 'created', 'updated', 'approved', 'rejected', 'suspended', 'deleted'
  changed_fields JSONB,  -- Which fields changed
  old_values JSONB,      -- Previous values
  new_values JSONB,      -- New values
  
  -- Who made the change
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Additional context
  reason TEXT,
  ip_address INET
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_audit_log_profile ON profile_audit_log(profile_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON profile_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON profile_audit_log(action);

-- =============================================================================
-- MODERATORS TABLE
-- Tracks users with moderator permissions
-- =============================================================================

CREATE TABLE IF NOT EXISTS moderators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Permissions
  can_approve_profiles BOOLEAN DEFAULT true,
  can_reject_profiles BOOLEAN DEFAULT true,
  can_suspend_profiles BOOLEAN DEFAULT true,
  can_edit_any_profile BOOLEAN DEFAULT false,
  can_manage_moderators BOOLEAN DEFAULT false,  -- Admin level
  
  -- Metadata
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by UUID REFERENCES auth.users(id),
  notes TEXT
);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to check if user is a moderator
CREATE OR REPLACE FUNCTION is_moderator(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM moderators WHERE user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if provider account is old enough
CREATE OR REPLACE FUNCTION check_account_age(
  account_created_at TIMESTAMPTZ,
  min_age_days INTEGER DEFAULT 30
)
RETURNS BOOLEAN AS $$
BEGIN
  IF account_created_at IS NULL THEN
    RETURN false;
  END IF;
  RETURN (NOW() - account_created_at) >= (min_age_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Function to approve a pending profile
CREATE OR REPLACE FUNCTION approve_pending_profile(
  pending_id UUID,
  moderator_id UUID
)
RETURNS UUID AS $$
DECLARE
  pending_record pending_profiles%ROWTYPE;
  new_profile_id UUID;
BEGIN
  -- Get the pending profile
  SELECT * INTO pending_record FROM pending_profiles WHERE id = pending_id AND status = 'pending';
  
  IF pending_record IS NULL THEN
    RAISE EXCEPTION 'Pending profile not found or already processed';
  END IF;
  
  -- Check if runner_id is already taken
  IF EXISTS (SELECT 1 FROM runner_profiles WHERE runner_id = pending_record.requested_runner_id) THEN
    RAISE EXCEPTION 'Runner ID already taken';
  END IF;
  
  -- Create the approved profile
  INSERT INTO runner_profiles (
    user_id,
    runner_id,
    display_name,
    pronouns,
    location,
    bio,
    avatar_url,
    socials,
    games,
    status,
    approved_at,
    approved_by
  ) VALUES (
    pending_record.user_id,
    pending_record.requested_runner_id,
    pending_record.display_name,
    pending_record.pronouns,
    pending_record.location,
    pending_record.bio,
    pending_record.avatar_url,
    pending_record.socials,
    pending_record.games,
    'approved',
    NOW(),
    moderator_id
  ) RETURNING id INTO new_profile_id;
  
  -- Update the pending profile status
  UPDATE pending_profiles 
  SET status = 'approved', reviewed_at = NOW(), reviewed_by = moderator_id
  WHERE id = pending_id;
  
  -- Log the action
  INSERT INTO profile_audit_log (profile_id, user_id, action, performed_by, new_values)
  VALUES (new_profile_id, pending_record.user_id, 'approved', moderator_id, to_jsonb(pending_record));
  
  RETURN new_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject a pending profile
CREATE OR REPLACE FUNCTION reject_pending_profile(
  pending_id UUID,
  moderator_id UUID,
  reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  pending_record pending_profiles%ROWTYPE;
BEGIN
  -- Get the pending profile
  SELECT * INTO pending_record FROM pending_profiles WHERE id = pending_id AND status = 'pending';
  
  IF pending_record IS NULL THEN
    RAISE EXCEPTION 'Pending profile not found or already processed';
  END IF;
  
  -- Update the pending profile status
  UPDATE pending_profiles 
  SET status = 'rejected', 
      reviewed_at = NOW(), 
      reviewed_by = moderator_id,
      rejection_reason = reason
  WHERE id = pending_id;
  
  -- Log the action
  INSERT INTO profile_audit_log (user_id, action, performed_by, reason, old_values)
  VALUES (pending_record.user_id, 'rejected', moderator_id, reason, to_jsonb(pending_record));
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-update updated_at on runner_profiles
DROP TRIGGER IF EXISTS update_runner_profiles_updated_at ON runner_profiles;
CREATE TRIGGER update_runner_profiles_updated_at
  BEFORE UPDATE ON runner_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on pending_profiles
DROP TRIGGER IF EXISTS update_pending_profiles_updated_at ON pending_profiles;
CREATE TRIGGER update_pending_profiles_updated_at
  BEFORE UPDATE ON pending_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE runner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE linked_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderators ENABLE ROW LEVEL SECURITY;

-- RUNNER PROFILES POLICIES

-- Anyone can view approved, public profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON runner_profiles FOR SELECT
  USING (status = 'approved' AND is_public = true);

-- Users can view their own profile regardless of status
CREATE POLICY "Users can view own profile"
  ON runner_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
  ON runner_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Moderators can view all profiles
CREATE POLICY "Moderators can view all profiles"
  ON runner_profiles FOR SELECT
  USING (is_moderator(auth.uid()));

-- Moderators can update any profile
CREATE POLICY "Moderators can update any profile"
  ON runner_profiles FOR UPDATE
  USING (is_moderator(auth.uid()));

-- PENDING PROFILES POLICIES

-- Users can view their own pending profile
CREATE POLICY "Users can view own pending profile"
  ON pending_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create a pending profile (one per user)
CREATE POLICY "Users can create pending profile"
  ON pending_profiles FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND NOT EXISTS (
      SELECT 1 FROM runner_profiles WHERE user_id = auth.uid()
    )
    AND NOT EXISTS (
      SELECT 1 FROM pending_profiles WHERE user_id = auth.uid() AND status = 'pending'
    )
  );

-- Users can update their own pending profile if still pending
CREATE POLICY "Users can update own pending profile"
  ON pending_profiles FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Moderators can view all pending profiles
CREATE POLICY "Moderators can view all pending profiles"
  ON pending_profiles FOR SELECT
  USING (is_moderator(auth.uid()));

-- Moderators can update pending profiles (for approval/rejection)
CREATE POLICY "Moderators can update pending profiles"
  ON pending_profiles FOR UPDATE
  USING (is_moderator(auth.uid()));

-- LINKED ACCOUNTS POLICIES

-- Users can view their own linked accounts
CREATE POLICY "Users can view own linked accounts"
  ON linked_accounts FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert linked accounts (via trigger/function)
CREATE POLICY "System can insert linked accounts"
  ON linked_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- AUDIT LOG POLICIES

-- Moderators can view audit log
CREATE POLICY "Moderators can view audit log"
  ON profile_audit_log FOR SELECT
  USING (is_moderator(auth.uid()));

-- System can insert audit log entries
CREATE POLICY "System can insert audit log"
  ON profile_audit_log FOR INSERT
  WITH CHECK (true);

-- MODERATORS TABLE POLICIES

-- Moderators can view moderator list
CREATE POLICY "Moderators can view moderator list"
  ON moderators FOR SELECT
  USING (is_moderator(auth.uid()));

-- Admin moderators can manage other moderators
CREATE POLICY "Admin moderators can insert moderators"
  ON moderators FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM moderators 
      WHERE user_id = auth.uid() AND can_manage_moderators = true
    )
  );

-- =============================================================================
-- INITIAL DATA
-- =============================================================================

-- You can add initial moderators here after creating your account
-- Replace 'YOUR_USER_UUID' with your actual Supabase auth user ID
-- 
-- INSERT INTO moderators (user_id, can_manage_moderators)
-- VALUES ('YOUR_USER_UUID', true);

-- =============================================================================
-- VIEWS FOR CONVENIENCE
-- =============================================================================

-- View for the moderation queue
CREATE OR REPLACE VIEW moderation_queue AS
SELECT 
  p.id,
  p.user_id,
  p.requested_runner_id,
  p.display_name,
  p.bio,
  p.created_at,
  la.provider,
  la.provider_username,
  la.provider_account_created_at,
  CASE 
    WHEN la.provider_account_created_at IS NOT NULL 
    THEN (NOW() - la.provider_account_created_at) >= '30 days'::INTERVAL
    ELSE false
  END AS account_age_ok
FROM pending_profiles p
LEFT JOIN linked_accounts la ON la.user_id = p.user_id
WHERE p.status = 'pending'
ORDER BY p.created_at ASC;

-- Grant access to the view
GRANT SELECT ON moderation_queue TO authenticated;

---
# =============================================================================
# TEST RUNNER - For Testing New Variables
# =============================================================================
# This is a placeholder runner profile for testing new features.
# Prefix with underscore to hide from Jekyll, or use hidden: true
# =============================================================================

layout: runner
runner_id: "_test-runner"
name: "Test Runner"
display_name: "Test Runner (Dev Only)"

# Hide from public listings
hidden: true
status: "test"

# Basic Info
pronouns: "they/them"
location: "Test Location"
joined_date: "2025-01-01"

# Avatar/Banner
avatar: "/assets/img/site/default-runner.png"
banner: "/assets/img/site/default-banner.jpg"

# Bio
bio: |
  This is a test runner profile for development purposes.
  Use it to test new profile variables and features.

# Social Links (test all types)
socials:
  twitch: "test_twitch"
  youtube: "test_youtube"
  twitter: "test_twitter"
  bluesky: "test.bsky.social"
  discord: "test#0000"
  instagram: "test_instagram"
  speedrun_com: "test_src"
  other:
    - name: "Test Link 1"
      url: "https://example.com/1"
    - name: "Test Link 2"
      url: "https://example.com/2"
    - name: "Test Link 3"
      url: "https://example.com/3"

# Games they run
games:
  - _test-game

# Stats (for testing stat display)
stats:
  total_runs: 0
  verified_runs: 0
  world_records: 0

# =========================================
# TEST VARIABLES - Add new ones here
# =========================================
test_variables:
  new_profile_feature: true
  badge_type: "tester"
  custom_field: "test value"
---

This is the test runner's profile content area.

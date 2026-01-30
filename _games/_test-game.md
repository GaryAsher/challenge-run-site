---
# =============================================================================
# TEST GAME - For Testing New Variables
# =============================================================================
# This is a placeholder game used for testing new features and variables.
# Prefix with underscore to hide from Jekyll processing, or use hidden: true
# =============================================================================

game_id: "_test-game"
game_name: "Test Game (Dev Only)"
game_name_short: "Test Game"
game_name_aliases:
  - "test"
  - "testing"

developer: "Test Developer"
publisher: "Test Publisher"
release_date: "2025-01-01"
platforms:
  - pc
  - playstation-5
  - xbox-series-X

genres:
  - Action
  - Adventure

cover_image: "/assets/img/site/default-game.jpg"
banner_image: "/assets/img/site/default-banner.jpg"

# Hide from public listings
status: "test"
hidden: true

description: |
  This is a test game for development purposes.
  Use it to test new variables and features.

category_tiers:
  - name: "Full Runs"
    slug: "full-runs"
    tier: 1
    categories:
      - name: "Any%"
        slug: "any"
        description: "Complete the game"
      - name: "100%"
        slug: "100"
        description: "Complete everything"

  - name: "Mini Challenges"
    slug: "mini-challenges"
    tier: 2
    categories:
      - name: "Test Category"
        slug: "test-category"
        description: "A test category"

standard_challenges:
  - hitless
  - damageless
  - deathless

rules: |
  ## Test Rules
  1. Test rule 1
  2. Test rule 2

resources:
  - name: "Test Link"
    url: "https://example.com"
    type: "guide"

moderators:
  - gary-asher

# =========================================
# TEST VARIABLES - Add new ones here
# =========================================
test_variables:
  new_feature: true
  test_string: "hello"
  test_number: 42
  test_array:
    - item1
    - item2
---

Test game content area.

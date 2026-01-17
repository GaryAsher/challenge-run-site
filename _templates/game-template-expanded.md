---
# =============================================================================
# CORE IDENTITY
# =============================================================================
layout: game
game_id: example-game
reviewers: []

game_name: "Example Game"
game_name_aliases:
  - "EG"
  - "Example"
status: "Active"

# =============================================================================
# METADATA (Moderators fill these in)
# =============================================================================
genres: []
platforms: []
release_year: 2024

cover: /assets/img/games/e/example-game.jpg
cover_position: center

# =============================================================================
# TIMING & VERSIONING
# =============================================================================
timing_method: "RTA"

# Version/Patch tracking - define which versions are tracked
# Leave empty if version doesn't matter for this game
version_tracking:
  enabled: false
  label: "Version"  # Could be "Patch", "Update", "Build", etc.
  options: []
  # Example with options:
  # enabled: true
  # label: "Patch"
  # options:
  #   - slug: "1.0"
  #     label: "1.0 (Launch)"
  #   - slug: "1.5"
  #     label: "1.5 (Balance Update)"
  #   - slug: "current"
  #     label: "Current Patch"

# DLC tracking - for games where DLC affects run routing
dlc_tracking:
  enabled: false
  label: "DLC"
  options: []
  # Example:
  # enabled: true
  # label: "Content"
  # options:
  #   - slug: "base"
  #     label: "Base Game Only"
  #   - slug: "dlc1"
  #     label: "With DLC 1"
  #   - slug: "all-dlc"
  #     label: "All DLC"

# =============================================================================
# UI CONFIGURATION
# =============================================================================
tabs:
  overview: true
  runs: true
  history: true
  resources: true
  forum: true
  extra_1: false
  extra_2: false

# Character/Weapon/Class column for run tables
character_column:
  enabled: false
  label: "Character"
  # options: []  # Optional: define allowed values

# =============================================================================
# CHALLENGE TYPES
# =============================================================================

# Standard challenges (site-wide definitions from _data/challenges.yml)
# These use slugs that reference the global challenge definitions
challenges:
  - hitless
  - damageless
  - no-hit-no-damage

# Community challenges (game-specific, defined here)
# These are challenges unique to this game's community
community_challenges: []
# Example:
# community_challenges:
#   - slug: fresh-file
#     label: "Fresh File"
#     description: "Complete on a new save with no prior upgrades or unlocks"
#   - slug: no-shops
#     label: "No Shops"
#     description: "Cannot purchase items from any shop"
#   - slug: pacifist
#     label: "Pacifist"
#     description: "Kill only required enemies/bosses"

# =============================================================================
# GLITCH CATEGORIES
# =============================================================================

# Standard glitch categories (most games use these)
glitches_data:
  - slug: unrestricted
    label: "Unrestricted"
  - slug: glitchless
    label: "Glitchless"

# Game-specific glitch categories (if the community has defined more)
# community_glitches:
#   - slug: nmg
#     label: "No Major Glitches"
#     description: "Minor glitches allowed, major sequence breaks banned"
#   - slug: oob-allowed
#     label: "OOB Allowed"
#     description: "Out of bounds glitches permitted"

# Documentation of known glitches (optional, for reference)
glitches_doc: ""
# Example:
# glitches_doc: |
#   **Wall Clip**: Allows passing through certain walls. Banned in Glitchless.
#   **Inventory Dupe**: Duplicates items. Banned in all categories.
#   See: https://speedrun.com/example/guides

# =============================================================================
# RESTRICTIONS
# =============================================================================

# Game-specific restrictions that can be applied to runs
restrictions: []
# Example:
# restrictions:
#   - "No Leveling"
#   - "No Fast Travel"
#   - "Hardcore Mode Required"

# =============================================================================
# CATEGORIES
# =============================================================================

# Category structure with optional subcategories (children)
categories_data: []
# Example:
# categories_data:
#   - slug: any
#     label: "Any%"
#   - slug: 100
#     label: "100%"
#   - slug: boss-rush
#     label: "Boss Rush"
#     children:
#       - slug: all-bosses
#         label: "All Bosses"
#       - slug: main-bosses
#         label: "Main Bosses Only"

# =============================================================================
# CREDITS & MODERATION
# =============================================================================

# People who helped set up this game's page
contributors: []
# Example:
# contributors:
#   - name: "SpeedRunner123"
#     role: "Initial setup"
#   - name: "ModeratorABC"
#     role: "Category definitions"

# Game moderators (can approve runs, edit rules)
# moderators: []
---

<!-- 
This is a game page template for Challenge Run Central.

SETUP CHECKLIST:
- [ ] Fill in game_id and name
- [ ] Add genres and platforms
- [ ] Set timing_method
- [ ] Define categories_data
- [ ] Define challenges (standard) and community_challenges (game-specific)
- [ ] Configure glitches_data
- [ ] Upload cover image
- [ ] Enable version_tracking or dlc_tracking if needed
-->

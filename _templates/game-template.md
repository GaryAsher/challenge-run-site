---
layout: game
game_id: GAME_ID_HERE
reviewers: []

game_name: "GAME NAME HERE"
game_name_aliases: []
status: "Pending review"

genres: []
platforms: []

cover: /assets/img/games/FIRST_LETTER/GAME_ID_HERE.jpg
cover_position: center

timing_method: "RTA"

tabs:
  overview: true
  runs: true
  rules: true
  history: true
  resources: true
  forum: true

character_column:
  enabled: false
  label: "Character"
  required: false
  # required_exclude_tiers:    # Uncomment to exclude specific tiers from required validation
  #   - mini_challenges         # e.g., character not required for mini-challenges

# =============================================================================
# CHALLENGE MODIFIERS (apply to any category)
# =============================================================================
challenges_data: []
# Example:
#   - slug: damageless
#     label: "Damageless"
#     description: "Do not lose any health."

# =============================================================================
# OPTIONAL RESTRICTIONS (apply to any category)
# =============================================================================
restrictions_data: []
# Example:
#   - slug: no-upgrades
#     label: "No Upgrades"
#     description: "Complete without purchasing any upgrades."

# =============================================================================
# GLITCH RULES (apply to any category)
# =============================================================================
glitches_data: []
# Example:
#   - slug: unrestricted
#     label: "Unrestricted"
#   - slug: glitchless
#     label: "Glitchless"

# =============================================================================
# FULL RUNS
# Require reaching some kind of ending
# =============================================================================
full_runs: []
# Example:
#   - slug: any-percent
#     label: "Any%"
#     description: "Complete the game as fast as possible."

# =============================================================================
# MINI-CHALLENGES
# In-game challenges that exist without requiring an ending
# =============================================================================
mini_challenges: []
# Example:
#   - slug: boss-rush
#     label: "Boss Rush"
#     description: "Complete the boss rush mode."
#     children:
#       - slug: all-bosses
#         label: "All Bosses"

# =============================================================================
# PLAYER-MADE CHALLENGES
# Community-created challenges with arbitrary goals
# Promoted from forum when popular enough
# =============================================================================
player_made: []
# Example:
#   - slug: no-jump
#     label: "No Jump"
#     description: "Complete the game without using the jump button."
#     creator: runner-slug
#     created_date: 2026-01-15
#     promoted_from_forum: true
---

Game description goes here.

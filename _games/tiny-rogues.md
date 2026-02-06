---
layout: game
game_id: tiny-rogues
status: "Active"
reviewers: []

# =============================================================================
# GAME INFO
# =============================================================================
game_name: "Tiny Rogues"
game_name_aliases:
  - "TR"

genres:
  - action
  - roguelike
  - bullet-hell
  - replay-value
  - difficult

platforms:
  - pc-steam

# =============================================================================
# TABS
# =============================================================================
tabs:
  overview: true
  runs: true
  rules: true
  history: true
  resources: true
  forum: true
  extra_1: false
  extra_2: false

# =============================================================================
# GENERAL RULES
# =============================================================================
general_rules: |
  - **Video Required:** All submissions must include video proof.
  - **No Mods:** External mods or cheats are not allowed.
  - Show death at the start of a run for unseeded.
  - Visualize Player Hitbox: ON (in Options under Gameplay).
  - Show the skill tree choices (optional).
  - Show Cinder options (optional).

# =============================================================================
# STANDARD CHALLENGE TYPES
# =============================================================================
challenges_data:
  - slug: damageless
    label: "Damageless"
    description: |
      - Damage is any loss of your character's current health, regardless of source.
      - Current health for Tiny Rogues are: Red Hearts and Soul Hearts.
      - Changes to maximum health are not damage, even if they also change current health.
      
  - slug: hitless
    label: "Hitless"
    description: |
      - Hits are any enemy attack that remove any of the top-left health/armor/evade resources.
      - Player-initiated actions that cause damage are NOT hits. (e.g: Opening a door/chest/altar that requires a heart instead of a key).
      
        **Exceptions:**
      - That one enemy in Shadow Planes that teleports you to a previous place you were standing is not a hit (it seems unavoidable).
      
  - slug: no-hit-no-damage
    label: "No-Hit / No-Damage"
    description: |
      Follow both Hitless and Damageless rules.

# =============================================================================
# COMMUNITY CHALLENGES
# =============================================================================
community_challenges: []

# =============================================================================
# OPTIONAL RESTRICTIONS
# =============================================================================
restrictions_data:
  - slug: companions-only
    label: "Companions Only"
    description: |
      - This restriction starts after the Floor 1 boss.
      - Deal damage only through companions.
      - Attacks/Abilities/Items from the player after Floor 1 are not allowed.

# =============================================================================
# GLITCH CATEGORIES
# =============================================================================
# Glitches not relevant for this game
glitches_relevant: false
glitches_data: []

# =============================================================================
# FULL RUNS
# Require reaching some kind of ending
# =============================================================================
full_runs:
  - slug: any
    label: "Any%"
    description: |
      Beat the game with any amount of Cinder.
    
  - slug: cinder-16
    label: "Cinder 16"
    description: |
      Beat the game with all 16 Cinder modifiers active.
    
  - slug: quest-any
    label: "Quest Any%"
    description: |
      Beat a Quest with any amount of Cinder.
    fixed_character: true
    
  - slug: quest-cinder-16
    label: "Quest Cinder 16"
    description: |
      Beat a Quest with all 16 Cinder modifiers active.
    fixed_character: true

# =============================================================================
# MINI-CHALLENGES
# In-game challenges that exist without requiring an ending
# =============================================================================
mini_challenges: []

# =============================================================================
# PLAYER-MADE CHALLENGES
# Community-created challenges with arbitrary goals
# Promoted from forum when popular enough
# =============================================================================
player_made: []

# =============================================================================
# TIMING METHOD
# =============================================================================
timing_method: IGT

# =============================================================================
# CHARACTER OPTIONS
# =============================================================================
character_column:
  enabled: true
  label: "Class"

characters_data: []

# =============================================================================
# COVER / DISPLAY
# =============================================================================
cover: /assets/img/games/t/tiny-rogues.jpg
cover_position: center

# =============================================================================
# COMMUNITY ACHIEVEMENTS
# =============================================================================
community_achievements: []

# =============================================================================
# CREDITS
# =============================================================================
credits:
  - name: "Gary_Asher"
    role: "Category and rule definitions"
---

Tiny Rogues is a challenging roguelike dungeon crawler with bullet-hell elements. Players choose from over 30 unique classes, each with distinct playstyles and abilities. The game features procedurally generated dungeons, hundreds of items and weapons, and intense boss battles.

The Cinder difficulty system allows players to add up to 16 modifiers that increase challenge, making it a favorite for challenge runners seeking the ultimate test of skill.

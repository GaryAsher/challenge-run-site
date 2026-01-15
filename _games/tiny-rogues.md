---
layout: game
game_id: tiny-rogues
reviewers: []

name: "Tiny Rogues"
name_aliases:
  - "TR"
status: "Active"

genres:
  - action
  - roguelike
  - bullet-hell
  - replay-value
  - difficult
platforms:
  - pc-steam

cover: /assets/img/games/t/tiny-rogues.jpg
cover_position: center

timing_method: "IGT (In-Game Time)"

tabs:
  overview: true
  runs: true
  history: true
  resources: true
  forum: true
  extra_1: false
  extra_2: false

character_column:
  enabled: true
  label: "Class"

# =============================================================================
# GENERAL RULES
# =============================================================================
general_rules:
  - "**Video Required:** All submissions must include video proof"
  - "**No Mods:** External mods or cheats are not allowed"
  - "Show death at the start of a run for unseeded."
  - "Visualize Player Hitbox: ON (in Options under Gameplay)"
  - "Show the skill tree choices (optional)."
  - "Show Cinder options (optional)."

# =============================================================================
# STANDARD CHALLENGE TYPES
# =============================================================================
challenges_data:
  - slug: damageless
    label: "Damageless"
    description: |
      • Complete the run without taking any damage.

      • Damage is any loss of your character's current health, regardless of source.
      
        • Current health for Tiny Rogues are: Red Hearts and Soul Hearts.
      
      • Changes to maximum health are not damage, even if they also change current health.
  - slug: hitless
    label: "Hitless"
    description: |
      Complete the run without being hit by any enemy attack.

      • Environmental damage may be allowed depending on category
      • Check specific category rules for clarification
  - slug: no-hit-no-damage
    label: "No-Hit / No-Damage"
    description: |
      The strictest challenge combining both Hitless and Damageless rules.

      • No hits from any source
      • No damage taken from any source

# Glitches not relevant for this game
glitches_relevant: false

# =============================================================================
# RESTRICTIONS
# =============================================================================
restrictions_data:
  - slug: companions-only
    label: "Companions Only"
    description: "Deal damage only through companions. Attacks/Abilities/Items from the player are not allowed."

# =============================================================================
# CATEGORIES
# =============================================================================
categories_data:
  - slug: any
    label: "Any%"
    description: "Beat the game with any amount of Cinder."
  - slug: cinder-16
    label: "Cinder 16"
    description: "Beat the game with all 16 Cinder modifiers active."
  - slug: quest-any
    label: "Quest Any%"
    description: "Beat a Quest with any amount of Cinder."
  - slug: quest-cinder-16
    label: "Quest Cinder 16"
    description: "Beat a Quest with all 16 Cinder modifiers active."

# =============================================================================
# CREDITS
# =============================================================================
credits:
  - name: "Gary_Asher"
    role: "Category and rule definitions"
---

Tiny Rogues is a challenging roguelike dungeon crawler with bullet-hell elements. Players choose from over 30 unique classes, each with distinct playstyles and abilities. The game features procedurally generated dungeons, hundreds of items and weapons, and intense boss battles.

The Cinder difficulty system allows players to add up to 16 modifiers that increase challenge, making it a favorite for challenge runners seeking the ultimate test of skill.

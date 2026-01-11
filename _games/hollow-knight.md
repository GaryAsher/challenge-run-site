---
layout: game
game_id: hollow-knight
reviewers: []

name: "Hollow Knight"
name_aliases:
  - "HK"
status: "Active"

genres:
  - metroidvania
  - platformer
  - difficult
  - 2d
  - indie
platforms:
  - steam
  - nintendo-switch
  - playstation-4
  - xbox-one
  - nintendo-switch-2

cover: /assets/img/games/h/hollow-knight.jpg
cover_position: center

timing_method: "LRT (Load-Removed Time)"

tabs:
  overview: true
  runs: true
  history: true
  resources: true
  forum: true
  extra_1: false
  extra_2: false

character_column:
  enabled: false
  label: "Character"

# =============================================================================
# STANDARD CHALLENGE TYPES
# Game-specific descriptions override the defaults from _data/challenges.yml
# This is the SINGLE SOURCE OF TRUTH for Hollow Knight challenge definitions
# =============================================================================
challenges_data:
  - slug: hitless
    label: "Hitless"
    description: "Complete the run without taking any hits. In Hollow Knight, Baldur Shell blocking and activating Carefree Melody counts as a hit."
  - slug: damageless
    label: "Damageless"
    description: "Complete the run without losing any masks."
  - slug: deathless
    label: "Deathless"
    description: "Complete the run without dying. Shade must not be created at any point."
  - slug: blindfolded
    label: "Blindfolded"
    description: "Complete the run without being able to see the screen. Audio cues and muscle memory only. Monitor must be visibly off or covered."
  - slug: no-hit-no-damage
    label: "No-Hit / No-Damage"
    description: "The strictest challenge - no hits AND no mask damage allowed. Combines Hitless and Damageless rules."

# =============================================================================
# COMMUNITY CHALLENGES
# Game-specific challenges created by the Hollow Knight community
# =============================================================================
community_challenges:
  - slug: radiant-bosses
    label: "Radiant Bosses"
    description: "Defeat bosses on Radiant difficulty in the Hall of Gods. One hit = instant death. All Radiant requires defeating every boss on Radiant."

# =============================================================================
# GLITCH CATEGORIES
# Defines what glitches/exploits are allowed in each category
# =============================================================================
glitches_data:
  - slug: unrestricted
    label: "Unrestricted"
    description: "All glitches and exploits are allowed. This is the fastest category but requires extensive glitch knowledge."
    allowed:
      - "Storage"
      - "Wrong Warps"
      - "Swim in Air"
      - "Room Duplication"
      - "All sequence breaks"
    notes: "Recommended for experienced runners only."
    
  - slug: nmg
    label: "No Major Glitches (NMG)"
    description: "Major sequence-breaking glitches are banned, but minor optimizations and skips are allowed."
    allowed:
      - "Fireball skips"
      - "Pogo damage boosts"
      - "Inventory drops"
      - "Shade skips"
      - "Acid skips with Isma's Tear"
    banned:
      - "Storage"
      - "Wrong Warps"
      - "Swim in Air"
      - "Room Duplication"
      - "Lever skips"
    notes: "Most popular category for challenge runs."
      
  - slug: glitchless
    label: "Glitchless"
    description: "No glitches of any kind. The game must be played exactly as intended by Team Cherry."
    banned:
      - "All glitches"
      - "All unintended skips"
      - "Damage boosting through hazards"
    notes: "Purist category - play the game as designed."
      
  - slug: no-main-menu-storage
    label: "No Main Menu Storage (NMMS)"
    description: "Runs must show the main menu at the start to prove no storage glitch is active. Required for Team Hitless verification."
    banned:
      - "Main Menu Storage"
      - "Pre-loaded storage states"
    notes: "Standard requirement for all Team Hitless submissions. Main menu MUST be visible at run start."

# =============================================================================
# OPTIONAL RESTRICTIONS
# Additional restrictions runners can voluntarily apply
# =============================================================================
restrictions_data:
  - slug: no-charms
    label: "No Charms"
    description: "Complete a run without equipping any charms. Charms and charm notches may still be collected."
  - slug: no-nail-upgrades
    label: "No Nail Upgrades"
    description: "Complete a run without upgrading the nail. Base nail damage only."
  - slug: no-spells
    label: "No Spells"
    description: "Complete the run without using Vengeful Spirit, Desolate Dive, or Howling Wraiths (or their upgrades)."
  - slug: base-nail-only
    label: "Base Nail Only"
    description: "No nail upgrades, no spells, no charms. Pure base nail combat only."
  - slug: no-monarch-wings
    label: "No Monarch Wings"
    description: "Complete a run without obtaining Monarch Wings."
    incompatible_with:
      - "all-skills"
      - "112-apb"
      - "107-ab"

# =============================================================================
# RUN CATEGORIES
# Main speedrun/challenge categories for the game
# =============================================================================
categories_data:
  - slug: any
    label: "Any%"
    description: "Complete the game and achieve any ending."
  - slug: all-skills
    label: "All Skills"
    description: "Obtain all movement abilities and spells before completing the game."
  - slug: true-ending
    label: "True Ending"
    description: "Achieve the 'Dream No More' ending by collecting the Void Heart and using the Dream Nail on the Hollow Knight."
  - slug: 107-ab
    label: "107% AB"
    description: "Achieve 107%, defeat all bosses that appear in both the Hall of Gods and the overworld, and finish the game by defeating The Radiance"
  - slug: 112-apb
    label: "112% APB"
    description: "Achieve 112% completion and defeat All Pantheon Bosses within their respective pantheons, including Grey Prince Zote (in both Pantheon 3 and Pantheon 5) and Absolute Radiance."
  - slug: low-percent
    label: "Low%"
    description: "Complete the game with minimum percentage (11%)."
  - slug: pantheons
    label: "Pantheons"
    description: "Complete Pantheon boss gauntlets from the Godmaster DLC."
    children:
      - slug: pantheon-1
        label: "Pantheon of the Master"
        description: "10 bosses, ends with Oro & Mato."
      - slug: pantheon-2
        label: "Pantheon of the Artist"
        description: "10 bosses, ends with Paintmaster Sheo."
      - slug: pantheon-3
        label: "Pantheon of the Sage"
        description: "10 bosses, ends with Sly."
      - slug: pantheon-4
        label: "Pantheon of the Knight"
        description: "10 bosses, ends with Pure Vessel."
      - slug: pantheon-5
        label: "Pantheon of Hallownest"
        description: "42 bosses, ends with Absolute Radiance."
  - slug: boss-rush
    label: "Boss Rush"
    description: "Hall of Gods challenges - defeat bosses under specific conditions."
    children:
      - slug: hall-of-gods
        label: "Hall of Gods"
        description: "Complete Hall of Gods challenges."
---

Hollow Knight is a challenging 2D action-adventure game set in the vast, interconnected underground kingdom of Hallownest. The game features tight combat, intricate exploration, and a haunting atmosphere.

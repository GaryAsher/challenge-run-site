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

# Standard challenge types (from _data/challenges.yml)
challenges:
  - hitless
  - damageless
  - deathless
  - blindfolded
  - no-hit-no-damage

# Game-specific community challenges
community_challenges:
  - slug: low-percent
    label: "Low%"
    description: "Complete with minimum percentage/items collected"
  - slug: pantheon-hitless
    label: "Pantheon Hitless"
    description: "Complete a Pantheon boss gauntlet without taking any damage"
  - slug: radiant-bosses
    label: "Radiant Bosses"
    description: "Defeat bosses on Radiant difficulty (one hit = death)"

# Glitch categories with detailed rules
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

# Optional restrictions runners can add
restrictions:
  - "No Charms"
  - "No Nail Upgrades"
  - "No Spells"
  - "Base Nail Only"
  - "No Monarch Wings"

# Main speedrun categories - ordered by popularity
categories_data:
  - slug: any
    label: "Any%"
  - slug: all-bosses
    label: "All Bosses"
  - slug: true-ending
    label: "True Ending"
  - slug: 112-apb
    label: "112% APB"
  - slug: 107-ab
    label: "107% AB"
  - slug: 106-te
    label: "106% TE"
  - slug: low-percent
    label: "Low%"
  - slug: all-skills
    label: "All Skills"
  - slug: godhome-ending
    label: "Godhome Ending"
  - slug: pantheons
    label: "Pantheons"
    children:
      - slug: pantheon-1
        label: "Pantheon of the Master"
      - slug: pantheon-2
        label: "Pantheon of the Artist"
      - slug: pantheon-3
        label: "Pantheon of the Sage"
      - slug: pantheon-4
        label: "Pantheon of the Knight"
      - slug: pantheon-5
        label: "Pantheon of Hallownest"
  - slug: boss-rush
    label: "Boss Rush"
    children:
      - slug: all-radiant
        label: "All Radiant"
      - slug: hall-of-gods
        label: "Hall of Gods"
---

Hollow Knight is a challenging 2D action-adventure game set in the vast, interconnected underground kingdom of Hallownest. The game features tight combat, intricate exploration, and a haunting atmosphere.

## Popular Challenge Categories

### Hitless/Damageless/Flawless Runs
- **Any% Hitless**: Complete the game without taking any damage
- **All Bosses Hitless**: Defeat all bosses without being hit
- **Pantheon 5 Hitless (P5H)**: Complete the 42-boss gauntlet without damage

### Special Challenges
- **Low% Godhome**: Reach the Godhome ending with minimum items (extremely difficult)
- **Blindfolded**: Complete the game without seeing (audio cues only)
- **Steel Soul + Hitless**: Permadeath mode combined with no damage

## Resources

- [Speedrun.com Leaderboard](https://www.speedrun.com/hollowknight)
- [Team Hitless - Hollow Knight](https://www.teamhitless.com/games/hollow-knight/)
- [Hollow Knight Speedrunning Wiki](https://hollow-knight-speedrunning.fandom.com/)

---
layout: game
game_id: hollow-knight-modded
status: "Active"
reviewers: []

# =============================================================================
# MODDED GAME INFO
# =============================================================================
is_modded: true
base_game: hollow-knight

game_name: "Hollow Knight (Modded)"
game_name_aliases:
  - "HK Modded"
  - "Modded Hollow Knight"
  - "HK Gun Mod"

genres:
  - metroidvania
  - platformer
  - difficult
  - 2d
  - indie

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
  - **Video Required:** All submissions must include video proof showing the full run.
  - **Mod Version Required:** Clearly state which mod(s) and version(s) are being used in your submission.
  - **Mod Installation:** Mods must be installed through the Hollow Knight Modding API.
  - **Main Menu Required:** Show main menu at start of run (proves no storage glitch active).
  - **Mod Visibility:** The mod's effects should be clearly visible in the video for verification.

# =============================================================================
# STANDARD CHALLENGE TYPES
# =============================================================================
challenges_data:
  - slug: hitless
    label: "Hitless"
    description: |
      Complete the run without taking any hits. Mod-specific damage sources (like gun recoil if applicable) follow standard hitless rules.

  - slug: damageless
    label: "Damageless"
    description: |
      Complete the run without losing any masks. All damage sources count, including mod-added ones.

  - slug: deathless
    label: "Deathless"
    description: |
      Complete the run without dying. Shade must not be created at any point.

  - slug: gun-only
    label: "Gun Only"
    description: |
      **Mod-Specific Challenge:** Complete the run using ONLY the gun mod for all combat. No nail attacks, no spells (except for movement if needed).

  - slug: no-hit-no-damage
    label: "No-Hit / No-Damage"
    description: |
      The strictest challenge - no hits AND no mask damage allowed. Combines Hitless and Damageless rules.

# =============================================================================
# OPTIONAL RESTRICTIONS
# =============================================================================
restrictions_data:
  - slug: vanilla-movement
    label: "Vanilla Movement Only"
    description: |
      Only use vanilla movement abilities. No mod-added mobility options.

  - slug: no-gun-upgrades
    label: "No Gun Upgrades"
    description: |
      Use only the base gun without any upgrades or modifications (if the mod supports upgrades).

  - slug: gun-and-nail
    label: "Gun + Nail"
    description: |
      Free use of both gun and nail. Default if no restriction specified.

  - slug: no-charms
    label: "No Charms"
    description: |
      Complete a run without equipping any charms. Charms and charm notches may still be collected.

  - slug: pacifist-gun
    label: "Pacifist Gun"
    description: |
      Only use the gun for required kills (bosses, progression blockers). Avoid all optional enemies.

# =============================================================================
# GLITCH CATEGORIES
# =============================================================================
glitches_data:
  - slug: unrestricted
    label: "Unrestricted"
    description: |
      All glitches and exploits are allowed, including any mod-specific glitches.

  - slug: nmg
    label: "No Major Glitches (NMG)"
    description: |
      Major sequence-breaking glitches are banned. Mod-specific glitches follow the same classification as vanilla equivalents.
    banned:
      - "Storage"
      - "Wrong Warps"
      - "Swim in Air"

  - slug: glitchless
    label: "Glitchless"
    description: |
      No glitches of any kind. The game must be played as intended (with mod content).

# =============================================================================
# FULL RUNS
# =============================================================================
full_runs:
  - slug: any-gun
    label: "Any% (Gun)"
    description: "Complete the game using the gun mod. Any ending accepted."

  - slug: gun-only-any
    label: "Gun Only Any%"
    description: "Complete the game using ONLY the gun for all combat."

  - slug: all-bosses-gun
    label: "All Bosses (Gun)"
    description: "Defeat all bosses using the gun mod."

  - slug: pantheon-gun
    label: "Pantheon Runs (Gun)"
    description: "Complete Pantheon boss gauntlets using the gun mod."
    children:
      - slug: p1-gun
        label: "Pantheon 1 (Gun)"
        description: "Complete Pantheon of the Master with the gun mod."
      - slug: p2-gun
        label: "Pantheon 2 (Gun)"
        description: "Complete Pantheon of the Artist with the gun mod."
      - slug: p3-gun
        label: "Pantheon 3 (Gun)"
        description: "Complete Pantheon of the Sage with the gun mod."
      - slug: p4-gun
        label: "Pantheon 4 (Gun)"
        description: "Complete Pantheon of the Knight with the gun mod."
      - slug: p5-gun
        label: "Pantheon 5 (Gun)"
        description: "Complete Pantheon of Hallownest with the gun mod. The ultimate modded challenge."

# =============================================================================
# MINI-CHALLENGES
# =============================================================================
mini_challenges:
  - slug: boss-rushes
    label: "Boss Rushes (Gun)"
    description: "Hall of Gods challenges using the gun mod."
    children:
      - slug: radiant-gun
        label: "All Radiant (Gun)"
        description: "Defeat all bosses on Radiant difficulty using only the gun."

# =============================================================================
# TIMING METHOD
# =============================================================================
timing_method: LRT

# =============================================================================
# CHARACTER OPTIONS
# =============================================================================
character_column:
  enabled: true
  label: "Gun Type / Build"

characters_data:
  - slug: pistol-standard
    label: "Standard Pistol"
  - slug: shotgun
    label: "Shotgun"
  - slug: rifle
    label: "Rifle"
  - slug: smg
    label: "SMG"
  - slug: mixed-loadout
    label: "Mixed Loadout"

# =============================================================================
# COVER / DISPLAY
# =============================================================================
cover: /assets/img/games/h/hollow-knight.jpg
cover_position: center

# =============================================================================
# SUPPORTED MODS
# =============================================================================
supported_mods:
  - name: "HKGun / Hollow Point"
    description: "Adds firearms to Hollow Knight, replacing or supplementing the nail with various gun types."
    url: "https://github.com/example/hkgun"
    version: "1.5.0+"
    required: true
  - name: "Modding API"
    description: "Required base for all Hollow Knight mods."
    url: "https://github.com/hk-modding/api"
    version: "Latest"
    required: true
  - name: "Custom Knight"
    description: "Optional - allows custom skins for gun-wielding knight."
    url: "https://github.com/example/customknight"
    required: false

# =============================================================================
# COMMUNITY ACHIEVEMENTS
# =============================================================================
community_achievements:
  - slug: gun-master
    title: "Gun Master"
    description: "Complete all 5 Pantheons using only the gun mod"
    icon: "🔫"
    difficulty: legendary
    total_required: 5
    requirements:
      - "Complete Pantheon 1 (Gun Only)"
      - "Complete Pantheon 2 (Gun Only)"
      - "Complete Pantheon 3 (Gun Only)"
      - "Complete Pantheon 4 (Gun Only)"
      - "Complete Pantheon 5 (Gun Only)"

  - slug: absrad-gun
    title: "Absolute Firepower"
    description: "Defeat Absolute Radiance using only the gun"
    icon: "☀️"
    difficulty: hard
    total_required: 1
    requirements:
      - "Defeat Absolute Radiance in P5 or Hall of Gods using only gun attacks"
      - "No nail, no spells for damage"

---

Welcome to the modded Hollow Knight challenge run community! This page tracks runs using the popular **Gun Mod** (HKGun/Hollow Point), which replaces or supplements the Knight's nail with various firearms.

**Why Gun Mod?**
The gun mod completely changes Hollow Knight's combat dynamics. Ranged combat creates new strategies for boss fights, platforming challenges, and speedrun routing. It's a fresh way to experience a classic game!

**Getting Started:**
1. Install the Hollow Knight Modding API
2. Download the Gun Mod from the Resources tab
3. Configure your preferred gun type
4. Start running!

For vanilla Hollow Knight runs without mods, visit the [main Hollow Knight page](/games/hollow-knight/).

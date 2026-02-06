---
layout: game
game_id: hades-2
status: "Active"
reviewers: []

# =============================================================================
# GAME INFO
# =============================================================================
game_name: "Hades II"
game_name_aliases:
  - "Hades 2"
  - "Hades2"

genres:
  - action
  - roguelike
  - roguelite
  - hack-and-slash
  - mythology

platforms:
  - pc-steam
  - pc-epic-games
  - nintendo-switch
  - nintendo-switch-2

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
  - **No Cheats/Mods:** Gameplay-altering mods are not allowed.
  - Show in-game timer: Options → Gameplay → "Timer Display".
  - Unseeded (do one of these before the run):
    - Salute the Oath of the Unseen and confirm the "Fate Altered!" message
    - Show the previous run's death
    - Show a completed run followed by a death.
  - Show Arcana Cards at either the beginning or end of the run (optional).
  - Show Vows from the Oath of the Unseen (optional).
  - Make sure no HUD elements are covered.

# =============================================================================
# STANDARD CHALLENGE TYPES
# =============================================================================
challenges_data:
  - slug: damageless
    label: "Damageless"
    description: |
      - Do not lose any Health or Armor.
      - Changes to maximum health are not damage, even if they also change current health or later restore.
      
  - slug: hitless
    label: "Hitless"
    description: |
      - Do not become stunned by any effect (represented by a star orbiting around Melinoë's head).
      - Do not trigger damage nullifiers such as Dodge, Daze, The Lovers, or any similar effects that convert an enemy hit into zero damage. You may select boons with these effects so long as the dodge / miss effect does not activate.

        **Exceptions:**
      - Vacuum attacks that pull Melinoë into melee range are NOT considered hits, even if they display the star animation above Melinoë's head.

  - slug: no-hit-no-damage
    label: "No-Hit / No-Damage"
    description: |
      - Do not lose any health.
      - Do not trigger any Dodge or Deflect abilities.
      - Do not block any attacks.

# =============================================================================
# OPTIONAL RESTRICTIONS
# =============================================================================
restrictions_data:
  - slug: arcanaless
    label: "Arcanaless"
    description: |
      - Complete a run with no Arcana Cards selected or Vow of Void(4) selected in the Oath of the Unseen.
      - Do not activate Arcana Cards in any way.

  - slug: boonless
    label: "Boonless"
    description: |
      - Do not utilize any boons from any god. You may pick up a boon from a god so long as you do not benefit it in any way.

  - slug: hestia-only
    label: "Hestia Only"
    description: |
      - Only utilize boons from Hestia. You may pick up a boon from another god so long as you do not benefit from it in any way.

  - slug: no-hexes
    label: "No Hexes"
    description: |
      - Complete a run without activating any hexes from Selene. You may pick a hex so long as you do not benefit it in any way.

  - slug: one-god-only
    label: "One God Only"
    description: |
      - Only utilize boons from one god. You may pick up a boon from a god so long as you do not benefit it in any way.

# =============================================================================
# GLITCH CATEGORIES
# =============================================================================
glitches_data:
  - slug: unrestricted
    label: "Unrestricted"
    description: |
      - All glitches and exploits are allowed.

  - slug: nmg
    label: "No Major Glitches"
    description: |
      - No out-of-bounds, wrong warps, AI/encounter breaks, or item/RNG manipulation.

  - slug: glitchless
    label: "Glitchless"
    description: |
      - No glitches of any kind.

# =============================================================================
# FULL RUNS
# Require reaching some kind of ending
# =============================================================================
full_runs:
  - slug: underworld-any
    label: "Underworld Any%"
    description: "Complete the Underworld route with any amount of Fear."

  - slug: surface-any
    label: "Surface Any%"
    description: "Complete the Surface route with any amount of Fear."

  - slug: underworld-vor4
    label: "Underworld VoR4"
    description: "Complete the Underworld route with Vow of Rivals(4) selected in the Oath of the Unseen."

  - slug: surface-vor4
    label: "Surface VoR4"
    description: "Complete the Surface route with Vow of Rivals(4) selected in the Oath of the Unseen."

# =============================================================================
# MINI-CHALLENGES
# In-game challenges that exist without requiring an ending
# =============================================================================
mini_challenges:
  - slug: chaos-trials
    label: "Chaos Trials"
    description: "Complete one of the 15 Chaos Trials."
    children:
      - slug: trial-of-origin
        label: "Trial of Origin"
        fixed_character: true
      - slug: trial-of-salt
        label: "Trial of Salt"
        fixed_character: true
      - slug: trial-of-humility
        label: "Trial of Humility"
        fixed_character: true
      - slug: trial-of-vengeance
        label: "Trial of Vengeance"
        fixed_character: true
      - slug: trial-of-moon
        label: "Trial of Moon"
        fixed_character: true
      - slug: trial-of-vigor
        label: "Trial of Vigor"
        fixed_character: true
      - slug: trial-of-flame
        label: "Trial of Flame"
        fixed_character: true
      - slug: trial-of-gold
        label: "Trial of Gold"
        fixed_character: true
      - slug: trial-of-fury
        label: "Trial of Fury"
        fixed_character: true
      - slug: trial-of-precarity
        label: "Trial of Precarity"
        fixed_character: true
      - slug: trial-of-heartache
        label: "Trial of Heartache"
        fixed_character: true
      - slug: trial-of-haste
        label: "Trial of Haste"
        fixed_character: true
      - slug: trial-of-blood
        label: "Trial of Blood"
        fixed_character: true
      - slug: trial-of-doom
        label: "Trial of Doom"
        fixed_character: true
      - slug: trial-of-destiny
        label: "Trial of Destiny"
        fixed_character: true

# =============================================================================
# PLAYER-MADE CHALLENGES
# Community-created challenges with arbitrary goals
# Promoted from forum when popular enough
# =============================================================================
player_made: []
# Example:
#   - slug: no-dash
#     label: "No Dash"
#     description: "Complete a run without using the dash ability."
#     creator: runner-slug
#     created_date: 2026-01-15
#     promoted_from_forum: true

# =============================================================================
# TIMING METHOD
# =============================================================================
timing_method: IGT

# =============================================================================
# CHARACTER OPTIONS
# =============================================================================
character_column:
  enabled: true
  label: "Weapon / Aspect"

characters_data:
  - slug: witchs-staff-melinoe-aspect
    label: "Witch's Staff / Melinoë Aspect"
  - slug: witchs-staff-circe-aspect
    label: "Witch's Staff / Circe Aspect"
  - slug: witchs-staff-momus-aspect
    label: "Witch's Staff / Momus Aspect"
  - slug: witchs-staff-anubis-aspect
    label: "Witch's Staff / Anubis Aspect"
    
  - slug: sister-blades-melinoe-aspect
    label: "Sister Blades / Melinoë Aspect"
  - slug: sister-blades-artemis-aspect
    label: "Sister Blades / Artemis Aspect"
  - slug: sister-blades-pan-aspect
    label: "Sister Blades / Pan Aspect"
  - slug: sister-blades-morrigan-aspect
    label: "Sister Blades / Morrigan Aspect"
  
  - slug: umbral-flames-melinoe-aspect
    label: "Umbral Flames / Melinoë Aspect"
  - slug: umbral-flames-moros-aspect
    label: "Umbral Flames / Moros Aspect"
  - slug: umbral-flames-eos-aspect
    label: "Umbral Flames / Eos Aspect"
  - slug: umbral-flames-supay-aspect
    label: "Umbral Flames / Supay Aspect"
    
  - slug: moonstone-axe-melinoe-aspect
    label: "Moonstone Axe / Melinoë Aspect"
  - slug: moonstone-axe-charon-aspect
    label: "Moonstone Axe / Charon Aspect"
  - slug: moonstone-axe-thanatos-aspect
    label: "Moonstone Axe / Thanatos Aspect"
  - slug: moonstone-axe-nergal-aspect
    label: "Moonstone Axe / Nergal Aspect"  
    
  - slug: argent-skull-melinoe-aspect
    label: "Argent Skull / Melinoë Aspect"
  - slug: argent-skull-medea-aspect
    label: "Argent Skull / Medea Aspect"
  - slug: argent-skull-persephone-aspect
    label: "Argent Skull / Persephone Aspect"
  - slug: argent-skull-hel-aspect
    label: "Argent Skull / Hel Aspect"

  - slug: black-coat-melinoe-aspect
    label: "Black Coat / Melinoë Aspect"
  - slug: black-coat-selene-aspect
    label: "Black Coat / Selene Aspect"
  - slug: black-coat-nyx-aspect
    label: "Black Coat / Nyx Aspect"
  - slug: black-coat-shiva-aspect
    label: "Black Coat / Shiva Aspect"

# =============================================================================
# COVER / DISPLAY
# =============================================================================
cover: /assets/img/games/h/hades-2.jpg
cover_position: center

# =============================================================================
# COMMUNITY ACHIEVEMENTS
# =============================================================================

community_achievements:
  - slug: all-aspects-clear
    title: "All Aspects"
    description: "Complete a successful run with every weapon aspect in the game"
    icon: "⚔️"
    difficulty: hard    # easy | medium | hard | legendary
    total_required: 24       # For progress tracking (24 total aspects)
    requirements:
      - "Clear with Witch's Staff - All 4 aspects (Melinoë, Artemis, Circle, Pan)"
      - "Clear with Sister Blades - All 4 aspects (Melinoë, Artemis, Hestia, Pan)"
      - "Clear with Moonstone Axe - All 4 aspects (Melinoë, Charon, Thanatos, Nergal)"
      - "Clear with Umbral Flames - All 4 aspects (Melinoë, Moros, Eos, Hypnos)"
      - "Clear with Argent Skull - All 4 aspects (Melinoë, Medea, Persephone, Hel)"
      - "Clear with Black Coat - All 4 aspects (Melinoë, Selene, Nyx, Shiva)"

---

Hades II is an action roguelike from Supergiant Games, the sequel to the award-winning Hades. Play as Melinoë, Princess of the Underworld, as she battles through the realms to defeat the Titan of Time.

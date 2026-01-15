---
layout: game
game_id: hades-2
reviewers: []

name: "Hades II"
name_aliases:
  - "Hades 2"
  - "Hades2"
status: "Active"

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

cover: /assets/img/games/h/hades-2.jpg
cover_position: center

timing_method: IGT

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
  label: "Weapon / Aspect"
  
# =============================================================================
# GENERAL RULES
# Game-specific general rules (overrides defaults if present)
# Use | for multi-line descriptions with bullet points
# =============================================================================
general_rules: |
  **Video Required:** All submissions must include video proof showing the full run.

  **No Cheats/Mods:** Gameplay-altering mods are not allowed.

  Show in-game timer: Options → Gameplay → "Timer Display".

  Unseeded (do one of these before the run):
    - Salute the Oath of the Unseen and confirm the “Fate Altered!” message"
    - "Show the previous run's death"
    - "Show a completed run followed by a death."

  Show Arcana Cards at either the beginning or end of the run (optional).

  Show Vows from the Oath of the Unseen (optional).

  Make sure no HUD elements are covered.
  
# =============================================================================
# STANDARD CHALLENGE TYPES
# Game-specific descriptions - SINGLE SOURCE OF TRUTH for Hades II
# =============================================================================
challenges_data:
  - slug: hitless
    label: "Hitless"
    description: |
      
      ●  Do not become stunned by any effect (represented by a star orbiting around Melinoë’s head).
      
      ●  Do not trigger damage nullifiers such as Dodge, Daze, The Lovers, or any similar effects that convert an enemy hit into zero damage. You may select boons with these effects so long as the dodge / miss effect does not activate.
      ### Exceptions: 

      ●  Vacuum attacks that pull Melinoë into melee range are NOT considered hits, even if they display the star animation above Melinoë’s head.
  - slug: damageless
    label: "Damageless"
    description: |
      
      ●  Do not lose any Health or Armor.
      
      ●  Changes to maximum health are not damage, even if they also change current health or later restore.
  - slug: no-hit-no-damage
    label: "No-Hit / No-Damage"
    description: |
      
      ●  Do not lose any health.
      
      ●  Do not trigger any Dodge or Deflect abilities.
      
      ●  Do not block any attacks.
# =============================================================================
# COMMUNITY CHALLENGES
# Game-specific challenges created by the Hades II community
# =============================================================================
community-challenges:
  - slug: one-god-only
    label: "One God Only"
    description: |
      
      ●  Only utilize boons from one god. You may pick up a boon from a god so long as you do not benefit it in any way.
  - slug: boonless
    label: "Boonless"
    description: |
      
      ●  Do not utilize any boons from any god. You may pick up a boon from a god so long as you do not benefit it in any way.
# =============================================================================
# GLITCH CATEGORIES
# Defines what glitches/exploits are allowed
# =============================================================================
glitches_data:
  - slug: unrestricted
    label: "Unrestricted"
    description: |
      
      ●  All glitches and exploits are allowed.
  - slug: nmg
    label: "No Major Glitches"
    description: |
      
      ●  No out-of-bounds, wrong warps, AI/encounter breaks, or item/RNG manipulation.
  - slug: glitchless
    label: "Glitchless"
    description: |
      
      ●  No glitches of any kind.
# =============================================================================
# OPTIONAL RESTRICTIONS
# Additional restrictions runners can apply
# =============================================================================
restrictions_data:
  - slug: arcanaless
    label: "Arcanaless"
    description: |
      
      ●  Complete a run with no Arcana Cards selected or Vow of Void(4) selected in the Oath of the Unseen. 
      
      ●  Additionally, do not activate Arcana Cards in any way.
  - slug: no-hexes
    label: "No Hexes"
    description: |
      
      ●  Complete a run without activating any hexes from Selene. You may pick a hex so long as you do not benefit it in any way.
# =============================================================================
# RUN CATEGORIES
# Main speedrun/challenge categories
# =============================================================================
categories_data:
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
  - slug: chaos-trials
    label: "Chaos Trials"
    description: "Complete one of the 15 Chaos Trials."
    children:
      - slug: trial-of-origin
        label: "Trial of Origin"
      - slug: trial-of-salt
        label: "Trial of Salt"
      - slug: trial-of-humility
        label: "Trial of Humility"
      - slug: trial-of-vengeance
        label: "Trial of Vengeance"
      - slug: trial-of-moon
        label: "Trial of Moon"
      - slug: trial-of-vigor
        label: "Trial of Vigor"
      - slug: trial-of-flame
        label: "Trial of Flame"
      - slug: trial-of-gold
        label: "Trial of Gold"
      - slug: trial-of-fury
        label: "Trial of Fury"
      - slug: trial-of-precarity
        label: "Trial of Precarity"
      - slug: trial-of-heartache
        label: "Trial of Heartache"
      - slug: trial-of-haste
        label: "Trial of Haste"
      - slug: trial-of-blood
        label: "Trial of Blood"
      - slug: trial-of-doom
        label: "Trial of Doom"
      - slug: trial-of-destiny
        label: "Trial of Destiny"
---

Hades II is an action roguelike from Supergiant Games, the sequel to the award-winning Hades. Play as Melinoë, Princess of the Underworld, as she battles through the realms to defeat the Titan of Time.

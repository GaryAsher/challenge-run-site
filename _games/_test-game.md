---
layout: game
game_id: test-game
reviewers: []
game_name: "Test Game (Admin Only)"
published: false  # Hidden from public game listings
test_only: true   # Only visible to admins/testers

# Cover image
cover: /assets/img/site/default-game.jpg
cover_position: center

# Game metadata
developer: "Test Developer"
publisher: "Test Publisher"  
release_year: 2025
platforms:
  - PC

genres:
  - Testing

# Challenge run categories
category_tiers:
  - tier_name: "Full Runs"
    tier_id: full-runs
    categories:
      - category_name: "Any%"
        category_id: any
        description: "Complete the game as fast as possible"
        timing_method: RTA
        requires_video: true

      - category_name: "100%"
        category_id: "100"
        description: "Complete everything"
        timing_method: RTA
        requires_video: true

# Standard challenges available
standard_challenges:
  - id: hitless
    name: Hitless
    description: "Complete without taking any hits"
  - id: damageless  
    name: Damageless
    description: "Complete without taking any damage"
  - id: deathless
    name: Deathless
    description: "Complete without dying"

# Empty community challenges for testing
community_challenges: []

# Character/class options for testing
characters:
  label: "Test Class"
  options:
    - id: class-a
      name: "Class A"
    - id: class-b
      name: "Class B"

# Restrictions for testing
restrictions:
  - id: no-upgrades
    name: "No Upgrades"
    description: "Don't use any upgrades"

# Rules
rules:
  timing:
    start: "When you gain control"
    end: "When final boss is defeated"
  allowed: []
  banned: []
  notes: "This is a test game for admin testing purposes."

# Resources
resources: []
---

This is a **test game** used for testing the site's functionality. It is not visible to regular users.

Only admins and designated testers can see this game.

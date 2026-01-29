---
layout: game
game_id: test-game
game_name: "Test Game (Admin Only)"
published: false
test_only: true

cover: /assets/img/site/default-game.jpg
cover_position: center

developer: "Test Developer"
publisher: "Test Publisher"  
release_year: 2025
platforms:
  - pc

genres:
  - action

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

standard_challenges:
  - id: hitless
    name: Hitless
    description: "Complete without taking any hits"
  - id: damageless  
    name: Damageless
    description: "Complete without taking any damage"

community_challenges: []

characters:
  label: "Test Class"
  options:
    - id: class-a
      name: "Class A"
    - id: class-b
      name: "Class B"

restrictions: []

rules:
  timing:
    start: "When you gain control"
    end: "When final boss is defeated"
  allowed: []
  banned: []
  notes: "This is a test game for admin testing purposes."

resources: []
---

This is a **test game** used for testing the site's functionality. It is not visible to regular users.


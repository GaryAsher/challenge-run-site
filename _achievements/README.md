# Achievements Collection

This collection tracks **Community Achievement completions** - when runners complete achievements defined on game pages.

## File Naming Convention

```
{game_id}__{runner_id}__{achievement_slug}.md
```

Example: `hades-2__gary-asher__all-aspects-clear.md`

## File Structure

```yaml
---
# IDs (required)
game_id: hades-2
runner_id: gary-asher
achievement_slug: all-aspects-clear

# Progress tracking (for partial completions)
current_progress: 15          # Current progress toward total_required

# Completion Info
date_completed: 2025-01-15    # Empty if still in progress
proof_url: https://youtube.com/watch?v=...

# Optional
notes: "Finally got all aspects done after 3 months!"

# Moderation (set by admins)
status: approved        # pending | approved | rejected
verified_by: admin-id
verified_at: 2025-01-16
rejection_reason: ""    # only if rejected
---
```

## Status Values

| Status | Description |
|--------|-------------|
| `pending` | Awaiting review |
| `approved` | Verified and displayed |
| `rejected` | Not accepted (reason provided) |

## Progress Tracking

- `current_progress` tracks partial completion toward `total_required` (defined in game's achievement)
- If `date_completed` is set, the achievement is considered fully completed
- If `date_completed` is empty but `current_progress` > 0, it shows as "In Progress"

## How Achievements Work

1. **Game defines achievements** in `_games/{game}.md` under `community_achievements:`
2. **Runner submits completion** via the achievement submission form
3. **Admin reviews** the proof video and approves/rejects
4. **Approved completions** appear on:
   - The game's Overview tab (with completion count and runner progress)
   - The runner's profile Achievements section

## Example Game Achievement Definition

```yaml
# In _games/hades-2.md
community_achievements:
  - slug: all-aspects-clear
    title: "Aspect Master"
    description: "Complete a run with every weapon aspect"
    icon: "⚔️"
    difficulty: legendary
    total_required: 20      # For progress tracking
    requirements:
      - "Clear with Sister Blades (all 4 aspects)"
      - "Clear with Moonstone Axe (all 4 aspects)"
      - "Clear with Umbral Flames (all 4 aspects)"
      - "Clear with Argent Skull (all 4 aspects)"
      - "Clear with Revaal (all 4 aspects)"
```

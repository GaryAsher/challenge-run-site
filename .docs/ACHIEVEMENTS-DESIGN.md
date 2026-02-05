# Achievements System - Implementation Guide

## Overview

Two types of achievements:

| Type | Description | Where Defined | Where Tracked |
|------|-------------|---------------|---------------|
| **Community Achievements** | Game-specific challenges | Game markdown `community_achievements:` | `_achievements/` collection |
| **Personal Goals** | Runner-created goals | `runner_profiles.personal_goals` | Supabase + synced to markdown |

---

## Installation

```bash
# 1. Update config to add achievements collection
cp crc-updates-v8/_config.yml .

# 2. Create achievements collection
mkdir -p _achievements
cp crc-updates-v8/_achievements/README.md _achievements/

# 3. Update runner layout
cp crc-updates-v8/_layouts/runner.html _layouts/

# 4. Add includes
cp crc-updates-v8/_includes/achievement-card.html _includes/
cp crc-updates-v8/_includes/personal-goals-editor.html _includes/
```

---

## Adding Community Achievements to a Game

Add this section to any game's markdown file (e.g., `_games/hades-2.md`):

```yaml
# =============================================================================
# COMMUNITY ACHIEVEMENTS
# =============================================================================
community_achievements:
  - slug: all-aspects-clear
    title: "Aspect Master"
    description: "Complete a successful run with every weapon aspect"
    icon: "⚔️"
    difficulty: legendary    # easy | medium | hard | legendary
    total_required: 20       # For progress tracking
    requirements:
      - "Clear with Sister Blades - All 4 aspects"
      - "Clear with Moonstone Axe - All 4 aspects"
      - "Clear with Umbral Flames - All 4 aspects"
      - "Clear with Argent Skull - All 4 aspects"
      - "Clear with Black Coat - All 4 aspects"

  - slug: triple-hitless
    title: "Triple Threat"
    description: "Complete 3 hitless runs with different weapons"
    icon: "🎯"
    difficulty: hard
    total_required: 3
    requirements:
      - "3 unique hitless clears"
      - "Each must use a different weapon"
```

---

## Achievement Completion Files

When a runner completes a community achievement, create a file in `_achievements/`:

**Filename:** `{game_id}__{runner_id}__{achievement_slug}.md`

**Example:** `_achievements/hades-2__gary-asher__all-aspects-clear.md`

```yaml
---
game_id: hades-2
runner_id: gary-asher
achievement_slug: all-aspects-clear

date_completed: 2025-01-15
proof_url: https://youtube.com/watch?v=...

notes: "Finally completed all 20 aspects!"

status: approved        # pending | approved | rejected
verified_by: admin-id
verified_at: 2025-01-16
---
```

---

## Personal Goals (in Supabase)

Personal goals are stored in `runner_profiles.personal_goals` as JSONB:

```json
[
  {
    "icon": "💯",
    "title": "100 Hitless Clears",
    "description": "Complete 100 hitless runs in any game",
    "game": null,
    "completed": false,
    "current": 47,
    "total": 100,
    "date_completed": null
  },
  {
    "icon": "⏱️",
    "title": "Sub-10 Any%",
    "description": "Get a sub-10 minute Any% run",
    "game": "Hades II",
    "completed": true,
    "current": 1,
    "total": 1,
    "date_completed": "2025-01-20"
  }
]
```

### Adding personal_goals column to Supabase

```sql
ALTER TABLE runner_profiles 
ADD COLUMN IF NOT EXISTS personal_goals JSONB DEFAULT '[]'::jsonb;
```

---

## Integrating Personal Goals Editor

Add to `profile/edit/index.html` before the Submit section:

```liquid
{% include personal-goals-editor.html %}
```

Then in the JavaScript, initialize the editor with existing goals:

```javascript
// In populateForm() function, after loading profile data:
if (window.initPersonalGoalsEditor) {
  window.initPersonalGoalsEditor(data.personal_goals || []);
}

// In handleSubmit(), include personal_goals in the update:
const personalGoalsData = document.getElementById('personal-goals-data');
const updateData = {
  // ... other fields
  personal_goals: JSON.parse(personalGoalsData.value || '[]')
};
```

---

## Sync Script Updates

Update `scripts/sync-runner-profiles.js` to include personal_goals:

```javascript
// In the profile data mapping:
personal_goals: profile.personal_goals || []
```

---

## Display Features

### On Runner Profile
- **Community Achievements**: Shows verified completions with game links
- **Personal Goals**: Shows progress bars and completion status
- Both support: icons, descriptions, game tags, difficulty badges

### On Game Page (future)
- Achievements tab showing all community achievements
- Completion counts and "first to complete" badges
- List of runners who have completed each achievement

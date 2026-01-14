# Teams Collection

Affiliated teams and communities partnered with Challenge Run Community.

## File Location

Teams are stored in `_teams/` with one file per team.

## Filename Format

```
{team-id}.md
```

Example: `hk-challenge-runners.md`

## Required Fields

```yaml
---
layout: team
team_id: team-id          # Must match filename
name: "Team Name"         # Display name
---
```

## Optional Fields

```yaml
tagline: "Short description"
logo: /assets/img/teams/team-id.png

socials:
  discord: "https://discord.gg/..."
  youtube: "https://youtube.com/@..."
  twitch: "https://twitch.tv/..."
  twitter: "handle"           # Just the handle, not full URL
  website: "https://..."

# Games the team focuses on (use game_id)
games:
  - hollow-knight
  - hades-2

# Team members
members:
  - runner_id: runner-id      # Links to profile if exists
    name: "Display Name"
    role: "Founder"           # Optional role

# Notable achievements
achievements:
  - title: "Achievement Name"
    date: "2024-06-15"        # Optional
    description: "Details"    # Optional
```

## Logo Guidelines

- Location: `assets/img/teams/{team-id}.png`
- Recommended size: 200x200px
- Format: PNG with transparency preferred
- Square aspect ratio

## Adding a New Team

1. Create `_teams/{team-id}.md`
2. Add logo to `assets/img/teams/`
3. Fill in team details
4. Commit and push

Teams appear automatically on `/teams/` and can be featured on the homepage.

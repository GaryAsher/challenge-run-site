# Reminders & Future Ideas

This document consolidates all reminders, future ideas, and planned features for CRC.

---

## Priority Roadmap

### Forms & Submissions
- [ ] Run submission form (Google Form → GitHub)
- [ ] Runner profile submission - Self-service profile creation

### Enhanced Runner Profiles
- [ ] Add social links (YouTube, Twitch, Twitter, Discord)
- [ ] Add bio field
- [ ] Add featured runs section
- [ ] Auto-calculate stats (total runs, games played, PBs)
- [ ] Create runner submission form

**Proposed structure:**
```yaml
# _runners/player-name.md
---
layout: runner
runner_id: player-name
name: "Player Name"
avatar: /assets/img/runners/p/player-name.png
socials:
  youtube: "channel-url"
  twitch: "channel-url"
  twitter: "handle"
  discord: "username#1234"
bio: "Short bio about the runner"
featured_runs:
  - game_id: hades-2
    category: underworld-any
    achievement: "First sub-10 minute clear"
---
```

## Future Features

### Site Features
- [ ] Search page - Global search across all content
- [ ] Add Spanish version
- [ ] Dark/light mode toggle

### Community Building
- [ ] Discord webhook for new run notifications
- [ ] Leaderboards - Per-game, per-challenge rankings

---

### Later: History Tab
- [ ] Add history data structure to game files
- [ ] Create timeline display component
- [ ] Support entry types: record, rule-change, milestone

**Proposed structure:**
```yaml
# In _games/hades-2.md
history:
  - date: 2024-03-01
    type: record
    title: "First Deathless Clear"
    description: "PlayerX achieved the first recorded deathless clear"
    runner_id: player-x
    
  - date: 2024-06-15
    type: rule-change
    title: "Mod restrictions updated"
    description: "Visual-only mods now allowed in Unrestricted category"
    
  - date: 2024-09-01
    type: milestone
    title: "100 runs submitted"
    description: "Community milestone reached"
    
```

### When Needed: Forum Integration

**Option A: GitHub Discussions**
- Enable Discussions in repo settings
- Create category for each game
- Link from game forum pages
- Free, no maintenance, threaded conversations
- Could use Giscus to embed discussions directly in pages

**Option B: Discord Integration**
- Create a Discord server with channels per game
- Use Discord widgets to embed activity on forum pages
- Webhook announcements for new games/runs
- Role-based access for moderators
- More real-time, community-focused

**Decision needed:** Choose based on community preference and engagement style.

---

### Badges System
- [ ] Create `_data/badges.yml` with badge definitions
- [ ] Build badge calculation script
- [ ] Display badges on runner profiles
- [ ] Auto-assign badges on run promotion

---

## Documentation Status

### To Complete
- [ ] Moderator guide - How to review and process submissions
- [ ] Fixing mistakes guide - Common errors and how to fix them
- [ ] Google Form setup guide - Setting up Forms integration

---

## Technical Debt

### Low Priority
- [ ] Audit CSS for unused code
- [ ] Consider Jekyll plugins or asset pipeline

---

Last updated: 2026/01/13

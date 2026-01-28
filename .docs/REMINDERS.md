# Reminders & Future Ideas

This document consolidates all reminders, future ideas, and planned features for CRC.

---

# Priority Roadmap

## Forms & Submissions
### New Game Submission form:
- [ ] Check Discord Webhook. Previously not working, but updated recently.

### New Run Submission:
- [ ] Test variables to ensure there are no errors.

### Modded Game Submisson
- [ ] Allow Modded versions of games to accomodate for the modded community challenges.
  - These would only be for mods that offer entirely new maps / characters / etc.
  - QoL Mods, Cosmetic mods, and other things would still be allowed on main pages as the default.
- [ ] Link between Modded Games and Main Games on each's page.
- [ ] These categories would have a "Modded" tag.

### FINAL
- [ ] Make sure names are consistent across pages.
  - Use variables instead of plain text?

## Enhanced Runner Profiles:
- [ ] Runner profile submission - Self-service profile creation
- [ ] Add social links (YouTube, Twitch, Twitter, Discord)
- [ ] Add bio field
- [ ] Run file naming convention - revisit when building runner submission process
- [ ] Add featured runs section
- [ ] Auto-calculate stats (total runs, games played, PBs)
- [ ] Add placeholder for badges

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

# Future Features

## Site Features
- [ ] Add Spanish language accessibility.
      - Request Community translation early so it can be done in parallel with other changes.
- [ ] Dark/light mode toggle

## Performance Optimizations
- [ ] Consider lazy-loading game cards on the games index page
- [ ] Image optimization - convert game covers to WebP format
- [ ] Consider prefetching game pages on hover

### Metadata
- [ ] How do we find all genres?
    - Can we find a list of every genre ever?
    - Do we create a script that finds genres, and validates user-submitted info?

## UX Improvements
- [ ] Loading state indicator/symbol for JavaScript-driven filtering
- [ ] Add a "Back to Top" button for long pages
- [ ] Add keyboard navigation for filter dropdowns (arrow keys)
- [ ] Add "Copy Link" button for sharing specific filtered views

### /rules/ page
- [ ] Consider making "Summary Ruleset" easier to read somehow.

---

## Later: History Tab
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

## Badges System
- [ ] Create `_data/badges.yml` with badge definitions
- [ ] Build badge calculation script
- [ ] Display badges on runner profiles
- [ ] Auto-assign badges on run promotion

## Community Building
- [ ] Show total run count badges on game cards
- [ ] Leaderboards - Per-game, per-challenge rankings
- [ ] Let users make Player-Made Challenges on the game's respective forum. 
      - Forum needs massive overhaul to accomodate for this, including backend support.

## Forum Integration

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

# Documentation Status

## To Complete
- [ ] Moderator guide - How to review and process submissions
- [ ] Fixing mistakes guide - Common errors and how to fix them
- [ ] Google Form setup guide - Setting up Forms integration

---

# Technical Debt

## Low Priority
- [ ] Audit CSS for unused code
- [ ] Consider Jekyll plugins or asset pipeline

---

Last updated: 2026/01/23

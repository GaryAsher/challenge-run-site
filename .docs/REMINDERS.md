# Reminders & Future Ideas

This document consolidates all reminders, future ideas, and planned features for CRC.

---

## Priority Roadmap

### New Game Submission form:
- [ ] Do we ask users to fill out Genres again?
    - [ ] Can we find a list of every genre ever?
    - [ ] Do we create a script that finds genres, and validates user-submitted info?
- [ ] Check Discord Webhook. Previously not working, but updated recently.
- [ ] Update form to use 3-tier category system.
    - Update Google Apps Script, Google Sheet, and Google Form accordingly.

## Games Page
- [ ] Filter by challenges" is filtering by old variable. Needs to be updated.

## Game Page Tabs
### /runs/ page
- [ ] Fix CSS for Advanced Filters.
- [ ] Fix Mini-Challenges:
      - When a Parent Category is picked, leave it at the top, but let user sort via child categories below. Default is to show all within the mini.
- [ ] Fix top container to be flush with game tabs.

### /rules/ page
- [ ] "Show other runners who have completed this" is not redirecting properly.
- [ ] For Rule Builder's filters, add 'unpickable' headers that separates categories by tiers
- [ ] Run Categories uses old variables. Update to 3-tiered category system.

### /history/ page
- [ ] Needs better filtering. Only show verified runs, community milestones, records broken (if verified), etc.

### /submit/ page
- [ ] Move tab to far right of container.
- [ ] Fix js selector to only appear when hovering drop-down. Currently allows selection when on top of text.
- [ ] Change text to say Twitch Highlight, NOT Twitch VOD.
- [ ] Update logic to require character selection for Hades 2. This needs to be category specific, as it is not relevant for Chaos Trials.
- [ ] Update Glitch Category empty text to say "N/A" instead of "None / Glitchless"
- [ ] Alphabetize restrictions in game file itself.
- [ ] Update the order of the form to mirror the payload.
- [ ] Produce "error message" if user-id does not exist.
- [ ] Show Video name when put into URL?
- [ ] Update Date Completed to have an error when the year is before 1970
- [ ] Update Date Completed format to be YYYY/MM/DD
- [ ] Update Date Completed to be optional. Appearing as "" if user submits nothing.
- [ ] Update Run Time to say the primary_timing_method.
- [ ] Add placeholder next to Run Time that is secondary_timing_method.

## Forms & Submissions
- [ ] Runner profile submission - Self-service profile creation
- [ ] Make separate form for community challenges
- [ ] Make separate form for custom player challenges?
  - Users can list their own rules

## Enhanced Runner Profiles
- [ ] Add social links (YouTube, Twitch, Twitter, Discord)
- [ ] Add bio field
- [ ] Add featured runs section
- [ ] Auto-calculate stats (total runs, games played, PBs)

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
- [ ] Add Spanish version
- [ ] Add a "Back to Top" button for long pages
- [ ] Add keyboard navigation for filter dropdowns (arrow keys)
- [ ] Add "Copy Link" button for sharing specific filtered views
- [ ] Show total run count badges on game cards
- [ ] Dark/light mode toggle

## Performance Optimizations
- [ ] Consider lazy-loading game cards on the games index page
- [ ] Image optimization - convert game covers to WebP format
- [ ] Consider prefetching game pages on hover

## UX Improvements
- [ ] Loading state indicator/symbol for JavaScript-driven filtering
- [ ] Run file naming convention - revisit when building runner submission process

## Community Building
- [ ] Discord webhook for new run notifications
- [ ] Leaderboards - Per-game, per-challenge rankings

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

## When Needed: Forum Integration

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

## Badges System
- [ ] Create `_data/badges.yml` with badge definitions
- [ ] Build badge calculation script
- [ ] Display badges on runner profiles
- [ ] Auto-assign badges on run promotion

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

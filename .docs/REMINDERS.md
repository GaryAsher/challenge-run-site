# Reminders & Future Ideas

This document consolidates all reminders, future ideas, and planned features for CRC.

**Last updated:** 2026/02/01

---

# Priority Roadmap

## Immediate Priorities

### 1.75 Admin Profile
- [ ] Move Admin Panel to somewhere actually not annoying. Ideally where the CRC logo is.
  Site Health:
    - [ ] Change API Perfromance to use Green instead of theme for good queries.
    - [ ] fix page switching js for 12 hours, 24 hours, 3 days, etc.
    - [ ] Connect Uptime Monitor
    - [ ] GitHub Actions? Needed?
  Financials:
    - [ ] Expenses & Services journal entry is jutting out of the container.
    - [ ] Notes & Plans can be removed
    - [ ] <select id="year-select" class="form-input form-input--small"> 
      - need proper styling.
      - can start with year 2026
  Dashboard:
    - [ ] <button class="tab" data-tab="test-profile" type="button">Test Profile</button> and other variables are not easily visible because of button background
    - [ ] Remove Test Games

### 2. Runner Profiles
- [ ] Profile Settings
  - Profile Information to be above Linked Accounts
- [ ] Themes
  - Add white font border around text that is black. and the same vice versa? this is just to read the text easier.
- [ ] Fix issues with /profile/edit

### 2.5 Games/runs/ tab again
- [ ] Add the option for multiple runners (up to 5) to be listed for the same run

### 2.75 Games page
- [ ] Add A Game for "Multi-Game Runs". These are multiple games done in succession. The Game page that it belongs to will have a link to these below the "Modded Game"

### 3. Forms & Submissions
- [ ] New Game Submission form
  - Check Discord Webhook by submitting a new game. Has been updated, but not tested.
- [ ] New Run Submission 
  - Test variables. Update if needed.
  - Link runner_id to authenticated user

---

## Short-Term Priorities

### 4. Glossary Page
- [ ] Terms to define: Hit, Damage, Death, Hard CC, Soft CC, Hitless vs Damageless, Full Run, Mini-Challenge, etc.
- [ ] Add content that would work as supporting documents.
  - Ask creator first.

### 5. Support Page
- [ ] Add Staff section
- [ ] Add FAQ content
- [ ] Add contact links

### 6. Spanish Language Support
- [ ] Create `_data/i18n/es.yml` with translations
- [ ] Add language toggle to header
- [ ] Create Spanish versions of key pages or use Liquid variables
- [ ] Request community translation help early

---

## Medium-Term Priorities

### 7. SvelteKit Migration 
**Target: When site has 10+ active games or needs real-time features**

Migration plan:
- [ ] Set up SvelteKit project with Supabase
- [ ] Migrate static content (games, runners, runs)
- [ ] Implement auth with server-side sessions
- [ ] Build admin dashboard
- [ ] Add real-time run verification
- [ ] Deploy to Vercel or similar

### 8. Dark/Light Mode Toggle and other themes.
- [ ] Add light mode CSS variables
- [ ] Add toggle button to header
- [ ] Store preference in localStorage
- [ ] Respect `prefers-color-scheme`

### 9. News & History Integration
- Requires News page activity first
- Combine news posts with game history for unified timeline

### 10. History Tab Refinement
- Needs Runner Profiles with Badges first
- Focus on: rule changes, discussions, community milestones
- NOT global submissions from anyone

### 11. Forum Integration
Decision needed: GitHub Discussions vs Discord

---

##  Future Features (Backlog)

### Modded Game Support
- [ ] Allow modded versions of games
- [ ] Link between modded and main game pages
- [ ] "Modded" tag for categories

### Community Building
- [ ] Leaderboards (per-game, per-challenge)
- [ ] Player-Made Challenges via forum
- [ ] Badges system
- [ ] Run count badges on game cards

### How to Navigate the Site
- [ ] Either in form of FAQ or general explaination.

### Team Profiles
- [ ] Team submission process
- [ ] Team page layout refinements
- [ ] Member lists with runner profile links

### Performance Optimizations
- [ ] Lazy-loading game cards
- [ ] Convert images to WebP
- [ ] Prefetch game pages on hover

### UX Improvements
- [ ] Loading indicator for JavaScript filtering
- [ ] Keyboard navigation for filter dropdowns
- [ ] "Copy Link" button for filtered views

---

# Technical Debt

## Low Priority
- [ ] Audit CSS for unused code
- [ ] Consider Jekyll plugins or asset pipeline
- [ ] Consistent variable naming across pages

---

# Documentation Status

## To Complete
- [ ] Moderator guide
- [ ] Fixing mistakes guide
- [ ] Google Form setup guide

---

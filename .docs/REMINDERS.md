# Reminders & Future Ideas

This document consolidates all reminders, future ideas, and planned features for CRC.

**Last updated:** 2026/01/28

---

# Priority Roadmap

## Immediate Priorities

### 1. Admin Panels
- [ ] Dashboard:
  - Cloudflare Workers = Unknown?
  - Remove Quick Actions
  - Panel order: Data Usage -> System Status -> Site Statistics -> Recent Activity
  - Remove Auth Debug tab.
  - Add Debug tab to see the site from a lower role point of view. 
    - Add "Return to User Profile" option.
    - This feature also does not allow for submissions of any kind.
- [ ] Panel Itself:
  - Remove User Data
- [ ] Financials:
  - Allow click to toggle on/off for Service Cost Breakdown
  - Allow "Future Ideas" section
  - Add drop-down toggle by year next to Monthly Overview
  - For both Revenue Sources and Expenses & Services, add an option for "recurring" vs "one-time".
- [ ] Site Health
  - How do we connect Github Actions to the site health?
  - Are there other things we should be tracking?
- [ ] Remove "View Site As..." that is on the top of the header.

### 2. Runner Profiles
- [ ] add profile/edit/ page
- [ ] Themes
  - [ ] "Save Theme" and "Reset to Default" to appear below the "Live Preview" tab.
  - [ ] Ability for Admins to upload a background image for a Theme (for now).
  - [ ] Highlight around " Theme Sync" needs to be the theme picked.
  - [ ] "Theme Saved and synced to your account" needs to be the color of the theme picked.
  - [ ] Add white font border around text that is black. and the same vice versa? this is just to read the text easier.
  - [ ] Allow users to save two favorites, which can be their custom themes.
- [ ] Badges placeholder structure
- [ ] Featured runs section below their Bio
- [ ] Change "Something Else" tab to "Achievements". This will show Challenges that runners have imposed on themselves, like One of every weapon in Hades (with a tracker)
- [ ] Add "Contributions" tab, where runners can put tools, guides, and other things that they have made. It will also show what pages they are credited for and what they helped set up
- [ ] Add buttons for the other Socials. Right now it just looks like Twitch and YouTube have buttons.

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

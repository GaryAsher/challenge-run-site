# Reminders & Future Ideas

This document consolidates all reminders, future ideas, and planned features for CRC.

**Last updated:** 2026/01/28

---

# Priority Roadmap

## Immediate Priorities

### 1. Forms & Submissions
- [ ] New Game Submission form
  - Check Discord Webhook by submitting a new game. Has been updated, but not tested.
- [ ] New Run Submission 
  - Test variables. Update if needed.

### 2. Runner Profiles
- [ ] Runner profile submission form (self-service)
- [ ] Badges placeholder structure
- [ ] Featured runs section refinement

---

## Short-Term Priorities

### 3. Spanish Language Support
- [ ] Create `_data/i18n/es.yml` with translations
- [ ] Add language toggle to header
- [ ] Create Spanish versions of key pages or use Liquid variables
- [ ] Request community translation help early

### 4. Glossary Page
- [ ] Terms to define: Hit, Damage, Death, Hard CC, Soft CC, Hitless vs Damageless, Full Run, Mini-Challenge, etc.
- [ ] Add content that would work as supporting documents.
  - Ask creator first.

### 5. Support Page
- [ ] Add Staff section
- [ ] Add FAQ content
- [ ] Add contact links

---

## Medium-Term Priorities

### 6. Dark/Light Mode Toggle and other themes.
- [ ] Add light mode CSS variables
- [ ] Add toggle button to header
- [ ] Store preference in localStorage
- [ ] Respect `prefers-color-scheme`

### 7. News & History Integration
- Requires News page activity first
- Combine news posts with game history for unified timeline

### 8. History Tab Refinement
- Needs Runner Profiles with Badges first
- Focus on: rule changes, discussions, community milestones
- NOT global submissions from anyone

### 9. Forum Integration
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

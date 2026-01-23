# Category Tier System Migration

This document tracks the implementation of the Category Tier System, which restructures run categories into three distinct tiers: Full Runs, Mini-Challenges, and Player-Made Challenges.

**Related Document:** `PROPOSAL-category-tiers.md`

---

## Implementation Status

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Data Structure (foundation) | ✅ Complete |
| Phase 2 | Page Generation | ⏳ Pending |
| Phase 3 | UI - Display | ⏳ Pending |
| Phase 4 | UI - Submit Form | ⏳ Pending |
| Phase 5 | Validation & Polish | ⏳ Pending |

---

## Key Decisions

These decisions were made during planning:

| Question | Decision |
|----------|----------|
| URL Structure | `/games/{game}/runs/{tier}/{category}/` (e.g., `/games/hades-2/runs/full-runs/underworld-any/`) |
| Backward Compatibility | One-time migration required (no dual support) |
| Run File Migration | Default to `full_runs` if `category_tier` is missing |
| UI Tab Behavior | Dynamic - only show tabs that have categories |
| Runs Index Page | Landing page with tier picker (sub-tabs under Runs tab) |
| `community_challenges` | Rename/move to `player_made`; existing ones move to `restrictions_data` |
| Forum Integration Fields | Include `creator`, `created_date`, `promoted_from_forum` now for future use |

---

## Phase 1: Data Structure (Foundation)

### Tasks

- [x] **1.1** Update `_templates/game-template.md` with new tiered structure
- [x] **1.2** Update `_templates/run-template.md` with `category_tier` field
- [x] **1.3** Migrate `_games/hades-2.md` as test case
  - [x] Convert `categories_data` → `full_runs` + `mini_challenges`
  - [x] Move `community_challenges` → `restrictions_data`
  - [x] Add empty `player_made` array
- [x] **1.4** Update `scripts/generate-form-index.js` to output tiered categories

### Data Structure Changes

**Game File (New Structure):**
```yaml
# FULL RUNS - require reaching an ending
full_runs:
  - slug: underworld-any
    label: "Underworld Any%"
    description: "Complete the Underworld route."

# MINI-CHALLENGES - in-game challenges, no ending required
mini_challenges:
  - slug: chaos-trials
    label: "Chaos Trials"
    children:
      - slug: trial-of-blood
        label: "Trial of Blood"

# PLAYER-MADE CHALLENGES - community-created
player_made:
  - slug: one-god-only
    label: "One God Only"
    description: "Only utilize boons from one god."
    creator: runner-slug
    created_date: 2026-01-15
    promoted_from_forum: true
```

**Run File (New Field):**
```yaml
category_tier: full_runs  # full_runs | mini_challenges | player_made
category_slug: underworld-any
```

---

## Phase 2: Page Generation

### Tasks

- [ ] **2.1** Update `scripts/generate-run-category-pages.js` for new URL structure
  - [ ] Generate tier index pages: `/games/{game}/runs/{tier}/index.html`
  - [ ] Generate category pages: `/games/{game}/runs/{tier}/{category}/index.html`
  - [ ] Handle nested categories (e.g., chaos-trials/trial-of-blood)
- [ ] **2.2** Update `scripts/generate-game-pages.js` if needed
- [ ] **2.3** Regenerate all pages for test game (Hades 2)
- [ ] **2.4** Clean up old URL structure files

### New URL Structure

```
/games/hades-2/runs/                                    → Runs landing (tier picker)
/games/hades-2/runs/full-runs/                          → Full Runs list
/games/hades-2/runs/full-runs/underworld-any/           → Leaderboard
/games/hades-2/runs/mini-challenges/                    → Mini-Challenges list
/games/hades-2/runs/mini-challenges/chaos-trials/       → Chaos Trials parent
/games/hades-2/runs/mini-challenges/chaos-trials/trial-of-blood/ → Leaderboard
/games/hades-2/runs/player-made/                        → Player-Made list
/games/hades-2/runs/player-made/one-god-only/           → Leaderboard
```

---

## Phase 3: UI - Display

### Tasks

- [ ] **3.1** Update `_layouts/game-runs.html`
  - [ ] Add tier tabs (sub-navigation under Runs tab)
  - [ ] Show tabs dynamically (only if tier has categories)
  - [ ] Default to Full Runs tier
- [ ] **3.2** Create tier index template/partial
- [ ] **3.3** Update breadcrumb navigation for new hierarchy
- [ ] **3.4** Update category cards to show tier-specific metadata
  - [ ] Player-Made: show creator attribution
- [ ] **3.5** Update `assets/js/runs-filter.js` for tier filtering

### UI Mockup

```
┌─────────────────────────────────────────────────────┐
│ [Overview] [Runs] [Rules] [History] [Resources]     │  ← Main tabs
├─────────────────────────────────────────────────────┤
│ Full Runs | Mini-Challenges | Player-Made           │  ← Tier sub-tabs
├─────────────────────────────────────────────────────┤
│                                                     │
│ ┌──────────────────┐ ┌──────────────────┐          │
│ │ Underworld Any%  │ │ Surface Any%     │          │  ← Category cards
│ │ 12 runs          │ │ 5 runs           │          │
│ └──────────────────┘ └──────────────────┘          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Phase 4: UI - Submit Form

### Tasks

- [ ] **4.1** Update `_includes/submit-run-form.html`
  - [ ] Add tier selector dropdown before category
  - [ ] Style tier selector
- [ ] **4.2** Update `assets/js/submit-run.js`
  - [ ] Implement tier → category cascade
  - [ ] Update category dropdown when tier changes
  - [ ] Update payload to include `category_tier`
- [ ] **4.3** Update form validation for tier field

### Form Flow

```
Category Tier: [Full Runs ▼]        ← New dropdown
Category:      [Underworld Any% ▼]  ← Filters based on tier
```

---

## Phase 5: Validation & Polish

### Tasks

- [ ] **5.1** Update `scripts/validate-runs.js`
  - [ ] Add `category_tier` field validation
  - [ ] Validate tier matches category location
- [ ] **5.2** Update `scripts/validate-schema.js` for new game file structure
- [ ] **5.3** Test full submission workflow
- [ ] **5.4** Migrate remaining games
  - [ ] `_games/celeste.md`
  - [ ] `_games/constance.md`
  - [ ] `_games/hollow-knight.md`
  - [ ] `_games/the-legend-of-zelda-ocarina-of-time.md`
  - [ ] `_games/tiny-rogues.md`
- [ ] **5.5** Update `_templates/game-template-expanded.md`
- [ ] **5.6** Update `_games/README.md` documentation
- [ ] **5.7** Clean up deprecated code paths

---

## Migration Checklist for Each Game

When migrating a game file to the new structure:

1. [ ] Identify which categories are "Full Runs" (require ending)
2. [ ] Identify which categories are "Mini-Challenges" (in-game challenges)
3. [ ] Move `community_challenges` items to either:
   - `player_made` (if they're category-level challenges)
   - `restrictions_data` (if they're modifiers)
4. [ ] Update `categories_data` → split into `full_runs` and `mini_challenges`
5. [ ] Add empty `player_made: []` if none exist
6. [ ] Run page generation script
7. [ ] Verify pages render correctly
8. [ ] Update any existing run files if needed (add `category_tier`)

---

## Files Changed

### Scripts
- [ ] `scripts/generate-form-index.js`
- [ ] `scripts/generate-run-category-pages.js`
- [ ] `scripts/generate-game-pages.js`
- [ ] `scripts/validate-runs.js`
- [ ] `scripts/validate-schema.js`

### Layouts & Includes
- [ ] `_layouts/game-runs.html`
- [ ] `_includes/submit-run-form.html`

### Templates
- [ ] `_templates/game-template.md`
- [ ] `_templates/game-template-expanded.md`
- [ ] `_templates/run-template.md`

### Game Data
- [ ] `_games/hades-2.md` (test case)
- [ ] `_games/celeste.md`
- [ ] `_games/constance.md`
- [ ] `_games/hollow-knight.md`
- [ ] `_games/the-legend-of-zelda-ocarina-of-time.md`
- [ ] `_games/tiny-rogues.md`

### JavaScript
- [ ] `assets/js/submit-run.js`
- [ ] `assets/js/runs-filter.js`

### Documentation
- [ ] `_games/README.md`
- [ ] `_data/README.md`

---

## Rollback Plan

If issues arise:

1. Git revert the migration commits
2. Regenerate pages with old script
3. Old run files still work (missing `category_tier` defaults to `full_runs`)

---

## Testing Checklist

Before deploying:

- [ ] All existing run URLs redirect or work
- [ ] Submit form correctly sends `category_tier`
- [ ] Runs display in correct tier tabs
- [ ] Breadcrumbs navigate correctly
- [ ] Empty tiers don't show tabs
- [ ] Player-Made shows creator attribution
- [ ] Nested categories (chaos-trials) work correctly
- [ ] Mobile responsive layout works

---

Last updated: 2026-01-22

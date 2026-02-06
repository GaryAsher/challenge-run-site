# Reminders & Future Ideas

This document consolidates all reminders, future ideas, and planned features for CRC.

**Last updated:** 2026/02/06

---

## Revisit
### Admin Profile
- [ ] Dashboard:
  - Debug View needs to be revamped.
- [ ] Site Health:
  - Performance Report needs to be revamped.
### Global
- [ ] Icons for Admins, Super Admins, Verifiers. These would be attached to their profile.
- [ ] Add default profile picture and default banner.

---

# Priority Roadmap

## Immediate Priorities

### 1. Runner Profiles
- [ ] Fix Structure of Bio
- [ ] Completed Runs:
  - Restructure UI
- [ ] For Contributions, have these link to the appropriate achievements that the runner has been credited for.

### 2. Dashboard & Review System (Phase 2-3)
- [x] Phase 1: ALTER `pending_runs`, Worker dual-writes to Supabase + GitHub
- [x] Phase 2: Dashboard hub with role-based access (super_admin / admin / verifier)
- [x] Phase 2: Pending Runs review page with approve / reject / request changes
- [ ] Phase 3: On approve, auto-create GitHub run file via Worker `/approve` endpoint
- [ ] Phase 3: Remove GitHub PR workflow for runs (Supabase becomes sole source of truth)
- [ ] Phase 3: Wire up Pending Profiles page to use `admin.js` module
- [ ] Phase 3: Wire up Pending Games page to use `admin.js` module
- [ ] Phase 3: Notifications (Discord webhook on approve/reject)

### 3. Modded Game Support
- [x] `generate-game-file.py` supports `is_modded` and `base_game`
- [x] `game.html` layout shows modded banners and links between base/modded games
- [x] `hollow-knight-modded.md` exists as working example
- [ ] Build game submission UI in admin dashboard (replaces Google Form for new games)

### 4. Forms & Submissions
- [x] Character validation is fully data-driven (no hardcoded game IDs)
- [x] Parent/child categories render as optgroups
- [x] Fixed character per category (`fixed_character`)
- [x] RTA timing always available with per-category override
- [ ] Test Discord Webhook for new game submissions
- [ ] Test full end-to-end: form → Worker → Supabase → Dashboard → approve

### 4.5. Legal Document Review
- [ ] Review Terms of Service line-by-line
- [ ] Review Privacy Policy line-by-line
- [ ] Add 13+ age requirement (like Speedrun.com)
- [ ] Add third-party services disclosure (Supabase, Cloudflare, Discord/Twitch OAuth)
- [ ] Document all data collected in Privacy Policy
- [ ] Add DMCA/Copyright policy
- [ ] Add content license agreement for submissions
- [ ] Consider user data export feature (GDPR compliance)
- [ ] Create disaster recovery plan document

---

## Short-Term Priorities

### 5. Glossary Page
- [ ] Terms to define: Hit, Damage, Death, Hard CC, Soft CC, Hitless vs Damageless, Full Run, Mini-Challenge, etc.
- [ ] Add content that would work as supporting documents.
  - Ask creator first.

### 6. Support Page
- [ ] Add Staff section
- [ ] Add FAQ content
- [ ] Add contact links

### 7. Spanish Language Support
- [ ] Create `_data/i18n/es.yml` with translations
- [ ] Add language toggle to header
- [ ] Create Spanish versions of key pages or use Liquid variables
- [ ] Request community translation help early

---

## Medium-Term Priorities

### 8. Multi-Game Runs

**What it is:** A multi-game run is a single challenge attempt that spans multiple individual games played in sequence. For example, a "Hitless Hades Marathon" where a runner plays Hades 1 and Hades 2 back-to-back without taking a hit across both games, or a "Soulsborne Deathless" run that chains Dark Souls 1 → 2 → 3 → Elden Ring. The run is tracked as one entry with one video and one combined time, but it references all the individual games involved.

**How it works on CRC:**
- A multi-game entry is created like any other game file but with special flags:
  - `is_multi_game: true` — marks it as a multi-game entry (not a single game)
  - `related_games: [hades, hades-2]` — links to the individual game entries
- On the Games index page, multi-game entries display a "🎮 MULTI-GAME" badge so they're visually distinct from single games
- On each individual game's page (e.g., Hades 2), a banner links to any multi-game entries that include it: "This game is part of Hades Marathon — view multi-game runs"
- On the multi-game page itself, a banner links back to each individual game
- Categories, tiers, challenges, and the full submission flow work the same as single-game entries
- The run file references the multi-game entry's `game_id`, not the individual games

**What needs to be built:**
- [ ] Add `is_multi_game` and `related_games` support to `generate-game-file.py`
- [ ] Add layout support in `game.html` for `is_multi_game` (mirror the `is_modded` banner logic)
- [ ] Update `games/index.html` to display multi-game badge
- [ ] Update `generate-game-pages.js` and `generate-run-category-pages.js` to handle multi-game entries
- [ ] Consider whether multi-game runs should also appear on individual game leaderboards (probably not — they'd have incomparable times)

### 9. SvelteKit Migration
**Target: When site has 10+ active games or needs real-time features**

See [Migration Notes](#sveltekit-migration-notes) below for detailed planning.

### 10. Dark/Light Mode Toggle and Accessibility Features
- [ ] Add light mode CSS variables
- [ ] Add toggle button to header
- [ ] Colorblind mode
- [ ] Store preference in localStorage
- [ ] Respect `prefers-color-scheme`

### 11. History Tab Refinement
- Needs Runner Profiles with Badges first
- Focus on: rule changes, discussions, community milestones
- NOT global submissions from anyone

### 12. News & History Integration
- Requires News page activity first
- Combine news posts with game history for unified timeline

### 13. Forum Integration
Decision needed: GitHub Discussions vs Discord

---

##  Future Features (Backlog)

### Community Building
- [ ] Leaderboards (per-game, per-challenge)
- [ ] Player-Made Challenges via forum
- [ ] Badges system
- [ ] Run count badges on game cards

### How to Navigate the Site
- [ ] Either in form of FAQ or general explanation.

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
- [ ] Remove old monolithic `assets/style.css` after confirming SCSS pipeline works on Cloudflare

---

# Documentation Status

## To Complete
- [ ] Moderator guide
- [ ] Fixing mistakes guide
- [ ] Google Form setup guide

---

# SvelteKit Migration Notes

Notes for when CRC moves from Jekyll to SvelteKit (or Next.js). These are things to keep in mind during the transition.

## What Carries Over Directly
- **Markdown data files** (`_games/*.md`, `_runners/*.md`, `_runs/**/*.md`): YAML front matter works natively with `gray-matter` or `mdsvex`. Keep the same file structure.
- **`_data/*.yml` files**: Convert to JSON or TypeScript imports. Consider keeping YAML and parsing at build time.
- **SCSS structure** (`assets/scss/`): Both SvelteKit and Next.js support SCSS. The modular structure (base, components, pages) maps cleanly to component-scoped styles.
- **Supabase integration**: Auth, profiles, and edge functions are framework-agnostic. The `supabase/` directory moves as-is.
- **Vanilla JS files** (`assets/js/`): Logic ports directly, though most will become component methods.
- **Images and static assets**: Move to `static/` directory.

## What Gets Replaced (and Why It's a Win)
- **123+ generated `games/` pages** → Dynamic routes. A single `routes/games/[game_id]/runs/[tier]/[category]/+page.svelte` replaces all of them.
- **Generation scripts** (`generate-game-pages.js`, `generate-run-category-pages.js`, `generate-runner-game-pages.js`, `generate-codeowners.js`): Most become unnecessary. Page generation is handled by the framework's routing. CODEOWNERS generation might still be useful.
- **Liquid templates** in `_includes/` and `_layouts/`: Become Svelte components or React components. The big ones to plan for:
  - `game-rules.html` (1,288 lines, 710-line inline script) → Break into smaller components
  - `header.html` (631 lines, 324 lines of inline JS/CSS) → Header component with proper imports
  - `runner.html` layout (664 lines) → Runner page component
  - `game-runs.html` layout (810 lines) → Runs page component
  - `cookie-consent.html`, `report-modal.html` → Standalone components
- **`form-index.json`** and the script that generates it → Server-side data loading (e.g., `+page.server.ts` load functions) can query game data directly.
- **`assets/style.css`** (old monolithic file) → Delete. The SCSS pipeline is the source of truth.

## Data Architecture Decisions
- [ ] **Where does game data live?** Options: Keep as markdown files (parsed at build), move to Supabase, or hybrid (markdown for config, Supabase for runs/profiles).
- [ ] **Static vs SSR vs hybrid**: Game pages can be statically generated at build time (SSG). Profile pages and admin panels should be server-rendered (SSR). Run submission needs client-side interactivity.
- [ ] **Auth strategy**: SvelteKit has `+page.server.ts` and `+layout.server.ts` for server-only auth logic. Supabase keys stay server-side. No more exposing the anon key in `_data/supabase-config.yml`.
- [ ] **Form handling**: SvelteKit form actions replace the current `submit-run.js` fetch-based approach with progressive enhancement (works without JS).

## Migration Order (Suggested)
1. **Set up SvelteKit project** with Supabase adapter and Cloudflare Pages adapter
2. **Port static pages first**: Games index, game overview, rules, history, glossary, legal
3. **Port data-driven pages**: Runs tables, runner profiles (these test the data pipeline)
4. **Port interactive features**: Submit forms, admin panels, auth flows, search
5. **Port remaining**: Profile editing, theme system, cookie consent, reporting
6. **Verify and cut over**: Run both sites in parallel, compare output, switch DNS

## Things That Will Need Rethinking
- **GitHub Actions workflows**: The game submission pipeline (Google Form → Apps Script → GitHub → PR) still works, but the hydrate step changes since there are no pages to generate. The PR would just add the markdown file.
- **Inline styles/scripts in templates**: Currently ~838 lines of inline CSS and ~1,550 lines of inline JS across includes/layouts. These must be extracted into proper component files. Don't port them inline.
- **The `hidden` game/runner pattern** (`_test-game.md`, `_test-runner.md`): In SvelteKit, use environment-based filtering instead of underscore prefixes.
- **Hardcoded game logic**: `submit-run.js` has Hades-2-specific validation. Fix this *before* migrating — make it data-driven so it ports cleanly.
- **Cookie consent**: Current implementation is a large inline include. Consider a lightweight Svelte store-based approach.

## Framework-Specific Notes

### If SvelteKit (Recommended)
- Use `@sveltejs/adapter-cloudflare` for Cloudflare Pages deployment
- Scoped styles per component replace the global SCSS approach (keep SCSS for shared variables/mixins)
- Built-in transitions replace any JS animation logic
- `+page.server.ts` load functions replace the form-index.json caching pattern
- Consider `shadcn-svelte` or `skeleton` for UI component primitives
- Svelte stores replace the scattered `localStorage` usage for theme/auth state

### If Next.js
- Use `@cloudflare/next-on-pages` for Cloudflare deployment (less mature than native Vercel)
- React Server Components for game/runner pages (no client JS shipped)
- Client Components for interactive sections (forms, filters, admin)
- `next/image` for automatic image optimization (replaces manual WebP conversion)
- Consider `shadcn/ui` for component primitives

## Pre-Migration Cleanup (Do Before Starting)
- [x] Fix hardcoded game logic in `submit-run.js` (character validation is now data-driven)
- [ ] Remove `assets/style.css` after confirming SCSS pipeline
- [ ] Remove `games/test-game/` duplicate directory
- [ ] Remove `_queue_games/constance.md` leftover
- [ ] Ensure all games use tiered category structure (no legacy `categories_data`)
- [ ] Document the Google Form → GitHub pipeline so it can be replicated

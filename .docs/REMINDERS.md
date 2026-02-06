# Reminders & Future Ideas

This document consolidates all reminders, future ideas, and planned features for CRC.

**Last updated:** 2026/02/05

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

### 2. Modded Game Support
- [ ] Build game submission UI in admin dashboard.

### 2.5. Multi-Game Runs
- [ ] Add multi-game run support using the same pattern as modded games:
  - `is_multi_game: true` flag in game front matter
  - `related_games: [game-id-1, game-id-2, ...]` to link individual games
- [ ] Add layout support in `game.html` for `is_multi_game` (mirror the `is_modded` banner logic)
- [ ] Update `generate-game-pages.js` and `generate-run-category-pages.js` to handle multi-game entries
- [ ] Update `games/index.html` to display multi-game badge

### 3. Forms & Submissions
- [ ] New Game Submission form
  - Check Discord Webhook by submitting a new game. Has been updated, but not tested.
- [ ] New Run Submission 
  - Test variables. Update if needed.

### 3.5. Legal Document Review
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

See [Migration Notes](#sveltekit-migration-notes) below for detailed planning.

### 8. Dark/Light Mode Toggle and Accessibility Features
- [ ] Add light mode CSS variables
- [ ] Add toggle button to header
- [ ] Colorblind mode
- [ ] Store preference in localStorage
- [ ] Respect `prefers-color-scheme`

### 9. History Tab Refinement
- Needs Runner Profiles with Badges first
- Focus on: rule changes, discussions, community milestones
- NOT global submissions from anyone

### 10. News & History Integration
- Requires News page activity first
- Combine news posts with game history for unified timeline

### 11. Forum Integration
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
- [ ] Fix hardcoded game logic in `submit-run.js` (make character validation data-driven)
- [ ] Remove `assets/style.css` after confirming SCSS pipeline
- [ ] Remove `games/test-game/` duplicate directory
- [ ] Remove `_queue_games/constance.md` leftover
- [ ] Ensure all games use tiered category structure (no legacy `categories_data`)
- [ ] Document the Google Form → GitHub pipeline so it can be replicated

# Reminders & Future Ideas

This document consolidates all reminders, future ideas, and planned features for CRC.

**Last updated:** 2026/02/10

---

# Revisit

### Icons for Staff Roles
- [ ] Design icons for Admins, Super Admins, Verifiers
- [ ] Display on runner profiles

---

# Immediate Priorities

### 1. Legal Document Review
- [2] Review Terms of Service line-by-line 3 times
- [x] Add 13+ age requirement
- [x] Add third-party services disclosure (Supabase, Cloudflare, Discord/Twitch OAuth)
- [ ] Add DMCA/Copyright policy
    - Exists at Tos 7.4?

- [1] Review Privacy Policy line-by-line 3 times
- [x] Document all data collected in Privacy Policy 
- [ ] Privacy Policy 5.2: Remove "GitHub (Microsoft)" after migrating to new framework?

- [ ] Add user data export feature (GDPR compliance)
- [ ] Add content license agreement for submissions
- [ ] Write procedures to follow for Admins, Moderators, and Verifiers to make sure compliance is met.
    - Write specific guidelines based on user location: GDPR ; CCPA
- [ ] Make email accounts for privacy and legal
- [ ] Create disaster recovery plan document

---

# Short-Term (Before Svelte Migration)

### 2. History Tab Refinement
- Focus on: rule changes, discussions, community milestones
- Needs Runner Profiles with Badges first
- NOT global submissions from anyone

### 3. Support and Glossary
- [ ] Support page: add Staff section, FAQ content, contact links
  - [ ] "Privacy Request" form or page users can fill out
    - Link to it from your Privacy Policy or footer
    - log requests
- [ ] Glossary page: define Hit, Damage, Death, Hard CC, Soft CC, Hitless vs Damageless, Full Run, Mini-Challenge, etc.
  - [ ] Add supporting documents / community guides (ask creators first)

---

# Short-Term (During Svelte Migration)

### 4. SvelteKit Migration

See [Migration Notes](#sveltekit-migration-notes) below for detailed planning.

### 5. CSS / Code Cleanup (Absorb Into Migration)
These are moot once templates become Svelte components:
- [ ] Audit CSS for unused code (inline `<style>` blocks total ~38KB across templates)
- [ ] Consistent variable naming across pages
- [ ] Extract inline styles/scripts (~838 lines CSS, ~1,550 lines JS in includes/layouts)
- [ ] Consider Jekyll plugins or asset pipeline → replaced by Vite/SvelteKit

### 6. Final Migration
- [ ] Build Game Submission UI in Admin Dashboard
  - Replaces Google Form. Better as a Svelte component than a Jekyll page.
- [ ] Remove GitHub PR Workflow for Runs
  - Replace with direct Supabase → GitHub API via Worker (already partially built). Cleaner in SvelteKit where the admin panel is a real app.

### 7. Test End-to-End Pipelines
- [ ] Test Discord webhook for new game submissions
- [ ] Test full flow: form → Worker → Supabase → Dashboard → approve
- [ ] Verify run submission → PR → merge → appears on site

### 8. Verifier CMS (Edit Mode on Game Pages)
Deferred to Svelte — needs component-based UI for inline editing, confirmation dialogs, and diff previews. Key design decisions:
- Require 2 verifiers to approve rule changes
- Verifiers can edit descriptions, challenges, rules, achievements, credits
- All changes logged to History tab with confirmation dialog
- Application flow: user applies → admin approves → gets `verified_games` array

### 9. Spanish Language Support
- [ ] Create `_data/i18n/es.yml` with translations
- [ ] Add language toggle to header
- [ ] Create Spanish versions of key pages or use i18n framework
- [ ] Request community translation help early

Better in SvelteKit with `$lib/i18n` or `paraglide-js` than Liquid hacks.

### 10 Documentation:
- [ ] How to Navigate the Site — FAQ or general explanation
- [ ] Moderator guide
- [ ] "Fixing mistakes" guide (for admins/verifiers)

### 11. Dark/Light Mode & Accessibility
Current theme system works (4 color themes via `data-theme`). Full light mode + accessibility features are easier in Svelte:
- [ ] Add proper light mode CSS variables
- [ ] Colorblind mode
- [ ] Respect `prefers-color-scheme`
- [ ] Store preference via Svelte stores (replaces scattered localStorage)

---

# Future Features (Backlog)

### 12. Forum Integration
Decision needed: GitHub Discussions vs Discord
- Player-Made Challenges and connecting them to user profiles

### 13. Community Building
- [ ] Leaderboards (per-game, per-challenge)
- [ ] Player-Made Challenges via forum
- [ ] Badges system
- [ ] Run count badges on game cards

### 14. News & History Integration
- Requires News page activity first
- Combine news posts with game history for unified timeline

### 15. Multi-Game Runs
A single challenge attempt spanning multiple games played in sequence (e.g., "Hitless Hades Marathon" — Hades 1 + 2 back-to-back without taking a hit).

- `is_multi_game: true` + `related_games: [hades, hades-2]` flags
- "🎮 MULTI-GAME" badge on Games index
- Cross-linking banners on individual game pages
- [ ] Add `is_multi_game` and `related_games` to `generate-game-file.py`
- [ ] Add layout support in `game.html` (mirror `is_modded` banner logic)
- [ ] Update games index for multi-game badge
- [ ] Update generation scripts

### 16. Team Profiles
- [ ] Team submission process
- [ ] Team page layout refinements
- [ ] Member lists with runner profile links
- [ ] Connecting Team Badges to a user's profile

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
- **Liquid templates** in `_includes/` and `_layouts/`: Become Svelte components. The big ones to plan for:
  - `game-rules.html` (1,288 lines, 710-line inline script) → Break into smaller components
  - `header.html` (631 lines, 324 lines of inline JS/CSS) → Header component with proper imports
  - `runner.html` layout (664 lines) → Runner page component
  - `game-runs.html` layout (810 lines) → Runs page component
  - `cookie-consent.html`, `report-modal.html` → Standalone components
- **`form-index.json`** and the script that generates it → Server-side data loading (`+page.server.ts` load functions) can query game data directly.
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

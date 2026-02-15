# Reminders & Future Ideas

This document consolidates all reminders, future ideas, and planned features for CRC.

**Last updated:** 2026/02/14

---

# Revisit

### Icons for Staff Roles
- [ ] Design icons for Admins, Super Admins, Verifiers
- [ ] Display on runner profiles

### Legal, Hands-Off fixes
- [ ] DMCA safe harbor protection
    - Current policy covers at a basic level
    - Worth doing eventually. Needs a more formal policy with a designated agent
        - Registering a DMCA agent with the Copyright Office costs $6 and requires a physical address
- [ ] Test user data export feature (GDPR compliance)
- [ ] Create disaster recovery plan document
    - Finish frontend framework migration first

---

# Immediate Priorities

### 1. Legal Document Review
- [2] Review Terms of Service line-by-line 3 times
- [1] Review Privacy Policy line-by-line 3 times
- [ ] Make email accounts for privacy and legal

### 2. Deploy SvelteKit to Cloudflare Pages
The SvelteKit migration is functionally complete — all routes, data, auth, and admin are ported. The blocker is deployment.

**Option A: Cloudflare Pages (recommended)** — you're already using Cloudflare Worker + Turnstile:
1. Swap adapter: `adapter-static` → `adapter-cloudflare`
2. Connect GitHub repo at [dash.cloudflare.com](https://dash.cloudflare.com) → Pages
3. Set build command `pnpm build`, add env vars
4. Every `git push` auto-deploys (same workflow as Jekyll + GitHub Pages)

**Option B: Stay on adapter-static** — deploy the static build to Cloudflare Pages as-is. Simpler, but auth pages won't have SSR.

- [ ] Choose adapter strategy
- [ ] Deploy and verify site works
- [ ] Point custom domain
- [ ] Remove Privacy Policy 5.2: "GitHub (Microsoft)"

---

# Short-Term (Post-Launch Cleanup)

### 3. Missing Svelte Components
These existed in Jekyll (`_includes/`) but haven't been rebuilt yet:
- [ ] **Cookie consent banner** — Jekyll had `cookie-consent.html`. Build as `<CookieConsent>` component with `$lib/stores/consent.ts`. The `/legal/cookies` page exists but there's no banner.
- [ ] **Report modal** — Jekyll had `report-modal.html`. Needs a `<ReportModal>` component.
- [ ] **Achievement card** — Jekyll had `achievement-card.html`. Only 1 achievement exists so far but the component is needed for runner profiles.

### 4. History Tab Refinement
- Route exists (`/games/[game_id]/history`) — currently a placeholder
- Focus on: rule changes, discussions, community milestones
- Needs Runner Profiles with Badges first
- NOT global submissions from anyone

### 5. Support and Glossary — Fill In Content
Both pages exist in SvelteKit but have placeholder content:
- [ ] Glossary: fill in definitions for Hit, Damage, Death, Hard CC, Soft CC, Hitless vs Damageless, Full Run, Mini-Challenge, etc.
  - [ ] Add supporting documents / community guides (ask creators first)
- [ ] Support: add Staff section, FAQ content, contact links
  - [ ] "Privacy Request" form or page users can fill out — link from Privacy Policy and footer
  - [ ] Log requests

### 6. CSS Cleanup
SCSS was fully ported (228K across base/, components/, pages/) but some may be dead code now that components use scoped `<style>` blocks:
- [ ] Audit for unused SCSS (141K in components alone)
- [ ] Check for duplicated styles between global SCSS and component `<style>` blocks

### 7. Test End-to-End Pipelines
- [ ] Test Discord webhook for new game submissions
- [ ] Test full flow: form → Worker → Supabase → Dashboard → approve
- [ ] Verify run submission → PR → merge → appears on site

### 8. Documentation
Staff guides are already in `src/data/staff-guides/` (admin, moderator, super-admin, verifier, compliance):
- [ ] How to Navigate the Site — FAQ or general explanation
- [ ] "Fixing mistakes" guide (for admins/verifiers)
- [ ] Surface staff guides in the admin panel or a protected route

### 9. Dark/Light Mode & Accessibility
Theme store is built (`$lib/stores/theme.ts`) — already supports dark/light toggle and respects `prefers-color-scheme`:
- [ ] Add proper light mode CSS variables (currently 4 color themes via `data-theme`)
- [ ] Colorblind mode
- [ ] Test all pages in light mode

---

# Medium-Term

### 10. Game Submission UI in Admin Dashboard
- [ ] Build admin-facing form to add games directly (replaces Google Form)
- [ ] Should create markdown file + open PR via GitHub API, or write to Supabase
- [ ] Admin page already has tabs — add a new section within it

### 11. Streamline Run Pipeline
- [ ] Replace GitHub PR workflow for runs with: Worker → Supabase → Admin approves → GitHub API commits file
- [ ] Worker (`worker/src/`) is already partially built for this
- [ ] Test full flow: submit → Worker → Supabase → Admin dashboard → approve → appears on site

### 12. Verifier CMS (Edit Mode on Game Pages)
Needs component-based UI for inline editing, confirmation dialogs, and diff previews:
- [ ] Verifiers can edit descriptions, challenges, rules, achievements, credits
- [ ] Require 2 verifiers to approve rule changes
- [ ] All changes logged to History tab with confirmation dialog
- [ ] Application flow: user applies → admin approves → gets `verified_games` array

### 13. Spanish Language Support
Better in SvelteKit with `paraglide-js` or `$lib/i18n`:
- [ ] Create translation files
- [ ] Add language toggle to Header
- [ ] Create Spanish versions of key pages
- [ ] Request community translation help early

---

# Future Features (Backlog)

### 14. Forum Integration
Route exists (`/games/[game_id]/forum`) — currently a placeholder. Decision needed: GitHub Discussions vs Discord.
- Player-Made Challenges and connecting them to user profiles

### 15. Community Building
- [ ] Leaderboards (per-game, per-challenge)
- [ ] Player-Made Challenges via forum
- [ ] Badges system
- [ ] Run count badges on game cards

### 16. News & History Integration
- Requires News page activity first
- Combine news posts with game history for unified timeline

### 17. Multi-Game Runs
A single challenge attempt spanning multiple games played in sequence (e.g., "Hitless Hades Marathon" — Hades 1 + 2 back-to-back without taking a hit).

- `is_multi_game: true` + `related_games: [hades, hades-2]` flags
- "🎮 MULTI-GAME" badge on Games index
- Cross-linking banners on individual game pages
- [ ] Add `is_multi_game` and `related_games` to game markdown front matter
- [ ] Add layout support in game detail page (mirror `is_modded` banner logic)
- [ ] Update games index for multi-game badge

### 18. Team Profiles
Teams page and data exist (`/teams`, `src/data/teams/`):
- [ ] Team submission process
- [ ] Team page layout refinements
- [ ] Member lists with runner profile links
- [ ] Connecting Team Badges to a user's profile

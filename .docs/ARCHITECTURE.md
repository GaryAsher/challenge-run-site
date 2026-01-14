# Architecture Overview

Technical documentation for Challenge Run Community.

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Static Site Generator | Jekyll |
| Hosting | GitHub Pages |
| CI/CD | GitHub Actions |
| Forms | Google Forms → Apps Script → GitHub |
| Styling | Custom CSS (no framework) |
| JavaScript | Vanilla JS (no framework) |

---

## Data Flow

```
User Submission
      ↓
Google Form
      ↓
Apps Script (validates & formats)
      ↓
GitHub API (creates PR)
      ↓
CI Validation (banned terms, schema)
      ↓
Moderator Review
      ↓
Merge to Main
      ↓
Auto-regenerate workflow
      ↓
GitHub Pages rebuild
      ↓
Live on site
```

---

## Directory Structure

```
/
├── _config.yml          # Jekyll configuration
├── _data/               # Shared data (platforms, genres, challenges)
├── _games/              # Game definitions (source of truth)
├── _runs/               # Verified runs
├── _runners/            # Runner profiles
├── _posts/              # News articles
├── _queue_games/        # Pending game submissions
├── _queue_runs/         # Pending run submissions
├── _layouts/            # Page templates
├── _includes/           # Reusable components
├── assets/              # CSS, JS, images
├── games/               # Generated game pages
├── scripts/             # Build & validation scripts
└── .github/workflows/   # CI/CD automation
```

---

## Collections

### Games (`_games/`)
- **Source of truth** for game data
- Defines categories, challenges, rules
- Referenced by runs and generated pages

### Runs (`_runs/`)
- Organized by game: `_runs/{game-id}/`
- Filename format: `YYYY-MM-DD__{game}__{runner}__{category}__{nn}.md`
- Not output as pages (data only)

### Runners (`_runners/`)
- One file per runner
- Output as pages at `/runners/{runner-id}/`

### Posts (`_posts/`)
- News and announcements
- Standard Jekyll posts
- Output at `/news/`

---

## Generated vs Authored

### Authored (edit directly)
- `_games/*.md`
- `_runs/**/*.md`
- `_runners/*.md`
- `_posts/*.md`
- `_data/*.yml`
- `_layouts/*.html`
- `_includes/*.html`
- `assets/style.css`

### Generated (don't edit)
- `games/**/*.html` → `npm run generate:game-pages`
- `.github/CODEOWNERS` → `npm run generate:codeowners`

---

## Workflows

### CI (`ci.yml`)
- Runs on all PRs and pushes
- Validates YAML, schema, banned terms
- Builds Jekyll site
- Auto-generates files on PRs

### Auto-Regenerate (`auto-regenerate.yml`)
- Triggers on `_games/`, `_data/`, `_runners/` changes
- Regenerates all pages
- Commits directly to main

### Promote Game (`promote-game.yml`)
- Moves game from `_queue_games/` to `_games/`
- Generates all game pages
- Creates CODEOWNERS entry

### Promote Runs (`promote-runs.yml`)
- Daily at midnight UTC
- Moves runs from `_queue_runs/` to `_runs/`

### Lighthouse (`lighthouse.yml`)
- Performance/accessibility testing
- Runs on PRs and pushes
- Reports in workflow summary

---

## Validation Pipeline

1. **YAML Syntax** - Basic parsing check
2. **Banned Terms** - Content moderation
3. **Schema Validation** - Required fields, formats
4. **Run Validation** - Game/category existence
5. **Jekyll Build** - Template errors

---

## Key Scripts

| Script | Purpose |
|--------|---------|
| `validate-schema.js` | Check game/run data structure |
| `validate-runs.js` | Verify runs reference valid games |
| `check-banned-terms.js` | Content moderation |
| `generate-game-pages.js` | Create `games/**/*.html` |
| `generate-codeowners.js` | Create CODEOWNERS from reviewers |
| `diagnose-game.js` | Debug specific game issues |

---

## Environment Requirements

### Local Development
- Node.js 20+
- Ruby 3.2+
- Bundler
- npm packages: `npm ci`
- Ruby gems: `bundle install`

### Build
```bash
npm run validate          # Check data
npm run generate          # Generate pages
bundle exec jekyll build  # Build site
```

---

## Scaling Considerations

### Current Limits
- GitHub Pages: 1GB repo, 100MB file
- Jekyll build: ~1000 pages/minute
- Free GitHub Actions: 2000 min/month

### Watch Points
- Build time increases with page count
- Large tables may need pagination
- Image optimization important

### Mitigation
- Keep images under 200KB
- Consider pagination at 500+ runs/game
- Use incremental builds in development

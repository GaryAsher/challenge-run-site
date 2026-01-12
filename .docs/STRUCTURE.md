# Repository Structure

## Folder Overview

```
challenge-run-site-main/
├── .docs/              # Documentation (you are here)
├── .github/            # GitHub automation (workflows, issue templates)
├── _data/              # Shared data (challenges, platforms, genres)
├── _games/             # Game definitions (one .md per game)
├── _includes/          # Reusable HTML components
├── _layouts/           # Page templates
├── _queue_games/       # Pending game submissions (review queue)
├── _queue_runs/        # Pending run submissions (review queue)
├── _runners/           # Runner profiles
├── _runs/              # Approved run records
├── _templates/         # Reusable templates for games, runs, etc.
├── assets/             # CSS, JS, images
├── games/              # Generated game pages (do not edit directly)
├── scripts/            # Build and automation scripts
└── [other pages]       # Homepage, search, etc.
```

## Key Folders

### `_games/`
One markdown file per game. The `game_id` in front matter must match the filename.

```yaml
# _games/hades-2.md
---
game_id: hades-2        # Must match filename
name: "Hades II"
# ... rest of game config
---
```

### `_runs/`
Approved runs. Filename format: `YYYY-MM-DD__game-id__runner-id__category-slug__NN.md`

Example: `2025-01-15__hades-2__speedster__any-percent__01.md`

### `_queue_runs/` and `_queue_games/`
Pending submissions awaiting review. Same format as their approved counterparts.

**Important**: These folders must contain ONLY submission files. No READMEs, no templates.

### `games/`
Auto-generated pages. Do not edit directly—changes will be overwritten.

---

## Naming Rules

### IDs and Slugs

All IDs follow the same format: **lowercase, hyphenated, alphanumeric**.

| Type | Example | Used In |
|------|---------|---------|
| `game_id` | `hades-2` | Filenames, URLs, data lookups |
| `runner_id` | `john-smith` | Filenames, URLs |
| `category_slug` | `any-percent` | URLs, filtering |
| `challenge_id` | `no-hit` | Run records, filtering |

**Rules:**
- Lowercase only
- Hyphens for spaces (no underscores in IDs)
- No special characters except hyphens
- Must start with a letter

**Good:** `hades-2`, `any-percent`, `no-hit`  
**Bad:** `Hades_2`, `any%`, `100%completion`

### Filenames

**Games:** `{game_id}.md`  
**Runs:** `{date}__{game_id}__{runner_id}__{category_slug}__{NN}.md`  
**Runners:** `{runner_id}.md`

Note: Double underscores (`__`) separate filename parts. Single hyphens (`-`) are used within IDs.

---

## Data Files (`_data/`)

| File | Purpose |
|------|---------|
| `challenges.yml` | Global challenge definitions (No-Hit, Pacifist, etc.) |
| `codeowners.yml` | Maps games to reviewers |
| `genres.yml` | Valid genre tags |
| `platforms.yml` | Valid platform values |

These are referenced by validation scripts and site templates.

---

## Generated vs. Source Files

| Folder | Type | Notes |
|--------|------|-------|
| `_games/` | Source | Edit these |
| `_runs/` | Source | Edit these |
| `_runners/` | Source | Edit these |
| `games/` | Generated | Do not edit |
| `.github/CODEOWNERS` | Generated | Run `npm run generate:codeowners` |

---

## Common Tasks

### Add a new game
```bash
# Option 1: Use the scaffold script
node scripts/scaffold-game.js path/to/game.json

# Option 2: Manually create _games/{game-id}.md
```

### Regenerate pages after changes
```bash
npm run generate:game-pages
npm run generate:run-categories
npm run generate:codeowners
```

### Validate files
```bash
npm run validate
```

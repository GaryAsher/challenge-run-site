# Challenge Run Central - Repository Structure

This document explains how the repository is organized and where to find things.

## Quick Navigation

| I want to... | Go to... |
|--------------|----------|
| Add a new game | Submit via [GitHub Issue](../../issues/new?template=game-change-request.yml) or create PR in `_queue_games/` |
| Submit a run | Use [GitHub Issue](../../issues/new?template=run-submission.yml) |
| Edit a game | Edit file in `_games/` |
| Edit a run | Edit file in `_runs/<game>/` |
| Add a runner profile | Edit file in `_runners/` |

---

## Directory Structure

```
challenge-run-site/
│
├── _config.yml                # Jekyll configuration
├── package.json               # Node.js scripts and dependencies
│
├── _data/                     # Site-wide data files
│   ├── genres.yml             # Genre/tag definitions
│   ├── platforms.yml          # Platform definitions  
│   ├── challenges.yml         # Challenge type definitions
│   ├── codeowners.yml         # Game ownership mapping
│   └── games-index.yml        # Quick game lookup
│
├── _games/                    # Game definitions (Jekyll collection)
│   ├── hades-2.md
│   ├── hollow-knight.md
│   └── _TEMPLATES/            # Templates for new games
│
├── _runners/                  # Runner profiles (Jekyll collection)
│   └── *.md
│
├── _runs/                     # Approved runs (Jekyll collection)
│   ├── <game-id>/             # Runs organized by game
│   │   └── *.md
│   └── rejected/              # Rejected runs (for records)
│
├── _queue_games/              # Pending game submissions
├── _queue_runs/               # Pending run submissions
│   └── <game-id>/
│
├── games/                     # Generated game pages (static)
│   ├── index.html             # Games listing
│   └── <game-id>/
│       ├── runs/              # Run listing and categories
│       ├── history/
│       ├── resources/
│       ├── forum/
│       └── rules/
│
├── runners/                   # Generated runner pages
│   └── index.html
│
├── scripts/                   # Automation scripts
│   ├── lib/                   # Shared utilities
│   ├── validate-schema.js     # Schema validation
│   ├── validate-runs.js       # Run validation
│   ├── generate-game-pages.js # Game page generation
│   ├── generate-run-category-pages.js
│   ├── generate-codeowners.js
│   ├── promote-runs.js        # Run promotion
│   ├── scaffold-game.js       # Manual game creation
│   └── generate-game-file.py  # Form submission processing
│
├── .github/
│   ├── ISSUE_TEMPLATE/        # Issue templates for submissions
│   │   ├── run-submission.yml
│   │   ├── hollow-knight-run-submission.yml
│   │   ├── game-change-request.yml
│   │   └── runner-profile.yml
│   └── workflows/             # GitHub Actions
│       ├── new-game-submission.yml    # Process game forms
│       ├── process-run-submission.yml # Process run issues
│       ├── promote-game.yml           # Promote approved games
│       ├── promote-approved-runs.yml  # Daily run promotion
│       ├── validate-schema.yml        # CI validation
│       └── ...
│
├── .docs/                     # Documentation
│   ├── README.md
│   ├── REPOSITORY-STRUCTURE.md (this file)
│   ├── CONTRIBUTING.md
│   ├── id-and-slug-spec.md
│   └── ...
│
├── _includes/                 # Jekyll partials
├── _layouts/                  # Jekyll layouts
└── assets/                    # CSS, JS, images
    ├── style.css
    ├── js/
    └── img/
        └── games/             # Game cover images
            └── <first-letter>/
```

---

## Key Concepts

### Collections (Jekyll)

Jekyll collections are folders prefixed with `_`. Each `.md` file becomes a page:

| Collection | Output Path | Purpose |
|------------|-------------|---------|
| `_games` | `/games/<game_id>/` | Main game pages |
| `_runners` | `/runners/<runner_id>/` | Runner profiles |
| `_runs` | N/A (data only) | Run records |

### Queue System

New submissions go to queue folders first:

```
_queue_games/   →  Review  →  _games/
_queue_runs/    →  Review  →  _runs/
```

### Generated vs Source Files

| Type | Location | Edited By |
|------|----------|-----------|
| Source | `_games/*.md`, `_runs/**/*.md` | Humans |
| Generated | `games/*/`, `CODEOWNERS` | Scripts |

**Never edit generated files directly!** Edit the source and regenerate.

---

## Workflows Summary

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `validate-schema.yml` | PR | Validates all YAML |
| `new-game-submission.yml` | Form dispatch | Creates game from form |
| `process-run-submission.yml` | Issue events | Handles run submissions |
| `promote-game.yml` | PR merged | Moves game to `_games/` |
| `promote-approved-runs.yml` | Daily | Moves runs to `_runs/` |

---

## npm Scripts

```bash
# The standard flow:
npm run validate      # 1. Check everything is valid
npm run generate      # 2. Generate all pages
npm run promote:runs  # 3. Promote approved runs

# Individual commands:
npm run validate:schema
npm run validate:runs
npm run generate:game-pages
npm run generate:run-categories
npm run generate:codeowners
npm run promote:runs:dry  # Preview without changes
```

---

## File Naming Conventions

| Type | Format | Example |
|------|--------|---------|
| Game ID | `lowercase-with-hyphens` | `hollow-knight` |
| Runner ID | `lowercase-with-hyphens` | `gary-asher` |
| Run file | `YYYY-MM-DD__<game>__<runner>__<category>__NN.md` | `2025-01-10__hollow-knight__runner1__any__01.md` |
| Category slug | `lowercase-with-hyphens` or `parent/child` | `any`, `pantheons/pantheon-5` |

# GitHub Actions Workflows

This folder contains automated workflows for the Challenge Run site.

## Workflow Overview

### Submission Processing

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `new-game-submission.yml` | `repository_dispatch` from Google Forms | Creates game files in `_queue_games/` from form submissions |

### Promotion (Queue → Live)

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `promote-game.yml` | PR merged to `_queue_games/` | Moves approved games from queue to live, generates pages |
| `promote-runs.yml` | Daily cron (midnight UTC) or manual | Batch-promotes approved runs from `_queue_runs/` to `_runs/` |

### Validation & CI

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | PR/push to main | Validates YAML, schema, runs; builds Jekyll site |
| `check-duplicate-game.yml` | PR to `_queue_games/` | Warns if game already exists |

### Quality Checks

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `lighthouse.yml` | Push to main | Runs Lighthouse accessibility/performance tests |
| `generate-run-categories.yml` | Push to `_runs/` or manual | Regenerates run category pages |

### Utilities

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `create-package-lock.yml` | Manual only | Updates `package-lock.json` |
| `validate-generated-run-pages.yml` | PR to `_runs/` or scripts | Ensures category pages are current |

## Flow Diagrams

### Game Submission Flow

```
Google Form
    │
    ▼
Apps Script ─────► repository_dispatch
    │
    ▼
new-game-submission.yml
    │
    ▼
_queue_games/{game}.md ─────► PR created
    │
    ▼ (PR merged)
promote-game.yml
    │
    ├──► _games/{game}.md
    └──► games/{game}/* (pages)
```

### Run Submission Flow

```
Google Form
    │
    ▼
Apps Script ─────► Creates file in _queue_runs/
    │
    ▼ (Daily cron)
promote-runs.yml
    │
    ▼
_runs/{game}/{run}.md
```

## Script Dependencies

Workflows call scripts from `/scripts/`:

| Script | Purpose |
|--------|---------|
| `validate-schema.js` | YAML/schema validation |
| `validate-runs.js` | Run file validation |
| `generate-codeowners.js` | CODEOWNERS generation |
| `generate-game-pages.js` | Game page scaffolding |
| `generate-run-category-pages.js` | Category page generation |
| `promote-runs.js` | Moves approved runs to live |

## Debugging

Check the "Actions" tab on GitHub to see workflow runs. Each run shows:
- Trigger event
- Job steps and their output
- Success/failure status

For local testing:
```bash
npm run validate        # Run all validation
npm run validate:schema # Schema only
npm run validate:runs   # Queue runs only
npm run check:all       # Check generated files
```

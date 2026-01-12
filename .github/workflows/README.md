# GitHub Actions Workflows

This folder contains automated workflows that run on various GitHub events.

## Workflow Overview

### Submission Processing

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `process-run-submission.yml` | Issue labeled/commented | Processes run submission issues. When `approved` label is added, creates PR to add run to `_runs/`. |
| `process-new-game-issue.yml` | Issue labeled/commented | Processes new game requests. Handles approval flow and game file creation. |
| `new-game-submission.yml` | `repository_dispatch` | Receives game submissions from external forms (Google Forms). Creates structured game files. |

### Promotion (Queue → Live)

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `promote-game.yml` | PR merged to `_queue_games/` | Moves approved games from queue to live. Generates game pages and updates CODEOWNERS. |
| `promote-runs.yml` | Daily cron (midnight) or manual | Batch-promotes approved runs from `_queue_runs/` to `_runs/`. |

### Validation

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `validate-schema.yml` | PR/push to main | Validates YAML structure of game files, data files, and run files. |
| `validate-queue-runs.yml` | PR/push to main | Validates run files in queue have correct format and required fields. |
| `validate-generated-run-pages.yml` | PR to `_runs/` or scripts | Ensures generated category pages are up-to-date. |
| `check-codeowners.yml` | PR/push to main | Ensures `.github/CODEOWNERS` matches `_data/codeowners.yml`. |
| `check-duplicate-game.yml` | PR to `_queue_games/` | Prevents duplicate game submissions. |

### Generation

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `generate-run-categories.yml` | Push to `_runs/` or manual | Regenerates run category pages (e.g., `/games/hades-2/runs/surface-any/`). |

### Utilities

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `create-package-lock.yml` | Manual only | Updates `package-lock.json` when dependencies change. |
| `lighthouse.yml` | PR/push to main | Runs Lighthouse performance tests on the site. |

## Common Patterns

### Label-Based Processing
Many workflows trigger on `issues: [labeled]` and check for specific labels:
- `run-submission` + `approved` → Process run
- `run-submission` + `rejected` → Close with explanation
- `new-game` + `approved` → Create game files

### Script Dependencies
Workflows call scripts from `/scripts/`:
- `generate-codeowners.js` - CODEOWNERS generation
- `generate-game-pages.js` - Game page scaffolding
- `generate-run-category-pages.js` - Category page generation
- `validate-schema.js` - YAML validation
- `validate-runs.js` - Run file validation

## Debugging

Check the "Actions" tab on GitHub to see workflow runs. Each run shows:
- Trigger event
- Job steps and their output
- Success/failure status

For local testing, most validation scripts can be run directly:
```bash
node scripts/validate-schema.js
node scripts/validate-runs.js
```

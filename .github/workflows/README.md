# GitHub Actions Workflows

This folder contains automated workflows for the Challenge Run site.

## Workflow Overview

### Core CI (One Check to Rule Them All)

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | PR/push to main | **All validation in one place**: YAML syntax, banned terms, schema, runs, duplicate detection, generated pages check, Jekyll build |

The CI workflow is the only check reviewers/moderators need to watch. If it passes, the submission is valid.

### Submission Processing

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `new-game-submission.yml` | `repository_dispatch` from Google Forms | Creates game files in `_queue_games/` from form submissions |

### Promotion (Queue → Live)

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `promote-game.yml` | PR merged to `_queue_games/` | Moves approved games from queue to live, generates pages |
| `promote-runs.yml` | Daily cron (midnight UTC) or manual | Batch-promotes approved runs from `_queue_runs/` to `_runs/` |

### Quality Checks

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `lighthouse.yml` | Push to main | Runs Lighthouse accessibility/performance tests |
| `generate-run-categories.yml` | Manual only | Regenerates run category pages (rarely needed) |

### Utilities

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `create-package-lock.yml` | Manual only | Updates `package-lock.json` |

## What CI Validates

The CI workflow runs these checks in order:

1. **YAML Syntax** - Ensures all YAML files are valid
2. **Banned Terms** - Blocks spam, slurs, and malicious content (see `_data/banned-terms.yml`)
3. **Schema Validation** - Validates game/runner/run file structure
4. **Run Validation** - Validates queued runs in `_queue_runs/`
5. **Duplicate Detection** - Warns if a game already exists (for new game PRs)
6. **Generated Pages Check** - Verifies run category pages are current

If any check fails, the PR cannot be merged. This gives reviewers/moderators confidence that passing CI means the submission is valid.

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
    ▼ (CI validates)
ci.yml ─────► All checks pass
    │
    ▼ (Reviewer merges PR)
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

## Reviewer/Moderator Workflow

**For game submissions:**
1. Check that CI passes (green checkmark) ✅
2. Review the game details look correct
3. Merge the PR → Game is automatically promoted

**For run submissions:**
1. Runs are auto-validated by CI when queued
2. `promote-runs.yml` runs daily to move approved runs
3. Moderators can manually trigger if needed

## Script Dependencies

Workflows call scripts from `/scripts/`:

| Script | Purpose |
|--------|---------|
| `check-yaml-syntax.js` | YAML syntax validation |
| `check-banned-terms.js` | Content moderation |
| `validate-schema.js` | Schema validation |
| `validate-runs.js` | Run file validation |
| `generate-codeowners.js` | CODEOWNERS generation |
| `generate-game-pages.js` | Game page scaffolding |
| `generate-run-category-pages.js` | Category page generation |
| `promote-runs.js` | Moves approved runs to live |

## Banned Terms Configuration

Edit `_data/banned-terms.yml` to manage blocked content:

```yaml
slurs:
  - "blocked-term"

spam:
  - "buy now"
  - "click here"

malicious:
  - "<script>"
  - "javascript:"

exceptions:
  - "glitch"  # Allow gaming terms that might false positive
```

## Debugging

Check the "Actions" tab on GitHub to see workflow runs. Each run shows:
- Trigger event
- Job steps and their output
- Success/failure status

For local testing:
```bash
npm run validate          # Run all validation (schema + runs + banned terms)
npm run validate:schema   # Schema only
npm run validate:runs     # Queue runs only
npm run validate:terms    # Banned terms only
npm run check:all         # Check generated files
```

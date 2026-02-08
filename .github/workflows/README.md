# GitHub Actions Workflows

This folder contains automated workflows for the Challenge Run site.

## Workflow Overview

### Core CI

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | PR/push to main | **All validation in one place**: YAML syntax, banned terms, schema, runs, duplicate detection, generated pages check, Jekyll build |

The CI workflow is the only check reviewers/moderators need to watch. If it passes, the submission is valid.

### Page Generation

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `auto-regenerate.yml` | Push to main (when game/run files change) | Auto-runs `npm run generate` and commits updated pages |
| `check-form-index.yml` | Push to main | Validates form-index.json is current |

### Submission & Sync

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `new-game-submission.yml` | `repository_dispatch` from Google Forms | Creates game files in `_queue_games/` from form submissions |
| `hydrate-new-game-pr.yml` | PR with new game files | Generates game pages for new game PRs |
| `sync-runner-profiles.yml` | Scheduled / manual | Syncs runner profiles between Supabase and GitHub |

### Quality & Monitoring

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `lighthouse.yml` | Push to main | Runs Lighthouse accessibility/performance tests |
| `process-report.yml` | Issue/form submission | Processes community reports |

## Submission Flows

### Run Submission (Current)

```
Site form (challengerun.net)
    │
    ▼
Cloudflare Worker POST /
    │
    ▼
Supabase pending_runs table
    │
    ▼ (Admin reviews at /admin/runs/)
Worker POST /approve
    │
    ├──► Supabase status → verified
    └──► GitHub API → _runs/{game}/{run}.md
```

### Game Submission (Current)

```
Site form (/submit/)
    │
    ▼
Cloudflare Worker POST /submit-game
    │
    ▼
Supabase pending_games table
    │
    ▼ (Admin reviews at /admin/games/)
Worker POST /approve-game
    │
    ├──► Supabase status → approved
    └──► GitHub API → _games/{game}.md
```

### Profile Submission

```
User signs in → creates profile in Supabase
    │
    ▼ (Admin reviews at /admin/profiles/)
Worker POST /approve-profile
    │
    ├──► Supabase status → approved
    └──► GitHub API → _runners/{runner-id}.md
```

## Reviewer/Moderator Workflow

All reviews happen in the admin dashboard:

- **Runs:** `/admin/runs/` — Review video, category, and runner info
- **Profiles:** `/admin/profiles/` — Review display name, bio, and socials
- **Games:** `/admin/games/` — Review game details, categories, and challenge types

Approve, Reject, or Request Changes. All actions trigger Discord notifications.

## Local Testing

```bash
npm run validate          # Run all validation (schema + runs + banned terms)
npm run validate:schema   # Schema only
npm run validate:runs     # Queue runs only
npm run validate:terms    # Banned terms only
npm run check:all         # Check generated files are current
```

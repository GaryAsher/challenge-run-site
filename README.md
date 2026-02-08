# Challenge Run Community (CRC)

A community-driven website for tracking and celebrating challenge runs across games.

**Live site:** [challengerun.net](https://www.challengerun.net)

## Quick Links

| Resource | Description |
|----------|-------------|
| [Submit a Run](https://www.challengerun.net/submit/) | Submit a challenge run for any active game |
| [Submit a Game](https://www.challengerun.net/submit/) | Request a new game to be tracked on CRC |
| [Documentation](.docs/) | Full documentation |

## Architecture

CRC runs on three services:

| Service | Role |
|---------|------|
| **Cloudflare** | DNS, CDN, security headers, Turnstile CAPTCHA, Worker API |
| **GitHub Pages** | Static site hosting (Jekyll) |
| **Supabase** | Authentication (Discord/Twitch OAuth), database, Row Level Security |

Submissions flow through the site form → Cloudflare Worker → Supabase. Admins review in the dashboard at `/admin/`. On approval, the Worker creates files in this repo via the GitHub API.

## For Developers

### Setup

```bash
# Install dependencies
npm install

# Install Ruby gems (for Jekyll)
bundle install
```

### Common Commands

```bash
# Validate everything (schema, runs, banned terms)
npm run validate

# Generate pages (game pages, run categories, runner game pages)
npm run generate

# Regenerate + commit + push
npm run regen

# Run Jekyll locally
bundle exec jekyll serve

# Check generated pages are current (CI uses this)
npm run check:all
```

### Project Structure

```
_games/             # Game definitions (Jekyll collection)
_runners/           # Runner profiles (Jekyll collection)
_runs/              # Approved run records (Jekyll collection)
_achievements/      # Community achievement completions
_data/              # Shared data (challenges, platforms, genres)
_includes/          # Reusable HTML components
_layouts/           # Page templates
admin/              # Admin dashboard pages
assets/             # CSS, JS, images
scripts/            # Node.js automation scripts
worker/             # Cloudflare Worker (submission + approval API)
supabase/           # Supabase Edge Functions
.github/workflows/  # GitHub Actions (CI, page generation)
.docs/              # Documentation
```

See [.docs/STRUCTURE.md](.docs/STRUCTURE.md) for full details.

## License

This repository is not open source. Forking or reuse without explicit permission is not permitted.

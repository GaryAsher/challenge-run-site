# Challenge Run Community (CRC)

A community-driven website for tracking and celebrating challenge runs across games.

## Quick Links

| Resource | Description |
|----------|-------------|
| [Submit a Run](../../issues/new?template=run-submission.yml) | Submit a challenge run for any game |
| [Submit New Game](../../issues/new?template=new-game-submission.yml) | Submit a new game to CRC |
| [Request Game Changes](../../issues/new?template=game-change-request.yml) | Request changes to an existing game |
| [Documentation](.docs/) | Full documentation |

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
# Validate everything
npm run validate

# Generate pages
npm run generate

# Run Jekyll locally
bundle exec jekyll serve

# Build for production
npm run build
```

### Workflow Order

When processing content, follow this order:

1. **Validate** - `npm run validate` - Ensures schema is correct
2. **Generate** - `npm run generate` - Creates game/run pages
3. **Promote** - `npm run promote:runs` - Moves approved runs to live

### Project Structure

```
_games/           # Game definitions (Jekyll collection)
_runners/         # Runner profiles (Jekyll collection)
_runs/            # Approved runs (Jekyll collection)
_queue_games/     # Pending game submissions
_queue_runs/      # Pending run submissions
scripts/          # Node.js automation scripts
.github/workflows # GitHub Actions automation
.docs/            # Documentation
```

See [.docs/REPOSITORY-STRUCTURE.md](.docs/REPOSITORY-STRUCTURE.md) for full details.

## License

This repository is not open source. Forking or reuse without explicit permission is not permitted.
# test

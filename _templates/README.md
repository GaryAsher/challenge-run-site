# Templates

Reusable templates for creating new content.

## Content Templates

| Template | Use For | Copy To |
|----------|---------|---------|
| `game-template.md` | New game (minimal) | `_games/{game-id}.md` |
| `game-template-expanded.md` | New game (all options) | `_games/{game-id}.md` |
| `run-template.md` | New run submission | `_runs/{filename}.md` |
| `runner-template.md` | New runner profile | `_runners/{runner-id}.md` |

## Subfolders

### `game-json-examples/`
Example JSON files for the scaffold-game script:
- `minimal-game.json` - Minimum required fields
- `hades-2.json` - Full example with all options

Usage: `node scripts/scaffold-game.js _templates/game-json-examples/minimal-game.json`

### `issue-forms/`
Game-specific GitHub Issue forms. Copy to `.github/ISSUE-TEMPLATE/` to activate.
- `hollow-knight-run-submission.yml` - Custom form for Hollow Knight

## Usage

1. Copy the appropriate template
2. Rename following the naming conventions in `.docs/STRUCTURE.md`
3. Fill in the required fields
4. Remove any unused optional fields

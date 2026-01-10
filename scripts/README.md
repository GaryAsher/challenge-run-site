# Scripts Documentation

This folder contains build, validation, and automation scripts for Challenge Run Central.

## Prerequisites

- Node.js 18+ (for JavaScript scripts)
- Python 3.8+ (for Python scripts)

Install dependencies:
```bash
npm ci
```

---

## Script Reference

### Game Generation

#### `generate-game-file.py`
Creates a game markdown file from form submission data. Called by GitHub Actions, not typically run manually.

**Environment Variables:**
- `GAME_NAME` - Full game name
- `GAME_ID` - URL slug
- `CATEGORIES` - Newline-separated category list
- `CHALLENGES` - Comma-separated challenge types
- `DETAILS_IN` - JSON with additional fields
- `OUT_FILE` - Output file path

**Usage (manual testing):**
```bash
export GAME_NAME="Test Game"
export GAME_ID="test-game"
export CATEGORIES="Any%"
export CHALLENGES="hitless,damageless"
export DETAILS_IN='{}'
export OUT_FILE="_queue_games/test-game.md"
export FIRST_LETTER="t"
export CHAR_ENABLED="false"
export CHAR_LABEL="Character"
export SUBMITTER=""
export CREDIT_REQUESTED="false"

python3 scripts/generate-game-file.py
```

---

#### `generate-game-pages.js`
Generates the page structure for games (runs/, history/, resources/, etc.).

**Usage:**
```bash
# Generate pages for all games
node scripts/generate-game-pages.js

# Generate for a specific game
node scripts/generate-game-pages.js --game hades-2

# Check mode (don't write, just verify)
node scripts/generate-game-pages.js --check
```

**What it creates:**
```
games/{game-id}/
├── runs/index.html
├── history/index.html
├── resources/index.html
├── guides/index.html
├── forum/index.html
├── rules/index.html
└── challenges/index.html (if enabled)
```

---

#### `generate-run-category-pages.js`
Creates individual category pages under a game's runs/ folder.

**Usage:**
```bash
# All games
node scripts/generate-run-category-pages.js

# Specific game
node scripts/generate-run-category-pages.js --game hades-2
```

**What it creates:**
```
games/{game-id}/runs/
├── {category-slug}/index.html
├── {category-slug}/{child-slug}/index.html
└── ...
```

---

### Validation

#### `validate-schema.js`
Validates game file structure against expected schema.

**Usage:**
```bash
node scripts/validate-schema.js
```

**Checks:**
- Required fields present (game_id, name, layout)
- Valid YAML syntax
- Valid field types
- Slug format correctness

---

#### `validate-runs.js`
Validates run submission files.

**Usage:**
```bash
# Validate all runs
node scripts/validate-runs.js

# Validate specific file
node scripts/validate-runs.js --file _runs/2025-01-01__game__runner__cat__01.md
```

**Checks:**
- Filename format matches pattern
- Required fields (game_id, runner_id, category, time, date)
- Game exists
- Category exists in game
- Date format valid

---

### Run Management

#### `promote-runs.js`
Moves verified runs from `_queue_runs/` to `_runs/`.

**Usage:**
```bash
# Promote specific run
node scripts/promote-runs.js --file _queue_runs/run-file.md

# Promote all approved runs (used by workflow)
node scripts/promote-runs.js --all-approved
```

---

### Utilities

#### `generate-codeowners.js`
Generates the CODEOWNERS file based on game moderators.

**Usage:**
```bash
node scripts/generate-codeowners.js
```

---

#### `scaffold-game.js`
Creates a new game file from a JSON config (alternative to form).

**Usage:**
```bash
node scripts/scaffold-game.js scripts/examples/minimal-game.json
```

**Example JSON:**
```json
{
  "game_id": "my-game",
  "name": "My Game",
  "categories": ["Any%", "100%"],
  "challenges": ["hitless", "damageless"]
}
```

---

## Shared Libraries

### `lib/index.js`
Main export file for shared utilities.

### `lib/parsers/front-matter.js`
Parses YAML front matter from markdown files.

### `lib/utils/file-utils.js`
File system utilities (read, write, check existence).

### `lib/validators/`
- `constants.js` - Validation constants
- `field-validators.js` - Field validation functions

---

## Adding New Scripts

1. Create your script in `scripts/`
2. If it uses shared utilities, import from `./lib`
3. Add CLI argument parsing if needed
4. Document usage in this README
5. If it should run in CI, create a workflow in `.github/workflows/`

---

## Common Tasks

### Test a form submission locally
```bash
# Set environment variables (see generate-game-file.py section)
# Then run:
python3 scripts/generate-game-file.py
cat _queue_games/test-game.md
```

### Regenerate all game pages
```bash
node scripts/generate-game-pages.js
node scripts/generate-run-category-pages.js
```

### Validate everything
```bash
node scripts/validate-schema.js
node scripts/validate-runs.js
```

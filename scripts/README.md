# Scripts

This folder contains small Node scripts used to keep the repository consistent.
Most contributors will never need to run these manually unless a guide or CI error tells them to.

If a GitHub check fails, the error message will usually name the script you need to run.

---

## Quick start

Run scripts from the repository root.

`npm install`

Run this once after a fresh clone, or anytime package.json changes.

---

## What each script does

### validate-schema.js

**Purpose**  
Validates the repository’s content and shared data files for correctness.

**What it checks**
- `_data/tags.yml` and `_data/challenges.yml` load correctly
- `_games/*.md` uses valid IDs and references known tags and challenges
- `_runners/*.md` uses valid IDs and references known games
- `_runs/**/*.md` has required fields and valid references
- Date and time formats are valid where present

This script is **read-only**. It never modifies files.

**Used by**
- CI check: Validate repo schema

**Run manually**
`npm run validate:schema`

---

### validate-runs.js

**Purpose**  
Validates queued run submissions before they are promoted into `_runs/`.

**Where it looks**
- `_queue_runs/<game_id>/**/*.md`
- Ignores `README.md` files inside the queue

**What it checks**
- YAML front matter exists
- Filename matches the required pattern
- Folder `game_id` matches filename and front matter
- Required fields exist
- IDs and slugs follow the ID and Slug Spec
- `date_submitted` matches the filename date
- Optional timing fields are valid if present

This script is **read-only**.

**Used by**
- CI check: Validate queued runs

**Run manually**
`npm run validate:runs`

---

### promote-runs.js

**Purpose**  
Moves approved runs from `_queue_runs/` into the canonical `_runs/` structure.

**Typical behavior**
- Processes runs based on approval status
- Moves or copies runs into `_runs/<game_id>/...`
- May archive or ignore rejected runs depending on configuration

This script **modifies files**.

**Used by**
- Maintainers and moderators

**Run manually**
`npm run promote:runs`

---

### generate-codeowners.js

**Purpose**  
Generates `.github/CODEOWNERS` based on ownership metadata in `_games/*.md`.

**Typical behavior**
- Regenerates CODEOWNERS entries per game
- Ensures CI and local state stay in sync

**Used by**
- CI check: check-codeowners.yml

**Run (update CODEOWNERS)**
`node scripts/generate-codeowners.js`

**Run (check only, no changes)**
`node scripts/generate-codeowners.js --check`

---

### generate-game-runs-category-pages.js

**Purpose**  
Generates run category pages for each game based on category definitions.

**Typical behavior**
- Reads category data from game files
- Creates or refreshes run category pages
- Ensures generated pages are deterministic

This script **modifies files**.

**Used by**
- CI check: validate-generated-run-pages.yml

**Run manually**
`npm run generate:run-categories`
or
`node scripts/generate-game-runs-category-pages.js`

---

## Notes

- Scripts are intentionally small and single-purpose.
- Validation scripts never modify files.
- Generator and promotion scripts should be run intentionally and committed afterward.
- If CI fails, read the error message carefully. It usually tells you exactly which script to run.

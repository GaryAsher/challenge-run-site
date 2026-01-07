# Scripts

This folder contains small Node scripts used to keep the repository consistent.
Most contributors will never need to run these manually unless a guide or CI error tells them to.

If a GitHub check fails, the error message will usually name the script you need to run.

---

## Quick start

Run scripts from the repository root.

```bash
npm install
```

Run this once after a fresh clone, or anytime package.json changes.

---

## What each script does

### validate-schema.js

**Purpose**  
Validates the repository's content and shared data files for correctness.

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

```bash
npm run validate:schema
```

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

```bash
npm run validate:runs
```

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

```bash
npm run promote:runs
```

**Run in preview mode (no changes)**

```bash
node scripts/promote-runs.js --dry-run
```

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

```bash
node scripts/generate-codeowners.js
```

**Run (check only, no changes)**

```bash
node scripts/generate-codeowners.js --check
```

---

### generate-run-category-pages.js

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

```bash
npm run generate:run-categories
```

**Run for a single game**

```bash
node scripts/generate-run-category-pages.js --game hades-2
```

**Run in check mode (no changes)**

```bash
npm run check:run-categories
```

---

## Shared Library (`lib/`)

All scripts share common utilities via the `lib/` folder to ensure consistency and reduce duplication.

### Structure

```
scripts/lib/
├── index.js                    # Re-exports all modules
├── parsers/
│   └── front-matter.js         # YAML front matter parsing
├── validators/
│   ├── constants.js            # Regex patterns and validation constants
│   └── field-validators.js     # Field validation functions
└── utils/
    └── file-utils.js           # File system utilities
```

### Usage in scripts

```javascript
// Import everything you need from lib
const {
  parseFrontMatter,
  mustSlug,
  isDir,
  ID_RE,
} = require('./lib');
```

### Available exports

**Parsers (`lib/parsers/front-matter.js`)**
- `parseFrontMatter(content)` - Parse YAML front matter from file content
- `extractFrontMatterData(content)` - Get just the data object (no body)
- `stripQuotes(value)` - Remove surrounding quotes from a string
- `parseScalar(value)` - Parse a scalar value handling booleans
- `asArray(value)` - Ensure a value is an array
- `loadYamlFile(path, readFn)` - Load and parse a YAML file

**Constants (`lib/validators/constants.js`)**
- `ID_RE` - Regex for kebab-case IDs
- `CATEGORY_SLUG_RE` - Regex for category slugs with nesting
- `DATE_RE` - Regex for YYYY-MM-DD dates
- `TIME_RE` - Regex for HH:MM:SS times
- `RUN_FILENAME_RE` - Regex for run filename pattern
- `STATUS_SET` - Set of valid status values
- `TIMING_SET` - Set of valid timing methods

**Field Validators (`lib/validators/field-validators.js`)**
- `mustSlug(fileRel, field, value)` - Validate kebab-case slug
- `mustString(fileRel, field, value)` - Validate non-empty string
- `mustArrayOfStrings(fileRel, field, value)` - Validate string array
- `mustTimeOrNull(fileRel, field, value)` - Validate time format
- `mustTimingOrNull(fileRel, field, value)` - Validate timing method
- `mustDate(fileRel, field, value)` - Validate date format
- `mustCategorySlug(fileRel, field, value)` - Validate category slug
- `mustStatus(fileRel, field, value)` - Validate status value
- `mustUrl(fileRel, field, value)` - Validate URL
- `mustBoolean(fileRel, field, value)` - Validate boolean
- `mustExist(fileRel, field, value)` - Validate required field
- `parseRunFilename(filename)` - Parse run filename components

**File Utils (`lib/utils/file-utils.js`)**
- `isDir(path)` - Check if path is a directory
- `isFile(path)` - Check if path is a file
- `listFilesRecursive(dir)` - List all files recursively
- `listMdFilesRecursive(dir)` - List markdown files (excluding README)
- `readText(path)` - Read file as text
- `writeText(path, content)` - Write text file (creates dirs)
- `ensureDir(dir)` - Create directory if needed
- `rel(path, root)` - Get relative path with forward slashes
- `fileExists(path)` - Check if file exists
- `writeFileIfChanged(path, content, checkOnly)` - Write only if changed

---

## Notes

- Scripts are intentionally small and single-purpose.
- Validation scripts never modify files.
- Generator and promotion scripts should be run intentionally and committed afterward.
- If CI fails, read the error message carefully. It usually tells you exactly which script to run.
- All scripts use the shared `lib/` folder for common functionality.

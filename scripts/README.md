# Scripts

This folder contains Node.js and Python scripts for automating site management.

## Script Overview

| Script | Purpose | Used By |
|--------|---------|---------|
| `validate-schema.js` | Validates all YAML files against schema | CI, `npm run validate` |
| `validate-runs.js` | Validates run files | CI, `npm run validate` |
| `check-banned-terms.js` | Content moderation (slurs, spam, malicious content) | CI, `npm run validate:terms` |
| `generate-game-pages.js` | Creates game sub-pages (runs, history, etc.) | `npm run generate` |
| `generate-run-category-pages.js` | Creates run category pages per game | `npm run generate` |
| `generate-runner-game-pages.js` | Creates per-runner game pages | `npm run generate` |
| `generate-form-index.js` | Builds `_data/form-index.json` for submission forms | `npm run generate` |
| `generate-codeowners.js` | Updates CODEOWNERS from game reviewers | `npm run generate` |
| `promote-runs.js` | Moves approved runs from queue to live | `npm run promote:runs` |
| `sync-runner-profiles.js` | Syncs runner profiles between Supabase and GitHub | `sync-runner-profiles.yml` workflow |
| `generate-game-file.py` | Creates game YAML from form data | `new-game-submission.yml` workflow |

## Usage

### Validation (Run First)

```bash
# Validate everything
npm run validate

# Individual checks
npm run validate:schema   # YAML schema validation
npm run validate:runs     # Run file validation
npm run validate:terms    # Banned terms check
```

### Generation (After Validation)

```bash
# Generate all pages
npm run generate

# Individual generators
npm run generate:game-pages
npm run generate:run-categories
npm run generate:runner-game-pages
npm run generate:form-index
npm run generate:codeowners
```

### Regenerate + Deploy

```bash
# Generate, commit, and push in one command
npm run regen

# Dry run (generate and show what changed, no commit)
npm run regen:dry
```

### Promotion (After Review)

```bash
# Dry run (see what would happen)
npm run promote:runs:dry

# Actually promote approved runs
npm run promote:runs
```

### Check Mode (CI)

Check mode validates generated files are current without writing:

```bash
npm run check:all
```

## Shared Libraries

The `lib/` folder contains shared utilities:

```
lib/
├── index.js              # Main exports
├── parsers/
│   └── front-matter.js   # YAML front matter parsing
├── utils/
│   └── file-utils.js     # File read/write helpers
└── validators/
    ├── constants.js      # Regex patterns, valid values
    └── field-validators.js # Field validation functions
```

## Adding a New Script

1. Create the script in `scripts/`
2. Use the shared utilities from `scripts/lib/`
3. Add an npm script to `package.json`
4. Update this README

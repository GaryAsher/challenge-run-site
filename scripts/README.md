# Scripts

This folder contains Node.js and Python scripts for automating site management.

## Script Overview

| Script | Purpose | Used By |
|--------|---------|---------|
| `validate-schema.js` | Validates all YAML files against schema | CI, `npm run validate` |
| `validate-runs.js` | Validates run files in queue | CI, `npm run validate` |
| `generate-game-pages.js` | Creates game sub-pages (runs, history, etc.) | `npm run generate` |
| `generate-run-category-pages.js` | Creates run category pages | `npm run generate` |
| `generate-codeowners.js` | Updates CODEOWNERS from game reviewers | `npm run generate` |
| `promote-runs.js` | Moves approved runs from queue to live | `npm run promote:runs` |
| `scaffold-game.js` | Manual tool to create new game files | Manual use |
| `generate-game-file.py` | Creates game YAML from form data | `new-game-submission.yml` workflow |

## Usage

### Validation (Run First)

```bash
# Validate everything
npm run validate

# Just schema
npm run validate:schema

# Just runs
npm run validate:runs
```

### Generation (After Validation)

```bash
# Generate all pages
npm run generate

# Individual generators
npm run generate:game-pages
npm run generate:run-categories
npm run generate:codeowners
```

### Promotion (After Review)

```bash
# Dry run (see what would happen)
npm run promote:runs:dry

# Actually promote
npm run promote:runs
```

### Check Mode (CI)

Check mode validates without writing files:

```bash
npm run check
```

## Adding a New Script

1. Create the script in `scripts/`
2. Use the shared utilities from `scripts/lib/`
3. Add to `package.json` scripts
4. Update this README

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

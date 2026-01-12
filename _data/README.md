# Data Files

This folder contains shared data used across the site and by automation scripts.

## Files

| File | Purpose | Used By |
|------|---------|---------|
| `challenges.yml` | Global challenge type definitions (No-Hit, Pacifist, etc.) | Game pages, runner profiles, search, run displays |
| `codeowners.yml` | Maps games to their maintainers/reviewers | `generate-codeowners.js` → `.github/CODEOWNERS` |
| `genres.yml` | Valid genre/tag values for games | Schema validation, game scaffolding |
| `platforms.yml` | Valid platform values (Steam, Switch, etc.) | Schema validation, game filtering, scaffolding |

## Adding New Entries

### New Challenge Type
1. Add entry to `challenges.yml`
2. Use the key as `challenge_id` in run files
3. Optionally add aliases for search

### New Genre/Platform
1. Add to `genres.yml` or `platforms.yml`
2. Games can now use it in their front matter
3. Validation will accept the new value

### New Game Reviewer
1. Add to `codeowners.yml` under the game's key
2. Run: `node scripts/generate-codeowners.js`
3. Commit both files

## Validation

All data files are validated by `scripts/validate-schema.js`:
```bash
node scripts/validate-schema.js
```
This checks that:
- Files exist and are valid YAML
- Required fields are present
- Games reference valid challenges/genres/platforms

## File Formats

### challenges.yml
```yaml
no-hit:
  label: "No-Hit"
  description: "Complete without taking damage"
  aliases:
    - "nohit"
    - "damageless"

pacifist:
  label: "Pacifist"
  description: "Complete without killing enemies"
```
The key (e.g., `no-hit`) is the `challenge_id` used in run files.

### codeowners.yml
```yaml
global:
  - "@username"

games:
  hades-2:
    - "@reviewer1"
    - "@reviewer2"
```
Run `node scripts/generate-codeowners.js` after editing to update `.github/CODEOWNERS`.

### genres.yml
```yaml
action:
  label: "Action"
  description: "Fast-paced gameplay"

roguelike:
  label: "Roguelike"
  description: "Permadeath, procedural generation"
```

### platforms.yml
```yaml
steam:
  label: "Steam"
  
playstation-5:
  label: "PlayStation 5"
```

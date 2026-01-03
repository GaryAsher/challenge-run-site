## CODEOWNERS workflow (do not edit by hand)

`.github/CODEOWNERS` is auto-generated.

**Source of truth**
- Global owners: `_data/codeowners.yml`
- Per-game reviewers: front matter in files under `_games/` using the `reviewers:` field

> Note:
> `.github/CODEOWNERS` must not be edited manually.
> It is regenerated from the sources above.

---

## Day-to-day workflow

### Add a new game

1) Create a new game file inside the `_games/` directory.

<!--
The filename must exactly match the game_id.
Do not use placeholder characters or angle brackets.
-->

Requirements:
- filename matches `game_id` (example: `hades-2.md`)
- `game_id` is lowercase kebab-case
- include `reviewers: []` in front matter
- avoid placeholder characters (Windows compatibility)

---

2) Run the generator script.

<!-- Always run this command from the repository root -->

    node scripts/generate-codeowners.js

This will:
- add a missing `reviewers: []` stub if needed
- regenerate `.github/CODEOWNERS`

---

3) Commit required files.

Commit:
- the new game file
- `.github/CODEOWNERS`

> CI will fail if `.github/CODEOWNERS` is out of sync with the generator output.

---

### Validate before pushing (optional)

<!--
This step is recommended but not required.
It does not modify any files.
-->

Before pushing, you may run:

    node scripts/validate-schema.js

This performs read-only validation and checks:
- tag and challenge IDs for correct format
- required fields in `_games/*.md`
- that `game_id` matches the filename
- that `reviewers:` exists in front matter
- duplicate YAML keys that would otherwise be silently overwritten

If validation fails, fix the reported issue before pushing.

---

## Automation notes

<!-- Informational only -->

- `scripts/generate-codeowners.js` is the only supported way to modify `.github/CODEOWNERS`
- `scripts/validate-schema.js` performs schema checks only
- Additional automation may be added later

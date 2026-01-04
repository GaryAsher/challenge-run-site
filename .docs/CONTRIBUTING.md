## Getting started

This guide covers the required steps for adding or updating content in this repository.

---

## ID and slug rules

Before adding new IDs (game IDs, runner IDs, challenge IDs, restriction IDs, category slugs), read:

    .docs/id-and-slug-spec.md

All scripts and validation are expected to follow that spec.
If the spec and a script disagree, update the script to match the spec.


## Adding a game

Create a new game file in the `_games/` folder.

<!--
The filename must exactly match the game_id.
Avoid placeholder characters or angle brackets.
-->

Things to check:
- filename matches `game_id` (example: `hades-2.md`)
- `game_id` follows the ID rules in `.docs/id-and-slug-spec.md`
- `reviewers: []` is present in front matter

---

## Update generated files

After adding or editing a game file, run:

    node scripts/generate-codeowners.js

This keeps `.github/CODEOWNERS` in sync with the repository data.

---

## Commit your changes

Commit:
- the game file you added or changed
- `.github/CODEOWNERS`

If these are out of sync, CI will fail.

---

## Optional checks before pushing

<!--
This step is recommended but not required.
It does not modify any files.
-->

You can run:

    node scripts/validate-schema.js

This checks:
- ID format for tags and challenges
- required fields in game files
- filename and `game_id` consistency
- presence of `reviewers:`
- duplicate YAML keys

If something is flagged, fix it before pushing.

---

## Notes

- `.github/CODEOWNERS` is generated automatically and should not be edited by hand
- Validation scripts only check structure and do not write files
- Additional automation may be added later

## How ownership works

`.github/CODEOWNERS` is generated automatically.

It comes from:
- `_data/codeowners.yml` (global owners)
- `reviewers:` in game files under `_games/`

Please don’t edit `.github/CODEOWNERS` directly.  
It is regenerated from these sources.

---

## Adding a game

Create a new game file in the `_games/` folder.

<!--
The filename must exactly match the game_id.
Avoid placeholder characters or angle brackets.
-->

Things to check:
- filename matches `game_id` (example: `hades-2.md`)
- `game_id` is lowercase kebab-case
- `reviewers: []` is present in front matter

---

Update ownership info by running:

    node scripts/generate-codeowners.js

This keeps `.github/CODEOWNERS` in sync.

---

Commit:
- the new game file
- `.github/CODEOWNERS`

(If they don’t match, CI will fail.)

---

## Optional checks before pushing

<!--
This step is helpful but not required.
It does not modify any files.
-->

You can run:

    node scripts/validate-schema.js

This checks:
- ID formats for tags and challenges
- required fields in game files
- filename and `game_id` consistency
- presence of `reviewers:`
- duplicate YAML keys

Fix any issues before pushing if something is flagged.

---

## A note on automation

<!-- Informational only -->

- `scripts/generate-codeowners.js` is the only way to update `.github/CODEOWNERS`
- `scripts/validate-schema.js` only validates and does not write files
- More automation may be added later

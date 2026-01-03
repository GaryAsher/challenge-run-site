## CODEOWNERS generation workflow (do not edit by hand)

`.github/CODEOWNERS` is auto-generated.

Source of truth:
- Global repo owners: `_data/codeowners.yml` (or your chosen filename)
- Per-game reviewers: front matter in `_games/*.md` under `reviewers:`

When adding a new game:
1. Create `_games/<game>.md` with `game_id: <game-id>`
2. Run `node scripts/generate-codeowners.js`
   - Adds `reviewers: []` if missing
   - Regenerates `.github/CODEOWNERS`
3. Commit both the game file and `.github/CODEOWNERS`

CI will fail if `.github/CODEOWNERS` does not match the generator output.

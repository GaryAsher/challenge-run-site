# Contributing

How to add and edit content in Challenge Run Central.

## Before You Start

Read [STRUCTURE.md](STRUCTURE.md) for naming rules and folder layout.

---

## Adding a Game

1. Create `_games/{game-id}.md` (filename must match `game_id`)
2. Include required fields: `game_id`, `name`, `reviewers`
3. Run: `node scripts/generate-codeowners.js`
4. Commit both the game file and `.github/CODEOWNERS`

---

## Adding a Run

1. Create file in `_runs/` with format: `YYYY-MM-DD__game-id__runner-id__category__NN.md`
2. Include required fields: `game_id`, `runner_id`, `category_slug`, `date_completed`

---

## Validation

Before pushing, run:

```bash
npm run validate
```

This checks ID formats, required fields, and file consistency.

---

## Generated Files

These files are auto-generated. Do not edit directly:
- `.github/CODEOWNERS` → Run `npm run generate:codeowners`
- `games/` folder → Run `npm run generate:game-pages`

If CI fails saying files are out of sync, run the appropriate generate command.

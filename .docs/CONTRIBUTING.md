# Contributing

How to add and edit content in Challenge Run Community.

---

## Before You Start

- Read [STRUCTURE.md](STRUCTURE.md) for naming rules and folder layout
- Read [ARCHITECTURE.md](ARCHITECTURE.md) for technical overview
- Ensure you have Node.js 20+ installed

---

## Quick Reference

| Task | Command |
|------|---------|
| Validate all data | `npm run validate` |
| Regenerate pages | `npm run generate` |
| Regenerate and push | `npm run regen` |
| Check specific game | `npm run diagnose:game -- game-id` |

---

## Adding a Game (via Form)

The preferred method is through the Google Form, which automatically:
1. Creates a PR with the game file
2. Runs validation
3. Notifies moderators

## Adding a Game (Manual)

1. Create `_games/{game-id}.md` (filename must match `game_id`)
2. Include required fields:
   ```yaml
   ---
   layout: game
   game_id: your-game-id
   name: "Game Name"
   reviewers: []
   platforms: []
   categories_data:
     - slug: any
       label: "Any%"
   ---
   ```
3. Run: `npm run generate`
4. Commit all changes

---

## Adding a Run (via Form)

Submit through the game's "Submit a Run" button, which:
1. Creates a file in `_queue_runs/`
2. Awaits moderator review
3. Gets promoted to `_runs/` when approved

## Adding a Run (Manual)

1. Create file in `_runs/{game-id}/` with format:
   ```
   YYYY-MM-DD__{game-id}__{runner-id}__{category-slug}__{NN}.md
   ```
2. Include required fields:
   ```yaml
   ---
   game_id: game-id
   runner_id: runner-id
   runner: "Display Name"
   category_slug: any
   date_completed: 2025-01-13
   challenge_id: deathless
   video_link: "https://youtube.com/..."
   ---
   ```

---

## Adding a News Post

1. Create file in `_posts/` with format:
   ```
   YYYY-MM-DD-title-slug.md
   ```
2. Include frontmatter:
   ```yaml
   ---
   layout: post
   title: "Your Post Title"
   date: 2025-01-13
   categories: [announcement]
   game_id: optional-game-id  # Links to related game
   ---
   
   Your content here in Markdown.
   ```

### Post Categories
- `announcement` - General announcements
- `new-game` - New game added
- `rule-change` - Rule updates
- `milestone` - Community milestones
- `feature` - New site features

---

## Validation

Before pushing, always run:

```bash
npm run validate
```

This checks:
- ID formats (lowercase, hyphens only)
- Required fields present
- File naming consistency
- Banned terms
- YAML syntax

---

## Generated Files

These files are auto-generated. **Do not edit directly:**

| File/Folder | Regenerate With |
|-------------|-----------------|
| `games/**/*.html` | `npm run generate:game-pages` |
| `.github/CODEOWNERS` | `npm run generate:codeowners` |

If CI fails saying files are out of sync:
```bash
npm run generate
git add -A
git commit -m "chore: Regenerate pages"
git push
```

---

## Common Issues

### "Schema validation failed"
- Check required fields are present
- Ensure IDs use lowercase and hyphens only
- Verify YAML syntax (proper indentation)

### "Banned term detected"
- Remove or rephrase flagged content
- Check `_data/banned-terms.yml` for what's blocked

### "Generated pages out of date"
- Run `npm run generate`
- Commit the updated files

### "Game not found"
- Ensure `game_id` matches filename exactly
- Check file is in `_games/` not `_queue_games/`

---

## Getting Help

- Check other docs in `.docs/`
- Open a GitHub issue
- Ask in Discord

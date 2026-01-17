# Games

Each file in this folder defines a game tracked by Challenge Run Central.

## Adding a New Game

1. Copy a template from `_templates/game-template.md`
2. Name the file `{game-id}.md` (e.g., `hades-2.md`)
3. Fill in the required fields
4. Run `npm run generate:codeowners` to update reviewers

## Required Fields

```yaml
game_id: hades-2        # Must match filename
game_name: "Hades II"        # Display name
reviewers: []           # GitHub usernames who can approve runs
```

## File Naming

The filename must exactly match the `game_id` field:
- File: `hades-2.md`
- Field: `game_id: hades-2`

See `.docs/STRUCTURE.md` for naming rules.

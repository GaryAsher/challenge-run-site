# Games

Each file in this folder defines a game tracked by Challenge Run Community.

## Adding a New Game

Games are now submitted through the site at [challengerun.net/submit/](https://www.challengerun.net/submit/). When approved by an admin, the Worker automatically creates the game file in this directory via the GitHub API.

For manual additions (developers only):
1. Copy a template from `_templates/game-template.md`
2. Name the file `{game-id}.md` (e.g., `hades-2.md`)
3. Fill in the required fields
4. Run `npm run generate` to create game pages

## Required Fields

```yaml
game_id: hades-2          # Must match filename (lowercase, hyphens only)
game_name: "Hades II"     # Display name
layout: game
status: "Active"
reviewers: []              # GitHub usernames who can approve runs
```

## File Naming

- Lowercase, hyphens only: `hollow-knight.md`, `tiny-rogues.md`
- Modded games: `{base-game}-modded.md` (e.g., `hollow-knight-modded.md`)
- Must match the `game_id` in front matter

## Credits

The `credits` field links contributors to their runner profiles. Always include `runner_id` so the contribution appears on the runner's profile page:

```yaml
credits:
  - name: "Gary_Asher"
    runner_id: gary-asher       # Must match the runner's _runners/{id}.md filename
    role: "Category and rule definitions"
  - name: "ExternalPerson"
    role: "Rule consultation"   # No runner_id if they don't have a CRC profile
    url: "https://example.com"
```

The `runner_id` field is what links the credit to the runner's profile. Without it, the contribution won't appear in their Contributions tab.

## Key Sections

Each game file defines:
- **General rules** — apply to all runs for this game
- **Challenges data** — challenge types (Hitless, Damageless, etc.)
- **Full runs** — categories that require reaching an ending
- **Mini-challenges** — in-game challenges without requiring an ending
- **Restrictions** — optional modifiers (e.g., Companions Only)
- **Characters** — if the game has selectable characters/classes
- **Community achievements** — special accomplishments to track

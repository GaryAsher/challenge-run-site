# Run Submission Queue

This directory is reserved for pending run submissions before they are accepted into `_runs/`.

## Folder naming rule (important)

Each subfolder **must exactly match the `game_id`** defined in the corresponding
`_games/<game>.md` file.

Examples:
- `_games/hades-2.md` → `game_id: hades-2`
- Queue folder: `_queue_runs/hades-2/`

This naming is relied on by automation, reviewer routing, and CODEOWNERS generation.
Do not deviate from it.

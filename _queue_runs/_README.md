# Run Submission Queue

This folder is reserved for pending run submissions before they are accepted into `_runs/`.

## Folder naming rule (important)

When a game uses the queue, create a subfolder that **exactly matches the `game_id`**
from `_games/<game>.md`.

Examples:
- `_games/hades-2.md` has `game_id: hades-2`
  - queue folder must be: `_queue_runs/hades-2/`

This naming is relied on for consistent reviewer routing and automation.

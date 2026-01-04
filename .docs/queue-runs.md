# Run Submission Queue

The run submission queue is a temporary holding area for pending run submissions
before they are reviewed and promoted into `_runs/`.

This system is intentionally strict and automation-driven.

---

## Queue folder rules (important)

- `_queue_runs/` must contain **only run submission files**
- No documentation, notes, or templates belong in this folder
- Validation will fail if non-run files are present

GitHub Actions and local validators enforce this behavior.

---

## Folder naming rule

Each subfolder **must exactly match the `game_id`** defined in the corresponding
`_games/<game>.md` file.

Examples:

- `_games/hades-2.md` → `game_id: hades-2`
- Queue folder: `_queue_runs/hades-2/`

This naming is relied on by:

- Automation
- Reviewer routing
- CODEOWNERS generation

Do not deviate from it.

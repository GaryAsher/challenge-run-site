# Runs

Approved challenge run records.

## File Format

`{date}__{game-id}__{runner-id}__{category}__{NN}.md`

Example: `2025-01-15__hades-2__speedster__any-percent__01.md`

## Scalability

Currently, all runs are in a flat folder. For tens of thousands of runs, consider:

1. **Subfolder by game**: `_runs/hades-2/`, `_runs/hollow-knight/`
2. **Subfolder by year**: `_runs/2025/`, `_runs/2026/`
3. **Combined**: `_runs/hades-2/2025/`

The current flat structure works fine for hundreds of runs but may need reorganization as the site grows.

## Templates

See `_templates/run-template.md` for the file format.

## Rejected Runs

The `rejected/` subfolder contains runs that were not approved. These are kept for reference.

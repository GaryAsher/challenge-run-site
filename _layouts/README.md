# Layouts

Jekyll page templates that wrap content.

## Files

| Layout | Purpose | Used By |
|--------|---------|---------|
| `default.html` | Base template for all pages. Includes header, footer, and loads CSS/JS. | Everything |
| `game.html` | Game overview page (main landing page for each game) | `_games/*.md` |
| `game-runs.html` | Runs listing with filters and search | `games/*/runs/` pages |
| `runner.html` | Runner profile page | `_runners/*.md` |

## How Layouts Work

Pages specify their layout in front matter:

```yaml
---
layout: game-runs
title: Hades II Runs
game_id: hades-2
---
```

The layout wraps the page content and provides:
- Common HTML structure
- Header/footer includes
- Game-specific navigation tabs
- Filtering/search functionality (for runs)

## Layout Hierarchy

```
default.html (base)
├── game.html
├── game-runs.html
└── runner.html
```

All layouts extend `default.html` which provides the `<html>`, `<head>`, and `<body>` structure.

## Editing Layouts

Changes to layouts affect all pages using them. Test thoroughly before committing.

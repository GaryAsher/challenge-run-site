# Challenge Run Central - Repository Structure

This document explains how the repository is organized and where to find things.

## Quick Navigation

| I want to... | Go to... |
|--------------|----------|
| Add a new game | Submit via [Google Form](link) or create PR in `_queue_games/` |
| Submit a run | Use [GitHub Issue](../../issues/new?template=run-submission.yml) |
| Request a game change | Use [Game Change Request](../../issues/new?template=game-change-request.yml) |
| Understand the code | Read this document and check `scripts/README.md` |
| Add myself as a runner | Create PR in `_runners/` |

---

## Directory Structure

```
challenge-run-site/
├── 📁 _data/                    # Global data files (YAML)
│   ├── challenges.yml           # Standard challenge type definitions
│   ├── platforms.yml            # Platform definitions (steam, switch, etc.)
│   ├── genres.yml                 # Tag/genre definitions
│   └── games-index.yml          # Auto-generated games index
│
├── 📁 _games/                   # Active game definitions
│   ├── _TEMPLATES/              # Templates for creating games
│   ├── hades-2.md               # Example: Hades II game file
│   └── README.md                # How to create/edit game files
│
├── 📁 _queue_games/             # Pending game submissions (awaiting review)
│   └── *.md                     # Games submitted via form, not yet approved
│
├── 📁 _runners/                 # Runner profiles
│   ├── _TEMPLATE.md             # Template for runner profiles
│   └── *.md                     # Individual runner files
│
├── 📁 _runs/                    # Submitted runs
│   ├── _TEMPLATES/              # Run submission template
│   ├── rejected/                # Rejected runs (kept for record)
│   └── *.md                     # Approved run files
│
├── 📁 _queue_runs/              # Pending run submissions
│   └── *.md                     # Runs awaiting verification
│
├── 📁 _layouts/                 # Jekyll page layouts
│   ├── game.html                # Game overview page
│   ├── game-runs.html           # Game runs listing
│   └── *.html                   # Other layouts
│
├── 📁 _includes/                # Reusable HTML components
│   ├── header.html              # Site header
│   ├── footer.html              # Site footer
│   └── game-header-tabs.html    # Game page navigation tabs
│
├── 📁 assets/                   # Static assets
│   ├── img/games/               # Game cover images (organized by first letter)
│   ├── img/runners/             # Runner profile images
│   ├── js/                      # JavaScript files
│   └── style.css                # Main stylesheet
│
├── 📁 games/                    # Generated game pages (DO NOT EDIT MANUALLY)
│   └── {game-id}/               # Auto-generated from _games/*.md
│       ├── runs/                # Run category pages
│       ├── history/             # History page
│       ├── resources/           # Resources page
│       └── ...                  # Other tab pages
│
├── 📁 scripts/                  # Build and automation scripts
│   ├── README.md                # Script documentation
│   ├── generate-game-file.py    # Creates game files from form data
│   ├── generate-game-pages.js   # Generates game subpages
│   ├── generate-run-category-pages.js
│   ├── promote-runs.js          # Moves runs from queue to active
│   └── validate-*.js            # Validation scripts
│
├── 📁 .github/                  # GitHub configuration
│   ├── workflows/               # GitHub Actions workflows
│   │   ├── new-game-submission.yml    # Handles form submissions
│   │   ├── promote-game.yml           # Moves games to active
│   │   ├── check-duplicate-game.yml   # Detects duplicate submissions
│   │   ├── process-run-submission.yml # Handles run submissions
│   │   └── ...
│   └── ISSUE_TEMPLATE/          # Issue templates
│       ├── run-submission.yml   # Submit a run
│       ├── game-change-request.yml    # Request game changes
│       └── runner-profile.yml   # Create runner profile
│
└── 📁 .docs/                    # Internal documentation
    ├── CONTRIBUTING.md          # How to contribute
    ├── NEW-GAME-FORM-SPEC.md    # Form field specifications
    └── ...
```

---

## Key Concepts

### Game Lifecycle

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Google Form    │────▶│  _queue_games/  │────▶│    _games/      │
│  Submission     │     │  (PR Created)   │     │  (Active)       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │                        │
                              ▼                        ▼
                        Moderator Review         generate-game-pages.js
                        Add genres/platforms       Creates games/{id}/
                        Upload cover image
```

### Run Lifecycle

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Issue Form     │────▶│  _queue_runs/   │────▶│    _runs/       │
│  Submission     │     │  (Pending)      │     │  (Verified)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
                        Moderator Verification
                        Check video proof
                        Validate time
```

---

## Data Files Explained

### `_data/challenges.yml`
Defines **site-wide** challenge types that can be used by any game:
```yaml
hitless:
  label: Hitless
  aliases:
    - No-Hit
    - No Hit
```

### `_games/{game-id}.md`
Defines a game with its categories, challenges, and configuration. See `_games/_TEMPLATES/` for the full schema.

Key fields:
- `challenges`: List of standard challenge slugs (from challenges.yml)
- `community_challenges`: Game-specific challenges defined inline
- `categories_data`: Category structure with optional subcategories
- `version_tracking` / `dlc_tracking`: Optional version/DLC filtering

### `_runs/{filename}.md`
Individual run submissions with:
- Runner, game, category, challenge type
- Time, video proof, date
- Optional: version, DLC, character/weapon

---

## Scripts

All scripts are in `scripts/` with their own README.

| Script | Purpose |
|--------|---------|
| `generate-game-file.py` | Creates game markdown from form submission |
| `generate-game-pages.js` | Creates `games/{id}/` page structure |
| `generate-run-category-pages.js` | Creates run listing pages per category |
| `validate-schema.js` | Validates game file structure |
| `validate-runs.js` | Validates run submissions |
| `promote-runs.js` | Moves verified runs from queue |

---

## GitHub Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `new-game-submission.yml` | Form webhook | Creates PR with new game |
| `promote-game.yml` | PR merge | Moves game to `_games/`, generates pages |
| `check-duplicate-game.yml` | PR open | Warns if game already exists |
| `process-run-submission.yml` | Issue labeled | Creates run file from issue |
| `promote-approved-runs.yml` | Issue closed | Moves verified runs to `_runs/` |

---

## Making Changes

### Adding a Standard Challenge Type
1. Edit `_data/challenges.yml`
2. Add the new challenge with label and aliases
3. Games can now reference it in their `challenges` list

### Adding a Game-Specific Challenge
Edit the game's markdown file and add to `community_challenges`:
```yaml
community_challenges:
  - slug: my-challenge
    label: "My Challenge"
    description: "What this challenge requires"
```

### Updating a Game's Categories
1. Create a [Game Change Request](../../issues/new?template=game-change-request.yml)
2. Or edit `_games/{game-id}.md` directly and submit PR

---

## Need Help?

- **Discord**: [Join our server](link)
- **Issues**: [Open an issue](../../issues)
- **Contributing**: See `.docs/CONTRIBUTING.md`

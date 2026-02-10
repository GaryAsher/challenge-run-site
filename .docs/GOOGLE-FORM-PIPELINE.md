# Google Form → GitHub Pipeline

How new games get submitted and published on Challenge Run Central.

## Overview

```
Google Form  →  Apps Script  →  GitHub API (repository_dispatch)
  → new-game-submission.yml     creates PR with _queue_games/<id>.md
    → hydrate-new-game-pr.yml   auto-fires on PR, promotes + generates pages
      → Reviewer merges PR  →   game is live
```

## Step-by-Step Flow

### 1. User Submits Google Form

The form collects:

| Field | Required | Example |
|---|---|---|
| Game Name | ✅ | "Hades II" |
| Full Run Categories | ✅ | "Underworld (Any%)\nSurface (Any%)" (newline-separated) |
| Challenge Types | ✅ | "hitless, damageless, no-hit-no-damage" (comma-separated) |
| Character Column | ❌ | "true" / "false" |
| Character Label | ❌ | "Weapon / Aspect" |
| Is Modded | ❌ | "true" / "false" |
| Base Game ID | ❌ | "hades-2" (required if modded) |
| Submitter Discord | ❌ | "username" |
| Credit Requested | ❌ | "true" / "false" |

### 2. Apps Script Sends `repository_dispatch` to GitHub

A Google Apps Script bound to the form fires on submission:

```javascript
// Apps Script (Extensions → Apps Script in the Google Form)
function onFormSubmit(e) {
  var responses = e.namedValues;
  
  var payload = {
    event_type: "new-game-submission",
    client_payload: {
      game_name: responses["Game Name"][0],
      full_run_categories: responses["Full Run Categories"][0],
      challenges: responses["Challenge Types"][0],
      character_column: responses["Character Column"][0] || "false",
      character_label: responses["Character Label"][0] || "Character",
      is_modded: responses["Is Modded"][0] || "false",
      base_game: responses["Base Game ID"][0] || "",
      submitter_handle: responses["Discord Handle"][0] || "",
      credit_requested: responses["Credit Requested"][0] || "false"
    }
  };
  
  var token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  
  UrlFetchApp.fetch(
    "https://api.github.com/repos/OWNER/REPO/dispatches",
    {
      method: "post",
      headers: {
        "Authorization": "Bearer " + token,
        "Accept": "application/vnd.github+json"
      },
      contentType: "application/json",
      payload: JSON.stringify(payload)
    }
  );
}
```

**GitHub Token:** Stored as a Script Property in Apps Script (`GITHUB_TOKEN`). Needs `repo` scope.

### 3. `new-game-submission.yml` Creates a PR

**Trigger:** `repository_dispatch` type `new-game-submission` (or manual `workflow_dispatch`)

What it does:
1. Runs `scripts/generate-game-file.py` with form data as env vars
2. Creates `_queue_games/<game-id>.md` with full front matter
3. Opens a PR on a `new-game/<id>-<run-id>` branch
4. Sends a Discord notification (if webhook configured)

### 4. `hydrate-new-game-pr.yml` Generates Pages

**Trigger:** PR opened/updated with changes in `_queue_games/*.md`

What it does:
1. Moves `_queue_games/<id>.md` → `_games/<id>.md`
2. Strips the `status:` field and reviewer notes
3. Runs page generators:
   - `scripts/generate-game-pages.js --game <id>` → `games/<id>/` directory
   - `scripts/generate-run-category-pages.js --game <id>` → run submission pages
   - `scripts/generate-codeowners.js` → updates CODEOWNERS
4. Commits generated files back to the PR branch
5. Leaves a comment listing what was generated

### 5. `check-form-index.yml` Keeps Form Index Current

**Trigger:** PR changes to `_games/**`, `_data/**`, or `assets/generated/form-index.json`

Regenerates `assets/generated/form-index.json` (used by run submission forms for game/category lookups).

### 6. Reviewer Merges PR

Checklist before merge:
- [ ] Game info in `_games/<id>.md` looks correct
- [ ] Add genre tags (not captured by the form)
- [ ] Upload cover image: `assets/img/games/<first-letter>/<id>.jpg`
- [ ] Configure mini-challenge allowed challenges if needed
- [ ] Merge → game goes live on next Jekyll build

## Replicating for a New Repository

### Required GitHub Secrets

| Secret | Purpose |
|---|---|
| `GITHUB_TOKEN` | Default, used by PR creation |
| `DISCORD_NEW_GAME_SUBMISSION` | Discord webhook URL for notifications (optional) |

### Required Scripts (all in `scripts/`)

| Script | Purpose |
|---|---|
| `generate-game-file.py` | Creates `_queue_games/<id>.md` from env vars |
| `generate-game-pages.js` | Generates `games/<id>/` directory structure |
| `generate-run-category-pages.js` | Generates run submission pages per category |
| `generate-codeowners.js` | Updates `.github/CODEOWNERS` |
| `generate-form-index.js` | Builds `assets/generated/form-index.json` |

### Required Directories

- `_queue_games/` — Staging area for submitted games (excluded from Jekyll build)
- `_games/` — Published games
- `games/` — Generated game pages

### Google Form Setup

1. Create a Google Form with the fields listed in Step 1
2. Open Apps Script editor (Extensions → Apps Script)
3. Add the `onFormSubmit` function from Step 2
4. Store your GitHub PAT as a Script Property: `GITHUB_TOKEN` (needs `repo` scope)
5. Set up trigger: Triggers → Add Trigger → `onFormSubmit` → On form submit

### Manual Submission (No Google Form)

Go to Actions → "Process New Game Submission" → "Run workflow" → fill in fields.

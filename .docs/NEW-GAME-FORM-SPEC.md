# Google Form: New Game Submission

This document specifies the Google Form fields for submitting new games to CRC.

## Form URL
(Create form at https://docs.google.com/forms and link here)

---

## Section 1: Basic Information

### Game Name (Required)
- **Type**: Short answer
- **Maps to**: `name`
- **Validation**: Required
- **Example**: "Super Mario 64"

### Game ID / Slug (Optional)
- **Type**: Short answer
- **Maps to**: `game_id`
- **Help text**: "Lowercase, hyphens only. Leave blank to auto-generate from name."
- **Validation**: Regex `^[a-z0-9-]+$` (if provided)
- **Example**: "super-mario-64"

### Cover Image
- **Type**: File upload OR Short answer (URL)
- **Maps to**: `cover`
- **Help text**: "Upload a cover image (JPG/PNG, 16:9 ratio preferred) or paste a URL"
- **Example**: "https://example.com/sm64-cover.jpg"

---

## Section 2: Game Metadata

### Tags (Required)
- **Type**: Checkboxes
- **Maps to**: `tags`
- **Options**:
  - [ ] Action
  - [ ] Adventure
  - [ ] Fighting
  - [ ] Hack and Slash
  - [ ] Horror
  - [ ] Metroidvania
  - [ ] Mythology
  - [ ] Platformer
  - [ ] Puzzle
  - [ ] Racing
  - [ ] Rhythm
  - [ ] Roguelike
  - [ ] Roguelite
  - [ ] RPG
  - [ ] Shooter
  - [ ] Simulation
  - [ ] Souls-like
  - [ ] Sports
  - [ ] Stealth
  - [ ] Strategy
  - [ ] Survival
  - [ ] Other (please specify)

### Primary Timing Method
- **Type**: Dropdown
- **Maps to**: Default `timing_method_primary` for runs
- **Options**:
  - RTA (Real Time Attack)
  - IGT (In-Game Time)
  - LRT (Load-Removed Time)

---

## Section 3: Categories

### Main Categories (Required)
- **Type**: Long answer
- **Maps to**: `categories_data`
- **Help text**: "List the main run categories, one per line. Example:\nAny%\n100%\nLow%"
- **Example**:
  ```
  Any%
  100%
  16 Star
  70 Star
  120 Star
  ```

### Does this game have subcategories?
- **Type**: Multiple choice
- **Options**: Yes / No

### Subcategories (Conditional - if Yes above)
- **Type**: Long answer
- **Maps to**: `subcategories` or nested `categories_data`
- **Help text**: "List subcategories that can apply to any main category"
- **Example**:
  ```
  No Major Glitches
  Glitchless
  BLJ Allowed
  ```

---

## Section 4: Challenge Types

### Supported Challenge Types (Required)
- **Type**: Checkboxes
- **Maps to**: `challenges`
- **Options**:
  - [ ] Hitless (no damage taken)
  - [ ] Damageless (no damage dealt or taken)
  - [ ] No-Hit No-Damage (combined)
  - [ ] Deathless (no deaths)
  - [ ] Pacifist (no killing)
  - [ ] Blindfolded
  - [ ] One-Handed
  - [ ] Other (please specify)

### Custom Challenge Types
- **Type**: Long answer (optional)
- **Help text**: "Describe any game-specific challenge types not listed above"

---

## Section 5: Display Options

### Enable Character/Weapon/Class Column?
- **Type**: Multiple choice
- **Maps to**: `character_column.enabled`
- **Options**: Yes / No
- **Help text**: "For games where runs are categorized by character, weapon, or class"

### Column Label (Conditional - if Yes above)
- **Type**: Short answer
- **Maps to**: `character_column.label`
- **Help text**: "What should the column be called? (e.g., 'Character', 'Weapon', 'Class')"
- **Default**: "Character"

### Which tabs should be enabled?
- **Type**: Checkboxes
- **Maps to**: `tabs`
- **Options**:
  - [x] Overview (always on)
  - [x] Runs (always on)
  - [ ] History
  - [ ] Challenges
  - [ ] Guides
  - [ ] Resources
  - [ ] Rules
  - [ ] Forum

---

## Section 6: Contact Information

### Your Email (Required)
- **Type**: Email
- **Help text**: "We'll contact you if we have questions"
- **Validation**: Email format

### Discord Username (Optional)
- **Type**: Short answer
- **Help text**: "For faster communication"

### Are you willing to be a game moderator?
- **Type**: Multiple choice
- **Options**: Yes / No / Maybe
- **Help text**: "Moderators help verify runs for their game"

### Additional Notes
- **Type**: Long answer (optional)
- **Help text**: "Anything else we should know about this game?"

---

## Form Response → YAML Mapping

When a form is submitted, it should generate a file like:

```yaml
---
layout: game
game_id: {auto-generated or from form}
name: "{Game Name}"
status: "Pending review"
tags:
  - {selected tags}
cover: /assets/img/games/{first-letter}/{game_id}.jpg

tabs:
  overview: true
  runs: true
  history: {from form}
  challenges: {from form}
  guides: {from form}
  resources: {from form}
  rules: {from form}
  forum: {from form}

character_column:
  enabled: {from form}
  label: "{from form or 'Character'}"

challenges:
  - {selected challenge IDs}

categories_data:
  - slug: {auto-generated}
    label: "{category name}"
    # children if subcategories provided
---
```

---

## Processing Workflow

1. **Form Submitted** → Google Sheets logs response
2. **Webhook/Zapier** → Triggers GitHub Action
3. **GitHub Action** →
   - Creates `_queue_games/{game_id}.md` file
   - Opens a Pull Request for review
4. **Moderator Reviews** →
   - Checks game info
   - Uploads cover image
   - Merges PR
5. **Site Rebuilds** → Game appears on site

---

## Implementation Notes

### Auto-generating game_id
```javascript
function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
```

### Cover Image Handling
- If URL provided: Download and save to `assets/img/games/{letter}/{game_id}.jpg`
- If file uploaded: Process and resize to standard dimensions
- Recommended: 1280x720 (16:9) or 800x450

### Validation Checks
- [ ] Game ID doesn't already exist
- [ ] At least one category provided
- [ ] At least one challenge type selected
- [ ] Cover image is valid

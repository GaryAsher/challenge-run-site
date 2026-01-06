# Google Form: New Game Submission

This document specifies the Google Form fields for submitting new games to CRC.

---

## Section 1: Game Identity

### 1. Full Game Name (Required)
- **Type**: Short answer
- **Maps to**: `name`
- **Help text**: "The complete official name of the game"
- **Example**: "Sekiro: Shadows Die Twice"

### 2. Short Names / Aliases
- **Type**: Short answer
- **Maps to**: `name_aliases`
- **Help text**: "Common abbreviations or nicknames, separated by commas"
- **Example**: "Sekiro, SDT"
- **Another example**: "DS1, DSR" (for Dark Souls: Remastered)

---

## Section 2: Game Classification

### 3. Tags (Required, Max 5)
- **Type**: Checkboxes (max 5 selections)
- **Maps to**: `tags`
- **Help text**: "Select up to 5 tags that best describe this game. Use Steam's top tags as reference."
- **Options**:
  - [ ] Action
  - [ ] Adventure
  - [ ] Fighting
  - [ ] Hack and Slash
  - [ ] Horror
  - [ ] Metroidvania
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
  - [ ] Stealth
  - [ ] Strategy
  - [ ] Survival

---

## Section 3: Run Categories

### 4. Main Category 1 (Required)
- **Type**: Short answer
- **Maps to**: `categories_data[0]`
- **Help text**: "Primary speedrun category (e.g., Any%, 100%, All Bosses)"
- **Example**: "Any%"

### 5. Main Category 2
- **Type**: Short answer
- **Maps to**: `categories_data[1]`
- **Example**: "All Bosses"

### 6. Main Category 3
- **Type**: Short answer
- **Maps to**: `categories_data[2]`
- **Example**: "All Skills"

### 7. Main Category 4
- **Type**: Short answer
- **Maps to**: `categories_data[3]`
- **Example**: "All Mini-Bosses"

### 8. Main Category 5
- **Type**: Short answer
- **Maps to**: `categories_data[4]`

### 9. Do any categories have sub-categories?
- **Type**: Multiple choice
- **Options**: Yes / No
- **Help text**: "Example: 'Any%' might have sub-categories like 'Glitchless' and 'No Major Glitches'"

### 10. Sub-categories (if applicable)
- **Type**: Paragraph
- **Help text**: "List parent → child relationships, one per line. Example:\nAny% → Glitchless\nAny% → No Major Glitches\n100% → All Achievements"

---

## Section 4: Character/Weapon/Class Column

### 11. Does this game categorize runs by character, weapon, or class?
- **Type**: Multiple choice
- **Maps to**: `character_column.enabled`
- **Options**: Yes / No
- **Help text**: "Enable this if runners typically specify a character, weapon, or build for their runs"

### 12. Column Label (if Yes above)
- **Type**: Short answer
- **Maps to**: `character_column.label`
- **Help text**: "What should this column be called? (e.g., 'Character', 'Weapon', 'Class', 'Build')"
- **Default**: "Character"

### 13. Character/Weapon Options
- **Type**: Paragraph
- **Help text**: "List the available options, one per line. Example:\nKnight\nWarrior\nMage\nThief"

---

## Section 5: Game-Specific Restrictions

### 14. What game-specific restrictions exist?
- **Type**: Paragraph
- **Maps to**: Custom restrictions list
- **Help text**: "List restrictions unique to this game, one per line. These are modifiers that make runs harder.\n\nExamples:\n- No Leveling\n- Base Vitality Only\n- No Healing Items\n- Permadeath\n- No Fast Travel"

---

## Section 6: Timing Methods

### 15. Primary Timing Method
- **Type**: Dropdown
- **Maps to**: `timing_method_primary` default
- **Help text**: "How are runs primarily timed for this game?"
- **Options**:
  - RTA (Real Time Attack) - Wall clock time
  - IGT (In-Game Time) - Game's internal timer
  - LRT (Load-Removed Time) - RTA minus loading screens

### 16. Secondary Timing Method (Optional)
- **Type**: Dropdown
- **Maps to**: `timing_method_secondary` default
- **Help text**: "Is there a secondary timing method commonly used?"
- **Options**:
  - None
  - RTA (Real Time Attack)
  - IGT (In-Game Time)
  - LRT (Load-Removed Time)

---

## Section 7: Challenge Types

### 17. What challenge types apply to this game? (Required)
- **Type**: Checkboxes
- **Maps to**: `challenges`
- **Help text**: "Select all challenge types that are relevant for this game"
- **Options**:
  - [ ] Hitless - Complete without taking any hits
  - [ ] Damageless - Complete without taking or dealing damage
  - [ ] No-Hit No-Damage - Combined hitless and damageless
  - [ ] Deathless - Complete without dying
  - [ ] Pacifist - Complete without killing
  - [ ] No Upgrade - Complete without upgrading character/equipment
  - [ ] Blindfolded - Complete while blindfolded
  - [ ] One-Handed - Complete using only one hand
  - [ ] Other (please specify below)

### 18. Other Challenge Types
- **Type**: Short answer
- **Help text**: "If you selected 'Other', describe any game-specific challenge types"
- **Example**: "No Kuro's Charm, Bell Demon"

---

## Section 8: Contact Information

### 19. Your Email (Required)
- **Type**: Email
- **Help text**: "We'll contact you if we have questions about this submission"
- **Validation**: Email format

### 20. Discord Username (Optional)
- **Type**: Short answer
- **Help text**: "Your Discord username for faster communication (e.g., username#1234 or just username)"

### 21. Are you willing to help moderate this game?
- **Type**: Multiple choice
- **Options**: Yes / No / Maybe
- **Help text**: "Moderators help verify runs and maintain game information"

---

## Section 9: Feedback

### 22. Additional Notes
- **Type**: Paragraph
- **Help text**: "Anything else we should know about this game? Any feedback on this form?"

### 23. How did you hear about CRC?
- **Type**: Short answer (optional)

---

## Form Response → YAML Mapping

When a form is submitted, it generates a file like this:

```yaml
---
layout: game
game_id: sekiro-shadows-die-twice
reviewers: []
name: "Sekiro: Shadows Die Twice"
name_aliases:
  - "Sekiro"
  - "SDT"
status: "Pending review"
tags:
  - action
  - souls-like
  - hack-and-slash
cover: /assets/img/games/s/sekiro-shadows-die-twice.jpg
cover_position: center

tabs:
  overview: true
  runs: true
  history: true
  challenges: true
  guides: true
  resources: true
  rules: true
  forum: false

character_column:
  enabled: false
  label: "Character"

challenges:
  - hitless
  - damageless
  - no-hit-no-damage
  - deathless

categories_data:
  - slug: any-percent
    label: "Any%"
  - slug: all-bosses
    label: "All Bosses"
  - slug: all-skills
    label: "All Skills"
  - slug: all-mini-bosses
    label: "All Mini-Bosses"

# Custom fields from form
default_timing_primary: "IGT"
default_timing_secondary: "RTA"

game_restrictions:
  - "No Kuro's Charm"
  - "Bell Demon"
  - "No Leveling"
  - "Base Vitality"
---

Submitted by: example@email.com
Discord: username#1234
Willing to moderate: Yes
```

---

## Column Mapping Reference

| Form Column | YAML Field |
|-------------|------------|
| A | Timestamp |
| B | name |
| C | name_aliases (comma-separated → array) |
| D | tags (checkboxes → array) |
| E | categories_data[0].label |
| F | categories_data[1].label |
| G | categories_data[2].label |
| H | categories_data[3].label |
| I | categories_data[4].label |
| J | has_subcategories (Yes/No) |
| K | subcategories_raw |
| L | character_column.enabled |
| M | character_column.label |
| N | character_options |
| O | game_restrictions |
| P | timing_method_primary |
| Q | timing_method_secondary |
| R | challenges (checkboxes → array) |
| S | other_challenges |
| T | submitter_email |
| U | discord_username |
| V | willing_to_moderate |
| W | additional_notes |
| X | referral_source |

---

## Google Apps Script (Updated)

```javascript
function onFormSubmit(e) {
  const row = e.values;
  
  // Column indices (adjust based on your actual form)
  const COL = {
    TIMESTAMP: 0,
    GAME_NAME: 1,
    NAME_ALIASES: 2,
    TAGS: 3,
    CATEGORY_1: 4,
    CATEGORY_2: 5,
    CATEGORY_3: 6,
    CATEGORY_4: 7,
    CATEGORY_5: 8,
    HAS_SUBCATS: 9,
    SUBCATS_RAW: 10,
    CHAR_ENABLED: 11,
    CHAR_LABEL: 12,
    CHAR_OPTIONS: 13,
    RESTRICTIONS: 14,
    TIMING_PRIMARY: 15,
    TIMING_SECONDARY: 16,
    CHALLENGES: 17,
    OTHER_CHALLENGES: 18,
    EMAIL: 19,
    DISCORD: 20,
    MODERATE: 21,
    NOTES: 22,
    REFERRAL: 23
  };
  
  const gameName = row[COL.GAME_NAME];
  const gameId = gameName.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  
  // Build categories array
  const categories = [];
  for (let i = COL.CATEGORY_1; i <= COL.CATEGORY_5; i++) {
    if (row[i] && row[i].trim()) {
      categories.push(row[i].trim());
    }
  }
  
  const payload = {
    event_type: 'new-game-submission',
    client_payload: {
      game_name: gameName,
      game_id: gameId,
      name_aliases: row[COL.NAME_ALIASES] || '',
      tags: row[COL.TAGS] || '',
      categories: categories.join(','),
      has_subcategories: row[COL.HAS_SUBCATS] === 'Yes',
      subcategories_raw: row[COL.SUBCATS_RAW] || '',
      character_enabled: row[COL.CHAR_ENABLED] === 'Yes' ? 'true' : 'false',
      character_label: row[COL.CHAR_LABEL] || 'Character',
      character_options: row[COL.CHAR_OPTIONS] || '',
      restrictions: row[COL.RESTRICTIONS] || '',
      timing_primary: row[COL.TIMING_PRIMARY] || 'RTA',
      timing_secondary: row[COL.TIMING_SECONDARY] || '',
      challenges: row[COL.CHALLENGES] || '',
      other_challenges: row[COL.OTHER_CHALLENGES] || '',
      submitter_email: row[COL.EMAIL],
      discord: row[COL.DISCORD] || '',
      willing_to_moderate: row[COL.MODERATE] || '',
      notes: row[COL.NOTES] || ''
    }
  };
  
  const githubToken = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  const repo = 'GaryAsher/challenge-run-site';
  
  const options = {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + githubToken,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(
      'https://api.github.com/repos/' + repo + '/dispatches',
      options
    );
    Logger.log('GitHub dispatch: ' + response.getResponseCode());
  } catch (error) {
    Logger.log('Error: ' + error.message);
  }
}
```

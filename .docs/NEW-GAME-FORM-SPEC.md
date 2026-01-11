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

---

## Section 2: Game Classification

### 3. Genres (Required, Max 5)
- **Type**: Checkboxes (max 5 selections)
- **Maps to**: `genres`
- **Help text**: "Select up to 5 genre tags that best describe this game. Reference Steam's top genre tags."
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

### 4-8. Main Categories (5 fields)
- **Type**: Short answer (5 separate fields)
- **Maps to**: `categories_data[0-4]`
- **Help text**: "Primary speedrun categories (e.g., Any%, 100%, All Bosses)"
- **Field 1 Required**, Fields 2-5 Optional

### 9. Do any categories have sub-categories?
- **Type**: Multiple choice (Yes / No)

### 10. Sub-categories (if applicable)
- **Type**: Paragraph
- **Help text**: "List parent → child relationships. Example:\nAny% → Glitchless\nAny% → No Major Glitches"

---

## Section 4: Glitches & Exploits

### 11. What glitch categories exist for this game?
- **Type**: Checkboxes
- **Maps to**: `glitch_categories`
- **Help text**: "Select all glitch-related category modifiers that apply"
- **Options**:
  - [ ] Any% (glitches allowed)
  - [ ] Glitchless (no glitches)
  - [ ] No Major Glitches (NMG)
  - [ ] No Out of Bounds (No OoB)
  - [ ] No Wrong Warp
  - [ ] No Sequence Break
  - [ ] Other (please specify)

### 12. Notable Glitches/Exploits
- **Type**: Paragraph
- **Maps to**: `notable_glitches`
- **Help text**: "List major glitches or exploits specific to this game, one per line. Example:\nBLJ (Backwards Long Jump)\nWrong Warp\nDuplication Glitch"

### 13. Which glitches are typically banned in 'Glitchless' runs?
- **Type**: Paragraph
- **Help text**: "List glitches commonly banned in glitchless categories. This helps define category rules."

---

## Section 5: Character/Weapon/Class Column

### 14. Does this game categorize runs by character, weapon, or class?
- **Type**: Multiple choice (Yes / No)
- **Maps to**: `character_column.enabled`

### 15. Column Label (if Yes)
- **Type**: Short answer
- **Maps to**: `character_column.label`
- **Help text**: "What should this column be called? (e.g., 'Character', 'Weapon', 'Class')"

### 16. Character/Weapon Options
- **Type**: Paragraph
- **Help text**: "List the available options, one per line"

---

## Section 6: Game-Specific Restrictions

### 17. What game-specific restrictions exist?
- **Type**: Paragraph
- **Maps to**: `game_restrictions`
- **Help text**: "List restrictions unique to this game, one per line.\n\nExamples:\n- No Leveling\n- Base Vitality Only\n- No Healing Items\n- Permadeath"

---

## Section 7: Timing Methods

### 18. Primary Timing Method
- **Type**: Dropdown
- **Maps to**: `timing_method_primary`
- **Options**:
  - RTA (Real Time Attack)
  - IGT (In-Game Time)
  - LRT (Load-Removed Time)

### 19. Secondary Timing Method (Optional)
- **Type**: Dropdown
- **Maps to**: `timing_method_secondary`
- **Options**:
  - None
  - RTA
  - IGT
  - LRT

---

## Section 8: Challenge Types

### 20. What challenge types apply to this game? (Required)
- **Type**: Checkboxes
- **Maps to**: `challenges`
- **Options**:
  - [ ] Hitless
  - [ ] Damageless
  - [ ] No-Hit No-Damage
  - [ ] Deathless
  - [ ] Pacifist
  - [ ] No Upgrade
  - [ ] Blindfolded
  - [ ] One-Handed
  - [ ] Other (please specify)

### 21. Other Challenge Types
- **Type**: Short answer
- **Help text**: "If you selected 'Other', describe game-specific challenges"

---

## Section 9: Contact Information

### 22. Your Email (Required)
- **Type**: Email

### 23. Discord Username (Optional)
- **Type**: Short answer
- **Help text**: "For faster communication"

### 24. Are you willing to help moderate this game?
- **Type**: Multiple choice (Yes / No / Maybe)

---

## Section 10: Feedback

### 25. Additional Notes
- **Type**: Paragraph
- **Help text**: "Anything else we should know about this game?"

### 26. Feedback on this form
- **Type**: Paragraph
- **Help text**: "How can we improve this submission process?"

---

## Column Mapping Reference (Google Sheet)

| Column | Form Field | YAML Field |
|--------|------------|------------|
| A | Timestamp | - |
| B | Full Game Name | `name` |
| C | Short Names | `name_aliases` |
| D | Genres | `genres` |
| E | Category 1 | `categories_data[0]` |
| F | Category 2 | `categories_data[1]` |
| G | Category 3 | `categories_data[2]` |
| H | Category 4 | `categories_data[3]` |
| I | Category 5 | `categories_data[4]` |
| J | Has Subcategories | - |
| K | Subcategories | - |
| L | Glitch Categories | `glitch_categories` |
| M | Notable Glitches | `notable_glitches` |
| N | Glitchless Bans | - |
| O | Character Enabled | `character_column.enabled` |
| P | Character Label | `character_column.label` |
| Q | Character Options | - |
| R | Restrictions | `game_restrictions` |
| S | Primary Timing | `timing_method_primary` |
| T | Secondary Timing | `timing_method_secondary` |
| U | Challenges | `challenges` |
| V | Other Challenges | - |
| W | Email | - |
| X | Discord | - |
| Y | Moderate | - |
| Z | Notes | - |
| AA | Feedback | - |

---

## Google Apps Script

```javascript
function onFormSubmit(e) {
  var row = e.values;
  
  // Column indices (adjust to match YOUR form)
  var COL = {
    TIMESTAMP: 0,
    GAME_NAME: 1,
    NAME_ALIASES: 2,
    GENRES: 3,
    CAT_1: 4, CAT_2: 5, CAT_3: 6, CAT_4: 7, CAT_5: 8,
    HAS_SUBCATS: 9,
    SUBCATS: 10,
    GLITCH_CATS: 11,
    NOTABLE_GLITCHES: 12,
    GLITCHLESS_BANS: 13,
    CHAR_ENABLED: 14,
    CHAR_LABEL: 15,
    CHAR_OPTIONS: 16,
    RESTRICTIONS: 17,
    TIMING_PRIMARY: 18,
    TIMING_SECONDARY: 19,
    CHALLENGES: 20,
    OTHER_CHALLENGES: 21,
    EMAIL: 22,
    DISCORD: 23,
    MODERATE: 24,
    NOTES: 25,
    FEEDBACK: 26
  };
  
  var gameName = row[COL.GAME_NAME];
  var gameId = gameName.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  var categories = [
    row[COL.CAT_1], row[COL.CAT_2], row[COL.CAT_3], 
    row[COL.CAT_4], row[COL.CAT_5]
  ].filter(function(c) { return c && c.trim(); }).join(',');
  
  var payload = {
    event_type: 'new-game-submission',
    client_payload: {
      game_name: gameName,
      game_id: gameId,
      name_aliases: row[COL.NAME_ALIASES] || '',
      genres: row[COL.GENRES] || '',
      categories: categories,
      glitch_categories: row[COL.GLITCH_CATS] || '',
      notable_glitches: row[COL.NOTABLE_GLITCHES] || '',
      character_enabled: row[COL.CHAR_ENABLED] === 'Yes' ? 'true' : 'false',
      character_label: row[COL.CHAR_LABEL] || 'Character',
      restrictions: row[COL.RESTRICTIONS] || '',
      timing_primary: row[COL.TIMING_PRIMARY] || 'RTA',
      timing_secondary: row[COL.TIMING_SECONDARY] || '',
      challenges: row[COL.CHALLENGES] || '',
      submitter_email: row[COL.EMAIL],
      discord: row[COL.DISCORD] || ''
    }
  };
  
  var token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) {
    Logger.log('ERROR: GITHUB_TOKEN not set');
    return;
  }
  
  var options = {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    var response = UrlFetchApp.fetch(
      'https://api.github.com/repos/GaryAsher/challenge-run-site/dispatches',
      options
    );
    Logger.log('Response: ' + response.getResponseCode());
  } catch (error) {
    Logger.log('Error: ' + error.message);
  }
}
```

# Google Forms Setup Guide

This document explains how to create and configure Google Forms for CRC submissions.

## Run Submission Form (Hades II)

### Create the Form

1. Go to [Google Forms](https://forms.google.com)
2. Create a new form titled "CRC Run Submission - Hades II"
3. Add the following questions:

### Form Questions

#### Section 1: Runner Information
| Question | Type | Required | Options/Validation |
|----------|------|----------|-------------------|
| Runner Name | Short answer | Yes | - |
| Runner ID | Short answer | No | Help text: "Leave blank if first submission" |

#### Section 2: Run Details
| Question | Type | Required | Options |
|----------|------|----------|---------|
| Category | Dropdown | Yes | Trial of Origin, Trial of Salt, Trial of Humility, Trial of Vengeance, Trial of Moon, Trial of Vigor, Trial of Flame, Trial of Gold, Trial of Fury, Trial of Precarity, Trial of Heartache, Trial of Haste, Trial of Blood, Trial of Doom, Trial of Destiny, Underworld Any%, Surface Any%, Underworld VoR4, Surface VoR4 |
| Challenge Type | Dropdown | Yes | Hitless, Damageless, No Hit / No Damage |
| Weapon / Aspect | Short answer | Yes | - |
| Glitch Rules | Dropdown | Yes | Unrestricted, No Major Glitches, Glitchless |
| Restrictions | Checkboxes | No | God Only, Boonless, Arcanaless, Other (please specify) |
| Other Restrictions | Short answer | No | - |

### After Creating

1. Click the "Send" button
2. Copy the form link
3. Replace `YOUR_GOOGLE_FORM_ID_HERE` in `/games/hades-2/submit/index.html` with the form ID from the URL

---

## Game Request Form

### Create the Form

1. Go to [Google Forms](https://forms.google.com)
2. Create a new form titled "CRC Game Request"
3. Add the following questions:

### Form Questions

#### Section 1: Game Information
| Question | Type | Required |
|----------|------|----------|
| Game Name | Short answer | Yes |
| Alternative Names | Short answer | No |
| Platforms | Checkboxes | Yes |
| Genre/Tags | Checkboxes | Yes |

Platform options:
- PC: Steam
- PC: Epic Games Store
- PC: GOG
- Nintendo Switch
- Nintendo Switch 2
- PlayStation
- Xbox
- iOS
- Android
- Other

Genre options:
- Action
- Adventure
- RPG
- Roguelike
- Roguelite
- Metroidvania
- Platformer
- Souls-like
- Hack and Slash
- Shooter
- Other

#### Section 2: Challenge Run Information
| Question | Type | Required |
|----------|------|----------|
| Challenge Types | Checkboxes | Yes |
| Other Challenge Types | Short answer | No |
| Run Categories | Paragraph | Yes |
| Timing Method | Dropdown | Yes |

Challenge Type options:
- Hitless
- Damageless
- No Hit / No Damage
- Deathless
- Other

Timing Method options:
- IGT (In-Game Time)
- RTA (Real Time Attack)
- LRT (Loadless Real Time)
- Other

#### Section 3: Your Information
| Question | Type | Required |
|----------|------|----------|
| Your Name | Short answer | Yes |
| Contact (Discord/Email) | Short answer | No |
| Additional Notes | Paragraph | No |

### After Creating

1. Click the "Send" button
2. Copy the form link
3. Replace `YOUR_GAME_FORM_ID_HERE` in `/submit/index.html` with the form ID from the URL

---

## Responses

### Viewing Responses

1. Open the form in edit mode
2. Click the "Responses" tab
3. Click the Google Sheets icon to create a linked spreadsheet

### Processing Submissions

For run submissions, moderators should:
1. Review the video evidence
2. Verify timing and category claims
3. Create a new run file in `_runs/` using the provided data
4. Mark the form response as processed

For game requests, moderators should:
1. Evaluate if the game meets criteria
2. Create a JSON file with the game data
3. Run `node scripts/scaffold-game.js path/to/game.json`
4. Review generated files and commit

---

## Embedding Forms (Alternative)

If you prefer embedded forms instead of linking:

```html
<iframe 
  src="https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform?embedded=true" 
  width="100%" 
  height="800" 
  frameborder="0" 
  marginheight="0" 
  marginwidth="0">
  Loading…
</iframe>
```

Replace `YOUR_FORM_ID` with the actual form ID.

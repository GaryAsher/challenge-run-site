# Google Form to GitHub Integration

This guide explains how to connect your Google Form to automatically create GitHub Issues.

---

## Overview

```
User fills Google Form
        ↓
Google Apps Script triggers on submission
        ↓
Script creates GitHub Issue via API
        ↓
Issue appears in repository with "run-submission" label
        ↓
Moderator reviews (same flow as before)
```

---

## Setup Steps

### Step 1: Create Your Google Form

Create a Google Form with these fields (must match exactly):

| Field Name | Type | Required |
|------------|------|----------|
| Game | Dropdown | Yes |
| Game (if not listed) | Short text | No |
| Runner Name | Short text | Yes |
| Runner ID | Short text | Yes |
| Contact | Short text | No |
| Category | Dropdown | Yes |
| Category (if not listed) | Short text | No |
| Category Display Name | Short text | Yes |
| Challenge Type | Dropdown | Yes |
| Challenge Type (if not listed) | Short text | No |
| Video Link | Short text | Yes |
| Date Completed | Date | Yes |
| Run Time | Short text | No |
| Timing Method | Dropdown | No |
| Restrictions | Paragraph | No |
| Additional Notes | Paragraph | No |

**Important Settings:**
- In Form Settings → Responses → Collect email addresses (optional but recommended)
- Add response validation for Video Link: "Text" → "Contains" → "http"

### Step 2: Create a GitHub Personal Access Token

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click **Generate new token (classic)**
3. Name: `Google Form Integration`
4. Expiration: No expiration (or set a reminder)
5. Scopes: Check `repo` (full control of private repositories)
6. Click **Generate token**
7. **COPY THE TOKEN NOW** - you won't see it again!

### Step 3: Add the Google Apps Script

1. Open your Google Form
2. Click the **⋮** menu → **Script editor**
3. Delete any existing code
4. Paste the script below
5. Update the configuration variables
6. Save (Ctrl+S / Cmd+S)

### Step 4: Set Up the Trigger

1. In the script editor, click **Triggers** (clock icon on left)
2. Click **+ Add Trigger**
3. Configure:
   - Function: `onFormSubmit`
   - Event source: `From form`
   - Event type: `On form submit`
4. Click **Save**
5. Authorize when prompted

---

## The Script

Copy this entire script into your Google Apps Script editor:

```javascript
/**
 * Google Form to GitHub Issue Integration
 * 
 * This script creates a GitHub Issue when someone submits the run submission form.
 * 
 * SETUP:
 * 1. Update CONFIG below with your values
 * 2. Create a trigger: Edit → Triggers → Add → onFormSubmit, From form, On form submit
 * 3. Authorize the script when prompted
 */

// ============================================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================================
const CONFIG = {
  // GitHub repository details
  GITHUB_OWNER: 'GaryAsher',           // Your GitHub username or org
  GITHUB_REPO: 'challenge-run-site',    // Repository name
  
  // GitHub Personal Access Token (keep secret!)
  // Create at: GitHub → Settings → Developer settings → Personal access tokens
  GITHUB_TOKEN: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  
  // Labels to add to created issues
  LABELS: ['run-submission', 'pending-review', 'from-google-form'],
};

// ============================================================
// FIELD MAPPING - Update if your form fields have different names
// ============================================================
const FIELD_MAP = {
  game: 'Game',
  gameOther: 'Game (if not listed)',
  runner: 'Runner Name',
  runnerId: 'Runner ID',
  contact: 'Contact',
  category: 'Category',
  categoryOther: 'Category (if not listed)',
  categoryLabel: 'Category Display Name',
  challenge: 'Challenge Type',
  challengeOther: 'Challenge Type (if not listed)',
  videoLink: 'Video Link',
  dateCompleted: 'Date Completed',
  time: 'Run Time',
  timingMethod: 'Timing Method',
  restrictions: 'Restrictions',
  notes: 'Additional Notes',
};

// ============================================================
// MAIN FUNCTION - Called when form is submitted
// ============================================================
function onFormSubmit(e) {
  try {
    const responses = e.namedValues;
    
    // Extract values (handle array responses from Google Forms)
    const getValue = (fieldName) => {
      const mapped = FIELD_MAP[fieldName];
      const value = responses[mapped];
      return value && value[0] ? value[0].trim() : '';
    };
    
    // Get all form values
    let game = getValue('game');
    const gameOther = getValue('gameOther');
    if (game === 'OTHER (specify below)' && gameOther) {
      game = gameOther;
    }
    
    const runner = getValue('runner');
    const runnerId = getValue('runnerId');
    const contact = getValue('contact');
    
    let category = getValue('category');
    const categoryOther = getValue('categoryOther');
    if (category === 'OTHER (specify below)' && categoryOther) {
      category = categoryOther;
    }
    const categoryLabel = getValue('categoryLabel');
    
    let challenge = getValue('challenge');
    const challengeOther = getValue('challengeOther');
    if (challenge === 'OTHER (specify below)' && challengeOther) {
      challenge = challengeOther;
    }
    
    const videoLink = getValue('videoLink');
    const dateCompleted = getValue('dateCompleted');
    const time = getValue('time');
    const timingMethod = getValue('timingMethod');
    const restrictions = getValue('restrictions');
    const notes = getValue('notes');
    
    // Build issue title
    const title = `[RUN] ${game} - ${categoryLabel} - ${runner}`;
    
    // Build issue body (matches GitHub Issue template format)
    let body = `## Run Submission (via Google Form)

### Game

${game}

### Game (if not listed)

${gameOther || '_No response_'}

### Runner Name (Display)

${runner}

### Runner ID

${runnerId}

### Contact (Optional)

${contact || '_No response_'}

### Category

${category}

### Category (if not listed)

${categoryOther || '_No response_'}

### Category Display Name

${categoryLabel}

### Challenge Type

${challenge}

### Challenge Type (if not listed)

${challengeOther || '_No response_'}

### Video Link

${videoLink}

### Date Completed

${dateCompleted}

### Run Time (Optional)

${time || '_No response_'}

### Timing Method

${timingMethod || '_No response_'}

### Restrictions / Modifiers (Optional)

${restrictions || '_No response_'}

### Additional Notes (Optional)

${notes || '_No response_'}

### Confirmation

- [X] This video shows my own gameplay
- [X] The video is publicly accessible (not private/unlisted)
- [X] I understand my run will be reviewed by moderators

---
*Submitted via Google Form*`;

    // Create GitHub Issue
    const issueUrl = createGitHubIssue(title, body);
    
    // Log success
    console.log(`Created issue: ${issueUrl}`);
    
    // Optional: Send confirmation email
    // sendConfirmationEmail(e.namedValues['Email Address'][0], issueUrl);
    
  } catch (error) {
    console.error('Error processing form submission:', error);
    // Optional: Send error notification
    // sendErrorNotification(error);
  }
}

// ============================================================
// GITHUB API FUNCTION
// ============================================================
function createGitHubIssue(title, body) {
  const url = `https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/issues`;
  
  const payload = {
    title: title,
    body: body,
    labels: CONFIG.LABELS,
  };
  
  const options = {
    method: 'POST',
    contentType: 'application/json',
    headers: {
      'Authorization': `token ${CONFIG.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Google-Apps-Script',
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const responseBody = JSON.parse(response.getContentText());
  
  if (responseCode !== 201) {
    throw new Error(`GitHub API error: ${responseCode} - ${responseBody.message}`);
  }
  
  return responseBody.html_url;
}

// ============================================================
// OPTIONAL: CONFIRMATION EMAIL
// ============================================================
function sendConfirmationEmail(email, issueUrl) {
  if (!email) return;
  
  const subject = 'Run Submission Received - Challenge Run Community';
  const body = `Thank you for your submission!

Your run has been submitted for review. You can track its status here:
${issueUrl}

A moderator will review your submission within 48 hours.

If you have questions, please reply to this email or join our Discord.

- Challenge Run Community`;

  GmailApp.sendEmail(email, subject, body);
}

// ============================================================
// OPTIONAL: ERROR NOTIFICATION
// ============================================================
function sendErrorNotification(error) {
  const adminEmail = 'your-email@example.com'; // Update this
  const subject = '[CRC] Form Submission Error';
  const body = `An error occurred processing a form submission:

${error.toString()}

Please check the script logs for details.`;

  GmailApp.sendEmail(adminEmail, subject, body);
}

// ============================================================
// TEST FUNCTION - Run this manually to test
// ============================================================
function testCreateIssue() {
  const testTitle = '[TEST] Test Issue - Please Delete';
  const testBody = `This is a test issue created by the Google Apps Script.

Please delete this issue.

### Game
test-game

### Runner
Test Runner`;

  try {
    const url = createGitHubIssue(testTitle, testBody);
    console.log(`Test issue created: ${url}`);
  } catch (error) {
    console.error(`Test failed: ${error}`);
  }
}
```

---

## Testing

### Test the GitHub Connection

1. In the script editor, select `testCreateIssue` from the function dropdown
2. Click **Run**
3. Check your GitHub repository for a test issue
4. Delete the test issue

### Test the Full Flow

1. Submit a test response to your Google Form
2. Check that an issue appears in GitHub
3. Test the moderation flow (`/approve`, `/confirm`)
4. Verify the PR is created correctly

---

## Troubleshooting

### "Authorization required"

1. Run any function manually first
2. Click "Review Permissions" when prompted
3. Choose your Google account
4. Click "Advanced" → "Go to [script name]"
5. Allow permissions

### "GitHub API error: 401"

Your token is invalid or expired:
1. Create a new token on GitHub
2. Update `GITHUB_TOKEN` in the script
3. Make sure you selected the `repo` scope

### "GitHub API error: 404"

Repository not found:
1. Check `GITHUB_OWNER` and `GITHUB_REPO` are correct
2. Make sure the token has access to the repository
3. If private repo, token needs `repo` scope

### "Trigger not firing"

1. Check Triggers page in script editor
2. Make sure trigger is set to "On form submit"
3. Check Executions page for errors

### Form fields not mapping correctly

1. Check that your form field names match `FIELD_MAP`
2. Form questions must match exactly (including capitalization)
3. Use `console.log(JSON.stringify(e.namedValues))` to debug

---

## Security Notes

### Protect Your Token

- Never share your GitHub token
- Don't commit it to version control
- Regenerate if compromised

### Script Access

- Only form owners can see the script
- Consider using a service account for production

### Rate Limits

- GitHub API: 5000 requests/hour with token
- Google Forms: ~20,000 submissions/day
- You won't hit these limits with normal usage

---

## Alternative: Zapier/Make

If you prefer no-code:

1. **Zapier**: Google Forms → GitHub (Create Issue)
2. **Make (Integromat)**: Google Forms → GitHub

These cost money for high volume but are easier to set up.

---

## Support

If you have issues:
1. Check the Executions log in Apps Script
2. Test with `testCreateIssue()` function
3. Ask in the CRC Discord
4. Open an issue on GitHub

# Moderator Guide

This guide explains how to review and process run submissions on Challenge Run Community.

---

## Table of Contents

- [Overview](#overview)
- [Getting Notifications](#getting-notifications)
- [Reviewing a Submission](#reviewing-a-submission)
- [Making a Decision](#making-a-decision)
- [Commands Reference](#commands-reference)
- [Common Scenarios](#common-scenarios)
- [Troubleshooting](#troubleshooting)

---

## Overview

When a user submits a run (via Google Form or GitHub Issue), you'll need to:

1. **Review** the submission (watch video, check details)
2. **Decide** to approve, reject, or flag for community review
3. **Confirm** your decision
4. **Merge** the generated PR (if approved)

The entire process happens in GitHub Issues and takes about 2-5 minutes per submission.

---

## Getting Notifications

### Option 1: Watch the Repository

1. Go to the repository on GitHub
2. Click **Watch** → **Custom** → Check **Issues**
3. You'll get emails for new issues

### Option 2: GitHub Mobile App

1. Install GitHub mobile app
2. Enable notifications for this repository
3. Get push notifications for new submissions

### Option 3: Discord Integration (if set up)

New submissions will post to the `#run-submissions` channel.

---

## Reviewing a Submission

When you open a run submission issue, you'll see:

```
### Game
hades-2

### Runner Name (Display)
Gary Asher

### Runner ID
gary-asher

### Category
underworld-any

### Challenge Type
hitless

### Video Link
https://www.youtube.com/watch?v=xxxxx

### Date Completed
2025-01-04

...
```

### Review Checklist

- [ ] **Video is accessible** - Can you watch it? (not private/deleted)
- [ ] **Video matches claim** - Does it show the claimed challenge?
- [ ] **Runner info is reasonable** - Name/ID look legitimate?
- [ ] **Category exists** - Is this a valid category for the game?
- [ ] **No obvious issues** - Anything suspicious?

### What You're NOT Checking (Usually)

Unless the game requires community verification:

- You don't need to watch the entire run
- You don't need to verify every hit/damage instance
- You don't need to be an expert in this game

Your job is to make sure:
1. The submission is legitimate (not spam/trolling)
2. The video exists and is public
3. The data makes sense

---

## Making a Decision

### To Approve

```
/approve
```

Then when prompted:

```
/confirm
```

This will:
- Create a run file in `_queue_runs/`
- Create a runner profile if it doesn't exist
- Open a PR for validation
- You'll need to merge the PR after checks pass

### To Reject

```
/reject Video is private
```

Then when prompted:

```
/confirm
```

This will:
- Close the issue
- Add a rejection comment with your reason

**Always provide a reason** so the user knows what went wrong.

### To Flag for Community Review

Use this when:
- The game has strict verification rules
- You're unsure and want another opinion
- The run is exceptional and needs expert eyes

```
/review
```

Then:

```
/confirm
```

This will:
- Keep the issue open
- Add a "needs-community-review" label
- Notify community moderators

### To Cancel a Decision

If you change your mind after adding a label but before confirming:

```
/cancel
```

This removes all decision labels and returns to pending state.

---

## Commands Reference

| Command | Description |
|---------|-------------|
| `/approve` | Start approval process |
| `/reject [reason]` | Start rejection process |
| `/review` | Flag for community review |
| `/confirm` | Confirm pending decision |
| `/confirm [reason]` | Confirm rejection with reason |
| `/cancel` | Cancel pending decision |

### Labels (Automatic)

| Label | Meaning |
|-------|---------|
| `run-submission` | This is a run submission |
| `pending-review` | Waiting for moderator review |
| `approved` | Marked for approval |
| `rejected` | Marked for rejection |
| `needs-community-review` | Needs expert review |
| `awaiting-confirmation` | Decision made, needs `/confirm` |
| `pr-created` | PR has been created |

---

## Common Scenarios

### Scenario 1: Simple Approval

1. Open issue
2. Watch 30 seconds of video to confirm it's real
3. Type `/approve`
4. Type `/confirm`
5. Wait for PR, click "Merge"
6. Done!

### Scenario 2: Video is Private/Deleted

1. Open issue
2. Video link doesn't work
3. Type `/reject Video is not accessible. Please resubmit with a public video link.`
4. Type `/confirm`
5. Done!

### Scenario 3: Suspicious Submission

1. Open issue
2. Something seems off (fake name, impossible time, etc.)
3. Type `/review`
4. Type `/confirm`
5. Comment explaining your concerns
6. Wait for community moderator

### Scenario 4: User Made a Typo

If minor typo in non-critical field:
- Approve anyway, can fix later

If critical error (wrong game, wrong category):
- Reject with: `/reject Incorrect [field]. Please resubmit.`

### Scenario 5: New Game Not in System

If someone submits for a game that doesn't exist:

1. Reject with: `/reject This game is not yet in our system. Please request it be added first.`
2. Or approve if you want to add the game (runner file will be created, you'll need to add the game file)

---

## Troubleshooting

### PR Validation Failed

If the PR fails validation checks:

1. Look at the error message
2. Common issues:
   - Invalid date format → User entered wrong format
   - Unknown game_id → Game doesn't exist in `_games/`
   - Unknown challenge_id → Challenge not in `_data/challenges.yml`

3. Options:
   - Close the PR and reject the issue
   - Fix the file manually and push

### I Made a Mistake

See [FIXING-MISTAKES.md](./FIXING-MISTAKES.md) for detailed recovery procedures.

Quick fixes:

| Mistake | Fix |
|---------|-----|
| Approved wrong run | Close the PR without merging |
| Rejected valid run | Ask user to resubmit |
| Merged bad data | Create a fix PR or revert |

### User is Spamming

1. Close and lock the issue
2. Consider blocking the user
3. Report to repository owner

### Bot Isn't Responding

1. Check if you have write access
2. Check GitHub Actions status (might be down)
3. Try again in a few minutes
4. Manual fallback: Create the files yourself

---

## Best Practices

1. **Be kind** - Users put effort into their runs
2. **Be clear** - Explain rejections clearly
3. **Be quick** - Try to review within 48 hours
4. **Be consistent** - Follow the same standards
5. **Ask for help** - Use `/review` when unsure

---

## Questions?

- Ask in the moderator Discord channel
- Open an issue with the `question` label
- Contact @GaryAsher directly

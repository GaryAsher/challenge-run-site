# Fixing Mistakes

Things go wrong. Here's how to fix them.

---

## Table of Contents

- [Quick Reference](#quick-reference)
- [Before Anything is Merged](#before-anything-is-merged)
- [After a PR is Merged](#after-a-pr-is-merged)
- [Data Corrections](#data-corrections)
- [Recovering Deleted Files](#recovering-deleted-files)
- [Common Mistakes](#common-mistakes)

---

## Quick Reference

| Situation | Solution |
|-----------|----------|
| Wrong decision, PR not merged | Close the PR |
| Wrong decision, PR merged | Create revert PR or fix PR |
| Typo in run data | Edit the file, create PR |
| Wrong runner ID | Cannot change (create new, delete old) |
| Duplicate submission | Delete one, keep the other |
| Spam merged accidentally | Revert the commit |

---

## Before Anything is Merged

### Cancel a Decision

If you used `/approve` or `/reject` but haven't confirmed:

```
/cancel
```

This removes all labels and returns to pending.

### Close a PR Without Merging

1. Go to the PR
2. Click **Close pull request** (not merge!)
3. Go to the original issue
4. Either re-review or reject properly

### Edit a PR Before Merging

1. Go to the PR
2. Click on **Files changed**
3. Click the **...** menu on the file
4. Click **Edit file**
5. Make your changes
6. Commit to the PR branch

---

## After a PR is Merged

### Option 1: Create a Fix PR

For minor corrections (typos, wrong dates, etc.):

1. Go to the file on GitHub
2. Click the pencil icon (Edit)
3. Make your changes
4. Click **Propose changes**
5. Create the PR and merge it

### Option 2: Revert the Commit

For completely wrong data (spam, wrong person, etc.):

1. Go to the merge commit
2. Click **Revert**
3. Create the revert PR
4. Merge it

**Note:** Reverting removes the files completely.

### Option 3: Manual Fix via Git

```bash
# Clone if you haven't
git clone https://github.com/GaryAsher/challenge-run-site.git
cd challenge-run-site

# Create a fix branch
git checkout -b fix/correct-run-data

# Edit the file
# ... make your changes ...

# Commit and push
git add .
git commit -m "Fix: Correct data for run XXXX"
git push origin fix/correct-run-data

# Create PR on GitHub
```

---

## Data Corrections

### Fixing a Run File

Run files are in `_runs/{game_id}/` or `_queue_runs/{game_id}/`.

**Editable fields:**
- `runner` (display name)
- `category` (display name)
- `date_completed`
- `video_link`
- `time_primary`, `time_secondary`
- `timing_method_primary`, `timing_method_secondary`
- `restrictions`
- `notes`
- `verified`, `verified_by`

**DO NOT change:**
- `game_id` - would break routing
- `runner_id` - would break routing
- `category_slug` - would break routing
- Filename - must match content

If you need to change `game_id`, `runner_id`, or `category_slug`:
1. Delete the old file
2. Create a new file with correct data

### Fixing a Runner Profile

Runner files are in `_runners/{runner_id}.md`.

**Editable fields:**
- `name` (display name)
- `bio`
- `pronouns`
- `location`
- Social links (`twitch`, `youtube`, etc.)
- `games` list

**DO NOT change:**
- `runner_id` - would break all their runs
- Filename - must match runner_id

### Changing a Runner ID

This is a breaking change. You must:

1. Create new runner file with correct ID
2. Update ALL runs that reference this runner
3. Delete old runner file

```bash
# Find all runs by this runner
grep -r "runner_id: old-runner-id" _runs/ _queue_runs/

# Update each file's runner_id field
# Then delete the old runner file
```

---

## Recovering Deleted Files

### From Git History

Nothing is ever truly deleted in Git.

```bash
# Find when the file was deleted
git log --all --full-history -- path/to/file.md

# Restore from a specific commit
git checkout <commit-hash>^ -- path/to/file.md

# Commit the restoration
git add path/to/file.md
git commit -m "Restore: Recover accidentally deleted file"
```

### From GitHub UI

1. Go to the repository
2. Click **Commits** (or navigate to a specific folder's history)
3. Find the commit that deleted the file
4. Click the commit hash
5. Find the file in the diff
6. Click **View file** at that commit
7. Copy the content
8. Create a new file with the same name

---

## Common Mistakes

### "I approved the wrong run"

**If PR not merged:**
1. Go to PR → Close (don't merge)
2. Go to issue → `/reject Approved in error, please resubmit`

**If PR was merged:**
1. Create revert PR
2. Or delete the specific run file

### "I rejected a valid run"

1. Ask the user to resubmit
2. Or manually create the run file yourself

### "The runner ID has a typo"

**If no runs exist yet:**
1. Delete the runner file
2. Ask user to resubmit with correct ID

**If runs already exist:**
1. You're stuck with the typo, OR
2. Migrate everything (see "Changing a Runner ID" above)

### "Wrong game ID was used"

1. The game probably doesn't exist → run will fail validation
2. Either:
   - Create the game file (if it should exist)
   - Reject and ask user to use correct game

### "Duplicate submission was merged"

1. Identify which one to keep (usually the first)
2. Delete the duplicate file via PR
3. Close the duplicate issue

### "Video link is now broken"

This happens when users delete their videos.

Options:
1. Keep the run (historical record)
2. Add a note: `video_status: unavailable`
3. Contact the runner for new link
4. Delete if unverifiable

### "The timestamp in the filename is wrong"

Filenames use `date_submitted`, not `date_completed`.

If the filename date is wrong:
1. You must rename the file
2. This requires: delete old + create new
3. Or use git mv: `git mv old-name.md new-name.md`

---

## Prevention

### Before Approving, Check:

- [ ] Video link works
- [ ] Data looks reasonable
- [ ] Not a duplicate

### Before Merging PR, Check:

- [ ] Validation passed
- [ ] File content looks correct
- [ ] No obvious issues in diff

### When in Doubt:

- Use `/review` to get another opinion
- Ask in the moderator channel
- It's easier to not merge than to revert

---

## Emergency Contacts

If something is seriously broken:

1. **Don't panic** - Git keeps history
2. **Stop merging** - Prevent more damage
3. **Contact @GaryAsher** - Repository owner
4. **Document what happened** - For post-mortem

---

## Recovery Checklist

When fixing a problem:

- [ ] Identify what went wrong
- [ ] Identify affected files
- [ ] Create fix branch (not main!)
- [ ] Make changes
- [ ] Run validation: `npm run validate:schema`
- [ ] Create PR for review
- [ ] Get approval before merging
- [ ] Verify fix worked
- [ ] Document if it's a new type of problem

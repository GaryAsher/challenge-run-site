# Issue Templates

This folder contains GitHub Issue templates that create structured forms for user submissions.

## Files

| File | Purpose |
|------|---------|
| `config.yml` | GitHub configuration for issue template chooser. Controls which templates appear and adds external links (like Discord). |
| `game-change-request.yml` | Form for requesting changes to existing game pages (corrections, new categories, etc.). |
| `run-submission.yml` | **Generic run submission form.** Used when submitting challenge runs for any game. Creates issues with `run-submission` and `pending-review` labels. |
| `runner-profile.yml` | Form for creating or updating runner profiles with social links and bio information. |

## How These Work

1. When a user clicks "New Issue" on GitHub, they see a list of these templates
2. User fills out the form
3. GitHub creates an issue with the specified labels
4. GitHub Actions workflows (in `.github/workflows/`) detect the labels and process accordingly:
   - `run-submission` → `process-run-submission.yml` workflow
   - Other labels → Various approval/processing workflows

## Adding a New Template

1. Create a new `.yml` file following the existing format
2. Include appropriate labels so workflows can detect the issue type
3. Update `config.yml` if you want to control visibility

## Template Format Reference

```yaml
name: "Template Name"
description: "Brief description shown in chooser"
labels: ["label1", "label2"]
body:
  - type: input
    id: field_id
    attributes:
      label: "Field Label"
      placeholder: "Example input"
    validations:
      required: true
```

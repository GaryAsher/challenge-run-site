#!/usr/bin/env node
/**
 * Generate a GitHub Issue Template from a game's YAML data
 * 
 * Usage: node scripts/generate-run-form.js <game-id>
 * Output: .github/ISSUE-TEMPLATE/{game-id}-run-submission.yml
 */

const fs = require('fs');
const path = require('path');

const gameId = process.argv[2];
if (!gameId) {
  console.error('Usage: node scripts/generate-run-form.js <game-id>');
  process.exit(1);
}

const gamePath = path.join(process.cwd(), '_games', `${gameId}.md`);
if (!fs.existsSync(gamePath)) {
  console.error(`Game file not found: ${gamePath}`);
  process.exit(1);
}

console.log(`Reading: ${gamePath}`);
const content = fs.readFileSync(gamePath, 'utf8');

function extractValue(key) {
  const match = content.match(new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?`, 'm'));
  return match ? match[1].trim() : null;
}

function extractArray(key) {
  const results = [];
  const regex = new RegExp(`^${key}:[\\s\\S]*?(?=^[a-z_]+:|^---$)`, 'm');
  const section = content.match(regex);
  if (section) {
    const items = section[0].match(/^\s+-\s+(.+)$/gm);
    if (items) {
      for (const item of items) {
        const val = item.replace(/^\s+-\s+/, '').replace(/^["']|["']$/g, '').trim();
        if (val && !val.includes(':')) results.push(val);
      }
    }
  }
  return results;
}

function extractObjectArray(key) {
  const results = [];
  const regex = new RegExp(`^${key}:[\\s\\S]*?(?=^[a-z_]+:|^---$)`, 'm');
  const section = content.match(regex);
  if (section) {
    const slugMatches = section[0].match(/slug:\s*([^\s\n]+)/g);
    if (slugMatches) {
      for (const m of slugMatches) results.push(m.replace('slug:', '').trim());
    }
  }
  return results;
}

const gameName = extractValue('name') || gameId;
const challenges = extractArray('challenges');
const restrictions = extractArray('restrictions');
const categorySlugs = extractObjectArray('categories_data');
const glitchSlugs = extractObjectArray('glitches_data');
const communitySlugs = extractObjectArray('community_challenges');

console.log(`Game: ${gameName}, Categories: ${categorySlugs.length}, Challenges: ${challenges.length}`);

const categoryOptions = [...categorySlugs, 'OTHER (specify below)'];
const challengeOptions = [...challenges, ...communitySlugs, 'OTHER (specify below)'];
const glitchOptions = glitchSlugs.length > 0 ? glitchSlugs : ['unrestricted', 'nmg', 'glitchless'];

let template = `name: "🎮 ${gameName} Run Submission"
description: Submit a ${gameName} challenge run for review
title: "[${gameId.toUpperCase().replace(/-/g, ' ')} Run] <category> - <challenge> - <runner>"
labels: ["run-submission", "pending-review", "${gameId}"]
body:
  - type: markdown
    attributes:
      value: |
        ## Submit Your ${gameName} Challenge Run
        
        **Video Requirements:** YouTube, Twitch Highlight/Clip, or Bilibili. No expiring VODs!

  - type: input
    id: runner
    attributes:
      label: Runner Name
      placeholder: "e.g., SpeedRunner123"
    validations:
      required: true

  - type: input
    id: runner_id
    attributes:
      label: Runner ID
      description: URL-safe ID (lowercase, hyphens)
      placeholder: "e.g., speedrunner123"
    validations:
      required: true

  - type: input
    id: contact
    attributes:
      label: Discord / Contact (Optional)

  - type: dropdown
    id: category_slug
    attributes:
      label: Category
      options:
${categoryOptions.map(c => `        - ${c}`).join('\n')}
    validations:
      required: true

  - type: input
    id: category_other
    attributes:
      label: Category (if OTHER)

  - type: input
    id: category_label
    attributes:
      label: Category Display Name
      placeholder: "e.g., Any%"
    validations:
      required: true

  - type: dropdown
    id: challenge_id
    attributes:
      label: Challenge Type
      options:
${challengeOptions.map(c => `        - ${c}`).join('\n')}
    validations:
      required: true

  - type: input
    id: challenge_other
    attributes:
      label: Challenge Type (if OTHER)

  - type: dropdown
    id: glitch_category
    attributes:
      label: Glitch Category
      options:
${glitchOptions.map(g => `        - ${g}`).join('\n')}
    validations:
      required: true

  - type: input
    id: video_link
    attributes:
      label: Video Link
      placeholder: "https://www.youtube.com/watch?v=..."
    validations:
      required: true

  - type: input
    id: date_completed
    attributes:
      label: Date Completed (YYYY-MM-DD)
      placeholder: "2025-01-10"
    validations:
      required: true

  - type: input
    id: time_primary
    attributes:
      label: Run Time
      placeholder: "HH:MM:SS or MM:SS"

  - type: dropdown
    id: timing_method
    attributes:
      label: Timing Method
      options:
        - ""
        - RTA (Real Time Attack)
        - LRT (Load Removed Time)
        - IGT (In-Game Time)
`;

if (restrictions.length > 0) {
  template += `
  - type: checkboxes
    id: restrictions
    attributes:
      label: Additional Restrictions
      options:
${restrictions.map(r => `        - label: "${r}"`).join('\n')}
`;
}

template += `
  - type: textarea
    id: notes
    attributes:
      label: Additional Notes

  - type: checkboxes
    id: verification
    attributes:
      label: Verification
      options:
        - label: This is my own gameplay
          required: true
        - label: Video is publicly accessible and permanent
          required: true
`;

const outputDir = fs.existsSync('.github/ISSUE-TEMPLATE') ? '.github/ISSUE-TEMPLATE' : '.github/ISSUE_TEMPLATE';
const outputPath = path.join(outputDir, `${gameId}-run-submission.yml`);
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, template);
console.log(`Generated: ${outputPath}`);

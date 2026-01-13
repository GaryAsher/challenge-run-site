#!/usr/bin/env node
/**
 * Update platform IDs in all game files
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const gamesDir = path.join(ROOT, '_games');

const replacements = {
  'steam': 'pc-steam',
  'epic': 'pc-epic-games-store',
  'gog': 'pc-gog',
  'pc': 'pc-other',
};

function updateGameFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Match platform list items
  for (const [oldId, newId] of Object.entries(replacements)) {
    const regex = new RegExp(`^(\\s+)-\\s+${oldId}\\s*$`, 'gm');
    const newContent = content.replace(regex, `$1- ${newId}`);
    
    if (newContent !== content) {
      console.log(`${path.basename(filePath)}: ${oldId} → ${newId}`);
      content = newContent;
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
  }

  return changed;
}

function main() {
  if (!fs.existsSync(gamesDir)) {
    console.error('_games directory not found');
    process.exit(1);
  }

  const files = fs.readdirSync(gamesDir)
    .filter(f => f.endsWith('.md'))
    .map(f => path.join(gamesDir, f));

  let totalChanged = 0;

  console.log('Updating platform IDs in game files...\n');

  for (const file of files) {
    if (updateGameFile(file)) {
      totalChanged++;
    }
  }

  console.log(`\n✅ Updated ${totalChanged} file(s)`);
}

main();

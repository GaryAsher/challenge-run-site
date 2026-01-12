#!/usr/bin/env node
/**
 * Helper script to prepare game cover image
 * Usage: node scripts/add-game-cover.js tiny-rogues ~/Downloads/cover.jpg
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node scripts/add-game-cover.js <game-id> <source-image>');
  process.exit(1);
}

const gameId = args[0];
const sourceImage = args[1];

// Validate game exists
const gameFile = path.join(process.cwd(), '_games', `${gameId}.md`);
if (!fs.existsSync(gameFile)) {
  console.error(`❌ Game file not found: _games/${gameId}.md`);
  process.exit(1);
}

// Validate source image exists
if (!fs.existsSync(sourceImage)) {
  console.error(`❌ Source image not found: ${sourceImage}`);
  process.exit(1);
}

// Get file extension
const ext = path.extname(sourceImage);
if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext.toLowerCase())) {
  console.error(`❌ Invalid image format: ${ext}`);
  console.error('   Supported: .jpg, .jpeg, .png, .webp');
  process.exit(1);
}

// Determine destination
const letter = gameId[0].toLowerCase();
const destDir = path.join(process.cwd(), 'assets', 'img', 'games', letter);
const destFile = path.join(destDir, `${gameId}${ext}`);

// Create directory if needed
fs.mkdirSync(destDir, { recursive: true });

// Copy file
fs.copyFileSync(sourceImage, destFile);

const relativePath = `/assets/img/games/${letter}/${gameId}${ext}`;

console.log(`✅ Image copied to: ${path.relative(process.cwd(), destFile)}`);
console.log('');
console.log('📝 Add this to your game file:');
console.log('');
console.log(`cover: ${relativePath}`);
console.log('');

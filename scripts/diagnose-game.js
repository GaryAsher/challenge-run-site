#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const gameId = process.argv[2];

if (!gameId) {
  console.error('Usage: node scripts/diagnose-game.js <game-id>');
  process.exit(1);
}

const gamePath = path.join(process.cwd(), '_games', `${gameId}.md`);

if (!fs.existsSync(gamePath)) {
  console.error(`❌ Game file not found: ${gamePath}`);
  process.exit(1);
}

console.log(`\n🔍 Diagnosing: ${gameId}\n`);

const content = fs.readFileSync(gamePath, 'utf8');
const match = content.match(/^---\s*\n([\s\S]*?)\n---/);

if (!match) {
  console.error('❌ No front matter found');
  process.exit(1);
}

const data = yaml.load(match[1]);

console.log('✅ Front matter parsed successfully\n');

// Check required fields
const required = ['game_id', 'layout'];
const gameName = data.game_name || data.name;
if (!gameName) missing.push('game_name');
const missing = required.filter(f => !data[f]);

if (missing.length) {
  console.error('❌ Missing required fields:', missing.join(', '));
} else {
  console.log('✅ All required fields present');
}

// Check optional fields
console.log('\n📋 Field Summary:');
console.log(`  - game_id: ${data.game_id}`);
console.log(`  - game_name: ${data.game_name || data.name}`);
console.log(`  - status: ${data.status || '(not set)'}`);
console.log(`  - tags: ${(data.tags || []).length} tags`);
console.log(`  - platforms: ${(data.platforms || []).length} platforms`);
console.log(`  - challenges: ${(data.challenges || []).length} challenges`);
console.log(`  - categories: ${(data.categories_data || []).length} categories`);
console.log(`  - cover: ${data.cover || '(not set)'}`);

// Check for issues
console.log('\n🔧 Potential Issues:');
let issues = 0;

if (!data.status) {
  console.log('  ⚠️  No status field');
  issues++;
}

if (!data.cover) {
  console.log('  ⚠️  No cover image');
  issues++;
}

if (data.challenges && data.challenges.some(c => c.includes('('))) {
  console.log('  ❌ Challenges contain parentheses - use canonical IDs only');
  console.log('     Found:', data.challenges.filter(c => c.includes('(')));
  issues++;
}

if (data.platforms && data.platforms.some(p => !['pc', 'steam', 'gog', 'epic', 'console', 'mobile', 'nintendo-switch', 'playstation', 'xbox'].includes(p))) {
  console.log('  ❌ Unknown platforms found');
  console.log('     Found:', data.platforms);
  issues++;
}

if (issues === 0) {
  console.log('  ✅ No issues detected');
}

console.log('');

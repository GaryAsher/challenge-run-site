#!/usr/bin/env node
/**
 * Cleanup script to remove old flat category URL structure
 * 
 * Removes directories like:
 *   games/<game>/runs/<category>/
 * 
 * But NOT the new tiered structure:
 *   games/<game>/runs/full-runs/
 *   games/<game>/runs/mini-challenges/
 *   games/<game>/runs/player-made/
 *
 * Usage:
 *   node scripts/cleanup-old-category-pages.js          (dry run - shows what would be deleted)
 *   node scripts/cleanup-old-category-pages.js --delete (actually delete)
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const GAMES_DIR = path.join(ROOT, 'games');

// These are the NEW tier directories - don't delete these
const TIER_SLUGS = new Set(['full-runs', 'mini-challenges', 'player-made']);

// Parse args
const shouldDelete = process.argv.includes('--delete');

function getGameDirs() {
  if (!fs.existsSync(GAMES_DIR)) return [];
  
  return fs.readdirSync(GAMES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
}

function getRunSubdirs(gameId) {
  const runsDir = path.join(GAMES_DIR, gameId, 'runs');
  if (!fs.existsSync(runsDir)) return [];
  
  return fs.readdirSync(runsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
}

function removeRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      removeRecursive(fullPath);
    } else {
      fs.unlinkSync(fullPath);
    }
  }
  fs.rmdirSync(dirPath);
}

function main() {
  const toDelete = [];
  
  for (const gameId of getGameDirs()) {
    const subdirs = getRunSubdirs(gameId);
    
    for (const subdir of subdirs) {
      // Skip the new tier directories
      if (TIER_SLUGS.has(subdir)) continue;
      
      // This is an old flat category directory - mark for deletion
      const fullPath = path.join(GAMES_DIR, gameId, 'runs', subdir);
      toDelete.push(fullPath);
    }
  }
  
  if (toDelete.length === 0) {
    console.log('No old category directories found. Nothing to clean up.');
    return;
  }
  
  console.log(`Found ${toDelete.length} old category director${toDelete.length === 1 ? 'y' : 'ies'} to remove:\n`);
  
  for (const p of toDelete) {
    const rel = path.relative(ROOT, p);
    
    if (shouldDelete) {
      removeRecursive(p);
      console.log(`  DELETED: ${rel}`);
    } else {
      console.log(`  ${rel}`);
    }
  }
  
  if (!shouldDelete) {
    console.log('\nThis was a dry run. To actually delete, run:');
    console.log('  node scripts/cleanup-old-category-pages.js --delete');
  } else {
    console.log('\nCleanup complete!');
  }
}

main();

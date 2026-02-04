#!/usr/bin/env node
/**
 * scripts/generate-runner-game-pages.js
 *
 * Generates pages for each runner's runs per game:
 * /runners/{runner_id}/runs/{game_id}/index.html
 *
 * This creates the detail pages that show all runs by a runner for a specific game.
 *
 * Usage:
 *   node scripts/generate-runner-game-pages.js                     # All runners
 *   node scripts/generate-runner-game-pages.js --runner gary-asher # Specific runner
 *   node scripts/generate-runner-game-pages.js --check             # Verify pages exist
 */

const fs = require('fs');
const path = require('path');

// Import shared utilities
const {
  parseFrontMatter,
  isDir,
  isFile,
  readText,
} = require('./lib');

const ROOT = process.cwd();
const RUNNERS_DIR = path.join(ROOT, '_runners');
const RUNS_DIR = path.join(ROOT, '_runs');
const GAMES_DIR = path.join(ROOT, '_games');
const OUTPUT_DIR = path.join(ROOT, 'runners');

// ============================================================
// CLI Arguments
// ============================================================
const args = process.argv.slice(2);
const CHECK_ONLY = args.includes('--check');
const RUNNER_INDEX = args.indexOf('--runner');
const SPECIFIC_RUNNER = RUNNER_INDEX !== -1 ? args[RUNNER_INDEX + 1] : null;

// ============================================================
// Helpers
// ============================================================
function ensureDir(dir) {
  if (!isDir(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getRunnerIds() {
  if (!isDir(RUNNERS_DIR)) return [];
  
  return fs.readdirSync(RUNNERS_DIR)
    .filter(f => f.endsWith('.md') && !f.startsWith('_'))
    .map(f => f.replace('.md', ''));
}

function getRunsForRunner(runnerId) {
  if (!isDir(RUNS_DIR)) return [];
  
  const runs = [];
  
  // Runs can be in subdirectories by game
  function scanDir(dir) {
    if (!isDir(dir)) return;
    
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      if (isDir(fullPath)) {
        scanDir(fullPath);
      } else if (entry.endsWith('.md')) {
        try {
          const content = readText(fullPath);
          const { data } = parseFrontMatter(content);
          if (data.runner_id && data.runner_id.toLowerCase() === runnerId.toLowerCase()) {
            runs.push({
              ...data,
              _path: fullPath
            });
          }
        } catch (e) {
          // Skip files that can't be parsed
        }
      }
    }
  }
  
  scanDir(RUNS_DIR);
  return runs;
}

function getUniqueGames(runs) {
  const games = new Set();
  for (const run of runs) {
    if (run.game_id) {
      games.add(run.game_id);
    }
  }
  return Array.from(games);
}

function getGameName(gameId) {
  const gamePath = path.join(GAMES_DIR, `${gameId}.md`);
  if (!isFile(gamePath)) return gameId;
  
  try {
    const content = readText(gamePath);
    const { data } = parseFrontMatter(content);
    return data.game_name || gameId;
  } catch {
    return gameId;
  }
}

function getRunnerName(runnerId) {
  const runnerPath = path.join(RUNNERS_DIR, `${runnerId}.md`);
  if (!isFile(runnerPath)) return runnerId;
  
  try {
    const content = readText(runnerPath);
    const { data } = parseFrontMatter(content);
    return data.runner_name || runnerId;
  } catch {
    return runnerId;
  }
}

function generateRunnerGamePage(runnerId, gameId) {
  const runnerName = getRunnerName(runnerId);
  const gameName = getGameName(gameId);
  
  return `---
layout: runner-game-runs
title: "${runnerName} - ${gameName} Runs"
runner_id: ${runnerId}
game_id: ${gameId}
permalink: /runners/${runnerId}/runs/${gameId}/
---
`;
}

function writeIfNotExists(filePath, content, checkOnly = false) {
  if (isFile(filePath)) {
    return false; // Already exists
  }
  
  if (checkOnly) {
    console.log(`MISSING: ${path.relative(ROOT, filePath)}`);
    return true; // Would need to create
  }
  
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Created: ${path.relative(ROOT, filePath)}`);
  return true;
}

// ============================================================
// Main
// ============================================================
function main() {
  console.log('\n🏃 Generate Runner Game Pages\n');
  
  let runners = SPECIFIC_RUNNER ? [SPECIFIC_RUNNER] : getRunnerIds();
  
  if (runners.length === 0) {
    console.log('No runners found in _runners/');
    return;
  }
  
  console.log(`Processing ${runners.length} runner(s)...\n`);
  
  let created = 0;
  let skipped = 0;
  let missing = 0;
  
  for (const runnerId of runners) {
    const runs = getRunsForRunner(runnerId);
    
    if (runs.length === 0) {
      console.log(`  ${runnerId}: No runs found`);
      continue;
    }
    
    const games = getUniqueGames(runs);
    console.log(`  ${runnerId}: ${runs.length} runs across ${games.length} game(s)`);
    
    for (const gameId of games) {
      const outputPath = path.join(OUTPUT_DIR, runnerId, 'runs', gameId, 'index.html');
      const content = generateRunnerGamePage(runnerId, gameId);
      
      if (CHECK_ONLY) {
        if (!isFile(outputPath)) {
          console.log(`    MISSING: runs/${gameId}/`);
          missing++;
        } else {
          skipped++;
        }
      } else {
        if (writeIfNotExists(outputPath, content)) {
          created++;
        } else {
          skipped++;
        }
      }
    }
  }
  
  // Summary
  console.log('\n📊 Summary');
  if (CHECK_ONLY) {
    console.log(`   Missing: ${missing}`);
    console.log(`   Exists:  ${skipped}`);
  } else {
    console.log(`   Created: ${created}`);
    console.log(`   Skipped: ${skipped} (already exist)`);
  }
}

main();

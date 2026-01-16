#!/usr/bin/env node
/**
 * Generate nested run category pages from _games/<game>.md categories_data.
 *
 * Creates:
 *   games/<game_id>/runs/<parent>/index.html               (if missing)
 *   games/<game_id>/runs/<parent>/<child>/index.html       (for each child)
 *
 * Usage:
 *   node scripts/generate-run-category-pages.js                 (all games)
 *   node scripts/generate-run-category-pages.js --game hades-2  (one game)
 *   node scripts/generate-run-category-pages.js --check         (all games, fail if stale)
 *   node scripts/generate-run-category-pages.js --game hades-2 --check
 */

const fs = require('fs');
const path = require('path');

// Import shared utilities
const {
  extractFrontMatterData,
  readText,
  writeFileIfChanged,
  fileExists,
} = require('./lib');

const ROOT = process.cwd();

// ============================================================
// CLI argument parsing
// ============================================================
function parseArgs(argv) {
  const out = { game: null, check: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--game' || a === '-g') out.game = argv[++i];
    else if (a === '--check') out.check = true;
  }
  return out;
}

function die(msg) {
  console.error('Error:', msg);
  process.exit(1);
}

// ============================================================
// Category data parsing
// ============================================================
function parseGameId(data) {
  return data.game_id || null;
}

function parseCategoriesData(data) {
  if (!Array.isArray(data.categories_data)) return [];

  return data.categories_data
    .map(cat => {
      if (!cat || typeof cat !== 'object') return null;

      return {
        slug: cat.slug || '',
        label: cat.label || cat.slug || '',
        children: Array.isArray(cat.children)
          ? cat.children.map(ch => ({
              slug: ch.slug || '',
              label: ch.label || ch.slug || '',
            }))
          : [],
      };
    })
    .filter(Boolean);
}

function slugToTitle(slug) {
  return String(slug || '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(w => (w ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

// ============================================================
// Page generation
// ============================================================
function pageContent({ title, gameId, categorySlug }) {
  const q = (v) => JSON.stringify(String(v ?? ""));

  return `---
layout: game-runs
title: ${q(title)}
game_id: ${gameId}
category_slug: ${q(categorySlug)}
permalink: /games/${gameId}/runs/${categorySlug}/
---
`;
}

function listGameFiles() {
  const dir = path.join(ROOT, '_games');
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .filter(f => !f.toLowerCase().includes('template'))
    .filter(f => f.toLowerCase() !== 'readme.md')
    .map(f => path.join(dir, f));
}

function generateForGameFile(gameMdPath, { check, explicitGameId }) {
  const md = readText(gameMdPath);
  const data = extractFrontMatterData(md);

  if (!data) {
    if (explicitGameId) die(`No YAML front matter found in ${gameMdPath}`);
    return { created: [], changed: [], skipped: true };
  }

  const gameId = parseGameId(data) || explicitGameId || null;
  if (!gameId) {
    if (explicitGameId) die(`Missing game_id in ${gameMdPath}`);
    return { created: [], changed: [], skipped: true };
  }

  const cats = parseCategoriesData(data);

  if (!cats.length) {
    if (explicitGameId) die(`No categories_data found in ${gameMdPath}`);
    return { created: [], changed: [], skipped: true };
  }

  const created = [];
  const changed = [];

  cats.forEach(c => {
    const parentSlug = c.slug;

    // Parent page
    const parentDir = path.join(ROOT, 'games', gameId, 'runs', parentSlug);
    const parentIndex = path.join(parentDir, 'index.html');
    const parentTitle = slugToTitle(c.label || parentSlug);

    const parentRes = writeFileIfChanged(
      parentIndex,
      pageContent({ title: parentTitle, gameId, categorySlug: parentSlug }),
      check
    );
    if (parentRes.changed) {
      (parentRes.created ? created : changed).push(parentIndex);
    }

    // Children pages
    (c.children || []).forEach(ch => {
      const childSlug = `${parentSlug}/${ch.slug}`;
      const childDir = path.join(ROOT, 'games', gameId, 'runs', parentSlug, ch.slug);
      const childIndex = path.join(childDir, 'index.html');
      const childTitle = `${c.label || slugToTitle(parentSlug)} — ${ch.label || slugToTitle(ch.slug)}`;

      const childRes = writeFileIfChanged(
        childIndex,
        pageContent({ title: childTitle, gameId, categorySlug: childSlug }),
        check
      );
      if (childRes.changed) {
        (childRes.created ? created : changed).push(childIndex);
      }
    });
  });

  return { created, changed, skipped: false, gameId };
}

// ============================================================
// Main
// ============================================================
function main() {
  const args = parseArgs(process.argv.slice(2));

  let gameFiles = [];
  let explicitGameId = null;

  if (args.game) {
    explicitGameId = args.game;
    const p = path.join(ROOT, '_games', `${args.game}.md`);
    if (!fileExists(p)) die(`Game file not found: ${p}`);
    gameFiles = [p];
  } else {
    gameFiles = listGameFiles();
    if (!gameFiles.length) die('No _games/*.md files found.');
  }

  const allCreated = [];
  const allChanged = [];
  const skippedGames = [];

  for (const gf of gameFiles) {
    const res = generateForGameFile(gf, { check: args.check, explicitGameId });
    if (res.skipped) {
      skippedGames.push(path.relative(ROOT, gf));
      continue;
    }
    allCreated.push(...res.created);
    allChanged.push(...res.changed);
  }

  const totalTouched = allCreated.length + allChanged.length;

  if (args.check) {
    if (totalTouched > 0) {
      console.error('Missing or out-of-date generated run category pages:');
      allCreated.forEach(p => console.error('  (missing)  ' + path.relative(ROOT, p)));
      allChanged.forEach(p => console.error('  (changed)  ' + path.relative(ROOT, p)));
      process.exit(1);
    }
    console.log('OK: run category pages are up to date.');
    return;
  }

  console.log(`Done. Created: ${allCreated.length}, Updated: ${allChanged.length}`);
  allCreated.forEach(p => console.log('  created  ' + path.relative(ROOT, p)));
  allChanged.forEach(p => console.log('  updated  ' + path.relative(ROOT, p)));

  if (skippedGames.length) {
    console.log(`Skipped (no categories_data/front matter): ${skippedGames.length}`);
    skippedGames.forEach(x => console.log('  skipped  ' + x));
  }
}

main();

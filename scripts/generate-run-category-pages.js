#!/usr/bin/env node
/**
 * Generate nested run category pages from _games/<game>.md tiered categories.
 *
 * Supports both:
 *   - New tiered structure: full_runs, mini_challenges, player_made
 *   - Legacy structure: categories_data (treated as full_runs)
 *
 * Creates:
 *   games/<game_id>/runs/index.html                                    (tier picker landing)
 *   games/<game_id>/runs/<tier>/index.html                             (tier index)
 *   games/<game_id>/runs/<tier>/<category>/index.html                  (category leaderboard)
 *   games/<game_id>/runs/<tier>/<parent>/<child>/index.html            (nested category)
 *
 * URL Structure:
 *   /games/hades-2/runs/                                    → Tier picker
 *   /games/hades-2/runs/full-runs/                          → Full Runs list
 *   /games/hades-2/runs/full-runs/underworld-any/           → Leaderboard
 *   /games/hades-2/runs/mini-challenges/                    → Mini-Challenges list
 *   /games/hades-2/runs/mini-challenges/chaos-trials/       → Parent category
 *   /games/hades-2/runs/mini-challenges/chaos-trials/trial-of-blood/ → Child leaderboard
 *   /games/hades-2/runs/player-made/                        → Player-Made list
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

// Tier configuration
const TIERS = {
  full_runs: {
    slug: 'full-runs',
    label: 'Full Runs',
    description: 'Categories that require reaching an ending',
  },
  mini_challenges: {
    slug: 'mini-challenges',
    label: 'Mini-Challenges',
    description: 'In-game challenges that exist without requiring an ending',
  },
  player_made: {
    slug: 'player-made',
    label: 'Player-Made',
    description: 'Community-created challenges with arbitrary goals',
  },
};

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

/**
 * Parse categories from a tier array
 * @param {Array} tierArray - Array of category objects
 * @returns {Array} Normalized category objects with children
 */
function parseTierCategories(tierArray) {
  if (!Array.isArray(tierArray)) return [];

  return tierArray
    .map(cat => {
      if (!cat || typeof cat !== 'object') return null;

      return {
        slug: cat.slug || '',
        label: cat.label || cat.slug || '',
        description: cat.description || '',
        creator: cat.creator || null,
        created_date: cat.created_date || null,
        children: Array.isArray(cat.children)
          ? cat.children.map(ch => ({
              slug: ch.slug || '',
              label: ch.label || ch.slug || '',
              description: ch.description || '',
            }))
          : [],
      };
    })
    .filter(Boolean)
    .filter(cat => cat.slug);
}

/**
 * Parse all category tiers from game data
 * Supports both new tiered structure and legacy categories_data
 * @param {Object} data - Game front matter data
 * @returns {Object} Tiers object with full_runs, mini_challenges, player_made arrays
 */
function parseCategoryTiers(data) {
  const tiers = {
    full_runs: [],
    mini_challenges: [],
    player_made: [],
  };

  // Check for new tiered structure
  if (data.full_runs || data.mini_challenges || data.player_made) {
    tiers.full_runs = parseTierCategories(data.full_runs);
    tiers.mini_challenges = parseTierCategories(data.mini_challenges);
    tiers.player_made = parseTierCategories(data.player_made);
  } else if (Array.isArray(data.categories_data)) {
    // Legacy: treat all categories_data as full_runs
    tiers.full_runs = parseTierCategories(data.categories_data);
  }

  return tiers;
}

/**
 * Check if any tier has categories
 */
function hasAnyCategories(tiers) {
  return (
    tiers.full_runs.length > 0 ||
    tiers.mini_challenges.length > 0 ||
    tiers.player_made.length > 0
  );
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
// Page content generators
// ============================================================

/**
 * Generate content for the main runs index page (tier picker)
 */
function runsIndexContent({ gameId, gameName }) {
  const q = (v) => JSON.stringify(String(v ?? ""));

  return `---
layout: game-runs
title: ${q(`${gameName} - Runs`)}
game_id: ${gameId}
category_slug: ""
category_tier: ""
page_type: "tier_picker"
permalink: /games/${gameId}/runs/
---
`;
}

/**
 * Generate content for a tier index page
 */
function tierIndexContent({ gameId, gameName, tierKey, tierConfig }) {
  const q = (v) => JSON.stringify(String(v ?? ""));

  return `---
layout: game-runs
title: ${q(`${gameName} - ${tierConfig.label}`)}
game_id: ${gameId}
category_slug: ""
category_tier: ${q(tierKey)}
tier_slug: ${q(tierConfig.slug)}
page_type: "tier_index"
permalink: /games/${gameId}/runs/${tierConfig.slug}/
---
`;
}

/**
 * Generate content for a category leaderboard page
 */
function categoryPageContent({ title, gameId, tierKey, tierSlug, categorySlug }) {
  const q = (v) => JSON.stringify(String(v ?? ""));

  return `---
layout: game-runs
title: ${q(title)}
game_id: ${gameId}
category_slug: ${q(categorySlug)}
category_tier: ${q(tierKey)}
tier_slug: ${q(tierSlug)}
page_type: "category"
permalink: /games/${gameId}/runs/${tierSlug}/${categorySlug}/
---
`;
}

// ============================================================
// File listing
// ============================================================
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

// ============================================================
// Page generation
// ============================================================
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

  const gameName = data.game_name || data.name || data.title || slugToTitle(gameId);
  const tiers = parseCategoryTiers(data);

  if (!hasAnyCategories(tiers)) {
    if (explicitGameId) die(`No categories found in ${gameMdPath}`);
    return { created: [], changed: [], skipped: true };
  }

  const created = [];
  const changed = [];

  // 1. Generate main runs index page (tier picker)
  const runsIndexPath = path.join(ROOT, 'games', gameId, 'runs', 'index.html');
  const runsIndexRes = writeFileIfChanged(
    runsIndexPath,
    runsIndexContent({ gameId, gameName }),
    check
  );
  if (runsIndexRes.changed) {
    (runsIndexRes.created ? created : changed).push(runsIndexPath);
  }

  // 2. Generate pages for each tier
  for (const [tierKey, tierConfig] of Object.entries(TIERS)) {
    const tierCategories = tiers[tierKey];
    
    // Skip empty tiers
    if (!tierCategories || tierCategories.length === 0) continue;

    // 2a. Tier index page
    const tierIndexPath = path.join(ROOT, 'games', gameId, 'runs', tierConfig.slug, 'index.html');
    const tierIndexRes = writeFileIfChanged(
      tierIndexPath,
      tierIndexContent({ gameId, gameName, tierKey, tierConfig }),
      check
    );
    if (tierIndexRes.changed) {
      (tierIndexRes.created ? created : changed).push(tierIndexPath);
    }

    // 2b. Category pages within this tier
    for (const cat of tierCategories) {
      const catSlug = cat.slug;
      const catLabel = cat.label || slugToTitle(catSlug);

      // Parent category page
      const catDir = path.join(ROOT, 'games', gameId, 'runs', tierConfig.slug, catSlug);
      const catIndex = path.join(catDir, 'index.html');
      const catTitle = `${gameName} - ${catLabel}`;

      const catRes = writeFileIfChanged(
        catIndex,
        categoryPageContent({
          title: catTitle,
          gameId,
          tierKey,
          tierSlug: tierConfig.slug,
          categorySlug: catSlug,
        }),
        check
      );
      if (catRes.changed) {
        (catRes.created ? created : changed).push(catIndex);
      }

      // Child category pages (if any)
      if (cat.children && cat.children.length > 0) {
        for (const child of cat.children) {
          const childSlug = `${catSlug}/${child.slug}`;
          const childLabel = child.label || slugToTitle(child.slug);
          const childDir = path.join(ROOT, 'games', gameId, 'runs', tierConfig.slug, catSlug, child.slug);
          const childIndex = path.join(childDir, 'index.html');
          const childTitle = `${gameName} - ${catLabel}: ${childLabel}`;

          const childRes = writeFileIfChanged(
            childIndex,
            categoryPageContent({
              title: childTitle,
              gameId,
              tierKey,
              tierSlug: tierConfig.slug,
              categorySlug: childSlug,
            }),
            check
          );
          if (childRes.changed) {
            (childRes.created ? created : changed).push(childIndex);
          }
        }
      }
    }
  }

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
    console.log(`Skipped (no categories/front matter): ${skippedGames.length}`);
    skippedGames.forEach(x => console.log('  skipped  ' + x));
  }
}

main();

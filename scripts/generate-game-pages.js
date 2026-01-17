#!/usr/bin/env node
/**
 * scripts/generate-game-pages.js
 *
 * Generates the sub-pages for a game:
 * - forum/index.html
 * - guides/index.html
 * - history/index.html
 * - resources/index.html
 * - rules/index.html
 * - submit/index.html
 * - runs/index.html (and category sub-pages)
 *
 * Usage:
 *   node scripts/generate-game-pages.js                    # All games
 *   node scripts/generate-game-pages.js --game hades-2     # Specific game
 *   node scripts/generate-game-pages.js --check            # Verify pages exist (no writes)
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
const GAMES_DIR = path.join(ROOT, '_games');
const OUTPUT_DIR = path.join(ROOT, 'games');

// ============================================================
// Helpers
// ============================================================
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function ensureDir(dir) {
  if (!isDir(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Check if either index.html or index.md exists
 */
function indexExists(dir) {
  return isFile(path.join(dir, 'index.html')) || isFile(path.join(dir, 'index.md'));
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

/**
 * Check for index page (either .html or .md), create .html if missing
 */
function ensureIndexPage(dir, template, checkOnly = false, forceOverwrite = false) {
  if (!forceOverwrite && indexExists(dir)) {
    return false; // Already exists
  }
  
  const indexPath = path.join(dir, 'index.html');
  
  if (checkOnly) {
    if (!indexExists(dir)) {
      console.log(`MISSING: ${path.relative(ROOT, indexPath)}`);
      return true; // Would need to create
    }
    return false;
  }
  
  ensureDir(dir);
  fs.writeFileSync(indexPath, template, 'utf8');
  console.log(`${forceOverwrite && indexExists(dir) ? 'Overwrote' : 'Created'}: ${path.relative(ROOT, indexPath)}`);
  return true;
}

// ============================================================
// Template Generators
// ============================================================
function generateSubPageTemplate(gameId, section, gameName) {
  const titles = {
    forum: 'Forum',
    guides: 'Guides',
    history: 'History',
    resources: 'Resources',
    rules: 'Rules',
    submit: 'Submit Run'
  };

  const descriptions = {
    forum: 'Community discussions and announcements.',
    guides: 'Strategy guides and tutorials.',
    history: 'Historical records and milestones.',
    resources: 'Useful tools, mods, and external resources.',
    rules: 'Official rules and category definitions.',
    submit: 'Submit your challenge run for review.'
  };

  const title = titles[section] || capitalize(section);
  const description = descriptions[section] || '';

  // Rules page uses special include with Rule Builder
  if (section === 'rules') {
    return `---
layout: default
title: "${gameName} - ${title}"
game_id: ${gameId}
---

{% assign game = site.games | where: "game_id", page.game_id | first %}
{% include game-header-tabs.html game=game active="${section}" %}

<div class="page-width">
  <div class="game-shell">
    {% include game-rules.html game=game %}
  </div>
</div>
`;
  }

  // Submit page uses the submit-run-form include with preset game
  if (section === 'submit') {
    return `---
layout: default
title: "${gameName} - ${title}"
game_id: ${gameId}
---

{% assign game = site.games | where: "game_id", page.game_id | first %}
{% include game-header-tabs.html game=game active="${section}" %}

<div class="page-width">
  <div class="game-shell">
    {% include submit-run-form.html game=game %}
  </div>
</div>
`;
  }

  return `---
layout: default
title: "${gameName} - ${title}"
game_id: ${gameId}
---

{% assign game = site.games | where: "game_id", page.game_id | first %}
{% include game-header-tabs.html game=game active="${section}" %}

<div class="page-width">
  <div class="game-shell">
    <div class="card">
      <h1>${title}</h1>
      <p class="muted">${description}</p>
    </div>
  </div>
</div>
`;
}

function generateRunsIndexTemplate(gameId, gameName) {
  return `---
layout: game-runs
title: "${gameName} - Runs"
game_id: ${gameId}
category_slug: ""
---
`;
}

function generateCategoryPageTemplate(gameId, gameName, categorySlug, categoryLabel) {
  return `---
layout: game-runs
title: "${gameName} - ${categoryLabel}"
game_id: ${gameId}
category_slug: "${categorySlug}"
---
`;
}

// ============================================================
// Main Generation Logic
// ============================================================
function generateGamePages(gameId, checkOnly = false, forceOverwrite = false) {
  const gameFile = path.join(GAMES_DIR, `${gameId}.md`);
  
  if (!isFile(gameFile)) {
    console.error(`Game file not found: ${gameFile}`);
    return false;
  }

  const content = readText(gameFile);
  const { data: fm, hasFrontMatter } = parseFrontMatter(content);

  if (!hasFrontMatter) {
    console.error(`No front matter in: ${gameFile}`);
    return false;
  }

  const gameName = fm.game_name || fm.name || gameId;
  const gameDir = path.join(OUTPUT_DIR, gameId);
  
  let missingCount = 0;

  // Standard sub-pages
  const subPages = ['forum', 'guides', 'history', 'resources', 'rules', 'submit'];
  
  for (const section of subPages) {
    const sectionDir = path.join(gameDir, section);
    const template = generateSubPageTemplate(gameId, section, gameName);
    
    if (ensureIndexPage(sectionDir, template, checkOnly, forceOverwrite)) {
      missingCount++;
    }
  }

  // Runs index page
  const runsDir = path.join(gameDir, 'runs');
  const runsTemplate = generateRunsIndexTemplate(gameId, gameName);
  
  if (ensureIndexPage(runsDir, runsTemplate, checkOnly, forceOverwrite)) {
    missingCount++;
  }

  // Generate category pages from categories_data
  if (fm.categories_data && Array.isArray(fm.categories_data)) {
    for (const cat of fm.categories_data) {
      const slug = cat.slug;
      const label = cat.label || slug;
      
      if (slug) {
        // Parent category page
        const catDir = path.join(runsDir, slug);
        const catTemplate = generateCategoryPageTemplate(gameId, gameName, slug, label);
        
        if (ensureIndexPage(catDir, catTemplate, checkOnly, forceOverwrite)) {
          missingCount++;
        }

        // Child categories
        if (cat.children && Array.isArray(cat.children)) {
          for (const child of cat.children) {
            const childSlug = child.slug;
            const childLabel = child.label || childSlug;
            
            if (childSlug) {
              const fullSlug = `${slug}/${childSlug}`;
              const childDir = path.join(catDir, childSlug);
              const childTemplate = generateCategoryPageTemplate(gameId, gameName, fullSlug, childLabel);
              
              if (ensureIndexPage(childDir, childTemplate, checkOnly, forceOverwrite)) {
                missingCount++;
              }
            }
          }
        }
      }
    }
  }

  if (checkOnly && missingCount > 0) {
    console.log(`\n${gameId}: ${missingCount} missing page(s)`);
  } else if (!checkOnly) {
    console.log(`${gameId}: Done.`);
  }

  return missingCount === 0;
}

// ============================================================
// CLI
// ============================================================
function main() {
  const args = process.argv.slice(2);
  let targetGame = null;
  let checkOnly = false;
  let forceOverwrite = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--game' && args[i + 1]) {
      targetGame = args[i + 1];
      i++;
    } else if (args[i] === '--check') {
      checkOnly = true;
    } else if (args[i] === '--force') {
      forceOverwrite = true;
    }
  }

  if (targetGame) {
    // Generate for specific game
    const success = generateGamePages(targetGame, checkOnly, forceOverwrite);
    if (checkOnly && !success) {
      process.exit(1);
    }
  } else {
    // Generate for all games
    if (!isDir(GAMES_DIR)) {
      console.error(`Games directory not found: ${GAMES_DIR}`);
      process.exit(1);
    }

    const gameFiles = fs.readdirSync(GAMES_DIR)
      .filter(f => f.endsWith('.md') && f.toLowerCase() !== 'readme.md');

    if (gameFiles.length === 0) {
      console.log('No game files found.');
      return;
    }

    let allSuccess = true;
    for (const file of gameFiles) {
      const gameId = file.replace('.md', '');
      const success = generateGamePages(gameId, checkOnly, forceOverwrite);
      if (!success) allSuccess = false;
    }

    if (checkOnly && !allSuccess) {
      console.log('\nRun without --check to create missing pages.');
      process.exit(1);
    }
  }

  if (!checkOnly) {
    console.log('\nAll game pages generated successfully.');
  }
}

main();

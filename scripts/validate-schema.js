#!/usr/bin/env node
/**
 * Repo schema validation (read-only).
 *
 * Checks:
 *   - Windows-unsafe characters in filenames/folders (currently: < and >)
 *   - _data/genres.yml and _data/challenges.yml load and have sane shapes
 *   - _games/*.md: required fields + genres/challenge references exist (with alias resolution)
 *   - _games/*.md: categories_data (parents + optional children) validated
 *   - _runners/*.md: required fields + referenced games exist
 *   - _runs/*.md (excluding _TEMPLATES): required fields + references exist (with alias resolution)
 *   - _runs/*.md: if a game defines categories_data, category_slug must match it (with prefix allowance)
 */

const fs = require('fs');
const path = require('path');

// Import shared utilities
const {
  parseFrontMatter,
  loadYamlFile,
  isDir,
  isFile,
  listFilesRecursive,
  readText,
  rel,
} = require('./lib');

const {
  ID_RE,
  CATEGORY_SLUG_RE,
  TIER_SET,
} = require('./lib/validators/constants');

const {
  mustSlug,
  mustString,
  mustArrayOfStrings,
  mustTimeOrNull,
  mustTimingOrNull,
  mustDate,
  mustCategorySlug,
} = require('./lib/validators/field-validators');

const ROOT = process.cwd();

// ============================================================
// Error helpers
// ============================================================
function die(msg) {
  console.error('\n❌ Validation Error:\n');
  console.error(msg);
  console.error('\n💡 Tip: Run `node scripts/diagnose-game.js <game-id>` for detailed info\n');
  throw new Error(msg);
}

function warn(msg) {
  console.log(`WARN ${msg}`);
}

// ============================================================
// Alias resolution helpers
// ============================================================
function normKey(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[_]+/g, ' ')
    .replace(/[-]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function keyVariants(s) {
  const k = normKey(s);
  if (!k) return [];
  const noSpaces = k.replace(/\s+/g, '');
  return noSpaces && noSpaces !== k ? [k, noSpaces] : [k];
}

function buildResolver(kindName, yamlObj, filePathRelForErrors) {
  if (!yamlObj || typeof yamlObj !== 'object' || Array.isArray(yamlObj)) {
    die(`${filePathRelForErrors}: must be a YAML mapping (id -> object)`);
  }

  const ids = new Set(Object.keys(yamlObj));
  const keyToId = new Map();

  function registerKey(key, id) {
    if (!key) return;
    if (keyToId.has(key) && keyToId.get(key) !== id) {
      warn(
        `${filePathRelForErrors}: ${kindName} alias/label key "${key}" is ambiguous between "${keyToId.get(key)}" and "${id}". Keep aliases unique if possible.`
      );
      return;
    }
    keyToId.set(key, id);
  }

  for (const [id, obj] of Object.entries(yamlObj)) {
    if (!ID_RE.test(id)) die(`${filePathRelForErrors}: invalid id ${JSON.stringify(id)}`);
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      die(`${filePathRelForErrors}: ${id} must map to an object`);
    }
    if (typeof obj.label !== 'string' || !obj.label.trim()) {
      die(`${filePathRelForErrors}: ${id}.label is required`);
    }

    for (const v of keyVariants(id)) registerKey(v, id);
    for (const v of keyVariants(obj.label)) registerKey(v, id);

    if (obj.aliases != null) {
      if (!Array.isArray(obj.aliases)) die(`${filePathRelForErrors}: ${id}.aliases must be a list`);
      for (const a of obj.aliases) {
        if (typeof a !== 'string' || !a.trim()) die(`${filePathRelForErrors}: ${id}.aliases must be strings`);
        for (const v of keyVariants(a)) registerKey(v, id);
      }
    }
  }

  function resolve(rawValue) {
    const raw = String(rawValue).trim();
    if (!raw) return null;

    if (ids.has(raw)) return { id: raw, source: 'id', canonical: raw };

    for (const v of keyVariants(raw)) {
      const hit = keyToId.get(v);
      if (hit) {
        const source = hit === raw ? 'id' : 'alias';
        return { id: hit, source, canonical: hit };
      }
    }

    return null;
  }

  return { ids, resolve };
}

// ============================================================
// Validations
// ============================================================
function validateWindowsUnsafeNames() {
  const all = listFilesRecursive(ROOT);
  const bad = [];

  for (const p of all) {
    const r = rel(p, ROOT);
    if (r.startsWith('node_modules/')) continue;

    const parts = r.split('/');
    for (const part of parts) {
      if (part.includes('<') || part.includes('>')) {
        bad.push(r);
        break;
      }
    }
  }

  if (bad.length) {
    die(
      `Windows-unsafe path characters detected (< or >). Fix these paths:\n` + bad.map(x => `  - ${x}`).join('\n')
    );
  }
}

function validateDataFiles() {
  const genresPath = path.join(ROOT, '_data', 'genres.yml');
  const challengesPath = path.join(ROOT, '_data', 'challenges.yml');
  const platformsPath = path.join(ROOT, '_data', 'platforms.yml');

  if (!isFile(genresPath)) die('Missing _data/genres.yml');
  if (!isFile(challengesPath)) die('Missing _data/challenges.yml');
  if (!isFile(platformsPath)) die('Missing _data/platforms.yml');

  const genres = loadYamlFile(genresPath);
  const challenges = loadYamlFile(challengesPath);
  const platforms = loadYamlFile(platformsPath);

  const genresRel = rel(genresPath);
  const challengesRel = rel(challengesPath);
  const platformsRel = rel(platformsPath);

  const genresResolver = buildResolver('genres', genres, genresRel);
  const challengeResolver = buildResolver('challenge', challenges, challengesRel);
  const platformResolver = buildResolver('platform', platforms, platformsRel);

  return { genresResolver, challengeResolver, platformResolver };
}

/**
 * Validate categories_data schema in game front matter
 */
function validateCategoriesData(fileRel, fm) {
  if (fm.categories_data == null) return;

  if (!Array.isArray(fm.categories_data)) {
    die(`${fileRel}: categories_data must be a YAML list`);
  }

  const parentSeen = new Set();
  const fullSeen = new Set();

  for (const [idx, cat] of fm.categories_data.entries()) {
    if (!cat || typeof cat !== 'object' || Array.isArray(cat)) {
      die(`${fileRel}: categories_data[${idx}] must be an object`);
    }

    if (typeof cat.slug !== 'string' || !cat.slug.trim()) {
      die(`${fileRel}: categories_data[${idx}].slug is required`);
    }
    const pslug = cat.slug.trim();

    if (pslug.includes('/')) {
      die(`${fileRel}: categories_data[${idx}].slug must be a top-level slug only (no "/"): ${JSON.stringify(pslug)}`);
    }

    mustCategorySlug(fileRel, `categories_data[${idx}].slug`, pslug);

    if (cat.label != null) {
      if (typeof cat.label !== 'string' || !cat.label.trim()) {
        die(`${fileRel}: categories_data[${idx}].label must be a non-empty string if provided`);
      }
    }

    if (parentSeen.has(pslug)) {
      die(`${fileRel}: duplicate categories_data parent slug: ${pslug}`);
    }
    parentSeen.add(pslug);

    if (fullSeen.has(pslug)) {
      die(`${fileRel}: duplicate category slug: ${pslug}`);
    }
    fullSeen.add(pslug);

    if (cat.children == null) continue;

    if (!Array.isArray(cat.children)) {
      die(`${fileRel}: categories_data[${idx}].children must be a YAML list`);
    }

    const childSeen = new Set();

    for (const [cidx, ch] of cat.children.entries()) {
      if (!ch || typeof ch !== 'object' || Array.isArray(ch)) {
        die(`${fileRel}: categories_data[${idx}].children[${cidx}] must be an object`);
      }

      if (typeof ch.slug !== 'string' || !ch.slug.trim()) {
        die(`${fileRel}: categories_data[${idx}].children[${cidx}].slug is required`);
      }
      const cslug = ch.slug.trim();

      if (cslug.includes('/')) {
        die(`${fileRel}: categories_data[${idx}].children[${cidx}].slug must be a single segment (no "/"): ${JSON.stringify(cslug)}`);
      }

      mustCategorySlug(fileRel, `categories_data[${idx}].children[${cidx}].slug`, cslug);

      if (ch.label != null) {
        if (typeof ch.label !== 'string' || !ch.label.trim()) {
          die(`${fileRel}: categories_data[${idx}].children[${cidx}].label must be a non-empty string if provided`);
        }
      }

      if (childSeen.has(cslug)) {
        die(`${fileRel}: duplicate child slug under ${pslug}: ${cslug}`);
      }
      childSeen.add(cslug);

      const full = `${pslug}/${cslug}`;
      if (fullSeen.has(full)) {
        die(`${fileRel}: duplicate full category slug: ${full}`);
      }
      fullSeen.add(full);
    }
  }
}

/**
 * Validate a single tier's category array (full_runs, mini_challenges, player_made)
 * @param {string} fileRel - Relative file path for error messages
 * @param {string} tierKey - Tier key (e.g., "full_runs")
 * @param {Array} tierData - Array of category objects
 * @param {Set} globalSeen - Set of all category slugs seen across all tiers (for duplicate detection)
 */
function validateTierCategoryArray(fileRel, tierKey, tierData, globalSeen) {
  if (tierData == null) return;

  if (!Array.isArray(tierData)) {
    die(`${fileRel}: ${tierKey} must be a YAML list`);
  }

  const parentSeen = new Set();

  for (const [idx, cat] of tierData.entries()) {
    if (!cat || typeof cat !== 'object' || Array.isArray(cat)) {
      die(`${fileRel}: ${tierKey}[${idx}] must be an object`);
    }

    if (typeof cat.slug !== 'string' || !cat.slug.trim()) {
      die(`${fileRel}: ${tierKey}[${idx}].slug is required`);
    }
    const pslug = cat.slug.trim();

    if (pslug.includes('/')) {
      die(`${fileRel}: ${tierKey}[${idx}].slug must be a top-level slug only (no "/"): ${JSON.stringify(pslug)}`);
    }

    mustCategorySlug(fileRel, `${tierKey}[${idx}].slug`, pslug);

    if (cat.label != null) {
      if (typeof cat.label !== 'string' || !cat.label.trim()) {
        die(`${fileRel}: ${tierKey}[${idx}].label must be a non-empty string if provided`);
      }
    }

    if (parentSeen.has(pslug)) {
      die(`${fileRel}: duplicate ${tierKey} parent slug: ${pslug}`);
    }
    parentSeen.add(pslug);

    if (globalSeen.has(pslug)) {
      die(`${fileRel}: duplicate category slug across tiers: ${pslug}`);
    }
    globalSeen.add(pslug);

    // Validate player_made specific fields
    if (tierKey === 'player_made') {
      if (cat.creator != null && (typeof cat.creator !== 'string' || !cat.creator.trim())) {
        die(`${fileRel}: ${tierKey}[${idx}].creator must be a non-empty string if provided`);
      }
    }

    // Validate children (nested categories)
    if (cat.children == null) continue;

    if (!Array.isArray(cat.children)) {
      die(`${fileRel}: ${tierKey}[${idx}].children must be a YAML list`);
    }

    const childSeen = new Set();

    for (const [cidx, ch] of cat.children.entries()) {
      if (!ch || typeof ch !== 'object' || Array.isArray(ch)) {
        die(`${fileRel}: ${tierKey}[${idx}].children[${cidx}] must be an object`);
      }

      if (typeof ch.slug !== 'string' || !ch.slug.trim()) {
        die(`${fileRel}: ${tierKey}[${idx}].children[${cidx}].slug is required`);
      }
      const cslug = ch.slug.trim();

      if (cslug.includes('/')) {
        die(`${fileRel}: ${tierKey}[${idx}].children[${cidx}].slug must be a single segment (no "/"): ${JSON.stringify(cslug)}`);
      }

      mustCategorySlug(fileRel, `${tierKey}[${idx}].children[${cidx}].slug`, cslug);

      if (ch.label != null) {
        if (typeof ch.label !== 'string' || !ch.label.trim()) {
          die(`${fileRel}: ${tierKey}[${idx}].children[${cidx}].label must be a non-empty string if provided`);
        }
      }

      if (childSeen.has(cslug)) {
        die(`${fileRel}: duplicate child slug under ${pslug}: ${cslug}`);
      }
      childSeen.add(cslug);

      const full = `${pslug}/${cslug}`;
      if (globalSeen.has(full)) {
        die(`${fileRel}: duplicate full category slug across tiers: ${full}`);
      }
      globalSeen.add(full);
    }
  }
}

/**
 * Validate tiered category structure (full_runs, mini_challenges, player_made)
 */
function validateTieredCategories(fileRel, fm) {
  const hasTieredStructure = fm.full_runs != null || fm.mini_challenges != null || fm.player_made != null;
  
  if (!hasTieredStructure) return;

  // Warn if both old and new structure exist
  if (fm.categories_data != null) {
    warn(`${fileRel}: has both categories_data (legacy) and tiered categories. Consider removing categories_data.`);
  }

  const globalSeen = new Set();

  validateTierCategoryArray(fileRel, 'full_runs', fm.full_runs, globalSeen);
  validateTierCategoryArray(fileRel, 'mini_challenges', fm.mini_challenges, globalSeen);
  validateTierCategoryArray(fileRel, 'player_made', fm.player_made, globalSeen);
}

/**
 * Build an index of allowed category slugs per game_id from _games/*.md
 * Supports both legacy categories_data and new tiered structure (full_runs, mini_challenges, player_made)
 */
function buildGameCategoryIndex() {
  const dir = path.join(ROOT, '_games');
  const map = new Map();

  if (!isDir(dir)) return map;

  const files = fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .map(f => path.join(dir, f));

  /**
   * Helper to extract slugs from a category array (works for any tier or categories_data)
   */
  function extractSlugsFromArray(catArray, exact, prefixes) {
    if (!Array.isArray(catArray)) return;
    
    for (const cat of catArray) {
      if (!cat || typeof cat !== 'object') continue;
      const parent = typeof cat.slug === 'string' ? cat.slug.trim() : '';
      if (!parent) continue;

      exact.add(parent);
      prefixes.push(`${parent}/`);

      if (Array.isArray(cat.children)) {
        for (const ch of cat.children) {
          if (!ch || typeof ch !== 'object') continue;
          const child = typeof ch.slug === 'string' ? ch.slug.trim() : '';
          if (!child) continue;

          const full = `${parent}/${child}`;
          exact.add(full);
          prefixes.push(`${full}/`);
        }
      }
    }
  }

  for (const p of files) {
    const content = readText(p);
    const { data: fm } = parseFrontMatter(content);
    const gameId = typeof fm.game_id === 'string' ? fm.game_id.trim() : '';
    if (!gameId) continue;

    const hasTieredStructure = fm.full_runs != null || fm.mini_challenges != null || fm.player_made != null;
    const hasLegacyCategories = Array.isArray(fm.categories_data) && fm.categories_data.length > 0;

    const entry = {
      hasCategoriesData: hasTieredStructure || hasLegacyCategories,
      hasTieredStructure,
      exact: new Set(),
      prefixes: [],
      // Map tier -> Set of slugs for tier-aware validation
      tierSlugs: {
        full_runs: new Set(),
        mini_challenges: new Set(),
        player_made: new Set(),
      },
    };

    // Extract from tiered structure
    if (hasTieredStructure) {
      for (const tierKey of ['full_runs', 'mini_challenges', 'player_made']) {
        const tierData = fm[tierKey];
        if (Array.isArray(tierData)) {
          extractSlugsFromArray(tierData, entry.exact, entry.prefixes);
          // Also track which slugs belong to which tier
          for (const cat of tierData) {
            if (!cat || typeof cat !== 'object') continue;
            const parent = typeof cat.slug === 'string' ? cat.slug.trim() : '';
            if (parent) {
              entry.tierSlugs[tierKey].add(parent);
              if (Array.isArray(cat.children)) {
                for (const ch of cat.children) {
                  if (!ch || typeof ch !== 'object') continue;
                  const child = typeof ch.slug === 'string' ? ch.slug.trim() : '';
                  if (child) {
                    entry.tierSlugs[tierKey].add(`${parent}/${child}`);
                  }
                }
              }
            }
          }
        }
      }
    }

    // Extract from legacy categories_data (treat as full_runs)
    if (hasLegacyCategories && !hasTieredStructure) {
      extractSlugsFromArray(fm.categories_data, entry.exact, entry.prefixes);
      // Legacy categories are considered full_runs
      for (const cat of fm.categories_data) {
        if (!cat || typeof cat !== 'object') continue;
        const parent = typeof cat.slug === 'string' ? cat.slug.trim() : '';
        if (parent) {
          entry.tierSlugs.full_runs.add(parent);
          if (Array.isArray(cat.children)) {
            for (const ch of cat.children) {
              if (!ch || typeof ch !== 'object') continue;
              const child = typeof ch.slug === 'string' ? ch.slug.trim() : '';
              if (child) {
                entry.tierSlugs.full_runs.add(`${parent}/${child}`);
              }
            }
          }
        }
      }
    }

    map.set(gameId, entry);
  }

  return map;
}

function validateGames({ genresResolver, challengeResolver, platformResolver }) {
  const dir = path.join(ROOT, '_games');
  if (!isDir(dir)) return new Set();

  const files = fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .map(f => path.join(dir, f));

  const gameIds = new Set();

  for (const p of files) {
    const fileRel = rel(p, ROOT);

    // Skip template files
    if (fileRel.includes('_TEMPLATES/') || fileRel.includes('template')) continue;

    const content = readText(p);
    const { data: fm, hasFrontMatter } = parseFrontMatter(content);

    if (!hasFrontMatter) {
      die(`${fileRel}: Missing YAML front matter (--- ... ---).`);
    }

    mustSlug(fileRel, 'game_id', fm.game_id);
    
    // Support both game_name (new) and name (legacy)
    const gameName = fm.game_name || fm.name;
    if (!gameName || typeof gameName !== 'string' || !gameName.trim()) {
      die(`${fileRel}: game_name is required (or legacy 'name' field)`);
    }

    validateCategoriesData(fileRel, fm);
    validateTieredCategories(fileRel, fm);

    if (gameIds.has(fm.game_id)) die(`${fileRel}: duplicate game_id ${fm.game_id}`);
    gameIds.add(fm.game_id);

    // Validate genres
    if (fm.genres != null) {
      mustArrayOfStrings(fileRel, 'genres', fm.genres);
      for (const t of fm.genres) {
        const r = genresResolver.resolve(t);
        if (!r) {
          warn(`${fileRel}: unknown tag in genres: ${t} (will need review/approval)`);
          continue;
        }
        if (r.source !== 'id' && r.canonical !== t) {
          warn(`${fileRel}: genres "${t}" should be "${r.canonical}" (canonical id)`);
        }
      }
    }

    // Validate platforms (FIXED: was using 't' instead of 'p')
    if (fm.platforms != null) {
      mustArrayOfStrings(fileRel, 'platforms', fm.platforms);
      for (const p of fm.platforms) {
        const r = platformResolver.resolve(p);
        if (!r) {
          warn(`${fileRel}: unknown platform in platforms: ${p} (will need review/approval)`);
          continue;
        }
        if (r.source !== 'id' && r.canonical !== p) {
          warn(`${fileRel}: platform "${p}" should be "${r.canonical}" (canonical id)`);
        }
      }
    }

    // Validate challenges (FIXED: was using 't' instead of 'c')
    if (fm.challenges != null) {
      mustArrayOfStrings(fileRel, 'challenges', fm.challenges);
      for (const c of fm.challenges) {
        const r = challengeResolver.resolve(c);
        if (!r) {
          warn(`${fileRel}: unknown challenge in challenges: ${c} (will need review/approval)`);
          continue;
        }
        if (r.source !== 'id' && r.canonical !== c) {
          warn(`${fileRel}: challenge "${c}" should be "${r.canonical}" (canonical id)`);
        }
      }
    }

    // Validate glitches_data (optional)
    if (fm.glitches_data != null) {
      if (!Array.isArray(fm.glitches_data)) {
        die(`${fileRel}: glitches_data must be a YAML list`);
      }
      for (const [idx, glitch] of fm.glitches_data.entries()) {
        if (!glitch || typeof glitch !== 'object' || Array.isArray(glitch)) {
          die(`${fileRel}: glitches_data[${idx}] must be an object`);
        }
        if (typeof glitch.slug !== 'string' || !glitch.slug.trim()) {
          die(`${fileRel}: glitches_data[${idx}].slug is required`);
        }
        if (!ID_RE.test(glitch.slug)) {
          die(`${fileRel}: glitches_data[${idx}].slug must be kebab-case`);
        }
        if (glitch.label != null && (typeof glitch.label !== 'string' || !glitch.label.trim())) {
          die(`${fileRel}: glitches_data[${idx}].label must be a non-empty string if provided`);
        }
      }
    }

    // Validate restrictions (optional array)
    if (fm.restrictions != null) {
      if (!Array.isArray(fm.restrictions)) {
        die(`${fileRel}: restrictions must be a YAML list`);
      }
      for (const r of fm.restrictions) {
        if (typeof r !== 'string' || !r.trim()) {
          die(`${fileRel}: restrictions must contain only non-empty strings`);
        }
      }
    }

    // Validate character_column (optional)
    if (fm.character_column != null) {
      if (typeof fm.character_column !== 'object' || Array.isArray(fm.character_column)) {
        die(`${fileRel}: character_column must be an object`);
      }
      if (fm.character_column.enabled != null && typeof fm.character_column.enabled !== 'boolean') {
        die(`${fileRel}: character_column.enabled must be a boolean`);
      }
      if (fm.character_column.label != null && (typeof fm.character_column.label !== 'string' || !fm.character_column.label.trim())) {
        die(`${fileRel}: character_column.label must be a non-empty string`);
      }
    }

    // Validate timing_method (optional)
    if (fm.timing_method != null && (typeof fm.timing_method !== 'string' || !fm.timing_method.trim())) {
      die(`${fileRel}: timing_method must be a non-empty string if provided`);
    }

    // Validate game_name_aliases (or legacy name_aliases)
    const gameNameAliases = fm.game_name_aliases || fm.name_aliases;
    if (gameNameAliases != null) {
      if (!Array.isArray(gameNameAliases)) {
        die(`${fileRel}: game_name_aliases must be a YAML list`);
      }
      for (const alias of gameNameAliases) {
        if (typeof alias !== 'string' || !alias.trim()) {
          die(`${fileRel}: game_name_aliases must contain only non-empty strings`);
        }
      }
    }
  }
    
  return gameIds;
}

function validateRunners(gameIds) {
  const dir = path.join(ROOT, '_runners');
  if (!isDir(dir)) return new Set();

  const files = fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => path.join(dir, f));

  const runnerIds = new Set();

  for (const p of files) {
    const fileRel = rel(p, ROOT);
    const content = readText(p);
    const { data: fm, hasFrontMatter } = parseFrontMatter(content);

    if (!hasFrontMatter) {
      die(`${fileRel}: Missing YAML front matter (--- ... ---).`);
    }

    mustSlug(fileRel, 'runner_id', fm.runner_id);
    mustString(fileRel, 'name', fm.name);

    if (runnerIds.has(fm.runner_id)) die(`${fileRel}: duplicate runner_id ${fm.runner_id}`);
    runnerIds.add(fm.runner_id);

    if (fm.games != null) {
      mustArrayOfStrings(fileRel, 'games', fm.games);
      for (const g of fm.games) {
        if (!gameIds.has(g)) die(`${fileRel}: unknown game_id in games: ${g}`);
      }
    }
  }

  return runnerIds;
}

function validateRuns({ gameIds, runnerIds, challengeResolver, gameCategoryIndex }) {
  const dir = path.join(ROOT, '_runs');
  if (!isDir(dir)) return;

  const files = listFilesRecursive(dir)
    .filter(p => p.endsWith('.md'))
    .filter(p => !rel(p, ROOT).includes('/_TEMPLATES/'))
    .filter(p => path.basename(p).toLowerCase() !== 'readme.md');

  for (const p of files) {
    const fileRel = rel(p, ROOT);
    const content = readText(p);
    const { data: fm, hasFrontMatter } = parseFrontMatter(content);

    if (!hasFrontMatter) {
      die(`${fileRel}: Missing YAML front matter (--- ... ---).`);
    }

    // Required slug fields
    mustSlug(fileRel, 'game_id', fm.game_id);
    mustSlug(fileRel, 'runner_id', fm.runner_id);
    mustCategorySlug(fileRel, 'category_slug', fm.category_slug);

    // Date field - accept either date_completed or date (legacy)
    const hasDate = fm.date_completed || fm.date;
    if (!hasDate) {
      die(`${fileRel}: date_completed (or date) is required`);
    }

    // Human-readable fields are optional (can be derived from slugs)
    // Only validate if present
    if (fm.runner !== undefined && fm.runner !== null && fm.runner !== '') {
      if (typeof fm.runner !== 'string') {
        die(`${fileRel}: runner must be a string if provided`);
      }
    }
    if (fm.category !== undefined && fm.category !== null && fm.category !== '') {
      if (typeof fm.category !== 'string') {
        die(`${fileRel}: category must be a string if provided`);
      }
    }

    if (!gameIds.has(fm.game_id)) die(`${fileRel}: unknown game_id: ${fm.game_id}`);
    if (!runnerIds.has(fm.runner_id)) die(`${fileRel}: unknown runner_id: ${fm.runner_id}`);

    // Enforce category_slug is defined when categories_data exists for that game.
    const idx = gameCategoryIndex.get(fm.game_id);
    if (idx && idx.hasCategoriesData) {
      const slug = String(fm.category_slug || '').trim();

      const okExact = idx.exact.has(slug);

      let okPrefix = false;
      if (!okExact && slug) {
        for (const pref of idx.prefixes) {
          if (slug.startsWith(pref)) {
            okPrefix = true;
            break;
          }
        }
      }

      if (!okExact && !okPrefix) {
        const allowedPreview = Array.from(idx.exact).sort().slice(0, 20).join(', ');
        die(
          `${fileRel}: category_slug "${slug}" is not defined by _games/${fm.game_id}.md categories. ` +
            `Allowed include: ${allowedPreview}${idx.exact.size > 20 ? ', ...' : ''}`
        );
      }

      // Validate category_tier if present and game uses tiered structure
      const tier = fm.category_tier;
      if (tier != null && tier !== '') {
        const tierStr = String(tier).trim();
        
        // Validate tier value
        if (!TIER_SET.has(tierStr)) {
          die(`${fileRel}: category_tier must be one of: full_runs, mini_challenges, player_made. Got: ${tier}`);
        }

        // If game has tiered structure, validate that slug belongs to the specified tier
        if (idx.hasTieredStructure && idx.tierSlugs) {
          const tierSlugs = idx.tierSlugs[tierStr];
          if (tierSlugs && !tierSlugs.has(slug)) {
            // Check if slug exists in a different tier
            let actualTier = null;
            for (const [t, slugs] of Object.entries(idx.tierSlugs)) {
              if (slugs.has(slug)) {
                actualTier = t;
                break;
              }
            }
            if (actualTier) {
              warn(`${fileRel}: category_tier is "${tierStr}" but category_slug "${slug}" belongs to "${actualTier}"`);
            }
          }
        }
      }
    }

    // Challenge validation: support both new (standard_challenges + community_challenge) and legacy (challenge_id)
    const hasStandardChallenges = Array.isArray(fm.standard_challenges) && fm.standard_challenges.length > 0;
    const hasCommunityChallenge = fm.community_challenge && typeof fm.community_challenge === 'string' && fm.community_challenge.trim();
    const hasLegacyChallengeId = fm.challenge_id && typeof fm.challenge_id === 'string' && fm.challenge_id.trim();
    
    if (!hasStandardChallenges && !hasCommunityChallenge && !hasLegacyChallengeId) {
      die(`${fileRel}: At least one of standard_challenges, community_challenge, or challenge_id is required`);
    }
    
    // Validate standard_challenges array
    if (hasStandardChallenges) {
      for (const ch of fm.standard_challenges) {
        if (typeof ch !== 'string' || !ch.trim()) {
          die(`${fileRel}: standard_challenges must contain only non-empty strings`);
        }
        const cr = challengeResolver.resolve(ch);
        if (!cr) {
          warn(`${fileRel}: unknown challenge in standard_challenges: ${ch}`);
        } else if (cr.source !== 'id' && cr.canonical !== ch) {
          warn(`${fileRel}: standard_challenges "${ch}" should be "${cr.canonical}" (canonical id)`);
        }
      }
    }
    
    // Validate legacy challenge_id if present
    if (hasLegacyChallengeId) {
      const cr = challengeResolver.resolve(fm.challenge_id);
      if (!cr) {
        warn(`${fileRel}: unknown challenge_id: ${fm.challenge_id}`);
      } else if (cr.source !== 'id' && cr.canonical !== fm.challenge_id) {
        warn(`${fileRel}: challenge_id "${fm.challenge_id}" should be "${cr.canonical}" (canonical id)`);
      }
    }

    if (fm.restrictions != null) {
      mustArrayOfStrings(fileRel, 'restrictions', fm.restrictions);
    }
    if (fm.restriction_ids != null) {
      mustArrayOfStrings(fileRel, 'restriction_ids', fm.restriction_ids);
      for (const rid of fm.restriction_ids) {
        if (!ID_RE.test(rid)) die(`${fileRel}: restriction_ids must be kebab-case (bad: ${rid})`);
      }
    }
    if (Array.isArray(fm.restrictions) && Array.isArray(fm.restriction_ids)) {
      if (fm.restrictions.length !== fm.restriction_ids.length) {
        die(`${fileRel}: restrictions and restriction_ids must have the same length`);
      }
    }

    if ('time_primary' in fm) mustTimeOrNull(fileRel, 'time_primary', fm.time_primary);
    if ('time_secondary' in fm) mustTimeOrNull(fileRel, 'time_secondary', fm.time_secondary);
    if ('timing_method_primary' in fm) mustTimingOrNull(fileRel, 'timing_method_primary', fm.timing_method_primary);
    if ('timing_method_secondary' in fm) mustTimingOrNull(fileRel, 'timing_method_secondary', fm.timing_method_secondary);

    if ('verified' in fm) {
      if (typeof fm.verified !== 'boolean') die(`${fileRel}: verified must be boolean`);
      if (fm.verified === true) {
        mustString(fileRel, 'verified_by', fm.verified_by);
      }
    }

    // Support both video_url (new) and video_link (legacy)
    const videoUrl = fm.video_url || fm.video_link;
    if (videoUrl != null) {
      if (typeof videoUrl !== 'string' || !/^https?:\/\//i.test(videoUrl)) {
        die(`${fileRel}: video_url must be an http(s) URL`);
      }
    } else {
      warn(`${fileRel}: video_url missing`);
    }

    // Optional filename pattern warning (do not fail)
    const base = path.basename(p);
    const m = /^(\d{4}-\d{2}-\d{2})__([a-z0-9-]+)__([a-z0-9-]+)__([a-z0-9-]+)__([0-9]{2,3})\.md$/.exec(base);
    if (!m) {
      warn(`${fileRel}: filename does not match expected pattern`);
    }
  }
}

// ============================================================
// Main
// ============================================================
function main() {
  validateWindowsUnsafeNames();

  const { genresResolver, challengeResolver, platformResolver } = validateDataFiles();
  const gameCategoryIndex = buildGameCategoryIndex();

  const gameIds = validateGames({ genresResolver, challengeResolver, platformResolver });
  const runnerIds = validateRunners(gameIds);

  validateRuns({ gameIds, runnerIds, challengeResolver, gameCategoryIndex });

  console.log('OK schema validation passed');
}

main();

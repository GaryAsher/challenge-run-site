#!/usr/bin/env node
/**
 * Repo schema validation (read-only).
 *
 * Key feature:
 * - Challenge + tag alias resolution:
 *   Accepts canonical IDs, labels, and aliases (plus common formatting variations),
 *   but warns when non-canonical values are used and suggests the canonical ID.
 *
 * Checks:
 *   - Windows-unsafe characters in filenames/folders (currently: < and >)
 *   - _data/genres.yml and _data/challenges.yml load and have sane shapes
 *   - _games/*.md: required fields + tag/challenge references exist (with alias resolution)
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
  const tagsPath = path.join(ROOT, '_data', 'tags.yml');
  const challengesPath = path.join(ROOT, '_data', 'challenges.yml');
  const platformsPath = path.join(ROOT, '_data', 'platforms.yml');

  if (!isFile(tagsPath)) die('Missing _data/tags.yml');
  if (!isFile(challengesPath)) die('Missing _data/challenges.yml');
  if (!isFile(platformsPath)) die('Missing _data/platforms.yml');

  const tags = loadYamlFile(tagsPath);
  const challenges = loadYamlFile(challengesPath);
  const platforms = loadYamlFile(platformsPath);

  const tagsRel = rel(tagsPath);
  const challengesRel = rel(challengesPath);
  const platformsRel = rel(platformsPath);

  const tagResolver = buildResolver('tag', tags, tagsRel);
  const challengeResolver = buildResolver('challenge', challenges, challengesRel);
  const platformResolver = buildResolver('platform', platforms, platformsRel);

  return { tagResolver, challengeResolver, platformResolver };
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
 * Build an index of allowed category slugs per game_id from _games/*.md categories_data.
 */
function buildGameCategoryIndex() {
  const dir = path.join(ROOT, '_games');
  const map = new Map();

  if (!isDir(dir)) return map;

  const files = fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.md') && f !== 'README.md')
    .map(f => path.join(dir, f));

  for (const p of files) {
    const content = readText(p);
    const { data: fm } = parseFrontMatter(content);
    const gameId = typeof fm.game_id === 'string' ? fm.game_id.trim() : '';
    if (!gameId) continue;

    const entry = {
      hasCategoriesData: Array.isArray(fm.categories_data) && fm.categories_data.length > 0,
      exact: new Set(),
      prefixes: [],
    };

    if (entry.hasCategoriesData) {
      for (const cat of fm.categories_data) {
        if (!cat || typeof cat !== 'object') continue;
        const parent = typeof cat.slug === 'string' ? cat.slug.trim() : '';
        if (!parent) continue;

        entry.exact.add(parent);
        entry.prefixes.push(`${parent}/`);

        if (Array.isArray(cat.children)) {
          for (const ch of cat.children) {
            if (!ch || typeof ch !== 'object') continue;
            const child = typeof ch.slug === 'string' ? ch.slug.trim() : '';
            if (!child) continue;

            const full = `${parent}/${child}`;
            entry.exact.add(full);
            entry.prefixes.push(`${full}/`);
          }
        }
      }
    }

    map.set(gameId, entry);
  }

  return map;
}

function validateGames({ tagResolver, challengeResolver }) {
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
    mustString(fileRel, 'name', fm.name);

    validateCategoriesData(fileRel, fm);

    if (gameIds.has(fm.game_id)) die(`${fileRel}: duplicate game_id ${fm.game_id}`);
    gameIds.add(fm.game_id);

    if (fm.genres != null) {
      mustArrayOfStrings(fileRel, 'genres', fm.genres);
      for (const t of fm.genres) {
        const r = tagResolver.resolve(t);
        if (!r) die(`${fileRel}: unknown tag in genres: ${t}`);
        if (r.source !== 'id' && r.canonical !== t) {
          warn(`${fileRel}: tag "${t}" should be "${r.canonical}" (canonical id)`);
        }
      }
    }

    if (fm.platforms != null) {
      mustArrayOfStrings(fileRel, 'platforms', fm.platforms);
      for (const p of fm.platforms) {
        const r = platformResolver.resolve(p);
        if (!r) die(`${fileRel}: unknown platform in platforms: ${p}`);
        if (r.source !== 'id' && r.canonical !== p) {
          warn(`${fileRel}: platform "${p}" should be "${r.canonical}" (canonical id)`);
        }
      }
    }

    if (fm.challenges != null) {
      mustArrayOfStrings(fileRel, 'challenges', fm.challenges);
      for (const c of fm.challenges) {
        const r = challengeResolver.resolve(c);
        if (!r) die(`${fileRel}: unknown challenge in challenges: ${c}`);
        if (r.source !== 'id' && r.canonical !== c) {
          warn(`${fileRel}: challenge "${c}" should be "${r.canonical}" (canonical id)`);
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

    mustSlug(fileRel, 'game_id', fm.game_id);
    mustSlug(fileRel, 'runner_id', fm.runner_id);
    mustCategorySlug(fileRel, 'category_slug', fm.category_slug);

    mustString(fileRel, 'runner', fm.runner);
    mustString(fileRel, 'category', fm.category);
    mustDate(fileRel, 'date_completed', fm.date_completed);

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
          `${fileRel}: category_slug "${slug}" is not defined by _games/${fm.game_id}.md categories_data. ` +
            `Allowed include: ${allowedPreview}${idx.exact.size > 20 ? ', ...' : ''}`
        );
      }
    }

    // challenge_id: allow aliases/labels
    if (fm.challenge_id === undefined || fm.challenge_id === null) {
      die(`${fileRel}: challenge_id is required`);
    }
    if (typeof fm.challenge_id !== 'string' || !fm.challenge_id.trim()) {
      die(`${fileRel}: challenge_id must be a non-empty string`);
    }

    const cr = challengeResolver.resolve(fm.challenge_id);
    if (!cr) die(`${fileRel}: unknown challenge_id: ${fm.challenge_id}`);
    if (cr.source !== 'id' && cr.canonical !== fm.challenge_id) {
      warn(`${fileRel}: challenge_id "${fm.challenge_id}" should be "${cr.canonical}" (canonical id)`);
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

    if (fm.video_link != null) {
      if (typeof fm.video_link !== 'string' || !/^https?:\/\//i.test(fm.video_link)) {
        die(`${fileRel}: video_link must be an http(s) URL`);
      }
    } else {
      warn(`${fileRel}: video_link missing`);
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

  const { tagResolver, challengeResolver, platformResolver } = validateDataFiles();
  const gameCategoryIndex = buildGameCategoryIndex();

  const gameIds = validateGames({ tagResolver, challengeResolver, platformResolver });
  const runnerIds = validateRunners(gameIds);

  validateRuns({ gameIds, runnerIds, challengeResolver, gameCategoryIndex });

  console.log('OK schema validation passed');
}

main();

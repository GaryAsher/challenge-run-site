#!/usr/bin/env node
/**
 * Generate a JSON index used by /submit-run/ so dropdowns can be game-specific.
 *
 * Outputs:
 *   assets/generated/form-index.json
 *
 * Reads:
 *   _games/*.md
 *   _data/challenges.yml (optional global fallback)
 *
 * Exports per game (stable keys expected by submit-run.js):
 *   - category_tiers: { full_runs: [...], mini_challenges: [...], player_made: [...] }
 *   - categories: [{slug,name,tier}] (flattened list for backward compatibility)
 *   - standard_challenges: [{id,name}]
 *   - glitches: [{id,name}] (empty if glitches_relevant: false)
 *   - restrictions: [{id,name}]
 *   - character_column: {enabled,label}
 *   - characters: [{id,name}]
 *   - timing_method: primary timing method (IGT, LRT, RTA)
 *   - rta_timing: whether RTA is available (default true)
 */

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const ROOT = process.cwd();
const GAMES_DIR = path.join(ROOT, "_games");
const DATA_DIR = path.join(ROOT, "_data");
const OUT_DIR = path.join(ROOT, "assets", "generated");
const OUT_FILE = path.join(OUT_DIR, "form-index.json");

function readFile(p) {
  return fs.readFileSync(p, "utf8");
}

function safeMkdir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function parseFrontMatter(md) {
  if (!md.startsWith("---")) return { data: {}, body: md };

  const end = md.indexOf("\n---", 3);
  if (end === -1) return { data: {}, body: md };

  const fmRaw = md.slice(3, end + 1);
  const body = md.slice(end + 4);
  const data = yaml.load(fmRaw) || {};
  return { data, body };
}

function listMarkdownFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => path.join(dir, f));
}

function loadGlobalChallenges() {
  const p = path.join(DATA_DIR, "challenges.yml");
  if (!fs.existsSync(p)) return [];

  const obj = yaml.load(readFile(p)) || {};

  if (Array.isArray(obj)) {
    return obj
      .map((it) => ({
        id: String(it?.challenge_id || it?.id || "").trim(),
        name: String(it?.name || it?.title || it?.label || it?.challenge_id || it?.id || "").trim(),
        group: String(it?.group || "").trim() || "Challenges"
      }))
      .filter((c) => c.id);
  }

  return Object.keys(obj)
    .map((id) => {
      const it = obj[id] || {};
      return {
        id: String(id).trim(),
        name: String(it.name || it.title || it.label || id).trim(),
        group: String(it.group || "").trim() || "Challenges"
      };
    })
    .filter((c) => c.id);
}

/**
 * Normalize categories from a single tier array.
 * Returns array of category objects. Parents with children get is_group: true
 * and a children array; the parent itself is NOT selectable.
 * Categories may include fixed_character and timing_method overrides.
 */
function normalizeTierCategories(tierArray) {
  if (!Array.isArray(tierArray)) return [];

  const out = [];

  for (const item of tierArray) {
    if (!item) continue;

    const slug = String(item?.slug || item?.category_slug || "").trim();
    if (!slug) continue;

    const label = String(item?.label || item?.name || item?.title || slug).trim();

    const entry = { slug, name: label };

    // Per-category timing override
    if (item.timing_method) {
      entry.timing_method = String(item.timing_method).trim();
    }

    // Fixed/forced character for this category
    if (item.fixed_character !== undefined && item.fixed_character !== null && item.fixed_character !== false) {
      entry.fixed_character = item.fixed_character === true ? true : String(item.fixed_character).trim();
    }

    if (Array.isArray(item.children) && item.children.length > 0) {
      // Parent group — not selectable, contains children
      entry.is_group = true;
      entry.children = [];

      for (const child of item.children) {
        const childSlug = String(child?.slug || "").trim();
        if (!childSlug) continue;

        const childLabel = String(child?.label || child?.name || childSlug).trim();
        const childEntry = { slug: `${slug}/${childSlug}`, name: childLabel };

        if (child.timing_method) {
          childEntry.timing_method = String(child.timing_method).trim();
        }
        if (child.fixed_character !== undefined && child.fixed_character !== null && child.fixed_character !== false) {
          childEntry.fixed_character = child.fixed_character === true ? true : String(child.fixed_character).trim();
        }

        entry.children.push(childEntry);
      }

      out.push(entry);
    } else {
      // Standalone category — directly selectable
      out.push(entry);
    }
  }

  return out;
}

/**
 * Build tiered categories structure from game data.
 * Supports both new structure (full_runs, mini_challenges, player_made)
 * and legacy structure (categories_data) for backward compatibility.
 */
function normalizeCategoryTiers(game) {
  const tiers = {
    full_runs: [],
    mini_challenges: [],
    player_made: []
  };

  // Check for new tiered structure first
  if (game.full_runs || game.mini_challenges || game.player_made) {
    tiers.full_runs = normalizeTierCategories(game.full_runs);
    tiers.mini_challenges = normalizeTierCategories(game.mini_challenges);
    tiers.player_made = normalizeTierCategories(game.player_made);
  } else {
    // Legacy: treat all categories_data as full_runs
    const legacyCategories = normalizeLegacyCategories(game);
    tiers.full_runs = legacyCategories;
  }

  return tiers;
}

/**
 * Legacy category normalization for backward compatibility.
 * Used when game file still has categories_data instead of tiered structure.
 */
function normalizeLegacyCategories(game) {
  const buckets = [
    game.categories_data,
    game.categories,
    game.category_slugs,
    game.run_categories,
    game.run_category_slugs,
    game.runs
  ];

  const out = [];

  function pushSlug(slugRaw, labelRaw) {
    const slug = String(slugRaw || "").trim();
    if (!slug) return;
    const name = String(labelRaw || slug).trim();
    out.push({ slug, name });
  }

  function walk(node, parentSlug = "", parentLabel = "") {
    const slug = String(node?.slug || node?.category_slug || "").trim();
    if (!slug) return;

    const label = String(node?.label || node?.name || node?.title || slug).trim();

    const fullSlug = parentSlug ? `${parentSlug}/${slug}` : slug;
    const fullLabel = parentLabel ? `${parentLabel}: ${label}` : label;

    pushSlug(fullSlug, fullLabel);

    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        walk(child, fullSlug, fullLabel);
      }
    }
  }

  for (const bucket of buckets) {
    if (!bucket) continue;

    if (Array.isArray(bucket)) {
      for (const item of bucket) {
        if (!item) continue;

        if (typeof item === "string") {
          pushSlug(item, item);
          continue;
        }

        if (typeof item === "object") {
          if ("children" in item || "label" in item) {
            walk(item);
            continue;
          }

          const slug = item.slug || item.category_slug || item.id;
          const name = item.name || item.title || item.label || slug;
          pushSlug(slug, name);
        }
      }
    }
  }

  const seen = new Set();
  return out.filter((c) => {
    if (!c.slug) return false;
    if (seen.has(c.slug)) return false;
    seen.add(c.slug);
    return true;
  });
}

/**
 * Flatten tiered categories into a single list with tier info.
 * For backward compatibility with existing code.
 */
function flattenCategoryTiers(tiers) {
  const out = [];
  const seen = new Set();

  function addFromTier(tierName, tierCategories) {
    for (const cat of tierCategories) {
      if (cat.is_group && Array.isArray(cat.children)) {
        // Flatten group children into the list
        for (const child of cat.children) {
          if (seen.has(child.slug)) continue;
          seen.add(child.slug);
          out.push({ slug: child.slug, name: `${cat.name}: ${child.name}`, tier: tierName });
        }
      } else {
        if (seen.has(cat.slug)) continue;
        seen.add(cat.slug);
        out.push({ slug: cat.slug, name: cat.name, tier: tierName });
      }
    }
  }

  addFromTier("full_runs", tiers.full_runs);
  addFromTier("mini_challenges", tiers.mini_challenges);
  addFromTier("player_made", tiers.player_made);

  return out;
}

function normalizeSlugList(list) {
  if (!Array.isArray(list)) return [];

  const out = [];
  for (const item of list) {
    if (!item) continue;

    const id = String(item.slug || item.challenge_id || item.id || "").trim();
    if (!id) continue;

    const name = String(item.label || item.name || item.title || id).trim();
    out.push({ id, name });
  }

  const seen = new Set();
  return out.filter((c) => {
    if (!c.id) return false;
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

function normalizeStringList(list) {
  // for legacy shapes like: restrictions: ["No Spells", "No Charms"]
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const s of list) {
    const v = String(s || "").trim();
    if (!v) continue;
    out.push({ id: v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), name: v });
  }
  const seen = new Set();
  return out.filter((c) => {
    if (!c.id) return false;
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

function normalizeCharacterColumn(game) {
  if (game.character_column && typeof game.character_column === "object") {
    return {
      enabled: Boolean(game.character_column.enabled),
      label: String(game.character_column.label || "Character").trim()
    };
  }
  return { enabled: false, label: "Character" };
}

// community_challenges has been deprecated - now part of restrictions_data

function main() {
  if (!fs.existsSync(GAMES_DIR)) {
    console.error("Missing _games/ directory.");
    process.exit(1);
  }

  const globalChallenges = loadGlobalChallenges();

  const games = [];
  for (const file of listMarkdownFiles(GAMES_DIR)) {
    const md = readFile(file);
    const { data } = parseFrontMatter(md);

    const game_id = String(data.game_id || "").trim();
    if (!game_id) continue;
    
    // Skip test-only and unpublished games from public form index
    if (data.test_only === true || data.published === false) {
      console.log(`  Skipping ${game_id} (test_only or unpublished)`);
      continue;
    }

    const title = String(data.game_name || data.name || data.title || game_id).trim();
    
    // Build tiered categories structure
    const category_tiers = normalizeCategoryTiers(data);
    
    // Flatten for backward compatibility
    const categories = flattenCategoryTiers(category_tiers);

    const standard_challenges = normalizeSlugList(data.challenges_data);

    const glitchesRelevant = data.glitches_relevant;
    const hasGlitches = glitchesRelevant === false ? false : true;
    const glitches = hasGlitches ? normalizeSlugList(data.glitches_data) : [];

    const restrictions =
      normalizeSlugList(data.restrictions_data).length > 0
        ? normalizeSlugList(data.restrictions_data)
        : normalizeStringList(data.restrictions);

    const character_column = normalizeCharacterColumn(data);
    const characters = normalizeSlugList(data.characters_data);
    
    // Timing methods (IGT, RTA, LRT, etc.)
    const timing_method = String(data.timing_method || "RTA").trim();
    const timing_method_secondary = String(data.timing_method_secondary || "").trim();
    const rta_timing = data.rta_timing !== false; // default true

    games.push({
      game_id,
      title,
      category_tiers,
      categories,
      standard_challenges,
      glitches,
      restrictions,
      character_column,
      characters,
      timing_method,
      timing_method_secondary,
      rta_timing
    });
  }

  games.sort((a, b) => a.title.localeCompare(b.title));

  // Load runners
  const RUNNERS_DIR = path.join(ROOT, "_runners");
  const runners = [];
  if (fs.existsSync(RUNNERS_DIR)) {
    for (const file of listMarkdownFiles(RUNNERS_DIR)) {
      const md = readFile(file);
      const { data } = parseFrontMatter(md);
      const runner_id = String(data.runner_id || path.basename(file, ".md") || "").trim();
      if (runner_id) {
        runners.push({ id: runner_id });
      }
    }
  }

  safeMkdir(OUT_DIR);

  const payload = {
    generated_at: new Date().toISOString(),
    games,
    challenges: globalChallenges,
    runners
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log(`Wrote ${path.relative(ROOT, OUT_FILE)} (${games.length} games, ${runners.length} runners)`);
}

main();

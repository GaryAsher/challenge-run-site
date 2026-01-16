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
 * Per-game support:
 *   - categories_data (with nested children) -> flattened category slugs
 *   - challenges_data -> standard_challenges
 *   - community-challenges -> community_challenges
 *   - glitches_data -> glitches
 *   - restrictions_data -> restrictions
 *   - character_column + characters_data -> character_column + characters
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

  // Support both map and list shapes
  if (Array.isArray(obj)) {
    return obj
      .map((it) => ({
        id: String(it?.challenge_id || it?.id || "").trim(),
        name: String(
          it?.name || it?.title || it?.label || it?.challenge_id || it?.id || ""
        ).trim(),
        group: String(it?.group || "").trim() || "Challenges"
      }))
      .filter((c) => c.id);
  }

  // map: { no-hit: { name: "No Hit" } }
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

function normalizeCategories(game) {
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
          // categories_data shape
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

  // de-dupe by slug
  const seen = new Set();
  return out.filter((c) => {
    if (!c.slug) return false;
    if (seen.has(c.slug)) return false;
    seen.add(c.slug);
    return true;
  });
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

  // de-dupe by id, keep first
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

    const title = String(data.name || data.title || game_id).trim();
    const categories = normalizeCategories(data);

    const standard_challenges = normalizeSlugList(data.challenges_data);
    const community_challenges = normalizeSlugList(data["community-challenges"]);
    const glitches = normalizeSlugList(data.glitches_data);
    const restrictions = normalizeSlugList(data.restrictions_data);

    const character_column = normalizeCharacterColumn(data);
    const characters = normalizeSlugList(data.characters_data);

    games.push({
      game_id,
      title,
      categories,
      standard_challenges,
      community_challenges,
      glitches,
      restrictions,
      character_column,
      characters
    });
  }

  games.sort((a, b) => a.title.localeCompare(b.title));

  safeMkdir(OUT_DIR);

  const payload = {
    generated_at: new Date().toISOString(),
    games,
    challenges: globalChallenges
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log(`Wrote ${path.relative(ROOT, OUT_FILE)} (${games.length} games)`);
}

main();

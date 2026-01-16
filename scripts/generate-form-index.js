#!/usr/bin/env node
/**
 * Generate a JSON index used by /submit-run/ so dropdowns can be game-specific.
 *
 * Outputs:
 *   assets/generated/form-index.json
 *
 * Reads:
 *   _games/*.md  (front matter)
 *   _data/challenges.yml (optional)
 *
 * Contract (minimal):
 *   Each game should expose:
 *     - game_id
 *     - title (or name)
 *     - categories: [{ slug, name }]  OR category_slugs: [string]
 *     - allowed_challenges: [challenge_id] (optional, else use global)
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
  // simple, robust front matter parser
  if (!md.startsWith("---")) return { data: {}, body: md };
  const end = md.indexOf("\n---", 3);
  if (end === -1) return { data: {}, body: md };
  const fmRaw = md.slice(3, end + 1); // include trailing newline
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
  if (!fs.existsSync(p)) return {};
  const obj = yaml.load(readFile(p)) || {};
  // Support both:
  // - map: { no-hit: { name: "No Hit" } }
  // - list: [{ challenge_id: "no-hit", name: "No Hit" }]
  if (Array.isArray(obj)) {
    const out = {};
    for (const item of obj) {
      if (item && item.challenge_id) out[item.challenge_id] = item;
    }
    return out;
  }
  return obj;
}

function normalizeCategories(game) {
  // Accept either:
  // categories: [{ slug, name }]
  // category_slugs: ["underworld-any", ...]
  const categories = [];

  if (Array.isArray(game.categories)) {
    for (const c of game.categories) {
      if (!c) continue;
      const slug = String(c.slug || c.category_slug || "").trim();
      const name = String(c.name || c.title || slug).trim();
      if (slug) categories.push({ slug, name });
    }
  } else if (Array.isArray(game.category_slugs)) {
    for (const slugRaw of game.category_slugs) {
      const slug = String(slugRaw || "").trim();
      if (slug) categories.push({ slug, name: slug });
    }
  }

  // de-dupe by slug
  const seen = new Set();
  return categories.filter((c) => {
    if (seen.has(c.slug)) return false;
    seen.add(c.slug);
    return true;
  });
}

function main() {
  if (!fs.existsSync(GAMES_DIR)) {
    console.error("Missing _games/ directory.");
    process.exit(1);
  }

  const challenges = loadGlobalChallenges();
  const globalChallengeList = Object.keys(challenges).map((id) => {
    const c = challenges[id] || {};
    return {
      id,
      name: String(c.name || c.title || id),
    };
  });

  const games = [];
  for (const file of listMarkdownFiles(GAMES_DIR)) {
    const md = readFile(file);
    const { data } = parseFrontMatter(md);

    const game_id = String(data.game_id || "").trim();
    if (!game_id) continue;

    const title = String(data.title || data.name || game_id).trim();
    const categories = normalizeCategories(data);

    // allowed challenges may be per-game, else use global list
    const allowed = Array.isArray(data.allowed_challenges)
      ? data.allowed_challenges.map((x) => String(x).trim()).filter(Boolean)
      : null;

    games.push({
      game_id,
      title,
      categories,
      allowed_challenges: allowed, // null means use global on client
    });
  }

  games.sort((a, b) => a.title.localeCompare(b.title));

  safeMkdir(OUT_DIR);

  const payload = {
    generated_at: new Date().toISOString(),
    games,
    challenges: globalChallengeList,
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log(`Wrote ${path.relative(ROOT, OUT_FILE)} (${games.length} games)`);
}

main();

#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

function readFrontMatter(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!m) return null;
  try {
    return yaml.load(m[1]);
  } catch {
    return null;
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFileIfDifferent(filePath, content) {
  const prev = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
  if (prev === content) return false;
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf8");
  return true;
}

function normalizeSlug(slug) {
  return String(slug || "")
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function makeCategoryPage({ gameId, categorySlug }) {
  const slug = normalizeSlug(categorySlug);
  const permalink = `/games/${gameId}/runs/${slug}/`;

  return [
    "---",
    "layout: game-runs",
    "title: Runs",
    `game_id: ${gameId}`,
    `category_slug: ${slug}`,
    `permalink: ${permalink}`,
    "---",
    ""
  ].join("\n");
}

// Extract all category slugs from categories_data (including nested children)
function extractCategorySlugs(categoriesData, parentSlug = "") {
  const slugs = [];
  if (!Array.isArray(categoriesData)) return slugs;

  for (const cat of categoriesData) {
    if (!cat || !cat.slug) continue;

    const fullSlug = parentSlug ? `${parentSlug}/${cat.slug}` : cat.slug;
    slugs.push(fullSlug);

    // Recurse for children
    if (Array.isArray(cat.children)) {
      slugs.push(...extractCategorySlugs(cat.children, fullSlug));
    }
  }

  return slugs;
}

function main() {
  const root = path.resolve(__dirname, "..");
  const runsDir = path.join(root, "_runs");
  const gamesSourceDir = path.join(root, "_games");
  const gamesDir = path.join(root, "games");

  const byGame = new Map(); // gameId -> Set(category_slug)

  // 1. Read categories from _games/*.md files
  if (fs.existsSync(gamesSourceDir)) {
    const gameFiles = fs
      .readdirSync(gamesSourceDir)
      .filter((f) => (f.endsWith(".md") || f.endsWith(".markdown")) && !f.startsWith("_") && !f.toLowerCase().includes("template"));

    for (const f of gameFiles) {
      const fp = path.join(gamesSourceDir, f);
      const fm = readFrontMatter(fp);
      if (!fm || !fm.game_id) continue;

      const gameId = String(fm.game_id).trim();
      if (!byGame.has(gameId)) byGame.set(gameId, new Set());
      const set = byGame.get(gameId);

      // Extract categories from categories_data
      if (fm.categories_data) {
        const slugs = extractCategorySlugs(fm.categories_data);
        for (const slug of slugs) {
          set.add(slug);
        }
      }
    }
  }

  // 2. Also read from runs (to catch any categories not defined in game file)
  if (fs.existsSync(runsDir)) {
    const runFiles = fs
      .readdirSync(runsDir)
      .filter((f) => (f.endsWith(".md") || f.endsWith(".markdown")) && !f.startsWith("_"));

    for (const f of runFiles) {
      const fp = path.join(runsDir, f);
      const fm = readFrontMatter(fp);
      if (!fm) continue;

      const gameId = String(fm.game_id || "").trim();
      const catSlug = normalizeSlug(fm.category_slug);

      if (!gameId || !catSlug) continue;

      if (!byGame.has(gameId)) byGame.set(gameId, new Set());
      const set = byGame.get(gameId);

      set.add(catSlug);

      // Parent slugs for nested categories
      if (catSlug.includes("/")) {
        const parts = catSlug.split("/").filter(Boolean);
        for (let i = 1; i < parts.length; i++) {
          set.add(parts.slice(0, i).join("/"));
        }
      }
    }
  }

  let wrote = 0;

  for (const [gameId, slugsSet] of byGame.entries()) {
    const slugs = Array.from(slugsSet).sort((a, b) => a.localeCompare(b));

    for (const slug of slugs) {
      const outDir = path.join(gamesDir, gameId, "runs", ...slug.split("/"));
      const outFile = path.join(outDir, "index.html");
      const content = makeCategoryPage({ gameId, categorySlug: slug });
      if (writeFileIfDifferent(outFile, content)) wrote++;
    }
  }

  console.log(`Generated/updated ${wrote} runs category page(s).`);
}

main();

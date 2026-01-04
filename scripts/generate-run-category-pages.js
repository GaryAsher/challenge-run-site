#!/usr/bin/env node
/**
 * Generate nested run category pages from _games/<game>.md categories_data.
 *
 * Creates:
 *   games/<game_id>/runs/<parent>/index.html
 *   games/<game_id>/runs/<parent>/<child>/index.html
 *
 * Usage:
 *   node scripts/generate-run-category-pages.js --game hades-2
 *   node scripts/generate-run-category-pages.js --game hades-2 --check
 *
 * Multi-game:
 *   node scripts/generate-run-category-pages.js
 *   node scripts/generate-run-category-pages.js --check
 *
 * Notes:
 * - If a game has no categories_data, it is skipped (no error).
 * - --check exits 1 if any file is missing or would change.
 */

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const ROOT = process.cwd();

function parseArgs(argv) {
  const out = { game: null, check: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--game" || a === "-g") out.game = argv[++i];
    else if (a === "--check") out.check = true;
  }
  return out;
}

function die(msg) {
  console.error("Error:", msg);
  process.exit(1);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFileIfChanged(p, content, check) {
  const exists = fs.existsSync(p);
  const prev = exists ? fs.readFileSync(p, "utf8") : null;

  if (prev === content) return { changed: false, created: false };

  if (check) return { changed: true, created: !exists };

  ensureDir(path.dirname(p));
  fs.writeFileSync(p, content, "utf8");
  return { changed: true, created: !exists };
}

function slugToTitle(slug) {
  const s = String(slug || "").replace(/-/g, " ").replace(/\s+/g, " ").trim();
  if (!s) return "";
  return s
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

function pageContent({ title, gameId, categorySlug }) {
  return `---
layout: game-runs
title: ${title}
game_id: ${gameId}
category_slug: ${categorySlug}
permalink: /games/${gameId}/runs/${categorySlug}/
---
`;
}

function listGameIdsFromGamesFolder() {
  const gamesDir = path.join(ROOT, "_games");
  if (!fs.existsSync(gamesDir)) return [];
  const files = fs
    .readdirSync(gamesDir)
    .filter((f) => f.endsWith(".md") && f !== "README.md");

  return files.map((f) => path.basename(f, ".md"));
}

function loadFrontMatterYaml(mdPath) {
  const raw = fs.readFileSync(mdPath, "utf8");
  const m = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n/);
  if (!m) return null;
  try {
    const obj = yaml.load(m[1]) || {};
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
    return obj;
  } catch {
    return null;
  }
}

function normalizeCategoriesData(categoriesData) {
  if (!Array.isArray(categoriesData)) return [];
  const out = [];

  for (const c of categoriesData) {
    if (!c || typeof c !== "object" || Array.isArray(c)) continue;

    const pslug = String(c.slug || "").trim();
    if (!pslug) continue;

    const plabel = String(c.label || pslug).trim() || pslug;

    const children = [];
    if (Array.isArray(c.children)) {
      for (const ch of c.children) {
        if (!ch || typeof ch !== "object" || Array.isArray(ch)) continue;
        const cslug = String(ch.slug || "").trim();
        if (!cslug) continue;
        const clabel = String(ch.label || cslug).trim() || cslug;
        children.push({ slug: cslug, label: clabel });
      }
    }

    out.push({ slug: pslug, label: plabel, children });
  }

  return out;
}

function generateForGame(gameId, check) {
  const gameMdPath = path.join(ROOT, "_games", `${gameId}.md`);
  if (!fs.existsSync(gameMdPath)) {
    return { skipped: false, error: `Game file not found: ${gameMdPath}`, created: [], changed: [] };
  }

  const fm = loadFrontMatterYaml(gameMdPath);
  if (!fm) {
    return { skipped: false, error: `No valid YAML front matter found in ${gameMdPath}`, created: [], changed: [] };
  }

  const cats = normalizeCategoriesData(fm.categories_data);
  if (!cats.length) {
    // No categories_data defined, skip without failing.
    return { skipped: true, created: [], changed: [] };
  }

  const created = [];
  const changed = [];

  for (const c of cats) {
    const parentSlug = c.slug;

    // Parent page
    const parentDir = path.join(ROOT, "games", gameId, "runs", parentSlug);
    const parentIndex = path.join(parentDir, "index.html");
    const parentTitle = `${c.label || slugToTitle(parentSlug) || parentSlug}`;
    const parentRes = writeFileIfChanged(
      parentIndex,
      pageContent({ title: parentTitle, gameId, categorySlug: parentSlug }),
      check
    );
    if (parentRes.changed) (parentRes.created ? created : changed).push(parentIndex);

    // Child pages
    for (const ch of c.children || []) {
      const childSlug = `${parentSlug}/${ch.slug}`;
      const childDir = path.join(ROOT, "games", gameId, "runs", parentSlug, ch.slug);
      const childIndex = path.join(childDir, "index.html");
      const childTitle = `${c.label || slugToTitle(parentSlug) || parentSlug} — ${ch.label || slugToTitle(ch.slug) || ch.slug}`;

      const childRes = writeFileIfChanged(
        childIndex,
        pageContent({ title: childTitle, gameId, categorySlug: childSlug }),
        check
      );
      if (childRes.changed) (childRes.created ? created : changed).push(childIndex);
    }
  }

  return { skipped: false, created, changed, error: null };
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const gameIds = args.game ? [args.game] : listGameIdsFromGamesFolder();
  if (!gameIds.length) die("No games found in _games/.");

  const allCreated = [];
  const allChanged = [];
  const skippedGames = [];

  for (const gid of gameIds) {
    const res = generateForGame(gid, args.check);
    if (res.error) die(res.error);
    if (res.skipped) {
      skippedGames.push(gid);
      continue;
    }
    allCreated.push(...res.created);
    allChanged.push(...res.changed);
  }

  const totalTouched = allCreated.length + allChanged.length;

  if (args.check) {
    if (totalTouched > 0) {
      console.error("Missing or out-of-date generated run category pages:");
      allCreated.forEach((p) => console.error("  (missing)  " + path.relative(ROOT, p).replace(/\\/g, "/")));
      allChanged.forEach((p) => console.error("  (changed)  " + path.relative(ROOT, p).replace(/\\/g, "/")));
      process.exit(1);
    }
    console.log("OK: run category pages are up to date.");
    return;
  }

  console.log(`Done. Created: ${allCreated.length}, Updated: ${allChanged.length}`);
  if (skippedGames.length) console.log(`Skipped (no categories_data): ${skippedGames.join(", ")}`);
  allCreated.forEach((p) => console.log("  created  " + path.relative(ROOT, p).replace(/\\/g, "/")));
  allChanged.forEach((p) => console.log("  updated  " + path.relative(ROOT, p).replace(/\\/g, "/")));
}

main();

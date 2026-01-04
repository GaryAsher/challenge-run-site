#!/usr/bin/env node
/**
 * Generate nested run category pages from _games/<game>.md categories_data.
 *
 * Creates:
 *   games/<game_id>/runs/<parent>/index.html
 *   games/<game_id>/runs/<parent>/<child>/index.html
 *
 * Usage:
 *   node scripts/generate-run-category-pages.js                 (all games)
 *   node scripts/generate-run-category-pages.js --game hades-2
 *   node scripts/generate-run-category-pages.js --check
 *   node scripts/generate-run-category-pages.js --game hades-2 --check
 */

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const ROOT = process.cwd();

function parseArgs(argv) {
  const out = { game: null, check: false, verbose: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--game" || a === "-g") out.game = argv[++i];
    else if (a === "--check") out.check = true;
    else if (a === "--verbose" || a === "-v") out.verbose = true;
  }
  return out;
}

function die(msg) {
  console.error("Error:", msg);
  process.exit(1);
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function readText(p) {
  return fs.readFileSync(p, "utf8");
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

function parseFrontMatter(p) {
  const raw = readText(p);
  const m = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/m.exec(raw);
  if (!m) die(`${rel(p)}: Missing YAML front matter (--- ... ---).`);
  try {
    const data = yaml.load(m[1]) || {};
    if (typeof data !== "object" || Array.isArray(data)) {
      die(`${rel(p)}: Front matter must be a YAML mapping.`);
    }
    return data;
  } catch (e) {
    die(`${rel(p)}: Front matter YAML parse error: ${e.message}`);
  }
}

function listGameIds() {
  const dir = path.join(ROOT, "_games");
  if (!isDir(dir)) die("Missing _games/ directory");

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .map((f) => path.join(dir, f));

  const ids = [];
  for (const p of files) {
    const fm = parseFrontMatter(p);
    if (!fm.game_id || typeof fm.game_id !== "string") {
      die(`${rel(p)}: Missing or invalid game_id`);
    }
    ids.push(fm.game_id.trim());
  }
  return ids;
}

function slugToTitle(slugOrLabel) {
  const s = String(slugOrLabel || "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function normalizeCategoriesData(cats, fileRel) {
  if (cats == null) return [];
  if (!Array.isArray(cats)) die(`${fileRel}: categories_data must be a list`);

  const out = [];
  for (const c of cats) {
    if (!c || typeof c !== "object" || Array.isArray(c)) {
      die(`${fileRel}: categories_data entries must be objects`);
    }
    const slug = String(c.slug || "").trim();
    if (!slug) die(`${fileRel}: categories_data entry missing slug`);
    const label = String(c.label || slug).trim();

    const children = [];
    if (c.children != null) {
      if (!Array.isArray(c.children)) die(`${fileRel}: categories_data.${slug}.children must be a list`);
      for (const ch of c.children) {
        if (!ch || typeof ch !== "object" || Array.isArray(ch)) {
          die(`${fileRel}: categories_data.${slug}.children entries must be objects`);
        }
        const cslug = String(ch.slug || "").trim();
        if (!cslug) die(`${fileRel}: categories_data.${slug}.children entry missing slug`);
        const clabel = String(ch.label || cslug).trim();
        children.push({ slug: cslug, label: clabel });
      }
    }

    out.push({ slug, label, children });
  }

  return out;
}

function generateForGame(gameId, check, verbose) {
  const gameMdPath = path.join(ROOT, "_games", `${gameId}.md`);
  if (!isFile(gameMdPath)) die(`Game file not found: ${rel(gameMdPath)}`);

  const fm = parseFrontMatter(gameMdPath);
  const fileRel = rel(gameMdPath);

  const cats = normalizeCategoriesData(fm.categories_data, fileRel);
  if (!cats.length) {
    if (verbose) console.log(`Skip ${gameId}: no categories_data`);
    return { created: [], changed: [] };
  }

  const created = [];
  const changed = [];

  for (const c of cats) {
    const parentSlug = c.slug;
    const parentDir = path.join(ROOT, "games", gameId, "runs", parentSlug);
    const parentIndex = path.join(parentDir, "index.html");

    const parentTitle = slugToTitle(c.label || parentSlug);
    const parentRes = writeFileIfChanged(
      parentIndex,
      pageContent({ title: parentTitle, gameId, categorySlug: parentSlug }),
      check
    );
    if (parentRes.changed) (parentRes.created ? created : changed).push(parentIndex);

    for (const ch of c.children || []) {
      const childSlug = `${parentSlug}/${ch.slug}`;
      const childDir = path.join(ROOT, "games", gameId, "runs", parentSlug, ch.slug);
      const childIndex = path.join(childDir, "index.html");

      const childTitle = `${slugToTitle(c.label || parentSlug)} / ${slugToTitle(ch.label || ch.slug)}`;
      const childRes = writeFileIfChanged(
        childIndex,
        pageContent({ title: childTitle, gameId, categorySlug: childSlug }),
        check
      );
      if (childRes.changed) (childRes.created ? created : changed).push(childIndex);
    }
  }

  return { created, changed };
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const gameIds = args.game ? [args.game] : listGameIds();

  const allCreated = [];
  const allChanged = [];

  for (const gid of gameIds) {
    const { created, changed } = generateForGame(gid, args.check, args.verbose);
    allCreated.push(...created);
    allChanged.push(...changed);
  }

  const totalTouched = allCreated.length + allChanged.length;

  if (args.check) {
    if (totalTouched > 0) {
      console.error("Missing or out-of-date generated run category pages:");
      allCreated.forEach((p) => console.error("  (missing)  " + rel(p)));
      allChanged.forEach((p) => console.error("  (changed)  " + rel(p)));
      process.exit(1);
    }
    console.log("OK: run category pages are up to date.");
    return;
  }

  console.log(`Done. Created: ${allCreated.length}, Updated: ${allChanged.length}`);
  allCreated.forEach((p) => console.log("  created  " + rel(p)));
  allChanged.forEach((p) => console.log("  updated  " + rel(p)));
}

main();

#!/usr/bin/env node
/**
 * Generate nested run category pages from _games/<game>.md categories_data.
 *
 * Creates:
 *   games/<game_id>/runs/<parent>/index.html               (if missing)
 *   games/<game_id>/runs/<parent>/<child>/index.html       (for each child)
 *
 * Usage:
 *   node scripts/generate-run-category-pages.js                 (all games)
 *   node scripts/generate-run-category-pages.js --game hades-2  (one game)
 *   node scripts/generate-run-category-pages.js --check         (all games, fail if stale)
 *   node scripts/generate-run-category-pages.js --game hades-2 --check
 */

const fs = require("fs");
const path = require("path");

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

function readFile(p) {
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

/**
 * Minimal YAML front matter extractor (string only).
 * We intentionally avoid full YAML parse to keep deps minimal here,
 * because we only need categories_data block and game_id.
 */
function extractFrontMatterYaml(md) {
  const m = md.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  return m ? m[1] : null;
}

function stripQuotes(s) {
  const v = String(s ?? "").trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1);
  }
  return v;
}

function parseGameId(yaml) {
  // Look for: game_id: hades-2
  const m = yaml.match(/^\s*game_id:\s*(.+)\s*$/m);
  if (!m) return null;
  return stripQuotes(m[1]);
}

function parseCategoriesData(yaml) {
  const lines = yaml.split(/\r?\n/);

  // Find "categories_data:"
  const startIdx = lines.findIndex((l) => /^\s*categories_data:\s*$/.test(l));
  if (startIdx === -1) return [];

  const block = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    // Stop when we hit a new top-level key (very simple heuristic).
    if (/^[A-Za-z0-9_-]+:\s*$/.test(line)) break;
    block.push(line);
  }

  const cats = [];
  let i = 0;

  function indentOf(s) {
    const m = s.match(/^(\s*)/);
    return m ? m[1].length : 0;
  }

  while (i < block.length) {
    const line = block[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    if (/^\s*-\s+slug:\s*/.test(line)) {
      const parentIndent = indentOf(line);
      const slug = stripQuotes(line.replace(/^\s*-\s+slug:\s*/, ""));
      let label = slug;
      const children = [];

      i++;

      while (i < block.length) {
        const l = block[i];
        if (!l.trim()) {
          i++;
          continue;
        }

        // Next parent
        if (indentOf(l) === parentIndent && /^\s*-\s+slug:\s*/.test(l)) break;

        if (/^\s*label:\s*/.test(l)) {
          label = stripQuotes(l.replace(/^\s*label:\s*/, ""));
          i++;
          continue;
        }

        if (/^\s*children:\s*$/.test(l)) {
          const childrenIndent = indentOf(l);
          i++;

          while (i < block.length) {
            const cl = block[i];
            if (!cl.trim()) {
              i++;
              continue;
            }

            // Child list item
            if (indentOf(cl) > childrenIndent && /^\s*-\s+slug:\s*/.test(cl)) {
              const childIndent = indentOf(cl);
              const cslug = stripQuotes(cl.replace(/^\s*-\s+slug:\s*/, ""));
              let clabel = cslug;
              i++;

              while (i < block.length) {
                const pl = block[i];
                if (!pl.trim()) {
                  i++;
                  continue;
                }

                // Next child or end children
                if (indentOf(pl) <= childIndent && /^\s*-\s+slug:\s*/.test(pl)) break;
                if (indentOf(pl) <= childrenIndent) break;

                if (/^\s*label:\s*/.test(pl)) {
                  clabel = stripQuotes(pl.replace(/^\s*label:\s*/, ""));
                  i++;
                  continue;
                }

                i++;
              }

              children.push({ slug: cslug, label: clabel });
              continue;
            }

            if (indentOf(cl) <= childrenIndent) break;
            i++;
          }

          continue;
        }

        i++;
      }

      cats.push({ slug, label, children });
      continue;
    }

    i++;
  }

  return cats;
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

function listGameFiles() {
  const dir = path.join(ROOT, "_games");
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => path.join(dir, f));
}

function generateForGameFile(gameMdPath, { check, explicitGameId }) {
  const md = readFile(gameMdPath);
  const yaml = extractFrontMatterYaml(md);
  if (!yaml) {
    if (explicitGameId) die(`No YAML front matter found in ${gameMdPath}`);
    return { created: [], changed: [], skipped: true };
  }

  const gameId = parseGameId(yaml) || explicitGameId || null;
  if (!gameId) {
    if (explicitGameId) die(`Missing game_id in ${gameMdPath}`);
    return { created: [], changed: [], skipped: true };
  }

  const cats = parseCategoriesData(yaml);

  // If user explicitly asked for a game, treat missing categories as an error.
  if (!cats.length) {
    if (explicitGameId) die(`No categories_data found (or parsable) in ${gameMdPath}`);
    return { created: [], changed: [], skipped: true };
  }

  const created = [];
  const changed = [];

  cats.forEach((c) => {
    const parentSlug = c.slug;

    // Parent page
    const parentDir = path.join(ROOT, "games", gameId, "runs", parentSlug);
    const parentIndex = path.join(parentDir, "index.html");
    const parentTitle = `${slugToTitle(c.label || parentSlug)}`;

    const parentRes = writeFileIfChanged(
      parentIndex,
      pageContent({ title: parentTitle, gameId, categorySlug: parentSlug }),
      check
    );
    if (parentRes.changed) (parentRes.created ? created : changed).push(parentIndex);

    // Children pages
    (c.children || []).forEach((ch) => {
      const childSlug = `${parentSlug}/${ch.slug}`;
      const childDir = path.join(ROOT, "games", gameId, "runs", parentSlug, ch.slug);
      const childIndex = path.join(childDir, "index.html");
      const childTitle = `${c.label || slugToTitle(parentSlug)} — ${
        ch.label || slugToTitle(ch.slug)
      }`;

      const childRes = writeFileIfChanged(
        childIndex,
        pageContent({ title: childTitle, gameId, categorySlug: childSlug }),
        check
      );
      if (childRes.changed) (childRes.created ? created : changed).push(childIndex);
    });
  });

  return { created, changed, skipped: false, gameId };
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  let gameFiles = [];
  let explicitGameId = null;

  if (args.game) {
    explicitGameId = args.game;
    const p = path.join(ROOT, "_games", `${args.game}.md`);
    if (!fs.existsSync(p)) die(`Game file not found: ${p}`);
    gameFiles = [p];
  } else {
    gameFiles = listGameFiles();
    if (!gameFiles.length) die("No _games/*.md files found.");
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
      console.error("Missing or out-of-date generated run category pages:");
      allCreated.forEach((p) => console.error("  (missing)  " + path.relative(ROOT, p)));
      allChanged.forEach((p) => console.error("  (changed)  " + path.relative(ROOT, p)));
      process.exit(1);
    }
    console.log("OK: run category pages are up to date.");
    return;
  }

  console.log(`Done. Created: ${allCreated.length}, Updated: ${allChanged.length}`);
  allCreated.forEach((p) => console.log("  created  " + path.relative(ROOT, p)));
  allChanged.forEach((p) => console.log("  updated  " + path.relative(ROOT, p)));

  if (skippedGames.length) {
    console.log(`Skipped (no categories_data/front matter): ${skippedGames.length}`);
    skippedGames.forEach((x) => console.log("  skipped  " + x));
  }
}

main();

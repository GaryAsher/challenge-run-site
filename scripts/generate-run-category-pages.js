#!/usr/bin/env node
/**
 * Generate nested run category pages from _games/<game>.md categories_data.
 *
 * Creates:
 *   games/<game_id>/runs/<parent>/index.html               (if missing)
 *   games/<game_id>/runs/<parent>/<child>/index.html       (for each child)
 *
 * Usage:
 *   node scripts/generate-run-category-pages.js --game hades-2
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
 * Minimal YAML front matter parser tailored for file shape
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

function parseCategoriesData(yaml) {
  const lines = yaml.split(/\r?\n/);

  // Find "categories_data:"
  const startIdx = lines.findIndex((l) => /^\s*categories_data:\s*$/.test(l));
  if (startIdx === -1) return [];

  const block = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^[A-Za-z0-9_-]+:\s*$/.test(line)) break;
    block.push(line);
  }

  // Parse list items:
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
  // Title shown in browser tab; page header comes from layout using active_cat_label.
  return `---
layout: game-runs
title: ${title}
game_id: ${gameId}
category_slug: ${categorySlug}
permalink: /games/${gameId}/runs/${categorySlug}/
---
`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.game) die("Missing --game <game_id> (example: --game hades-2)");

  const gameId = args.game;
  const gameMdPath = path.join(ROOT, "_games", `${gameId}.md`);
  if (!fs.existsSync(gameMdPath)) die(`Game file not found: ${gameMdPath}`);

  const md = readFile(gameMdPath);
  const yaml = extractFrontMatterYaml(md);
  if (!yaml) die(`No YAML front matter found in ${gameMdPath}`);

  const cats = parseCategoriesData(yaml);
  if (!cats.length) die(`No categories_data found (or parsable) in ${gameMdPath}`);

  const created = [];
  const changed = [];

  // Generate parent pages + child pages (if children exist)
  cats.forEach((c) => {
    const parentSlug = c.slug;

    // Parent page
    const parentDir = path.join(ROOT, "games", gameId, "runs", parentSlug);
    const parentIndex = path.join(parentDir, "index.html");
    const parentTitle = `${slugToTitle(c.label || parentSlug)}`;
    const parentRes = writeFileIfChanged(
      parentIndex,
      pageContent({
        title: parentTitle,
        gameId,
        categorySlug: parentSlug,
      }),
      args.check
    );
    if (parentRes.changed) (parentRes.created ? created : changed).push(parentIndex);

    // Children pages
    (c.children || []).forEach((ch) => {
      const childSlug = `${parentSlug}/${ch.slug}`;
      const childDir = path.join(ROOT, "games", gameId, "runs", parentSlug, ch.slug);
      const childIndex = path.join(childDir, "index.html");
      const childTitle = `${c.label || slugToTitle(parentSlug)} — ${ch.label || slugToTitle(ch.slug)}`;
      const childRes = writeFileIfChanged(
        childIndex,
        pageContent({
          title: childTitle,
          gameId,
          categorySlug: childSlug,
        }),
        args.check
      );
      if (childRes.changed) (childRes.created ? created : changed).push(childIndex);
    });
  });

  const totalTouched = created.length + changed.length;

  if (args.check) {
    if (totalTouched > 0) {
      console.error("Missing or out-of-date generated run category pages:");
      created.forEach((p) => console.error("  (missing)  " + path.relative(ROOT, p)));
      changed.forEach((p) => console.error("  (changed)  " + path.relative(ROOT, p)));
      process.exit(1);
    }
    console.log("OK: run category pages are up to date.");
    return;
  }

  console.log(`Done. Created: ${created.length}, Updated: ${changed.length}`);
  created.forEach((p) => console.log("  created  " + path.relative(ROOT, p)));
  changed.forEach((p) => console.log("  updated  " + path.relative(ROOT, p)));
}

main();

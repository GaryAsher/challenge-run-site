#!/usr/bin/env node
/**
 * Generate .github/CODEOWNERS from _data/reviewers.yml
 *
 * Usage:
 *   node scripts/generate-codeowners.js           # writes .github/CODEOWNERS
 *   node scripts/generate-codeowners.js --check   # exits 1 if file differs
 */

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const INPUT = path.join(ROOT, "_data", "reviewers.yml");
const OUTPUT = path.join(ROOT, ".github", "CODEOWNERS");

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function readText(p) {
  return fs.readFileSync(p, "utf8");
}

function writeText(p, s) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s, "utf8");
}

function normalizeOwners(arr) {
  return Array.from(
    new Set(
      (arr || [])
        .map((x) => String(x || "").trim())
        .filter(Boolean)
    )
  );
}

function parseReviewersYml(yml) {
  const lines = yml
    .split(/\r?\n/)
    .map((line) => line.replace(/\t/g, "  "));

  let section = null;
  let currentGame = null;

  const out = { global: [], games: {} };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];

    // strip comments
    const line = raw.replace(/\s+#.*$/, "");
    if (!line.trim()) continue;

    // detect section headers
    if (/^global:\s*$/.test(line.trim())) {
      section = "global";
      currentGame = null;
      continue;
    }
    if (/^games:\s*$/.test(line.trim())) {
      section = "games";
      currentGame = null;
      continue;
    }

    // global items: "  - @x"
    if (section === "global") {
      const m = /^\s*-\s*(.+)\s*$/.exec(line);
      if (!m) die(`Invalid global entry on line ${i + 1}: ${raw}`);
      out.global.push(unquote(m[1].trim()));
      continue;
    }

    // games: "  game-id:" then items
    if (section === "games") {
      const header = /^\s{2}([A-Za-z0-9_-]+):\s*$/.exec(line);
      if (header) {
        currentGame = header[1];
        if (!out.games[currentGame]) out.games[currentGame] = [];
        continue;
      }

      const item = /^\s{4}-\s*(.+)\s*$/.exec(line);
      if (item) {
        if (!currentGame) die(`Found game owner before game id on line ${i + 1}: ${raw}`);
        out.games[currentGame].push(unquote(item[1].trim()));
        continue;
      }

      die(`Invalid games entry on line ${i + 1}: ${raw}`);
    }

    die(`Found entry outside a section on line ${i + 1}: ${raw}`);
  }

  out.global = normalizeOwners(out.global);
  for (const k of Object.keys(out.games)) {
    out.games[k] = normalizeOwners(out.games[k]);
  }
  return out;
}

function unquote(s) {
  // allow "@name" or '@name' or @name
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function ownersToString(owners) {
  return owners.join(" ");
}

function generateCodeowners(reviewers) {
  const globalOwners = normalizeOwners(reviewers.global);
  if (!globalOwners.length) die("reviewers.yml must include at least one global owner under global:");

  const games = reviewers.games || {};
  const gameIds = Object.keys(games).sort((a, b) => a.localeCompare(b));

  const header = [
    "# =========================================================",
    "# AUTO-GENERATED FILE. DO NOT EDIT BY HAND.",
    "# Source: _data/reviewers.yml",
    "# Generator: scripts/generate-codeowners.js",
    "# =========================================================",
    "",
  ].join("\n");

  const lines = [];
  lines.push(header);

  lines.push("# Core project ownership");
  lines.push(`/_data/reviewers.yml ${ownersToString(globalOwners)}`);
  lines.push(`/scripts/ ${ownersToString(globalOwners)}`);
  lines.push(`/.github/workflows/ ${ownersToString(globalOwners)}`);
  lines.push(`/.github/CODEOWNERS ${ownersToString(globalOwners)}`);
  lines.push("");

  lines.push("# Default ownership for any game_id folder not explicitly listed");
  lines.push(`/_queue_runs/*/ ${ownersToString(globalOwners)}`);
  lines.push(`/_runs/*/ ${ownersToString(globalOwners)}`);
  lines.push(`/_runs/rejected/*/ ${ownersToString(globalOwners)}`);
  lines.push("");

  lines.push("# Per-game ownership (strict routing)");
  for (const gameId of gameIds) {
    const gameOwners = normalizeOwners(games[gameId]);
    if (!gameOwners.length) continue;

    // Always include global owners too (so core admins can see everything)
    const combined = normalizeOwners([...gameOwners, ...globalOwners]);
    const ownersStr = ownersToString(combined);

    lines.push(`/_queue_runs/${gameId}/ ${ownersStr}`);
    lines.push(`/_runs/${gameId}/ ${ownersStr}`);
    lines.push(`/_runs/rejected/${gameId}/ ${ownersStr}`);
    lines.push("");
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

function main() {
  const args = new Set(process.argv.slice(2));
  const checkOnly = args.has("--check");

  if (!fs.existsSync(INPUT)) die(`Missing ${INPUT}. Create _data/reviewers.yml first.`);

  const reviewers = parseReviewersYml(readText(INPUT));
  const generated = generateCodeowners(reviewers);

  if (checkOnly) {
    const current = fs.existsSync(OUTPUT) ? readText(OUTPUT) : "";
    if (current !== generated) {
      console.error("CODEOWNERS is out of date. Run: node scripts/generate-codeowners.js");
      process.exit(1);
    }
    console.log("CODEOWNERS is up to date.");
    return;
  }

  writeText(OUTPUT, generated);
  console.log(`Wrote ${path.relative(ROOT, OUTPUT)}`);
}

main();

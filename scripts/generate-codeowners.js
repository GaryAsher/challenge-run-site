#!/usr/bin/env node
/**
 * Generate .github/CODEOWNERS from:
 *   - Global owners: _data/codeowners.yml (global: [...])
 *   - Per-game owners: _games/*.md front matter (reviewers: [...])
 *
 * Usage:
 *   node scripts/generate-codeowners.js
 *     Writes .github/CODEOWNERS and inserts reviewer stubs if missing.
 *
 *   node scripts/generate-codeowners.js --check
 *     Exits 1 if CODEOWNERS differs OR if a game is missing a reviewers stub.
 *
 *   node scripts/generate-codeowners.js --no-stubs
 *     Writes CODEOWNERS but does not edit game files.
 */

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

const GLOBAL_INPUT = path.join(ROOT, "_data", "codeowners.yml");
const GAMES_DIR = path.join(ROOT, "_games");
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

function unquote(s) {
  if (!s) return "";
  const t = String(s).trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

// ------------------------------
// YAML parsing (minimal)
// ------------------------------
/**
 * Parses a codeowners.yml shaped like:
 * global:
 *   - "@a"
 *   - "@b"
 */
function parseGlobalOwnersYml(yml) {
  const lines = yml.split(/\r?\n/);
  let inGlobal = false;
  const global = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.replace(/\s+#.*$/, "");
    if (!line.trim()) continue;

    if (/^global:\s*$/.test(line.trim())) {
      inGlobal = true;
      continue;
    }

    // Stop if we hit another top-level key
    if (inGlobal && /^[A-Za-z0-9_-]+:\s*$/.test(line.trim()) && !/^global:\s*$/.test(line.trim())) {
      inGlobal = false;
    }

    if (inGlobal) {
      const m = /^\s*-\s*(.+)\s*$/.exec(line);
      if (!m) die(`Invalid global entry on line ${i + 1} in ${path.relative(ROOT, GLOBAL_INPUT)}: ${raw}`);
      global.push(unquote(m[1]));
    }
  }

  return { global: normalizeOwners(global) };
}

// ------------------------------
// Front matter parsing
// ------------------------------
function splitFrontMatter(fileText) {
  // Jekyll style: ---\n...\n---\n<body>
  if (!fileText.startsWith("---")) return null;
  const parts = fileText.split(/\r?\n---\r?\n/);
  if (parts.length < 2) return null;
  const fm = parts[0].replace(/^---\r?\n?/, "");
  const body = parts.slice(1).join("\n---\n");
  return { fm, body };
}

function parseGameFrontMatter(fmText) {
  const lines = fmText.split(/\r?\n/);
  let gameId = null;
  let hasReviewersKey = false;
  let reviewers = [];
  let inReviewersList = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.replace(/\s+#.*$/, "");
    if (!line.trim()) continue;

    const mGame = /^game_id:\s*(.+)\s*$/.exec(line.trim());
    if (mGame) {
      gameId = unquote(mGame[1]);
      continue;
    }

    const mReviewersKey = /^reviewers:\s*(.*)\s*$/.exec(line.trim());
    if (mReviewersKey) {
      hasReviewersKey = true;
      const tail = mReviewersKey[1] || "";

      if (tail.startsWith("[")) {
        // reviewers: ["@a", "@b"]
        const inner = tail.replace(/^\[/, "").replace(/\]\s*$/, "");
        reviewers = inner
          .split(",")
          .map((s) => unquote(s.trim()))
          .filter(Boolean);
        inReviewersList = false;
      } else if (tail.length) {
        // reviewers: "@a"
        reviewers = [unquote(tail)].filter(Boolean);
        inReviewersList = false;
      } else {
        // reviewers:
        //   - "@a"
        inReviewersList = true;
      }
      continue;
    }

    if (inReviewersList) {
      const mItem = /^-\s*(.+)\s*$/.exec(line.trim());
      if (mItem) {
        reviewers.push(unquote(mItem[1]));
        continue;
      }
      // next key stops list
      if (/^[A-Za-z0-9_-]+:/.test(line.trim())) {
        inReviewersList = false;
      }
    }
  }

  return {
    gameId: gameId ? String(gameId).trim() : null,
    reviewers: normalizeOwners(reviewers),
    hasReviewersKey,
  };
}

function ensureReviewerStubInGameFile(fileText) {
  const parts = splitFrontMatter(fileText);
  if (!parts) return { changed: false, text: fileText, reason: "missing-front-matter" };

  const parsed = parseGameFrontMatter(parts.fm);
  if (!parsed.gameId) return { changed: false, text: fileText, reason: "missing-game_id" };
  if (parsed.hasReviewersKey) return { changed: false, text: fileText, reason: "already-has-reviewers" };

  // Insert reviewers: [] right after game_id if possible
  const fmLines = parts.fm.split(/\r?\n/);
  const out = [];
  let inserted = false;

  for (const line of fmLines) {
    out.push(line);
    if (!inserted && /^game_id:\s*/.test(line.trim())) {
      out.push("reviewers: []");
      inserted = true;
    }
  }
  if (!inserted) out.unshift("reviewers: []");

  const rebuilt = `---\n${out.join("\n")}\n---\n${parts.body}`;
  return { changed: true, text: rebuilt, reason: "inserted" };
}

function ownersToString(owners) {
  return owners.join(" ");
}

function generateCodeowners({ globalOwners, perGameOwners }) {
  if (!globalOwners.length) {
    die(`${path.relative(ROOT, GLOBAL_INPUT)} must include at least one global owner under global:`);
  }

  const gameIds = Object.keys(perGameOwners).sort((a, b) => a.localeCompare(b));

  const header = [
    "# =========================================================",
    "# AUTO-GENERATED FILE. DO NOT EDIT BY HAND.",
    "# Sources:",
    `#   - ${path.relative(ROOT, GLOBAL_INPUT)} (global)`,
    "#   - _games/*.md (reviewers)",
    "# Generator: scripts/generate-codeowners.js",
    "# =========================================================",
    "",
  ].join("\n");

  const lines = [];
  lines.push(header);

  lines.push("# Core project ownership");
  lines.push(`/${path.relative(ROOT, GLOBAL_INPUT)} ${ownersToString(globalOwners)}`);
  lines.push(`/_games/ ${ownersToString(globalOwners)}`);
  lines.push(`/scripts/ ${ownersToString(globalOwners)}`);
  lines.push(`/.github/ ${ownersToString(globalOwners)}`);
  lines.push("");

  lines.push("# Default ownership for any game_id folder not explicitly listed");
  lines.push(`/_queue_runs/*/ ${ownersToString(globalOwners)}`);
  lines.push(`/_runs/*/ ${ownersToString(globalOwners)}`);
  lines.push(`/_runs/rejected/*/ ${ownersToString(globalOwners)}`);
  lines.push("");

  lines.push("# Per-game ownership (strict routing)");
  for (const gameId of gameIds) {
    const gameOwners = normalizeOwners(perGameOwners[gameId]);
    const combined = normalizeOwners([...gameOwners, ...globalOwners]);
    const ownersStr = ownersToString(combined);

    lines.push(`/_queue_runs/${gameId}/ ${ownersStr}`);
    lines.push(`/_runs/${gameId}/ ${ownersStr}`);
    lines.push(`/_runs/rejected/${gameId}/ ${ownersStr}`);
    lines.push("");
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

function listGameFiles() {
  if (!fs.existsSync(GAMES_DIR)) return [];
  return fs
    .readdirSync(GAMES_DIR)
    .filter((f) => {
      const lower = f.toLowerCase();
      if (!(lower.endsWith(".md") || lower.endsWith(".markdown"))) return false;
      // Documentation or templates inside _games should not be treated as games
      if (lower === "readme.md") return false;
      if (lower.includes("template")) return false;
      return true;
    })
    .map((f) => path.join(GAMES_DIR, f));
}

function main() {
  const args = new Set(process.argv.slice(2));
  const checkOnly = args.has("--check");
  const noStubs = args.has("--no-stubs");
  const allowStubs = !noStubs;

  if (!fs.existsSync(GLOBAL_INPUT)) {
    die(`Missing ${path.relative(ROOT, GLOBAL_INPUT)}. Create it with:\n\nglobal:\n  - "@YourHandle"\n`);
  }

  const { global: globalOwners } = parseGlobalOwnersYml(readText(GLOBAL_INPUT));
  if (!globalOwners.length) {
    die(`No global owners found. Add at least one entry under global: in ${path.relative(ROOT, GLOBAL_INPUT)}`);
  }

  const gameFiles = listGameFiles();
  const perGameOwners = {};
  const missingReviewerStub = [];

  for (const gamePath of gameFiles) {
    const original = readText(gamePath);
    const parts = splitFrontMatter(original);
    if (!parts) {
      die(`Game file is missing Jekyll front matter (--- blocks): ${path.relative(ROOT, gamePath)}`);
    }

    const parsed = parseGameFrontMatter(parts.fm);
    if (!parsed.gameId) {
      die(`Game file is missing game_id in front matter: ${path.relative(ROOT, gamePath)}`);
    }

    if (!parsed.hasReviewersKey) {
      missingReviewerStub.push(path.relative(ROOT, gamePath));
      if (!checkOnly && allowStubs) {
        const synced = ensureReviewerStubInGameFile(original);
        if (synced.changed) {
          writeText(gamePath, synced.text);
        }
      }
    }

    perGameOwners[parsed.gameId] = parsed.reviewers;
  }

  if (checkOnly && missingReviewerStub.length) {
    console.error("One or more games are missing a reviewers stub (add `reviewers: []` to front matter):");
    for (const p of missingReviewerStub) console.error(`  - ${p}`);
    process.exit(1);
  }

  const generated = generateCodeowners({ globalOwners, perGameOwners });

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

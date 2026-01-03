#!/usr/bin/env node
/*
Repo schema validation (read-only).

Checks:
  - Windows-unsafe characters in filenames/folders (currently: < and >)
  - _data/tags.yml and _data/challenges.yml load and have sane shapes
  - _games/*.md: required fields + tag/challenge references exist
  - _runners/*.md: required fields + referenced games exist
  - _runs/(all markdown) excluding _TEMPLATES: required fields + references exist

This script is intentionally conservative: it fails CI on clear breakages,
and prints WARN lines for "should fix" issues.
*/

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const ROOT = process.cwd();

// ---------- helpers ----------

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?$/;
const TIMING_SET = new Set(["RTA", "IGT", "LRT"]);

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

function die(msg) {
  throw new Error(msg);
}

function warn(msg) {
  console.log(`WARN ${msg}`);
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

function listFilesRecursive(rootDir) {
  if (!isDir(rootDir)) return [];
  const out = [];
  (function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (ent.isFile()) out.push(full);
    }
  })(rootDir);
  return out;
}

function readText(p) {
  return fs.readFileSync(p, "utf8");
}

function loadYamlFile(p) {
  try {
    return yaml.load(readText(p));
  } catch (e) {
    die(`${rel(p)}: YAML parse error: ${e.message}`);
  }
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

function mustSlug(fileRel, field, value) {
  if (typeof value !== "string" || !SLUG_RE.test(value)) {
    die(`${fileRel}: ${field} must be kebab-case (got: ${JSON.stringify(value)})`);
  }
}

function mustString(fileRel, field, value) {
  if (typeof value !== "string" || value.trim() === "") {
    die(`${fileRel}: ${field} must be a non-empty string`);
  }
}

function mustArrayOfStrings(fileRel, field, value) {
  if (!Array.isArray(value)) {
    die(`${fileRel}: ${field} must be a YAML list`);
  }
  for (const it of value) {
    if (typeof it !== "string" || it.trim() === "") {
      die(`${fileRel}: ${field} must contain only non-empty strings`);
    }
  }
}

function mustTimeOrNull(fileRel, field, value) {
  if (value === null) return;
  if (typeof value !== "string" || !TIME_RE.test(value)) {
    die(`${fileRel}: ${field} must be HH:MM:SS(.mmm optional) or null`);
  }
}

function mustTimingOrNull(fileRel, field, value) {
  if (value === null) return;
  if (typeof value !== "string" || !TIMING_SET.has(value)) {
    die(`${fileRel}: ${field} must be one of ${Array.from(TIMING_SET).join(", ")} or null`);
  }
}

function mustDate(fileRel, field, value) {
  // js-yaml may parse unquoted YYYY-MM-DD as a Date object.
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    const iso = value.toISOString().slice(0, 10);
    if (!DATE_RE.test(iso)) die(`${fileRel}: ${field} must be YYYY-MM-DD`);
    return;
  }
  if (typeof value !== "string" || !DATE_RE.test(value)) die(`${fileRel}: ${field} must be YYYY-MM-DD`);
}

// ---------- validations ----------

function validateWindowsUnsafeNames() {
  const all = listFilesRecursive(ROOT);
  const bad = [];

  for (const p of all) {
    const r = rel(p);
    if (r.startsWith("node_modules/")) continue;

    const parts = r.split("/");
    for (const part of parts) {
      if (part.includes("<") || part.includes(">")) {
        bad.push(r);
        break;
      }
    }
  }

  if (bad.length) {
    die(
      `Windows-unsafe path characters detected (< or >). Fix these paths:\n` +
        bad.map((x) => `  - ${x}`).join("\n")
    );
  }
}

function validateDataFiles() {
  const tagsPath = path.join(ROOT, "_data", "tags.yml");
  const challengesPath = path.join(ROOT, "_data", "challenges.yml");

  if (!isFile(tagsPath)) die("Missing _data/tags.yml");
  if (!isFile(challengesPath)) die("Missing _data/challenges.yml");

  const tags = loadYamlFile(tagsPath);
  const challenges = loadYamlFile(challengesPath);

  if (!tags || typeof tags !== "object" || Array.isArray(tags)) {
    die("_data/tags.yml must be a YAML mapping (id -> object)");
  }
  if (!challenges || typeof challenges !== "object" || Array.isArray(challenges)) {
    die("_data/challenges.yml must be a YAML mapping (id -> object)");
  }

  const tagIds = new Set(Object.keys(tags));
  const challengeIds = new Set(Object.keys(challenges));

  for (const [id, obj] of Object.entries(tags)) {
    if (!SLUG_RE.test(id)) die(`_data/tags.yml: invalid id ${JSON.stringify(id)}`);
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
      die(`_data/tags.yml: ${id} must map to an object`);
    }
    if (typeof obj.label !== "string" || !obj.label.trim()) {
      die(`_data/tags.yml: ${id}.label is required`);
    }
    if (obj.aliases != null) {
      if (!Array.isArray(obj.aliases)) die(`_data/tags.yml: ${id}.aliases must be a list`);
      for (const a of obj.aliases) {
        if (typeof a !== "string" || !a.trim()) die(`_data/tags.yml: ${id}.aliases must be strings`);
      }
    }
  }

  for (const [id, obj] of Object.entries(challenges)) {
    if (!SLUG_RE.test(id)) die(`_data/challenges.yml: invalid id ${JSON.stringify(id)}`);
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
      die(`_data/challenges.yml: ${id} must map to an object`);
    }
    if (typeof obj.label !== "string" || !obj.label.trim()) {
      die(`_data/challenges.yml: ${id}.label is required`);
    }
    if (obj.aliases != null) {
      if (!Array.isArray(obj.aliases)) die(`_data/challenges.yml: ${id}.aliases must be a list`);
      for (const a of obj.aliases) {
        if (typeof a !== "string" || !a.trim()) die(`_data/challenges.yml: ${id}.aliases must be strings`);
        if (a.includes(",")) {
          warn(`${rel(challengesPath)}: ${id}.aliases contains a comma. If you meant multiple aliases, split into separate list items.`);
        }
      }
    }
  }

  return { tagIds, challengeIds };
}

function validateGames({ tagIds, challengeIds }) {
  const dir = path.join(ROOT, "_games");
  if (!isDir(dir)) return;

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .map((f) => path.join(dir, f));

  const gameIds = new Set();

  for (const p of files) {
    const fileRel = rel(p);
    const fm = parseFrontMatter(p);

    mustSlug(fileRel, "game_id", fm.game_id);
    mustString(fileRel, "name", fm.name);

    if (gameIds.has(fm.game_id)) die(`${fileRel}: duplicate game_id ${fm.game_id}`);
    gameIds.add(fm.game_id);

    if (fm.tags != null) {
      mustArrayOfStrings(fileRel, "tags", fm.tags);
      for (const t of fm.tags) {
        if (!tagIds.has(t)) die(`${fileRel}: unknown tag id in tags: ${t}`);
      }
    }

    if (fm.challenges != null) {
      mustArrayOfStrings(fileRel, "challenges", fm.challenges);
      for (const c of fm.challenges) {
        if (!challengeIds.has(c)) die(`${fileRel}: unknown challenge id in challenges: ${c}`);
      }
    }
  }

  return gameIds;
}

function validateRunners(gameIds) {
  const dir = path.join(ROOT, "_runners");
  if (!isDir(dir)) return;

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => path.join(dir, f));

  const runnerIds = new Set();

  for (const p of files) {
    const fileRel = rel(p);
    const fm = parseFrontMatter(p);

    mustSlug(fileRel, "runner_id", fm.runner_id);
    mustString(fileRel, "name", fm.name);

    if (runnerIds.has(fm.runner_id)) die(`${fileRel}: duplicate runner_id ${fm.runner_id}`);
    runnerIds.add(fm.runner_id);

    if (fm.games != null) {
      mustArrayOfStrings(fileRel, "games", fm.games);
      for (const g of fm.games) {
        if (!gameIds.has(g)) die(`${fileRel}: unknown game_id in games: ${g}`);
      }
    }
  }

  return runnerIds;
}

function validateRuns({ gameIds, runnerIds, challengeIds }) {
  const dir = path.join(ROOT, "_runs");
  if (!isDir(dir)) return;

  const files = listFilesRecursive(dir)
    .filter((p) => p.endsWith(".md"))
    .filter((p) => !rel(p).includes("/_TEMPLATES/"));

  const filtered = files.filter((p) => path.basename(p).toLowerCase() !== "readme.md");

  for (const p of filtered) {
    const fileRel = rel(p);
    const fm = parseFrontMatter(p);

    mustSlug(fileRel, "game_id", fm.game_id);
    mustSlug(fileRel, "runner_id", fm.runner_id);
    mustSlug(fileRel, "category_slug", fm.category_slug);
    mustSlug(fileRel, "challenge_id", fm.challenge_id);

    mustString(fileRel, "runner", fm.runner);
    mustString(fileRel, "category", fm.category);
    mustDate(fileRel, "date_completed", fm.date_completed);

    if (!gameIds.has(fm.game_id)) die(`${fileRel}: unknown game_id: ${fm.game_id}`);
    if (!runnerIds.has(fm.runner_id)) die(`${fileRel}: unknown runner_id: ${fm.runner_id}`);
    if (!challengeIds.has(fm.challenge_id)) die(`${fileRel}: unknown challenge_id: ${fm.challenge_id}`);

    if (fm.restrictions != null) {
      mustArrayOfStrings(fileRel, "restrictions", fm.restrictions);
    }
    if (fm.restriction_ids != null) {
      mustArrayOfStrings(fileRel, "restriction_ids", fm.restriction_ids);
      for (const rid of fm.restriction_ids) {
        if (!SLUG_RE.test(rid)) die(`${fileRel}: restriction_ids must be kebab-case (bad: ${rid})`);
      }
    }
    if (Array.isArray(fm.restrictions) && Array.isArray(fm.restriction_ids)) {
      if (fm.restrictions.length !== fm.restriction_ids.length) {
        die(`${fileRel}: restrictions and restriction_ids must have the same length`);
      }
    }

    if ("time_primary" in fm) mustTimeOrNull(fileRel, "time_primary", fm.time_primary);
    if ("time_secondary" in fm) mustTimeOrNull(fileRel, "time_secondary", fm.time_secondary);
    if ("timing_method_primary" in fm)
      mustTimingOrNull(fileRel, "timing_method_primary", fm.timing_method_primary);
    if ("timing_method_secondary" in fm)
      mustTimingOrNull(fileRel, "timing_method_secondary", fm.timing_method_secondary);

    if ("verified" in fm) {
      if (typeof fm.verified !== "boolean") die(`${fileRel}: verified must be boolean`);
      if (fm.verified === true) {
        mustString(fileRel, "verified_by", fm.verified_by);
      }
    }

    if (fm.video_link != null) {
      if (typeof fm.video_link !== "string" || !/^https?:\/\//i.test(fm.video_link)) {
        die(`${fileRel}: video_link must be an http(s) URL`);
      }
    } else {
      warn(`${fileRel}: video_link missing`);
    }

    const base = path.basename(p);
    const m = /^(\d{4}-\d{2}-\d{2})__([a-z0-9-]+)__([a-z0-9-]+)__([a-z0-9-]+)__([0-9]{2,3})\.md$/.exec(
      base
    );
    if (!m) {
      warn(`${fileRel}: filename does not match expected pattern`);
    }
  }
}

// ---------- main ----------

function main() {
  validateWindowsUnsafeNames();
  const { tagIds, challengeIds } = validateDataFiles();
  const gameIds = validateGames({ tagIds, challengeIds }) || new Set();
  const runnerIds = validateRunners(gameIds) || new Set();
  validateRuns({ gameIds, runnerIds, challengeIds });

  console.log("OK schema validation passed");
}

main();

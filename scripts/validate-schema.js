#!/usr/bin/env node
/*
Repo schema validation (read-only).

Key feature:
- Challenge + tag alias resolution:
  Accepts canonical IDs, labels, and aliases (plus common formatting variations),
  but warns when non-canonical values are used and suggests the canonical ID.

Checks:
  - Windows-unsafe characters in filenames/folders (currently: < and >)
  - _data/tags.yml and _data/challenges.yml load and have sane shapes
  - _games/*.md: required fields + tag/challenge references exist (with alias resolution)
  - _games/*.md: categories_data (parents + optional children) validated
  - _runners/*.md: required fields + referenced games exist
  - _runs/*.md (excluding _TEMPLATES): required fields + references exist (with alias resolution)
*/

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const ROOT = process.cwd();

const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CATEGORY_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;
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
  if (typeof value !== "string" || !ID_RE.test(value)) {
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
  if (value === null || value === undefined) return;
  if (typeof value !== "string" || !TIME_RE.test(value)) {
    die(`${fileRel}: ${field} must be HH:MM:SS(.mmm optional) or null`);
  }
}

function mustTimingOrNull(fileRel, field, value) {
  if (value === null || value === undefined) return;
  if (typeof value !== "string" || !TIMING_SET.has(value)) {
    die(`${fileRel}: ${field} must be one of ${Array.from(TIMING_SET).join(", ")} or null`);
  }
}

function mustDate(fileRel, field, value) {
  // js-yaml may parse unquoted YYYY-MM-DD as Date.
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    const iso = value.toISOString().slice(0, 10);
    if (!DATE_RE.test(iso)) die(`${fileRel}: ${field} must be YYYY-MM-DD`);
    return;
  }
  if (typeof value !== "string" || !DATE_RE.test(value)) die(`${fileRel}: ${field} must be YYYY-MM-DD`);
}

function mustCategorySlug(fileRel, field, value) {
  if (typeof value !== "string" || !CATEGORY_SLUG_RE.test(value)) {
    die(
      `${fileRel}: ${field} must be kebab-case with optional nesting using "/": ${JSON.stringify(value)}`
    );
  }
}

/**
 * categories_data schema:
 * categories_data:
 *   - slug: parent-slug         (single segment)
 *     label: Parent Label       (optional)
 *     children:                (optional)
 *       - slug: child-slug      (single segment)
 *         label: Child Label    (optional)
 *
 * Validates:
 * - correct shapes
 * - slugs match allowed pattern
 * - parents have no "/"
 * - children have no "/"
 * - no duplicate parent slugs
 * - no duplicate child slugs under a parent
 * - no duplicate full slugs across all parents (parent/child)
 */
function validateCategoriesData(fileRel, fm) {
  if (fm.categories_data == null) return;

  if (!Array.isArray(fm.categories_data)) {
    die(`${fileRel}: categories_data must be a YAML list`);
  }

  const parentSeen = new Set();
  const fullSeen = new Set();

  for (const [idx, cat] of fm.categories_data.entries()) {
    if (!cat || typeof cat !== "object" || Array.isArray(cat)) {
      die(`${fileRel}: categories_data[${idx}] must be an object`);
    }

    if (typeof cat.slug !== "string" || !cat.slug.trim()) {
      die(`${fileRel}: categories_data[${idx}].slug is required`);
    }
    const pslug = cat.slug.trim();

    if (pslug.includes("/")) {
      die(
        `${fileRel}: categories_data[${idx}].slug must be a top-level slug only (no "/"): ${JSON.stringify(pslug)}`
      );
    }

    mustCategorySlug(fileRel, `categories_data[${idx}].slug`, pslug);

    if (cat.label != null) {
      if (typeof cat.label !== "string" || !cat.label.trim()) {
        die(`${fileRel}: categories_data[${idx}].label must be a non-empty string if provided`);
      }
    }

    if (parentSeen.has(pslug)) {
      die(`${fileRel}: duplicate categories_data parent slug: ${pslug}`);
    }
    parentSeen.add(pslug);

    if (fullSeen.has(pslug)) {
      die(`${fileRel}: duplicate category slug: ${pslug}`);
    }
    fullSeen.add(pslug);

    if (cat.children == null) continue;

    if (!Array.isArray(cat.children)) {
      die(`${fileRel}: categories_data[${idx}].children must be a YAML list`);
    }

    const childSeen = new Set();

    for (const [cidx, ch] of cat.children.entries()) {
      if (!ch || typeof ch !== "object" || Array.isArray(ch)) {
        die(`${fileRel}: categories_data[${idx}].children[${cidx}] must be an object`);
      }

      if (typeof ch.slug !== "string" || !ch.slug.trim()) {
        die(`${fileRel}: categories_data[${idx}].children[${cidx}].slug is required`);
      }
      const cslug = ch.slug.trim();

      if (cslug.includes("/")) {
        die(
          `${fileRel}: categories_data[${idx}].children[${cidx}].slug must be a single segment (no "/"): ${JSON.stringify(cslug)}`
        );
      }

      mustCategorySlug(fileRel, `categories_data[${idx}].children[${cidx}].slug`, cslug);

      if (ch.label != null) {
        if (typeof ch.label !== "string" || !ch.label.trim()) {
          die(`${fileRel}: categories_data[${idx}].children[${cidx}].label must be a non-empty string if provided`);
        }
      }

      if (childSeen.has(cslug)) {
        die(`${fileRel}: duplicate child slug under ${pslug}: ${cslug}`);
      }
      childSeen.add(cslug);

      const full = `${pslug}/${cslug}`;
      if (fullSeen.has(full)) {
        die(`${fileRel}: duplicate full category slug: ${full}`);
      }
      fullSeen.add(full);
    }
  }
}

/* ------------------------------------------------------------------
   Alias resolution helpers
------------------------------------------------------------------- */

// Normalize a human string into a stable lookup key.
function normKey(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[_]+/g, " ")
    .replace(/[-]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ") // drop punctuation (unicode-safe)
    .replace(/\s+/g, " ")
    .trim();
}

function keyVariants(s) {
  const k = normKey(s);
  if (!k) return [];
  const noSpaces = k.replace(/\s+/g, "");
  return noSpaces && noSpaces !== k ? [k, noSpaces] : [k];
}

// Build a resolver for a YAML mapping: id -> { label, aliases }
function buildResolver(kindName, yamlObj, filePathRelForErrors) {
  if (!yamlObj || typeof yamlObj !== "object" || Array.isArray(yamlObj)) {
    die(`${filePathRelForErrors}: must be a YAML mapping (id -> object)`);
  }

  const ids = new Set(Object.keys(yamlObj));
  const keyToId = new Map();

  function registerKey(key, id) {
    if (!key) return;
    if (keyToId.has(key) && keyToId.get(key) !== id) {
      warn(
        `${filePathRelForErrors}: ${kindName} alias/label key "${key}" is ambiguous between "${keyToId.get(
          key
        )}" and "${id}". Keep aliases unique if possible.`
      );
      return;
    }
    keyToId.set(key, id);
  }

  for (const [id, obj] of Object.entries(yamlObj)) {
    if (!ID_RE.test(id)) die(`${filePathRelForErrors}: invalid id ${JSON.stringify(id)}`);
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
      die(`${filePathRelForErrors}: ${id} must map to an object`);
    }
    if (typeof obj.label !== "string" || !obj.label.trim()) {
      die(`${filePathRelForErrors}: ${id}.label is required`);
    }

    for (const v of keyVariants(id)) registerKey(v, id);
    for (const v of keyVariants(obj.label)) registerKey(v, id);

    if (obj.aliases != null) {
      if (!Array.isArray(obj.aliases)) die(`${filePathRelForErrors}: ${id}.aliases must be a list`);
      for (const a of obj.aliases) {
        if (typeof a !== "string" || !a.trim()) die(`${filePathRelForErrors}: ${id}.aliases must be strings`);
        for (const v of keyVariants(a)) registerKey(v, id);
      }
    }
  }

  function resolve(rawValue) {
    const raw = String(rawValue).trim();
    if (!raw) return null;

    if (ids.has(raw)) return { id: raw, source: "id", canonical: raw };

    for (const v of keyVariants(raw)) {
      const hit = keyToId.get(v);
      if (hit) {
        const source = hit === raw ? "id" : "alias";
        return { id: hit, source, canonical: hit };
      }
    }

    return null;
  }

  return { ids, resolve };
}

/* ------------------------------------------------------------------
   Validations
------------------------------------------------------------------- */

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

  const tagsRel = rel(tagsPath);
  const challengesRel = rel(challengesPath);

  const tagResolver = buildResolver("tag", tags, tagsRel);
  const challengeResolver = buildResolver("challenge", challenges, challengesRel);

  return { tagResolver, challengeResolver };
}

function validateGames({ tagResolver, challengeResolver }) {
  const dir = path.join(ROOT, "_games");
  if (!isDir(dir)) return new Set();

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

    // categories_data schema (parents + optional children)
    validateCategoriesData(fileRel, fm);

    if (gameIds.has(fm.game_id)) die(`${fileRel}: duplicate game_id ${fm.game_id}`);
    gameIds.add(fm.game_id);

    // tags (allow aliases/labels)
    if (fm.tags != null) {
      mustArrayOfStrings(fileRel, "tags", fm.tags);
      for (const t of fm.tags) {
        const r = tagResolver.resolve(t);
        if (!r) die(`${fileRel}: unknown tag in tags: ${t}`);
        if (r.source !== "id" && r.canonical !== t) {
          warn(`${fileRel}: tag "${t}" should be "${r.canonical}" (canonical id)`);
        }
      }
    }

    // challenges (allow aliases/labels)
    if (fm.challenges != null) {
      mustArrayOfStrings(fileRel, "challenges", fm.challenges);
      for (const c of fm.challenges) {
        const r = challengeResolver.resolve(c);
        if (!r) die(`${fileRel}: unknown challenge in challenges: ${c}`);
        if (r.source !== "id" && r.canonical !== c) {
          warn(`${fileRel}: challenge "${c}" should be "${r.canonical}" (canonical id)`);
        }
      }
    }
  }

  return gameIds;
}

function validateRunners(gameIds) {
  const dir = path.join(ROOT, "_runners");
  if (!isDir(dir)) return new Set();

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

function validateRuns({ gameIds, runnerIds, challengeResolver }) {
  const dir = path.join(ROOT, "_runs");
  if (!isDir(dir)) return;

  const files = listFilesRecursive(dir)
    .filter((p) => p.endsWith(".md"))
    .filter((p) => !rel(p).includes("/_TEMPLATES/"))
    .filter((p) => path.basename(p).toLowerCase() !== "readme.md");

  for (const p of files) {
    const fileRel = rel(p);
    const fm = parseFrontMatter(p);

    mustSlug(fileRel, "game_id", fm.game_id);
    mustSlug(fileRel, "runner_id", fm.runner_id);

    if (typeof fm.category_slug !== "string" || !CATEGORY_SLUG_RE.test(fm.category_slug)) {
      die(
        `${fileRel}: category_slug must allow optional nesting with "/": ${JSON.stringify(fm.category_slug)}`
      );
    }

    mustString(fileRel, "runner", fm.runner);
    mustString(fileRel, "category", fm.category);
    mustDate(fileRel, "date_completed", fm.date_completed);

    if (!gameIds.has(fm.game_id)) die(`${fileRel}: unknown game_id: ${fm.game_id}`);
    if (!runnerIds.has(fm.runner_id)) die(`${fileRel}: unknown runner_id: ${fm.runner_id}`);

    // challenge_id: allow aliases/labels
    if (fm.challenge_id === undefined || fm.challenge_id === null) {
      die(`${fileRel}: challenge_id is required`);
    }
    if (typeof fm.challenge_id !== "string" || !fm.challenge_id.trim()) {
      die(`${fileRel}: challenge_id must be a non-empty string`);
    }

    const cr = challengeResolver.resolve(fm.challenge_id);
    if (!cr) die(`${fileRel}: unknown challenge_id: ${fm.challenge_id}`);
    if (cr.source !== "id" && cr.canonical !== fm.challenge_id) {
      warn(`${fileRel}: challenge_id "${fm.challenge_id}" should be "${cr.canonical}" (canonical id)`);
    }

    if (fm.restrictions != null) {
      mustArrayOfStrings(fileRel, "restrictions", fm.restrictions);
    }
    if (fm.restriction_ids != null) {
      mustArrayOfStrings(fileRel, "restriction_ids", fm.restriction_ids);
      for (const rid of fm.restriction_ids) {
        if (!ID_RE.test(rid)) die(`${fileRel}: restriction_ids must be kebab-case (bad: ${rid})`);
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

    // Optional filename pattern warning (do not fail)
    const base = path.basename(p);
    const m = /^(\d{4}-\d{2}-\d{2})__([a-z0-9-]+)__([a-z0-9-]+)__([a-z0-9-]+)__([0-9]{2,3})\.md$/.exec(
      base
    );
    if (!m) {
      warn(`${fileRel}: filename does not match expected pattern`);
    }
  }
}

function main() {
  validateWindowsUnsafeNames();

  const { tagResolver, challengeResolver } = validateDataFiles();
  const gameIds = validateGames({ tagResolver, challengeResolver });
  const runnerIds = validateRunners(gameIds);

  validateRuns({ gameIds, runnerIds, challengeResolver });

  console.log("OK schema validation passed");
}

main();

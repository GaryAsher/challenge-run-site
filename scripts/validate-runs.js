#!/usr/bin/env node
/*
Validate queued run submissions in _queue_runs/<game_id>/...
*/

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const QUEUE_DIR = path.join(ROOT, "_queue_runs");

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

function parseScalar(raw) {
  const v = stripQuotes(raw);
  if (v === "") return "";
  if (v === "true") return true;
  if (v === "false") return false;
  return v;
}

function parseFrontMatter(fileText) {
  const lines = fileText.split(/\r?\n/);
  if (lines[0] !== "---") return { data: {}, hasFrontMatter: false };

  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") {
      end = i;
      break;
    }
  }
  if (end === -1) return { data: {}, hasFrontMatter: false };

  const fm = lines.slice(1, end);
  const data = {};
  let i = 0;

  while (i < fm.length) {
    const line = fm[i];

    if (!line || /^\s*$/.test(line) || /^\s*#/.test(line)) {
      i++;
      continue;
    }

    const m = /^([A-Za-z0-9_]+)\s*:\s*(.*)$/.exec(line);
    if (!m) {
      i++;
      continue;
    }

    const key = m[1];
    const rest = m[2] ?? "";

    if (rest.trim() === "") {
      const items = [];
      let j = i + 1;

      while (j < fm.length) {
        const ln = fm[j];
        if (!ln || /^\s*$/.test(ln) || /^\s*#/.test(ln)) {
          j++;
          continue;
        }

        const li = /^\s*-\s*(.*)$/.exec(ln);
        if (li) {
          const item = stripQuotes(li[1] ?? "").trim();
          if (item !== "") items.push(item);
          j++;
          continue;
        }

        break;
      }

      data[key] = items.length ? items : "";
      i = j;
      continue;
    }

    const trimmed = rest.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      const inner = trimmed.slice(1, -1).trim();
      if (!inner) {
        data[key] = [];
      } else {
        data[key] = inner
          .split(",")
          .map((x) => stripQuotes(x).trim())
          .filter(Boolean);
      }
      i++;
      continue;
    }

    data[key] = parseScalar(rest.trim());
    i++;
  }

  return { data, hasFrontMatter: true };
}

// ---------- validation helpers ----------
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?$/;
const STATUS_SET = new Set(["pending", "approved", "rejected"]);
const TIMING_SET = new Set(["RTA", "IGT", "LRT"]);

function fail(fileRel, msg) {
  throw new Error(`${fileRel}: ${msg}`);
}

function existsDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function listMdFilesRecursive(rootDir) {
  if (!existsDir(rootDir)) return [];
  const out = [];

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.name === ".gitkeep") continue;

      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(full);
        continue;
      }
      if (ent.isFile() && ent.name.endsWith(".md")) {
        out.push(full);
      }
    }
  }

  walk(rootDir);
  return out;
}

function parseFilename(filePath) {
  const base = path.basename(filePath);
  const m =
    /^(\d{4}-\d{2}-\d{2})__([a-z0-9-]+)__([a-z0-9-]+)__([a-z0-9-]+)__([0-9]{2,3})\.md$/.exec(
      base
    );

  if (!m) return null;

  return {
    dateSubmitted: m[1], // from filename
    game_id: m[2],
    runner_id: m[3],
    category_slug: m[4],
    nn: m[5],
  };
}

function asArray(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === "string" && v.trim() === "") return [];
  if (typeof v === "string") {
    return v
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

function getRelToQueue(filePath) {
  return path.relative(QUEUE_DIR, filePath).replace(/\\/g, "/");
}

function getGameFolderFromQueuePath(filePath) {
  const relToQueue = getRelToQueue(filePath);
  const parts = relToQueue.split("/").filter(Boolean);
  return parts.length ? parts[0] : "";
}

function validateOne(filePath) {
  const fileRel = path.relative(ROOT, filePath).replace(/\\/g, "/");
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, hasFrontMatter } = parseFrontMatter(raw);

  if (!hasFrontMatter) fail(fileRel, "Missing YAML front matter (--- ... ---).");

  const fn = parseFilename(filePath);
  if (!fn) {
    fail(
      fileRel,
      "Bad filename. Expected: YYYY-MM-DD__game-id__runner-id__category-slug__NN.md"
    );
  }

  // Enforce folder routing: _queue_runs/<game_id>/...
  const folderGame = getGameFolderFromQueuePath(filePath);
  if (!folderGame) {
    fail(fileRel, "Queued runs must live under _queue_runs/<game_id>/");
  }
  if (folderGame !== fn.game_id) {
    fail(
      fileRel,
      `game_id mismatch (folder=${folderGame}, filename=${fn.game_id})`
    );
  }

  const relToQueue = getRelToQueue(filePath);
  const parts = relToQueue.split("/").filter(Boolean);
  if (parts.length > 2) {
    console.log(
      `WARN ${fileRel}: extra subfolders under game_id folder are allowed but not recommended.`
    );
  }

  // Required routing + display fields
  const required = [
    "game_id",
    "runner_id",
    "category_slug",
    "challenge_id",
    "runner",
    "category",
    "date_submitted", // NEW: enforced
    "date_completed",
    "status",
  ];

  for (const k of required) {
    const v = data[k];
    if (v === undefined || v === null || String(v).trim() === "") {
      fail(fileRel, `Missing required field: ${k}`);
    }
  }

  // Filename must match content IDs
  if (String(data.game_id).trim() !== fn.game_id)
    fail(
      fileRel,
      `game_id mismatch (filename=${fn.game_id}, frontmatter=${data.game_id})`
    );
  if (String(data.runner_id).trim() !== fn.runner_id)
    fail(
      fileRel,
      `runner_id mismatch (filename=${fn.runner_id}, frontmatter=${data.runner_id})`
    );
  if (String(data.category_slug).trim() !== fn.category_slug)
    fail(
      fileRel,
      `category_slug mismatch (filename=${fn.category_slug}, frontmatter=${data.category_slug})`
    );

  // Enforce slugs
  if (!SLUG_RE.test(String(data.game_id)))
    fail(
      fileRel,
      `game_id must be a slug (lowercase, hyphen). Got: ${data.game_id}`
    );
  if (!SLUG_RE.test(String(data.runner_id)))
    fail(
      fileRel,
      `runner_id must be a slug (lowercase, hyphen). Got: ${data.runner_id}`
    );
  if (!SLUG_RE.test(String(data.category_slug)))
    fail(
      fileRel,
      `category_slug must be a slug (lowercase, hyphen). Got: ${data.category_slug}`
    );
  if (!SLUG_RE.test(String(data.challenge_id)))
    fail(
      fileRel,
      `challenge_id must be a slug (lowercase, hyphen). Got: ${data.challenge_id}`
    );

  // Status
  const st = String(data.status).trim().toLowerCase();
  if (!STATUS_SET.has(st))
    fail(
      fileRel,
      `status must be one of: pending, approved, rejected. Got: ${data.status}`
    );

  // Dates
  if (!DATE_RE.test(String(data.date_completed).trim()))
    fail(
      fileRel,
      `date_completed must be YYYY-MM-DD. Got: ${data.date_completed}`
    );

  // Filename date validation
  if (!DATE_RE.test(String(fn.dateSubmitted)))
    fail(fileRel, `filename date must be YYYY-MM-DD. Got: ${fn.dateSubmitted}`);

  // NEW: date_submitted must be valid and match filename date
  const ds = String(data.date_submitted).trim();
  if (!DATE_RE.test(ds))
    fail(fileRel, `date_submitted must be YYYY-MM-DD. Got: ${data.date_submitted}`);

  if (ds !== fn.dateSubmitted) {
    fail(
      fileRel,
      `date_submitted must match filename date (filename=${fn.dateSubmitted}, frontmatter=${ds})`
    );
  }

  // Approved expectations
  if (st === "approved") {
    if (data.verified !== true) fail(fileRel, "approved runs must have verified: true");
    if (!data.verified_by || String(data.verified_by).trim() === "")
      fail(fileRel, "approved runs must have verified_by filled in");
  }

  // Timing checks (optional)
  const t1 = String(data.time_primary ?? "").trim();
  const m1 = String(data.timing_method_primary ?? "").trim();
  const t2 = String(data.time_secondary ?? "").trim();
  const m2 = String(data.timing_method_secondary ?? "").trim();

  if (t1 && !TIME_RE.test(t1))
    fail(fileRel, `time_primary invalid. Use HH:MM:SS or HH:MM:SS.MMM. Got: ${t1}`);
  if (t2 && !TIME_RE.test(t2))
    fail(fileRel, `time_secondary invalid. Use HH:MM:SS or HH:MM:SS.MMM. Got: ${t2}`);

  if (m1 && !TIMING_SET.has(m1))
    fail(fileRel, `timing_method_primary must be RTA|IGT|LRT. Got: ${m1}`);
  if (m2 && !TIMING_SET.has(m2))
    fail(fileRel, `timing_method_secondary must be RTA|IGT|LRT. Got: ${m2}`);

  if (t1 && !m1) fail(fileRel, "time_primary provided but timing_method_primary is empty");
  if (m1 && !t1) fail(fileRel, "timing_method_primary provided but time_primary is empty");
  if (t2 && !m2) fail(fileRel, "time_secondary provided but timing_method_secondary is empty");
  if (m2 && !t2) fail(fileRel, "timing_method_secondary provided but time_secondary is empty");

  // Arrays
  const restrictions = asArray(data.restrictions);
  const restriction_ids = asArray(data.restriction_ids);

  if (restriction_ids.some((x) => !SLUG_RE.test(String(x)))) {
    fail(
      fileRel,
      `restriction_ids must be slugs. Got: ${JSON.stringify(restriction_ids)}`
    );
  }

  if (
    restriction_ids.length &&
    restrictions.length &&
    restriction_ids.length !== restrictions.length
  ) {
    console.log(
      `WARN ${fileRel}: restrictions and restriction_ids lengths differ (${restrictions.length} vs ${restriction_ids.length})`
    );
  }

  return true;
}

function main() {
  if (!existsDir(QUEUE_DIR)) {
    console.log("No _queue_runs/ directory found.");
    return;
  }

  const files = listMdFilesRecursive(QUEUE_DIR);
  if (!files.length) {
    console.log("No queued run files found in _queue_runs/.");
    return;
  }

  let ok = 0;
  for (const f of files) {
    validateOne(f);
    ok++;
  }

  console.log(`Validated ${ok} queued run file(s).`);
}

try {
  main();
} catch (err) {
  console.error(String(err && err.message ? err.message : err));
  process.exit(1);
}

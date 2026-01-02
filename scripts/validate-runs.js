#!/usr/bin/env node
/* =========================================================
   validate-runs.js (no dependencies)
   - Validates queued run files in _queue_runs/
   - Enforces: URLs use category_slug, display uses category
   - Hardened checks + helpful error output
   ========================================================= */

const fs = require("fs");
const path = require("path");

const QUEUE_DIR = path.join(process.cwd(), "_queue_runs");

const ALLOWED_STATUS = new Set(["pending", "approved", "rejected"]);
const ALLOWED_TIMING = new Set(["RTA", "IGT", "LRT"]);

// ---------- tiny YAML-ish front matter parser (subset) ----------
function parseFrontMatter(md) {
  const trimmed = md.replace(/^\uFEFF/, "");
  if (!trimmed.startsWith("---")) {
    return { data: {}, body: md, errors: ["Missing front matter (must start with ---)."] };
  }

  const parts = trimmed.split("\n");
  // find second ---
  let endIdx = -1;
  for (let i = 1; i < parts.length; i++) {
    if (parts[i].trim() === "---") {
      endIdx = i;
      break;
    }
  }
  if (endIdx === -1) {
    return { data: {}, body: md, errors: ["Front matter not closed (missing ending ---)."] };
  }

  const fmLines = parts.slice(1, endIdx);
  const body = parts.slice(endIdx + 1).join("\n");

  const data = {};
  const errors = [];

  function unquote(s) {
    const v = String(s);
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      return v.slice(1, -1);
    }
    return v;
  }

  for (let i = 0; i < fmLines.length; i++) {
    const raw = fmLines[i];
    const line = raw.replace(/\t/g, "  ");
    const t = line.trim();

    if (!t || t.startsWith("#")) continue;

    // list item lines are only valid when we are in a list context (handled below)
    if (t.startsWith("- ")) {
      errors.push(`Unexpected list item without a key on line ${i + 1}: "${t}"`);
      continue;
    }

    const m = /^([A-Za-z0-9_]+)\s*:\s*(.*)$/.exec(line);
    if (!m) {
      errors.push(`Invalid front matter line ${i + 1}: "${t}"`);
      continue;
    }

    const key = m[1];
    let rest = (m[2] ?? "").trim();

    // empty value -> null
    if (rest === "") {
      // Check if this starts a YAML list:
      // key:
      //   - a
      //   - b
      const list = [];
      let j = i + 1;
      while (j < fmLines.length) {
        const nxtRaw = fmLines[j];
        const nxt = nxtRaw.trim();
        if (!nxt) {
          j++;
          continue;
        }
        // next key starts
        if (/^[A-Za-z0-9_]+\s*:/.test(nxt)) break;

        const li = /^\-\s+(.*)$/.exec(nxt);
        if (!li) {
          errors.push(`Invalid list item line ${j + 1}: "${nxt}"`);
          j++;
          continue;
        }
        list.push(unquote(li[1].trim()));
        j++;
      }

      if (j > i + 1) {
        data[key] = list;
        i = j - 1;
      } else {
        data[key] = null;
      }
      continue;
    }

    // inline list: key: [a, b]
    if (rest.startsWith("[") && rest.endsWith("]")) {
      const inner = rest.slice(1, -1).trim();
      if (!inner) {
        data[key] = [];
      } else {
        data[key] = inner
          .split(",")
          .map((x) => unquote(x.trim()))
          .filter(Boolean);
      }
      continue;
    }

    // booleans
    if (rest === "true" || rest === "false") {
      data[key] = rest === "true";
      continue;
    }

    // numbers (only if it is clearly numeric)
    if (/^-?\d+(\.\d+)?$/.test(rest)) {
      // keep as number, but it’s fine if you want string behavior later
      data[key] = Number(rest);
      continue;
    }

    data[key] = unquote(rest);
  }

  return { data, body, errors };
}

// ---------- validators ----------
function isNonEmptyString(v) {
  return typeof v === "string" && v.trim() !== "";
}

function isSlug(v) {
  if (!isNonEmptyString(v)) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v.trim());
}

function isDateYYYYMMDD(v) {
  if (!isNonEmptyString(v)) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(v.trim());
}

function isTimeHMS(v) {
  if (!isNonEmptyString(v)) return false;
  // "HH:MM:SS" or "HH:MM:SS.MMM"
  return /^\d{2}:\d{2}:\d{2}(\.\d{1,3})?$/.test(v.trim());
}

function norm(v) {
  return String(v ?? "").trim();
}

// ---------- main ----------
function listMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".md"))
    .map((f) => path.join(dir, f));
}

function fail(msg) {
  console.error(msg);
  process.exitCode = 1;
}

function validateFile(fp) {
  const raw = fs.readFileSync(fp, "utf8");
  const { data, errors: fmErrors } = parseFrontMatter(raw);

  const errs = [...fmErrors];

  // Required keys for all queued files
  const required = [
    "status",
    "game_id",
    "runner_id",
    "category_slug",
    "challenge_id",
    "runner",
    "category",
    "date_completed",
    "video_link"
  ];

  required.forEach((k) => {
    if (!isNonEmptyString(data[k])) errs.push(`Missing or empty required field: ${k}`);
  });

  // status
  const status = norm(data.status).toLowerCase();
  if (status && !ALLOWED_STATUS.has(status)) {
    errs.push(`Invalid status "${data.status}" (must be pending | approved | rejected)`);
  }

  // slug rules
  if (data.category_slug && !isSlug(data.category_slug)) {
    errs.push(`category_slug must be kebab-case (example: underworld-any). Got: "${data.category_slug}"`);
  }

  // date format
  if (data.date_completed && !isDateYYYYMMDD(data.date_completed)) {
    errs.push(`date_completed must be YYYY-MM-DD. Got: "${data.date_completed}"`);
  }

  // timing checks (optional)
  const tm1 = norm(data.timing_method_primary);
  const t1 = norm(data.time_primary);
  const tm2 = norm(data.timing_method_secondary);
  const t2 = norm(data.time_secondary);

  if (t1 && !isTimeHMS(t1)) errs.push(`time_primary must be "HH:MM:SS" or "HH:MM:SS.MMM". Got: "${t1}"`);
  if (t2 && !isTimeHMS(t2)) errs.push(`time_secondary must be "HH:MM:SS" or "HH:MM:SS.MMM". Got: "${t2}"`);

  if (t1 && !tm1) errs.push(`time_primary is set but timing_method_primary is empty.`);
  if (tm1 && !ALLOWED_TIMING.has(tm1)) errs.push(`timing_method_primary must be RTA | IGT | LRT. Got: "${tm1}"`);

  if ((t2 && !tm2) || (tm2 && !t2)) {
    errs.push(`Secondary timing must include BOTH time_secondary and timing_method_secondary.`);
  }
  if (tm2 && !ALLOWED_TIMING.has(tm2)) errs.push(`timing_method_secondary must be RTA | IGT | LRT. Got: "${tm2}"`);

  // restrictions must be list if present
  if (data.restrictions != null && !Array.isArray(data.restrictions)) {
    errs.push(`restrictions must be a YAML list (e.g., restrictions: ["A", "B"] or dash-lines).`);
  }
  if (data.restriction_ids != null && !Array.isArray(data.restriction_ids)) {
    errs.push(`restriction_ids must be a YAML list.`);
  }

  // If approved/rejected, strongly recommend audit fields
  if (status === "approved" || status === "rejected") {
    if (!isNonEmptyString(data.verified_by)) {
      errs.push(`When status is ${status}, verified_by should be set (audit trail).`);
    }
  }

  return errs;
}

function main() {
  const files = listMarkdownFiles(QUEUE_DIR);

  if (!files.length) {
    console.log("No queued run files found in _queue_runs/. Nothing to validate.");
    return;
  }

  let anyErrors = false;

  for (const fp of files) {
    const errs = validateFile(fp);
    if (errs.length) {
      anyErrors = true;
      console.error(`\n❌ Validation failed: ${path.relative(process.cwd(), fp)}`);
      errs.forEach((e) => console.error("  - " + e));
    } else {
      console.log(`✅ OK: ${path.relative(process.cwd(), fp)}`);
    }
  }

  if (anyErrors) {
    console.error("\nValidation failed. Fix the errors above and re-run.");
    process.exit(1);
  }

  console.log("\nAll queued runs validated successfully.");
}

main();

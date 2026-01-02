const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const QUEUE_DIR = path.join(process.cwd(), "_queue_runs");
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function readFrontMatter(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!m) return { data: null, error: "Missing YAML front matter (--- ... ---)." };
  try {
    const data = yaml.load(m[1]) || {};
    return { data, error: null };
  } catch (e) {
    return { data: null, error: `YAML parse error: ${e.message}` };
  }
}

function isEmpty(v) {
  return v === null || v === undefined || String(v).trim() === "";
}

function validateOne(filePath) {
  const rel = path.relative(process.cwd(), filePath);
  const { data, error } = readFrontMatter(filePath);
  const issues = [];

  if (error) return { rel, ok: false, issues: [error] };

  const required = [
    "game_id",
    "runner_id",
    "category_slug",
    "category",
    "challenge_id",
    "date_completed",
    "video_link",
    "status"
  ];

  required.forEach((k) => {
    if (isEmpty(data[k])) issues.push(`Missing required field: ${k}`);
  });

  // status must be one of these
  if (!isEmpty(data.status)) {
    const s = String(data.status).trim().toLowerCase();
    if (!["pending", "approved", "rejected"].includes(s)) {
      issues.push(`Invalid status: "${data.status}" (use pending|approved|rejected)`);
    }
  }

  if (!isEmpty(data.category_slug)) {
    const slug = String(data.category_slug).trim();
    if (!SLUG_RE.test(slug)) {
      issues.push(`Invalid category_slug "${slug}". Use lowercase a-z, 0-9, hyphens only.`);
    }
  }

  const hasPrimaryTime = !isEmpty(data.time_primary);
  const hasPrimaryMethod = !isEmpty(data.timing_method_primary);
  if (hasPrimaryTime !== hasPrimaryMethod) {
    issues.push("If you set time_primary you must set timing_method_primary (and vice versa).");
  }

  const hasSecondaryTime = !isEmpty(data.time_secondary);
  const hasSecondaryMethod = !isEmpty(data.timing_method_secondary);
  if (hasSecondaryTime !== hasSecondaryMethod) {
    issues.push("If you set time_secondary you must set timing_method_secondary (and vice versa).");
  }

  return { rel, ok: issues.length === 0, issues };
}

function main() {
  if (!fs.existsSync(QUEUE_DIR)) {
    console.log("No _queue_runs folder found. Skipping validation.");
    return;
  }

  const files = fs
    .readdirSync(QUEUE_DIR)
    .filter((f) => f.endsWith(".md") || f.endsWith(".yml") || f.endsWith(".yaml"))
    .map((f) => path.join(QUEUE_DIR, f));

  if (!files.length) {
    console.log("No queued run files to validate.");
    return;
  }

  let anyBad = false;

  for (const fp of files) {
    const r = validateOne(fp);
    if (!r.ok) {
      anyBad = true;
      console.log(`\n❌ ${r.rel}`);
      r.issues.forEach((i) => console.log(`  - ${i}`));
    } else {
      console.log(`✅ ${r.rel}`);
    }
  }

  if (anyBad) {
    console.log("\nValidation failed. Fix the files above before promoting.");
    process.exitCode = 1;
  } else {
    console.log("\nValidation passed.");
  }
}

main();

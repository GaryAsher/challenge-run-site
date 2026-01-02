// scripts/promote-runs.js
// Promote approved queued runs from _queue_runs/ -> _runs/

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const QUEUE_DIR = path.join(ROOT, "_queue_runs");
const RUNS_DIR = path.join(ROOT, "_runs");

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function readFrontMatter(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  if (!raw.startsWith("---")) return { data: {}, raw };

  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { data: {}, raw };

  const fm = raw.slice(3, end).trim();
  const body = raw.slice(end + 4);

  // Tiny YAML-ish parser for simple "key: value" lines.
  // Good enough for status: approved/pending.
  const data = {};
  fm.split("\n").forEach((line) => {
    const m = /^([A-Za-z0-9_]+)\s*:\s*(.*)\s*$/.exec(line);
    if (!m) return;
    const key = m[1];
    let val = m[2] || "";
    val = val.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
    data[key] = val;
  });

  return { data, raw };
}

function main() {
  ensureDir(RUNS_DIR);

  if (!fs.existsSync(QUEUE_DIR)) {
    console.log("No _queue_runs/ directory found. Nothing to promote.");
    return;
  }

  const files = fs
    .readdirSync(QUEUE_DIR)
    .filter((f) => f.endsWith(".md"))
    .filter((f) => f !== ".gitkeep");

  if (files.length === 0) {
    console.log("No queued .md files found. Nothing to promote.");
    return;
  }

  let promoted = 0;
  let skipped = 0;

  for (const file of files) {
    const from = path.join(QUEUE_DIR, file);
    const { data } = readFrontMatter(from);

    const status = (data.status || "").toLowerCase().trim();

    if (status !== "approved") {
      console.log(`SKIP (status=${status || "missing"}): ${file}`);
      skipped += 1;
      continue;
    }

    const to = path.join(RUNS_DIR, file);

    if (fs.existsSync(to)) {
      console.log(`SKIP (already exists in _runs): ${file}`);
      skipped += 1;
      continue;
    }

    fs.renameSync(from, to);
    console.log(`PROMOTED: ${file}`);
    promoted += 1;
  }

  console.log(`Done. Promoted: ${promoted}. Skipped: ${skipped}.`);
}

main();

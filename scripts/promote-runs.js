#!/usr/bin/env node
/*
Promote queued runs from _queue_runs/.

Rules:
  - status: approved  -> move to _runs/
  - status: rejected  -> move to _runs/rejected/
  - status: pending   -> leave in _queue_runs/

Dry-run:
  node scripts/promote-runs.js --dry-run
  or DRY_RUN=1 node scripts/promote-runs.js
*/

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const QUEUE_DIR = path.join(ROOT, "_queue_runs");
const RUNS_DIR = path.join(ROOT, "_runs");
const REJECTED_DIR = path.join(RUNS_DIR, "rejected");

const DRY_RUN =
  process.argv.includes("--dry-run") ||
  process.argv.includes("-n") ||
  String(process.env.DRY_RUN || "").trim() === "1" ||
  String(process.env.DRY_RUN || "").trim().toLowerCase() === "true";

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

  for (const line of fm) {
    if (!line || /^\s*$/.test(line) || /^\s*#/.test(line)) continue;
    const m = /^([A-Za-z0-9_]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1];
    const val = (m[2] ?? "").trim();
    data[key] = val.replace(/^["']|["']$/g, "");
  }

  return { data, hasFrontMatter: true };
}

function ensureDir(p) {
  if (DRY_RUN) return;
  fs.mkdirSync(p, { recursive: true });
}

function existsDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function listQueueFiles() {
  if (!existsDir(QUEUE_DIR)) return [];
  return fs
    .readdirSync(QUEUE_DIR)
    .filter((f) => f.endsWith(".md"))
    .filter((f) => f !== ".gitkeep")
    .map((f) => path.join(QUEUE_DIR, f));
}

function moveFile(src, destDir) {
  const base = path.basename(src);
  const dest = path.join(destDir, base);

  if (fs.existsSync(dest)) {
    throw new Error(
      `Refusing to overwrite existing file: ${path
        .relative(ROOT, dest)
        .replace(/\\/g, "/")}`
    );
  }

  if (DRY_RUN) return dest;

  ensureDir(destDir);
  fs.renameSync(src, dest);
  return dest;
}

function main() {
  if (!existsDir(QUEUE_DIR)) {
    console.log("No _queue_runs/ directory found.");
    return;
  }

  ensureDir(RUNS_DIR);
  ensureDir(REJECTED_DIR);

  const files = listQueueFiles();
  if (!files.length) {
    console.log("No queued run files to promote.");
    return;
  }

  let approved = 0;
  let rejected = 0;
  let pending = 0;
  let skipped = 0;

  if (DRY_RUN) console.log("DRY RUN enabled. No files will be moved.");

  for (const file of files) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    const raw = fs.readFileSync(file, "utf8");
    const { data, hasFrontMatter } = parseFrontMatter(raw);

    if (!hasFrontMatter) {
      console.log(`SKIP ${rel} (missing front matter)`);
      skipped++;
      continue;
    }

    const status = String(data.status || "").trim().toLowerCase();

    if (status === "approved") {
      const dest = moveFile(file, RUNS_DIR);
      console.log(
        `${DRY_RUN ? "WOULD MOVE" : "MOVED"} APPROVED: ${rel} -> ${path
          .relative(ROOT, dest)
          .replace(/\\/g, "/")}`
      );
      approved++;
      continue;
    }

    if (status === "rejected") {
      const dest = moveFile(file, REJECTED_DIR);
      console.log(
        `${DRY_RUN ? "WOULD MOVE" : "MOVED"} REJECTED: ${rel} -> ${path
          .relative(ROOT, dest)
          .replace(/\\/g, "/")}`
      );
      rejected++;
      continue;
    }

    console.log(`KEEP PENDING: ${rel}`);
    pending++;
  }

  console.log(
    `Done. approved=${approved}, rejected=${rejected}, pending=${pending}, skipped=${skipped}`
  );
}

try {
  main();
} catch (err) {
  console.error(String(err && err.message ? err.message : err));
  process.exit(1);
}

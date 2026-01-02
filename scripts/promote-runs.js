#!/usr/bin/env node
/*
Promote queued runs from _queue_runs/<game_id>/...

Rules:
  - status: approved  -> move to _runs/<game_id>/
  - status: rejected  -> move to _runs/rejected/<game_id>/
  - status: pending   -> leave in _queue_runs/<game_id>/

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
    dateSubmitted: m[1],
    game_id: m[2],
    runner_id: m[3],
    category_slug: m[4],
    nn: m[5],
  };
}

function getGameFolderFromQueuePath(filePath) {
  // Expect: _queue_runs/<game_id>/file.md (can be deeper, but game_id must be the first segment)
  const relToQueue = path.relative(QUEUE_DIR, filePath).replace(/\\/g, "/");
  const parts = relToQueue.split("/").filter(Boolean);
  return parts.length ? parts[0] : "";
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

  const files = listMdFilesRecursive(QUEUE_DIR);
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

    const fn = parseFilename(file);
    if (!fn) {
      console.log(`SKIP ${rel} (bad filename)`); // validate-runs.js should catch this
      skipped++;
      continue;
    }

    const fmGame = String(data.game_id || "").trim();
    const fileGame = fn.game_id;
    const folderGame = getGameFolderFromQueuePath(file);

    if (!folderGame) {
      console.log(`SKIP ${rel} (not under _queue_runs/<game_id>/...)`);
      skipped++;
      continue;
    }

    if (folderGame !== fileGame || (fmGame && fmGame !== fileGame)) {
      throw new Error(
        `${rel}: game_id mismatch. folder=${folderGame}, filename=${fileGame}, frontmatter=${fmGame || "(missing)"}`
      );
    }

    const status = String(data.status || "").trim().toLowerCase();

    if (status === "approved") {
      const destDir = path.join(RUNS_DIR, fileGame);
      const dest = moveFile(file, destDir);
      console.log(
        `${DRY_RUN ? "WOULD MOVE" : "MOVED"} APPROVED: ${rel} -> ${path
          .relative(ROOT, dest)
          .replace(/\\/g, "/")}`
      );
      approved++;
      continue;
    }

    if (status === "rejected") {
      const destDir = path.join(REJECTED_DIR, fileGame);
      const dest = moveFile(file, destDir);
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

#!/usr/bin/env node
/*
Promote queued runs from _queue_runs/.

Rules:
  - status: approved  -> move to _runs/
  - status: rejected  -> move to _runs/rejected/
  - status: pending   -> leave in _queue_runs/
*/

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const QUEUE_DIR = path.join(ROOT, "_queue_runs");
const RUNS_DIR = path.join(ROOT, "_runs");
const REJECTED_DIR = path.join(RUNS_DIR, "rejected");

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
  fs.mkdirSync(p, { recursive: true });
}

function listQueueFiles() {
  try {
    return fs
      .readdirSync(QUEUE_DIR)
      .filter((f) => f.endsWith(".md"))
      .filter((f) => f !== ".gitkeep")
      .map((f) => path.join(QUEUE_DIR, f));
  } catch {
    return [];
  }
}

function moveFile(src, destDir) {
  ensureDir(destDir);
  const base = path.basename(src);
  const dest = path.join(destDir, base);

  if (fs.existsSync(dest)) {
    throw new Error(
      `Refusing to overwrite existing file: ${path.relative(ROOT, dest).replace(/\\/g, "/")}`
    );
  }

  fs.renameSync(src, dest);
  return dest;
}

function main() {
  ensureDir(RUNS_DIR);
  ensureDir(REJECTED_DIR);

  const files = listQueueFiles();
  if (!files.length) {
    console.log("No queued run files to promote.");
    return;
  }

  let promoted = 0;
  let rejected = 0;
  let pending = 0;

  for (const file of files) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    const raw = fs.readFileSync(file, "utf8");
    const { data, hasFrontMatter } = parseFrontMatter(raw);

    if (!hasFrontMatter) {
      console.log(`SKIP ${rel} (missing front matter)`);
      continue;
    }

    const status = String(data.status || "").trim().toLowerCase();

    if (status === "approved") {
      const movedTo = moveFile(file, RUNS_DIR);
      console.log(`APPROVED -> ${path.relative(ROOT, movedTo).replace(/\\/g, "/")}`);
      promoted++;
      continue;
    }

    if (status === "rejected") {
      const movedTo = moveFile(file, REJECTED_DIR);
      console.log(`REJECTED -> ${path.relative(ROOT, movedTo).replace(/\\/g, "/")}`);
      rejected++;
      continue;
    }

    pending++;
  }

  console.log(
    `Done. approved=${promoted}, rejected=${rejected}, pending=${pending}`
  );
}

try {
  main();
} catch (err) {
  console.error(String(err && err.message ? err.message : err));
  process.exit(1);
}

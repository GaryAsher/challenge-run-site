#!/usr/bin/env node
/**
 * Promote queued runs from _queue_runs/<game_id>/...
 *
 * Rules:
 *   - status: approved  -> move to _runs/<game_id>/
 *   - status: rejected  -> move to _runs/rejected/<game_id>/
 *   - status: pending   -> leave in _queue_runs/<game_id>/
 *
 * Usage:
 *   node scripts/promote-runs.js
 *   node scripts/promote-runs.js --dry-run
 *   DRY_RUN=1 node scripts/promote-runs.js
 */

const fs = require('fs');
const path = require('path');

// Import shared utilities
const {
  parseFrontMatter,
  isDir,
  listMdFilesRecursive,
  readText,
  ensureDir,
  rel,
} = require('./lib');

const { parseRunFilename } = require('./lib/validators/field-validators');

const ROOT = process.cwd();
const QUEUE_DIR = path.join(ROOT, '_queue_runs');
const RUNS_DIR = path.join(ROOT, '_runs');
const REJECTED_DIR = path.join(RUNS_DIR, 'rejected');

const DRY_RUN =
  process.argv.includes('--dry-run') ||
  process.argv.includes('-n') ||
  String(process.env.DRY_RUN || '').trim() === '1' ||
  String(process.env.DRY_RUN || '').trim().toLowerCase() === 'true';

// ============================================================
// Path helpers
// ============================================================
function getGameFolderFromQueuePath(filePath) {
  const relToQueue = path.relative(QUEUE_DIR, filePath).replace(/\\/g, '/');
  const parts = relToQueue.split('/').filter(Boolean);
  return parts.length ? parts[0] : '';
}

// ============================================================
// File operations
// ============================================================
function moveFile(src, destDir) {
  const base = path.basename(src);
  const dest = path.join(destDir, base);

  if (fs.existsSync(dest)) {
    throw new Error(`Refusing to overwrite existing file: ${rel(dest, ROOT)}`);
  }

  if (DRY_RUN) return dest;

  ensureDir(destDir);
  fs.renameSync(src, dest);
  return dest;
}

// ============================================================
// Main
// ============================================================
function main() {
  if (!isDir(QUEUE_DIR)) {
    console.log('No _queue_runs/ directory found.');
    return;
  }

  const files = listMdFilesRecursive(QUEUE_DIR);
  if (!files.length) {
    console.log('No queued run files to promote.');
    return;
  }

  let approved = 0;
  let rejected = 0;
  let pending = 0;
  let skipped = 0;

  if (DRY_RUN) console.log('DRY RUN enabled. No files will be moved.');

  for (const file of files) {
    const fileRel = rel(file, ROOT);
    const raw = readText(file);
    const { data, hasFrontMatter } = parseFrontMatter(raw);

    if (!hasFrontMatter) {
      console.log(`SKIP ${fileRel} (missing front matter)`);
      skipped++;
      continue;
    }

    const fn = parseRunFilename(path.basename(file));
    if (!fn) {
      console.log(`SKIP ${fileRel} (bad filename)`);
      skipped++;
      continue;
    }

    const fmGame = String(data.game_id || '').trim();
    const fileGame = fn.game_id;
    const folderGame = getGameFolderFromQueuePath(file);

    if (!folderGame) {
      console.log(`SKIP ${fileRel} (not under _queue_runs/<game_id>/...)`);
      skipped++;
      continue;
    }

    if (folderGame !== fileGame || (fmGame && fmGame !== fileGame)) {
      throw new Error(
        `${fileRel}: game_id mismatch. folder=${folderGame}, filename=${fileGame}, frontmatter=${fmGame || '(missing)'}`
      );
    }

    const status = String(data.status || '').trim().toLowerCase();

    if (status === 'approved') {
      const destDir = path.join(RUNS_DIR, fileGame);
      const dest = moveFile(file, destDir);
      console.log(`${DRY_RUN ? 'WOULD MOVE' : 'MOVED'} APPROVED: ${fileRel} -> ${rel(dest, ROOT)}`);
      approved++;
      continue;
    }

    if (status === 'rejected') {
      const destDir = path.join(REJECTED_DIR, fileGame);
      const dest = moveFile(file, destDir);
      console.log(`${DRY_RUN ? 'WOULD MOVE' : 'MOVED'} REJECTED: ${fileRel} -> ${rel(dest, ROOT)}`);
      rejected++;
      continue;
    }

    console.log(`KEEP PENDING: ${fileRel}`);
    pending++;
  }

  console.log(`Done. approved=${approved}, rejected=${rejected}, pending=${pending}, skipped=${skipped}`);
}

try {
  main();
} catch (err) {
  console.error(String(err && err.message ? err.message : err));
  process.exit(1);
}

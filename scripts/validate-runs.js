#!/usr/bin/env node
/**
 * Validate queued run submissions in _queue_runs/<game_id>/...
 *
 * This script validates runs before they are promoted to _runs/.
 * It is read-only and does not modify any files.
 * 
 * Filename format: YYYY-MM-DD__game-id__runner-id__category-slug__NN.md
 * The date in the filename is date_completed (when run was achieved).
 */

const path = require('path');

// Import shared utilities
const {
  parseFrontMatter,
  asArray,
  isDir,
  listMdFilesRecursive,
  readText,
  rel,
} = require('./lib');

const {
  ID_RE,
  CATEGORY_SLUG_RE,
  DATE_RE,
  TIME_RE,
  STATUS_SET,
  TIMING_SET,
  TIER_SET,
} = require('./lib/validators/constants');

const { parseRunFilename } = require('./lib/validators/field-validators');

const ROOT = process.cwd();
const QUEUE_DIR = path.join(ROOT, '_queue_runs');

// ============================================================
// Error helpers
// ============================================================
function fail(fileRel, msg) {
  throw new Error(`${fileRel}: ${msg}`);
}

// ============================================================
// Path helpers
// ============================================================
function getRelToQueue(filePath) {
  return path.relative(QUEUE_DIR, filePath).replace(/\\/g, '/');
}

function getGameFolderFromQueuePath(filePath) {
  const relToQueue = getRelToQueue(filePath);
  const parts = relToQueue.split('/').filter(Boolean);
  return parts.length ? parts[0] : '';
}

// ============================================================
// Validation
// ============================================================
function validateOne(filePath) {
  const fileRel = rel(filePath, ROOT);
  const raw = readText(filePath);
  const { data, hasFrontMatter } = parseFrontMatter(raw);

  if (!hasFrontMatter) {
    fail(fileRel, 'Missing YAML front matter (--- ... ---).');
  }

  const fn = parseRunFilename(path.basename(filePath));
  if (!fn) {
    fail(fileRel, 'Bad filename. Expected: YYYY-MM-DD__game-id__runner-id__category-slug__NN.md (date = date_completed)');
  }

  // Enforce folder routing: _queue_runs/<game_id>/...
  const folderGame = getGameFolderFromQueuePath(filePath);
  if (!folderGame) {
    fail(fileRel, 'Queued runs must live under _queue_runs/<game_id>/');
  }
  if (folderGame !== fn.game_id) {
    fail(fileRel, `game_id mismatch (folder=${folderGame}, filename=${fn.game_id})`);
  }

  const relToQueue = getRelToQueue(filePath);
  const parts = relToQueue.split('/').filter(Boolean);
  if (parts.length > 2) {
    console.log(`WARN ${fileRel}: extra subfolders under game_id folder are allowed but not recommended.`);
  }

  // Required routing + display fields (challenge validation is separate)
  const required = [
    'game_id',
    'runner_id',
    'category_slug',
    'runner',
    'category',
    'date_completed',
    'status',
  ];

  for (const k of required) {
    const v = data[k];
    if (v === undefined || v === null || String(v).trim() === '') {
      fail(fileRel, `Missing required field: ${k}`);
    }
  }
  
  // Challenge validation: require at least one of standard_challenges, community_challenge, or legacy challenge_id
  const hasStandardChallenges = Array.isArray(data.standard_challenges) && data.standard_challenges.length > 0;
  const hasCommunityChallenge = data.community_challenge && String(data.community_challenge).trim();
  const hasLegacyChallengeId = data.challenge_id && String(data.challenge_id).trim();
  
  if (!hasStandardChallenges && !hasCommunityChallenge && !hasLegacyChallengeId) {
    fail(fileRel, 'At least one of standard_challenges, community_challenge, or challenge_id is required');
  }
  
  // Validate standard_challenges array if present
  if (hasStandardChallenges) {
    for (const ch of data.standard_challenges) {
      if (!ID_RE.test(String(ch))) {
        fail(fileRel, `standard_challenges must be slugs (lowercase, hyphen). Got: ${ch}`);
      }
    }
  }
  
  // Validate legacy challenge_id if present
  if (hasLegacyChallengeId && !ID_RE.test(String(data.challenge_id))) {
    fail(fileRel, `challenge_id must be a slug (lowercase, hyphen). Got: ${data.challenge_id}`);
  }

  // Filename must match content IDs
  if (String(data.game_id).trim() !== fn.game_id) {
    fail(fileRel, `game_id mismatch (filename=${fn.game_id}, frontmatter=${data.game_id})`);
  }
  if (String(data.runner_id).trim() !== fn.runner_id) {
    fail(fileRel, `runner_id mismatch (filename=${fn.runner_id}, frontmatter=${data.runner_id})`);
  }
  if (String(data.category_slug).trim() !== fn.category_slug) {
    fail(fileRel, `category_slug mismatch (filename=${fn.category_slug}, frontmatter=${data.category_slug})`);
  }

  // Enforce slugs
  if (!ID_RE.test(String(data.game_id))) {
    fail(fileRel, `game_id must be a slug (lowercase, hyphen). Got: ${data.game_id}`);
  }
  if (!ID_RE.test(String(data.runner_id))) {
    fail(fileRel, `runner_id must be a slug (lowercase, hyphen). Got: ${data.runner_id}`);
  }
  if (!CATEGORY_SLUG_RE.test(String(data.category_slug))) {
    fail(fileRel, `category_slug must be a slug (lowercase, hyphen). Got: ${data.category_slug}`);
  }

  // Validate category_tier (optional but must be valid if present)
  const tier = data.category_tier;
  if (tier !== undefined && tier !== null && tier !== '') {
    const tierStr = String(tier).trim();
    if (!TIER_SET.has(tierStr)) {
      fail(fileRel, `category_tier must be one of: full_runs, mini_challenges, player_made. Got: ${tier}`);
    }
  }

  // Status
  const st = String(data.status).trim().toLowerCase();
  if (!STATUS_SET.has(st)) {
    fail(fileRel, `status must be one of: pending, approved, rejected. Got: ${data.status}`);
  }

  // date_completed - handle js-yaml Date parsing
  const dateCompleted = data.date_completed instanceof Date
    ? data.date_completed.toISOString().slice(0, 10)
    : String(data.date_completed).trim();

  if (!DATE_RE.test(dateCompleted)) {
    fail(fileRel, `date_completed must be YYYY-MM-DD. Got: ${data.date_completed}`);
  }

  // Filename date must match date_completed
  if (dateCompleted !== fn.dateCompleted) {
    fail(fileRel, `date_completed must match filename date (filename=${fn.dateCompleted}, frontmatter=${dateCompleted})`);
  }

  // date_submitted is optional but must be valid if present
  if (data.date_submitted !== undefined && data.date_submitted !== null) {
    const dateSubmitted = data.date_submitted instanceof Date
      ? data.date_submitted.toISOString().slice(0, 10)
      : String(data.date_submitted).trim();

    if (dateSubmitted && !DATE_RE.test(dateSubmitted)) {
      fail(fileRel, `date_submitted must be YYYY-MM-DD if provided. Got: ${data.date_submitted}`);
    }
  }

  // Approved expectations
  if (st === 'approved') {
    if (data.verified !== true) {
      fail(fileRel, 'approved runs must have verified: true');
    }
    if (!data.verified_by || String(data.verified_by).trim() === '') {
      fail(fileRel, 'approved runs must have verified_by filled in');
    }
  }

  // Timing checks (optional)
  const t1 = String(data.time_primary ?? '').trim();
  const m1 = String(data.timing_method_primary ?? '').trim();
  const t2 = String(data.time_secondary ?? '').trim();
  const m2 = String(data.timing_method_secondary ?? '').trim();

  if (t1 && !TIME_RE.test(t1)) {
    fail(fileRel, `time_primary invalid. Use HH:MM:SS or HH:MM:SS.MMM. Got: ${t1}`);
  }
  if (t2 && !TIME_RE.test(t2)) {
    fail(fileRel, `time_secondary invalid. Use HH:MM:SS or HH:MM:SS.MMM. Got: ${t2}`);
  }

  if (m1 && !TIMING_SET.has(m1)) {
    fail(fileRel, `timing_method_primary must be RTA|IGT|LRT. Got: ${m1}`);
  }
  if (m2 && !TIMING_SET.has(m2)) {
    fail(fileRel, `timing_method_secondary must be RTA|IGT|LRT. Got: ${m2}`);
  }

  if (t1 && !m1) fail(fileRel, 'time_primary provided but timing_method_primary is empty');
  if (m1 && !t1) fail(fileRel, 'timing_method_primary provided but time_primary is empty');
  if (t2 && !m2) fail(fileRel, 'time_secondary provided but timing_method_secondary is empty');
  if (m2 && !t2) fail(fileRel, 'timing_method_secondary provided but time_secondary is empty');

  // Arrays
  const restrictions = asArray(data.restrictions);
  const restriction_ids = asArray(data.restriction_ids);

  if (restriction_ids.some(x => !ID_RE.test(String(x)))) {
    fail(fileRel, `restriction_ids must be slugs. Got: ${JSON.stringify(restriction_ids)}`);
  }

  if (restriction_ids.length && restrictions.length && restriction_ids.length !== restrictions.length) {
    console.log(`WARN ${fileRel}: restrictions and restriction_ids lengths differ (${restrictions.length} vs ${restriction_ids.length})`);
  }

  return true;
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
    console.log('No queued run files found in _queue_runs/.');
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

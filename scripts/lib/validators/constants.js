#!/usr/bin/env node
/**
 * Validation constants and regex patterns
 * Shared between all validation scripts
 */

/** Matches kebab-case IDs: lowercase letters, numbers, hyphens */
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Matches category slugs with optional nesting: e.g., "parent/child" */
const CATEGORY_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;

/** Matches ISO date format: YYYY-MM-DD */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Matches time format: HH:MM:SS or HH:MM:SS.mmm */
const TIME_RE = /^\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?$/;

/** Matches run filename pattern: YYYY-MM-DD__game-id__runner-id__category-slug__NN.md */
const RUN_FILENAME_RE = /^(\d{4}-\d{2}-\d{2})__([a-z0-9-]+)__([a-z0-9-]+)__([a-z0-9-]+)__([0-9]{2,3})\.md$/;

/** Valid run status values */
const STATUS_SET = new Set(['pending', 'approved', 'rejected']);

/** Valid timing method values */
const TIMING_SET = new Set(['RTA', 'IGT', 'LRT']);

module.exports = {
  ID_RE,
  CATEGORY_SLUG_RE,
  DATE_RE,
  TIME_RE,
  RUN_FILENAME_RE,
  STATUS_SET,
  TIMING_SET,
};

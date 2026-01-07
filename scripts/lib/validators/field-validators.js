#!/usr/bin/env node
/**
 * Field validation utilities
 * All validators throw errors with helpful messages including the file path
 */

const {
  ID_RE,
  CATEGORY_SLUG_RE,
  DATE_RE,
  TIME_RE,
  TIMING_SET,
  STATUS_SET,
  RUN_FILENAME_RE,
} = require('./constants');

/**
 * Validate that a field is a valid slug (kebab-case ID)
 * @param {string} fileRel - Relative file path for error messages
 * @param {string} field - Field name
 * @param {any} value - Value to validate
 * @throws {Error} If validation fails
 */
function mustSlug(fileRel, field, value) {
  if (typeof value !== 'string' || !ID_RE.test(value)) {
    throw new Error(
      `${fileRel}: ${field} must be kebab-case (lowercase, hyphens only). Got: ${JSON.stringify(value)}`
    );
  }
}

/**
 * Validate that a field is a non-empty string
 * @param {string} fileRel - Relative file path for error messages
 * @param {string} field - Field name
 * @param {any} value - Value to validate
 * @throws {Error} If validation fails
 */
function mustString(fileRel, field, value) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fileRel}: ${field} must be a non-empty string`);
  }
}

/**
 * Validate that a field is an array of non-empty strings
 * @param {string} fileRel - Relative file path for error messages
 * @param {string} field - Field name
 * @param {any} value - Value to validate
 * @throws {Error} If validation fails
 */
function mustArrayOfStrings(fileRel, field, value) {
  if (!Array.isArray(value)) {
    throw new Error(`${fileRel}: ${field} must be a YAML list`);
  }
  for (const item of value) {
    if (typeof item !== 'string' || item.trim() === '') {
      throw new Error(`${fileRel}: ${field} must contain only non-empty strings`);
    }
  }
}

/**
 * Validate that a field is a valid time string or null/undefined
 * @param {string} fileRel - Relative file path for error messages
 * @param {string} field - Field name
 * @param {any} value - Value to validate
 * @throws {Error} If validation fails
 */
function mustTimeOrNull(fileRel, field, value) {
  if (value === null || value === undefined) return;
  if (typeof value !== 'string' || !TIME_RE.test(value)) {
    throw new Error(
      `${fileRel}: ${field} must be HH:MM:SS or HH:MM:SS.mmm (or null). Got: ${JSON.stringify(value)}`
    );
  }
}

/**
 * Validate that a field is a valid timing method or null/undefined
 * @param {string} fileRel - Relative file path for error messages
 * @param {string} field - Field name
 * @param {any} value - Value to validate
 * @throws {Error} If validation fails
 */
function mustTimingOrNull(fileRel, field, value) {
  if (value === null || value === undefined) return;
  if (typeof value !== 'string' || !TIMING_SET.has(value)) {
    throw new Error(
      `${fileRel}: ${field} must be one of ${Array.from(TIMING_SET).join(', ')} (or null). Got: ${JSON.stringify(value)}`
    );
  }
}

/**
 * Validate that a field is a valid date string (YYYY-MM-DD)
 * Handles js-yaml parsing dates as Date objects
 * @param {string} fileRel - Relative file path for error messages
 * @param {string} field - Field name
 * @param {any} value - Value to validate
 * @throws {Error} If validation fails
 */
function mustDate(fileRel, field, value) {
  // js-yaml may parse unquoted YYYY-MM-DD as Date object
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    const iso = value.toISOString().slice(0, 10);
    if (!DATE_RE.test(iso)) {
      throw new Error(`${fileRel}: ${field} must be YYYY-MM-DD`);
    }
    return;
  }

  if (typeof value !== 'string' || !DATE_RE.test(value)) {
    throw new Error(`${fileRel}: ${field} must be YYYY-MM-DD. Got: ${JSON.stringify(value)}`);
  }
}

/**
 * Validate that a field is a valid category slug (with optional nesting)
 * @param {string} fileRel - Relative file path for error messages
 * @param {string} field - Field name
 * @param {any} value - Value to validate
 * @throws {Error} If validation fails
 */
function mustCategorySlug(fileRel, field, value) {
  if (typeof value !== 'string' || !CATEGORY_SLUG_RE.test(value)) {
    throw new Error(
      `${fileRel}: ${field} must be kebab-case with optional nesting using "/". Got: ${JSON.stringify(value)}`
    );
  }
}

/**
 * Validate that a field is a valid status
 * @param {string} fileRel - Relative file path for error messages
 * @param {string} field - Field name
 * @param {any} value - Value to validate
 * @throws {Error} If validation fails
 */
function mustStatus(fileRel, field, value) {
  const v = String(value || '').trim().toLowerCase();
  if (!STATUS_SET.has(v)) {
    throw new Error(
      `${fileRel}: ${field} must be one of: ${Array.from(STATUS_SET).join(', ')}. Got: ${JSON.stringify(value)}`
    );
  }
}

/**
 * Validate that a field is a valid URL (http or https)
 * @param {string} fileRel - Relative file path for error messages
 * @param {string} field - Field name
 * @param {any} value - Value to validate
 * @throws {Error} If validation fails
 */
function mustUrl(fileRel, field, value) {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) {
    throw new Error(`${fileRel}: ${field} must be an http(s) URL. Got: ${JSON.stringify(value)}`);
  }
}

/**
 * Validate that a field is a boolean
 * @param {string} fileRel - Relative file path for error messages
 * @param {string} field - Field name
 * @param {any} value - Value to validate
 * @throws {Error} If validation fails
 */
function mustBoolean(fileRel, field, value) {
  if (typeof value !== 'boolean') {
    throw new Error(`${fileRel}: ${field} must be boolean. Got: ${JSON.stringify(value)}`);
  }
}

/**
 * Validate that a required field exists and is not empty
 * @param {string} fileRel - Relative file path for error messages
 * @param {string} field - Field name
 * @param {any} value - Value to validate
 * @throws {Error} If validation fails
 */
function mustExist(fileRel, field, value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new Error(`${fileRel}: Missing required field: ${field}`);
  }
}

/**
 * Parse a run filename and extract components
 * @param {string} filename - Filename to parse (basename only)
 * @returns {{dateSubmitted: string, game_id: string, runner_id: string, category_slug: string, nn: string}|null}
 */
function parseRunFilename(filename) {
  const m = RUN_FILENAME_RE.exec(filename);
  if (!m) return null;

  return {
    dateSubmitted: m[1],
    game_id: m[2],
    runner_id: m[3],
    category_slug: m[4],
    nn: m[5],
  };
}

module.exports = {
  mustSlug,
  mustString,
  mustArrayOfStrings,
  mustTimeOrNull,
  mustTimingOrNull,
  mustDate,
  mustCategorySlug,
  mustStatus,
  mustUrl,
  mustBoolean,
  mustExist,
  parseRunFilename,
};

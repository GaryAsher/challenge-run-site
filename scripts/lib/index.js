#!/usr/bin/env node
/**
 * Shared library index
 * Re-exports all utilities for convenient imports
 *
 * Usage:
 *   const { parseFrontMatter, mustSlug, isDir, ID_RE } = require('./lib');
 */

module.exports = {
  // Parsers
  ...require('./parsers/front-matter'),

  // Validators - constants
  ...require('./validators/constants'),

  // Validators - field validators
  ...require('./validators/field-validators'),

  // Utils
  ...require('./utils/file-utils'),
};

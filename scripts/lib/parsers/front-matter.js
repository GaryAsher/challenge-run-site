#!/usr/bin/env node
/**
 * Front matter parsing utilities
 * Shared between validation scripts to ensure consistency
 */

const yaml = require('js-yaml');
const fs = require('fs');

/**
 * Extract and parse YAML front matter from a file's content
 * @param {string} fileContent - Raw file content
 * @returns {{data: object, body: string, hasFrontMatter: boolean}}
 */
function parseFrontMatter(fileContent) {
  const lines = fileContent.split(/\r?\n/);
  
  if (lines[0] !== '---') {
    return { data: {}, body: fileContent, hasFrontMatter: false };
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return { data: {}, body: fileContent, hasFrontMatter: false };
  }

  const frontMatterText = lines.slice(1, endIndex).join('\n');
  const body = lines.slice(endIndex + 1).join('\n');

  try {
    const data = yaml.load(frontMatterText) || {};
    if (typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Front matter must be a YAML mapping');
    }
    return { data, body, hasFrontMatter: true };
  } catch (err) {
    throw new Error(`Front matter YAML parse error: ${err.message}`);
  }
}

/**
 * Extract and parse YAML front matter, returning only the data object
 * @param {string} fileContent - Raw file content (markdown with front matter)
 * @returns {object|null} Parsed YAML data or null if no front matter
 */
function extractFrontMatterData(fileContent) {
  const match = fileContent.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!match) return null;

  try {
    return yaml.load(match[1]) || {};
  } catch (err) {
    throw new Error(`YAML parse error: ${err.message}`);
  }
}

/**
 * Strip quotes from a YAML scalar value
 * @param {any} value - Value to strip quotes from
 * @returns {string}
 */
function stripQuotes(value) {
  const str = String(value ?? '').trim();
  if (
    (str.startsWith('"') && str.endsWith('"')) ||
    (str.startsWith("'") && str.endsWith("'"))
  ) {
    return str.slice(1, -1);
  }
  return str;
}

/**
 * Parse a scalar value, handling booleans and empty strings
 * @param {string} raw - Raw value string
 * @returns {string|boolean}
 */
function parseScalar(raw) {
  const value = stripQuotes(raw);
  if (value === '') return '';
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

/**
 * Ensure a value is an array
 * @param {any} value - Value to convert
 * @returns {string[]}
 */
function asArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim() === '') return [];
  if (typeof value === 'string') {
    return value.split(',').map(x => x.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Load and parse a YAML file
 * @param {string} filePath - Path to YAML file
 * @returns {object} Parsed YAML content
 */
function loadYamlFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return yaml.load(content) || {};
  } catch (err) {
    throw new Error(`YAML parse error in ${filePath}: ${err.message}`);
  }
}

module.exports = {
  parseFrontMatter,
  extractFrontMatterData,
  stripQuotes,
  parseScalar,
  asArray,
  loadYamlFile,
};
  

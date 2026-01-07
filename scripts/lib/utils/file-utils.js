#!/usr/bin/env node
/**
 * File system utilities
 */

const fs = require('fs');
const path = require('path');

/**
 * Check if a path exists and is a directory
 * @param {string} p - Path to check
 * @returns {boolean}
 */
function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if a path exists and is a file
 * @param {string} p - Path to check
 * @returns {boolean}
 */
function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

/**
 * List all files recursively in a directory
 * @param {string} rootDir - Root directory to scan
 * @returns {string[]} Array of absolute file paths
 */
function listFilesRecursive(rootDir) {
  if (!isDir(rootDir)) return [];

  const files = [];

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }

  walk(rootDir);
  return files;
}

/**
 * List markdown files recursively, excluding .gitkeep and README.md
 * @param {string} rootDir - Root directory to scan
 * @returns {string[]} Array of absolute file paths
 */
function listMdFilesRecursive(rootDir) {
  if (!isDir(rootDir)) return [];

  const files = [];

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === '.gitkeep') continue;

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        const lower = entry.name.toLowerCase();
        if (lower === 'readme.md') continue;
        files.push(fullPath);
      }
    }
  }

  walk(rootDir);
  return files;
}

/**
 * Read a text file
 * @param {string} p - File path
 * @returns {string}
 */
function readText(p) {
  return fs.readFileSync(p, 'utf8');
}

/**
 * Write a text file, creating directories as needed
 * @param {string} p - File path
 * @param {string} content - File content
 */
function writeText(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, 'utf8');
}

/**
 * Ensure a directory exists, creating it if necessary
 * @param {string} dir - Directory path
 */
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Get relative path from project root
 * @param {string} p - Absolute path
 * @param {string} root - Project root (defaults to cwd)
 * @returns {string} Relative path with forward slashes
 */
function rel(p, root = process.cwd()) {
  return path.relative(root, p).replace(/\\/g, '/');
}

/**
 * Check if a file exists
 * @param {string} p - File path
 * @returns {boolean}
 */
function fileExists(p) {
  return fs.existsSync(p);
}

/**
 * Write file only if content changed
 * @param {string} p - File path
 * @param {string} content - File content
 * @param {boolean} checkOnly - If true, don't write, just return status
 * @returns {{changed: boolean, created: boolean}}
 */
function writeFileIfChanged(p, content, checkOnly = false) {
  const exists = fs.existsSync(p);
  const prev = exists ? fs.readFileSync(p, 'utf8') : null;

  if (prev === content) {
    return { changed: false, created: false };
  }

  if (checkOnly) {
    return { changed: true, created: !exists };
  }

  ensureDir(path.dirname(p));
  fs.writeFileSync(p, content, 'utf8');
  return { changed: true, created: !exists };
}

module.exports = {
  isDir,
  isFile,
  listFilesRecursive,
  listMdFilesRecursive,
  readText,
  writeText,
  ensureDir,
  rel,
  fileExists,
  writeFileIfChanged,
};

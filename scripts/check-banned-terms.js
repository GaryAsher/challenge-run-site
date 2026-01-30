#!/usr/bin/env node
/**
 * Check for banned terms in user-submitted content.
 * 
 * Scans:
 *   - _queue_games/*.md (queued game submissions)
 *   - _queue_runs/**/*.md (queued run submissions)
 *   - _runners/*.md (runner profiles)
 *   - _runs/**/*.md (approved runs)
 *   - _games/*.md (game pages)
 *   - _posts/*.md (news posts)
 * 
 * Configuration: _data/banned-terms.yml
 * 
 * Supports:
 *   - Simple substring matching (case-insensitive)
 *   - Regex patterns for slurs (catches variations and embedded text)
 * 
 * Exit codes:
 *   0 = No banned terms found
 *   1 = Banned terms detected (blocks CI)
 * 
 * Usage:
 *   node scripts/check-banned-terms.js           # Check all directories
 *   node scripts/check-banned-terms.js --queued  # Check only queue directories
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = process.cwd();
const args = process.argv.slice(2);
const QUEUED_ONLY = args.includes('--queued');

// ============================================================
// Load configuration
// ============================================================
function loadBannedTerms() {
  const configPath = path.join(ROOT, '_data', 'banned-terms.yml');
  
  if (!fs.existsSync(configPath)) {
    console.log('No banned-terms.yml found, skipping check');
    return null;
  }
  
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    return yaml.load(content);
  } catch (err) {
    console.error(`Error loading banned-terms.yml: ${err.message}`);
    return null;
  }
}

// ============================================================
// File collection
// ============================================================

/**
 * Recursively walk a directory and collect markdown files
 */
function walkDir(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, files);
    } else if (entry.name.endsWith('.md') && entry.name !== '.gitkeep' && entry.name !== 'README.md') {
      files.push(fullPath);
    }
  }
  return files;
}

function getFilesToCheck() {
  const files = [];
  
  // Always check queue directories
  const queueDirs = ['_queue_games', '_queue_runs'];
  for (const dir of queueDirs) {
    walkDir(path.join(ROOT, dir), files);
  }
  
  // If not queued-only mode, also check other content directories
  if (!QUEUED_ONLY) {
    const contentDirs = [
      '_runners',   // Runner profiles
      '_runs',      // Approved runs
      '_games',     // Game pages
      '_posts',     // News posts
      '_teams'      // Team pages
    ];
    
    for (const dir of contentDirs) {
      walkDir(path.join(ROOT, dir), files);
    }
  }
  
  return files;
}

// ============================================================
// Term matching
// ============================================================
function buildTermMatcher(config) {
  const terms = new Set();
  const regexPatterns = [];
  const exceptions = new Set();
  
  // Collect simple string terms
  if (config.spam) {
    config.spam.forEach(t => terms.add(t.toLowerCase()));
  }
  if (config.malicious) {
    config.malicious.forEach(t => terms.add(t.toLowerCase()));
  }
  if (config.contact_patterns) {
    config.contact_patterns.forEach(t => terms.add(t.toLowerCase()));
  }
  
  // Build regex patterns for slurs
  // These catch variations like embedded text, leetspeak, asterisks
  if (config.slur_patterns) {
    for (const pattern of config.slur_patterns) {
      try {
        // Compile as case-insensitive, global regex
        const regex = new RegExp(pattern, 'gi');
        regexPatterns.push({
          name: 'slur',
          regex: regex,
          pattern: pattern
        });
      } catch (err) {
        console.warn(`Invalid regex pattern "${pattern}": ${err.message}`);
      }
    }
  }
  
  // Add phone number detection
  regexPatterns.push({
    name: 'phone-number',
    regex: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    pattern: 'phone'
  });
  
  // Load exceptions
  if (config.exceptions) {
    config.exceptions.forEach(e => exceptions.add(e.toLowerCase()));
  }
  
  return { terms, regexPatterns, exceptions };
}

function checkContent(content, matcher) {
  const lowerContent = content.toLowerCase();
  const found = [];
  
  // Check simple string terms
  for (const term of matcher.terms) {
    // Skip if term is in exceptions
    let isException = false;
    for (const exc of matcher.exceptions) {
      if (term.includes(exc) || exc.includes(term)) {
        isException = true;
        break;
      }
    }
    if (isException) continue;
    
    if (lowerContent.includes(term)) {
      found.push({ type: 'term', value: term });
    }
  }
  
  // Check regex patterns (for slurs and other patterns)
  for (const pattern of matcher.regexPatterns) {
    // Reset regex lastIndex for global patterns
    pattern.regex.lastIndex = 0;
    
    const matches = content.match(pattern.regex);
    if (matches && matches.length > 0) {
      // For phone numbers, filter out dates
      if (pattern.name === 'phone-number') {
        const nonDateMatches = matches.filter(m => {
          // Filter out date-like patterns (YYYY-MM-DD)
          return !/^\d{4}[-]\d{2}[-]\d{2}$/.test(m);
        });
        
        if (nonDateMatches.length > 0) {
          found.push({ 
            type: 'pattern', 
            name: pattern.name, 
            values: nonDateMatches 
          });
        }
      } else {
        // For slurs and other patterns, report immediately
        // Don't show the actual match in output (privacy/decency)
        found.push({ 
          type: 'slur-pattern', 
          name: 'prohibited content detected',
          count: matches.length
        });
      }
    }
  }
  
  return found;
}

// ============================================================
// Main
// ============================================================
function main() {
  const config = loadBannedTerms();
  
  if (!config) {
    console.log('✓ Banned terms check skipped (no config)');
    return;
  }
  
  console.log(QUEUED_ONLY ? '🔍 Checking queued files only...' : '🔍 Checking all content files...');
  
  const files = getFilesToCheck();
  
  if (files.length === 0) {
    console.log('✓ No files to check');
    return;
  }
  
  const matcher = buildTermMatcher(config);
  let hasViolations = false;
  const violations = [];
  
  for (const filePath of files) {
    const relPath = path.relative(ROOT, filePath);
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const found = checkContent(content, matcher);
      
      if (found.length > 0) {
        hasViolations = true;
        violations.push({
          file: relPath,
          issues: found
        });
      }
    } catch (err) {
      console.error(`Error reading ${relPath}: ${err.message}`);
    }
  }
  
  if (hasViolations) {
    console.error('\n❌ Banned content detected:\n');
    
    for (const v of violations) {
      console.error(`  ${v.file}:`);
      for (const issue of v.issues) {
        if (issue.type === 'term') {
          console.error(`    - Banned term: "${issue.value}"`);
        } else if (issue.type === 'pattern') {
          console.error(`    - ${issue.name}: ${issue.values.join(', ')}`);
        } else if (issue.type === 'slur-pattern') {
          // Don't echo the actual slur back
          console.error(`    - ⚠️ Prohibited content detected (${issue.count} occurrence${issue.count > 1 ? 's' : ''})`);
        }
      }
    }
    
    console.error('\n');
    process.exit(1);
  }
  
  console.log(`✓ Checked ${files.length} file(s) - no banned terms found`);
}

main();

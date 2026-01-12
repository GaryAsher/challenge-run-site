#!/usr/bin/env node
/**
 * Detect unknown genres, platforms, and challenges in game files
 * and create a review issue for approval.
 * 
 * Usage:
 *   node scripts/detect-unknown-terms.js           # Detect and report
 *   node scripts/detect-unknown-terms.js --fail    # Fail if any unknown terms found
 */

const fs = require('fs');
const path = require('path');

const {
  parseFrontMatter,
  loadYamlFile,
  isDir,
  readText,
  rel,
} = require('./lib');

const ROOT = process.cwd();

function buildResolver(yamlObj) {
  const ids = new Set(Object.keys(yamlObj));
  const keyToId = new Map();

  function normKey(s) {
    return String(s).trim().toLowerCase()
      .replace(/[_]+/g, ' ')
      .replace(/[-]+/g, ' ')
      .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  for (const [id, obj] of Object.entries(yamlObj)) {
    keyToId.set(normKey(id), id);
    if (obj.label) keyToId.set(normKey(obj.label), id);
    if (Array.isArray(obj.aliases)) {
      obj.aliases.forEach(a => keyToId.set(normKey(a), id));
    }
  }

  return {
    ids,
    resolve: (raw) => {
      const key = normKey(raw);
      return keyToId.get(key) || null;
    }
  };
}

function detectUnknownTerms() {
  const genresPath = path.join(ROOT, '_data', 'genres.yml');
  const platformsPath = path.join(ROOT, '_data', 'platforms.yml');
  const challengesPath = path.join(ROOT, '_data', 'challenges.yml');

  const genres = fs.existsSync(genresPath) ? loadYamlFile(genresPath) : {};
  const platforms = fs.existsSync(platformsPath) ? loadYamlFile(platformsPath) : {};
  const challenges = fs.existsSync(challengesPath) ? loadYamlFile(challengesPath) : {};

  const genreResolver = buildResolver(genres);
  const platformResolver = buildResolver(platforms);
  const challengeResolver = buildResolver(challenges);

  const unknownGenres = new Map(); // term -> [files]
  const unknownPlatforms = new Map();
  const unknownChallenges = new Map();

  // Scan _games/*.md
  const gamesDir = path.join(ROOT, '_games');
  if (isDir(gamesDir)) {
    const files = fs.readdirSync(gamesDir)
      .filter(f => f.endsWith('.md') && f !== 'README.md')
      .map(f => path.join(gamesDir, f));

    for (const p of files) {
      const fileRel = rel(p, ROOT);
      if (fileRel.includes('_TEMPLATES/') || fileRel.includes('template')) continue;

      const content = readText(p);
      const { data: fm } = parseFrontMatter(content);

      // Check genres
      if (Array.isArray(fm.genres)) {
        for (const g of fm.genres) {
          if (!genreResolver.resolve(g)) {
            if (!unknownGenres.has(g)) unknownGenres.set(g, []);
            unknownGenres.get(g).push(fileRel);
          }
        }
      }

      // Check platforms
      if (Array.isArray(fm.platforms)) {
        for (const p of fm.platforms) {
          if (!platformResolver.resolve(p)) {
            if (!unknownPlatforms.has(p)) unknownPlatforms.set(p, []);
            unknownPlatforms.get(p).push(fileRel);
          }
        }
      }

      // Check challenges
      if (Array.isArray(fm.challenges)) {
        for (const c of fm.challenges) {
          if (!challengeResolver.resolve(c)) {
            if (!unknownChallenges.has(c)) unknownChallenges.set(c, []);
            unknownChallenges.get(c).push(fileRel);
          }
        }
      }
    }
  }

  return {
    genres: unknownGenres,
    platforms: unknownPlatforms,
    challenges: unknownChallenges,
  };
}

function generateMarkdownReport(unknown) {
  const lines = ['# Unknown Terms Detected\n'];

  if (unknown.genres.size > 0) {
    lines.push('## Unknown Genres\n');
    for (const [term, files] of unknown.genres) {
      lines.push(`### \`${term}\``);
      lines.push(`Used in: ${files.join(', ')}\n`);
      lines.push('**Suggested YAML entry:**');
      lines.push('```yaml');
      const slug = term.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      lines.push(`${slug}:`);
      lines.push(`  label: "${term}"`);
      lines.push('```\n');
    }
  }

  if (unknown.platforms.size > 0) {
    lines.push('## Unknown Platforms\n');
    for (const [term, files] of unknown.platforms) {
      lines.push(`### \`${term}\``);
      lines.push(`Used in: ${files.join(', ')}\n`);
      lines.push('**Suggested YAML entry:**');
      lines.push('```yaml');
      const slug = term.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      lines.push(`${slug}:`);
      lines.push(`  label: "${term}"`);
      lines.push('```\n');
    }
  }

  if (unknown.challenges.size > 0) {
    lines.push('## Unknown Challenges\n');
    for (const [term, files] of unknown.challenges) {
      lines.push(`### \`${term}\``);
      lines.push(`Used in: ${files.join(', ')}\n`);
      lines.push('**Suggested YAML entry:**');
      lines.push('```yaml');
      const slug = term.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      lines.push(`${slug}:`);
      lines.push(`  label: "${term}"`);
      lines.push('```\n');
    }
  }

  lines.push('---\n');
  lines.push('## Instructions\n');
  lines.push('1. Review each term above');
  lines.push('2. For approved terms, copy the YAML entry to the appropriate file:');
  lines.push('   - Genres → `_data/genres.yml`');
  lines.push('   - Platforms → `_data/platforms.yml`');
  lines.push('   - Challenges → `_data/challenges.yml`');
  lines.push('3. Place entries in alphabetical order under the appropriate letter section');
  lines.push('4. Commit changes and re-run validation\n');

  return lines.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const shouldFail = args.includes('--fail');

  const unknown = detectUnknownTerms();
  const totalUnknown = unknown.genres.size + unknown.platforms.size + unknown.challenges.size;

  if (totalUnknown === 0) {
    console.log('✅ No unknown terms detected');
    return;
  }

  console.log(`\n⚠️  Found ${totalUnknown} unknown term(s):\n`);

  if (unknown.genres.size > 0) {
    console.log(`Genres: ${Array.from(unknown.genres.keys()).join(', ')}`);
  }
  if (unknown.platforms.size > 0) {
    console.log(`Platforms: ${Array.from(unknown.platforms.keys()).join(', ')}`);
  }
  if (unknown.challenges.size > 0) {
    console.log(`Challenges: ${Array.from(unknown.challenges.keys()).join(', ')}`);
  }

  console.log('\n' + generateMarkdownReport(unknown));

  if (shouldFail) {
    console.error('\n❌ Validation failed due to unknown terms');
    process.exit(1);
  }
}

main();

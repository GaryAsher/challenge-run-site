#!/usr/bin/env node
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

const files = [
  '_data/genres.yml',
  '_data/platforms.yml',
  '_data/challenges.yml',
];

let hasErrors = false;

files.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${file} not found`);
    return;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    yaml.load(content);
    console.log(`✅ ${file}`);
  } catch (err) {
    console.error(`❌ ${file}`);
    console.error(`   Line ${err.mark ? err.mark.line + 1 : '?'}: ${err.message}`);
    hasErrors = true;
  }
});

if (hasErrors) process.exit(1);

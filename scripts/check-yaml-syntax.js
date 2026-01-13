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
    console.log(`✅ ${file} - Valid YAML`);
  } catch (err) {
    console.error(`❌ ${file} - YAML Error:`);
    console.error(`   Line ${err.mark ? err.mark.line + 1 : '?'}: ${err.message}`);
    
    if (err.mark) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const lineNum = err.mark.line;
      const start = Math.max(0, lineNum - 2);
      const end = Math.min(lines.length, lineNum + 3);
      
      console.error('\n   Context:');
      for (let i = start; i < end; i++) {
        const marker = i === lineNum ? ' >' : '  ';
        console.error(`   ${marker} ${i + 1}: ${lines[i]}`);
      }
    }
    
    hasErrors = true;
  }
});

if (hasErrors) {
  process.exit(1);
}

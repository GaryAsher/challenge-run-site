#!/usr/bin/env node
/**
 * Audit for missing file references and unused files
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

console.log('🔍 Auditing file references...\n');

// Check package.json scripts
console.log('📦 Checking package.json scripts...');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

const scriptFiles = new Set();
const missingScripts = [];

for (const [name, command] of Object.entries(pkg.scripts || {})) {
  // Skip comment lines
  if (name.startsWith('//')) continue;
  
  if (command.includes('node scripts/')) {
    const match = command.match(/node scripts\/([^\s]+)/);
    if (match) {
      const scriptFile = path.join(ROOT, 'scripts', match[1]);
      scriptFiles.add(match[1]);
      
      if (!fs.existsSync(scriptFile)) {
        missingScripts.push({ script: name, file: match[1] });
      }
    }
  }
}

if (missingScripts.length > 0) {
  console.log('❌ Missing scripts referenced in package.json:');
  missingScripts.forEach(({ script, file }) => {
    console.log(`   - "${script}" references "scripts/${file}" (not found)`);
  });
} else {
  console.log('✅ All package.json scripts exist');
}

// Check for unused scripts
console.log('\n📁 Checking for unused scripts...');
const scriptsDir = path.join(ROOT, 'scripts');

if (fs.existsSync(scriptsDir)) {
  const allScripts = fs.readdirSync(scriptsDir)
    .filter(f => f.endsWith('.js'))
    .filter(f => !f.startsWith('.'));

  const unusedScripts = allScripts.filter(f => !scriptFiles.has(f));

  if (unusedScripts.length > 0) {
    console.log('⚠️  Scripts not referenced in package.json:');
    unusedScripts.forEach(f => {
      console.log(`   - scripts/${f}`);
    });
  } else {
    console.log('✅ All scripts are referenced');
  }
}

console.log('\n✨ Audit complete!\n');

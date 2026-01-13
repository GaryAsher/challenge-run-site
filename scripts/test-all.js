#!/usr/bin/env node
const { execSync } = require('child_process');

function run(command, description) {
  console.log(`\n🔍 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} passed`);
    return true;
  } catch (err) {
    console.error(`❌ ${description} failed`);
    return false;
  }
}

let allPassed = true;

allPassed &= run('node scripts/check-yaml-syntax.js', 'YAML syntax');
allPassed &= run('npm run validate:schema', 'Schema validation');
allPassed &= run('npm run validate:runs', 'Queued runs');

if (allPassed) {
  console.log('\n✨ All tests passed!\n');
  process.exit(0);
} else {
  console.error('\n❌ Some tests failed.\n');
  process.exit(1);
}

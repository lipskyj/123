#!/usr/bin/env node
// Runs every test suite, writes records/test-results.json, then regenerates BUILD_STATUS.html
// and TEST_REPORT.md from the same records.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const files = ['tests/unit', 'tests/e2e'].flatMap((d) => fs.existsSync(path.join(ROOT, d)) ? fs.readdirSync(path.join(ROOT, d)).filter((f) => f.endsWith('.test.js')).map((f) => d + '/' + f) : []);
const skipE2E = process.argv.includes('--no-e2e');
const run = files.filter((f) => !(skipE2E && f.startsWith('tests/e2e')));
const r = spawnSync(process.execPath, ['--test', '--test-concurrency=1',
  '--test-reporter=spec', '--test-reporter-destination=stdout',
  '--test-reporter=./scripts/json-reporter.mjs', '--test-reporter-destination=records/test-results.json', ...run], { cwd: ROOT, stdio: 'inherit' });
spawnSync(process.execPath, ['scripts/build-status.js'], { cwd: ROOT, stdio: 'inherit' });
process.exit(r.status);

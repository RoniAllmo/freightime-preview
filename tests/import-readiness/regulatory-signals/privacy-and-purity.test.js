import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODULE_DIR = path.join(__dirname, '..', '..', '..', 'js', 'import-readiness', 'regulatory-signals');

function readAllModuleSource() {
  return fs.readdirSync(MODULE_DIR)
    .filter((f) => f.endsWith('.js'))
    .map((f) => fs.readFileSync(path.join(MODULE_DIR, f), 'utf8'))
    .join('\n');
}

test('1. the regulatory-signals module never references fetch, XMLHttpRequest, or WebSocket (no network calls)', () => {
  const src = readAllModuleSource();
  assert.ok(!/\bfetch\s*\(/.test(src));
  assert.ok(!/XMLHttpRequest/.test(src));
  assert.ok(!/WebSocket/.test(src));
});

test('2. the regulatory-signals module never references localStorage, sessionStorage, indexedDB, or document.cookie', () => {
  const src = readAllModuleSource();
  assert.ok(!/localStorage/.test(src));
  assert.ok(!/sessionStorage/.test(src));
  assert.ok(!/indexedDB/i.test(src));
  assert.ok(!/document\.cookie/.test(src));
});

test('3. the regulatory-signals module never logs to the console', () => {
  const src = readAllModuleSource();
  assert.ok(!/console\.(log|debug|info|warn|error)/.test(src));
});

test('4. the regulatory-signals module never calls an external/AI API (no anthropic/openai/api.* identifiers)', () => {
  const src = readAllModuleSource();
  assert.ok(!/anthropic/i.test(src));
  assert.ok(!/openai/i.test(src));
  assert.ok(!/api\.claude/i.test(src));
});

test('5. the regulatory-signals module never touches window.location or history (no URL mutation)', () => {
  const src = readAllModuleSource();
  assert.ok(!/window\.location/.test(src));
  assert.ok(!/history\.pushState/.test(src));
  assert.ok(!/history\.replaceState/.test(src));
});

test('6. the module directory contains no DOM access (document., createElement)', () => {
  const src = readAllModuleSource();
  assert.ok(!/\bdocument\./.test(src));
  assert.ok(!/createElement/.test(src));
});

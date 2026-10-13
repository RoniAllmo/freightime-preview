/**
 * CI matrix-sync guard.
 *
 * Audit finding: the only automated check on the product-family matrix
 * was tests/import-readiness/product-family-alias-source-synchronization
 * .test.js, which compares the generator's CURATED_ALIASES against the
 * committed runtime file in one direction only (an alias added by hand
 * to the runtime file alone was shown, by an injected probe, to pass it),
 * and never reads the workbook. The real enforcement is the
 * `matrix-sync` job in .github/workflows/frontend-ci.yml, which
 * regenerates js/import-readiness/product-family-matrix.js from the
 * workbook + generator and fails on any diff.
 *
 * This test verifies, mechanically, that the job stays in the workflow
 * and keeps doing that: it exists, it is not made conditional or
 * non-blocking, it sets up the pinned Python/openpyxl versions, it runs
 * the generator, and it fails on a diff of the generated file.
 *
 * Pure Node, no DOM, no network, no Python required.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORKFLOW_PATH = path.join(REPO_ROOT, '.github', 'workflows', 'frontend-ci.yml');
const GENERATED_FILE = 'js/import-readiness/product-family-matrix.js';

const workflow = fs.readFileSync(WORKFLOW_PATH, 'utf8');

/**
 * Returns the text of one job under `jobs:` -- from its `  <name>:` line
 * up to the next line indented at the same (two-space) job level, or the
 * end of the file. Comment lines are dropped so commented-out steps can
 * never satisfy an assertion.
 */
function extractJob(text, jobName) {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => line === `  ${jobName}:`);
  if (start === -1) return null;
  const body = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^ {2}\S/.test(lines[i]) || /^\S/.test(lines[i])) break;
    body.push(lines[i]);
  }
  return body.filter((line) => !/^\s*#/.test(line)).join('\n');
}

const job = extractJob(workflow, 'matrix-sync');

test('1. the workflow defines a separate matrix-sync job', () => {
  assert.ok(job, 'expected a "matrix-sync" job under jobs: in frontend-ci.yml');
});

test('2. the matrix-sync job is unconditional and blocking', () => {
  assert.doesNotMatch(job, /^\s{4}if:/m, 'matrix-sync must not be made conditional');
  assert.doesNotMatch(job, /continue-on-error:\s*true/, 'matrix-sync must not be non-blocking');
});

test('3. the matrix-sync job sets up Python 3.13 and the pinned openpyxl 3.1.5', () => {
  assert.match(job, /uses:\s*actions\/setup-python@v\d+/);
  assert.match(job, /python-version:\s*'3\.13'/);
  assert.match(job, /pip install openpyxl==3\.1\.5/);
});

test('4. the matrix-sync job regenerates the matrix and fails on a diff of the generated file', () => {
  assert.match(job, /python3? scripts\/generate_product_family_matrix\.py/, 'expected the job to run the matrix generator');
  assert.ok(
    job.includes(`git diff --exit-code -- ${GENERATED_FILE}`),
    `expected the job to fail on "git diff --exit-code -- ${GENERATED_FILE}"`,
  );
  const regenerateIndex = job.indexOf('scripts/generate_product_family_matrix.py');
  const diffIndex = job.indexOf('git diff --exit-code');
  assert.ok(regenerateIndex < diffIndex, 'the diff check must run after regeneration');
});

test('5. the matrix-sync job also checks that a second regeneration is identical (determinism)', () => {
  const generatorCalls = job.split('scripts/generate_product_family_matrix.py').length - 1;
  const diffChecks = job.split(`git diff --exit-code -- ${GENERATED_FILE}`).length - 1;
  assert.ok(generatorCalls >= 2, `expected the generator to run at least twice, found ${generatorCalls}`);
  assert.ok(diffChecks >= 2, `expected a diff check after each regeneration, found ${diffChecks}`);
});

test('6. the matrix-sync job runs on every pull request and push to main (shares the workflow triggers)', () => {
  assert.match(workflow, /^on:\s*\n\s+pull_request:\s*\n\s+branches:\s*\[main\]\s*\n\s+push:\s*\n\s+branches:\s*\[main\]/m);
});

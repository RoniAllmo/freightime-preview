/**
 * CI-completeness guard.
 *
 * Audit finding: the CI workflow's test-run command used to be a
 * manually maintained, non-recursive glob
 * (`node --test "tests/readiness/*.test.js" "tests/import-readiness/
 * *.test.js"`) that silently excluded 237 of 909 tests --
 * tests/tools/*.test.js (calculators) and every file under
 * tests/import-readiness/regulatory-signals/ -- because neither
 * directory was ever added to the glob when they were introduced.
 *
 * The canonical, approved test command is the bare `node --test`, run
 * with no path arguments from the repository root -- Node's own
 * documented default test-file discovery, which recursively finds
 * every test file anywhere under the working directory rather than
 * relying on a manually maintained partial directory list. This test
 * verifies, mechanically, that:
 *
 *   1. The GitHub Actions workflow's "Run tests" step actually runs
 *      this exact canonical command (catches a future accidental
 *      narrowing before it ships, both locally and in CI itself).
 *   2. Every maintained *.test.js file under the approved test roots
 *      is a file the canonical command would run over -- i.e. no
 *      maintained test file lives somewhere Node's own recursive
 *      discovery would not reach.
 *
 * Approved test roots (documented here as the single source of truth
 * for "where maintained tests are expected to live" -- see also
 * OPERATIONS_TOOLKIT_V1.md and IMPORT_READINESS_V1.md, which should
 * quote this exact command):
 *   - tests/readiness/
 *   - tests/import-readiness/ (including its regulatory-signals/ subdirectory)
 *   - tests/tools/
 *
 * Pure Node, no DOM, no network, no live server required.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORKFLOW_PATH = path.join(REPO_ROOT, '.github', 'workflows', 'frontend-ci.yml');

export const CANONICAL_TEST_COMMAND = 'node --test';

const APPROVED_TEST_ROOTS = Object.freeze([
  'tests/readiness',
  'tests/import-readiness',
  'tests/tools',
]);

/** True for a test file directly inside tests/ itself (like this guard), not nested in a subdirectory. */
function isTopLevelTestsFile(relativePath) {
  return path.dirname(relativePath) === 'tests';
}

function findTestFiles(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...findTestFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.test.js')) {
      found.push(full);
    }
  }
  return found;
}

test('1. the GitHub Actions workflow runs the exact canonical, fully-recursive test command', () => {
  const workflow = fs.readFileSync(WORKFLOW_PATH, 'utf8');
  const runLineMatch = workflow.match(/-\s*name:\s*Run tests\s*\n\s*run:\s*(.+)/);
  assert.ok(runLineMatch, 'expected to find a "Run tests" step in the workflow');
  const runCommand = runLineMatch[1].trim();
  assert.equal(
    runCommand,
    CANONICAL_TEST_COMMAND,
    'the workflow test command has drifted from the canonical command -- this is exactly the ' +
    'kind of silent-exclusion regression this guard exists to catch',
  );
});

test('2. every maintained *.test.js file lives under an approved test root reachable by the canonical command', () => {
  const allTestFiles = findTestFiles(path.join(REPO_ROOT, 'tests')).map((f) => path.relative(REPO_ROOT, f));
  assert.ok(allTestFiles.length > 0, 'expected at least one maintained test file');
  for (const file of allTestFiles) {
    const reachable = isTopLevelTestsFile(file)
      || APPROVED_TEST_ROOTS.some((root) => file.startsWith(`${root}/`));
    assert.ok(reachable, `${file} does not live under any approved test root (${APPROVED_TEST_ROOTS.join(', ')}) or directly in tests/`);
  }
});

test('3. no approved test root is empty (a root with zero files would silently hide an entire missing area)', () => {
  for (const root of APPROVED_TEST_ROOTS) {
    const full = path.join(REPO_ROOT, root);
    assert.ok(fs.existsSync(full), `approved test root ${root} does not exist`);
    const files = findTestFiles(full);
    assert.ok(files.length > 0, `approved test root ${root} contains no maintained test files`);
  }
});

test('4. regression anchor: tests/tools (calculators) and tests/import-readiness/regulatory-signals both contain maintained tests, matching the two areas the audit found excluded from CI', () => {
  const toolsFiles = findTestFiles(path.join(REPO_ROOT, 'tests', 'tools'));
  const regulatorySignalsFiles = findTestFiles(path.join(REPO_ROOT, 'tests', 'import-readiness', 'regulatory-signals'));
  assert.ok(toolsFiles.length > 0, 'tests/tools must contain maintained tests');
  assert.ok(regulatorySignalsFiles.length > 0, 'tests/import-readiness/regulatory-signals must contain maintained tests');
});

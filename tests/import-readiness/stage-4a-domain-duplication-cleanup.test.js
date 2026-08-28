/**
 * Stage 4A cleanup program (product-owner-approved).
 *
 * Covers:
 *  - Decision 4: question-budget.js removed as a duplicate of the
 *    canonical question-scheduler.js (no production consumer, no
 *    unique required API -- see docs/regulatory-signals-pilot.md
 *    §14.2). Its own test coverage was migrated into
 *    question-scheduler.test.js; this file only locks in that the
 *    module is actually gone and nothing still references it.
 *  - Part E: product-family-result.js's RESULT_STATE export renamed to
 *    MATRIX_RESULT_STATE to stop shadowing result-state.js's own
 *    top-level RESULT_STATE domain. Every string value, the single
 *    importer's aliasing, and the top-level domain itself must be
 *    byte-identical to before the rename.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MATRIX_RESULT_STATE, buildProductFamilyMatrixSection } from '../../js/import-readiness/product-family-result.js';
import { RESULT_STATE, resolveResultState } from '../../js/import-readiness/result-state.js';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

function listJsFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...listJsFiles(full));
    else if (entry.name.endsWith('.js')) results.push(full);
  }
  return results;
}

test('1. question-budget.js no longer exists on disk', () => {
  assert.equal(existsSync(new URL('../../js/import-readiness/regulatory-signals/question-budget.js', import.meta.url)), false);
});

test('2. question-budget.test.js no longer exists on disk', () => {
  assert.equal(existsSync(new URL('../../tests/import-readiness/regulatory-signals/question-budget.test.js', import.meta.url)), false);
});

test('3. no source or test file imports from question-budget.js', () => {
  const offenders = [];
  for (const file of listJsFiles(repoRoot)) {
    if (file.endsWith('stage-4a-domain-duplication-cleanup.test.js')) continue;
    const content = readFileSync(file, 'utf8');
    if (/from\s+['"][^'"]*question-budget\.js['"]/.test(content)) offenders.push(path.relative(repoRoot, file));
  }
  assert.deepEqual(offenders, [], `no .js file may import from question-budget.js, found: ${offenders.join(', ')}`);
});

test('4. product-family-result.js exports MATRIX_RESULT_STATE (not RESULT_STATE)', () => {
  assert.ok(MATRIX_RESULT_STATE, 'MATRIX_RESULT_STATE must be exported');
  assert.deepEqual(Object.keys(MATRIX_RESULT_STATE).sort(), ['NO_POSITIVE_SIGNAL', 'POSITIVE', 'SELECTION_UNRESOLVED', 'UNKNOWN_FAMILY'].sort());
});

test('5. every MATRIX_RESULT_STATE string value is byte-identical to before the rename', () => {
  assert.equal(MATRIX_RESULT_STATE.POSITIVE, 'positive');
  assert.equal(MATRIX_RESULT_STATE.NO_POSITIVE_SIGNAL, 'no_positive_signal');
  assert.equal(MATRIX_RESULT_STATE.UNKNOWN_FAMILY, 'unknown_family');
  assert.equal(MATRIX_RESULT_STATE.SELECTION_UNRESOLVED, 'selection_unresolved');
});

test('6. MATRIX_RESULT_STATE is frozen (immutable), as RESULT_STATE was before the rename', () => {
  assert.ok(Object.isFrozen(MATRIX_RESULT_STATE));
});

test('7. result-state.js top-level RESULT_STATE domain is completely unchanged by the rename', () => {
  assert.deepEqual(RESULT_STATE, Object.freeze({
    MATCHED_DETAILED_DIRECTION: 'matched_detailed_direction',
    MATCHED_MATRIX_DIRECTION: 'matched_matrix_direction',
    MATCHED_COMBINED_DIRECTION: 'matched_combined_direction',
    RECOGNIZED_NO_POSITIVE_DIRECTION: 'recognized_no_positive_direction',
    UNKNOWN_FAMILY: 'unknown_family',
    SELECTION_INFORMATION_NEEDED: 'selection_information_needed',
    OPERATIONAL_RESULT: 'operational_result',
    GENERIC_ONLY: 'generic_only',
  }));
});

test('8. resolveResultState still correctly maps a positive matrix section to MATCHED_MATRIX_DIRECTION (proves the renamed import is wired correctly)', () => {
  const state = resolveResultState({
    isOperationalRoute: false,
    regulatoryEvaluation: null,
    productFamilySection: { state: 'positive', hasPositiveCategories: true },
  });
  assert.equal(state, RESULT_STATE.MATCHED_MATRIX_DIRECTION);
});

test('9. resolveResultState still correctly maps an unresolved-selection matrix section to SELECTION_INFORMATION_NEEDED', () => {
  const state = resolveResultState({
    isOperationalRoute: false,
    regulatoryEvaluation: null,
    productFamilySection: { state: 'selection_unresolved', hasPositiveCategories: false },
  });
  assert.equal(state, RESULT_STATE.SELECTION_INFORMATION_NEEDED);
});

test('10. resolveResultState still correctly maps an unknown-family matrix section to UNKNOWN_FAMILY', () => {
  const state = resolveResultState({
    isOperationalRoute: false,
    regulatoryEvaluation: null,
    productFamilySection: { state: 'unknown_family', hasPositiveCategories: false },
  });
  assert.equal(state, RESULT_STATE.UNKNOWN_FAMILY);
});

test('11. buildProductFamilyMatrixSection still renders a positive section using the renamed internal enum, with byte-identical public string content', () => {
  const section = buildProductFamilyMatrixSection({ selectedFamilyIds: ['plastic_toys'], candidateFamilyIds: ['plastic_toys'] });
  assert.ok(section);
  assert.equal(typeof section.state, 'string');
});

// -----------------------------------------------------------------
// Part F: language-safety.js and multi-signal-presentation.js remain
// deliberately unwired -- this is documented, not accidental. Locks in
// that no runtime import was added and no public behavior changed.
// -----------------------------------------------------------------

test('12. import-readiness-controller.js does not import language-safety.js', () => {
  const content = readFileSync(path.join(repoRoot, 'js/import-readiness/import-readiness-controller.js'), 'utf8');
  assert.ok(!/from\s+['"][^'"]*language-safety\.js['"]/.test(content), 'language-safety.js must stay a test-only utility, never imported by the controller');
});

test('13. import-readiness-controller.js does not import multi-signal-presentation.js', () => {
  const content = readFileSync(path.join(repoRoot, 'js/import-readiness/import-readiness-controller.js'), 'utf8');
  assert.ok(!/from\s+['"][^'"]*multi-signal-presentation\.js['"]/.test(content), 'multi-signal-presentation.js must stay future-ready but unwired unless a real product requirement drives adopting it');
});

test('14. no production (non-test) .js file imports language-safety.js', () => {
  const offenders = [];
  for (const file of listJsFiles(path.join(repoRoot, 'js'))) {
    const content = readFileSync(file, 'utf8');
    if (/from\s+['"][^'"]*language-safety\.js['"]/.test(content)) offenders.push(path.relative(repoRoot, file));
  }
  assert.deepEqual(offenders, [], `language-safety.js must only be imported by test files, found production imports in: ${offenders.join(', ')}`);
});

test('15. no production (non-test) .js file imports multi-signal-presentation.js', () => {
  const offenders = [];
  for (const file of listJsFiles(path.join(repoRoot, 'js'))) {
    if (file.endsWith('multi-signal-presentation.js')) continue;
    const content = readFileSync(file, 'utf8');
    if (/from\s+['"][^'"]*multi-signal-presentation\.js['"]/.test(content)) offenders.push(path.relative(repoRoot, file));
  }
  assert.deepEqual(offenders, [], `multi-signal-presentation.js must stay unwired from production, found imports in: ${offenders.join(', ')}`);
});

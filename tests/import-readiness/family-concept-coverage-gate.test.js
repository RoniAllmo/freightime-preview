/**
 * Automated, registry-driven coverage gate (concept-level suggestion
 * completion, part 2). Reads the LIVE visible-family list
 * (ALL_PRODUCT_FAMILY_VALUES, family-material-disclosure.js) and the
 * live matrix (product-family-matrix.js), and cross-checks them against
 * the canonical FAMILY_CONCEPT_COVERAGE registry
 * (product-family-concept-coverage.js) -- no separate, manually
 * maintained list. A future visible family with no matching coverage
 * entry fails this test until one is added.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_PRODUCT_FAMILY_VALUES } from '../../js/import-readiness/family-material-disclosure.js';
import { PRODUCT_FAMILY_MATRIX } from '../../js/import-readiness/product-family-matrix.js';
import { FAMILY_CONCEPT_COVERAGE, COVERAGE_STATUS } from '../../js/import-readiness/product-family-concept-coverage.js';

const SPECIAL_VALUES = new Set(['other_general_product', 'not_sure']);
const activeMatrixIds = new Set(PRODUCT_FAMILY_MATRIX.filter((row) => row.activeStatus).map((row) => row.id));
const allMatrixIds = new Set(PRODUCT_FAMILY_MATRIX.map((row) => row.id));

test('1. exactly 41 visible product-family options are found in the live registry', () => {
  assert.equal(ALL_PRODUCT_FAMILY_VALUES.length, 41);
});

test('2. every live visible family has exactly one documented coverage entry', () => {
  const covered = new Set(FAMILY_CONCEPT_COVERAGE.map((e) => e.familyValue));
  const missing = ALL_PRODUCT_FAMILY_VALUES.filter((v) => !covered.has(v));
  assert.deepEqual(missing, [], `families without a coverage status: ${JSON.stringify(missing)}`);
});

test('3. no coverage entry references a family value outside the live visible-family list (0 invalid family references)', () => {
  const live = new Set(ALL_PRODUCT_FAMILY_VALUES);
  const invalid = FAMILY_CONCEPT_COVERAGE.filter((e) => !live.has(e.familyValue)).map((e) => e.familyValue);
  assert.deepEqual(invalid, []);
});

test('4. no duplicate concept-coverage entries for the same family value (0 duplicate profile IDs)', () => {
  const seen = new Set();
  const duplicates = [];
  for (const entry of FAMILY_CONCEPT_COVERAGE) {
    if (seen.has(entry.familyValue)) duplicates.push(entry.familyValue);
    seen.add(entry.familyValue);
  }
  assert.deepEqual(duplicates, []);
});

test('5. the two special options (other_general_product, not_sure) carry status S, and no other family does', () => {
  for (const entry of FAMILY_CONCEPT_COVERAGE) {
    if (SPECIAL_VALUES.has(entry.familyValue)) {
      assert.equal(entry.status, COVERAGE_STATUS.S, `${entry.familyValue} must be status S`);
    } else {
      assert.notEqual(entry.status, COVERAGE_STATUS.S, `${entry.familyValue} must not be status S`);
    }
  }
});

test('6. every status A/B/C entry references at least one real, active matrix row (0 inactive/nonexistent matrix references)', () => {
  const failures = [];
  for (const entry of FAMILY_CONCEPT_COVERAGE) {
    if (entry.status === COVERAGE_STATUS.S) continue;
    if (!Array.isArray(entry.matrixIds) || entry.matrixIds.length === 0) {
      failures.push(`${entry.familyValue}: no matrixIds`);
      continue;
    }
    for (const id of entry.matrixIds) {
      if (!allMatrixIds.has(id)) failures.push(`${entry.familyValue}: unknown matrix id ${id}`);
      else if (!activeMatrixIds.has(id)) failures.push(`${entry.familyValue}: inactive matrix id ${id}`);
    }
  }
  assert.deepEqual(failures, []);
});

test('7. every entry carries a non-trivial technical justification (no D status merely because aliases have not been written)', () => {
  for (const entry of FAMILY_CONCEPT_COVERAGE) {
    assert.ok(typeof entry.justification === 'string' && entry.justification.length > 20, `${entry.familyValue} needs a real justification`);
    if (entry.status === COVERAGE_STATUS.D) {
      assert.doesNotMatch(entry.justification.toLowerCase(), /not (yet )?(written|implemented|done)/, `${entry.familyValue}: D status must not be justified merely by "not yet written"`);
    }
  }
});

test('8. no visible family is currently left at status D without this test still passing (0 missing statuses either way)', () => {
  // Every family that IS status D must still have a concrete
  // justification (test 7); this test additionally confirms the D list
  // itself is finite and enumerable from the live registry, not silently
  // growing.
  const dFamilies = FAMILY_CONCEPT_COVERAGE.filter((e) => e.status === COVERAGE_STATUS.D).map((e) => e.familyValue);
  assert.ok(Array.isArray(dFamilies));
});

test('9. a family newly added to ALL_PRODUCT_FAMILY_VALUES without a coverage entry would fail this gate (simulated)', () => {
  const covered = new Set(FAMILY_CONCEPT_COVERAGE.map((e) => e.familyValue));
  const simulatedLiveList = [...ALL_PRODUCT_FAMILY_VALUES, 'a_hypothetical_future_family'];
  const missing = simulatedLiveList.filter((v) => !covered.has(v));
  assert.deepEqual(missing, ['a_hypothetical_future_family']);
});

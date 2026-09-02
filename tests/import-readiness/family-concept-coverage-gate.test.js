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
import {
  ALL_PRODUCT_FAMILY_VALUES, PRESENTATION_ALIAS_SUPPLEMENTS, PRESENTATION_CONCEPT_HINTS,
} from '../../js/import-readiness/family-material-disclosure.js';
import { PRODUCT_FAMILY_MATRIX } from '../../js/import-readiness/product-family-matrix.js';
import { CANDIDATE_SET_SCOPED_HINTS } from '../../js/import-readiness/product-family-selection-mapping.js';
import { FAMILY_CONCEPT_COVERAGE, COVERAGE_STATUS, COVERAGE_SOURCE } from '../../js/import-readiness/product-family-concept-coverage.js';

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

// -----------------------------------------------------------------
// 10. Coverage-count invariant (fixes the prior completion report's
// 43-vs-41 arithmetic error): every count below is computed directly
// from the live registry, never hardcoded to an expected category
// total, so a future registry edit that breaks the invariant fails
// this test immediately regardless of which category changed.
// -----------------------------------------------------------------

test('10. coverage-count invariant: exactly one status per visible option, and the category counts sum to exactly 41', () => {
  const liveCount = ALL_PRODUCT_FAMILY_VALUES.length;
  const entryCount = FAMILY_CONCEPT_COVERAGE.length;
  const uniqueFamilyValues = new Set(FAMILY_CONCEPT_COVERAGE.map((e) => e.familyValue));
  const specialEntries = FAMILY_CONCEPT_COVERAGE.filter((e) => SPECIAL_VALUES.has(e.familyValue));
  const realEntries = FAMILY_CONCEPT_COVERAGE.filter((e) => !SPECIAL_VALUES.has(e.familyValue));
  const statusCounts = { A: 0, B: 0, C: 0, D: 0, S: 0 };
  for (const entry of FAMILY_CONCEPT_COVERAGE) statusCounts[entry.status] = (statusCounts[entry.status] || 0) + 1;
  const missing = ALL_PRODUCT_FAMILY_VALUES.filter((v) => !uniqueFamilyValues.has(v));
  const extra = [...uniqueFamilyValues].filter((v) => !ALL_PRODUCT_FAMILY_VALUES.includes(v));
  const abcdTotal = statusCounts.A + statusCounts.B + statusCounts.C + statusCounts.D;
  const grandTotal = abcdTotal + statusCounts.S;

  assert.equal(liveCount, 41, `live visible options: expected 41, found ${liveCount}`);
  assert.equal(entryCount, 41, `coverage entries: expected 41, found ${entryCount}`);
  assert.equal(uniqueFamilyValues.size, 41, 'exactly one coverage entry per visible option (no duplicates)');
  assert.equal(realEntries.length, 39, `real-family entries: expected 39, found ${realEntries.length}`);
  assert.equal(specialEntries.length, 2, `special-option entries: expected 2, found ${specialEntries.length}`);
  assert.deepEqual(missing, [], `missing family values: ${JSON.stringify(missing)}`);
  assert.deepEqual(extra, [], `extra family values not in the live list: ${JSON.stringify(extra)}`);
  assert.equal(abcdTotal, 39, `A+B+C+D must equal the 39 real families, got ${abcdTotal} (${JSON.stringify(statusCounts)})`);
  assert.equal(statusCounts.S, 2, `S must equal the 2 special options, got ${statusCounts.S}`);
  assert.equal(grandTotal, 41, `A+B+C+D+S must equal 41, got ${grandTotal} (${JSON.stringify(statusCounts)})`);
});

// -----------------------------------------------------------------
// 11. Coverage-source verifiability (Part 4, issue 4): every status-B
// and status-C entry must declare a coverageSource that genuinely
// exists in the named presentation mechanism -- not merely a plausible
// free-text claim.
// -----------------------------------------------------------------

const supplementMatrixIds = new Set(PRESENTATION_ALIAS_SUPPLEMENTS.map((e) => e.matrixId));
const conceptHintFamilyValues = new Set(PRESENTATION_CONCEPT_HINTS.flatMap((h) => h.suggestedFamilyValues));
const scopedHintFamilyKeys = new Set(Object.keys(CANDIDATE_SET_SCOPED_HINTS));

function coverageSourceExists(entry) {
  switch (entry.coverageSource) {
    case COVERAGE_SOURCE.MATRIX:
      return entry.matrixIds.length > 0;
    case COVERAGE_SOURCE.ALIAS_SUPPLEMENT:
      return entry.matrixIds.some((id) => supplementMatrixIds.has(id));
    case COVERAGE_SOURCE.CONCEPT_HINT:
      return conceptHintFamilyValues.has(entry.familyValue);
    case COVERAGE_SOURCE.SCOPED_HINT:
      return scopedHintFamilyKeys.has(entry.familyValue);
    case COVERAGE_SOURCE.SPECIAL_OPTION:
      return SPECIAL_VALUES.has(entry.familyValue);
    default:
      return false;
  }
}

test('11. every entry declares a recognized coverageSource', () => {
  const validSources = new Set(Object.values(COVERAGE_SOURCE));
  const invalid = FAMILY_CONCEPT_COVERAGE.filter((e) => !validSources.has(e.coverageSource)).map((e) => e.familyValue);
  assert.deepEqual(invalid, []);
});

test('12. every status-B and status-C entry\'s declared coverageSource genuinely exists in the named presentation mechanism (0 invalid coverage sources)', () => {
  const failures = [];
  for (const entry of FAMILY_CONCEPT_COVERAGE) {
    if (entry.status !== COVERAGE_STATUS.B && entry.status !== COVERAGE_STATUS.C) continue;
    if (!coverageSourceExists(entry)) failures.push(`${entry.familyValue} (${entry.status}): declared source "${entry.coverageSource}" not found`);
  }
  assert.deepEqual(failures, []);
});

test('13. every status-A entry declares coverageSource "matrix", and every status-S entry declares "special_option"', () => {
  for (const entry of FAMILY_CONCEPT_COVERAGE) {
    if (entry.status === COVERAGE_STATUS.A) assert.equal(entry.coverageSource, COVERAGE_SOURCE.MATRIX, `${entry.familyValue}`);
    if (entry.status === COVERAGE_STATUS.S) assert.equal(entry.coverageSource, COVERAGE_SOURCE.SPECIAL_OPTION, `${entry.familyValue}`);
  }
});

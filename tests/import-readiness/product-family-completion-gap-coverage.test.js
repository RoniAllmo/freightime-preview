/**
 * Coverage-gap closure test (FT-ONE-PULSE-COMPLETE-ALL-PRODUCT-FAMILIES-V1,
 * Gate H). A mechanical audit (grepping every tests/**\/*.test.js file's
 * content against each active matrix row's id and every alias of length
 * >= 3) found exactly 11 active product-family-matrix rows with ZERO
 * discoverable test evidence anywhere in the repository:
 *
 *   electrical-and-electronics-02, -03, -06, -08
 *   vehicles-and-transport-06, -07, -09
 *   children-and-infants-02, -03
 *   chemicals-and-materials-04
 *   construction-and-industrial-03
 *
 * This suite closes that gap with a data-driven, per-row test that reads
 * each row's OWN aliases directly from product-family-matrix.js at
 * test-run time -- never a hardcoded copy that could drift -- and
 * confirms, for every row:
 *
 *   1. at least one of the row's own aliases resolves, through the real
 *      identifyProductFamily matching engine, to exactly that matrix id
 *      with HIGH_CONFIDENCE. HIGH_CONFIDENCE is only ever returned when
 *      exactly one family matches (product-family-identification.js),
 *      so this single assertion also proves no unrelated matrix id
 *      matches the same alias -- the collision check this plan requires.
 *   2. the row's id is reachable through at least one entry of
 *      PRODUCT_FAMILY_SELECTION_CANDIDATES (regression guard -- already
 *      true per the prior mechanical audit, not new coverage).
 *   3. the row's id is named in at least one FAMILY_CONCEPT_COVERAGE
 *      entry's matrixIds (same regression-guard purpose).
 *
 * Ten of the eleven rows previously carried only their own umbrella
 * matrix-row phrase as their sole alias (zero vocabulary depth). For
 * eight of those, a small, high-confidence, collision-checked
 * commercial synonym was added directly to product-family-matrix.js's
 * own `aliases` array (each addition verified against the full alias
 * set and every FAMILY_NEGATIVE_TERMS list before being added -- see
 * the implementation report for the full candidate-rejection trail).
 * electrical-and-electronics-06 already had 4 aliases (no gap) and
 * construction-and-industrial-03 is deliberately left with only its
 * original single alias -- no synonym meeting this plan's strict safety
 * bar was found with high confidence, so it is reported as an open
 * vocabulary gap rather than an invented, unreviewed term.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { findFamilyById } from '../../js/import-readiness/product-family-matrix.js';
import { identifyProductFamily, IDENTIFICATION_OUTCOME } from '../../js/import-readiness/product-family-identification.js';
import { PRODUCT_FAMILY_SELECTION_CANDIDATES } from '../../js/import-readiness/product-family-selection-mapping.js';
import { FAMILY_CONCEPT_COVERAGE } from '../../js/import-readiness/product-family-concept-coverage.js';

const GAP_ROW_IDS = Object.freeze([
  'electrical-and-electronics-02',
  'electrical-and-electronics-03',
  'electrical-and-electronics-06',
  'electrical-and-electronics-08',
  'vehicles-and-transport-06',
  'vehicles-and-transport-07',
  'vehicles-and-transport-09',
  'children-and-infants-02',
  'children-and-infants-03',
  'chemicals-and-materials-04',
  'construction-and-industrial-03',
]);

test('Gate H closure: every previously-untested active matrix row resolves through at least one of its own aliases, with no unrelated family also matching', async (t) => {
  for (const id of GAP_ROW_IDS) {
    await t.test(id, () => {
      const family = findFamilyById(id);
      assert.ok(family, `matrix row ${id} must exist`);
      assert.equal(family.activeStatus, true, `${id} must be active`);
      assert.ok(Array.isArray(family.aliases) && family.aliases.length > 0, `${id} must have at least one alias`);

      const matchedViaAlias = family.aliases.find((alias) => {
        const result = identifyProductFamily([alias]);
        return result.outcome === IDENTIFICATION_OUTCOME.HIGH_CONFIDENCE
          && result.family
          && result.family.id === id;
      });

      assert.ok(
        matchedViaAlias,
        `${id}: none of its own aliases (${JSON.stringify(family.aliases)}) resolved uniquely to itself via identifyProductFamily`,
      );
    });
  }
});

test('Gate H closure: every previously-untested active matrix row remains reachable through PRODUCT_FAMILY_SELECTION_CANDIDATES (regression guard, not new coverage)', async (t) => {
  for (const id of GAP_ROW_IDS) {
    await t.test(id, () => {
      const reachable = Object.values(PRODUCT_FAMILY_SELECTION_CANDIDATES).some(
        (ids) => Array.isArray(ids) && ids.includes(id),
      );
      assert.ok(reachable, `${id} must appear in at least one PRODUCT_FAMILY_SELECTION_CANDIDATES entry`);
    });
  }
});

test('Gate H closure: every previously-untested active matrix row is named in FAMILY_CONCEPT_COVERAGE (regression guard, not new coverage)', async (t) => {
  for (const id of GAP_ROW_IDS) {
    await t.test(id, () => {
      const covered = FAMILY_CONCEPT_COVERAGE.some(
        (entry) => Array.isArray(entry.matrixIds) && entry.matrixIds.includes(id),
      );
      assert.ok(covered, `${id} must be named in a FAMILY_CONCEPT_COVERAGE entry's matrixIds`);
    });
  }
});

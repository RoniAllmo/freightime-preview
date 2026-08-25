/**
 * Tests for the centralized explicit-family-selection -> matrix-family
 * mapping (product-family-selection-mapping.js): the exact 5-case
 * precedence logic, in isolation from identification/result building.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRODUCT_FAMILY_SELECTION_CANDIDATES,
  resolveFamilyIdentificationOptions,
} from '../../js/import-readiness/product-family-selection-mapping.js';
import { findFamilyById, PRODUCT_FAMILY_MATRIX } from '../../js/import-readiness/product-family-matrix.js';
import { PRODUCT_FAMILY } from '../../js/import-readiness/layered-question-model.js';

test('1. every mapped checkbox candidate id resolves to a real, active matrix family', () => {
  for (const [checkboxValue, candidateIds] of Object.entries(PRODUCT_FAMILY_SELECTION_CANDIDATES)) {
    assert.ok(PRODUCT_FAMILY.includes(checkboxValue), `${checkboxValue} must be a real PRODUCT_FAMILY checkbox value`);
    assert.ok(candidateIds.length > 0, `${checkboxValue} must map to at least one family`);
    for (const id of candidateIds) {
      const family = findFamilyById(id);
      assert.ok(family, `${checkboxValue} -> ${id} must resolve to a real matrix family`);
      assert.equal(family.activeStatus, true, `${checkboxValue} -> ${id} must be an active matrix family`);
    }
  }
});

test('2. no duplicate family ids within a single checkbox candidate set', () => {
  for (const [checkboxValue, candidateIds] of Object.entries(PRODUCT_FAMILY_SELECTION_CANDIDATES)) {
    assert.equal(new Set(candidateIds).size, candidateIds.length, `${checkboxValue} candidate set must not repeat an id`);
  }
});

test('3. other_general_product and not_sure are never present in the mapping', () => {
  assert.equal(PRODUCT_FAMILY_SELECTION_CANDIDATES.other_general_product, undefined);
  assert.equal(PRODUCT_FAMILY_SELECTION_CANDIDATES.not_sure, undefined);
});

test('4. case 3 (no selection): empty array -> no restriction', () => {
  assert.deepEqual(resolveFamilyIdentificationOptions([], findFamilyById), {});
});

test('5. case 3 (no selection): only not_sure -> no restriction, never a forced family', () => {
  assert.deepEqual(resolveFamilyIdentificationOptions(['not_sure'], findFamilyById), {});
});

test('6. case 3 (no selection): only other_general_product -> no restriction, never a forced family', () => {
  assert.deepEqual(resolveFamilyIdentificationOptions(['other_general_product'], findFamilyById), {});
});

test('7. case 3 (no selection): other_general_product + not_sure together -> still no restriction', () => {
  assert.deepEqual(resolveFamilyIdentificationOptions(['other_general_product', 'not_sure'], findFamilyById), {});
});

test('8. case 1 (single, unambiguous): forces that exact family regardless of any text', () => {
  const options = resolveFamilyIdentificationOptions(['cosmetics_and_beauty'], findFamilyById);
  assert.ok(options.forcedFamily);
  assert.equal(options.forcedFamily.id, 'health-and-cosmetics-01');
  assert.equal(options.families, undefined);
});

test('9. case 1 (single, unambiguous) + not_sure also selected: not_sure never overrides the normal family', () => {
  const options = resolveFamilyIdentificationOptions(['not_sure', 'batteries_or_battery_containing'], findFamilyById);
  assert.ok(options.forcedFamily);
  assert.equal(options.forcedFamily.id, 'electrical-and-electronics-07');
});

test('10. case 2 (single, ambiguous): restricts to the exact candidate set, forces nothing', () => {
  const options = resolveFamilyIdentificationOptions(['food_contact_items'], findFamilyById);
  assert.equal(options.forcedFamily, undefined);
  assert.ok(Array.isArray(options.families));
  assert.deepEqual(
    options.families.map((f) => f.id).sort(),
    ['food-contact-01', 'food-contact-02', 'food-contact-03', 'food-contact-04', 'food-contact-05'].sort(),
  );
});

test('11. case 4 (multiple normal selections): union of candidate sets, order-independent (not resolved by DOM order)', () => {
  const a = resolveFamilyIdentificationOptions(['cosmetics_and_beauty', 'batteries_or_battery_containing'], findFamilyById);
  const b = resolveFamilyIdentificationOptions(['batteries_or_battery_containing', 'cosmetics_and_beauty'], findFamilyById);
  const idsA = a.families.map((f) => f.id).sort();
  const idsB = b.families.map((f) => f.id).sort();
  assert.deepEqual(idsA, idsB);
  assert.deepEqual(idsA, ['electrical-and-electronics-07', 'health-and-cosmetics-01'].sort());
  assert.equal(a.forcedFamily, undefined);
});

test('12. case 4: multiple ambiguous selections union without deduping distinct ids, never forces one', () => {
  const options = resolveFamilyIdentificationOptions(
    ['food_contact_items', 'glass_ceramics_and_tableware'],
    findFamilyById,
  );
  assert.equal(options.forcedFamily, undefined);
  const ids = options.families.map((f) => f.id).sort();
  assert.deepEqual(ids, ['food-contact-01', 'food-contact-02', 'food-contact-03', 'food-contact-04', 'food-contact-05'].sort());
});

test('13. case 4: multiple selections whose union collapses to exactly one id -> forced after all', () => {
  // Two "multiple normal selections" that both resolve to the very same
  // unambiguous matrix family (e.g. a duplicated checked value) collapse
  // to a single, now-authoritative family, not an artificial ambiguity.
  const options = resolveFamilyIdentificationOptions(
    ['cosmetics_and_beauty', 'cosmetics_and_beauty'],
    findFamilyById,
  );
  assert.ok(options.forcedFamily);
  assert.equal(options.forcedFamily.id, 'health-and-cosmetics-01');
  assert.equal(options.families, undefined);
});

test('14. not_sure never appears in a families/forcedFamily result even when combined with multiple normal selections', () => {
  const options = resolveFamilyIdentificationOptions(
    ['not_sure', 'cosmetics_and_beauty', 'batteries_or_battery_containing'],
    findFamilyById,
  );
  const producedIds = options.forcedFamily
    ? [options.forcedFamily.id]
    : options.families.map((f) => f.id);
  assert.ok(!producedIds.includes('not_sure'));
});

test('15. unknown/unmapped checkbox value (defensive) does not throw and contributes nothing to the union', () => {
  const options = resolveFamilyIdentificationOptions(['__not_a_real_value__', 'cosmetics_and_beauty'], findFamilyById);
  assert.ok(options.forcedFamily);
  assert.equal(options.forcedFamily.id, 'health-and-cosmetics-01');
});

test('16. every matrix family id referenced anywhere in the mapping actually exists in PRODUCT_FAMILY_MATRIX', () => {
  const allIds = new Set(PRODUCT_FAMILY_MATRIX.map((f) => f.id));
  for (const candidateIds of Object.values(PRODUCT_FAMILY_SELECTION_CANDIDATES)) {
    for (const id of candidateIds) assert.ok(allIds.has(id), `${id} must exist in the matrix`);
  }
});

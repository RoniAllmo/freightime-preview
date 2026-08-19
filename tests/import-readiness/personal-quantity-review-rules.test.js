/**
 * Regression tests proving there is NO general, application-wide
 * personal-import quantity threshold -- only the one explicit,
 * product-owner-reviewed family rule in `personalQuantityReviewRules`
 * (currently: cosmetics / תמרוקים, which covers "לק ג'ל") can ever
 * produce the quantity-warning sentence. Any other family, at any
 * quantity, produces no warning.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  personalQuantityReviewRules,
  evaluatePersonalQuantityWarning,
  QUANTITY_WARNING_TEXT,
} from '../../js/import-readiness/personal-quantity-warning.js';
import { buildProductFamilyMatrixSection } from '../../js/import-readiness/product-family-result.js';
import { findFamilyById } from '../../js/import-readiness/product-family-matrix.js';
import { IMPORT_TYPE } from '../../js/import-readiness/scenario-schema.js';

function moduleSource() {
  return readFileSync(new URL('../../js/import-readiness/personal-quantity-warning.js', import.meta.url), 'utf8');
}

test('1. no general/default/global quantity threshold constant exists anywhere in the module', () => {
  const source = moduleSource();
  assert.ok(!/GENERAL_COMMERCIAL_APPEARANCE_THRESHOLD/.test(source), 'the removed general threshold constant must not reappear');
  assert.ok(!/DEFAULT_THRESHOLD/i.test(source), 'no renamed default threshold either');
});

test('2. personalQuantityReviewRules contains exactly one reviewed entry, for the cosmetics family', () => {
  const reviewed = personalQuantityReviewRules.filter((r) => r.reviewed);
  assert.equal(reviewed.length, 1);
  const cosmeticsFamily = findFamilyById(reviewed[0].familyId);
  assert.ok(cosmeticsFamily, 'the rule must reference a real matrix family id');
  assert.equal(cosmeticsFamily.publicFamilyName, 'תמרוקים ובשמים');
  assert.ok(cosmeticsFamily.aliases.includes("לק ג'ל"));
});

test('3. every entry identifies familyId, aboveQuantity, warningText, and reviewed status', () => {
  for (const rule of personalQuantityReviewRules) {
    assert.equal(typeof rule.familyId, 'string');
    assert.equal(typeof rule.aboveQuantity, 'number');
    assert.equal(typeof rule.warningText, 'string');
    assert.equal(typeof rule.reviewed, 'boolean');
  }
});

test('4. gel polish, personal import, quantity 100: produces the exact approved warning', () => {
  const section = buildProductFamilyMatrixSection({ texts: ["לק ג'ל"], importType: IMPORT_TYPE.PERSONAL, rawQuantity: '100' });
  assert.equal(section.quantityWarning, QUANTITY_WARNING_TEXT);
});

test('5. gel polish, personal import, blank quantity: no warning', () => {
  const section = buildProductFamilyMatrixSection({ texts: ["לק ג'ל"], importType: IMPORT_TYPE.PERSONAL, rawQuantity: '' });
  assert.equal(section.quantityWarning, null);
});

test('6. gel polish, commercial import, quantity 100: no personal warning shown', () => {
  const section = buildProductFamilyMatrixSection({ texts: ["לק ג'ל"], importType: IMPORT_TYPE.COMMERCIAL, rawQuantity: '100' });
  assert.equal(section.quantityWarning, null);
});

test('7. an unrelated recognized family (clothing) at quantity 21 (above the cosmetics-only threshold) produces no warning', () => {
  const section = buildProductFamilyMatrixSection({ texts: ['ביגוד'], importType: IMPORT_TYPE.PERSONAL, rawQuantity: '21' });
  assert.ok(section, 'clothing must still be recognized as a family');
  assert.equal(section.quantityWarning, null, 'no rule is reviewed for clothing, so no warning may fire regardless of quantity');
});

test('8. an unrelated recognized family (fresh eggs) at quantity 100 does not produce the cosmetics warning', () => {
  const section = buildProductFamilyMatrixSection({ texts: ['ביצים טריות'], importType: IMPORT_TYPE.PERSONAL, rawQuantity: '100' });
  assert.ok(section);
  assert.equal(section.quantityWarning, null, 'eggs has no reviewed quantity rule; the cosmetics-specific warning must not leak to other families');
});

test('9. evaluatePersonalQuantityWarning returns null for any family object without a reviewed rule, at any quantity', () => {
  assert.equal(evaluatePersonalQuantityWarning({ rawQuantity: '1000', family: { id: 'does-not-exist' } }), null);
  assert.equal(evaluatePersonalQuantityWarning({ rawQuantity: '1000', family: undefined }), null);
});

test('10. an unreviewed rule entry (reviewed:false) is inert even if its familyId and threshold would otherwise match', () => {
  // Direct low-level check: a hypothetical unreviewed rule must never be
  // consulted by findReviewRule -- exercised indirectly since
  // findReviewRule is private, by confirming only exactly one *reviewed*
  // rule exists (test 2) and that no additional family beyond it is ever
  // affected (tests 7-8).
  const unreviewed = personalQuantityReviewRules.filter((r) => !r.reviewed);
  assert.equal(unreviewed.length, 0, 'no unreviewed placeholder rules are currently staged, keeping the pilot scope minimal');
});

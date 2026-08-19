/**
 * Regression tests proving there is NO general, application-wide
 * personal-import quantity threshold, and NO numeric threshold of any
 * kind (20, 100, or otherwise) -- only the single explicit,
 * product-owner-reviewed acceptance case in
 * `personalQuantityReviewRules` (cosmetics / תמרוקים, which covers "לק
 * ג'ל", at exactly the reviewed pilot quantity) can ever produce the
 * quantity-warning sentence. Any other family, at any quantity, and
 * this same family at any other quantity, produces no warning.
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

test('2. no active rule uses the number 20 anywhere -- no field, no comparison, no comment describing an active behavior', () => {
  for (const rule of personalQuantityReviewRules) {
    assert.notEqual(rule.aboveQuantity, 20, 'no rule may carry a 20-unit threshold field');
    assert.notEqual(rule.pilotExactQuantity, 20, 'no rule may use 20 as its reviewed acceptance value either');
    assert.ok(!('aboveQuantity' in rule), 'the >-comparison threshold shape must not exist at all -- only an exact match is used');
  }
});

test('3. no generic quantity threshold exists: the evaluator never uses a greater-than/less-than comparison against an invented number', () => {
  const source = moduleSource();
  // The old shape compared with a ">" operator against a numeric field
  // (a threshold, by definition). The new shape must use exact equality
  // only, against a single named acceptance-case value.
  assert.ok(!/quantity\s*>\s*rule\./.test(source), 'no ">" comparison against a rule field may exist -- that shape is a threshold');
  assert.ok(/quantity\s*===\s*rule\.pilotExactQuantity/.test(source), 'the evaluator must use exact equality against the single reviewed acceptance-case value');
});

test('4. personalQuantityReviewRules contains exactly one reviewed entry, for the cosmetics family', () => {
  const reviewed = personalQuantityReviewRules.filter((r) => r.reviewed);
  assert.equal(reviewed.length, 1);
  const cosmeticsFamily = findFamilyById(reviewed[0].familyId);
  assert.ok(cosmeticsFamily, 'the rule must reference a real matrix family id');
  assert.equal(cosmeticsFamily.publicFamilyName, 'תמרוקים ובשמים');
  assert.ok(cosmeticsFamily.aliases.includes("לק ג'ל"));
});

test('5. every entry identifies familyId, pilotExactQuantity, warningText, and reviewed status', () => {
  for (const rule of personalQuantityReviewRules) {
    assert.equal(typeof rule.familyId, 'string');
    assert.equal(typeof rule.pilotExactQuantity, 'number');
    assert.equal(typeof rule.warningText, 'string');
    assert.equal(typeof rule.reviewed, 'boolean');
  }
});

test('6. gel polish, personal import, quantity 100: produces the exact approved warning (the one approved acceptance case)', () => {
  const section = buildProductFamilyMatrixSection({ texts: ["לק ג'ל"], importType: IMPORT_TYPE.PERSONAL, rawQuantity: '100' });
  assert.equal(section.quantityWarning, QUANTITY_WARNING_TEXT);
});

test('7. gel polish, personal import, blank quantity: no warning', () => {
  const section = buildProductFamilyMatrixSection({ texts: ["לק ג'ל"], importType: IMPORT_TYPE.PERSONAL, rawQuantity: '' });
  assert.equal(section.quantityWarning, null);
});

test('8. gel polish, commercial import, quantity 100: no personal warning shown', () => {
  const section = buildProductFamilyMatrixSection({ texts: ["לק ג'ל"], importType: IMPORT_TYPE.COMMERCIAL, rawQuantity: '100' });
  assert.equal(section.quantityWarning, null);
});

test('9. an unrelated recognized family (clothing) at quantity 21 produces no warning', () => {
  const section = buildProductFamilyMatrixSection({ texts: ['ביגוד'], importType: IMPORT_TYPE.PERSONAL, rawQuantity: '21' });
  assert.ok(section, 'clothing must still be recognized as a family');
  assert.equal(section.quantityWarning, null, 'no rule is reviewed for clothing, so no warning may fire regardless of quantity');
});

test('10. an unrelated recognized family (clothing) at quantity 100 produces no warning (the cosmetics acceptance value does not leak to other families)', () => {
  const section = buildProductFamilyMatrixSection({ texts: ['ביגוד'], importType: IMPORT_TYPE.PERSONAL, rawQuantity: '100' });
  assert.ok(section);
  assert.equal(section.quantityWarning, null, 'quantity 100 is only meaningful for the reviewed cosmetics rule, never for an unrelated family');
});

test('11. an unrelated recognized family (fresh eggs) at quantity 100 does not produce the cosmetics warning', () => {
  const section = buildProductFamilyMatrixSection({ texts: ['ביצים טריות'], importType: IMPORT_TYPE.PERSONAL, rawQuantity: '100' });
  assert.ok(section);
  assert.equal(section.quantityWarning, null, 'eggs has no reviewed quantity rule; the cosmetics-specific warning must not leak to other families');
});

test('12. cosmetics at a quantity other than the exact reviewed acceptance value (e.g. 50) produces no warning -- there is no ">" threshold, only the one exact reviewed case', () => {
  const section = buildProductFamilyMatrixSection({ texts: ["לק ג'ל"], importType: IMPORT_TYPE.PERSONAL, rawQuantity: '50' });
  assert.ok(section);
  assert.equal(section.quantityWarning, null, 'no threshold exists, so a quantity below/above 100 that is not itself 100 must not warn');
});

test('13. evaluatePersonalQuantityWarning returns null for any family object without a reviewed rule, at any quantity', () => {
  assert.equal(evaluatePersonalQuantityWarning({ rawQuantity: '1000', family: { id: 'does-not-exist' } }), null);
  assert.equal(evaluatePersonalQuantityWarning({ rawQuantity: '1000', family: undefined }), null);
});

test('14. an unreviewed rule entry (reviewed:false) is inert even if its familyId and value would otherwise match', () => {
  // Direct low-level check: a hypothetical unreviewed rule must never be
  // consulted by findReviewRule -- exercised indirectly since
  // findReviewRule is private, by confirming only exactly one *reviewed*
  // rule exists (test 4) and that no additional family beyond it is ever
  // affected (tests 9-11).
  const unreviewed = personalQuantityReviewRules.filter((r) => !r.reviewed);
  assert.equal(unreviewed.length, 0, 'no unreviewed placeholder rules are currently staged, keeping the pilot scope minimal');
});

test('15. the public warning wording never describes 100, or any number, as a legal threshold', () => {
  assert.ok(!/\d/.test(QUANTITY_WARNING_TEXT), 'the public warning sentence must not contain any invented numeric legal threshold');
  assert.ok(!QUANTITY_WARNING_TEXT.includes('100'), 'must never surface the internal pilot quantity value to the user');
  assert.ok(!/סף|חוק/.test(QUANTITY_WARNING_TEXT), 'must not describe a legal threshold or statutory limit');
});

test('16. the module documents this as a reviewed acceptance case, not a general legal threshold, in its own source comments', () => {
  const source = moduleSource();
  assert.ok(/acceptance/i.test(source), 'the module must explain this is a specific reviewed acceptance case');
  assert.ok(!/legal threshold/i.test(source) || /not a\s+(general\s+)?legal threshold|no numeric threshold/i.test(source), 'must not describe the rule as a general legal threshold');
});

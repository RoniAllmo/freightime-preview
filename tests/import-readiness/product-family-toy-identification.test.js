/**
 * Toy-resolution correction: the childrens_products_and_toys checkbox
 * restricts identification to a genuinely ambiguous 4-candidate set
 * (children-and-infants-01..04), and the sole matrix alias for plain
 * toys (children-and-infants-01) is the plural "צעצועים", which does
 * not match ordinary singular product text ("צעצוע פלסטיק", "בובה").
 *
 * Fixed via CANDIDATE_SET_SCOPED_HINTS (product-family-selection-mapping.js):
 * a small, centralized, data-driven set of extra identification terms
 * that only ever apply when this exact checkbox already narrowed the
 * field to these 4 rows -- never a global alias, never a controller
 * string check, never active outside this scope.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductFamilyMatrixSection } from '../../js/import-readiness/product-family-result.js';
import {
  CANDIDATE_SET_SCOPED_HINTS,
  resolveFamilyIdentificationOptions,
} from '../../js/import-readiness/product-family-selection-mapping.js';
import { findFamilyById } from '../../js/import-readiness/product-family-matrix.js';
import { IMPORT_TYPE } from '../../js/import-readiness/scenario-schema.js';

const TOY_CHECKBOX = 'childrens_products_and_toys';

test('1. checkbox + צעצוע פלסטיק resolves to the existing toy family', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['צעצוע פלסטיק'],
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: [TOY_CHECKBOX],
  });
  assert.ok(section);
  assert.equal(section.state, 'positive');
  assert.equal(section.familyName, 'צעצועים');
});

test('2. checkbox + בובה resolves to the existing toy family', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['בובה'],
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: [TOY_CHECKBOX],
  });
  assert.ok(section);
  assert.equal(section.state, 'positive');
  assert.equal(section.familyName, 'צעצועים');
});

test('3. checkbox + משחק קופסה resolves to the existing toy family', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['משחק קופסה'],
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: [TOY_CHECKBOX],
  });
  assert.ok(section);
  assert.equal(section.state, 'positive');
  assert.equal(section.familyName, 'צעצועים');
});

test('4. checkbox + neutral text remains information-needed (unresolved), not forced to toys', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['מוצר לבדיקה'],
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: [TOY_CHECKBOX],
  });
  assert.ok(section);
  assert.equal(section.state, 'selection_unresolved');
  assert.equal(section.familyName, null);
  assert.equal(section.hasPositiveCategories, false);
});

test('5. no checkbox + unsafe ambiguous wording never fabricates toy recognition (scoped hints never leak outside their scope)', () => {
  // "ציוד ספורט מקצועי" is deliberately EXCLUDED from this negative list
  // as of Wave 2 completion: it now correctly, safely resolves to the
  // new global "ציוד ספורט" (sports equipment) family -- a legitimate
  // new capability, not toy leakage (it still never resolves to toys).
  const negativeTexts = [
    'מוצר דקורטיבי בצורת צעצוע',
    'game controller',
    'gaming computer',
  ];
  for (const text of negativeTexts) {
    const section = buildProductFamilyMatrixSection({ texts: [text], importType: IMPORT_TYPE.COMMERCIAL });
    assert.ok(section, `expected a section for "${text}"`);
    assert.notEqual(section.familyName, 'צעצועים', `must not fabricate toy recognition for "${text}"`);
    assert.equal(section.state, 'unknown_family', `expected unknown_family for "${text}"`);
  }
});

test('5b. Wave 2 completion: "ציוד ספורט מקצועי" now safely resolves to the sports-equipment family (not toys), via the new global curated alias', () => {
  const section = buildProductFamilyMatrixSection({ texts: ['ציוד ספורט מקצועי'], importType: IMPORT_TYPE.COMMERCIAL });
  assert.ok(section);
  assert.equal(section.familyName, 'ציוד ספורט');
  assert.notEqual(section.familyName, 'צעצועים');
  assert.equal(section.state, 'no_positive_signal');
});

test('6. an unselected toy family cannot win over another explicit, unambiguous family selection', () => {
  // cosmetics_and_beauty became ambiguous (2 candidates) as of Wave 2
  // completion (cosmetics vs. perfume), so this test now uses
  // animal_origin_products -- still a genuinely single-candidate
  // (forced), unrelated checkbox -- to exercise the same guarantee.
  const section = buildProductFamilyMatrixSection({
    texts: ['בובה'], // would resolve to toys if the toy checkbox were selected
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: ['animal_origin_products'], // unambiguous, unrelated, explicitly selected instead
  });
  assert.ok(section);
  assert.equal(section.familyName, 'מזון מן החי');
  assert.notEqual(section.familyName, 'צעצועים');
});

test('6b. an unselected toy family cannot win within a different ambiguous candidate set either', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['toy car'], // a scoped toy hint, but the toy checkbox is not selected here
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: ['vehicle_parts_and_transport_accessories'],
  });
  assert.ok(section);
  assert.notEqual(section.familyName, 'צעצועים');
  assert.equal(section.state, 'selection_unresolved', '"toy car" matches no vehicle-parts candidate alias, so the selection stays honestly unresolved');
});

test('7. candidate-set order does not change the result (childrens_products_and_toys combined with another checkbox, either order)', () => {
  const a = buildProductFamilyMatrixSection({
    texts: ['בובה'],
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: [TOY_CHECKBOX, 'cosmetics_and_beauty'],
  });
  const b = buildProductFamilyMatrixSection({
    texts: ['בובה'],
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: ['cosmetics_and_beauty', TOY_CHECKBOX],
  });
  assert.equal(a.familyName, b.familyName);
  assert.equal(a.state, b.state);
  assert.equal(a.familyName, 'צעצועים');
});

test('8. DOM/array order of the candidate ids themselves does not change the result', () => {
  const forward = resolveFamilyIdentificationOptions([TOY_CHECKBOX], findFamilyById);
  const families = forward.families.slice().reverse();
  // Re-run identification manually against both orders via the pure
  // identifyProductFamily seam through buildProductFamilyMatrixSection's
  // own options passthrough (options.families overrides selection-derived
  // restriction, exercising the reversed order directly).
  const a = buildProductFamilyMatrixSection(
    { texts: ['בובה'], importType: IMPORT_TYPE.COMMERCIAL },
    { families: forward.families },
  );
  const b = buildProductFamilyMatrixSection(
    { texts: ['בובה'], importType: IMPORT_TYPE.COMMERCIAL },
    { families },
  );
  assert.equal(a.familyName, b.familyName);
  assert.equal(a.familyName, 'צעצועים');
});

test('9. the existing Standards Institution positive category is reused, never a new one', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['צעצוע פלסטיק'],
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: [TOY_CHECKBOX],
  });
  assert.deepEqual(section.positiveCategories, ['תקינה']);
});

test('10. no new category is fabricated for any of the required positive toy examples', () => {
  const positiveTexts = [
    'צעצוע פלסטיק', 'צעצוע ללא חשמל', 'בובה לילדים', 'משחק קופסה', 'מכונית צעצוע',
    'toy car', 'board game', 'plastic toy',
  ];
  for (const text of positiveTexts) {
    const section = buildProductFamilyMatrixSection({
      texts: [text],
      importType: IMPORT_TYPE.COMMERCIAL,
      selectedProductFamilies: [TOY_CHECKBOX],
    });
    assert.ok(section, `expected a section for "${text}"`);
    assert.equal(section.familyName, 'צעצועים', `expected toys for "${text}"`);
    assert.deepEqual(section.positiveCategories, ['תקינה'], `expected only the existing standards category for "${text}"`);
  }
});

test('11. no new focused question exists anywhere in CANDIDATE_SET_SCOPED_HINTS -- it is presentation/matching data only', () => {
  for (const perFamily of Object.values(CANDIDATE_SET_SCOPED_HINTS)) {
    for (const [familyId, terms] of Object.entries(perFamily)) {
      assert.ok(Array.isArray(terms), `${familyId} hints must be a plain array of terms`);
      for (const term of terms) assert.equal(typeof term, 'string', `${familyId} hint terms must be plain strings, never a question object`);
    }
  }
});

test('12. no toy-age question exists in the scoped hints or anywhere the toy result depends on', () => {
  const allTerms = Object.values(CANDIDATE_SET_SCOPED_HINTS.childrens_products_and_toys).flat();
  for (const term of allTerms) {
    assert.ok(!/age|גיל/i.test(term), `hint term "${term}" must not reference age`);
  }
});

test('13. no bow/arrow question exists in the scoped hints', () => {
  const allTerms = Object.values(CANDIDATE_SET_SCOPED_HINTS.childrens_products_and_toys).flat();
  for (const term of allTerms) {
    assert.ok(!/bow|arrow|קשת|חץ/i.test(term), `hint term "${term}" must not reference bow/arrow`);
  }
});

test('14. animal-origin guidance is unchanged by this correction', () => {
  const section = buildProductFamilyMatrixSection({ texts: ['מזון מן החי'], importType: IMPORT_TYPE.COMMERCIAL });
  assert.ok(section.note.text.includes('השירותים הווטרינריים'));
});

test('15. industrial-machinery guidance is unchanged by this correction', () => {
  const section = buildProductFamilyMatrixSection({ texts: ['מכונות וציוד תעשייתי'], importType: IMPORT_TYPE.COMMERCIAL });
  assert.ok(section.noPositiveSignalMessage.includes('אישור יבוא ייעודי'));
});

test('16. building-material guidance is unchanged by this correction', () => {
  const section = buildProductFamilyMatrixSection({ texts: ['חומרי בנייה'], importType: IMPORT_TYPE.COMMERCIAL });
  assert.ok(section.noPositiveSignalMessage.includes('אישור יבוא ייעודי'));
});

// -- Negative tests for every new identification term --

test('17. negative: "צעצוע" scoped hint does not match construct-state "בובת" or unrelated Hebrew words', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['בובת תצוגה שאינה מיועדת למשחק'],
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: [TOY_CHECKBOX],
  });
  assert.ok(section);
  assert.notEqual(section.familyName, 'צעצועים');
});

test('18. negative: "toy car" hint does not match bare "toy" appearing inside an unrelated word ("Toyota")', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['Toyota spare part'],
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: [TOY_CHECKBOX],
  });
  assert.ok(section);
  assert.notEqual(section.familyName, 'צעצועים');
  assert.equal(section.state, 'selection_unresolved');
});

test('19. negative: "board game" hint does not match "board used as building material" or "game controller"', () => {
  for (const text of ['board used as building material', 'game controller', 'gaming computer']) {
    const section = buildProductFamilyMatrixSection({
      texts: [text],
      importType: IMPORT_TYPE.COMMERCIAL,
      selectedProductFamilies: [TOY_CHECKBOX],
    });
    assert.ok(section, `expected a section for "${text}"`);
    assert.notEqual(section.familyName, 'צעצועים', `must not match toys for "${text}"`);
  }
});

test('20. negative: "plastic toy" hint does not fire on bare "toy" alone (deliberately not a hint term)', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['toy'],
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: [TOY_CHECKBOX],
  });
  assert.ok(section);
  assert.notEqual(section.familyName, 'צעצועים');
  assert.equal(section.state, 'selection_unresolved');
});

test('21. the toy scoped hints (children-and-infants-01) are never scoped to any other checkbox, and no other checkbox\'s scoped hints touch children-and-infants-01', () => {
  // Wave 2 (product-owner-approved guidance for additional product
  // families) legitimately added more checkboxes/families to
  // CANDIDATE_SET_SCOPED_HINTS -- this test's real intent, preserved
  // here, is narrower: the toy hint terms for children-and-infants-01
  // stay scoped to exactly the childrens_products_and_toys checkbox,
  // and no other checkbox's scoped hints ever reach that same family.
  for (const [checkboxValue, perFamily] of Object.entries(CANDIDATE_SET_SCOPED_HINTS)) {
    if (checkboxValue === 'childrens_products_and_toys') {
      assert.ok(
        Object.prototype.hasOwnProperty.call(perFamily, 'children-and-infants-01'),
        'childrens_products_and_toys must still carry the children-and-infants-01 toy hints',
      );
    } else {
      assert.ok(
        !Object.prototype.hasOwnProperty.call(perFamily, 'children-and-infants-01'),
        `${checkboxValue} must never carry scoped hints for children-and-infants-01`,
      );
    }
  }
});

test('22. genuinely ambiguous child-product descriptions (matching none of the 4 candidates) remain information-needed, not forced to toys', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['מוצר לילדים כלשהו'],
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: [TOY_CHECKBOX],
  });
  assert.ok(section);
  assert.equal(section.state, 'selection_unresolved');
  assert.equal(section.hasPositiveCategories, false);
});

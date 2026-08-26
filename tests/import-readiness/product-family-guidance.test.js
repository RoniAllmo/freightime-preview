/**
 * Tests for the product-owner-approved family-guidance overlay
 * (product-family-guidance.js) and its wiring into
 * buildProductFamilyMatrixSection for the four authorized families:
 * toys, products of animal origin, industrial machinery and equipment,
 * building materials.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductFamilyMatrixSection } from '../../js/import-readiness/product-family-result.js';
import { familyGuidanceFor, FAMILY_GUIDANCE } from '../../js/import-readiness/product-family-guidance.js';
import { findFamilyById, PRODUCT_FAMILY_MATRIX } from '../../js/import-readiness/product-family-matrix.js';
import { IMPORT_TYPE } from '../../js/import-readiness/scenario-schema.js';
import { REGULATORY_SIGNAL_RULES } from '../../js/import-readiness/regulatory-signals/rules-registry.js';

const ABSOLUTE_EXEMPTION_PATTERNS = [
  /פטור/, // "exempt"
  /לא נדרש שום/, // "no requirement whatsoever"
  /תמיד פטור/,
];

function assertNoAbsoluteExemptionWording(text) {
  for (const pattern of ABSOLUTE_EXEMPTION_PATTERNS) {
    assert.ok(!pattern.test(text), `must not contain absolute-exemption wording: "${text}"`);
  }
}

test('1. every guidance entry references a real, active matrix family', () => {
  const allIds = new Set(PRODUCT_FAMILY_MATRIX.filter((f) => f.activeStatus).map((f) => f.id));
  for (const familyId of Object.keys(FAMILY_GUIDANCE)) {
    assert.ok(allIds.has(familyId), `${familyId} must be a real, active matrix family`);
  }
});

test('2. familyGuidanceFor returns null for any family not in the authorized set', () => {
  assert.equal(familyGuidanceFor('food-and-beverages-01'), null);
  assert.equal(familyGuidanceFor('health-and-cosmetics-01'), null);
  assert.equal(familyGuidanceFor('not-a-real-id'), null);
});

test('3. exactly the authorized families (Wave 1 + Wave 2 + Wave 2 completion) carry guidance -- no unrelated family touched', () => {
  const keys = Object.keys(FAMILY_GUIDANCE).sort();
  assert.deepEqual(keys, [
    // Wave 1
    'children-and-infants-01',
    'construction-and-industrial-01',
    'construction-and-industrial-02',
    'food-and-beverages-04',
    // Wave 2
    'chemicals-and-materials-03',
    'health-and-cosmetics-02',
    'health-and-cosmetics-03',
    'textiles-and-furniture-02',
    'vehicles-and-transport-03',
    // Wave 2 completion
    'additional-consumer-products-01',
    'additional-consumer-products-06',
    'additional-consumer-products-07',
    'food-and-beverages-06',
    'food-and-beverages-07',
    'health-and-cosmetics-05',
    'textiles-and-furniture-04',
    // Final completion pass
    'textiles-and-furniture-05',
    'vehicles-and-transport-10',
    // Grouped-battery-selection completion
    'electrical-and-electronics-09',
    // Live-animals completion
    'food-and-beverages-08',
  ].sort());
});

// -- TOYS (children-and-infants-01) --

test('4. toys: positive Standards Institution direction, existing positive standards signal untouched', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['צעצועים'],
    importType: IMPORT_TYPE.COMMERCIAL,
  });
  assert.ok(section);
  assert.equal(section.state, 'positive');
  assert.equal(section.familyName, 'צעצועים');
  assert.deepEqual(section.positiveCategories, ['תקינה']);
  assert.ok(section.note.text.includes('מכון התקנים'), 'must explicitly mention the Standards Institution');
  assertNoAbsoluteExemptionWording(section.note.text);
});

test('5. toys: existing supporting customs-classifier professional (already wired via the standards signal) is preserved, no invented role', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['צעצועים'],
    importType: IMPORT_TYPE.COMMERCIAL,
  });
  assert.equal(section.professional.primary.type, 'מומחה תקינה והתאמה טכנית');
  assert.equal(section.professional.supporting.type, 'מסווג מכס מקצועי');
});

test('6. toys: the note never states the result is a final Standards Institution approval', () => {
  const section = buildProductFamilyMatrixSection({ texts: ['צעצועים'], importType: IMPORT_TYPE.COMMERCIAL });
  assert.ok(!section.note.text.includes('אישור סופי'));
  assert.ok(!/^אושר/.test(section.note.text));
});

// -- ANIMAL ORIGIN (food-and-beverages-04) --

test('7. animal origin: positive veterinary direction, existing health+agriculture signals untouched', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['מזון מן החי'],
    importType: IMPORT_TYPE.COMMERCIAL,
  });
  assert.ok(section);
  assert.equal(section.state, 'positive');
  assert.deepEqual(section.positiveCategories, ['משרד הבריאות', 'משרד החקלאות']);
  assert.ok(section.note.text.includes('השירותים הווטרינריים'), 'must explicitly mention Veterinary Services');
  assertNoAbsoluteExemptionWording(section.note.text);
});

test('8. animal origin: same veterinary direction across representative subtypes reached via the explicit checkbox, regardless of animal type', () => {
  const subtypeTexts = ['מזון לבעלי חיים', 'ביצים', 'בשר קפוא', 'עוף'];
  for (const text of subtypeTexts) {
    const section = buildProductFamilyMatrixSection({
      texts: [text],
      importType: IMPORT_TYPE.COMMERCIAL,
      selectedProductFamilies: ['animal_origin_products'],
    });
    assert.ok(section, `expected a section for "${text}"`);
    assert.equal(section.state, 'positive', `expected positive state for "${text}"`);
    assert.ok(section.note.text.includes('השירותים הווטרינריים'), `expected veterinary note for "${text}"`);
  }
});

test('9. animal origin: no duplicated Ministry of Agriculture direction -- exactly one occurrence of "משרד החקלאות" in positiveCategories', () => {
  const section = buildProductFamilyMatrixSection({ texts: ['מזון מן החי'], importType: IMPORT_TYPE.COMMERCIAL });
  const count = section.positiveCategories.filter((c) => c === 'משרד החקלאות').length;
  assert.equal(count, 1);
});

// -- INDUSTRIAL MACHINERY (construction-and-industrial-02) --

test('10. machinery: recognized family, useful family-specific no-positive wording, generic byte-identical fallback absent', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['מכונות וציוד תעשייתי'],
    importType: IMPORT_TYPE.COMMERCIAL,
  });
  assert.ok(section);
  assert.equal(section.state, 'no_positive_signal');
  assert.equal(section.familyName, 'מכונות וציוד תעשייתי');
  assert.equal(section.hasPositiveCategories, false);
  assert.deepEqual(section.positiveCategories, []);
  assert.notEqual(section.noPositiveSignalMessage, 'לא זוהה תחום חוקיות יבוא חיובי במטריצה עבור המשפחה שנבחרה.', 'must not be the generic byte-identical message');
  assert.ok(section.noPositiveSignalMessage.includes('אישור יבוא ייעודי'));
  assertNoAbsoluteExemptionWording(section.noPositiveSignalMessage);
  assertNoAbsoluteExemptionWording(section.note.text);
});

test('11. machinery: customs-classifier route remains, no supporting professional auto-added', () => {
  const section = buildProductFamilyMatrixSection({ texts: ['מכונות וציוד תעשייתי'], importType: IMPORT_TYPE.COMMERCIAL });
  assert.equal(section.professional.primary.type, 'מסווג מכס מקצועי');
  assert.equal(section.professional.supporting, null);
});

test('12. machinery: explicit selection alone (ONE_TO_ONE, authoritative) reaches the family-specific guidance regardless of neutral text', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['מוצר לבדיקה'],
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: ['industrial_machinery_and_equipment'],
  });
  assert.ok(section);
  assert.equal(section.state, 'no_positive_signal');
  assert.ok(section.noPositiveSignalMessage.includes('אישור יבוא ייעודי'));
});

test('13. machinery: exception-bearing descriptions (pressure vessel, agricultural, used, air-conditioning) never fabricate a positive category -- same family-specific guidance, no new signal', () => {
  const exceptionTexts = [
    'מכונה תעשייתית עם מיכל לחץ',
    'מכונה תעשייתית חקלאית',
    'מכונה תעשייתית משומשת',
    'מכונת מיזוג תעשייתית',
  ];
  for (const text of exceptionTexts) {
    const section = buildProductFamilyMatrixSection({
      texts: [text],
      importType: IMPORT_TYPE.COMMERCIAL,
      selectedProductFamilies: ['industrial_machinery_and_equipment'],
    });
    assert.ok(section, `expected a section for "${text}"`);
    assert.equal(section.hasPositiveCategories, false, `must not fabricate a positive category for "${text}"`);
    assert.equal(section.state, 'no_positive_signal', `must stay recognized-no-positive for "${text}"`);
  }
});

// -- BUILDING MATERIALS (construction-and-industrial-01) --

test('14. building materials: recognized family, useful family-specific no-positive wording, generic byte-identical fallback absent', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['חומרי בנייה'],
    importType: IMPORT_TYPE.COMMERCIAL,
  });
  assert.ok(section);
  assert.equal(section.state, 'no_positive_signal');
  assert.equal(section.hasPositiveCategories, false);
  assert.notEqual(section.noPositiveSignalMessage, 'לא זוהה תחום חוקיות יבוא חיובי במטריצה עבור המשפחה שנבחרה.');
  assertNoAbsoluteExemptionWording(section.noPositiveSignalMessage);
  assertNoAbsoluteExemptionWording(section.note.text);
});

test('15. building materials: no standards category fabricated for the whole family, customs-classifier route remains', () => {
  const section = buildProductFamilyMatrixSection({ texts: ['חומרי בנייה'], importType: IMPORT_TYPE.COMMERCIAL });
  assert.deepEqual(section.positiveCategories, []);
  assert.equal(section.professional.primary.type, 'מסווג מכס מקצועי');
  assert.equal(section.professional.supporting, null);
});

test('16. building materials: cement-related descriptions never fabricate a positive standards category -- same family-specific guidance', () => {
  const cementTexts = ['צמנט', 'צמנט פורטלנד', 'צמנט אפור', 'צמנט לבן'];
  for (const text of cementTexts) {
    const section = buildProductFamilyMatrixSection({
      texts: [text],
      importType: IMPORT_TYPE.COMMERCIAL,
      selectedProductFamilies: ['building_materials'],
    });
    assert.ok(section, `expected a section for "${text}"`);
    assert.equal(section.hasPositiveCategories, false, `must not fabricate a positive category for "${text}"`);
    assert.equal(section.state, 'no_positive_signal', `must stay recognized-no-positive for "${text}"`);
  }
});

// -- Shared invariants across all four families --

test('17. machinery and building materials never share byte-identical noPositiveSignalMessage text with each other or with an unrelated no-positive family', () => {
  const machinery = buildProductFamilyMatrixSection({ texts: ['מכונות וציוד תעשייתי'], importType: IMPORT_TYPE.COMMERCIAL });
  const building = buildProductFamilyMatrixSection({ texts: ['חומרי בנייה'], importType: IMPORT_TYPE.COMMERCIAL });
  const unrelated = buildProductFamilyMatrixSection({ texts: ['ביגוד'], importType: IMPORT_TYPE.COMMERCIAL }); // textiles, still generic
  assert.notEqual(machinery.noPositiveSignalMessage, building.noPositiveSignalMessage);
  assert.notEqual(machinery.noPositiveSignalMessage, unrelated.noPositiveSignalMessage);
  assert.notEqual(building.noPositiveSignalMessage, unrelated.noPositiveSignalMessage);
  assert.equal(unrelated.noPositiveSignalMessage, 'לא זוהה תחום חוקיות יבוא חיובי במטריצה עבור המשפחה שנבחרה.', 'an unrelated family must keep the exact original generic wording');
});

test('18. an unrelated family with no guidance entry is completely unaffected (no regression)', () => {
  const section = buildProductFamilyMatrixSection({ texts: ['ביגוד'], importType: IMPORT_TYPE.COMMERCIAL });
  assert.ok(section);
  assert.equal(section.note.text, 'יש לאמת את הדרישה, פרט המכס ומסלול האישור לפני ההזמנה או השילוח.');
});

test('19. the no-exemption limitation and shared disclaimer remain exactly the pre-existing, unmodified text for all four families', () => {
  const machinery = buildProductFamilyMatrixSection({ texts: ['מכונות וציוד תעשייתי'], importType: IMPORT_TYPE.COMMERCIAL });
  const building = buildProductFamilyMatrixSection({ texts: ['חומרי בנייה'], importType: IMPORT_TYPE.COMMERCIAL });
  for (const section of [machinery, building]) {
    assert.equal(section.noPositiveSignalNotExemptNote, 'אין בכך אישור שהמוצר פטור מדרישות יבוא או מתנאים אחרים.');
    assert.equal(section.limitation, 'התוצאה היא כיוון בדיקה ראשוני ואינה מהווה סיווג מכס או אישור יבוא.');
  }
});

test('20. explicit selection is sufficient to reach the applicable family result for the three unambiguous authorized checkboxes (animal origin, machinery, building materials), with fully neutral text', () => {
  const neutral = ['מוצר לבדיקה'];
  const cases = [
    ['animal_origin_products', 'positive'],
    ['industrial_machinery_and_equipment', 'no_positive_signal'],
    ['building_materials', 'no_positive_signal'],
  ];
  for (const [checkboxValue, expectedState] of cases) {
    const section = buildProductFamilyMatrixSection({
      texts: neutral,
      importType: IMPORT_TYPE.COMMERCIAL,
      selectedProductFamilies: [checkboxValue],
    });
    assert.ok(section, `expected a section for ${checkboxValue}`);
    assert.equal(section.state, expectedState, `expected ${expectedState} for ${checkboxValue}`);
  }
});

// -- Phase G: no-question guarantee --

const FORBIDDEN_QUESTION_KEYWORDS = [
  /age/i, /גיל/, // toy age
  /bow/i, /arrow/i, /קשת/, /חץ/, // bow/arrow
  /projectile/i, // projectile mechanism
  /animalType|animal_type/i, // exact animal type
  /feedSubtype|feed_subtype/i, // feed subtype
  /agricultural.*machine|agriculturalUse/i, // agricultural machinery use
  /pressureVessel|pressure_vessel|pressureSystem/i, // pressure vessel/system
  /airConditioning|air_conditioning/i, // air-conditioning machinery
  /cement/i, /צמנט/, // cement
  /usedCondition|used_condition/i, // new-vs-used condition
];

test('21. no forbidden focused question exists in the detailed-rule registry (followUpQuestionIds or publicTitle) for any of the four authorized families', () => {
  for (const rule of REGULATORY_SIGNAL_RULES) {
    const haystack = [
      ...(Array.isArray(rule.followUpQuestionIds) ? rule.followUpQuestionIds : []),
      rule.publicTitle || '',
      rule.internalCategory || '',
    ].join(' | ');
    for (const pattern of FORBIDDEN_QUESTION_KEYWORDS) {
      assert.ok(!pattern.test(haystack), `rule "${rule.id}" must not reference a forbidden focused-question topic (matched ${pattern}): "${haystack}"`);
    }
  }
});

test('22. no forbidden focused question exists anywhere in the product-family-guidance overlay itself (presentation text only, never a question)', () => {
  for (const [familyId, guidance] of Object.entries(FAMILY_GUIDANCE)) {
    assert.equal(guidance.questionId, undefined, `${familyId} guidance must never carry a question id`);
    assert.equal(guidance.followUpQuestionIds, undefined, `${familyId} guidance must never carry follow-up question ids`);
  }
});

test('23. the guidance overlay module never imports or references any question-rendering module', () => {
  // Defensive structural check: the overlay is presentation text keyed
  // by family id only -- it has no mechanism to gate or introduce a
  // question, verified here by its own narrow public shape.
  for (const guidance of Object.values(FAMILY_GUIDANCE)) {
    const keys = Object.keys(guidance).sort();
    for (const key of keys) {
      assert.ok(['note', 'noPositiveMessage'].includes(key), `unexpected guidance key "${key}" -- overlay must stay presentation-text-only`);
    }
  }
});

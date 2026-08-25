/**
 * Wave 1 (2026-08-25, product-owner approved): 23 of 24 approved
 * curated aliases added (one, "dress", was approved but omitted after
 * code review found it collides with common unrelated English words
 * -- see tests 32/33)
 * to 5 already-existing, already-reviewed product families --
 * food-and-beverages-01 ("מזון ארוז"), chemicals-and-materials-01
 * ("חומרי ניקוי וחיטוי"), textiles-and-furniture-01 ("ביגוד וטקסטיל"),
 * food-contact-01 ("כלי פלסטיק במגע עם מזון"), health-and-cosmetics-01
 * ("תמרוקים ובשמים") -- via scripts/generate_product_family_matrix.py's
 * CURATED_ALIASES table, regenerated deterministically into
 * product-family-matrix.js. No family, matrix category, regulatory
 * signal, detailed rule, question, or professional route changed.
 *
 * Deliberately excluded (see the audit's Wave 1 approval package):
 * שימורי דגים/שימורי בשר (collide with the food-of-animal-origin
 * family's own existing "דגים"/"בשר" aliases -- pending a product-owner
 * precedence decision), מגבת/towel (ambiguous with a cleaning cloth),
 * bare קרם/דגים/בשר/חומר/תא/מטען/דבק, and every alias for bicycles,
 * scooters, batteries, chargers, paints/adhesives/sealants, and toys.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { identifyProductFamily, IDENTIFICATION_OUTCOME } from '../../js/import-readiness/product-family-identification.js';
import { buildProductFamilyMatrixSection } from '../../js/import-readiness/product-family-result.js';
import { PRODUCT_FAMILY_MATRIX, findFamilyById } from '../../js/import-readiness/product-family-matrix.js';
import { IMPORT_TYPE } from '../../js/import-readiness/scenario-schema.js';

// ---------------------------------------------------------------------
// Phase C: positive recognition tests -- every one of the 24 approved
// aliases, exact-description + one realistic commercial description.
// ---------------------------------------------------------------------

const FOOD_FAMILY_ID = 'food-and-beverages-01';
const FOOD_FAMILY_NAME = 'מזון ארוז';
const CLEANING_FAMILY_ID = 'chemicals-and-materials-01';
const CLEANING_FAMILY_NAME = 'חומרי ניקוי וחיטוי';
const CLOTHING_FAMILY_ID = 'textiles-and-furniture-01';
const CLOTHING_FAMILY_NAME = 'ביגוד וטקסטיל';
const FOOD_CONTACT_FAMILY_ID = 'food-contact-01';
const FOOD_CONTACT_FAMILY_NAME = 'כלי פלסטיק במגע עם מזון';
const COSMETICS_FAMILY_ID = 'health-and-cosmetics-01';
const COSMETICS_FAMILY_NAME = 'תמרוקים ובשמים';

function assertRecognizesExactly(texts, expectedFamilyId, expectedFamilyName) {
  const identification = identifyProductFamily(texts);
  assert.equal(identification.outcome, IDENTIFICATION_OUTCOME.HIGH_CONFIDENCE, `expected high-confidence match for ${JSON.stringify(texts)}`);
  assert.equal(identification.family.id, expectedFamilyId);
  assert.equal(identification.family.publicFamilyName, expectedFamilyName);
  return identification;
}

// --- Food: שימורים, שימורי ירקות, קופסת שימורים, מזון משומר, canned food, canned goods ---

test('1. "שימורים" (exact) -> מזון ארוז, high confidence', () => {
  assertRecognizesExactly(['שימורים'], FOOD_FAMILY_ID, FOOD_FAMILY_NAME);
});
test('2. "משלוח מזון משומר" (commercial description) -> מזון ארוז', () => {
  assertRecognizesExactly(['משלוח מזון משומר'], FOOD_FAMILY_ID, FOOD_FAMILY_NAME);
});
test('3. "קופסת שימורים של ירקות" (commercial description) -> מזון ארוז', () => {
  assertRecognizesExactly(['קופסת שימורים של ירקות'], FOOD_FAMILY_ID, FOOD_FAMILY_NAME);
});
test('4. "שימורי ירקות" (exact) -> מזון ארוז', () => {
  assertRecognizesExactly(['שימורי ירקות'], FOOD_FAMILY_ID, FOOD_FAMILY_NAME);
});
test('5. "canned food shipment" (English commercial description) -> מזון ארוז', () => {
  assertRecognizesExactly(['canned food shipment'], FOOD_FAMILY_ID, FOOD_FAMILY_NAME);
});
test('6. "500 units of canned goods" (English commercial description) -> מזון ארוז', () => {
  assertRecognizesExactly(['500 units of canned goods'], FOOD_FAMILY_ID, FOOD_FAMILY_NAME);
});
test('7. food family result: recognized family, positive healthUmbrella category, unchanged professional route, no unrelated family', () => {
  const section = buildProductFamilyMatrixSection({ texts: ['שימורים'], importType: IMPORT_TYPE.COMMERCIAL });
  assert.ok(section);
  assert.equal(section.state, 'positive');
  assert.equal(section.familyName, FOOD_FAMILY_NAME);
  assert.equal(section.hasPositiveCategories, true);
  assert.deepEqual(section.positiveCategories, ['משרד הבריאות']);
  assert.ok(section.professional.primary, 'expected the existing healthUmbrella professional route, unchanged');
});

// --- Cleaning: חומר ניקוי, נוזל ניקוי, אבקת כביסה, cleaning product ---

test('8. "חומר ניקוי" (exact) -> חומרי ניקוי וחיטוי', () => {
  assertRecognizesExactly(['חומר ניקוי'], CLEANING_FAMILY_ID, CLEANING_FAMILY_NAME);
});
test('9. "חומר ניקוי לרצפות" (commercial description) -> חומרי ניקוי וחיטוי', () => {
  assertRecognizesExactly(['חומר ניקוי לרצפות'], CLEANING_FAMILY_ID, CLEANING_FAMILY_NAME);
});
test('10. "נוזל ניקוי ביתי" (commercial description) -> חומרי ניקוי וחיטוי', () => {
  assertRecognizesExactly(['נוזל ניקוי ביתי'], CLEANING_FAMILY_ID, CLEANING_FAMILY_NAME);
});
test('11. "אבקת כביסה מרוכזת" (commercial description) -> חומרי ניקוי וחיטוי', () => {
  assertRecognizesExactly(['אבקת כביסה מרוכזת'], CLEANING_FAMILY_ID, CLEANING_FAMILY_NAME);
});
test('12. "industrial cleaning product" (English commercial description) -> חומרי ניקוי וחיטוי', () => {
  assertRecognizesExactly(['industrial cleaning product'], CLEANING_FAMILY_ID, CLEANING_FAMILY_NAME);
});
test('13. cleaning family result: recognized family, positive standards category, unchanged professional route', () => {
  const section = buildProductFamilyMatrixSection({ texts: ['נוזל ניקוי ביתי'], importType: IMPORT_TYPE.COMMERCIAL });
  assert.ok(section);
  assert.equal(section.state, 'positive');
  assert.equal(section.familyName, CLEANING_FAMILY_NAME);
  assert.deepEqual(section.positiveCategories, ['תקינה']);
  assert.ok(section.professional.primary);
});

// --- Clothing: חולצה, מכנס, מכנסיים, שמלה, ג'קט, מעיל, גרביים, גרב, shirt, t-shirt ---
// "dress" was approved but omitted -- see tests 32/33 below and the
// code-review-found collision they document.

test('14. "חולצה" (exact) -> ביגוד וטקסטיל', () => {
  assertRecognizesExactly(['חולצה'], CLOTHING_FAMILY_ID, CLOTHING_FAMILY_NAME);
});
test('15. "חולצה מכותנה" (commercial description) -> ביגוד וטקסטיל', () => {
  assertRecognizesExactly(['חולצה מכותנה'], CLOTHING_FAMILY_ID, CLOTHING_FAMILY_NAME);
});

test('15b. KNOWN, DISCLOSED LIMITATION -- "חולצת כותנה" (Hebrew construct-state/smichut form "חולצת", not the alias\'s own absolute form "חולצה") does NOT match today. Substring matching cannot bridge a Hebrew grammatical-form change; fixing this would require either a new literal alias (outside this PR\'s exact 24-alias scope) or normalizer-level Hebrew morphology (a matching-architecture change, explicitly prohibited in this PR). Reported honestly rather than silently working around it.', () => {
  const identification = identifyProductFamily(['חולצת כותנה']);
  assert.equal(identification.outcome, IDENTIFICATION_OUTCOME.NONE, 'documents the current, real behavior -- not a defect introduced by this PR, and not fixed by it either');
});
test('16. "מכנס" (exact) -> ביגוד וטקסטיל', () => {
  assertRecognizesExactly(['מכנס'], CLOTHING_FAMILY_ID, CLOTHING_FAMILY_NAME);
});
test('17. "מכנסי ג\'ינס" (commercial description) -> ביגוד וטקסטיל', () => {
  assertRecognizesExactly(["מכנסי ג'ינס"], CLOTHING_FAMILY_ID, CLOTHING_FAMILY_NAME);
});
test('18. "מכנסיים" (exact, plural form, distinct from "מכנס") -> ביגוד וטקסטיל', () => {
  assertRecognizesExactly(['מכנסיים'], CLOTHING_FAMILY_ID, CLOTHING_FAMILY_NAME);
});
test('19. "שמלה" (exact) -> ביגוד וטקסטיל', () => {
  assertRecognizesExactly(['שמלה'], CLOTHING_FAMILY_ID, CLOTHING_FAMILY_NAME);
});
test('20. "שמלה לנשים" (commercial description) -> ביגוד וטקסטיל', () => {
  assertRecognizesExactly(['שמלה לנשים'], CLOTHING_FAMILY_ID, CLOTHING_FAMILY_NAME);
});
test('21. "ג\'קט" (exact) -> ביגוד וטקסטיל', () => {
  assertRecognizesExactly(["ג'קט"], CLOTHING_FAMILY_ID, CLOTHING_FAMILY_NAME);
});
test('22. "ג\'קט חורף" (commercial description) -> ביגוד וטקסטיל', () => {
  assertRecognizesExactly(["ג'קט חורף"], CLOTHING_FAMILY_ID, CLOTHING_FAMILY_NAME);
});
test('23. "מעיל" (exact) -> ביגוד וטקסטיל', () => {
  assertRecognizesExactly(['מעיל'], CLOTHING_FAMILY_ID, CLOTHING_FAMILY_NAME);
});
test('24. "מעיל גשם" (commercial description) -> ביגוד וטקסטיל', () => {
  assertRecognizesExactly(['מעיל גשם'], CLOTHING_FAMILY_ID, CLOTHING_FAMILY_NAME);
});
test('25. "גרביים" (exact) -> ביגוד וטקסטיל', () => {
  assertRecognizesExactly(['גרביים'], CLOTHING_FAMILY_ID, CLOTHING_FAMILY_NAME);
});
test('26. "גרביים מכותנה" (commercial description) -> ביגוד וטקסטיל', () => {
  assertRecognizesExactly(['גרביים מכותנה'], CLOTHING_FAMILY_ID, CLOTHING_FAMILY_NAME);
});
test('27. "גרב" (exact, singular form, distinct from "גרביים") -> ביגוד וטקסטיל', () => {
  assertRecognizesExactly(['גרב'], CLOTHING_FAMILY_ID, CLOTHING_FAMILY_NAME);
});
test('28. "shirt" (English, exact) -> ביגוד וטקסטיל', () => {
  assertRecognizesExactly(['shirt'], CLOTHING_FAMILY_ID, CLOTHING_FAMILY_NAME);
});
test('29. "cotton shirt" (English commercial description) -> ביגוד וטקסטיל', () => {
  assertRecognizesExactly(['cotton shirt'], CLOTHING_FAMILY_ID, CLOTHING_FAMILY_NAME);
});
test('30. "t-shirt" (English, exact, contains a hyphen) -> ביגוד וטקסטיל', () => {
  assertRecognizesExactly(['t-shirt'], CLOTHING_FAMILY_ID, CLOTHING_FAMILY_NAME);
});
test('31. "imported t-shirt" (English commercial description) -> ביגוד וטקסטיל', () => {
  assertRecognizesExactly(['imported t-shirt'], CLOTHING_FAMILY_ID, CLOTHING_FAMILY_NAME);
});
test('32. CODE-REVIEW FINDING, FIXED BY OMISSION -- bare "dress" was approved but is NOT a family alias in this PR: it is a plain substring of common unrelated English words, so adding it would misidentify a shipping address, furniture, or food dressing as clothing. Confirmed via direct execution against the shipped registry.', () => {
  for (const text of ['please ship to this address', 'wooden dresser for sale', 'salad dressing bottle', 'redress the issue', 'dressage equipment', 'the item arrived undressed']) {
    const identification = identifyProductFamily([text]);
    assert.notEqual(identification.family?.id, CLOTHING_FAMILY_ID, `"${text}" must not resolve to clothing -- "dress" is not an alias in this PR`);
  }
});
test('33. bare "dress" itself also does not resolve to clothing -- confirms the alias was genuinely omitted, not merely unreachable by these particular collision words', () => {
  const identification = identifyProductFamily(['dress']);
  assert.notEqual(identification.family?.id, CLOTHING_FAMILY_ID);
});
test('34. clothing family result: recognized family, still no positive category (unchanged, workbook-authored, existing behavior), unchanged fallback professional', () => {
  const section = buildProductFamilyMatrixSection({ texts: ['חולצה מכותנה'], importType: IMPORT_TYPE.COMMERCIAL });
  assert.ok(section);
  assert.equal(section.state, 'no_positive_signal');
  assert.equal(section.familyName, CLOTHING_FAMILY_NAME);
  assert.equal(section.hasPositiveCategories, false);
  assert.deepEqual(section.positiveCategories, []);
  assert.ok(section.professional.primary, 'expected the existing no-positive-signal fallback professional, unchanged');
});

// --- Food-contact plastic: כלי פלסטיק למזון, קופסת אוכל ---

test('35. "כלי פלסטיק למזון" (exact) -> כלי פלסטיק במגע עם מזון', () => {
  assertRecognizesExactly(['כלי פלסטיק למזון'], FOOD_CONTACT_FAMILY_ID, FOOD_CONTACT_FAMILY_NAME);
});
test('36. "כלי פלסטיק למזון לשימוש חוזר" (commercial description) -> כלי פלסטיק במגע עם מזון', () => {
  assertRecognizesExactly(['כלי פלסטיק למזון לשימוש חוזר'], FOOD_CONTACT_FAMILY_ID, FOOD_CONTACT_FAMILY_NAME);
});
test('37. "קופסת אוכל" (exact) -> כלי פלסטיק במגע עם מזון', () => {
  assertRecognizesExactly(['קופסת אוכל'], FOOD_CONTACT_FAMILY_ID, FOOD_CONTACT_FAMILY_NAME);
});
test('38. "קופסת אוכל מפלסטיק" (commercial description) -> כלי פלסטיק במגע עם מזון', () => {
  assertRecognizesExactly(['קופסת אוכל מפלסטיק'], FOOD_CONTACT_FAMILY_ID, FOOD_CONTACT_FAMILY_NAME);
});
test('39. food-contact family result: matrix-path recognition unaffected by the existing plastic-direct-food-contact detailed rule\'s own separate reconciliation (matrix contributes nothing once the rule matches, unchanged behavior)', () => {
  const withoutRule = buildProductFamilyMatrixSection({ texts: ['קופסת אוכל מפלסטיק'], importType: IMPORT_TYPE.COMMERCIAL });
  assert.ok(withoutRule);
  assert.equal(withoutRule.familyName, FOOD_CONTACT_FAMILY_NAME);
  const withRule = buildProductFamilyMatrixSection({
    texts: ['קופסת אוכל מפלסטיק'], importType: IMPORT_TYPE.COMMERCIAL, matchedExistingRuleIds: ['plastic-direct-food-contact'],
  });
  assert.equal(withRule, null, 'the matrix must still defer entirely to the existing detailed rule once it matches -- unchanged reconciliation behavior');
});

// --- Cosmetics: קרם לחות ---

test('40. "קרם לחות" (exact) -> תמרוקים ובשמים', () => {
  assertRecognizesExactly(['קרם לחות'], COSMETICS_FAMILY_ID, COSMETICS_FAMILY_NAME);
});
test('41. "קרם לחות לפנים" (commercial description) -> תמרוקים ובשמים', () => {
  assertRecognizesExactly(['קרם לחות לפנים'], COSMETICS_FAMILY_ID, COSMETICS_FAMILY_NAME);
});
test('42. "קרם לחות לעור יבש" (commercial description) -> תמרוקים ובשמים', () => {
  assertRecognizesExactly(['קרם לחות לעור יבש'], COSMETICS_FAMILY_ID, COSMETICS_FAMILY_NAME);
});
test('43. cosmetics family result: recognized family, positive healthUmbrella category, unchanged professional route', () => {
  const section = buildProductFamilyMatrixSection({ texts: ['קרם לחות לפנים'], importType: IMPORT_TYPE.COMMERCIAL });
  assert.ok(section);
  assert.equal(section.state, 'positive');
  assert.equal(section.familyName, COSMETICS_FAMILY_NAME);
  assert.deepEqual(section.positiveCategories, ['משרד הבריאות']);
  assert.ok(section.professional.primary);
});

// ---------------------------------------------------------------------
// Phase D: mandatory negative and collision tests
// ---------------------------------------------------------------------

// --- Food negatives ---

test('44. "דגים טריים" (fresh fish) does not resolve to מזון ארוז -- stays on the existing food-of-animal-origin family, unchanged', () => {
  const identification = identifyProductFamily(['דגים טריים']);
  assert.equal(identification.outcome, IDENTIFICATION_OUTCOME.HIGH_CONFIDENCE);
  assert.equal(identification.family.id, 'food-and-beverages-04', 'must still match the existing food-of-animal-origin family, not the new packaged-food aliases');
});
test('45. "בשר טרי" (fresh meat) does not resolve to מזון ארוז -- stays on the existing food-of-animal-origin family, unchanged', () => {
  const identification = identifyProductFamily(['בשר טרי']);
  assert.equal(identification.outcome, IDENTIFICATION_OUTCOME.HIGH_CONFIDENCE);
  assert.equal(identification.family.id, 'food-and-beverages-04');
});
test('46. "שימורי דגים" was deliberately NOT added as a food-and-beverages-01 alias in this PR -- it still resolves via the existing "דגים" alias on food-of-animal-origin, exactly as before this change', () => {
  const identification = identifyProductFamily(['שימורי דגים']);
  assert.equal(identification.outcome, IDENTIFICATION_OUTCOME.HIGH_CONFIDENCE);
  assert.equal(identification.family.id, 'food-and-beverages-04', 'PR 1 must not introduce a new alias that changes this pre-existing resolution');
});
test('47. "שימורי בשר" was deliberately NOT added as a food-and-beverages-01 alias in this PR -- same pre-existing resolution preserved', () => {
  const identification = identifyProductFamily(['שימורי בשר']);
  assert.equal(identification.outcome, IDENTIFICATION_OUTCOME.HIGH_CONFIDENCE);
  assert.equal(identification.family.id, 'food-and-beverages-04');
});
test('48. "ירקות טריים" (fresh vegetables) is not pulled into the new packaged-food family -- the agricultural-produce family\'s own combined alias ("פירות וירקות") does not match "ירקות" alone either, pre-existing behavior unrelated to and unchanged by this PR', () => {
  const identification = identifyProductFamily(['ירקות טריים']);
  assert.notEqual(identification.family?.id, FOOD_FAMILY_ID, 'must not resolve to the packaged-food family this PR changed');
});
test('49. "קופסת כלים" (toolbox) is unrelated and stays unmatched', () => {
  const identification = identifyProductFamily(['קופסת כלים']);
  assert.equal(identification.outcome, IDENTIFICATION_OUTCOME.NONE);
});
test('50. "canned paint" does not match the food family merely because it contains "canned"', () => {
  const identification = identifyProductFamily(['canned paint']);
  assert.equal(identification.outcome, IDENTIFICATION_OUTCOME.NONE, '"canned paint" must not match the new "canned food"/"canned goods" aliases -- neither is a substring of it');
});

// --- Cleaning negatives ---

test('51. "מברשת ניקוי" (a physical cleaning brush) does not resolve to the chemical cleaning-materials family', () => {
  const identification = identifyProductFamily(['מברשת ניקוי']);
  assert.equal(identification.outcome, IDENTIFICATION_OUTCOME.NONE, 'a cleaning brush is not the same product as a cleaning chemical -- must not be forced into this family');
});
test('52. "שירותי ניקיון" (a cleaning service) does not resolve to the cleaning-materials product family', () => {
  const identification = identifyProductFamily(['שירותי ניקיון']);
  assert.equal(identification.outcome, IDENTIFICATION_OUTCOME.NONE, 'a service is not a product');
});
test('53. "cleaning service" (English) does not resolve to the cleaning-materials product family', () => {
  const identification = identifyProductFamily(['cleaning service']);
  assert.equal(identification.outcome, IDENTIFICATION_OUTCOME.NONE);
});
test('54. "חומר בניין" (building material) is unrelated and stays unmatched', () => {
  const identification = identifyProductFamily(['חומר בניין']);
  assert.equal(identification.outcome, IDENTIFICATION_OUTCOME.NONE);
});
test('55. "מוצר היגיינה אישית" (personal hygiene product) is not forced into the cleaning-materials family', () => {
  const identification = identifyProductFamily(['מוצר היגיינה אישית']);
  assert.equal(identification.outcome, IDENTIFICATION_OUTCOME.NONE);
});

// --- Clothing negatives ---

test('56. "מגבת ניקוי" (a cleaning cloth) does not resolve to the clothing family -- "מגבת" was deliberately excluded from this PR', () => {
  const identification = identifyProductFamily(['מגבת ניקוי']);
  assert.notEqual(identification.family?.id, CLOTHING_FAMILY_ID);
});
test('57. bare "מגבת" (towel) is not a clothing-family alias introduced by this PR', () => {
  const identification = identifyProductFamily(['מגבת']);
  assert.notEqual(identification.family?.id, CLOTHING_FAMILY_ID, '"מגבת" was explicitly deferred, not approved for Wave 1');
});
test('58. bare "towel" (English) is not a clothing-family alias introduced by this PR', () => {
  const identification = identifyProductFamily(['towel']);
  assert.notEqual(identification.family?.id, CLOTHING_FAMILY_ID);
});
test('59. "בד לריפוד" (upholstery fabric) is not forced into the clothing family', () => {
  const identification = identifyProductFamily(['בד לריפוד']);
  assert.notEqual(identification.family?.id, CLOTHING_FAMILY_ID);
});
test('60. "כיסוי מושב" (seat cover) is not forced into the clothing family', () => {
  const identification = identifyProductFamily(['כיסוי מושב']);
  assert.equal(identification.outcome, IDENTIFICATION_OUTCOME.NONE);
});
test('61. "שק שינה" (sleeping bag) is not forced into the clothing family', () => {
  const identification = identifyProductFamily(['שק שינה']);
  assert.equal(identification.outcome, IDENTIFICATION_OUTCOME.NONE);
});
test('62. "רשת דיג" (fishing net) is not forced into the clothing family', () => {
  const identification = identifyProductFamily(['רשת דיג']);
  assert.equal(identification.outcome, IDENTIFICATION_OUTCOME.NONE);
});

// --- Food-contact negatives ---

test('63. "קופסת כלים" (toolbox) does not resolve to the food-contact-plastic family', () => {
  const identification = identifyProductFamily(['קופסת כלים']);
  assert.notEqual(identification.family?.id, FOOD_CONTACT_FAMILY_ID);
});
test('64. "קופסת תכשיטים" (jewelry box) does not resolve to the food-contact-plastic family', () => {
  const identification = identifyProductFamily(['קופסת תכשיטים']);
  assert.equal(identification.outcome, IDENTIFICATION_OUTCOME.NONE);
});
test('65. "כלי מתכת" (metal, a different food-contact material family) is not pulled into the plastic family', () => {
  const identification = identifyProductFamily(['כלי מתכת']);
  assert.notEqual(identification.family?.id, FOOD_CONTACT_FAMILY_ID);
});
test('66. "פלסטיק לבנייה" (construction plastic) is not forced into the food-contact family', () => {
  const identification = identifyProductFamily(['פלסטיק לבנייה']);
  assert.equal(identification.outcome, IDENTIFICATION_OUTCOME.NONE);
});
test('67. "אריזת מזון מקרטון" (cardboard food packaging) is not forced into the plastic food-contact family', () => {
  const identification = identifyProductFamily(['אריזת מזון מקרטון']);
  assert.notEqual(identification.family?.id, FOOD_CONTACT_FAMILY_ID);
});

// --- Cosmetics negatives ---

test('68. "קרם גבינה" (cream cheese) does not resolve to the cosmetics family -- bare "קרם" was deliberately excluded from this PR', () => {
  const identification = identifyProductFamily(['קרם גבינה']);
  assert.notEqual(identification.family?.id, COSMETICS_FAMILY_ID);
});
test('69. "קרם עוגה" (cake filling) does not resolve to the cosmetics family', () => {
  const identification = identifyProductFamily(['קרם עוגה']);
  assert.notEqual(identification.family?.id, COSMETICS_FAMILY_ID);
});
test('70. "קרם ניקוי לרכב" (car-cleaning cream) does not resolve to the cosmetics family', () => {
  const identification = identifyProductFamily(['קרם ניקוי לרכב']);
  assert.notEqual(identification.family?.id, COSMETICS_FAMILY_ID);
});
test('71. "קרם הלחמה" (solder paste) does not resolve to the cosmetics family', () => {
  const identification = identifyProductFamily(['קרם הלחמה']);
  assert.notEqual(identification.family?.id, COSMETICS_FAMILY_ID);
});
test('72. "קרם הגנה מהשמש" (sunscreen) is not matched by this PR -- only the approved compound "קרם לחות" was added, not bare "קרם" or any sunscreen-specific phrase', () => {
  const identification = identifyProductFamily(['קרם הגנה מהשמש']);
  assert.equal(identification.outcome, IDENTIFICATION_OUTCOME.NONE, 'sunscreen wording is a real gap but out of this PR\'s exact approved scope');
});

// ---------------------------------------------------------------------
// Deferred-term negatives: PR 1 introduces no new alias for these terms
// ---------------------------------------------------------------------

const DEFERRED_TERMS = ['מטען', 'דבק', 'אופניים', 'קורקינט', 'bicycle', 'scooter', 'סוללה', 'battery', 'מצבר', 'תא סוללה'];
const WAVE_1_FAMILY_IDS = new Set([FOOD_FAMILY_ID, CLEANING_FAMILY_ID, CLOTHING_FAMILY_ID, FOOD_CONTACT_FAMILY_ID, COSMETICS_FAMILY_ID]);

test('73. none of the 5 Wave-1 families\' alias lists contains any deferred term (direct registry check, not just a text-matching probe)', () => {
  for (const familyId of WAVE_1_FAMILY_IDS) {
    const family = findFamilyById(familyId);
    for (const deferredTerm of DEFERRED_TERMS) {
      assert.ok(!family.aliases.includes(deferredTerm), `${familyId} must not carry the deferred alias "${deferredTerm}"`);
    }
  }
});
test('74. identifying a deferred term never resolves to a Wave-1 family (whatever it resolves to today, this PR did not change it)', () => {
  for (const term of DEFERRED_TERMS) {
    const identification = identifyProductFamily([term]);
    if (identification.family) {
      assert.ok(!WAVE_1_FAMILY_IDS.has(identification.family.id), `"${term}" must not resolve to a Wave-1-changed family`);
    }
  }
});

// ---------------------------------------------------------------------
// Phase E: prefix, substring, order, and normalization safety
// ---------------------------------------------------------------------

test('75. alias insertion order does not change which family is chosen -- reversing the checked-family order yields the same result', () => {
  const forward = identifyProductFamily(['חולצה מכותנה']);
  const reversedFamilies = [...PRODUCT_FAMILY_MATRIX].reverse().filter((f) => f.activeStatus);
  const reversed = identifyProductFamily(['חולצה מכותנה'], { families: reversedFamilies });
  assert.equal(forward.outcome, IDENTIFICATION_OUTCOME.HIGH_CONFIDENCE);
  assert.equal(reversed.outcome, IDENTIFICATION_OUTCOME.HIGH_CONFIDENCE);
  assert.equal(forward.family.id, reversed.family.id);
});

test('76. every approved positive example produces exactly one candidate, never multiple_candidates -- the new aliases introduce no fresh ambiguity', () => {
  const approvedPositiveExamples = [
    'שימורים', 'משלוח מזון משומר', 'קופסת שימורים של ירקות', 'canned food shipment', '500 units of canned goods',
    'חומר ניקוי לרצפות', 'נוזל ניקוי ביתי', 'אבקת כביסה מרוכזת', 'industrial cleaning product',
    'חולצה מכותנה', "מכנסי ג'ינס", 'שמלה לנשים', "ג'קט חורף", 'מעיל גשם', 'גרביים מכותנה', 'cotton shirt', 'imported t-shirt',
    'כלי פלסטיק למזון', 'קופסת אוכל מפלסטיק', 'כלי פלסטיק למזון לשימוש חוזר',
    'קרם לחות', 'קרם לחות לפנים', 'קרם לחות לעור יבש',
  ];
  for (const text of approvedPositiveExamples) {
    const identification = identifyProductFamily([text]);
    assert.equal(identification.outcome, IDENTIFICATION_OUTCOME.HIGH_CONFIDENCE, `"${text}" must resolve unambiguously`);
    assert.equal(identification.candidates.length, 1, `"${text}" must not produce multiple candidates`);
  }
});

test('77. punctuation around an alias does not break recognition (matching normalizeHebrewSearchText\'s own punctuation handling)', () => {
  assertRecognizesExactly(['חולצה.'], CLOTHING_FAMILY_ID, CLOTHING_FAMILY_NAME);
  assertRecognizesExactly(['חולצה,'], CLOTHING_FAMILY_ID, CLOTHING_FAMILY_NAME);
  assertRecognizesExactly(['(חולצה)'], CLOTHING_FAMILY_ID, CLOTHING_FAMILY_NAME);
});

test('78. English-alias case-insensitivity behaves per the existing normalization (uppercase/lowercase/mixed all match)', () => {
  assertRecognizesExactly(['SHIRT'], CLOTHING_FAMILY_ID, CLOTHING_FAMILY_NAME);
  assertRecognizesExactly(['Shirt'], CLOTHING_FAMILY_ID, CLOTHING_FAMILY_NAME);
  assertRecognizesExactly(['T-SHIRT'], CLOTHING_FAMILY_ID, CLOTHING_FAMILY_NAME);
});

test('79. "t-shirt" does not create a short-letter or partial-word collision with any other family\'s alias', () => {
  const identification = identifyProductFamily(['t-shirt']);
  assert.equal(identification.outcome, IDENTIFICATION_OUTCOME.HIGH_CONFIDENCE);
  assert.equal(identification.candidates.length, 1);
  assert.equal(identification.family.id, CLOTHING_FAMILY_ID);
});

test('80. "מכנס" and "מכנסיים" both resolve deterministically to the same family (singular and plural coexist safely as two distinct alias entries)', () => {
  const singular = identifyProductFamily(['מכנס']);
  const plural = identifyProductFamily(['מכנסיים']);
  assert.equal(singular.family.id, CLOTHING_FAMILY_ID);
  assert.equal(plural.family.id, CLOTHING_FAMILY_ID);
  assert.equal(singular.candidates.length, 1);
  assert.equal(plural.candidates.length, 1);
});

test('81. "גרב" and "גרביים" both resolve deterministically to the same family (singular and plural coexist safely as two distinct alias entries)', () => {
  const singular = identifyProductFamily(['גרב']);
  const plural = identifyProductFamily(['גרביים']);
  assert.equal(singular.family.id, CLOTHING_FAMILY_ID);
  assert.equal(plural.family.id, CLOTHING_FAMILY_ID);
  assert.equal(singular.candidates.length, 1);
  assert.equal(plural.candidates.length, 1);
});

test('82. generated registry row count and ids are unchanged by this PR (51 rows, 51 unique ids) -- alias-only data change', () => {
  assert.equal(PRODUCT_FAMILY_MATRIX.length, 51);
  const ids = PRODUCT_FAMILY_MATRIX.map((f) => f.id);
  assert.equal(new Set(ids).size, 51, 'no id was added, removed, or duplicated by this PR');
  assert.equal(findFamilyById(FOOD_FAMILY_ID).publicFamilyName, FOOD_FAMILY_NAME);
  assert.equal(findFamilyById(CLEANING_FAMILY_ID).publicFamilyName, CLEANING_FAMILY_NAME);
  assert.equal(findFamilyById(CLOTHING_FAMILY_ID).publicFamilyName, CLOTHING_FAMILY_NAME);
  assert.equal(findFamilyById(FOOD_CONTACT_FAMILY_ID).publicFamilyName, FOOD_CONTACT_FAMILY_NAME);
  assert.equal(findFamilyById(COSMETICS_FAMILY_ID).publicFamilyName, COSMETICS_FAMILY_NAME);
});

test('83. this PR changed only the 5 approved families\' alias lists -- every other family\'s aliases, matrix signals, coverage, and active status are byte-identical to before', () => {
  const unchangedSpotChecks = [
    ['food-and-beverages-04', 11], // food of animal origin, unrelated to this PR
    ['electrical-and-electronics-05', 14], // wireless, unrelated to this PR
    ['vehicles-and-transport-05', 9], // headlamps, unrelated to this PR
    ['additional-consumer-products-02', 1], // bicycles/scooters, deliberately deferred
    ['electrical-and-electronics-07', 1], // batteries, deliberately deferred
    ['chemicals-and-materials-02', 1], // paints/adhesives/sealants, deliberately deferred
    ['children-and-infants-01', 1], // toys, deliberately deferred
  ];
  for (const [familyId, expectedAliasCount] of unchangedSpotChecks) {
    const family = findFamilyById(familyId);
    assert.equal(family.aliases.length, expectedAliasCount, `${familyId}'s alias count must be unchanged by this PR`);
  }
});

test('84. the 5 changed families each gained exactly the approved alias count on top of their prior baseline', () => {
  assert.equal(findFamilyById(FOOD_FAMILY_ID).aliases.length, 4 + 6);
  assert.equal(findFamilyById(CLEANING_FAMILY_ID).aliases.length, 1 + 4);
  assert.equal(findFamilyById(CLOTHING_FAMILY_ID).aliases.length, 5 + 10, '10, not 11 -- "dress" was approved but omitted per the code-review finding in tests 32/33');
  assert.equal(findFamilyById(FOOD_CONTACT_FAMILY_ID).aliases.length, 3 + 2);
  assert.equal(findFamilyById(COSMETICS_FAMILY_ID).aliases.length, 11 + 1);
});

test('85. no exact duplicate alias exists inside any of the 5 changed families\' alias arrays', () => {
  for (const familyId of WAVE_1_FAMILY_IDS) {
    const aliases = findFamilyById(familyId).aliases;
    assert.equal(new Set(aliases).size, aliases.length, `${familyId} must not contain a duplicate alias string`);
  }
});

/**
 * PKG-FB04-COMPLETE-HELMET-DOMAIN-V1: full test coverage for the
 * completed, dedicated standalone helmet family
 * (additional-consumer-products-10, public value "protective_helmets",
 * visitor-facing category "קסדות").
 *
 * Covers: every approved complete-helmet alias (positive), every
 * approved parts/toy/decorative/miniature/model/replica exclusion
 * (negative), transport-family collision protection (bicycles, motorized
 * bicycles, motorcycles, scooters, complete vehicles, vehicle parts),
 * general-PPE transfer and preservation, the dedicated professional
 * direction wording, and the real result/referral path
 * (buildProductFamilyMatrixSection) -- exactly one helmet-family result,
 * one Standards direction, one professional referral, no transport- or
 * PPE-family result, no duplicate output, visible non-binding
 * limitation, no automatic selection, Show all preserved (checkbox-level
 * assertions only -- no DOM in this file).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { identifyProductFamily, IDENTIFICATION_OUTCOME } from '../../js/import-readiness/product-family-identification.js';
import { suggestProductFamilyValues } from '../../js/import-readiness/family-material-disclosure.js';
import { buildProductFamilyMatrixSection } from '../../js/import-readiness/product-family-result.js';
import { PRODUCT_FAMILY_SELECTION_CANDIDATES, resolveFamilyIdentificationOptions } from '../../js/import-readiness/product-family-selection-mapping.js';
import { findFamilyById } from '../../js/import-readiness/product-family-matrix.js';
import { IMPORT_TYPE } from '../../js/import-readiness/scenario-schema.js';

const HELMET_ID = 'additional-consumer-products-10';
const APPROVED_WORDING =
  'על בסיס המידע שנמסר, מדובר בקסדה כמוצר עצמאי, ולכן נדרש כיוון לבדיקת אישור ' +
  'מכון התקנים. אין לשייך את הקסדה למשפחת כלי התחבורה שעבורו היא מיועדת. יש לאמת ' +
  'את הדרישה, התקן החל, החריגים והתנאים העדכניים מול המקורות הרשמיים והגורם ' +
  'המקצועי המוסמך לפני יבוא או הגשה סופית.';

// -----------------------------------------------------------------
// 1. Complete positive aliases (Element 3).
// -----------------------------------------------------------------

const APPROVED_HEBREW_ALIASES = [
  'קסדה', 'קסדות', 'קסדת אופניים', 'קסדות אופניים', 'קסדת אופנוע', 'קסדות אופנוע',
  'קסדת קטנוע', 'קסדות קטנוע', 'קסדת קורקינט', 'קסדות קורקינט', 'קסדת מגן', 'קסדות מגן',
  'קסדת בטיחות', 'קסדות בטיחות', 'קסדת ספורט', 'קסדות ספורט', 'קסדת רכיבה', 'קסדות רכיבה',
  'קסדה לעבודה', 'קסדות לעבודה', 'קסדה תעשייתית', 'קסדות תעשייתיות',
];

const APPROVED_ENGLISH_ALIASES = [
  'helmet', 'helmets', 'bicycle helmet', 'bicycle helmets', 'bike helmet', 'bike helmets',
  'motorcycle helmet', 'motorcycle helmets', 'motorbike helmet', 'motorbike helmets',
  'scooter helmet', 'scooter helmets', 'protective helmet', 'protective helmets',
  'safety helmet', 'safety helmets', 'sports helmet', 'sports helmets',
  'riding helmet', 'riding helmets', 'work helmet', 'work helmets',
  'industrial helmet', 'industrial helmets', 'replacement bicycle helmet', 'bicycle helmet replacement',
];

test('1. every approved Hebrew complete-helmet alias resolves to the dedicated helmet family', () => {
  for (const text of APPROVED_HEBREW_ALIASES) {
    const result = identifyProductFamily([text]);
    assert.equal(result.outcome, IDENTIFICATION_OUTCOME.HIGH_CONFIDENCE, `expected HIGH_CONFIDENCE for "${text}"`);
    assert.equal(result.family.id, HELMET_ID, `expected the helmet family for "${text}"`);
  }
});

test('2. every approved English complete-helmet alias resolves to the dedicated helmet family', () => {
  for (const text of APPROVED_ENGLISH_ALIASES) {
    const result = identifyProductFamily([text]);
    assert.equal(result.outcome, IDENTIFICATION_OUTCOME.HIGH_CONFIDENCE, `expected HIGH_CONFIDENCE for "${text}"`);
    assert.equal(result.family.id, HELMET_ID, `expected the helmet family for "${text}"`);
  }
});

// -----------------------------------------------------------------
// 2. Parts and non-functional exclusions (Element 4).
// -----------------------------------------------------------------

const HELMET_PART_PHRASES = [
  'רצועה לקסדה', 'רצועה לקסדת אופניים', 'רצועה חלופית לקסדה', 'אבזם לקסדה', 'אבזם לקסדת אופניים',
  'ריפוד לקסדה', 'ריפוד לקסדת אופניים', 'מצחייה לקסדה', 'מצחייה לקסדת אופנוע', 'מגן פנים לקסדה',
  'חלק חילוף לקסדה', 'חלקי חילוף לקסדה', 'מעטפת לקסדה',
  'helmet strap', 'helmet straps', 'bicycle helmet strap', 'replacement helmet strap',
  'helmet buckle', 'helmet buckles', 'helmet padding', 'bicycle helmet padding',
  'helmet visor', 'helmet visors', 'helmet face shield', 'helmet face shields',
  'helmet replacement part', 'helmet replacement parts',
  'replacement bicycle helmet part', 'replacement bicycle helmet parts',
  'helmet shell', 'helmet shells',
];

const TOY_AND_NON_FUNCTIONAL_HELMET_PHRASES = [
  'קסדת צעצוע', 'קסדות צעצוע', 'קסדה מיניאטורית', 'קסדות מיניאטוריות',
  'קסדה דקורטיבית', 'קסדות דקורטיביות', 'דגם קסדה', 'דגמי קסדה', 'העתק קסדה', 'העתקים של קסדה',
  'toy helmet', 'toy helmets', 'miniature helmet', 'miniature helmets',
  'decorative helmet', 'decorative helmets', 'helmet model', 'helmet models',
  'helmet replica', 'helmet replicas',
];

test('3. every approved helmet-part phrase never resolves to the dedicated helmet family', () => {
  for (const text of HELMET_PART_PHRASES) {
    const result = identifyProductFamily([text]);
    assert.notEqual(result.family && result.family.id, HELMET_ID, `"${text}" must never resolve to the helmet family`);
  }
});

test('4. every approved toy/decorative/miniature/model/replica helmet phrase never resolves to the dedicated helmet family', () => {
  for (const text of TOY_AND_NON_FUNCTIONAL_HELMET_PHRASES) {
    const result = identifyProductFamily([text]);
    assert.notEqual(result.family && result.family.id, HELMET_ID, `"${text}" must never resolve to the helmet family`);
  }
});

// -----------------------------------------------------------------
// 3. Transport collision protection (Element 6).
// -----------------------------------------------------------------

test('5. bicycle/motorized-bicycle helmet phrases resolve only to the dedicated helmet family, never a bicycle family', () => {
  const cases = ['קסדת אופניים', 'קסדות אופניים', 'bicycle helmet', 'bicycle helmets', 'bike helmet', 'bike helmets'];
  for (const text of cases) {
    const result = identifyProductFamily([text]);
    assert.equal(result.family && result.family.id, HELMET_ID, `"${text}" must resolve to the helmet family`);
    assert.ok(
      !result.candidates.some((c) => c.id === 'additional-consumer-products-02' || c.id === 'additional-consumer-products-07'),
      `"${text}" must never appear among candidates for either bicycle family`,
    );
  }
});

test('6. motorcycle/scooter helmet phrases resolve to the dedicated helmet family and never to the complete-vehicle family, even when the complete_vehicles checkbox is explicitly selected', () => {
  const cases = ['קסדת אופנוע', 'קסדות אופנוע', 'קסדת קטנוע', 'קסדות קטנוע', 'motorcycle helmet', 'motorcycle helmets', 'motorbike helmet', 'motorbike helmets', 'scooter helmet', 'scooter helmets'];
  for (const text of cases) {
    // Unrestricted free-text identification.
    const free = identifyProductFamily([text]);
    assert.equal(free.family && free.family.id, HELMET_ID, `"${text}" must resolve to the helmet family (free text)`);

    // Even when complete_vehicles is explicitly selected (which widens
    // vehicles-and-transport-02 with the bare "אופנוע"/"קטנוע" words),
    // the same text must never resolve to that transport family.
    const options = resolveFamilyIdentificationOptions(['complete_vehicles'], findFamilyById);
    const restricted = identifyProductFamily([text], options);
    assert.notEqual(
      restricted.family && restricted.family.id,
      'vehicles-and-transport-02',
      `"${text}" must never resolve to the complete-motorcycle family under the complete_vehicles checkbox`,
    );
  }
});

test('7. complete transport products remain correctly recognized (unaffected by the helmet collision protections)', () => {
  const preservationCases = [
    ['אופניים', 'additional-consumer-products-02'],
    ['אופניים חשמליים', 'additional-consumer-products-07'],
    ['bicycle', 'additional-consumer-products-02'],
    ['electric bicycle', 'additional-consumer-products-07'],
  ];
  for (const [text, expectedFamilyId] of preservationCases) {
    const result = identifyProductFamily([text]);
    assert.equal(result.outcome, IDENTIFICATION_OUTCOME.HIGH_CONFIDENCE, `expected HIGH_CONFIDENCE for "${text}"`);
    assert.equal(result.family.id, expectedFamilyId, `expected ${expectedFamilyId} for "${text}"`);
  }
  // Motorcycle/scooter (only reachable via the complete_vehicles
  // checkbox's own scoped-hint widening) must still resolve correctly
  // for a genuine complete-vehicle description with no helmet wording.
  const options = resolveFamilyIdentificationOptions(['complete_vehicles'], findFamilyById);
  for (const text of ['אופנוע', 'אופנועים', 'קטנוע', 'קטנועים']) {
    const result = identifyProductFamily([text], options);
    assert.equal(result.family && result.family.id, 'vehicles-and-transport-02', `expected the complete-motorcycle family for "${text}"`);
  }
});

// -----------------------------------------------------------------
// 4. PPE transfer and preservation (Element 5).
// -----------------------------------------------------------------

test('8. "קסדת מגן"/"protective helmet" (and plurals) now resolve to the dedicated helmet family, never general PPE', () => {
  for (const text of ['קסדת מגן', 'קסדות מגן', 'protective helmet', 'protective helmets']) {
    const result = identifyProductFamily([text]);
    assert.equal(result.family && result.family.id, HELMET_ID, `"${text}" must resolve to the helmet family`);
    assert.ok(
      !result.candidates.some((c) => c.id === 'additional-consumer-products-06'),
      `"${text}" must never appear among candidates for general PPE`,
    );
  }
});

test('9. non-helmet PPE remains correctly recognized (Hebrew and English)', () => {
  const preservationCases = [
    'משקפי מגן', 'כפפות מגן', 'רתמת בטיחות', 'ציוד הגנה נשימתית',
    'protective eyewear', 'protective gloves', 'safety harness', 'respiratory protection equipment',
  ];
  for (const text of preservationCases) {
    const result = identifyProductFamily([text]);
    assert.equal(result.outcome, IDENTIFICATION_OUTCOME.HIGH_CONFIDENCE, `expected HIGH_CONFIDENCE for "${text}"`);
    assert.equal(result.family.id, 'additional-consumer-products-06', `expected the general PPE family for "${text}"`);
  }
  // Safety footwear is a distinct, pre-existing family, unaffected by
  // this change.
  const shoes = identifyProductFamily(['נעלי בטיחות']);
  assert.equal(shoes.family && shoes.family.id, 'textiles-and-furniture-04');
  const safetyShoes = identifyProductFamily(['safety shoes']);
  assert.equal(safetyShoes.family && safetyShoes.family.id, 'textiles-and-furniture-04');
});

test('10. the personal_protective_equipment checkbox alone (no free text) never forces either PPE family; free text narrows it to exactly one', () => {
  const alone = resolveFamilyIdentificationOptions(['personal_protective_equipment'], findFamilyById);
  assert.ok(!alone.forcedFamily);
  assert.deepEqual((alone.families || []).map((f) => f.id).sort(), ['additional-consumer-products-06', HELMET_ID]);

  const helmetText = identifyProductFamily(['קסדת מגן'], alone);
  assert.equal(helmetText.outcome, IDENTIFICATION_OUTCOME.HIGH_CONFIDENCE);
  assert.equal(helmetText.family.id, HELMET_ID);

  const ppeText = identifyProductFamily(['משקפי מגן'], alone);
  assert.equal(ppeText.outcome, IDENTIFICATION_OUTCOME.HIGH_CONFIDENCE);
  assert.equal(ppeText.family.id, 'additional-consumer-products-06');
});

// -----------------------------------------------------------------
// 5. Professional direction and result-path verification (Elements 7, 9).
// -----------------------------------------------------------------

function section(texts, checkbox) {
  return buildProductFamilyMatrixSection({
    texts,
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: checkbox ? [checkbox] : [],
  });
}

test('11. a complete helmet produces exactly one positive result: the dedicated helmet family, one Standards direction, and the exact approved wording', () => {
  const s = section(['קסדת אופניים']);
  assert.ok(s);
  assert.equal(s.state, 'positive');
  assert.equal(s.familyName, 'קסדות');
  assert.deepEqual(s.positiveCategories, ['תקינה']);
  assert.equal(s.note.text, APPROVED_WORDING);
});

test('12. a complete helmet produces exactly one professional referral (primary Standards specialist, supporting customs classifier) -- no duplicate', () => {
  const s = section(['קסדת אופנוע']);
  assert.ok(s);
  assert.ok(s.professional.primary);
  assert.equal(s.professional.primary.type, 'מומחה תקינה והתאמה טכנית');
  assert.ok(s.professional.supporting);
  assert.equal(s.professional.supporting.type, 'מסווג מכס מקצועי');
});

test('13. the visible non-binding limitation is preserved for the helmet family result', () => {
  const s = section(['קסדת ספורט']);
  assert.ok(s);
  assert.equal(s.limitation, 'התוצאה היא כיוון בדיקה ראשוני ואינה מהווה סיווג מכס או אישור יבוא.');
});

test('14. the dedicated helmet wording never appears for general PPE, and the general PPE wording never appears for a helmet', () => {
  const ppe = section(['משקפי מגן']);
  assert.ok(ppe);
  assert.notEqual(ppe.note.text, APPROVED_WORDING);
  assert.equal(ppe.familyName, 'ציוד מגן אישי');

  const helmet = section(['קסדת קורקינט']);
  assert.ok(helmet);
  assert.notEqual(helmet.note.text.includes('ציוד ההגנה'), true);
  assert.equal(helmet.familyName, 'קסדות');
});

test('15. the explicit protective_helmets checkbox alone identifies the helmet family regardless of free text (no automatic selection of any other checkbox)', () => {
  assert.deepEqual(PRODUCT_FAMILY_SELECTION_CANDIDATES.protective_helmets, [HELMET_ID]);
  const s = section(['מוצר לבדיקה'], 'protective_helmets');
  assert.ok(s);
  assert.equal(s.familyName, 'קסדות');
});

test('16. free-text helmet suggestion surfaces the dedicated checkbox via suggestProductFamilyValues, never auto-selecting it (plain string values only)', () => {
  const suggested = suggestProductFamilyValues(['קסדת אופניים']);
  assert.ok(Array.isArray(suggested));
  assert.ok(suggested.includes('protective_helmets'), 'protective_helmets must be suggested for a bicycle-helmet description');
  for (const value of suggested) assert.equal(typeof value, 'string', 'suggestions must be plain strings, never auto-checked objects');
});

test('17. a bicycle accessory/part phrase never suggests the helmet checkbox, and a helmet phrase never suggests the bicycle checkbox', () => {
  const bicyclePartSuggestion = suggestProductFamilyValues(['מנשא אופניים']);
  assert.ok(!bicyclePartSuggestion.includes('protective_helmets'));
  const helmetSuggestion = suggestProductFamilyValues(['bicycle helmet']);
  assert.ok(!helmetSuggestion.includes('ordinary_bicycles'));
  assert.ok(!helmetSuggestion.includes('motorized_bicycles'));
});

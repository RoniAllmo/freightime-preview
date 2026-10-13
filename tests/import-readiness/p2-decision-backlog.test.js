/**
 * Product Owner decision backlog (P2), 2026-10-13.
 *
 * Covers the product-owner decisions recorded in
 * PRODUCT_OWNER_DECISION_REGISTRY.md ("P2 decision backlog"):
 *   - metal food-contact items: positive Standards Institution direction
 *     (workbook "תקינה" = כן);
 *   - paints, adhesives and sealants: positive "other permit" direction
 *     (workbook "אישור / רישיון אחר" = כן) naming the Ministry of
 *     Environmental Protection poisons permit;
 *   - industrial chemicals and hazardous materials: no regulatory
 *     authority, never a "no requirement" headline, purpose and
 *     composition must be checked first, customs-classifier referral;
 *   - clothing and textiles: general no-requirement headline plus the
 *     children's clothing / sleepwear Standards Institution warning;
 *   - warning sentences for bows/arrow-shooting toys, defibrillators/
 *     incubators, and aerosol/pressure-container pesticides;
 *   - vehicle battery: exactly one primary direction (vehicle lab);
 *   - pesticides note: poisons permit aligned with paints (Ministry of
 *     Environmental Protection);
 *   - retired duplicate drone row (additional-consumer-products-03):
 *     inactive, id kept, plural alias moved to the active drone row.
 *
 * Pure Node, no DOM, no network.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductFamilyMatrixSection, NO_POSITIVE_SIGNAL_MESSAGE } from '../../js/import-readiness/product-family-result.js';
import { familyGuidanceFor } from '../../js/import-readiness/product-family-guidance.js';
import { findFamilyById } from '../../js/import-readiness/product-family-matrix.js';
import { IMPORT_TYPE } from '../../js/import-readiness/scenario-schema.js';

const COMMERCIAL = IMPORT_TYPE.COMMERCIAL;

function positiveKeys(familyId) {
  const family = findFamilyById(familyId);
  return Object.entries(family.regulatorySignals).filter(([, on]) => on).map(([key]) => key);
}

// -- Metal food-contact items (food-contact-05) --

test('1. metal food-contact items carry exactly a positive Standards Institution direction', () => {
  assert.deepEqual(positiveKeys('food-contact-05'), ['standards']);
  const section = buildProductFamilyMatrixSection({ texts: ['כלי מתכת במגע עם מזון'], importType: COMMERCIAL });
  assert.equal(section.state, 'positive');
  assert.equal(section.familyName, 'כלי מתכת במגע עם מזון');
  assert.deepEqual(section.positiveCategories, ['תקינה']);
  assert.equal(section.professional.primary.type, 'מומחה תקינה והתאמה טכנית');
});

// -- Paints, adhesives and sealants (chemicals-and-materials-02) --

test('2. paints/adhesives carry exactly a positive "other permit" direction naming the Ministry of Environmental Protection poisons permit', () => {
  assert.deepEqual(positiveKeys('chemicals-and-materials-02'), ['otherPermit']);
  const section = buildProductFamilyMatrixSection({
    texts: ['צבעים, דבקים וחומרי איטום'],
    importType: COMMERCIAL,
    selectedProductFamilies: ['chemicals_paints_adhesives_aerosols'],
  });
  assert.equal(section.state, 'positive');
  assert.equal(section.familyName, 'צבעים, דבקים וחומרי איטום');
  assert.deepEqual(section.positiveCategories, ['אישור / רישיון אחר']);
  assert.ok(section.note.text.includes('היתר רעלים'));
  assert.ok(section.note.text.includes('המשרד להגנת הסביבה'));
});

// -- Industrial chemicals and hazardous materials (chemicals-and-materials-04) --

test('3. industrial/hazardous chemicals get no regulatory authority and no positive category', () => {
  assert.deepEqual(positiveKeys('chemicals-and-materials-04'), []);
  const section = buildProductFamilyMatrixSection({ texts: ['כימיקל תעשייתי'], importType: COMMERCIAL });
  assert.equal(section.state, 'no_positive_signal');
  assert.equal(section.familyName, 'כימיקלים תעשייתיים וחומרים מסוכנים');
  assert.equal(section.hasPositiveCategories, false);
});

test('4. industrial/hazardous chemicals never read as "no requirement": purpose and composition must be checked first', () => {
  const section = buildProductFamilyMatrixSection({ texts: ['כימיקל תעשייתי'], importType: COMMERCIAL });
  assert.notEqual(section.noPositiveSignalMessage, NO_POSITIVE_SIGNAL_MESSAGE);
  assert.ok(!section.noPositiveSignalMessage.includes('לא זוהתה דרישה'), 'the headline must never state that no requirement was found');
  assert.ok(section.noPositiveSignalMessage.includes('הייעוד המדויק'));
  assert.ok(section.noPositiveSignalMessage.includes('הרכב החומר'));
  assert.ok(section.note.text.includes('מסווג מכס'));
  assert.equal(section.noPositiveSignalNotExemptNote, 'אין בכך אישור שהמוצר פטור מדרישות יבוא או מתנאים אחרים.');
});

test('5. industrial/hazardous chemicals refer the user to a customs classifier', () => {
  const section = buildProductFamilyMatrixSection({ texts: ['כימיקל תעשייתי'], importType: COMMERCIAL });
  assert.deepEqual(section.professional.primary.coveredCategoryIds, ['customs_classifier']);
  assert.equal(section.professional.supporting, null);
});

// -- Clothing and textiles (textiles-and-furniture-01) --

test('6. clothing keeps no positive category, with the children\'s clothing and sleepwear Standards Institution warning', () => {
  assert.deepEqual(positiveKeys('textiles-and-furniture-01'), []);
  const section = buildProductFamilyMatrixSection({ texts: ['ביגוד'], importType: COMMERCIAL });
  assert.equal(section.state, 'no_positive_signal');
  assert.equal(section.familyName, 'ביגוד וטקסטיל');
  assert.ok(section.noPositiveSignalMessage.includes('לא זוהתה דרישה כללית'));
  assert.ok(section.note.text.includes('ביגוד לילדים'));
  assert.ok(section.note.text.includes('בגדי שינה'));
  assert.ok(section.note.text.includes('מכון התקנים'));
});

// -- Approved exceptions as warning sentences --

test('7. toys: the bows/arrow-shooting warning names the Ministry of Economy import administration, as a "may" warning', () => {
  const note = familyGuidanceFor('children-and-infants-01').note;
  assert.ok(note.startsWith('נדרש לבדוק את מסלול אישור מכון התקנים לצעצוע.'), 'the primary Standards Institution direction stays first');
  assert.ok(note.includes('קשתות ומשחקים היורים חצים עשויים לחייב גם רישיון יבוא ממינהל היבוא במשרד הכלכלה.'));
});

test('8. medical equipment: the defibrillator/incubator Standards Institution warning is added; the medical-claim row is unchanged', () => {
  const equipment = familyGuidanceFor('health-and-cosmetics-02').note;
  const medicalClaim = familyGuidanceFor('health-and-cosmetics-03').note;
  assert.ok(equipment.includes('דפיברילטורים ואינקובטורים עשויים לחייב גם בדיקה של מסלול אישור מכון התקנים.'));
  assert.ok(equipment.startsWith(medicalClaim), 'the shared AMAR note stays intact, the warning is appended');
  assert.ok(!medicalClaim.includes('דפיברילטור'));
});

test('9. pesticides: poisons-permit authority aligned with paints, plus the aerosol/pressure-container warning', () => {
  const note = familyGuidanceFor('chemicals-and-materials-03').note;
  assert.ok(note.startsWith('נדרש לבדוק היתר רעלים מול המשרד להגנת הסביבה.'), 'aligned with the paints/adhesives note');
  assert.ok(!note.includes('במשרד הבריאות'));
  assert.ok(note.includes('תכשיר באריזת תרסיס (אירוסול) או במכל לחץ עשוי לחייב גם בדיקה של מסלול אישור מכון התקנים.'));
});

test('10. every new warning sentence is cautious ("עשוי/עשויים"), never an absolute requirement', () => {
  const warnings = [
    familyGuidanceFor('children-and-infants-01').note,
    familyGuidanceFor('health-and-cosmetics-02').note,
    familyGuidanceFor('chemicals-and-materials-03').note,
  ];
  for (const note of warnings) {
    const lastSentence = note.trim().split('. ').pop();
    assert.match(lastSentence, /עשוי/, `expected a cautious warning, got: ${lastSentence}`);
  }
});

// -- Vehicle battery conflict resolution --

test('11. vehicle battery keeps exactly one primary direction: the vehicle lab, never also standards', () => {
  assert.deepEqual(positiveKeys('vehicles-and-transport-10'), ['transportOrVehicleLaboratory']);
});

// -- Retired duplicate drone row --

test('12. the duplicate drone row is retired: inactive, id kept, later ids in its category unchanged', () => {
  const retired = findFamilyById('additional-consumer-products-03');
  assert.equal(retired.publicFamilyName, 'רחפנים');
  assert.equal(retired.activeStatus, false);
  assert.equal(findFamilyById('additional-consumer-products-04').publicFamilyName, 'ציוד ימי וכלי שיט');
  assert.equal(findFamilyById('additional-consumer-products-10').publicFamilyName, 'קסדות');
  assert.equal(familyGuidanceFor('additional-consumer-products-03'), null);
});

test('13. plural and singular drone text both resolve to the one active drone row with the same result', () => {
  const singular = buildProductFamilyMatrixSection({ texts: ['רחפן'], importType: COMMERCIAL });
  const plural = buildProductFamilyMatrixSection({ texts: ['רחפנים'], importType: COMMERCIAL });
  assert.equal(plural.familyName, 'רחפן');
  assert.deepEqual(plural.positiveCategories, singular.positiveCategories);
  assert.equal(plural.note.text, singular.note.text);
  assert.deepEqual(plural.professional, singular.professional);
});

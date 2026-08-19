/**
 * Regression tests for the seven product-owner acceptance defects
 * fixed in this pass: quantity safeguard, fresh-eggs/walkie-talkie
 * alias coverage, vehicle question suppression (function/installation/
 * mains), and the resulting question-minimization behavior. See
 * docs/product-family-matrix-engine.md and the PR description for the
 * full defect list.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductFamilyMatrixSection } from '../../js/import-readiness/product-family-result.js';
import { evaluatePersonalQuantityWarning, parsePositiveWholeQuantity, QUANTITY_WARNING_TEXT } from '../../js/import-readiness/personal-quantity-warning.js';
import { detectCategoryHints } from '../../js/import-readiness/regulatory-signals/keyword-hints.js';
import { inferVehicleContextAnswers } from '../../js/import-readiness/regulatory-signals/vehicle-context-inference.js';
import { IMPORT_TYPE } from '../../js/import-readiness/scenario-schema.js';

// --- Defect 1: personal-import quantity safeguard ---------------------------

test('1. gel polish ("לק ג\'ל"), personal import, quantity 100: produces the exact approved cautious warning', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ["לק ג'ל"], importType: IMPORT_TYPE.PERSONAL, rawQuantity: '100',
  });
  assert.ok(section);
  assert.equal(section.positiveCategories.includes('משרד הבריאות'), true);
  assert.equal(section.quantityWarning, QUANTITY_WARNING_TEXT);
  assert.equal(QUANTITY_WARNING_TEXT, 'הכמות שנמסרה עשויה להיחשב כבעלת אופי מסחרי. מומלץ לבדוק את מסלול היבוא לפני ההזמנה או השילוח.');
  assert.ok(!QUANTITY_WARNING_TEXT.includes('הכמות היא מסחרית'), 'must never state the quantity definitively is commercial');
});

test('2. blank quantity is allowed and produces no warning', () => {
  const section = buildProductFamilyMatrixSection({ texts: ["לק ג'ל"], importType: IMPORT_TYPE.PERSONAL, rawQuantity: '' });
  assert.equal(section.quantityWarning, null);
  const section2 = buildProductFamilyMatrixSection({ texts: ["לק ג'ל"], importType: IMPORT_TYPE.PERSONAL, rawQuantity: undefined });
  assert.equal(section2.quantityWarning, null);
});

test('3. invalid quantity values (non-numeric, negative, zero) are rejected without throwing and never produce a warning', () => {
  assert.equal(parsePositiveWholeQuantity('abc'), null);
  assert.equal(parsePositiveWholeQuantity('-5'), null);
  assert.equal(parsePositiveWholeQuantity('0'), null);
  assert.equal(parsePositiveWholeQuantity('3.5'), null);
  assert.equal(evaluatePersonalQuantityWarning({ rawQuantity: 'abc' }), null);
});

test('4. a small quantity (below the pilot threshold) produces no warning', () => {
  const section = buildProductFamilyMatrixSection({ texts: ["לק ג'ל"], importType: IMPORT_TYPE.PERSONAL, rawQuantity: '2' });
  assert.equal(section.quantityWarning, null);
});

test('5. commercial import never shows the personal quantity warning, even with the same quantity', () => {
  const section = buildProductFamilyMatrixSection({ texts: ["לק ג'ל"], importType: IMPORT_TYPE.COMMERCIAL, rawQuantity: '100' });
  assert.equal(section.quantityWarning, null);
});

test('6. no universal legal quantity threshold is invented -- the warning text names no number', () => {
  assert.ok(!/\d/.test(QUANTITY_WARNING_TEXT), 'the public warning sentence must not contain an invented numeric legal threshold');
});

// --- Defect 2: fresh eggs / food of animal origin ----------------------------

test('7. "ביצים טריות" is identified as מזון מן החי (food of animal origin)', () => {
  const section = buildProductFamilyMatrixSection({ texts: ['ביצים טריות'], importType: IMPORT_TYPE.COMMERCIAL });
  assert.ok(section);
  assert.equal(section.familyName, 'מזון מן החי');
});

test('8. fresh eggs produce both משרד הבריאות and משרד החקלאות in one combined result, not a generic-only result', () => {
  const section = buildProductFamilyMatrixSection({ texts: ['ביצים טריות'], importType: IMPORT_TYPE.COMMERCIAL });
  assert.deepEqual(section.positiveCategories, ['משרד הבריאות', 'משרד החקלאות']);
});

test('9. "ביצים" as a standalone alias also resolves (not only the exact phrase "ביצים טריות")', () => {
  const section = buildProductFamilyMatrixSection({ texts: ['מוצרי ביצים למכירה'], importType: IMPORT_TYPE.COMMERCIAL });
  assert.equal(section.familyName, 'מזון מן החי');
});

// --- Defect 3: walkie-talkie / communications --------------------------------

test('10. "ווקי טוקי" is identified as the wireless/communications family', () => {
  const section = buildProductFamilyMatrixSection({ texts: ['ווקי טוקי'], importType: IMPORT_TYPE.COMMERCIAL });
  assert.ok(section);
  assert.equal(section.familyName, 'מוצר אלחוטי, Wi-Fi או Bluetooth');
});

test('11. walkie-talkie produces standards + communications, mapped exactly by the matrix family (not generic-only)', () => {
  const section = buildProductFamilyMatrixSection({ texts: ['ווקי טוקי'], importType: IMPORT_TYPE.COMMERCIAL });
  assert.deepEqual(section.positiveCategories, ['תקינה', 'משרד התקשורת']);
});

test('12. English and hyphenated walkie-talkie alias variants also resolve, case-insensitively', () => {
  const a = buildProductFamilyMatrixSection({ texts: ['Walkie-Talkie radio'], importType: IMPORT_TYPE.COMMERCIAL });
  const b = buildProductFamilyMatrixSection({ texts: ['walkie talkie'], importType: IMPORT_TYPE.COMMERCIAL });
  assert.equal(a.familyName, 'מוצר אלחוטי, Wi-Fi או Bluetooth');
  assert.equal(b.familyName, 'מוצר אלחוטי, Wi-Fi או Bluetooth');
});

test('13. מכשיר קשר and מקמ"ש aliases also resolve to the wireless/communications family', () => {
  const a = buildProductFamilyMatrixSection({ texts: ['מכשיר קשר לשימוש מקצועי'], importType: IMPORT_TYPE.COMMERCIAL });
  const b = buildProductFamilyMatrixSection({ texts: ['מקמ"ש צבאי לשעבר'], importType: IMPORT_TYPE.COMMERCIAL });
  assert.equal(a.familyName, 'מוצר אלחוטי, Wi-Fi או Bluetooth');
  assert.equal(b.familyName, 'מוצר אלחוטי, Wi-Fi או Bluetooth');
});

// --- Defect 6: vehicle question suppression ----------------------------------

test('14. an explicit installation phrase ("להתקנה ברכב") is inferred as answered, so the installation question is redundant', () => {
  const answers = inferVehicleContextAnswers(['פנס קדמי להתקנה ברכב פרטי']);
  assert.equal(answers.installedAsPartOfVehicle, 'yes');
});

test('15. a lighting phrase ("פנס") is inferred as answered, so the function-category question is redundant', () => {
  const answers = inferVehicleContextAnswers(['פנס לרכב']);
  assert.equal(answers.vehicleFunctionCategory, 'lighting');
});

test('16. ambiguous vehicle wording alone ("מוצר לרכב") infers neither answer -- no question is skipped without genuine textual justification', () => {
  const answers = inferVehicleContextAnswers(['מוצר לרכב']);
  assert.equal(answers.installedAsPartOfVehicle, undefined);
  assert.equal(answers.vehicleFunctionCategory, undefined);
});

test('17. a vehicle-hinted product does not also hint electrical_mains_product merely from co-occurring vehicle+electrical wording', () => {
  const hinted = detectCategoryHints(['פנס לרכב עם חיבור לרכב']);
  assert.ok(hinted.has('vehicle_product'));
  assert.ok(!hinted.has('electrical_mains_product'), 'a vehicle electrical system is not mains electricity');
});

test('18. an explicit separate mains charger/power-supply phrase overrides the suppression (a real second characteristic)', () => {
  const hinted = detectCategoryHints(['אביזר לרכב הכולל גם ספק כוח נפרד לשקע ביתי, מתחבר לחשמל']);
  assert.ok(hinted.has('vehicle_product'));
  assert.ok(hinted.has('electrical_mains_product'), 'an explicitly separate mains charger is a genuine second characteristic, not implied by vehicle wording alone');
});

test('19. plain mains-connected wording with no vehicle context is unaffected by the suppression', () => {
  const hinted = detectCategoryHints(['מכשיר חשמלי עם תקע לשקע']);
  assert.ok(!hinted.has('vehicle_product'));
  assert.ok(hinted.has('electrical_mains_product'));
});

// --- Cross-cutting: only positive categories, no invented content -----------

test('20. clothing (a recognized family with no positive matrix category) never claims exemption', () => {
  const section = buildProductFamilyMatrixSection({ texts: ['ביגוד'], importType: IMPORT_TYPE.PERSONAL });
  assert.ok(section);
  assert.equal(section.hasPositiveCategories, false);
  assert.ok(section.noPositiveSignalMessage);
  assert.ok(section.noPositiveSignalNotExemptNote);
});

test('21. an unrecognized product produces no matrix section at all (not a guess, not an invented family)', () => {
  const section = buildProductFamilyMatrixSection({ texts: ['מוצר לא ידוע לחלוטין'], importType: IMPORT_TYPE.PERSONAL });
  assert.equal(section, null);
});

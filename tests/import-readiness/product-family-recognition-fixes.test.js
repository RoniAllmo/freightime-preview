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
import { parsePositiveWholeQuantity } from '../../js/import-readiness/personal-quantity-warning.js';
import {
  shouldAskPersonalUseClarification,
  personalUseClarificationMessage,
  PERSONAL_USE_YES_MESSAGE,
  PERSONAL_USE_NO_MESSAGE,
  PERSONAL_USE_NOT_SURE_MESSAGE,
} from '../../js/import-readiness/personal-use-clarification.js';
import { findFamilyById } from '../../js/import-readiness/product-family-matrix.js';
import { detectCategoryHints } from '../../js/import-readiness/regulatory-signals/keyword-hints.js';
import { inferVehicleContextAnswers } from '../../js/import-readiness/regulatory-signals/vehicle-context-inference.js';
import { IMPORT_TYPE } from '../../js/import-readiness/scenario-schema.js';

// --- Defect 1 (superseded): personal-use clarification, not a quantity threshold --

const cosmeticsFamily = findFamilyById('health-and-cosmetics-01');

test('1. gel polish ("לק ג\'ל"), personal import, quantity 100: the sensitive-family clarification question is relevant, and each answer produces its exact approved message', () => {
  assert.ok(shouldAskPersonalUseClarification({ importType: IMPORT_TYPE.PERSONAL, family: cosmeticsFamily, rawQuantity: '100' }));
  assert.equal(personalUseClarificationMessage('yes'), PERSONAL_USE_YES_MESSAGE);
  assert.equal(personalUseClarificationMessage('no'), PERSONAL_USE_NO_MESSAGE);
  assert.equal(personalUseClarificationMessage('unknown'), PERSONAL_USE_NOT_SURE_MESSAGE);
  assert.ok(!PERSONAL_USE_YES_MESSAGE.includes('הכמות היא מסחרית'), 'must never state the quantity definitively is commercial');
});

test('2. blank quantity: the clarification question is never relevant, regardless of family', () => {
  assert.equal(shouldAskPersonalUseClarification({ importType: IMPORT_TYPE.PERSONAL, family: cosmeticsFamily, rawQuantity: '' }), false);
  assert.equal(shouldAskPersonalUseClarification({ importType: IMPORT_TYPE.PERSONAL, family: cosmeticsFamily, rawQuantity: undefined }), false);
});

test('3. invalid quantity values (non-numeric, negative, zero) are rejected without throwing and never make the clarification question relevant', () => {
  assert.equal(parsePositiveWholeQuantity('abc'), null);
  assert.equal(parsePositiveWholeQuantity('-5'), null);
  assert.equal(parsePositiveWholeQuantity('0'), null);
  assert.equal(parsePositiveWholeQuantity('3.5'), null);
  assert.equal(shouldAskPersonalUseClarification({ importType: IMPORT_TYPE.PERSONAL, family: cosmeticsFamily, rawQuantity: 'abc' }), false);
});

test('4. quantity 99 and quantity 101 both make the clarification question relevant, identically to quantity 100 -- no exact-100 dependency', () => {
  const at99 = shouldAskPersonalUseClarification({ importType: IMPORT_TYPE.PERSONAL, family: cosmeticsFamily, rawQuantity: '99' });
  const at100 = shouldAskPersonalUseClarification({ importType: IMPORT_TYPE.PERSONAL, family: cosmeticsFamily, rawQuantity: '100' });
  const at101 = shouldAskPersonalUseClarification({ importType: IMPORT_TYPE.PERSONAL, family: cosmeticsFamily, rawQuantity: '101' });
  assert.equal(at99, true);
  assert.equal(at100, true);
  assert.equal(at101, true);
});

test('5. commercial import never makes the clarification question relevant, even with a sensitive family and a quantity', () => {
  assert.equal(shouldAskPersonalUseClarification({ importType: IMPORT_TYPE.COMMERCIAL, family: cosmeticsFamily, rawQuantity: '100' }), false);
});

test('6. no numeric quantity trigger remains: none of the three approved messages contain a number', () => {
  assert.ok(!/\d/.test(PERSONAL_USE_YES_MESSAGE), 'the "yes" message must not contain an invented numeric legal threshold');
  assert.ok(!/\d/.test(PERSONAL_USE_NO_MESSAGE), 'the "no" message must not contain an invented numeric legal threshold');
  assert.ok(!/\d/.test(PERSONAL_USE_NOT_SURE_MESSAGE), 'the "not sure" message must not contain an invented numeric legal threshold');
});

test('6b. buildProductFamilyMatrixSection never derives a personal-use message from a quantity itself -- it only ever surfaces the message it was explicitly given', () => {
  const withMessage = buildProductFamilyMatrixSection({
    texts: ["לק ג'ל"], importType: IMPORT_TYPE.PERSONAL, personalUseClarificationMessage: PERSONAL_USE_YES_MESSAGE,
  });
  assert.equal(withMessage.personalUseClarificationMessage, PERSONAL_USE_YES_MESSAGE);
  const withoutMessage = buildProductFamilyMatrixSection({
    texts: ["לק ג'ל"], importType: IMPORT_TYPE.PERSONAL,
  });
  assert.equal(withoutMessage.personalUseClarificationMessage, null, 'no quantity param exists any more to derive a message from');
  const commercialIgnoresMessage = buildProductFamilyMatrixSection({
    texts: ["לק ג'ל"], importType: IMPORT_TYPE.COMMERCIAL, personalUseClarificationMessage: PERSONAL_USE_YES_MESSAGE,
  });
  assert.equal(commercialIgnoresMessage.personalUseClarificationMessage, null, 'commercial import must never surface the personal-use message even if one was passed in');
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

test('16. ambiguous vehicle wording alone ("מוצר לרכב") infers no installation answer -- no question is skipped without genuine textual justification', () => {
  const answers = inferVehicleContextAnswers(['מוצר לרכב']);
  assert.equal(answers.installedAsPartOfVehicle, undefined);
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

test('21. an unrecognized product produces the distinct unknown-family state (not a guess, not an invented family, not the no-positive-signal wording)', () => {
  const section = buildProductFamilyMatrixSection({ texts: ['מוצר לא ידוע לחלוטין'], importType: IMPORT_TYPE.PERSONAL });
  assert.ok(section);
  assert.equal(section.state, 'unknown_family');
  assert.equal(section.familyName, null);
  assert.ok(section.noFamilyMatchMessage);
  assert.equal(section.noPositiveSignalMessage, null, 'must not reuse the recognized-family-no-positive-signal wording');
});

test('21b. an unrecognized product already explained by a matched existing detailed rule produces no matrix section at all', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['מוצר לא ידוע לחלוטין'], importType: IMPORT_TYPE.PERSONAL, matchedExistingRuleIds: ['glass-food-contact-vessel'],
  });
  assert.equal(section, null, 'a detailed rule already fully explained the result; no redundant unknown-family banner');
});

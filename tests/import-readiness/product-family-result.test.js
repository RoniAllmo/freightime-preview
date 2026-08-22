/**
 * Tests for the pure product-family-matrix result builder
 * (product-family-result.js): identification + reconciliation against
 * existing detailed rules + import-type note selection + professional
 * routing, with no DOM.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductFamilyMatrixSection, SHARED_LIMITATION_TEXT } from '../../js/import-readiness/product-family-result.js';
import { scanForBannedAbsoluteClaims } from '../../js/import-readiness/regulatory-signals/language-safety.js';
import { IMPORT_TYPE } from '../../js/import-readiness/scenario-schema.js';

test('1. no identifiable family -> the distinct unknown-family state, not a guess, not the no-positive-signal wording', () => {
  const section = buildProductFamilyMatrixSection({ texts: ['משהו לא ברור'], importType: IMPORT_TYPE.PERSONAL });
  assert.ok(section);
  assert.equal(section.state, 'unknown_family');
  assert.equal(section.hasPositiveCategories, false);
  assert.equal(section.familyName, null);
});

test('2. food of animal origin: positive health + agriculture, personal note shown, no commercial note', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['מזון מן החי', 'בשר קפוא לצריכה עצמית'],
    importType: IMPORT_TYPE.PERSONAL,
  });
  assert.ok(section);
  assert.equal(section.hasPositiveCategories, true);
  assert.deepEqual(section.positiveCategories, ['משרד הבריאות', 'משרד החקלאות']);
  assert.equal(section.note.kind, 'personal');
  assert.equal(section.note.text, 'כמות לא מסחרית');
});

test('3. agricultural produce: positive health + agriculture, one compact list (not one card per category)', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['תוצרת חקלאית', 'זרעים לשתילה'],
    importType: IMPORT_TYPE.COMMERCIAL,
  });
  assert.ok(section);
  assert.deepEqual(section.positiveCategories, ['משרד הבריאות', 'משרד החקלאות']);
});

test('4. wireless product: positive standards + communications, no separate question was asked to get here (pure text-derived)', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['מוצר אלחוטי', 'Bluetooth', 'רמקול נייד'],
    importType: IMPORT_TYPE.COMMERCIAL,
  });
  assert.ok(section);
  assert.deepEqual(section.positiveCategories, ['תקינה', 'משרד התקשורת']);
});

test('5. glass drinking vessel: when the existing detailed rule already matched, the matrix contributes nothing (no duplicate standards card)', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['כוס זכוכית לשתיה'],
    importType: IMPORT_TYPE.PERSONAL,
    matchedExistingRuleIds: ['glass-food-contact-vessel'],
  });
  assert.equal(section, null, 'the matrix must defer entirely to the existing detailed glass rule');
});

test('6. glass drinking vessel: WITHOUT an existing-rule match, the matrix still reports its one positive category (standards)', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['כוס זכוכית לשתיה'],
    importType: IMPORT_TYPE.PERSONAL,
    matchedExistingRuleIds: [],
  });
  assert.ok(section);
  assert.deepEqual(section.positiveCategories, ['תקינה']);
});

test('7. vehicle headlamp: when the existing vehicle-installed-product rule matched, transport is not duplicated', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['פנס לרכב', 'פנס ראש לרכב'],
    importType: IMPORT_TYPE.PERSONAL,
    matchedExistingRuleIds: ['vehicle-installed-product'],
  });
  assert.equal(section, null);
});

test('8. clothing: no positive category, no exemption claim, still offers one useful verification route', () => {
  const section = buildProductFamilyMatrixSection({ texts: ['ביגוד', 'חולצה'], importType: IMPORT_TYPE.PERSONAL });
  assert.ok(section);
  assert.equal(section.hasPositiveCategories, false);
  assert.ok(section.noPositiveSignalMessage);
  assert.ok(section.noPositiveSignalNotExemptNote);
  assert.ok(section.professional.primary, 'expected a fallback professional verification route even with no positive category');
});

test('9. commercial import with a blank workbook note uses the approved generic verification sentence, never an invented one', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['מזון מן החי'],
    importType: IMPORT_TYPE.COMMERCIAL,
  });
  assert.ok(section);
  assert.equal(section.note.kind, 'commercial');
  assert.equal(section.note.text, 'יש לאמת את הדרישה, פרט המכס ומסלול האישור לפני ההזמנה או השילוח.');
});

test('10. personal import never shows the commercial note, and vice versa (import-type separation)', () => {
  const personal = buildProductFamilyMatrixSection({ texts: ['מזון מן החי'], importType: IMPORT_TYPE.PERSONAL });
  const commercial = buildProductFamilyMatrixSection({ texts: ['מזון מן החי'], importType: IMPORT_TYPE.COMMERCIAL });
  assert.equal(personal.note.kind, 'personal');
  assert.equal(commercial.note.kind, 'commercial');
  assert.notEqual(personal.note.text, commercial.note.text);
});

test('11. no invented quantity threshold: the personal note is shown verbatim, never expanded with a number the matrix did not supply', () => {
  const section = buildProductFamilyMatrixSection({ texts: ['מזון ארוז'], importType: IMPORT_TYPE.PERSONAL });
  assert.equal(section.note.text, 'כמות לא מסחרית');
  assert.ok(!/\d/.test(section.note.text), 'must not contain an invented numeric quantity threshold');
});

test('12. never more than one primary and one supporting professional', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['מוצר אלחוטי', 'Bluetooth'],
    importType: IMPORT_TYPE.PERSONAL,
  });
  assert.ok(section.professional.primary);
  const keys = Object.keys(section.professional);
  assert.deepEqual(keys.sort(), ['primary', 'supporting']);
});

test('13. the shared limitation sentence is always present, exactly once, and matches the approved wording', () => {
  const section = buildProductFamilyMatrixSection({ texts: ['מזון מן החי'], importType: IMPORT_TYPE.PERSONAL });
  assert.equal(section.limitation, SHARED_LIMITATION_TEXT);
  assert.equal(SHARED_LIMITATION_TEXT, 'התוצאה היא כיוון בדיקה ראשוני ואינה מהווה סיווג מכס או אישור יבוא.');
});

test('14. no false regulatory category is ever included in positiveCategories', () => {
  const section = buildProductFamilyMatrixSection({ texts: ['מזון ארוז'], importType: IMPORT_TYPE.PERSONAL });
  // מזון ארוז (packaged food): only healthUmbrella is true in the matrix.
  assert.deepEqual(section.positiveCategories, ['משרד הבריאות']);
  assert.ok(!section.positiveCategories.includes('משרד התחבורה / מעבדת רכב'));
  assert.ok(!section.positiveCategories.includes('משרד התקשורת'));
  assert.ok(!section.positiveCategories.includes('משרד החקלאות'));
});

test('15. public-language safety: none of this module\'s user-visible strings trip the shared banned-absolute-claim scanner', () => {
  const scenarios = [
    { texts: ['מזון מן החי'], importType: IMPORT_TYPE.PERSONAL },
    { texts: ['מזון מן החי'], importType: IMPORT_TYPE.COMMERCIAL },
    { texts: ['ביגוד'], importType: IMPORT_TYPE.PERSONAL },
    { texts: ['מוצר אלחוטי', 'Bluetooth'], importType: IMPORT_TYPE.COMMERCIAL },
  ];
  const strings = [];
  for (const params of scenarios) {
    const section = buildProductFamilyMatrixSection(params);
    if (!section) continue;
    strings.push(section.limitation);
    if (section.note) strings.push(section.note.text);
    if (section.noPositiveSignalMessage) strings.push(section.noPositiveSignalMessage);
    if (section.noPositiveSignalNotExemptNote) strings.push(section.noPositiveSignalNotExemptNote);
    if (section.professional.primary) strings.push(section.professional.primary.reason);
  }
  const scan = scanForBannedAbsoluteClaims(strings);
  assert.equal(scan.ok, true, `unexpected banned-claim phrase(s) found: ${JSON.stringify(scan.violations)}`);
});

// -----------------------------------------------------------------
// F8 investigation: a completed audit reported that a user-selected
// clothing family reached the unknown-family result instead of the
// recognized-family no-positive result. A live-browser reproduction
// using the real UI -- filling in the product name, commercial
// description, AND intended use exactly as the audit's own reproduction
// scenario specified ("Use: ביגוד") -- reaches the correct
// RECOGNIZED_NO_POSITIVE_DIRECTION state with the exact approved
// wording. The original audit's negative result was caused by an
// incomplete test script that only filled the product-name field and
// never entered the intended-use text the reproduction scenario called
// for, not a product defect: "ביגוד" is itself a directly curated,
// reviewed alias of the "ביגוד וטקסטיל" family (see
// product-family-matrix.js), so the existing free-text identification
// already resolves it correctly once all three fields are provided.
// These tests lock in the already-correct end-to-end behavior.
// -----------------------------------------------------------------

test('16. F8: the exact reported scenario (product name + description + intended use) reaches RECOGNIZED_NO_POSITIVE_DIRECTION, not the unknown-family state', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['חולצת כותנה', 'חולצת כותנה לבישה', 'ביגוד'],
    importType: IMPORT_TYPE.COMMERCIAL,
  });
  assert.ok(section);
  assert.equal(section.state, 'no_positive_signal');
  assert.equal(section.familyName, 'ביגוד וטקסטיל');
  assert.equal(section.hasPositiveCategories, false);
  assert.deepEqual(section.positiveCategories, []);
});

test('17. F8: the exact approved wording pair is present, and the unknown-family wording is absent', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['חולצת כותנה', 'חולצת כותנה לבישה', 'ביגוד'],
    importType: IMPORT_TYPE.COMMERCIAL,
  });
  assert.equal(section.noPositiveSignalMessage, 'לא זוהה תחום חוקיות יבוא חיובי במטריצה עבור המשפחה שנבחרה.');
  assert.equal(section.noPositiveSignalNotExemptNote, 'אין בכך אישור שהמוצר פטור מדרישות יבוא או מתנאים אחרים.');
  assert.equal(section.noFamilyMatchMessage, null);
  assert.equal(section.noFamilyMatchHelp, null);
});

test('18. F8: no positive regulatory category is ever fabricated for the clothing family', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['חולצת כותנה', 'חולצת כותנה לבישה', 'ביגוד'],
    importType: IMPORT_TYPE.PERSONAL,
  });
  assert.deepEqual(section.positiveCategories, []);
  assert.equal(section.hasPositiveCategories, false);
});

test('19. F8: product name alone, with no description/intended-use text, correctly stays in the unknown-family state (no regression -- this is a genuinely different, incomplete input, not the reported scenario)', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['חולצת כותנה'],
    importType: IMPORT_TYPE.COMMERCIAL,
  });
  assert.equal(section.state, 'unknown_family');
  assert.equal(section.noFamilyMatchMessage, 'לא זוהתה משפחת מוצר מתאימה מתוך המידע שנמסר.');
});

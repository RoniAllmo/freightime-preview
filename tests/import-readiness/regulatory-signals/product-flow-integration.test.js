import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPersonalImportResult } from '../../../js/import-readiness/personal-import-rules.js';
import { buildFirstCommercialImportResult } from '../../../js/import-readiness/first-commercial-import-rules.js';
import { normalizeReadinessInput } from '../../../js/import-readiness/normalize-readiness-input.js';
import { scanForBannedAbsoluteClaims } from '../../../js/import-readiness/regulatory-signals/language-safety.js';

function personalFor(raw) {
  return buildPersonalImportResult(normalizeReadinessInput(raw));
}
function firstCommercialFor(raw) {
  return buildFirstCommercialImportResult(normalizeReadinessInput(raw));
}

test('1. an unrelated product (no candidate hint) keeps the personal-import result exactly as before -- no regulatory note added', () => {
  const result = personalFor({ productName: 'כיסא עץ', commercialDescription: 'כיסא ישיבה רגיל', intendedUse: 'ריהוט' });
  assert.equal(result.secondaryDetails.note, '');
  assert.deepEqual([...result.secondaryDetails.points], []);
});

test('2. a hinted product description (glass) adds only an honest no-match note to the collapsed secondary details -- never to the primary card', () => {
  const result = personalFor({ productName: 'כוסות זכוכית לשתייה', commercialDescription: '', intendedUse: '' });
  assert.ok(result.secondaryDetails.note.includes('לא זוהתה התאמה'));
  assert.ok(result.secondaryDetails.note.includes('אין בכך אישור'));
  // Primary card content is untouched by the pilot.
  assert.ok(!result.primaryAction.includes('לא זוהתה התאמה'));
  assert.ok(!result.primaryReason.includes('לא זוהתה התאמה'));
});

test('3. a hinted product description (electrical) behaves the same way for the first-commercial-import scenario', () => {
  const result = firstCommercialFor({ productName: 'מטען חשמלי', commercialDescription: 'מטען המתחבר לשקע החשמל', intendedUse: '' });
  assert.ok(result.secondaryDetails.note.includes('לא זוהתה התאמה'));
});

test('4. an unrelated product keeps the first-commercial-import result exactly as before -- no regulatory note added', () => {
  const result = firstCommercialFor({ productName: 'תיק בד', commercialDescription: 'תיק כתף רגיל', intendedUse: 'אחסון' });
  assert.equal(result.secondaryDetails.note, '');
});

test('5. the pilot never causes the personal-import result to claim exemption or final approval', () => {
  const result = personalFor({ productName: 'כלי פלסטיק למזון', commercialDescription: 'קופסת אחסון מזון מפלסטיק' });
  const allStrings = [
    result.primaryAction, result.primaryReason, result.visibleDisclaimer, result.extendedDisclaimer,
    ...result.preparationItems, ...result.secondaryDetails.points, result.secondaryDetails.note,
  ];
  assert.equal(scanForBannedAbsoluteClaims(allStrings).ok, true);
});

test('6. the pilot never causes the first-commercial-import result to claim exemption or final approval', () => {
  const result = firstCommercialFor({ productName: 'רכיב לרכב', commercialDescription: 'חלק המיועד להתקנה ברכב' });
  const allStrings = [
    result.primaryAction, result.primaryReason, result.visibleDisclaimer, result.extendedDisclaimer,
    ...result.preparationItems, ...result.secondaryDetails.points, result.secondaryDetails.note,
  ];
  assert.equal(scanForBannedAbsoluteClaims(allStrings).ok, true);
});

test('7. professional-referral field on personal/first-commercial results is untouched by the pilot (still the original scenario referral)', () => {
  const personal = personalFor({ productName: 'כוסות זכוכית', sensitiveCategory: 'food' });
  assert.equal(personal.professional.type, 'גורם מקצועי המטפל בדרישות יבוא אישי (עמיל מכס או הרשות הרלוונטית)');

  const commercial = firstCommercialFor({ productName: 'מטען חשמלי' });
  assert.equal(commercial.professional.type, 'מסווג מכס או מומחה רגולציה');
});

test('8. results remain frozen (pilot addition does not break immutability)', () => {
  assert.ok(Object.isFrozen(personalFor({ productName: 'כוסות זכוכית' })));
  assert.ok(Object.isFrozen(firstCommercialFor({ productName: 'מטען חשמלי' })));
});

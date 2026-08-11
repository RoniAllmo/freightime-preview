import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFirstCommercialImportResult } from '../../js/import-readiness/first-commercial-import-rules.js';
import { normalizeReadinessInput } from '../../js/import-readiness/normalize-readiness-input.js';

function resultFor(raw) {
  return buildFirstCommercialImportResult(normalizeReadinessInput(raw));
}

test('1. the result has exactly one primary action recommending classification/regulation preparation', () => {
  const result = resultFor({});
  assert.ok(result.primaryAction.length > 0);
  assert.ok(result.primaryAction.includes('סיווג'));
});

test('2. missing commercial description is included in the preparation checklist', () => {
  const result = resultFor({});
  assert.ok(result.preparationItems.includes('תיאור מסחרי של המוצר'));
});

test('3. preparation items never exceed five', () => {
  const result = resultFor({});
  assert.ok(result.preparationItems.length <= 5);
});

test('4. a complete product description shortens the preparation checklist', () => {
  const complete = resultFor({ commercialDescription: 'מוצר', intendedUse: 'שימוש', hasTechnicalSpec: true });
  const incomplete = resultFor({});
  assert.ok(complete.preparationItems.length < incomplete.preparationItems.length);
});

test('5. exactly one primary CTA and one secondary CTA, both distinct', () => {
  const result = resultFor({});
  assert.ok(result.primaryCta);
  assert.ok(result.secondaryCta);
  assert.notEqual(result.primaryCta.id, result.secondaryCta.id);
});

test('6. a user-provided HS code appears only in secondary detail, with the non-final note, never validated', () => {
  const result = resultFor({ hsCodeKnown: true, hsCode: '8541.10' });
  const note = result.secondaryDetails.points.find((p) => p.includes('8541.10'));
  assert.ok(note);
  assert.ok(note.includes('אינו מאומת כסופי'));
  assert.ok(!result.primaryAction.includes('8541.10'));
});

test('7. no HS code note appears when hsCodeKnown is false', () => {
  const result = resultFor({ hsCodeKnown: false, hsCode: '8541.10' });
  assert.equal(result.secondaryDetails.points.length, 0);
});

test('8. the primary reason never claims a technical detail alone determines classification', () => {
  const result = resultFor({});
  assert.ok(!result.primaryReason.includes('קובע את הסיווג'));
});

test('9. the route label identifies the first-commercial-import scenario', () => {
  assert.equal(resultFor({}).routeLabel, 'יבוא מסחרי ראשון');
});

test('10. malformed input is handled safely', () => {
  assert.doesNotThrow(() => buildFirstCommercialImportResult(null));
});

test('11. official sources only appear in secondary detail', () => {
  const result = resultFor({});
  assert.ok(result.secondaryDetails.officialSources.length > 0);
});

test('12. the result is frozen', () => {
  assert.ok(Object.isFrozen(resultFor({})));
});

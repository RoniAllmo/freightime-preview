import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPersonalImportResult, PERSONAL_IMPORT_NOT_AUTOMATICALLY_EXEMPT_NOTE } from '../../js/import-readiness/personal-import-rules.js';
import { normalizeReadinessInput } from '../../js/import-readiness/normalize-readiness-input.js';

function resultFor(raw) {
  return buildPersonalImportResult(normalizeReadinessInput(raw));
}

test('1. the result has exactly one primary action', () => {
  const result = resultFor({});
  assert.equal(typeof result.primaryAction, 'string');
  assert.ok(result.primaryAction.length > 0);
});

test('2. personal import is never described as automatically exempt', () => {
  const result = resultFor({ importType: 'personal' });
  assert.ok(result.primaryReason.includes(PERSONAL_IMPORT_NOT_AUTOMATICALLY_EXEMPT_NOTE));
});

test('3. preparation items never exceed three for personal import (kept short by design)', () => {
  const result = resultFor({ sensitiveCategory: 'food' });
  assert.ok(result.preparationItems.length <= 3);
});

test('4. "none known" sensitive category still returns a short, non-alarming primary action', () => {
  const result = resultFor({ sensitiveCategory: 'none_known' });
  assert.ok(result.primaryAction.length > 0);
  assert.equal(result.preparationItems.length, 2);
});

test('5. official sources only appear in secondary detail, not the primary result, and only for a known sensitive category', () => {
  const withFood = resultFor({ sensitiveCategory: 'food' });
  const withoutCategory = resultFor({ sensitiveCategory: 'none_known' });
  assert.ok(withFood.secondaryDetails.officialSources.length > 0);
  assert.equal(withoutCategory.secondaryDetails.officialSources.length, 0);
});

test('6. the route label identifies the personal-import scenario', () => {
  assert.equal(resultFor({}).routeLabel, 'יבוא אישי');
});

test('7. exactly one primary CTA and no secondary CTA', () => {
  const result = resultFor({});
  assert.ok(result.primaryCta);
  assert.equal(result.secondaryCta, null);
});

test('8. the result is frozen', () => {
  assert.ok(Object.isFrozen(resultFor({})));
});

test('9. malformed input is handled safely', () => {
  assert.doesNotThrow(() => buildPersonalImportResult(null));
});

test('10. the visible disclaimer is the concise required sentence', () => {
  const result = resultFor({});
  assert.equal(result.visibleDisclaimer, 'התוצאה היא הכוונה תפעולית ראשונית ואינה מהווה סיווג מכס, קביעה רגולטורית, ייעוץ משפטי או אישור יבוא.');
});

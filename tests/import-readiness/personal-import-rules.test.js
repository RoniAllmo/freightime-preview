import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPersonalImportResult, PERSONAL_IMPORT_NOT_AUTOMATICALLY_EXEMPT_NOTE } from '../../js/import-readiness/personal-import-rules.js';
import { normalizeReadinessInput } from '../../js/import-readiness/normalize-readiness-input.js';

function resultFor(raw) {
  return buildPersonalImportResult(normalizeReadinessInput(raw));
}

test('1. a personal-use-only submission stays short: no document-heavy commercial checklist appears', () => {
  const result = resultFor({ importType: 'personal', commercialDescription: 'ספר לילדים' });
  assert.ok(!result.sections.documentsToPrepare || result.sections.documentsToPrepare.length <= 2);
});

test('2. personal import is never described as automatically exempt', () => {
  const result = resultFor({ importType: 'personal' });
  const allText = JSON.stringify(result);
  assert.ok(allText.includes(PERSONAL_IMPORT_NOT_AUTOMATICALLY_EXEMPT_NOTE));
});

test('3. a sensitive category triggers a professional-review recommendation', () => {
  const result = resultFor({ importType: 'personal', sensitiveCategory: 'food' });
  assert.ok(result.sections.whenProfessionalReviewNeeded.length > 0);
});

test('4. "none known" sensitive category does not trigger professional review', () => {
  const result = resultFor({ importType: 'personal', sensitiveCategory: 'none_known' });
  assert.ok(!result.sections.whenProfessionalReviewNeeded || result.sections.whenProfessionalReviewNeeded.length === 0);
});

test('5. official sources only appear when a sensitive category with a known source is selected', () => {
  const withFood = resultFor({ importType: 'personal', sensitiveCategory: 'food' });
  const withoutCategory = resultFor({ importType: 'personal', sensitiveCategory: 'none_known' });
  assert.ok(withFood.officialSources.length > 0);
  assert.equal(withoutCategory.officialSources.length, 0);
});

test('6. the route label identifies the personal-import scenario', () => {
  assert.equal(resultFor({}).routeLabel, 'יבוא אישי');
});

test('7. CTAs match the personal-import CTA set', () => {
  const result = resultFor({});
  const ctaIds = result.ctas.map((c) => c.id);
  assert.deepEqual(ctaIds, ['product-requirements', 'document-help', 'official-source']);
});

test('8. the result is frozen', () => {
  assert.ok(Object.isFrozen(resultFor({})));
});

test('9. malformed input is handled safely', () => {
  assert.doesNotThrow(() => buildPersonalImportResult(null));
});

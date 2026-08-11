import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExistingImporterResult } from '../../js/import-readiness/existing-importer-rules.js';
import { normalizeReadinessInput } from '../../js/import-readiness/normalize-readiness-input.js';

function resultFor(raw) {
  return buildExistingImporterResult(normalizeReadinessInput(raw));
}

test('1. a new-product focus produces a classification-oriented result', () => {
  const result = resultFor({ focusArea: 'new_product' });
  assert.ok(result.routeLabel.includes('מוצר חדש'));
});

test('2. a customs-classification focus produces a classification review recommendation', () => {
  const result = resultFor({ focusArea: 'customs_classification' });
  assert.ok(result.sections.whenProfessionalReviewNeeded.length > 0);
});

test('3. a regulation-and-permits focus surfaces relevant official sources', () => {
  const result = resultFor({ focusArea: 'regulation_and_permits' });
  assert.ok(result.officialSources.length > 0);
});

test('4. a cost-focused result does not overload the user with beginner document-preparation content', () => {
  const result = resultFor({ focusArea: 'taxes_and_costs' });
  assert.ok(!result.sections.documentsToPrepare);
  assert.ok(!result.sections.beforeOrder);
});

test('5. a delay-focused result stays scoped to the delay topic', () => {
  const result = resultFor({ focusArea: 'clearance_delay' });
  assert.equal(result.sections.toCheck.length, 1);
});

test('6. an unrecognized focus area safely falls back to "other" without throwing', () => {
  assert.doesNotThrow(() => resultFor({ focusArea: 'not_a_real_focus' }));
});

test('7. CTAs match the existing-importer CTA set', () => {
  const result = resultFor({});
  const ctaIds = result.ctas.map((c) => c.id);
  assert.deepEqual(ctaIds, ['new-product-check', 'classification-check', 'regulation-check', 'documents-check', 'cost-check']);
});

test('8. the result is frozen', () => {
  assert.ok(Object.isFrozen(resultFor({})));
});

test('9. malformed input is handled safely', () => {
  assert.doesNotThrow(() => buildExistingImporterResult(null));
});

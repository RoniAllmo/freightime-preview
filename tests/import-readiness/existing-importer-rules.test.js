import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExistingImporterResult } from '../../js/import-readiness/existing-importer-rules.js';
import { normalizeReadinessInput } from '../../js/import-readiness/normalize-readiness-input.js';

function resultFor(raw) {
  return buildExistingImporterResult(normalizeReadinessInput(raw));
}

test('1. a new-product focus produces the combined classification-and-regulation recommendation', () => {
  const result = resultFor({ focusArea: 'new_product' });
  assert.equal(result.routeLabel, 'יבוא מסחרי קיים — בדיקת סיווג ורגולציה למוצר');
  assert.ok(result.primaryAction.includes('סיווג המכס ודרישות היבוא'));
});

test('2. customs-classification and regulation-and-permits focus areas produce the same combined recommendation (never two parallel services)', () => {
  const classification = resultFor({ focusArea: 'customs_classification' });
  const regulation = resultFor({ focusArea: 'regulation_and_permits' });
  assert.equal(classification.primaryAction, regulation.primaryAction);
  assert.equal(classification.routeLabel, regulation.routeLabel);
});

test('3. the combined classification/regulation result has exactly the five documented preparation items', () => {
  const result = resultFor({ focusArea: 'customs_classification' });
  assert.deepEqual(result.preparationItems, [
    'תיאור מסחרי מלא',
    'מפרט טכני או קטלוג',
    'תמונות המוצר והחיבורים',
    'דגם או מק"ט',
    'חשבון ספק, אם קיים',
  ]);
});

test('4. the combined result has one primary CTA (classification-and-regulation) and one secondary CTA (product docs)', () => {
  const result = resultFor({ focusArea: 'customs_classification' });
  assert.equal(result.primaryCta.label, 'בדיקת סיווג ורגולציה');
  assert.equal(result.secondaryCta.label, 'בדיקת מסמכי מוצר');
});

test('5. a cost-focused result does not include product-preparation content unrelated to costs', () => {
  const result = resultFor({ focusArea: 'taxes_and_costs' });
  assert.ok(!result.preparationItems.includes('תמונות המוצר והחיבורים'));
});

test('6. a delay-focused result stays scoped to the delay topic, with a distinct CTA', () => {
  const result = resultFor({ focusArea: 'clearance_delay' });
  assert.equal(result.primaryCta.label, 'תמיכה בשחרור');
});

test('7. an unrecognized focus area safely falls back to "other" without throwing', () => {
  assert.doesNotThrow(() => resultFor({ focusArea: 'not_a_real_focus' }));
});

test('8. every focus area produces exactly one primary CTA', () => {
  const focusAreas = ['new_product', 'new_supplier', 'customs_classification', 'regulation_and_permits', 'supplier_documents', 'taxes_and_costs', 'incoterms', 'sea_or_air_shipping', 'clearance_delay', 'additional_charges', 'other'];
  for (const focusArea of focusAreas) {
    const result = resultFor({ focusArea });
    assert.ok(result.primaryCta, `expected a primary CTA for focus area "${focusArea}"`);
  }
});

test('9. the result is frozen', () => {
  assert.ok(Object.isFrozen(resultFor({})));
});

test('10. malformed input is handled safely', () => {
  assert.doesNotThrow(() => buildExistingImporterResult(null));
});

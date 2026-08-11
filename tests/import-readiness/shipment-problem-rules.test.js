import test from 'node:test';
import assert from 'node:assert/strict';
import { buildShipmentProblemResult } from '../../js/import-readiness/shipment-problem-rules.js';
import { normalizeReadinessInput } from '../../js/import-readiness/normalize-readiness-input.js';

function resultFor(raw) {
  return buildShipmentProblemResult(normalizeReadinessInput(raw));
}

test('1. a missing-import-permit problem is marked urgent', () => {
  assert.equal(resultFor({ problemType: 'missing_import_permit' }).urgency, 'דחוף');
});

test('2. a missing-document problem is marked attention, not urgent', () => {
  assert.equal(resultFor({ problemType: 'missing_document' }).urgency, 'דורש תשומת לב');
});

test('3. storage, demurrage, and detention problems are marked urgent', () => {
  assert.equal(resultFor({ problemType: 'storage' }).urgency, 'דחוף');
  assert.equal(resultFor({ problemType: 'demurrage' }).urgency, 'דחוף');
  assert.equal(resultFor({ problemType: 'detention' }).urgency, 'דחוף');
});

test('4. an urgent problem\'s primary action begins with an immediate collection instruction', () => {
  const result = resultFor({ problemType: 'demurrage' });
  assert.ok(result.primaryAction.startsWith('יש לאסוף מיד'));
});

test('5. accumulating-cost flag is folded into the primary action for urgent problems', () => {
  const withFlag = resultFor({ problemType: 'demurrage', accumulatingCosts: true });
  const withoutFlag = resultFor({ problemType: 'demurrage', accumulatingCosts: false });
  assert.ok(withFlag.primaryAction.includes('להצטבר'));
  assert.ok(!withoutFlag.primaryAction.includes('להצטבר'));
});

test('6. urgent problems have both a primary and a secondary CTA (case review + timeline prep)', () => {
  const result = resultFor({ problemType: 'demurrage' });
  assert.ok(result.primaryCta);
  assert.ok(result.secondaryCta);
});

test('7. non-urgent problems have exactly one CTA, no secondary', () => {
  const result = resultFor({ problemType: 'missing_document' });
  assert.ok(result.primaryCta);
  assert.equal(result.secondaryCta, null);
});

test('8. preparation items never exceed five and reflect the data to gather', () => {
  const result = resultFor({ problemType: 'value_dispute' });
  assert.ok(result.preparationItems.length <= 5);
  assert.ok(result.preparationItems.some((i) => i.includes('חשבון מסחרי')));
});

test('9. the result never admits fault or assigns liability -- uses careful, non-committal wording', () => {
  const result = resultFor({ problemType: 'classification_dispute' });
  const text = JSON.stringify(result);
  const forbidden = ['אנו אחראים', 'הטעות שלנו', 'החברה אחראית', 'אנו מתחייבים'];
  for (const phrase of forbidden) {
    assert.ok(!text.includes(phrase), `unexpectedly contains liability-admitting phrase "${phrase}"`);
  }
});

test('10. no file upload is ever requested or implied', () => {
  const result = resultFor({ problemType: 'missing_document' });
  const text = JSON.stringify(result);
  assert.ok(!text.includes('העלאת קובץ'));
  assert.ok(!text.includes('upload'));
});

test('11. no unnecessary regulatory education appears in the default result', () => {
  const result = resultFor({ problemType: 'missing_document' });
  assert.ok(!result.primaryAction.includes('תעריף המכס'));
});

test('12. malformed input is handled safely', () => {
  assert.doesNotThrow(() => buildShipmentProblemResult(null));
});

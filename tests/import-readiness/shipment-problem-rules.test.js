import test from 'node:test';
import assert from 'node:assert/strict';
import { buildShipmentProblemResult } from '../../js/import-readiness/shipment-problem-rules.js';
import { normalizeReadinessInput } from '../../js/import-readiness/normalize-readiness-input.js';

function resultFor(raw) {
  return buildShipmentProblemResult(normalizeReadinessInput(raw));
}

test('1. a missing-import-permit problem is marked urgent', () => {
  const result = resultFor({ problemType: 'missing_import_permit' });
  assert.equal(result.sections.urgency, 'דחוף');
});

test('2. a missing-document problem is marked attention, not urgent', () => {
  const result = resultFor({ problemType: 'missing_document' });
  assert.equal(result.sections.urgency, 'דורש תשומת לב');
});

test('3. a customs-inspection problem identifies the customs broker as the party to check with', () => {
  const result = resultFor({ problemType: 'customs_inspection' });
  assert.ok(result.sections.partyToCheckWith.includes('עמיל המכס'));
});

test('4. storage and demurrage problems are marked urgent', () => {
  assert.equal(resultFor({ problemType: 'storage' }).sections.urgency, 'דחוף');
  assert.equal(resultFor({ problemType: 'demurrage' }).sections.urgency, 'דחוף');
});

test('5. detention problems are marked urgent', () => {
  assert.equal(resultFor({ problemType: 'detention' }).sections.urgency, 'דחוף');
});

test('6. a valuation dispute gathers the commercial invoice and payment evidence', () => {
  const result = resultFor({ problemType: 'value_dispute' });
  const text = JSON.stringify(result.sections.dataToGather);
  assert.ok(text.includes('חשבון מסחרי'));
});

test('7. accumulating-cost flag surfaces an explicit warning', () => {
  const result = resultFor({ problemType: 'demurrage', accumulatingCosts: true });
  assert.ok(result.sections.accumulatingCosts.length > 0);
});

test('8. no accumulating-cost warning appears when the flag is not set', () => {
  const result = resultFor({ problemType: 'missing_document', accumulatingCosts: false });
  assert.ok(!result.sections.accumulatingCosts || result.sections.accumulatingCosts.length === 0);
});

test('9. the result never admits fault or assigns liability -- uses careful, non-committal wording', () => {
  const result = resultFor({ problemType: 'classification_dispute' });
  const text = JSON.stringify(result);
  const forbidden = ['אנו אחראים', 'הטעות שלנו', 'החברה אחראית', 'אנו מתחייבים'];
  for (const phrase of forbidden) {
    assert.ok(!text.includes(phrase), `unexpectedly contains liability-admitting phrase "${phrase}"`);
  }
  assert.ok(text.includes('בהתאם למידע הקיים בשלב זה'));
});

test('10. no file upload is ever requested or implied', () => {
  const result = resultFor({ problemType: 'missing_document' });
  const text = JSON.stringify(result);
  assert.ok(!text.includes('העלאת קובץ'));
  assert.ok(!text.includes('upload'));
});

test('11. CTAs match the shipment-problem CTA set', () => {
  const result = resultFor({});
  const ctaIds = result.ctas.map((c) => c.id);
  assert.deepEqual(ctaIds, ['missing-docs-help', 'clearance-support', 'charge-check', 'storage-check', 'delay-help', 'professional-escalation']);
});

test('12. malformed input is handled safely', () => {
  assert.doesNotThrow(() => buildShipmentProblemResult(null));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEstablishedOperationResult } from '../../js/import-readiness/established-operation-rules.js';
import { normalizeReadinessInput } from '../../js/import-readiness/normalize-readiness-input.js';

function resultFor(raw) {
  return buildEstablishedOperationResult(normalizeReadinessInput(raw));
}

test('1. a classifications-audit purpose produces audit points and a recommended professional', () => {
  const result = resultFor({ auditPurpose: 'existing_classifications_audit' });
  assert.ok(result.sections.auditPoints.length > 0);
  assert.ok(result.sections.recommendedProfessional);
});

test('2. a penalty-exposure purpose surfaces exposures', () => {
  const result = resultFor({ auditPurpose: 'penalty_or_shortfall_exposure' });
  assert.ok(result.sections.exposures.length > 0);
});

test('3. an insurance-coverage-review purpose routes to the legal/insurance boundary message, never gives insurance advice directly', () => {
  const result = resultFor({ auditPurpose: 'insurance_coverage_review' });
  assert.ok(result.sections.recommendedProfessional.includes('FreighTime אינו מספק ייעוץ משפטי או ביטוחי'));
});

test('4. a legal-advice purpose routes to the legal/insurance boundary message, never gives legal advice directly', () => {
  const result = resultFor({ auditPurpose: 'legal_advice' });
  assert.ok(result.sections.recommendedProfessional.includes('עורך דין'));
});

test('5. this scenario never presents a high/partial/low readiness score', () => {
  const result = resultFor({ auditPurpose: 'existing_classifications_audit' });
  const text = JSON.stringify(result);
  assert.ok(!text.includes('readinessLevel'));
  assert.ok(!text.includes('"high"'));
  assert.ok(!text.includes('"partial"'));
  assert.ok(!text.includes('"low"'));
});

test('6. this scenario never presents itself as a compliance certificate', () => {
  const result = resultFor({ auditPurpose: 'document_process_audit' });
  const text = JSON.stringify(result);
  assert.ok(!text.includes('תעודת תאימות'));
  assert.ok(!text.includes('אישור עמידה'));
});

test('7. CTAs match the established-operation CTA set', () => {
  const result = resultFor({});
  const ctaIds = result.ctas.map((c) => c.id);
  assert.deepEqual(ctaIds, ['process-audit', 'classification-audit', 'exposure-audit', 'legal-advice', 'insurance-advice', 'brokerage-process-check']);
});

test('8. malformed input is handled safely', () => {
  assert.doesNotThrow(() => buildEstablishedOperationResult(null));
});

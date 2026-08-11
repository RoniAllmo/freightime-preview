import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEstablishedOperationResult } from '../../js/import-readiness/established-operation-rules.js';
import { normalizeReadinessInput } from '../../js/import-readiness/normalize-readiness-input.js';

function resultFor(raw) {
  return buildEstablishedOperationResult(normalizeReadinessInput(raw));
}

test('1. a classifications-audit purpose produces one specialist recommendation and a short document sample', () => {
  const result = resultFor({ auditPurpose: 'existing_classifications_audit' });
  assert.ok(result.primaryAction.includes('מסווג מכס מקצועי'));
  assert.ok(result.preparationItems.length > 0 && result.preparationItems.length <= 3);
});

test('2. a penalty-exposure purpose surfaces a concise risk reason, not a long exposure list', () => {
  const result = resultFor({ auditPurpose: 'penalty_or_shortfall_exposure' });
  assert.ok(result.primaryReason.length > 0);
});

test('3. an insurance-coverage-review purpose routes directly to the insurance-adviser recommendation, never gives insurance advice', () => {
  const result = resultFor({ auditPurpose: 'insurance_coverage_review' });
  assert.equal(result.primaryAction, 'פנייה ליועץ ביטוחי המתמחה בסיכוני הובלה ויבוא.');
  assert.ok(result.primaryReason.includes('אינו מספק ייעוץ ביטוחי'));
});

test('4. a legal-advice purpose routes directly to the legal-adviser recommendation, never gives legal advice', () => {
  const result = resultFor({ auditPurpose: 'legal_advice' });
  assert.equal(result.primaryAction, 'פנייה לייעוץ משפטי מתאים.');
  assert.ok(result.primaryReason.includes('אינו מספק ייעוץ משפטי'));
});

test('5. this scenario never presents a high/partial/low readiness score', () => {
  const result = resultFor({ auditPurpose: 'existing_classifications_audit' });
  const text = JSON.stringify(result);
  assert.ok(!text.includes('readinessLevel'));
});

test('6. this scenario never presents itself as a compliance certificate', () => {
  const result = resultFor({ auditPurpose: 'document_process_audit' });
  const text = JSON.stringify(result);
  assert.ok(!text.includes('תעודת תאימות'));
  assert.ok(!text.includes('אישור עמידה'));
});

test('7. every purpose produces exactly one primary CTA and no large service catalogue', () => {
  const purposes = ['existing_classifications_audit', 'regulation_and_permits_audit', 'document_process_audit', 'penalty_or_shortfall_exposure', 'storage_demurrage_charges', 'sale_terms_review', 'insurance_coverage_review', 'supplier_process_review', 'brokerage_and_clearance_process', 'legal_advice', 'other'];
  for (const auditPurpose of purposes) {
    const result = resultFor({ auditPurpose });
    assert.ok(result.primaryCta, `expected a primary CTA for purpose "${auditPurpose}"`);
    assert.equal(result.secondaryCta, null, `expected no secondary CTA for purpose "${auditPurpose}"`);
  }
});

test('8. malformed input is handled safely', () => {
  assert.doesNotThrow(() => buildEstablishedOperationResult(null));
});

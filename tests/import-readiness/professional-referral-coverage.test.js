/**
 * Tests for the professional-referral coverage expansion: cargo/
 * container damage, cargo shortage/loss, customs-classification
 * dispute and penalty, storage/demurrage/detention, insurance, and
 * carrier/forwarder disputes (issue families F-J). Includes the five
 * required product-owner acceptance cases.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildShipmentProblemResult } from '../../js/import-readiness/shipment-problem-rules.js';
import { normalizeReadinessInput } from '../../js/import-readiness/normalize-readiness-input.js';

function resultFor(raw) {
  return buildShipmentProblemResult(normalizeReadinessInput(raw));
}

const LIABILITY_PHRASES = ['אנו אחראים', 'הטעות שלנו', 'החברה אחראית', 'המוביל אחראי', 'המוביל התרשל', 'העמיל התרשל', 'העמיל אחראי'];
const COVERAGE_CONCLUSION_PHRASES = ['המקרה מכוסה', 'המקרה אינו מכוסה', 'הביטוח יכסה', 'הביטוח לא יכסה'];
const NEGLIGENCE_PHRASES = ['התרשל', 'רשלנות', 'אשם'];

function assertNoLiabilityOrCoverageClaims(result) {
  const text = JSON.stringify(result);
  for (const phrase of [...LIABILITY_PHRASES, ...COVERAGE_CONCLUSION_PHRASES]) {
    assert.ok(!text.includes(phrase), `unexpectedly contains "${phrase}"`);
  }
}

function assertAtMostOneSupportingProfessional(result) {
  assert.ok(result.professional, 'expected exactly one primary professional');
  if (result.supportingProfessional !== null) {
    assert.equal(typeof result.supportingProfessional.type, 'string');
    assert.ok(result.supportingProfessional.type.length > 0);
  }
}

// ---------------------------------------------------------------------
// Acceptance case 1: container cargo damage discovered after discharge.
// ---------------------------------------------------------------------
test('acceptance 1: cargo damage discovered after discharge at port routes to insurance broker/insurer + surveyor, urgent, no liability conclusion', () => {
  const result = resultFor({ problemType: 'cargo_or_container_damage', damageDiscoveryTiming: 'after_unloading_at_terminal' });
  assert.equal(result.urgency, 'דחוף');
  assert.match(result.professional.type, /ביטוח ימי|מבטח/);
  assert.ok(result.supportingProfessional);
  assert.match(result.supportingProfessional.type, /שמאי ימי/);
  const actionsText = result.immediateActions.join(' ');
  assert.match(actionsText, /תיעוד|תמונ/);
  assert.match(actionsText, /שמיר/);
  assert.match(result.primaryAction + actionsText, /דיווח.*דיחוי|ללא דיחוי/);
  assert.ok(result.deadlineWarning && result.deadlineWarning.includes('מועד'));
  assertNoLiabilityOrCoverageClaims(result);
  assertAtMostOneSupportingProfessional(result);
});

// ---------------------------------------------------------------------
// Acceptance case 2: incorrect classification + large penalty/deficit.
// ---------------------------------------------------------------------
test('acceptance 2: large customs penalty routes to customs-tax lawyer primary, classifier/broker supporting, urgent, no negligence claim', () => {
  const result = resultFor({
    problemType: 'customs_penalty_or_deficit_demand',
    financialExposure: 'high',
    hasWrittenNotice: true,
  });
  assert.equal(result.urgency, 'דחוף');
  assert.match(result.professional.type, /עורך דין.*מכס|מכס.*עורך דין/);
  assert.ok(result.supportingProfessional);
  assert.match(result.supportingProfessional.type, /מסווג מכס|עמיל מכס/);
  const actionsText = result.immediateActions.join(' ');
  assert.match(actionsText, /שמיר.*הודע|הודע.*שמיר/);
  assert.match(actionsText, /מועד/);
  assert.match(actionsText, /מסמכ/);
  assert.match(actionsText, /הודא/);
  assert.match(actionsText, /היסטורי/);
  assert.ok(result.deadlineWarning);
  assertNoLiabilityOrCoverageClaims(result);
  for (const phrase of NEGLIGENCE_PHRASES) {
    assert.ok(!JSON.stringify(result).includes(phrase), `unexpectedly contains "${phrase}"`);
  }
  assertAtMostOneSupportingProfessional(result);
});

// ---------------------------------------------------------------------
// Acceptance case 3: demurrage accumulating due to missing release doc.
// ---------------------------------------------------------------------
test('acceptance 3: accumulating demurrage with missing release document routes to forwarder/carrier primary, customs broker supporting, urgent', () => {
  const result = resultFor({ problemType: 'demurrage', accumulatingCosts: true, customsClearanceInvolved: true });
  assert.equal(result.urgency, 'דחוף');
  assert.match(result.professional.type, /עמיל מכס|גורם תפעולי/);
  assert.ok(result.supportingProfessional);
  assert.match(result.supportingProfessional.type, /עמיל מכס מורשה/);
  assert.ok(result.accumulatingCostWarning);
  assertAtMostOneSupportingProfessional(result);
});

// ---------------------------------------------------------------------
// Acceptance case 4: insurance company rejected a cargo-damage claim.
// ---------------------------------------------------------------------
test('acceptance 4: rejected insurance claim routes to insurance-claims lawyer primary, broker/surveyor supporting', () => {
  const result = resultFor({ problemType: 'insurance_issue', insuranceSubScenario: 'rejected_claim' });
  assert.match(result.professional.type, /עורך דין.*ביטוח|ביטוח.*עורך דין/);
  assert.ok(result.supportingProfessional);
  assert.match(result.supportingProfessional.type, /ביטוח ימי|שמאי ימי/);
  assertNoLiabilityOrCoverageClaims(result);
  assertAtMostOneSupportingProfessional(result);
});

// ---------------------------------------------------------------------
// Acceptance case 5: first commercial import of a regulated product.
// ---------------------------------------------------------------------
test('acceptance 5: technically-regulated first commercial import routes to classifier/regulation specialist, no lawyer by default', async () => {
  const { buildFirstCommercialImportResult } = await import('../../js/import-readiness/first-commercial-import-rules.js');
  const result = buildFirstCommercialImportResult(normalizeReadinessInput({ sensitiveCategory: 'electrical' }));
  assert.match(result.professional.type, /מסווג מכס|מומחה רגולציה/);
  assert.ok(!result.professional.type.includes('עורך דין'));
  assert.ok(result.supportingProfessional === null || !result.supportingProfessional.type.includes('עורך דין'));
});

// ---------------------------------------------------------------------
// Family/routing correctness
// ---------------------------------------------------------------------

test('cargo damage: at most one primary and one supporting professional, never four or five', () => {
  const result = resultFor({ problemType: 'cargo_or_container_damage', damageDiscoveryTiming: 'after_delivery' });
  assertAtMostOneSupportingProfessional(result);
});

test('cargo damage with a safety risk gets safety-first handling, not routine insurance framing, and no technical instructions', () => {
  const result = resultFor({ problemType: 'cargo_or_container_damage', safetyRisk: true });
  assert.equal(result.urgency, 'דחוף');
  assert.match(result.professional.type, /טובין מסוכנים/);
  assert.ok(!result.primaryAction.includes('לפתוח'));
  assert.ok(!result.primaryAction.includes('לתקן'));
});

test('cargo shortage/loss without insurance routes to freight forwarder, not insurance', () => {
  const result = resultFor({ problemType: 'cargo_shortage_or_loss', hasInsurance: 'no' });
  assert.match(result.professional.type, /משלח בינלאומי/);
});

test('cargo shortage/loss with insurance present routes to insurance primary, forwarder supporting', () => {
  const result = resultFor({ problemType: 'cargo_shortage_or_loss', hasInsurance: 'yes' });
  assert.match(result.professional.type, /ביטוח ימי|מבטח/);
  assert.match(result.supportingProfessional.type, /משלח בינלאומי/);
});

test('a plain classification disagreement (no penalty, no financial demand) never routes to a lawyer', () => {
  const result = resultFor({ problemType: 'customs_penalty_or_deficit_demand', financialExposure: 'low', goodsHeld: false });
  assert.ok(!result.professional.type.includes('עורך דין'));
  assert.match(result.professional.type, /מסווג מכס|עמיל מכס/);
});

test('customs penalty escalates to legal review when goods are held, even with unknown financial exposure', () => {
  const result = resultFor({ problemType: 'customs_penalty_or_deficit_demand', financialExposure: 'unknown', goodsHeld: true });
  assert.match(result.professional.type, /עורך דין/);
  assert.equal(result.urgency, 'דחוף');
});

test('storage/demurrage/detention: a purely operational delay never auto-routes to a lawyer', () => {
  for (const problemType of ['storage', 'demurrage', 'detention']) {
    const result = resultFor({ problemType });
    assert.ok(!result.professional.type.includes('עורך דין'));
  }
});

test('storage/demurrage/detention: customs clearance involvement adds the customs broker as supporting, not primary', () => {
  const result = resultFor({ problemType: 'storage', customsClearanceInvolved: true });
  assert.ok(result.supportingProfessional);
  assert.match(result.supportingProfessional.type, /עמיל מכס מורשה/);
});

test('insurance routes never claim coverage exists or is excluded', () => {
  for (const insuranceSubScenario of ['notification_of_loss', 'damage_assessment', 'coverage_dispute', 'rejected_claim', 'pre_shipment_risk_review', 'lack_of_insurance', 'underinsurance_or_deductible']) {
    const result = resultFor({ problemType: 'insurance_issue', insuranceSubScenario });
    assertNoLiabilityOrCoverageClaims(result);
  }
});

test('insurance pre-shipment risk review is not urgent by default', () => {
  const result = resultFor({ problemType: 'insurance_issue', insuranceSubScenario: 'pre_shipment_risk_review' });
  assert.equal(result.urgency, 'דורש תשומת לב');
});

test('carrier dispute: an operational issue routes to the freight forwarder, never a lawyer', () => {
  const result = resultFor({ problemType: 'carrier_or_forwarder_dispute', disputeStage: 'operational_issue' });
  assert.match(result.professional.type, /משלח בינלאומי/);
  assert.ok(!result.professional.type.includes('עורך דין'));
});

test('carrier dispute: a claim-required stage routes to the shipment-mode-specific claims department', () => {
  const sea = resultFor({ problemType: 'carrier_or_forwarder_dispute', disputeStage: 'claim_required', shipmentMode: 'sea' });
  assert.match(sea.professional.type, /חברת הספנות/);
  const air = resultFor({ problemType: 'carrier_or_forwarder_dispute', disputeStage: 'claim_required', shipmentMode: 'air' });
  assert.match(air.professional.type, /חברת התעופה/);
  const courier = resultFor({ problemType: 'carrier_or_forwarder_dispute', disputeStage: 'claim_required', shipmentMode: 'courier' });
  assert.match(courier.professional.type, /שילוח המהיר/);
});

test('carrier dispute: a significant dispute or legal notice routes to the transport/maritime lawyer, not the customs lawyer', () => {
  const result = resultFor({ problemType: 'carrier_or_forwarder_dispute', disputeStage: 'legal_notice_received' });
  assert.match(result.professional.type, /הובלה ימית/);
  assert.ok(!result.professional.type.includes('מכס'));
});

test('never assigns fault or states a party breached the contract in carrier disputes', () => {
  const result = resultFor({ problemType: 'carrier_or_forwarder_dispute', disputeStage: 'significant_dispute' });
  const text = JSON.stringify(result);
  assert.ok(!text.includes('הפר את החוזה'));
  assert.ok(!text.includes('אשם'));
});

test('no result ever invents a definitive legal deadline -- deadline warnings are always conditional', () => {
  const results = [
    resultFor({ problemType: 'cargo_or_container_damage' }),
    resultFor({ problemType: 'customs_penalty_or_deficit_demand', financialExposure: 'high' }),
    resultFor({ problemType: 'carrier_or_forwarder_dispute', disputeStage: 'legal_notice_received' }),
    resultFor({ problemType: 'insurance_issue' }),
  ];
  for (const result of results) {
    if (result.deadlineWarning) {
      assert.ok(/אם |ייתכנו |עשוי/.test(result.deadlineWarning), `deadline warning is not conditional: "${result.deadlineWarning}"`);
    }
  }
});

test('evidence-preservation guidance appears for cargo damage and customs disputes', () => {
  const damage = resultFor({ problemType: 'cargo_or_container_damage' });
  assert.ok(damage.preparationItems.some((item) => /תיעוד|תמונ/.test(item)));
  const penalty = resultFor({ problemType: 'customs_penalty_or_deficit_demand', financialExposure: 'high' });
  assert.ok(penalty.preparationItems.length > 0);
});

test('high financial exposure increases urgency for customs disputes', () => {
  const low = resultFor({ problemType: 'customs_penalty_or_deficit_demand', financialExposure: 'low', hasWrittenNotice: false, goodsHeld: false });
  const high = resultFor({ problemType: 'customs_penalty_or_deficit_demand', financialExposure: 'high', goodsHeld: false });
  assert.equal(low.urgency, 'דורש תשומת לב');
  assert.equal(high.urgency, 'דחוף');
});

test('accumulating cost increases urgency (storage/demurrage/detention family)', () => {
  const result = resultFor({ problemType: 'storage', accumulatingCosts: true });
  assert.equal(result.urgency, 'דחוף');
  assert.ok(result.accumulatingCostWarning);
});

test('notification parties are rendered as a plain list, never as extra professional objects', () => {
  const result = resultFor({ problemType: 'cargo_or_container_damage', damageDiscoveryTiming: 'after_delivery' });
  assert.ok(Array.isArray(result.notificationParties));
  for (const party of result.notificationParties) {
    assert.equal(typeof party, 'string');
  }
});

test('never more than 5 preparation items and never more than 5 immediate actions', () => {
  const results = [
    resultFor({ problemType: 'cargo_or_container_damage' }),
    resultFor({ problemType: 'customs_penalty_or_deficit_demand', financialExposure: 'high' }),
    resultFor({ problemType: 'insurance_issue' }),
    resultFor({ problemType: 'carrier_or_forwarder_dispute', disputeStage: 'legal_notice_received' }),
  ];
  for (const result of results) {
    assert.ok(result.preparationItems.length <= 5);
    assert.ok(result.immediateActions.length <= 5);
  }
});

test('malformed input for every new problem type is handled safely', () => {
  for (const problemType of ['cargo_or_container_damage', 'cargo_shortage_or_loss', 'customs_penalty_or_deficit_demand', 'insurance_issue', 'carrier_or_forwarder_dispute']) {
    assert.doesNotThrow(() => resultFor({ problemType }));
  }
  assert.doesNotThrow(() => buildShipmentProblemResult(null));
  assert.doesNotThrow(() => buildShipmentProblemResult(undefined));
});

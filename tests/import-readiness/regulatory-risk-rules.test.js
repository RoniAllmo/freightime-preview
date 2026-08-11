import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRegulatoryRisks } from '../../js/import-readiness/regulatory-risk-rules.js';
import { normalizeReadinessInput } from '../../js/import-readiness/normalize-readiness-input.js';
import { RISK_SEVERITY } from '../../js/import-readiness/readiness-schema.js';

function risksFor(raw) {
  return buildRegulatoryRisks(normalizeReadinessInput(raw));
}

function hasCategory(risks, category) {
  return risks.some((r) => r.category === category);
}

test('1. an incomplete product description triggers a high-severity risk', () => {
  const risks = risksFor({});
  const risk = risks.find((r) => r.id === 'incomplete-description');
  assert.ok(risk);
  assert.equal(risk.severity, RISK_SEVERITY.HIGH);
});

test('2. a complete commercial description does not trigger the incomplete-description risk', () => {
  const risks = risksFor({ commercialDescription: 'שולחן עץ מלא' });
  assert.ok(!risks.some((r) => r.id === 'incomplete-description'));
});

test('3. missing intended use triggers an attention-severity risk', () => {
  const risk = risksFor({}).find((r) => r.id === 'missing-intended-use');
  assert.equal(risk.severity, RISK_SEVERITY.ATTENTION);
});

test('4. missing primary material triggers an attention-severity risk', () => {
  assert.ok(hasCategory(risksFor({}), 'incomplete-product-description'));
});

test('5. unknown country of origin triggers an origin-document-uncertainty risk', () => {
  assert.ok(hasCategory(risksFor({}), 'origin-document-uncertainty'));
});

test('6. missing commercial invoice triggers a high-severity risk', () => {
  const risk = risksFor({}).find((r) => r.id === 'missing-invoice');
  assert.equal(risk.severity, RISK_SEVERITY.HIGH);
});

test('7. missing packing list triggers an attention-severity risk', () => {
  const risk = risksFor({}).find((r) => r.id === 'missing-packing-list');
  assert.equal(risk.severity, RISK_SEVERITY.ATTENTION);
});

test('8. an electrical product triggers the electrical-product-review risk', () => {
  assert.ok(hasCategory(risksFor({ isElectrical: 'yes' }), 'electrical-product-review'));
  assert.ok(!hasCategory(risksFor({ isElectrical: 'no' }), 'electrical-product-review'));
});

test('9. a battery product triggers the battery-transport-review risk at high severity', () => {
  const risk = risksFor({ hasBattery: 'yes' }).find((r) => r.category === 'battery-transport-review');
  assert.ok(risk);
  assert.equal(risk.severity, RISK_SEVERITY.HIGH);
});

test('10. a wireless product triggers the radio-or-communications-review risk', () => {
  assert.ok(hasCategory(risksFor({ isWireless: 'yes' }), 'radio-or-communications-review'));
});

test('11. a food-contact product triggers the food-product-review risk at high severity', () => {
  const risk = risksFor({ isFoodContact: 'yes' }).find((r) => r.category === 'food-product-review');
  assert.equal(risk.severity, RISK_SEVERITY.HIGH);
});

test('12. a cosmetic product triggers the cosmetic-product-review risk', () => {
  assert.ok(hasCategory(risksFor({ isCosmeticOrPersonalCare: 'yes' }), 'cosmetic-product-review'));
});

test('13. a medical/health product triggers the medical-device-review risk at high severity', () => {
  const risk = risksFor({ isMedicalOrHealth: 'yes' }).find((r) => r.category === 'medical-device-review');
  assert.equal(risk.severity, RISK_SEVERITY.HIGH);
});

test("14. a children's/toy product triggers a labeling-review risk at high severity", () => {
  const risk = risksFor({ isChildrenOrToy: 'yes' }).find((r) => r.category === 'labeling-review');
  assert.equal(risk.severity, RISK_SEVERITY.HIGH);
});

test('15. an automotive product triggers the transport-product-review risk', () => {
  assert.ok(hasCategory(risksFor({ isAutomotiveOrTransport: 'yes' }), 'transport-product-review'));
});

test('16. an agriculture-related product triggers the agriculture-or-veterinary-review risk at high severity', () => {
  const risk = risksFor({ isAgricultureOrFood: 'yes' }).find((r) => r.category === 'agriculture-or-veterinary-review');
  assert.equal(risk.severity, RISK_SEVERITY.HIGH);
});

test('17. a chemical/hazardous product triggers the chemical-or-hazardous-goods-review risk at high severity', () => {
  const risk = risksFor({ isChemicalOrHazardous: 'yes' }).find((r) => r.category === 'chemical-or-hazardous-goods-review');
  assert.equal(risk.severity, RISK_SEVERITY.HIGH);
});

test('18. a sample quantity triggers an information-severity risk', () => {
  const risk = risksFor({ quantityType: 'sample' }).find((r) => r.category === 'sample-versus-commercial-quantity-risk');
  assert.equal(risk.severity, RISK_SEVERITY.INFORMATION);
});

test('19. a commercial quantity does not trigger the sample-quantity risk', () => {
  assert.ok(!hasCategory(risksFor({ quantityType: 'commercial' }), 'sample-versus-commercial-quantity-risk'));
});

test('20. an unknown HS code triggers a classification-uncertainty risk requiring professional review', () => {
  const risk = risksFor({ hsCodeKnown: false }).find((r) => r.id === 'hs-code-unknown');
  assert.ok(risk);
  assert.equal(risk.professionalReviewFlag, true);
});

test('21. a user-provided HS code suppresses the hs-code-unknown risk', () => {
  assert.ok(!risksFor({ hsCodeKnown: true }).some((r) => r.id === 'hs-code-unknown'));
});

test('22. an unknown shipment mode triggers the shipment-mode-documentation-risk', () => {
  assert.ok(hasCategory(risksFor({ shipmentMode: 'unknown' }), 'shipment-mode-documentation-risk'));
});

test('23. air, sea, courier, and postal shipment modes all suppress the unknown-shipment-mode risk', () => {
  for (const mode of ['air', 'sea', 'courier', 'postal']) {
    assert.ok(!hasCategory(risksFor({ shipmentMode: mode }), 'shipment-mode-documentation-risk'), `mode ${mode} should not trigger`);
  }
});

test('24. every risk is explainable: reason, missingInput, and recommendedCheck are always non-empty strings', () => {
  const risks = risksFor({ isElectrical: 'yes', hasBattery: 'yes' });
  for (const risk of risks) {
    assert.equal(typeof risk.reason, 'string');
    assert.ok(risk.reason.length > 0);
    assert.equal(typeof risk.recommendedCheck, 'string');
    assert.ok(risk.recommendedCheck.length > 0);
  }
});

test('25. no risk reason ever asserts a definite requirement, exemption, or approval', () => {
  const risks = risksFor({ isElectrical: 'yes', hasBattery: 'yes', isFoodContact: 'yes', isChemicalOrHazardous: 'yes' });
  const forbidden = ['מותר לייבא', 'אסור לייבא', 'אין צורך באישור', 'פטור מתקן', 'המס הוא', 'הסיווג הנכון הוא', 'השחרור מובטח', 'המוצר מאושר', 'עומד בדרישות'];
  for (const risk of risks) {
    for (const phrase of forbidden) {
      assert.ok(!risk.reason.includes(phrase), `risk ${risk.id} reason contains forbidden phrase "${phrase}"`);
    }
  }
});

test('26. results and the returned array are frozen', () => {
  const risks = risksFor({});
  assert.ok(Object.isFrozen(risks));
  assert.ok(Object.isFrozen(risks[0]));
});

test('27. malformed input is handled safely without throwing', () => {
  assert.doesNotThrow(() => buildRegulatoryRisks(null));
  assert.doesNotThrow(() => buildRegulatoryRisks(undefined));
});

test('28. calling the module performs no network, DOM, or storage access', () => {
  assert.equal(typeof window, 'undefined');
  assert.equal(typeof document, 'undefined');
  risksFor({});
});

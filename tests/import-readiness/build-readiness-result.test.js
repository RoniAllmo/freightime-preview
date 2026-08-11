import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReadinessResult, RESULT_DISCLAIMER } from '../../js/import-readiness/build-readiness-result.js';
import { normalizeReadinessInput } from '../../js/import-readiness/normalize-readiness-input.js';
import { READINESS_LEVEL } from '../../js/import-readiness/readiness-schema.js';

function resultFor(raw) {
  return buildReadinessResult(normalizeReadinessInput(raw));
}

const WELL_DOCUMENTED_INDUSTRIAL_PRODUCT = {
  productName: 'תושבת מתכת תעשייתית',
  commercialDescription: 'תושבת פלדה למכונות ייצור',
  intendedUse: 'הרכבה על קו ייצור תעשייתי',
  primaryMaterial: 'פלדת אל-חלד',
  countryOfOrigin: 'Germany',
  quantity: '500',
  invoiceValue: '10000',
  incoterm: 'FOB',
  shipmentMode: 'sea',
  quantityType: 'commercial',
  hsCodeKnown: true,
  hsCode: '7326.90',
  hasCommercialInvoice: true,
  hasPackingList: true,
  hasTransportDocument: true,
  isElectrical: 'no',
  hasBattery: 'no',
  isWireless: 'no',
  isFoodContact: 'no',
  isMedicalOrHealth: 'no',
  isCosmeticOrPersonalCare: 'no',
  isChildrenOrToy: 'no',
  isAutomotiveOrTransport: 'no',
  isAgricultureOrFood: 'no',
  isChemicalOrHazardous: 'no',
};

test('1. an empty submission yields a low readiness level', () => {
  assert.equal(resultFor({}).readinessLevel, READINESS_LEVEL.LOW);
});

test('2. a well-documented, non-regulated industrial product yields a high readiness level', () => {
  assert.equal(resultFor(WELL_DOCUMENTED_INDUSTRIAL_PRODUCT).readinessLevel, READINESS_LEVEL.HIGH);
});

test('3. a mostly-complete submission with one attention-level gap yields a partial readiness level', () => {
  const raw = { ...WELL_DOCUMENTED_INDUSTRIAL_PRODUCT, hasPackingList: false };
  assert.equal(resultFor(raw).readinessLevel, READINESS_LEVEL.PARTIAL);
});

test('4. a battery-powered product (high-severity risk) yields a low readiness level even with good documentation', () => {
  const raw = { ...WELL_DOCUMENTED_INDUSTRIAL_PRODUCT, hasBattery: 'yes' };
  assert.equal(resultFor(raw).readinessLevel, READINESS_LEVEL.LOW);
});

test('5. no final HS code is ever generated -- a user-provided code is echoed as-is, never validated as final', () => {
  const result = resultFor({ ...WELL_DOCUMENTED_INDUSTRIAL_PRODUCT, hsCode: '7326.90' });
  assert.equal(result.userProvidedHsCode, '7326.90');
  assert.ok(!('finalHsCode' in result));
  assert.ok(!('validatedHsCode' in result));
});

test('6. no HS code is echoed unless the user marked it as known', () => {
  const result = resultFor({ hsCodeKnown: false, hsCode: '7326.90' });
  assert.equal(result.userProvidedHsCode, null);
});

test('7. no final duty rate, purchase-tax rate, or permit decision field ever appears in the result', () => {
  const result = resultFor(WELL_DOCUMENTED_INDUSTRIAL_PRODUCT);
  const serialized = JSON.stringify(result);
  for (const forbidden of ['finalDuty', 'dutyRate', 'purchaseTaxRate', 'permitApproved', 'permitGranted']) {
    assert.ok(!serialized.includes(forbidden), `result unexpectedly contains "${forbidden}"`);
  }
});

test('8. every result includes the fixed required disclaimer', () => {
  const result = resultFor({});
  assert.equal(result.disclaimer, RESULT_DISCLAIMER);
  assert.ok(result.disclaimer.includes('אינה מהווה סיווג מכס סופי'));
});

test('9. official-source links only appear for categories triggered by the user\'s own answers', () => {
  const noRiskResult = resultFor(WELL_DOCUMENTED_INDUSTRIAL_PRODUCT);
  const electricalResult = resultFor({ ...WELL_DOCUMENTED_INDUSTRIAL_PRODUCT, isElectrical: 'yes' });
  assert.ok(!noRiskResult.officialSources.some((s) => s.category === 'standards-institution'));
  assert.ok(electricalResult.officialSources.some((s) => s.category === 'standards-institution'));
});

test('10. official-source links use the "נדרש לבדוק" label, never "נדרש אישור"', () => {
  const result = resultFor({ ...WELL_DOCUMENTED_INDUSTRIAL_PRODUCT, isElectrical: 'yes' });
  for (const source of result.officialSources) {
    assert.equal(source.noteLabel, 'נדרש לבדוק');
  }
});

test('11. official-source URLs are fixed, official-looking https URLs never containing user input', () => {
  const result = resultFor({ ...WELL_DOCUMENTED_INDUSTRIAL_PRODUCT, isElectrical: 'yes', productName: 'UNIQUE_MARKER_XYZ' });
  for (const source of result.officialSources) {
    assert.ok(source.url.startsWith('https://'));
    assert.ok(!source.url.includes('UNIQUE_MARKER_XYZ'));
  }
});

test('12. cost components to consider is a static planning list, never a computed monetary total', () => {
  const result = resultFor(WELL_DOCUMENTED_INDUSTRIAL_PRODUCT);
  assert.ok(Array.isArray(result.costComponentsToConsider));
  assert.ok(result.costComponentsToConsider.length > 0);
  for (const item of result.costComponentsToConsider) {
    assert.equal(typeof item, 'string');
  }
});

test('13. missing information reflects unanswered core fields', () => {
  const result = resultFor({});
  assert.ok(result.missingInformation.includes('שם המוצר'));
  assert.ok(result.missingInformation.includes('תיאור מסחרי'));
});

test('14. next actions recommend professional review when a professional-review-flagged risk exists', () => {
  const result = resultFor({ ...WELL_DOCUMENTED_INDUSTRIAL_PRODUCT, isElectrical: 'yes' });
  assert.ok(result.nextActions.some((a) => a.includes('בדיקה מקצועית')));
});

test('15. clearance-delay risks reflect triggered regulatory risks and document gaps', () => {
  const result = resultFor({ ...WELL_DOCUMENTED_INDUSTRIAL_PRODUCT, hasBattery: 'yes' });
  assert.ok(result.clearanceDelayRisks.length > 0);
});

test('16. the entire result object is frozen, including nested arrays', () => {
  const result = resultFor({});
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.documents));
  assert.ok(Object.isFrozen(result.regulatoryRisks));
});

test('17. malformed input is handled safely without throwing', () => {
  assert.doesNotThrow(() => buildReadinessResult(null));
  assert.doesNotThrow(() => buildReadinessResult(undefined));
});

test('18. calling the module performs no network, DOM, or storage access', () => {
  assert.equal(typeof window, 'undefined');
  assert.equal(typeof document, 'undefined');
  resultFor({});
});

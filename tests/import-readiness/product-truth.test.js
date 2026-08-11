import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeReadinessInput } from '../../js/import-readiness/normalize-readiness-input.js';
import { buildPersonalImportResult } from '../../js/import-readiness/personal-import-rules.js';
import { buildFirstCommercialImportResult } from '../../js/import-readiness/first-commercial-import-rules.js';
import { buildExistingImporterResult } from '../../js/import-readiness/existing-importer-rules.js';
import { buildEstablishedOperationResult } from '../../js/import-readiness/established-operation-rules.js';
import { buildShipmentProblemResult } from '../../js/import-readiness/shipment-problem-rules.js';

const ALL_RESULTS = [
  buildPersonalImportResult(normalizeReadinessInput({ sensitiveCategory: 'food' })),
  buildFirstCommercialImportResult(normalizeReadinessInput({ hsCodeKnown: true, hsCode: '1234.56' })),
  buildExistingImporterResult(normalizeReadinessInput({ focusArea: 'customs_classification' })),
  buildEstablishedOperationResult(normalizeReadinessInput({ auditPurpose: 'insurance_coverage_review' })),
  buildShipmentProblemResult(normalizeReadinessInput({ problemType: 'classification_dispute' })),
];

test('1. no result ever generates a final HS code, duty rate, or tax field', () => {
  for (const result of ALL_RESULTS) {
    const text = JSON.stringify(result);
    for (const forbidden of ['finalHsCode', 'finalDutyRate', 'finalTax', 'dutyRate', 'taxRate']) {
      assert.ok(!text.includes(forbidden), `unexpectedly contains "${forbidden}"`);
    }
  }
});

test('2. no result ever asserts a final legality, permit, or standards decision', () => {
  const forbidden = ['מותר לייבא', 'אסור לייבא', 'אין צורך באישור', 'פטור מתקן', 'המוצר מאושר', 'עומד בדרישות', 'ההיתר אושר'];
  for (const result of ALL_RESULTS) {
    const text = JSON.stringify(result);
    for (const phrase of forbidden) {
      assert.ok(!text.includes(phrase), `unexpectedly contains "${phrase}"`);
    }
  }
});

test('3. personal import is never described with an unconditional exemption guarantee', () => {
  const personal = buildPersonalImportResult(normalizeReadinessInput({}));
  const text = JSON.stringify(personal);
  assert.ok(!text.includes('פטור אוטומטית מ') || text.includes('אינו פטור אוטומטית'));
});

test('4. established-operation results never include a readiness/compliance score', () => {
  const established = buildEstablishedOperationResult(normalizeReadinessInput({}));
  const text = JSON.stringify(established);
  assert.ok(!text.includes('readinessLevel'));
});

test('5. no result claims a technical detail alone determines classification', () => {
  for (const result of ALL_RESULTS) {
    const text = JSON.stringify(result);
    assert.ok(!text.includes('קובע את הסיווג'));
    assert.ok(!text.includes('המתח קובע'));
    assert.ok(!text.includes('ההרכב קובע'));
  }
});

test('6. every result includes the professional-review/disclaimer boundary', () => {
  for (const result of ALL_RESULTS) {
    assert.ok(typeof result.disclaimer === 'string' && result.disclaimer.length > 0);
    assert.ok(result.disclaimer.includes('FreighTime אינו קובע'));
  }
});

test('7. no result ever gives legal or insurance advice directly -- only routes to a professional', () => {
  for (const result of ALL_RESULTS) {
    const text = JSON.stringify(result);
    assert.ok(!text.includes('החוק קובע ש'));
    assert.ok(!text.includes('הפוליסה מכסה'));
  }
});

test('8. no result ever guarantees import approval or customs clearance', () => {
  for (const result of ALL_RESULTS) {
    const text = JSON.stringify(result);
    assert.ok(!text.includes('השחרור מובטח'));
    assert.ok(!text.includes('היבוא מובטח'));
    assert.ok(!text.includes('האישור מובטח'));
  }
});

test('9. every result is frozen', () => {
  for (const result of ALL_RESULTS) {
    assert.ok(Object.isFrozen(result));
  }
});

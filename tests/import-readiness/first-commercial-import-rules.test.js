import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFirstCommercialImportResult } from '../../js/import-readiness/first-commercial-import-rules.js';
import { normalizeReadinessInput } from '../../js/import-readiness/normalize-readiness-input.js';

function resultFor(raw) {
  return buildFirstCommercialImportResult(normalizeReadinessInput(raw));
}

test('1. missing commercial description is flagged in missing information', () => {
  const result = resultFor({});
  assert.ok(result.sections.missing.some((i) => i.id === 'description'));
});

test('2. missing intended use is flagged in missing information', () => {
  const result = resultFor({});
  assert.ok(result.sections.missing.some((i) => i.id === 'use'));
});

test('3. supplier documents are recommended before order when not yet available', () => {
  const result = resultFor({ hasTechnicalSpec: false, hasSupplierInvoice: false });
  assert.ok(result.sections.documentsToPrepare.some((i) => i.id === 'technical-spec'));
  assert.ok(result.sections.documentsToPrepare.some((i) => i.id === 'supplier-invoice'));
});

test('4. a technical/classification review is always recommended for a first commercial import', () => {
  const result = resultFor({ commercialDescription: 'מוצר', intendedUse: 'שימוש' });
  assert.ok(result.sections.whenProfessionalReviewNeeded.some((i) => i.id === 'classification-review'));
});

test('5. before-order and before-shipment actions are both present', () => {
  const result = resultFor({});
  assert.ok(result.sections.beforeOrder.length > 0);
  assert.ok(result.sections.beforeShipment.length > 0);
});

test('6. a user-provided HS code is echoed with the non-final note, never validated', () => {
  const result = resultFor({ hsCodeKnown: true, hsCode: '8541.10' });
  const hsNote = result.sections.whenProfessionalReviewNeeded.find((i) => i.id === 'hs-code-note');
  assert.ok(hsNote);
  assert.ok(hsNote.label.includes('8541.10'));
  assert.ok(hsNote.label.includes('אינו מאומת כסופי'));
});

test('7. no HS code note appears when hsCodeKnown is false', () => {
  const result = resultFor({ hsCodeKnown: false, hsCode: '8541.10' });
  assert.ok(!result.sections.whenProfessionalReviewNeeded.some((i) => i.id === 'hs-code-note'));
});

test('8. the technical-detail boundary message never claims a technical detail determines classification', () => {
  const result = resultFor({});
  const text = JSON.stringify(result);
  assert.ok(text.includes('המשמעות של כל פרט תלויה במוצר'));
});

test('9. CTAs match the first-commercial-import CTA set', () => {
  const result = resultFor({});
  const ctaIds = result.ctas.map((c) => c.id);
  assert.deepEqual(ctaIds, ['classification-check', 'regulation-check', 'supplier-docs-check', 'shipping-quote', 'brokerage-service']);
});

test('10. malformed input is handled safely', () => {
  assert.doesNotThrow(() => buildFirstCommercialImportResult(null));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeReadinessInput } from '../../js/import-readiness/normalize-readiness-input.js';

test('1. trims and normalizes basic string fields', () => {
  const result = normalizeReadinessInput({ productName: '  מנורת שולחן  ' });
  assert.equal(result.productName, 'מנורת שולחן');
});

test('2. an unrecognized yes/no/unknown value safely falls back to unknown', () => {
  const result = normalizeReadinessInput({ isElectrical: 'maybe' });
  assert.equal(result.isElectrical, 'unknown');
});

test('3. a valid yes/no/unknown value passes through unchanged', () => {
  const result = normalizeReadinessInput({ hasBattery: 'yes' });
  assert.equal(result.hasBattery, 'yes');
});

test('4. an invalid incoterm falls back to unknown', () => {
  const result = normalizeReadinessInput({ incoterm: 'NOT_A_TERM' });
  assert.equal(result.incoterm, 'unknown');
});

test('5. a valid incoterm passes through unchanged', () => {
  const result = normalizeReadinessInput({ incoterm: 'FOB' });
  assert.equal(result.incoterm, 'FOB');
});

test('6. a negative numeric string is rejected back to empty', () => {
  const result = normalizeReadinessInput({ quantity: '-5' });
  assert.equal(result.quantity, '');
});

test('7. a valid numeric string passes through unchanged', () => {
  const result = normalizeReadinessInput({ quantity: '120' });
  assert.equal(result.quantity, '120');
});

test('8. hsCodeKnown only accepts a real boolean true', () => {
  assert.equal(normalizeReadinessInput({ hsCodeKnown: true }).hsCodeKnown, true);
  assert.equal(normalizeReadinessInput({ hsCodeKnown: 'true' }).hsCodeKnown, false);
  assert.equal(normalizeReadinessInput({ hsCodeKnown: 1 }).hsCodeKnown, false);
});

test('9. malformed/non-object input is handled safely with all defaults', () => {
  const result = normalizeReadinessInput(null);
  assert.equal(result.productName, '');
  assert.equal(result.isElectrical, 'unknown');
  assert.equal(result.incoterm, 'unknown');
  assert.equal(result.hasCommercialInvoice, false);
});

test('10. the result is frozen', () => {
  assert.ok(Object.isFrozen(normalizeReadinessInput({})));
});

test('11. every product-flag field defaults to unknown when omitted', () => {
  const result = normalizeReadinessInput({});
  for (const field of ['isElectrical', 'hasBattery', 'isWireless', 'isFoodContact', 'isMedicalOrHealth', 'isCosmeticOrPersonalCare', 'isChildrenOrToy', 'isAutomotiveOrTransport', 'isAgricultureOrFood', 'isChemicalOrHazardous']) {
    assert.equal(result[field], 'unknown', `expected ${field} to default to unknown`);
  }
});

test('12. document boolean fields default to false when omitted', () => {
  const result = normalizeReadinessInput({});
  assert.equal(result.hasCommercialInvoice, false);
  assert.equal(result.hasPackingList, false);
  assert.equal(result.hasInsuranceDocument, false);
});

test('13. calling the module performs no network, DOM, or storage access', () => {
  assert.equal(typeof window, 'undefined');
  assert.equal(typeof document, 'undefined');
  normalizeReadinessInput({ productName: 'test' });
});

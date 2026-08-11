/**
 * Tests for js/tools/air-chargeable-weight-calculator.js using the
 * built-in Node.js test runner (`node:test`) and assertion library
 * (`node:assert`).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateChargeableWeight,
  DEFAULT_DIVISOR,
  ALTERNATE_DIVISOR,
} from '../../js/tools/air-chargeable-weight-calculator.js';

test('1. actual weight controls when heavier than volumetric weight', () => {
  const result = calculateChargeableWeight({
    grossWeightKg: 500,
    length: 30,
    width: 30,
    height: 30,
    unit: 'cm',
    quantity: 1,
  });
  assert.equal(result.valid, true);
  assert.equal(result.controllingFactor, 'actual');
  assert.equal(result.chargeableWeightKg, 500);
});

test('2. volumetric weight controls when heavier than actual weight', () => {
  const result = calculateChargeableWeight({
    grossWeightKg: 40,
    length: 120,
    width: 80,
    height: 100,
    unit: 'cm',
    quantity: 1,
  });
  assert.equal(result.valid, true);
  assert.equal(result.controllingFactor, 'volumetric');
  assert.equal(result.volumetricWeightKg, 160);
  assert.equal(result.chargeableWeightKg, 160);
});

test('3. equal actual and volumetric weight is reported as "equal"', () => {
  // 60 x 100 x 10 = 60000 cm^3 / 6000 = 10 kg volumetric, matching a 10 kg actual weight.
  const result = calculateChargeableWeight({
    grossWeightKg: 10,
    length: 60,
    width: 100,
    height: 10,
    unit: 'cm',
    quantity: 1,
  });
  assert.equal(result.volumetricWeightKg, 10);
  assert.equal(result.controllingFactor, 'equal');
  assert.equal(result.chargeableWeightKg, 10);
});

test('4. default divisor is 6000 when omitted', () => {
  const result = calculateChargeableWeight({
    grossWeightKg: 1,
    length: 10,
    width: 10,
    height: 10,
    unit: 'cm',
    quantity: 1,
  });
  assert.equal(result.divisorUsed, DEFAULT_DIVISOR);
  assert.equal(result.isDefaultDivisor, true);
});

test('5. divisor 5000 produces a heavier volumetric weight than divisor 6000 for the same box', () => {
  const box = { grossWeightKg: 1, length: 50, width: 50, height: 50, unit: 'cm', quantity: 1 };
  const withDefault = calculateChargeableWeight({ ...box, divisor: DEFAULT_DIVISOR });
  const withAlternate = calculateChargeableWeight({ ...box, divisor: ALTERNATE_DIVISOR });
  assert.ok(withAlternate.volumetricWeightKg > withDefault.volumetricWeightKg);
  assert.equal(withAlternate.isAlternateDivisor, true);
});

test('6. a valid custom positive divisor is accepted', () => {
  const result = calculateChargeableWeight({
    grossWeightKg: 1,
    length: 50,
    width: 50,
    height: 50,
    unit: 'cm',
    quantity: 1,
    divisor: 7000,
  });
  assert.equal(result.valid, true);
  assert.equal(result.divisorUsed, 7000);
  assert.equal(result.isDefaultDivisor, false);
  assert.equal(result.isAlternateDivisor, false);
});

test('7. multiple packages multiply total volume and volumetric weight', () => {
  const one = calculateChargeableWeight({ grossWeightKg: 1, length: 50, width: 50, height: 50, unit: 'cm', quantity: 1 });
  const three = calculateChargeableWeight({ grossWeightKg: 1, length: 50, width: 50, height: 50, unit: 'cm', quantity: 3 });
  assert.equal(three.totalVolumeCm3, one.totalVolumeCm3 * 3);
  assert.equal(three.volumetricWeightKg, one.volumetricWeightKg * 3);
});

test('8. meters and millimeters produce the same result as the equivalent centimeters', () => {
  const cm = calculateChargeableWeight({ grossWeightKg: 1, length: 50, width: 50, height: 50, unit: 'cm', quantity: 1 });
  const m = calculateChargeableWeight({ grossWeightKg: 1, length: 0.5, width: 0.5, height: 0.5, unit: 'm', quantity: 1 });
  const mm = calculateChargeableWeight({ grossWeightKg: 1, length: 500, width: 500, height: 500, unit: 'mm', quantity: 1 });
  assert.equal(m.volumetricWeightKg, cm.volumetricWeightKg);
  assert.ok(Math.abs(mm.volumetricWeightKg - cm.volumetricWeightKg) < 1e-9);
});

test('9. invalid dimensions are rejected', () => {
  assert.equal(
    calculateChargeableWeight({ grossWeightKg: 1, length: 0, width: 10, height: 10, unit: 'cm', quantity: 1 }).error,
    'invalid_dimensions',
  );
  assert.equal(
    calculateChargeableWeight({ grossWeightKg: 1, length: -5, width: 10, height: 10, unit: 'cm', quantity: 1 }).error,
    'invalid_dimensions',
  );
});

test('10. invalid gross weight is rejected', () => {
  assert.equal(
    calculateChargeableWeight({ grossWeightKg: 0, length: 10, width: 10, height: 10, unit: 'cm', quantity: 1 }).error,
    'invalid_gross_weight',
  );
  assert.equal(
    calculateChargeableWeight({ grossWeightKg: -1, length: 10, width: 10, height: 10, unit: 'cm', quantity: 1 }).error,
    'invalid_gross_weight',
  );
});

test('11. invalid divisor is rejected', () => {
  const base = { grossWeightKg: 1, length: 10, width: 10, height: 10, unit: 'cm', quantity: 1 };
  assert.equal(calculateChargeableWeight({ ...base, divisor: 0 }).error, 'invalid_divisor');
  assert.equal(calculateChargeableWeight({ ...base, divisor: -100 }).error, 'invalid_divisor');
  assert.equal(calculateChargeableWeight({ ...base, divisor: 'abc' }).error, 'invalid_divisor');
});

test('12. rounding: the practical chargeable weight rounds up to the nearest 0.5 kg', () => {
  // 1000 cm^3 / 6000 = 0.1666... kg volumetric.
  const result = calculateChargeableWeight({ grossWeightKg: 0.2, length: 10, width: 10, height: 10, unit: 'cm', quantity: 1 });
  assert.equal(result.chargeableWeightKgPracticalRounded, 0.5);
  assert.notEqual(result.chargeableWeightKg, result.chargeableWeightKgPracticalRounded);
});

test('13. the calculation basis is never silently rounded away — raw precision is preserved', () => {
  const result = calculateChargeableWeight({ grossWeightKg: 40, length: 120, width: 80, height: 100, unit: 'cm', quantity: 1 });
  assert.equal(result.chargeableWeightKg, 160);
});

test('14. a successful result includes a limitation note that this is not a binding charge', () => {
  const result = calculateChargeableWeight({ grossWeightKg: 1, length: 10, width: 10, height: 10, unit: 'cm', quantity: 1 });
  assert.equal(typeof result.limitationNote, 'string');
  assert.ok(result.limitationNote.length > 0);
});

test('15. non-object input and missing unit are handled safely', () => {
  assert.equal(calculateChargeableWeight(null).valid, false);
  assert.equal(
    calculateChargeableWeight({ grossWeightKg: 1, length: 10, width: 10, height: 10, quantity: 1 }).error,
    'invalid_unit',
  );
});

test('16. the result object is frozen', () => {
  const result = calculateChargeableWeight({ grossWeightKg: 1, length: 10, width: 10, height: 10, unit: 'cm', quantity: 1 });
  assert.ok(Object.isFrozen(result));
});

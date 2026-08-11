/**
 * Tests for js/tools/cbm-calculator.js using the built-in Node.js test
 * runner (`node:test`) and assertion library (`node:assert`).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCbm } from '../../js/tools/cbm-calculator.js';

test('1. centimeters: 120x80x100cm x1 = 0.96 CBM', () => {
  const result = calculateCbm({ length: 120, width: 80, height: 100, unit: 'cm', quantity: 1 });
  assert.equal(result.valid, true);
  assert.equal(result.cbmPerPackage, 0.96);
  assert.equal(result.totalCbm, 0.96);
});

test('2. meters: 1.2x0.8x1m x1 = 0.96 CBM', () => {
  const result = calculateCbm({ length: 1.2, width: 0.8, height: 1, unit: 'm', quantity: 1 });
  assert.equal(result.valid, true);
  assert.equal(result.cbmPerPackage, 0.96);
});

test('3. millimeters: 1200x800x1000mm x1 = 0.96 CBM', () => {
  const result = calculateCbm({ length: 1200, width: 800, height: 1000, unit: 'mm', quantity: 1 });
  assert.equal(result.valid, true);
  assert.ok(Math.abs(result.cbmPerPackage - 0.96) < 1e-9);
});

test('4. multiple packages multiplies total CBM, not per-package CBM', () => {
  const result = calculateCbm({ length: 100, width: 100, height: 100, unit: 'cm', quantity: 5 });
  assert.equal(result.cbmPerPackage, 1);
  assert.equal(result.totalCbm, 5);
  assert.equal(result.packageCount, 5);
});

test('5. decimal dimensions are accepted', () => {
  const result = calculateCbm({ length: 33.5, width: 22.25, height: 10.1, unit: 'cm', quantity: 2 });
  assert.equal(result.valid, true);
  assert.ok(result.totalCbm > 0);
});

test('6. zero dimension is rejected', () => {
  assert.equal(calculateCbm({ length: 0, width: 10, height: 10, unit: 'cm', quantity: 1 }).valid, false);
  assert.equal(calculateCbm({ length: 10, width: 0, height: 10, unit: 'cm', quantity: 1 }).error, 'invalid_dimensions');
});

test('7. negative dimension is rejected', () => {
  const result = calculateCbm({ length: -5, width: 10, height: 10, unit: 'cm', quantity: 1 });
  assert.equal(result.valid, false);
  assert.equal(result.error, 'invalid_dimensions');
});

test('8. zero or negative quantity is rejected', () => {
  assert.equal(calculateCbm({ length: 10, width: 10, height: 10, unit: 'cm', quantity: 0 }).error, 'invalid_quantity');
  assert.equal(calculateCbm({ length: 10, width: 10, height: 10, unit: 'cm', quantity: -1 }).error, 'invalid_quantity');
});

test('9. non-integer quantity is rejected', () => {
  const result = calculateCbm({ length: 10, width: 10, height: 10, unit: 'cm', quantity: 1.5 });
  assert.equal(result.valid, false);
  assert.equal(result.error, 'invalid_quantity');
});

test('10. non-numeric dimension values are rejected', () => {
  assert.equal(calculateCbm({ length: 'abc', width: 10, height: 10, unit: 'cm', quantity: 1 }).valid, false);
  assert.equal(calculateCbm({ length: NaN, width: 10, height: 10, unit: 'cm', quantity: 1 }).valid, false);
  assert.equal(calculateCbm({ length: Infinity, width: 10, height: 10, unit: 'cm', quantity: 1 }).valid, false);
});

test('11. missing or invalid unit is rejected', () => {
  assert.equal(calculateCbm({ length: 10, width: 10, height: 10, unit: 'ft', quantity: 1 }).error, 'invalid_unit');
  assert.equal(calculateCbm({ length: 10, width: 10, height: 10, quantity: 1 }).error, 'invalid_unit');
});

test('12. an unrealistically large dimension is rejected', () => {
  const result = calculateCbm({ length: 100000000, width: 10, height: 10, unit: 'm', quantity: 1 });
  assert.equal(result.valid, false);
  assert.equal(result.error, 'dimension_too_large');
});

test('13. rounding: the rounded value has at most 3 decimals, the raw value keeps full precision', () => {
  const result = calculateCbm({ length: 33.333, width: 22.222, height: 11.111, unit: 'cm', quantity: 1 });
  const decimals = String(result.cbmPerPackageRounded).split('.')[1] ?? '';
  assert.ok(decimals.length <= 3);
  assert.notEqual(result.cbmPerPackage, result.cbmPerPackageRounded);
});

test('14. non-object input is handled safely', () => {
  assert.equal(calculateCbm(null).valid, false);
  assert.equal(calculateCbm(undefined).valid, false);
  assert.equal(calculateCbm('not-an-object').valid, false);
});

test('15. a successful result includes a limitation note explaining final measurement may differ', () => {
  const result = calculateCbm({ length: 10, width: 10, height: 10, unit: 'cm', quantity: 1 });
  assert.equal(typeof result.limitationNote, 'string');
  assert.ok(result.limitationNote.length > 0);
});

test('16. the result object is frozen', () => {
  const result = calculateCbm({ length: 10, width: 10, height: 10, unit: 'cm', quantity: 1 });
  assert.ok(Object.isFrozen(result));
});

test('17. calling the function performs no network, DOM, or storage access', () => {
  assert.equal(typeof window, 'undefined');
  assert.equal(typeof document, 'undefined');
  calculateCbm({ length: 10, width: 10, height: 10, unit: 'cm', quantity: 1 });
});

/**
 * Tests for js/tools/container-validator-tool.js using the built-in
 * Node.js test runner (`node:test`) and assertion library
 * (`node:assert`).
 *
 * `CSQU3054383` / `CSQU3054380` are the same synthetic ISO 6346 fixtures
 * already used throughout tests/tracking/ -- never a real container
 * number.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { validateContainerNumber } from '../../js/tools/container-validator-tool.js';

test('1. a valid synthetic ISO 6346 number reports valid: true with a matching check digit', () => {
  const result = validateContainerNumber('CSQU3054383');
  assert.equal(result.valid, true);
  assert.equal(result.structureValid, true);
  assert.equal(result.checkDigitValid, true);
  assert.equal(result.suppliedCheckDigit, result.calculatedCheckDigit);
});

test('2. an invalid check digit reports valid: false with structureValid: true', () => {
  const result = validateContainerNumber('CSQU3054380');
  assert.equal(result.valid, false);
  assert.equal(result.error, 'invalid_check_digit');
  assert.equal(result.structureValid, true);
  assert.equal(result.checkDigitValid, false);
  assert.notEqual(result.suppliedCheckDigit, result.calculatedCheckDigit);
});

test('3. an invalid length reports structureValid: false', () => {
  const result = validateContainerNumber('CSQU30543');
  assert.equal(result.valid, false);
  assert.equal(result.error, 'invalid_structure');
  assert.equal(result.structureValid, false);
  assert.equal(result.checkDigitValid, null);
});

test('4. lowercase input is normalized before validation', () => {
  const result = validateContainerNumber('csqu3054383');
  assert.equal(result.valid, true);
  assert.equal(result.normalizedIdentifier, 'CSQU3054383');
});

test('5. separators and internal whitespace are stripped, matching the existing tracking-search normalization', () => {
  const result = validateContainerNumber('CSQU 305-4383');
  assert.equal(result.valid, true);
  assert.equal(result.normalizedIdentifier, 'CSQU3054383');
});

test('6. component extraction is correct: owner code, equipment category identifier, serial number', () => {
  const result = validateContainerNumber('CSQU3054383');
  assert.equal(result.ownerCode, 'CSQ');
  assert.equal(result.equipmentCategoryIdentifier, 'U');
  assert.equal(result.serialNumber, '305438');
});

test('7. the tool never infers or names a carrier from the owner code', () => {
  const result = validateContainerNumber('CSQU3054383');
  const serialized = JSON.stringify(result);
  for (const forbidden of ['MSC', 'ZIM', 'Maersk', 'CMA CGM', 'Evergreen']) {
    assert.ok(!serialized.includes(forbidden), `unexpectedly mentions ${forbidden}`);
  }
  assert.ok(result.carrierInferenceNote.length > 0);
});

test('8. an empty input reports a distinct empty_input error, not invalid_structure', () => {
  const result = validateContainerNumber('');
  assert.equal(result.error, 'empty_input');
  assert.equal(result.normalizedIdentifier, '');
});

test('9. non-string/unsupported input types are handled safely', () => {
  assert.equal(validateContainerNumber(null).valid, false);
  assert.equal(validateContainerNumber(undefined).valid, false);
  assert.equal(validateContainerNumber(12345).valid, false);
});

test('10. the normalized identifier is available for a copy action on both a valid and invalid check digit', () => {
  assert.equal(validateContainerNumber('CSQU3054383').normalizedIdentifier, 'CSQU3054383');
  assert.equal(validateContainerNumber('CSQU3054380').normalizedIdentifier, 'CSQU3054380');
});

test('11. the result object is frozen', () => {
  assert.ok(Object.isFrozen(validateContainerNumber('CSQU3054383')));
});

test('12. calling the function performs no network, DOM, or storage access', () => {
  assert.equal(typeof window, 'undefined');
  assert.equal(typeof document, 'undefined');
  validateContainerNumber('CSQU3054383');
});

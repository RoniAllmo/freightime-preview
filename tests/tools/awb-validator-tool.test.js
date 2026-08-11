/**
 * Tests for js/tools/awb-validator-tool.js using the built-in Node.js
 * test runner (`node:test`) and assertion library (`node:assert`).
 *
 * `02012345675` / `02012345676` are the same synthetic AWB fixtures
 * already used throughout tests/tracking/ -- never a real AWB number.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAwbNumber } from '../../js/tools/awb-validator-tool.js';

test('1. a valid synthetic AWB reports valid: true with a matching check digit', () => {
  const result = validateAwbNumber('02012345675');
  assert.equal(result.valid, true);
  assert.equal(result.structureValid, true);
  assert.equal(result.checkDigitValid, true);
  assert.equal(result.suppliedCheckDigit, result.calculatedCheckDigit);
});

test('2. an invalid check digit reports valid: false with structureValid: true', () => {
  const result = validateAwbNumber('02012345676');
  assert.equal(result.valid, false);
  assert.equal(result.error, 'invalid_check_digit');
  assert.equal(result.structureValid, true);
  assert.equal(result.checkDigitValid, false);
});

test('3. an invalid prefix length / non-digit value reports structureValid: false', () => {
  const result = validateAwbNumber('ABC12345675');
  assert.equal(result.valid, false);
  assert.equal(result.error, 'invalid_structure');
  assert.equal(result.structureValid, false);
});

test('4. an invalid overall length (too short) reports structureValid: false', () => {
  const result = validateAwbNumber('0201234');
  assert.equal(result.structureValid, false);
  assert.equal(result.checkDigitValid, null);
});

test('5. separators and internal whitespace are stripped, matching the existing tracking-search normalization', () => {
  const result = validateAwbNumber('020-1234567-5');
  assert.equal(result.valid, true);
  assert.equal(result.normalizedIdentifier, '02012345675');
});

test('6. component extraction is correct: prefix and serial number', () => {
  const result = validateAwbNumber('02012345675');
  assert.equal(result.prefix, '020');
  assert.equal(result.serialNumber, '1234567');
});

test('7. the tool never claims an airline identity — it always reports the fixed not-yet-verified note', () => {
  const result = validateAwbNumber('02012345675');
  assert.equal(result.airlinePrefixNote, 'קוד חברת התעופה טרם אומת במערכת');
  const serialized = JSON.stringify(result);
  for (const forbidden of ['El Al', 'Lufthansa', 'Emirates', 'United', 'Delta']) {
    assert.ok(!serialized.includes(forbidden), `unexpectedly mentions ${forbidden}`);
  }
});

test('8. an empty input reports a distinct empty_input error, not invalid_structure', () => {
  const result = validateAwbNumber('');
  assert.equal(result.error, 'empty_input');
  assert.equal(result.airlinePrefixNote, null);
});

test('9. non-string/unsupported input types are handled safely', () => {
  assert.equal(validateAwbNumber(null).valid, false);
  assert.equal(validateAwbNumber(undefined).valid, false);
  assert.equal(validateAwbNumber(12345).valid, false);
});

test('10. the normalized identifier is available for a copy action on both a valid and invalid check digit', () => {
  assert.equal(validateAwbNumber('02012345675').normalizedIdentifier, '02012345675');
  assert.equal(validateAwbNumber('02012345676').normalizedIdentifier, '02012345676');
});

test('11. the result object is frozen', () => {
  assert.ok(Object.isFrozen(validateAwbNumber('02012345675')));
});

test('12. calling the function performs no network, DOM, or storage access', () => {
  assert.equal(typeof window, 'undefined');
  assert.equal(typeof document, 'undefined');
  validateAwbNumber('02012345675');
});

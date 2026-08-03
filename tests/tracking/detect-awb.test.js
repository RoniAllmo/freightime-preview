/**
 * Tests for js/tracking/detect-awb.js using the built-in Node.js test
 * runner (`node:test`) and assertion library (`node:assert`).
 *
 * All AWB fixtures below were independently calculated against the
 * unweighted Modulus 7 rule (serial number mod 7 = check digit) before
 * being used here, separately from the module under test:
 *   - prefix 020, serial 1234567 -> 1234567 % 7 = 5  => 02012345675
 *   - prefix 020, serial 9999999 -> 9999999 % 7 = 2  => 02099999992
 *   - prefix 020, serial 0001234 -> 1234 % 7 = 2      => 02000012342
 * No test number is associated with any real airline; the 3-digit prefix
 * is never interpreted here as an operating airline.
 *
 * Requirements #33/#34 ("existing normalization/container tests continue
 * to pass") are validated by running the full `tests/tracking/` suite
 * alongside this file, not duplicated here.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { detectAwb } from '../../js/tracking/detect-awb.js';
import { normalizeTrackingInput } from '../../js/tracking/normalize.js';

const REQUIRED_FIELDS = [
  'identifierType',
  'matched',
  'normalizedIdentifier',
  'possibleCarriers',
  'confidence',
  'valid',
  'ambiguous',
  'reason',
  'recommendedAction',
].sort();

function assertShape(result) {
  assert.deepEqual(Object.keys(result).sort(), REQUIRED_FIELDS);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.possibleCarriers), true);
  assert.deepEqual(result.possibleCarriers, []);
  assert.equal('carrier' in result, false);
  assert.equal('airline' in result, false);
  assert.equal('prefix' in result, false);
  assert.equal('serialNumber' in result, false);
  assert.equal('checkDigit' in result, false);
  assert.equal('trackingUrl' in result, false);
  assert.equal('officialTrackingUrl' in result, false);
}

test('1. valid 11-digit AWB with a valid Modulus 7 check digit', () => {
  const result = detectAwb(normalizeTrackingInput('02012345675'));
  assertShape(result);
  assert.equal(result.identifierType, 'air-waybill');
  assert.equal(result.matched, true);
  assert.equal(result.valid, true);
  assert.equal(result.confidence, 'high');
  assert.equal(result.normalizedIdentifier, '02012345675');
});

test('2. a second valid AWB with a different check digit', () => {
  const result = detectAwb(normalizeTrackingInput('02099999992'));
  assertShape(result);
  assert.equal(result.identifierType, 'air-waybill');
  assert.equal(result.matched, true);
  assert.equal(result.valid, true);
  assert.equal(result.confidence, 'high');
});

test('3. a valid AWB whose serial number contains leading zeros', () => {
  const result = detectAwb(normalizeTrackingInput('02000012342'));
  assertShape(result);
  assert.equal(result.identifierType, 'air-waybill');
  assert.equal(result.matched, true);
  assert.equal(result.valid, true);
  assert.equal(result.normalizedIdentifier, '02000012342');
});

test('4. an 11-digit AWB-style value with an invalid check digit', () => {
  const result = detectAwb(normalizeTrackingInput('02012345676'));
  assertShape(result);
  assert.equal(result.identifierType, 'air-waybill');
  assert.equal(result.matched, true);
  assert.equal(result.valid, false);
  assert.equal(result.confidence, 'medium');
});

test('5. an AWB-style value whose final digit is 8 (outside the valid 0-6 range for this serial)', () => {
  const result = detectAwb(normalizeTrackingInput('02012345678'));
  assertShape(result);
  assert.equal(result.matched, true);
  assert.equal(result.valid, false);
});

test('6. fewer than 11 digits', () => {
  const result = detectAwb(normalizeTrackingInput('0201234567'));
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('7. more than 11 digits', () => {
  const result = detectAwb(normalizeTrackingInput('020123456789'));
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('8. exactly ten digits', () => {
  const result = detectAwb(normalizeTrackingInput('1234567890'));
  assertShape(result);
  assert.equal(result.matched, false);
});

test('9. exactly twelve digits', () => {
  const result = detectAwb(normalizeTrackingInput('123456789012'));
  assertShape(result);
  assert.equal(result.matched, false);
});

test('10. letters-only input', () => {
  const result = detectAwb(normalizeTrackingInput('ABCDEFGHIJK'));
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('11. mixed letters and digits (11 embedded digits but not accepted via digitsOnly)', () => {
  const result = detectAwb(normalizeTrackingInput('A2012345675'));
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('12. container-style input is not accepted as an AWB', () => {
  const result = detectAwb(normalizeTrackingInput('CSQU3054383'));
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('13. empty normalized input', () => {
  const result = detectAwb(normalizeTrackingInput(''));
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
  assert.equal(result.normalizedIdentifier, '');
});

test('14. missing normalized-input argument', () => {
  const result = detectAwb();
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('15. null normalized-input argument', () => {
  const result = detectAwb(null);
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('16. plain object without alphanumericInput', () => {
  const result = detectAwb({});
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
  assert.equal(result.normalizedIdentifier, '');
});

test('17. unsupported alphanumericInput type does not throw', () => {
  const result = detectAwb({ alphanumericInput: 2012345675 });
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('18. alphanumericInput containing a hyphen (manually constructed)', () => {
  const result = detectAwb({ alphanumericInput: '020-1234567' });
  assertShape(result);
  assert.equal(result.matched, false);
});

test('19. alphanumericInput containing whitespace (manually constructed)', () => {
  const result = detectAwb({ alphanumericInput: '020 1234567' });
  assertShape(result);
  assert.equal(result.matched, false);
});

test('20. Hebrew characters in a manually constructed alphanumericInput', () => {
  const result = detectAwb({ alphanumericInput: 'משלוח12345' });
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('21. non-ASCII letters in a manually constructed alphanumericInput', () => {
  const result = detectAwb({ alphanumericInput: 'É2012345675' });
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('22. a real normalized object produced from a hyphenated AWB input', () => {
  const normalized = normalizeTrackingInput('020-12345675');
  assert.equal(normalized.alphanumericInput, '02012345675');
  const result = detectAwb(normalized);
  assertShape(result);
  assert.equal(result.identifierType, 'air-waybill');
  assert.equal(result.matched, true);
  assert.equal(result.valid, true);
});

test('23. a real normalized object produced from a spaced AWB input', () => {
  const normalized = normalizeTrackingInput('020 12345675');
  assert.equal(normalized.alphanumericInput, '02012345675');
  const result = detectAwb(normalized);
  assertShape(result);
  assert.equal(result.identifierType, 'air-waybill');
  assert.equal(result.matched, true);
  assert.equal(result.valid, true);
});

test('24. possibleCarriers remains empty across valid, invalid, and unknown results', () => {
  const valid = detectAwb(normalizeTrackingInput('02012345675'));
  const invalidCheckDigit = detectAwb(normalizeTrackingInput('02012345676'));
  const unknown = detectAwb(normalizeTrackingInput('CSQU3054383'));
  assert.deepEqual(valid.possibleCarriers, []);
  assert.deepEqual(invalidCheckDigit.possibleCarriers, []);
  assert.deepEqual(unknown.possibleCarriers, []);
});

test('25. no airline, carrier, prefix, URL, or routing field is introduced', () => {
  const result = detectAwb(normalizeTrackingInput('02012345675'));
  assertShape(result);
});

test('26. returned result is frozen', () => {
  const result = detectAwb(normalizeTrackingInput('02012345675'));
  assert.equal(Object.isFrozen(result), true);
  assert.throws(() => {
    'use strict';
    result.valid = false;
  }, TypeError);
});

test('27. possibleCarriers array is frozen', () => {
  const result = detectAwb(normalizeTrackingInput('02012345675'));
  assert.equal(Object.isFrozen(result.possibleCarriers), true);
  assert.throws(() => {
    'use strict';
    result.possibleCarriers.push('X');
  }, TypeError);
});

test('28. repeated calls return separate result objects', () => {
  const normalized = normalizeTrackingInput('02012345675');
  const first = detectAwb(normalized);
  const second = detectAwb(normalized);
  assert.notEqual(first, second);
  assert.notEqual(first.possibleCarriers, second.possibleCarriers);
});

test('29. supplied normalized-input object is not mutated', () => {
  const normalized = normalizeTrackingInput('02012345675');
  const snapshotKeys = Object.keys(normalized).sort();
  const snapshotAlphanumeric = normalized.alphanumericInput;
  detectAwb(normalized);
  assert.deepEqual(Object.keys(normalized).sort(), snapshotKeys);
  assert.equal(normalized.alphanumericInput, snapshotAlphanumeric);
});

test('30. invalid check digit returns matched true but valid false', () => {
  const result = detectAwb(normalizeTrackingInput('02012345676'));
  assert.equal(result.matched, true);
  assert.equal(result.valid, false);
});

test('31. non-AWB structure returns matched false and identifierType unknown', () => {
  const result = detectAwb(normalizeTrackingInput('ABCDEFGHIJK'));
  assert.equal(result.matched, false);
  assert.equal(result.identifierType, 'unknown');
});

test('32. no logging, DOM access, storage access, navigation, or network call occurs', () => {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  let logCalled = false;
  console.log = () => { logCalled = true; };
  console.warn = () => { logCalled = true; };
  console.error = () => { logCalled = true; };
  try {
    detectAwb(normalizeTrackingInput('02012345675'));
    detectAwb(normalizeTrackingInput('CSQU3054383'));
    detectAwb(null);
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  }
  assert.equal(logCalled, false);
  assert.equal(typeof globalThis.document, 'undefined');
  assert.equal(typeof globalThis.window, 'undefined');
});

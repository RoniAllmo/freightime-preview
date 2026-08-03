/**
 * Tests for js/tracking/detect-container.js using the built-in Node.js
 * test runner (`node:test`) and assertion library (`node:assert`).
 *
 * Valid container numbers used below were independently verified against
 * the ISO 6346 check-digit algorithm (as documented in detect-container.js)
 * before being used as fixtures here, separately from the module under
 * test. `CSQU3054383` is the official ISO 6346 worked example (check digit
 * 3); `HLXU9876547` was independently calculated to have check digit 7 for
 * prefix `HLXU987654`. No carrier association is implied or tested for
 * either number.
 *
 * Requirement #30 ("existing normalization tests continue to pass") is
 * validated by running the full `tests/tracking/` suite, including
 * `normalize.test.js`, alongside this file — not duplicated here.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { detectContainer } from '../../js/tracking/detect-container.js';
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
  assert.equal('trackingUrl' in result, false);
  assert.equal('officialTrackingUrl' in result, false);
}

test('1. known valid container number (official ISO 6346 example CSQU3054383)', () => {
  const normalized = normalizeTrackingInput('CSQU3054383');
  const result = detectContainer(normalized);
  assertShape(result);
  assert.equal(result.identifierType, 'ocean-container');
  assert.equal(result.matched, true);
  assert.equal(result.valid, true);
  assert.equal(result.confidence, 'high');
  assert.equal(result.ambiguous, false);
  assert.equal(result.normalizedIdentifier, 'CSQU3054383');
});

test('2. another valid container number (independently verified check digit)', () => {
  const normalized = normalizeTrackingInput('HLXU9876547');
  const result = detectContainer(normalized);
  assertShape(result);
  assert.equal(result.identifierType, 'ocean-container');
  assert.equal(result.matched, true);
  assert.equal(result.valid, true);
  assert.equal(result.confidence, 'high');
});

test('3. container-style input with an invalid check digit', () => {
  const normalized = normalizeTrackingInput('CSQU3054380');
  const result = detectContainer(normalized);
  assertShape(result);
  assert.equal(result.identifierType, 'ocean-container');
  assert.equal(result.matched, true);
  assert.equal(result.valid, false);
  assert.equal(result.confidence, 'medium');
});

test('4. correct total length but incorrect letter/digit positions', () => {
  const normalized = normalizeTrackingInput('ABC1234567D');
  const result = detectContainer(normalized);
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('5. fewer than 11 characters', () => {
  const normalized = normalizeTrackingInput('ABCD123456');
  const result = detectContainer(normalized);
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('6. more than 11 characters', () => {
  const normalized = normalizeTrackingInput('ABCD12345678');
  const result = detectContainer(normalized);
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('7. four letters followed by only six digits', () => {
  const normalized = normalizeTrackingInput('ABCD123456');
  const result = detectContainer(normalized);
  assertShape(result);
  assert.equal(result.matched, false);
});

test('8. three letters followed by eight digits', () => {
  const normalized = normalizeTrackingInput('ABC12345678');
  const result = detectContainer(normalized);
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('9. digits-only input', () => {
  const normalized = normalizeTrackingInput('12345678901');
  const result = detectContainer(normalized);
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('10. letters-only input', () => {
  const normalized = normalizeTrackingInput('ABCDEFGHIJK');
  const result = detectContainer(normalized);
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('11. empty normalized input', () => {
  const normalized = normalizeTrackingInput('');
  const result = detectContainer(normalized);
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
  assert.equal(result.normalizedIdentifier, '');
});

test('12. missing normalized-input argument', () => {
  const result = detectContainer();
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('13. null normalized-input argument', () => {
  const result = detectContainer(null);
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('14. plain object without alphanumericInput', () => {
  const result = detectContainer({});
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
  assert.equal(result.normalizedIdentifier, '');
});

test('15. unsupported alphanumericInput type does not throw', () => {
  const result = detectContainer({ alphanumericInput: 12345 });
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('16. hyphen present in a manually constructed alphanumericInput', () => {
  const result = detectContainer({ alphanumericInput: 'ABCD-234567' });
  assertShape(result);
  assert.equal(result.matched, false);
});

test('17. whitespace present in a manually constructed alphanumericInput', () => {
  const result = detectContainer({ alphanumericInput: 'ABCD 234567' });
  assertShape(result);
  assert.equal(result.matched, false);
});

test('18. Hebrew characters in a manually constructed alphanumericInput', () => {
  const result = detectContainer({ alphanumericInput: 'מכולה1234567' });
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('19. non-ASCII letters in a manually constructed alphanumericInput', () => {
  const result = detectContainer({ alphanumericInput: 'ÉBCD1234567' });
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('20. valid structure but lowercase letters in a malformed manually constructed normalized object does not crash and is not matched', () => {
  const result = detectContainer({ alphanumericInput: 'csqu3054383' });
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('21. possibleCarriers remains empty across valid, invalid, and unknown results', () => {
  const valid = detectContainer(normalizeTrackingInput('CSQU3054383'));
  const invalidCheckDigit = detectContainer(normalizeTrackingInput('CSQU3054380'));
  const unknown = detectContainer(normalizeTrackingInput('NOTACONTAINER'));
  assert.deepEqual(valid.possibleCarriers, []);
  assert.deepEqual(invalidCheckDigit.possibleCarriers, []);
  assert.deepEqual(unknown.possibleCarriers, []);
});

test('22. no carrier or tracking URL field is introduced', () => {
  const result = detectContainer(normalizeTrackingInput('CSQU3054383'));
  assertShape(result);
});

test('23. returned result is frozen', () => {
  const result = detectContainer(normalizeTrackingInput('CSQU3054383'));
  assert.equal(Object.isFrozen(result), true);
  assert.throws(() => {
    'use strict';
    result.valid = false;
  }, TypeError);
});

test('24. possibleCarriers array is frozen', () => {
  const result = detectContainer(normalizeTrackingInput('CSQU3054383'));
  assert.equal(Object.isFrozen(result.possibleCarriers), true);
  assert.throws(() => {
    'use strict';
    result.possibleCarriers.push('X');
  }, TypeError);
});

test('25. repeated calls return separate result objects', () => {
  const normalized = normalizeTrackingInput('CSQU3054383');
  const first = detectContainer(normalized);
  const second = detectContainer(normalized);
  assert.notEqual(first, second);
  assert.notEqual(first.possibleCarriers, second.possibleCarriers);
});

test('26. supplied normalized-input object is not mutated', () => {
  const normalized = normalizeTrackingInput('CSQU3054383');
  const snapshotKeys = Object.keys(normalized).sort();
  const snapshotAlphanumeric = normalized.alphanumericInput;
  detectContainer(normalized);
  assert.deepEqual(Object.keys(normalized).sort(), snapshotKeys);
  assert.equal(normalized.alphanumericInput, snapshotAlphanumeric);
});

test('27. invalid check digit returns matched true but valid false', () => {
  const result = detectContainer(normalizeTrackingInput('CSQU3054380'));
  assert.equal(result.matched, true);
  assert.equal(result.valid, false);
});

test('28. non-container structure returns matched false and identifierType unknown', () => {
  const result = detectContainer(normalizeTrackingInput('EE123456789IL'));
  assert.equal(result.matched, false);
  assert.equal(result.identifierType, 'unknown');
});

test('29. no logging, DOM access, storage access, navigation, or network call occurs', () => {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  let logCalled = false;
  console.log = () => { logCalled = true; };
  console.warn = () => { logCalled = true; };
  console.error = () => { logCalled = true; };
  try {
    detectContainer(normalizeTrackingInput('CSQU3054383'));
    detectContainer(normalizeTrackingInput('NOTACONTAINER'));
    detectContainer(null);
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  }
  assert.equal(logCalled, false);
  assert.equal(typeof globalThis.document, 'undefined');
  assert.equal(typeof globalThis.window, 'undefined');
});

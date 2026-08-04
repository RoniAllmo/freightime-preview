/**
 * Tests for js/tracking/detect-postal.js using the built-in Node.js test
 * runner (`node:test`) and assertion library (`node:assert`).
 *
 * Fixtures `AA876543216AA`, `AA000000005AA`, and `AA700000000AA` are the
 * same synthetic, non-operational fixtures independently verified against
 * the official UPU S10 check-digit validation tool and recorded in
 * S10_AUTHORITATIVE_VERIFICATION.md (worked example and the confirmed
 * 11->5 / 10->0 boundary mappings). None represents a real customer or
 * operational shipment, and none was submitted to any tracking service.
 *
 * Requirements #46-#50 ("existing normalization/container/AWB/router/
 * UI-controller tests continue to pass") are validated by running the
 * full `tests/tracking/` suite alongside this file, not duplicated here.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { detectPostal } from '../../js/tracking/detect-postal.js';
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
  assert.equal('ems' in result, false);
  assert.equal('serviceCategory' in result, false);
  assert.equal('postalOperator' in result, false);
  assert.equal('carrier' in result, false);
  assert.equal('countryCode' in result, false);
  assert.equal('issuingCountry' in result, false);
  assert.equal('trackingUrl' in result, false);
  assert.equal('officialTrackingUrl' in result, false);
  assert.equal('apiUrl' in result, false);
}

test('1. official-tool worked example AA876543216AA is a valid S10 identifier', () => {
  const result = detectPostal(normalizeTrackingInput('AA876543216AA'));
  assertShape(result);
  assert.equal(result.identifierType, 'international-postal');
  assert.equal(result.matched, true);
  assert.equal(result.valid, true);
  assert.equal(result.confidence, 'high');
  assert.equal(result.reason, 's10_valid');
  assert.equal(result.normalizedIdentifier, 'AA876543216AA');
});

test('2. official-tool boundary fixture AA000000005AA confirms 11 -> 5', () => {
  const result = detectPostal(normalizeTrackingInput('AA000000005AA'));
  assertShape(result);
  assert.equal(result.identifierType, 'international-postal');
  assert.equal(result.matched, true);
  assert.equal(result.valid, true);
  assert.equal(result.confidence, 'high');
});

test('3. official-tool boundary fixture AA700000000AA confirms 10 -> 0', () => {
  const result = detectPostal(normalizeTrackingInput('AA700000000AA'));
  assertShape(result);
  assert.equal(result.identifierType, 'international-postal');
  assert.equal(result.matched, true);
  assert.equal(result.valid, true);
  assert.equal(result.confidence, 'high');
});

test('4. deliberately invalid version of the worked example', () => {
  const result = detectPostal(normalizeTrackingInput('AA876543210AA'));
  assertShape(result);
  assert.equal(result.identifierType, 'international-postal');
  assert.equal(result.matched, true);
  assert.equal(result.valid, false);
  assert.equal(result.confidence, 'medium');
  assert.equal(result.reason, 's10_invalid_check_digit');
});

test('5. deliberately invalid version of the 11 -> 5 fixture', () => {
  const result = detectPostal(normalizeTrackingInput('AA000000001AA'));
  assertShape(result);
  assert.equal(result.matched, true);
  assert.equal(result.valid, false);
});

test('6. deliberately invalid version of the 10 -> 0 fixture', () => {
  const result = detectPostal(normalizeTrackingInput('AA700000001AA'));
  assertShape(result);
  assert.equal(result.matched, true);
  assert.equal(result.valid, false);
});

test('7. valid S10 beginning with an E service indicator remains international-postal, not EMS', () => {
  const result = detectPostal(normalizeTrackingInput('EA876543216AA'));
  assertShape(result);
  assert.equal(result.identifierType, 'international-postal');
  assert.equal(result.matched, true);
  assert.equal(result.valid, true);
});

test('8. valid S10 with another service indicator remains international-postal', () => {
  const result = detectPostal(normalizeTrackingInput('RR876543216AA'));
  assertShape(result);
  assert.equal(result.identifierType, 'international-postal');
  assert.equal(result.matched, true);
  assert.equal(result.valid, true);
});

test('9. correct total length but invalid service-indicator positions', () => {
  const result = detectPostal(normalizeTrackingInput('12876543216AA'));
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('10. correct total length but invalid country-code positions', () => {
  const result = detectPostal(normalizeTrackingInput('AA87654321699'));
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('11. too-short input', () => {
  const result = detectPostal(normalizeTrackingInput('AA8765432'));
  assertShape(result);
  assert.equal(result.matched, false);
});

test('12. too-long input', () => {
  const result = detectPostal(normalizeTrackingInput('AA876543216AAX'));
  assertShape(result);
  assert.equal(result.matched, false);
});

test('13. numeric-only input', () => {
  const result = detectPostal(normalizeTrackingInput('1234567890123'));
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('14. letters-only input', () => {
  const result = detectPostal(normalizeTrackingInput('ABCDEFGHIJKLM'));
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('15. container-style input is not accepted as S10', () => {
  const result = detectPostal(normalizeTrackingInput('CSQU3054383'));
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('16. AWB-style input is not accepted as S10', () => {
  const result = detectPostal(normalizeTrackingInput('02012345675'));
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('17. empty normalized input', () => {
  const result = detectPostal(normalizeTrackingInput(''));
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
  assert.equal(result.normalizedIdentifier, '');
});

test('18. missing normalized-input argument', () => {
  const result = detectPostal();
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('19. null normalized-input argument', () => {
  const result = detectPostal(null);
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('20. plain object without alphanumericInput', () => {
  const result = detectPostal({});
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
  assert.equal(result.normalizedIdentifier, '');
});

test('21. unsupported alphanumericInput type does not throw', () => {
  const result = detectPostal({ alphanumericInput: 1234567890123 });
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('22. alphanumericInput containing a hyphen (manually constructed)', () => {
  const result = detectPostal({ alphanumericInput: 'AA876543-216AA' });
  assertShape(result);
  assert.equal(result.matched, false);
});

test('23. alphanumericInput containing whitespace (manually constructed)', () => {
  const result = detectPostal({ alphanumericInput: 'AA876543 216AA' });
  assertShape(result);
  assert.equal(result.matched, false);
});

test('24. Hebrew characters in a manually constructed alphanumericInput', () => {
  const result = detectPostal({ alphanumericInput: 'מכולה12345678' });
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('25. non-ASCII letters in a manually constructed alphanumericInput', () => {
  const result = detectPostal({ alphanumericInput: 'ÉA876543216AA' });
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('26. lowercase letters in a manually constructed malformed normalized object do not crash and are not matched', () => {
  const result = detectPostal({ alphanumericInput: 'aa876543216aa' });
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('27. a real normalized object from lowercase raw S10 input is accepted after normalizeTrackingInput uppercases it', () => {
  const normalized = normalizeTrackingInput('aa876543216aa');
  assert.equal(normalized.alphanumericInput, 'AA876543216AA');
  const result = detectPostal(normalized);
  assertShape(result);
  assert.equal(result.identifierType, 'international-postal');
  assert.equal(result.matched, true);
  assert.equal(result.valid, true);
});

test('28. possibleCarriers remains empty across valid, invalid, and unknown results', () => {
  const valid = detectPostal(normalizeTrackingInput('AA876543216AA'));
  const invalid = detectPostal(normalizeTrackingInput('AA876543210AA'));
  const unknown = detectPostal(normalizeTrackingInput('NOTPOSTAL1234'));
  assert.deepEqual(valid.possibleCarriers, []);
  assert.deepEqual(invalid.possibleCarriers, []);
  assert.deepEqual(unknown.possibleCarriers, []);
});

test('29. possibleCarriers array is frozen', () => {
  const result = detectPostal(normalizeTrackingInput('AA876543216AA'));
  assert.equal(Object.isFrozen(result.possibleCarriers), true);
  assert.throws(() => {
    'use strict';
    result.possibleCarriers.push('X');
  }, TypeError);
});

test('30. result object is frozen', () => {
  const result = detectPostal(normalizeTrackingInput('AA876543216AA'));
  assert.equal(Object.isFrozen(result), true);
  assert.throws(() => {
    'use strict';
    result.valid = false;
  }, TypeError);
});

test('31. repeated calls return separate result objects', () => {
  const normalized = normalizeTrackingInput('AA876543216AA');
  const first = detectPostal(normalized);
  const second = detectPostal(normalized);
  assert.notEqual(first, second);
  assert.notEqual(first.possibleCarriers, second.possibleCarriers);
});

test('32. supplied normalized-input object is not mutated', () => {
  const normalized = normalizeTrackingInput('AA876543216AA');
  const snapshotKeys = Object.keys(normalized).sort();
  const snapshotAlphanumeric = normalized.alphanumericInput;
  detectPostal(normalized);
  assert.deepEqual(Object.keys(normalized).sort(), snapshotKeys);
  assert.equal(normalized.alphanumericInput, snapshotAlphanumeric);
});

test('33. result contains exactly the required public fields', () => {
  const result = detectPostal(normalizeTrackingInput('AA876543216AA'));
  assertShape(result);
});

test('34. no EMS field is introduced', () => {
  const result = detectPostal(normalizeTrackingInput('EA876543216AA'));
  assert.equal('ems' in result, false);
  assert.equal('isEms' in result, false);
  assert.equal('serviceIndicator' in result, false);
});

test('35. no postal operator field is introduced', () => {
  const result = detectPostal(normalizeTrackingInput('AA876543216AA'));
  assert.equal('postalOperator' in result, false);
  assert.equal('operator' in result, false);
});

test('36. no country metadata field is introduced', () => {
  const result = detectPostal(normalizeTrackingInput('AA876543216AA'));
  assert.equal('countryCode' in result, false);
  assert.equal('issuingCountry' in result, false);
  assert.equal('destinationCountry' in result, false);
});

test('37. no carrier, URL, API, or routing field is introduced', () => {
  const result = detectPostal(normalizeTrackingInput('AA876543216AA'));
  assertShape(result);
});

test('38. invalid check digit returns matched true but valid false', () => {
  const result = detectPostal(normalizeTrackingInput('AA876543210AA'));
  assert.equal(result.matched, true);
  assert.equal(result.valid, false);
});

test('39. non-S10 structure returns matched false and identifierType unknown', () => {
  const result = detectPostal(normalizeTrackingInput('NOTPOSTAL1234'));
  assert.equal(result.matched, false);
  assert.equal(result.identifierType, 'unknown');
});

test('40. no logging, DOM access, storage access, navigation, network, or assistant interaction occurs', () => {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  let logCalled = false;
  console.log = () => { logCalled = true; };
  console.warn = () => { logCalled = true; };
  console.error = () => { logCalled = true; };
  try {
    detectPostal(normalizeTrackingInput('AA876543216AA'));
    detectPostal(normalizeTrackingInput('AA000000005AA'));
    detectPostal(normalizeTrackingInput('AA700000000AA'));
    detectPostal(normalizeTrackingInput('NOTPOSTAL1234'));
    detectPostal(null);
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  }
  assert.equal(logCalled, false);
  assert.equal(typeof globalThis.document, 'undefined');
  assert.equal(typeof globalThis.window, 'undefined');
  assert.equal(typeof globalThis.localStorage, 'undefined');
  assert.equal(typeof globalThis.sessionStorage, 'undefined');
  assert.equal(typeof globalThis.chatFab, 'undefined');
  assert.equal(typeof globalThis.chatPanel, 'undefined');
});

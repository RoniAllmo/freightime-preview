/**
 * Tests for js/tracking/detect-courier.js using the built-in Node.js test
 * runner (`node:test`) and assertion library (`node:assert`).
 *
 * All UPS fixtures below are synthetic values constructed only to satisfy
 * or deliberately violate the structural rules approved in
 * COURIER_IMPLEMENTATION_DECISION.md (Sections 5, 9, 13). None represents
 * a real, operational, or publicly observed UPS tracking number, and none
 * was submitted to any tracking website or API.
 *
 * Requirements #57-#62 ("existing normalization/container/AWB/postal/
 * router/UI-controller tests continue to pass") are validated by running
 * the full `tests/tracking/` suite alongside this file, not duplicated
 * here.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { detectCourier } from '../../js/tracking/detect-courier.js';
import { normalizeTrackingInput } from '../../js/tracking/normalize.js';
import { detectContainer } from '../../js/tracking/detect-container.js';
import { detectAwb } from '../../js/tracking/detect-awb.js';
import { detectPostal } from '../../js/tracking/detect-postal.js';

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

// Synthetic UPS 1Z fixture: 1Z + 16 chars = 18 total.
const VALID_1Z_DIGITS = `1Z${'0'.repeat(16)}`;
// Synthetic UPS 1Z fixture using permitted uppercase letters and digits.
const VALID_1Z_MIXED = `1Z${'AB12CD34EF56GH78'}`;
// Synthetic UPS Roadie short fixture: 1R + 14 chars = 16 total.
const VALID_1R_SHORT = `1R${'0'.repeat(14)}`;
// Synthetic UPS Roadie long fixture: 1R + 26 chars = 28 total.
const VALID_1R_LONG = `1R${'0'.repeat(26)}`;

function assertShape(result) {
  assert.deepEqual(Object.keys(result).sort(), REQUIRED_FIELDS);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.possibleCarriers), true);
  assert.equal('checkDigit' in result, false);
  assert.equal('trackingUrl' in result, false);
  assert.equal('officialTrackingUrl' in result, false);
  assert.equal('apiUrl' in result, false);
  assert.equal('api' in result, false);
  assert.equal('displayName' in result, false);
  assert.equal('carrierDisplayName' in result, false);
}

// --- Valid structural matches (1-4) ---

test('1. valid synthetic UPS 1Z with digits after the prefix', () => {
  assert.equal(VALID_1Z_DIGITS.length, 18);
  const result = detectCourier(normalizeTrackingInput(VALID_1Z_DIGITS));
  assertShape(result);
  assert.equal(result.identifierType, 'commercial-courier');
  assert.equal(result.matched, true);
  assert.equal(result.valid, true);
  assert.equal(result.confidence, 'high');
  assert.equal(result.ambiguous, false);
  assert.equal(result.reason, 'ups_1z_structure_valid');
  assert.equal(result.recommendedAction, 'courier_carrier_identified');
  assert.deepEqual(result.possibleCarriers, ['ups']);
  assert.equal(result.normalizedIdentifier, VALID_1Z_DIGITS);
});

test('2. valid synthetic UPS 1Z with permitted uppercase letters and digits', () => {
  assert.equal(VALID_1Z_MIXED.length, 18);
  const result = detectCourier(normalizeTrackingInput(VALID_1Z_MIXED));
  assertShape(result);
  assert.equal(result.identifierType, 'commercial-courier');
  assert.equal(result.matched, true);
  assert.equal(result.valid, true);
  assert.equal(result.confidence, 'high');
  assert.equal(result.reason, 'ups_1z_structure_valid');
  assert.deepEqual(result.possibleCarriers, ['ups']);
});

test('3. valid synthetic UPS Roadie 1R short', () => {
  assert.equal(VALID_1R_SHORT.length, 16);
  const result = detectCourier(normalizeTrackingInput(VALID_1R_SHORT));
  assertShape(result);
  assert.equal(result.identifierType, 'commercial-courier');
  assert.equal(result.matched, true);
  assert.equal(result.valid, true);
  assert.equal(result.confidence, 'high');
  assert.equal(result.reason, 'ups_roadie_1r_short_structure_valid');
  assert.equal(result.recommendedAction, 'courier_carrier_identified');
  assert.deepEqual(result.possibleCarriers, ['ups-roadie']);
});

test('4. valid synthetic UPS Roadie 1R long', () => {
  assert.equal(VALID_1R_LONG.length, 28);
  const result = detectCourier(normalizeTrackingInput(VALID_1R_LONG));
  assertShape(result);
  assert.equal(result.identifierType, 'commercial-courier');
  assert.equal(result.matched, true);
  assert.equal(result.valid, true);
  assert.equal(result.confidence, 'high');
  assert.equal(result.reason, 'ups_roadie_1r_long_structure_valid');
  assert.equal(result.recommendedAction, 'courier_carrier_identified');
  assert.deepEqual(result.possibleCarriers, ['ups-roadie']);
});

// --- Length edge cases (5-10) ---

test('5. 1Z with one character too few is an invalid structural match', () => {
  const tooShort = VALID_1Z_DIGITS.slice(0, -1);
  assert.equal(tooShort.length, 17);
  const result = detectCourier(normalizeTrackingInput(tooShort));
  assertShape(result);
  assert.equal(result.identifierType, 'commercial-courier');
  assert.equal(result.matched, true);
  assert.equal(result.valid, false);
  assert.equal(result.confidence, 'medium');
  assert.equal(result.reason, 'ups_1z_invalid_structure');
  assert.equal(result.recommendedAction, 'verify_identifier');
  assert.deepEqual(result.possibleCarriers, ['ups']);
});

test('6. 1Z with one character too many is an invalid structural match', () => {
  const tooLong = `${VALID_1Z_DIGITS}0`;
  assert.equal(tooLong.length, 19);
  const result = detectCourier(normalizeTrackingInput(tooLong));
  assertShape(result);
  assert.equal(result.matched, true);
  assert.equal(result.valid, false);
  assert.equal(result.confidence, 'medium');
  assert.equal(result.reason, 'ups_1z_invalid_structure');
  assert.deepEqual(result.possibleCarriers, ['ups']);
});

test('7. 1R short with one character too few is an invalid structural match', () => {
  const tooShort = VALID_1R_SHORT.slice(0, -1);
  assert.equal(tooShort.length, 15);
  const result = detectCourier(normalizeTrackingInput(tooShort));
  assertShape(result);
  assert.equal(result.matched, true);
  assert.equal(result.valid, false);
  assert.equal(result.confidence, 'medium');
  assert.equal(result.reason, 'ups_roadie_1r_invalid_structure');
  assert.deepEqual(result.possibleCarriers, ['ups-roadie']);
});

test('8. 1R short with one character too many but not long is an invalid structural match', () => {
  const oneOver = `${VALID_1R_SHORT}0`;
  assert.equal(oneOver.length, 17);
  const result = detectCourier(normalizeTrackingInput(oneOver));
  assertShape(result);
  assert.equal(result.matched, true);
  assert.equal(result.valid, false);
  assert.equal(result.confidence, 'medium');
  assert.equal(result.reason, 'ups_roadie_1r_invalid_structure');
  assert.deepEqual(result.possibleCarriers, ['ups-roadie']);
});

test('9. 1R long with one character too few is an invalid structural match', () => {
  const tooShort = VALID_1R_LONG.slice(0, -1);
  assert.equal(tooShort.length, 27);
  const result = detectCourier(normalizeTrackingInput(tooShort));
  assertShape(result);
  assert.equal(result.matched, true);
  assert.equal(result.valid, false);
  assert.equal(result.confidence, 'medium');
  assert.equal(result.reason, 'ups_roadie_1r_invalid_structure');
  assert.deepEqual(result.possibleCarriers, ['ups-roadie']);
});

test('10. 1R long with one character too many is an invalid structural match', () => {
  const tooLong = `${VALID_1R_LONG}0`;
  assert.equal(tooLong.length, 29);
  const result = detectCourier(normalizeTrackingInput(tooLong));
  assertShape(result);
  assert.equal(result.matched, true);
  assert.equal(result.valid, false);
  assert.equal(result.confidence, 'medium');
  assert.equal(result.reason, 'ups_roadie_1r_invalid_structure');
  assert.deepEqual(result.possibleCarriers, ['ups-roadie']);
});

// --- Punctuation / separators / non-ASCII in manually built input (11-16, 21-22) ---

test('11. 1Z containing punctuation is rejected', () => {
  const malformed = { alphanumericInput: '1Z1234567890!23456' };
  const result = detectCourier(malformed);
  assertShape(result);
  assert.equal(result.valid, false);
});

test('12. 1R containing punctuation is rejected', () => {
  const malformed = { alphanumericInput: '1R1234567890!2' };
  const result = detectCourier(malformed);
  assertShape(result);
  assert.equal(result.valid, false);
});

test('13. 1Z containing a hyphen in manually malformed alphanumericInput is rejected', () => {
  const malformed = { alphanumericInput: '1Z1234-67890123456' };
  const result = detectCourier(malformed);
  assertShape(result);
  assert.equal(result.valid, false);
  assert.equal(result.identifierType, 'commercial-courier');
  assert.equal(result.reason, 'ups_1z_invalid_structure');
});

test('14. 1R containing whitespace in manually malformed alphanumericInput is rejected', () => {
  const malformed = { alphanumericInput: '1R1234 67890123' };
  const result = detectCourier(malformed);
  assertShape(result);
  assert.equal(result.valid, false);
});

test('15. lowercase manually constructed 1Z normalized input is rejected', () => {
  const malformed = { alphanumericInput: '1z0000000000000000' };
  const result = detectCourier(malformed);
  assertShape(result);
  assert.equal(result.valid, false);
});

test('16. lowercase manually constructed 1R normalized input is rejected', () => {
  const malformed = { alphanumericInput: '1r00000000000000' };
  const result = detectCourier(malformed);
  assertShape(result);
  assert.equal(result.valid, false);
});

test('21. non-ASCII characters are rejected', () => {
  const malformed = { alphanumericInput: '1Z12345678901234É6' };
  const result = detectCourier(malformed);
  assertShape(result);
  assert.equal(result.valid, false);
});

test('22. Hebrew characters are rejected', () => {
  const malformed = { alphanumericInput: '1Zאבגדהוזחטיכלמנסעפ' };
  const result = detectCourier(malformed);
  assertShape(result);
  assert.equal(result.valid, false);
});

// --- Real normalization path for lowercase/hyphen/space raw input (17-20) ---

test('17. lowercase raw 1Z input passed through normalizeTrackingInput is accepted', () => {
  const result = detectCourier(normalizeTrackingInput(VALID_1Z_DIGITS.toLowerCase()));
  assertShape(result);
  assert.equal(result.matched, true);
  assert.equal(result.valid, true);
  assert.equal(result.normalizedIdentifier, VALID_1Z_DIGITS);
});

test('18. lowercase raw 1R input passed through normalizeTrackingInput is accepted', () => {
  const result = detectCourier(normalizeTrackingInput(VALID_1R_SHORT.toLowerCase()));
  assertShape(result);
  assert.equal(result.matched, true);
  assert.equal(result.valid, true);
  assert.equal(result.normalizedIdentifier, VALID_1R_SHORT);
});

test('19. hyphenated raw UPS input is accepted only if normalization produces the approved structure', () => {
  const hyphenated = '1Z-0000-0000-0000-0000';
  const normalized = normalizeTrackingInput(hyphenated);
  assert.equal(normalized.alphanumericInput, VALID_1Z_DIGITS);
  const result = detectCourier(normalized);
  assertShape(result);
  assert.equal(result.matched, true);
  assert.equal(result.valid, true);
  assert.equal(result.reason, 'ups_1z_structure_valid');
});

test('20. spaced raw UPS input is accepted only if normalization produces the approved structure', () => {
  const spaced = '1R 0000 0000 0000 00';
  const normalized = normalizeTrackingInput(spaced);
  assert.equal(normalized.alphanumericInput, VALID_1R_SHORT);
  const result = detectCourier(normalized);
  assertShape(result);
  assert.equal(result.matched, true);
  assert.equal(result.valid, true);
  assert.equal(result.reason, 'ups_roadie_1r_short_structure_valid');
});

// --- Non-UPS / unknown input (23) ---

test('23. numeric-only input remains unknown', () => {
  const result = detectCourier(normalizeTrackingInput('123456789012345678'));
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
  assert.equal(result.confidence, 'none');
  assert.deepEqual(result.possibleCarriers, []);
  assert.equal(result.reason, 'not_supported_courier_structure');
  assert.equal(result.recommendedAction, 'continue_other_detectors');
});

// --- Cross-detector independence (24-26) ---

test('24. valid container input remains unknown to the courier detector', () => {
  const normalized = normalizeTrackingInput('CSQU3054383');
  const containerResult = detectContainer(normalized);
  assert.equal(containerResult.valid, true);
  const courierResult = detectCourier(normalized);
  assertShape(courierResult);
  assert.equal(courierResult.identifierType, 'unknown');
  assert.equal(courierResult.matched, false);
});

test('25. valid AWB input remains unknown to the courier detector', () => {
  const normalized = normalizeTrackingInput('02012345675');
  const awbResult = detectAwb(normalized);
  assert.equal(awbResult.valid, true);
  const courierResult = detectCourier(normalized);
  assertShape(courierResult);
  assert.equal(courierResult.identifierType, 'unknown');
  assert.equal(courierResult.matched, false);
});

test('26. valid S10 postal input remains unknown to the courier detector', () => {
  const normalized = normalizeTrackingInput('AA876543216AA');
  const postalResult = detectPostal(normalized);
  assert.equal(postalResult.valid, true);
  const courierResult = detectCourier(normalized);
  assertShape(courierResult);
  assert.equal(courierResult.identifierType, 'unknown');
  assert.equal(courierResult.matched, false);
});

// --- Invalid UPS-prefixed structure shape (27-30) ---

test('27. input beginning with 1Z but invalid structure returns matched true and valid false', () => {
  const result = detectCourier(normalizeTrackingInput('1Z12345'));
  assertShape(result);
  assert.equal(result.matched, true);
  assert.equal(result.valid, false);
  assert.equal(result.identifierType, 'commercial-courier');
});

test('28. input beginning with 1R but invalid structure returns matched true and valid false', () => {
  const result = detectCourier(normalizeTrackingInput('1R12345'));
  assertShape(result);
  assert.equal(result.matched, true);
  assert.equal(result.valid, false);
  assert.equal(result.identifierType, 'commercial-courier');
});

test('29. invalid 1Z returns possibleCarriers exactly ["ups"]', () => {
  const result = detectCourier(normalizeTrackingInput('1Z12345'));
  assert.deepEqual(result.possibleCarriers, ['ups']);
});

test('30. invalid 1R returns possibleCarriers exactly ["ups-roadie"]', () => {
  const result = detectCourier(normalizeTrackingInput('1R12345'));
  assert.deepEqual(result.possibleCarriers, ['ups-roadie']);
});

test('31. valid 1Z returns possibleCarriers exactly ["ups"]', () => {
  const result = detectCourier(normalizeTrackingInput(VALID_1Z_DIGITS));
  assert.deepEqual(result.possibleCarriers, ['ups']);
});

test('32. valid 1R returns possibleCarriers exactly ["ups-roadie"]', () => {
  const shortResult = detectCourier(normalizeTrackingInput(VALID_1R_SHORT));
  assert.deepEqual(shortResult.possibleCarriers, ['ups-roadie']);
  const longResult = detectCourier(normalizeTrackingInput(VALID_1R_LONG));
  assert.deepEqual(longResult.possibleCarriers, ['ups-roadie']);
});

// --- Immutability and independence of results (33-37) ---

test('33. possibleCarriers is frozen', () => {
  const result = detectCourier(normalizeTrackingInput(VALID_1Z_DIGITS));
  assert.equal(Object.isFrozen(result.possibleCarriers), true);
  assert.throws(() => { result.possibleCarriers.push('dhl'); }, TypeError);
});

test('34. result object is frozen', () => {
  const result = detectCourier(normalizeTrackingInput(VALID_1Z_DIGITS));
  assert.equal(Object.isFrozen(result), true);
  assert.throws(() => { result.valid = false; }, TypeError);
});

test('35. repeated calls return separate result objects', () => {
  const first = detectCourier(normalizeTrackingInput(VALID_1Z_DIGITS));
  const second = detectCourier(normalizeTrackingInput(VALID_1Z_DIGITS));
  assert.notEqual(first, second);
  assert.notEqual(first.possibleCarriers, second.possibleCarriers);
  assert.deepEqual(first, second);
});

test('36. normalizedInput is not mutated', () => {
  const normalized = normalizeTrackingInput(VALID_1Z_DIGITS);
  const snapshot = JSON.stringify(normalized);
  detectCourier(normalized);
  assert.equal(JSON.stringify(normalized), snapshot);
});

test('37. result contains exactly the required fields', () => {
  const result = detectCourier(normalizeTrackingInput(VALID_1Z_DIGITS));
  assertShape(result);
});

// --- No unauthorized fields introduced (38-45) ---

test('38. no check-digit field is introduced', () => {
  const result = detectCourier(normalizeTrackingInput(VALID_1Z_DIGITS));
  assert.equal('checkDigit' in result, false);
  assert.equal('checkDigitValid' in result, false);
});

test('39. no tracking URL is introduced', () => {
  const result = detectCourier(normalizeTrackingInput(VALID_1Z_DIGITS));
  assert.equal('trackingUrl' in result, false);
  assert.equal('officialTrackingUrl' in result, false);
  assert.equal('url' in result, false);
});

test('40. no API field is introduced', () => {
  const result = detectCourier(normalizeTrackingInput(VALID_1Z_DIGITS));
  assert.equal('apiUrl' in result, false);
  assert.equal('api' in result, false);
  assert.equal('accessToken' in result, false);
});

test('41. no carrier display-name field is introduced', () => {
  const result = detectCourier(normalizeTrackingInput(VALID_1Z_DIGITS));
  assert.equal('displayName' in result, false);
  assert.equal('carrierDisplayName' in result, false);
  assert.equal(result.possibleCarriers[0], 'ups');
});

test('42. no DSV possible carrier is introduced', () => {
  const results = [
    detectCourier(normalizeTrackingInput(VALID_1Z_DIGITS)),
    detectCourier(normalizeTrackingInput(VALID_1R_SHORT)),
    detectCourier(normalizeTrackingInput('1Z12345')),
    detectCourier(normalizeTrackingInput('DSVPH123456789')),
  ];
  for (const result of results) {
    assert.equal(result.possibleCarriers.includes('dsv'), false);
  }
});

test('43. no DHL possible carrier is introduced', () => {
  const results = [
    detectCourier(normalizeTrackingInput(VALID_1Z_DIGITS)),
    detectCourier(normalizeTrackingInput('1234567890')),
  ];
  for (const result of results) {
    assert.equal(result.possibleCarriers.includes('dhl'), false);
  }
});

test('44. no FedEx possible carrier is introduced', () => {
  const results = [
    detectCourier(normalizeTrackingInput(VALID_1Z_DIGITS)),
    detectCourier(normalizeTrackingInput('123456789012')),
  ];
  for (const result of results) {
    assert.equal(result.possibleCarriers.includes('fedex'), false);
  }
});

test('45. no Aramex possible carrier is introduced', () => {
  const results = [
    detectCourier(normalizeTrackingInput(VALID_1Z_DIGITS)),
    detectCourier(normalizeTrackingInput('12345678901')),
  ];
  for (const result of results) {
    assert.equal(result.possibleCarriers.includes('aramex'), false);
  }
});

// --- Missing / malformed normalized input (46-50) ---

test('46. missing argument returns safe unknown result', () => {
  const result = detectCourier();
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
  assert.deepEqual(result.possibleCarriers, []);
});

test('47. null returns safe unknown result', () => {
  const result = detectCourier(null);
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('48. plain object without alphanumericInput returns safe unknown result', () => {
  const result = detectCourier({ foo: 'bar' });
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('49. unsupported alphanumericInput type returns safe unknown result', () => {
  const result = detectCourier({ alphanumericInput: 12345 });
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
});

test('50. empty normalized input returns safe unknown result', () => {
  const result = detectCourier(normalizeTrackingInput(''));
  assertShape(result);
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.matched, false);
  assert.equal(result.normalizedIdentifier, '');
});

// --- Side-effect and privacy guarantees (51-56) ---

test('51-56. no logging, DOM access, storage access, navigation, network, or assistant interaction occurs', () => {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  let logCalled = false;
  console.log = () => { logCalled = true; };
  console.warn = () => { logCalled = true; };
  console.error = () => { logCalled = true; };
  try {
    detectCourier(normalizeTrackingInput(VALID_1Z_DIGITS));
    detectCourier(normalizeTrackingInput(VALID_1R_SHORT));
    detectCourier(normalizeTrackingInput(VALID_1R_LONG));
    detectCourier(normalizeTrackingInput('1Z12345'));
    detectCourier(normalizeTrackingInput('123456789012345678'));
    detectCourier(null);
    detectCourier();
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
  assert.equal(typeof globalThis.XMLHttpRequest, 'undefined');
  assert.equal(typeof globalThis.chatFab, 'undefined');
  assert.equal(typeof globalThis.chatPanel, 'undefined');
});

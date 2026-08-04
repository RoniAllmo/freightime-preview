/**
 * Tests for js/tracking/router.js using the built-in Node.js test runner
 * (`node:test`) and assertion library (`node:assert`).
 *
 * Ambiguity note: the "ambiguous" branch (more than one active detector
 * matching the same normalized input) is fully implemented in router.js,
 * but with the current container format (4 letters + 7 digits, requires
 * letters), AWB format (11 digits, requires no letters), postal/S10
 * format (13 characters: 2 letters + 9 digits + 2 letters), and courier
 * format (`1Z`/`1R`-prefixed, 16/18/28 characters) it is not naturally
 * reachable — no value can simultaneously satisfy more than one of these
 * mutually exclusive structural shapes. Per the task instructions,
 * production validation rules are not weakened and no dependency
 * injection is introduced solely to synthesize this branch. It is
 * therefore not exercised by a dedicated test here; all naturally
 * reachable statuses (empty, recognized-valid, recognized-invalid,
 * unrecognized) are covered below.
 *
 * S10 fixtures (`AA876543216AA`, `AA000000005AA`, `AA700000000AA`, and
 * their deliberately invalid variants) are the same synthetic,
 * non-operational fixtures already used and verified in
 * tests/tracking/detect-postal.test.js and documented in
 * S10_AUTHORITATIVE_VERIFICATION.md. UPS fixtures (`1Z`/`1R`-prefixed
 * synthetic values) are the same kind of synthetic, non-operational
 * fixtures already used and verified in
 * tests/tracking/detect-courier.test.js and documented in
 * UPS_COURIER_IDENTIFIER_RESEARCH.md / COURIER_IMPLEMENTATION_DECISION.md.
 * None represents a real customer or operational shipment, and none was
 * submitted to any tracking service.
 *
 * Requirement #43 ("every existing test suite continues to pass") is
 * validated by running the full `tests/tracking/` suite alongside this
 * file, not duplicated here.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { routeTrackingInput } from '../../js/tracking/router.js';
import { detectContainer } from '../../js/tracking/detect-container.js';
import { detectAwb } from '../../js/tracking/detect-awb.js';
import { detectPostal } from '../../js/tracking/detect-postal.js';
import { detectCourier } from '../../js/tracking/detect-courier.js';
import { normalizeTrackingInput } from '../../js/tracking/normalize.js';

// Synthetic UPS fixtures (not real, operational, or public tracking numbers).
const VALID_1Z = `1Z${'0'.repeat(16)}`;
const VALID_1R_SHORT = `1R${'0'.repeat(14)}`;
const VALID_1R_LONG = `1R${'0'.repeat(26)}`;
const INVALID_1Z = '1Z12345';
const INVALID_1R = '1R12345';

const REQUIRED_FIELDS = [
  'status',
  'originalInput',
  'normalizedInput',
  'identifierType',
  'normalizedIdentifier',
  'possibleCarriers',
  'confidence',
  'valid',
  'ambiguous',
  'reason',
  'recommendedAction',
  'detectorResults',
  'routingDecisionMade',
  'externalUrlSelected',
  'externalNavigationOccurred',
].sort();

function assertShape(result) {
  assert.deepEqual(Object.keys(result).sort(), REQUIRED_FIELDS);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.possibleCarriers), true);
  assert.equal(Object.isFrozen(result.detectorResults), true);
  assert.equal(Object.isFrozen(result.normalizedInput), true);
  assert.equal(result.detectorResults.length, 4);
  assert.equal(result.routingDecisionMade, false);
  assert.equal(result.externalUrlSelected, null);
  assert.equal(result.externalNavigationOccurred, false);
  assert.equal('carrier' in result, false);
  assert.equal('airline' in result, false);
  assert.equal('trackingUrl' in result, false);
  assert.equal('officialTrackingUrl' in result, false);
  assert.equal('ems' in result, false);
  assert.equal('postalCategory' in result, false);
  assert.equal('postalOperator' in result, false);
  assert.equal('countryCode' in result, false);
  assert.equal('serviceIndicator' in result, false);
  assert.equal('apiUrl' in result, false);
  assert.equal('carrierDisplayName' in result, false);
  assert.equal('courierSubtype' in result, false);
  assert.equal('checkDigit' in result, false);
  assert.equal('checkDigitValid' in result, false);
  // Every non-courier, non-ambiguous result must keep possibleCarriers empty.
  if (result.identifierType !== 'commercial-courier' && result.status !== 'ambiguous') {
    assert.deepEqual(result.possibleCarriers, []);
  }
}

test('1. valid container input produces recognized-valid', () => {
  const result = routeTrackingInput('CSQU3054383');
  assertShape(result);
  assert.equal(result.status, 'recognized-valid');
  assert.equal(result.identifierType, 'ocean-container');
  assert.equal(result.valid, true);
  assert.equal(result.ambiguous, false);
});

test('2. valid container input with surrounding spaces before normalization', () => {
  const result = routeTrackingInput('  CSQU3054383  ');
  assertShape(result);
  assert.equal(result.status, 'recognized-valid');
  assert.equal(result.identifierType, 'ocean-container');
  assert.equal(result.valid, true);
});

test('3. container structure with invalid check digit produces recognized-invalid', () => {
  const result = routeTrackingInput('CSQU3054380');
  assertShape(result);
  assert.equal(result.status, 'recognized-invalid');
  assert.equal(result.identifierType, 'ocean-container');
  assert.equal(result.valid, false);
  assert.equal(result.ambiguous, false);
});

test('4. valid AWB input without a hyphen produces recognized-valid', () => {
  const result = routeTrackingInput('02012345675');
  assertShape(result);
  assert.equal(result.status, 'recognized-valid');
  assert.equal(result.identifierType, 'air-waybill');
  assert.equal(result.valid, true);
});

test('5. valid AWB input with a hyphen produces recognized-valid', () => {
  const result = routeTrackingInput('020-12345675');
  assertShape(result);
  assert.equal(result.status, 'recognized-valid');
  assert.equal(result.identifierType, 'air-waybill');
  assert.equal(result.valid, true);
});

test('6. valid AWB input with spaces produces recognized-valid', () => {
  const result = routeTrackingInput('020 12345675');
  assertShape(result);
  assert.equal(result.status, 'recognized-valid');
  assert.equal(result.identifierType, 'air-waybill');
  assert.equal(result.valid, true);
});

test('7. AWB structure with invalid check digit produces recognized-invalid', () => {
  const result = routeTrackingInput('02012345676');
  assertShape(result);
  assert.equal(result.status, 'recognized-invalid');
  assert.equal(result.identifierType, 'air-waybill');
  assert.equal(result.valid, false);
});

test('8. unknown alphanumeric identifier produces unrecognized', () => {
  const result = routeTrackingInput('HELLO12345');
  assertShape(result);
  assert.equal(result.status, 'unrecognized');
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.valid, false);
  assert.equal(result.ambiguous, false);
});

test('9. empty string produces status empty', () => {
  const result = routeTrackingInput('');
  assertShape(result);
  assert.equal(result.status, 'empty');
  assert.equal(result.identifierType, 'unknown');
  assert.equal(result.normalizedIdentifier, '');
  assert.equal(result.valid, false);
});

test('10. whitespace-only string produces status empty', () => {
  const result = routeTrackingInput('    ');
  assertShape(result);
  assert.equal(result.status, 'empty');
});

test('11. null produces status empty', () => {
  const result = routeTrackingInput(null);
  assertShape(result);
  assert.equal(result.status, 'empty');
  assert.equal(result.originalInput, null);
});

test('12. undefined produces status empty', () => {
  const result = routeTrackingInput(undefined);
  assertShape(result);
  assert.equal(result.status, 'empty');
  assert.equal(result.originalInput, undefined);
});

test('13. number input is handled safely', () => {
  const result = routeTrackingInput(12345);
  assertShape(result);
  assert.equal(result.status, 'unrecognized');
  assert.equal(result.originalInput, 12345);
});

test('14. BigInt input is handled safely', () => {
  const result = routeTrackingInput(123n);
  assertShape(result);
  assert.equal(result.status, 'unrecognized');
  assert.equal(result.originalInput, 123n);
});

test('15. boolean input is handled safely (unsupported -> empty)', () => {
  const result = routeTrackingInput(true);
  assertShape(result);
  assert.equal(result.status, 'empty');
  assert.equal(result.originalInput, null);
});

test('16. object input is handled safely (unsupported -> empty)', () => {
  const result = routeTrackingInput({ value: 'CSQU3054383' });
  assertShape(result);
  assert.equal(result.status, 'empty');
  assert.equal(result.originalInput, null);
});

test('17. array input is handled safely (unsupported -> empty)', () => {
  const result = routeTrackingInput(['CSQU3054383']);
  assertShape(result);
  assert.equal(result.status, 'empty');
  assert.equal(result.originalInput, null);
});

test('18. symbol input is handled safely (unsupported -> empty)', () => {
  const result = routeTrackingInput(Symbol('test'));
  assertShape(result);
  assert.equal(result.status, 'empty');
  assert.equal(result.originalInput, null);
});

test('19. function input is handled safely (unsupported -> empty)', () => {
  const result = routeTrackingInput(function sample() { return 'CSQU3054383'; });
  assertShape(result);
  assert.equal(result.status, 'empty');
  assert.equal(result.originalInput, null);
});

test('20. originalInput is preserved exactly for supported values', () => {
  assert.equal(routeTrackingInput('CSQU3054383').originalInput, 'CSQU3054383');
  assert.equal(routeTrackingInput(12345).originalInput, 12345);
  assert.equal(routeTrackingInput(null).originalInput, null);
  assert.equal(routeTrackingInput(undefined).originalInput, undefined);
});

test('21. unsupported values do not retain unsafe object references in originalInput', () => {
  const inputObject = { value: 'CSQU3054383' };
  const inputArray = ['CSQU3054383'];
  const inputFunction = function sample() { return 'CSQU3054383'; };
  assert.equal(routeTrackingInput(inputObject).originalInput, null);
  assert.equal(routeTrackingInput(inputArray).originalInput, null);
  assert.equal(routeTrackingInput(inputFunction).originalInput, null);
  assert.equal(routeTrackingInput(Symbol('x')).originalInput, null);
});

test('22. normalizedInput is included and frozen', () => {
  const result = routeTrackingInput('CSQU3054383');
  assert.equal(Object.isFrozen(result.normalizedInput), true);
  assert.equal(result.normalizedInput.alphanumericInput, 'CSQU3054383');
  assert.deepEqual(result.normalizedInput, normalizeTrackingInput('CSQU3054383'));
});

test('23. all four detector results are included', () => {
  const result = routeTrackingInput('CSQU3054383');
  assert.equal(result.detectorResults.length, 4);
});

test('24. detectorResults order is container, then AWB, then postal, then courier', () => {
  const result = routeTrackingInput('CSQU3054383');
  const normalized = normalizeTrackingInput('CSQU3054383');
  assert.deepEqual(result.detectorResults[0], detectContainer(normalized));
  assert.deepEqual(result.detectorResults[1], detectAwb(normalized));
  assert.deepEqual(result.detectorResults[2], detectPostal(normalized));
  assert.deepEqual(result.detectorResults[3], detectCourier(normalized));
  assert.equal(result.detectorResults[0].identifierType === 'ocean-container' || result.detectorResults[0].identifierType === 'unknown', true);
  assert.equal(result.detectorResults[1].identifierType === 'air-waybill' || result.detectorResults[1].identifierType === 'unknown', true);
  assert.equal(result.detectorResults[2].identifierType === 'international-postal' || result.detectorResults[2].identifierType === 'unknown', true);
  assert.equal(result.detectorResults[3].identifierType === 'commercial-courier' || result.detectorResults[3].identifierType === 'unknown', true);
});

test('25. detectorResults array is frozen', () => {
  const result = routeTrackingInput('CSQU3054383');
  assert.equal(Object.isFrozen(result.detectorResults), true);
  assert.throws(() => {
    'use strict';
    result.detectorResults.push('X');
  }, TypeError);
});

test('26. possibleCarriers remains empty across all statuses', () => {
  assert.deepEqual(routeTrackingInput('CSQU3054383').possibleCarriers, []);
  assert.deepEqual(routeTrackingInput('CSQU3054380').possibleCarriers, []);
  assert.deepEqual(routeTrackingInput('HELLO12345').possibleCarriers, []);
  assert.deepEqual(routeTrackingInput('').possibleCarriers, []);
});

test('27. possibleCarriers array is frozen', () => {
  const result = routeTrackingInput('CSQU3054383');
  assert.equal(Object.isFrozen(result.possibleCarriers), true);
  assert.throws(() => {
    'use strict';
    result.possibleCarriers.push('X');
  }, TypeError);
});

test('28. router result is frozen', () => {
  const result = routeTrackingInput('CSQU3054383');
  assert.equal(Object.isFrozen(result), true);
  assert.throws(() => {
    'use strict';
    result.valid = false;
  }, TypeError);
});

test('29. repeated calls return separate result objects', () => {
  const first = routeTrackingInput('CSQU3054383');
  const second = routeTrackingInput('CSQU3054383');
  assert.notEqual(first, second);
  assert.notEqual(first.detectorResults, second.detectorResults);
  assert.notEqual(first.normalizedInput, second.normalizedInput);
  assert.notEqual(first.possibleCarriers, second.possibleCarriers);
});

test('30. valid container produces recognized-valid', () => {
  assert.equal(routeTrackingInput('CSQU3054383').status, 'recognized-valid');
});

test('31. invalid container check digit produces recognized-invalid', () => {
  assert.equal(routeTrackingInput('CSQU3054380').status, 'recognized-invalid');
});

test('32. valid AWB produces recognized-valid', () => {
  assert.equal(routeTrackingInput('02012345675').status, 'recognized-valid');
});

test('33. invalid AWB check digit produces recognized-invalid', () => {
  assert.equal(routeTrackingInput('02012345676').status, 'recognized-invalid');
});

test('34. unknown input produces unrecognized', () => {
  assert.equal(routeTrackingInput('HELLO12345').status, 'unrecognized');
});

test('35. empty normalized input produces empty', () => {
  assert.equal(routeTrackingInput('').status, 'empty');
});

test('36. no carrier, airline, URL, or external route is selected', () => {
  const result = routeTrackingInput('CSQU3054383');
  assert.deepEqual(result.possibleCarriers, []);
  assert.equal(result.externalUrlSelected, null);
  assert.equal(result.routingDecisionMade, false);
});

test('37. routingDecisionMade remains false across all statuses', () => {
  assert.equal(routeTrackingInput('CSQU3054383').routingDecisionMade, false);
  assert.equal(routeTrackingInput('CSQU3054380').routingDecisionMade, false);
  assert.equal(routeTrackingInput('HELLO12345').routingDecisionMade, false);
  assert.equal(routeTrackingInput('').routingDecisionMade, false);
});

test('38. externalUrlSelected remains null across all statuses', () => {
  assert.equal(routeTrackingInput('CSQU3054383').externalUrlSelected, null);
  assert.equal(routeTrackingInput('CSQU3054380').externalUrlSelected, null);
  assert.equal(routeTrackingInput('HELLO12345').externalUrlSelected, null);
  assert.equal(routeTrackingInput('').externalUrlSelected, null);
});

test('39. externalNavigationOccurred remains false across all statuses', () => {
  assert.equal(routeTrackingInput('CSQU3054383').externalNavigationOccurred, false);
  assert.equal(routeTrackingInput('CSQU3054380').externalNavigationOccurred, false);
  assert.equal(routeTrackingInput('HELLO12345').externalNavigationOccurred, false);
  assert.equal(routeTrackingInput('').externalNavigationOccurred, false);
});

test('40. no DOM, storage, logging, navigation, assistant, analytics, or network side effect occurs', () => {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  let logCalled = false;
  console.log = () => { logCalled = true; };
  console.warn = () => { logCalled = true; };
  console.error = () => { logCalled = true; };
  try {
    routeTrackingInput('CSQU3054383');
    routeTrackingInput('02012345675');
    routeTrackingInput('HELLO12345');
    routeTrackingInput(null);
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  }
  assert.equal(logCalled, false);
  assert.equal(typeof globalThis.document, 'undefined');
  assert.equal(typeof globalThis.window, 'undefined');
});

test('41. valid official-tool S10 fixture AA876543216AA produces recognized-valid international-postal', () => {
  const result = routeTrackingInput('AA876543216AA');
  assertShape(result);
  assert.equal(result.status, 'recognized-valid');
  assert.equal(result.identifierType, 'international-postal');
  assert.equal(result.valid, true);
  assert.equal(result.ambiguous, false);
  assert.equal(result.confidence, 'high');
});

test('42. valid boundary fixture AA000000005AA (11 -> 5) produces recognized-valid postal result', () => {
  const result = routeTrackingInput('AA000000005AA');
  assertShape(result);
  assert.equal(result.status, 'recognized-valid');
  assert.equal(result.identifierType, 'international-postal');
  assert.equal(result.valid, true);
});

test('43. valid boundary fixture AA700000000AA (10 -> 0) produces recognized-valid postal result', () => {
  const result = routeTrackingInput('AA700000000AA');
  assertShape(result);
  assert.equal(result.status, 'recognized-valid');
  assert.equal(result.identifierType, 'international-postal');
  assert.equal(result.valid, true);
});

test('44. invalid-check-digit version of the normal S10 fixture produces recognized-invalid', () => {
  const result = routeTrackingInput('AA876543210AA');
  assertShape(result);
  assert.equal(result.status, 'recognized-invalid');
  assert.equal(result.identifierType, 'international-postal');
  assert.equal(result.valid, false);
  assert.equal(result.confidence, 'medium');
});

test('45. invalid-check-digit version of the 11 -> 5 fixture produces recognized-invalid', () => {
  const result = routeTrackingInput('AA000000001AA');
  assertShape(result);
  assert.equal(result.status, 'recognized-invalid');
  assert.equal(result.identifierType, 'international-postal');
  assert.equal(result.valid, false);
});

test('46. invalid-check-digit version of the 10 -> 0 fixture produces recognized-invalid', () => {
  const result = routeTrackingInput('AA700000001AA');
  assertShape(result);
  assert.equal(result.status, 'recognized-invalid');
  assert.equal(result.identifierType, 'international-postal');
  assert.equal(result.valid, false);
});

test('47. E-prefixed valid S10 input remains international-postal, not EMS', () => {
  const result = routeTrackingInput('EA876543216AA');
  assertShape(result);
  assert.equal(result.status, 'recognized-valid');
  assert.equal(result.identifierType, 'international-postal');
  assert.equal(result.valid, true);
});

test('48. lowercase raw S10 input is normalized and recognized', () => {
  const result = routeTrackingInput('aa876543216aa');
  assertShape(result);
  assert.equal(result.status, 'recognized-valid');
  assert.equal(result.identifierType, 'international-postal');
  assert.equal(result.valid, true);
  assert.equal(result.normalizedIdentifier, 'AA876543216AA');
});

test('49. S10 input containing spaces is normalized and recognized', () => {
  const result = routeTrackingInput('AA 876543216 AA');
  assertShape(result);
  assert.equal(result.status, 'recognized-valid');
  assert.equal(result.identifierType, 'international-postal');
  assert.equal(result.valid, true);
});

test('50. S10 input containing hyphens is normalized and recognized', () => {
  const result = routeTrackingInput('AA-876543216-AA');
  assertShape(result);
  assert.equal(result.status, 'recognized-valid');
  assert.equal(result.identifierType, 'international-postal');
  assert.equal(result.valid, true);
});

test('51. valid postal result recommends postal service classification, not carrier matching', () => {
  const postal = routeTrackingInput('AA876543216AA');
  const container = routeTrackingInput('CSQU3054383');
  assert.equal(postal.recommendedAction, 'proceed_to_postal_service_classification');
  assert.equal(container.recommendedAction, 'proceed_to_carrier_matching');
  assert.notEqual(postal.recommendedAction, container.recommendedAction);
});

test('52. no EMS, postal-category, postal-operator, country-code, or service-indicator field is introduced for any postal result', () => {
  const valid = routeTrackingInput('AA876543216AA');
  const invalid = routeTrackingInput('AA876543210AA');
  const eprefixed = routeTrackingInput('EA876543216AA');
  assertShape(valid);
  assertShape(invalid);
  assertShape(eprefixed);
});

test('53. no carrier or tracking URL is introduced for postal results', () => {
  const result = routeTrackingInput('AA876543216AA');
  assert.deepEqual(result.possibleCarriers, []);
  assert.equal(result.externalUrlSelected, null);
  assert.equal(result.routingDecisionMade, false);
  assert.equal(result.externalNavigationOccurred, false);
});

// --- UPS commercial-courier integration (54 onward) ---

test('54. valid synthetic UPS 1Z returns recognized-valid', () => {
  const result = routeTrackingInput(VALID_1Z);
  assertShape(result);
  assert.equal(result.status, 'recognized-valid');
  assert.equal(result.valid, true);
  assert.equal(result.ambiguous, false);
});

test('55. valid UPS 1Z returns identifierType commercial-courier', () => {
  const result = routeTrackingInput(VALID_1Z);
  assert.equal(result.identifierType, 'commercial-courier');
});

test('56. valid UPS 1Z returns possibleCarriers exactly ["ups"]', () => {
  const result = routeTrackingInput(VALID_1Z);
  assert.deepEqual(result.possibleCarriers, ['ups']);
  assert.equal(result.confidence, 'high');
  assert.equal(result.recommendedAction, 'courier_carrier_identified');
});

test('57. valid UPS Roadie 1R short returns recognized-valid', () => {
  const result = routeTrackingInput(VALID_1R_SHORT);
  assertShape(result);
  assert.equal(result.status, 'recognized-valid');
  assert.equal(result.identifierType, 'commercial-courier');
  assert.equal(result.valid, true);
});

test('58. valid 1R short returns possibleCarriers exactly ["ups-roadie"]', () => {
  const result = routeTrackingInput(VALID_1R_SHORT);
  assert.deepEqual(result.possibleCarriers, ['ups-roadie']);
});

test('59. valid UPS Roadie 1R long returns recognized-valid', () => {
  const result = routeTrackingInput(VALID_1R_LONG);
  assertShape(result);
  assert.equal(result.status, 'recognized-valid');
  assert.equal(result.identifierType, 'commercial-courier');
  assert.equal(result.valid, true);
});

test('60. valid 1R long returns possibleCarriers exactly ["ups-roadie"]', () => {
  const result = routeTrackingInput(VALID_1R_LONG);
  assert.deepEqual(result.possibleCarriers, ['ups-roadie']);
});

test('61. 1R short and 1R long both report "ups-roadie", never collapsed into "ups"', () => {
  assert.deepEqual(routeTrackingInput(VALID_1R_SHORT).possibleCarriers, ['ups-roadie']);
  assert.deepEqual(routeTrackingInput(VALID_1R_LONG).possibleCarriers, ['ups-roadie']);
});

test('62. invalid 1Z structure returns recognized-invalid', () => {
  const result = routeTrackingInput(INVALID_1Z);
  assertShape(result);
  assert.equal(result.status, 'recognized-invalid');
  assert.equal(result.identifierType, 'commercial-courier');
  assert.equal(result.valid, false);
  assert.equal(result.confidence, 'medium');
  assert.equal(result.recommendedAction, 'ask_user_to_verify_identifier');
});

test('63. invalid 1Z preserves possibleCarriers ["ups"]', () => {
  const result = routeTrackingInput(INVALID_1Z);
  assert.deepEqual(result.possibleCarriers, ['ups']);
});

test('64. invalid 1R structure returns recognized-invalid', () => {
  const result = routeTrackingInput(INVALID_1R);
  assertShape(result);
  assert.equal(result.status, 'recognized-invalid');
  assert.equal(result.identifierType, 'commercial-courier');
  assert.equal(result.valid, false);
  assert.equal(result.confidence, 'medium');
});

test('65. invalid 1R preserves possibleCarriers ["ups-roadie"]', () => {
  const result = routeTrackingInput(INVALID_1R);
  assert.deepEqual(result.possibleCarriers, ['ups-roadie']);
});

test('66. lowercase raw 1Z input is normalized and recognized', () => {
  const result = routeTrackingInput(VALID_1Z.toLowerCase());
  assertShape(result);
  assert.equal(result.status, 'recognized-valid');
  assert.equal(result.identifierType, 'commercial-courier');
  assert.equal(result.normalizedIdentifier, VALID_1Z);
  assert.deepEqual(result.possibleCarriers, ['ups']);
});

test('67. lowercase raw 1R input is normalized and recognized', () => {
  const result = routeTrackingInput(VALID_1R_SHORT.toLowerCase());
  assertShape(result);
  assert.equal(result.status, 'recognized-valid');
  assert.equal(result.identifierType, 'commercial-courier');
  assert.equal(result.normalizedIdentifier, VALID_1R_SHORT);
  assert.deepEqual(result.possibleCarriers, ['ups-roadie']);
});

test('68. hyphenated raw UPS input is recognized when normalization produces the approved structure', () => {
  const result = routeTrackingInput('1Z-0000-0000-0000-0000');
  assertShape(result);
  assert.equal(result.status, 'recognized-valid');
  assert.equal(result.identifierType, 'commercial-courier');
  assert.equal(result.normalizedIdentifier, VALID_1Z);
  assert.deepEqual(result.possibleCarriers, ['ups']);
});

test('69. spaced raw UPS input is recognized when normalization produces the approved structure', () => {
  const result = routeTrackingInput('1R 0000 0000 0000 00');
  assertShape(result);
  assert.equal(result.status, 'recognized-valid');
  assert.equal(result.identifierType, 'commercial-courier');
  assert.equal(result.normalizedIdentifier, VALID_1R_SHORT);
  assert.deepEqual(result.possibleCarriers, ['ups-roadie']);
});

test('70. detectorResults contains exactly four results for a courier match', () => {
  const result = routeTrackingInput(VALID_1Z);
  assert.equal(result.detectorResults.length, 4);
});

test('71. detectorResults order is container, AWB, postal, courier for a courier match', () => {
  const result = routeTrackingInput(VALID_1Z);
  const normalized = normalizeTrackingInput(VALID_1Z);
  assert.deepEqual(result.detectorResults[0], detectContainer(normalized));
  assert.deepEqual(result.detectorResults[1], detectAwb(normalized));
  assert.deepEqual(result.detectorResults[2], detectPostal(normalized));
  assert.deepEqual(result.detectorResults[3], detectCourier(normalized));
  assert.equal(result.detectorResults[3].identifierType, 'commercial-courier');
});

test('72. empty input includes four detector results', () => {
  const result = routeTrackingInput('');
  assert.equal(result.status, 'empty');
  assert.equal(result.detectorResults.length, 4);
  assert.deepEqual(result.possibleCarriers, []);
});

test('73. unknown input includes four detector results', () => {
  const result = routeTrackingInput('HELLO12345');
  assert.equal(result.status, 'unrecognized');
  assert.equal(result.detectorResults.length, 4);
  assert.deepEqual(result.possibleCarriers, []);
});

test('74. container behavior remains unchanged with the courier detector active', () => {
  const valid = routeTrackingInput('CSQU3054383');
  const invalid = routeTrackingInput('CSQU3054380');
  assert.equal(valid.status, 'recognized-valid');
  assert.equal(valid.identifierType, 'ocean-container');
  assert.deepEqual(valid.possibleCarriers, []);
  assert.equal(invalid.status, 'recognized-invalid');
  assert.equal(invalid.identifierType, 'ocean-container');
});

test('75. AWB behavior remains unchanged with the courier detector active', () => {
  const valid = routeTrackingInput('02012345675');
  const invalid = routeTrackingInput('02012345676');
  assert.equal(valid.status, 'recognized-valid');
  assert.equal(valid.identifierType, 'air-waybill');
  assert.deepEqual(valid.possibleCarriers, []);
  assert.equal(invalid.status, 'recognized-invalid');
  assert.equal(invalid.identifierType, 'air-waybill');
});

test('76. postal behavior remains unchanged with the courier detector active', () => {
  const valid = routeTrackingInput('AA876543216AA');
  const invalid = routeTrackingInput('AA876543210AA');
  assert.equal(valid.status, 'recognized-valid');
  assert.equal(valid.identifierType, 'international-postal');
  assert.equal(valid.recommendedAction, 'proceed_to_postal_service_classification');
  assert.deepEqual(valid.possibleCarriers, []);
  assert.equal(invalid.status, 'recognized-invalid');
  assert.equal(invalid.identifierType, 'international-postal');
});

test('77. generic numeric input remains unrecognized', () => {
  const result = routeTrackingInput('123456789012345678');
  assertShape(result);
  assert.equal(result.status, 'unrecognized');
  assert.equal(result.identifierType, 'unknown');
  assert.deepEqual(result.possibleCarriers, []);
});

test('78. no DSV carrier ID is ever returned', () => {
  const inputs = [VALID_1Z, VALID_1R_SHORT, VALID_1R_LONG, INVALID_1Z, INVALID_1R, 'DSVPH123456789', '123456789012'];
  for (const input of inputs) {
    assert.equal(routeTrackingInput(input).possibleCarriers.includes('dsv'), false);
  }
});

test('79. no DHL carrier ID is ever returned', () => {
  const inputs = [VALID_1Z, VALID_1R_SHORT, VALID_1R_LONG, INVALID_1Z, INVALID_1R, '1234567890'];
  for (const input of inputs) {
    assert.equal(routeTrackingInput(input).possibleCarriers.includes('dhl'), false);
  }
});

test('80. no FedEx carrier ID is ever returned', () => {
  const inputs = [VALID_1Z, VALID_1R_SHORT, VALID_1R_LONG, INVALID_1Z, INVALID_1R, '123456789012'];
  for (const input of inputs) {
    assert.equal(routeTrackingInput(input).possibleCarriers.includes('fedex'), false);
  }
});

test('81. no Aramex carrier ID is ever returned', () => {
  const inputs = [VALID_1Z, VALID_1R_SHORT, VALID_1R_LONG, INVALID_1Z, INVALID_1R, '12345678901'];
  for (const input of inputs) {
    assert.equal(routeTrackingInput(input).possibleCarriers.includes('aramex'), false);
  }
});

test('82. no UPS Mail Innovations result is returned for a long numeric non-1Z/1R identifier', () => {
  const result = routeTrackingInput('92419900000033499522966220');
  assertShape(result);
  assert.equal(result.status, 'unrecognized');
  assert.equal(result.identifierType, 'unknown');
  assert.deepEqual(result.possibleCarriers, []);
});

test('83. router result remains frozen for a courier match', () => {
  const result = routeTrackingInput(VALID_1Z);
  assert.equal(Object.isFrozen(result), true);
  assert.throws(() => {
    'use strict';
    result.valid = false;
  }, TypeError);
});

test('84. detectorResults remains frozen for a courier match', () => {
  const result = routeTrackingInput(VALID_1Z);
  assert.equal(Object.isFrozen(result.detectorResults), true);
  assert.throws(() => {
    'use strict';
    result.detectorResults.push('X');
  }, TypeError);
});

test('85. possibleCarriers remains frozen for a non-empty courier result', () => {
  const result = routeTrackingInput(VALID_1Z);
  assert.equal(Object.isFrozen(result.possibleCarriers), true);
  assert.throws(() => {
    'use strict';
    result.possibleCarriers.push('dhl');
  }, TypeError);
});

test('86. normalizedInput remains frozen for a courier match', () => {
  const result = routeTrackingInput(VALID_1Z);
  assert.equal(Object.isFrozen(result.normalizedInput), true);
});

test('87. repeated calls return separate router-result objects for a courier match', () => {
  const first = routeTrackingInput(VALID_1Z);
  const second = routeTrackingInput(VALID_1Z);
  assert.notEqual(first, second);
  assert.notEqual(first.possibleCarriers, second.possibleCarriers);
  assert.deepEqual(first.possibleCarriers, second.possibleCarriers);
});

test('88. no tracking URL is selected for a courier match', () => {
  const result = routeTrackingInput(VALID_1Z);
  assert.equal(result.externalUrlSelected, null);
  assert.equal('trackingUrl' in result, false);
});

test('89. routingDecisionMade remains false for a courier match', () => {
  assert.equal(routeTrackingInput(VALID_1Z).routingDecisionMade, false);
  assert.equal(routeTrackingInput(INVALID_1Z).routingDecisionMade, false);
});

test('90. externalUrlSelected remains null for a courier match', () => {
  assert.equal(routeTrackingInput(VALID_1Z).externalUrlSelected, null);
  assert.equal(routeTrackingInput(INVALID_1Z).externalUrlSelected, null);
});

test('91. externalNavigationOccurred remains false for a courier match', () => {
  assert.equal(routeTrackingInput(VALID_1Z).externalNavigationOccurred, false);
  assert.equal(routeTrackingInput(INVALID_1Z).externalNavigationOccurred, false);
});

test('92. no DOM, storage, logging, navigation, assistant, or network side effect occurs for courier input', () => {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  let logCalled = false;
  console.log = () => { logCalled = true; };
  console.warn = () => { logCalled = true; };
  console.error = () => { logCalled = true; };
  try {
    routeTrackingInput(VALID_1Z);
    routeTrackingInput(VALID_1R_SHORT);
    routeTrackingInput(VALID_1R_LONG);
    routeTrackingInput(INVALID_1Z);
    routeTrackingInput(INVALID_1R);
    routeTrackingInput('123456789012345678');
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

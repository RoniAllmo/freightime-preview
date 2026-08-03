/**
 * Tests for js/tracking/router.js using the built-in Node.js test runner
 * (`node:test`) and assertion library (`node:assert`).
 *
 * Ambiguity note: the "ambiguous" branch (more than one active detector
 * matching the same normalized input) is fully implemented in router.js,
 * but with the current container format (4 letters + 7 digits, requires
 * letters) and AWB format (11 digits, requires no letters) it is not
 * naturally reachable — no value can simultaneously satisfy both
 * structural rules. Per the task instructions, production validation
 * rules are not weakened and no dependency injection is introduced
 * solely to synthesize this branch. It is therefore not exercised by a
 * dedicated test here; all naturally reachable statuses (empty,
 * recognized-valid, recognized-invalid, unrecognized) are covered below.
 *
 * Requirements #41/#42/#43 ("existing normalization/container/AWB tests
 * continue to pass") are validated by running the full `tests/tracking/`
 * suite alongside this file, not duplicated here.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { routeTrackingInput } from '../../js/tracking/router.js';
import { detectContainer } from '../../js/tracking/detect-container.js';
import { detectAwb } from '../../js/tracking/detect-awb.js';
import { normalizeTrackingInput } from '../../js/tracking/normalize.js';

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
  assert.deepEqual(result.possibleCarriers, []);
  assert.equal(result.detectorResults.length, 2);
  assert.equal(result.routingDecisionMade, false);
  assert.equal(result.externalUrlSelected, null);
  assert.equal(result.externalNavigationOccurred, false);
  assert.equal('carrier' in result, false);
  assert.equal('airline' in result, false);
  assert.equal('trackingUrl' in result, false);
  assert.equal('officialTrackingUrl' in result, false);
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

test('23. both detector results are included', () => {
  const result = routeTrackingInput('CSQU3054383');
  assert.equal(result.detectorResults.length, 2);
});

test('24. detectorResults order is container then AWB', () => {
  const result = routeTrackingInput('CSQU3054383');
  const normalized = normalizeTrackingInput('CSQU3054383');
  assert.deepEqual(result.detectorResults[0], detectContainer(normalized));
  assert.deepEqual(result.detectorResults[1], detectAwb(normalized));
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

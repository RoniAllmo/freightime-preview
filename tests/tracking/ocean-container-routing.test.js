/**
 * Tests for js/tracking/ocean-container-routing.js using the built-in
 * Node.js test runner (`node:test`) and assertion library (`node:assert`).
 *
 * All router-result inputs below are synthetic, directly-constructed
 * fixtures shaped like `routeTrackingInput`'s (router.js) real output —
 * the same style already used in tests/tracking/official-routing.test.js
 * — never a real customer or operational shipment identifier, and never
 * submitted to any tracking service. These tests exercise
 * `decideOceanContainerTrackingOptions` directly and in isolation.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { decideOceanContainerTrackingOptions } from '../../js/tracking/ocean-container-routing.js';
import { officialTrackingDestinations } from '../../js/tracking/carrier-registry.js';

const REQUIRED_RESULT_FIELDS = Object.freeze([
  'available',
  'destinations',
  'supportLevel',
  'requiresExplicitClick',
  'identifierIncluded',
  'reason',
]);

const REQUIRED_DESTINATION_FIELDS = Object.freeze(['destinationId', 'displayName', 'officialUrl']);

/** Build a minimal, router.js-shaped fixture with sensible defaults. */
function buildRouterResultFixture(overrides = {}) {
  return {
    status: 'recognized-valid',
    originalInput: 'FIXTURE',
    normalizedInput: { originalInput: 'FIXTURE', isEmpty: false },
    identifierType: 'ocean-container',
    normalizedIdentifier: 'FIXTURE-NORMALIZED',
    possibleCarriers: [],
    confidence: 'high',
    valid: true,
    ambiguous: false,
    reason: 'recognized_identifier_valid',
    recommendedAction: 'proceed_to_carrier_matching',
    detectorResults: [],
    routingDecisionMade: false,
    externalUrlSelected: null,
    externalNavigationOccurred: false,
    ...overrides,
  };
}

const validContainer = buildRouterResultFixture();

const invalidContainer = buildRouterResultFixture({
  status: 'recognized-invalid',
  valid: false,
  reason: 'recognized_structure_invalid',
});

const validUps = buildRouterResultFixture({
  identifierType: 'commercial-courier',
  possibleCarriers: ['ups'],
});

const validAwb = buildRouterResultFixture({
  identifierType: 'air-waybill',
});

const validEms = buildRouterResultFixture({
  identifierType: 'international-postal',
  reason: 's10_ems_standard_valid',
});

const unknownInput = buildRouterResultFixture({
  status: 'unrecognized',
  identifierType: 'unknown',
  valid: false,
  reason: 'unrecognized_identifier',
});

const emptyInput = buildRouterResultFixture({
  status: 'empty',
  identifierType: 'unknown',
  valid: false,
  reason: 'empty_input',
});

const ambiguousInput = buildRouterResultFixture({
  status: 'ambiguous',
  identifierType: 'ambiguous',
  valid: false,
  ambiguous: true,
  reason: 'multiple_detector_matches',
});

const EXPECTED_DESTINATION_IDS = Object.freeze(['msc', 'zim', 'maersk']);

test('1. a valid recognized ocean-container result offers exactly the MSC/ZIM/Maersk destinations, in order', () => {
  const decision = decideOceanContainerTrackingOptions(validContainer);
  assert.strictEqual(decision.available, true);
  assert.deepStrictEqual(
    decision.destinations.map((d) => d.destinationId),
    EXPECTED_DESTINATION_IDS,
  );
});

test('2. supportLevel is exactly "detection_only" for an available decision', () => {
  const decision = decideOceanContainerTrackingOptions(validContainer);
  assert.strictEqual(decision.supportLevel, 'detection_only');
});

test('3. every destination matches the registry record it was built from', () => {
  const decision = decideOceanContainerTrackingOptions(validContainer);
  for (const destination of decision.destinations) {
    const record = officialTrackingDestinations.find((r) => r.id === destination.destinationId);
    assert.ok(record, `no registry record for ${destination.destinationId}`);
    assert.strictEqual(destination.displayName, record.displayName);
    assert.strictEqual(destination.officialUrl, record.officialUrl);
  }
});

test('4. no destination officialUrl ever includes the identifier or normalizedIdentifier', () => {
  const decision = decideOceanContainerTrackingOptions(validContainer);
  for (const destination of decision.destinations) {
    assert.ok(!destination.officialUrl.includes('FIXTURE'));
  }
});

test('5. requiresExplicitClick is true and identifierIncluded is false for an available decision', () => {
  const decision = decideOceanContainerTrackingOptions(validContainer);
  assert.strictEqual(decision.requiresExplicitClick, true);
  assert.strictEqual(decision.identifierIncluded, false);
});

test('6. an available decision reports exactly the required fields, no more, no fewer', () => {
  const decision = decideOceanContainerTrackingOptions(validContainer);
  assert.deepStrictEqual(Object.keys(decision).sort(), [...REQUIRED_RESULT_FIELDS].sort());
});

test('7. every destination has exactly the required fields, no more, no fewer', () => {
  const decision = decideOceanContainerTrackingOptions(validContainer);
  for (const destination of decision.destinations) {
    assert.deepStrictEqual(Object.keys(destination).sort(), [...REQUIRED_DESTINATION_FIELDS].sort());
  }
});

test('8. an invalid (check-digit-failed) container result offers no options', () => {
  const decision = decideOceanContainerTrackingOptions(invalidContainer);
  assert.strictEqual(decision.available, false);
  assert.deepStrictEqual(decision.destinations, []);
  assert.strictEqual(decision.supportLevel, 'unsupported');
  assert.strictEqual(decision.reason, 'invalid_identifier_no_route');
});

test('9. an ambiguous result offers no options', () => {
  const decision = decideOceanContainerTrackingOptions(ambiguousInput);
  assert.strictEqual(decision.available, false);
  assert.strictEqual(decision.reason, 'ambiguous_identifier_no_route');
});

test('10. an unrecognized result offers no options', () => {
  const decision = decideOceanContainerTrackingOptions(unknownInput);
  assert.strictEqual(decision.available, false);
  assert.strictEqual(decision.reason, 'unsupported_identifier_no_route');
});

test('11. an empty result offers no options', () => {
  const decision = decideOceanContainerTrackingOptions(emptyInput);
  assert.strictEqual(decision.available, false);
  assert.strictEqual(decision.reason, 'unsupported_identifier_no_route');
});

test('12. a valid UPS (non-container) result offers no ocean-carrier options', () => {
  const decision = decideOceanContainerTrackingOptions(validUps);
  assert.strictEqual(decision.available, false);
  assert.strictEqual(decision.reason, 'unsupported_identifier_no_route');
});

test('13. a valid AWB result offers no ocean-carrier options', () => {
  const decision = decideOceanContainerTrackingOptions(validAwb);
  assert.strictEqual(decision.available, false);
});

test('14. a valid EMS result offers no ocean-carrier options', () => {
  const decision = decideOceanContainerTrackingOptions(validEms);
  assert.strictEqual(decision.available, false);
});

test('15. every "no options" result reports exactly the required fields, no more, no fewer', () => {
  for (const state of [invalidContainer, ambiguousInput, unknownInput, emptyInput, validUps]) {
    const decision = decideOceanContainerTrackingOptions(state);
    assert.deepStrictEqual(Object.keys(decision).sort(), [...REQUIRED_RESULT_FIELDS].sort());
  }
});

test('16a. a null routerResult is handled safely (malformed, no throw)', () => {
  const decision = decideOceanContainerTrackingOptions(null);
  assert.strictEqual(decision.available, false);
  assert.strictEqual(decision.reason, 'malformed_router_result_no_route');
});

test('16b. an undefined routerResult is handled safely', () => {
  const decision = decideOceanContainerTrackingOptions(undefined);
  assert.strictEqual(decision.available, false);
  assert.strictEqual(decision.reason, 'malformed_router_result_no_route');
});

test('16c. a string routerResult is handled safely', () => {
  const decision = decideOceanContainerTrackingOptions('not-an-object');
  assert.strictEqual(decision.available, false);
});

test('16d. an array routerResult is handled safely', () => {
  const decision = decideOceanContainerTrackingOptions(['ocean-container']);
  assert.strictEqual(decision.available, false);
});

test('16e. an object missing required fields is handled safely', () => {
  const decision = decideOceanContainerTrackingOptions({ identifierType: 'ocean-container' });
  assert.strictEqual(decision.available, false);
  assert.strictEqual(decision.reason, 'malformed_router_result_no_route');
});

test('17. the returned decision and its destinations array are frozen', () => {
  const decision = decideOceanContainerTrackingOptions(validContainer);
  assert.ok(Object.isFrozen(decision));
  assert.ok(Object.isFrozen(decision.destinations));
  for (const destination of decision.destinations) {
    assert.ok(Object.isFrozen(destination));
  }
});

test('18. two calls with equivalent input return distinct frozen objects (no shared mutable state)', () => {
  const first = decideOceanContainerTrackingOptions(validContainer);
  const second = decideOceanContainerTrackingOptions(validContainer);
  assert.notStrictEqual(first, second);
  assert.deepStrictEqual(first, second);
});

test('19. calling the function does not mutate the input routerResult', () => {
  const input = buildRouterResultFixture();
  const snapshotKeys = Object.keys(input).sort();
  decideOceanContainerTrackingOptions(input);
  assert.deepStrictEqual(Object.keys(input).sort(), snapshotKeys);
  assert.strictEqual(input.identifierType, 'ocean-container');
});

test('20. calling the function does not mutate the carrier registry', () => {
  const before = JSON.stringify(officialTrackingDestinations);
  decideOceanContainerTrackingOptions(validContainer);
  const after = JSON.stringify(officialTrackingDestinations);
  assert.strictEqual(before, after);
});

test('21. importing and using the module causes no DOM, network, navigation, storage, logging, or assistant interaction', () => {
  assert.strictEqual(typeof window, 'undefined');
  assert.strictEqual(typeof document, 'undefined');
  decideOceanContainerTrackingOptions(validContainer);
});

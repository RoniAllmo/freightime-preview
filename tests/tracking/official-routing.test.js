/**
 * Tests for js/tracking/official-routing.js using the built-in Node.js
 * test runner (`node:test`) and assertion library (`node:assert`).
 *
 * All router-result inputs below are synthetic, directly-constructed
 * fixtures shaped like `routeTrackingInput`'s (router.js) real output —
 * the same style already used in tests/tracking/router.test.js — never a
 * real customer or operational shipment identifier, and never submitted
 * to any tracking service. This module is not integrated into router.js
 * or the website by this task; these tests exercise
 * `decideOfficialTrackingRoute` directly and in isolation.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { decideOfficialTrackingRoute } from '../../js/tracking/official-routing.js';
import { officialTrackingDestinations } from '../../js/tracking/carrier-registry.js';

const REQUIRED_RESULT_FIELDS = Object.freeze([
  'available',
  'destinationId',
  'displayName',
  'officialUrl',
  'requiresExplicitClick',
  'identifierIncluded',
  'reason',
]);

/** Build a minimal, router.js-shaped fixture with sensible defaults. */
function buildRouterResultFixture(overrides = {}) {
  return {
    status: 'recognized-valid',
    originalInput: 'FIXTURE',
    normalizedInput: { originalInput: 'FIXTURE', isEmpty: false },
    identifierType: 'commercial-courier',
    normalizedIdentifier: 'FIXTURE-NORMALIZED',
    possibleCarriers: ['ups'],
    confidence: 'high',
    valid: true,
    ambiguous: false,
    reason: 'recognized_identifier_valid',
    recommendedAction: 'courier_carrier_identified',
    detectorResults: [],
    routingDecisionMade: false,
    externalUrlSelected: null,
    externalNavigationOccurred: false,
    ...overrides,
  };
}

const validUps = buildRouterResultFixture({
  identifierType: 'commercial-courier',
  possibleCarriers: ['ups'],
});

const validUpsRoadie = buildRouterResultFixture({
  identifierType: 'commercial-courier',
  possibleCarriers: ['ups-roadie'],
});

const validEmsStandard = buildRouterResultFixture({
  identifierType: 'international-postal',
  possibleCarriers: [],
  reason: 's10_ems_standard_valid',
  normalizedIdentifier: 'EA876543216AA',
});

const validEmsBilateral = buildRouterResultFixture({
  identifierType: 'international-postal',
  possibleCarriers: [],
  reason: 's10_ems_bilateral_valid',
  normalizedIdentifier: 'EX876543216AA',
});

const invalidUps = buildRouterResultFixture({
  status: 'recognized-invalid',
  identifierType: 'commercial-courier',
  possibleCarriers: ['ups'],
  valid: false,
  reason: 'recognized_structure_invalid',
});

const invalidUpsRoadie = buildRouterResultFixture({
  status: 'recognized-invalid',
  identifierType: 'commercial-courier',
  possibleCarriers: ['ups-roadie'],
  valid: false,
  reason: 'recognized_structure_invalid',
});

const invalidEms = buildRouterResultFixture({
  status: 'recognized-invalid',
  identifierType: 'international-postal',
  possibleCarriers: [],
  valid: false,
  reason: 's10_ems_invalid_check_digit',
});

const genericS10 = buildRouterResultFixture({
  identifierType: 'international-postal',
  possibleCarriers: [],
  reason: 'recognized_identifier_valid',
});

const validAwb = buildRouterResultFixture({
  identifierType: 'air-waybill',
  possibleCarriers: [],
  reason: 'recognized_identifier_valid',
});

const validContainer = buildRouterResultFixture({
  identifierType: 'ocean-container',
  possibleCarriers: [],
  reason: 'recognized_identifier_valid',
});

const unknownInput = buildRouterResultFixture({
  status: 'unrecognized',
  identifierType: 'unknown',
  possibleCarriers: [],
  valid: false,
  ambiguous: false,
  reason: 'unrecognized_identifier',
});

const emptyInput = buildRouterResultFixture({
  status: 'empty',
  identifierType: 'unknown',
  possibleCarriers: [],
  valid: false,
  ambiguous: false,
  reason: 'empty_input',
});

const ambiguousInput = buildRouterResultFixture({
  status: 'ambiguous',
  identifierType: 'ambiguous',
  possibleCarriers: ['ups', 'ups-roadie'],
  valid: false,
  ambiguous: true,
  reason: 'multiple_detector_matches',
});

const malformedPossibleCarriers = buildRouterResultFixture({
  identifierType: 'commercial-courier',
  possibleCarriers: 'ups', // not an array
});

const multiplePossibleCarriers = buildRouterResultFixture({
  identifierType: 'commercial-courier',
  possibleCarriers: ['ups', 'ups-roadie'],
  ambiguous: false, // synthetic: shape not naturally reachable via router.js
});

const unsupportedCarrierId = buildRouterResultFixture({
  identifierType: 'commercial-courier',
  possibleCarriers: ['unknown-carrier'],
});

const dsvInput = buildRouterResultFixture({
  identifierType: 'commercial-courier',
  possibleCarriers: ['dsv'],
});

const dhlInput = buildRouterResultFixture({
  identifierType: 'commercial-courier',
  possibleCarriers: ['dhl'],
});

const fedexInput = buildRouterResultFixture({
  identifierType: 'commercial-courier',
  possibleCarriers: ['fedex'],
});

const aramexInput = buildRouterResultFixture({
  identifierType: 'commercial-courier',
  possibleCarriers: ['aramex'],
});

const mailInnovationsInput = buildRouterResultFixture({
  identifierType: 'commercial-courier',
  possibleCarriers: ['ups-mail-innovations'],
});

test('1. a valid UPS router result offers destination "ups"', () => {
  const decision = decideOfficialTrackingRoute(validUps);
  assert.strictEqual(decision.available, true);
  assert.strictEqual(decision.destinationId, 'ups');
});

test('2. the UPS decision returns the exact generic UPS URL', () => {
  const decision = decideOfficialTrackingRoute(validUps);
  assert.strictEqual(decision.officialUrl, 'https://www.ups.com/track?loc=EN_US');
  assert.strictEqual(decision.displayName, 'UPS');
});

test('3. a valid UPS Roadie router result offers destination "ups-roadie"', () => {
  const decision = decideOfficialTrackingRoute(validUpsRoadie);
  assert.strictEqual(decision.available, true);
  assert.strictEqual(decision.destinationId, 'ups-roadie');
});

test('4. the UPS Roadie decision returns the exact generic Roadie URL', () => {
  const decision = decideOfficialTrackingRoute(validUpsRoadie);
  assert.strictEqual(decision.officialUrl, 'https://track.roadie.com/');
  assert.strictEqual(decision.displayName, 'UPS Roadie');
});

test('5. a valid standard EMS router result offers destination "ems"', () => {
  const decision = decideOfficialTrackingRoute(validEmsStandard);
  assert.strictEqual(decision.available, true);
  assert.strictEqual(decision.destinationId, 'ems');
});

test('6. a valid bilateral EMS router result offers the same destination "ems"', () => {
  const decision = decideOfficialTrackingRoute(validEmsBilateral);
  assert.strictEqual(decision.available, true);
  assert.strictEqual(decision.destinationId, 'ems');
});

test('7. the EMS decision returns the exact generic EMS URL', () => {
  const standard = decideOfficialTrackingRoute(validEmsStandard);
  const bilateral = decideOfficialTrackingRoute(validEmsBilateral);
  assert.strictEqual(standard.officialUrl, 'https://items.ems.post/');
  assert.strictEqual(bilateral.officialUrl, 'https://items.ems.post/');
  assert.strictEqual(standard.displayName, 'EMS');
});

test('8. every available route requires an explicit click', () => {
  for (const fixture of [validUps, validUpsRoadie, validEmsStandard, validEmsBilateral]) {
    const decision = decideOfficialTrackingRoute(fixture);
    assert.strictEqual(decision.requiresExplicitClick, true);
  }
});

test('9. identifierIncluded is false for every available route', () => {
  for (const fixture of [validUps, validUpsRoadie, validEmsStandard, validEmsBilateral]) {
    const decision = decideOfficialTrackingRoute(fixture);
    assert.strictEqual(decision.identifierIncluded, false);
  }
});

test('10. the returned officialUrl never contains normalizedIdentifier', () => {
  for (const fixture of [validUps, validUpsRoadie, validEmsStandard, validEmsBilateral]) {
    const decision = decideOfficialTrackingRoute(fixture);
    assert.ok(!decision.officialUrl.includes(fixture.normalizedIdentifier));
  }
});

test('11. an invalid UPS structure returns no route', () => {
  const decision = decideOfficialTrackingRoute(invalidUps);
  assert.strictEqual(decision.available, false);
  assert.strictEqual(decision.reason, 'invalid_identifier_no_route');
});

test('12. an invalid UPS Roadie structure returns no route', () => {
  const decision = decideOfficialTrackingRoute(invalidUpsRoadie);
  assert.strictEqual(decision.available, false);
  assert.strictEqual(decision.reason, 'invalid_identifier_no_route');
});

test('13. an invalid EMS check digit returns no route', () => {
  const decision = decideOfficialTrackingRoute(invalidEms);
  assert.strictEqual(decision.available, false);
  assert.strictEqual(decision.reason, 'invalid_identifier_no_route');
});

test('14. generic non-EMS S10 returns no route', () => {
  const decision = decideOfficialTrackingRoute(genericS10);
  assert.strictEqual(decision.available, false);
  assert.strictEqual(decision.reason, 'unsupported_identifier_no_route');
});

test('15. a valid AWB returns no route', () => {
  const decision = decideOfficialTrackingRoute(validAwb);
  assert.strictEqual(decision.available, false);
  assert.strictEqual(decision.reason, 'unsupported_identifier_no_route');
});

test('16. a valid container returns no route', () => {
  const decision = decideOfficialTrackingRoute(validContainer);
  assert.strictEqual(decision.available, false);
  assert.strictEqual(decision.reason, 'unsupported_identifier_no_route');
});

test('17. unknown/unrecognized input returns no route', () => {
  const decision = decideOfficialTrackingRoute(unknownInput);
  assert.strictEqual(decision.available, false);
});

test('18. empty input returns no route', () => {
  const decision = decideOfficialTrackingRoute(emptyInput);
  assert.strictEqual(decision.available, false);
});

test('19. ambiguous input returns no route', () => {
  const decision = decideOfficialTrackingRoute(ambiguousInput);
  assert.strictEqual(decision.available, false);
  assert.strictEqual(decision.reason, 'ambiguous_identifier_no_route');
});

test('20. a missing argument returns a safe no-route result', () => {
  const decision = decideOfficialTrackingRoute();
  assert.strictEqual(decision.available, false);
  assert.strictEqual(decision.reason, 'malformed_router_result_no_route');
});

test('21. null returns a safe no-route result', () => {
  const decision = decideOfficialTrackingRoute(null);
  assert.strictEqual(decision.available, false);
  assert.strictEqual(decision.reason, 'malformed_router_result_no_route');
});

test('22. a plain object returns a safe no-route result', () => {
  const decision = decideOfficialTrackingRoute({});
  assert.strictEqual(decision.available, false);
  assert.strictEqual(decision.reason, 'malformed_router_result_no_route');
});

test('23. malformed possibleCarriers returns no route', () => {
  const decision = decideOfficialTrackingRoute(malformedPossibleCarriers);
  assert.strictEqual(decision.available, false);
  assert.strictEqual(decision.reason, 'malformed_router_result_no_route');
});

test('24. multiple possible carriers return no route', () => {
  const decision = decideOfficialTrackingRoute(multiplePossibleCarriers);
  assert.strictEqual(decision.available, false);
});

test('25. an unsupported carrier ID returns no route', () => {
  const decision = decideOfficialTrackingRoute(unsupportedCarrierId);
  assert.strictEqual(decision.available, false);
  assert.strictEqual(decision.reason, 'unsupported_identifier_no_route');
});

test('26. a DSV-style courier result returns no route', () => {
  const decision = decideOfficialTrackingRoute(dsvInput);
  assert.strictEqual(decision.available, false);
});

test('27. a DHL-style courier result returns no route', () => {
  const decision = decideOfficialTrackingRoute(dhlInput);
  assert.strictEqual(decision.available, false);
});

test('28. a FedEx-style courier result returns no route', () => {
  const decision = decideOfficialTrackingRoute(fedexInput);
  assert.strictEqual(decision.available, false);
});

test('29. an Aramex-style courier result returns no route', () => {
  const decision = decideOfficialTrackingRoute(aramexInput);
  assert.strictEqual(decision.available, false);
});

test('30. a Mail Innovations-style courier result returns no route', () => {
  const decision = decideOfficialTrackingRoute(mailInnovationsInput);
  assert.strictEqual(decision.available, false);
});

test('31. every decision object contains exactly the required fields', () => {
  const fixtures = [
    validUps,
    validUpsRoadie,
    validEmsStandard,
    invalidUps,
    genericS10,
    ambiguousInput,
    unknownInput,
    {},
    null,
  ];
  for (const fixture of fixtures) {
    const decision = decideOfficialTrackingRoute(fixture);
    assert.deepStrictEqual(Object.keys(decision).sort(), [...REQUIRED_RESULT_FIELDS].sort());
  }
});

test('32. every returned decision object is frozen', () => {
  for (const fixture of [validUps, invalidUps, ambiguousInput, {}]) {
    const decision = decideOfficialTrackingRoute(fixture);
    assert.ok(Object.isFrozen(decision));
  }
});

test('33. repeated calls return separate result objects, not a shared reference', () => {
  const first = decideOfficialTrackingRoute(validUps);
  const second = decideOfficialTrackingRoute(validUps);
  assert.notStrictEqual(first, second);
  assert.deepStrictEqual(first, second);
});

test('34. the input router result is not mutated', () => {
  const fixture = buildRouterResultFixture({
    identifierType: 'commercial-courier',
    possibleCarriers: ['ups'],
  });
  const snapshotKeys = Object.keys(fixture).sort();
  const snapshotJson = JSON.stringify(fixture);

  decideOfficialTrackingRoute(fixture);

  assert.deepStrictEqual(Object.keys(fixture).sort(), snapshotKeys);
  assert.strictEqual(JSON.stringify(fixture), snapshotJson);
});

test('35. the input possibleCarriers array is not mutated', () => {
  const carriers = ['ups'];
  const fixture = buildRouterResultFixture({
    identifierType: 'commercial-courier',
    possibleCarriers: carriers,
  });

  decideOfficialTrackingRoute(fixture);

  assert.deepStrictEqual(carriers, ['ups']);
  assert.strictEqual(fixture.possibleCarriers, carriers);
});

test('36. registry records are not mutated by any decision', () => {
  const beforeUps = { ...officialTrackingDestinations.find((entry) => entry.id === 'ups') };

  decideOfficialTrackingRoute(validUps);
  decideOfficialTrackingRoute(validUpsRoadie);
  decideOfficialTrackingRoute(validEmsStandard);
  decideOfficialTrackingRoute(invalidUps);

  const afterUps = officialTrackingDestinations.find((entry) => entry.id === 'ups');
  assert.deepStrictEqual(afterUps, beforeUps);
  assert.ok(Object.isFrozen(afterUps));
});

test('37. no result object contains a tracking-number field', () => {
  const decision = decideOfficialTrackingRoute(validUps);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(decision, 'trackingNumber'), false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(decision, 'identifier'), false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(decision, 'normalizedIdentifier'), false);
});

test('38. no result object contains a prefilled-URL field', () => {
  const decision = decideOfficialTrackingRoute(validUps);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(decision, 'prefilledUrl'), false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(decision, 'prefillUrl'), false);
});

test('39. no result object contains an API or live-tracking field', () => {
  const decision = decideOfficialTrackingRoute(validUps);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(decision, 'apiEndpoint'), false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(decision, 'liveTrackingUrl'), false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(decision, 'apiKey'), false);
});

test('40. no DOM access occurs when deciding a route', () => {
  assert.strictEqual(typeof window, 'undefined');
  assert.strictEqual(typeof document, 'undefined');
  decideOfficialTrackingRoute(validUps);
});

test('41. no network request occurs when deciding a route', () => {
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = () => {
    fetchCalled = true;
    throw new Error('fetch must not be called by official-routing.js');
  };
  try {
    decideOfficialTrackingRoute(validUps);
    decideOfficialTrackingRoute(validEmsStandard);
    decideOfficialTrackingRoute(invalidUps);
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.strictEqual(fetchCalled, false);
});

test('42. no navigation occurs when deciding a route', () => {
  const decision = decideOfficialTrackingRoute(validUps);
  assert.strictEqual(decision.available, true);
  // The module returns data only; there is no window/location API in this
  // environment for it to call, and no navigation side effect is observed.
  assert.strictEqual(typeof globalThis.location, 'undefined');
});

test('43. no storage access occurs when deciding a route', () => {
  assert.strictEqual(typeof localStorage, 'undefined');
  assert.strictEqual(typeof sessionStorage, 'undefined');
  decideOfficialTrackingRoute(validUps);
});

test('44. no logging occurs when deciding a route', () => {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  let logged = false;
  console.log = () => { logged = true; };
  console.warn = () => { logged = true; };
  console.error = () => { logged = true; };
  try {
    decideOfficialTrackingRoute(validUps);
    decideOfficialTrackingRoute(invalidEms);
    decideOfficialTrackingRoute(null);
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  }
  assert.strictEqual(logged, false);
});

test('45. no analytics field or call occurs when deciding a route', () => {
  const decision = decideOfficialTrackingRoute(validUps);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(decision, 'analytics'), false);
  assert.strictEqual(typeof globalThis.gtag, 'undefined');
  assert.strictEqual(typeof globalThis.analytics, 'undefined');
});

test('46. no assistant interaction occurs when deciding a route', () => {
  const decision = decideOfficialTrackingRoute(validUps);
  for (const key of Object.keys(decision)) {
    assert.ok(!/chat|assistant/i.test(key));
  }
});

test('47. dynamically importing official-routing.js exposes decideOfficialTrackingRoute with no import side effects', async () => {
  const before = { hadWindow: typeof window, hadDocument: typeof document };
  const module = await import('../../js/tracking/official-routing.js');
  assert.strictEqual(typeof module.decideOfficialTrackingRoute, 'function');
  assert.strictEqual(typeof window, before.hadWindow);
  assert.strictEqual(typeof document, before.hadDocument);
});

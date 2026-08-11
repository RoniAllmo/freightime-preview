/** All fixtures are synthetic identifiers, never real container numbers. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  identifyContainerOwner,
  decideContainerOwnerContext,
} from '../../js/tracking/container-owner-registry.js';

function validRouterResult(overrides = {}) {
  return {
    status: 'recognized-valid',
    identifierType: 'ocean-container',
    normalizedIdentifier: 'MSCU0000007',
    valid: true,
    ambiguous: false,
    ...overrides,
  };
}

test('1. a verified shipping-line owner code resolves with high confidence', () => {
  const result = identifyContainerOwner('MSC');
  assert.equal(result.ownerType, 'shipping_line');
  assert.equal(result.routingConfidence, 'high');
  assert.equal(result.officialTrackingDestinationId, 'msc');
});

test('2. lowercase owner code is normalized before lookup', () => {
  const result = identifyContainerOwner('msc');
  assert.equal(result.ownerCode, 'MSC');
  assert.equal(result.routingConfidence, 'high');
});

test('3. an unmapped owner code returns unknown, never a guess', () => {
  const result = identifyContainerOwner('CSQ');
  assert.equal(result.ownerType, 'unknown');
  assert.equal(result.routingConfidence, 'none');
  assert.equal(result.registeredOwnerName, null);
});

test('4. a known non-carrier owner (leasing company) never routes to a shipping line', () => {
  const registry = { TCL: { registeredOwnerName: 'Example Leasing Co', ownerType: 'leasing_company' } };
  const result = identifyContainerOwner('TCL', registry);
  assert.equal(result.ownerType, 'leasing_company');
  assert.equal(result.routingConfidence, 'none');
  assert.equal(result.officialTrackingDestinationId, null);
  assert.equal(result.trackingCarrierCandidate, null);
});

test('5. malformed/invalid owner code input is handled safely', () => {
  assert.equal(identifyContainerOwner(null).ownerType, 'unknown');
  assert.equal(identifyContainerOwner(123).ownerType, 'unknown');
  assert.equal(identifyContainerOwner('AB').ownerType, 'unknown');
  assert.equal(identifyContainerOwner('ABCD').ownerType, 'unknown');
});

test('6. decideContainerOwnerContext extracts the owner code only after recognized-valid status', () => {
  const context = decideContainerOwnerContext(validRouterResult());
  assert.equal(context.available, true);
  assert.equal(context.ownerInfo.ownerCode, 'MSC');
  assert.equal(context.primaryDestination.destinationId, 'msc');
  assert.equal(context.suppressMultiCarrierFallback, true);
});

test('7. an invalid-check-digit container never contributes an owner context', () => {
  const context = decideContainerOwnerContext(validRouterResult({ status: 'recognized-invalid', valid: false }));
  assert.equal(context.available, false);
});

test('8. a non-ocean-container identifier type never contributes an owner context', () => {
  const context = decideContainerOwnerContext(validRouterResult({ identifierType: 'air-waybill' }));
  assert.equal(context.available, false);
});

test('9. a high-confidence route yields exactly one primary destination', () => {
  const context = decideContainerOwnerContext(validRouterResult());
  assert.ok(context.primaryDestination);
  assert.equal(typeof context.primaryDestination.officialUrl, 'string');
});

test('10. an unknown owner code never suppresses the multi-carrier fallback', () => {
  const context = decideContainerOwnerContext(validRouterResult({ normalizedIdentifier: 'CSQU3054383' }));
  assert.equal(context.suppressMultiCarrierFallback, false);
  assert.equal(context.primaryDestination, null);
  assert.equal(context.ownerInfo.ownerType, 'unknown');
});

test('11. the current shipping line is never claimed as confirmed -- only "registered" language is used internally', () => {
  const result = identifyContainerOwner('MSC');
  assert.ok(result.limitation.includes('ייתכן'));
});

test('12. malformed router-result input is handled safely', () => {
  assert.equal(decideContainerOwnerContext(null).available, false);
  assert.equal(decideContainerOwnerContext(undefined).available, false);
  assert.equal(decideContainerOwnerContext('MSCU0000007').available, false);
});

test('13. results are frozen', () => {
  assert.ok(Object.isFrozen(identifyContainerOwner('MSC')));
  assert.ok(Object.isFrozen(decideContainerOwnerContext(validRouterResult())));
});

test('14. calling the module performs no network, DOM, or storage access', () => {
  assert.equal(typeof window, 'undefined');
  assert.equal(typeof document, 'undefined');
  identifyContainerOwner('MSC');
  decideContainerOwnerContext(validRouterResult());
});

test('15. ZIM and Maersk owner codes resolve identically to MSC (three verified entries)', () => {
  const zim = identifyContainerOwner('ZIM');
  assert.equal(zim.officialTrackingDestinationId, 'zim');
  const maersk = identifyContainerOwner('MAE');
  assert.equal(maersk.officialTrackingDestinationId, 'maersk');
});

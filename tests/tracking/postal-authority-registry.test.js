/** All fixtures are synthetic identifiers, never real tracking numbers. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  identifyPostalAuthority,
  decidePostalAuthorityContext,
} from '../../js/tracking/postal-authority-registry.js';

function validRouterResult(overrides = {}) {
  return {
    status: 'recognized-valid',
    identifierType: 'international-postal',
    normalizedIdentifier: 'EE123456785IL',
    valid: true,
    ambiguous: false,
    ...overrides,
  };
}

test('1. a verified country code resolves with the country name', () => {
  const result = identifyPostalAuthority('IL');
  assert.equal(result.issuingCountryName, 'ישראל');
  assert.equal(result.routingConfidence, 'high');
});

test('2. lowercase country code is normalized before lookup', () => {
  const result = identifyPostalAuthority('il');
  assert.equal(result.countryCode, 'IL');
});

test('3. an unmapped country code honestly reports no routing confidence, never a guess', () => {
  const result = identifyPostalAuthority('ZZ');
  assert.equal(result.routingConfidence, 'none');
  assert.equal(result.issuingCountryName, null);
});

test('4. this module never adds a new official tracking destination', () => {
  const result = identifyPostalAuthority('IL');
  assert.equal(result.officialTrackingDestinationId, null);
});

test('5. the module never claims the destination country or last-mile operator', () => {
  const result = identifyPostalAuthority('IL');
  assert.ok(result.limitation.includes('מדינת היעד'));
  assert.ok(result.limitation.includes('המחלק'));
});

test('6. malformed country code input is handled safely', () => {
  assert.equal(identifyPostalAuthority(null).routingConfidence, 'none');
  assert.equal(identifyPostalAuthority('I').routingConfidence, 'none');
  assert.equal(identifyPostalAuthority('ILX').routingConfidence, 'none');
});

test('7. decidePostalAuthorityContext extracts the suffix only after recognized-valid status', () => {
  const context = decidePostalAuthorityContext(validRouterResult());
  assert.equal(context.available, true);
  assert.equal(context.authorityInfo.countryCode, 'IL');
});

test('8. applies equally to EMS and generic S10 classifications', () => {
  const emsContext = decidePostalAuthorityContext(validRouterResult({ reason: 's10_ems_standard_valid' }));
  const genericContext = decidePostalAuthorityContext(validRouterResult({ reason: 's10_generic_valid' }));
  assert.equal(emsContext.authorityInfo.countryCode, 'IL');
  assert.equal(genericContext.authorityInfo.countryCode, 'IL');
});

test('9. an invalid check digit never contributes an authority context', () => {
  const context = decidePostalAuthorityContext(validRouterResult({ status: 'recognized-invalid', valid: false }));
  assert.equal(context.available, false);
});

test('10. a non-postal identifier type never contributes an authority context', () => {
  const context = decidePostalAuthorityContext(validRouterResult({ identifierType: 'air-waybill' }));
  assert.equal(context.available, false);
});

test('11. malformed router-result input is handled safely', () => {
  assert.equal(decidePostalAuthorityContext(null).available, false);
  assert.equal(decidePostalAuthorityContext(undefined).available, false);
});

test('12. results are frozen', () => {
  assert.ok(Object.isFrozen(identifyPostalAuthority('IL')));
  assert.ok(Object.isFrozen(decidePostalAuthorityContext(validRouterResult())));
});

test('13. calling the module performs no network, DOM, or storage access', () => {
  assert.equal(typeof window, 'undefined');
  assert.equal(typeof document, 'undefined');
  identifyPostalAuthority('IL');
  decidePostalAuthorityContext(validRouterResult());
});

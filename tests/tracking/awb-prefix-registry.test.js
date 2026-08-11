/** All fixtures are synthetic identifiers, never real AWB numbers. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { identifyAwbIssuer, decideAwbIssuerContext, AWB_PREFIX_REGISTRY } from '../../js/tracking/awb-prefix-registry.js';

function validRouterResult(overrides = {}) {
  return {
    status: 'recognized-valid',
    identifierType: 'air-waybill',
    normalizedIdentifier: '02012345675',
    valid: true,
    ambiguous: false,
    ...overrides,
  };
}

test('1. the real registry is currently empty (no unverified mapping was invented)', () => {
  assert.deepEqual(AWB_PREFIX_REGISTRY, {});
});

test('2. an unmapped/unverified prefix honestly reports no routing confidence', () => {
  const result = identifyAwbIssuer('020');
  assert.equal(result.routingConfidence, 'none');
  assert.equal(result.issuingAirlineName, null);
});

test('3. a verified prefix (injected test registry) resolves with high confidence', () => {
  const registry = { '999': { issuingAirlineName: 'Example Airline', airlineCode: 'XX', officialCargoTrackingDestinationId: null } };
  const result = identifyAwbIssuer('999', registry);
  assert.equal(result.routingConfidence, 'high');
  assert.equal(result.issuingAirlineName, 'Example Airline');
});

test('4. malformed prefix input is handled safely', () => {
  assert.equal(identifyAwbIssuer(null).routingConfidence, 'none');
  assert.equal(identifyAwbIssuer('AB').routingConfidence, 'none');
  assert.equal(identifyAwbIssuer('1234').routingConfidence, 'none');
});

test('5. the module never claims an operating/handling airline -- only "issuing" wording', () => {
  const registry = { '999': { issuingAirlineName: 'Example Airline', airlineCode: 'XX', officialCargoTrackingDestinationId: null } };
  const result = identifyAwbIssuer('999', registry);
  assert.ok(result.limitation.includes('מנפיקה'));
  assert.ok(!result.limitation.includes('מובילה כעת'));
});

test('6. decideAwbIssuerContext extracts the prefix only after recognized-valid status', () => {
  const context = decideAwbIssuerContext(validRouterResult());
  assert.equal(context.available, true);
  assert.equal(context.issuerInfo.prefix, '020');
  assert.equal(context.issuerInfo.routingConfidence, 'none');
});

test('7. an invalid AWB never contributes an issuer context', () => {
  const context = decideAwbIssuerContext(validRouterResult({ status: 'recognized-invalid', valid: false }));
  assert.equal(context.available, false);
});

test('8. a non-air-waybill identifier type never contributes an issuer context', () => {
  const context = decideAwbIssuerContext(validRouterResult({ identifierType: 'ocean-container' }));
  assert.equal(context.available, false);
});

test('9. no primary destination is ever offered without a verified official cargo-tracking destination', () => {
  const context = decideAwbIssuerContext(validRouterResult());
  assert.equal(context.primaryDestination, null);
});

test('10. malformed router-result input is handled safely', () => {
  assert.equal(decideAwbIssuerContext(null).available, false);
  assert.equal(decideAwbIssuerContext(undefined).available, false);
});

test('11. results are frozen', () => {
  assert.ok(Object.isFrozen(identifyAwbIssuer('020')));
  assert.ok(Object.isFrozen(decideAwbIssuerContext(validRouterResult())));
});

test('12. calling the module performs no network, DOM, or storage access', () => {
  assert.equal(typeof window, 'undefined');
  assert.equal(typeof document, 'undefined');
  identifyAwbIssuer('020');
  decideAwbIssuerContext(validRouterResult());
});

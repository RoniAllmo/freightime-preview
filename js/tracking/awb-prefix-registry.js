/**
 * AWB issuing-airline identification and routing for the FreighTime
 * Single-input tracking router.
 *
 * Responsibility: given a structurally- and check-digit-valid AWB
 * number's three-digit IATA prefix, identify the *issuing* airline from
 * a small, local, deterministic registry, and -- only for a verified
 * prefix with a verified official cargo-tracking destination -- decide a
 * single primary official tracking action.
 *
 * The three-digit AWB prefix identifies which airline *issued* the
 * waybill number -- it never identifies which airline is currently
 * operating or handling the physical cargo (interline agreements,
 * codeshares, and cargo consolidators mean the issuing and operating
 * carrier are frequently different). This module never claims an
 * "operating carrier" or "airline currently carrying the shipment" --
 * every result (when a mapping exists) is presented as the *issuing*
 * airline only.
 *
 * Per the product-owner correction that introduced this module: "Do not
 * populate mappings from memory or assumptions" -- no AWB prefix mapping
 * may be added without reliable source evidence already present in this
 * repository or directly verified during development. Neither condition
 * is currently met (this repository's prior courier-identifier research
 * documents cover integrator tracking-number *structure*, not IATA AWB
 * numeric prefixes, and no network verification is available in this
 * environment), so `AWB_PREFIX_REGISTRY` below is intentionally empty.
 * Every lookup therefore honestly reports "not yet verified" rather than
 * guessing a well-known-sounding prefix. The full lookup/decision logic
 * is implemented and tested so that a future, separately verified
 * mapping can be added as a pure data change with no logic change.
 *
 * No runtime lookup of any kind occurs -- this module performs no DOM
 * access, no network request, no browser storage access, and no
 * logging. The AWB number itself is never sent anywhere; only the
 * already-normalized three-digit prefix is ever inspected, and only in
 * memory.
 */

import { getOfficialTrackingDestination } from './carrier-registry.js';

/**
 * The verified AWB issuing-airline registry, keyed by three-digit IATA
 * prefix. Intentionally empty -- see the module docstring.
 *
 * @type {Readonly<Object<string, Readonly<{issuingAirlineName: string, airlineCode: string, officialCargoTrackingDestinationId: string|null}>>>}
 */
export const AWB_PREFIX_REGISTRY = Object.freeze({});

const SOURCE_NAME = 'מאגר קידומות AWB מאומתות של FreighTime';

const LIMITATION_KNOWN_ISSUER =
  'קידומת ה-AWB מזהה את חברת התעופה המנפיקה. ייתכן שהמוביל בפועל של המטען שונה.';
const LIMITATION_UNVERIFIED =
  'קידומת ה-AWB טרם אומתה במאגר המאומת של FreighTime.';

function buildUnverifiedPrefix(prefix) {
  return Object.freeze({
    prefix: typeof prefix === 'string' ? prefix : null,
    issuingAirlineName: null,
    airlineCode: null,
    officialCargoTrackingDestinationId: null,
    routingConfidence: 'none',
    sourceName: null,
    limitation: LIMITATION_UNVERIFIED,
  });
}

/**
 * Identify the issuing airline for a three-digit AWB prefix.
 *
 * Never guesses: a prefix not present in `registry` always returns
 * `routingConfidence: 'none'` and every identity field `null`. Never
 * infers the operating/handling airline -- only the issuing airline per
 * the verified prefix mapping (rule 44).
 *
 * @param {*} prefix - The three-digit AWB prefix, or any other value
 *   (handled safely).
 * @param {Readonly<object>} [registry] - Defaults to the real verified
 *   (currently empty) registry; a caller (tests only) may inject an
 *   alternate registry to exercise the "known prefix" branch without
 *   this module claiming any specific real-world airline mapping.
 * @returns {Readonly<{
 *   prefix: string|null,
 *   issuingAirlineName: string|null,
 *   airlineCode: string|null,
 *   officialCargoTrackingDestinationId: string|null,
 *   routingConfidence: 'high'|'none',
 *   sourceName: string|null,
 *   limitation: string,
 * }>}
 */
export function identifyAwbIssuer(prefix, registry = AWB_PREFIX_REGISTRY) {
  if (typeof prefix !== 'string' || !/^\d{3}$/.test(prefix)) {
    return buildUnverifiedPrefix(prefix);
  }
  const entry = registry && typeof registry === 'object' ? registry[prefix] : undefined;
  if (!entry) {
    return buildUnverifiedPrefix(prefix);
  }
  return Object.freeze({
    prefix,
    issuingAirlineName: entry.issuingAirlineName,
    airlineCode: entry.airlineCode ?? null,
    officialCargoTrackingDestinationId: entry.officialCargoTrackingDestinationId ?? null,
    routingConfidence: 'high',
    sourceName: SOURCE_NAME,
    limitation: LIMITATION_KNOWN_ISSUER,
  });
}

function isRouterResultShaped(routerResult) {
  if (routerResult === null || typeof routerResult !== 'object' || Array.isArray(routerResult)) {
    return false;
  }
  return (
    typeof routerResult.status === 'string' &&
    typeof routerResult.identifierType === 'string' &&
    typeof routerResult.normalizedIdentifier === 'string'
  );
}

function buildUnavailableContext() {
  return Object.freeze({
    available: false,
    issuerInfo: null,
    primaryDestination: null,
  });
}

/**
 * Decide the AWB issuing-airline identification context for an existing
 * router result: the issuing airline (if the prefix is in the verified
 * registry), and -- only when a verified official cargo-tracking
 * destination exists for that airline -- a single primary official
 * tracking action.
 *
 * Only produces a result for `identifierType: 'air-waybill'`,
 * `status: 'recognized-valid'` -- the prefix is extracted from the first
 * three characters of `normalizedIdentifier` only after structure and
 * check-digit validation have already succeeded. Every other case
 * safely returns an unavailable context.
 *
 * Performs no DOM access, no network request, no navigation, and no
 * logging. Never mutates `routerResult`. Never appends the AWB number to
 * any URL.
 *
 * @param {*} routerResult - An existing router result from
 *   `routeTrackingInput` (router.js), or any other value (handled safely).
 * @returns {Readonly<{
 *   available: boolean,
 *   issuerInfo: object|null,
 *   primaryDestination: Readonly<{destinationId: string, displayName: string, officialUrl: string}>|null,
 * }>}
 */
export function decideAwbIssuerContext(routerResult) {
  if (!isRouterResultShaped(routerResult)) {
    return buildUnavailableContext();
  }
  if (routerResult.identifierType !== 'air-waybill' || routerResult.status !== 'recognized-valid') {
    return buildUnavailableContext();
  }
  if (routerResult.normalizedIdentifier.length < 3) {
    return buildUnavailableContext();
  }

  const prefix = routerResult.normalizedIdentifier.slice(0, 3);
  const issuerInfo = identifyAwbIssuer(prefix);

  let primaryDestination = null;
  if (issuerInfo.routingConfidence === 'high' && issuerInfo.officialCargoTrackingDestinationId) {
    const destination = getOfficialTrackingDestination(issuerInfo.officialCargoTrackingDestinationId);
    if (destination && destination.enabled === true) {
      primaryDestination = Object.freeze({
        destinationId: destination.id,
        displayName: destination.displayName,
        officialUrl: destination.officialUrl,
      });
    }
  }

  return Object.freeze({
    available: true,
    issuerInfo,
    primaryDestination,
  });
}

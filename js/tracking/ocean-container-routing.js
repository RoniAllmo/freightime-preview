/**
 * Ocean-container carrier-selection routing module for the FreighTime
 * Single-input tracking router.
 *
 * Responsibility: given an existing router result (the structured object
 * `routeTrackingInput` in router.js already produces) for a valid ocean
 * container number, decide — as a pure, local, read-only computation —
 * which official generic ocean-carrier tracking page destinations may be
 * offered to the user, and the honest support level FreighTime can
 * currently deliver for that result.
 *
 * A structurally and check-digit valid ISO 6346 container number does not
 * by itself identify the current operating carrier — the first four
 * characters are a BIC-registered equipment-owner code, which is not
 * always the same as the carrier currently operating the shipment
 * (`FCL_CONTAINER_TRACKING_DESIGN.md` Section 5). This module never
 * infers a single carrier from the container number; it always offers
 * every approved ocean-carrier destination (MSC, ZIM, Maersk, per
 * `carrier-registry.js`) together, letting the user make the choice.
 *
 * FreighTime does not currently have a lawful, free, credential-free way
 * to retrieve live tracking data from any of these carriers — MSC, ZIM,
 * and Maersk each require registration, an approved commercial/
 * onboarding process, and (for ZIM) OAuth 2.0 credentials, per
 * `FCL_CONTAINER_TRACKING_DESIGN.md` Sections 8-11. The support level
 * this module reports for a valid container number is therefore always
 * `'detection_only'`: FreighTime can identify and validate the number and
 * offer a safe official continuation action, but cannot retrieve or
 * display useful tracking data itself. This module never claims `'full'`
 * or `'partial'` support, and never fabricates or estimates any tracking
 * field.
 *
 * A tracking identifier is never included in a returned URL, never
 * constructed dynamically, and never read from `routerResult.
 * normalizedIdentifier` — only the bare, pre-approved `officialUrl`
 * values stored in `carrier-registry.js` are ever returned. This module
 * performs no DOM access, no network request (`fetch`/`XMLHttpRequest`),
 * no navigation, no browser storage access, and no logging. Following a
 * returned destination is an explicit user action (a button/link click)
 * handled elsewhere (`ui-controller.js`).
 *
 * This module never mutates its `routerResult` argument or any registry
 * record — every returned decision is a brand-new frozen object.
 */

import { getOfficialTrackingDestination } from './carrier-registry.js';

/** The approved ocean-carrier destination IDs, in a fixed display order. */
const OCEAN_CONTAINER_DESTINATION_IDS = Object.freeze(['msc', 'zim', 'maersk']);

/** Stable technical support-level values. */
const SUPPORT_LEVEL_DETECTION_ONLY = 'detection_only';
const SUPPORT_LEVEL_UNSUPPORTED = 'unsupported';

/** Stable technical reason keys for an available carrier-selection decision. */
const REASON_OCEAN_CONTAINER_CARRIER_SELECTION_AVAILABLE =
  'ocean_container_carrier_selection_available';

/** Stable technical reason keys for a no-options result. */
const REASON_INVALID_IDENTIFIER_NO_ROUTE = 'invalid_identifier_no_route';
const REASON_AMBIGUOUS_IDENTIFIER_NO_ROUTE = 'ambiguous_identifier_no_route';
const REASON_UNSUPPORTED_IDENTIFIER_NO_ROUTE = 'unsupported_identifier_no_route';
const REASON_MALFORMED_ROUTER_RESULT_NO_ROUTE = 'malformed_router_result_no_route';

/**
 * Check whether a value is at least shaped like a router result: a
 * non-null, non-array object exposing the specific fields this module
 * reads, with the expected primitive types. This is a defensive shape
 * check only — it does not require every field `routeTrackingInput`
 * produces, only the ones this module relies on.
 *
 * @param {*} routerResult - The candidate value.
 * @returns {boolean} Whether the value can be safely inspected below.
 */
function isRouterResultShaped(routerResult) {
  if (
    routerResult === null ||
    typeof routerResult !== 'object' ||
    Array.isArray(routerResult)
  ) {
    return false;
  }
  return (
    typeof routerResult.status === 'string' &&
    typeof routerResult.identifierType === 'string' &&
    typeof routerResult.valid === 'boolean' &&
    typeof routerResult.ambiguous === 'boolean'
  );
}

/**
 * Build a frozen destination option from a registry destination ID,
 * exposing only the fields the UI needs. Returns `null` if the
 * destination is missing from the registry or is not enabled, so this
 * function can never surface a destination the registry does not
 * actively back.
 *
 * @param {string} destinationId
 * @returns {Readonly<{destinationId: string, displayName: string, officialUrl: string}>|null}
 */
function buildDestinationOption(destinationId) {
  const destination = getOfficialTrackingDestination(destinationId);
  if (!destination || destination.enabled !== true) {
    return null;
  }
  return Object.freeze({
    destinationId: destination.id,
    displayName: destination.displayName,
    officialUrl: destination.officialUrl,
  });
}

/**
 * Build a frozen "no options available" decision with the given stable
 * technical reason.
 *
 * @param {string} reason - One of the stable no-route reason keys.
 * @returns {Readonly<object>} A frozen decision object.
 */
function buildNoOptions(reason) {
  return Object.freeze({
    available: false,
    destinations: Object.freeze([]),
    supportLevel: SUPPORT_LEVEL_UNSUPPORTED,
    requiresExplicitClick: true,
    identifierIncluded: false,
    reason,
  });
}

/**
 * Decide which official ocean-carrier tracking destinations may be
 * offered for an existing router result, and the honest support level
 * FreighTime can currently deliver.
 *
 * Never normalizes raw input, never runs a detector, never modifies
 * `routerResult`, never navigates, never opens a URL, never appends an
 * identifier to a URL, and never makes a network request. Safe for any
 * input shape — malformed, missing, or unexpected `routerResult` values
 * always resolve to a frozen "no options" decision rather than throwing.
 *
 * Only case that returns available destinations: `identifierType:
 * "ocean-container"`, `status: "recognized-valid"`, `valid: true`,
 * `ambiguous: false` — offers every enabled destination in
 * `OCEAN_CONTAINER_DESTINATION_IDS` (MSC, ZIM, Maersk), always together,
 * with `supportLevel: 'detection_only'`.
 *
 * Every other case — invalid structure, ambiguous results, unrecognized
 * or empty input, any non-ocean-container identifier type, and any
 * malformed or unsupported `routerResult` shape — resolves to a frozen
 * "no options" decision with `supportLevel: 'unsupported'`. No carrier is
 * ever guessed and no destination is ever offered alone.
 *
 * @param {*} routerResult - An existing router result from
 *   `routeTrackingInput` (router.js), or any other value (handled safely).
 * @returns {Readonly<{
 *   available: boolean,
 *   destinations: ReadonlyArray<Readonly<{destinationId: string, displayName: string, officialUrl: string}>>,
 *   supportLevel: 'detection_only'|'unsupported',
 *   requiresExplicitClick: true,
 *   identifierIncluded: false,
 *   reason: string
 * }>} A new, frozen decision object on every call.
 */
export function decideOceanContainerTrackingOptions(routerResult) {
  if (!isRouterResultShaped(routerResult)) {
    return buildNoOptions(REASON_MALFORMED_ROUTER_RESULT_NO_ROUTE);
  }

  if (routerResult.status === 'ambiguous' || routerResult.ambiguous === true) {
    return buildNoOptions(REASON_AMBIGUOUS_IDENTIFIER_NO_ROUTE);
  }

  if (routerResult.status === 'recognized-invalid') {
    return buildNoOptions(REASON_INVALID_IDENTIFIER_NO_ROUTE);
  }

  if (routerResult.status !== 'recognized-valid' || routerResult.valid !== true) {
    return buildNoOptions(REASON_UNSUPPORTED_IDENTIFIER_NO_ROUTE);
  }

  if (routerResult.identifierType !== 'ocean-container') {
    return buildNoOptions(REASON_UNSUPPORTED_IDENTIFIER_NO_ROUTE);
  }

  const destinations = Object.freeze(
    OCEAN_CONTAINER_DESTINATION_IDS.map(buildDestinationOption).filter(
      (option) => option !== null,
    ),
  );

  if (destinations.length === 0) {
    return buildNoOptions(REASON_UNSUPPORTED_IDENTIFIER_NO_ROUTE);
  }

  return Object.freeze({
    available: true,
    destinations,
    supportLevel: SUPPORT_LEVEL_DETECTION_ONLY,
    requiresExplicitClick: true,
    identifierIncluded: false,
    reason: REASON_OCEAN_CONTAINER_CARRIER_SELECTION_AVAILABLE,
  });
}

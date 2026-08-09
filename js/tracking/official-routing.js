/**
 * Standalone official-routing decision module for the FreighTime
 * Single-input tracking router.
 *
 * Responsibility: given an existing router result (the structured object
 * `routeTrackingInput` in router.js already produces), decide — as a pure,
 * local, read-only computation — whether an official external tracking
 * destination may be offered to the user, and which one. This module does
 * not normalize raw input, does not run any detector, and is not
 * integrated into `router.js`, `ui-controller.js`, or `index.html` at this
 * stage; a future task performs that integration.
 *
 * Only three identifier families are supported, each backed by a single
 * project-owner-approved generic official tracking page recorded in
 * `carrier-registry.js` (see SAFE_EXTERNAL_ROUTING_DESIGN.md, Sections
 * 6–8): UPS (`1Z`), UPS Roadie (`1R`), and EMS (both the standard `EA`–`EW`
 * and bilateral `EX`–`EZ` sub-ranges, which share one destination). Every
 * other identifier family — generic non-EMS S10, air waybill, ocean
 * container, and every other courier (DSV, DHL, FedEx, Aramex, UPS Mail
 * Innovations) — always resolves to "no route available", per
 * SAFE_EXTERNAL_ROUTING_DESIGN.md Sections 9–11.
 *
 * A tracking identifier is never included in a returned URL, never
 * constructed dynamically, and never read from `routerResult.
 * normalizedIdentifier` — only the bare, pre-approved `officialUrl` stored
 * in the registry is ever returned. Following the returned destination
 * (opening the link) is explicitly a *future* concern requiring its own
 * explicit user action (e.g. a button click) in a later UI-implementation
 * stage; this module performs no DOM access, no network request
 * (`fetch`/`XMLHttpRequest`), no navigation (`window.open`,
 * `window.location`), no browser storage access, no logging, no
 * analytics, and no interaction with the assistant/chat interface. It
 * never opens a URL and never navigates automatically.
 *
 * This module never mutates its `routerResult` argument (including its
 * `possibleCarriers` array) or any registry record — every returned
 * decision is a brand-new frozen object.
 */

import { getOfficialTrackingDestination } from './carrier-registry.js';

/** Stable technical reason keys for an available route. */
const REASON_OFFICIAL_GENERIC_TRACKING_PAGE_AVAILABLE =
  'official_generic_tracking_page_available';

/** Stable technical reason keys for a no-route result. */
const REASON_INVALID_IDENTIFIER_NO_ROUTE = 'invalid_identifier_no_route';
const REASON_AMBIGUOUS_IDENTIFIER_NO_ROUTE = 'ambiguous_identifier_no_route';
const REASON_UNSUPPORTED_IDENTIFIER_NO_ROUTE = 'unsupported_identifier_no_route';
const REASON_MALFORMED_ROUTER_RESULT_NO_ROUTE = 'malformed_router_result_no_route';

/** `detectPostal`'s EMS `reason` values that `router.js` preserves verbatim. */
const EMS_VALID_REASONS = Object.freeze(['s10_ems_standard_valid', 's10_ems_bilateral_valid']);

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
    typeof routerResult.ambiguous === 'boolean' &&
    typeof routerResult.reason === 'string'
  );
}

/**
 * Build a frozen "available route" decision for an approved registry
 * destination. Falls back to a frozen "no route" decision if the
 * destination is missing from the registry or is not enabled, so this
 * function can never return a route the registry does not actively back.
 *
 * @param {string} destinationId - An approved registry destination ID.
 * @returns {Readonly<object>} A frozen decision object.
 */
function buildAvailableRoute(destinationId) {
  const destination = getOfficialTrackingDestination(destinationId);

  if (!destination || destination.enabled !== true) {
    return buildNoRoute(REASON_UNSUPPORTED_IDENTIFIER_NO_ROUTE);
  }

  return Object.freeze({
    available: true,
    destinationId: destination.id,
    displayName: destination.displayName,
    officialUrl: destination.officialUrl,
    requiresExplicitClick: true,
    identifierIncluded: false,
    reason: REASON_OFFICIAL_GENERIC_TRACKING_PAGE_AVAILABLE,
  });
}

/**
 * Build a frozen "no route available" decision with the given stable
 * technical reason.
 *
 * @param {string} reason - One of the stable no-route reason keys.
 * @returns {Readonly<object>} A frozen decision object.
 */
function buildNoRoute(reason) {
  return Object.freeze({
    available: false,
    destinationId: null,
    displayName: null,
    officialUrl: null,
    requiresExplicitClick: true,
    identifierIncluded: false,
    reason,
  });
}

/**
 * Decide whether an official external tracking destination may be offered
 * for an existing router result, and which one.
 *
 * Never normalizes raw input, never runs a detector, never modifies
 * `routerResult` (or its `possibleCarriers` array), never navigates, never
 * opens a URL, never appends an identifier to a URL, and never makes a
 * network request. Safe for any input shape — malformed, missing, or
 * unexpected `routerResult` values always resolve to a frozen "no route"
 * decision rather than throwing.
 *
 * Approved cases (see SAFE_EXTERNAL_ROUTING_DESIGN.md, Sections 6–8):
 * - `identifierType: "commercial-courier"`, `status: "recognized-valid"`,
 *   `valid: true`, `ambiguous: false`, `possibleCarriers` exactly `["ups"]`
 *   → offers the `ups` registry destination.
 * - Same, but `possibleCarriers` exactly `["ups-roadie"]` → offers the
 *   `ups-roadie` registry destination.
 * - `identifierType: "international-postal"`, `status: "recognized-valid"`,
 *   `valid: true`, `ambiguous: false`, `reason` one of
 *   `"s10_ems_standard_valid"`/`"s10_ems_bilateral_valid"` → offers the
 *   `ems` registry destination (both EMS sub-ranges share it).
 *
 * Every other case — invalid structure, ambiguous results, unrecognized
 * or empty input, generic non-EMS S10, air waybill, ocean container, any
 * unsupported or deferred courier (DSV, DHL, FedEx, Aramex, UPS Mail
 * Innovations), and any malformed or unsupported `routerResult` shape —
 * resolves to a frozen "no route" decision. No route is ever guessed.
 *
 * @param {*} routerResult - An existing router result from
 *   `routeTrackingInput` (router.js), or any other value (handled safely).
 * @returns {Readonly<{
 *   available: boolean,
 *   destinationId: string|null,
 *   displayName: string|null,
 *   officialUrl: string|null,
 *   requiresExplicitClick: true,
 *   identifierIncluded: false,
 *   reason: string
 * }>} A new, frozen decision object on every call.
 */
export function decideOfficialTrackingRoute(routerResult) {
  if (!isRouterResultShaped(routerResult)) {
    return buildNoRoute(REASON_MALFORMED_ROUTER_RESULT_NO_ROUTE);
  }

  if (routerResult.status === 'ambiguous' || routerResult.ambiguous === true) {
    return buildNoRoute(REASON_AMBIGUOUS_IDENTIFIER_NO_ROUTE);
  }

  if (routerResult.status === 'recognized-invalid') {
    return buildNoRoute(REASON_INVALID_IDENTIFIER_NO_ROUTE);
  }

  if (routerResult.status !== 'recognized-valid' || routerResult.valid !== true) {
    return buildNoRoute(REASON_UNSUPPORTED_IDENTIFIER_NO_ROUTE);
  }

  if (routerResult.identifierType === 'commercial-courier') {
    if (!Array.isArray(routerResult.possibleCarriers)) {
      return buildNoRoute(REASON_MALFORMED_ROUTER_RESULT_NO_ROUTE);
    }
    if (
      routerResult.possibleCarriers.length === 1 &&
      routerResult.possibleCarriers[0] === 'ups'
    ) {
      return buildAvailableRoute('ups');
    }
    if (
      routerResult.possibleCarriers.length === 1 &&
      routerResult.possibleCarriers[0] === 'ups-roadie'
    ) {
      return buildAvailableRoute('ups-roadie');
    }
    return buildNoRoute(REASON_UNSUPPORTED_IDENTIFIER_NO_ROUTE);
  }

  if (routerResult.identifierType === 'international-postal') {
    if (EMS_VALID_REASONS.includes(routerResult.reason)) {
      return buildAvailableRoute('ems');
    }
    return buildNoRoute(REASON_UNSUPPORTED_IDENTIFIER_NO_ROUTE);
  }

  return buildNoRoute(REASON_UNSUPPORTED_IDENTIFIER_NO_ROUTE);
}

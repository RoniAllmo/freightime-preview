/**
 * Container BIC owner/operator identification and routing for the
 * FreighTime Single-input tracking router.
 *
 * Responsibility: given a structurally- and check-digit-valid ISO 6346
 * container number's three-letter owner code, identify the registered
 * owner/operator from a small, local, deterministic, high-confidence
 * registry, and -- only for a verified shipping-line owner -- decide a
 * single primary official tracking destination.
 *
 * `FCL_CONTAINER_TRACKING_DESIGN.md` Section 5 established (and this
 * module fully respects) that a container's registered owner code does
 * not always identify the carrier currently operating the shipment
 * (containers are leased, interchanged, and slot-shared between
 * carriers). This module never claims a "confirmed current carrier" --
 * every high-confidence result is presented as the *registered
 * owner/operator*, with an explicit limitation that the current shipping
 * line may differ. This is a narrow, explicit product-owner-authorized
 * exception to the earlier "no automatic single-carrier selection" rule,
 * scoped to exactly the three carriers already independently verified in
 * `carrier-registry.js` -- it does not reopen or contradict that
 * document's broader caution about carrier inference.
 *
 * The registry below contains only owner codes this codebase can
 * genuinely stand behind: the three ocean carriers whose official
 * tracking destinations were already manually verified and approved
 * (see `carrier-registry.js`), using their singular, unambiguous,
 * widely-documented BIC owner-code prefixes. No leasing company,
 * equipment-owner, or other-operator entry is populated -- this module
 * fully supports that classification (`ownerType`) for a future,
 * separately verified addition, but none is included here rather than
 * guessing from memory (an unmapped or non-shipping-line owner code
 * always resolves to the honest "not yet verified" / "not a shipping
 * line" result, never a guess).
 *
 * No runtime lookup of any kind occurs -- this module performs no DOM
 * access, no network request, no browser storage access, and no
 * logging. The container number itself is never sent anywhere; only the
 * already-normalized three-letter owner code is ever inspected, and only
 * in memory.
 */

import { getOfficialTrackingDestination } from './carrier-registry.js';

/**
 * The verified container-owner registry, keyed by three-letter BIC owner
 * code (uppercase). Each entry's `ownerType` is always `'shipping_line'`
 * in this initial population -- see the module docstring for why no
 * other owner type is currently populated.
 *
 * @type {Readonly<Object<string, Readonly<{registeredOwnerName: string, ownerType: string, officialTrackingDestinationId: string}>>>}
 */
export const CONTAINER_OWNER_REGISTRY = Object.freeze({
  MSC: Object.freeze({
    registeredOwnerName: 'Mediterranean Shipping Company (MSC)',
    ownerType: 'shipping_line',
    officialTrackingDestinationId: 'msc',
  }),
  ZIM: Object.freeze({
    registeredOwnerName: 'ZIM Integrated Shipping Services',
    ownerType: 'shipping_line',
    officialTrackingDestinationId: 'zim',
  }),
  MAE: Object.freeze({
    registeredOwnerName: 'Maersk (A.P. Moller-Maersk)',
    ownerType: 'shipping_line',
    officialTrackingDestinationId: 'maersk',
  }),
});

const SOURCE_NAME = "מאגר קודי בעלים מאומתים של FreighTime (תואם ליעדי המעקב הרשמיים הקיימים במוצר)";

const LIMITATION_SHIPPING_LINE =
  'קוד המכולה מזהה את הבעלים או המפעיל הרשום. ייתכן שחברת הספנות במשלוח הנוכחי שונה.';
const LIMITATION_NON_CARRIER =
  'הקוד מזהה בעלים או מפעיל שאינו חברת ספנות מוכרת. לא ניתן לקבוע את חברת הספנות הנוכחית מהקוד בלבד.';
const LIMITATION_UNKNOWN =
  'מספר המכולה תקין, אך קוד הבעלים עדיין אינו מזוהה במאגר המאומת של FreighTime.';

function buildUnknownOwner(ownerCode) {
  return Object.freeze({
    ownerCode: typeof ownerCode === 'string' ? ownerCode.toUpperCase() : null,
    registeredOwnerName: null,
    ownerType: 'unknown',
    trackingCarrierCandidate: null,
    officialTrackingDestinationId: null,
    routingConfidence: 'none',
    sourceName: null,
    limitation: LIMITATION_UNKNOWN,
  });
}

/**
 * Identify the registered owner/operator for a three-letter container
 * owner code.
 *
 * Never guesses: an owner code not present in `registry` always returns
 * `ownerType: 'unknown'`, `routingConfidence: 'none'`. An owner code
 * present but classified as anything other than `'shipping_line'` (a
 * future, separately verified leasing-company/equipment-owner/other-
 * operator entry) always returns `routingConfidence: 'none'` and no
 * tracking destination -- this module never routes a non-carrier owner
 * to a shipping line.
 *
 * @param {*} ownerCode - The three-letter BIC owner code, or any other
 *   value (handled safely).
 * @param {Readonly<object>} [registry] - Defaults to the real verified
 *   registry; a caller (tests only) may inject an alternate registry
 *   shape to exercise the non-carrier/leasing-company branch without
 *   this module claiming any specific real-world leasing company.
 * @returns {Readonly<{
 *   ownerCode: string|null,
 *   registeredOwnerName: string|null,
 *   ownerType: 'shipping_line'|'leasing_company'|'equipment_owner'|'other_operator'|'unknown',
 *   trackingCarrierCandidate: string|null,
 *   officialTrackingDestinationId: string|null,
 *   routingConfidence: 'high'|'none',
 *   sourceName: string|null,
 *   limitation: string,
 * }>}
 */
export function identifyContainerOwner(ownerCode, registry = CONTAINER_OWNER_REGISTRY) {
  if (typeof ownerCode !== 'string' || ownerCode.length !== 3 || !/^[A-Za-z]{3}$/.test(ownerCode)) {
    return buildUnknownOwner(ownerCode);
  }
  const normalizedCode = ownerCode.toUpperCase();
  const entry = registry && typeof registry === 'object' ? registry[normalizedCode] : undefined;
  if (!entry) {
    return buildUnknownOwner(normalizedCode);
  }

  if (entry.ownerType === 'shipping_line') {
    return Object.freeze({
      ownerCode: normalizedCode,
      registeredOwnerName: entry.registeredOwnerName,
      ownerType: entry.ownerType,
      trackingCarrierCandidate: entry.officialTrackingDestinationId ?? null,
      officialTrackingDestinationId: entry.officialTrackingDestinationId ?? null,
      routingConfidence: 'high',
      sourceName: SOURCE_NAME,
      limitation: LIMITATION_SHIPPING_LINE,
    });
  }

  return Object.freeze({
    ownerCode: normalizedCode,
    registeredOwnerName: entry.registeredOwnerName ?? null,
    ownerType: entry.ownerType ?? 'other_operator',
    trackingCarrierCandidate: null,
    officialTrackingDestinationId: null,
    routingConfidence: 'none',
    sourceName: SOURCE_NAME,
    limitation: LIMITATION_NON_CARRIER,
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
    ownerInfo: null,
    primaryDestination: null,
    suppressMultiCarrierFallback: false,
  });
}

/**
 * Decide the container-owner identification context for an existing
 * router result: the registered owner/operator (if the owner code is in
 * the verified registry), and -- only for a high-confidence
 * shipping-line match -- a single primary official tracking destination.
 *
 * Only produces a result for `identifierType: 'ocean-container'`,
 * `status: 'recognized-valid'` -- the owner code is extracted from the
 * first three characters of `normalizedIdentifier` only after structure
 * and check-digit validation have already succeeded (rule 26). Every
 * other case (invalid check digit, unrecognized, ambiguous, empty, or
 * malformed input) safely returns an unavailable context.
 *
 * `suppressMultiCarrierFallback: true` signals to the caller that the
 * existing MSC/ZIM/Maersk manual-selection fallback
 * (`ocean-container-routing.js`) should not also be shown alongside this
 * single primary destination -- exactly one official route is ever
 * offered when a high-confidence mapping exists (never three at once).
 *
 * Performs no DOM access, no network request, no navigation, and no
 * logging. Never mutates `routerResult`.
 *
 * @param {*} routerResult - An existing router result from
 *   `routeTrackingInput` (router.js), or any other value (handled safely).
 * @returns {Readonly<{
 *   available: boolean,
 *   ownerInfo: object|null,
 *   primaryDestination: Readonly<{destinationId: string, displayName: string, officialUrl: string}>|null,
 *   suppressMultiCarrierFallback: boolean,
 * }>}
 */
export function decideContainerOwnerContext(routerResult) {
  if (!isRouterResultShaped(routerResult)) {
    return buildUnavailableContext();
  }
  if (routerResult.identifierType !== 'ocean-container' || routerResult.status !== 'recognized-valid') {
    return buildUnavailableContext();
  }
  if (routerResult.normalizedIdentifier.length < 3) {
    return buildUnavailableContext();
  }

  const ownerCode = routerResult.normalizedIdentifier.slice(0, 3);
  const ownerInfo = identifyContainerOwner(ownerCode);

  let primaryDestination = null;
  if (ownerInfo.routingConfidence === 'high' && ownerInfo.officialTrackingDestinationId) {
    const destination = getOfficialTrackingDestination(ownerInfo.officialTrackingDestinationId);
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
    ownerInfo,
    primaryDestination,
    suppressMultiCarrierFallback: primaryDestination !== null,
  });
}

/**
 * User-interface controller for the FreighTime Single-input tracking
 * router.
 *
 * Responsibility: bind to explicitly supplied DOM elements (the tracking
 * input, the tracking button, the tracking hint, and optionally the
 * search-tabs element, the official-tracking link, and the
 * official-tracking disclosure element), call `routeTrackingInput`
 * (router.js) on submit, and render the result into the tracking-hint
 * element using the Hebrew messages from `trackingUiMessages`
 * (ui-messages.js).
 *
 * This module performs no normalization, detection, or carrier logic
 * itself — it only reacts to user events and renders already-computed
 * router results. It performs no external navigation, no network
 * requests, no storage access, and no logging or storage of the entered
 * shipment identifier. It never queries, modifies, or references the
 * assistant/chat interface elsewhere on the page.
 *
 * Official-tracking link: for a `recognized-valid` UPS, UPS Roadie, or EMS
 * result, this module additionally calls the standalone, read-only
 * `decideOfficialTrackingRoute` (official-routing.js) and — only when it
 * reports `available: true` — sets the supplied official-tracking link's
 * `href` to the returned generic official URL, its text to
 * `trackingUiMessages.officialTrackingButton`, sets the disclosure
 * element's text to `trackingUiMessages.officialTrackingDisclosure`, and
 * shows both elements. Every other result (including invalid, generic
 * S10, AWB, container, unknown, empty, and ambiguous results) clears and
 * re-hides both elements. The shipment identifier is never included in
 * the link's `href` — only the fixed, pre-approved generic URL the
 * registry already stores. This module never calls `.click()`, never uses
 * `window.open`/`window.location`, and never navigates on its own; opening
 * the link remains an explicit user action on the rendered anchor.
 *
 * Ocean-container carrier selection: for a `recognized-valid`
 * ocean-container result, this module calls the standalone, read-only
 * `decideOceanContainerTrackingOptions` (ocean-container-routing.js) and —
 * only when it reports `available: true` — shows, for each returned
 * destination, the matching pre-existing link element supplied in
 * `oceanCarrierLinks` (keyed by destination ID: `msc`, `zim`, `maersk`),
 * and shows the supplied `oceanCarrierDisclosure` element with
 * `trackingUiMessages.oceanContainerRoutingDisclosure`. Every other
 * result hides and clears all three link elements and the disclosure
 * element. As with the official-tracking link, no identifier is ever
 * included in any of the three URLs, and this module never navigates on
 * its own.
 *
 * Copy-tracking-number button: for any `recognized-valid` or
 * `recognized-invalid` result (every supported identifier family,
 * regardless of check-digit validity), this module shows a supplied copy
 * button and retains the result's `normalizedIdentifier` in
 * controller-local state only — never module-level or global state, and
 * never written into the DOM. On an explicit click of the copy button
 * (never automatically), the retained identifier is copied via
 * `navigator.clipboard.writeText`, and a fixed Hebrew success or failure
 * message is shown in a supplied status element. Every other result
 * (empty, unrecognized, ambiguous, or malformed) hides the copy button
 * and clears the retained identifier, so a stale identifier from a
 * previous submission can never be copied. This module never uses
 * `document.execCommand`, never retries a failed copy automatically, and
 * never logs, stores, or transmits the identifier.
 *
 * Elements are supplied explicitly by the caller (see index.html's
 * module script) rather than queried automatically by this module, and
 * importing this module has no side effects — no DOM access occurs
 * until `initializeTrackingUi` is called.
 */

import { routeTrackingInput } from './router.js';
import { trackingUiMessages } from './ui-messages.js';
import { decideOfficialTrackingRoute } from './official-routing.js';
import { decideOceanContainerTrackingOptions } from './ocean-container-routing.js';

/** Destination IDs `oceanCarrierLinks` may supply a link element for. */
const OCEAN_CARRIER_LINK_IDS = Object.freeze(['msc', 'zim', 'maersk']);

/**
 * Buttons that already have a tracking click/keydown listener attached,
 * used to prevent duplicate initialization of the same button/input
 * pair. Keyed by the button element so re-initializing with the same
 * button is a safe no-op.
 *
 * @type {WeakSet<object>}
 */
const initializedButtons = new WeakSet();

/**
 * Check whether a value looks like a usable DOM-element-like object for
 * this controller's purposes (real element or test double), without
 * assuming any specific DOM implementation.
 *
 * @param {*} value - The candidate element.
 * @param {string[]} requiredMethods - Method names that must exist.
 * @returns {boolean} Whether the value is usable.
 */
function isUsableElement(value, requiredMethods) {
  if (value === null || value === undefined || typeof value !== 'object') {
    return false;
  }
  return requiredMethods.every((method) => typeof value[method] === 'function');
}

/**
 * Check whether a router result's `possibleCarriers` field is exactly a
 * single-element array containing the given internal carrier ID. Never
 * mutates `possibleCarriers` and safely handles a missing, malformed, or
 * non-array value by returning `false`.
 *
 * @param {*} possibleCarriers - The router result's `possibleCarriers`
 *   field, or any other malformed/unexpected value.
 * @param {string} carrierId - The single internal carrier ID to match.
 * @returns {boolean} Whether `possibleCarriers` is exactly `[carrierId]`.
 */
function isSoleCarrier(possibleCarriers, carrierId) {
  return (
    Array.isArray(possibleCarriers) &&
    possibleCarriers.length === 1 &&
    possibleCarriers[0] === carrierId
  );
}

/**
 * Resolve the Hebrew message key for a commercial-courier router result
 * (`state.identifierType === 'commercial-courier'`), based on the
 * detector-approved internal carrier ID(s) in `state.possibleCarriers`.
 *
 * Never returns or displays the raw identifier or an internal carrier ID
 * — only a message-key lookup into `trackingUiMessages`. An unsupported
 * or malformed commercial-courier state (e.g. `possibleCarriers` missing,
 * not an array, empty, containing more than one ID, or containing an
 * unrecognized ID) safely falls back to `unexpectedError` rather than
 * guessing a carrier.
 *
 * @param {'recognized-valid'|'recognized-invalid'} status
 * @param {*} possibleCarriers - The router result's `possibleCarriers`
 *   field.
 * @returns {string} A message key present on `trackingUiMessages`.
 */
function resolveCourierMessageKey(status, possibleCarriers) {
  const isValid = status === 'recognized-valid';
  const isInvalid = status === 'recognized-invalid';

  if (isValid && isSoleCarrier(possibleCarriers, 'ups')) {
    return 'recognizedValidUps';
  }
  if (isInvalid && isSoleCarrier(possibleCarriers, 'ups')) {
    return 'recognizedInvalidUps';
  }
  if (isValid && isSoleCarrier(possibleCarriers, 'ups-roadie')) {
    return 'recognizedValidUpsRoadie';
  }
  if (isInvalid && isSoleCarrier(possibleCarriers, 'ups-roadie')) {
    return 'recognizedInvalidUpsRoadie';
  }
  return 'unexpectedError';
}

/** Router-level `reason` values that indicate an EMS classification. */
const EMS_VALID_REASONS = Object.freeze([
  's10_ems_standard_valid',
  's10_ems_bilateral_valid',
]);
const EMS_INVALID_REASON = 's10_ems_invalid_check_digit';

/**
 * Resolve the Hebrew message key for an `international-postal` router
 * result, distinguishing an EMS classification (standard or bilateral,
 * both shown with the same single EMS message — the bilateral condition
 * is never exposed to the user) from the generic international-postal
 * case. Checks the EMS-specific `reason` key *before* falling back to the
 * generic postal mapping. Safely handles a missing or malformed `reason`
 * by falling back to the generic postal message rather than guessing.
 *
 * @param {'recognized-valid'|'recognized-invalid'} status
 * @param {*} reason - The router result's `reason` field.
 * @returns {string} A message key present on `trackingUiMessages`.
 */
function resolvePostalMessageKey(status, reason) {
  if (status === 'recognized-valid' && EMS_VALID_REASONS.includes(reason)) {
    return 'recognizedValidEms';
  }
  if (status === 'recognized-invalid' && reason === EMS_INVALID_REASON) {
    return 'recognizedInvalidEms';
  }
  return status === 'recognized-valid'
    ? 'recognizedValidInternationalPostal'
    : 'recognizedInvalidInternationalPostal';
}

/**
 * Resolve the Hebrew message key for a router result.
 *
 * Never returns the raw identifier or any carrier/URL information — only
 * a message-key lookup into `trackingUiMessages`.
 *
 * @param {*} state - A router result from `routeTrackingInput`, or any
 *   other malformed/unexpected value.
 * @returns {string} A message key present on `trackingUiMessages`.
 */
function resolveMessageKey(state) {
  if (state === null || state === undefined || typeof state !== 'object') {
    return 'unexpectedError';
  }

  switch (state.status) {
    case 'empty':
      return 'empty';
    case 'recognized-valid':
      if (state.identifierType === 'ocean-container') return 'recognizedValidContainer';
      if (state.identifierType === 'air-waybill') return 'recognizedValidAwb';
      if (state.identifierType === 'international-postal') {
        return resolvePostalMessageKey(state.status, state.reason);
      }
      if (state.identifierType === 'commercial-courier') {
        return resolveCourierMessageKey(state.status, state.possibleCarriers);
      }
      return 'unexpectedError';
    case 'recognized-invalid':
      if (state.identifierType === 'ocean-container') return 'recognizedInvalidContainer';
      if (state.identifierType === 'air-waybill') return 'recognizedInvalidAwb';
      if (state.identifierType === 'international-postal') {
        return resolvePostalMessageKey(state.status, state.reason);
      }
      if (state.identifierType === 'commercial-courier') {
        return resolveCourierMessageKey(state.status, state.possibleCarriers);
      }
      return 'unexpectedError';
    case 'ambiguous':
      return 'ambiguous';
    case 'unrecognized':
      return 'unrecognized';
    default:
      return 'unexpectedError';
  }
}

/**
 * Check whether a value looks like a settable DOM-element-like object
 * (real element or test double) suitable for the official-tracking link
 * or disclosure element.
 *
 * @param {*} value - The candidate element.
 * @returns {boolean} Whether the value is usable.
 */
function isOfficialRoutingElement(value) {
  return value !== null && value !== undefined && typeof value === 'object';
}

/**
 * Hide and clear the official-tracking link and disclosure elements,
 * removing any previously set `href` so a stale destination can never be
 * left visible or followable after a new, unavailable result. Uses
 * `removeAttribute` when available (real DOM elements); falls back to
 * clearing the `href` property directly for simpler test doubles.
 *
 * @param {*} officialLink - The official-tracking link element, or any
 *   other value (safely ignored if not usable).
 * @param {*} officialDisclosure - The official-tracking disclosure
 *   element, or any other value (safely ignored if not usable).
 */
function hideOfficialRoutingArea(officialLink, officialDisclosure) {
  if (isOfficialRoutingElement(officialLink)) {
    if (typeof officialLink.removeAttribute === 'function') {
      officialLink.removeAttribute('href');
    } else {
      officialLink.href = undefined;
    }
    officialLink.textContent = '';
    officialLink.hidden = true;
  }
  if (isOfficialRoutingElement(officialDisclosure)) {
    officialDisclosure.textContent = '';
    officialDisclosure.hidden = true;
  }
}

/**
 * Show the official-tracking link and disclosure elements for an
 * available routing decision, using `textContent` only (never
 * `innerHTML`) and never including the shipment identifier — only the
 * decision's pre-approved `officialUrl` and the fixed Hebrew button/
 * disclosure text.
 *
 * @param {*} officialLink - The official-tracking link element, or any
 *   other value (safely ignored if not usable).
 * @param {*} officialDisclosure - The official-tracking disclosure
 *   element, or any other value (safely ignored if not usable).
 * @param {Readonly<{officialUrl: string}>} decision - An "available"
 *   decision from `decideOfficialTrackingRoute`.
 */
function showOfficialRoutingArea(officialLink, officialDisclosure, decision) {
  if (isOfficialRoutingElement(officialLink)) {
    officialLink.href = decision.officialUrl;
    officialLink.textContent = trackingUiMessages.officialTrackingButton;
    officialLink.hidden = false;
  }
  if (isOfficialRoutingElement(officialDisclosure)) {
    officialDisclosure.textContent = trackingUiMessages.officialTrackingDisclosure;
    officialDisclosure.hidden = false;
  }
}

/**
 * Reset the official-tracking link/disclosure elements and, only for an
 * "available" routing decision, show the approved destination. Performs
 * no navigation, no network request, and no identifier inclusion of any
 * kind — see `decideOfficialTrackingRoute` (official-routing.js) for the
 * decision logic itself.
 *
 * @param {*} state - A router result from `routeTrackingInput` (or a
 *   malformed/unexpected value, handled safely by
 *   `decideOfficialTrackingRoute`).
 * @param {*} officialLink - The official-tracking link element, or any
 *   other value (safely ignored if not usable).
 * @param {*} officialDisclosure - The official-tracking disclosure
 *   element, or any other value (safely ignored if not usable).
 */
function renderOfficialRoutingArea(state, officialLink, officialDisclosure) {
  hideOfficialRoutingArea(officialLink, officialDisclosure);

  const decision = decideOfficialTrackingRoute(state);
  if (decision.available) {
    showOfficialRoutingArea(officialLink, officialDisclosure, decision);
  }
}

/**
 * Hide and clear every ocean-carrier link element and the ocean-carrier
 * disclosure element, removing any previously set `href` so a stale
 * destination can never be left visible or followable after a new,
 * unavailable result.
 *
 * @param {*} oceanCarrierLinks - An object keyed by destination ID
 *   (`msc`, `zim`, `maersk`) mapping to link elements, or any other value
 *   (safely ignored if not an object).
 * @param {*} oceanCarrierDisclosure - The ocean-carrier disclosure
 *   element, or any other value (safely ignored if not usable).
 */
function hideOceanCarrierRoutingArea(oceanCarrierLinks, oceanCarrierDisclosure) {
  if (oceanCarrierLinks && typeof oceanCarrierLinks === 'object') {
    for (const destinationId of OCEAN_CARRIER_LINK_IDS) {
      const link = oceanCarrierLinks[destinationId];
      if (isOfficialRoutingElement(link)) {
        if (typeof link.removeAttribute === 'function') {
          link.removeAttribute('href');
        } else {
          link.href = undefined;
        }
        link.textContent = '';
        link.hidden = true;
      }
    }
  }
  if (isOfficialRoutingElement(oceanCarrierDisclosure)) {
    oceanCarrierDisclosure.textContent = '';
    oceanCarrierDisclosure.hidden = true;
  }
}

/**
 * Show the ocean-carrier link elements matching an "available"
 * carrier-selection decision's destinations, and the shared disclosure
 * element, using `textContent` only (never `innerHTML`) and never
 * including the shipment identifier — only each destination's
 * pre-approved `officialUrl` and display name.
 *
 * @param {*} oceanCarrierLinks - An object keyed by destination ID
 *   (`msc`, `zim`, `maersk`) mapping to link elements, or any other value
 *   (safely ignored if not an object).
 * @param {*} oceanCarrierDisclosure - The ocean-carrier disclosure
 *   element, or any other value (safely ignored if not usable).
 * @param {Readonly<{destinations: ReadonlyArray<Readonly<{destinationId: string, displayName: string, officialUrl: string}>>}>} decision
 *   - An "available" decision from `decideOceanContainerTrackingOptions`.
 */
function showOceanCarrierRoutingArea(oceanCarrierLinks, oceanCarrierDisclosure, decision) {
  if (oceanCarrierLinks && typeof oceanCarrierLinks === 'object') {
    for (const destination of decision.destinations) {
      const link = oceanCarrierLinks[destination.destinationId];
      if (isOfficialRoutingElement(link)) {
        link.href = destination.officialUrl;
        link.textContent = destination.displayName;
        link.hidden = false;
      }
    }
  }
  if (isOfficialRoutingElement(oceanCarrierDisclosure)) {
    oceanCarrierDisclosure.textContent = trackingUiMessages.oceanContainerRoutingDisclosure;
    oceanCarrierDisclosure.hidden = false;
  }
}

/**
 * Reset the ocean-carrier link/disclosure elements and, only for an
 * "available" carrier-selection decision, show the matching approved
 * destinations. Performs no navigation, no network request, and no
 * identifier inclusion of any kind — see
 * `decideOceanContainerTrackingOptions` (ocean-container-routing.js) for
 * the decision logic itself.
 *
 * @param {*} state - A router result from `routeTrackingInput` (or a
 *   malformed/unexpected value, handled safely by
 *   `decideOceanContainerTrackingOptions`).
 * @param {*} oceanCarrierLinks - An object keyed by destination ID
 *   (`msc`, `zim`, `maersk`) mapping to link elements, or any other value
 *   (safely ignored if not an object).
 * @param {*} oceanCarrierDisclosure - The ocean-carrier disclosure
 *   element, or any other value (safely ignored if not usable).
 */
function renderOceanCarrierRoutingArea(state, oceanCarrierLinks, oceanCarrierDisclosure) {
  hideOceanCarrierRoutingArea(oceanCarrierLinks, oceanCarrierDisclosure);

  const decision = decideOceanContainerTrackingOptions(state);
  if (decision.available) {
    showOceanCarrierRoutingArea(oceanCarrierLinks, oceanCarrierDisclosure, decision);
  }
}

/**
 * Check whether a router result is eligible for the copy-tracking-number
 * action: a `recognized-valid` or `recognized-invalid` result carrying a
 * non-empty `normalizedIdentifier` string. Deliberately includes
 * `recognized-invalid` results (a recognized structure with an invalid
 * check digit) — the user may still need to copy the value to verify or
 * correct it externally. Excludes `empty`, `unrecognized`, `ambiguous`,
 * and any malformed/unexpected state.
 *
 * @param {*} state - A router result from `routeTrackingInput`, or any
 *   other malformed/unexpected value.
 * @returns {boolean} Whether the copy button should be shown.
 */
function isEligibleForCopy(state) {
  if (state === null || typeof state !== 'object') {
    return false;
  }
  return (
    (state.status === 'recognized-valid' || state.status === 'recognized-invalid') &&
    typeof state.normalizedIdentifier === 'string' &&
    state.normalizedIdentifier.length > 0
  );
}

/**
 * Hide and clear the copy button and its status element.
 *
 * @param {*} copyButton - The copy-tracking-number button element, or any
 *   other value (safely ignored if not usable).
 * @param {*} copyStatus - The copy-status element, or any other value
 *   (safely ignored if not usable).
 */
function hideCopyArea(copyButton, copyStatus) {
  if (isOfficialRoutingElement(copyButton)) {
    copyButton.textContent = '';
    copyButton.hidden = true;
  }
  if (isOfficialRoutingElement(copyStatus)) {
    copyStatus.textContent = '';
    copyStatus.hidden = true;
  }
}

/**
 * Show the copy button with its fixed Hebrew label.
 *
 * @param {*} copyButton - The copy-tracking-number button element, or any
 *   other value (safely ignored if not usable).
 */
function showCopyButton(copyButton) {
  if (isOfficialRoutingElement(copyButton)) {
    copyButton.textContent = trackingUiMessages.copyTrackingButton;
    copyButton.hidden = false;
  }
}

/**
 * Show a copy-status message (success or failure).
 *
 * @param {*} copyStatus - The copy-status element, or any other value
 *   (safely ignored if not usable).
 * @param {string} message - The fixed Hebrew message to display.
 */
function showCopyStatus(copyStatus, message) {
  if (isOfficialRoutingElement(copyStatus)) {
    copyStatus.textContent = message;
    copyStatus.hidden = false;
  }
}

/**
 * Reset the copy button/status area for a new router result and, for an
 * eligible result, show the button and retain the normalized identifier
 * in the supplied controller-local `elementsBag` (never module-level or
 * global state, and never written into the DOM). Always clears any
 * previously retained identifier first, so a later empty, unrecognized,
 * ambiguous, or malformed result removes access to the previous value.
 *
 * @param {*} state - A router result from `routeTrackingInput` (or a
 *   malformed/unexpected value, handled safely).
 * @param {*} elementsBag - The controller-local elements object to store
 *   `retainedIdentifier` on, or any other value (safely ignored if not an
 *   object).
 * @param {*} copyButton - The copy-tracking-number button element.
 * @param {*} copyStatus - The copy-status element.
 */
function renderCopyArea(state, elementsBag, copyButton, copyStatus) {
  hideCopyArea(copyButton, copyStatus);

  if (elementsBag && typeof elementsBag === 'object') {
    elementsBag.retainedIdentifier = null;
  }

  if (isEligibleForCopy(state)) {
    if (elementsBag && typeof elementsBag === 'object') {
      elementsBag.retainedIdentifier = state.normalizedIdentifier;
    }
    showCopyButton(copyButton);
  }
}

/**
 * Handle an explicit click on the copy-tracking-number button: copy the
 * currently retained normalized identifier (if any) via
 * `navigator.clipboard.writeText`, and show the approved success or
 * failure message. A safe no-op if no identifier is currently retained
 * (the button should already be hidden in that case). Never uses the
 * deprecated `document.execCommand` fallback, never retries
 * automatically, and never exposes a stack trace or browser exception —
 * any failure (missing Clipboard API or a rejected write) renders the
 * same fixed failure message.
 *
 * @param {*} elementsBag - The controller-local elements object holding
 *   `retainedIdentifier`, `copyButton`, and `copyStatus`.
 */
function handleCopyClick(elementsBag) {
  if (!elementsBag || typeof elementsBag !== 'object') {
    return;
  }

  const identifier = elementsBag.retainedIdentifier;
  const copyStatus = elementsBag.copyStatus;

  if (typeof identifier !== 'string' || identifier.length === 0) {
    return;
  }

  const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
  if (!clipboard || typeof clipboard.writeText !== 'function') {
    showCopyStatus(copyStatus, trackingUiMessages.copyTrackingFailure);
    return;
  }

  Promise.resolve(clipboard.writeText(identifier)).then(
    () => {
      showCopyStatus(copyStatus, trackingUiMessages.copyTrackingSuccess);
    },
    () => {
      showCopyStatus(copyStatus, trackingUiMessages.copyTrackingFailure);
    },
  );
}

/**
 * Render a tracking-router result into the supplied tracking-hint
 * element.
 *
 * Uses `textContent` only (never `innerHTML`), displays a static Hebrew
 * message only (never the shipment identifier, a carrier name, or a
 * URL), and does not replace, remove, or otherwise alter the tracking
 * input/button or page navigation. Does not interact with the
 * assistant/chat interface.
 *
 * Also resets, and where an official destination is available, shows the
 * official-tracking link/disclosure elements (see
 * `renderOfficialRoutingArea`) when those elements are supplied — this is
 * a safe no-op when they are not, preserving this function's existing
 * hint-only behavior. Likewise resets, and for an eligible result shows,
 * the copy-tracking-number button/status elements (see
 * `renderCopyArea`) when supplied, retaining the normalized identifier
 * only on the passed-in `elements` object itself (controller-local
 * state) — never in module-level or global state.
 *
 * @param {*} state - A router result from `routeTrackingInput` (or a
 *   malformed/unexpected value, handled safely).
 * @param {{hint: object, officialLink?: object, officialDisclosure?: object, oceanCarrierLinks?: object, oceanCarrierDisclosure?: object, copyButton?: object, copyStatus?: object}} elements
 *   - Must include the tracking-hint element (any object exposing a
 *   settable `textContent` property). `officialLink`, `officialDisclosure`,
 *   `oceanCarrierLinks`, `oceanCarrierDisclosure`, `copyButton`, and
 *   `copyStatus` are optional. When `copyButton`/`copyStatus` are
 *   supplied, this same `elements` object also receives a
 *   `retainedIdentifier` property (set to the normalized identifier for
 *   an eligible result, or `null` otherwise) — callers that reuse the
 *   same object across calls (as `initializeTrackingUi` does) can read it
 *   back for a later explicit copy action.
 * @returns {Readonly<{rendered: boolean, domModified: boolean, messageKey: string}>}
 *   A frozen render result.
 */
export function renderTrackingState(state, elements) {
  const messageKey = resolveMessageKey(state);
  const message = trackingUiMessages[messageKey];

  const hint = elements && typeof elements === 'object' ? elements.hint : undefined;
  const officialLink = elements && typeof elements === 'object' ? elements.officialLink : undefined;
  const officialDisclosure =
    elements && typeof elements === 'object' ? elements.officialDisclosure : undefined;
  const oceanCarrierLinks =
    elements && typeof elements === 'object' ? elements.oceanCarrierLinks : undefined;
  const oceanCarrierDisclosure =
    elements && typeof elements === 'object' ? elements.oceanCarrierDisclosure : undefined;
  const copyButton = elements && typeof elements === 'object' ? elements.copyButton : undefined;
  const copyStatus = elements && typeof elements === 'object' ? elements.copyStatus : undefined;

  renderOfficialRoutingArea(state, officialLink, officialDisclosure);
  renderOceanCarrierRoutingArea(state, oceanCarrierLinks, oceanCarrierDisclosure);
  renderCopyArea(state, elements, copyButton, copyStatus);

  if (!hint || typeof hint !== 'object') {
    return Object.freeze({ rendered: false, domModified: false, messageKey });
  }

  hint.textContent = message;

  return Object.freeze({ rendered: true, domModified: true, messageKey });
}

/**
 * Handle a tracking submission: read the current input value, route it,
 * and render the result. Never logs or stores the entered value. Passes
 * the persistent controller-local `elements` object straight through to
 * `renderTrackingState` (rather than a fresh literal) so the retained
 * copy-eligible identifier (see `renderCopyArea`) is written onto the
 * same object the copy button's click handler reads from.
 *
 * @param {{input: object, hint: object, officialLink?: object, officialDisclosure?: object, copyButton?: object, copyStatus?: object}} elements
 */
function handleTrackingSubmit(elements) {
  const rawValue = elements.input.value;
  const result = routeTrackingInput(rawValue);
  renderTrackingState(result, elements);
}

/**
 * Initialize the tracking UI controller by binding to explicitly supplied
 * elements.
 *
 * Performs no automatic DOM queries — every element must be supplied by
 * the caller via `options`. Does not query, modify, or reference the
 * assistant/chat interface. Attaches exactly one click listener to the
 * tracking button and one keydown listener to the tracking input (Enter
 * triggers the same action); re-initializing the same button/input pair
 * is a safe no-op rather than attaching duplicate listeners. Never
 * navigates externally, never logs or stores the entered shipment
 * identifier, and never mutates the input's current value.
 *
 * @param {{input: object, button: object, hint: object, searchTabs?: object, officialLink?: object, officialDisclosure?: object, oceanCarrierLinks?: object, oceanCarrierDisclosure?: object, copyButton?: object, copyStatus?: object}} options
 *   - `input`, `button`, and `hint` are required DOM-element-like objects
 *   (the tracking input, tracking button, and tracking hint,
 *   respectively). `searchTabs` is optional and is accepted but not
 *   otherwise modified by this controller — the existing tab behavior is
 *   left untouched. `officialLink` and `officialDisclosure` are optional;
 *   when supplied, they receive the official-tracking link/disclosure
 *   rendering described above. `oceanCarrierLinks` (an object keyed by
 *   `msc`/`zim`/`maersk`) and `oceanCarrierDisclosure` are optional; when
 *   supplied, they receive the ocean-carrier selection rendering
 *   described above. `copyButton` and `copyStatus` are optional; when
 *   supplied, `copyButton` receives exactly one click listener that
 *   copies the current controller-local retained identifier (see
 *   `renderCopyArea`/`handleCopyClick`) — re-initializing the same
 *   `button` is still a safe no-op, per the existing behavior below.
 * @returns {Readonly<{initialized: boolean, reason: string}>} A frozen
 *   initialization result describing success or the reason for failure.
 */
export function initializeTrackingUi(options) {
  const input = options && typeof options === 'object' ? options.input : undefined;
  const button = options && typeof options === 'object' ? options.button : undefined;
  const hint = options && typeof options === 'object' ? options.hint : undefined;
  const officialLink = options && typeof options === 'object' ? options.officialLink : undefined;
  const officialDisclosure =
    options && typeof options === 'object' ? options.officialDisclosure : undefined;
  const oceanCarrierLinks =
    options && typeof options === 'object' ? options.oceanCarrierLinks : undefined;
  const oceanCarrierDisclosure =
    options && typeof options === 'object' ? options.oceanCarrierDisclosure : undefined;
  const copyButton = options && typeof options === 'object' ? options.copyButton : undefined;
  const copyStatus = options && typeof options === 'object' ? options.copyStatus : undefined;

  if (!isUsableElement(input, ['addEventListener'])) {
    return Object.freeze({ initialized: false, reason: 'missing_input' });
  }
  if (!isUsableElement(button, ['addEventListener'])) {
    return Object.freeze({ initialized: false, reason: 'missing_button' });
  }
  if (!hint || typeof hint !== 'object') {
    return Object.freeze({ initialized: false, reason: 'missing_hint' });
  }

  if (initializedButtons.has(button)) {
    return Object.freeze({ initialized: false, reason: 'already_initialized' });
  }

  const elements = {
    input,
    hint,
    officialLink,
    officialDisclosure,
    oceanCarrierLinks,
    oceanCarrierDisclosure,
    copyButton,
    copyStatus,
    retainedIdentifier: null,
  };

  button.addEventListener('click', () => {
    handleTrackingSubmit(elements);
  });

  input.addEventListener('keydown', (event) => {
    if (event && event.key === 'Enter') {
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      handleTrackingSubmit(elements);
    }
  });

  if (isUsableElement(copyButton, ['addEventListener'])) {
    copyButton.addEventListener('click', () => {
      handleCopyClick(elements);
    });
  }

  initializedButtons.add(button);

  return Object.freeze({ initialized: true, reason: 'ok' });
}

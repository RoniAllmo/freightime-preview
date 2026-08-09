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
 * Elements are supplied explicitly by the caller (see index.html's
 * module script) rather than queried automatically by this module, and
 * importing this module has no side effects — no DOM access occurs
 * until `initializeTrackingUi` is called.
 */

import { routeTrackingInput } from './router.js';
import { trackingUiMessages } from './ui-messages.js';
import { decideOfficialTrackingRoute } from './official-routing.js';

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
 * hint-only behavior.
 *
 * @param {*} state - A router result from `routeTrackingInput` (or a
 *   malformed/unexpected value, handled safely).
 * @param {{hint: object, officialLink?: object, officialDisclosure?: object}} elements
 *   - Must include the tracking-hint element (any object exposing a
 *   settable `textContent` property). `officialLink` and
 *   `officialDisclosure` are optional.
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

  renderOfficialRoutingArea(state, officialLink, officialDisclosure);

  if (!hint || typeof hint !== 'object') {
    return Object.freeze({ rendered: false, domModified: false, messageKey });
  }

  hint.textContent = message;

  return Object.freeze({ rendered: true, domModified: true, messageKey });
}

/**
 * Handle a tracking submission: read the current input value, route it,
 * and render the result. Never logs or stores the entered value.
 *
 * @param {{input: object, hint: object, officialLink?: object, officialDisclosure?: object}} elements
 */
function handleTrackingSubmit(elements) {
  const rawValue = elements.input.value;
  const result = routeTrackingInput(rawValue);
  renderTrackingState(result, {
    hint: elements.hint,
    officialLink: elements.officialLink,
    officialDisclosure: elements.officialDisclosure,
  });
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
 * @param {{input: object, button: object, hint: object, searchTabs?: object, officialLink?: object, officialDisclosure?: object}} options
 *   - `input`, `button`, and `hint` are required DOM-element-like objects
 *   (the tracking input, tracking button, and tracking hint,
 *   respectively). `searchTabs` is optional and is accepted but not
 *   otherwise modified by this controller — the existing tab behavior is
 *   left untouched. `officialLink` and `officialDisclosure` are optional;
 *   when supplied, they receive the official-tracking link/disclosure
 *   rendering described above.
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

  const elements = { input, hint, officialLink, officialDisclosure };

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

  initializedButtons.add(button);

  return Object.freeze({ initialized: true, reason: 'ok' });
}

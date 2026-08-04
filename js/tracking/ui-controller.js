/**
 * User-interface controller for the FreighTime Single-input tracking
 * router.
 *
 * Responsibility: bind to explicitly supplied DOM elements (the tracking
 * input, the tracking button, the tracking hint, and optionally the
 * search-tabs element), call `routeTrackingInput` (router.js) on submit,
 * and render the result into the tracking-hint element using the Hebrew
 * messages from `trackingUiMessages` (ui-messages.js).
 *
 * This module performs no normalization, detection, or carrier logic
 * itself — it only reacts to user events and renders already-computed
 * router results. It performs no external navigation, no network
 * requests, no storage access, and no logging or storage of the entered
 * shipment identifier. It never queries, modifies, or references the
 * assistant/chat interface elsewhere on the page.
 *
 * Elements are supplied explicitly by the caller (see index.html's
 * module script) rather than queried automatically by this module, and
 * importing this module has no side effects — no DOM access occurs
 * until `initializeTrackingUi` is called.
 */

import { routeTrackingInput } from './router.js';
import { trackingUiMessages } from './ui-messages.js';

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
      if (state.identifierType === 'international-postal') return 'recognizedValidInternationalPostal';
      return 'unexpectedError';
    case 'recognized-invalid':
      if (state.identifierType === 'ocean-container') return 'recognizedInvalidContainer';
      if (state.identifierType === 'air-waybill') return 'recognizedInvalidAwb';
      if (state.identifierType === 'international-postal') return 'recognizedInvalidInternationalPostal';
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
 * Render a tracking-router result into the supplied tracking-hint
 * element.
 *
 * Uses `textContent` only (never `innerHTML`), displays a static Hebrew
 * message only (never the shipment identifier, a carrier name, or a
 * URL), and does not replace, remove, or otherwise alter the tracking
 * input/button or page navigation. Does not interact with the
 * assistant/chat interface.
 *
 * @param {*} state - A router result from `routeTrackingInput` (or a
 *   malformed/unexpected value, handled safely).
 * @param {{hint: object}} elements - Must include the tracking-hint
 *   element (any object exposing a settable `textContent` property).
 * @returns {Readonly<{rendered: boolean, domModified: boolean, messageKey: string}>}
 *   A frozen render result.
 */
export function renderTrackingState(state, elements) {
  const messageKey = resolveMessageKey(state);
  const message = trackingUiMessages[messageKey];

  const hint = elements && typeof elements === 'object' ? elements.hint : undefined;

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
 * @param {{input: object, hint: object}} elements
 */
function handleTrackingSubmit(elements) {
  const rawValue = elements.input.value;
  const result = routeTrackingInput(rawValue);
  renderTrackingState(result, { hint: elements.hint });
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
 * @param {{input: object, button: object, hint: object, searchTabs?: object}} options
 *   - `input`, `button`, and `hint` are required DOM-element-like objects
 *   (the tracking input, tracking button, and tracking hint,
 *   respectively). `searchTabs` is optional and is accepted but not
 *   otherwise modified by this controller — the existing tab behavior is
 *   left untouched.
 * @returns {Readonly<{initialized: boolean, reason: string}>} A frozen
 *   initialization result describing success or the reason for failure.
 */
export function initializeTrackingUi(options) {
  const input = options && typeof options === 'object' ? options.input : undefined;
  const button = options && typeof options === 'object' ? options.button : undefined;
  const hint = options && typeof options === 'object' ? options.hint : undefined;

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

  const elements = { input, hint };

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

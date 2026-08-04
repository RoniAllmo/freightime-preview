/**
 * Tests for js/tracking/ui-controller.js using the built-in Node.js test
 * runner (`node:test`) and assertion library (`node:assert`).
 *
 * No DOM library (e.g. jsdom) is installed or used. Instead, small local
 * fake-element test doubles are defined below, providing only the
 * behavior the controller actually needs: a settable `value` /
 * `textContent`, `addEventListener`, and a `dispatch` helper for firing
 * synthetic events in tests.
 *
 * Requirements #25-#28 ("existing normalization/container/AWB/router
 * tests continue to pass") are validated by running the full
 * `tests/tracking/` suite alongside this file, not duplicated here.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeTrackingUi, renderTrackingState } from '../../js/tracking/ui-controller.js';
import { trackingUiMessages } from '../../js/tracking/ui-messages.js';

/**
 * Create a minimal fake DOM-element-like test double.
 *
 * @param {{value?: string}} [options]
 */
function createFakeElement(options = {}) {
  const listeners = {};
  const element = {
    value: options.value ?? '',
    textContent: '',
    addEventListener(type, handler) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(handler);
    },
    removeEventListener(type, handler) {
      if (!listeners[type]) return;
      listeners[type] = listeners[type].filter((h) => h !== handler);
    },
    dispatch(type, event = {}) {
      (listeners[type] || []).forEach((handler) => handler(event));
    },
    listenerCount(type) {
      return (listeners[type] || []).length;
    },
  };
  // Fail loudly if the controller ever attempts innerHTML assignment.
  Object.defineProperty(element, 'innerHTML', {
    set() {
      throw new Error('innerHTML must never be used by the tracking UI controller');
    },
    get() {
      return '';
    },
  });
  return element;
}

function createFakeElements(inputValue = '') {
  return {
    input: createFakeElement({ value: inputValue }),
    button: createFakeElement(),
    hint: createFakeElement(),
  };
}

test('1. successful initialization with required elements', () => {
  const { input, button, hint } = createFakeElements();
  const result = initializeTrackingUi({ input, button, hint });
  assert.equal(result.initialized, true);
  assert.equal(result.reason, 'ok');
});

test('2. safe failure when the input element is missing', () => {
  const { button, hint } = createFakeElements();
  const result = initializeTrackingUi({ button, hint });
  assert.equal(result.initialized, false);
  assert.equal(result.reason, 'missing_input');
});

test('3. safe failure when the button element is missing', () => {
  const { input, hint } = createFakeElements();
  const result = initializeTrackingUi({ input, hint });
  assert.equal(result.initialized, false);
  assert.equal(result.reason, 'missing_button');
});

test('4. safe failure when the hint element is missing', () => {
  const { input, button } = createFakeElements();
  const result = initializeTrackingUi({ input, button });
  assert.equal(result.initialized, false);
  assert.equal(result.reason, 'missing_hint');
});

test('5. click with empty input renders the Hebrew empty message', () => {
  const { input, button, hint } = createFakeElements('   ');
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.empty);
});

test('6. click with a valid container renders the valid-container message', () => {
  const { input, button, hint } = createFakeElements('CSQU3054383');
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.recognizedValidContainer);
});

test('7. click with an invalid-check-digit container renders the invalid-container message', () => {
  const { input, button, hint } = createFakeElements('CSQU3054380');
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.recognizedInvalidContainer);
});

test('8. click with a valid AWB renders the valid-AWB message', () => {
  const { input, button, hint } = createFakeElements('02012345675');
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.recognizedValidAwb);
});

test('9. click with an invalid-check-digit AWB renders the invalid-AWB message', () => {
  const { input, button, hint } = createFakeElements('02012345676');
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.recognizedInvalidAwb);
});

test('10. click with an unknown identifier renders the unrecognized message', () => {
  const { input, button, hint } = createFakeElements('HELLO12345');
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.unrecognized);
});

test('11. Enter key triggers the same flow', () => {
  const { input, button, hint } = createFakeElements('CSQU3054383');
  initializeTrackingUi({ input, button, hint });
  input.dispatch('keydown', { key: 'Enter', preventDefault() {} });
  assert.equal(hint.textContent, trackingUiMessages.recognizedValidContainer);
});

test('12. a non-Enter key does not trigger tracking', () => {
  const { input, button, hint } = createFakeElements('CSQU3054383');
  initializeTrackingUi({ input, button, hint });
  input.dispatch('keydown', { key: 'Tab', preventDefault() {} });
  assert.equal(hint.textContent, '');
});

test('13. renderTrackingState uses textContent to render', () => {
  const hint = createFakeElement();
  renderTrackingState({ status: 'empty', identifierType: 'unknown' }, { hint });
  assert.equal(hint.textContent, trackingUiMessages.empty);
});

test('14. renderTrackingState never uses innerHTML', () => {
  const hint = createFakeElement();
  assert.doesNotThrow(() => {
    renderTrackingState({ status: 'recognized-valid', identifierType: 'ocean-container' }, { hint });
  });
});

test('15. the full identifier is not added to the displayed message', () => {
  const { input, button, hint } = createFakeElements('CSQU3054383');
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent.includes('CSQU3054383'), false);
});

test('16. initialization does not alter the input value', () => {
  const { input, button, hint } = createFakeElements('CSQU3054383');
  initializeTrackingUi({ input, button, hint });
  assert.equal(input.value, 'CSQU3054383');
});

test('17. repeated initialization does not attach duplicate listeners', () => {
  const { input, button, hint } = createFakeElements('CSQU3054383');
  const first = initializeTrackingUi({ input, button, hint });
  const second = initializeTrackingUi({ input, button, hint });
  assert.equal(first.initialized, true);
  assert.equal(second.initialized, false);
  assert.equal(second.reason, 'already_initialized');
  assert.equal(button.listenerCount('click'), 1);
  assert.equal(input.listenerCount('keydown'), 1);
});

test('18. the initialization result is frozen', () => {
  const { input, button, hint } = createFakeElements();
  const result = initializeTrackingUi({ input, button, hint });
  assert.equal(Object.isFrozen(result), true);
});

test('19. the render result is frozen', () => {
  const hint = createFakeElement();
  const result = renderTrackingState({ status: 'unrecognized', identifierType: 'unknown' }, { hint });
  assert.equal(Object.isFrozen(result), true);
});

test('20. no external navigation occurs', () => {
  assert.equal(typeof globalThis.window, 'undefined');
  const { input, button, hint } = createFakeElements('CSQU3054383');
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(typeof globalThis.window, 'undefined');
});

test('21. no network request occurs', () => {
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = () => { fetchCalled = true; };
  try {
    const { input, button, hint } = createFakeElements('CSQU3054383');
    initializeTrackingUi({ input, button, hint });
    button.dispatch('click');
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(fetchCalled, false);
});

test('22. no storage access occurs', () => {
  assert.equal(typeof globalThis.localStorage, 'undefined');
  assert.equal(typeof globalThis.sessionStorage, 'undefined');
  const { input, button, hint } = createFakeElements('CSQU3054383');
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(typeof globalThis.localStorage, 'undefined');
  assert.equal(typeof globalThis.sessionStorage, 'undefined');
});

test('23. no logging of shipment identifiers occurs', () => {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  let logCalled = false;
  console.log = () => { logCalled = true; };
  console.warn = () => { logCalled = true; };
  console.error = () => { logCalled = true; };
  try {
    const { input, button, hint } = createFakeElements('CSQU3054383');
    initializeTrackingUi({ input, button, hint });
    button.dispatch('click');
    input.dispatch('keydown', { key: 'Enter', preventDefault() {} });
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  }
  assert.equal(logCalled, false);
});

test('24. no assistant/chat interaction occurs', () => {
  const { input, button, hint } = createFakeElements('CSQU3054383');
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(typeof globalThis.chatFab, 'undefined');
  assert.equal(typeof globalThis.chatPanel, 'undefined');
  assert.equal(typeof globalThis.document, 'undefined');
});

test('25. click with a valid official-tool S10 identifier renders the valid-international-postal message', () => {
  const { input, button, hint } = createFakeElements('AA876543216AA');
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.recognizedValidInternationalPostal);
});

test('26. click with a valid boundary fixture (11 -> 5) renders the valid-international-postal message', () => {
  const { input, button, hint } = createFakeElements('AA000000005AA');
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.recognizedValidInternationalPostal);
});

test('27. click with a valid boundary fixture (10 -> 0) renders the valid-international-postal message', () => {
  const { input, button, hint } = createFakeElements('AA700000000AA');
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.recognizedValidInternationalPostal);
});

test('28. click with an invalid-check-digit S10 identifier renders the invalid-international-postal message', () => {
  const { input, button, hint } = createFakeElements('AA876543210AA');
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.recognizedInvalidInternationalPostal);
});

test('29. the full postal identifier is not added to the displayed message', () => {
  const { input, button, hint } = createFakeElements('AA876543216AA');
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent.includes('AA876543216AA'), false);
});

test('30. lowercase raw S10 input is normalized and renders the valid-international-postal message', () => {
  const { input, button, hint } = createFakeElements('aa876543216aa');
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.recognizedValidInternationalPostal);
  assert.equal(hint.textContent, 'זוהה מספר דואר בינלאומי תקין');
});

test('31. S10 input containing internal spaces normalizes to AA876543216AA and renders the valid message', () => {
  const { input, button, hint } = createFakeElements('AA 876543216 AA');
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.recognizedValidInternationalPostal);
});

test('32. S10 input containing hyphens normalizes to AA876543216AA and renders the valid message', () => {
  const { input, button, hint } = createFakeElements('AA-876543216-AA');
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.recognizedValidInternationalPostal);
});

test('33. Enter key with a valid S10 identifier produces the same result as clicking the button', () => {
  const { input, button, hint } = createFakeElements('AA876543216AA');
  initializeTrackingUi({ input, button, hint });
  input.dispatch('keydown', { key: 'Enter', preventDefault() {} });
  assert.equal(hint.textContent, trackingUiMessages.recognizedValidInternationalPostal);
});

test('34. a valid E-prefixed S10 fixture renders the international-postal message, not an EMS-specific message', () => {
  const { input, button, hint } = createFakeElements('EA876543216AA');
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.recognizedValidInternationalPostal);
});

test('35. the E-prefixed result does not contain the word EMS', () => {
  const { input, button, hint } = createFakeElements('EA876543216AA');
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent.includes('EMS'), false);
});

test('36. the rendered postal result contains no operator, country, or URL wording', () => {
  const { input, button, hint } = createFakeElements('AA876543216AA');
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent.includes('Israel Post'), false);
  assert.equal(hint.textContent.includes('דואר ישראל'), false);
  assert.equal(hint.textContent.includes('http://'), false);
  assert.equal(hint.textContent.includes('https://'), false);
  assert.equal(hint.textContent, trackingUiMessages.recognizedValidInternationalPostal);
});

test('37. postal processing causes no external navigation, network, storage, logging, analytics, or assistant interaction', () => {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalFetch = globalThis.fetch;
  let logCalled = false;
  let fetchCalled = false;
  console.log = () => { logCalled = true; };
  console.warn = () => { logCalled = true; };
  console.error = () => { logCalled = true; };
  globalThis.fetch = () => { fetchCalled = true; };
  try {
    const { input, button, hint } = createFakeElements('AA876543216AA');
    initializeTrackingUi({ input, button, hint });
    button.dispatch('click');
    input.dispatch('keydown', { key: 'Enter', preventDefault() {} });
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
    globalThis.fetch = originalFetch;
  }
  assert.equal(logCalled, false);
  assert.equal(fetchCalled, false);
  assert.equal(typeof globalThis.window, 'undefined');
  assert.equal(typeof globalThis.localStorage, 'undefined');
  assert.equal(typeof globalThis.sessionStorage, 'undefined');
  assert.equal(typeof globalThis.chatFab, 'undefined');
  assert.equal(typeof globalThis.chatPanel, 'undefined');
  assert.equal(typeof globalThis.document, 'undefined');
});

// --- UPS commercial-courier UI integration (38 onward) ---
//
// Synthetic UPS fixtures are generated by length only (a `1Z`/`1R` prefix
// followed by repeated digits, matching the approved structural rules in
// COURIER_IMPLEMENTATION_DECISION.md), not real, public, or operational
// UPS tracking numbers.
const VALID_1Z = `1Z${'0'.repeat(16)}`;
const VALID_1R_SHORT = `1R${'0'.repeat(14)}`;
const VALID_1R_LONG = `1R${'0'.repeat(26)}`;
const INVALID_1Z = '1Z12345';
const INVALID_1R = '1R12345';

test('38. click with a valid synthetic UPS 1Z renders the valid-UPS message', () => {
  const { input, button, hint } = createFakeElements(VALID_1Z);
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.recognizedValidUps);
  assert.equal(hint.textContent, 'זוהה מספר מעקב של UPS');
});

test('39. click with an invalid-structure UPS 1Z renders the invalid-UPS message', () => {
  const { input, button, hint } = createFakeElements(INVALID_1Z);
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.recognizedInvalidUps);
});

test('40. click with a valid synthetic UPS Roadie 1R short renders the valid-UPS-Roadie message', () => {
  const { input, button, hint } = createFakeElements(VALID_1R_SHORT);
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.recognizedValidUpsRoadie);
  assert.equal(hint.textContent, 'זוהה מספר מעקב של UPS Roadie');
});

test('41. click with a valid synthetic UPS Roadie 1R long renders the valid-UPS-Roadie message', () => {
  const { input, button, hint } = createFakeElements(VALID_1R_LONG);
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.recognizedValidUpsRoadie);
});

test('42. click with an invalid-structure UPS Roadie 1R renders the invalid-UPS-Roadie message', () => {
  const { input, button, hint } = createFakeElements(INVALID_1R);
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.recognizedInvalidUpsRoadie);
});

test('43. lowercase raw 1Z input normalizes and renders the valid-UPS message', () => {
  const { input, button, hint } = createFakeElements(VALID_1Z.toLowerCase());
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.recognizedValidUps);
});

test('44. lowercase raw 1R input normalizes and renders the valid-UPS-Roadie message', () => {
  const { input, button, hint } = createFakeElements(VALID_1R_SHORT.toLowerCase());
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.recognizedValidUpsRoadie);
});

test('45. Enter key works for a valid synthetic UPS 1Z', () => {
  const { input, button, hint } = createFakeElements(VALID_1Z);
  initializeTrackingUi({ input, button, hint });
  input.dispatch('keydown', { key: 'Enter', preventDefault() {} });
  assert.equal(hint.textContent, trackingUiMessages.recognizedValidUps);
});

test('46. Enter key works for a valid synthetic UPS Roadie 1R', () => {
  const { input, button, hint } = createFakeElements(VALID_1R_SHORT);
  initializeTrackingUi({ input, button, hint });
  input.dispatch('keydown', { key: 'Enter', preventDefault() {} });
  assert.equal(hint.textContent, trackingUiMessages.recognizedValidUpsRoadie);
});

test('47. the full UPS identifier is not added to the displayed message', () => {
  const { input, button, hint } = createFakeElements(VALID_1Z);
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent.includes(VALID_1Z), false);
});

test('48. internal carrier IDs "ups" and "ups-roadie" are not displayed as result text', () => {
  const { input: input1, button: button1, hint: hint1 } = createFakeElements(VALID_1Z);
  initializeTrackingUi({ input: input1, button: button1, hint: hint1 });
  button1.dispatch('click');
  assert.equal(hint1.textContent.includes('ups-roadie'), false);
  assert.equal(hint1.textContent.includes('"ups"'), false);

  const { input: input2, button: button2, hint: hint2 } = createFakeElements(VALID_1R_SHORT);
  initializeTrackingUi({ input: input2, button: button2, hint: hint2 });
  button2.dispatch('click');
  assert.equal(hint2.textContent.includes('ups-roadie'), false);
});

test('49. an unsupported commercial-courier state renders unexpectedError', () => {
  const hint = createFakeElement();
  const malformedMissing = renderTrackingState(
    { status: 'recognized-valid', identifierType: 'commercial-courier' },
    { hint },
  );
  assert.equal(malformedMissing.messageKey, 'unexpectedError');
  assert.equal(hint.textContent, trackingUiMessages.unexpectedError);

  const malformedEmpty = renderTrackingState(
    { status: 'recognized-valid', identifierType: 'commercial-courier', possibleCarriers: [] },
    { hint },
  );
  assert.equal(malformedEmpty.messageKey, 'unexpectedError');

  const malformedUnknownCarrier = renderTrackingState(
    { status: 'recognized-valid', identifierType: 'commercial-courier', possibleCarriers: ['dsv'] },
    { hint },
  );
  assert.equal(malformedUnknownCarrier.messageKey, 'unexpectedError');

  const malformedNonArray = renderTrackingState(
    { status: 'recognized-valid', identifierType: 'commercial-courier', possibleCarriers: 'ups' },
    { hint },
  );
  assert.equal(malformedNonArray.messageKey, 'unexpectedError');

  const malformedMultiple = renderTrackingState(
    { status: 'recognized-valid', identifierType: 'commercial-courier', possibleCarriers: ['ups', 'ups-roadie'] },
    { hint },
  );
  assert.equal(malformedMultiple.messageKey, 'unexpectedError');

  const malformedAmbiguousStatus = renderTrackingState(
    { status: 'ambiguous', identifierType: 'commercial-courier', possibleCarriers: ['ups'] },
    { hint },
  );
  assert.equal(malformedAmbiguousStatus.messageKey, 'ambiguous');
});

test('50. UPS processing causes no URL, navigation, network, storage, logging, analytics, or assistant interaction', () => {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalFetch = globalThis.fetch;
  let logCalled = false;
  let fetchCalled = false;
  console.log = () => { logCalled = true; };
  console.warn = () => { logCalled = true; };
  console.error = () => { logCalled = true; };
  globalThis.fetch = () => { fetchCalled = true; };
  try {
    const { input, button, hint } = createFakeElements(VALID_1Z);
    initializeTrackingUi({ input, button, hint });
    button.dispatch('click');
    input.dispatch('keydown', { key: 'Enter', preventDefault() {} });

    const { input: input2, button: button2, hint: hint2 } = createFakeElements(VALID_1R_LONG);
    initializeTrackingUi({ input: input2, button: button2, hint: hint2 });
    button2.dispatch('click');

    const { input: input3, button: button3, hint: hint3 } = createFakeElements(INVALID_1Z);
    initializeTrackingUi({ input: input3, button: button3, hint: hint3 });
    button3.dispatch('click');
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
    globalThis.fetch = originalFetch;
  }
  assert.equal(logCalled, false);
  assert.equal(fetchCalled, false);
  assert.equal(typeof globalThis.window, 'undefined');
  assert.equal(typeof globalThis.localStorage, 'undefined');
  assert.equal(typeof globalThis.sessionStorage, 'undefined');
  assert.equal(typeof globalThis.chatFab, 'undefined');
  assert.equal(typeof globalThis.chatPanel, 'undefined');
  assert.equal(typeof globalThis.document, 'undefined');
});

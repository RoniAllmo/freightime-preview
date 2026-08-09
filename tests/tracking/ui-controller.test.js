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
import { readFileSync } from 'node:fs';
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

/**
 * Create a fake link-like element with a settable `href` (also usable as
 * the disclosure element, which only needs `textContent`/`hidden`).
 */
function createFakeLinkElement() {
  const element = createFakeElement();
  element.href = undefined;
  element.hidden = true;
  const originalRemoveAttribute = element.removeAttribute;
  element.removeAttribute = function removeAttribute(name) {
    if (name === 'href') {
      element.href = undefined;
    }
    if (typeof originalRemoveAttribute === 'function') {
      originalRemoveAttribute.call(element, name);
    }
  };
  return element;
}

function createFakeElements(inputValue = '') {
  return {
    input: createFakeElement({ value: inputValue }),
    button: createFakeElement(),
    hint: createFakeElement(),
    officialLink: createFakeLinkElement(),
    officialDisclosure: createFakeElement(),
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

test('34. a valid E-prefixed S10 fixture now renders the approved EMS message, per the EMS classification decision', () => {
  const { input, button, hint } = createFakeElements('EA876543216AA');
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.recognizedValidEms);
});

test('35. the E-prefixed result now legitimately contains the word EMS, since EMS classification is approved', () => {
  const { input, button, hint } = createFakeElements('EA876543216AA');
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent.includes('EMS'), true);
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

// --- EMS classification UI integration (51 onward) ---
//
// Synthetic S10/EMS fixtures reuse the already-verified official worked
// example's serial digits (`876543216AA` = check digit 6; `876543210AA`
// = a deliberately invalid check digit), with only the leading two-letter
// service indicator varied. None represents a real customer or
// operational shipment, and none was submitted to any tracking service.
const emsValidFixture = (indicator) => `${indicator}876543216AA`;
const emsInvalidFixture = (indicator) => `${indicator}876543210AA`;

test('51. valid EA renders the EMS message', () => {
  const { input, button, hint } = createFakeElements(emsValidFixture('EA'));
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.recognizedValidEms);
  assert.equal(hint.textContent, 'זוהה מספר EMS תקין');
});

test('52. valid EE renders the EMS message', () => {
  const { input, button, hint } = createFakeElements(emsValidFixture('EE'));
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.recognizedValidEms);
});

test('53. valid EW renders the EMS message', () => {
  const { input, button, hint } = createFakeElements(emsValidFixture('EW'));
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.recognizedValidEms);
});

test('54. valid EX renders the same EMS message', () => {
  const { input, button, hint } = createFakeElements(emsValidFixture('EX'));
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.recognizedValidEms);
});

test('55. valid EY renders the same EMS message', () => {
  const { input, button, hint } = createFakeElements(emsValidFixture('EY'));
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.recognizedValidEms);
});

test('56. valid EZ renders the same EMS message', () => {
  const { input, button, hint } = createFakeElements(emsValidFixture('EZ'));
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.recognizedValidEms);
});

test('57. invalid EA renders the invalid EMS message', () => {
  const { input, button, hint } = createFakeElements(emsInvalidFixture('EA'));
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.recognizedInvalidEms);
  assert.equal(
    hint.textContent,
    'המספר נראה כמספר EMS, אך ספרת הביקורת אינה תקינה. מומלץ לבדוק את המספר.',
  );
});

test('58. invalid EW renders the invalid EMS message', () => {
  const { input, button, hint } = createFakeElements(emsInvalidFixture('EW'));
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.recognizedInvalidEms);
});

test('59. invalid EX renders the invalid EMS message', () => {
  const { input, button, hint } = createFakeElements(emsInvalidFixture('EX'));
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.recognizedInvalidEms);
});

test('60. invalid EZ renders the invalid EMS message', () => {
  const { input, button, hint } = createFakeElements(emsInvalidFixture('EZ'));
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.recognizedInvalidEms);
});

test('61. lowercase raw EMS input is normalized and recognized', () => {
  const { input, button, hint } = createFakeElements(emsValidFixture('EA').toLowerCase());
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.recognizedValidEms);
});

test('62. Enter key with valid EMS produces the same result as clicking', () => {
  const { input, button, hint } = createFakeElements(emsValidFixture('EA'));
  initializeTrackingUi({ input, button, hint });
  input.dispatch('keydown', { key: 'Enter', preventDefault() {} });
  assert.equal(hint.textContent, trackingUiMessages.recognizedValidEms);
});

test('63. a valid non-EMS S10 identifier still renders the generic valid-postal message', () => {
  const { input, button, hint } = createFakeElements('RR876543216AA');
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.recognizedValidInternationalPostal);
  assert.equal(hint.textContent, 'זוהה מספר דואר בינלאומי תקין');
});

test('64. an invalid non-EMS S10 identifier still renders the existing invalid international-postal message', () => {
  const { input, button, hint } = createFakeElements('AA876543210AA');
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.recognizedInvalidInternationalPostal);
});

test('65. the rendered EMS message does not expose the identifier, technical keys, or operator/country/URL wording', () => {
  const { input, button, hint } = createFakeElements(emsValidFixture('EX'));
  initializeTrackingUi({ input, button, hint });
  button.dispatch('click');
  assert.equal(hint.textContent.includes(emsValidFixture('EX')), false);
  assert.equal(hint.textContent.includes('s10_ems_standard_valid'), false);
  assert.equal(hint.textContent.includes('s10_ems_bilateral_valid'), false);
  assert.equal(hint.textContent.includes('international-postal'), false);
  assert.equal(hint.textContent.includes('bilateral'), false);
  assert.equal(hint.textContent.includes('דו-צדדי'), false);
  assert.equal(hint.textContent.includes('Israel Post'), false);
  assert.equal(hint.textContent.includes('דואר ישראל'), false);
  assert.equal(hint.textContent.includes('http://'), false);
  assert.equal(hint.textContent.includes('https://'), false);
});

test('66. EMS processing causes no external navigation, network, storage, logging, analytics, or assistant interaction', () => {
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
    const { input, button, hint } = createFakeElements(emsValidFixture('EA'));
    initializeTrackingUi({ input, button, hint });
    button.dispatch('click');
    input.dispatch('keydown', { key: 'Enter', preventDefault() {} });

    const { input: input2, button: button2, hint: hint2 } = createFakeElements(emsValidFixture('EX'));
    initializeTrackingUi({ input: input2, button: button2, hint: hint2 });
    button2.dispatch('click');

    const { input: input3, button: button3, hint: hint3 } = createFakeElements(emsInvalidFixture('EA'));
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

// --- Official-tracking link/disclosure UI integration (67 onward) ---
//
// Reuses the same synthetic, non-operational UPS/EMS fixtures already
// defined above (VALID_1Z, VALID_1R_SHORT, VALID_1R_LONG, emsValidFixture,
// emsInvalidFixture, INVALID_1Z, INVALID_1R). None represents a real
// customer or operational shipment, and none was submitted to any
// tracking service.

test('67. a valid UPS 1Z displays the exact official UPS generic URL', () => {
  const { input, button, hint, officialLink, officialDisclosure } = createFakeElements(VALID_1Z);
  initializeTrackingUi({ input, button, hint, officialLink, officialDisclosure });
  button.dispatch('click');
  assert.equal(officialLink.href, 'https://www.ups.com/track?loc=EN_US');
  assert.equal(officialLink.hidden, false);
});

test('68. a valid UPS Roadie 1R short displays the exact official Roadie URL', () => {
  const { input, button, hint, officialLink, officialDisclosure } = createFakeElements(VALID_1R_SHORT);
  initializeTrackingUi({ input, button, hint, officialLink, officialDisclosure });
  button.dispatch('click');
  assert.equal(officialLink.href, 'https://track.roadie.com/');
  assert.equal(officialLink.hidden, false);
});

test('69. a valid UPS Roadie 1R long displays the exact official Roadie URL', () => {
  const { input, button, hint, officialLink, officialDisclosure } = createFakeElements(VALID_1R_LONG);
  initializeTrackingUi({ input, button, hint, officialLink, officialDisclosure });
  button.dispatch('click');
  assert.equal(officialLink.href, 'https://track.roadie.com/');
  assert.equal(officialLink.hidden, false);
});

test('70. a valid standard EMS (EA) displays the exact official EMS URL', () => {
  const { input, button, hint, officialLink, officialDisclosure } = createFakeElements(emsValidFixture('EA'));
  initializeTrackingUi({ input, button, hint, officialLink, officialDisclosure });
  button.dispatch('click');
  assert.equal(officialLink.href, 'https://items.ems.post/');
  assert.equal(officialLink.hidden, false);
});

test('71. a valid bilateral EMS (EX) displays the same exact official EMS URL', () => {
  const { input, button, hint, officialLink, officialDisclosure } = createFakeElements(emsValidFixture('EX'));
  initializeTrackingUi({ input, button, hint, officialLink, officialDisclosure });
  button.dispatch('click');
  assert.equal(officialLink.href, 'https://items.ems.post/');
  assert.equal(officialLink.hidden, false);
});

test('72. the official link text uses the exact approved Hebrew button wording', () => {
  const { input, button, hint, officialLink, officialDisclosure } = createFakeElements(VALID_1Z);
  initializeTrackingUi({ input, button, hint, officialLink, officialDisclosure });
  button.dispatch('click');
  assert.equal(officialLink.textContent, trackingUiMessages.officialTrackingButton);
  assert.equal(officialLink.textContent, 'מעבר לאתר המעקב הרשמי');
});

test('73. the disclosure text uses the exact approved Hebrew disclosure wording', () => {
  const { input, button, hint, officialLink, officialDisclosure } = createFakeElements(VALID_1Z);
  initializeTrackingUi({ input, button, hint, officialLink, officialDisclosure });
  button.dispatch('click');
  assert.equal(officialDisclosure.textContent, trackingUiMessages.officialTrackingDisclosure);
  assert.equal(officialDisclosure.textContent, 'הקישור ייפתח באתר חיצוני. יש להזין שם את מספר המעקב.');
  assert.equal(officialDisclosure.hidden, false);
});

test('74. the official link uses target="_blank" in the real page markup (index.html)', () => {
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const anchorMatch = html.match(/<a[^>]*id="officialTrackingLink"[^>]*>/);
  assert.ok(anchorMatch, 'expected an anchor with id="officialTrackingLink" in index.html');
  assert.ok(anchorMatch[0].includes('target="_blank"'));
});

test('75. the official link uses rel="noopener noreferrer" in the real page markup (index.html)', () => {
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const anchorMatch = html.match(/<a[^>]*id="officialTrackingLink"[^>]*>/);
  assert.ok(anchorMatch, 'expected an anchor with id="officialTrackingLink" in index.html');
  assert.ok(anchorMatch[0].includes('rel="noopener noreferrer"'));
});

test('76. the official link markup starts hidden and with no href attribute', () => {
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const anchorMatch = html.match(/<a[^>]*id="officialTrackingLink"[^>]*>/);
  assert.ok(anchorMatch, 'expected an anchor with id="officialTrackingLink" in index.html');
  assert.ok(anchorMatch[0].includes('hidden'));
  assert.ok(!/\shref=/.test(anchorMatch[0]));
});

test('77. no available href ever contains the entered identifier', () => {
  const fixtures = [VALID_1Z, VALID_1R_SHORT, VALID_1R_LONG, emsValidFixture('EA'), emsValidFixture('EX')];
  for (const fixtureValue of fixtures) {
    const { input, button, hint, officialLink, officialDisclosure } = createFakeElements(fixtureValue);
    initializeTrackingUi({ input, button, hint, officialLink, officialDisclosure });
    button.dispatch('click');
    assert.equal(officialLink.href.includes(fixtureValue), false);
    assert.equal(officialLink.href.includes(fixtureValue.toUpperCase()), false);
  }
});

test('78. an invalid UPS structure displays no official link', () => {
  const { input, button, hint, officialLink, officialDisclosure } = createFakeElements(INVALID_1Z);
  initializeTrackingUi({ input, button, hint, officialLink, officialDisclosure });
  button.dispatch('click');
  assert.equal(officialLink.hidden, true);
  assert.equal(officialLink.href, undefined);
  assert.equal(officialLink.textContent, '');
  assert.equal(officialDisclosure.hidden, true);
  assert.equal(officialDisclosure.textContent, '');
});

test('79. an invalid UPS Roadie structure displays no official link', () => {
  const { input, button, hint, officialLink, officialDisclosure } = createFakeElements(INVALID_1R);
  initializeTrackingUi({ input, button, hint, officialLink, officialDisclosure });
  button.dispatch('click');
  assert.equal(officialLink.hidden, true);
  assert.equal(officialLink.href, undefined);
});

test('80. an invalid EMS check digit displays no official link', () => {
  const { input, button, hint, officialLink, officialDisclosure } = createFakeElements(emsInvalidFixture('EA'));
  initializeTrackingUi({ input, button, hint, officialLink, officialDisclosure });
  button.dispatch('click');
  assert.equal(officialLink.hidden, true);
  assert.equal(officialLink.href, undefined);
});

test('81. generic non-EMS S10 displays no official link', () => {
  const { input, button, hint, officialLink, officialDisclosure } = createFakeElements('AA876543216AA');
  initializeTrackingUi({ input, button, hint, officialLink, officialDisclosure });
  button.dispatch('click');
  assert.equal(officialLink.hidden, true);
});

test('82. a valid AWB displays no official link', () => {
  const { input, button, hint, officialLink, officialDisclosure } = createFakeElements('02012345675');
  initializeTrackingUi({ input, button, hint, officialLink, officialDisclosure });
  button.dispatch('click');
  assert.equal(officialLink.hidden, true);
});

test('83. a valid container displays no official link', () => {
  const { input, button, hint, officialLink, officialDisclosure } = createFakeElements('CSQU3054383');
  initializeTrackingUi({ input, button, hint, officialLink, officialDisclosure });
  button.dispatch('click');
  assert.equal(officialLink.hidden, true);
});

test('84. an unknown identifier displays no official link', () => {
  const { input, button, hint, officialLink, officialDisclosure } = createFakeElements('HELLO12345');
  initializeTrackingUi({ input, button, hint, officialLink, officialDisclosure });
  button.dispatch('click');
  assert.equal(officialLink.hidden, true);
});

test('85. empty input displays no official link', () => {
  const { input, button, hint, officialLink, officialDisclosure } = createFakeElements('   ');
  initializeTrackingUi({ input, button, hint, officialLink, officialDisclosure });
  button.dispatch('click');
  assert.equal(officialLink.hidden, true);
});

test('86. a synthetic ambiguous router result displays no official link', () => {
  const officialLink = createFakeLinkElement();
  const officialDisclosure = createFakeElement();
  renderTrackingState(
    { status: 'ambiguous', identifierType: 'ambiguous', valid: false, ambiguous: true, possibleCarriers: ['ups', 'ups-roadie'], reason: 'multiple_detector_matches' },
    { hint: createFakeElement(), officialLink, officialDisclosure },
  );
  assert.equal(officialLink.hidden, true);
  assert.equal(officialDisclosure.hidden, true);
});

test('87. a previously shown valid link is removed and hidden by a later unavailable result', () => {
  const { input, button, hint, officialLink, officialDisclosure } = createFakeElements(VALID_1Z);
  initializeTrackingUi({ input, button, hint, officialLink, officialDisclosure });
  button.dispatch('click');
  assert.equal(officialLink.hidden, false);
  assert.equal(officialLink.href, 'https://www.ups.com/track?loc=EN_US');

  input.value = 'HELLO12345';
  button.dispatch('click');
  assert.equal(officialLink.hidden, true);
  assert.equal(officialLink.href, undefined);
  assert.equal(officialLink.textContent, '');
  assert.equal(officialDisclosure.hidden, true);
  assert.equal(officialDisclosure.textContent, '');
});

test('88. official-tracking-link processing causes no automatic navigation, network request, storage, logging, or assistant interaction', () => {
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
    const { input, button, hint, officialLink, officialDisclosure } = createFakeElements(VALID_1Z);
    initializeTrackingUi({ input, button, hint, officialLink, officialDisclosure });
    button.dispatch('click');

    const { input: input2, button: button2, hint: hint2, officialLink: officialLink2, officialDisclosure: officialDisclosure2 } =
      createFakeElements(emsValidFixture('EX'));
    initializeTrackingUi({ input: input2, button: button2, hint: hint2, officialLink: officialLink2, officialDisclosure: officialDisclosure2 });
    button2.dispatch('click');
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

test('89. existing tracking-hint messages remain unchanged for a valid UPS result', () => {
  const { input, button, hint, officialLink, officialDisclosure } = createFakeElements(VALID_1Z);
  initializeTrackingUi({ input, button, hint, officialLink, officialDisclosure });
  button.dispatch('click');
  assert.equal(hint.textContent, trackingUiMessages.recognizedValidUps);
});

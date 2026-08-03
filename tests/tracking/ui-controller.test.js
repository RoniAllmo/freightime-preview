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

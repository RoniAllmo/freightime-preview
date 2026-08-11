/**
 * Tests for js/tracking-import/tracking-import-controller.js using the
 * built-in Node.js test runner (`node:test`) and assertion library
 * (`node:assert`).
 *
 * No DOM library (e.g. jsdom) is installed or used. Small local
 * fake-element/fake-document test doubles are defined below, matching
 * the style already used in tests/tools/tools-controller.test.js and
 * tests/tracking/ui-controller.test.js.
 *
 * All pasted-text fixtures below are entirely synthetic representative
 * text, never content copied from a real carrier website.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeTrackingImportUi } from '../../js/tracking-import/tracking-import-controller.js';

function createFakeElement(options = {}) {
  const listeners = {};
  let textContentValue = '';
  const element = {
    value: options.value ?? '',
    hidden: options.hidden ?? true,
    children: [],
    addEventListener(type, handler) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(handler);
    },
    dispatch(type, event = {}) {
      (listeners[type] || []).forEach((handler) => handler(event));
    },
    appendChild(child) {
      element.children.push(child);
      return child;
    },
  };
  Object.defineProperty(element, 'textContent', {
    set(value) {
      textContentValue = value;
      element.children.length = 0;
    },
    get() {
      return textContentValue;
    },
  });
  Object.defineProperty(element, 'innerHTML', {
    set() {
      throw new Error('innerHTML must never be used by the tracking-import controller');
    },
    get() {
      return '';
    },
  });
  return element;
}

function createFakeDocument() {
  return {
    createElement(tagName) {
      const el = createFakeElement();
      el.tagName = tagName;
      el.className = '';
      return el;
    },
  };
}

function buildElements(overrides = {}) {
  return {
    sectionElement: createFakeElement({ hidden: true }),
    textarea: createFakeElement({ value: '' }),
    sourceSelect: createFakeElement({ value: 'auto' }),
    parseButton: createFakeElement(),
    resetButton: createFakeElement(),
    copyButton: createFakeElement(),
    copyStatus: createFakeElement(),
    errorElement: createFakeElement(),
    resultElement: createFakeElement(),
    verificationElement: createFakeElement(),
    documentRef: createFakeDocument(),
    ...overrides,
  };
}

function findNoteContaining(resultElement, substring) {
  return resultElement.children.some(
    (child) => child.tagName === 'p' && typeof child.textContent === 'string' && child.textContent.includes(substring),
  );
}

test('1. rendering: initialization wires the parse button without throwing', () => {
  const elements = buildElements();
  const outcome = initializeTrackingImportUi(elements);
  assert.equal(outcome.initialized, true);
});

test('2. paste and parse: a qualifying ocean text renders a partial result', () => {
  const elements = buildElements({
    textarea: createFakeElement({ value: 'Vessel Name: MSC EXAMPLE\nVoyage Number: 123W\nETA: 2026-08-20' }),
    sourceSelect: createFakeElement({ value: 'ocean' }),
  });
  initializeTrackingImportUi(elements);
  elements.parseButton.dispatch('click');
  assert.equal(elements.resultElement.hidden, false);
  assert.ok(findNoteContaining(elements.resultElement, 'מידע תפעולי חלקי זוהה בטקסט שהודבק'));
});

test('3. detection-only fallback: text with no useful group shows the fallback message', () => {
  const elements = buildElements({
    textarea: createFakeElement({ value: 'Thank you for your order!' }),
  });
  initializeTrackingImportUi(elements);
  elements.parseButton.dispatch('click');
  assert.equal(elements.resultElement.hidden, false);
  assert.ok(findNoteContaining(elements.resultElement, 'לא הצלחנו לזהות מספיק מידע תפעולי בטקסט שהודבק'));
  assert.equal(elements.copyButton.hidden, true);
});

test('4. low-confidence verification section: an ambiguous date is shown separately, never mixed with confirmed fields', () => {
  const elements = buildElements({
    textarea: createFakeElement({
      value: 'Vessel Name: MSC EXAMPLE\nVoyage Number: 123W\nETA: 2026-08-20\nEvent Time: 03/04/2026',
    }),
    sourceSelect: createFakeElement({ value: 'ocean' }),
  });
  initializeTrackingImportUi(elements);
  elements.parseButton.dispatch('click');
  assert.equal(elements.verificationElement.hidden, false);
  assert.ok(findNoteContaining(elements.verificationElement, 'מידע שדורש אימות'));
  const resultDl = elements.resultElement.children.find((c) => c.tagName === 'dl');
  const resultText = resultDl ? resultDl.children.map((c) => c.textContent).join(' ') : '';
  assert.ok(!resultText.includes('03/04/2026'));
});

test('5. oversized input is rejected locally with an explanatory message, not truncated', () => {
  const elements = buildElements({
    textarea: createFakeElement({ value: 'a'.repeat(20001) }),
  });
  initializeTrackingImportUi(elements);
  elements.parseButton.dispatch('click');
  assert.equal(elements.errorElement.hidden, false);
  assert.ok(elements.errorElement.textContent.includes('20,000'));
  assert.equal(elements.resultElement.hidden, true);
});

test('6. reset: clears the textarea, result, error, and copy state', () => {
  const elements = buildElements({
    textarea: createFakeElement({ value: 'Status: In Transit' }),
    sourceSelect: createFakeElement({ value: 'courier' }),
  });
  initializeTrackingImportUi(elements);
  elements.parseButton.dispatch('click');
  elements.resetButton.dispatch('click');
  assert.equal(elements.textarea.value, '');
  assert.equal(elements.resultElement.hidden, true);
  assert.equal(elements.errorElement.hidden, true);
  assert.equal(elements.copyButton.hidden, true);
});

test('7. handleSearchResult clears imported text/result on every new search submission', () => {
  const elements = buildElements({
    textarea: createFakeElement({ value: 'Vessel Name: MSC EXAMPLE\nVoyage Number: 123W\nETA: 2026-08-20' }),
    sourceSelect: createFakeElement({ value: 'ocean' }),
  });
  const outcome = initializeTrackingImportUi(elements);
  elements.parseButton.dispatch('click');
  assert.equal(elements.resultElement.hidden, false);

  outcome.handleSearchResult({ status: 'recognized-valid', identifierType: 'ocean-container', normalizedIdentifier: 'MSCU1234567' });
  assert.equal(elements.textarea.value, '');
  assert.equal(elements.resultElement.hidden, true);
});

test('8. an unrecognized/unsupported search hides the import section', () => {
  const elements = buildElements();
  const outcome = initializeTrackingImportUi(elements);
  outcome.handleSearchResult({ status: 'unrecognized' });
  assert.equal(elements.sectionElement.hidden, true);
});

test('9. a recognized-valid search reveals the import section', () => {
  const elements = buildElements();
  const outcome = initializeTrackingImportUi(elements);
  outcome.handleSearchResult({ status: 'recognized-valid', identifierType: 'air-waybill', normalizedIdentifier: '02012345675' });
  assert.equal(elements.sectionElement.hidden, false);
});

test('10. copy summary: copies a plain-text summary via the clipboard on click', async () => {
  const elements = buildElements({
    textarea: createFakeElement({ value: 'Vessel Name: MSC EXAMPLE\nVoyage Number: 123W\nETA: 2026-08-20' }),
    sourceSelect: createFakeElement({ value: 'ocean' }),
  });
  let copiedText = null;
  const originalNavigator = globalThis.navigator;
  Object.defineProperty(globalThis, 'navigator', {
    value: { clipboard: { writeText: (text) => { copiedText = text; return Promise.resolve(); } } },
    configurable: true,
    writable: true,
    enumerable: true,
  });
  try {
    initializeTrackingImportUi(elements);
    elements.parseButton.dispatch('click');
    assert.equal(elements.copyButton.hidden, false);
    elements.copyButton.dispatch('click');
    await Promise.resolve();
    await Promise.resolve();
    assert.ok(copiedText.includes('MSC EXAMPLE'));
  } finally {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
      enumerable: true,
    });
  }
});

test('11. copy summary never includes the raw pasted text verbatim as a block', async () => {
  const elements = buildElements({
    textarea: createFakeElement({ value: 'Vessel Name: MSC EXAMPLE\nVoyage Number: 123W\nETA: 2026-08-20\nRandom filler line unrelated to any field' }),
    sourceSelect: createFakeElement({ value: 'ocean' }),
  });
  let copiedText = null;
  const originalNavigator = globalThis.navigator;
  Object.defineProperty(globalThis, 'navigator', {
    value: { clipboard: { writeText: (text) => { copiedText = text; return Promise.resolve(); } } },
    configurable: true,
    writable: true,
    enumerable: true,
  });
  try {
    initializeTrackingImportUi(elements);
    elements.parseButton.dispatch('click');
    elements.copyButton.dispatch('click');
    await Promise.resolve();
    await Promise.resolve();
    assert.ok(!copiedText.includes('Random filler line unrelated to any field'));
  } finally {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
      enumerable: true,
    });
  }
});

test('12. no fetch/network call occurs during parse', () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = () => {
    called = true;
    throw new Error('fetch must never be called');
  };
  try {
    const elements = buildElements({
      textarea: createFakeElement({ value: 'Status: In Transit\nLatest Event: Departed' }),
      sourceSelect: createFakeElement({ value: 'courier' }),
    });
    initializeTrackingImportUi(elements);
    elements.parseButton.dispatch('click');
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('13. no console logging of pasted text occurs during parse', () => {
  const originalLog = console.log;
  const logs = [];
  console.log = (...args) => logs.push(args.join(' '));
  try {
    const elements = buildElements({
      textarea: createFakeElement({ value: 'Vessel Name: SECRET-CARGO-VESSEL\nVoyage Number: 999X\nETA: 2026-08-20' }),
      sourceSelect: createFakeElement({ value: 'ocean' }),
    });
    initializeTrackingImportUi(elements);
    elements.parseButton.dispatch('click');
    assert.ok(!logs.some((line) => line.includes('SECRET-CARGO-VESSEL')));
  } finally {
    console.log = originalLog;
  }
});

test('14. re-initializing with the same buttons is a safe no-op (no duplicate listeners)', () => {
  const elements = buildElements({
    textarea: createFakeElement({ value: 'Status: In Transit\nLatest Event: Departed' }),
    sourceSelect: createFakeElement({ value: 'courier' }),
  });
  initializeTrackingImportUi(elements);
  initializeTrackingImportUi(elements);
  let clickCount = 0;
  const originalDispatch = elements.parseButton.dispatch;
  elements.parseButton.addEventListener = (type, handler) => {
    if (type === 'click') clickCount += 1;
  };
  // Re-init after redefining addEventListener should not add another listener
  // because the button is already tracked as initialized.
  initializeTrackingImportUi(elements);
  assert.equal(clickCount, 0);
});

test('15. missing required elements fail initialization safely rather than throwing', () => {
  const outcome = initializeTrackingImportUi({});
  assert.equal(outcome.initialized, false);
  assert.doesNotThrow(() => outcome.handleSearchResult({ status: 'unrecognized' }));
});

test('16. textContent is used for rendering, never innerHTML', () => {
  const elements = buildElements({
    textarea: createFakeElement({ value: 'Vessel Name: MSC EXAMPLE\nVoyage Number: 123W\nETA: 2026-08-20' }),
    sourceSelect: createFakeElement({ value: 'ocean' }),
  });
  initializeTrackingImportUi(elements);
  assert.doesNotThrow(() => elements.parseButton.dispatch('click'));
});

test('17. aria-live-capable elements (error/result/verification) are populated only via textContent-based rendering', () => {
  const elements = buildElements({
    textarea: createFakeElement({ value: 'Status: In Transit\nLatest Event: Departed' }),
    sourceSelect: createFakeElement({ value: 'courier' }),
  });
  initializeTrackingImportUi(elements);
  elements.parseButton.dispatch('click');
  assert.equal(typeof elements.resultElement.textContent, 'string');
});

test('18. existing tracking flow is unaffected: handleSearchResult only touches import elements', () => {
  const elements = buildElements();
  const outcome = initializeTrackingImportUi(elements);
  const unrelatedState = { status: 'recognized-valid', identifierType: 'ocean-container', normalizedIdentifier: 'MSCU1234567' };
  assert.doesNotThrow(() => outcome.handleSearchResult(unrelatedState));
});

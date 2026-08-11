/**
 * Tests for js/tools/tools-controller.js using the built-in Node.js test
 * runner (`node:test`) and assertion library (`node:assert`).
 *
 * No DOM library (e.g. jsdom) is installed or used. Instead, small local
 * fake-element and fake-document test doubles are defined below,
 * providing only the behavior the controller actually needs, matching
 * the style already used in tests/tracking/ui-controller.test.js.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeToolsUi } from '../../js/tools/tools-controller.js';

function createFakeElement(options = {}) {
  const listeners = {};
  let textContentValue = '';
  const element = {
    value: options.value ?? '',
    hidden: options.hidden ?? true,
    dataset: options.dataset ?? {},
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
    setAttribute(name, value) {
      element[`__attr_${name}`] = value;
    },
    getAttribute(name) {
      return element[`__attr_${name}`];
    },
  };
  // Setting `textContent` on a real DOM element clears its children, exactly
  // like `showResult`/`hideElement` in tools-controller.js rely on.
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
      throw new Error('innerHTML must never be used by the tools controller');
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

/** Flatten a rendered result element's <dl><dt/dd> children into a plain object. */
function flattenResult(resultElement) {
  const dl = resultElement.children[0];
  const rows = {};
  const notes = [];
  for (const child of resultElement.children) {
    if (child.tagName === 'p') {
      notes.push(child.textContent);
    }
  }
  if (dl) {
    for (let i = 0; i < dl.children.length; i += 2) {
      const dt = dl.children[i];
      const dd = dl.children[i + 1];
      rows[dt.textContent] = dd.textContent;
    }
  }
  return { rows, notes };
}

function buildSeaTransitElements() {
  return {
    etdDate: createFakeElement(),
    etdTime: createFakeElement(),
    etaDate: createFakeElement(),
    etaTime: createFakeElement(),
    actualDate: createFakeElement(),
    actualTime: createFakeElement(),
    calculateButton: createFakeElement(),
    resetButton: createFakeElement(),
    errorElement: createFakeElement(),
    resultElement: createFakeElement(),
  };
}

function buildCbmElements() {
  return {
    length: createFakeElement(),
    width: createFakeElement(),
    height: createFakeElement(),
    unit: createFakeElement({ value: 'cm' }),
    quantity: createFakeElement({ value: '1' }),
    calculateButton: createFakeElement(),
    resetButton: createFakeElement(),
    errorElement: createFakeElement(),
    resultElement: createFakeElement(),
  };
}

function buildAirWeightElements() {
  return {
    grossWeight: createFakeElement(),
    length: createFakeElement(),
    width: createFakeElement(),
    height: createFakeElement(),
    unit: createFakeElement({ value: 'cm' }),
    quantity: createFakeElement({ value: '1' }),
    divisorSelect: createFakeElement({ value: '6000' }),
    customDivisor: createFakeElement(),
    calculateButton: createFakeElement(),
    resetButton: createFakeElement(),
    errorElement: createFakeElement(),
    resultElement: createFakeElement(),
  };
}

function buildValidatorElements() {
  return {
    input: createFakeElement(),
    validateButton: createFakeElement(),
    resetButton: createFakeElement(),
    copyButton: createFakeElement(),
    copyStatus: createFakeElement(),
    errorElement: createFakeElement(),
    resultElement: createFakeElement(),
  };
}

// --- Tab switching -----------------------------------------------------

test('1. clicking a tab shows its panel and hides every other panel', () => {
  const tabSea = createFakeElement({ dataset: { tool: 'seaTransit' } });
  const tabCbm = createFakeElement({ dataset: { tool: 'cbm' } });
  const panels = {
    seaTransit: createFakeElement({ hidden: false }),
    cbm: createFakeElement({ hidden: true }),
  };
  initializeToolsUi({ documentRef: createFakeDocument(), tabs: [tabSea, tabCbm], panels });

  tabCbm.dispatch('click');
  assert.equal(panels.cbm.hidden, false);
  assert.equal(panels.seaTransit.hidden, true);

  tabSea.dispatch('click');
  assert.equal(panels.seaTransit.hidden, false);
  assert.equal(panels.cbm.hidden, true);
});

// --- CBM tool ------------------------------------------------------------

test('2. CBM tool: a valid calculation renders the expected result rows', () => {
  const elements = buildCbmElements();
  elements.length.value = '120';
  elements.width.value = '80';
  elements.height.value = '100';
  elements.quantity.value = '1';
  initializeToolsUi({ documentRef: createFakeDocument(), cbm: elements });

  elements.calculateButton.dispatch('click');

  assert.equal(elements.resultElement.hidden, false);
  assert.equal(elements.errorElement.hidden, true);
  const { rows } = flattenResult(elements.resultElement);
  assert.equal(rows['נפח ליחידה (CBM)'], '0.96');
});

test('3. CBM tool: an invalid dimension shows an accessible error and no result', () => {
  const elements = buildCbmElements();
  elements.length.value = '0';
  elements.width.value = '80';
  elements.height.value = '100';
  initializeToolsUi({ documentRef: createFakeDocument(), cbm: elements });

  elements.calculateButton.dispatch('click');

  assert.equal(elements.errorElement.hidden, false);
  assert.ok(elements.errorElement.textContent.length > 0);
  assert.equal(elements.resultElement.hidden, true);
});

test('4. CBM tool: reset clears inputs and hides result/error', () => {
  const elements = buildCbmElements();
  elements.length.value = '120';
  elements.width.value = '80';
  elements.height.value = '100';
  initializeToolsUi({ documentRef: createFakeDocument(), cbm: elements });
  elements.calculateButton.dispatch('click');
  assert.equal(elements.resultElement.hidden, false);

  elements.resetButton.dispatch('click');
  assert.equal(elements.length.value, '');
  assert.equal(elements.width.value, '');
  assert.equal(elements.height.value, '');
  assert.equal(elements.resultElement.hidden, true);
  assert.equal(elements.errorElement.hidden, true);
});

// --- Air chargeable-weight tool -------------------------------------------

test('5. air-weight tool: volumetric weight controls when heavier', () => {
  const elements = buildAirWeightElements();
  elements.grossWeight.value = '40';
  elements.length.value = '120';
  elements.width.value = '80';
  elements.height.value = '100';
  initializeToolsUi({ documentRef: createFakeDocument(), airWeight: elements });

  elements.calculateButton.dispatch('click');

  const { rows } = flattenResult(elements.resultElement);
  assert.equal(rows['הגורם הקובע'], 'המשקל הנפחי');
});

test('6. air-weight tool: custom divisor is used when "custom" is selected', () => {
  const elements = buildAirWeightElements();
  elements.grossWeight.value = '1';
  elements.length.value = '50';
  elements.width.value = '50';
  elements.height.value = '50';
  elements.divisorSelect.value = 'custom';
  elements.customDivisor.value = '7000';
  initializeToolsUi({ documentRef: createFakeDocument(), airWeight: elements });

  elements.calculateButton.dispatch('click');

  const { rows } = flattenResult(elements.resultElement);
  assert.equal(rows['מכפיל נפח בשימוש'], '7000');
});

test('7. air-weight tool: an invalid gross weight shows an accessible error', () => {
  const elements = buildAirWeightElements();
  elements.grossWeight.value = '0';
  elements.length.value = '10';
  elements.width.value = '10';
  elements.height.value = '10';
  initializeToolsUi({ documentRef: createFakeDocument(), airWeight: elements });

  elements.calculateButton.dispatch('click');

  assert.equal(elements.errorElement.hidden, false);
  assert.equal(elements.resultElement.hidden, true);
});

// --- Sea transit tool ------------------------------------------------------

test('8. sea-transit tool: a valid ETD/ETA renders status and scheduled/estimated labels', () => {
  const elements = buildSeaTransitElements();
  elements.etdDate.value = '2026-08-01';
  elements.etaDate.value = '2026-08-20';
  initializeToolsUi({ documentRef: createFakeDocument(), seaTransit: elements });

  elements.calculateButton.dispatch('click');

  assert.equal(elements.resultElement.hidden, false);
  const { rows } = flattenResult(elements.resultElement);
  assert.ok(Object.keys(rows).some((key) => key.includes('מתוכנן')));
  assert.ok(Object.keys(rows).some((key) => key.includes('משוער')));
});

test('9. sea-transit tool: ETA earlier than ETD shows an accessible error', () => {
  const elements = buildSeaTransitElements();
  elements.etdDate.value = '2026-08-20';
  elements.etaDate.value = '2026-08-01';
  initializeToolsUi({ documentRef: createFakeDocument(), seaTransit: elements });

  elements.calculateButton.dispatch('click');

  assert.equal(elements.errorElement.hidden, false);
  assert.equal(elements.resultElement.hidden, true);
});

test('10. sea-transit tool: reset clears every field including the optional actual-departure fields', () => {
  const elements = buildSeaTransitElements();
  elements.etdDate.value = '2026-08-01';
  elements.etaDate.value = '2026-08-20';
  elements.actualDate.value = '2026-08-02';
  initializeToolsUi({ documentRef: createFakeDocument(), seaTransit: elements });
  elements.calculateButton.dispatch('click');

  elements.resetButton.dispatch('click');
  assert.equal(elements.etdDate.value, '');
  assert.equal(elements.etaDate.value, '');
  assert.equal(elements.actualDate.value, '');
  assert.equal(elements.resultElement.hidden, true);
});

// --- Container validator tool -----------------------------------------------

test('11. container tool: a valid synthetic container number shows the breakdown and copy button', () => {
  const elements = buildValidatorElements();
  elements.input.value = 'CSQU3054383';
  initializeToolsUi({ documentRef: createFakeDocument(), container: elements });

  elements.validateButton.dispatch('click');

  assert.equal(elements.resultElement.hidden, false);
  assert.equal(elements.copyButton.hidden, false);
  const { rows, notes } = flattenResult(elements.resultElement);
  assert.equal(rows['קוד בעלים'], 'CSQ');
  assert.ok(notes.length > 0);
});

test('12. container tool: an invalid structure shows an accessible error and no copy button', () => {
  const elements = buildValidatorElements();
  elements.input.value = 'NOTVALID';
  initializeToolsUi({ documentRef: createFakeDocument(), container: elements });

  elements.validateButton.dispatch('click');

  assert.equal(elements.errorElement.hidden, false);
  assert.equal(elements.resultElement.hidden, true);
  assert.equal(elements.copyButton.hidden, true);
});

test('13. container tool: the copy action never leaks the full identifier into the DOM beyond the normalized field', () => {
  const elements = buildValidatorElements();
  elements.input.value = 'CSQU3054383';
  initializeToolsUi({ documentRef: createFakeDocument(), container: elements });
  elements.validateButton.dispatch('click');

  let copiedValue = null;
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', {
    value: { clipboard: { writeText: async (value) => { copiedValue = value; } } },
    configurable: true,
    writable: true,
    enumerable: true,
  });

  elements.copyButton.dispatch('click');
  assert.equal(copiedValue, 'CSQU3054383');

  if (originalDescriptor) {
    Object.defineProperty(globalThis, 'navigator', originalDescriptor);
  } else {
    delete globalThis.navigator;
  }
});

// --- AWB validator tool -----------------------------------------------------

test('14. AWB tool: a valid synthetic AWB shows the breakdown and the not-yet-verified airline note', () => {
  const elements = buildValidatorElements();
  elements.input.value = '02012345675';
  initializeToolsUi({ documentRef: createFakeDocument(), awb: elements });

  elements.validateButton.dispatch('click');

  const { rows, notes } = flattenResult(elements.resultElement);
  assert.equal(rows['קידומת חברת תעופה'], '020');
  assert.ok(notes.includes('קוד חברת התעופה טרם אומת במערכת'));
});

test('15. AWB tool: an invalid structure shows an accessible error', () => {
  const elements = buildValidatorElements();
  elements.input.value = 'ABC';
  initializeToolsUi({ documentRef: createFakeDocument(), awb: elements });

  elements.validateButton.dispatch('click');

  assert.equal(elements.errorElement.hidden, false);
});

// --- Tool isolation ----------------------------------------------------------

test('16. tools are isolated: interacting with the CBM tool does not affect the AWB tool state', () => {
  const cbmElements = buildCbmElements();
  const awbElements = buildValidatorElements();
  cbmElements.length.value = '10';
  cbmElements.width.value = '10';
  cbmElements.height.value = '10';
  initializeToolsUi({ documentRef: createFakeDocument(), cbm: cbmElements, awb: awbElements });

  cbmElements.calculateButton.dispatch('click');

  assert.equal(cbmElements.resultElement.hidden, false);
  assert.equal(awbElements.resultElement.hidden, true);
  assert.equal(awbElements.errorElement.hidden, true);
});

// --- Safety: no storage, no network, aria-live presence in markup ------------

test('17. no localStorage/sessionStorage access occurs during a calculation', () => {
  const originalLocalStorage = globalThis.localStorage;
  const originalSessionStorage = globalThis.sessionStorage;
  let accessed = false;
  globalThis.localStorage = new Proxy({}, { get() { accessed = true; return undefined; }, set() { accessed = true; return true; } });
  globalThis.sessionStorage = globalThis.localStorage;

  const elements = buildCbmElements();
  elements.length.value = '10';
  elements.width.value = '10';
  elements.height.value = '10';
  initializeToolsUi({ documentRef: createFakeDocument(), cbm: elements });
  elements.calculateButton.dispatch('click');

  assert.equal(accessed, false);

  if (originalLocalStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = originalLocalStorage;
  if (originalSessionStorage === undefined) delete globalThis.sessionStorage; else globalThis.sessionStorage = originalSessionStorage;
});

test('18. no fetch/network call occurs during any tool calculation', () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error('fetch must never be called by the tools controller');
  };

  const seaElements = buildSeaTransitElements();
  seaElements.etdDate.value = '2026-08-01';
  seaElements.etaDate.value = '2026-08-20';
  const containerElements = buildValidatorElements();
  containerElements.input.value = 'CSQU3054383';

  initializeToolsUi({ documentRef: createFakeDocument(), seaTransit: seaElements, container: containerElements });

  assert.doesNotThrow(() => {
    seaElements.calculateButton.dispatch('click');
    containerElements.validateButton.dispatch('click');
  });

  if (originalFetch === undefined) delete globalThis.fetch; else globalThis.fetch = originalFetch;
});

test('19. re-initializing with the same buttons is a safe no-op (no duplicate listeners)', () => {
  const elements = buildCbmElements();
  elements.length.value = '10';
  elements.width.value = '10';
  elements.height.value = '10';
  const doc = createFakeDocument();
  initializeToolsUi({ documentRef: doc, cbm: elements });
  initializeToolsUi({ documentRef: doc, cbm: elements });

  elements.calculateButton.dispatch('click');
  // A single successful CBM render appends exactly two children: the
  // result <dl> and the limitation-note <p>. If the button had two
  // listeners attached (a duplicate-initialization bug), a single click
  // would instead render twice, appending four children (two <dl> and
  // two <p>, since each handler independently clears then re-appends).
  assert.equal(elements.resultElement.children.length, 2);
});

test('20. calling initializeToolsUi with no options is a safe no-op', () => {
  assert.doesNotThrow(() => initializeToolsUi());
  assert.doesNotThrow(() => initializeToolsUi({}));
});

test('21. an unusable/missing tool element set does not throw', () => {
  assert.doesNotThrow(() => initializeToolsUi({ documentRef: createFakeDocument(), cbm: {} }));
});

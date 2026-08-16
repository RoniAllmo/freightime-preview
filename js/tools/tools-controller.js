/**
 * User-interface controller for FreighTime's logistics Operations
 * Toolkit (`OPERATIONS_TOOLKIT_V1.md`).
 *
 * Responsibility: bind to explicitly supplied DOM elements for the tab
 * bar and each retained tool panel (CBM, air-freight chargeable weight),
 * read form values on an explicit "calculate" button click (never
 * automatically, never on page load, never reloading the page), call the
 * corresponding pure calculation module, and render the result using
 * `textContent` only (never `innerHTML`).
 *
 * The sea transit-time calculator, the standalone container-number
 * validator tool, and the standalone AWB validator tool were removed by
 * earlier product-owner correction (see `PRODUCT_READINESS_V1.md`). The
 * public tracking/identifier-validation utility itself (container, AWB,
 * postal, courier detection) was later removed in full -- FreighTime does
 * not return real operational tracking data, so a validate-only utility
 * was not valuable enough to keep public. Only the CBM and air-freight
 * chargeable-weight calculators remain.
 *
 * This module performs no network request, no storage access
 * (`localStorage`/`sessionStorage`/cookies/`IndexedDB`), no analytics,
 * and no logging of user-entered values -- calculator inputs are read
 * only into local JavaScript variables for the duration of a single
 * calculation and are never written to the URL, to any browser storage,
 * or to the console. Every tool's inputs, results, and reset behavior
 * are fully independent of each other.
 *
 * Elements are supplied explicitly by the caller (see index.html's
 * module script) rather than queried automatically by this module, and
 * importing this module has no side effects -- no DOM access occurs
 * until `initializeToolsUi` is called.
 */

import { calculateCbm } from './cbm-calculator.js';
import { calculateChargeableWeight, DEFAULT_DIVISOR } from './air-chargeable-weight-calculator.js';

/** Buttons that already have a click listener attached, to prevent duplicate initialization. */
const initializedButtons = new WeakSet();

/**
 * Check whether a value looks like a usable DOM-element-like object
 * exposing the given method names, without assuming any specific DOM
 * implementation.
 *
 * @param {*} value
 * @param {ReadonlyArray<string>} methodNames
 * @returns {boolean}
 */
function isUsableElement(value, methodNames) {
  if (value === null || value === undefined || typeof value !== 'object') {
    return false;
  }
  return methodNames.every((name) => typeof value[name] === 'function');
}

function isSettableElement(value) {
  return value !== null && value !== undefined && typeof value === 'object';
}

/** Read a numeric field's current value as a `number`, or `NaN` if empty/unusable. */
function readNumber(input) {
  if (!isSettableElement(input) || typeof input.value !== 'string') {
    return NaN;
  }
  if (input.value.trim() === '') {
    return NaN;
  }
  return Number(input.value);
}

function readString(input) {
  if (!isSettableElement(input) || typeof input.value !== 'string') {
    return '';
  }
  return input.value;
}

function clearField(input) {
  if (isSettableElement(input)) {
    input.value = '';
  }
}

function hideElement(element) {
  if (isSettableElement(element)) {
    element.hidden = true;
    element.textContent = '';
  }
}

function showError(element, message) {
  if (isSettableElement(element)) {
    element.textContent = message;
    element.hidden = false;
  }
}

/** Append a `<dt>`/`<dd>` pair to a result `<dl>`-shaped container using only `textContent`. */
function appendResultRow(resultElement, doc, label, value) {
  if (!isUsableElement(resultElement, ['appendChild']) || typeof doc?.createElement !== 'function') {
    return;
  }
  const dt = doc.createElement('dt');
  dt.textContent = label;
  const dd = doc.createElement('dd');
  dd.textContent = value;
  resultElement.appendChild(dt);
  resultElement.appendChild(dd);
}

function showResult(resultElement, doc, rows) {
  if (!isSettableElement(resultElement)) {
    return;
  }
  resultElement.textContent = '';
  if (typeof resultElement.appendChild === 'function' && typeof doc?.createElement === 'function') {
    const dl = doc.createElement('dl');
    for (const [label, value] of rows) {
      appendResultRow(dl, doc, label, value);
    }
    resultElement.appendChild(dl);
  } else {
    // Minimal fallback for a plain test double without appendChild/createElement.
    resultElement.textContent = rows.map(([label, value]) => `${label}: ${value}`).join(' | ');
  }
  resultElement.hidden = false;
}

const ERROR_MESSAGES = Object.freeze({
  invalid_input: 'לא ניתן לבצע את החישוב עם הנתונים שהוזנו.',
  invalid_unit: 'יש לבחור יחידת מידה תקינה.',
  invalid_dimensions: 'המידות חייבות להיות מספרים חיוביים.',
  invalid_quantity: 'מספר היחידות חייב להיות מספר שלם חיובי.',
  invalid_gross_weight: 'המשקל בפועל חייב להיות מספר חיובי.',
  invalid_divisor: 'מכפיל הנפח חייב להיות מספר חיובי תקין.',
  dimension_too_large: 'אחת המידות שהוזנו גדולה באופן לא סביר.',
  quantity_too_large: 'מספר היחידות שהוזן גדול באופן לא סביר.',
});

function resolveErrorMessage(errorCode) {
  return ERROR_MESSAGES[errorCode] ?? 'לא ניתן לבצע את הבדיקה עם הנתונים שהוזנו.';
}

// --- Tab switching -----------------------------------------------------

/**
 * Wire the tool tab bar: clicking a tab shows its panel and hides every
 * other panel, updating `aria-selected` and `hidden` accordingly. Safe
 * no-op if `tabs` or `panels` is not usable.
 *
 * @param {*} tabs - An array/NodeList-like collection of tab button
 *   elements, each exposing `dataset.tool` (or `getAttribute('data-tool')`)
 *   and `addEventListener`.
 * @param {Object<string, object>} panels - A map from tool key to panel
 *   element.
 */
function initializeTabs(tabs, panels) {
  if (!tabs || typeof tabs.forEach !== 'function') {
    return;
  }
  const tabList = Array.from(tabs);
  for (const tab of tabList) {
    if (!isUsableElement(tab, ['addEventListener']) || initializedButtons.has(tab)) {
      continue;
    }
    tab.addEventListener('click', () => {
      const selectedKey = tab.dataset ? tab.dataset.tool : tab.getAttribute?.('data-tool');
      for (const otherTab of tabList) {
        const key = otherTab.dataset ? otherTab.dataset.tool : otherTab.getAttribute?.('data-tool');
        if (isSettableElement(otherTab)) {
          otherTab.setAttribute?.('aria-selected', String(key === selectedKey));
        }
      }
      for (const [key, panel] of Object.entries(panels)) {
        if (isSettableElement(panel)) {
          panel.hidden = key !== selectedKey;
        }
      }
    });
    initializedButtons.add(tab);
  }
}

// --- Tool 1: CBM calculator ----------------------------------------------

function initializeCbmTool(elements) {
  const { length, width, height, unit, quantity, calculateButton, resetButton, errorElement, resultElement } = elements;
  if (!isUsableElement(calculateButton, ['addEventListener']) || initializedButtons.has(calculateButton)) {
    return;
  }
  const doc = elements.documentRef;

  calculateButton.addEventListener('click', () => {
    hideElement(errorElement);
    hideElement(resultElement);

    const result = calculateCbm({
      length: readNumber(length),
      width: readNumber(width),
      height: readNumber(height),
      unit: readString(unit),
      quantity: readNumber(quantity),
    });

    if (!result.valid) {
      showError(errorElement, resolveErrorMessage(result.error));
      return;
    }

    showResult(resultElement, doc, [
      ['נפח ליחידה (CBM)', result.cbmPerPackageRounded.toString()],
      ['נפח כולל (CBM)', result.totalCbmRounded.toString()],
      ['מספר יחידות', result.packageCount.toString()],
    ]);
    if (isSettableElement(resultElement) && doc?.createElement) {
      const note = doc.createElement('p');
      note.className = 'tool-note';
      note.textContent = result.limitationNote;
      resultElement.appendChild(note);
    }
  });

  if (isUsableElement(resetButton, ['addEventListener'])) {
    resetButton.addEventListener('click', () => {
      for (const field of [length, width, height, quantity]) {
        clearField(field);
      }
      hideElement(errorElement);
      hideElement(resultElement);
    });
  }

  initializedButtons.add(calculateButton);
}

// --- Tool 2: air-freight chargeable-weight calculator --------------------

function resolveDivisor(divisorSelect, customDivisorInput) {
  const selected = readString(divisorSelect);
  if (selected === 'custom') {
    return readNumber(customDivisorInput);
  }
  if (selected === '') {
    return DEFAULT_DIVISOR;
  }
  return Number(selected);
}

function initializeAirWeightTool(elements) {
  const {
    grossWeight,
    length,
    width,
    height,
    unit,
    quantity,
    divisorSelect,
    customDivisor,
    calculateButton,
    resetButton,
    errorElement,
    resultElement,
  } = elements;
  if (!isUsableElement(calculateButton, ['addEventListener']) || initializedButtons.has(calculateButton)) {
    return;
  }
  const doc = elements.documentRef;

  const CONTROLLING_FACTOR_LABELS = Object.freeze({
    actual: 'המשקל בפועל',
    volumetric: 'המשקל הנפחי',
    equal: 'המשקל בפועל והמשקל הנפחי (שווים)',
  });

  calculateButton.addEventListener('click', () => {
    hideElement(errorElement);
    hideElement(resultElement);

    const result = calculateChargeableWeight({
      grossWeightKg: readNumber(grossWeight),
      length: readNumber(length),
      width: readNumber(width),
      height: readNumber(height),
      unit: readString(unit),
      quantity: readNumber(quantity),
      divisor: resolveDivisor(divisorSelect, customDivisor),
    });

    if (!result.valid) {
      showError(errorElement, resolveErrorMessage(result.error));
      return;
    }

    showResult(resultElement, doc, [
      ['משקל בפועל', `${result.grossWeightKg} ק"ג`],
      ['משקל נפחי', `${result.volumetricWeightKgRounded} ק"ג`],
      ['משקל לחיוב (מדויק)', `${result.chargeableWeightKg.toFixed(2)} ק"ג`],
      ['משקל לחיוב (עיגול מקובל)', `${result.chargeableWeightKgPracticalRounded} ק"ג`],
      ['הגורם הקובע', CONTROLLING_FACTOR_LABELS[result.controllingFactor]],
      ['מכפיל נפח בשימוש', result.divisorUsed.toString()],
    ]);
    if (isSettableElement(resultElement) && doc?.createElement) {
      const note = doc.createElement('p');
      note.className = 'tool-note';
      note.textContent = result.limitationNote;
      resultElement.appendChild(note);
    }
  });

  if (isUsableElement(resetButton, ['addEventListener'])) {
    resetButton.addEventListener('click', () => {
      for (const field of [grossWeight, length, width, height, quantity, customDivisor]) {
        clearField(field);
      }
      if (isSettableElement(divisorSelect)) {
        divisorSelect.value = '6000';
      }
      hideElement(errorElement);
      hideElement(resultElement);
    });
  }

  initializedButtons.add(calculateButton);
}

// --- Public entry point ---------------------------------------------------

/**
 * Initialize every tool in the Operations Toolkit by binding to
 * explicitly supplied elements. Performs no automatic DOM queries.
 * Re-initializing with the same buttons is a safe no-op.
 *
 * @param {object} options - See index.html's module script for the exact
 *   shape supplied. Every sub-object is independently optional; a
 *   missing tool's elements simply are not wired.
 */
export function initializeToolsUi(options) {
  const opts = options && typeof options === 'object' ? options : {};

  initializeTabs(opts.tabs, opts.panels ?? {});

  if (opts.cbm) {
    initializeCbmTool({ ...opts.cbm, documentRef: opts.documentRef });
  }
  if (opts.airWeight) {
    initializeAirWeightTool({ ...opts.airWeight, documentRef: opts.documentRef });
  }

  return Object.freeze({ initialized: true });
}

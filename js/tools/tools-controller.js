/**
 * User-interface controller for FreighTime's logistics Operations
 * Toolkit V1 (`OPERATIONS_TOOLKIT_V1.md`).
 *
 * Responsibility: bind to explicitly supplied DOM elements for the tab
 * bar and each of the five tool panels, read form values on an explicit
 * "calculate"/"validate" button click (never automatically, never on
 * page load, never reloading the page), call the corresponding pure
 * calculation module, and render the result using `textContent` only
 * (never `innerHTML`).
 *
 * This module performs no network request, no storage access
 * (`localStorage`/`sessionStorage`/cookies/`IndexedDB`), no analytics,
 * and no logging of user-entered values -- calculator inputs are read
 * only into local JavaScript variables for the duration of a single
 * calculation and are never written to the URL, to any browser storage,
 * or to the console. Every tool's inputs, results, and reset behavior
 * are fully independent of the primary tracking search
 * (`js/tracking/ui-controller.js`) and of the other four tools.
 *
 * Elements are supplied explicitly by the caller (see index.html's
 * module script) rather than queried automatically by this module, and
 * importing this module has no side effects -- no DOM access occurs
 * until `initializeToolsUi` is called.
 */

import { calculateSeaTransit } from './sea-transit-calculator.js';
import { calculateCbm } from './cbm-calculator.js';
import { calculateChargeableWeight, DEFAULT_DIVISOR } from './air-chargeable-weight-calculator.js';
import { validateContainerNumber } from './container-validator-tool.js';
import { validateAwbNumber } from './awb-validator-tool.js';

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
  invalid_etd: 'תאריך היציאה המתוכנן אינו תקין.',
  invalid_eta: 'תאריך ההגעה המשוער אינו תקין.',
  invalid_actual_departure: 'תאריך היציאה בפועל שהוזן אינו תקין.',
  eta_before_etd: 'תאריך ההגעה המשוער אינו יכול להיות מוקדם מתאריך היציאה המתוכנן.',
  empty_input: 'יש להזין מספר לבדיקה.',
  invalid_structure: 'המספר שהוזן אינו תואם את המבנה הנדרש.',
  invalid_check_digit: 'ספרת הביקורת אינה תקינה עבור מספר זה.',
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

// --- Tool 1: sea transit calculator -------------------------------------

const SEA_TRANSIT_TIME_TYPE_LABELS = Object.freeze({
  scheduled: 'מתוכנן',
  estimated: 'משוער',
  actual: 'בפועל',
  calculated: 'מחושב',
});

function formatDateTime(dateTime, timeSupplied) {
  const datePart = dateTime.toLocaleDateString('he-IL');
  if (!timeSupplied) {
    return `${datePart} (ללא שעה - מחושב מ-00:00)`;
  }
  const timePart = dateTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  return `${datePart} ${timePart}`;
}

function formatDays(days) {
  return `${days.toFixed(1)} ימים`;
}

function initializeSeaTransitTool(elements) {
  const {
    etdDate,
    etdTime,
    etaDate,
    etaTime,
    actualDate,
    actualTime,
    calculateButton,
    resetButton,
    errorElement,
    resultElement,
  } = elements;

  if (!isUsableElement(calculateButton, ['addEventListener']) || initializedButtons.has(calculateButton)) {
    return;
  }

  const doc = elements.documentRef;

  calculateButton.addEventListener('click', () => {
    hideElement(errorElement);
    hideElement(resultElement);

    const result = calculateSeaTransit({
      etdDate: readString(etdDate) || undefined,
      etdTime: readString(etdTime) || null,
      etaDate: readString(etaDate) || undefined,
      etaTime: readString(etaTime) || null,
      actualDepartureDate: readString(actualDate) || null,
      actualDepartureTime: readString(actualTime) || null,
    });

    if (!result.valid) {
      showError(errorElement, resolveErrorMessage(result.error));
      return;
    }

    const rows = [
      ['סטטוס', result.status],
      [
        `יציאה (${SEA_TRANSIT_TIME_TYPE_LABELS[result.etd.type]})`,
        formatDateTime(result.etd.dateTime, result.etd.timeSupplied),
      ],
      [
        `הגעה משוערת (${SEA_TRANSIT_TIME_TYPE_LABELS[result.eta.type]})`,
        formatDateTime(result.eta.dateTime, result.eta.timeSupplied),
      ],
    ];
    if (result.actualDeparture) {
      rows.push([
        'יציאה בפועל',
        formatDateTime(result.actualDeparture.dateTime, result.actualDeparture.timeSupplied),
      ]);
    }
    rows.push(['משך הפלגה מתוכנן', formatDays(result.plannedDuration.days)]);
    rows.push([
      `זמן שחלף מאז ${result.elapsedSinceBasis.basisType === 'actual' ? 'היציאה בפועל' : 'היציאה המתוכננת'}`,
      formatDays(result.elapsedSinceBasis.days),
    ]);
    rows.push(['זמן שנותר עד ה-ETA', formatDays(result.remainingUntilEta.days)]);
    if (result.percentElapsed !== null) {
      rows.push(['אחוז ההפלגה שחלף (מחושב)', `${result.percentElapsed.toFixed(0)}%`]);
    }

    showResult(resultElement, doc, rows);
    if (isSettableElement(resultElement)) {
      const note = doc?.createElement ? doc.createElement('p') : null;
      if (note) {
        note.className = 'tool-note';
        note.textContent = result.timezoneNote;
        resultElement.appendChild(note);
      }
    }
  });

  if (isUsableElement(resetButton, ['addEventListener'])) {
    resetButton.addEventListener('click', () => {
      for (const field of [etdDate, etdTime, etaDate, etaTime, actualDate, actualTime]) {
        clearField(field);
      }
      hideElement(errorElement);
      hideElement(resultElement);
    });
  }

  initializedButtons.add(calculateButton);
}

// --- Tool 2: CBM calculator ----------------------------------------------

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

// --- Tool 3: air-freight chargeable-weight calculator --------------------

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

// --- Tool 4 & 5 shared: container / AWB validator tools ------------------

function buildValidatorTool({ elements, validate, breakdownRows, disclosureNote, retainedKey }) {
  const { input, validateButton, resetButton, copyButton, copyStatus, errorElement, resultElement } = elements;
  if (!isUsableElement(validateButton, ['addEventListener']) || initializedButtons.has(validateButton)) {
    return;
  }
  const doc = elements.documentRef;

  validateButton.addEventListener('click', () => {
    hideElement(errorElement);
    hideElement(resultElement);
    hideElement(copyStatus);
    if (isSettableElement(copyButton)) {
      copyButton.hidden = true;
    }
    elements[retainedKey] = null;

    const result = validate(readString(input));

    if (result.structureValid === false) {
      showError(errorElement, resolveErrorMessage(result.error));
      return;
    }

    showResult(resultElement, doc, breakdownRows(result));

    if (isSettableElement(resultElement) && doc?.createElement) {
      const note = doc.createElement('p');
      note.className = 'tool-note';
      note.textContent = disclosureNote(result);
      resultElement.appendChild(note);
    }

    if (isUsableElement(copyButton, ['addEventListener']) && result.normalizedIdentifier) {
      copyButton.hidden = false;
      elements[retainedKey] = result.normalizedIdentifier;
    }
  });

  if (isUsableElement(resetButton, ['addEventListener'])) {
    resetButton.addEventListener('click', () => {
      clearField(input);
      hideElement(errorElement);
      hideElement(resultElement);
      hideElement(copyStatus);
      if (isSettableElement(copyButton)) {
        copyButton.hidden = true;
      }
      elements[retainedKey] = null;
    });
  }

  if (isUsableElement(copyButton, ['addEventListener'])) {
    copyButton.addEventListener('click', () => {
      const value = elements[retainedKey];
      if (!value || typeof navigator === 'undefined' || !navigator.clipboard) {
        showError(copyStatus, 'לא ניתן להעתיק כרגע. ניתן לסמן ולהעתיק ידנית.');
        if (isSettableElement(copyStatus)) copyStatus.hidden = false;
        return;
      }
      Promise.resolve(navigator.clipboard.writeText(value)).then(
        () => {
          if (isSettableElement(copyStatus)) {
            copyStatus.textContent = 'המספר המנורמל הועתק';
            copyStatus.hidden = false;
          }
        },
        () => {
          if (isSettableElement(copyStatus)) {
            copyStatus.textContent = 'לא ניתן היה להעתיק את המספר. ניתן לסמן ולהעתיק ידנית.';
            copyStatus.hidden = false;
          }
        },
      );
    });
  }

  initializedButtons.add(validateButton);
}

function initializeContainerTool(elements) {
  buildValidatorTool({
    elements,
    validate: validateContainerNumber,
    retainedKey: 'retainedContainerNumber',
    disclosureNote: (result) => result.carrierInferenceNote,
    breakdownRows: (result) => {
      const rows = [
        ['מספר מנורמל', result.normalizedIdentifier],
        ['תוצאה', result.valid ? 'תקין (מבנה וספרת ביקורת)' : 'לא תקין (ספרת ביקורת שגויה)'],
      ];
      if (result.structureValid) {
        rows.push(
          ['קוד בעלים', result.ownerCode],
          ['מזהה קטגוריית ציוד', result.equipmentCategoryIdentifier],
          ['מספר סידורי', result.serialNumber],
          ['ספרת ביקורת שסופקה', String(result.suppliedCheckDigit)],
          ['ספרת ביקורת מחושבת', String(result.calculatedCheckDigit)],
        );
      }
      return rows;
    },
  });
}

function initializeAwbTool(elements) {
  buildValidatorTool({
    elements,
    validate: validateAwbNumber,
    retainedKey: 'retainedAwbNumber',
    disclosureNote: (result) => result.airlinePrefixNote,
    breakdownRows: (result) => {
      const rows = [
        ['מספר מנורמל', result.normalizedIdentifier],
        ['תוצאה', result.valid ? 'תקין (מבנה וספרת ביקורת)' : 'לא תקין (ספרת ביקורת שגויה)'],
      ];
      if (result.structureValid) {
        rows.push(
          ['קידומת חברת תעופה', result.prefix],
          ['מספר סידורי', result.serialNumber],
          ['ספרת ביקורת שסופקה', String(result.suppliedCheckDigit)],
          ['ספרת ביקורת מחושבת', String(result.calculatedCheckDigit)],
        );
      }
      return rows;
    },
  });
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

  if (opts.seaTransit) {
    initializeSeaTransitTool({ ...opts.seaTransit, documentRef: opts.documentRef });
  }
  if (opts.cbm) {
    initializeCbmTool({ ...opts.cbm, documentRef: opts.documentRef });
  }
  if (opts.airWeight) {
    initializeAirWeightTool({ ...opts.airWeight, documentRef: opts.documentRef });
  }
  if (opts.container) {
    initializeContainerTool({ ...opts.container, documentRef: opts.documentRef });
  }
  if (opts.awb) {
    initializeAwbTool({ ...opts.awb, documentRef: opts.documentRef });
  }

  return Object.freeze({ initialized: true });
}

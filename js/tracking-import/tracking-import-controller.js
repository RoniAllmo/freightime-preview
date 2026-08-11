/**
 * User-interface controller for FreighTime's Smart Tracking Import V1
 * (user-mediated paste-and-parse tracking summary).
 *
 * Responsibility: bind to explicitly supplied DOM elements (the section
 * wrapper, the paste textarea, the source-type select, the parse/reset/
 * copy buttons, and the error/result/verification/copy-status elements),
 * read the pasted text only on an explicit "פענח מידע" click (never
 * automatically, never on paste, never on page load), call
 * `buildTrackingSummary` (a pure module), and render the result using
 * `textContent` only (never `innerHTML`).
 *
 * This module performs no network request, no storage access
 * (`localStorage`/`sessionStorage`/cookies/`IndexedDB`), no analytics,
 * and no logging of the pasted text or any extracted value -- the pasted
 * text is read only into a local JavaScript variable for the duration of
 * a single parse and is never written to the URL, browser storage, or
 * the console. The panel's own textarea and result are also cleared
 * whenever `handleSearchResult` is called (wired to every primary
 * tracking-search submission via `ui-controller.js`'s optional
 * `onResult` callback), so a stale paste from a previous, unrelated
 * search can never linger behind a new one.
 *
 * Elements are supplied explicitly by the caller (see index.html's
 * module script) rather than queried automatically by this module, and
 * importing this module has no side effects -- no DOM access occurs
 * until `initializeTrackingImportUi` is called.
 */

import { buildTrackingSummary } from './build-tracking-summary.js';
import { isEligibleForCopy } from '../tracking/ui-controller.js';
import { DEFAULT_VISIBLE_EVENTS } from './extract-events.js';

/** Buttons that already have a click listener attached, to prevent duplicate initialization. */
const initializedButtons = new WeakSet();

function isSettableElement(value) {
  return value !== null && value !== undefined && typeof value === 'object';
}

function isUsableElement(value, methodNames) {
  if (!isSettableElement(value)) {
    return false;
  }
  return methodNames.every((name) => typeof value[name] === 'function');
}

function readString(input) {
  if (!isSettableElement(input) || typeof input.value !== 'string') {
    return '';
  }
  return input.value;
}

function hideElement(element) {
  if (isSettableElement(element)) {
    element.hidden = true;
    element.textContent = '';
  }
}

function showMessage(element, message) {
  if (isSettableElement(element)) {
    element.textContent = message;
    element.hidden = false;
  }
}

const ERROR_MESSAGES = Object.freeze({
  empty_input: 'יש להדביק טקסט מעקב לפני הפענוח.',
  too_long: 'הטקסט שהודבק ארוך מדי (מעל 20,000 תווים). נא להדביק קטע ממוקד יותר מאתר המעקב הרשמי.',
});

function resolveErrorMessage(errorCode) {
  return ERROR_MESSAGES[errorCode] ?? 'לא ניתן היה לעבד את הטקסט שהודבק.';
}

const SEMANTIC_LABELS = Object.freeze({
  actual: 'בפועל',
  estimated: 'משוער',
  scheduled: 'מתוכנן',
  calculated: 'מחושב',
  unknown: 'לא ידוע',
});

const FIELD_LABELS = Object.freeze({
  status: 'סטטוס',
  vesselName: 'שם אונייה',
  voyageNumber: 'מספר הפלגה',
  portOfLoading: 'נמל טעינה',
  portOfDischarge: 'נמל פריקה',
  etd: 'יציאה מתוכננת (ETD)',
  actualDeparture: 'יציאה בפועל',
  eta: 'הגעה משוערת (ETA)',
  actualArrival: 'הגעה בפועל',
  flightNumber: 'מספר טיסה',
  origin: 'שדה מוצא',
  destination: 'שדה יעד',
  scheduledDeparture: 'יציאה מתוכננת',
  estimatedArrival: 'הגעה משוערת',
  currentStatus: 'סטטוס נוכחי',
  estimatedDelivery: 'מסירה משוערת',
  actualDelivery: 'נמסר',
  latestEvent: 'אירוע אחרון',
  latestEventTime: 'זמן האירוע',
  latestEventLocation: 'מיקום האירוע',
});

const MODE_LABELS = Object.freeze({
  ocean: 'מעקב ימי',
  air: 'מטען אווירי',
  courier: 'קורייר / דואר',
  unknown: 'לא זוהה סוג משלוח',
});

/** Field display priority per mode (rule 47) -- bare-minimum useful information first. */
const FIELD_ORDER_BY_MODE = Object.freeze({
  ocean: Object.freeze([
    'vesselName', 'voyageNumber',
    'eta', 'actualArrival',
    'etd', 'actualDeparture',
    'portOfLoading', 'portOfDischarge',
    'status', 'latestEvent', 'latestEventTime', 'latestEventLocation',
  ]),
  air: Object.freeze([
    'flightNumber',
    'origin', 'destination',
    'scheduledDeparture', 'actualDeparture', 'estimatedArrival', 'actualArrival',
    'latestEvent', 'latestEventTime', 'latestEventLocation',
  ]),
  courier: Object.freeze([
    'currentStatus',
    'estimatedDelivery', 'actualDelivery',
    'latestEvent', 'latestEventTime', 'latestEventLocation',
  ]),
});

function sortEntriesByMode(entries, detectedMode) {
  const order = FIELD_ORDER_BY_MODE[detectedMode];
  if (!order) {
    return entries;
  }
  return [...entries].sort((a, b) => {
    const ia = order.indexOf(a[0]);
    const ib = order.indexOf(b[0]);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

const PARTIAL_MESSAGE = 'מידע תפעולי חלקי זוהה בטקסט שהודבק';
const DETECTION_ONLY_MESSAGE = 'לא זוהה מספיק מידע להצגת תקציר תפעולי';
const OPERATIONAL_SUMMARY_HEADING = 'תקציר תפעולי';
const RECENT_EVENTS_HEADING = 'אירועים אחרונים';
const PARSING_LIMITATIONS_HEADING = 'מגבלות הפענוח';
const VERIFICATION_HEADING = 'מידע שדורש אימות';
const NO_GROUP_RECOMMENDATION = 'מומלץ להעתיק את כל קטע התוצאה הגלוי מאתר המעקב הרשמי ולהדביק אותו כאן.';
const SOURCE_ORDER_NOTE = 'סדר האירועים נשמר כפי שהודבק. הכרונולוגיה אינה חד-משמעית ודורשת אימות מול המקור הרשמי.';
const CONFLICT_MESSAGE = 'נמצאו מספר ערכים ויש לאמת את הנתון';

/**
 * Fields that carry an actual date/time semantic (scheduled/estimated/
 * actual/unknown-date). A semantic badge is only meaningful for these --
 * appending "(לא ידוע)" next to a confidently-read vessel name or status
 * string would misleadingly suggest the *value* itself is unknown, when
 * only "does a date semantic apply" is unknown (it does not, because the
 * field isn't a date at all).
 */
const TIME_SEMANTIC_FIELDS = Object.freeze(
  new Set([
    'etd',
    'actualDeparture',
    'eta',
    'actualArrival',
    'scheduledDeparture',
    'estimatedArrival',
    'latestEventTime',
    'estimatedDelivery',
    'actualDelivery',
  ]),
);

function formatFieldValue(field) {
  if (field.timeText) {
    return `${field.value} ${field.timeText}${field.timezoneText ? ' ' + field.timezoneText : ''}`;
  }
  return field.value;
}

/** Mark an element's text direction as automatic (rule 68), if the element supports it -- never changes the page's own primary RTL direction. */
function setDirAuto(element) {
  if (isSettableElement(element) && typeof element.setAttribute === 'function') {
    element.setAttribute('dir', 'auto');
  }
}

/** Append a `<dt>`/`<dd>` row (label, value, and -- for date/time fields only -- a semantic badge) to a result `<dl>`, using `textContent` only. */
function appendFieldRow(dl, doc, name, field) {
  const dt = doc.createElement('dt');
  dt.textContent = FIELD_LABELS[name] ?? name;
  const dd = doc.createElement('dd');
  setDirAuto(dd);
  if (TIME_SEMANTIC_FIELDS.has(name)) {
    const semanticLabel = SEMANTIC_LABELS[field.semantic] ?? SEMANTIC_LABELS.unknown;
    dd.textContent = `${formatFieldValue(field)} (${semanticLabel})`;
  } else {
    dd.textContent = formatFieldValue(field);
  }
  dl.appendChild(dt);
  dl.appendChild(dd);
}

/**
 * Build the plain-text, customer-facing copy-summary content (rule 55)
 * from confirmed (non-low-confidence, non-conflicted) fields only --
 * never the raw pasted text, never a full identifier, never internal
 * evidence/diagnostics, and never a low-confidence or conflicted value.
 * Only fields actually present are included; no empty labels are ever
 * emitted (rule 56).
 *
 * @param {Readonly<object>} summary - A valid `buildTrackingSummary` result.
 * @returns {string}
 */
function buildCopyText(summary) {
  const order = FIELD_ORDER_BY_MODE[summary.detectedMode];
  const orderedNames = order ?? Object.keys(summary.fields);

  const fieldLines = [];
  for (const name of orderedNames) {
    const field = summary.fields[name];
    if (!field || field.confidence === 'low' || field.conflict) {
      continue;
    }
    const label = FIELD_LABELS[name] ?? name;
    if (TIME_SEMANTIC_FIELDS.has(name)) {
      const semanticLabel = SEMANTIC_LABELS[field.semantic] ?? SEMANTIC_LABELS.unknown;
      fieldLines.push(`${label}: ${formatFieldValue(field)} (${semanticLabel})`);
    } else {
      fieldLines.push(`${label}: ${formatFieldValue(field)}`);
    }
  }

  if (fieldLines.length === 0) {
    return '';
  }

  const importedDate = new Date(summary.importedAt);
  const importedText = Number.isNaN(importedDate.getTime()) ? summary.importedAt : importedDate.toLocaleString('he-IL');

  const parts = [
    'תקציר מעקב FreighTime',
    '',
    `סוג מעקב: ${MODE_LABELS[summary.detectedMode] ?? summary.detectedMode}`,
    ...fieldLines,
    '',
    'מקור: טקסט שהודבק מהמעקב הרשמי',
    `זמן הפענוח: ${importedText}`,
    '',
    'יש לאמת שינויים ונתונים חסרים מול המקור הרשמי.',
  ];
  return parts.join('\n');
}

/** Render the (default-collapsed) recent-events timeline with an accessible native expand/collapse control (rules 23, 50). */
function renderTimeline(container, doc, timeline) {
  if (!isSettableElement(container) || timeline.events.length === 0) {
    return;
  }
  container.textContent = '';

  const heading = doc.createElement('p');
  heading.className = 'tool-note';
  heading.textContent = RECENT_EVENTS_HEADING;
  container.appendChild(heading);

  if (timeline.orderConfidence === 'source-order') {
    const orderNote = doc.createElement('p');
    orderNote.className = 'tool-note';
    orderNote.textContent = SOURCE_ORDER_NOTE;
    container.appendChild(orderNote);
  }

  const list = doc.createElement('div');
  list.className = 'timeline-list';
  container.appendChild(list);

  function renderItems(count) {
    list.textContent = '';
    for (const event of timeline.events.slice(0, count)) {
      const item = doc.createElement('div');
      item.className = 'timeline-item';

      const desc = doc.createElement('p');
      desc.className = 'timeline-desc';
      setDirAuto(desc);
      desc.textContent = event.description;
      item.appendChild(desc);

      if (event.dateIso || event.rawDateText) {
        const dateP = doc.createElement('p');
        dateP.className = 'timeline-meta';
        dateP.textContent = `${event.dateIso ?? event.rawDateText}${event.timeText ? ' ' + event.timeText : ''}`;
        item.appendChild(dateP);
      }
      if (event.location) {
        const locP = doc.createElement('p');
        locP.className = 'timeline-meta';
        setDirAuto(locP);
        locP.textContent = event.location;
        item.appendChild(locP);
      }
      list.appendChild(item);
    }
  }

  renderItems(Math.min(DEFAULT_VISIBLE_EVENTS, timeline.events.length));

  if (timeline.events.length > DEFAULT_VISIBLE_EVENTS) {
    const remaining = timeline.events.length - DEFAULT_VISIBLE_EVENTS;
    const toggle = doc.createElement('button');
    toggle.type = 'button';
    toggle.className = 'tool-btn-secondary';
    if (typeof toggle.setAttribute === 'function') {
      toggle.setAttribute('aria-expanded', 'false');
    }
    toggle.textContent = `הצג עוד אירועים (${remaining})`;
    let expanded = false;
    toggle.addEventListener('click', () => {
      expanded = !expanded;
      renderItems(expanded ? timeline.events.length : DEFAULT_VISIBLE_EVENTS);
      toggle.textContent = expanded ? 'הצג פחות אירועים' : `הצג עוד אירועים (${remaining})`;
      if (typeof toggle.setAttribute === 'function') {
        toggle.setAttribute('aria-expanded', String(expanded));
      }
    });
    container.appendChild(toggle);
  }

  if (timeline.omittedCount > 0) {
    const omittedNote = doc.createElement('p');
    omittedNote.className = 'tool-note';
    omittedNote.textContent = `נמצאו ${timeline.totalFound} אירועים בטקסט שהודבק; מוצגים עד 50 מתוכם.`;
    container.appendChild(omittedNote);
  }

  container.hidden = false;
}

function renderSummary(elements, summary, doc) {
  const { resultElement, verificationElement, timelineElement, copyButton } = elements;

  if (isSettableElement(resultElement)) {
    resultElement.textContent = '';
  }
  if (isSettableElement(verificationElement)) {
    verificationElement.textContent = '';
  }
  if (isSettableElement(timelineElement)) {
    timelineElement.textContent = '';
    timelineElement.hidden = true;
  }

  const modeHeading = doc.createElement('p');
  modeHeading.className = 'tool-note';
  modeHeading.textContent = `${MODE_LABELS[summary.detectedMode] ?? summary.detectedMode} — ${
    summary.supportLevel === 'partial' ? PARTIAL_MESSAGE : DETECTION_ONLY_MESSAGE
  }`;
  resultElement.appendChild(modeHeading);

  const allEntries = Object.entries(summary.fields);
  const confirmedEntries = sortEntriesByMode(
    allEntries.filter(([, field]) => field && field.confidence !== 'low' && !field.conflict),
    summary.detectedMode,
  );
  const verificationEntries = allEntries.filter(([, field]) => field && (field.confidence === 'low' || field.conflict));

  if (confirmedEntries.length > 0) {
    const summaryHeading = doc.createElement('p');
    summaryHeading.className = 'tool-note';
    summaryHeading.textContent = OPERATIONAL_SUMMARY_HEADING;
    resultElement.appendChild(summaryHeading);
    const dl = doc.createElement('dl');
    for (const [name, field] of confirmedEntries) {
      appendFieldRow(dl, doc, name, field);
    }
    resultElement.appendChild(dl);
  }

  if (summary.supportLevel !== 'partial') {
    const note = doc.createElement('p');
    note.className = 'tool-note';
    note.textContent = summary.message || NO_GROUP_RECOMMENDATION;
    resultElement.appendChild(note);
    const recommendation = doc.createElement('p');
    recommendation.className = 'tool-note';
    recommendation.textContent = NO_GROUP_RECOMMENDATION;
    resultElement.appendChild(recommendation);
  }

  renderTimeline(timelineElement, doc, summary.timeline);

  const limitationsHeading = doc.createElement('p');
  limitationsHeading.className = 'tool-note';
  limitationsHeading.textContent = PARSING_LIMITATIONS_HEADING;
  resultElement.appendChild(limitationsHeading);

  for (const diagnostic of summary.diagnostics) {
    const diagnosticNote = doc.createElement('p');
    diagnosticNote.className = 'tool-note';
    diagnosticNote.textContent = diagnostic;
    resultElement.appendChild(diagnosticNote);
  }

  if (summary.sourceUpdatedAt) {
    const updatedNote = doc.createElement('p');
    updatedNote.className = 'tool-note';
    updatedNote.textContent = `עדכון המקור (כפי שצוין בטקסט שהודבק): ${summary.sourceUpdatedAt.value}${
      summary.sourceUpdatedAt.timeText ? ' ' + summary.sourceUpdatedAt.timeText : ''
    }`;
    resultElement.appendChild(updatedNote);
  }

  if (summary.linesTruncated) {
    const truncatedNote = doc.createElement('p');
    truncatedNote.className = 'tool-note';
    truncatedNote.textContent = 'הטקסט שהודבק הכיל שורות רבות מדי; חלק מהשורות לא עובדו.';
    resultElement.appendChild(truncatedNote);
  }

  const importedNote = doc.createElement('p');
  importedNote.className = 'tool-note';
  const importedDate = new Date(summary.importedAt);
  importedNote.textContent = `זמן ייבוא: ${
    Number.isNaN(importedDate.getTime()) ? summary.importedAt : importedDate.toLocaleString('he-IL')
  }`;
  resultElement.appendChild(importedNote);

  for (const limitation of summary.limitations) {
    const limitationNote = doc.createElement('p');
    limitationNote.className = 'tool-note';
    limitationNote.textContent = limitation;
    resultElement.appendChild(limitationNote);
  }

  resultElement.hidden = false;

  if (verificationEntries.length > 0 && isSettableElement(verificationElement)) {
    const heading = doc.createElement('p');
    heading.className = 'tool-note';
    heading.textContent = VERIFICATION_HEADING;
    verificationElement.appendChild(heading);
    const dl = doc.createElement('dl');
    for (const [name, field] of verificationEntries) {
      const dt = doc.createElement('dt');
      dt.textContent = FIELD_LABELS[name] ?? name;
      const dd = doc.createElement('dd');
      setDirAuto(dd);
      if (field.conflict) {
        const candidateText = field.candidates.map((c) => c.value).join(' / ');
        dd.textContent = `${CONFLICT_MESSAGE}: ${candidateText}`;
      } else {
        dd.textContent = `${field.value ?? field.rawText ?? ''} — דורש אימות`;
      }
      dl.appendChild(dt);
      dl.appendChild(dd);
    }
    verificationElement.appendChild(dl);
    verificationElement.hidden = false;
  }

  const copyText = buildCopyText(summary);
  if (isUsableElement(copyButton, ['addEventListener']) && copyText.length > 0 && summary.supportLevel === 'partial') {
    elements.retainedSummaryText = copyText;
    copyButton.hidden = false;
  }
}

/** Clear the result/error/verification/timeline/copy display state, without touching the textarea's current value. */
function clearDisplayState(elements) {
  const { errorElement, resultElement, verificationElement, timelineElement, copyButton, copyStatus } = elements;
  hideElement(errorElement);
  hideElement(resultElement);
  hideElement(verificationElement);
  hideElement(timelineElement);
  hideElement(copyStatus);
  if (isSettableElement(copyButton)) {
    copyButton.hidden = true;
  }
  elements.retainedSummaryText = null;
}

/** Clear both the pasted text and all display state -- used by the reset button and by a new search submission. */
function resetImportState(elements) {
  if (isSettableElement(elements.textarea)) {
    elements.textarea.value = '';
  }
  clearDisplayState(elements);
}

function handleParseClick(elements) {
  const { textarea, sourceSelect, errorElement, resultElement } = elements;
  const text = readString(textarea);
  const sourceType = readString(sourceSelect) || 'auto';

  clearDisplayState(elements);

  const summary = buildTrackingSummary({ text, sourceType, now: new Date() });

  if (!summary.valid) {
    showMessage(errorElement, resolveErrorMessage(summary.error));
    return;
  }

  if (!isUsableElement(resultElement, ['appendChild']) || typeof elements.documentRef?.createElement !== 'function') {
    return;
  }

  renderSummary(elements, summary, elements.documentRef);
}

function handleCopyClick(elements) {
  const value = elements.retainedSummaryText;
  const { copyStatus } = elements;
  if (typeof value !== 'string' || value.length === 0) {
    return;
  }
  const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
  if (!clipboard || typeof clipboard.writeText !== 'function') {
    showMessage(copyStatus, 'לא ניתן להעתיק כרגע. ניתן לסמן ולהעתיק ידנית.');
    return;
  }
  Promise.resolve(clipboard.writeText(value)).then(
    () => showMessage(copyStatus, 'התקציר המנורמל הועתק'),
    () => showMessage(copyStatus, 'לא ניתן היה להעתיק את התקציר. ניתן לסמן ולהעתיק ידנית.'),
  );
}

/**
 * Initialize the Smart Tracking Import UI controller.
 *
 * @param {{
 *   sectionElement?: object,
 *   textarea: object,
 *   sourceSelect?: object,
 *   parseButton: object,
 *   resetButton?: object,
 *   copyButton?: object,
 *   copyStatus?: object,
 *   errorElement?: object,
 *   resultElement: object,
 *   verificationElement?: object,
 *   timelineElement?: object,
 *   documentRef?: object,
 * }} options
 * @returns {Readonly<{initialized: boolean, handleSearchResult: Function}>}
 */
export function initializeTrackingImportUi(options) {
  const opts = options && typeof options === 'object' ? options : {};
  const elements = {
    sectionElement: opts.sectionElement,
    textarea: opts.textarea,
    sourceSelect: opts.sourceSelect,
    parseButton: opts.parseButton,
    resetButton: opts.resetButton,
    copyButton: opts.copyButton,
    copyStatus: opts.copyStatus,
    errorElement: opts.errorElement,
    resultElement: opts.resultElement,
    verificationElement: opts.verificationElement,
    timelineElement: opts.timelineElement,
    documentRef: opts.documentRef,
    retainedSummaryText: null,
  };

  if (!isUsableElement(elements.parseButton, ['addEventListener']) || !isSettableElement(elements.resultElement)) {
    return Object.freeze({
      initialized: false,
      handleSearchResult: () => {},
    });
  }

  if (!initializedButtons.has(elements.parseButton)) {
    elements.parseButton.addEventListener('click', () => handleParseClick(elements));
    initializedButtons.add(elements.parseButton);
  }

  if (isUsableElement(elements.resetButton, ['addEventListener']) && !initializedButtons.has(elements.resetButton)) {
    elements.resetButton.addEventListener('click', () => resetImportState(elements));
    initializedButtons.add(elements.resetButton);
  }

  if (isUsableElement(elements.copyButton, ['addEventListener']) && !initializedButtons.has(elements.copyButton)) {
    elements.copyButton.addEventListener('click', () => handleCopyClick(elements));
    initializedButtons.add(elements.copyButton);
  }

  function handleSearchResult(state) {
    resetImportState(elements);
    if (isSettableElement(elements.sectionElement)) {
      elements.sectionElement.hidden = !isEligibleForCopy(state);
    }
  }

  return Object.freeze({ initialized: true, handleSearchResult });
}

/**
 * User-interface controller for FreighTime's scenario-routed Import
 * Readiness experience.
 *
 * Binds to the explicitly supplied readiness section root element
 * (never queries `document` globally) and, within that root only,
 * locates the fixed set of form/result elements by their known IDs.
 * Runs entirely locally: reads form values on explicit button clicks
 * only, routes to one of five scenarios, computes the scenario's
 * result, and renders it using `textContent`/`createElement` only --
 * never `innerHTML`. Performs no network request, no storage access,
 * no logging, and never mutates the page URL.
 *
 * The assessment begins with exactly three primary questions (import
 * type, import experience, product identity) and then routes into one
 * of four scenario-specific follow-ups, or -- via an explicit shortcut
 * offered on the intro screen -- directly into the fifth
 * (shipment-already-in-progress) scenario, bypassing the three primary
 * questions entirely, since a shipment problem is rarely well-served by
 * first asking whether the import is personal or commercial.
 */

import { normalizeReadinessInput } from './normalize-readiness-input.js';
import { normalizeImportTypeAnswer, resolveUncertainImportType, IMPORT_TYPE_EXPLANATIONS } from './import-type-routing.js';
import { decideScenario } from './experience-routing.js';
import { buildPersonalImportResult } from './personal-import-rules.js';
import { buildFirstCommercialImportResult } from './first-commercial-import-rules.js';
import { buildExistingImporterResult } from './existing-importer-rules.js';
import { buildEstablishedOperationResult } from './established-operation-rules.js';
import { buildShipmentProblemResult } from './shipment-problem-rules.js';
import { buildScenarioSummary } from './build-scenario-summary.js';
import { ACTION_STATUS_LABELS, SCENARIO } from './scenario-schema.js';

const STEP_LABELS = Object.freeze({
  q1: 'אופי היבוא',
  q1clarify: 'הבהרת אופי היבוא',
  q2: 'ניסיון ביבוא',
  q3: 'זיהוי המוצר',
  personalFollowup: 'פרטי יבוא אישי',
  existingImporterFollowup: 'נושא לבדיקה',
  establishedOperationFollowup: 'מטרת הבדיקה',
  problemType: 'סוג הבעיה',
  problemDetails: 'פרטי המשלוח',
});

const SECTION_HEADINGS = Object.freeze({
  known: 'מה כבר ידוע',
  missing: 'מה חסר',
  toCheck: 'מה מומלץ לבדוק',
  documentsToPrepare: 'מסמכים שכדאי להכין',
  beforeOrder: 'לפני הזמנה',
  beforeShipment: 'לפני שילוח',
  risks: 'סיכונים אפשריים',
  nextStep: 'הצעד הבא',
  whenProfessionalReviewNeeded: 'מתי נדרשת בדיקה מקצועית',
  purpose: 'מטרת הבדיקה',
  auditPoints: 'נקודות לביקורת',
  exposures: 'חשיפות אפשריות',
  documentsAndSample: 'מסמכים ומדגם לבדיקה',
  recommendedProfessional: 'גורם מקצועי מומלץ',
  urgency: 'רמת דחיפות',
  dataToGather: 'נתונים ומסמכים לאיסוף',
  timelineNote: 'ציר הזמן שיש לשחזר',
  partyToCheckWith: 'הגורם שמולו נדרש לבדוק',
  accumulatingCosts: 'עלויות שעלולות להמשיך להצטבר',
  recommendedAction: 'פעולה מומלצת',
  whenToEscalate: 'מתי להסלים',
});

function isUsable(value) {
  return value !== null && value !== undefined && typeof value === 'object';
}

function byId(root, id) {
  if (!isUsable(root) || typeof root.querySelector !== 'function') return null;
  return root.querySelector(`#${id}`);
}

function readText(el) {
  return isUsable(el) && typeof el.value === 'string' ? el.value : '';
}

function readChecked(el) {
  return isUsable(el) ? el.checked === true : false;
}

function readRadioValue(root, name, fallback) {
  if (!isUsable(root) || typeof root.querySelectorAll !== 'function') return fallback;
  const nodes = root.querySelectorAll(`input[name="${name}"]`);
  for (const node of nodes) {
    if (node.checked) return node.value;
  }
  return fallback;
}

function setHidden(el, hidden) {
  if (isUsable(el)) el.hidden = hidden;
}

function collectRawFormState(root) {
  return {
    importType: readRadioValue(root, 'irImportType', ''),
    forSaleOrDistribution: readRadioValue(root, 'irForSaleOrDistribution', 'no') === 'yes',
    forBusinessUse: readRadioValue(root, 'irForBusinessUse', 'no') === 'yes',
    personalOrFamilyUseOnly: readRadioValue(root, 'irPersonalOrFamilyUseOnly', 'no') === 'yes',

    experience: readRadioValue(root, 'irExperience', ''),

    productName: readText(byId(root, 'irProductName')),
    commercialDescription: readText(byId(root, 'irCommercialDescription')),
    intendedUse: readText(byId(root, 'irIntendedUse')),
    hasTechnicalSpec: readChecked(byId(root, 'irHasTechnicalSpec')),
    hasCatalogOrProductPage: readChecked(byId(root, 'irHasCatalogOrProductPage')),
    hasPhotos: readChecked(byId(root, 'irHasPhotos')),
    hasSupplierInvoice: readChecked(byId(root, 'irHasSupplierInvoice')),
    hasSupplierProvidedHsCode: readChecked(byId(root, 'irHasSupplierProvidedHsCode')),
    hsCodeKnown: readChecked(byId(root, 'irHsCodeKnown')),
    hsCode: readText(byId(root, 'irHsCode')),

    quantity: readText(byId(root, 'irQuantity')),
    approxValue: readText(byId(root, 'irApproxValue')),
    countryOfOrigin: readText(byId(root, 'irCountryOfOrigin')),
    shipmentMethod: readText(byId(root, 'irShipmentMethod')),
    sensitiveCategory: readText(byId(root, 'irSensitiveCategory')),

    focusArea: readText(byId(root, 'irFocusArea')),
    auditPurpose: readText(byId(root, 'irAuditPurpose')),

    problemType: readText(byId(root, 'irProblemType')),
    shipmentMode: readText(byId(root, 'irShipmentMode')),
    currentStage: readText(byId(root, 'irCurrentStage')),
    issuingParty: readText(byId(root, 'irIssuingParty')),
    deadline: readText(byId(root, 'irDeadline')),
    missingDocumentsNote: readText(byId(root, 'irMissingDocumentsNote')),
    hasWrittenNotice: readChecked(byId(root, 'irHasWrittenNotice')),
    accumulatingCosts: readChecked(byId(root, 'irAccumulatingCosts')),
  };
}

function hasSubstantialData(raw) {
  return (
    raw.importType.length > 0 ||
    raw.productName.length > 0 ||
    raw.commercialDescription.length > 0 ||
    raw.problemType.length > 0
  );
}

const ALL_STEP_IDS = [
  'irStepQ1', 'irStepQ1Clarify', 'irStepQ2', 'irStepQ3',
  'irStepPersonalFollowup', 'irStepExistingImporterFollowup', 'irStepEstablishedOperationFollowup',
  'irStepProblemType', 'irStepProblemDetails',
];

const STEP_ID_TO_ELEMENT_ID = Object.freeze({
  q1: 'irStepQ1',
  q1clarify: 'irStepQ1Clarify',
  q2: 'irStepQ2',
  q3: 'irStepQ3',
  personalFollowup: 'irStepPersonalFollowup',
  existingImporterFollowup: 'irStepExistingImporterFollowup',
  establishedOperationFollowup: 'irStepEstablishedOperationFollowup',
  problemType: 'irStepProblemType',
  problemDetails: 'irStepProblemDetails',
});

function el(doc, tag, options = {}) {
  const node = doc.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.attrs) {
    for (const [name, value] of Object.entries(options.attrs)) {
      node.setAttribute(name, value);
    }
  }
  return node;
}

function appendSection(doc, container, heading, value) {
  if (Array.isArray(value)) {
    if (value.length === 0) return;
    const section = el(doc, 'div', { className: 'ir-result-section' });
    section.appendChild(el(doc, 'h3', { text: heading }));
    const ul = el(doc, 'ul');
    for (const item of value) {
      const li = el(doc, 'li');
      if (typeof item === 'string') {
        li.textContent = item;
      } else if (item && typeof item === 'object' && typeof item.label === 'string') {
        const statusLabel = ACTION_STATUS_LABELS[item.status] ?? item.status;
        li.textContent = `${item.label} (${statusLabel})`;
      }
      ul.appendChild(li);
    }
    section.appendChild(ul);
    container.appendChild(section);
    return;
  }
  if (typeof value === 'string' && value.length > 0) {
    const section = el(doc, 'div', { className: 'ir-result-section' });
    section.appendChild(el(doc, 'h3', { text: heading }));
    section.appendChild(el(doc, 'p', { text: value }));
    container.appendChild(section);
  }
}

function renderResult(doc, resultContainer, result) {
  resultContainer.textContent = '';

  const routeHeading = el(doc, 'div', {
    className: 'ir-readiness-badge',
    text: `המסלול שזוהה: ${result.routeLabel}`,
    attrs: { 'data-scenario': result.scenario },
  });
  resultContainer.appendChild(routeHeading);

  const sections = result.sections !== null && typeof result.sections === 'object' ? result.sections : {};
  for (const [key, heading] of Object.entries(SECTION_HEADINGS)) {
    appendSection(doc, resultContainer, heading, sections[key]);
  }

  if (Array.isArray(result.officialSources) && result.officialSources.length > 0) {
    const section = el(doc, 'div', { className: 'ir-result-section' });
    section.appendChild(el(doc, 'h3', { text: 'מקורות רשמיים' }));
    for (const source of result.officialSources) {
      section.appendChild(
        el(doc, 'a', {
          className: 'ir-source-link',
          text: `${source.noteLabel}: ${source.label}`,
          attrs: { href: source.url, target: '_blank', rel: 'noopener noreferrer' },
        }),
      );
    }
    resultContainer.appendChild(section);
  }

  if (Array.isArray(result.ctas) && result.ctas.length > 0) {
    const section = el(doc, 'div', { className: 'ir-result-section' });
    section.appendChild(el(doc, 'h3', { text: 'המשך עם איש מקצוע' }));
    const list = el(doc, 'div', { className: 'ir-cta-list' });
    for (const cta of result.ctas) {
      list.appendChild(el(doc, 'a', { text: cta.label, attrs: { href: '#contact' } }));
    }
    section.appendChild(list);
    resultContainer.appendChild(section);
  }

  resultContainer.appendChild(el(doc, 'div', { className: 'ir-disclaimer', text: result.disclaimer }));

  const actions = el(doc, 'div', { className: 'ir-nav' });
  const copyButton = el(doc, 'button', { className: 'tool-btn-secondary', text: 'העתקת סיכום', attrs: { type: 'button' } });
  const editButton = el(doc, 'button', { className: 'tool-btn-secondary', text: 'עריכת תשובות', attrs: { type: 'button' } });
  const newButton = el(doc, 'button', { className: 'tool-btn-primary', text: 'בדיקה חדשה', attrs: { type: 'button' } });
  actions.appendChild(newButton);
  actions.appendChild(editButton);
  actions.appendChild(copyButton);
  resultContainer.appendChild(actions);

  const copyStatus = el(doc, 'div', { attrs: { 'aria-live': 'polite' } });
  resultContainer.appendChild(copyStatus);

  return { copyButton, editButton, newButton, copyStatus };
}

/**
 * Initialize the Import Readiness controller.
 *
 * @param {{root: object, documentRef: object}} options
 * @returns {Readonly<{initialized: boolean}>}
 */
export function initializeImportReadiness(options) {
  const opts = options !== null && typeof options === 'object' ? options : {};
  const root = opts.root;
  const doc = opts.documentRef;

  if (!isUsable(root) || !isUsable(doc)) {
    return Object.freeze({ initialized: false });
  }

  const elements = {
    intro: byId(root, 'readinessIntro'),
    startButton: byId(root, 'readinessStartButton'),
    problemShortcutButton: byId(root, 'readinessProblemShortcutButton'),
    form: byId(root, 'readinessForm'),
    stepIndicator: byId(root, 'readinessStepIndicator'),
    errors: byId(root, 'readinessErrors'),
    backButton: byId(root, 'readinessBackButton'),
    nextButton: byId(root, 'readinessNextButton'),
    resetButton: byId(root, 'readinessResetButton'),
    result: byId(root, 'readinessResult'),
  };

  let stepHistory = [];
  let currentStepId = null;
  let currentScenario = null;

  function showStep(stepId) {
    currentStepId = stepId;
    for (const elId of ALL_STEP_IDS) {
      setHidden(byId(root, elId), true);
    }
    setHidden(byId(root, STEP_ID_TO_ELEMENT_ID[stepId]), false);
    if (isUsable(elements.stepIndicator)) {
      elements.stepIndicator.textContent = `שלב: ${STEP_LABELS[stepId] ?? stepId}`;
    }
    setHidden(elements.backButton, stepHistory.length === 0);
    elements.nextButton.textContent = 'הבא ←';
  }

  function goForward(stepId) {
    if (currentStepId !== null) stepHistory.push(currentStepId);
    showStep(stepId);
  }

  function goBack() {
    const previous = stepHistory.pop();
    if (previous) showStep(previous);
  }

  function showErrors(messages) {
    if (!isUsable(elements.errors)) return;
    if (messages.length === 0) {
      elements.errors.textContent = '';
      elements.errors.hidden = true;
      return;
    }
    elements.errors.textContent = messages.join(' ');
    elements.errors.hidden = false;
  }

  function updateImportTypeExplanation() {
    const explanationEl = byId(root, 'irImportTypeExplanation');
    if (!isUsable(explanationEl)) return;
    const value = readRadioValue(root, 'irImportType', '');
    explanationEl.textContent = IMPORT_TYPE_EXPLANATIONS[value] ?? '';
  }

  function updateUncertainLeaning() {
    const messageEl = byId(root, 'irUncertainLeaningMessage');
    if (!isUsable(messageEl)) return;
    const raw = collectRawFormState(root);
    const resolved = resolveUncertainImportType({
      forSaleOrDistribution: raw.forSaleOrDistribution,
      forBusinessUse: raw.forBusinessUse,
      personalOrFamilyUseOnly: raw.personalOrFamilyUseOnly,
    });
    messageEl.textContent = resolved.message;
  }

  function computeAndRenderResult(scenario, normalized) {
    let result;
    if (scenario === SCENARIO.PERSONAL) result = buildPersonalImportResult(normalized);
    else if (scenario === SCENARIO.EXISTING_IMPORTER) result = buildExistingImporterResult(normalized);
    else if (scenario === SCENARIO.ESTABLISHED_OPERATION) result = buildEstablishedOperationResult(normalized);
    else if (scenario === SCENARIO.SHIPMENT_PROBLEM) result = buildShipmentProblemResult(normalized);
    else result = buildFirstCommercialImportResult(normalized);

    const controls = renderResult(doc, elements.result, result);
    setHidden(elements.form, true);
    setHidden(elements.result, false);

    if (typeof controls.editButton.addEventListener === 'function') {
      controls.editButton.addEventListener('click', () => {
        setHidden(elements.result, true);
        setHidden(elements.form, false);
        const previous = stepHistory.length > 0 ? stepHistory[stepHistory.length - 1] : 'q1';
        showStep(previous);
      });
    }
    if (typeof controls.newButton.addEventListener === 'function') {
      controls.newButton.addEventListener('click', () => resetAll({ confirmIfSubstantial: false }));
    }
    if (typeof controls.copyButton.addEventListener === 'function') {
      controls.copyButton.addEventListener('click', () => {
        const summary = buildScenarioSummary(result);
        const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
        if (!clipboard || typeof clipboard.writeText !== 'function') {
          controls.copyStatus.textContent = 'לא ניתן להעתיק כרגע. ניתן לסמן ולהעתיק ידנית.';
          return;
        }
        Promise.resolve(clipboard.writeText(summary)).then(
          () => { controls.copyStatus.textContent = 'הסיכום הועתק'; },
          () => { controls.copyStatus.textContent = 'לא ניתן היה להעתיק. ניתן לסמן ולהעתיק ידנית.'; },
        );
      });
    }
  }

  function resetAll({ confirmIfSubstantial }) {
    const raw = collectRawFormState(root);
    if (confirmIfSubstantial && hasSubstantialData(raw)) {
      const confirmFn = typeof root.ownerDocument?.defaultView?.confirm === 'function'
        ? root.ownerDocument.defaultView.confirm
        : typeof confirm === 'function' ? confirm : null;
      if (confirmFn && !confirmFn('אופסו כל התשובות שהוזנו. להמשיך?')) {
        return;
      }
    }
    if (typeof elements.form.reset === 'function') {
      elements.form.reset();
    }
    stepHistory = [];
    currentStepId = null;
    currentScenario = null;
    showErrors([]);
    setHidden(elements.result, true);
    setHidden(elements.form, true);
    setHidden(elements.intro, false);
  }

  if (isUsable(elements.startButton) && typeof elements.startButton.addEventListener === 'function') {
    elements.startButton.addEventListener('click', () => {
      setHidden(elements.intro, true);
      setHidden(elements.form, false);
      setHidden(elements.result, true);
      stepHistory = [];
      showStep('q1');
    });
  }

  if (isUsable(elements.problemShortcutButton) && typeof elements.problemShortcutButton.addEventListener === 'function') {
    elements.problemShortcutButton.addEventListener('click', () => {
      setHidden(elements.intro, true);
      setHidden(elements.form, false);
      setHidden(elements.result, true);
      stepHistory = [];
      currentScenario = SCENARIO.SHIPMENT_PROBLEM;
      showStep('problemType');
    });
  }

  if (typeof root.querySelectorAll === 'function') {
    for (const radio of root.querySelectorAll('input[name="irImportType"]')) {
      if (typeof radio.addEventListener === 'function') {
        radio.addEventListener('change', updateImportTypeExplanation);
      }
    }
    for (const name of ['irForSaleOrDistribution', 'irForBusinessUse', 'irPersonalOrFamilyUseOnly']) {
      for (const radio of root.querySelectorAll(`input[name="${name}"]`)) {
        if (typeof radio.addEventListener === 'function') {
          radio.addEventListener('change', updateUncertainLeaning);
        }
      }
    }
  }

  if (isUsable(elements.nextButton) && typeof elements.nextButton.addEventListener === 'function') {
    elements.nextButton.addEventListener('click', () => {
      showErrors([]);
      const raw = collectRawFormState(root);

      if (currentStepId === 'q1') {
        if (raw.importType.length === 0) {
          showErrors(['יש לבחור אופי יבוא לפני המשך.']);
          return;
        }
        const importType = normalizeImportTypeAnswer(raw.importType);
        if (importType === 'uncertain') {
          updateUncertainLeaning();
          goForward('q1clarify');
        } else {
          goForward('q2');
        }
        return;
      }

      if (currentStepId === 'q1clarify') {
        goForward('q2');
        return;
      }

      if (currentStepId === 'q2') {
        if (raw.experience.length === 0) {
          showErrors(['יש לבחור תשובה לפני המשך.']);
          return;
        }
        goForward('q3');
        return;
      }

      if (currentStepId === 'q3') {
        if (raw.productName.length === 0) {
          showErrors(['יש להזין שם מוצר לפני המשך.']);
          return;
        }
        const scenario = decideScenario({
          importType: normalizeImportTypeAnswer(raw.importType),
          experience: raw.experience,
        });
        currentScenario = scenario;

        if (scenario === SCENARIO.PERSONAL) {
          goForward('personalFollowup');
        } else if (scenario === SCENARIO.EXISTING_IMPORTER) {
          goForward('existingImporterFollowup');
        } else if (scenario === SCENARIO.ESTABLISHED_OPERATION) {
          goForward('establishedOperationFollowup');
        } else {
          computeAndRenderResult(SCENARIO.FIRST_COMMERCIAL, normalizeReadinessInput(raw));
        }
        return;
      }

      if (currentStepId === 'personalFollowup') {
        computeAndRenderResult(SCENARIO.PERSONAL, normalizeReadinessInput(raw));
        return;
      }
      if (currentStepId === 'existingImporterFollowup') {
        computeAndRenderResult(SCENARIO.EXISTING_IMPORTER, normalizeReadinessInput(raw));
        return;
      }
      if (currentStepId === 'establishedOperationFollowup') {
        computeAndRenderResult(SCENARIO.ESTABLISHED_OPERATION, normalizeReadinessInput(raw));
        return;
      }

      if (currentStepId === 'problemType') {
        if (raw.problemType.length === 0) {
          showErrors(['יש לבחור סוג בעיה לפני המשך.']);
          return;
        }
        goForward('problemDetails');
        return;
      }
      if (currentStepId === 'problemDetails') {
        computeAndRenderResult(SCENARIO.SHIPMENT_PROBLEM, normalizeReadinessInput(raw));
      }
    });
  }

  if (isUsable(elements.backButton) && typeof elements.backButton.addEventListener === 'function') {
    elements.backButton.addEventListener('click', goBack);
  }

  if (isUsable(elements.resetButton) && typeof elements.resetButton.addEventListener === 'function') {
    elements.resetButton.addEventListener('click', () => resetAll({ confirmIfSubstantial: true }));
  }

  return Object.freeze({ initialized: true, showStep, resetAll });
}

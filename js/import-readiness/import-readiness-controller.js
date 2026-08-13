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
import { SCENARIO } from './scenario-schema.js';

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

/**
 * Render one compact result: route context, urgency (if any), the one
 * primary action, its short reason, a short preparation checklist, up
 * to two CTAs, a concise visible disclaimer, and a single collapsed
 * `<details>` region for everything secondary (extended disclaimer,
 * extra points, official-source links). Never renders more than one
 * `<details>`, never repeats the primary recommendation in a second
 * section, and never uses `innerHTML`.
 */
function renderResult(doc, resultContainer, result) {
  resultContainer.textContent = '';

  if (result.routeLabel) {
    resultContainer.appendChild(el(doc, 'p', { className: 'ir-route-context', text: `המסלול: ${result.routeLabel}` }));
  }

  if (result.urgency) {
    resultContainer.appendChild(
      el(doc, 'div', { className: 'ir-urgency-badge', text: result.urgency, attrs: { 'data-urgency': result.urgency } }),
    );
  }

  if (result.primaryAction) {
    const actionBlock = el(doc, 'div', { className: 'ir-primary-action' });
    actionBlock.appendChild(el(doc, 'h3', { text: 'הפעולה המומלצת' }));
    actionBlock.appendChild(el(doc, 'p', { text: result.primaryAction }));
    resultContainer.appendChild(actionBlock);
  }

  if (result.primaryReason) {
    const reasonBlock = el(doc, 'div', { className: 'ir-primary-reason' });
    reasonBlock.appendChild(el(doc, 'h3', { text: 'למה' }));
    reasonBlock.appendChild(el(doc, 'p', { text: result.primaryReason }));
    resultContainer.appendChild(reasonBlock);
  }

  // Professional-referral component: one concrete WHO, one concrete WHY,
  // one dedicated action CTA. Always positioned right after the primary
  // recommendation + reason and before the preparation checklist --
  // never buried below it, never inside the collapsed details, never
  // more than one professional/CTA pairing per result. The CTA only
  // navigates to the existing #contact section -- it never appends
  // assessment answers to the URL and never auto-submits anything.
  const professional = result.professional !== null && typeof result.professional === 'object' ? result.professional : null;
  if (professional && professional.type) {
    const referralBlock = el(doc, 'div', { className: 'ir-professional-referral' });
    referralBlock.appendChild(el(doc, 'h3', { text: 'מי צריך לבדוק?' }));
    referralBlock.appendChild(el(doc, 'p', { className: 'ir-professional-type', text: professional.type }));
    if (professional.reason) {
      referralBlock.appendChild(el(doc, 'p', { className: 'ir-professional-reason', text: professional.reason }));
    }
    if (professional.ctaLabel) {
      referralBlock.appendChild(
        el(doc, 'a', { className: 'ir-professional-cta', text: professional.ctaLabel, attrs: { href: '#contact' } }),
      );
    }
    resultContainer.appendChild(referralBlock);
  } else if (result.primaryCta) {
    // Defensive fallback only -- every current scenario supplies a
    // `professional` referral, so this path is not expected to run.
    const ctaRow = el(doc, 'div', { className: 'ir-cta-row' });
    ctaRow.appendChild(el(doc, 'a', { className: 'tool-btn-primary', text: result.primaryCta.label, attrs: { href: '#contact' } }));
    resultContainer.appendChild(ctaRow);
  }

  if (Array.isArray(result.preparationItems) && result.preparationItems.length > 0) {
    const prepBlock = el(doc, 'div', { className: 'ir-preparation' });
    prepBlock.appendChild(el(doc, 'h3', { text: 'מה להכין' }));
    const ul = el(doc, 'ul');
    for (const item of result.preparationItems) {
      ul.appendChild(el(doc, 'li', { text: item }));
    }
    prepBlock.appendChild(ul);
    resultContainer.appendChild(prepBlock);
  }

  if (result.secondaryCta) {
    const ctaRow = el(doc, 'div', { className: 'ir-cta-row' });
    ctaRow.appendChild(el(doc, 'a', { className: 'tool-btn-secondary', text: result.secondaryCta.label, attrs: { href: '#contact' } }));
    resultContainer.appendChild(ctaRow);
  }

  const secondary = result.secondaryDetails !== null && typeof result.secondaryDetails === 'object' ? result.secondaryDetails : {};
  const hasSecondaryContent =
    (Array.isArray(secondary.points) && secondary.points.length > 0) ||
    (Array.isArray(secondary.officialSources) && secondary.officialSources.length > 0) ||
    (typeof secondary.note === 'string' && secondary.note.length > 0) ||
    (typeof result.extendedDisclaimer === 'string' && result.extendedDisclaimer.length > 0);

  if (hasSecondaryContent) {
    const details = el(doc, 'details', { className: 'ir-secondary-details' });
    details.appendChild(el(doc, 'summary', { text: 'מידע נוסף והסברים' }));

    if (Array.isArray(secondary.points) && secondary.points.length > 0) {
      const ul = el(doc, 'ul');
      for (const point of secondary.points) ul.appendChild(el(doc, 'li', { text: point }));
      details.appendChild(ul);
    }
    if (typeof secondary.note === 'string' && secondary.note.length > 0) {
      details.appendChild(el(doc, 'p', { text: secondary.note }));
    }
    if (Array.isArray(secondary.officialSources) && secondary.officialSources.length > 0) {
      for (const source of secondary.officialSources) {
        details.appendChild(
          el(doc, 'a', {
            className: 'ir-source-link',
            text: `${source.noteLabel}: ${source.label}`,
            attrs: { href: source.url, target: '_blank', rel: 'noopener noreferrer' },
          }),
        );
      }
    }
    if (typeof result.extendedDisclaimer === 'string' && result.extendedDisclaimer.length > 0) {
      details.appendChild(el(doc, 'p', { className: 'ir-extended-disclaimer', text: result.extendedDisclaimer }));
    }

    resultContainer.appendChild(details);
  }

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

  // Disclaimer last: after the primary recommendation, the professional
  // referral, the preparation checklist, the edit/copy actions, and the
  // collapsed secondary details -- never buried mid-result.
  resultContainer.appendChild(el(doc, 'p', { className: 'ir-disclaimer', text: result.visibleDisclaimer }));

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
    // The whole `#readiness` section that hosts the workspace. Kept in
    // sync with the form/result visibility so the section reserves no
    // layout height (via the native `hidden` attribute) while neither
    // is showing -- otherwise its own section padding is left behind
    // as an empty gap below the Hero even though nothing in it is
    // visible. See DESIGN_SYSTEM_V1.md §8 ("hidden sections must not
    // reserve layout height").
    section: byId(root, 'readiness'),
    startButton: byId(root, 'readinessStartButton'),
    problemShortcutButton: byId(root, 'readinessProblemShortcutButton'),
    form: byId(root, 'readinessForm'),
    stepIndicator: byId(root, 'readinessStepIndicator'),
    errors: byId(root, 'readinessErrors'),
    backButton: byId(root, 'readinessBackButton'),
    nextButton: byId(root, 'readinessNextButton'),
    resetButton: byId(root, 'readinessResetButton'),
    result: byId(root, 'readinessResult'),
    // Optional visual progress elements. Both are feature-detected --
    // markup that omits them keeps working exactly as before.
    progressBar: byId(root, 'readinessProgressBar'),
    progressCount: byId(root, 'readinessProgressCount'),
  };

  let stepHistory = [];
  let currentStepId = null;
  let currentScenario = null;

  /**
   * Purely presentational: computes a 1-based step index and total step
   * count for the *visible* path taken so far (never affects routing or
   * result content). Used only to drive an optional progress bar/label.
   */
  function computeProgress(stepId) {
    const path = stepHistory.concat([stepId]);

    if (path.includes('problemType') || path.includes('problemDetails')) {
      const seq = ['problemType', 'problemDetails'];
      const idx = seq.indexOf(stepId);
      return { index: idx >= 0 ? idx + 1 : seq.length, total: seq.length };
    }

    const seq = ['q1'];
    if (path.includes('q1clarify')) seq.push('q1clarify');
    seq.push('q2', 'q3');
    if (currentScenario === SCENARIO.PERSONAL) seq.push('personalFollowup');
    else if (currentScenario === SCENARIO.EXISTING_IMPORTER) seq.push('existingImporterFollowup');
    else if (currentScenario === SCENARIO.ESTABLISHED_OPERATION) seq.push('establishedOperationFollowup');

    const idx = seq.indexOf(stepId);
    return { index: idx >= 0 ? idx + 1 : seq.length, total: seq.length };
  }

  function updateProgressDisplay(stepId) {
    const { index, total } = computeProgress(stepId);
    if (isUsable(elements.progressCount)) {
      elements.progressCount.textContent = `שלב ${index} מתוך ${total}`;
    }
    if (isUsable(elements.progressBar)) {
      const pct = total > 0 ? Math.round((index / total) * 100) : 0;
      elements.progressBar.style.width = `${pct}%`;
      elements.progressBar.setAttribute('aria-valuenow', String(pct));
    }
  }

  function showStep(stepId) {
    currentStepId = stepId;
    for (const elId of ALL_STEP_IDS) {
      setHidden(byId(root, elId), true);
    }
    setHidden(byId(root, STEP_ID_TO_ELEMENT_ID[stepId]), false);
    if (isUsable(elements.stepIndicator)) {
      elements.stepIndicator.textContent = `שלב: ${STEP_LABELS[stepId] ?? stepId}`;
    }
    updateProgressDisplay(stepId);
    setHidden(elements.backButton, stepHistory.length === 0);
    elements.nextButton.textContent = 'הבא ←';
  }

  function goForward(stepId) {
    if (currentStepId !== null) stepHistory.push(currentStepId);
    showStep(stepId);
  }

  /**
   * The gap left, in pixels, between the sticky header's bottom edge
   * and the scrolled-to assessment card -- purely visual breathing
   * room, not a layout dependency.
   */
  const SCROLL_HEADER_GAP_PX = 24;

  /**
   * Resolves the real `window` for this root, whether `root` is the
   * live document (production) or a plain object (this repository's
   * hand-rolled test doubles) -- mirrors the existing
   * `root.ownerDocument?.defaultView` fallback pattern used by
   * `resetAll` below for `confirm()`.
   */
  function getView() {
    if (isUsable(root) && isUsable(root.ownerDocument) && isUsable(root.ownerDocument.defaultView)) {
      return root.ownerDocument.defaultView;
    }
    return typeof window !== 'undefined' ? window : null;
  }

  function prefersReducedMotion() {
    const view = getView();
    if (!isUsable(view) || typeof view.matchMedia !== 'function') return false;
    const mq = view.matchMedia('(prefers-reduced-motion: reduce)');
    return isUsable(mq) ? mq.matches === true : false;
  }

  /**
   * Purely presentational: after the Hero's primary/secondary CTA reveals
   * the assessment workspace, scroll the whole assessment card -- heading,
   * step indicator, progress bar, and the active question together, not
   * just the active fieldset -- into view below the sticky header, and
   * move focus to the active question's heading so keyboard/screen-reader
   * users land on the right content. Never affects routing, result
   * content, or the URL. Fully feature-detected so environments without
   * these DOM APIs (including this repository's hand-rolled test doubles)
   * no-op safely.
   *
   * The scroll target is the whole form (not the active fieldset) because
   * the step indicator/progress bar sit above the fieldset in the DOM --
   * scrolling only the fieldset into view left them scrolled above the
   * top edge. The header offset is measured live via
   * `getBoundingClientRect()` (rather than a fixed pixel constant or a
   * breakpoint-matched CSS value) so it stays correct across every
   * viewport and orientation, including the header's own mobile/desktop
   * height change.
   */
  function focusAndScrollToCurrentStep() {
    const stepEl = byId(root, STEP_ID_TO_ELEMENT_ID[currentStepId]);
    if (!isUsable(stepEl)) return;

    const scrollTarget = isUsable(elements.form) ? elements.form : stepEl;
    if (typeof scrollTarget.scrollIntoView === 'function') {
      const headerEl = typeof root.querySelector === 'function' ? root.querySelector('header') : null;
      const headerHeight = isUsable(headerEl) && typeof headerEl.getBoundingClientRect === 'function'
        ? headerEl.getBoundingClientRect().height
        : 0;
      if (isUsable(scrollTarget.style)) {
        scrollTarget.style.scrollMarginTop = `${headerHeight + SCROLL_HEADER_GAP_PX}px`;
      }
      scrollTarget.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start',
      });
    }

    const heading = typeof stepEl.querySelector === 'function' ? stepEl.querySelector('legend') : null;
    if (isUsable(heading)) {
      if (typeof heading.setAttribute === 'function' && !heading.getAttribute?.('tabindex')) {
        heading.setAttribute('tabindex', '-1');
      }
      // `preventScroll: true` -- the scroll above is the one, intentional
      // scroll; focusing the heading must not trigger a second, conflicting
      // native scroll on top of it.
      if (typeof heading.focus === 'function') heading.focus({ preventScroll: true });
    }
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
    // Neither the form nor the result is visible after a full reset --
    // collapse the section itself back to zero layout height too, same
    // as its initial pre-activation state.
    setHidden(elements.section, true);
  }

  if (isUsable(elements.startButton) && typeof elements.startButton.addEventListener === 'function') {
    elements.startButton.addEventListener('click', () => {
      setHidden(elements.section, false);
      setHidden(elements.intro, true);
      setHidden(elements.form, false);
      setHidden(elements.result, true);
      stepHistory = [];
      showStep('q1');
      focusAndScrollToCurrentStep();
    });
  }

  if (isUsable(elements.problemShortcutButton) && typeof elements.problemShortcutButton.addEventListener === 'function') {
    elements.problemShortcutButton.addEventListener('click', () => {
      setHidden(elements.section, false);
      setHidden(elements.intro, true);
      setHidden(elements.form, false);
      setHidden(elements.result, true);
      stepHistory = [];
      currentScenario = SCENARIO.SHIPMENT_PROBLEM;
      showStep('problemType');
      focusAndScrollToCurrentStep();
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

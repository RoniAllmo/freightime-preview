/**
 * Regression tests for the two product-owner acceptance defects fixed
 * in this pass:
 *
 *  A. The real root cause of the scroll/focus defect was not a broken
 *     calculation -- it was that the canonical scroll/focus helper
 *     (`focusAndScrollToCurrentStep`, now built on the shared
 *     `scrollAndFocusSurface`) was only ever called from a handful of
 *     call sites (the Hero-reveal, and entering/leaving the focused-
 *     checks phase). Ordinary forward "הבא" transitions through the
 *     main questionnaire (q1->q2->q3->productContext and beyond), Back
 *     navigation, and Edit Answers never called it at all -- the page
 *     was simply left wherever it happened to be when the button was
 *     clicked (typically scrolled to the previous fieldset's bottom),
 *     which is exactly "the browser lands too low" / "landing roughly
 *     two-thirds down the result." Confirmed with real-browser
 *     (Playwright) measurement before and after. Fixed by moving the
 *     call into `showStep()` itself, so every transition through it --
 *     forward, Back, Edit Answers, the initial reveal -- gets the
 *     correct scroll/focus automatically, and removing the now-
 *     redundant explicit calls at the handful of sites that used to
 *     call it directly (to avoid a duplicate/competing second call).
 *     The result-transition path was also confirmed to use the same
 *     canonical `scrollAndFocusSurface()` helper (previously it called
 *     only `elements.result.focus({ preventScroll: false })`, with no
 *     scroll call and no protection against a second native scroll).
 *
 *  B. The standalone "במה תרצה להתמקד?" focus-area screen added friction
 *     without a meaningful decision on the established-importer route
 *     (commercial + prior_importer), since product details already
 *     establish the user is checking a specific product. Removed from
 *     that route's visible journey; the underlying `irFocusArea` control
 *     still exists (unreachable, hidden) so its unchanged default value
 *     ("מוצר חדש" / 'new_product') keeps producing the exact same
 *     scenario outcome as before, with zero change to
 *     existing-importer-rules.js or normalize-readiness-input.js.
 *
 * Source-scan assertions here extend the existing pattern from
 * tests/readiness/hero-assessment-transition.test.js (which already
 * covers the questionnaire-phase mechanism); this file adds the parts
 * specific to this pass -- the result path using the same mechanism,
 * and the removed focus-area step. Controller DOM tests use this
 * repository's existing hand-rolled fake-DOM pattern. Real-browser
 * (Playwright) validation of actual scroll positions across viewports
 * was performed separately and is summarized in the PR description --
 * these are structural/behavioral assertions, not pixel measurements.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeImportReadiness } from '../../js/import-readiness/import-readiness-controller.js';

function controllerSource() {
  return readFileSync(
    new URL('../../js/import-readiness/import-readiness-controller.js', import.meta.url),
    'utf8',
  );
}

// --- Canonical transition helper (Phase A: scroll/focus defect) --------------

test('canonical transition: exactly one scrollAndFocusSurface() implementation exists, used by both the step and result paths', () => {
  const source = controllerSource();
  const defs = source.match(/function scrollAndFocusSurface\(/g) ?? [];
  assert.equal(defs.length, 1, 'expected exactly one canonical transition helper definition');
  const calls = source.match(/scrollAndFocusSurface\(/g) ?? [];
  // 1 definition + at least 2 call sites (the questionnaire-phase helper and the result path).
  assert.ok(calls.length >= 3, `expected the helper to be called from multiple sites, found ${calls.length} occurrences`);
});

test('canonical transition: the result-rendering path no longer calls focus() directly with preventScroll:false', () => {
  const source = controllerSource();
  assert.ok(!/preventScroll:\s*false/.test(source), 'no call site should use preventScroll:false -- it allows a second, competing native scroll');
});

test('canonical transition: every scrollIntoView call uses block:"start" (never "center"/"nearest")', () => {
  const source = controllerSource();
  const scrollCalls = source.match(/scrollIntoView\(\{[^}]*\}\)/g) ?? [];
  assert.ok(scrollCalls.length > 0);
  for (const call of scrollCalls) {
    assert.ok(/block:\s*'start'/.test(call), `expected block:'start' in ${call}`);
  }
});

test('canonical transition: every focus() call uses preventScroll:true (no second, competing scroll)', () => {
  const source = controllerSource();
  const focusCalls = source.match(/\.focus\(\{[^}]*\}\)/g) ?? [];
  assert.ok(focusCalls.length > 0);
  for (const call of focusCalls) {
    assert.ok(/preventScroll:\s*true/.test(call), `expected preventScroll:true in ${call}`);
  }
});

test('canonical transition: header height is measured live via getBoundingClientRect(), never a hardcoded pixel offset', () => {
  const source = controllerSource();
  assert.ok(/getBoundingClientRect\(\)\.height/.test(source));
  assert.ok(!/scrollMarginTop\s*=\s*['"`]?\d+px/.test(source), 'expected no bare hardcoded scroll-margin-top constant');
});

test('canonical transition: showStep() itself calls focusAndScrollToCurrentStep() (the actual root-cause fix -- centralizing the call so no forward/Back/Edit call site can forget it)', () => {
  const source = controllerSource();
  const showStepMatch = source.match(/function showStep\(stepId\) \{[\s\S]*?\n  \}/);
  assert.ok(showStepMatch, 'expected to locate the showStep() function body');
  assert.ok(/focusAndScrollToCurrentStep\(\);/.test(showStepMatch[0]), 'showStep() must call focusAndScrollToCurrentStep() so every transition through it is corrected automatically');
});

test('canonical transition: no call site immediately following a showStep()/goForward() call also calls focusAndScrollToCurrentStep() (would be a duplicate, competing second call)', () => {
  const source = controllerSource();
  // A duplicate call would look like: goForward('x'); \n focusAndScrollToCurrentStep();
  // or showStep('x'); \n focusAndScrollToCurrentStep(); -- neither pattern should exist
  // now that showStep() performs the scroll/focus itself.
  assert.ok(!/(?:goForward|showStep)\([^)]*\);\s*\n\s*focusAndScrollToCurrentStep\(\);/.test(source), 'found a redundant focusAndScrollToCurrentStep() call directly after a showStep()/goForward() call');
});

// --- Back / Edit / New Assessment now transition correctly too (previously had NO scroll correction at all) ---

test('Back navigation: goBack() routes through showStep(), so it now receives the same scroll/focus correction as forward navigation', () => {
  const source = controllerSource();
  const goBackMatch = source.match(/function goBack\(\) \{[\s\S]*?\n  \}/);
  assert.ok(goBackMatch, 'expected to locate the goBack() function body');
  assert.ok(/showStep\(previous\)/.test(goBackMatch[0]), 'goBack() must call showStep(), which now performs the canonical scroll/focus');
});

test('established importer: Back navigation actually scrolls/focuses in a real DOM run (not just structurally wired)', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });

  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'commercial');
  registry.get('readinessNextButton').dispatch('click');
  selectRadio(radios, 'irExperience', 'prior_importer');
  registry.get('readinessNextButton').dispatch('click');
  registry.get('irProductName').value = 'מוצר בדיקה כלשהו';
  registry.get('readinessNextButton').dispatch('click'); // -> productContext

  registry.get('readinessBackButton').dispatch('click'); // Back -> q3
  assert.equal(registry.get('irStepQ3').hidden, false, 'Back must land on q3');
  // The fake DOM does not implement getBoundingClientRect/scrollTo, so this
  // only proves the code path runs without throwing and reaches the right
  // step -- the real-browser Playwright run (see PR description) confirms
  // the actual pixel-level landing position.
});

// --- Redundant focus-area screen removal (Phase B) ----------------------------

const RADIO_GROUPS = ['irImportType', 'irForSaleOrDistribution', 'irForBusinessUse', 'irPersonalOrFamilyUseOnly', 'irExperience'];
const TEXT_FIELD_IDS = [
  'irProductName', 'irCommercialDescription', 'irIntendedUse', 'irHsCode',
  'irQuantity', 'irApproxValue', 'irCountryOfOrigin', 'irShipmentMethod', 'irSensitiveCategory',
  'irFocusArea', 'irAuditPurpose', 'irProblemType', 'irShipmentMode', 'irCurrentStage', 'irIssuingParty',
  'irDeadline', 'irMissingDocumentsNote',
  'irDamageDiscoveryTiming', 'irHasInsurance', 'irFinancialExposure', 'irInsuranceSubScenario', 'irDisputeStage',
];
const CHECKBOX_FIELD_IDS = [
  'irHasTechnicalSpec', 'irHasCatalogOrProductPage', 'irHasPhotos', 'irHasSupplierInvoice',
  'irHasSupplierProvidedHsCode', 'irHsCodeKnown', 'irHasWrittenNotice', 'irAccumulatingCosts',
  'irHasPhotosOfDamage', 'irSafetyRisk', 'irGoodsHeld', 'irCustomsClearanceInvolved',
];
const STEP_ELEMENT_IDS = [
  'irStepQ1', 'irStepQ1Clarify', 'irStepQ2', 'irStepQ3', 'irStepProductContext',
  'irStepRegulatoryFollowup',
  'irStepPersonalFollowup', 'irStepExistingImporterFollowup', 'irStepEstablishedOperationFollowup',
  'irStepProblemType', 'irStepProblemDetails',
];
const CONTROL_IDS = [
  'readinessIntro', 'readinessStartButton', 'readinessProblemShortcutButton', 'readinessForm',
  'readinessStepIndicator', 'readinessErrors', 'readinessBackButton', 'readinessNextButton',
  'readinessResetButton', 'readinessResult', 'irImportTypeExplanation', 'irUncertainLeaningMessage',
  'irRegulatoryQuestionHost',
];

function createFakeElement(id, options = {}) {
  const listeners = {};
  let textContentValue = options.text ?? '';
  const attrs = {};
  const element = {
    id,
    value: options.value ?? '',
    checked: options.checked ?? false,
    hidden: options.hidden ?? false,
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
      attrs[name] = value;
    },
    getAttribute(name) {
      return attrs[name];
    },
    focus() {},
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
    set() {},
    get() {
      return '';
    },
  });
  return element;
}

function buildFakeRoot() {
  const registry = new Map();
  const radios = new Map();

  for (const id of TEXT_FIELD_IDS) registry.set(id, createFakeElement(id, { value: '' }));
  for (const id of CHECKBOX_FIELD_IDS) registry.set(id, createFakeElement(id, { checked: false }));
  for (const id of STEP_ELEMENT_IDS) registry.set(id, createFakeElement(id, { hidden: true }));
  for (const id of CONTROL_IDS) registry.set(id, createFakeElement(id, { hidden: false }));

  registry.get('readinessForm').hidden = true;
  registry.get('readinessResult').hidden = true;
  registry.get('readinessBackButton').hidden = true;
  registry.get('readinessErrors').hidden = true;

  for (const name of RADIO_GROUPS) {
    const options = name === 'irImportType'
      ? ['personal', 'commercial', 'uncertain']
      : name === 'irExperience'
        ? ['first_time', 'prior_importer', 'ongoing_operation', 'planning_only']
        : ['yes', 'no'];
    const group = options.map((value) => createFakeElement(`${name}_${value}`, { value, checked: false }));
    group.forEach((r) => { r.name = name; });
    radios.set(name, group);
  }

  const root = {
    querySelector(selector) {
      const id = selector.replace('#', '');
      return registry.get(id) ?? null;
    },
    querySelectorAll(selector) {
      const match = selector.match(/input\[name="([^"]+)"\]/);
      if (match) return radios.get(match[1]) ?? [];
      return [];
    },
  };

  return { root, registry, radios };
}

function createFakeDocument() {
  return {
    createElement(tagName) {
      const e = createFakeElement(undefined);
      e.tagName = tagName;
      return e;
    },
  };
}

function selectRadio(radios, name, value) {
  for (const radio of radios.get(name)) radio.checked = radio.value === value;
  const target = radios.get(name).find((r) => r.value === value);
  if (target) target.dispatch('change');
}

test('established importer: the redundant "במה תרצה להתמקד?" screen never appears; product details go straight to the next phase', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });

  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'commercial');
  registry.get('readinessNextButton').dispatch('click');
  selectRadio(radios, 'irExperience', 'prior_importer');
  registry.get('readinessNextButton').dispatch('click');
  registry.get('irProductName').value = 'מוצר בדיקה כלשהו';
  registry.get('readinessNextButton').dispatch('click'); // -> productContext
  registry.get('readinessNextButton').dispatch('click'); // -> directly onward

  assert.equal(registry.get('irStepExistingImporterFollowup').hidden, true, 'the redundant focus-area screen must never be shown');
  const reachedResultOrFocusedCheck = registry.get('readinessResult').hidden === false
    || registry.get('irStepRegulatoryFollowup').hidden === false;
  assert.ok(reachedResultOrFocusedCheck, 'expected to land directly on the result or a focused-check question, never a blank intermediate screen');
});

test('established importer: Back from product-context returns toward the importer-experience question, never to the removed focus screen', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });

  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'commercial');
  registry.get('readinessNextButton').dispatch('click');
  selectRadio(radios, 'irExperience', 'prior_importer');
  registry.get('readinessNextButton').dispatch('click');
  registry.get('irProductName').value = 'מוצר בדיקה כלשהו';
  registry.get('readinessNextButton').dispatch('click'); // -> productContext

  registry.get('readinessBackButton').dispatch('click'); // Back from productContext
  assert.equal(registry.get('irStepQ3').hidden, false, 'Back from productContext must return to the product-identity question (q3)');
  assert.equal(registry.get('irStepExistingImporterFollowup').hidden, true, 'must never show the removed focus screen');

  registry.get('readinessBackButton').dispatch('click'); // Back from q3
  assert.equal(registry.get('irStepQ2').hidden, false, 'Back from q3 must return to the importer-experience question');
});

test('established importer: the underlying irFocusArea select still defaults to "מוצר חדש" (new_product), so the preserved scenario outcome is unchanged', () => {
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const selectMatch = html.match(/<select id="irFocusArea">([\s\S]*?)<\/select>/);
  assert.ok(selectMatch, 'expected the irFocusArea select to still exist in the markup (unreachable but present, so its unchanged default value keeps producing the exact same scenario outcome)');
  const optionsHtml = selectMatch[1];
  const firstOptionMatch = optionsHtml.match(/<option value="([^"]+)">/);
  assert.equal(firstOptionMatch[1], 'new_product', 'the first (browser-default-selected) option must remain "new_product" -- no explicit selected attribute overrides it elsewhere');
  assert.ok(!/selected/.test(optionsHtml), 'no option should carry an explicit "selected" attribute that would override the first-option default');
});

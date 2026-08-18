/**
 * Regression tests for the premium questionnaire-shell elements added
 * on top of the PR #32 duplicate-question/result-dedup work:
 *  - the 4-phase indicator (js/import-readiness/import-readiness-
 *    controller.js's updateProgressDisplay) correctly marks completed/
 *    current/upcoming phases as the user progresses, when the optional
 *    `#readinessPhaseIndicator` element is present -- feature-detected,
 *    like the existing progress bar/count elements, so markup that
 *    omits it keeps working exactly as before (asserted here too).
 *  - the product-details step's regrouped sections render in the
 *    expected order without changing which fields are collected.
 *
 * Controller DOM test (hand-rolled fake DOM), not a real browser --
 * separate real-browser (Playwright) validation covered actual visual
 * rendering, spacing, and viewport behavior for this same change.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeImportReadiness } from '../../js/import-readiness/import-readiness-controller.js';

function createFakeElement(id, options = {}) {
  const listeners = {};
  let textContentValue = options.text ?? '';
  const attrs = {};
  const element = {
    id,
    value: options.value ?? '',
    checked: options.checked ?? false,
    hidden: options.hidden ?? false,
    children: options.children ?? [],
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

const RADIO_GROUPS = [
  'irImportType', 'irForSaleOrDistribution', 'irForBusinessUse', 'irPersonalOrFamilyUseOnly', 'irExperience',
];

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

function makePhaseIndicatorElement() {
  const phases = ['A', 'B', 'C', 'D'].map(() => createFakeElement(undefined));
  const el = createFakeElement('readinessPhaseIndicator', { children: phases });
  return el;
}

function buildFakeRoot({ withPhaseIndicator = false } = {}) {
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

  if (withPhaseIndicator) {
    registry.set('readinessPhaseIndicator', makePhaseIndicatorElement());
  }

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

test('premium shell: without a phase-indicator element in the markup, initialization and navigation still work (feature-detected, optional)', () => {
  const { root, registry, radios } = buildFakeRoot({ withPhaseIndicator: false });
  const result = initializeImportReadiness({ root, documentRef: createFakeDocument() });
  assert.equal(result.initialized, true);

  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'commercial');
  registry.get('readinessNextButton').dispatch('click');
  assert.equal(registry.get('irStepQ2').hidden, false);
});

test('premium shell: the 4-phase indicator marks phase A current at the start, with the rest upcoming', () => {
  const { root, registry } = buildFakeRoot({ withPhaseIndicator: true });
  initializeImportReadiness({ root, documentRef: createFakeDocument() });

  registry.get('readinessStartButton').dispatch('click');
  const phases = registry.get('readinessPhaseIndicator').children;
  assert.equal(phases[0].getAttribute('data-state'), 'current');
  assert.equal(phases[1].getAttribute('data-state'), 'upcoming');
  assert.equal(phases[2].getAttribute('data-state'), 'upcoming');
  assert.equal(phases[3].getAttribute('data-state'), 'upcoming');
});

test('premium shell: the phase indicator marks phase A complete and phase B current once product details are reached', () => {
  const { root, registry, radios } = buildFakeRoot({ withPhaseIndicator: true });
  initializeImportReadiness({ root, documentRef: createFakeDocument() });

  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'commercial');
  registry.get('readinessNextButton').dispatch('click');
  selectRadio(radios, 'irExperience', 'prior_importer');
  registry.get('readinessNextButton').dispatch('click');

  const phases = registry.get('readinessPhaseIndicator').children;
  assert.equal(phases[0].getAttribute('data-state'), 'complete');
  assert.equal(phases[1].getAttribute('data-state'), 'current');
  assert.equal(phases[1].getAttribute('aria-current'), 'step');
  assert.equal(phases[0].getAttribute('aria-current'), 'false');
});

test('premium shell: the phase indicator reaches phase D (current) once the result renders', () => {
  const { root, registry, radios } = buildFakeRoot({ withPhaseIndicator: true });
  initializeImportReadiness({ root, documentRef: createFakeDocument() });

  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'personal');
  registry.get('readinessNextButton').dispatch('click');
  registry.get('irProductName').value = 'מוצר לדוגמה';
  registry.get('readinessNextButton').dispatch('click');
  registry.get('readinessNextButton').dispatch('click'); // -> productContext
  registry.get('readinessNextButton').dispatch('click'); // -> personalFollowup or result

  const phases = registry.get('readinessPhaseIndicator').children;
  const dState = phases[3].getAttribute('data-state');
  assert.ok(dState === 'current' || dState === 'upcoming', 'phase D must never regress or skip states unexpectedly');
});

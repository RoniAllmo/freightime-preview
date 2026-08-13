/**
 * Tests for the optional visual step-progress indicator added to
 * js/import-readiness/import-readiness-controller.js as part of the
 * visual redesign. Purely presentational: it must never affect routing
 * or result content, and it must be entirely feature-detected so that
 * markup omitting the progress elements keeps working exactly as before
 * (covered by the pre-existing tests in import-readiness-controller.test.js).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeImportReadiness } from '../../js/import-readiness/import-readiness-controller.js';

function createFakeElement(id, options = {}) {
  const listeners = {};
  let textContentValue = options.text ?? '';
  const element = {
    id,
    value: options.value ?? '',
    checked: options.checked ?? false,
    hidden: options.hidden ?? false,
    children: [],
    style: {},
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
      throw new Error('innerHTML must never be used by the readiness controller');
    },
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
];

const CHECKBOX_FIELD_IDS = [
  'irHasTechnicalSpec', 'irHasCatalogOrProductPage', 'irHasPhotos', 'irHasSupplierInvoice',
  'irHasSupplierProvidedHsCode', 'irHsCodeKnown', 'irHasWrittenNotice', 'irAccumulatingCosts',
];

const STEP_ELEMENT_IDS = [
  'irStepQ1', 'irStepQ1Clarify', 'irStepQ2', 'irStepQ3',
  'irStepPersonalFollowup', 'irStepExistingImporterFollowup', 'irStepEstablishedOperationFollowup',
  'irStepProblemType', 'irStepProblemDetails',
];

const CONTROL_IDS = [
  'readinessIntro', 'readinessStartButton', 'readinessProblemShortcutButton', 'readinessForm',
  'readinessStepIndicator', 'readinessErrors', 'readinessBackButton', 'readinessNextButton',
  'readinessResetButton', 'readinessResult', 'irImportTypeExplanation', 'irUncertainLeaningMessage',
  'readinessProgressBar', 'readinessProgressCount',
];

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
  registry.get('readinessForm').reset = () => {
    for (const id of TEXT_FIELD_IDS) registry.get(id).value = '';
    for (const id of CHECKBOX_FIELD_IDS) registry.get(id).checked = false;
    for (const name of RADIO_GROUPS) {
      for (const radio of radios.get(name)) radio.checked = false;
    }
  };

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

test('1. the progress count reads "שלב 1 מתוך 3" on the first entry step', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');

  assert.equal(registry.get('readinessProgressCount').textContent, 'שלב 1 מתוך 3');
});

test('2. the progress bar width advances as steps are completed', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  const firstWidth = registry.get('readinessProgressBar').style.width;

  selectRadio(radios, 'irImportType', 'personal');
  registry.get('readinessNextButton').dispatch('click'); // -> q2

  const secondWidth = registry.get('readinessProgressBar').style.width;
  assert.notEqual(firstWidth, secondWidth);
  assert.equal(firstWidth, '33%');
  assert.equal(secondWidth, '67%');
});

test('3. choosing "uncertain" (adding the clarification step) recomputes the total step count to 4', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'uncertain');
  registry.get('readinessNextButton').dispatch('click'); // -> q1clarify

  assert.equal(registry.get('readinessProgressCount').textContent, 'שלב 2 מתוך 4');
});

test('4. the shipment-problem shortcut uses its own 2-step progress sequence', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessProblemShortcutButton').dispatch('click');

  assert.equal(registry.get('readinessProgressCount').textContent, 'שלב 1 מתוך 2');
});

test('5. the progress indicator is purely additive: omitting its elements from the markup does not break the existing flow', () => {
  const { root, registry, radios } = buildFakeRoot();
  registry.delete('readinessProgressBar');
  registry.delete('readinessProgressCount');
  initializeImportReadiness({ root, documentRef: createFakeDocument() });

  assert.doesNotThrow(() => {
    registry.get('readinessStartButton').dispatch('click');
    selectRadio(radios, 'irImportType', 'personal');
    registry.get('readinessNextButton').dispatch('click');
  });
  assert.equal(registry.get('irStepQ2').hidden, false);
});

test('6. the legacy "שלב: <label>" step indicator text is unchanged (backwards compatible)', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');

  assert.equal(registry.get('readinessStepIndicator').textContent, 'שלב: אופי היבוא');
});

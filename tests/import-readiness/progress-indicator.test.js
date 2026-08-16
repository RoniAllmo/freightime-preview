/**
 * Tests for the optional visual progress indicator added to
 * js/import-readiness/import-readiness-controller.js as part of the
 * visual redesign, and later adapted to the four-phase journey model
 * (js/import-readiness/journey-phase-model.js) so it can never promise
 * a fixed question count. Purely presentational: it must never affect
 * routing or result content, and it must be entirely feature-detected
 * so that markup omitting the progress elements keeps working exactly
 * as before (covered by the pre-existing tests in
 * import-readiness-controller.test.js).
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

test('1. the progress count reads the Phase A label ("מצב היבוא") on the first entry step -- never a fixed question count', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');

  assert.equal(registry.get('readinessProgressCount').textContent, 'מצב היבוא');
});

test('2. the progress bar width advances only when the PHASE changes, not on every question (q1 -> q2 stays in Phase A)', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  const firstWidth = registry.get('readinessProgressBar').style.width;

  selectRadio(radios, 'irImportType', 'personal');
  registry.get('readinessNextButton').dispatch('click'); // -> q2, still Phase A

  const secondWidth = registry.get('readinessProgressBar').style.width;
  assert.equal(firstWidth, '25%');
  assert.equal(secondWidth, '25%', 'q1 and q2 are both Phase A, so the phase-progress width must not move');
  assert.equal(registry.get('readinessProgressCount').textContent, 'מצב היבוא');
});

test('3. advancing from Phase A (q2) to Phase B (q3) moves the phase progress forward', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'personal');
  registry.get('readinessNextButton').dispatch('click'); // -> q2
  selectRadio(radios, 'irExperience', 'first_time');
  registry.get('readinessNextButton').dispatch('click'); // -> q3

  assert.equal(registry.get('readinessProgressCount').textContent, 'פרטי המוצר או הבעיה');
  assert.equal(registry.get('readinessProgressBar').style.width, '50%');
});

test('3b. choosing "uncertain" (adding the clarification sub-step) does NOT change the stable phase total -- still Phase A, still 4 total phases', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'uncertain');
  registry.get('readinessNextButton').dispatch('click'); // -> q1clarify

  assert.equal(registry.get('readinessProgressCount').textContent, 'מצב היבוא');
  assert.equal(registry.get('readinessProgressBar').getAttribute('aria-valuemax'), '4');
  assert.equal(registry.get('readinessProgressBar').getAttribute('aria-valuenow'), '1');
});

test('4. the shipment-problem shortcut uses the same stable 4-phase model: problem type is Phase A, problem details is Phase B', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessProblemShortcutButton').dispatch('click');

  assert.equal(registry.get('readinessProgressCount').textContent, 'מצב היבוא');
  assert.equal(registry.get('readinessProgressBar').style.width, '25%');
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

test('7. the accessible progress bar exposes correct PHASE aria-value* attributes, never a question count', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  const bar = registry.get('readinessProgressBar');

  assert.equal(bar.getAttribute('aria-valuemin'), '1');
  assert.equal(bar.getAttribute('aria-valuemax'), '4');
  assert.equal(bar.getAttribute('aria-valuenow'), '1');
  assert.ok(bar.getAttribute('aria-valuetext').includes('מצב היבוא'));
  assert.equal(bar.getAttribute('aria-current'), 'step');

  selectRadio(radios, 'irImportType', 'personal');
  registry.get('readinessNextButton').dispatch('click'); // -> q2
  selectRadio(radios, 'irExperience', 'first_time');
  registry.get('readinessNextButton').dispatch('click'); // -> q3
  assert.equal(bar.getAttribute('aria-valuenow'), '2');
  assert.ok(bar.getAttribute('aria-valuetext').includes('פרטי המוצר או הבעיה'));
});

test('8. no fixed question-count wording ("מתוך 3", "שלוש שאלות") ever appears in the progress indicator across a full personal-import path', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'personal');
  registry.get('readinessNextButton').dispatch('click');
  selectRadio(radios, 'irExperience', 'first_time');
  registry.get('readinessNextButton').dispatch('click');

  const forbidden = ['מתוך 3', 'שלוש שאלות', '3 שאלות'];
  const countText = registry.get('readinessProgressCount').textContent;
  const indicatorText = registry.get('readinessStepIndicator').textContent;
  const valueText = registry.get('readinessProgressBar').getAttribute('aria-valuetext') ?? '';
  for (const needle of forbidden) {
    assert.ok(!countText.includes(needle), `progressCount must not include "${needle}"`);
    assert.ok(!indicatorText.includes(needle), `stepIndicator must not include "${needle}"`);
    assert.ok(!valueText.includes(needle), `aria-valuetext must not include "${needle}"`);
  }
});

test('9. the result phase (Phase D) is reflected in the progress indicator and announced via the step indicator', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'personal');
  registry.get('readinessNextButton').dispatch('click'); // -> q2
  selectRadio(radios, 'irExperience', 'first_time');
  registry.get('readinessNextButton').dispatch('click'); // -> q3
  registry.get('irProductName').value = 'שולחן עץ';
  registry.get('irCommercialDescription').value = 'שולחן עץ לבית';
  registry.get('irIntendedUse').value = 'שימוש ביתי';
  registry.get('readinessNextButton').dispatch('click'); // -> personalFollowup
  registry.get('readinessNextButton').dispatch('click'); // -> result

  assert.equal(registry.get('readinessResult').hidden, false);
  assert.equal(registry.get('readinessProgressCount').textContent, 'התוצאה שלך');
  assert.equal(registry.get('readinessProgressBar').getAttribute('aria-valuenow'), '4');
  assert.equal(registry.get('readinessStepIndicator').textContent, 'שלב: התוצאה שלך');
});

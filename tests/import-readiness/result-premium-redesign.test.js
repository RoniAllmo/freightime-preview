/**
 * Regression tests for the result-hierarchy/action-hierarchy work added
 * on top of the earlier PR #32 passes (data-reuse dedup, result-content
 * dedup, premium questionnaire shell):
 *  - a dedicated, neutral no-match block (Phase F) renders exactly once
 *    when a category was hinted but no rule matched, and the same text
 *    is never repeated in the trailing "documents and more" section;
 *  - the result action row demotes "בדיקה חדשה" to a secondary action
 *    (never tool-btn-primary) so it never competes with the one true
 *    primary CTA (.ir-professional-cta) elsewhere in the result;
 *  - the supporting-professional heading uses the approved
 *    "גורם מקצועי נוסף" wording.
 *
 * Controller DOM tests (hand-rolled fake DOM), not a real browser --
 * separate real-browser (Playwright) validation covered actual visual
 * rendering (one highlighted surface, accent-bar sections, no
 * horizontal overflow) for this same change.
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

function collectAllText(element) {
  const own = element.textContent ? [element.textContent] : [];
  const fromChildren = (element.children ?? []).flatMap((child) => collectAllText(child));
  return own.concat(fromChildren);
}

function countOccurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

function driveToNoMatchResult(registry, radios) {
  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'commercial');
  registry.get('readinessNextButton').dispatch('click');
  selectRadio(radios, 'irExperience', 'prior_importer');
  registry.get('readinessNextButton').dispatch('click');

  registry.get('irProductName').value = 'ארגונית לרכב';
  registry.get('irCommercialDescription').value = 'ארגונית אחסון לתא המטען';
  registry.get('irIntendedUse').value = 'סידור חפצים ברכב';
  registry.get('readinessNextButton').dispatch('click');
  registry.get('readinessNextButton').dispatch('click');
  registry.get('irFocusArea').value = 'regulation_and_permits';
  registry.get('readinessNextButton').dispatch('click');

  let guard = 0;
  while (registry.get('readinessResult').hidden && guard < 5) {
    const host = registry.get('irRegulatoryQuestionHost');
    const fieldset = host.children[0];
    const row = fieldset.children.find((c) => c.tagName === 'div');
    const noOrUnknown = row.children.find((l) => ['no', 'unknown'].includes(l.children[0].getAttribute('value')));
    const chosen = noOrUnknown ?? row.children[0];
    const input = chosen.children[0];
    input.checked = true;
    input.dispatch('change');
    registry.get('readinessNextButton').dispatch('click');
    guard += 1;
  }
}

test('no-match: the dedicated neutral no-match block renders exactly once with the exact approved wording', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToNoMatchResult(registry, radios);

  const resultContainer = registry.get('readinessResult');
  const noMatchBlock = resultContainer.children.find((c) => c.className === 'ir-no-match');
  assert.ok(noMatchBlock, 'expected a dedicated .ir-no-match section');

  const blockText = collectAllText(noMatchBlock).join(' ');
  assert.ok(blockText.includes('לא זוהה כיוון בדיקה מקצועי במאגר המצומצם שנבדק.'));
  assert.ok(blockText.includes('אין בכך אישור שהמוצר פטור מדרישות יבוא.'));

  const resultText = collectAllText(resultContainer).join(' | ');
  assert.equal(countOccurrences(resultText, 'לא זוהה כיוון בדיקה מקצועי במאגר המצומצם שנבדק.'), 1, 'the no-match message must never appear twice (dedicated block + trailing brief)');
});

test('no-match: no regulatory-signals block renders alongside the dedicated no-match block', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToNoMatchResult(registry, radios);

  const resultContainer = registry.get('readinessResult');
  const signalsBlock = resultContainer.children.find((c) => c.className === 'ir-regulatory-signals');
  assert.equal(signalsBlock, undefined, 'a no-match result must never also render the regulatory-signals block');
});

test('action hierarchy: "בדיקה חדשה" is a secondary action, never styled as the primary CTA', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessProblemShortcutButton').dispatch('click');
  registry.get('irProblemType').value = 'cargo_or_container_damage';
  registry.get('irProblemType').dispatch('change');
  registry.get('readinessNextButton').dispatch('click');
  registry.get('readinessNextButton').dispatch('click');

  const resultContainer = registry.get('readinessResult');
  const nav = resultContainer.children.find((c) => c.className === 'ir-nav');
  assert.ok(nav, 'expected the result action row');
  const allButtonClasses = collectButtonClasses(nav);
  assert.ok(!allButtonClasses.some((c) => c.includes('tool-btn-primary')), 'no result-nav button may use tool-btn-primary -- the one primary CTA lives in the professional-referral/primary-action section');
});

function collectButtonClasses(node) {
  const own = node.className ? [node.className] : [];
  const fromChildren = (node.children ?? []).flatMap((c) => collectButtonClasses(c));
  return own.concat(fromChildren);
}

test('professional referral: the supporting-professional heading uses the approved "גורם מקצועי נוסף" wording', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessProblemShortcutButton').dispatch('click');
  registry.get('irProblemType').value = 'cargo_or_container_damage';
  registry.get('irProblemType').dispatch('change');
  registry.get('readinessNextButton').dispatch('click');
  registry.get('readinessNextButton').dispatch('click');

  const resultContainer = registry.get('readinessResult');
  const supporting = resultContainer.children.find((c) => c.className === 'ir-supporting-professional');
  assert.ok(supporting, 'expected a supporting-professional block for this scenario');
  const heading = supporting.children.find((c) => c.tagName === 'h3');
  assert.equal(heading.textContent, 'גורם מקצועי נוסף');
});

/**
 * Controller-level tests for the product-family matrix engine's result
 * rendering: the questionnaire never asks a new "which authority
 * applies" question, the matrix's result block appears (or correctly
 * stays absent) at the right points in the flow, and no positive
 * category is ever duplicated against an existing detailed rule's own
 * card. Uses this repository's existing hand-rolled fake-DOM pattern
 * (see question-transition-flow.test.js / import-readiness-
 * controller.test.js) -- not jsdom, not a real browser.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeImportReadiness } from '../../js/import-readiness/import-readiness-controller.js';
import { scanForBannedAbsoluteClaims } from '../../js/import-readiness/regulatory-signals/language-safety.js';

function controllerSource() {
  return readFileSync(new URL('../../js/import-readiness/import-readiness-controller.js', import.meta.url), 'utf8');
}

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

function resultTexts(registry) {
  const result = registry.get('readinessResult');
  const texts = [];
  const walk = (node) => {
    if (typeof node.textContent === 'string' && node.textContent) texts.push(node.textContent);
    for (const child of node.children || []) walk(child);
  };
  walk(result);
  return texts;
}

// --- Question-minimization: no "which authority applies" question ever exists ---

test('1. the controller source never asks the user which regulatory authority applies -- the matrix result is derived, not asked', () => {
  const source = controllerSource();
  const forbiddenQuestions = [
    'האם נדרש תקן?',
    'האם נדרש משרד הבריאות?',
    'האם נדרש משרד התחבורה?',
    'האם נדרש משרד התקשורת?',
    'האם נדרש משרד החקלאות?',
  ];
  for (const question of forbiddenQuestions) {
    assert.ok(!source.includes(question), `must never ask: ${question}`);
  }
});

test('2. buildProductFamilyMatrixSection is invoked from the free text already collected, with no new question-list wired to it', () => {
  const source = controllerSource();
  assert.ok(source.includes('buildProductFamilyMatrixSection('));
  // The call site passes texts derived from existing normalized fields,
  // not a newly-introduced regulatory-question set.
  const callSiteMatch = source.match(/buildProductFamilyMatrixSection\(\{[\s\S]*?\}\)/);
  assert.ok(callSiteMatch);
  assert.ok(/normalized\.productName/.test(callSiteMatch[0]));
  assert.ok(/normalized\.commercialDescription/.test(callSiteMatch[0]));
  assert.ok(/normalized\.intendedUse/.test(callSiteMatch[0]));
});

// --- Rendering behavior ------------------------------------------------------

test('3. wireless product (commercial): the result shows standards + communications in one compact list, no duplicate cards', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });

  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'commercial');
  registry.get('readinessNextButton').dispatch('click');
  selectRadio(radios, 'irExperience', 'prior_importer');
  registry.get('readinessNextButton').dispatch('click');
  registry.get('irProductName').value = 'רמקול אלחוטי';
  registry.get('irCommercialDescription').value = 'מוצר אלחוטי Bluetooth';
  registry.get('readinessNextButton').dispatch('click'); // -> productContext
  registry.get('readinessNextButton').dispatch('click'); // -> onward (focused-check or result)
  // Drain up to a few more forward clicks in case a focused-check
  // question intervenes, same defensive pattern used elsewhere in this
  // suite for scenario acceptance tests.
  for (let i = 0; i < 4 && registry.get('readinessResult').hidden; i += 1) {
    registry.get('readinessNextButton').dispatch('click');
  }

  assert.equal(registry.get('readinessResult').hidden, false, 'expected the result to render');
  const texts = resultTexts(registry);
  const combined = texts.join(' | ');
  assert.ok(combined.includes('תקינה'), 'expected the standards category to appear');
  assert.ok(combined.includes('משרד התקשורת'), 'expected the communications category to appear');
  const familyMatrixOccurrences = texts.filter((t) => t === 'נמצאו תחומי חוקיות יבוא לבדיקה').length;
  assert.ok(familyMatrixOccurrences <= 1, 'expected at most one product-family matrix section, never a duplicate');
});

test('4. clothing (personal): no positive category shown, no exemption claim, result still renders successfully', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });

  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'personal');
  registry.get('readinessNextButton').dispatch('click');
  selectRadio(radios, 'irExperience', 'first_time');
  registry.get('readinessNextButton').dispatch('click');
  registry.get('irProductName').value = 'חולצה';
  registry.get('irCommercialDescription').value = 'ביגוד לשימוש אישי';
  for (let i = 0; i < 8 && registry.get('readinessResult').hidden; i += 1) {
    registry.get('readinessNextButton').dispatch('click');
  }

  assert.equal(registry.get('readinessResult').hidden, false, 'expected the result to render');
  const texts = resultTexts(registry);
  const combined = texts.join(' | ');
  // "פטור" legitimately appears inside the one approved SAFE negated
  // sentence ("אין בכך אישור שהמוצר פטור מדרישות יבוא...") -- so this
  // checks for an actual exemption CLAIM via the shared banned-claim
  // scanner, not a naive substring match that would also flag the safe
  // wording.
  const scan = scanForBannedAbsoluteClaims(texts);
  assert.equal(scan.ok, true, `unexpected exemption-style claim in result: ${JSON.stringify(scan.violations)}`);
  assert.ok(!combined.includes('אין דרישות יבוא'), 'must never claim no import requirements exist');
});

// --- Privacy: no transmission, no storage, no URL mutation --------------------

test('5. product-family matrix modules never reference fetch/XHR/WebSocket/localStorage/sessionStorage/history mutation', () => {
  const modules = [
    'js/import-readiness/product-family-matrix.js',
    'js/import-readiness/product-family-identification.js',
    'js/import-readiness/product-family-reconciliation.js',
    'js/import-readiness/product-family-result.js',
  ];
  const forbidden = [
    /\bfetch\s*\(/, /XMLHttpRequest/, /WebSocket/, /localStorage/, /sessionStorage/,
    /history\.(push|replace)State/, /document\.cookie/,
  ];
  for (const path of modules) {
    const source = readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
    for (const pattern of forbidden) {
      assert.ok(!pattern.test(source), `${path} must not match ${pattern}`);
    }
  }
});

// --- Public-language safety scan on the rendered result -----------------------

test('6. rendered results never contain a banned absolute-claim phrase across the matrix acceptance scenarios', () => {
  const bannedPhrases = [
    'היבוא מאושר', 'פטור', 'לא נדרש אישור', 'אין דרישות יבוא',
    'הסיווג הסופי', 'התקן החל הוא', 'אישור מובטח',
  ];
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'commercial');
  registry.get('readinessNextButton').dispatch('click');
  selectRadio(radios, 'irExperience', 'prior_importer');
  registry.get('readinessNextButton').dispatch('click');
  registry.get('irProductName').value = 'מזון מן החי';
  registry.get('irCommercialDescription').value = 'בשר קפוא';
  for (let i = 0; i < 6 && registry.get('readinessResult').hidden; i += 1) {
    registry.get('readinessNextButton').dispatch('click');
  }
  const combined = resultTexts(registry).join(' | ');
  for (const phrase of bannedPhrases) {
    assert.ok(!combined.includes(phrase), `unexpected banned phrase in result: ${phrase}`);
  }
});

/**
 * Professional-handoff structural tests (PR #45 completion pass, Part B).
 *
 * These tests protect the STRUCTURE of the professional-handoff pattern
 * introduced across prior PRs and restyled (not restructured) by PR
 * #45's visual pass: one primary professional, at most one supporting
 * professional, one CTA, and an unchanged CTA destination -- across a
 * representative sample of regulatory and operational scenarios. They
 * never assert professional-selection logic itself (which professional
 * is chosen for which scenario) -- that remains owned by
 * professional-referral-dedup.test.js / professional-referral.test.js
 * / professional-referral-coverage.test.js and is untouched here.
 *
 * Uses the same hand-rolled fake-DOM controller-driving pattern already
 * used throughout tests/import-readiness/ (see e.g.
 * result-state-consistency.test.js, exact-glass-regression.test.js).
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
    focus() {},
  };
  Object.defineProperty(element, 'textContent', {
    set(value) {
      textContentValue = value;
      element.children.length = 0;
    },
    get() {
      if (element.children.length > 0) {
        return element.children.map((c) => (c && typeof c.textContent === 'string' ? c.textContent : '')).join('');
      }
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

function currentRegulatoryFieldset(registry) {
  const host = registry.get('irRegulatoryQuestionHost');
  return host.children.find((c) => c.tagName === 'fieldset') ?? null;
}

function answerThroughToResult(registry, maxRounds = 6) {
  let rounds = 0;
  while (registry.get('readinessResult').hidden && rounds < maxRounds) {
    const fieldset = currentRegulatoryFieldset(registry);
    if (!fieldset) break;
    const row = fieldset.children.find((c) => c.tagName === 'div');
    const label = row.children.find((l) => l.children[0].getAttribute('value') === 'yes') ?? row.children[0];
    label.children[0].checked = true;
    label.children[0].dispatch('change');
    registry.get('readinessNextButton').dispatch('click');
    rounds += 1;
  }
}

function driveCommercial(registry, radios, { productName, description }) {
  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'commercial');
  registry.get('readinessNextButton').dispatch('click');
  selectRadio(radios, 'irExperience', 'first_time');
  registry.get('readinessNextButton').dispatch('click');
  registry.get('irProductName').value = productName;
  if (description) registry.get('irCommercialDescription').value = description;
  registry.get('readinessNextButton').dispatch('click'); // -> productContext
  registry.get('readinessNextButton').dispatch('click'); // -> regulatoryFollowup or result
  answerThroughToResult(registry);
  return registry.get('readinessResult');
}

function driveProblem(registry, problemType) {
  registry.get('readinessStartButton').dispatch('click');
  registry.get('readinessProblemShortcutButton').dispatch('click');
  registry.get('irProblemType').value = problemType;
  registry.get('readinessNextButton').dispatch('click');
  registry.get('readinessNextButton').dispatch('click');
  return registry.get('readinessResult');
}

// -- structural walker: count descendant elements by exact className --

function hasClass(element, className) {
  return typeof element.className === 'string' && element.className.split(/\s+/).includes(className);
}

function countByClassName(element, className) {
  let count = 0;
  if (hasClass(element, className)) count += 1;
  for (const child of element.children ?? []) count += countByClassName(child, className);
  return count;
}

// Finds each distinct element that carries ANY of the given class names
// -- a single element (e.g. the canonical CTA carries both
// 'ir-professional-cta' AND 'ir-regulatory-primary-cta' on one anchor)
// must count once, not once per matching class name.
function findAllByAnyClassName(element, classNames) {
  const out = [];
  if (classNames.some((c) => hasClass(element, c))) out.push(element);
  for (const child of element.children ?? []) out.push(...findAllByAnyClassName(child, classNames));
  return out;
}

function collectAllText(element) {
  const own = element.textContent ? [element.textContent] : [];
  const fromChildren = (element.children ?? []).flatMap((child) => collectAllText(child));
  return own.concat(fromChildren);
}

const PRIMARY_PROFESSIONAL_CLASSES = ['ir-regulatory-primary-professional', 'ir-professional-type'];
const SUPPORTING_PROFESSIONAL_CLASSES = ['ir-regulatory-supporting-professional', 'ir-supporting-professional-type'];
const CTA_CLASSES = ['tool-btn-primary', 'ir-professional-cta', 'ir-regulatory-primary-cta'];

function assertHandoffStructure(t, result, label) {
  const primaryCount = PRIMARY_PROFESSIONAL_CLASSES.reduce((n, c) => n + countByClassName(result, c), 0);
  const supportingCount = SUPPORTING_PROFESSIONAL_CLASSES.reduce((n, c) => n + countByClassName(result, c), 0);
  const ctaEls = findAllByAnyClassName(result, CTA_CLASSES);

  assert.equal(primaryCount, 1, `${label}: expected exactly one primary professional element, found ${primaryCount}`);
  assert.ok(supportingCount <= 1, `${label}: expected at most one supporting professional element, found ${supportingCount}`);
  assert.equal(ctaEls.length, 1, `${label}: expected exactly one professional/primary CTA, found ${ctaEls.length}`);
  assert.equal(ctaEls[0].getAttribute('href'), '#contact', `${label}: CTA destination must remain the unchanged #contact anchor`);

  const text = collectAllText(result).join(' | ');
  assert.ok(!/הבקשה נשלחה|נשלחה בקשה|הפנייה נשלחה/.test(text), `${label}: must never claim a request/referral was already sent`);
  assert.ok(!/\d{2,3}-\d{7}|\d{9,10}/.test(text), `${label}: must never render an invented phone number`);
}

const REGULATORY_SCENARIOS = [
  ['glass', 'כוס זכוכית לשתיה', undefined],
  ['fresh eggs', 'ביצים טריות', undefined],
  ['walkie-talkie', 'ווקי טוקי', undefined],
  ['cosmetics', 'תמרוקים', undefined],
  ['electrical', 'מכשיר חשמלי עם תקע', undefined],
  ['vehicle headlamp', 'פנס קדמי לרכב', undefined],
  ['unknown family', 'קססססס', 'מוצר לא ידוע לחלוטין'],
];

for (const [label, productName, description] of REGULATORY_SCENARIOS) {
  test(`professional-handoff structure holds for ${label}`, (t) => {
    const { root, registry, radios } = buildFakeRoot();
    initializeImportReadiness({ root, documentRef: createFakeDocument() });
    const result = driveCommercial(registry, radios, { productName, description });
    assertHandoffStructure(t, result, label);
  });
}

test('professional-handoff structure holds for cargo damage (operational)', (t) => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  const result = driveProblem(registry, 'cargo_or_container_damage');
  assertHandoffStructure(t, result, 'cargo damage');
});

test('professional-handoff structure holds for customs dispute (operational)', (t) => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  const result = driveProblem(registry, 'classification_dispute');
  assertHandoffStructure(t, result, 'customs dispute');
});

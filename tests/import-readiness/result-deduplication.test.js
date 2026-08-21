/**
 * Regression tests for the "result repeats itself" defect the product
 * owner reported: before this fix, `renderResultBrief()` re-rendered a
 * full second "תקציר מוכנות ליבוא" section after the primary result,
 * restating the same route summary, primary action, professional
 * referral, and disclaimer text a second time in different wording.
 *
 * This is a CONTROLLER DOM TEST (hand-rolled fake DOM, no real
 * browser), driving the exact product-owner-reported existing-importer
 * glass journey through the real `initializeImportReadiness()` public
 * API -- same driving helpers as
 * tests/import-readiness/exact-glass-regression.test.js -- then
 * asserting no result field is restated a second time, and that the
 * remaining trailing "מסמכים ומידע נוסף" block only ever contains
 * genuinely new content (the document-readiness checklist), never a
 * repeat of the professional/action/disclaimer text shown above it.
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

// "Exactly once" counts below rely on this NOT bubbling like a real
// DOM's textContent -- the fake element's textContent getter (above)
// returns only what was last explicitly set via `el(doc, tag, {text})`
// and never a child-aggregated string, so each leaf's text is counted
// exactly once by construction, not by chance.
function collectAllText(element) {
  const own = element.textContent ? [element.textContent] : [];
  const fromChildren = (element.children ?? []).flatMap((child) => collectAllText(child));
  return own.concat(fromChildren);
}

function countOccurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

function driveToGlassResult(registry, radios) {
  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'commercial');
  registry.get('readinessNextButton').dispatch('click');

  selectRadio(radios, 'irExperience', 'prior_importer');
  registry.get('readinessNextButton').dispatch('click');

  registry.get('irProductName').value = 'כוס זכוכית לשתיה';
  registry.get('irCommercialDescription').value = 'כוס זכוכית';
  registry.get('irIntendedUse').value = 'שתיה';
  registry.get('irHasSupplierInvoice').checked = true;
  registry.get('irHsCodeKnown').checked = true;
  registry.get('irHsCode').value = '7013';
  registry.get('readinessNextButton').dispatch('click'); // -> productContext
  registry.get('readinessNextButton').dispatch('click'); // -> directly to the focused-check phase (redundant focus-area screen removed)

  const host = registry.get('irRegulatoryQuestionHost');
  const fieldset = host.children[0];
  const row = fieldset.children.find((c) => c.tagName === 'div');
  const yesLabel = row.children.find((l) => l.children[0].getAttribute('value') === 'yes');
  const yesInput = yesLabel.children[0];
  yesInput.checked = true;
  yesInput.dispatch('change');
  registry.get('readinessNextButton').dispatch('click');
}

test('result deduplication: the primary professional line is not repeated as a second, equal-weight referral', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToGlassResult(registry, radios);

  const resultText = collectAllText(registry.get('readinessResult')).join(' | ');
  assert.equal(
    countOccurrences(resultText, 'מסווג מכס או גורם תקינה'),
    1,
    'the specific glass rule\'s professional line must appear exactly once, not restated in a trailing brief section',
  );
});

test('result deduplication: the visible disclaimer text is not restated in a second section', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToGlassResult(registry, radios);

  const resultText = collectAllText(registry.get('readinessResult')).join(' | ');
  const disclaimerText = 'התוצאה היא כיוון בדיקה ראשוני ואינה מהווה סיווג מכס או אישור יבוא.';
  assert.equal(countOccurrences(resultText, disclaimerText), 1, 'the short limitation text must appear exactly once');
});

test('result deduplication: the primary action/reason text is not restated in a "prioritized actions" list', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToGlassResult(registry, radios);

  const resultText = collectAllText(registry.get('readinessResult')).join(' | ');
  assert.ok(!resultText.includes('פעולות מומלצות לפי סדר עדיפות'), 'the removed duplicate "prioritized actions" heading must not render');
  assert.ok(!resultText.includes('תמונת מצב'), 'the removed duplicate "situation" heading must not render');
  assert.ok(!resultText.includes('נקודות לבדיקה לפני המשך'), 'the removed duplicate "checkpoints" heading must not render');
  assert.ok(!resultText.includes('גורם מקצועי מתאים') || countOccurrences(resultText, 'מי צריך לבדוק?') === 1, 'the professional-referral heading must not be duplicated by a second brief heading');
});

test('result deduplication: a compact result-status header renders once, near the top of the result', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToGlassResult(registry, radios);

  const resultContainer = registry.get('readinessResult');
  const header = resultContainer.children.find((c) => c.className === 'ir-result-header');
  assert.ok(header, 'a single compact status header must render');
  const headerText = collectAllText(header).join(' ');
  assert.ok(headerText.length > 0, 'the status header must contain the operational status text');

  const resultText = collectAllText(resultContainer).join(' | ');
  assert.equal(countOccurrences(resultText, headerText), 1, 'the status text itself must appear exactly once');
});

test('result deduplication: the trailing "מסמכים ומידע נוסף" block, when present, only ever contains new document-checklist content', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToGlassResult(registry, radios);

  const resultContainer = registry.get('readinessResult');
  const briefSection = resultContainer.children.find((c) => c.className === 'ir-result-brief');
  if (briefSection) {
    const briefText = collectAllText(briefSection).join(' | ');
    assert.ok(!briefText.includes('מסווג מכס או גורם תקינה'), 'the trailing block must never restate the professional line');
    assert.ok(!briefText.includes('התוצאה היא כיוון בדיקה ראשוני'), 'the trailing block must never restate the disclaimer');
  }
});

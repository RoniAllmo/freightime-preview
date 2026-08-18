/**
 * Exact regression test for the product-owner-reported defect: the
 * regulatory focused-check phase must appear -- and the glass signal
 * must be produced -- for this exact journey through the real
 * rendered controller (existing-importer route, the exact route the
 * product owner used):
 *
 *   יבוא מסחרי -> כבר ביצעתי יבוא בעבר -> product form (name/description/
 *   use/HS code as below) -> existing-importer focus area -> Continue
 *
 * This is a CONTROLLER DOM TEST (hand-rolled fake DOM, no real
 * browser) -- it drives the same `initializeImportReadiness()` public
 * API a real page would, via click/fill/dispatch on fake elements,
 * never by calling the matcher or evaluator directly and never by
 * injecting regulatory answers into internal state. See
 * tests/import-readiness/regulatory-signals/*.test.js for pure unit
 * tests of the matcher/scheduler/keyword-hints in isolation, and the
 * PR body for the separate real-browser (Playwright) end-to-end run
 * that exercised this same exact journey in an actual browser.
 *
 * This test must fail if:
 *  - the focused-check phase is skipped
 *  - the glass confirmation question is absent
 *  - the old generic result appears alone (without the specific signal)
 *  - the specific glass signal is absent after confirming "כן"
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

function collectAllText(element) {
  const own = element.textContent ? [element.textContent] : [];
  const fromChildren = (element.children ?? []).flatMap((child) => collectAllText(child));
  return own.concat(fromChildren);
}

test('exact product-owner reproduction: existing-importer route, glass cup with HS 7013, reaches the focused-check phase and produces the glass signal', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });

  // 1. יבוא מסחרי
  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'commercial');
  registry.get('readinessNextButton').dispatch('click');

  // 2. כבר ביצעתי יבוא בעבר
  selectRadio(radios, 'irExperience', 'prior_importer');
  registry.get('readinessNextButton').dispatch('click');

  // 3. Product form, exact reported values
  registry.get('irProductName').value = 'כוס זכוכית לשתיה';
  registry.get('irCommercialDescription').value = 'כוס זכוכית';
  registry.get('irIntendedUse').value = 'שתיה';
  registry.get('irHasSupplierInvoice').checked = true;
  registry.get('irHsCodeKnown').checked = true;
  registry.get('irHsCode').value = '7013';
  registry.get('readinessNextButton').dispatch('click'); // -> productContext
  registry.get('readinessNextButton').dispatch('click'); // -> directly to the focused-check phase or result

  // The redundant standalone "במה תרצה להתמקד?" focus-area screen must
  // never appear on this route (product-owner acceptance finding) --
  // product details already establish the user is checking a product.
  assert.equal(registry.get('irStepExistingImporterFollowup').hidden, true, 'the redundant focus-area screen must never be shown');

  // The focused-check phase must be entered -- not skipped straight to the result.
  assert.equal(registry.get('irStepRegulatoryFollowup').hidden, false, 'the focused-check phase must appear (בדיקות ממוקדות), not be skipped');
  assert.equal(registry.get('readinessResult').hidden, true, 'the result must not render before the focused-check question is answered');

  const host = registry.get('irRegulatoryQuestionHost');
  const fieldset = host.children[0];
  assert.ok(fieldset, 'a live regulatory question fieldset must be rendered');
  const legend = fieldset.children.find((c) => c.tagName === 'legend');
  assert.equal(legend?.textContent, 'האם כלי הזכוכית מיועד למגע ישיר עם מזון או שתייה?', 'the exact glass confirmation question must be shown');

  // Answer "כן"
  const row = fieldset.children.find((c) => c.tagName === 'div');
  const yesLabel = row.children.find((l) => l.children[0].getAttribute('value') === 'yes');
  const yesInput = yesLabel.children[0];
  yesInput.checked = true;
  yesInput.dispatch('change');
  registry.get('readinessNextButton').dispatch('click');

  assert.equal(registry.get('readinessResult').hidden, false, 'the result must render after confirming');

  const resultText = collectAllText(registry.get('readinessResult')).join(' | ');

  // The exact glass signal, per the approved rule content.
  assert.ok(resultText.includes('כיוון בדיקה מקצועי'), 'result must show the status label');
  assert.ok(resultText.includes('נדרש לבדוק דרישות תקינה לכלי זכוכית'), 'result must show the exact glass rule title');
  assert.ok(resultText.includes('לפי המידע שנמסר, מדובר בכלי זכוכית המיועד למגע ישיר עם מזון או שתייה.'), 'result must show the exact identification sentence');
  assert.ok(resultText.includes('מוצרים מסוג זה עשויים להיות כפופים לדרישות תקינה ביבוא.'), 'result must show the exact implication sentence');
  assert.ok(resultText.includes('סוג הכלי והשימוש'), 'result must show verification item 1');
  assert.ok(resultText.includes('פרט המכס'), 'result must show verification item 2');
  assert.ok(resultText.includes('מסלול התקינה המתאים'), 'result must show verification item 3');
  assert.ok(resultText.includes('מסווג מכס או גורם תקינה'), 'result must show the exact professional line');
  assert.ok(resultText.includes('לאימות פרט המכס ומסלול התקינה החל לפני היבוא.'), 'result must show the exact professional reason');
  assert.ok(resultText.includes('התוצאה היא כיוון בדיקה ראשוני ואינה מהווה סיווג מכס או אישור יבוא.'), 'result must show the exact limitation');

  // The old generic recommendation must not be the SOLE result -- the
  // specific glass signal must be present alongside it.
  const hasOldGenericPhrase = resultText.includes('יש לתאם בדיקה מקצועית של סיווג המכס ודרישות היבוא מול מסווג מכס או מומחה רגולציה');
  const hasSpecificSignal = resultText.includes('נדרש לבדוק דרישות תקינה לכלי זכוכית');
  assert.ok(!(hasOldGenericPhrase && !hasSpecificSignal), 'the old generic result must never be the sole visible result once a specific signal applies');
});

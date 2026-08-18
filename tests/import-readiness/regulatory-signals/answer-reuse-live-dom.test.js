/**
 * Live-DOM integration tests proving the answer-reuse adapter
 * (js/import-readiness/regulatory-signals/answer-reuse.js) actually
 * eliminates a duplicate question through the real, rendered controller
 * -- not just at the pure-function level (see answer-reuse.test.js).
 *
 * Uses the same hand-rolled fake DOM style as
 * regulatory-followup-live-dom.test.js, extended with the product-
 * context "connects to power" / "touches food" radio groups so a
 * structured (not free-text) core answer can actually be given before
 * reaching the focused-checks phase.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeImportReadiness } from '../../../js/import-readiness/import-readiness-controller.js';

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

const YES_NO_UNKNOWN_RADIO_GROUPS = [
  'irImportType', 'irForSaleOrDistribution', 'irForBusinessUse', 'irPersonalOrFamilyUseOnly', 'irExperience',
  'irConnectsToPower', 'irMaterialTouchesFood', 'irMaterialHasCoating',
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
  const productFamilyCheckboxes = [];
  const materialCheckboxes = [];

  for (const id of TEXT_FIELD_IDS) registry.set(id, createFakeElement(id, { value: '' }));
  for (const id of CHECKBOX_FIELD_IDS) registry.set(id, createFakeElement(id, { checked: false }));
  for (const id of STEP_ELEMENT_IDS) registry.set(id, createFakeElement(id, { hidden: true }));
  for (const id of CONTROL_IDS) registry.set(id, createFakeElement(id, { hidden: false }));

  registry.get('readinessForm').hidden = true;
  registry.get('readinessResult').hidden = true;
  registry.get('readinessBackButton').hidden = true;
  registry.get('readinessErrors').hidden = true;

  for (const name of YES_NO_UNKNOWN_RADIO_GROUPS) {
    const options = name === 'irImportType'
      ? ['personal', 'commercial', 'uncertain']
      : name === 'irExperience'
        ? ['first_time', 'prior_importer', 'ongoing_operation', 'planning_only']
        : name === 'irConnectsToPower' || name === 'irMaterialTouchesFood' || name === 'irMaterialHasCoating'
          ? ['yes', 'no', 'unknown']
          : ['yes', 'no'];
    const group = options.map((value) => createFakeElement(`${name}_${value}`, { value, checked: false }));
    group.forEach((r) => { r.name = name; });
    radios.set(name, group);
  }

  // Product-family / material multi-select checkboxes -- enough entries
  // to drive the specific scenarios these tests need.
  const familyValue = createFakeElement('irProductFamily_glass', { value: 'glass_ceramics_and_tableware', checked: false });
  familyValue.name = 'irProductFamily';
  productFamilyCheckboxes.push(familyValue);
  const materialGlass = createFakeElement('irMaterial_glass', { value: 'glass', checked: false });
  materialGlass.name = 'irMaterial';
  materialCheckboxes.push(materialGlass);

  const root = {
    querySelector(selector) {
      const id = selector.replace('#', '');
      return registry.get(id) ?? null;
    },
    querySelectorAll(selector) {
      const match = selector.match(/input\[name="([^"]+)"\]/);
      if (match) {
        if (match[1] === 'irProductFamily') return productFamilyCheckboxes;
        if (match[1] === 'irMaterial') return materialCheckboxes;
        return radios.get(match[1]) ?? [];
      }
      return [];
    },
  };

  return { root, registry, radios, materialGlass, familyValue };
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

function currentRegulatoryLegendText(registry) {
  const fieldset = currentRegulatoryFieldset(registry);
  if (!fieldset) return null;
  const legend = fieldset.children.find((c) => c.tagName === 'legend');
  return legend ? legend.textContent : null;
}

function currentRegulatoryContextText(registry) {
  const host = registry.get('irRegulatoryQuestionHost');
  const context = host.children.find((c) => c.className === 'ir-focused-context');
  return context ? context.textContent : null;
}

test('a product already confirmed as connecting to power (structured core answer) never re-asks the mains-connection question -- the electrical signal appears directly', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });

  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'commercial');
  registry.get('readinessNextButton').dispatch('click');
  selectRadio(radios, 'irExperience', 'first_time');
  registry.get('readinessNextButton').dispatch('click');
  registry.get('irProductName').value = 'מכשיר חשמלי ביתי';
  registry.get('readinessNextButton').dispatch('click'); // -> productContext

  // Structured core answer already confirming the exact same concept
  // the regulatory follow-up question would otherwise ask.
  selectRadio(radios, 'irConnectsToPower', 'yes');
  registry.get('readinessNextButton').dispatch('click'); // -> regulatoryFollowup or straight to result

  // The mains-connection question must never be shown again -- it was
  // already answered via the structured core field.
  assert.notEqual(
    currentRegulatoryLegendText(registry),
    'האם המוצר מתחבר ישירות לרשת החשמל או מגיע עם תקע או ספק כוח?',
    'the duplicate mains-connection question must not be asked again',
  );
  assert.equal(registry.get('readinessResult').hidden, false, 'with the only question already answered, the result renders immediately');

  const resultText = registry.get('readinessResult').children
    .map((c) => c.textContent ?? '')
    .concat((function flatten(el) {
      const own = el.textContent ? [el.textContent] : [];
      return own.concat((el.children ?? []).flatMap(flatten));
    })(registry.get('readinessResult')))
    .join(' | ');
  assert.ok(resultText.includes('נדרש לבדוק דרישות תקינה למוצר חשמלי'), 'the electrical signal must still be produced from the reused answer');
});

test('a product already confirmed as NOT connecting to power never re-asks the question and never produces the electrical signal', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });

  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'commercial');
  registry.get('readinessNextButton').dispatch('click');
  selectRadio(radios, 'irExperience', 'first_time');
  registry.get('readinessNextButton').dispatch('click');
  registry.get('irProductName').value = 'כבל USB רגיל';
  registry.get('readinessNextButton').dispatch('click'); // -> productContext

  selectRadio(radios, 'irConnectsToPower', 'no');
  registry.get('readinessNextButton').dispatch('click');

  assert.equal(registry.get('readinessResult').hidden, false);
  const cards = registry.get('readinessResult').children.filter((c) => c.className === 'ir-regulatory-signals');
  assert.equal(cards.length, 0, 'a reused "no" answer must exclude the signal exactly as a live "no" answer would');
});

test('a live (still-necessary) regulatory question shows the focused-check continuity context line built from confirmed structured data', () => {
  const { root, registry, radios, materialGlass, familyValue } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });

  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'commercial');
  registry.get('readinessNextButton').dispatch('click');
  selectRadio(radios, 'irExperience', 'first_time');
  registry.get('readinessNextButton').dispatch('click');
  registry.get('irProductName').value = 'כוס זכוכית לשתייה';
  registry.get('readinessNextButton').dispatch('click'); // -> productContext

  familyValue.checked = true;
  materialGlass.checked = true;
  registry.get('readinessNextButton').dispatch('click'); // -> regulatoryFollowup

  assert.equal(registry.get('irStepRegulatoryFollowup').hidden, false);
  assert.equal(currentRegulatoryContextText(registry), 'זכוכית', 'the continuity line must echo the already-confirmed material');
});

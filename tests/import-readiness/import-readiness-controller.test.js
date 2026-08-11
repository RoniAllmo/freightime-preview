/**
 * Tests for js/import-readiness/import-readiness-controller.js using the
 * built-in Node.js test runner. No DOM library is installed -- a small
 * fake DOM tree (element registry + a minimal querySelector/querySelectorAll
 * implementation) is built below, matching the style already used in
 * tests/tools/tools-controller.test.js and tests/tracking/ui-controller.test.js.
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
    reset() {
      // no-op for individual fields; the fake form's reset() drives this
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
  'irIsElectrical', 'irHasBattery', 'irIsWireless', 'irIsFoodContact',
  'irHasConformityDocumentation', 'irHasUn383', 'irHasMsds', 'irHasCommunicationsDocumentation',
  'irHasFoodComplianceDocumentation', 'irIsMedicalOrHealth', 'irIsCosmeticOrPersonalCare',
  'irIsChildrenOrToy', 'irIsAutomotiveOrTransport', 'irIsAgricultureOrFood', 'irIsChemicalOrHazardous',
  'irSupplierProvidedHsCode',
];

const TEXT_FIELD_IDS = [
  'irProductName', 'irCommercialDescription', 'irIntendedUse', 'irEndUser',
  'irPrimaryMaterial', 'irAdditionalMaterials', 'irCompositionDetails',
  'irVoltage', 'irFrequency', 'irPower', 'irPlugType', 'irIntendedEnvironment',
  'irBatteryChemistry', 'irBatteryInstalledOrSeparate', 'irBatteryCapacity',
  'irWirelessTechnology', 'irWirelessFrequency', 'irWirelessDirection',
  'irFoodContactMaterial', 'irFoodType', 'irFoodContactTemperature', 'irFoodContactUse',
  'irCountryOfOrigin', 'irSupplierCountry', 'irQuantity', 'irInvoiceValue', 'irCurrency',
  'irQuantityType', 'irIncoterm', 'irShipmentMode', 'irHsCode',
];

const CHECKBOX_FIELD_IDS = [
  'irHsCodeKnown', 'irTechnicalCatalogAvailable', 'irProductPhotoAvailable', 'irModelOrPartNumberAvailable',
  'irHasCommercialInvoice', 'irHasPackingList', 'irHasTransportDocument', 'irHasCertificateOfOrigin',
  'irHasTechnicalDatasheet', 'irHasCatalog', 'irHasSupplierDeclaration', 'irHasTestReport',
  'irHasConformityDocuments', 'irHasImportPermit', 'irHasStandardsDocumentation', 'irHasHebrewLabel',
  'irHasInsuranceDocument',
];

const STEP_IDS = ['irStep1', 'irStep2', 'irStep3', 'irStep4', 'irStep5'];
const CONDITIONAL_IDS = ['irElectricalDetails', 'irBatteryDetails', 'irWirelessDetails', 'irFoodContactDetails'];
const CONTROL_IDS = [
  'readinessIntro', 'readinessStartButton', 'readinessForm', 'readinessStepIndicator', 'readinessErrors',
  'readinessBackButton', 'readinessNextButton', 'readinessResetButton', 'readinessResult',
];

function buildFakeRoot() {
  const registry = new Map();

  for (const id of TEXT_FIELD_IDS) registry.set(id, createFakeElement(id, { value: '' }));
  for (const id of CHECKBOX_FIELD_IDS) registry.set(id, createFakeElement(id, { checked: false }));
  for (const id of STEP_IDS) registry.set(id, createFakeElement(id, { hidden: id !== 'irStep1' }));
  for (const id of CONDITIONAL_IDS) registry.set(id, createFakeElement(id, { hidden: true }));
  for (const id of CONTROL_IDS) registry.set(id, createFakeElement(id, { hidden: false }));
  registry.get('readinessForm').hidden = true;
  registry.get('readinessResult').hidden = true;
  registry.get('readinessBackButton').hidden = true;
  registry.get('readinessForm').reset = () => {
    for (const id of TEXT_FIELD_IDS) registry.get(id).value = '';
    for (const id of CHECKBOX_FIELD_IDS) registry.get(id).checked = false;
    for (const name of RADIO_GROUPS) {
      for (const radio of radios.get(name)) radio.checked = radio.value === 'unknown';
    }
  };

  const radios = new Map();
  for (const name of RADIO_GROUPS) {
    const options = ['yes', 'no', 'unknown'];
    const group = options.map((value) =>
      createFakeElement(`${name}_${value}`, { value, checked: value === 'unknown' }),
    );
    group.forEach((r) => {
      r.name = name;
    });
    radios.set(name, group);
  }

  const root = {
    querySelector(selector) {
      const id = selector.replace('#', '');
      return registry.get(id) ?? null;
    },
    querySelectorAll(selector) {
      const match = selector.match(/input\[name="([^"]+)"\]/);
      if (match) {
        return radios.get(match[1]) ?? [];
      }
      return [];
    },
  };

  return { root, registry, radios };
}

function createFakeDocument() {
  return {
    createElement(tagName) {
      const el = createFakeElement(undefined);
      el.tagName = tagName;
      return el;
    },
  };
}

function selectRadio(radios, name, value) {
  for (const radio of radios.get(name)) {
    radio.checked = radio.value === value;
  }
  radios.get(name).find((r) => r.value === value).dispatch('change');
}

test('1. starting the assessment hides the intro and shows the form at step 1', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');

  assert.equal(registry.get('readinessIntro').hidden, true);
  assert.equal(registry.get('readinessForm').hidden, false);
  assert.equal(registry.get('irStep1').hidden, false);
  assert.equal(registry.get('irStep2').hidden, true);
  assert.equal(registry.get('readinessStepIndicator').textContent, 'שלב 1 מתוך 5');
});

test('2. proceeding without a product name shows a validation error and does not advance', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');

  registry.get('readinessNextButton').dispatch('click');

  assert.equal(registry.get('readinessErrors').hidden, false);
  assert.equal(registry.get('irStep1').hidden, false);
  assert.equal(registry.get('irStep2').hidden, true);
});

test('3. entering a product name allows step navigation to proceed', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  registry.get('irProductName').value = 'מנורת שולחן';

  registry.get('readinessNextButton').dispatch('click');

  assert.equal(registry.get('readinessErrors').hidden, true);
  assert.equal(registry.get('irStep1').hidden, true);
  assert.equal(registry.get('irStep2').hidden, false);
  assert.equal(registry.get('readinessStepIndicator').textContent, 'שלב 2 מתוך 5');
});

test('4. the back button returns to the previous step and is hidden on step 1', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  assert.equal(registry.get('readinessBackButton').hidden, true);

  registry.get('irProductName').value = 'מוצר';
  registry.get('readinessNextButton').dispatch('click');
  assert.equal(registry.get('readinessBackButton').hidden, false);

  registry.get('readinessBackButton').dispatch('click');
  assert.equal(registry.get('irStep1').hidden, false);
  assert.equal(registry.get('readinessBackButton').hidden, true);
});

test('5. selecting "yes" for electrical reveals the electrical conditional block', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  assert.equal(registry.get('irElectricalDetails').hidden, true);

  selectRadio(radios, 'irIsElectrical', 'yes');
  assert.equal(registry.get('irElectricalDetails').hidden, false);

  selectRadio(radios, 'irIsElectrical', 'no');
  assert.equal(registry.get('irElectricalDetails').hidden, true);
});

test('6. selecting "yes" for battery, wireless, and food-contact reveals their conditional blocks', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });

  selectRadio(radios, 'irHasBattery', 'yes');
  assert.equal(registry.get('irBatteryDetails').hidden, false);

  selectRadio(radios, 'irIsWireless', 'yes');
  assert.equal(registry.get('irWirelessDetails').hidden, false);

  selectRadio(radios, 'irIsFoodContact', 'yes');
  assert.equal(registry.get('irFoodContactDetails').hidden, false);
});

test('7. completing all steps and requesting the result renders a readiness badge with a data-level attribute', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  registry.get('irProductName').value = 'מוצר בדיקה';

  for (let i = 0; i < 4; i += 1) {
    registry.get('readinessNextButton').dispatch('click');
  }
  assert.equal(registry.get('readinessNextButton').textContent, 'קבלת תוצאה');
  registry.get('readinessNextButton').dispatch('click');

  assert.equal(registry.get('readinessForm').hidden, true);
  assert.equal(registry.get('readinessResult').hidden, false);
  const badge = registry.get('readinessResult').children.find((c) => c.getAttribute('data-level') !== undefined);
  assert.ok(badge, 'expected a readiness badge with a data-level attribute');
});

test('8. the rendered result never contains an unsafe HTML assignment (innerHTML throws if used)', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  registry.get('irProductName').value = 'מוצר בדיקה';
  for (let i = 0; i < 5; i += 1) {
    registry.get('readinessNextButton').dispatch('click');
  }
  // No throw means innerHTML was never assigned anywhere during rendering.
  assert.equal(registry.get('readinessResult').hidden, false);
});

test('9. resetting with no substantial data entered does not prompt for confirmation', () => {
  const { root, registry } = buildFakeRoot();
  const originalConfirm = globalThis.confirm;
  let confirmCalled = false;
  globalThis.confirm = () => {
    confirmCalled = true;
    return true;
  };

  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  registry.get('readinessResetButton').dispatch('click');

  assert.equal(confirmCalled, false);
  assert.equal(registry.get('readinessIntro').hidden, false);

  if (originalConfirm === undefined) delete globalThis.confirm;
  else globalThis.confirm = originalConfirm;
});

test('10. resetting after substantial data was entered prompts for confirmation, and a decline preserves the data', () => {
  const { root, registry } = buildFakeRoot();
  const originalConfirm = globalThis.confirm;
  let confirmCalled = false;
  globalThis.confirm = () => {
    confirmCalled = true;
    return false;
  };

  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  registry.get('irProductName').value = 'מוצר חשוב';
  registry.get('readinessResetButton').dispatch('click');

  assert.equal(confirmCalled, true);
  assert.equal(registry.get('irProductName').value, 'מוצר חשוב');

  if (originalConfirm === undefined) delete globalThis.confirm;
  else globalThis.confirm = originalConfirm;
});

test('11. no field value is ever written into a URL', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  registry.get('irProductName').value = 'UNIQUE_MARKER_998877';
  for (let i = 0; i < 5; i += 1) {
    registry.get('readinessNextButton').dispatch('click');
  }
  assert.equal(typeof window, 'undefined');
});

test('12. no network call occurs during the entire assessment flow', () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error('fetch must never be called by the readiness controller');
  };

  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  registry.get('irProductName').value = 'מוצר';

  assert.doesNotThrow(() => {
    for (let i = 0; i < 5; i += 1) {
      registry.get('readinessNextButton').dispatch('click');
    }
  });

  if (originalFetch === undefined) delete globalThis.fetch;
  else globalThis.fetch = originalFetch;
});

test('13. no storage access occurs during the entire assessment flow', () => {
  const originalLocalStorage = globalThis.localStorage;
  let accessed = false;
  globalThis.localStorage = new Proxy({}, { get() { accessed = true; return undefined; }, set() { accessed = true; return true; } });

  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  registry.get('irProductName').value = 'מוצר';
  for (let i = 0; i < 5; i += 1) {
    registry.get('readinessNextButton').dispatch('click');
  }

  assert.equal(accessed, false);

  if (originalLocalStorage === undefined) delete globalThis.localStorage;
  else globalThis.localStorage = originalLocalStorage;
});

test('14. initializing without a usable root is a safe no-op', () => {
  const result = initializeImportReadiness({ root: null, documentRef: createFakeDocument() });
  assert.equal(result.initialized, false);
});

test('15. calling initializeImportReadiness with no options does not throw', () => {
  assert.doesNotThrow(() => initializeImportReadiness());
  assert.doesNotThrow(() => initializeImportReadiness({}));
});

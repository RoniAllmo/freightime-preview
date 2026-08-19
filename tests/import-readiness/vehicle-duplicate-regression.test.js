/**
 * Vehicle-installation duplicate-question regression tests (mission
 * requirement: "Preserve the negative vehicle scenario ... add
 * regression tests proving vehicle installation is not asked twice
 * after explicit confirmation, car organizer does not activate the
 * installed-vehicle rule, phone holder does not activate it, vehicle
 * headlamp can activate it after confirmation").
 *
 * Investigation finding (documented here, not just asserted): there is
 * no existing structured core field equivalent to "confirmed installed
 * as part of the vehicle" -- only broader signals (free text, product
 * family) that also cover the negative case (a car organizer, a phone
 * holder). Both a car organizer and a vehicle headlamp description
 * contain the word "רכב" and therefore both correctly surface the
 * confirmation question (`installedAsPartOfVehicle`) -- per the
 * mission's own guidance: "Maintain the question when free text merely
 * contains the word 'רכב'". Auto-answering from product family/free
 * text alone would risk silently flipping the car-organizer negative
 * case, so this question is intentionally NOT reused/auto-resolved.
 * These tests lock in that this is correct, not an oversight: the
 * question appears for both, but only an explicit "כן" answer ever
 * activates the vehicle-installed-product signal.
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

function collectAllText(element) {
  const own = element.textContent ? [element.textContent] : [];
  const fromChildren = (element.children ?? []).flatMap((child) => collectAllText(child));
  return own.concat(fromChildren);
}

/** Drives the existing-importer route up to (and including) the first
 * live regulatory question, using the given product name/description. */
function driveToFirstRegulatoryQuestion(registry, radios, { productName, description, use }) {
  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'commercial');
  registry.get('readinessNextButton').dispatch('click');

  selectRadio(radios, 'irExperience', 'prior_importer');
  registry.get('readinessNextButton').dispatch('click');

  registry.get('irProductName').value = productName;
  registry.get('irCommercialDescription').value = description;
  registry.get('irIntendedUse').value = use;
  registry.get('readinessNextButton').dispatch('click'); // -> productContext
  registry.get('readinessNextButton').dispatch('click'); // -> directly to the focused-check phase (redundant focus-area screen removed)
}

function answerRadioQuestion(host, value) {
  const fieldset = host.children[0];
  const row = fieldset.children.find((c) => c.tagName === 'div');
  const label = row.children.find((l) => l.children[0].getAttribute('value') === value);
  const input = label.children[0];
  input.checked = true;
  input.dispatch('change');
  return fieldset;
}

test('vehicle duplicate: car organizer ("ארגונית לרכב") surfaces the installation-confirmation question but does not auto-activate the vehicle signal', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToFirstRegulatoryQuestion(registry, radios, {
    productName: 'ארגונית לרכב',
    description: 'ארגונית אחסון לתא המטען',
    use: 'סידור חפצים ברכב',
  });

  const host = registry.get('irRegulatoryQuestionHost');
  const fieldset = host.children[0];
  assert.ok(fieldset, 'the vehicle-installation confirmation question must still be offered for a vehicle-related free-text description');
  const legend = fieldset.children.find((c) => c.tagName === 'legend');
  assert.equal(legend?.textContent, 'האם המוצר מיועד להתקנה כחלק מהרכב?');

  // Answering "לא" (the correct answer for a loose organizer) must not activate the rule.
  answerRadioQuestion(host, 'no');
  registry.get('readinessNextButton').dispatch('click');

  // A "לא" answer excludes the rule, so the scheduler has nothing left
  // to ask about vehicles -- but another hinted category could still
  // have its own unrelated question pending. Answer through any such
  // question with a safe negative/unknown choice until the result renders.
  let guard = 0;
  while (registry.get('readinessResult').hidden && guard < 5) {
    const pendingHost = registry.get('irRegulatoryQuestionHost');
    const pendingFieldset = pendingHost.children[0];
    assert.ok(pendingFieldset, 'expected either the result or another pending question, found neither');
    const pendingLegend = pendingFieldset.children.find((c) => c.tagName === 'legend');
    assert.notEqual(pendingLegend?.textContent, 'האם המוצר מיועד להתקנה כחלק מהרכב?', 'the installation question must never be asked twice in one journey');
    const pendingRow = pendingFieldset.children.find((c) => c.tagName === 'div');
    const noOrUnknown = pendingRow.children.find((l) => ['no', 'unknown'].includes(l.children[0].getAttribute('value')));
    const chosen = noOrUnknown ?? pendingRow.children[0];
    answerRadioQuestion(pendingHost, chosen.children[0].getAttribute('value'));
    registry.get('readinessNextButton').dispatch('click');
    guard += 1;
  }

  assert.equal(registry.get('readinessResult').hidden, false);
  const resultText = collectAllText(registry.get('readinessResult')).join(' | ');
  assert.ok(!resultText.includes('נדרש לבדוק דרישות תחבורה למוצר המיועד לרכב'), 'a car organizer answered "לא" must never produce the vehicle-installed-product signal');
});

test('vehicle duplicate: vehicle headlamp ("פנס קדמי לרכב") with explicit installation+lighting wording skips both follow-up questions and activates the signal directly (product-owner acceptance finding: redundant question removal)', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToFirstRegulatoryQuestion(registry, radios, {
    productName: 'פנס קדמי לרכב',
    description: 'פנס קדמי להתקנה ברכב פרטי',
    use: 'תאורה קדמית',
  });

  // The description already explicitly states both installation
  // ("להתקנה ברכב") and function ("פנס") -- neither question is
  // redundant to ask, so the result must render directly with no
  // regulatory-followup phase at all.
  assert.equal(registry.get('readinessResult').hidden, false, 'expected the result to render directly, with neither vehicle follow-up question asked');
  const resultText = collectAllText(registry.get('readinessResult')).join(' | ');
  assert.ok(resultText.includes('נדרש לבדוק דרישות תחבורה למוצר המיועד לרכב'), 'explicit installation+lighting wording must still produce the vehicle-installed-product signal');
});

test('vehicle duplicate: vehicle headlamp with ambiguous installation ("פנס לרכב" alone) still asks the installation-confirmation question once, but never the function question (lighting is already explicit)', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToFirstRegulatoryQuestion(registry, radios, {
    productName: 'פנס לרכב',
    description: 'פנס לרכב מיובא',
    use: 'תאורה',
  });

  const host = registry.get('irRegulatoryQuestionHost');
  const fieldset = host.children[0];
  const legend = fieldset.children.find((c) => c.tagName === 'legend');
  assert.equal(legend?.textContent, 'האם המוצר מיועד להתקנה כחלק מהרכב?', 'installation is not explicit in "פנס לרכב" alone, so it is still the one genuinely necessary question');

  answerRadioQuestion(host, 'yes');
  registry.get('readinessNextButton').dispatch('click');

  // The function-category question must never appear -- "פנס" already
  // establishes lighting.
  assert.equal(registry.get('readinessResult').hidden, false, 'expected the result to render directly after the installation question, with no function-category question');
  const resultText = collectAllText(registry.get('readinessResult')).join(' | ');
  assert.ok(resultText.includes('נדרש לבדוק דרישות תחבורה למוצר המיועד לרכב'));
});

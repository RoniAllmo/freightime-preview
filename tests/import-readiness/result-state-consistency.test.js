/**
 * Result-state consistency regression tests.
 *
 * Product defect (audit finding, fixed here): a result could contain a
 * valid, matched professional/regulatory direction and ALSO display a
 * message stating that no direction/positive result was identified --
 * two mutually exclusive states shown at once. Root-caused to two
 * places independently deciding "is there a direction" from a
 * narrower, sometimes-stale signal instead of the one canonical
 * result-state resolver (see js/import-readiness/result-state.js):
 *   1. personal-import-rules.js / first-commercial-import-rules.js
 *      called evaluateRegulatorySignals() without the live follow-up
 *      answers, so a signal the controller's own (correct) evaluation
 *      already matched could still be reported as unmatched in the
 *      result's own "מידע נוסף והסברים" section.
 *   2. import-readiness-controller.js's `noFocusedDirection` only
 *      checked the 5-detailed-rule engine, never the product-family
 *      matrix -- so every matrix-only match (cosmetics, eggs,
 *      walkie-talkie, ...) showed a contradictory "no focused
 *      direction identified" note in the result brief, and
 *      renderNoMatchBlock() rendered its own separate contradictory
 *      section, regardless of the canonical finding already shown
 *      above it.
 *
 * Uses the same hand-rolled fake-DOM controller-driving pattern
 * already used throughout tests/import-readiness/.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeImportReadiness } from '../../js/import-readiness/import-readiness-controller.js';

const NO_MATCH_MESSAGE_TEXT = 'לא זוהה כיוון בדיקה מקצועי במאגר המצומצם שנבדק.';
const NO_FOCUSED_DIRECTION_TEXT = 'לא זוהה כיוון בדיקה ממוקד על בסיס הפרטים שנמסרו.';
const NO_POSITIVE_SIGNAL_TEXT = 'לא זוהה תחום חוקיות יבוא חיובי במטריצה עבור המשפחה שנבחרה.';
const UNKNOWN_FAMILY_TEXT = 'לא זוהתה משפחת מוצר מתאימה מתוך המידע שנמסר.';

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

function currentRegulatoryFieldset(registry) {
  const host = registry.get('irRegulatoryQuestionHost');
  return host.children.find((c) => c.tagName === 'fieldset') ?? null;
}

function collectAllText(element) {
  const own = element.textContent ? [element.textContent] : [];
  const fromChildren = (element.children ?? []).flatMap((child) => collectAllText(child));
  return own.concat(fromChildren);
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
  return collectAllText(registry.get('readinessResult')).join(' | ');
}

function driveCargoDamage(registry) {
  registry.get('readinessStartButton').dispatch('click');
  registry.get('readinessProblemShortcutButton').dispatch('click');
  registry.get('irProblemType').value = 'cargo_or_container_damage';
  registry.get('readinessNextButton').dispatch('click');
  registry.get('readinessNextButton').dispatch('click');
  return collectAllText(registry.get('readinessResult')).join(' | ');
}

// -- A/C: detailed direction (with or without combined matrix) --

test('1. a positive DETAILED result (glass) excludes all no-direction messaging', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  const text = driveCommercial(registry, radios, { productName: 'כוס זכוכית לשתיה' });

  assert.ok(text.includes('נדרש לבדוק דרישות תקינה לכלי זכוכית'), 'expected the detailed glass finding');
  assert.ok(!text.includes(NO_MATCH_MESSAGE_TEXT));
  assert.ok(!text.includes(NO_FOCUSED_DIRECTION_TEXT));
  assert.ok(!text.includes(UNKNOWN_FAMILY_TEXT));
  assert.ok(!text.includes(NO_POSITIVE_SIGNAL_TEXT));
});

test('2. a positive DETAILED result (electrical) excludes all no-direction messaging', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  const text = driveCommercial(registry, radios, { productName: 'מכשיר חשמלי עם תקע' });

  assert.ok(text.includes('נדרש לבדוק דרישות תקינה למוצר חשמלי'));
  assert.ok(!text.includes(NO_MATCH_MESSAGE_TEXT));
  assert.ok(!text.includes(NO_FOCUSED_DIRECTION_TEXT));
});

test('3. a positive DETAILED result (vehicle headlamp) excludes all no-direction messaging', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  const text = driveCommercial(registry, radios, { productName: 'פנס קדמי לרכב' });

  assert.ok(text.includes('נדרש לבדוק דרישות תחבורה למוצר המיועד לרכב'));
  assert.ok(!text.includes(NO_MATCH_MESSAGE_TEXT));
  assert.ok(!text.includes(NO_FOCUSED_DIRECTION_TEXT));
});

// -- B: matched matrix-only direction --

test('4. a positive MATRIX result (fresh eggs, health+agriculture) excludes all no-direction messaging', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  const text = driveCommercial(registry, radios, { productName: 'ביצים טריות' });

  assert.ok(text.includes('משרד הבריאות') && text.includes('משרד החקלאות'));
  assert.ok(!text.includes(NO_MATCH_MESSAGE_TEXT));
  assert.ok(!text.includes(NO_FOCUSED_DIRECTION_TEXT));
  assert.ok(!text.includes(UNKNOWN_FAMILY_TEXT));
  assert.ok(!text.includes(NO_POSITIVE_SIGNAL_TEXT));
});

test('5. a positive MATRIX result (walkie-talkie, standards+communications) excludes all no-direction messaging', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  const text = driveCommercial(registry, radios, { productName: 'ווקי טוקי' });

  assert.ok(!text.includes(NO_MATCH_MESSAGE_TEXT));
  assert.ok(!text.includes(NO_FOCUSED_DIRECTION_TEXT));
});

test('6. a positive MATRIX result (cosmetics, health direction) excludes all no-direction messaging', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  const text = driveCommercial(registry, radios, { productName: 'תמרוקים ובשמים' });

  assert.ok(text.includes('משרד הבריאות'));
  assert.ok(!text.includes(NO_MATCH_MESSAGE_TEXT));
  assert.ok(!text.includes(NO_FOCUSED_DIRECTION_TEXT));
});

// -- D: recognized family, no positive matrix --

test('7. a RECOGNIZED_NO_POSITIVE result (clothing) shows only its own message, never the unknown-family message', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  const text = driveCommercial(registry, radios, { productName: 'חולצה', description: 'ביגוד יומיומי' });

  assert.ok(text.includes(NO_POSITIVE_SIGNAL_TEXT));
  assert.ok(!text.includes(UNKNOWN_FAMILY_TEXT));
});

// -- E: unknown family --

test('8. an UNKNOWN_FAMILY result shows only its own message, never the recognized-no-positive message', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  const text = driveCommercial(registry, radios, { productName: 'קססססס', description: 'מוצר לא ידוע לחלוטין' });

  assert.ok(text.includes(UNKNOWN_FAMILY_TEXT));
  assert.ok(!text.includes(NO_POSITIVE_SIGNAL_TEXT));
});

// -- F: operational result --

test('9. an OPERATIONAL result (cargo damage) never shows any regulatory no-direction message', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  const text = driveCargoDamage(registry);

  assert.ok(!text.includes(NO_MATCH_MESSAGE_TEXT));
  assert.ok(!text.includes(NO_FOCUSED_DIRECTION_TEXT));
  assert.ok(!text.includes(UNKNOWN_FAMILY_TEXT));
  assert.ok(!text.includes(NO_POSITIVE_SIGNAL_TEXT));
});

test('10. mutual exclusivity: a matched result (states A/B/C) never shows ANY no-direction-class message', () => {
  // D and E are legitimately allowed to show their own no-direction
  // wording (tested in 7/8 above, including that they never show each
  // OTHER's wording) -- this test asserts the other half: a genuinely
  // matched result (detailed, matrix, or combined) must show none of
  // these messages at all, not merely "at most one."
  const matchedScenarios = [
    { productName: 'כוס זכוכית לשתיה' }, // A: detailed
    { productName: 'ביצים טריות' }, // B: matrix
    { productName: 'מכשיר חשמלי עם תקע' }, // A: detailed
  ];
  const messages = [NO_MATCH_MESSAGE_TEXT, NO_FOCUSED_DIRECTION_TEXT, UNKNOWN_FAMILY_TEXT, NO_POSITIVE_SIGNAL_TEXT];
  for (const scenario of matchedScenarios) {
    const { root, registry, radios } = buildFakeRoot();
    initializeImportReadiness({ root, documentRef: createFakeDocument() });
    const text = driveCommercial(registry, radios, scenario);
    const present = messages.filter((m) => text.includes(m));
    assert.equal(present.length, 0, `expected zero no-direction messages for ${JSON.stringify(scenario)}, found: ${JSON.stringify(present)}`);
  }
});

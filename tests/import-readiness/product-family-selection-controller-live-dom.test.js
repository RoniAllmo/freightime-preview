/**
 * Live-DOM (hand-rolled fake DOM, no real browser) controller-level
 * tests for explicit product-family checkbox selection state: multiple
 * selections, order independence, Edit Answers removing a selection,
 * New Assessment, and Reset -- see product-family-selection-mapping.js
 * and product-family-result.js for the underlying precedence logic
 * these exercise end-to-end through the real controller.
 *
 * Uses the same hand-rolled fake DOM style as
 * vehicle-mains-reused-answer-suppression.test.js.
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
    removeAttribute() {},
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

function createFakeDocument() {
  return {
    createElement(tagName) {
      const e = createFakeElement(undefined);
      e.tagName = tagName;
      return e;
    },
  };
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
  'irRegulatoryQuestionHost', 'readinessSection',
];

function buildFakeRoot(familyValues) {
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
  // form.reset() -- the exact mechanism resetAll() uses -- must clear
  // every registered field AND every family checkbox, same as a real
  // native <form>.
  registry.get('readinessForm').reset = () => {
    for (const id of TEXT_FIELD_IDS) registry.get(id).value = '';
    for (const id of CHECKBOX_FIELD_IDS) registry.get(id).checked = false;
    for (const group of radios.values()) group.forEach((r) => { r.checked = false; });
    for (const checkbox of productFamilyCheckboxes) checkbox.checked = false;
  };

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

  const productFamilyCheckboxes = familyValues.map((value) => {
    const el = createFakeElement(`irProductFamily_${value}`, { value, checked: false });
    el.name = 'irProductFamily';
    return el;
  });

  const root = {
    querySelector(selector) {
      const id = selector.replace('#', '');
      return registry.get(id) ?? null;
    },
    querySelectorAll(selector) {
      const match = selector.match(/input\[name="([^"]+)"\]/);
      if (match) {
        if (match[1] === 'irProductFamily') return productFamilyCheckboxes;
        if (match[1] === 'irMaterial') return [];
        return radios.get(match[1]) ?? [];
      }
      return [];
    },
  };

  return { root, registry, radios, productFamilyCheckboxes };
}

function selectRadio(radios, name, value) {
  const group = radios.get(name);
  group.forEach((r) => { r.checked = r.value === value; });
  const target = group.find((r) => r.value === value);
  if (target) target.dispatch('change');
}

function check(checkboxes, value, checked = true) {
  const box = checkboxes.find((c) => c.value === value);
  box.checked = checked;
  box.dispatch('change');
}

function collectAllText(el) {
  const texts = [];
  if (typeof el.textContent === 'string' && el.textContent) texts.push(el.textContent);
  for (const child of el.children || []) texts.push(...collectAllText(child));
  return texts;
}

function currentRegulatoryFieldset(registry) {
  const host = registry.get('irRegulatoryQuestionHost');
  return (host.children || []).find((c) => c.tagName === 'fieldset') ?? null;
}

/** Finds the ephemeral "עריכת תשובות" (Edit Answers) button rendered
 * inside the result -- it's created fresh on every render and never
 * separately registered by this harness, so it must be located by its
 * exact, approved button text within the result tree. */
function findEditAnswersButton(resultEl) {
  function walk(el) {
    if (el.textContent === 'עריכת תשובות' && typeof el.dispatch === 'function') return el;
    for (const child of el.children || []) {
      const found = walk(child);
      if (found) return found;
    }
    return null;
  }
  return walk(resultEl);
}

function driveToProductContext(registry, radios) {
  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'commercial');
  registry.get('readinessNextButton').dispatch('click');
  selectRadio(radios, 'irExperience', 'first_time');
  registry.get('readinessNextButton').dispatch('click');
  registry.get('irProductName').value = 'מוצר לבדיקה';
  registry.get('irCommercialDescription').value = 'מוצר מסחרי לבדיקה';
  registry.get('irIntendedUse').value = 'שימוש מסחרי';
  registry.get('readinessNextButton').dispatch('click'); // -> productContext
}

/**
 * Continues from productContext to the result, answering any technical-
 * characteristics/regulatory-followup questions a selected family (e.g.
 * electrical/battery families gate an electrical follow-up layer) may
 * have revealed -- neutrally ("no"/first option), same spirit as a real
 * user working through the form. No-ops once the result is visible.
 */
function advanceToResult(registry, radios) {
  for (let i = 0; i < 6; i++) {
    if (registry.get('readinessResult').hidden === false) return;
    for (const name of ['irConnectsToPower', 'irHasBattery', 'irBatteryIsRechargeable', 'irMaterialTouchesFood', 'irMaterialHasCoating']) {
      const group = radios.get(name);
      if (group && !group.some((r) => r.checked)) selectRadio(radios, name, 'no');
    }
    registry.get('readinessNextButton').dispatch('click');
  }
}

function resultText(registry) {
  return collectAllText(registry.get('readinessResult')).join(' | ');
}

test('1. multiple selections, text supports neither -> information-needed wording, not "no family-related info" wording', () => {
  const { root, registry, radios, productFamilyCheckboxes } = buildFakeRoot(['cosmetics_and_beauty', 'batteries_or_battery_containing']);
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToProductContext(registry, radios);
  check(productFamilyCheckboxes, 'cosmetics_and_beauty');
  check(productFamilyCheckboxes, 'batteries_or_battery_containing');
  advanceToResult(registry, radios);

  assert.equal(registry.get('readinessResult').hidden, false);
  const text = resultText(registry);
  assert.ok(text.includes('משפחת המוצר שנבחרה כוללת כמה אפשרויות'), 'must show the truthful selection-unresolved wording');
  assert.ok(!text.includes('לא זוהתה משפחת מוצר מתאימה מתוך המידע שנמסר'), 'must never claim no info was given');
});

test('2. multiple selections, same selections in reversed checkbox array order -> identical result', () => {
  const a = buildFakeRoot(['cosmetics_and_beauty', 'batteries_or_battery_containing']);
  initializeImportReadiness({ root: a.root, documentRef: createFakeDocument() });
  driveToProductContext(a.registry, a.radios);
  check(a.productFamilyCheckboxes, 'cosmetics_and_beauty');
  check(a.productFamilyCheckboxes, 'batteries_or_battery_containing');
  advanceToResult(a.registry, a.radios);

  const b = buildFakeRoot(['batteries_or_battery_containing', 'cosmetics_and_beauty']);
  initializeImportReadiness({ root: b.root, documentRef: createFakeDocument() });
  driveToProductContext(b.registry, b.radios);
  check(b.productFamilyCheckboxes, 'batteries_or_battery_containing');
  check(b.productFamilyCheckboxes, 'cosmetics_and_beauty');
  advanceToResult(b.registry, b.radios);

  assert.equal(resultText(a.registry), resultText(b.registry));
});

test('3. New Assessment clears explicit family checkbox state (shares resetAll with the Reset button)', () => {
  const { root, registry, radios, productFamilyCheckboxes } = buildFakeRoot(['batteries_or_battery_containing']);
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToProductContext(registry, radios);
  check(productFamilyCheckboxes, 'batteries_or_battery_containing');
  advanceToResult(registry, radios);
  assert.equal(registry.get('readinessResult').hidden, false);

  // The "New Assessment" (בדיקה חדשה) button calls the exact same
  // resetAll({confirmIfSubstantial:false}) as readinessResetButton
  // (see import-readiness-controller.js) -- exercised directly here via
  // the registered reset button, since the New Assessment button itself
  // is an ephemeral DOM node created only inside the rendered result
  // tree and not separately registered by this harness.
  registry.get('readinessResetButton').dispatch('click');

  assert.equal(registry.get('readinessForm').hidden, true);
  assert.equal(registry.get('readinessResult').hidden, true);
  assert.equal(productFamilyCheckboxes[0].checked, false, 'form.reset() must clear the family checkbox');
});

test('4. Reset after multiple selections clears all of them -- a fresh assessment never inherits stale family state', () => {
  const { root, registry, radios, productFamilyCheckboxes } = buildFakeRoot(['cosmetics_and_beauty', 'batteries_or_battery_containing']);
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToProductContext(registry, radios);
  check(productFamilyCheckboxes, 'cosmetics_and_beauty');
  check(productFamilyCheckboxes, 'batteries_or_battery_containing');
  advanceToResult(registry, radios);

  registry.get('readinessResetButton').dispatch('click');
  for (const checkbox of productFamilyCheckboxes) {
    assert.equal(checkbox.checked, false);
  }

  // Start a fresh assessment with neutral text and no family selected:
  // must behave exactly like the no-selection path, never leaking the
  // previous multi-selection's restriction.
  registry.get('readinessStartButton').dispatch('click');
  driveToProductContext(registry, radios);
  advanceToResult(registry, radios);
  assert.equal(registry.get('readinessResult').hidden, false);
  const text = resultText(registry);
  assert.ok(text.includes('לא זוהתה משפחת מוצר מתאימה מתוך המידע שנמסר'), 'with truly nothing selected and neutral text, the plain unknown-family wording applies');
});

test('5. Edit Answers then unchecking one of two selections: the removed selection does not survive into the next computation', () => {
  // Uses animal_origin_products (still a genuinely single-candidate,
  // forced checkbox) rather than cosmetics_and_beauty, which became
  // ambiguous (cosmetics vs. perfume) as of Wave 2 completion.
  const { root, registry, radios, productFamilyCheckboxes } = buildFakeRoot(['animal_origin_products', 'batteries_or_battery_containing']);
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToProductContext(registry, radios);
  check(productFamilyCheckboxes, 'animal_origin_products');
  check(productFamilyCheckboxes, 'batteries_or_battery_containing');
  advanceToResult(registry, radios);
  assert.equal(registry.get('readinessResult').hidden, false);

  // Click the real "עריכת תשובות" (Edit Answers) affordance -- returns
  // to the form with the current selections intact -- then remove one
  // of the two selections and recompute.
  const editButton = findEditAnswersButton(registry.get('readinessResult'));
  assert.ok(editButton, 'the Edit Answers button must be present in the result');
  editButton.dispatch('click');
  assert.equal(registry.get('readinessForm').hidden, false, 'Edit Answers must return to the form');
  check(productFamilyCheckboxes, 'batteries_or_battery_containing', false);
  advanceToResult(registry, radios);

  assert.equal(registry.get('readinessResult').hidden, false);
  const text = resultText(registry);
  // Only animal_origin_products remains selected (unambiguous, single
  // selection) -- authoritative, batteries must not still influence
  // the result.
  assert.ok(text.includes('משפחת המוצר שזוהתה: מזון מן החי'));
});

test('6. regression (code-review finding): selection_unresolved combined with an excluded detailed rule\'s own no-match explanation still renders SOMETHING, never a blank result', () => {
  // An ambiguous checkbox restricted to a candidate set the free text
  // doesn't match at all (electrical, while the text is glass-related)
  // produces selection_unresolved; the SAME text hints the glass
  // detailed rule, which is then explicitly excluded ("לא") -- the
  // matrix's own message is correctly suppressed by
  // resolveCanonicalRegulatoryContent (the excluded rule's no-match
  // block already explains the result), so renderNoMatchBlock must be
  // the one thing left to actually render it.
  const { root, registry, radios, productFamilyCheckboxes } = buildFakeRoot(['electrical_and_electronics']);
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'commercial');
  registry.get('readinessNextButton').dispatch('click');
  selectRadio(radios, 'irExperience', 'first_time');
  registry.get('readinessNextButton').dispatch('click');
  registry.get('irProductName').value = 'כוס זכוכית לשתיה';
  registry.get('readinessNextButton').dispatch('click'); // -> productContext
  check(productFamilyCheckboxes, 'electrical_and_electronics');
  registry.get('readinessNextButton').dispatch('click'); // -> regulatoryFollowup (glass question)

  // Answer "לא" (no) to the glass direct-food-contact question --
  // excludes the rule rather than matching it.
  let rounds = 0;
  while (registry.get('readinessResult').hidden && rounds < 6) {
    const fieldset = currentRegulatoryFieldset(registry);
    if (!fieldset) break;
    const row = fieldset.children.find((c) => c.tagName === 'div');
    const label = row.children.find((l) => l.children[0].getAttribute('value') === 'no') ?? row.children[0];
    label.children[0].checked = true;
    label.children[0].dispatch('change');
    registry.get('readinessNextButton').dispatch('click');
    rounds += 1;
  }

  assert.equal(registry.get('readinessResult').hidden, false);
  const text = resultText(registry);
  assert.ok(text.length > 0, 'the result must never be silently blank');
  assert.ok(
    text.includes('לא זוהה כיוון בדיקה מקצועי במאגר המצומצם שנבדק'),
    'the detailed rule\'s own no-match explanation must render since the matrix\'s "selection unresolved" message is suppressed alongside it',
  );
  assert.ok(!text.includes('משפחת המוצר שנבחרה כוללת כמה אפשרויות'), 'the two explanations must never render together');
});

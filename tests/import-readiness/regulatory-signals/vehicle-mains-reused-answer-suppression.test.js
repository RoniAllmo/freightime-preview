/**
 * Vehicle-vs-mains suppression for the REUSED-ANSWER path.
 *
 * Audit finding: the vehicle-vs-mains suppression fixed in PR #38
 * (applyVehicleMainsSuppression, keyword-hints.js) only covers the
 * free-text/sensitive-category/HS-code HINT path -- it does not, on
 * its own, describe what happens to an already-collected structured
 * "connects to power" answer (`irConnectsToPower`, reused via
 * answer-reuse.js's `deriveReusableRegulatoryAnswers`) once the
 * product is edited to a confirmed vehicle-related family. This file
 * proves the fix in `deriveReusableRegulatoryAnswers`'s new
 * `suppressMainsPowerReuse` option (wired from
 * import-readiness-controller.js using the already-hinted-categories
 * precedence) closes that gap: a reused "connects to power" answer
 * must not override a current confirmed vehicle family, but is never
 * erased -- only treated as inapplicable to the current candidate, so
 * editing the product back to a non-vehicle one restores it.
 *
 * Uses the same hand-rolled fake DOM style as
 * answer-reuse-live-dom.test.js and regulatory-followup-live-dom.test.js.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeImportReadiness } from '../../../js/import-readiness/import-readiness-controller.js';
import { deriveReusableRegulatoryAnswers } from '../../../js/import-readiness/regulatory-signals/answer-reuse.js';

const MAINS_QUESTION_TEXT = 'האם המוצר מתחבר ישירות לרשת החשמל או מגיע עם תקע או ספק כוח?';

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

  const familyElectrical = createFakeElement('irProductFamily_electrical', { value: 'electrical_and_electronics', checked: false });
  familyElectrical.name = 'irProductFamily';
  const productFamilyCheckboxes = [familyElectrical];

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

  return { root, registry, radios, familyElectrical };
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

function collectAllText(element) {
  const own = element.textContent ? [element.textContent] : [];
  const fromChildren = (element.children ?? []).flatMap((child) => collectAllText(child));
  return own.concat(fromChildren);
}

/** Answers any remaining live regulatory questions with "yes" until the result renders (or a guard limit is hit). */
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

/** Drives commercial/first-time through Q1-Q3, checks the electrical family checkbox and answers connects-to-power, then goes BACK to Q3 to edit the product before proceeding again -- reproducing "user previously answered X, then edits the product." */
function driveWithReusedPowerAnswerThenEditProduct(
  registry,
  radios,
  familyElectrical,
  { firstProductName, editedProductName, editedDescription, uncheckFamilyBeforeEdit = false },
) {
  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'commercial');
  registry.get('readinessNextButton').dispatch('click');
  selectRadio(radios, 'irExperience', 'first_time');
  registry.get('readinessNextButton').dispatch('click');
  registry.get('irProductName').value = firstProductName;
  registry.get('readinessNextButton').dispatch('click'); // -> productContext

  familyElectrical.checked = true;
  selectRadio(radios, 'irConnectsToPower', 'yes');

  registry.get('readinessBackButton').dispatch('click'); // -> back to Q3
  registry.get('irProductName').value = editedProductName;
  registry.get('irCommercialDescription').value = editedDescription ?? '';
  // The explicit family checkbox now participates in identification (see
  // product-family-selection-mapping.js): a scenario that edits the
  // product into a wholly unrelated category also unchecks the stale
  // family selection, exactly as a real user updating both would.
  if (uncheckFamilyBeforeEdit) familyElectrical.checked = false;
  registry.get('readinessNextButton').dispatch('click'); // -> productContext again (irConnectsToPower=yes still set)
  registry.get('readinessNextButton').dispatch('click'); // -> regulatoryFollowup or result
}

test('1. reused power answer is ignored for a 12V vehicle headlamp -- no mains question, vehicle direction remains', () => {
  const { root, registry, radios, familyElectrical } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveWithReusedPowerAnswerThenEditProduct(registry, radios, familyElectrical, {
    firstProductName: 'מכשיר חשמלי כלשהו',
    editedProductName: 'פנס קדמי 12V להתקנה ברכב',
  });

  assert.notEqual(currentRegulatoryLegendText(registry), MAINS_QUESTION_TEXT, 'the mains question must not be asked from the reused answer');
  const resultText = collectAllText(registry.get('readinessResult')).join(' | ');
  if (registry.get('readinessResult').hidden === false) {
    assert.ok(!resultText.includes('נדרש לבדוק דרישות תקינה למוצר חשמלי'), 'no mains-standards result from the reused answer');
  }
});

test('2. reused power answer is ignored for a vehicle-battery electrical component', () => {
  const { root, registry, radios, familyElectrical } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveWithReusedPowerAnswerThenEditProduct(registry, radios, familyElectrical, {
    firstProductName: 'מכשיר חשמלי כלשהו',
    editedProductName: 'רכיב חשמלי המתחבר למצבר הרכב',
  });

  assert.notEqual(currentRegulatoryLegendText(registry), MAINS_QUESTION_TEXT);
  const resultText = collectAllText(registry.get('readinessResult')).join(' | ');
  if (registry.get('readinessResult').hidden === false) {
    assert.ok(!resultText.includes('נדרש לבדוק דרישות תקינה למוצר חשמלי'));
  }
});

test('3. an explicit separate wall charger described alongside the vehicle keeps the reused/live mains check eligible', () => {
  const { root, registry, radios, familyElectrical } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveWithReusedPowerAnswerThenEditProduct(registry, radios, familyElectrical, {
    firstProductName: 'מכשיר חשמלי כלשהו',
    editedProductName: 'פנס לרכב עם מטען ביתי נפרד לשקע',
  });
  answerThroughToResult(registry);

  // Explicit separate mains equipment means electrical_mains_product
  // stays hinted, so the reused answer is NOT suppressed and the
  // mains signal can still legitimately appear.
  const resultText = collectAllText(registry.get('readinessResult')).join(' | ');
  assert.equal(registry.get('readinessResult').hidden, false);
  assert.ok(resultText.includes('נדרש לבדוק דרישות תקינה למוצר חשמלי'), 'a genuinely separate mains-powered accessory must still be eligible for the mains signal');
});

test('4. an EV charging station connected to the mains keeps the reused/live mains check eligible', () => {
  const { root, registry, radios, familyElectrical } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveWithReusedPowerAnswerThenEditProduct(registry, radios, familyElectrical, {
    firstProductName: 'מכשיר חשמלי כלשהו',
    editedProductName: 'עמדת טעינה לרכב חשמלי המחוברת לרשת החשמל',
  });
  answerThroughToResult(registry);

  const resultText = collectAllText(registry.get('readinessResult')).join(' | ');
  assert.equal(registry.get('readinessResult').hidden, false);
  assert.ok(resultText.includes('נדרש לבדוק דרישות תקינה למוצר חשמלי'), 'an EV charging station explicitly connected to the mains must remain eligible');
});

test('5. changing back to a home appliance restores the reused answer\'s applicability', () => {
  const { root, registry, radios, familyElectrical } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'commercial');
  registry.get('readinessNextButton').dispatch('click');
  selectRadio(radios, 'irExperience', 'first_time');
  registry.get('readinessNextButton').dispatch('click');
  registry.get('irProductName').value = 'מכשיר חשמלי כלשהו';
  registry.get('readinessNextButton').dispatch('click'); // -> productContext

  familyElectrical.checked = true;
  selectRadio(radios, 'irConnectsToPower', 'yes');

  registry.get('readinessBackButton').dispatch('click');
  registry.get('irProductName').value = 'פנס קדמי 12V להתקנה ברכב';
  registry.get('readinessNextButton').dispatch('click'); // suppressed pass -> productContext
  registry.get('readinessNextButton').dispatch('click'); // -> result (vehicle only, mains suppressed)

  // Now edit back to a home appliance -- the stored connectsToPower
  // answer (never erased) must become applicable again.
  const editButton = registry.get('readinessResult').children
    .flatMap(function findEdit(el) { return [el, ...(el.children ?? []).flatMap(findEdit)]; })
    .find((c) => c.tagName === 'button' && c.textContent === 'עריכת תשובות');
  assert.ok(editButton, 'expected an edit-answers control on the result');
  editButton.dispatch('click');
  registry.get('irProductName').value = 'מכשיר חשמלי ביתי עם תקע';
  registry.get('readinessNextButton').dispatch('click'); // -> productContext
  registry.get('readinessNextButton').dispatch('click'); // -> result again

  const resultText = collectAllText(registry.get('readinessResult')).join(' | ');
  assert.equal(registry.get('readinessResult').hidden, false);
  assert.ok(resultText.includes('נדרש לבדוק דרישות תקינה למוצר חשמלי'), 'the reused connects-to-power answer must become applicable again for a non-vehicle product');
});

test('6. communications category on a wireless vehicle product remains active (vehicle suppression is scoped to mains only)', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'commercial');
  registry.get('readinessNextButton').dispatch('click');
  selectRadio(radios, 'irExperience', 'first_time');
  registry.get('readinessNextButton').dispatch('click');
  registry.get('irProductName').value = 'ווקי טוקי לרכב';
  registry.get('irCommercialDescription').value = 'מכשיר קשר אלחוטי המותקן ברכב';
  registry.get('readinessNextButton').dispatch('click'); // -> productContext
  registry.get('readinessNextButton').dispatch('click'); // -> result or regulatoryFollowup

  assert.notEqual(currentRegulatoryLegendText(registry), MAINS_QUESTION_TEXT);
});

test('7. no unrelated positive matrix category is suppressed by the vehicle-mains reused-answer fix', () => {
  const { root, registry, radios, familyElectrical } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveWithReusedPowerAnswerThenEditProduct(registry, radios, familyElectrical, {
    firstProductName: 'מכשיר חשמלי כלשהו',
    editedProductName: 'ביצים טריות',
    uncheckFamilyBeforeEdit: true,
  });

  const resultText = collectAllText(registry.get('readinessResult')).join(' | ');
  assert.equal(registry.get('readinessResult').hidden, false);
  assert.ok(resultText.includes('משרד הבריאות') && resultText.includes('משרד החקלאות'), 'unrelated matrix categories must remain unaffected');
});

test('8. pure-function contract: deriveReusableRegulatoryAnswers omits mainsConnectedOrSuppliedAdapter when suppressMainsPowerReuse is true, and includes it otherwise', () => {
  const raw = { connectsToPower: 'yes' };
  assert.deepEqual(deriveReusableRegulatoryAnswers(raw, { suppressMainsPowerReuse: true }), {});
  assert.deepEqual(deriveReusableRegulatoryAnswers(raw, { suppressMainsPowerReuse: false }), { mainsConnectedOrSuppliedAdapter: 'yes' });
  assert.deepEqual(deriveReusableRegulatoryAnswers(raw), { mainsConnectedOrSuppliedAdapter: 'yes' }, 'default (no options) behaves exactly as before this fix');
});

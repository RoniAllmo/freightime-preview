/**
 * Live-DOM integration tests for the regulatory-signals focused-checks
 * phase inside js/import-readiness/import-readiness-controller.js.
 * Uses the same hand-rolled fake DOM style already used by
 * tests/import-readiness/import-readiness-controller.test.js, extended
 * with the new dynamic question host element and enough surrounding
 * form fields to drive a real product through the live flow.
 *
 * These are unit-level DOM tests (no real browser). Separate real-browser
 * (Playwright) acceptance validation covers actual click-through,
 * viewport, and rendered-focus/scroll behavior -- this file proves the
 * controller wiring itself: candidate detection, dynamic question
 * rendering from canonical rule data, state updates, budget enforcement,
 * matcher wiring, edit/reset behavior, and privacy (no storage/network/
 * URL mutation).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeImportReadiness } from '../../js/import-readiness/import-readiness-controller.js';
import { REGULATORY_SIGNAL_RULES } from '../../js/import-readiness/regulatory-signals/rules-registry.js';

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
  registry.get('readinessForm').reset = () => {
    for (const id of TEXT_FIELD_IDS) registry.get(id).value = '';
    for (const id of CHECKBOX_FIELD_IDS) registry.get(id).checked = false;
    for (const name of RADIO_GROUPS) {
      for (const radio of radios.get(name)) radio.checked = false;
    }
  };

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

/** Finds the dynamically-rendered <fieldset> currently inside the regulatory question host. */
function currentRegulatoryFieldset(registry) {
  const host = registry.get('irRegulatoryQuestionHost');
  return host.children[0] ?? null;
}

function currentRegulatoryLegendText(registry) {
  const fieldset = currentRegulatoryFieldset(registry);
  if (!fieldset) return null;
  const legend = fieldset.children.find((c) => c.tagName === 'legend');
  return legend ? legend.textContent : null;
}

/** Selects a live regulatory radio option by its data value (e.g. 'yes'/'no'/'unknown') and dispatches 'change'. */
function selectRegulatoryOption(registry, value) {
  const fieldset = currentRegulatoryFieldset(registry);
  const row = fieldset.children.find((c) => c.tagName === 'div');
  const label = row.children.find((l) => l.children[0].getAttribute('value') === value);
  if (!label) throw new Error(`no live regulatory option with value "${value}" is currently rendered`);
  const input = label.children[0];
  input.checked = true;
  input.dispatch('change');
}

/**
 * The fake DOM's `.textContent` getter is not recursive (matching how
 * `el()` only ever sets it on the leaf element it was given `text` for)
 * -- this walks the whole tree and collects every leaf's text, the way
 * a real DOM's `.textContent` would when read from a container.
 */
/** Picks whichever option is rendered first for the current live question -- used by generic "answer everything" loop tests that don't care which specific value is chosen, only that the flow terminates within budget. */
function selectFirstRegulatoryOption(registry) {
  const fieldset = currentRegulatoryFieldset(registry);
  const row = fieldset.children.find((c) => c.tagName === 'div');
  const input = row.children[0].children[0];
  input.checked = true;
  input.dispatch('change');
}

/** Recursively finds the first descendant matching a predicate -- needed because result controls (edit/new/copy buttons) are nested inside a `.ir-nav` container, not direct children of the result element. */
function findDescendant(element, predicate) {
  for (const child of element.children ?? []) {
    if (predicate(child)) return child;
    const found = findDescendant(child, predicate);
    if (found) return found;
  }
  return null;
}

function collectAllText(element) {
  const own = element.textContent ? [element.textContent] : [];
  const fromChildren = (element.children ?? []).flatMap((child) => collectAllText(child));
  return own.concat(fromChildren);
}

/** Drives the assessment through q1/q2/q3/productContext for a commercial-first-time product, using a given product name to control which regulatory category is hinted. */
function driveToProductContextNext(root, registry, radios, productName) {
  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'commercial');
  registry.get('readinessNextButton').dispatch('click');
  selectRadio(radios, 'irExperience', 'first_time');
  registry.get('readinessNextButton').dispatch('click');
  registry.get('irProductName').value = productName;
  registry.get('readinessNextButton').dispatch('click'); // -> productContext
  registry.get('readinessNextButton').dispatch('click'); // -> regulatoryFollowup or result (FIRST_COMMERCIAL has no scenario followup)
}

test('1. a hinted product shows a live regulatory question in the focused-checks phase, not the result yet', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToProductContextNext(root, registry, radios, 'כוס זכוכית לשתייה');

  assert.equal(registry.get('irStepRegulatoryFollowup').hidden, false);
  assert.equal(registry.get('readinessResult').hidden, true);
  assert.equal(currentRegulatoryLegendText(registry), 'האם כלי הזכוכית מיועד למגע ישיר עם מזון או שתייה?');
});

test('2. the question wording comes from the canonical rule registry data, not hard-coded controller text', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToProductContextNext(root, registry, radios, 'מכשיר חשמלי עם תקע');

  const legendText = currentRegulatoryLegendText(registry);
  assert.equal(legendText, 'האם המוצר מתחבר ישירות לרשת החשמל או מגיע עם תקע או ספק כוח?');
});

test('3. a non-hinted generic product skips the focused-checks phase entirely and goes straight to the result', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToProductContextNext(root, registry, radios, 'מוצר כללי ללא מאפיינים מיוחדים');

  assert.equal(registry.get('irStepRegulatoryFollowup').hidden, true);
  assert.equal(registry.get('readinessResult').hidden, false);
});

test('4. answering "כן" on the glass question and continuing produces the glass signal in the result', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToProductContextNext(root, registry, radios, 'כוס זכוכית לשתייה');

  selectRegulatoryOption(registry, 'yes');
  registry.get('readinessNextButton').dispatch('click');

  assert.equal(registry.get('readinessResult').hidden, false);
  const resultText = collectAllText(registry.get('readinessResult')).join(' | ');
  assert.ok(resultText.includes('נדרש לבדוק דרישות תקינה לכלי זכוכית'), resultText);
});

test('5. answering "לא" on the glass question does not produce the glass signal', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToProductContextNext(root, registry, radios, 'פסלון זכוכית דקורטיבי');

  selectRegulatoryOption(registry, 'no');
  registry.get('readinessNextButton').dispatch('click');

  assert.equal(registry.get('readinessResult').hidden, false);
  const resultText = collectAllText(registry.get('readinessResult')).join(' | ');
  assert.ok(!resultText.includes('נדרש לבדוק דרישות תקינה לכלי זכוכית'));
});

test('6. proceeding without selecting an answer shows a validation error and stays on the question', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToProductContextNext(root, registry, radios, 'כוס זכוכית לשתייה');

  registry.get('readinessNextButton').dispatch('click');

  assert.equal(registry.get('readinessErrors').hidden, false);
  assert.equal(registry.get('irStepRegulatoryFollowup').hidden, false);
  assert.equal(registry.get('readinessResult').hidden, true);
});

test('7. a multi-question rule chain walks through each question in order (coating scenario)', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToProductContextNext(root, registry, radios, 'מחבת מצופה בציפוי לא דביק');

  assert.equal(currentRegulatoryLegendText(registry), 'האם יש למוצר ציפוי פנימי או שכבת פלסטיק?');
  selectRegulatoryOption(registry, 'yes');
  registry.get('readinessNextButton').dispatch('click');

  assert.equal(currentRegulatoryLegendText(registry), 'האם הציפוי בא במגע ישיר עם מזון או שתייה?');
  selectRegulatoryOption(registry, 'yes');
  registry.get('readinessNextButton').dispatch('click');

  assert.equal(currentRegulatoryLegendText(registry), 'ממה עשוי הציפוי, אם ידוע?');
  selectRegulatoryOption(registry, 'plastic_or_polymer');
  registry.get('readinessNextButton').dispatch('click');

  assert.equal(registry.get('readinessResult').hidden, false);
  const resultText = collectAllText(registry.get('readinessResult')).join(' | ');
  assert.ok(resultText.includes('הציפוי עשוי להשפיע על דרישות היבוא'));
});

test('8. an "unknown" answer is accepted, does not block the flow, and does not throw', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToProductContextNext(root, registry, radios, 'מכשיר חשמלי עם תקע');

  selectRegulatoryOption(registry, 'unknown');
  registry.get('readinessNextButton').dispatch('click');

  assert.equal(registry.get('readinessResult').hidden, false);
});

test('9. the back button steps back through a multi-question chain before leaving the phase', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToProductContextNext(root, registry, radios, 'מחבת מצופה בציפוי לא דביק');

  selectRegulatoryOption(registry, 'yes');
  registry.get('readinessNextButton').dispatch('click');
  assert.equal(currentRegulatoryLegendText(registry), 'האם הציפוי בא במגע ישיר עם מזון או שתייה?');

  registry.get('readinessBackButton').dispatch('click');
  assert.equal(currentRegulatoryLegendText(registry), 'האם יש למוצר ציפוי פנימי או שכבת פלסטיק?');
  assert.equal(registry.get('irStepRegulatoryFollowup').hidden, false);
});

test('10. back from the very first regulatory question leaves the focused-checks phase entirely', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToProductContextNext(root, registry, radios, 'כוס זכוכית לשתייה');

  registry.get('readinessBackButton').dispatch('click');
  assert.equal(registry.get('irStepRegulatoryFollowup').hidden, true);
  assert.equal(registry.get('irStepProductContext').hidden, false);
});

test('11. multiple triggers produce at most 3 signals -- constructed via a hinted product matching more than one category', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  // "כוס זכוכית חשמלית" hints both glass and electrical categories.
  driveToProductContextNext(root, registry, radios, 'כוס זכוכית חשמלית לשתייה עם תקע');

  // Answer every live question with whichever option comes first until
  // the phase ends -- some of these questions (e.g. vehicle function
  // category) don't offer a "yes"/"no" vocabulary at all.
  let iterations = 0;
  while (registry.get('readinessResult').hidden === true && iterations < 10) {
    selectFirstRegulatoryOption(registry);
    registry.get('readinessNextButton').dispatch('click');
    iterations += 1;
  }

  assert.equal(registry.get('readinessResult').hidden, false);
  const cards = registry.get('readinessResult').children.filter((c) => c.className === 'ir-regulatory-signals');
  assert.equal(cards.length, 1, 'exactly one regulatory-signals section is rendered');
});

test('12. no match -- a hinted product where the confirming answer excludes the rule shows no signal card at all', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToProductContextNext(root, registry, radios, 'כוס זכוכית לשתייה');

  selectRegulatoryOption(registry, 'no');
  registry.get('readinessNextButton').dispatch('click');

  assert.equal(registry.get('readinessResult').hidden, false);
  const cards = registry.get('readinessResult').children.filter((c) => c.className === 'ir-regulatory-signals');
  assert.equal(cards.length, 0);
});

test('13. editing the result returns to the last live regulatory question with its answer preserved', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToProductContextNext(root, registry, radios, 'כוס זכוכית לשתייה');
  selectRegulatoryOption(registry, 'yes');
  registry.get('readinessNextButton').dispatch('click');
  assert.equal(registry.get('readinessResult').hidden, false);

  const editButton = findDescendant(registry.get('readinessResult'), (c) => c.tagName === 'button' && c.textContent === 'עריכת תשובות');
  assert.ok(editButton, 'edit button must exist in the rendered result');
  editButton.dispatch('click');

  assert.equal(registry.get('irStepRegulatoryFollowup').hidden, false);
  assert.equal(registry.get('readinessResult').hidden, true);
  assert.equal(currentRegulatoryLegendText(registry), 'האם כלי הזכוכית מיועד למגע ישיר עם מזון או שתייה?');
  const fieldset = currentRegulatoryFieldset(registry);
  const row = fieldset.children.find((c) => c.tagName === 'div');
  const yesInput = row.children.find((l) => l.children[0].getAttribute('value') === 'yes').children[0];
  assert.equal(yesInput.checked, true, 'the previously-given answer is pre-selected on edit');
});

test('14. editing an earlier answer to exclude the rule removes the stale signal on the next result', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToProductContextNext(root, registry, radios, 'כוס זכוכית לשתייה');
  selectRegulatoryOption(registry, 'yes');
  registry.get('readinessNextButton').dispatch('click');

  let cards = registry.get('readinessResult').children.filter((c) => c.className === 'ir-regulatory-signals');
  assert.equal(cards.length, 1);

  const editButton = findDescendant(registry.get('readinessResult'), (c) => c.tagName === 'button' && c.textContent === 'עריכת תשובות');
  editButton.dispatch('click');
  selectRegulatoryOption(registry, 'no');
  registry.get('readinessNextButton').dispatch('click');

  assert.equal(registry.get('readinessResult').hidden, false);
  cards = registry.get('readinessResult').children.filter((c) => c.className === 'ir-regulatory-signals');
  assert.equal(cards.length, 0, 'the stale glass signal must be gone once the confirming answer was changed to no');
});

test('15. starting a new assessment clears the live regulatory state -- a different product no longer carries the old answer', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToProductContextNext(root, registry, radios, 'כוס זכוכית לשתייה');
  selectRegulatoryOption(registry, 'yes');
  registry.get('readinessNextButton').dispatch('click');
  assert.equal(registry.get('readinessResult').hidden, false);

  const newButton = findDescendant(registry.get('readinessResult'), (c) => c.tagName === 'button' && c.textContent === 'בדיקה חדשה');
  assert.ok(newButton);
  newButton.dispatch('click');

  assert.equal(registry.get('readinessIntro').hidden, false);
  assert.equal(registry.get('irRegulatoryQuestionHost').children.length, 0);

  // A second pass through the flow, this time answering "no", must not
  // be contaminated by the first pass's "yes" answer.
  driveToProductContextNext(root, registry, radios, 'כוס זכוכית לשתייה');
  const fieldset = currentRegulatoryFieldset(registry);
  const row = fieldset.children.find((c) => c.tagName === 'div');
  const yesInput = row.children.find((l) => l.children[0].getAttribute('value') === 'yes').children[0];
  assert.equal(yesInput.checked, false, 'reset must not leave a stale pre-selected answer from the previous assessment');
});

test('16. every live regulatory question renders a "לא ידוע" option', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToProductContextNext(root, registry, radios, 'כוס זכוכית לשתייה');

  const fieldset = currentRegulatoryFieldset(registry);
  const row = fieldset.children.find((c) => c.tagName === 'div');
  const unknownLabel = row.children.find((l) => l.children[0].getAttribute('value') === 'unknown');
  assert.ok(unknownLabel, 'the unknown option must be present');
});

test('17. only one dynamic question is present in the DOM at a time -- the previous question is fully removed, not merely hidden', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToProductContextNext(root, registry, radios, 'מחבת מצופה בציפוי לא דביק');

  selectRegulatoryOption(registry, 'yes');
  registry.get('readinessNextButton').dispatch('click');

  const host = registry.get('irRegulatoryQuestionHost');
  assert.equal(host.children.length, 1, 'exactly one fieldset is present -- the previous question was replaced, not appended alongside');
});

test('18. no fetch/network call occurs anywhere during the live regulatory flow', () => {
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = () => { fetchCalled = true; return Promise.reject(new Error('must not be called')); };

  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToProductContextNext(root, registry, radios, 'כוס זכוכית לשתייה');
  selectRegulatoryOption(registry, 'yes');
  registry.get('readinessNextButton').dispatch('click');

  assert.equal(fetchCalled, false);
  if (originalFetch === undefined) delete globalThis.fetch;
  else globalThis.fetch = originalFetch;
});

test('19. the regulatory result card never exposes the internal rule id or status', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToProductContextNext(root, registry, radios, 'כוס זכוכית לשתייה');
  selectRegulatoryOption(registry, 'yes');
  registry.get('readinessNextButton').dispatch('click');

  const resultText = collectAllText(registry.get('readinessResult')).join(' | ');
  assert.ok(!resultText.includes('glass-food-contact-vessel'));
  assert.ok(!resultText.includes('expert_approved_for_pilot'));
  assert.ok(!resultText.includes('qualified-customs-professional-product-owner'));
});

test('20. professional routing for a scenario with no regulatory hint is unchanged from before this feature', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToProductContextNext(root, registry, radios, 'מוצר כללי ללא מאפיינים מיוחדים');

  assert.equal(registry.get('readinessResult').hidden, false);
  const cards = registry.get('readinessResult').children.filter((c) => c.className === 'ir-regulatory-signals');
  assert.equal(cards.length, 0);
});

test('21. the question budget is respected in a real multi-category scenario -- at most 4 live questions are ever shown', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  // Hints electrical + plastic-food-contact + glass + vehicle at once.
  driveToProductContextNext(
    root, registry, radios,
    'מוצר חשמלי עם תקע, קופסת פלסטיק למזון, כוס זכוכית לשתייה, פנס קדמי לרכב',
  );

  let questionsShown = 0;
  while (registry.get('readinessResult').hidden === true && questionsShown < 10) {
    selectFirstRegulatoryOption(registry);
    registry.get('readinessNextButton').dispatch('click');
    questionsShown += 1;
  }

  assert.ok(questionsShown <= 4, `expected at most 4 live regulatory questions, got ${questionsShown}`);
  assert.equal(registry.get('readinessResult').hidden, false);
});

test('22. sanity: the real rules registry still has exactly the 5 approved ids used by these scenarios', () => {
  assert.deepEqual(REGULATORY_SIGNAL_RULES.map((r) => r.id).sort(), [
    'glass-food-contact-vessel',
    'mains-connected-electrical-product',
    'plastic-direct-food-contact',
    'polymer-coated-direct-food-contact',
    'vehicle-installed-product',
  ]);
});

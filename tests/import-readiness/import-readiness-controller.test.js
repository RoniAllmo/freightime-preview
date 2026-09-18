/**
 * Tests for js/import-readiness/import-readiness-controller.js using the
 * built-in Node.js test runner. No DOM library is installed -- a small
 * fake DOM tree is built below, matching the style already used
 * elsewhere in this repository's test suite.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeImportReadiness } from '../../js/import-readiness/import-readiness-controller.js';
import { ALL_PRODUCT_FAMILY_VALUES, ALL_MATERIAL_VALUES } from '../../js/import-readiness/family-material-disclosure.js';

/** Depth-first search matching a tiny subset of CSS selectors this fake DOM needs: a bare tag name, or `input[name="x"]`. */
function queryChildren(children, selector) {
  const results = [];
  const tagMatch = selector.match(/^([a-z][a-z0-9]*)$/i);
  const inputNameMatch = selector.match(/^input\[name="([^"]+)"\]$/);
  function walk(list) {
    for (const child of list || []) {
      let matches = false;
      if (tagMatch) matches = child.tagName === tagMatch[1];
      else if (inputNameMatch) matches = child.tagName === 'input' && child.name === inputNameMatch[1];
      if (matches) results.push(child);
      walk(child.children);
    }
  }
  walk(children);
  return results;
}

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
    removeAttribute(name) {
      delete element[`__attr_${name}`];
    },
    querySelector(selector) {
      return queryChildren(element.children, selector)[0] ?? null;
    },
    querySelectorAll(selector) {
      return queryChildren(element.children, selector);
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
  'irImportType', 'irForSaleOrDistribution', 'irForBusinessUse', 'irPersonalOrFamilyUseOnly', 'irExperience',
];

const TEXT_FIELD_IDS = [
  'irProductName', 'irCommercialDescription', 'irIntendedUse', 'irHsCode',
  'irQuantity', 'irApproxValue', 'irCountryOfOrigin', 'irShipmentMethod', 'irSensitiveCategory',
  'irFocusArea', 'irAuditPurpose', 'irProblemType', 'irShipmentMode', 'irCurrentStage', 'irIssuingParty',
  'irDeadline', 'irMissingDocumentsNote',
  // Professional-referral coverage expansion follow-ups
  'irDamageDiscoveryTiming', 'irHasInsurance', 'irFinancialExposure', 'irInsuranceSubScenario', 'irDisputeStage',
];

const CHECKBOX_FIELD_IDS = [
  'irHasTechnicalSpec', 'irHasCatalogOrProductPage', 'irHasPhotos', 'irHasSupplierInvoice',
  'irHasSupplierProvidedHsCode', 'irHsCodeKnown', 'irHasWrittenNotice', 'irAccumulatingCosts',
  'irHasPhotosOfDamage', 'irSafetyRisk', 'irGoodsHeld', 'irCustomsClearanceInvolved',
];

const CONDITIONAL_GROUP_FIXTURES = [
  { id: 'irGroupDamage', showFor: 'cargo_or_container_damage cargo_shortage_or_loss' },
  { id: 'irGroupCustomsPenalty', showFor: 'customs_penalty_or_deficit_demand' },
  { id: 'irGroupStorage', showFor: 'storage demurrage detention clearance_delay' },
  { id: 'irGroupInsurance', showFor: 'insurance_issue' },
  { id: 'irGroupCarrierDispute', showFor: 'carrier_or_forwarder_dispute' },
];

const STEP_ELEMENT_IDS = [
  'irStepQ1', 'irStepQ1Clarify', 'irStepQ2', 'irStepQ3',
  'irStepPersonalFollowup', 'irStepExistingImporterFollowup', 'irStepEstablishedOperationFollowup',
  'irStepProblemType', 'irStepProblemDetails',
];

const CONTROL_IDS = [
  'readinessIntro', 'readinessStartButton', 'readinessProblemShortcutButton', 'readinessForm',
  'readinessStepIndicator', 'readinessErrors', 'readinessBackButton', 'readinessNextButton',
  'readinessResetButton', 'readinessResult', 'irImportTypeExplanation', 'irUncertainLeaningMessage',
];

/** A `<label><input type="checkbox" name=name value=value></label>` pair, matching index.html's real structure closely enough for the controller's own querySelector('input')/label.hidden logic. */
function buildChecklistLabel(name, value) {
  const input = createFakeElement(undefined, { value, checked: false });
  input.tagName = 'input';
  input.name = name;
  const label = createFakeElement(undefined, {});
  label.tagName = 'label';
  label.appendChild(input);
  return label;
}

function buildFakeRoot() {
  const registry = new Map();
  const radios = new Map();

  for (const id of TEXT_FIELD_IDS) registry.set(id, createFakeElement(id, { value: '' }));
  for (const id of CHECKBOX_FIELD_IDS) registry.set(id, createFakeElement(id, { checked: false }));
  for (const id of STEP_ELEMENT_IDS) registry.set(id, createFakeElement(id, { hidden: true }));
  for (const id of CONTROL_IDS) registry.set(id, createFakeElement(id, { hidden: false }));
  for (const { id, showFor } of CONDITIONAL_GROUP_FIXTURES) {
    const groupEl = createFakeElement(id, { hidden: true });
    groupEl.setAttribute('data-show-for', showFor);
    registry.set(id, groupEl);
  }
  registry.get('readinessForm').hidden = true;
  registry.get('readinessResult').hidden = true;
  registry.get('readinessBackButton').hidden = true;
  registry.get('readinessErrors').hidden = true;

  // Product-family / material progressive-disclosure fixtures (UX
  // correction mission): real <label><input></label> pairs for every
  // canonical checkbox value, plus the two expand buttons, so
  // updateFamilyMaterialDisclosure()'s actual DOM manipulation
  // (label.hidden, button aria-expanded/hidden) can be exercised
  // end-to-end through initializeImportReadiness -- not just asserted
  // against static HTML or the pure suggestion functions.
  const familyGroupEl = createFakeElement('irProductFamilyGroup', {});
  familyGroupEl.tagName = 'div';
  familyGroupEl.children = ALL_PRODUCT_FAMILY_VALUES.map((value) => buildChecklistLabel('irProductFamily', value));
  registry.set('irProductFamilyGroup', familyGroupEl);

  const materialGroupEl = createFakeElement('irMaterialGroup', {});
  materialGroupEl.tagName = 'div';
  materialGroupEl.children = ALL_MATERIAL_VALUES.map((value) => buildChecklistLabel('irMaterial', value));
  registry.set('irMaterialGroup', materialGroupEl);

  const familyExpandEl = createFakeElement('irProductFamilyExpand', { hidden: true });
  familyExpandEl.setAttribute('aria-expanded', 'false');
  registry.set('irProductFamilyExpand', familyExpandEl);

  const materialExpandEl = createFakeElement('irMaterialExpand', { hidden: true });
  materialExpandEl.setAttribute('aria-expanded', 'false');
  registry.set('irMaterialExpand', materialExpandEl);

  registry.get('readinessForm').reset = () => {
    for (const id of TEXT_FIELD_IDS) registry.get(id).value = '';
    for (const id of CHECKBOX_FIELD_IDS) registry.get(id).checked = false;
    for (const name of RADIO_GROUPS) {
      for (const radio of radios.get(name)) radio.checked = false;
    }
    // Real native form.reset() clears every form-associated checkbox,
    // including the family/material ones -- mirrored here so a Reset
    // test against this fake DOM is meaningful.
    for (const label of familyGroupEl.children) label.querySelector('input').checked = false;
    for (const label of materialGroupEl.children) label.querySelector('input').checked = false;
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
      if (match) {
        if (radios.has(match[1])) return radios.get(match[1]);
        const found = [];
        for (const el of registry.values()) found.push(...queryChildren(el.children, selector));
        return found;
      }
      return [];
    },
  };

  return { root, registry, radios };
}

/** The `<input>` element for one irProductFamily/irMaterial checkbox value, found inside its group's fixture. */
function findChecklistInput(registry, groupId, value) {
  const label = registry.get(groupId).children.find((l) => l.querySelector('input').value === value);
  return label ? label.querySelector('input') : null;
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

test('1. starting the assessment hides the intro and shows step q1', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');

  assert.equal(registry.get('readinessIntro').hidden, true);
  assert.equal(registry.get('readinessForm').hidden, false);
  assert.equal(registry.get('irStepQ1').hidden, false);
  assert.equal(registry.get('readinessStepIndicator').textContent, 'שלב: אופי היבוא');
});

test('2. selecting an import type shows its explanation text', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');

  selectRadio(radios, 'irImportType', 'personal');
  assert.ok(registry.get('irImportTypeExplanation').textContent.includes('שימוש אישי או משפחתי'));

  selectRadio(radios, 'irImportType', 'commercial');
  assert.ok(registry.get('irImportTypeExplanation').textContent.includes('מכירה, להפצה'));
});

test('3. proceeding without selecting an import type shows a validation error', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  registry.get('readinessNextButton').dispatch('click');

  assert.equal(registry.get('readinessErrors').hidden, false);
  assert.equal(registry.get('irStepQ1').hidden, false);
});

test('4. selecting "uncertain" routes to the clarification step, not directly to q2', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'uncertain');
  registry.get('readinessNextButton').dispatch('click');

  assert.equal(registry.get('irStepQ1Clarify').hidden, false);
  assert.equal(registry.get('irStepQ2').hidden, true);
});

test('5. selecting "personal" or "commercial" skips the clarification step and goes straight to q2', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'personal');
  registry.get('readinessNextButton').dispatch('click');

  assert.equal(registry.get('irStepQ1Clarify').hidden, true);
  assert.equal(registry.get('irStepQ2').hidden, false);
});

function completeQ1Q2Q3(root, registry, radios, { importType, experience, productName = 'מוצר בדיקה' }) {
  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', importType);
  registry.get('readinessNextButton').dispatch('click');
  if (importType === 'uncertain') {
    registry.get('readinessNextButton').dispatch('click'); // through clarification
  }
  selectRadio(radios, 'irExperience', experience);
  registry.get('readinessNextButton').dispatch('click');
  registry.get('irProductName').value = productName;
  registry.get('readinessNextButton').dispatch('click');
  // Layered questionnaire architecture: every scenario now passes
  // through the shared product-context step (family/materials/
  // documents) before its scenario-specific followup or result.
  registry.get('readinessNextButton').dispatch('click');
}

test('6. personal import routes directly to the personal-import result (no existing-importer/established-operation followup)', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  completeQ1Q2Q3(root, registry, radios, { importType: 'personal', experience: 'first_time' });

  assert.equal(registry.get('irStepPersonalFollowup').hidden, false);
  registry.get('readinessNextButton').dispatch('click');

  assert.equal(registry.get('readinessResult').hidden, false);
  const badge = registry.get('readinessResult').children[0];
  assert.ok(badge.textContent.includes('יבוא אישי'));
});

test('7. commercial + first-time routes to first-commercial result immediately after q3 (no extra followup step)', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  completeQ1Q2Q3(root, registry, radios, { importType: 'commercial', experience: 'first_time' });

  assert.equal(registry.get('readinessResult').hidden, false);
  const badge = registry.get('readinessResult').children[0];
  assert.ok(badge.textContent.includes('יבוא מסחרי ראשון'));
});

test('8. commercial + prior-importer routes directly to the result, skipping the redundant "במה תרצה להתמקד?" focus-area screen', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  completeQ1Q2Q3(root, registry, radios, { importType: 'commercial', experience: 'prior_importer' });

  // The standalone focus-area screen must never appear on this route --
  // product details already establish the user is checking a product,
  // so a separate "what would you like to focus on?" confirmation adds
  // friction without a meaningful decision (product-owner finding).
  assert.equal(registry.get('irStepExistingImporterFollowup').hidden, true, 'the redundant focus-area screen must never be shown on this route');
  assert.equal(registry.get('readinessResult').hidden, false, 'the result must render directly, with no extra click needed');
});

test('9. commercial + ongoing-operation routes to the established-operation purpose followup, and never shows a readiness-score element', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  completeQ1Q2Q3(root, registry, radios, { importType: 'commercial', experience: 'ongoing_operation' });

  assert.equal(registry.get('irStepEstablishedOperationFollowup').hidden, false);
  registry.get('irAuditPurpose').value = 'existing_classifications_audit';
  registry.get('readinessNextButton').dispatch('click');

  assert.equal(registry.get('readinessResult').hidden, false);
  const badge = registry.get('readinessResult').children[0];
  assert.ok(!badge.textContent.includes('גבוהה') && !badge.textContent.includes('נמוכה') && !badge.textContent.includes('חלקית'));
});

test('10. the shipment-problem shortcut bypasses q1-q3 entirely', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessProblemShortcutButton').dispatch('click');

  assert.equal(registry.get('readinessIntro').hidden, true);
  assert.equal(registry.get('irStepProblemType').hidden, false);
  assert.equal(registry.get('irStepQ1').hidden, true);
});

test('11. completing the shipment-problem shortcut renders the shipment-problem result', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessProblemShortcutButton').dispatch('click');
  registry.get('irProblemType').value = 'demurrage';
  registry.get('readinessNextButton').dispatch('click');

  assert.equal(registry.get('irStepProblemDetails').hidden, false);
  registry.get('readinessNextButton').dispatch('click');

  assert.equal(registry.get('readinessResult').hidden, false);
  const badge = registry.get('readinessResult').children[0];
  assert.ok(badge.textContent.includes('בעיה במשלוח קיים'));
});

test('12. the back button returns to the previous step', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'personal');
  registry.get('readinessNextButton').dispatch('click');
  assert.equal(registry.get('readinessBackButton').hidden, false);

  registry.get('readinessBackButton').dispatch('click');
  assert.equal(registry.get('irStepQ1').hidden, false);
  assert.equal(registry.get('readinessBackButton').hidden, true);
});

test('13. resetting with no substantial data does not prompt for confirmation', () => {
  const { root, registry } = buildFakeRoot();
  const originalConfirm = globalThis.confirm;
  let confirmCalled = false;
  globalThis.confirm = () => { confirmCalled = true; return true; };

  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  registry.get('readinessResetButton').dispatch('click');

  assert.equal(confirmCalled, false);
  assert.equal(registry.get('readinessIntro').hidden, false);

  if (originalConfirm === undefined) delete globalThis.confirm;
  else globalThis.confirm = originalConfirm;
});

test('14. resetting after substantial data prompts for confirmation', () => {
  const { root, registry } = buildFakeRoot();
  const originalConfirm = globalThis.confirm;
  let confirmCalled = false;
  globalThis.confirm = () => { confirmCalled = true; return false; };

  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  registry.get('irProductName').value = 'מוצר חשוב';
  registry.get('readinessResetButton').dispatch('click');

  assert.equal(confirmCalled, true);
  assert.equal(registry.get('irProductName').value, 'מוצר חשוב');

  if (originalConfirm === undefined) delete globalThis.confirm;
  else globalThis.confirm = originalConfirm;
});

test('15. no network call occurs during the entire flow', () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('fetch must never be called'); };

  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  assert.doesNotThrow(() => {
    completeQ1Q2Q3(root, registry, radios, { importType: 'personal', experience: 'first_time' });
    registry.get('readinessNextButton').dispatch('click');
  });

  if (originalFetch === undefined) delete globalThis.fetch;
  else globalThis.fetch = originalFetch;
});

test('16. no storage access occurs during the entire flow', () => {
  const originalLocalStorage = globalThis.localStorage;
  let accessed = false;
  globalThis.localStorage = new Proxy({}, { get() { accessed = true; return undefined; }, set() { accessed = true; return true; } });

  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  completeQ1Q2Q3(root, registry, radios, { importType: 'commercial', experience: 'first_time' });

  assert.equal(accessed, false);

  if (originalLocalStorage === undefined) delete globalThis.localStorage;
  else globalThis.localStorage = originalLocalStorage;
});

test('17. no obsolete technical questions (voltage, power, battery chemistry) appear anywhere in the DOM registry', () => {
  const { registry } = buildFakeRoot();
  for (const forbiddenId of ['irVoltage', 'irFrequency', 'irPower', 'irBatteryChemistry', 'irWirelessFrequency', 'irIsElectrical']) {
    assert.equal(registry.has(forbiddenId), false, `unexpected obsolete field id "${forbiddenId}" still present`);
  }
});

test('18. initializing without a usable root is a safe no-op', () => {
  const result = initializeImportReadiness({ root: null, documentRef: createFakeDocument() });
  assert.equal(result.initialized, false);
});

test('19. calling initializeImportReadiness with no options does not throw', () => {
  assert.doesNotThrow(() => initializeImportReadiness());
  assert.doesNotThrow(() => initializeImportReadiness({}));
});

test('20. the primary action appears near the top of the rendered result, before the preparation checklist', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  completeQ1Q2Q3(root, registry, radios, { importType: 'commercial', experience: 'first_time' });

  const children = registry.get('readinessResult').children;
  const actionIndex = children.findIndex((c) => c.className === 'ir-primary-action');
  const prepIndex = children.findIndex((c) => c.className === 'ir-preparation');
  assert.ok(actionIndex >= 0, 'expected an ir-primary-action block');
  assert.ok(prepIndex > actionIndex, 'expected the preparation checklist after the primary action');
});

test('21. the rendered result contains exactly one collapsed <details> secondary-detail region', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  completeQ1Q2Q3(root, registry, radios, { importType: 'commercial', experience: 'first_time' });

  const detailsElements = registry.get('readinessResult').children.filter((c) => c.tagName === 'details');
  assert.equal(detailsElements.length, 1);
  assert.equal(detailsElements[0].getAttribute('open'), undefined, 'the details region must be collapsed by default');
});

test('22. exactly one primary CTA and at most one secondary CTA are rendered', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  completeQ1Q2Q3(root, registry, radios, { importType: 'commercial', experience: 'first_time' });

  const ctaRow = registry.get('readinessResult').children.find((c) => c.className === 'ir-cta-row');
  assert.ok(ctaRow);
  assert.ok(ctaRow.children.length <= 2);
});

test('23. the visible disclaimer paragraph is present and concise (a single short sentence, not a long panel), inside its own separate "חשוב לדעת" limitations section', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  completeQ1Q2Q3(root, registry, radios, { importType: 'personal', experience: 'first_time' });
  registry.get('readinessNextButton').dispatch('click'); // personal-import follow-up step

  const children = registry.get('readinessResult').children;
  const limitationsSection = children.find((c) => c.className === 'ir-result-limitations');
  assert.ok(limitationsSection, 'the disclaimer must be wrapped in its own ir-result-limitations section');
  assert.equal(children[children.length - 1], limitationsSection, 'the limitations section must be the very last element of the result');

  const disclaimer = limitationsSection.children.find((c) => c.className === 'ir-disclaimer');
  assert.ok(disclaimer);
  assert.ok(disclaimer.textContent.length < 200);

  const heading = limitationsSection.children.find((c) => c.tagName === 'h3');
  assert.ok(heading, 'the limitations section must have its own heading');
  assert.equal(heading.textContent, 'חשוב לדעת');
});

test('24. an urgent shipment-problem result renders a visible urgency badge before the primary action', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessProblemShortcutButton').dispatch('click');
  registry.get('irProblemType').value = 'demurrage';
  registry.get('readinessNextButton').dispatch('click');
  registry.get('readinessNextButton').dispatch('click');

  const children = registry.get('readinessResult').children;
  const urgencyIndex = children.findIndex((c) => c.className === 'ir-urgency-badge');
  const actionIndex = children.findIndex((c) => c.className === 'ir-primary-action');
  assert.ok(urgencyIndex >= 0);
  assert.ok(urgencyIndex < actionIndex);
});

test('25. no empty result sections are rendered (e.g. no ir-primary-reason block when the reason is empty)', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessProblemShortcutButton').dispatch('click');
  registry.get('irProblemType').value = 'missing_document';
  registry.get('readinessNextButton').dispatch('click');
  registry.get('readinessNextButton').dispatch('click');

  const reasonBlock = registry.get('readinessResult').children.find((c) => c.className === 'ir-primary-reason');
  assert.equal(reasonBlock, undefined, 'shipment-problem results have no primaryReason and must not render an empty reason block');
});

// ---------------------------------------------------------------------
// Professional-referral coverage expansion: new problem-type choices,
// progressive-disclosure follow-up groups, and the new result sections
// (supporting professional, immediate actions, notification parties,
// deadline/accumulating-cost warnings).
// ---------------------------------------------------------------------

test('26. selecting a new issue-family problem type reveals only its own follow-up group, never all of them at once', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessProblemShortcutButton').dispatch('click');

  registry.get('irProblemType').value = 'cargo_or_container_damage';
  registry.get('irProblemType').dispatch('change');

  assert.equal(registry.get('irGroupDamage').hidden, false);
  assert.equal(registry.get('irGroupCustomsPenalty').hidden, true);
  assert.equal(registry.get('irGroupStorage').hidden, true);
  assert.equal(registry.get('irGroupInsurance').hidden, true);
  assert.equal(registry.get('irGroupCarrierDispute').hidden, true);
});

test('27. switching the problem type again hides the previous follow-up group and reveals the new one', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessProblemShortcutButton').dispatch('click');

  registry.get('irProblemType').value = 'cargo_or_container_damage';
  registry.get('irProblemType').dispatch('change');
  registry.get('irProblemType').value = 'insurance_issue';
  registry.get('irProblemType').dispatch('change');

  assert.equal(registry.get('irGroupDamage').hidden, true);
  assert.equal(registry.get('irGroupInsurance').hidden, false);
});

test('28. a problem type with no dedicated follow-up group (e.g. missing_document) shows no conditional group', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessProblemShortcutButton').dispatch('click');

  registry.get('irProblemType').value = 'missing_document';
  registry.get('irProblemType').dispatch('change');

  for (const { id } of CONDITIONAL_GROUP_FIXTURES) {
    assert.equal(registry.get(id).hidden, true, `expected ${id} to stay hidden for missing_document`);
  }
});

test('29. a cargo-damage result renders a supporting-professional card, an immediate-actions list, and a notification-parties list', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessProblemShortcutButton').dispatch('click');
  registry.get('irProblemType').value = 'cargo_or_container_damage';
  registry.get('irProblemType').dispatch('change');
  registry.get('irDamageDiscoveryTiming').value = 'after_unloading_at_terminal';
  registry.get('readinessNextButton').dispatch('click');
  registry.get('readinessNextButton').dispatch('click');

  const children = registry.get('readinessResult').children;
  assert.ok(children.some((c) => c.className === 'ir-supporting-professional'), 'expected a supporting-professional card');
  assert.ok(children.some((c) => c.className === 'ir-immediate-actions'), 'expected an immediate-actions list');
  assert.ok(children.some((c) => c.className === 'ir-notification-parties'), 'expected a notification-parties list');
  assert.ok(children.some((c) => c.className === 'ir-deadline-warning'), 'expected a deadline warning');
});

test('30. a non-urgent, non-supporting result never renders the supporting-professional card', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessProblemShortcutButton').dispatch('click');
  registry.get('irProblemType').value = 'missing_document';
  registry.get('readinessNextButton').dispatch('click');
  registry.get('readinessNextButton').dispatch('click');

  const children = registry.get('readinessResult').children;
  assert.ok(!children.some((c) => c.className === 'ir-supporting-professional'));
});

test('31. the professional-referral CTA still links only to #contact, and no new transmission mechanism is added', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessProblemShortcutButton').dispatch('click');
  registry.get('irProblemType').value = 'cargo_or_container_damage';
  registry.get('irProblemType').dispatch('change');
  registry.get('readinessNextButton').dispatch('click');
  registry.get('readinessNextButton').dispatch('click');

  const children = registry.get('readinessResult').children;
  const referral = children.find((c) => c.className === 'ir-professional-referral');
  const cta = referral.children.find((c) => c.className === 'ir-professional-cta');
  assert.equal(cta.getAttribute('href'), '#contact');
});

test('32. "בדיקה חדשה" still resets back to the intro after a new-family result is rendered', () => {
  const { root, registry } = buildFakeRoot();
  const controller = initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessProblemShortcutButton').dispatch('click');
  registry.get('irProblemType').value = 'insurance_issue';
  registry.get('irProblemType').dispatch('change');
  registry.get('readinessNextButton').dispatch('click');
  registry.get('readinessNextButton').dispatch('click');

  assert.equal(registry.get('readinessResult').hidden, false);
  controller.resetAll({ confirmIfSubstantial: false });
  assert.equal(registry.get('readinessIntro').hidden, false);
  assert.equal(registry.get('readinessResult').hidden, true);
});

// ---------------------------------------------------------------------
// Accessibility quality gate: primary vs supporting professional-card
// distinguishability, urgency as real text (not color-only), and
// hidden-state elements staying genuinely hidden (never focusable).
// ---------------------------------------------------------------------

test('33. the primary and supporting professional cards each carry their own real <h3> heading, so a screen reader clearly distinguishes primary from supporting', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessProblemShortcutButton').dispatch('click');
  registry.get('irProblemType').value = 'cargo_or_container_damage';
  registry.get('irProblemType').dispatch('change');
  registry.get('readinessNextButton').dispatch('click');
  registry.get('readinessNextButton').dispatch('click');

  const children = registry.get('readinessResult').children;
  const primary = children.find((c) => c.className === 'ir-professional-referral');
  const supporting = children.find((c) => c.className === 'ir-supporting-professional');
  assert.ok(primary, 'expected a primary professional-referral card');
  assert.ok(supporting, 'expected a supporting-professional card');

  const primaryHeading = primary.children.find((c) => c.tagName === 'h3');
  const supportingHeading = supporting.children.find((c) => c.tagName === 'h3');
  assert.ok(primaryHeading, 'expected the primary card to have its own <h3>');
  assert.ok(supportingHeading, 'expected the supporting card to have its own <h3>');
  assert.notEqual(primaryHeading.textContent, supportingHeading.textContent, 'primary and supporting headings must read differently to a screen reader, not rely on position/styling alone');
  assert.ok(primaryHeading.textContent.length > 0);
  assert.ok(supportingHeading.textContent.length > 0);
});

test('34. urgency is communicated as real, non-empty text content -- never a color-only badge', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessProblemShortcutButton').dispatch('click');
  registry.get('irProblemType').value = 'cargo_or_container_damage';
  registry.get('irProblemType').dispatch('change');
  registry.get('readinessNextButton').dispatch('click');
  registry.get('readinessNextButton').dispatch('click');

  const badge = registry.get('readinessResult').children.find((c) => c.className === 'ir-urgency-badge');
  assert.ok(badge, 'expected an urgency badge for an urgent cargo-damage result');
  assert.equal(typeof badge.textContent, 'string');
  assert.ok(badge.textContent.trim().length > 0, 'urgency badge must carry real text, not rely on color alone');
  // The text is also mirrored onto data-urgency so styling can key off it,
  // but the accessible name comes from the text node, not the attribute.
  assert.equal(badge.getAttribute('data-urgency'), badge.textContent);
});

test('35. every step and conditional-group element not on the active path stays genuinely hidden (never focusable) while a shipment-problem result is being built', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessProblemShortcutButton').dispatch('click');
  registry.get('irProblemType').value = 'cargo_or_container_damage';
  registry.get('irProblemType').dispatch('change');

  // Steps unrelated to the shipment-problem shortcut must stay hidden.
  for (const id of ['irStepQ1', 'irStepQ1Clarify', 'irStepQ2', 'irStepQ3', 'irStepPersonalFollowup', 'irStepExistingImporterFollowup', 'irStepEstablishedOperationFollowup', 'irStepProblemDetails']) {
    assert.equal(registry.get(id).hidden, true, `expected ${id} to stay hidden`);
  }
  // Conditional groups other than the one matching the selected problem
  // type must stay hidden too.
  for (const id of ['irGroupCustomsPenalty', 'irGroupStorage', 'irGroupInsurance', 'irGroupCarrierDispute']) {
    assert.equal(registry.get(id).hidden, true, `expected ${id} to stay hidden`);
  }
  assert.equal(registry.get('irGroupDamage').hidden, false);

  registry.get('readinessNextButton').dispatch('click');
  registry.get('readinessNextButton').dispatch('click');
  // Once the result is shown, the form (and every step/group inside it)
  // must be hidden as a whole.
  assert.equal(registry.get('readinessForm').hidden, true);
});

test('36. the professional-referral and supporting-professional CTAs never set a positive/stray tabindex (no keyboard-trap risk introduced)', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessProblemShortcutButton').dispatch('click');
  registry.get('irProblemType').value = 'cargo_or_container_damage';
  registry.get('irProblemType').dispatch('change');
  registry.get('readinessNextButton').dispatch('click');
  registry.get('readinessNextButton').dispatch('click');

  const children = registry.get('readinessResult').children;
  const primary = children.find((c) => c.className === 'ir-professional-referral');
  const supporting = children.find((c) => c.className === 'ir-supporting-professional');
  const primaryCta = primary.children.find((c) => c.className === 'ir-professional-cta');
  const supportingCta = supporting.children.find((c) => c.className === 'ir-supporting-professional-cta');
  assert.equal(primaryCta.getAttribute('tabindex'), undefined);
  assert.equal(supportingCta.getAttribute('tabindex'), undefined);
});

// -----------------------------------------------------------------
// 37-41: UX correction -- the final limitation is its own separate,
// visually/semantically distinct "חשוב לדעת" section (never rendered
// as if part of the professional answer above it), across every result
// state: a matrix-positive family finding, a generic/no-match
// commercial result, a personal-import result (also covered by test
// 23 above), a cargo-damage (operational) result, and an
// established-operation result. The wording itself
// (result.visibleDisclaimer, sourced from build-action-map.js's single
// shared VISIBLE_DISCLAIMER constant) is asserted identical across all
// of them -- this PR changes presentation only, never content.
// -----------------------------------------------------------------

const KNOWN_VISIBLE_DISCLAIMER_TEXT =
  'התוצאה היא הכוונה תפעולית ראשונית ואינה מהווה סיווג מכס, קביעה רגולטורית, ייעוץ משפטי או אישור יבוא.';

function assertLimitationsSection(resultContainer, label) {
  const children = resultContainer.children;
  const matches = children.filter((c) => c.className === 'ir-result-limitations');
  assert.equal(matches.length, 1, `${label}: exactly one ir-result-limitations section must be rendered`);
  const section = matches[0];
  assert.equal(children[children.length - 1], section, `${label}: the limitations section must be the last element of the result`);
  assert.equal(section.tagName, 'section', `${label}: the limitations section must be a semantic <section>`);
  assert.equal(section.getAttribute('role'), undefined, `${label}: must not carry an alert role`);

  const heading = section.children.find((c) => c.tagName === 'h3');
  assert.ok(heading, `${label}: the limitations section must have its own heading`);
  assert.equal(heading.textContent, 'חשוב לדעת', `${label}: heading text must read "חשוב לדעת"`);

  const disclaimerParagraphs = section.children.filter((c) => c.className === 'ir-disclaimer');
  assert.equal(disclaimerParagraphs.length, 1, `${label}: exactly one disclaimer paragraph inside the section`);
  assert.equal(disclaimerParagraphs[0].textContent, KNOWN_VISIBLE_DISCLAIMER_TEXT, `${label}: disclaimer wording must be byte-identical to before this PR`);

  // Never duplicated as a loose paragraph directly on the result
  // container outside the new section.
  const looseDisclaimers = children.filter((c) => c.className === 'ir-disclaimer');
  assert.equal(looseDisclaimers.length, 0, `${label}: the disclaimer must not also appear as a direct child of the result container`);
}

test('37. a matrix-positive family result (מזרן / mattress) renders its own separate limitations section, wording unchanged', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  completeQ1Q2Q3(root, registry, radios, { importType: 'commercial', experience: 'first_time', productName: 'מזרן' });

  assertLimitationsSection(registry.get('readinessResult'), 'matrix-positive (מזרן)');
});

test('38. a generic/no-match commercial result renders its own separate limitations section, wording unchanged', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  completeQ1Q2Q3(root, registry, radios, { importType: 'commercial', experience: 'first_time', productName: 'מוצר בדיקה כללי' });

  assertLimitationsSection(registry.get('readinessResult'), 'generic/no-match commercial');
});

test('39. a personal-import result renders its own separate limitations section, wording unchanged', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  completeQ1Q2Q3(root, registry, radios, { importType: 'personal', experience: 'first_time' });
  registry.get('readinessNextButton').dispatch('click'); // personal-import follow-up step

  assertLimitationsSection(registry.get('readinessResult'), 'personal import');
});

test('40. a cargo-damage (operational) shipment-problem result renders its own separate limitations section, wording unchanged', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessProblemShortcutButton').dispatch('click');
  registry.get('irProblemType').value = 'cargo_or_container_damage';
  registry.get('irProblemType').dispatch('change');
  registry.get('readinessNextButton').dispatch('click');
  registry.get('readinessNextButton').dispatch('click');

  assertLimitationsSection(registry.get('readinessResult'), 'cargo-damage operational');
});

test('41. an established-operation result renders its own separate limitations section, wording unchanged', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  completeQ1Q2Q3(root, registry, radios, { importType: 'commercial', experience: 'ongoing_operation', productName: 'מוצר בדיקה' });
  registry.get('readinessNextButton').dispatch('click'); // established-operation purpose followup

  assertLimitationsSection(registry.get('readinessResult'), 'established operation');
});

// -----------------------------------------------------------------
// 42-49: UX correction (product-owner-directed follow-up) -- the
// "אוהל" (tent) progressive-disclosure defect. Previously, typing
// "אוהל" fell back to showing the complete, unranked 23-family/
// 13-material list (no matrix alias exists for a tent at all). The
// product owner explicitly rejected that as unresolved: the initial
// presentation must prioritize the existing textile family/material
// instead. These tests exercise the REAL controller end-to-end
// (initializeImportReadiness -> real DOM manipulation on the fake
// family/material checklist fixtures built in buildFakeRoot), not just
// the pure suggestion functions -- proving actual visibility and
// checked-state behavior, not merely that a Hebrew string exists
// somewhere.
// -----------------------------------------------------------------

const TENT_UNRELATED_FAMILIES = [
  'live_animals', 'animal_feed', 'animal_origin_products',
  'cosmetics_and_beauty', 'dietary_supplements',
  'medical_equipment_or_medical_use', 'food_contact_items',
];

function enterProductContextWithProductName(productName) {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  completeQ1Q2Q3(root, registry, radios, { importType: 'commercial', experience: 'first_time', productName });
  return { root, registry, radios };
}

test('42. "אוהל" (tent) initially shows the textile family (and the two catch-alls) and hides every unrelated family -- no checkbox is automatically checked', () => {
  const { registry } = enterProductContextWithProductName('אוהל');

  const expectedVisible = ['textile_apparel_and_footwear', 'other_general_product', 'not_sure'];
  for (const value of expectedVisible) {
    const input = findChecklistInput(registry, 'irProductFamilyGroup', value);
    const label = registry.get('irProductFamilyGroup').children.find((l) => l.querySelector('input').value === value);
    assert.equal(label.hidden, false, `${value} must be initially visible for a tent`);
    assert.equal(input.checked, false, `${value} must never be automatically checked`);
  }

  for (const label of registry.get('irProductFamilyGroup').children) {
    const input = label.querySelector('input');
    assert.equal(input.checked, false, `${input.value} must never be automatically checked`);
    if (!expectedVisible.includes(input.value)) {
      assert.equal(label.hidden, true, `${input.value} must be initially hidden for a tent`);
    }
  }
});

test('43. "אוהל" initially hides every unrelated family named by the product owner (animals, food, cosmetics, supplements, medical, food-contact)', () => {
  const { registry } = enterProductContextWithProductName('אוהל');
  for (const value of TENT_UNRELATED_FAMILIES) {
    const input = findChecklistInput(registry, 'irProductFamilyGroup', value);
    const label = registry.get('irProductFamilyGroup').children.find((l) => l.querySelector('input') === input);
    assert.equal(label.hidden, true, `${value} must be hidden for a tent`);
  }
});

test('44. "אוהל" initially shows the textile material, plus plastic/metal/unknown, and hides the rest -- material is never automatically checked', () => {
  const { registry } = enterProductContextWithProductName('אוהל');
  const expectedVisible = ['textile', 'plastic_or_polymer', 'metal', 'unknown'];
  for (const label of registry.get('irMaterialGroup').children) {
    const input = label.querySelector('input');
    assert.equal(input.checked, false, `${input.value} must never be automatically checked`);
    assert.equal(label.hidden, !expectedVisible.includes(input.value), `${input.value} visibility mismatch for a tent`);
  }
});

test('45. the "הצג את כל משפחות המוצרים" expand button is visible for a tent (something is hidden), and clicking it reveals every family without checking any of them', () => {
  const { registry } = enterProductContextWithProductName('אוהל');
  const expandButton = registry.get('irProductFamilyExpand');
  assert.equal(expandButton.hidden, false);
  assert.equal(expandButton.getAttribute('aria-expanded'), 'false');

  expandButton.dispatch('click');

  assert.equal(expandButton.getAttribute('aria-expanded'), 'true');
  assert.equal(expandButton.hidden, true);
  for (const label of registry.get('irProductFamilyGroup').children) {
    assert.equal(label.hidden, false, 'every family must be visible once expanded');
    assert.equal(label.querySelector('input').checked, false, 'expanding must never check a box');
  }
});

test('46. a manually checked, initially-hidden family (e.g. "מזון לבעלי חיים") for a tent stays visible and checked when the product text is edited and productContext is re-entered', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'commercial');
  registry.get('readinessNextButton').dispatch('click');
  selectRadio(radios, 'irExperience', 'first_time');
  registry.get('readinessNextButton').dispatch('click');
  registry.get('irProductName').value = 'אוהל';
  registry.get('readinessNextButton').dispatch('click'); // enters productContext

  const hiddenInput = findChecklistInput(registry, 'irProductFamilyGroup', 'animal_feed');
  hiddenInput.checked = true; // simulates the user expanding and manually checking it

  registry.get('readinessBackButton').dispatch('click');
  registry.get('irProductName').value = 'אוהל מטקסטיל'; // text changed after selection
  registry.get('readinessNextButton').dispatch('click'); // re-enters productContext, re-runs suggestion

  const stillHiddenInput = findChecklistInput(registry, 'irProductFamilyGroup', 'animal_feed');
  const label = registry.get('irProductFamilyGroup').children.find((l) => l.querySelector('input') === stillHiddenInput);
  assert.equal(stillHiddenInput.checked, true, 'a manually checked family must never be silently unchecked');
  assert.equal(label.hidden, false, 'a checked family must never be hidden again, even outside the suggested set');
});

test('47. Reset clears every family/material checkbox (including a tent-triggered selection) and returns the expand controls to their initial collapsed state', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  completeQ1Q2Q3(root, registry, radios, { importType: 'commercial', experience: 'first_time', productName: 'אוהל' });

  findChecklistInput(registry, 'irProductFamilyGroup', 'textile_apparel_and_footwear').checked = true;
  registry.get('irProductFamilyExpand').dispatch('click');

  registry.get('readinessResetButton').dispatch('click');

  for (const label of registry.get('irProductFamilyGroup').children) {
    assert.equal(label.querySelector('input').checked, false, 'Reset must clear every family checkbox');
  }
  assert.equal(registry.get('irProductFamilyExpand').getAttribute('aria-expanded'), 'false');
  assert.equal(registry.get('irProductFamilyExpand').hidden, false);
});

test('48. "tent pole" / "tent accessory" / "tent repair kit" never trigger the tent family/material suggestion (boundary protection) -- the controlled insufficient-input fallback is shown instead (concept-level suggestion completion, part 1), and nothing is auto-checked', () => {
  for (const productName of ['tent pole', 'tent accessory', 'tent repair kit', 'camping equipment', 'unidentified product']) {
    const { registry } = enterProductContextWithProductName(productName);
    const familyLabels = registry.get('irProductFamilyGroup').children;
    const visible = familyLabels.filter((l) => !l.hidden).map((l) => l.querySelector('input').value);
    assert.deepEqual(visible.sort(), ['not_sure', 'other_general_product'].sort(), `"${productName}" must show only the special catch-all options, not an arbitrary family and not the full list`);
    assert.equal(registry.get('irProductFamilyExpand').hidden, false, `"${productName}" must keep Show all available`);
    for (const label of familyLabels) assert.equal(label.querySelector('input').checked, false, `"${productName}" must never auto-check a family`);
  }
});

test('49. "אוהל מטקסטיל" (a genuine matrix match via the pre-existing "טקסטיל" alias) and "אוהל" (the presentation-hint-only path) both surface the textile family, proving the hint never overrides or is needed when a real identification match already exists', () => {
  const viaRealMatch = enterProductContextWithProductName('אוהל מטקסטיל');
  const viaHintOnly = enterProductContextWithProductName('אוהל');

  for (const { registry } of [viaRealMatch, viaHintOnly]) {
    const label = registry.get('irProductFamilyGroup').children.find((l) => l.querySelector('input').value === 'textile_apparel_and_footwear');
    assert.equal(label.hidden, false, 'textile_apparel_and_footwear must be visible either way');
  }
});

/**
 * Tests for js/import-readiness/import-readiness-controller.js using the
 * built-in Node.js test runner. No DOM library is installed -- a small
 * fake DOM tree is built below, matching the style already used
 * elsewhere in this repository's test suite.
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

test('8. commercial + prior-importer routes to the existing-importer focus-area followup', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  completeQ1Q2Q3(root, registry, radios, { importType: 'commercial', experience: 'prior_importer' });

  assert.equal(registry.get('irStepExistingImporterFollowup').hidden, false);
  registry.get('irFocusArea').value = 'customs_classification';
  registry.get('readinessNextButton').dispatch('click');

  assert.equal(registry.get('readinessResult').hidden, false);
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

test('23. the visible disclaimer paragraph is present and concise (a single short sentence, not a long panel)', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  completeQ1Q2Q3(root, registry, radios, { importType: 'personal', experience: 'first_time' });
  registry.get('readinessNextButton').dispatch('click'); // personal-import follow-up step

  const disclaimer = registry.get('readinessResult').children.find((c) => c.className === 'ir-disclaimer');
  assert.ok(disclaimer);
  assert.ok(disclaimer.textContent.length < 200);
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

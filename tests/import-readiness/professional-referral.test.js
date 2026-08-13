/**
 * Tests for the professional-referral component added by the
 * product-owner acceptance correction: every scenario result must name
 * a concrete professional type (WHO), a concrete one-sentence reason
 * (WHY), and a dedicated action-verb CTA label (WHAT TO CLICK) --
 * never a vague fallback, and never more than one professional/CTA
 * pairing per result. Uses the pure scenario builders directly (content
 * assertions) plus the existing fake-DOM controller harness (DOM-order
 * assertions), matching the patterns already used elsewhere in this
 * suite.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeReadinessInput } from '../../js/import-readiness/normalize-readiness-input.js';
import { buildExistingImporterResult } from '../../js/import-readiness/existing-importer-rules.js';
import { buildEstablishedOperationResult } from '../../js/import-readiness/established-operation-rules.js';
import { buildShipmentProblemResult } from '../../js/import-readiness/shipment-problem-rules.js';
import { buildPersonalImportResult } from '../../js/import-readiness/personal-import-rules.js';
import { buildFirstCommercialImportResult } from '../../js/import-readiness/first-commercial-import-rules.js';
import { initializeImportReadiness } from '../../js/import-readiness/import-readiness-controller.js';

const BANNED_VAGUE_PHRASES = [
  'מומלץ לפנות לגורם מקצועי',
  'המשך עם איש מקצוע',
  'גורם מקצועי מומלץ',
];

function assertConcreteReferral(result) {
  assert.ok(result.professional, 'expected a professional referral object');
  assert.ok(result.professional.type.length > 0, 'expected a concrete professional type');
  assert.ok(result.professional.reason.length > 0, 'expected a concrete reason');
  assert.ok(result.professional.ctaLabel.length > 0, 'expected a dedicated CTA label');
  const text = `${result.professional.type} ${result.professional.reason} ${result.professional.ctaLabel}`;
  for (const phrase of BANNED_VAGUE_PHRASES) {
    assert.ok(!text.includes(phrase), `unexpected vague fallback phrase "${phrase}"`);
  }
}

test('1. the charging-cable existing-importer case routes to the classification/regulation professional and CTA', () => {
  const result = buildExistingImporterResult(normalizeReadinessInput({
    focusArea: 'regulation_and_permits',
  }));
  assertConcreteReferral(result);
  assert.match(result.professional.type, /מסווג מכס|מומחה רגולציה/);
  assert.equal(result.professional.ctaLabel, 'לתיאום בדיקת סיווג ורגולציה');
});

test('2. new_product and customs_classification focus areas resolve to the same classification/regulation referral', () => {
  for (const focusArea of ['new_product', 'customs_classification']) {
    const result = buildExistingImporterResult(normalizeReadinessInput({ focusArea }));
    assertConcreteReferral(result);
    assert.equal(result.professional.ctaLabel, 'לתיאום בדיקת סיווג ורגולציה');
  }
});

test('3. missing supplier-document focus areas route to the documents professional and CTA', () => {
  for (const focusArea of ['new_supplier', 'supplier_documents']) {
    const result = buildExistingImporterResult(normalizeReadinessInput({ focusArea }));
    assertConcreteReferral(result);
    assert.match(result.professional.type, /מסמכי יבוא/);
    assert.equal(result.professional.ctaLabel, 'לתיאום בדיקת מסמכים');
  }
});

test('4. a missing-document shipment problem routes to the same documents professional and CTA', () => {
  const result = buildShipmentProblemResult(normalizeReadinessInput({ problemType: 'missing_document' }));
  assertConcreteReferral(result);
  assert.match(result.professional.type, /מסמכי יבוא/);
  assert.equal(result.professional.ctaLabel, 'לתיאום בדיקת מסמכים');
});

test('5. the legal-advice established-operation purpose routes to a named legal adviser and CTA', () => {
  const result = buildEstablishedOperationResult(normalizeReadinessInput({ auditPurpose: 'legal_advice' }));
  assertConcreteReferral(result);
  assert.match(result.professional.type, /עורך דין/);
  assert.equal(result.professional.ctaLabel, 'פנייה לייעוץ משפטי');
});

test('6. the insurance-coverage established-operation purpose routes to a named insurance adviser and CTA', () => {
  const result = buildEstablishedOperationResult(normalizeReadinessInput({ auditPurpose: 'insurance_coverage_review' }));
  assertConcreteReferral(result);
  assert.match(result.professional.type, /יועץ ביטוחי/);
  assert.equal(result.professional.ctaLabel, 'פנייה לייעוץ ביטוחי');
});

test('7. urgent shipment problems (storage, demurrage, detention, missing permit) all route to the same operational/customs-broker referral', () => {
  for (const problemType of ['storage', 'demurrage', 'detention', 'missing_import_permit']) {
    const result = buildShipmentProblemResult(normalizeReadinessInput({ problemType }));
    assertConcreteReferral(result);
    assert.match(result.professional.type, /עמיל מכס/);
    assert.equal(result.professional.ctaLabel, 'בדיקת המקרה בדחיפות');
    assert.equal(result.urgency, 'דחוף');
  }
});

test('8. accumulating costs escalate a non-default-urgent problem to the same urgent operational referral', () => {
  const result = buildShipmentProblemResult(normalizeReadinessInput({
    problemType: 'clearance_delay',
    accumulatingCosts: true,
  }));
  assertConcreteReferral(result);
  assert.equal(result.professional.ctaLabel, 'בדיקת המקרה בדחיפות');
});

test('9. non-urgent shipment problems still resolve a concrete (non-vague) referral', () => {
  const result = buildShipmentProblemResult(normalizeReadinessInput({ problemType: 'customs_inspection' }));
  assertConcreteReferral(result);
});

test('10. personal-import and first-commercial-import results also carry a concrete referral', () => {
  assertConcreteReferral(buildPersonalImportResult(normalizeReadinessInput({})));
  assertConcreteReferral(buildFirstCommercialImportResult(normalizeReadinessInput({})));
});

test('11. every existing-importer focus area (including "other") resolves a concrete, non-vague referral', () => {
  const focusAreas = [
    'new_product', 'customs_classification', 'regulation_and_permits', 'new_supplier', 'supplier_documents',
    'taxes_and_costs', 'incoterms', 'sea_or_air_shipping', 'clearance_delay', 'additional_charges', 'other',
  ];
  for (const focusArea of focusAreas) {
    assertConcreteReferral(buildExistingImporterResult(normalizeReadinessInput({ focusArea })));
  }
});

test('12. every established-operation audit purpose (including "other") resolves a concrete, non-vague referral', () => {
  const purposes = [
    'existing_classifications_audit', 'regulation_and_permits_audit', 'document_process_audit',
    'penalty_or_shortfall_exposure', 'storage_demurrage_charges', 'sale_terms_review',
    'insurance_coverage_review', 'supplier_process_review', 'brokerage_and_clearance_process',
    'legal_advice', 'other',
  ];
  for (const auditPurpose of purposes) {
    assertConcreteReferral(buildEstablishedOperationResult(normalizeReadinessInput({ auditPurpose })));
  }
});

test('13. every shipment-problem type resolves a concrete, non-vague referral', () => {
  const problemTypes = [
    'missing_document', 'missing_import_permit', 'customs_inspection', 'classification_dispute',
    'value_dispute', 'clearance_delay', 'storage', 'demurrage', 'detention',
    'penalty_or_additional_charge', 'supplier_not_responding', 'carrier_not_responding', 'other',
  ];
  for (const problemType of problemTypes) {
    assertConcreteReferral(buildShipmentProblemResult(normalizeReadinessInput({ problemType })));
  }
});

// --- Rendered-DOM assertions (fake DOM harness matching the existing
// pattern in import-readiness-controller.test.js) ---

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
      throw new Error('innerHTML must never be used');
    },
    get() {
      return '';
    },
  });
  return element;
}

const RADIO_GROUPS = ['irImportType', 'irForSaleOrDistribution', 'irForBusinessUse', 'irPersonalOrFamilyUseOnly', 'irExperience'];
const TEXT_FIELD_IDS = [
  'irProductName', 'irCommercialDescription', 'irIntendedUse', 'irHsCode', 'irQuantity', 'irApproxValue',
  'irCountryOfOrigin', 'irShipmentMethod', 'irSensitiveCategory', 'irFocusArea', 'irAuditPurpose',
  'irProblemType', 'irShipmentMode', 'irCurrentStage', 'irIssuingParty', 'irDeadline', 'irMissingDocumentsNote',
];
const CHECKBOX_FIELD_IDS = [
  'irHasTechnicalSpec', 'irHasCatalogOrProductPage', 'irHasPhotos', 'irHasSupplierInvoice',
  'irHasSupplierProvidedHsCode', 'irHsCodeKnown', 'irHasWrittenNotice', 'irAccumulatingCosts',
];
const STEP_ELEMENT_IDS = [
  'irStepQ1', 'irStepQ1Clarify', 'irStepQ2', 'irStepQ3', 'irStepPersonalFollowup',
  'irStepExistingImporterFollowup', 'irStepEstablishedOperationFollowup', 'irStepProblemType', 'irStepProblemDetails',
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
  registry.get('readinessForm').hidden = true;
  registry.get('readinessResult').hidden = true;
  registry.get('readinessBackButton').hidden = true;
  registry.get('readinessErrors').hidden = true;
  registry.get('readinessForm').reset = () => {
    for (const id of TEXT_FIELD_IDS) registry.get(id).value = '';
    for (const id of CHECKBOX_FIELD_IDS) registry.get(id).checked = false;
    for (const name of RADIO_GROUPS) for (const radio of radios.get(name)) radio.checked = false;
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
      return registry.get(selector.replace('#', '')) ?? null;
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

test('14. the rendered professional-referral block appears before the preparation checklist in DOM order', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'commercial');
  registry.get('readinessNextButton').dispatch('click');
  selectRadio(radios, 'irExperience', 'first_time');
  registry.get('readinessNextButton').dispatch('click');
  registry.get('irProductName').value = 'כבל טעינה';
  registry.get('readinessNextButton').dispatch('click');

  const children = registry.get('readinessResult').children;
  const referralIndex = children.findIndex((c) => c.className === 'ir-professional-referral');
  const prepIndex = children.findIndex((c) => c.className === 'ir-preparation');
  assert.ok(referralIndex >= 0, 'expected a rendered ir-professional-referral block');
  assert.ok(prepIndex > referralIndex, 'expected the preparation checklist after the professional referral');
});

test('15. the professional-referral block is visible without opening the collapsed <details> region', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'commercial');
  registry.get('readinessNextButton').dispatch('click');
  selectRadio(radios, 'irExperience', 'first_time');
  registry.get('readinessNextButton').dispatch('click');
  registry.get('irProductName').value = 'כבל טעינה';
  registry.get('readinessNextButton').dispatch('click');

  const children = registry.get('readinessResult').children;
  const referralBlock = children.find((c) => c.className === 'ir-professional-referral');
  assert.ok(referralBlock, 'expected the referral block to be a direct, non-collapsed child of the result container');
  const ctaLink = referralBlock.children.find((c) => c.className === 'ir-professional-cta');
  assert.ok(ctaLink, 'expected a dedicated professional CTA inside the referral block');
  assert.equal(ctaLink.getAttribute('href'), '#contact');
});

test('16. the rendered result contains exactly one professional-referral block (never more than one professional/CTA pairing)', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'commercial');
  registry.get('readinessNextButton').dispatch('click');
  selectRadio(radios, 'irExperience', 'first_time');
  registry.get('readinessNextButton').dispatch('click');
  registry.get('irProductName').value = 'כבל טעינה';
  registry.get('readinessNextButton').dispatch('click');

  const children = registry.get('readinessResult').children;
  const referralBlocks = children.filter((c) => c.className === 'ir-professional-referral');
  assert.equal(referralBlocks.length, 1);
});

test('17. the professional CTA never carries assessment answers -- it only navigates to #contact', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'commercial');
  registry.get('readinessNextButton').dispatch('click');
  selectRadio(radios, 'irExperience', 'first_time');
  registry.get('readinessNextButton').dispatch('click');
  registry.get('irProductName').value = 'סודי ואישי מאוד';
  registry.get('readinessNextButton').dispatch('click');

  const children = registry.get('readinessResult').children;
  const referralBlock = children.find((c) => c.className === 'ir-professional-referral');
  const ctaLink = referralBlock.children.find((c) => c.className === 'ir-professional-cta');
  assert.equal(ctaLink.getAttribute('href'), '#contact');
  assert.ok(!ctaLink.getAttribute('href').includes('סודי'));
  assert.ok(!ctaLink.getAttribute('href').includes('?'));
});

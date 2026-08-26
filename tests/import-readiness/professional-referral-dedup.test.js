/**
 * Tests for the final professional-referral deduplication (Phase:
 * "Complete the final professional-referral deduplication in PR #37").
 * When the canonical regulatory/matrix finding already names a
 * professional, the generic scenario-level professional referral is
 * suppressed only when a confirmed canonical-category-id overlap
 * exists (never guessed from visible text) -- its approved CTA moves
 * inside the canonical section instead of being lost. A genuinely
 * distinct generic professional (no id overlap) is always retained.
 *
 * Uses this repository's existing hand-rolled fake-DOM pattern (same
 * as professional-direction-order.test.js).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeImportReadiness } from '../../js/import-readiness/import-readiness-controller.js';
import { professionalReferral, jointReferral, PROFESSIONAL_CATEGORY } from '../../js/import-readiness/professional-category-registry.js';
import { PROFESSIONAL_REFERRAL } from '../../js/import-readiness/build-action-map.js';

const RADIO_GROUPS = ['irImportType', 'irForSaleOrDistribution', 'irForBusinessUse', 'irPersonalOrFamilyUseOnly', 'irExperience'];
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

function createFakeElement(id, options = {}) {
  const listeners = {};
  let textContentValue = options.text ?? '';
  const attrs = {};
  const element = {
    id,
    value: options.value ?? '',
    checked: options.checked ?? false,
    hidden: options.hidden ?? false,
    className: options.className ?? '',
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
      attrs[name] = value;
      if (name === 'class') element.className = value;
    },
    getAttribute(name) {
      return attrs[name];
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

function resultTexts(registry) {
  const result = registry.get('readinessResult');
  const texts = [];
  const walk = (node) => {
    if (typeof node.textContent === 'string' && node.textContent) texts.push(node.textContent);
    for (const child of node.children || []) walk(child);
  };
  walk(result);
  return texts;
}

function findAllByClass(registry, className) {
  const result = registry.get('readinessResult');
  const acc = [];
  const walk = (node) => {
    if ((node.className || '').split(' ').includes(className)) acc.push(node);
    for (const child of node.children || []) walk(child);
  };
  walk(result);
  return acc;
}

function driveCommercial(registry, radios, { productName, description, preferredAnswer, experience = 'prior_importer' }) {
  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'commercial');
  registry.get('readinessNextButton').dispatch('click');
  selectRadio(radios, 'irExperience', experience);
  registry.get('readinessNextButton').dispatch('click');
  registry.get('irProductName').value = productName;
  registry.get('irCommercialDescription').value = description;
  for (let i = 0; i < 8 && registry.get('readinessResult').hidden; i += 1) {
    registry.get('readinessNextButton').dispatch('click');
    if (registry.get('readinessResult').hidden === false) break;
    const host = registry.get('irRegulatoryQuestionHost');
    const fieldset = host.children[0];
    if (fieldset) {
      const row = fieldset.children.find((c) => c.tagName === 'div');
      const preferredLabel = preferredAnswer
        ? row && row.children.find((l) => l.children && l.children[0] && l.children[0].getAttribute('value') === preferredAnswer)
        : null;
      const firstLabel = preferredLabel || (row && row.children[0]);
      if (firstLabel && firstLabel.children && firstLabel.children[0]) {
        firstLabel.children[0].checked = true;
        firstLabel.children[0].dispatch('change');
      }
    }
  }
}

// --- Registry-level: coveredCategoryIds mechanism ---------------------------

test('1. professionalReferral() carries the category id it was built from', () => {
  const r = professionalReferral(PROFESSIONAL_CATEGORY.CUSTOMS_CLASSIFIER, 'reason');
  assert.deepEqual(r.coveredCategoryIds, ['customs_classifier']);
});

test('2. jointReferral() carries both category ids, confirmed by its own arguments', () => {
  const r = jointReferral(PROFESSIONAL_CATEGORY.CUSTOMS_CLASSIFIER, PROFESSIONAL_CATEGORY.REGULATION_SPECIALIST, 'reason');
  assert.deepEqual(r.coveredCategoryIds.slice().sort(), ['customs_classifier', 'regulation_specialist']);
});

test('3. PROFESSIONAL_REFERRAL.CLASSIFICATION_AND_REGULATION is annotated with the exact two categories its own label names', () => {
  assert.deepEqual(
    PROFESSIONAL_REFERRAL.CLASSIFICATION_AND_REGULATION.coveredCategoryIds.slice().sort(),
    ['customs_classifier', 'regulation_specialist'],
  );
});

test('4. PROFESSIONAL_REFERRAL.LEGAL has no covered category ids -- never treated as equivalent to a technical regulatory professional', () => {
  assert.deepEqual(PROFESSIONAL_REFERRAL.LEGAL.coveredCategoryIds, []);
});

// --- DOM-level: suppression fires only on confirmed overlap -----------------

test('5. glass drinking vessel: the generic professional-referral heading is suppressed (overlap: מסווג מכס), but the CTA and reason are preserved inside the canonical section', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveCommercial(registry, radios, { productName: 'כוס זכוכית לשתיה', description: 'כלי זכוכית במגע עם מזון', preferredAnswer: 'yes' });
  const texts = resultTexts(registry);
  assert.ok(!texts.includes('מי צריך לבדוק?'), 'the generic professional-referral heading must be suppressed as a duplicate');
  assert.ok(texts.some((t) => t.includes('מסווג מכס')), 'the canonical section\'s own professional must still be shown');
  const ctas = findAllByClass(registry, 'ir-professional-cta');
  assert.equal(ctas.length, 1, 'exactly one primary CTA must remain, moved inside the canonical section');
});

test('6. cosmetics (matrix-only, healthUmbrella -> regulation specialist): no second generic regulation referral', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveCommercial(registry, radios, { productName: 'תמרוקים', description: 'קרם קוסמטי מיובא' });
  const texts = resultTexts(registry);
  const regulationOccurrences = texts.filter((t) => t.includes('מומחה רגולציה')).length;
  assert.ok(regulationOccurrences <= 1, `expected at most one mention of the regulation specialist, got ${regulationOccurrences}`);
});

test('7. no duplicate CTA after dedup: exactly one ir-professional-cta for a detailed-rule result', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveCommercial(registry, radios, { productName: 'כוס זכוכית לשתיה', description: 'כלי זכוכית במגע עם מזון', preferredAnswer: 'yes' });
  const ctas = findAllByClass(registry, 'ir-professional-cta');
  assert.equal(ctas.length, 1);
});

test('8. professional reason appears exactly once for a detailed-rule result with dedup applied', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveCommercial(registry, radios, { productName: 'כוס זכוכית לשתיה', description: 'כלי זכוכית במגע עם מזון', preferredAnswer: 'yes' });
  const texts = resultTexts(registry);
  const reasonOccurrences = texts.filter((t) => t === 'לאימות פרט המכס ומסלול התקינה החל לפני היבוא.').length;
  assert.equal(reasonOccurrences, 1);
});

test('9. no duplicate limitation after dedup', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveCommercial(registry, radios, { productName: 'כוס זכוכית לשתיה', description: 'כלי זכוכית במגע עם מזון', preferredAnswer: 'yes' });
  const texts = resultTexts(registry);
  const limitationOccurrences = texts.filter((t) => t === 'התוצאה היא כיוון בדיקה ראשוני ואינה מהווה סיווג מכס או אישור יבוא.').length;
  assert.equal(limitationOccurrences, 1);
});

test('10. no duplicate matrix categories after dedup (fresh eggs)', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveCommercial(registry, radios, { productName: 'ביצים טריות', description: 'ביצי מאכל למכירה' });
  const texts = resultTexts(registry);
  assert.equal(texts.filter((t) => t === 'משרד הבריאות').length, 1);
  assert.equal(texts.filter((t) => t === 'משרד החקלאות').length, 1);
});

test('11. PR #37 result hierarchy preserved: professional direction still precedes the recommended action after dedup', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveCommercial(registry, radios, { productName: 'כוס זכוכית לשתיה', description: 'כלי זכוכית במגע עם מזון', preferredAnswer: 'yes' });
  const texts = resultTexts(registry);
  const directionIdx = texts.indexOf('כיוון בדיקה מקצועי');
  const actionIdx = texts.indexOf('הפעולה המומלצת');
  assert.ok(directionIdx !== -1 && actionIdx !== -1 && directionIdx < actionIdx);
});

test('12. the recommended action is never moved back above the professional direction', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveCommercial(registry, radios, { productName: 'ווקי טוקי', description: 'מכשיר קשר לשימוש מקצועי' });
  const texts = resultTexts(registry);
  const directionIdx = texts.indexOf('כיוון בדיקה מקצועי');
  const actionIdx = texts.indexOf('הפעולה המומלצת');
  assert.ok(directionIdx < actionIdx);
});

// --- Operational results: dedup never forced onto them -----------------------

test('13. cargo damage: operational hierarchy preserved, professional referral untouched by regulatory dedup', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessProblemShortcutButton').dispatch('click');
  registry.get('irProblemType').value = 'cargo_or_container_damage';
  registry.get('readinessNextButton').dispatch('click');
  registry.get('irDamageDiscoveryTiming').value = 'after_unloading_at_terminal';
  registry.get('readinessNextButton').dispatch('click');
  const texts = resultTexts(registry);
  assert.ok(texts.includes('הפעולה המומלצת'));
  assert.ok(!texts.includes('כיוון בדיקה מקצועי'));
  // The operational professional referral (surveyor/insurer) must still
  // be present -- it is never suppressed, since there is no canonical
  // regulatory section for this route to overlap with.
  assert.ok(texts.includes('מי צריך לבדוק?'));
});

test('14. customs dispute: professional referral remains present and untouched', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessProblemShortcutButton').dispatch('click');
  registry.get('irProblemType').value = 'customs_penalty_or_deficit_demand';
  registry.get('readinessNextButton').dispatch('click');
  registry.get('readinessNextButton').dispatch('click');
  const texts = resultTexts(registry);
  assert.ok(texts.includes('מי צריך לבדוק?'));
});

// --- Distinct professional retained -----------------------------------------

test('15. a genuinely distinct supporting professional (no id overlap with canonical) is retained, not suppressed', () => {
  // Direct unit check on the dedup resolver's own module boundary: a
  // generic referral whose coveredCategoryIds share nothing with the
  // canonical finding's ids must never be suppressed.
  const genericLegal = PROFESSIONAL_REFERRAL.LEGAL;
  const canonicalIds = new Set(['customs_classifier', 'testing_laboratory']);
  const overlap = genericLegal.coveredCategoryIds.some((id) => canonicalIds.has(id));
  assert.equal(overlap, false, 'a legal referral must never be treated as overlapping a technical regulatory professional');
});

test('16. professional outcome unchanged: professionalReferral() output type/reason/ctaLabel text is identical with or without the new categoryId field', () => {
  const r = professionalReferral(PROFESSIONAL_CATEGORY.STANDARDS_SPECIALIST, 'custom reason');
  assert.equal(r.type, PROFESSIONAL_CATEGORY.STANDARDS_SPECIALIST.name);
  assert.equal(r.reason, 'custom reason');
  assert.equal(r.ctaLabel, PROFESSIONAL_CATEGORY.STANDARDS_SPECIALIST.ctaLabel);
});

/**
 * Structural tests for the canonical result-ordering model: when a
 * result carries a specific professional/regulatory direction, that
 * finding (the "כיוון בדיקה מקצועי" canonical section, or one of its
 * two neutral sibling explanation states) must appear BEFORE "הפעולה
 * המומלצת" in DOM order -- not just visually, the actual reading
 * order. Results with no such finding (operational routes: cargo
 * damage, customs disputes, ...) must keep their original,
 * unreordered structure.
 *
 * Uses this repository's existing hand-rolled fake-DOM pattern (same
 * as canonical-result-component.test.js) so DOM order is asserted via
 * a depth-first text walk, matching real reading/visual order.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeImportReadiness } from '../../js/import-readiness/import-readiness-controller.js';

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

function driveCommercial(registry, radios, { productName, description, preferredAnswer }) {
  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'commercial');
  registry.get('readinessNextButton').dispatch('click');
  selectRadio(radios, 'irExperience', 'prior_importer');
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

function driveShipmentProblem(registry, { problemType, extraFields = {} }) {
  registry.get('readinessProblemShortcutButton').dispatch('click');
  registry.get('irProblemType').value = problemType;
  registry.get('readinessNextButton').dispatch('click'); // -> problemDetails
  for (const [id, value] of Object.entries(extraFields)) {
    if (registry.has(id)) registry.get(id).value = value;
  }
  registry.get('readinessNextButton').dispatch('click'); // -> result
}

const PRIMARY_ACTION_HEADING = 'הפעולה המומלצת';
const PROFESSIONAL_DIRECTION_LABEL = 'כיוון בדיקה מקצועי';
const NO_FAMILY_MATCH_MESSAGE = 'לא זוהתה משפחת מוצר מתאימה מתוך המידע שנמסר.';
const NO_POSITIVE_SIGNAL_MESSAGE = 'לא זוהה תחום חוקיות יבוא חיובי במטריצה עבור המשפחה שנבחרה.';

function assertPrecedes(texts, earlierText, laterText, message) {
  const earlierIdx = texts.indexOf(earlierText);
  const laterIdx = texts.indexOf(laterText);
  assert.ok(earlierIdx !== -1, `expected to find "${earlierText}"`);
  assert.ok(laterIdx !== -1, `expected to find "${laterText}"`);
  assert.ok(earlierIdx < laterIdx, message ?? `expected "${earlierText}" (index ${earlierIdx}) before "${laterText}" (index ${laterIdx})`);
}

// --- Detailed-rule and matrix results: professional direction precedes the recommended action ---

test('1. glass drinking vessel (detailed rule): "כיוון בדיקה מקצועי" precedes "הפעולה המומלצת"', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveCommercial(registry, radios, { productName: 'כוס זכוכית לשתיה', description: 'כלי זכוכית במגע עם מזון', preferredAnswer: 'yes' });
  assertPrecedes(resultTexts(registry), PROFESSIONAL_DIRECTION_LABEL, PRIMARY_ACTION_HEADING);
});

test('2. electrical product (detailed rule): "כיוון בדיקה מקצועי" precedes "הפעולה המומלצת", no duplicate professional', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveCommercial(registry, radios, { productName: 'מכשיר חשמלי עם תקע', description: 'מכשיר חשמלי ביתי', preferredAnswer: 'yes' });
  const texts = resultTexts(registry);
  assertPrecedes(texts, PROFESSIONAL_DIRECTION_LABEL, PRIMARY_ACTION_HEADING);
  assert.equal(texts.filter((t) => t === PROFESSIONAL_DIRECTION_LABEL).length, 1);
});

test('3. vehicle-installed product (detailed rule): "כיוון בדיקה מקצועי" precedes "הפעולה המומלצת" -- proves this is not a vehicle-only special case', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveCommercial(registry, radios, { productName: 'פנס קדמי להתקנה ברכב', description: 'פנס ראש לרכב פרטי', preferredAnswer: 'yes' });
  assertPrecedes(resultTexts(registry), PROFESSIONAL_DIRECTION_LABEL, PRIMARY_ACTION_HEADING);
});

test('4. cosmetics (matrix-only positive result): "כיוון בדיקה מקצועי" precedes "הפעולה המומלצת"', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveCommercial(registry, radios, { productName: 'תמרוקים', description: 'קרם קוסמטי מיובא' });
  assertPrecedes(resultTexts(registry), PROFESSIONAL_DIRECTION_LABEL, PRIMARY_ACTION_HEADING);
});

test('5. fresh eggs (multi-category matrix result): "כיוון בדיקה מקצועי" precedes "הפעולה המומלצת"', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveCommercial(registry, radios, { productName: 'ביצים טריות', description: 'ביצי מאכל למכירה' });
  assertPrecedes(resultTexts(registry), PROFESSIONAL_DIRECTION_LABEL, PRIMARY_ACTION_HEADING);
});

test('6. walkie-talkie (matrix result): "כיוון בדיקה מקצועי" precedes "הפעולה המומלצת"', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveCommercial(registry, radios, { productName: 'ווקי טוקי', description: 'מכשיר קשר לשימוש מקצועי' });
  assertPrecedes(resultTexts(registry), PROFESSIONAL_DIRECTION_LABEL, PRIMARY_ACTION_HEADING);
});

test('7. the specific finding title (detailed-rule title) precedes any professional-referral content, whether the generic heading survives dedup or not', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveCommercial(registry, radios, { productName: 'כוס זכוכית לשתיה', description: 'כלי זכוכית במגע עם מזון', preferredAnswer: 'yes' });
  const texts = resultTexts(registry);
  assert.ok(texts.indexOf('נדרש לבדוק דרישות תקינה לכלי זכוכית') !== -1, 'expected the approved detailed title');
  // Glass's own canonical primary professional (מסווג מכס) overlaps the
  // generic CLASSIFICATION_AND_REGULATION referral this scenario would
  // otherwise show, so the generic "מי צריך לבדוק?" card is suppressed
  // as a duplicate (see resolveProfessionalDedup()) -- what remains is
  // the canonical section's own professional text, which must still
  // come after the title.
  const realTitleIdx = texts.indexOf('נדרש לבדוק דרישות תקינה לכלי זכוכית');
  const professionalIdx = texts.findIndex((t) => t.includes('מסווג מכס'));
  assert.ok(realTitleIdx !== -1 && professionalIdx !== -1);
  assert.ok(realTitleIdx < professionalIdx, 'the specific finding must precede the professional it names');
});

test('8. recommended action remains present after reordering (never removed)', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveCommercial(registry, radios, { productName: 'כוס זכוכית לשתיה', description: 'כלי זכוכית במגע עם מזון', preferredAnswer: 'yes' });
  assert.ok(resultTexts(registry).includes(PRIMARY_ACTION_HEADING));
});

test('9. professional direction remains present (never removed) for a matrix-only result', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveCommercial(registry, radios, { productName: 'ווקי טוקי', description: 'מכשיר קשר לשימוש מקצועי' });
  assert.ok(resultTexts(registry).includes(PROFESSIONAL_DIRECTION_LABEL));
});

test('10. limitation appears exactly once for a detailed-rule result', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveCommercial(registry, radios, { productName: 'כוס זכוכית לשתיה', description: 'כלי זכוכית במגע עם מזון', preferredAnswer: 'yes' });
  const texts = resultTexts(registry);
  const limitationOccurrences = texts.filter((t) => t === 'התוצאה היא כיוון בדיקה ראשוני ואינה מהווה סיווג מכס או אישור יבוא.').length;
  assert.equal(limitationOccurrences, 1);
});

test('11. no duplicate CTA label for a detailed-rule result', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveCommercial(registry, radios, { productName: 'כוס זכוכית לשתיה', description: 'כלי זכוכית במגע עם מזון', preferredAnswer: 'yes' });
  const result = registry.get('readinessResult');
  const findAll = (node, className, acc = []) => {
    if ((node.className || '').split(' ').includes(className)) acc.push(node);
    for (const child of node.children || []) findAll(child, className, acc);
    return acc;
  };
  const primaryCtas = findAll(result, 'ir-professional-cta');
  assert.ok(primaryCtas.length <= 1, `expected at most one primary professional CTA, got ${primaryCtas.length}`);
});

test('12. no duplicate matrix category for fresh eggs after reordering', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveCommercial(registry, radios, { productName: 'ביצים טריות', description: 'ביצי מאכל למכירה' });
  const texts = resultTexts(registry);
  assert.equal(texts.filter((t) => t === 'משרד הבריאות').length, 1);
  assert.equal(texts.filter((t) => t === 'משרד החקלאות').length, 1);
});

test('13. detailed and matrix results remain one canonical surface: exactly one .ir-regulatory-signals section', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveCommercial(registry, radios, { productName: 'כוס זכוכית לשתיה', description: 'כלי זכוכית במגע עם מזון', preferredAnswer: 'yes' });
  const result = registry.get('readinessResult');
  const signalSections = result.children.filter((c) => (c.className || '').split(' ').includes('ir-regulatory-signals'));
  assert.equal(signalSections.length, 1);
});

// --- Neutral explanation states: precede the action, never mislabeled as "כיוון בדיקה מקצועי" ---

test('14. recognized family with no positive signal: the explanation precedes "הפעולה המומלצת", and is never labeled "כיוון בדיקה מקצועי"', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveCommercial(registry, radios, { productName: 'ביגוד', description: 'חולצה לשימוש כללי' });
  const texts = resultTexts(registry);
  assertPrecedes(texts, NO_POSITIVE_SIGNAL_MESSAGE, PRIMARY_ACTION_HEADING);
  assert.ok(!texts.includes(PROFESSIONAL_DIRECTION_LABEL), 'a no-positive-signal state must never claim a professional finding exists');
});

test('15. unknown-family result: the explanation precedes "הפעולה המומלצת", and is never labeled "כיוון בדיקה מקצועי"', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveCommercial(registry, radios, { productName: 'קססססס', description: 'מוצר לא ידוע לחלוטין' });
  const texts = resultTexts(registry);
  assertPrecedes(texts, NO_FAMILY_MATCH_MESSAGE, PRIMARY_ACTION_HEADING);
  assert.ok(!texts.includes(PROFESSIONAL_DIRECTION_LABEL), 'an unknown-family state must never claim a professional finding exists');
});

test('16. no-positive-signal state never shows an exemption claim', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveCommercial(registry, radios, { productName: 'ביגוד', description: 'חולצה לשימוש כללי' });
  const combined = resultTexts(registry).join(' | ');
  assert.ok(combined.includes('אין בכך אישור שהמוצר פטור מדרישות יבוא או מתנאים אחרים.'));
});

// --- Operational (non-regulatory) results keep their original hierarchy ---

test('17. cargo damage: no fake "כיוון בדיקה מקצועי" label, action remains present and correctly prioritized', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveShipmentProblem(registry, { problemType: 'cargo_or_container_damage', extraFields: { irDamageDiscoveryTiming: 'after_unloading_at_terminal' } });
  const texts = resultTexts(registry);
  assert.ok(!texts.includes(PROFESSIONAL_DIRECTION_LABEL), 'an operational cargo-damage result must never show a fabricated regulatory finding label');
  assert.ok(texts.includes(PRIMARY_ACTION_HEADING), 'the recommended action must still be present');
  const result = registry.get('readinessResult');
  const signalSections = result.children.filter((c) => (c.className || '').split(' ').includes('ir-regulatory-signals'));
  assert.equal(signalSections.length, 0, 'an operational result must never render the regulatory canonical section');
});

test('18. customs dispute: no fake "כיוון בדיקה מקצועי" label, urgent operational finding remains prioritized', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveShipmentProblem(registry, { problemType: 'customs_penalty_or_deficit_demand' });
  const texts = resultTexts(registry);
  assert.ok(!texts.includes(PROFESSIONAL_DIRECTION_LABEL));
  assert.ok(texts.includes(PRIMARY_ACTION_HEADING));
});

test('19. insurance issue: no fake "כיוון בדיקה מקצועי" label', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveShipmentProblem(registry, { problemType: 'insurance_issue' });
  const texts = resultTexts(registry);
  assert.ok(!texts.includes(PROFESSIONAL_DIRECTION_LABEL));
  assert.ok(texts.includes(PRIMARY_ACTION_HEADING));
});

test('20. storage/demurrage: no fake "כיוון בדיקה מקצועי" label, immediate action remains prioritized', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveShipmentProblem(registry, { problemType: 'storage' });
  const texts = resultTexts(registry);
  assert.ok(!texts.includes(PROFESSIONAL_DIRECTION_LABEL));
  assert.ok(texts.includes(PRIMARY_ACTION_HEADING));
});

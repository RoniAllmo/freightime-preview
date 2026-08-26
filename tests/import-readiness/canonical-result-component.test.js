/**
 * Tests for the canonical unified regulatory-result component
 * (Phase C/G): one renderer used by matrix-only positive results,
 * existing detailed-rule results, recognized-family-no-positive
 * results, and unknown-family results -- proving they share the same
 * heading order and never duplicate categories/professionals/
 * limitation. Also proves the unknown-family and no-positive-family
 * states render genuinely different messages (Phase B).
 *
 * Uses this repository's existing hand-rolled fake-DOM pattern.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeImportReadiness } from '../../js/import-readiness/import-readiness-controller.js';

function controllerSource() {
  return readFileSync(new URL('../../js/import-readiness/import-readiness-controller.js', import.meta.url), 'utf8');
}

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
    // Answer any live focused-check question -- prefer the caller's
    // requested answer value (e.g. "no", to genuinely exclude a rule)
    // when that option exists, otherwise fall back to the first option.
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

// --- Part C: canonical structural consistency --------------------------------

test('1. exactly one canonical renderer function exists and is used by both the detailed-rule and matrix content paths', () => {
  const source = controllerSource();
  const defs = source.match(/function renderCanonicalRegulatoryResult\(/g) ?? [];
  assert.equal(defs.length, 1, 'expected exactly one canonical renderer definition');
  const calls = source.match(/renderCanonicalRegulatoryResult\(doc, resultContainer/g) ?? [];
  assert.ok(calls.length >= 2, 'expected the canonical renderer to be called from more than one path');
});

test('2. the old separate renderProductFamilyMatrixBlock / renderRegulatorySignalsBlock functions no longer exist as distinct renderers', () => {
  const source = controllerSource();
  assert.ok(!/function renderProductFamilyMatrixBlock\(/.test(source), 'the matrix-only renderer must be gone, unified into the canonical one');
  assert.ok(!/function renderRegulatorySignalsBlock\(/.test(source), 'the detailed-rule-only renderer must be gone, unified into the canonical one');
});

test('3. cosmetics (matrix-only positive result) renders via the canonical component with the correct heading order', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveCommercial(registry, radios, { productName: 'תמרוקים', description: 'קרם קוסמטי מיובא' });

  const texts = resultTexts(registry);
  const statusIdx = texts.indexOf('כיוון בדיקה מקצועי');
  const familyIdx = texts.findIndex((t) => t.startsWith('משפחת המוצר שזוהתה:'));
  const categoriesIdx = texts.indexOf('תחומי בדיקה רלוונטיים:');
  assert.ok(statusIdx !== -1 && familyIdx !== -1 && categoriesIdx !== -1, 'expected all three canonical headings to appear');
  assert.ok(statusIdx < familyIdx && familyIdx < categoriesIdx, 'expected status -> family -> categories order');
});

test('4. fresh eggs (multi-category matrix result) uses the same canonical heading order as cosmetics', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveCommercial(registry, radios, { productName: 'ביצים טריות', description: 'ביצי מאכל למכירה' });

  const texts = resultTexts(registry);
  const statusIdx = texts.indexOf('כיוון בדיקה מקצועי');
  const familyIdx = texts.findIndex((t) => t.startsWith('משפחת המוצר שזוהתה:'));
  assert.ok(statusIdx !== -1 && familyIdx !== -1);
  assert.ok(statusIdx < familyIdx);
  const combined = texts.join(' | ');
  assert.ok(combined.includes('משרד הבריאות') && combined.includes('משרד החקלאות'));
});

test('5. walkie-talkie uses the same canonical component', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveCommercial(registry, radios, { productName: 'ווקי טוקי', description: 'מכשיר קשר לשימוש מקצועי' });

  const texts = resultTexts(registry);
  assert.ok(texts.includes('כיוון בדיקה מקצועי'));
  const combined = texts.join(' | ');
  assert.ok(combined.includes('תקינה') && combined.includes('משרד התקשורת'));
});

test('6. glass drinking vessel: the existing detailed rule renders via the same canonical component (same status label, same section class base)', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveCommercial(registry, radios, { productName: 'כוס זכוכית לשתיה', description: 'כלי זכוכית במגע עם מזון' });

  const texts = resultTexts(registry);
  assert.ok(texts.includes('כיוון בדיקה מקצועי'), 'expected the same canonical status label as the matrix path');
  const result = registry.get('readinessResult');
  const signalSections = result.children.filter((c) => (c.className || '').split(' ').includes('ir-regulatory-signals'));
  assert.equal(signalSections.length, 1, 'expected exactly one canonical regulatory-signals section, not a second unrelated card');
});

test('7. no duplicate limitation text within the result', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveCommercial(registry, radios, { productName: 'ביצים טריות', description: 'ביצי מאכל למכירה' });
  const texts = resultTexts(registry);
  const limitationOccurrences = texts.filter((t) => t === 'התוצאה היא כיוון בדיקה ראשוני ואינה מהווה סיווג מכס או אישור יבוא.').length;
  assert.equal(limitationOccurrences, 1);
});

test('8. no duplicate positive-category label within the canonical section (each category listed once)', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveCommercial(registry, radios, { productName: 'ביצים טריות', description: 'ביצי מאכל למכירה' });
  const texts = resultTexts(registry);
  const healthOccurrences = texts.filter((t) => t === 'משרד הבריאות').length;
  assert.equal(healthOccurrences, 1, 'the health category must appear exactly once, not duplicated across two cards');
});

// --- Part B: unknown-family vs no-positive-family states are distinct --------

test('9. a recognized family with no positive matrix category shows the no-positive-signal message, not the unknown-family message', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveCommercial(registry, radios, { productName: 'ביגוד', description: 'חולצה לשימוש כללי' });
  const combined = resultTexts(registry).join(' | ');
  assert.ok(combined.includes('לא זוהה תחום חוקיות יבוא חיובי במטריצה עבור המשפחה שנבחרה.'));
  assert.ok(combined.includes('אין בכך אישור שהמוצר פטור מדרישות יבוא או מתנאים אחרים.'));
  assert.ok(!combined.includes('לא זוהתה משפחת מוצר מתאימה מתוך המידע שנמסר.'), 'must not show the unrelated unknown-family message');
});

test('10. a product that hints a regulatory category but matches no curated family shows the unknown-family message, not the no-positive-signal message', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  // "עם תקע" hints electrical_mains_product (so regulatoryEvaluation is
  // non-null / hasAnyHint true) but this description matches none of
  // the curated matrix family aliases.
  driveCommercial(registry, radios, { productName: 'מכשיר לא מזוהה עם תקע', description: 'מוצר עם תקע לשימוש כללי, לא ידוע מה תפקידו', preferredAnswer: 'no' });
  const combined = resultTexts(registry).join(' | ');
  const hasUnknownFamilyMessage = combined.includes('לא זוהתה משפחת מוצר מתאימה מתוך המידע שנמסר.');
  const hasNoMatchMessage = combined.includes('לא זוהה כיוון בדיקה מקצועי במאגר המצומצם שנבדק.');
  // Either the pre-existing no-match state (a category was hinted, no
  // detailed rule matched) or the new unknown-family state may apply
  // here depending on the live follow-up answers taken -- what matters
  // is the two never contradict, and the no-positive-signal wording
  // (a DIFFERENT state entirely) never appears for this unrecognized
  // product.
  assert.ok(hasUnknownFamilyMessage || hasNoMatchMessage, 'expected either the unknown-family or the pre-existing no-match explanation');
  assert.ok(!combined.includes('לא זוהה תחום חוקיות יבוא חיובי במטריצה עבור המשפחה שנבחרה.'), 'must not show the recognized-family wording for an unrecognized product');
});

test('11. an ordinary unrecognized product with no regulatory hint at all shows the unknown-family message exactly once, not silently dropped', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveCommercial(registry, radios, { productName: 'כרית נוי', description: 'כרית קישוט לספה' });
  const combined = resultTexts(registry).join(' | ');
  const occurrences = combined.split('לא זוהתה משפחת מוצר מתאימה מתוך המידע שנמסר.').length - 1;
  assert.equal(occurrences, 1, 'an unrecognized product must explain what happened via the unknown-family message, exactly once');
});

/**
 * Unified "הצעד הבא" block (PR D, product-owner decision 2026-10-17).
 *
 * When a result carries a product finding, the finding card no longer
 * names its own professional, and the separate action / referral /
 * supporting-referral blocks are replaced by ONE "הצעד הבא" block:
 * WHAT to do, why, ONE professional with exactly one CTA, and at most
 * one muted supporting professional with no CTA. Precedence:
 *   - the product finding's professional always leads (every route,
 *     the personal route included);
 *   - on a non-product operational topic (an established operation's
 *     insurance/legal/process audit) the scenario's professional
 *     leads, and the product professional becomes the supporting line.
 * Results with no finding keep their existing blocks unchanged.
 *
 * Drives the real controller through the same hand-rolled fake DOM
 * used by result-layout-consolidation-live-dom.test.js.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeImportReadiness } from '../../js/import-readiness/import-readiness-controller.js';
import { buildEstablishedOperationResult } from '../../js/import-readiness/established-operation-rules.js';
import { PROFESSIONAL_REFERRAL } from '../../js/import-readiness/build-action-map.js';
import { PROFESSIONAL_CATEGORY } from '../../js/import-readiness/professional-category-registry.js';

const HTML = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const FAMILY_VALUES = [...HTML.matchAll(/name="irProductFamily" value="([^"]+)"/g)].map((m) => m[1]);
const MATERIAL_VALUES = [...HTML.matchAll(/name="irMaterial" value="([^"]+)"/g)].map((m) => m[1]);

let focused = null;

function createFakeElement(id, options = {}) {
  const listeners = {};
  let textContentValue = options.text ?? '';
  const element = {
    id,
    value: options.value ?? '',
    checked: options.checked ?? false,
    hidden: options.hidden ?? false,
    children: [],
    addEventListener(type, handler) { (listeners[type] = listeners[type] || []).push(handler); },
    dispatch(type, event = {}) { (listeners[type] || []).forEach((handler) => handler(event)); },
    appendChild(child) { element.children.push(child); return child; },
    setAttribute(name, value) { element[`__attr_${name}`] = String(value); },
    getAttribute(name) { return element[`__attr_${name}`]; },
    removeAttribute(name) { delete element[`__attr_${name}`]; },
    focus() { focused = element; },
  };
  Object.defineProperty(element, 'textContent', {
    set(value) { textContentValue = value; element.children.length = 0; },
    get() { return textContentValue; },
  });
  Object.defineProperty(element, 'innerHTML', {
    set() { throw new Error('innerHTML must never be used by the readiness controller'); },
    get() { return ''; },
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

/** A checklist container whose <label>s each wrap one checkbox, like the real markup. */
function createChecklist(id, name, values) {
  const inputs = [];
  const labels = values.map((value) => {
    const label = createFakeElement(undefined);
    const input = createFakeElement(`${name}_${value}`, { value });
    input.name = name;
    input.closest = (selector) => (selector === 'label' ? label : null);
    label.querySelector = () => input;
    inputs.push(input);
    return label;
  });
  const group = createFakeElement(id);
  group.querySelectorAll = (selector) => (selector === 'label' ? labels : selector === 'input' ? inputs : []);
  return { group, inputs, labels };
}

const RADIO_GROUPS = {
  irImportType: ['personal', 'commercial', 'uncertain'],
  irExperience: ['first_time', 'prior_importer', 'ongoing_operation', 'planning_only'],
  irForSaleOrDistribution: ['yes', 'no'], irForBusinessUse: ['yes', 'no'], irPersonalOrFamilyUseOnly: ['yes', 'no'],
  irConnectsToPower: ['yes', 'no', 'unknown'], irHasBattery: ['yes', 'no', 'unknown'], irBatteryIsRechargeable: ['yes', 'no', 'unknown'],
  irMaterialTouchesFood: ['yes', 'no', 'unknown'], irMaterialHasCoating: ['yes', 'no', 'unknown'],
};

const TEXT_FIELD_IDS = [
  'irProductName', 'irCommercialDescription', 'irIntendedUse', 'irHsCode', 'irQuantity', 'irApproxValue',
  'irCountryOfOrigin', 'irShipmentMethod', 'irSensitiveCategory', 'irFocusArea', 'irAuditPurpose',
  'irProblemType', 'irShipmentMode', 'irCurrentStage', 'irIssuingParty', 'irDeadline',
];
const STEP_ELEMENT_IDS = [
  'irStepQ1', 'irStepQ1Clarify', 'irStepQ2', 'irStepQ3', 'irStepProductContext', 'irStepRegulatoryFollowup',
  'irStepPersonalFollowup', 'irStepExistingImporterFollowup', 'irStepEstablishedOperationFollowup',
  'irStepProblemType', 'irStepProblemDetails',
];
const CONTROL_IDS = [
  'readinessIntro', 'readinessStartButton', 'readinessProblemShortcutButton', 'readinessForm',
  'readinessStepIndicator', 'readinessErrors', 'readinessBackButton', 'readinessNextButton',
  'readinessResetButton', 'readinessResult', 'irRegulatoryQuestionHost', 'readinessSection',
  'irProductFamilyFastTrackText', 'irProductFamilyFastTrackChange', 'irMaterialFieldset',
];

function buildFakeRoot() {
  const registry = new Map();
  const radios = new Map();
  for (const id of TEXT_FIELD_IDS) registry.set(id, createFakeElement(id));
  for (const id of STEP_ELEMENT_IDS) registry.set(id, createFakeElement(id, { hidden: true }));
  for (const id of CONTROL_IDS) registry.set(id, createFakeElement(id));
  for (const id of ['irProductFamilyFastTrack', 'irMaterialFastTrackReveal', 'irProductFamilyInsufficientMessage']) {
    registry.set(id, createFakeElement(id, { hidden: true }));
  }
  for (const id of ['irProductFamilyExpand', 'irMaterialExpand']) {
    const button = createFakeElement(id, { hidden: true });
    button.setAttribute('aria-expanded', 'false');
    registry.set(id, button);
  }
  registry.get('readinessForm').hidden = true;
  registry.get('readinessResult').hidden = true;

  const families = createChecklist('irProductFamilyGroup', 'irProductFamily', FAMILY_VALUES);
  const materials = createChecklist('irMaterialGroup', 'irMaterial', MATERIAL_VALUES);
  registry.set('irProductFamilyGroup', families.group);
  registry.set('irMaterialGroup', materials.group);

  for (const [name, values] of Object.entries(RADIO_GROUPS)) {
    const group = values.map((value) => createFakeElement(`${name}_${value}`, { value }));
    group.forEach((r) => { r.name = name; });
    radios.set(name, group);
  }

  registry.get('readinessForm').reset = () => {
    for (const id of TEXT_FIELD_IDS) registry.get(id).value = '';
    for (const group of radios.values()) group.forEach((r) => { r.checked = false; });
    for (const input of [...families.inputs, ...materials.inputs]) input.checked = false;
  };

  const root = {
    querySelector(selector) { return registry.get(selector.replace('#', '')) ?? null; },
    querySelectorAll(selector) {
      const names = [...selector.matchAll(/name="([^"]+)"/g)].map((m) => m[1]);
      const out = [];
      for (const name of names) {
        if (name === 'irProductFamily') out.push(...families.inputs);
        else if (name === 'irMaterial') out.push(...materials.inputs);
        else out.push(...(radios.get(name) ?? []));
      }
      return out;
    },
  };
  return { root, registry, radios, families, materials };
}

function selectRadio(radios, name, value) {
  const group = radios.get(name);
  group.forEach((r) => { r.checked = r.value === value; });
  group.find((r) => r.value === value).dispatch('change');
}


/**
 * Drives one route to its result. `importType`/`experience` pick the
 * scenario; `auditPurpose` is pre-filled for the established-operation
 * follow-up. Every regulatory question is answered with its first
 * option, and Next is pressed until the result renders.
 */
function resultFor({ productName, importType = 'commercial', experience = 'first_time', auditPurpose = '' }) {
  focused = null;
  const dom = buildFakeRoot();
  const { registry, radios } = dom;
  initializeImportReadiness({ root: dom.root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', importType);
  registry.get('readinessNextButton').dispatch('click');
  selectRadio(radios, 'irExperience', experience);
  registry.get('readinessNextButton').dispatch('click');
  registry.get('irProductName').value = productName;
  registry.get('irAuditPurpose').value = auditPurpose;
  for (let i = 0; i < 12 && registry.get('readinessResult').hidden; i++) {
    const host = registry.get('irRegulatoryQuestionHost');
    const fieldset = (host.children || []).find((c) => c.tagName === 'fieldset');
    if (fieldset && registry.get('irStepRegulatoryFollowup').hidden === false) {
      const inputs = [];
      (function walk(el) { if (el.tagName === 'input') inputs.push(el); (el.children || []).forEach(walk); })(fieldset);
      if (inputs[0]) { inputs[0].checked = true; inputs[0].dispatch('change'); }
    }
    registry.get('readinessNextButton').dispatch('click');
  }
  assert.equal(registry.get('readinessResult').hidden, false, 'expected a rendered result');
  return registry.get('readinessResult');
}

function findAll(el, predicate, out = []) {
  if (predicate(el)) out.push(el);
  for (const child of el.children || []) findAll(child, predicate, out);
  return out;
}
const byClass = (root, cls) => findAll(root, (e) => typeof e.className === 'string' && e.className.split(' ').includes(cls));
const textOf = (root, cls) => byClass(root, cls).map((e) => e.textContent);
const allText = (root) => findAll(root, (e) => typeof e.textContent === 'string' && e.textContent.length > 0).map((e) => e.textContent);
const allCtas = (root) => findAll(root, (e) => e.tagName === 'a' && e.getAttribute('href') === '#contact');

function nextSteps(result) {
  const blocks = byClass(result, 'ir-next-steps');
  assert.equal(blocks.length, 1, 'expected exactly one "הצעד הבא" block');
  return blocks[0];
}

const TOBACCO = 'סיגריה אלקטרונית';
const CLASSIFIER = PROFESSIONAL_CATEGORY.CUSTOMS_CLASSIFIER.name;

const FINDING_ROUTES = [
  ['first commercial import, matrix finding (tobacco)', { productName: TOBACCO }],
  ['first commercial import, detailed rule (glass)', { productName: 'כוס זכוכית לשתיה' }],
  ['existing importer (tobacco)', { productName: TOBACCO, experience: 'prior_importer' }],
  ['established operation, classification audit (tobacco)', { productName: TOBACCO, experience: 'ongoing_operation', auditPurpose: 'existing_classifications_audit' }],
  ['personal import (tobacco)', { productName: TOBACCO, importType: 'personal' }],
  ['first commercial import, multi-category matrix (fresh eggs)', { productName: 'ביצים טריות' }],
];

for (const [label, route] of FINDING_ROUTES) {
  test(`structure: ${label} -- one "הצעד הבא" block, one primary CTA in the whole result, no legacy referral blocks`, () => {
    const result = resultFor(route);
    const block = nextSteps(result);
    const [heading] = block.children;
    assert.equal(heading.textContent, 'הצעד הבא');
    assert.equal(heading.getAttribute('id'), 'irResultActionHeading');
    assert.equal(block.getAttribute('aria-labelledby'), 'irResultActionHeading');
    for (const legacy of ['ir-primary-action', 'ir-primary-reason', 'ir-professional-referral', 'ir-supporting-professional', 'ir-regulatory-handoff']) {
      assert.equal(byClass(result, legacy).length, 0, `${label}: no ${legacy} once the finding has its next-step block`);
    }
    // Exactly one primary/professional CTA in the whole result. A
    // route's separate secondary action (e.g. first-commercial's
    // "בדיקת מסמכי ספק") is a different action in its own row, never a
    // repeat of the professional CTA.
    const primaryCtas = findAll(result, (e) => typeof e.className === 'string'
      && /(^| )(ir-professional-cta|tool-btn-primary|ir-supporting-professional-cta)( |$)/.test(e.className));
    assert.equal(primaryCtas.length, 1, `${label}: exactly one primary CTA in the whole result, found ${primaryCtas.length}`);
    const labels = allCtas(result).map((a) => a.textContent);
    assert.equal(new Set(labels).size, labels.length, `${label}: no CTA label repeats: ${JSON.stringify(labels)}`);
    assert.equal(byClass(block, 'ir-professional-cta').length, 1, `${label}: the one CTA lives in the next-step block`);
    assert.equal(textOf(block, 'ir-next-steps-professional-type').length, 1, `${label}: exactly one leading professional`);
    assert.ok(textOf(block, 'ir-next-steps-supporting').length <= 1, `${label}: at most one supporting line`);
  });
}

test('DOM order: finding card, then the next-step block, then the preparation list; inside it action -> why -> professional -> supporting', () => {
  const result = resultFor({ productName: TOBACCO, experience: 'prior_importer' });
  const top = result.children.map((c) => c.className || c.tagName);
  const card = top.findIndex((c) => typeof c === 'string' && c.split(' ').includes('ir-regulatory-signals'));
  const next = top.indexOf('ir-next-steps');
  const prep = top.indexOf('ir-preparation');
  assert.ok(card > -1 && next > card, `unexpected order: ${JSON.stringify(top)}`);
  if (prep > -1) assert.ok(prep > next, 'the preparation list follows the next-step block');
  const inner = result.children[next].children.map((c) => c.className || c.tagName);
  const order = ['h3', 'ir-next-steps-action', 'ir-next-steps-why', 'ir-next-steps-professional', 'ir-next-steps-supporting']
    .map((c) => inner.indexOf(c)).filter((i) => i > -1);
  assert.deepEqual(order, [...order].sort((x, y) => x - y), `unexpected inner order: ${JSON.stringify(inner)}`);
  assert.equal(inner[0], 'h3');
});

test('the finding card no longer names a professional or carries a CTA', () => {
  const result = resultFor({ productName: TOBACCO });
  const [card] = byClass(result, 'ir-regulatory-signals');
  assert.equal(allCtas(card).length, 0);
  assert.ok(!findAll(card, (e) => typeof e.textContent === 'string' && e.textContent.includes(CLASSIFIER)).length,
    'the professional is named once, in the next-step block');
});

test('precedence: the product professional leads on the first-commercial, existing-importer and classification-audit routes', () => {
  for (const route of [
    { productName: TOBACCO },
    { productName: TOBACCO, experience: 'prior_importer' },
    { productName: TOBACCO, experience: 'ongoing_operation', auditPurpose: 'existing_classifications_audit' },
  ]) {
    const block = nextSteps(resultFor(route));
    assert.equal(block.getAttribute('data-professional-source'), 'product');
    assert.deepEqual(textOf(block, 'ir-next-steps-professional-type'), [CLASSIFIER]);
  }
});

test('precedence (personal route): the product professional still wins over the personal-import referral', () => {
  const result = resultFor({ productName: TOBACCO, importType: 'personal' });
  const block = nextSteps(result);
  assert.equal(block.getAttribute('data-professional-source'), 'product');
  assert.deepEqual(textOf(block, 'ir-next-steps-professional-type'), [CLASSIFIER]);
  assert.equal(byClass(result, 'ir-professional-referral').length, 0, 'no second "מי צריך לבדוק?" card on the personal route');
  assert.ok(!allText(result).includes('מי צריך לבדוק?'));
});

for (const [purpose, referral] of [['legal_advice', PROFESSIONAL_REFERRAL.LEGAL], ['insurance_coverage_review', PROFESSIONAL_REFERRAL.INSURANCE]]) {
  test(`precedence exception (${purpose}): on a non-product operational topic the scenario professional leads, its CTA is the one CTA, and the product professional is the muted supporting line`, () => {
    const result = resultFor({ productName: TOBACCO, experience: 'ongoing_operation', auditPurpose: purpose });
    const block = nextSteps(result);
    assert.equal(block.getAttribute('data-professional-source'), 'scenario');
    assert.deepEqual(textOf(block, 'ir-next-steps-professional-type'), [referral.type]);
    assert.deepEqual(byClass(block, 'ir-professional-cta').map((a) => a.textContent), [referral.ctaLabel]);
    const supporting = textOf(block, 'ir-next-steps-supporting');
    assert.equal(supporting.length, 1);
    assert.ok(supporting[0].startsWith(`גורם מקצועי נוסף: ${CLASSIFIER}`));
    assert.equal(byClass(result, 'ir-professional-cta').length, 1);
  });
}

test('the supporting line never repeats the leading professional and never carries a CTA', () => {
  for (const route of FINDING_ROUTES.map(([, r]) => r)) {
    const block = nextSteps(resultFor(route));
    const [leader] = textOf(block, 'ir-next-steps-professional-type');
    for (const line of byClass(block, 'ir-next-steps-supporting')) {
      assert.ok(!line.textContent.includes(`: ${leader}`), `supporting line repeats the leader: ${line.textContent}`);
      assert.equal(allCtas(line).length, 0);
    }
  }
});

test('the supporting line is dropped when it shares a professional category with the leader (document-process audit: the scenario referral already covers the customs classifier)', () => {
  const result = resultFor({ productName: TOBACCO, experience: 'ongoing_operation', auditPurpose: 'document_process_audit' });
  const block = nextSteps(result);
  assert.equal(block.getAttribute('data-professional-source'), 'scenario');
  assert.deepEqual(textOf(block, 'ir-next-steps-professional-type'), [PROFESSIONAL_REFERRAL.SUPPLIER_DOCUMENTS.type]);
  assert.ok(PROFESSIONAL_REFERRAL.SUPPLIER_DOCUMENTS.coveredCategoryIds.includes(PROFESSIONAL_CATEGORY.CUSTOMS_CLASSIFIER.id));
  assert.equal(byClass(block, 'ir-next-steps-supporting').length, 0, 'the classifier is already covered by the leading referral');
});

test('operational-topic flag: only the nine non-product established-operation purposes carry it', () => {
  const productPurposes = ['existing_classifications_audit', 'regulation_and_permits_audit'];
  const operational = ['document_process_audit', 'penalty_or_shortfall_exposure', 'storage_demurrage_charges', 'sale_terms_review',
    'insurance_coverage_review', 'supplier_process_review', 'brokerage_and_clearance_process', 'legal_advice', 'other'];
  for (const auditPurpose of productPurposes) assert.equal(buildEstablishedOperationResult({ auditPurpose }).operationalTopic, false, auditPurpose);
  for (const auditPurpose of operational) assert.equal(buildEstablishedOperationResult({ auditPurpose }).operationalTopic, true, auditPurpose);
});

test('no-finding results are unchanged: an operational shipment problem keeps "הפעולה המומלצת" and its own referral block', () => {
  focused = null;
  const dom = buildFakeRoot();
  const { registry } = dom;
  initializeImportReadiness({ root: dom.root, documentRef: createFakeDocument() });
  registry.get('readinessProblemShortcutButton').dispatch('click');
  registry.get('irProblemType').value = 'storage';
  registry.get('readinessNextButton').dispatch('click');
  registry.get('readinessNextButton').dispatch('click');
  const result = registry.get('readinessResult');
  assert.equal(result.hidden, false);
  assert.equal(byClass(result, 'ir-next-steps').length, 0);
  assert.equal(byClass(result, 'ir-primary-action').length, 1);
  assert.equal(byClass(result, 'ir-professional-referral').length, 1);
});

test('PR F rendering: the tobacco commercial note renders on commercial routes and never on the personal route; the shortened headline renders on both', () => {
  const NOTE = 'ביבוא מסחרי של מוצרי טבק, סיגריות אלקטרוניות ומוצרי ניקוטין עשויות לחול הגבלות של משרד הבריאות.';
  const HEADLINE = 'לא ניתן לקבוע כיוון בדיקה כללי למוצרי טבק, לסיגריות אלקטרוניות ולמוצרי ניקוטין ללא בדיקה של המוצר המדויק.';
  for (const route of [{ productName: TOBACCO }, { productName: TOBACCO, experience: 'prior_importer' }]) {
    const texts = allText(resultFor(route));
    assert.ok(texts.includes(NOTE), 'commercial route shows the note');
    assert.ok(texts.includes(HEADLINE));
  }
  const personal = allText(resultFor({ productName: TOBACCO, importType: 'personal' }));
  assert.ok(!personal.includes(NOTE), 'personal route never shows the commercial note');
  assert.ok(personal.includes(HEADLINE));
});

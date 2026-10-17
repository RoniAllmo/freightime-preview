/**
 * Flow and clarity fixes (product-owner decisions, 2026-10-17):
 *
 * 1. The ongoing-operation route's "מה מטרת הבדיקה?" dropdown opens
 *    with a plain product check -- "בדיקת דרישות יבוא למוצר ספציפי" --
 *    that yields a standard product-requirements result, without the
 *    operational-audit framing.
 * 2. A confidently recognized family with no positive category
 *    (tobacco, clothing, solar panels) is the final answer: the
 *    "מידע שחסר להמשך בדיקה" block and its "לא זוהה כיוון בדיקה ממוקד"
 *    line never render for it. A genuinely unknown product still gets
 *    them.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeImportReadiness } from '../../js/import-readiness/import-readiness-controller.js';
import { buildEstablishedOperationResult } from '../../js/import-readiness/established-operation-rules.js';
import { normalizeReadinessInput } from '../../js/import-readiness/normalize-readiness-input.js';
import { RESULT_STATE, isNoDirectionMessageAllowed } from '../../js/import-readiness/result-state.js';
import { NO_MATCH_MESSAGE } from '../../js/import-readiness/regulatory-signals/matcher.js';

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


const MISSING_INFO_HEADING = 'מידע שחסר להמשך בדיקה';
const NO_FOCUSED_DIRECTION = 'לא זוהה כיוון בדיקה ממוקד על בסיס הפרטים שנמסרו.';

const RECOGNIZED_NO_POSITIVE = [
  ['tobacco', 'סיגריה אלקטרונית', 'מוצרי טבק וסיגריות אלקטרוניות'],
  ['clothing', 'ביגוד', null],
  ['solar panels', 'פאנל סולארי', 'פאנלים סולאריים'],
];
const ROUTES = [
  ['first commercial import', {}],
  ['existing importer', { experience: 'prior_importer' }],
  ['personal import', { importType: 'personal' }],
  ['ongoing operation, specific product check', { experience: 'ongoing_operation', auditPurpose: 'specific_product_requirements' }],
];

function assertNoMissingInfo(result, label) {
  const texts = allText(result);
  assert.ok(byClass(result, 'ir-regulatory-signals').length === 1, `${label}: the family finding renders`);
  assert.equal(byClass(result, 'ir-result-brief').length, 0, `${label}: no missing-information section`);
  assert.ok(!texts.some((t) => t.includes(MISSING_INFO_HEADING)), `${label}: no "${MISSING_INFO_HEADING}"`);
  assert.ok(!texts.some((t) => t.includes(NO_FOCUSED_DIRECTION)), `${label}: no "${NO_FOCUSED_DIRECTION}"`);
  assert.ok(!texts.includes(NO_MATCH_MESSAGE), `${label}: no "no direction" note anywhere, collapsed details included`);
  assert.equal(byClass(result, 'ir-no-match').length, 0, `${label}: no no-match block`);
}

for (const [familyLabel, productName, familyName] of RECOGNIZED_NO_POSITIVE) {
  for (const [routeLabel, route] of ROUTES) {
    test(`missing info suppressed: ${familyLabel} on the ${routeLabel} route`, () => {
      const result = resultFor({ productName, ...route });
      const label = `${familyLabel} / ${routeLabel}`;
      assert.equal(byClass(result, 'ir-regulatory-status-label').length, 0, `${label}: a recognized family with no positive category`);
      if (familyName) assert.ok(allText(result).includes(`משפחת המוצר שזוהתה: ${familyName}`), `${label}: family identified`);
      assertNoMissingInfo(result, label);
    });
  }
}

test('a genuinely unknown product still gets the missing-information block', () => {
  const result = resultFor({ productName: 'קססססס' });
  const texts = allText(result);
  assert.ok(texts.some((t) => t.includes(MISSING_INFO_HEADING)) || texts.includes(NO_FOCUSED_DIRECTION),
    'the unknown-family state keeps its missing-information guidance');
});

test('gate: only an unknown family or an unresolved selection may carry the "no focused direction" text', () => {
  assert.equal(isNoDirectionMessageAllowed(RESULT_STATE.RECOGNIZED_NO_POSITIVE_DIRECTION), false);
  assert.equal(isNoDirectionMessageAllowed(RESULT_STATE.UNKNOWN_FAMILY), true);
  assert.equal(isNoDirectionMessageAllowed(RESULT_STATE.SELECTION_INFORMATION_NEEDED), true);
  for (const state of [RESULT_STATE.MATCHED_DETAILED_DIRECTION, RESULT_STATE.MATCHED_MATRIX_DIRECTION,
    RESULT_STATE.MATCHED_COMBINED_DIRECTION, RESULT_STATE.OPERATIONAL_RESULT, RESULT_STATE.GENERIC_ONLY]) {
    assert.equal(isNoDirectionMessageAllowed(state), false, state);
  }
});

test('dropdown markup: "בדיקת דרישות יבוא למוצר ספציפי" is the first (default) purpose option', () => {
  const select = HTML.match(/<select id="irAuditPurpose">([\s\S]*?)<\/select>/);
  assert.ok(select);
  const options = [...select[1].matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(options[0], ['specific_product_requirements', 'בדיקת דרישות יבוא למוצר ספציפי']);
  assert.equal(options.length, 12, 'the eleven existing purposes are all kept');
});

test('the new purpose is a standard product check: product-requirements action, classification/regulation referral, not operational', () => {
  const result = buildEstablishedOperationResult(normalizeReadinessInput({ auditPurpose: 'specific_product_requirements' }));
  assert.equal(result.routeLabel, 'פעילות יבוא קיימת — בדיקת דרישות יבוא למוצר ספציפי');
  assert.equal(result.primaryAction, 'יש לתאם בדיקה מקצועית של סיווג המכס ודרישות היבוא, לפני הזמנה או שילוח.');
  assert.ok(!/ביקורת|חשיפות|תהליך/.test(result.primaryAction), 'no operational-audit framing');
  assert.equal(result.operationalTopic, false);
  assert.equal(result.professional.type, 'מסווג מכס או מומחה רגולציה');
  assert.ok(result.preparationItems.includes('מפרט טכני או קטלוג'));
});

test('routing: choosing the new option on the ongoing-operation route renders a product result led by the product professional', () => {
  const result = resultFor({ productName: 'כוס זכוכית לשתיה', experience: 'ongoing_operation', auditPurpose: 'specific_product_requirements' });
  const texts = allText(result);
  assert.ok(texts.includes('המסלול: פעילות יבוא קיימת — בדיקת דרישות יבוא למוצר ספציפי'));
  assert.ok(texts.includes('נדרש לבדוק דרישות תקינה לכלי זכוכית'), 'the product finding renders');
  const [next] = byClass(result, 'ir-next-steps');
  assert.equal(next.getAttribute('data-professional-source'), 'product');
  assert.equal(byClass(result, 'ir-professional-cta').length, 1);
});

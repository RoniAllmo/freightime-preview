/**
 * Status-pill removal (product-owner decision, 2026-10-17): on product
 * routes the generic status pill ("מומלץ לבצע בדיקה מקצועית לפני
 * שילוח", "מומלץ להשלים פרטים לפני הזמנה", "ניתן להתקדם באיסוף מידע")
 * read as an evasive answer to "do I need an import approval?". The
 * result now opens directly with the product finding; "הצעד הבא" makes
 * the referral. In-progress shipment-problem results keep their status,
 * which carries urgency.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeImportReadiness } from '../../js/import-readiness/import-readiness-controller.js';
import { RESULT_STATUS } from '../../js/import-readiness/result-brief.js';

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



const GENERIC_STATUSES = [
  RESULT_STATUS.PROFESSIONAL_CHECK_BEFORE_SHIPPING,
  RESULT_STATUS.COMPLETE_DETAILS_BEFORE_ORDERING,
  RESULT_STATUS.CAN_PROCEED_GATHERING_INFO,
];

const ROUTES = [
  ['first commercial import', {}],
  ['existing importer', { experience: 'prior_importer' }],
  ['personal import', { importType: 'personal' }],
  ['ongoing operation, specific product check', { experience: 'ongoing_operation', auditPurpose: 'specific_product_requirements' }],
  ['ongoing operation, classification audit', { experience: 'ongoing_operation', auditPurpose: 'existing_classifications_audit' }],
];
const PRODUCTS = [['tobacco', 'סיגריה אלקטרונית'], ['glass', 'כוס זכוכית לשתיה'], ['solar panels', 'פאנל סולארי']];

for (const [productLabel, productName] of PRODUCTS) {
  for (const [routeLabel, route] of ROUTES) {
    test(`no status pill: ${productLabel} on the ${routeLabel} route opens with the route line, then the finding`, () => {
      const result = resultFor({ productName, ...route });
      const label = `${productLabel} / ${routeLabel}`;
      assert.equal(byClass(result, 'ir-result-header').length, 0, `${label}: no status header`);
      assert.equal(byClass(result, 'ir-result-status').length, 0, `${label}: no status pill`);
      const texts = allText(result);
      for (const status of GENERIC_STATUSES) {
        assert.ok(!texts.some((t) => t.includes(status)), `${label}: "${status}" must not render`);
      }
      const top = result.children.map((c) => c.className || c.tagName);
      assert.equal(top[0], 'ir-route-context', `${label}: ${JSON.stringify(top)}`);
      assert.ok(typeof top[1] === 'string' && top[1].split(' ').includes('ir-regulatory-signals'), `${label}: the finding comes right after the route line: ${JSON.stringify(top)}`);
    });
  }
}

test('an in-progress shipment problem keeps its status, which carries urgency', () => {
  focused = null;
  const dom = buildFakeRoot();
  const { registry } = dom;
  initializeImportReadiness({ root: dom.root, documentRef: createFakeDocument() });
  registry.get('readinessProblemShortcutButton').dispatch('click');
  registry.get('irProblemType').value = 'storage';
  registry.get('readinessNextButton').dispatch('click');
  registry.get('readinessNextButton').dispatch('click');
  const result = registry.get('readinessResult');
  const headers = byClass(result, 'ir-result-header');
  assert.equal(headers.length, 1);
  assert.equal(headers[0].getAttribute('data-status'), RESULT_STATUS.URGENT_HANDLING_NEEDED);
});

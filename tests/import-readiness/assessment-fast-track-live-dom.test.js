/**
 * Assessment Fast-Track (product-owner decision, 2026-10-17), tested
 * through the real controller on a hand-rolled fake DOM (same style as
 * product-family-selection-controller-live-dom.test.js).
 *
 * When the free text confidently identifies one product family (see
 * confidentFamilyForFastTrack), the product-context step shows one
 * confirmation line -- "זיהוי אוטומטי: <family> • לשנות זיהוי" --
 * instead of the family checklist, and collapses the materials question
 * behind "הוספת חומרים" unless material matters for that family
 * (food-contact / glass / plastic). Nothing is ever checked for the
 * user. A family with no checkbox (tobacco) gets the same line instead
 * of the old "no clear match" message (audit finding F1), and the
 * result never asks for materials the user was not asked about.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeImportReadiness } from '../../js/import-readiness/import-readiness-controller.js';
import { NO_FOCUSED_DIRECTION_HELP, NO_FOCUSED_DIRECTION_HELP_WITHOUT_MATERIALS } from '../../js/import-readiness/result-brief.js';

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

function setup(productName) {
  focused = null;
  const dom = buildFakeRoot();
  initializeImportReadiness({ root: dom.root, documentRef: createFakeDocument() });
  driveToProductContext(dom, productName);
  return dom;
}

function driveToProductContext({ registry, radios }, productName) {
  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'commercial');
  registry.get('readinessNextButton').dispatch('click');
  selectRadio(radios, 'irExperience', 'first_time');
  registry.get('readinessNextButton').dispatch('click');
  registry.get('irProductName').value = productName;
  registry.get('readinessNextButton').dispatch('click'); // -> productContext
  assert.equal(registry.get('irStepProductContext').hidden, false, 'expected to reach the product-context step');
}

function advanceToResult({ registry, radios }) {
  for (let i = 0; i < 8; i++) {
    if (registry.get('readinessResult').hidden === false) return;
    const host = registry.get('irRegulatoryQuestionHost');
    const fieldset = (host.children || []).find((c) => c.tagName === 'fieldset');
    if (fieldset) {
      const inputs = [];
      (function walk(el) { if (el.tagName === 'input') inputs.push(el); (el.children || []).forEach(walk); })(fieldset);
      if (inputs[0]) { inputs[0].checked = true; inputs[0].dispatch('change'); }
    }
    registry.get('readinessNextButton').dispatch('click');
  }
}

function resultText(registry) {
  const texts = [];
  (function walk(el) { if (el.textContent) texts.push(el.textContent); (el.children || []).forEach(walk); })(registry.get('readinessResult'));
  return texts.join(' | ');
}

const isShown = (registry, id) => registry.get(id).hidden === false;
const checkedCount = (inputs) => inputs.filter((i) => i.checked).length;

test('1. F1 fix: tobacco shows the confirmation line, never the "no clear match" message, and nothing is checked', () => {
  const dom = setup('סיגריה אלקטרונית');
  const { registry } = dom;
  assert.ok(isShown(registry, 'irProductFamilyFastTrack'));
  assert.equal(registry.get('irProductFamilyFastTrackText').textContent, 'זיהוי אוטומטי: מוצרי טבק וסיגריות אלקטרוניות');
  assert.equal(registry.get('irProductFamilyGroup').hidden, true, 'the family checklist is collapsed');
  assert.equal(registry.get('irProductFamilyExpand').hidden, true);
  assert.equal(registry.get('irProductFamilyInsufficientMessage').hidden, true, 'no "לא נמצאה התאמה ברורה" message');
  assert.equal(checkedCount(dom.families.inputs), 0, 'no family is ever checked for the user');
});

test('2. material does not matter for tobacco or air conditioners: the materials question collapses behind "הוספת חומרים"', () => {
  for (const name of ['סיגריה אלקטרונית', 'מזגן עילי']) {
    const { registry, materials } = setup(name);
    assert.equal(registry.get('irMaterialFieldset').hidden, true, `${name}: materials collapsed`);
    assert.ok(isShown(registry, 'irMaterialFastTrackReveal'), `${name}: reveal button shown`);
    assert.equal(checkedCount(materials.inputs), 0);
  }
});

test('3. material matters for food-contact items: a glass cup is confirmed but keeps the materials question open', () => {
  const { registry } = setup('כוס זכוכית');
  assert.ok(isShown(registry, 'irProductFamilyFastTrack'));
  assert.equal(registry.get('irProductFamilyFastTrackText').textContent, 'זיהוי אוטומטי: כלי זכוכית במגע עם מזון או שתייה');
  assert.ok(isShown(registry, 'irMaterialFieldset'));
  assert.equal(registry.get('irMaterialFastTrackReveal').hidden, true);
});

test('4. no confident identification -> unchanged behavior: no confirmation line, the family checklist and the no-match message', () => {
  for (const name of ['מוצר', 'כיסא ושטיח']) {
    const { registry } = setup(name);
    assert.equal(registry.get('irProductFamilyFastTrack').hidden, true, `${name}: no confirmation`);
    assert.ok(isShown(registry, 'irProductFamilyGroup'), `${name}: checklist shown`);
    assert.ok(isShown(registry, 'irMaterialFieldset'), `${name}: materials shown`);
    assert.equal(registry.get('irMaterialFastTrackReveal').hidden, true);
  }
  assert.ok(isShown(setup('מוצר').registry, 'irProductFamilyInsufficientMessage'), 'generic input keeps its existing message');
});

test('5. "לשנות זיהוי" opens the full family list and the materials question, moves focus into the list, and stays dismissed through Back', () => {
  const dom = setup('מזגן עילי');
  const { registry, families } = dom;
  assert.ok(isShown(registry, 'irProductFamilyFastTrack'), 'starts fast-tracked');
  assert.equal(registry.get('irMaterialFieldset').hidden, true, 'materials start collapsed');
  registry.get('irProductFamilyFastTrackChange').dispatch('click');
  assert.equal(registry.get('irProductFamilyFastTrack').hidden, true);
  assert.ok(isShown(registry, 'irProductFamilyGroup'));
  assert.ok(families.labels.every((l) => l.hidden === false), 'every family is shown');
  assert.equal(registry.get('irProductFamilyFastTrackChange').getAttribute('aria-expanded'), 'true');
  assert.equal(focused, families.inputs[0], 'focus moves to the first family checkbox');
  assert.ok(isShown(registry, 'irMaterialFieldset'), 'materials come back with the full list');

  registry.get('readinessBackButton').dispatch('click');
  registry.get('readinessNextButton').dispatch('click');
  assert.equal(registry.get('irProductFamilyFastTrack').hidden, true, 'the choice survives Back/Next');
  assert.ok(isShown(registry, 'irProductFamilyGroup'));
});

test('6. "הוספת חומרים" opens only the materials question and moves focus into it; the family stays confirmed', () => {
  const dom = setup('מזגן עילי');
  const { registry, materials } = dom;
  registry.get('irMaterialFastTrackReveal').dispatch('click');
  assert.ok(isShown(registry, 'irMaterialFieldset'));
  assert.equal(registry.get('irMaterialFastTrackReveal').hidden, true);
  assert.equal(registry.get('irMaterialFastTrackReveal').getAttribute('aria-expanded'), 'true');
  assert.ok(materials.inputs.includes(focused), 'focus moves into the materials list');
  assert.ok(isShown(registry, 'irProductFamilyFastTrack'), 'the family confirmation stays');
});

test('7. an explicitly checked family always wins over the Fast-Track', () => {
  const dom = buildFakeRoot();
  initializeImportReadiness({ root: dom.root, documentRef: createFakeDocument() });
  dom.families.inputs.find((i) => i.value === 'furniture_and_home_goods').checked = true;
  driveToProductContext(dom, 'מזגן עילי');
  assert.equal(dom.registry.get('irProductFamilyFastTrack').hidden, true);
  assert.ok(isShown(dom.registry, 'irProductFamilyGroup'));
});

test('8. the result never asks for materials the Fast-Track did not ask about, and still names the identified family', () => {
  const dom = setup('סיגריה אלקטרונית');
  dom.registry.get('readinessNextButton').dispatch('click');
  advanceToResult(dom);
  const text = resultText(dom.registry);
  assert.ok(text.includes('מוצרי טבק וסיגריות אלקטרוניות'), 'the result identifies the same family from the free text');
  assert.ok(text.includes(NO_FOCUSED_DIRECTION_HELP_WITHOUT_MATERIALS));
  assert.ok(!text.includes(NO_FOCUSED_DIRECTION_HELP), 'no materials nag');
  assert.ok(!text.includes('חומרי המוצר'));
});

test('9. once the user opens the materials question, the result keeps the full help line', () => {
  const dom = setup('סיגריה אלקטרונית');
  dom.registry.get('irMaterialFastTrackReveal').dispatch('click');
  dom.registry.get('readinessNextButton').dispatch('click');
  advanceToResult(dom);
  assert.ok(resultText(dom.registry).includes(NO_FOCUSED_DIRECTION_HELP));
});

test('10. Reset clears the Fast-Track choices: the next assessment decides afresh', () => {
  const dom = setup('מזגן עילי');
  dom.registry.get('irProductFamilyFastTrackChange').dispatch('click');
  dom.registry.get('irMaterialFastTrackReveal').dispatch('click');
  dom.registry.get('readinessResetButton').dispatch('click');
  assert.equal(dom.registry.get('irProductFamilyFastTrack').getAttribute('data-dismissed'), 'false');
  assert.equal(dom.registry.get('irMaterialFastTrackReveal').getAttribute('data-revealed'), 'false');
  driveToProductContext(dom, 'סיגריה אלקטרונית');
  assert.ok(isShown(dom.registry, 'irProductFamilyFastTrack'));
  assert.equal(dom.registry.get('irMaterialFieldset').hidden, true);
});

test('11. markup: approved wording, real buttons with aria-controls, a decorative separator, and [hidden] guards for the restyled elements', () => {
  const confirmation = HTML.match(/<p class="ir-fast-track" id="irProductFamilyFastTrack" hidden>[\s\S]*?<\/p>/);
  assert.ok(confirmation, 'confirmation line exists, hidden until the controller shows it');
  assert.match(confirmation[0], /<span class="ir-fast-track-sep" aria-hidden="true"> • <\/span>/);
  assert.match(confirmation[0], /<button type="button" class="btn-text" id="irProductFamilyFastTrackChange" aria-controls="irProductFamilyGroup" aria-expanded="false">לשנות זיהוי<\/button>/);
  assert.match(HTML, /<button type="button" class="btn-text" id="irMaterialFastTrackReveal" aria-controls="irMaterialFieldset" aria-expanded="false" hidden>הוספת חומרים<\/button>/);
  assert.match(HTML, /<fieldset class="ir-subfieldset" id="irMaterialFieldset">/);
  assert.match(HTML, /\.btn-text\[hidden\]\{ display:none; \}/, '.btn-text sets display, so [hidden] needs an explicit rule');
  assert.match(HTML, /\.ir-checklist#irProductFamilyGroup\[hidden\]\{ display:none; \}/);
});

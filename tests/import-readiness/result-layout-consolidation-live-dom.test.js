/**
 * Result layout and footer consolidation (UX audit PR B, product-owner
 * decisions 2026-10-17), tested through the real controller on a
 * hand-rolled fake DOM plus the page's CSS:
 *   C1/C2 -- the professional referral is one full-width "next step"
 *            panel after the narrative (no desktop side column, CTA keeps
 *            its own padding), DOM order unchanged;
 *   C3    -- the in-card limitation sentence is gone; one "חשוב לדעת"
 *            footer carries the single approved disclaimer;
 *   C4    -- a recognized family with no positive category gets the
 *            neutral title "מידע מקצועי למשפחת המוצר".
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeImportReadiness } from '../../js/import-readiness/import-readiness-controller.js';
import { buildProductFamilyMatrixSection, SHARED_LIMITATION_TEXT } from '../../js/import-readiness/product-family-result.js';
import { IMPORT_TYPE } from '../../js/import-readiness/scenario-schema.js';

const HTML = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const FAMILY_VALUES = [...HTML.matchAll(/name="irProductFamily" value="([^"]+)"/g)].map((m) => m[1]);
const MATERIAL_VALUES = [...HTML.matchAll(/name="irMaterial" value="([^"]+)"/g)].map((m) => m[1]);
const FOOTER_DISCLAIMER = 'המידע מוגש כהכוונה ראשונית בלבד ואינו מהווה סיווג מכס, חוות דעת משפטית או אישור יבוא רשמי.';
const NEUTRAL_TITLE = 'מידע מקצועי למשפחת המוצר';
const FINDING_TITLE = 'נמצאו תחומי חוקיות יבוא לבדיקה';

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

function resultFor(productName) {
  focused = null;
  const dom = buildFakeRoot();
  initializeImportReadiness({ root: dom.root, documentRef: createFakeDocument() });
  driveToProductContext(dom, productName);
  dom.registry.get('readinessNextButton').dispatch('click');
  advanceToResult(dom);
  assert.equal(dom.registry.get('readinessResult').hidden, false, 'expected a rendered result');
  return dom.registry.get('readinessResult');
}

function findAll(el, predicate, out = []) {
  if (predicate(el)) out.push(el);
  for (const child of el.children || []) findAll(child, predicate, out);
  return out;
}
const byClass = (root, cls) => findAll(root, (e) => typeof e.className === 'string' && e.className.split(' ').includes(cls));
const allText = (root) => findAll(root, (e) => typeof e.textContent === 'string' && e.textContent.length > 0).map((e) => e.textContent);

test('1. C4: a recognized family with no positive category (tobacco) gets the neutral title, never "areas found"', () => {
  const result = resultFor('סיגריה אלקטרונית');
  const [section] = byClass(result, 'ir-regulatory-signals');
  const title = section.children.find((c) => c.tagName === 'h3');
  assert.equal(title.textContent, NEUTRAL_TITLE);
  assert.ok(!allText(result).includes(FINDING_TITLE));
});

test('2. C4: a family with positive categories keeps its finding title', () => {
  const result = resultFor('מזגן עילי');
  const [section] = byClass(result, 'ir-regulatory-signals');
  assert.equal(section.children.find((c) => c.tagName === 'h3').textContent, FINDING_TITLE);
  assert.ok(!allText(result).includes(NEUTRAL_TITLE));
});

test('3. C3: no in-card limitation sentence; exactly one disclaimer, in the "חשוב לדעת" footer, which closes the result', () => {
  for (const name of ['סיגריה אלקטרונית', 'מזגן עילי']) {
    const result = resultFor(name);
    assert.equal(byClass(result, 'ir-regulatory-limitation').length, 0, `${name}: no in-card limitation element`);
    const texts = allText(result);
    assert.equal(texts.filter((t) => t === SHARED_LIMITATION_TEXT).length, 0, `${name}: old limitation sentence gone`);
    assert.equal(texts.filter((t) => t === FOOTER_DISCLAIMER).length, 1, `${name}: footer disclaimer exactly once`);
    const footer = result.children[result.children.length - 1];
    assert.ok(footer.className.includes('ir-result-limitations'), `${name}: the footer is the last block`);
    assert.equal(footer.children[0].textContent, 'חשוב לדעת');
    assert.equal(footer.children[1].textContent, FOOTER_DISCLAIMER);
  }
});

test('4. C3 keeps the not-exempt sentence beside the headline (it qualifies the finding, it is not boilerplate) -- now the post-clearance form beside the bottom line (rule 46)', () => {
  const result = resultFor('סיגריה אלקטרונית');
  const [narrative] = byClass(result, 'ir-regulatory-narrative');
  assert.ok(narrative.children.some((c) => c.textContent === 'הדבר אינו פוטר מדרישות החלות לאחר השחרור ממכס, כגון חוקיות שיווק והפצה בישראל.'));
});

test('5. C2 (re-pinned by PR D): the finding card holds only the narrative; the referral follows it as the "הצעד הבא" block, where the professional text comes before the one CTA', () => {
  const result = resultFor('מזגן עילי');
  const [section] = byClass(result, 'ir-regulatory-signals');
  const classes = section.children.map((c) => c.className || c.tagName);
  assert.ok(classes.includes('ir-regulatory-narrative'), `unexpected card: ${JSON.stringify(classes)}`);
  assert.ok(!classes.includes('ir-regulatory-handoff'), 'the card no longer carries its own referral');
  assert.equal(classes.filter((c) => c === 'ir-regulatory-narrative').length, 1, 'no empty trailing narrative group');
  const top = result.children.map((c) => c.className || c.tagName);
  const cardIndex = top.findIndex((c) => typeof c === 'string' && c.split(' ').includes('ir-regulatory-signals'));
  const nextIndex = top.indexOf('ir-next-steps');
  assert.ok(cardIndex > -1 && nextIndex > cardIndex, `unexpected order: ${JSON.stringify(top)}`);
  const [who] = byClass(result.children[nextIndex], 'ir-next-steps-professional');
  const professional = who.children.findIndex((c) => c.className === 'ir-next-steps-professional-type');
  const cta = who.children.findIndex((c) => c.className === 'ir-professional-cta');
  assert.ok(professional > -1 && cta > professional);
});

test('6. C3 is presentation-only: the finding data still carries its limitation', () => {
  const section = buildProductFamilyMatrixSection({ texts: ['מזגן עילי'], importType: IMPORT_TYPE.COMMERCIAL });
  assert.equal(section.limitation, SHARED_LIMITATION_TEXT);
});

test('7. C1/C2 CSS (re-pinned by PR D): the next-step block is one white full-width panel; the old side column and the padding reset that clipped the CTA are gone', () => {
  const panel = HTML.match(/\.ir-next-steps\{([^}]*)\}/);
  assert.ok(panel && /background:var\(--surface\)/.test(panel[1]) && /padding:var\(--sp-4\) var\(--sp-5\)/.test(panel[1]));
  assert.ok(!/grid-template-columns:1\.6fr 1fr/.test(HTML), 'no desktop side column');
  assert.ok(!/\.ir-next-steps[^{]*\.ir-professional-cta,?[^{]*\{[^}]*padding-inline:0/.test(HTML), 'the CTA keeps its own padding');
  const desktop = HTML.slice(HTML.indexOf('@media (min-width:1024px){\n    .ir-next-steps-professional:has'), HTML.indexOf('/* Mobile advisory brief:'));
  assert.match(desktop, /grid-template-columns:minmax\(0, 1fr\) auto/);
  assert.ok(!/\border:/.test(desktop), 'placement by grid columns only, never `order`');
});

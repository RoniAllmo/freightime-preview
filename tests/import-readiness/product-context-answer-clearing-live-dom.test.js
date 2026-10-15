/**
 * Back-navigation answer clearing on the product-context step, tested
 * through the real controller (import-readiness-controller.js,
 * updateProductContextVisibility).
 *
 * Replaces layered-question-model.test.js tests 11-15, which tested
 * clearIncompatibleAnswers -- a pure helper the application never
 * called, removed as dead code (2026-10-15). The same guarantees are
 * now pinned on the code that actually runs: when a product-family or
 * material change makes a follow-up group irrelevant, that group's
 * answers are cleared; answers that stay relevant, and answers outside
 * the group, are kept.
 *
 * Minimal hand-rolled fake DOM (same approach as the other live-DOM
 * tests): only the checkboxes, radio groups and group containers this
 * behavior touches. No browser, no network.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeImportReadiness } from '../../js/import-readiness/import-readiness-controller.js';

function createInput(name, value) {
  const listeners = {};
  return {
    name,
    value,
    checked: false,
    addEventListener(type, handler) {
      (listeners[type] = listeners[type] || []).push(handler);
    },
    dispatch(type) {
      (listeners[type] || []).forEach((handler) => handler({}));
    },
  };
}

function createGroup(id, inputs) {
  return { id, hidden: true, querySelectorAll: (selector) => (selector === 'input' ? inputs : []) };
}

function buildRoot() {
  const families = ['electrical_and_electronics', 'wireless_or_transmitting_equipment', 'furniture_and_home_goods', 'glass_ceramics_and_tableware']
    .map((v) => createInput('irProductFamily', v));
  const materials = ['glass', 'metal', 'plastic_or_polymer'].map((v) => createInput('irMaterial', v));
  const radios = (name) => ['yes', 'no', 'unknown'].map((v) => createInput(name, v));
  const electricalInputs = [...radios('irConnectsToPower'), ...radios('irHasBattery'), ...radios('irBatteryIsRechargeable')];
  const foodContactInputs = [...radios('irMaterialTouchesFood'), ...radios('irMaterialHasCoating')];
  const documents = ['supplier_invoice', 'packing_list'].map((v) => createInput('irDocument', v));
  const all = [...families, ...materials, ...electricalInputs, ...foodContactInputs, ...documents];

  const elements = {
    irGroupElectricalCharacteristics: createGroup('irGroupElectricalCharacteristics', electricalInputs),
    irGroupFoodContactMaterial: createGroup('irGroupFoodContactMaterial', foodContactInputs),
  };
  const root = {
    querySelector(selector) {
      return selector.startsWith('#') ? elements[selector.slice(1)] ?? null : null;
    },
    querySelectorAll(selector) {
      const names = [...selector.matchAll(/name="([^"]+)"/g)].map((m) => m[1]);
      return all.filter((input) => names.includes(input.name));
    },
  };
  const pick = (name, value) => all.find((input) => input.name === name && input.value === value);
  /** Check or uncheck a family/material box and fire its change event, as a click would. */
  const set = (name, value, checked) => {
    const input = pick(name, value);
    input.checked = checked;
    input.dispatch('change');
  };
  return { root, elements, pick, set };
}

function setup() {
  const dom = buildRoot();
  const result = initializeImportReadiness({ root: dom.root, documentRef: {} });
  assert.equal(result.initialized, true, 'the controller must initialize on the fake DOM');
  return dom;
}

test('1. switching the product family away from electrical clears the electrical answers and hides the group', () => {
  const { elements, pick, set } = setup();
  set('irProductFamily', 'electrical_and_electronics', true);
  assert.equal(elements.irGroupElectricalCharacteristics.hidden, false);
  pick('irConnectsToPower', 'yes').checked = true;
  pick('irHasBattery', 'yes').checked = true;
  pick('irBatteryIsRechargeable', 'no').checked = true;

  set('irProductFamily', 'electrical_and_electronics', false);
  set('irProductFamily', 'furniture_and_home_goods', true);

  assert.equal(elements.irGroupElectricalCharacteristics.hidden, true);
  for (const [name, value] of [['irConnectsToPower', 'yes'], ['irHasBattery', 'yes'], ['irBatteryIsRechargeable', 'no']]) {
    assert.equal(pick(name, value).checked, false, `${name} must be cleared`);
  }
});

test('2. a family change that keeps an electrical-relevant family preserves the electrical answers', () => {
  const { elements, pick, set } = setup();
  set('irProductFamily', 'electrical_and_electronics', true);
  pick('irConnectsToPower', 'yes').checked = true;

  set('irProductFamily', 'wireless_or_transmitting_equipment', true);
  set('irProductFamily', 'electrical_and_electronics', false);

  assert.equal(elements.irGroupElectricalCharacteristics.hidden, false);
  assert.equal(pick('irConnectsToPower', 'yes').checked, true);
});

test('3. switching the material away from glass/plastic clears the food-contact answers and hides the group', () => {
  const { elements, pick, set } = setup();
  set('irProductFamily', 'glass_ceramics_and_tableware', true);
  set('irMaterial', 'glass', true);
  assert.equal(elements.irGroupFoodContactMaterial.hidden, false);
  pick('irMaterialTouchesFood', 'yes').checked = true;
  pick('irMaterialHasCoating', 'no').checked = true;

  set('irMaterial', 'glass', false);
  set('irMaterial', 'metal', true);

  assert.equal(elements.irGroupFoodContactMaterial.hidden, true);
  assert.equal(pick('irMaterialTouchesFood', 'yes').checked, false);
  assert.equal(pick('irMaterialHasCoating', 'no').checked, false);
});

test('4. clearing one group never touches answers outside it (documents, the other group)', () => {
  const { pick, set } = setup();
  set('irProductFamily', 'electrical_and_electronics', true);
  set('irProductFamily', 'glass_ceramics_and_tableware', true);
  set('irMaterial', 'glass', true);
  pick('irDocument', 'supplier_invoice').checked = true;
  pick('irMaterialTouchesFood', 'yes').checked = true;
  pick('irConnectsToPower', 'yes').checked = true;

  set('irProductFamily', 'electrical_and_electronics', false);

  assert.equal(pick('irConnectsToPower', 'yes').checked, false, 'the now-irrelevant electrical group is cleared');
  assert.equal(pick('irMaterialTouchesFood', 'yes').checked, true, 'the still-relevant food-contact group is kept');
  assert.equal(pick('irDocument', 'supplier_invoice').checked, true, 'documents are never touched');
});

/**
 * Unit tests for the focused-check continuity label (js/import-readiness/
 * regulatory-signals/focused-check-context.js) -- proves the label is
 * built exclusively from confirmed structured data, never free text,
 * never invented.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFocusedCheckContextLabel } from '../../../js/import-readiness/regulatory-signals/focused-check-context.js';

test('buildFocusedCheckContextLabel echoes a confirmed material and product family, joined with a middle dot', () => {
  const label = buildFocusedCheckContextLabel({
    productFamilies: ['glass_ceramics_and_tableware'],
    materials: ['glass'],
  });
  assert.equal(label, 'זכוכית');
});

test('buildFocusedCheckContextLabel includes confirmed food-contact and power-connection flags', () => {
  const label = buildFocusedCheckContextLabel({
    materials: ['glass'],
    materialTouchesFood: 'yes',
  });
  assert.equal(label, 'זכוכית · מגע עם מזון');
});

test('buildFocusedCheckContextLabel never includes an unconfirmed ("no"/"unknown") flag', () => {
  const label = buildFocusedCheckContextLabel({ materials: ['glass'], materialTouchesFood: 'no' });
  assert.equal(label, 'זכוכית');
});

test('buildFocusedCheckContextLabel returns an empty string when nothing confirmed is available', () => {
  assert.equal(buildFocusedCheckContextLabel({}), '');
  assert.equal(buildFocusedCheckContextLabel(null), '');
  assert.equal(buildFocusedCheckContextLabel({ productFamilies: ['other_general_product'] }), '');
});

test('buildFocusedCheckContextLabel never duplicates a label already present', () => {
  const label = buildFocusedCheckContextLabel({
    productFamilies: ['plastics_polymers_and_coated_products'],
    materials: ['plastic_or_polymer'],
  });
  assert.equal(label, 'פלסטיק או פולימר', 'the same short label from two sources must appear once');
});

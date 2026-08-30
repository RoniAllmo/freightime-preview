/**
 * DOM/markup and accessibility checks for the progressive-disclosure
 * expand controls added to the product-family and material checkbox
 * groups (see family-material-disclosure.js and
 * family-material-disclosure.test.js for the pure suggestion logic).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function html() {
  return readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
}

test('1. exactly one family expand button exists, correctly associated with irProductFamilyGroup via aria-controls, initially collapsed and hidden', () => {
  const source = html();
  const matches = [...source.matchAll(/<button[^>]*id="irProductFamilyExpand"[^>]*>/g)];
  assert.equal(matches.length, 1);
  const tag = matches[0][0];
  assert.match(tag, /aria-controls="irProductFamilyGroup"/);
  assert.match(tag, /aria-expanded="false"/);
  assert.match(tag, /\bhidden\b/);
  assert.match(tag, /type="button"/);
});

test('2. exactly one material expand button exists, correctly associated with irMaterialGroup via aria-controls, initially collapsed and hidden', () => {
  const source = html();
  const matches = [...source.matchAll(/<button[^>]*id="irMaterialExpand"[^>]*>/g)];
  assert.equal(matches.length, 1);
  const tag = matches[0][0];
  assert.match(tag, /aria-controls="irMaterialGroup"/);
  assert.match(tag, /aria-expanded="false"/);
  assert.match(tag, /\bhidden\b/);
});

test('3. both expand buttons have real, non-empty visible label text', () => {
  const source = html();
  const familyButton = source.match(/<button[^>]*id="irProductFamilyExpand"[^>]*>([^<]*)<\/button>/);
  const materialButton = source.match(/<button[^>]*id="irMaterialExpand"[^>]*>([^<]*)<\/button>/);
  assert.ok(familyButton && familyButton[1].trim().length > 0);
  assert.ok(materialButton && materialButton[1].trim().length > 0);
});

test('4. the family expand button is inside the family fieldset (right after irProductFamilyGroup), the material one right after irMaterialGroup -- neither checklist itself moved', () => {
  const source = html();
  const familyBlock = source.match(/<div class="ir-checklist" id="irProductFamilyGroup">[\s\S]*?<\/div>\s*<button[^>]*id="irProductFamilyExpand"/);
  assert.ok(familyBlock, 'expand button must immediately follow the family checklist');
  const materialBlock = source.match(/<div class="ir-checklist" id="irMaterialGroup">[\s\S]*?<\/div>\s*<button[^>]*id="irMaterialExpand"/);
  assert.ok(materialBlock, 'expand button must immediately follow the material checklist');
});

test('5. no canonical irProductFamily/irMaterial value, count, or order changed by this PR', () => {
  const source = html();
  const families = [...source.matchAll(/name="irProductFamily" value="([^"]+)"/g)].map((m) => m[1]);
  const materials = [...source.matchAll(/name="irMaterial" value="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(families.length, 35);
  assert.equal(materials.length, 13);
  assert.equal(new Set(families).size, 35);
  assert.equal(new Set(materials).size, 13);
});

test('6. every irProductFamily/irMaterial checkbox is still wrapped in its own <label> (unchanged accessible-label structure)', () => {
  const source = html();
  const familyBlock = source.match(/<div class="ir-checklist" id="irProductFamilyGroup">[\s\S]*?<\/div>/)[0];
  const materialBlock = source.match(/<div class="ir-checklist" id="irMaterialGroup">[\s\S]*?<\/div>/)[0];
  assert.equal((familyBlock.match(/<label>/g) || []).length, 35);
  assert.equal((materialBlock.match(/<label>/g) || []).length, 13);
});

test('7. the expand buttons are not native form submit buttons (type="button", so they can never submit/advance the step)', () => {
  const source = html();
  for (const id of ['irProductFamilyExpand', 'irMaterialExpand']) {
    const tag = source.match(new RegExp(`<button[^>]*id="${id}"[^>]*>`))[0];
    assert.match(tag, /type="button"/);
  }
});

test('8. the `.ir-checklist label` display rule is guarded with :not([hidden]), so setting the hidden property on a family/material <label> (progressive disclosure) actually hides it visually instead of being silently overridden (code-review-caught regression: an author-origin `display` rule with no [hidden] guard always wins over the UA [hidden]{display:none} rule)', () => {
  const source = html();
  assert.match(source, /\.ir-checklist label:not\(\[hidden\]\)\{/, 'the .ir-checklist label display rule must exclude [hidden] elements');
  assert.ok(!/\.ir-checklist label\{/.test(source), 'the old, unguarded .ir-checklist label rule must no longer exist');
});

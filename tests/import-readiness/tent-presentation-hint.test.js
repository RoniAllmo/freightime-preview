/**
 * UX correction (product-owner-directed follow-up on PR #63): typing
 * "אוהל" (tent) previously fell back to showing the full, unranked
 * 23-family/13-material list, because no matrix alias exists for a
 * tent at all -- adding one is explicitly out of scope (regulatory
 * content). Instead, family-material-disclosure.js's narrow,
 * presentation-only PRESENTATION_CONCEPT_HINTS registry surfaces the
 * existing textile family/material for a handful of tent-shaped
 * product concepts, with explicit boundary protection so an accessory,
 * spare part, or repair-kit description is never mistaken for a
 * complete tent.
 *
 * These tests cover the pure suggestion-function-level and structural-
 * isolation properties. DOM-level visibility/checked-state/lifecycle
 * behavior (what a user actually sees) is covered end-to-end through
 * the real controller in import-readiness-controller.test.js tests
 * 42-49.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  suggestProductFamilyValues,
  suggestMaterialValues,
  ALL_PRODUCT_FAMILY_VALUES,
  ALL_MATERIAL_VALUES,
} from '../../js/import-readiness/family-material-disclosure.js';

const TENT_POSITIVE_TEXTS = ['אוהל', 'tent', 'textile tent'];
const TENT_BOUNDARY_TEXTS = [
  'tent pole', 'tent poles', 'tent accessory', 'tent accessories',
  'tent repair', 'tent repair kit', 'tent stake', 'tent peg',
  'אביזר לאוהל', 'עמוד לאוהל', 'יתד לאוהל', 'ערכת תיקון לאוהל',
];
const TENT_UNRELATED_FAMILIES = [
  'live_animals', 'animal_feed', 'animal_origin_products',
  'cosmetics_and_beauty', 'dietary_supplements',
  'medical_equipment_or_medical_use', 'food_contact_items',
];

// -----------------------------------------------------------------
// 1-2: tent receives textile-family and textile-material presentation
// suggestions.
// -----------------------------------------------------------------

test('1. tent text receives the textile family (textile_apparel_and_footwear) as a presentation suggestion', () => {
  for (const text of TENT_POSITIVE_TEXTS) {
    const suggested = suggestProductFamilyValues([text]);
    assert.ok(suggested.includes('textile_apparel_and_footwear'), `"${text}" must suggest textile_apparel_and_footwear`);
  }
});

test('2. tent text receives the textile material as a presentation suggestion', () => {
  for (const text of TENT_POSITIVE_TEXTS) {
    const suggested = suggestMaterialValues([text]);
    assert.ok(suggested.includes('textile'), `"${text}" must suggest the textile material`);
  }
});

// -----------------------------------------------------------------
// 3: suggestions never select a checkbox -- these functions only ever
// return value arrays, never mutate anything or express a "checked"
// concept at all.
// -----------------------------------------------------------------

test('3. the suggestion functions are pure -- they return plain arrays of values, never an object with a checked/selected concept, and never mutate their input', () => {
  const texts = ['אוהל'];
  const before = JSON.stringify(texts);
  const familyResult = suggestProductFamilyValues(texts);
  const materialResult = suggestMaterialValues(texts);
  assert.equal(JSON.stringify(texts), before, 'input array must not be mutated');
  assert.ok(Array.isArray(familyResult) && familyResult.every((v) => typeof v === 'string'));
  assert.ok(Array.isArray(materialResult) && materialResult.every((v) => typeof v === 'string'));
});

// -----------------------------------------------------------------
// 4-7: suggestions never alter final identification, categories,
// professionals, or CTAs -- verified by confirming the presentation
// module is never imported by any of those code paths.
// -----------------------------------------------------------------

function readSource(rel) {
  return readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');
}

test('4. suggestions do not alter final identification -- product-family-identification.js never imports family-material-disclosure.js', () => {
  assert.ok(!readSource('js/import-readiness/product-family-identification.js').includes('family-material-disclosure'));
});

test('5. suggestions do not alter categories -- product-family-result.js and product-family-matrix.js never import family-material-disclosure.js', () => {
  assert.ok(!readSource('js/import-readiness/product-family-result.js').includes('family-material-disclosure'));
  assert.ok(!readSource('js/import-readiness/product-family-matrix.js').includes('family-material-disclosure'));
});

test('6. suggestions do not alter which professional is recommended -- build-action-map.js and professional-category-registry.js never import family-material-disclosure.js', () => {
  assert.ok(!readSource('js/import-readiness/build-action-map.js').includes('family-material-disclosure'));
  assert.ok(!readSource('js/import-readiness/professional-category-registry.js').includes('family-material-disclosure'));
});

test('7. suggestions do not alter the CTA -- build-action-map.js\'s PROFESSIONAL_REFERRAL ctaLabel fields are untouched by this file (same isolation check as test 6, restated for the CTA specifically)', () => {
  const src = readSource('js/import-readiness/build-action-map.js');
  assert.ok(src.includes('ctaLabel'), 'sanity check: ctaLabel still exists in build-action-map.js');
  assert.ok(!src.includes('family-material-disclosure'), 'build-action-map.js (which owns ctaLabel) never imports the presentation module');
});

// -----------------------------------------------------------------
// 8-9: unrelated families initially hidden for tent / full list
// remains available -- pure-function-level restatement (DOM-level
// proof is in import-readiness-controller.test.js tests 42-45).
// -----------------------------------------------------------------

test('8. tent text never suggests any of the unrelated families the product owner explicitly named (animals, food, cosmetics, supplements, medical, food-contact)', () => {
  for (const text of TENT_POSITIVE_TEXTS) {
    const suggested = suggestProductFamilyValues([text]);
    for (const unrelated of TENT_UNRELATED_FAMILIES) {
      assert.ok(!suggested.includes(unrelated), `"${text}" must never suggest ${unrelated}`);
    }
  }
});

test('9. the tent suggestion is always a strict, non-empty subset of the full family list -- the full list always remains a superset, never replaced', () => {
  for (const text of TENT_POSITIVE_TEXTS) {
    const suggested = suggestProductFamilyValues([text]);
    assert.ok(suggested.length > 0 && suggested.length < ALL_PRODUCT_FAMILY_VALUES.length);
    for (const value of suggested) assert.ok(ALL_PRODUCT_FAMILY_VALUES.includes(value));
  }
});

// -----------------------------------------------------------------
// 10-12: checked-hidden-family / collapse / Edit-Answers preservation
// -- these are DOM-state properties the pure suggestion functions
// cannot express (they don't know about `checked` at all, by design;
// see test 3). Proven end-to-end in import-readiness-controller.test.js
// tests 46-47. This test instead proves the structural precondition
// those behaviors depend on: the suggestion functions are read-only
// and re-callable, so a caller (the controller) can safely recompute
// suggestions repeatedly without the function itself ever needing to
// "remember" or clear prior checked state.
// -----------------------------------------------------------------

test('10-12. suggestProductFamilyValues/suggestMaterialValues are idempotent and stateless -- calling them repeatedly with the same input never changes the answer, so the controller (which is what actually preserves checked state, see import-readiness-controller.test.js tests 46-47) can safely recompute on every re-render', () => {
  const text = ['אוהל'];
  const first = suggestProductFamilyValues(text);
  const second = suggestProductFamilyValues(text);
  const third = suggestMaterialValues(text);
  const fourth = suggestMaterialValues(text);
  assert.deepEqual(first, second);
  assert.deepEqual(third, fourth);
});

// -----------------------------------------------------------------
// 13-14: unknown text keeps safe fallback; accessory wording never
// becomes a complete tent (boundary protection).
// -----------------------------------------------------------------

test('13. unrelated/unknown text (camping equipment, an unidentified product) keeps the safe empty-suggestion fallback -- never a fabricated match', () => {
  for (const text of ['camping equipment', 'unidentified product', 'מוצר לא מזוהה', 'ציוד קמפינג']) {
    assert.deepEqual(suggestProductFamilyValues([text]), []);
  }
});

test('14. accessory/part/repair-kit wording (a short substring of the positive tent term appearing inside a longer boundary phrase) never triggers the tent suggestion', () => {
  for (const text of TENT_BOUNDARY_TEXTS) {
    const suggested = suggestProductFamilyValues([text]);
    assert.ok(!suggested.includes('textile_apparel_and_footwear'), `"${text}" must not be treated as a complete tent`);
  }
});

// -----------------------------------------------------------------
// 15-16: DOM order / candidate order independence.
// -----------------------------------------------------------------

test('15. DOM order does not affect suggestions -- reordering the free-text inputs passed in (product name vs. commercial description vs. intended use) yields the same suggestion set', () => {
  const a = suggestProductFamilyValues(['אוהל', 'תיאור', 'שימוש']);
  const b = suggestProductFamilyValues(['שימוש', 'תיאור', 'אוהל']);
  const c = suggestProductFamilyValues(['תיאור', 'אוהל', 'שימוש']);
  assert.deepEqual(a, b);
  assert.deepEqual(a, c);
});

test('16. candidate order does not affect suggestions -- which positive term in the text happens to appear first (English vs. Hebrew) does not change the outcome', () => {
  const hebrewFirst = suggestProductFamilyValues(['אוהל tent']);
  const englishFirst = suggestProductFamilyValues(['tent אוהל']);
  assert.deepEqual(hebrewFirst, englishFirst);
});

// -----------------------------------------------------------------
// 17-18: presentation hints cannot be imported by canonical matrix
// generation, cannot modify canonical aliases.
// -----------------------------------------------------------------

test('17. the canonical matrix-generation script never references family-material-disclosure.js', () => {
  const src = readSource('scripts/generate_product_family_matrix.py');
  assert.ok(!src.includes('family-material-disclosure'));
  assert.ok(!src.toLowerCase().includes('presentation_concept_hints'));
});

test('18. the presentation-hint registry cannot modify canonical aliases -- the generated matrix file is a frozen, pre-existing structure, and this module only ever reads it (via identifyProductFamily/PRODUCT_FAMILY_SELECTION_CANDIDATES), never assigns to it', () => {
  const disclosureSrc = readSource('js/import-readiness/family-material-disclosure.js');
  assert.ok(!/PRODUCT_FAMILY_MATRIX\s*[\[.]/.test(disclosureSrc), 'must never index into or assign to the matrix directly');
  assert.ok(!disclosureSrc.includes('PRODUCT_FAMILY_MATRIX.push') && !disclosureSrc.includes('.aliases.push'));
});

// -----------------------------------------------------------------
// 19-20: no question added, no backend change (structural proxies --
// full backend re-verification happens as part of the mission's
// procedural steps, not as a unit test).
// -----------------------------------------------------------------

test('19. no new question was added -- index.html\'s irStepProductContext fieldset still has exactly the same 3 pre-existing <legend> questions (family, materials, documents) and no more', () => {
  const source = readSource('index.html');
  const startIndex = source.indexOf('id="irStepProductContext"');
  assert.ok(startIndex > -1, 'irStepProductContext fieldset must exist');
  // The next top-level fieldset (irStepRegulatoryFollowup) marks the end
  // of this step's own markup.
  const endIndex = source.indexOf('id="irStepRegulatoryFollowup"', startIndex);
  assert.ok(endIndex > startIndex, 'the next step fieldset must exist after irStepProductContext');
  const sectionSource = source.slice(startIndex, endIndex);
  const legends = [...sectionSource.matchAll(/<legend>([^<]*)<\/legend>/g)].map((m) => m[1]);
  // The full, pre-existing legend set for this step (family, materials,
  // the two conditional food-contact/electrical-characteristics
  // sub-groups' 5 legends, and documents) -- unchanged by this PR. No
  // legend mentions a tent/"אוהל" or any other product-specific text.
  assert.deepEqual(legends, [
    'לאיזו משפחת מוצרים המוצר שייך?',
    'מאילו חומרים המוצר עשוי?',
    'האם המוצר בא במגע ישיר עם מזון או משקה?',
    'האם יש ציפוי או שכבת עיבוד על המוצר?',
    'האם המוצר מתחבר ישירות לרשת החשמל או מגיע עם תקע או ספק כוח?',
    'האם המוצר כולל סוללה?',
    'האם הסוללה נטענת?',
    'אילו מסמכים כבר יש לך?',
  ]);
  for (const legend of legends) {
    assert.ok(!legend.includes('אוהל') && !/tent/i.test(legend), 'no legend may mention a tent -- this feature must never add a new question');
  }
});

test('20. this module imports nothing from the backend and nothing new from a network/storage-capable module -- only local, already-reviewed sibling modules', () => {
  const src = readSource('js/import-readiness/family-material-disclosure.js');
  const importLines = [...src.matchAll(/^import .* from '([^']+)';$/gm)].map((m) => m[1]);
  for (const spec of importLines) {
    assert.ok(spec.startsWith('./'), `unexpected non-local import: ${spec}`);
  }
  assert.deepEqual(importLines.sort(), [
    './product-family-identification.js',
    './product-family-selection-mapping.js',
    './regulatory-signals/keyword-hints.js',
  ].sort());
});

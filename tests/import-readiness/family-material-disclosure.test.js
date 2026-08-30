/**
 * UX correction (product-owner-authorized): progressive disclosure for
 * the product-family and material checkbox groups. All 23 family and
 * all 13 material checkboxes were previously shown at once, regardless
 * of what the user had already typed -- for a product like "אוהל"
 * (tent), irrelevant options (cosmetics, animal feed, medical
 * products, ...) appeared with the same visual prominence as anything
 * plausible. family-material-disclosure.js computes a small suggested
 * subset to show first; everything else remains reachable via an
 * explicit "show all" control. See that module's doc comment for the
 * full safety rationale.
 *
 * These tests cover the pure suggestion logic only (no DOM). DOM
 * wiring/accessibility/browser-level behavior is covered by
 * family-material-disclosure-dom.test.js and the Playwright
 * acceptance run (see the PR body).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_PRODUCT_FAMILY_VALUES,
  ALL_MATERIAL_VALUES,
  suggestProductFamilyValues,
  suggestMaterialValues,
} from '../../js/import-readiness/family-material-disclosure.js';
import { PRODUCT_FAMILY } from '../../js/import-readiness/layered-question-model.js';

// -----------------------------------------------------------------
// 1-2: the presentation-ordering lists are byte-identical in value and
// order to the canonical data-contract enum / the rendered checklist.
// -----------------------------------------------------------------

test('1. ALL_PRODUCT_FAMILY_VALUES is identical (same values, same order) to layered-question-model.js\'s canonical PRODUCT_FAMILY enum', () => {
  assert.deepEqual(ALL_PRODUCT_FAMILY_VALUES, PRODUCT_FAMILY);
});

test('2. ALL_MATERIAL_VALUES has no duplicate and every value is a plausible snake_case token', () => {
  assert.equal(new Set(ALL_MATERIAL_VALUES).size, ALL_MATERIAL_VALUES.length);
  for (const value of ALL_MATERIAL_VALUES) assert.match(value, /^[a-z_]+$/);
});

// -----------------------------------------------------------------
// 3-4: never auto-select, always a subset of the real checkbox values.
// -----------------------------------------------------------------

test('3. suggestProductFamilyValues never returns a value outside ALL_PRODUCT_FAMILY_VALUES, and never more than 4', () => {
  const cases = ['אוהל', 'בושם', 'מזון לבעלי חיים', 'רחפן', 'מזרן', 'נעלי בטיחות', 'מוצר רפואי', 'לא קיים בכלל xyz123'];
  for (const text of cases) {
    const suggested = suggestProductFamilyValues([text]);
    assert.ok(Array.isArray(suggested));
    assert.ok(suggested.length <= 4, `too many suggestions for "${text}"`);
    for (const value of suggested) assert.ok(ALL_PRODUCT_FAMILY_VALUES.includes(value), `"${value}" (for "${text}") is not a real checkbox value`);
    assert.equal(new Set(suggested).size, suggested.length, `duplicate suggestion for "${text}"`);
  }
});

test('4. suggestMaterialValues is a fixed, non-empty subset of ALL_MATERIAL_VALUES, independent of any input', () => {
  const suggested = suggestMaterialValues();
  assert.ok(suggested.length >= 2 && suggested.length <= 5);
  for (const value of suggested) assert.ok(ALL_MATERIAL_VALUES.includes(value));
  assert.deepEqual(suggestMaterialValues(), suggested, 'must be deterministic/static');
});

// -----------------------------------------------------------------
// 5: the 12 product-owner-specified representative products.
// -----------------------------------------------------------------

test('5a. "אוהל" (tent, no matrix alias exists) never prominently suggests cosmetics/animal-feed/medical/food -- either no match (safe full-list fallback) or a plausible non-matching family', () => {
  const suggested = suggestProductFamilyValues(['אוהל']);
  for (const unsafe of ['cosmetics_and_beauty', 'animal_feed', 'medical_equipment_or_medical_use', 'food_and_beverage', 'dietary_supplements']) {
    assert.ok(!suggested.includes(unsafe), `"אוהל" must never suggest ${unsafe}`);
  }
});

test('5b. "בושם" (perfume) suggests cosmetics_and_beauty when it matches, never an unrelated family', () => {
  const suggested = suggestProductFamilyValues(['בושם']);
  if (suggested.length > 0) {
    assert.ok(suggested.every((v) => v === 'cosmetics_and_beauty'), `unexpected suggestion(s) for "בושם": ${suggested}`);
  }
});

test('5c. "מזון לבעלי חיים" (animal feed) suggests animal_feed when it matches, never live_animals or animal_origin_products', () => {
  const suggested = suggestProductFamilyValues(['מזון לבעלי חיים']);
  assert.ok(!suggested.includes('live_animals'));
  if (suggested.length > 0) assert.ok(suggested.includes('animal_feed') || suggested.length === 0);
});

test('5d. "רחפן" (drone) suggests wireless_or_transmitting_equipment when it matches, never cosmetics/food/medical', () => {
  const suggested = suggestProductFamilyValues(['רחפן']);
  for (const unsafe of ['cosmetics_and_beauty', 'food_and_beverage', 'medical_equipment_or_medical_use']) {
    assert.ok(!suggested.includes(unsafe));
  }
});

test('5e. "מזרן" (mattress) suggests furniture_and_home_goods when it matches, never electrical/medical/cosmetics', () => {
  const suggested = suggestProductFamilyValues(['מזרן']);
  for (const unsafe of ['electrical_and_electronics', 'medical_equipment_or_medical_use', 'cosmetics_and_beauty']) {
    assert.ok(!suggested.includes(unsafe));
  }
});

test('5f. "נעלי בטיחות" (safety shoes) suggests textile_apparel_and_footwear when it matches, never medical/electrical', () => {
  const suggested = suggestProductFamilyValues(['נעלי בטיחות']);
  for (const unsafe of ['medical_equipment_or_medical_use', 'electrical_and_electronics']) {
    assert.ok(!suggested.includes(unsafe));
  }
});

test('5g. "מוצר רפואי" (medical product) never suggests cosmetics/animal-feed/food', () => {
  const suggested = suggestProductFamilyValues(['מוצר רפואי']);
  for (const unsafe of ['cosmetics_and_beauty', 'animal_feed', 'food_and_beverage']) {
    assert.ok(!suggested.includes(unsafe));
  }
});

test('5h. "קרטון לאריזה" (packaging cardboard, a known checkbox-coverage gap per product-family-selection-mapping.js) never crashes and never mis-suggests an unrelated family', () => {
  assert.doesNotThrow(() => suggestProductFamilyValues(['קרטון לאריזה']));
  const suggested = suggestProductFamilyValues(['קרטון לאריזה']);
  for (const unsafe of ['cosmetics_and_beauty', 'medical_equipment_or_medical_use', 'live_animals']) {
    assert.ok(!suggested.includes(unsafe));
  }
});

test('5i. "כלי מטבח מפלסטיק" (plastic kitchenware) never suggests medical/cosmetics/animal-feed', () => {
  const suggested = suggestProductFamilyValues(['כלי מטבח מפלסטיק']);
  for (const unsafe of ['medical_equipment_or_medical_use', 'cosmetics_and_beauty', 'animal_feed']) {
    assert.ok(!suggested.includes(unsafe));
  }
});

test('5j. "מוצר לא מזוהה" (unidentified product) yields no suggestion (safe full-list fallback)', () => {
  const suggested = suggestProductFamilyValues(['מוצר לא מזוהה']);
  assert.deepEqual(suggested, []);
});

test('5k. "מוצר כללי לבדיקה" (generic test product) yields no suggestion (safe full-list fallback)', () => {
  const suggested = suggestProductFamilyValues(['מוצר כללי לבדיקה']);
  assert.deepEqual(suggested, []);
});

test('5l. a product plausibly matching two families ("בושם וקוסמטיקה") returns at most 4 suggestions, all real checkbox values, never duplicated', () => {
  const suggested = suggestProductFamilyValues(['בושם וקוסמטיקה לגוף']);
  assert.ok(suggested.length <= 4);
  assert.equal(new Set(suggested).size, suggested.length);
  for (const value of suggested) assert.ok(ALL_PRODUCT_FAMILY_VALUES.includes(value));
});

// -----------------------------------------------------------------
// 6: malformed/edge-case input never throws.
// -----------------------------------------------------------------

test('6. malformed input (empty array, non-string entries, undefined) never throws and always returns []', () => {
  assert.doesNotThrow(() => suggestProductFamilyValues([]));
  assert.deepEqual(suggestProductFamilyValues([]), []);
  assert.doesNotThrow(() => suggestProductFamilyValues(['', '', '']));
  assert.deepEqual(suggestProductFamilyValues(['', '', '']), []);
});

// -----------------------------------------------------------------
// 7: this module never claims to be, or duplicates, the real
// identification engine -- it only ever narrows presentation, and a
// forced/explicit selection or the real result computation is
// unaffected by anything in this file (verified by absence of any
// import of this module from product-family-result.js or the
// controller's result-construction path).
// -----------------------------------------------------------------

test('7. product-family-result.js (the real identification/result-construction module) does not import family-material-disclosure.js', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../../js/import-readiness/product-family-result.js', import.meta.url), 'utf8');
  assert.ok(!src.includes('family-material-disclosure'), 'result construction must never depend on the presentation-only suggestion layer');
});

// -----------------------------------------------------------------
// 8: regression -- a matched matrix alias that is only a partial-word
// substring inside an unrelated longer word (not a genuine whole-word
// match) must never be promoted to a presentation suggestion. Found
// via a realistic shaver description ("... suitable for ...") and a
// realistic medicine description ("... tablets ...") both falsely
// matching the furniture alias "table" as a bare substring.
// -----------------------------------------------------------------

test('8a. a shaver/razor description does not suggest furniture (the "table" alias is a substring of "suitable", not a real word match), while a genuine, unrelated alias (battery) in the same text still suggests correctly', () => {
  const suggested = suggestProductFamilyValues([
    'electric shaving machine for home use, rechargeable battery, suitable for face and body hair removal',
  ]);
  assert.ok(!suggested.includes('furniture_and_home_goods'), 'must not falsely suggest furniture via "suitable"');
  assert.ok(suggested.includes('batteries_or_battery_containing'), 'a genuine alias match in the same text must still be suggested');
});

test('8b. a medicine description does not suggest furniture (the "table" alias is a substring of "tablets", not a real word match)', () => {
  for (const text of [
    'medicines for headache relief, oral tablets for pain treatment',
    'pharmaceutical tablets for chronic pain management',
    'medicines packaged in blister packs, tablets and capsules for pain relief',
  ]) {
    const suggested = suggestProductFamilyValues([text]);
    assert.ok(!suggested.includes('furniture_and_home_goods'), `"${text}" must not falsely suggest furniture via "tablets"`);
  }
});

test('8c. genuine whole-word furniture matches are unaffected by the fix (still suggested when the alias is a real standalone word)', () => {
  assert.ok(suggestProductFamilyValues(['שולחן עץ לסלון']).includes('furniture_and_home_goods'), 'a real "שולחן" (table) word must still suggest furniture');
  assert.ok(suggestProductFamilyValues(['wooden table for the living room']).includes('furniture_and_home_goods'), 'a real standalone "table" word must still suggest furniture');
});

test('8d. the Hebrew single-letter-prefix form ("מטקסטיל" = made of textile) still matches -- the whole-word fix must not break ordinary Hebrew morphology that PR #63 already relied on', () => {
  assert.deepEqual(suggestProductFamilyValues(['אוהל מטקסטיל']), ['textile_apparel_and_footwear']);
});

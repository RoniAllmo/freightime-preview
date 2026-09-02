/**
 * Targeted tests for the material/context concept-coverage correction:
 * a meaningful free-text description combining a material with an
 * explicit construction/vehicle/cookware/industrial use (never the
 * material alone) must surface the genuinely relevant family, instead
 * of falling back to the full 41-family list. Root cause: several
 * matrix rows (building materials, industrial machinery, ...) carried
 * only their own umbrella category name as an alias, with no concrete
 * product-level term -- the exact gap reproduced by "פרופילי אלומיניום
 * לייצור חלונות" (aluminum profiles for manufacturing windows).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { identifyProductFamily, IDENTIFICATION_OUTCOME } from '../../js/import-readiness/product-family-identification.js';
import { suggestProductFamilyValues } from '../../js/import-readiness/family-material-disclosure.js';

// -----------------------------------------------------------------
// 1. The reproduced defect: a meaningful material+use description now
// surfaces the correct family instead of the empty full-list fallback.
// -----------------------------------------------------------------

test('1. the reproduced root-cause description now surfaces building_materials, not the empty fallback', () => {
  const suggested = suggestProductFamilyValues(['פרופילי אלומיניום לייצור חלונות']);
  assert.deepEqual(suggested, ['building_materials']);
});

// -----------------------------------------------------------------
// 2. Material-context disambiguation: the SAME material word routes to
// a DIFFERENT family depending on its explicit use context, and a
// material word alone never triggers any of them.
// -----------------------------------------------------------------

const MATERIAL_CONTEXT_CASES = Object.freeze([
  ['פרופילי אלומיניום לייצור חלונות', 'building_materials'],
  ['פרופיל אלומיניום לבניה', 'building_materials'],
  ['מוטות פלדה לבנייה', 'building_materials'],
  ['פרופיל אלומיניום לרכב', 'vehicle_parts_and_transport_accessories'],
  ['סיר אלומיניום לבישול', 'food_contact_items'],
  ['פרופיל מתכת לריהוט', 'furniture_and_home_goods'],
  ['מוטות פלדה לייצור חלקי מכונה', 'industrial_machinery_and_equipment'],
]);

test('2. the same material word (aluminum/steel) routes to a different family depending on explicit use context', () => {
  const failures = [];
  for (const [text, expectedFamily] of MATERIAL_CONTEXT_CASES) {
    const suggested = suggestProductFamilyValues([text]);
    if (!suggested.includes(expectedFamily)) failures.push(`"${text}" missing ${expectedFamily}: ${JSON.stringify(suggested)}`);
  }
  assert.deepEqual(failures, []);
});

test('3. material-alone protection: a bare material word never independently triggers any family newly added by this correction', () => {
  // "טקסטיל"/"textile" are intentionally excluded here: they are a
  // pre-existing, already-shipped real matrix alias on
  // textiles-and-furniture-01 (product-family-matrix.js), not something
  // introduced or changed by this correction -- out of this task's
  // scope (no matrix edits).
  for (const material of ['אלומיניום', 'פלדה', 'aluminum', 'steel', 'plastic', 'פלסטיק', 'עץ', 'wood', 'זכוכית', 'glass']) {
    assert.deepEqual(suggestProductFamilyValues([material]), [], `"${material}" alone must not suggest any family`);
  }
});

// -----------------------------------------------------------------
// 4. Cross-family isolation for the newly-added building/industrial
// terms: the construction phrasing never leaks into the vehicle,
// cookware, or furniture families, and vice versa.
// -----------------------------------------------------------------

test('4. building-material phrasing never also suggests vehicle parts, cookware, or furniture', () => {
  const suggested = suggestProductFamilyValues(['פרופילי אלומיניום לייצור חלונות']);
  for (const forbidden of ['vehicle_parts_and_transport_accessories', 'food_contact_items', 'furniture_and_home_goods']) {
    assert.ok(!suggested.includes(forbidden), `building-material text must not also suggest ${forbidden}`);
  }
});

test('5. vehicle-context aluminum phrasing never also suggests building materials', () => {
  const suggested = suggestProductFamilyValues(['פרופיל אלומיניום לרכב']);
  assert.ok(!suggested.includes('building_materials'));
});

test('6. cookware-context aluminum phrasing never also suggests building materials or vehicle parts', () => {
  const suggested = suggestProductFamilyValues(['סיר אלומיניום לבישול']);
  assert.ok(!suggested.includes('building_materials'));
  assert.ok(!suggested.includes('vehicle_parts_and_transport_accessories'));
});

// -----------------------------------------------------------------
// 7. Unrelated families remain hidden for the construction description.
// -----------------------------------------------------------------

test('7. the construction description never suggests an unrelated family (food, medicine, cosmetics, animal, medical)', () => {
  const suggested = suggestProductFamilyValues(['פרופילי אלומיניום לייצור חלונות']);
  for (const forbidden of [
    'dietary_supplements', 'medicines', 'cosmetics_and_beauty', 'medical_equipment_or_medical_use',
    'animal_origin_products', 'animal_feed', 'plant_origin_products',
  ]) {
    assert.ok(!suggested.includes(forbidden), `must not suggest ${forbidden}`);
  }
});

// -----------------------------------------------------------------
// 8. Complete product / component distinction preserved for the new
// industrial-machinery coverage (no separate "machine parts" checkbox
// exists in the 41-family model, so both a complete machine and a
// machine-component description route to the same general industrial
// family -- never to a different, wrong family).
// -----------------------------------------------------------------

test('8. complete industrial machine and machine-component descriptions both route to the one available industrial family', () => {
  assert.deepEqual(suggestProductFamilyValues(['מכונה תעשייתית']), ['industrial_machinery_and_equipment']);
  assert.deepEqual(suggestProductFamilyValues(['חלק חילוף למכונה']), ['industrial_machinery_and_equipment']);
});

// -----------------------------------------------------------------
// 9. Battery-containing-appliance dead-zone fix: a device described
// "with a battery" is not silently dropped (the standalone-battery row
// deliberately excludes this phrasing; the battery-containing-equipment
// row must positively catch it instead).
// -----------------------------------------------------------------

test('9. a "with a battery" appliance description resolves to the battery-containing-equipment family, not the empty fallback', () => {
  assert.deepEqual(suggestProductFamilyValues(['מכונת גילוח חשמלית עם סוללה נטענת']), ['batteries_or_battery_containing']);
});

// -----------------------------------------------------------------
// 10. Additional wording-gap supplements (medical device, vitamins,
// deodorant, pet bed, live plant, curtain, infant bed) resolve
// correctly and stay isolated from their neighboring families.
// -----------------------------------------------------------------

const WORDING_GAP_CASES = Object.freeze([
  ['מכשיר רפואי', 'medical_equipment_or_medical_use'],
  ['ויטמינים לבני אדם', 'dietary_supplements'],
  ['דאודורנט', 'cosmetics_and_beauty'],
  ['מיטה לכלב', 'pet_products'],
  ['צמח חי', 'plant_origin_products'],
  ['וילון לבית', 'general_household_textile_products'],
  ['מיטת תינוק', 'childrens_products_and_toys'],
  ['עריסה', 'childrens_products_and_toys'],
]);

test('10. additional wording-gap supplements resolve to their correct family', () => {
  const failures = [];
  for (const [text, expectedFamily] of WORDING_GAP_CASES) {
    const suggested = suggestProductFamilyValues([text]);
    if (!suggested.includes(expectedFamily)) failures.push(`"${text}" missing ${expectedFamily}: ${JSON.stringify(suggested)}`);
  }
  assert.deepEqual(failures, []);
});

test('11. a cosmetic product with a plant-extract ingredient does not become an agricultural/plant product', () => {
  const suggested = suggestProductFamilyValues(['קרם עם תמצית צמחית']);
  assert.ok(!suggested.includes('plant_origin_products'));
});

// -----------------------------------------------------------------
// 12. Real identification stays unaffected -- every one of the new
// presentation supplements is presentation-only.
// -----------------------------------------------------------------

test('12. none of the new material/context supplements alters real identification for text with no genuine matrix alias', () => {
  for (const text of ['פרופילי אלומיניום לייצור חלונות', 'מוטות פלדה לייצור חלקי מכונה', 'סיר אלומיניום לבישול']) {
    const result = identifyProductFamily([text]);
    assert.equal(result.outcome, IDENTIFICATION_OUTCOME.NONE, `"${text}" real identification must stay NONE`);
  }
});

// -----------------------------------------------------------------
// 13. Insufficient/generic input still returns the empty full-list
// fallback signal, unaffected by any of the new coverage.
// -----------------------------------------------------------------

test('13. genuinely insufficient input still returns the empty full-list-fallback signal', () => {
  for (const text of ['מוצר', 'ציוד', 'חלק', 'פריט', 'סחורה', 'מוצר כללי', 'unknown item', 'generic equipment']) {
    assert.deepEqual(suggestProductFamilyValues([text]), []);
  }
});

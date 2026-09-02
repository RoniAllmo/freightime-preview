/**
 * Targeted tests for the concept-level ambiguity correction: a clear
 * product CONCEPT that is only ambiguous between a small set of its own
 * legitimate subtype checkboxes must surface exactly those subtype
 * options initially -- not the full 41-family fallback (which stays
 * reserved for text where no reliable concept can be identified at
 * all). Uses the scooter concept (non_motorized_scooters /
 * motorized_scooters) as the demonstrative, generic case; the
 * mechanism itself (PRESENTATION_CONCEPT_HINTS entries whose
 * `suggestedFamilyValues` names more than one checkbox) is not
 * scooter-specific.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { identifyProductFamily, IDENTIFICATION_OUTCOME } from '../../js/import-readiness/product-family-identification.js';
import { suggestProductFamilyValues, suggestMaterialValues, ALL_PRODUCT_FAMILY_VALUES } from '../../js/import-readiness/family-material-disclosure.js';

// -----------------------------------------------------------------
// 1/2. A concept may return several legitimate subtype options; bare
// קורקינט/scooter returns both scooter values (and only those, plus
// the existing general fallback catch-alls).
// -----------------------------------------------------------------

test('1-2. bare scooter concept text (Hebrew and English) surfaces exactly both scooter subtypes plus the existing fallback catch-alls, no unrelated family', () => {
  for (const text of ['קורקינט', 'קורקינטים', 'scooter', 'scooters']) {
    const suggested = suggestProductFamilyValues([text]);
    assert.deepEqual(
      [...suggested].sort(),
      ['motorized_scooters', 'non_motorized_scooters', 'not_sure', 'other_general_product'].sort(),
      `"${text}" -> ${JSON.stringify(suggested)}`,
    );
  }
});

// -----------------------------------------------------------------
// 3. Qualified terms return only the correct subtype (parameterized).
// -----------------------------------------------------------------

const QUALIFIED_SUBTYPE_CASES = Object.freeze([
  ['קורקינט רגיל', 'non_motorized_scooters'],
  ['קורקינט לא ממונע', 'non_motorized_scooters'],
  ['non-motorized scooter', 'non_motorized_scooters'],
  ['קורקינט ממונע', 'motorized_scooters'],
  ['קורקינט חשמלי', 'motorized_scooters'],
  ['motorized scooter', 'motorized_scooters'],
  ['electric scooter', 'motorized_scooters'],
]);

test('3. qualified scooter subtype phrases surface only their own matching subtype, never the other one', () => {
  const failures = [];
  for (const [text, expectedValue] of QUALIFIED_SUBTYPE_CASES) {
    const suggested = suggestProductFamilyValues([text]);
    if (!suggested.includes(expectedValue)) failures.push(`"${text}" missing ${expectedValue}: ${JSON.stringify(suggested)}`);
    const otherValue = expectedValue === 'motorized_scooters' ? 'non_motorized_scooters' : 'motorized_scooters';
    if (suggested.includes(otherValue)) failures.push(`"${text}" wrongly includes ${otherValue}: ${JSON.stringify(suggested)}`);
  }
  assert.deepEqual(failures, []);
});

// -----------------------------------------------------------------
// 4. No automatic selection -- suggestion output is plain string
// values only, never a checked/selected concept.
// -----------------------------------------------------------------

test('4. suggestions never carry a checked/selected concept for any scooter text', () => {
  for (const text of ['קורקינט', 'scooter', 'קורקינט ממונע', 'motorized scooter']) {
    const suggested = suggestProductFamilyValues([text]);
    assert.ok(Array.isArray(suggested));
    for (const value of suggested) assert.equal(typeof value, 'string');
  }
});

// -----------------------------------------------------------------
// 5. Scooter accessory/part/repair-kit phrases never suggest a
// complete scooter (parameterized).
// -----------------------------------------------------------------

const SCOOTER_PART_CASES = Object.freeze([
  'אביזר לקורקינט', 'חלק לקורקינט', 'חלק חילוף לקורקינט', 'גלגל לקורקינט',
  'ערכת תיקון לקורקינט', 'scooter accessory', 'scooter part', 'scooter spare part',
  'scooter repair kit', 'scooter wheel', 'scooter carrying case',
]);

test('5. scooter accessory/part/repair-kit phrases never suggest either complete-scooter subtype', () => {
  const failures = [];
  for (const text of SCOOTER_PART_CASES) {
    const suggested = suggestProductFamilyValues([text]);
    if (suggested.includes('non_motorized_scooters') || suggested.includes('motorized_scooters')) {
      failures.push(`"${text}" -> ${JSON.stringify(suggested)}`);
    }
  }
  assert.deepEqual(failures, []);
});

// -----------------------------------------------------------------
// 6. Unrelated families are not returned for the scooter concept.
// -----------------------------------------------------------------

test('6. bare scooter concept text never suggests an unrelated family', () => {
  const suggested = suggestProductFamilyValues(['קורקינט']);
  for (const forbidden of [
    'food_and_beverage', 'dietary_supplements', 'animal_origin_products', 'animal_feed',
    'plant_origin_products', 'medicines', 'medical_equipment_or_medical_use',
    'textile_apparel_and_footwear', 'furniture_and_home_goods',
  ]) {
    assert.ok(!suggested.includes(forbidden), `"קורקינט" must not suggest ${forbidden}`);
  }
});

// -----------------------------------------------------------------
// 7. Unknown text still returns the full-list fallback (empty
// suggestion array -- the caller shows every family).
// -----------------------------------------------------------------

test('7. unknown/unsupported text still returns the empty full-list-fallback signal', () => {
  for (const text of ['מוצר לא מזוהה', 'unidentified product', 'a completely generic item']) {
    assert.deepEqual(suggestProductFamilyValues([text]), []);
  }
});

// -----------------------------------------------------------------
// 8. Returned values are deduplicated.
// -----------------------------------------------------------------

test('8. returned values are deduplicated even when both a real match and the concept hint could contribute the same value', () => {
  // "קורקינט רגיל" already produces non_motorized_scooters via the real
  // matrix alias; the broad "קורקינט" positive term is also present in
  // the same text, but must not duplicate it.
  const suggested = suggestProductFamilyValues(['קורקינט רגיל']);
  assert.equal(suggested.filter((v) => v === 'non_motorized_scooters').length, 1);
  assert.equal(new Set(suggested).size, suggested.length);
});

// -----------------------------------------------------------------
// 9. Existing UI order is preserved (ALL_PRODUCT_FAMILY_VALUES order).
// -----------------------------------------------------------------

test('9. suggested scooter values appear in the existing checklist order, not an arbitrary order', () => {
  const suggested = suggestProductFamilyValues(['קורקינט']);
  const nonMotorizedIndex = suggested.indexOf('non_motorized_scooters');
  const motorizedIndex = suggested.indexOf('motorized_scooters');
  const canonicalNonMotorizedIndex = ALL_PRODUCT_FAMILY_VALUES.indexOf('non_motorized_scooters');
  const canonicalMotorizedIndex = ALL_PRODUCT_FAMILY_VALUES.indexOf('motorized_scooters');
  // Both present, and their relative order matches the canonical list's
  // relative order (non_motorized_scooters before motorized_scooters).
  assert.ok(nonMotorizedIndex !== -1 && motorizedIndex !== -1);
  assert.equal(canonicalNonMotorizedIndex < canonicalMotorizedIndex, nonMotorizedIndex < motorizedIndex);
});

// -----------------------------------------------------------------
// 10. Specific subtype matches take precedence over the broad concept
// (the broad concept hint never contributes an extra, wrong value once
// a specific subtype is already established).
// -----------------------------------------------------------------

test('10. specific subtype phrases take precedence over the broad scooter concept -- no extra wrong subtype leaks in', () => {
  const failures = [];
  for (const [text, expectedValue] of QUALIFIED_SUBTYPE_CASES) {
    const suggested = suggestProductFamilyValues([text]);
    const scooterValues = suggested.filter((v) => v === 'non_motorized_scooters' || v === 'motorized_scooters');
    if (scooterValues.length !== 1 || scooterValues[0] !== expectedValue) {
      failures.push(`"${text}" -> scooter values ${JSON.stringify(scooterValues)}, expected only [${expectedValue}]`);
    }
  }
  assert.deepEqual(failures, []);
});

// -----------------------------------------------------------------
// 11. The presentation mapping cannot alter final identification.
// -----------------------------------------------------------------

test('11. the concept-level presentation mapping never affects identifyProductFamily\'s own real result', () => {
  for (const text of ['קורקינט', 'scooter', 'motorized scooter', 'אביזר לקורקינט', 'scooter repair kit']) {
    const result = identifyProductFamily([text]);
    // None of these bare/accessory phrases has a real matrix alias of
    // their own -- confirming the presentation layer contributed
    // nothing to the real identification outcome.
    assert.equal(result.outcome, IDENTIFICATION_OUTCOME.NONE, `"${text}" real identification must stay NONE`);
  }
});

// -----------------------------------------------------------------
// 12. Existing tent and cross-product behavior remains unchanged.
// -----------------------------------------------------------------

test('12. existing tent behavior and other cross-product suggestions remain byte-identical to before this correction', () => {
  assert.deepEqual(suggestProductFamilyValues(['אוהל']), ['textile_apparel_and_footwear', 'other_general_product', 'not_sure']);
  assert.deepEqual(suggestProductFamilyValues(['אוהל מטקסטיל']), ['textile_apparel_and_footwear']);
  assert.ok(suggestProductFamilyValues(['תרופות']).includes('medicines'));
  assert.ok(suggestProductFamilyValues(['ציוד מגן לספורט']).includes('sports_and_fitness_equipment'));
  assert.ok(suggestProductFamilyValues(['ציוד מגן לעבודה']).includes('personal_protective_equipment'));
  // Material suggestions are unaffected by the scooter concept (it
  // declares no suggestedMaterialValues, so the existing static default
  // applies, same as any other unmatched text).
  assert.deepEqual(suggestMaterialValues(['קורקינט']), suggestMaterialValues(['a completely generic item']));
});

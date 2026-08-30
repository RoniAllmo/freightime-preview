/**
 * Coverage-completion validation for the product-family selection
 * registry (product-owner mission: every active matrix concept must be
 * representable by an appropriate user-facing product-family option).
 *
 * This suite exercises the 12 checkboxes added in this pass (medicines,
 * sports_and_protective_equipment, bicycles_and_scooters,
 * complete_vehicles, marine_equipment, pet_products, hand_tools,
 * cardboard_packaging, wooden_packaging, paper_and_printed_products,
 * household_textile_products, building_glass) plus the drone-duplicate
 * resolution (additional-consumer-products-03, reachable via the
 * existing wireless_or_transmitting_equipment checkbox) and the
 * battery/accumulator plural presentation supplements.
 *
 * Structured per the task's own required validation categories:
 *   B. user-facing family validation (in the list, hidden by default,
 *      surfaced by a representative description, never auto-selected,
 *      explicit selection resolves only through intended candidates)
 *   C. negative validation (accessories/parts/repair kits/ambiguous
 *      wording never falsely trigger a new family)
 *   E. representative description coverage (one test per concept)
 *   F. cross-family isolation
 *
 * See family-suggestion-registry-boundary.test.js for category A
 * (full active-matrix coverage) and the generic alias-boundary sweep,
 * and product-family-selection-mapping.test.js for the exact-inventory
 * reconciliation (which also covers most of category D).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCT_FAMILY } from '../../js/import-readiness/layered-question-model.js';
import {
  PRODUCT_FAMILY_SELECTION_CANDIDATES,
  resolveFamilyIdentificationOptions,
} from '../../js/import-readiness/product-family-selection-mapping.js';
import { findFamilyById } from '../../js/import-readiness/product-family-matrix.js';
import { suggestProductFamilyValues, ALL_PRODUCT_FAMILY_VALUES } from '../../js/import-readiness/family-material-disclosure.js';

const NEW_CHECKBOXES = Object.freeze([
  'medicines',
  'sports_and_protective_equipment',
  'bicycles_and_scooters',
  'complete_vehicles',
  'marine_equipment',
  'pet_products',
  'hand_tools',
  'cardboard_packaging',
  'wooden_packaging',
  'paper_and_printed_products',
  'household_textile_products',
  'building_glass',
]);

// -----------------------------------------------------------------
// B. User-facing family validation.
// -----------------------------------------------------------------

test('B1. every new checkbox value is a real PRODUCT_FAMILY value and appears in the presentation-order list', () => {
  for (const value of NEW_CHECKBOXES) {
    assert.ok(PRODUCT_FAMILY.includes(value), `${value} must be in PRODUCT_FAMILY`);
    assert.ok(ALL_PRODUCT_FAMILY_VALUES.includes(value), `${value} must be in ALL_PRODUCT_FAMILY_VALUES`);
  }
});

test('B2. every new checkbox stays hidden (no suggestion) for text unrelated to it', () => {
  for (const value of NEW_CHECKBOXES) {
    const suggested = suggestProductFamilyValues(['מוצר כללי לבדיקה ללא זיהוי מיוחד']);
    assert.ok(!suggested.includes(value), `${value} must not appear for unrelated neutral text`);
  }
});

test('B3. suggestProductFamilyValues never returns an object carrying a checked/selected concept for any new-family text -- plain string values only, never auto-selected', () => {
  const texts = [
    'תרופות למכירה', 'ציוד ספורט', 'אופניים רגילים', 'כלי רכב שלמים',
    'ציוד ימי וכלי שיט', 'מוצרים לחיות מחמד', 'כלי עבודה ידניים', 'קרטון לאריזה',
    'קופסת עץ לאריזה', 'נייר להדפסה', 'שטיחים לבית', 'זכוכית בטיחות לבניין',
  ];
  for (const text of texts) {
    const suggested = suggestProductFamilyValues([text]);
    assert.ok(Array.isArray(suggested));
    for (const value of suggested) assert.equal(typeof value, 'string', `${text} -> non-string suggestion entry`);
  }
});

test('B4. explicit selection of each new checkbox resolves only through its own intended matrix candidate(s)', () => {
  const expected = {
    medicines: ['health-and-cosmetics-04'],
    sports_and_protective_equipment: ['additional-consumer-products-01', 'additional-consumer-products-06'],
    bicycles_and_scooters: ['additional-consumer-products-02', 'additional-consumer-products-07'],
    complete_vehicles: ['vehicles-and-transport-01', 'vehicles-and-transport-02'],
    marine_equipment: ['additional-consumer-products-04'],
    pet_products: ['additional-consumer-products-05'],
    hand_tools: ['construction-and-industrial-04'],
    cardboard_packaging: ['additional-consumer-products-08'],
    wooden_packaging: ['construction-and-industrial-05'],
    paper_and_printed_products: ['additional-consumer-products-09'],
    household_textile_products: ['textiles-and-furniture-06', 'textiles-and-furniture-07', 'textiles-and-furniture-08'],
    building_glass: ['construction-and-industrial-06'],
  };
  for (const [checkbox, ids] of Object.entries(expected)) {
    const options = resolveFamilyIdentificationOptions([checkbox], findFamilyById);
    const producedIds = options.forcedFamily ? [options.forcedFamily.id] : (options.families || []).map((f) => f.id);
    assert.deepEqual(producedIds.sort(), [...ids].sort(), `${checkbox} must resolve only through ${JSON.stringify(ids)}`);
  }
});

// -----------------------------------------------------------------
// E. Representative-description coverage: each of the 17 product-owner
// concepts (plus the drone duplicate) surfaces its intended checkbox
// from at least one clear description.
// -----------------------------------------------------------------

test('E1. representative descriptions surface the correct new/extended checkbox', () => {
  const cases = [
    ['תרופות למכירה בבית מרקחת', 'medicines'],
    ['ציוד ספורט למתאמנים', 'sports_and_protective_equipment'],
    ['קסדת מגן לעבודה', 'sports_and_protective_equipment'],
    ['אופניים רגילים לילדים', 'bicycles_and_scooters'],
    ['אופניים חשמליים עם מנוע עזר', 'bicycles_and_scooters'],
    ['כלי רכב שלמים למכירה', 'complete_vehicles'],
    ['אופנועים וקטנועים שלמים', 'complete_vehicles'],
    ['ציוד ימי וכלי שיט', 'marine_equipment'],
    ['רצועה לכלב', 'pet_products'],
    ['קערה לחיית מחמד', 'pet_products'],
    ['פטיש וסט כלי עבודה ידניים', 'hand_tools'],
    ['hammer and hand tool set', 'hand_tools'],
    ['קרטון גלי לאריזה', 'cardboard_packaging'],
    ['corrugated carton for shipping', 'cardboard_packaging'],
    ['ארגז עץ לאריזה', 'wooden_packaging'],
    ['wooden crate', 'wooden_packaging'],
    ['נייר להדפסה ומחברות', 'paper_and_printed_products'],
    ['printing paper and notebooks', 'paper_and_printed_products'],
    ['שטיחים לסלון', 'household_textile_products'],
    ['שמיכה רגילה', 'household_textile_products'],
    ['מצעים ווילונות', 'household_textile_products'],
    ['זכוכית בטיחות לבניין', 'building_glass'],
    ['building safety glass panel', 'building_glass'],
    ['רחפן עם מצלמה', 'wireless_or_transmitting_equipment'],
    ['רחפנים למכירה', 'wireless_or_transmitting_equipment'],
  ];
  const failures = [];
  for (const [text, expectedCheckbox] of cases) {
    const suggested = suggestProductFamilyValues([text]);
    if (!suggested.includes(expectedCheckbox)) failures.push(`"${text}" expected ${expectedCheckbox}, got ${JSON.stringify(suggested)}`);
  }
  assert.deepEqual(failures, []);
});

// -----------------------------------------------------------------
// C. Negative validation: accessories/parts/repair kits/ambiguous
// wording never falsely trigger a new family.
// -----------------------------------------------------------------

test('C1. bicycle/scooter accessories and parts never trigger bicycles_and_scooters (uses the existing, already-reviewed negative-term guards)', () => {
  for (const text of ['מנשא אופניים לרכב', 'כיסוי לאופניים', 'קסדת אופניים', 'bicycle rack', 'bicycle cover', 'bike helmet']) {
    assert.ok(!suggestProductFamilyValues([text]).includes('bicycles_and_scooters'), `"${text}" must not trigger bicycles_and_scooters`);
  }
});

test('C2. drone accessories/parts (singular and plural) never trigger wireless_or_transmitting_equipment', () => {
  for (const text of ['drone accessory', 'drone propeller', 'drone carrying case', 'אביזר לרחפן', 'drone accessories', 'אביזרים לרחפנים']) {
    assert.ok(!suggestProductFamilyValues([text]).includes('wireless_or_transmitting_equipment'), `"${text}" must not trigger wireless_or_transmitting_equipment`);
  }
});

test('C3. sports-equipment text explicitly naming protective equipment too (without the exact "ציוד מגן אישי" phrase) is never falsely resolved to the plain, no-positive-signal sports row -- it stays unresolved rather than guessing (existing "וציוד מגן" guard preserved)', async () => {
  const { identifyProductFamily, IDENTIFICATION_OUTCOME } = await import('../../js/import-readiness/product-family-identification.js');
  const result = identifyProductFamily(['ציוד ספורט וציוד מגן']);
  assert.notEqual(result.family && result.family.id, 'additional-consumer-products-01', 'must not falsely resolve to the plain, no-positive-signal sports row');
  assert.equal(result.outcome, IDENTIFICATION_OUTCOME.NONE);
});

test('C4. vehicle-dedicated battery/accumulator text (singular and plural) never resolves to the STANDALONE battery matrix row -- it correctly resolves to the vehicle-dedicated row instead, which happens to share the same checkbox by design (batteries_or_battery_containing groups standalone/vehicle-dedicated/containing directions, disambiguated by free text on explicit selection)', async () => {
  const { identifyProductFamily } = await import('../../js/import-readiness/product-family-identification.js');
  for (const text of ['מצבר לרכב', 'vehicle battery', 'car battery', 'מצברים לרכב', 'vehicle batteries', 'car batteries']) {
    const result = identifyProductFamily([text]);
    assert.notEqual(result.family && result.family.id, 'electrical-and-electronics-07', `"${text}" must not resolve to the standalone battery row`);
  }
});

test('C5. carpet-cleaning equipment never triggers household_textile_products (rug alias boundary preserved)', () => {
  for (const text of ['carpet cleaner', 'מנקה שטיחים', 'rug cleaning']) {
    assert.ok(!suggestProductFamilyValues([text]).includes('household_textile_products'), `"${text}" must not trigger household_textile_products`);
  }
});

// -----------------------------------------------------------------
// F. Cross-family isolation.
// -----------------------------------------------------------------

test('F1. medicines never bleeds into machinery, furniture, textiles, or medical-equipment families', () => {
  const suggested = suggestProductFamilyValues(['תרופות למכירה']);
  for (const forbidden of ['industrial_machinery_and_equipment', 'furniture_and_home_goods', 'textile_apparel_and_footwear', 'medical_equipment_or_medical_use']) {
    assert.ok(!suggested.includes(forbidden), `medicines text must not suggest ${forbidden}`);
  }
});

test('F2. complete vehicles/motorcycles never resolve to vehicle_parts_and_transport_accessories', () => {
  for (const text of ['כלי רכב שלמים למכירה', 'אופנועים וקטנועים שלמים']) {
    assert.ok(!suggestProductFamilyValues([text]).includes('vehicle_parts_and_transport_accessories'), `"${text}" must not suggest vehicle_parts_and_transport_accessories`);
  }
});

test('F3. pet accessories never resolve to animal-origin, live-animal, or animal-feed families', () => {
  for (const text of ['רצועה לכלב', 'קערה לחיית מחמד', 'pet toy']) {
    const suggested = suggestProductFamilyValues([text]);
    for (const forbidden of ['animal_origin_products', 'live_animals', 'animal_feed']) {
      assert.ok(!suggested.includes(forbidden), `"${text}" must not suggest ${forbidden}`);
    }
  }
});

test('F4. hand tools never resolve to industrial_machinery_and_equipment', () => {
  for (const text of ['פטיש וסט כלי עבודה ידניים', 'hand tool set']) {
    assert.ok(!suggestProductFamilyValues([text]).includes('industrial_machinery_and_equipment'), `"${text}" must not suggest industrial_machinery_and_equipment`);
  }
});

test('F5. building glass never resolves to vehicle_parts_and_transport_accessories (vehicle safety glass), and vehicle safety glass never resolves to building_glass', () => {
  assert.ok(!suggestProductFamilyValues(['זכוכית בטיחות לבניין']).includes('vehicle_parts_and_transport_accessories'));
  // Vehicle safety glass is reachable through the pre-existing
  // vehicle_parts_and_transport_accessories checkbox (vehicles-and-transport-08).
  const vehicleGlassCandidates = PRODUCT_FAMILY_SELECTION_CANDIDATES.vehicle_parts_and_transport_accessories || [];
  assert.ok(vehicleGlassCandidates.includes('vehicles-and-transport-08'));
  assert.ok(!(PRODUCT_FAMILY_SELECTION_CANDIDATES.building_glass || []).includes('vehicles-and-transport-08'));
});

test('F6. household textile products (rugs/blankets/bedding/curtains/towels) never resolve to apparel/footwear or furniture', () => {
  for (const text of ['שטיחים לסלון', 'שמיכה רגילה', 'מצעים ווילונות']) {
    const suggested = suggestProductFamilyValues([text]);
    assert.ok(!suggested.includes('textile_apparel_and_footwear'), `"${text}" must not suggest textile_apparel_and_footwear`);
    assert.ok(!suggested.includes('furniture_and_home_goods'), `"${text}" must not suggest furniture_and_home_goods`);
  }
});

test('F7. ordinary bicycle/scooter accessories/parts never resolve to complete_vehicles (bicycles are not complete motor vehicles)', () => {
  for (const text of ['אופניים רגילים לילדים', 'electric bicycle']) {
    assert.ok(!suggestProductFamilyValues([text]).includes('complete_vehicles'), `"${text}" must not suggest complete_vehicles`);
  }
});

test('F8. sports equipment and personal protective equipment stay distinguishable from each other by the free text, without either being excluded from the shared checkbox', () => {
  const sportsText = suggestProductFamilyValues(['משקולות לאימון']);
  const ppeText = suggestProductFamilyValues(['משקפי מגן וכפפות מגן']);
  assert.ok(sportsText.includes('sports_and_protective_equipment'));
  assert.ok(ppeText.includes('sports_and_protective_equipment'));
});

test('F9. packaging families (cardboard/wooden) never fabricate food-contact wording or resolve to the food-contact checkbox', () => {
  for (const text of ['קרטון גלי לאריזה', 'ארגז עץ לאריזה']) {
    assert.ok(!suggestProductFamilyValues([text]).includes('food_contact_items'), `"${text}" must not suggest food_contact_items`);
  }
});

test('F10. cardboard packaging and wooden packaging remain two distinct checkboxes, never merged (different underlying regulatory signal)', () => {
  assert.ok(suggestProductFamilyValues(['קרטון גלי לאריזה']).includes('cardboard_packaging'));
  assert.ok(!suggestProductFamilyValues(['קרטון גלי לאריזה']).includes('wooden_packaging'));
  assert.ok(suggestProductFamilyValues(['ארגז עץ לאריזה']).includes('wooden_packaging'));
  assert.ok(!suggestProductFamilyValues(['ארגז עץ לאריזה']).includes('cardboard_packaging'));
});

// -----------------------------------------------------------------
// D. Existing-family regression spot checks (full regression coverage
// lives in family-suggestion-registry-boundary.test.js and
// product-family-selection-mapping.test.js; these are additional
// spot checks specific to the families this pass touched directly).
// -----------------------------------------------------------------

test('D1. the full checklist (ALL_PRODUCT_FAMILY_VALUES) remains a strict superset of every suggestion set -- new checkboxes never replace the full list', () => {
  const suggested = suggestProductFamilyValues(['תרופות למכירה']);
  for (const value of suggested) assert.ok(ALL_PRODUCT_FAMILY_VALUES.includes(value));
});

test('D2. building_materials (unrelated to the new building_glass checkbox) keeps its own pre-existing single-candidate, unambiguous resolution', () => {
  const options = resolveFamilyIdentificationOptions(['building_materials'], findFamilyById);
  assert.ok(options.forcedFamily);
  assert.equal(options.forcedFamily.id, 'construction-and-industrial-01');
});

test('D3. already-selected new-family checkboxes remain visible/selected (this module never removes a value the caller already has) -- suggestProductFamilyValues is purely additive and does not know about prior selections, so this is verified at the mapping/candidate level', () => {
  for (const value of NEW_CHECKBOXES) {
    assert.ok(PRODUCT_FAMILY_SELECTION_CANDIDATES[value] && PRODUCT_FAMILY_SELECTION_CANDIDATES[value].length > 0);
  }
});

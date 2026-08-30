/**
 * Coverage-completion validation for the product-family selection
 * registry (product-owner mission: every active matrix concept must be
 * representable by an appropriate user-facing product-family option),
 * as CORRECTED per the follow-up product-owner rules on sports/PPE,
 * rugs/blankets/household textiles, complete vehicles/motorcycles,
 * motorcycle spare parts, and bicycles/scooters.
 *
 * This suite exercises the 18 checkboxes added across both passes:
 *   medicines, sports_and_fitness_equipment, personal_protective_equipment,
 *   ordinary_bicycles, motorized_bicycles, non_motorized_scooters,
 *   motorized_scooters, complete_vehicles, marine_equipment, pet_products,
 *   hand_tools, cardboard_packaging, wooden_packaging,
 *   paper_and_printed_products, rugs_and_carpets, blankets,
 *   general_household_textile_products, building_glass
 * plus the drone-duplicate resolution (additional-consumer-products-03,
 * reachable via the existing wireless_or_transmitting_equipment
 * checkbox) and the battery/accumulator plural presentation
 * supplements.
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
import { identifyProductFamily, IDENTIFICATION_OUTCOME } from '../../js/import-readiness/product-family-identification.js';

const NEW_CHECKBOXES = Object.freeze([
  'medicines',
  'sports_and_fitness_equipment',
  'personal_protective_equipment',
  'ordinary_bicycles',
  'motorized_bicycles',
  'non_motorized_scooters',
  'motorized_scooters',
  'complete_vehicles',
  'marine_equipment',
  'pet_products',
  'hand_tools',
  'cardboard_packaging',
  'wooden_packaging',
  'paper_and_printed_products',
  'rugs_and_carpets',
  'blankets',
  'general_household_textile_products',
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

test('B1b. the old combined checkboxes no longer exist anywhere', () => {
  for (const removed of ['sports_and_protective_equipment', 'bicycles_and_scooters', 'household_textile_products']) {
    assert.ok(!PRODUCT_FAMILY.includes(removed), `${removed} must be removed from PRODUCT_FAMILY`);
    assert.ok(!ALL_PRODUCT_FAMILY_VALUES.includes(removed), `${removed} must be removed from ALL_PRODUCT_FAMILY_VALUES`);
    assert.equal(PRODUCT_FAMILY_SELECTION_CANDIDATES[removed], undefined, `${removed} must be removed from PRODUCT_FAMILY_SELECTION_CANDIDATES`);
  }
});

test('B2. every new checkbox stays hidden (no suggestion) for text unrelated to it', () => {
  const suggested = suggestProductFamilyValues(['מוצר כללי לבדיקה ללא זיהוי מיוחד']);
  for (const value of NEW_CHECKBOXES) {
    assert.ok(!suggested.includes(value), `${value} must not appear for unrelated neutral text`);
  }
});

test('B3. suggestProductFamilyValues never returns an object carrying a checked/selected concept for any new-family text -- plain string values only, never auto-selected', () => {
  const texts = [
    'תרופות למכירה', 'ציוד ספורט', 'ציוד מגן לעבודה', 'אופניים רגילים', 'אופנוע',
    'ציוד ימי וכלי שיט', 'מוצרים לחיות מחמד', 'כלי עבודה ידניים', 'קרטון לאריזה',
    'קופסת עץ לאריזה', 'נייר להדפסה', 'שטיח', 'שמיכה רגילה', 'זכוכית בטיחות לבניין',
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
    sports_and_fitness_equipment: ['additional-consumer-products-01'],
    personal_protective_equipment: ['additional-consumer-products-06'],
    ordinary_bicycles: ['additional-consumer-products-02'],
    motorized_bicycles: ['additional-consumer-products-07'],
    non_motorized_scooters: ['additional-consumer-products-02'],
    motorized_scooters: ['additional-consumer-products-07'],
    complete_vehicles: ['vehicles-and-transport-01', 'vehicles-and-transport-02'],
    marine_equipment: ['additional-consumer-products-04'],
    pet_products: ['additional-consumer-products-05'],
    hand_tools: ['construction-and-industrial-04'],
    cardboard_packaging: ['additional-consumer-products-08'],
    wooden_packaging: ['construction-and-industrial-05'],
    paper_and_printed_products: ['additional-consumer-products-09'],
    rugs_and_carpets: ['textiles-and-furniture-06'],
    blankets: ['textiles-and-furniture-07'],
    general_household_textile_products: ['textiles-and-furniture-08'],
    building_glass: ['construction-and-industrial-06'],
  };
  for (const [checkbox, ids] of Object.entries(expected)) {
    const options = resolveFamilyIdentificationOptions([checkbox], findFamilyById);
    const producedIds = options.forcedFamily ? [options.forcedFamily.id] : (options.families || []).map((f) => f.id);
    assert.deepEqual(producedIds.sort(), [...ids].sort(), `${checkbox} must resolve only through ${JSON.stringify(ids)}`);
  }
});

test('B5. every new checkbox except complete_vehicles is now a single-candidate (forced, fully deterministic) selection', () => {
  for (const value of NEW_CHECKBOXES) {
    if (value === 'complete_vehicles') continue;
    const options = resolveFamilyIdentificationOptions([value], findFamilyById);
    assert.ok(options.forcedFamily, `${value} must resolve to a single forced family`);
  }
});

// -----------------------------------------------------------------
// E. Representative-description coverage.
// -----------------------------------------------------------------

test('E1. representative descriptions surface the correct checkbox', () => {
  const cases = [
    ['תרופות למכירה בבית מרקחת', 'medicines'],
    ['ציוד ספורט למתאמנים', 'sports_and_fitness_equipment'],
    ['ציוד מגן לעבודה', 'personal_protective_equipment'],
    ['ציוד מגן לספורט', 'sports_and_fitness_equipment'],
    ['אופניים רגילים לילדים', 'ordinary_bicycles'],
    ['אופניים חשמליים עם מנוע עזר', 'motorized_bicycles'],
    ['אופניים ממונעים', 'motorized_bicycles'],
    ['קורקינט רגיל', 'non_motorized_scooters'],
    ['קורקינט חשמלי', 'motorized_scooters'],
    ['קורקינט ממונע', 'motorized_scooters'],
    ['כלי רכב שלמים למכירה', 'complete_vehicles'],
    ['אופנועים וקטנועים שלמים', 'complete_vehicles'],
    ['אופנוע', 'complete_vehicles'],
    ['חלק חילוף לאופנוע', 'vehicle_parts_and_transport_accessories'],
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
    ['שטיח', 'rugs_and_carpets'],
    ['שטיחים לסלון', 'rugs_and_carpets'],
    ['שמיכה רגילה', 'blankets'],
    ['שמיכה חשמלית', 'blankets'],
    ['מצעים ווילונות', 'general_household_textile_products'],
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
// wording never falsely trigger a family.
// -----------------------------------------------------------------

test('C1. bicycle/scooter accessories and parts never trigger any bicycle/scooter checkbox (uses the existing, already-reviewed negative-term guards)', () => {
  for (const text of ['מנשא אופניים לרכב', 'כיסוי לאופניים', 'קסדת אופניים', 'bicycle rack', 'bicycle cover', 'bike helmet']) {
    const suggested = suggestProductFamilyValues([text]);
    for (const forbidden of ['ordinary_bicycles', 'motorized_bicycles', 'non_motorized_scooters', 'motorized_scooters']) {
      assert.ok(!suggested.includes(forbidden), `"${text}" must not trigger ${forbidden}`);
    }
  }
});

test('C2. drone accessories/parts (singular and plural, including bare "part" wording) never trigger wireless_or_transmitting_equipment', () => {
  for (const text of [
    'drone accessory', 'drone propeller', 'drone carrying case', 'אביזר לרחפן', 'drone accessories', 'אביזרים לרחפנים',
    'drone part', 'drone parts', 'חלק לרחפן', 'חלקי רחפן', 'חלקים לרחפנים',
  ]) {
    assert.ok(!suggestProductFamilyValues([text]).includes('wireless_or_transmitting_equipment'), `"${text}" must not trigger wireless_or_transmitting_equipment`);
  }
});

test('C3. sports-equipment text explicitly naming protective equipment too (without the exact "ציוד מגן אישי" phrase) is never falsely resolved to the plain, no-positive-signal sports row -- it stays unresolved rather than guessing (existing "וציוד מגן" guard preserved)', () => {
  const result = identifyProductFamily(['ציוד ספורט וציוד מגן']);
  assert.notEqual(result.family && result.family.id, 'additional-consumer-products-01', 'must not falsely resolve to the plain, no-positive-signal sports row');
  assert.equal(result.outcome, IDENTIFICATION_OUTCOME.NONE);
});

test('C3b. sports-context protective equipment never resolves to the general PPE checkbox, and occupational/work protective equipment never resolves to the sports checkbox', () => {
  const sportsProtective = suggestProductFamilyValues(['ציוד מגן לספורט']);
  assert.ok(!sportsProtective.includes('personal_protective_equipment'), 'sports-context protective wording must not trigger general PPE');
  const workProtective = suggestProductFamilyValues(['ציוד מגן לעבודה']);
  assert.ok(!workProtective.includes('sports_and_fitness_equipment'), 'work-context protective wording must not trigger sports equipment');
});

test('C4. vehicle-dedicated battery/accumulator text (singular and plural) never resolves to the STANDALONE battery matrix row -- it correctly resolves to the vehicle-dedicated row instead, which happens to share the same checkbox by design (batteries_or_battery_containing groups standalone/vehicle-dedicated/containing directions, disambiguated by free text on explicit selection)', () => {
  for (const text of ['מצבר לרכב', 'vehicle battery', 'car battery', 'מצברים לרכב', 'vehicle batteries', 'car batteries']) {
    const result = identifyProductFamily([text]);
    assert.notEqual(result.family && result.family.id, 'electrical-and-electronics-07', `"${text}" must not resolve to the standalone battery row`);
  }
});

test('C4b. battery/accumulator accessories and parts never resolve to the standalone battery matrix row', () => {
  for (const text of [
    'battery part', 'battery accessory', 'אביזר לסוללה', 'חלק לסוללה', 'מטען למצבר',
    'accumulator charger', 'accumulator holder', 'accumulator compartment', 'accumulator part', 'accumulator accessory',
  ]) {
    const result = identifyProductFamily([text]);
    assert.notEqual(result.family && result.family.id, 'electrical-and-electronics-07', `"${text}" must not resolve to the standalone battery row`);
  }
});

test('C5. carpet-cleaning equipment never triggers rugs_and_carpets (rug alias boundary preserved)', () => {
  for (const text of ['carpet cleaner', 'מנקה שטיחים', 'rug cleaning']) {
    assert.ok(!suggestProductFamilyValues([text]).includes('rugs_and_carpets'), `"${text}" must not trigger rugs_and_carpets`);
  }
});

test('C6. motorcycle spare-part wording never resolves to complete_vehicles, and complete-motorcycle wording never resolves to vehicle_parts_and_transport_accessories', () => {
  for (const text of ['חלק חילוף לאופנוע', 'motorcycle spare part']) {
    assert.ok(!suggestProductFamilyValues([text]).includes('complete_vehicles'), `"${text}" must not trigger complete_vehicles`);
  }
  for (const text of ['אופנוע', 'אופנועים וקטנועים שלמים']) {
    assert.ok(!suggestProductFamilyValues([text]).includes('vehicle_parts_and_transport_accessories'), `"${text}" must not trigger vehicle_parts_and_transport_accessories`);
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
  for (const text of ['כלי רכב שלמים למכירה', 'אופנועים וקטנועים שלמים', 'אופנוע']) {
    assert.ok(!suggestProductFamilyValues([text]).includes('vehicle_parts_and_transport_accessories'), `"${text}" must not suggest vehicle_parts_and_transport_accessories`);
  }
});

test('F2b. motorcycle spare parts preserve the Ministry of Transport (vehicle-laboratory) approval direction and are not swept into an unrelated machinery family', () => {
  const result = identifyProductFamily(['חלקי חילוף לאופנועים וקטנועים']);
  assert.equal(result.family && result.family.id, 'vehicles-and-transport-04');
  assert.equal(result.family.regulatorySignals.transportOrVehicleLaboratory, true);
  const suggested = suggestProductFamilyValues(['חלק חילוף לאופנוע']);
  assert.ok(!suggested.includes('industrial_machinery_and_equipment'));
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
  const vehicleGlassCandidates = PRODUCT_FAMILY_SELECTION_CANDIDATES.vehicle_parts_and_transport_accessories || [];
  assert.ok(vehicleGlassCandidates.includes('vehicles-and-transport-08'));
  assert.ok(!(PRODUCT_FAMILY_SELECTION_CANDIDATES.building_glass || []).includes('vehicles-and-transport-08'));
});

test('F6. rugs, blankets, and general household textiles never resolve to apparel/footwear or furniture, and never resolve to each other', () => {
  const rugs = suggestProductFamilyValues(['שטיח']);
  const blanket = suggestProductFamilyValues(['שמיכה רגילה']);
  const general = suggestProductFamilyValues(['מצעים ווילונות']);
  for (const suggested of [rugs, blanket, general]) {
    assert.ok(!suggested.includes('textile_apparel_and_footwear'));
    assert.ok(!suggested.includes('furniture_and_home_goods'));
  }
  assert.ok(rugs.includes('rugs_and_carpets') && !rugs.includes('blankets') && !rugs.includes('general_household_textile_products'));
  assert.ok(blanket.includes('blankets') && !blanket.includes('rugs_and_carpets') && !blanket.includes('general_household_textile_products'));
  assert.ok(general.includes('general_household_textile_products') && !general.includes('rugs_and_carpets') && !general.includes('blankets'));
});

test('F7. ordinary/motorized bicycle and scooter text never resolve to complete_vehicles (bicycles/scooters are not complete motor vehicles)', () => {
  for (const text of ['אופניים רגילים לילדים', 'electric bicycle', 'קורקינט רגיל', 'קורקינט חשמלי']) {
    assert.ok(!suggestProductFamilyValues([text]).includes('complete_vehicles'), `"${text}" must not suggest complete_vehicles`);
  }
});

test('F8. ordinary bicycles, motorized bicycles, non-motorized scooters, and motorized scooters do not receive one another\'s result', () => {
  const ordinaryBike = suggestProductFamilyValues(['אופניים רגילים']);
  const motorBike = suggestProductFamilyValues(['אופניים חשמליים']);
  const plainScooter = suggestProductFamilyValues(['קורקינט רגיל']);
  const motorScooter = suggestProductFamilyValues(['קורקינט חשמלי']);
  assert.ok(!ordinaryBike.includes('motorized_bicycles') && !ordinaryBike.includes('motorized_scooters'));
  assert.ok(!motorBike.includes('ordinary_bicycles') && !motorBike.includes('non_motorized_scooters'));
  assert.ok(!plainScooter.includes('motorized_bicycles') && !plainScooter.includes('motorized_scooters'));
  assert.ok(!motorScooter.includes('ordinary_bicycles') && !motorScooter.includes('non_motorized_scooters'));
  // Non-motorized -> Standards Institution direction; motorized -> automotive-laboratory direction.
  const plainResult = identifyProductFamily(['קורקינט רגיל']);
  const motorResult = identifyProductFamily(['קורקינט חשמלי']);
  assert.equal(plainResult.family.regulatorySignals.standards, true);
  assert.equal(motorResult.family.regulatorySignals.transportOrVehicleLaboratory, true);
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

test('F11. sports and general PPE are fully separate checkboxes with no shared candidate', () => {
  const sportsIds = new Set(PRODUCT_FAMILY_SELECTION_CANDIDATES.sports_and_fitness_equipment);
  const ppeIds = new Set(PRODUCT_FAMILY_SELECTION_CANDIDATES.personal_protective_equipment);
  for (const id of sportsIds) assert.ok(!ppeIds.has(id), `${id} must not be shared between sports and PPE`);
  const weights = suggestProductFamilyValues(['משקולות לאימון']);
  const gear = suggestProductFamilyValues(['משקפי מגן וכפפות מגן']);
  assert.ok(weights.includes('sports_and_fitness_equipment') && !weights.includes('personal_protective_equipment'));
  assert.ok(gear.includes('personal_protective_equipment') && !gear.includes('sports_and_fitness_equipment'));
});

// -----------------------------------------------------------------
// D. Existing-family regression spot checks (full regression coverage
// lives in family-suggestion-registry-boundary.test.js and
// product-family-selection-mapping.test.js; these are additional
// spot checks specific to the families this pass touched directly).
// -----------------------------------------------------------------

test('D1. the full checklist (ALL_PRODUCT_FAMILY_VALUES) remains a strict superset of every suggestion set -- checkboxes never replace the full list', () => {
  const suggested = suggestProductFamilyValues(['תרופות למכירה']);
  for (const value of suggested) assert.ok(ALL_PRODUCT_FAMILY_VALUES.includes(value));
});

test('D2. building_materials (unrelated to building_glass) keeps its own pre-existing single-candidate, unambiguous resolution', () => {
  const options = resolveFamilyIdentificationOptions(['building_materials'], findFamilyById);
  assert.ok(options.forcedFamily);
  assert.equal(options.forcedFamily.id, 'construction-and-industrial-01');
});

test('D3. every new checkbox has a non-empty candidate mapping (never silently unmapped)', () => {
  for (const value of NEW_CHECKBOXES) {
    assert.ok(PRODUCT_FAMILY_SELECTION_CANDIDATES[value] && PRODUCT_FAMILY_SELECTION_CANDIDATES[value].length > 0, `${value} must have a non-empty candidate mapping`);
  }
});

test('D4. tent presentation-hint behavior is unchanged by this correction pass', () => {
  assert.deepEqual(suggestProductFamilyValues(['אוהל']), ['textile_apparel_and_footwear', 'other_general_product', 'not_sure']);
});

test('D5. an unclear/unsupported description still produces no suggestion at all (safe fallback)', () => {
  for (const text of ['unidentified product', 'מוצר לא מזוהה', 'a completely generic item']) {
    assert.deepEqual(suggestProductFamilyValues([text]), []);
  }
});

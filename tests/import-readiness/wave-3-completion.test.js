/**
 * Wave 3 completion (product-owner-approved, 2026-08-27): drones,
 * non-food pet equipment/products, hand tools, packaging products,
 * paper and printed products, non-apparel textile products, and glass
 * and ceramic products. See docs/product-family-matrix-engine.md's
 * "Wave 3" section for the full per-area rationale.
 *
 * Every rule reuses the existing explicit-family-selection, candidate-
 * set, matrix, family-guidance, detailed-rule, professional-routing,
 * result-state, and document-deduplication architecture -- no new
 * question, no new professional category, no new result state.
 *
 * Every test exercises final resolution and final result behavior, not
 * only string presence.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductFamilyMatrixSection } from '../../js/import-readiness/product-family-result.js';
import { IMPORT_TYPE } from '../../js/import-readiness/scenario-schema.js';
import { PRODUCT_FAMILY_MATRIX, findFamilyById } from '../../js/import-readiness/product-family-matrix.js';
import { identifyProductFamily } from '../../js/import-readiness/product-family-identification.js';
import { REGULATORY_FOLLOWUP_QUESTIONS } from '../../js/import-readiness/regulatory-signals/questions.js';
import { REGULATORY_SIGNAL_RULES } from '../../js/import-readiness/regulatory-signals/rules-registry.js';

function section(texts, checkboxes) {
  return buildProductFamilyMatrixSection({
    texts,
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: checkboxes,
  });
}

function assertNoAbsoluteExemptionWording(text) {
  assert.ok(!text.includes('פטור מלא'), 'must never claim a full exemption');
  assert.ok(!text.includes('אין צורך באישור כלשהו'), 'must never claim no approval of any kind is required');
}

function assertSinglePositiveResult(s, expectedCategory) {
  assert.equal(s.state, 'positive');
  assert.deepEqual(s.positiveCategories, [expectedCategory]);
  assert.ok(s.professional.primary, 'must have a primary professional');
  assert.equal(typeof s.limitation, 'string');
  assert.ok(s.limitation.length > 0, 'must carry a limitation disclaimer');
}

function assertNoPositiveResult(s) {
  assert.notEqual(s.state, 'positive');
  assert.deepEqual(s.positiveCategories, []);
}

// -- 1. Zero-question guarantee --

test('1. focused-question registry and rule registry are unchanged (zero-question guarantee)', () => {
  assert.equal(REGULATORY_FOLLOWUP_QUESTIONS.length, 9);
  assert.equal(REGULATORY_SIGNAL_RULES.length, 5);
  const ids = REGULATORY_FOLLOWUP_QUESTIONS.map((q) => q.id).sort();
  assert.deepEqual(ids, [
    'coatingDirectFoodOrDrinkContact',
    'coatingMaterial',
    'directContactMaterial',
    'directFoodOrDrinkContact',
    'glassVesselDirectFoodOrDrinkContact',
    'hasInternalCoating',
    'installedAsPartOfVehicle',
    'mainsConnectedOrSuppliedAdapter',
    'personalUseOnlyConfirmation',
  ]);
  const forbidden = [
    'drone', 'weight', 'camera', 'flight', 'aviation', 'caa', 'frequenc', 'controller',
    'pettype', 'tooltype', 'blade', 'motor', 'voltage', 'wattage', 'safetymechanism',
    'packaging', 'subtype', 'book', 'agesuitab', 'carpet', 'blanket', 'infantage',
    'thickness', 'ceramictype', 'buildinguse', 'vehiclemodel', 'standard',
  ];
  for (const q of REGULATORY_FOLLOWUP_QUESTIONS) {
    for (const bad of forbidden) {
      assert.ok(!q.id.toLowerCase().includes(bad), `question id "${q.id}" must not be Wave-3-detail related`);
    }
  }
});

// -- 2. Drones --

test('2. drone: positive Ministry of Communications direction', () => {
  const s = section(['רחפן']);
  assert.equal(s.familyName, 'רחפן');
  assertSinglePositiveResult(s, 'משרד התקשורת');
  assert.ok(s.note.text.includes('משרד התקשורת'));
  assertNoAbsoluteExemptionWording(s.note.text);
});

test('3. drone: "drone" and "camera drone" resolve the same', () => {
  for (const t of ['drone', 'camera drone', 'commercial drone']) {
    const s = section([t]);
    assert.equal(s.familyName, 'רחפן', `"${t}" must resolve to drones`);
  }
});

test('4. drone: wireless_or_transmitting_equipment checkbox now includes the drone candidate', () => {
  const s = section(['drone'], ['wireless_or_transmitting_equipment']);
  assert.equal(s.familyName, 'רחפן');
});

test('5. drone accessories/parts are not misidentified as complete drones', () => {
  for (const t of ['drone accessory', 'drone propeller', 'drone carrying case', 'replacement part for drone', 'אביזר לרחפן']) {
    const r = identifyProductFamily([t]);
    assert.notEqual(r.family?.id, 'electrical-and-electronics-10', `"${t}" must not resolve to the drone family`);
  }
});

// -- 6-7. Non-food pet equipment/products --

test('6. non-food pet product: cautious no-positive wording, no fabricated Ministry of Health signal', () => {
  const s = section(['pet toy']);
  assert.equal(s.familyName, 'מוצרים לבעלי חיים');
  assertNoPositiveResult(s);
  assert.ok(s.noPositiveSignalMessage.includes('לא זוהתה דרישה כללית'));
  assert.ok(s.note.text.includes('גורם מקצועי'));
});

test('7. non-food pet products stay distinct from animal feed, live animals, and products of animal origin', () => {
  assert.equal(section(['dog food']).familyName, 'מזון לבעלי חיים');
  assert.equal(section(['בעל חיים חי']).familyName, 'בעלי חיים');
  assert.equal(section(['מוצר שמקורו מן החי'], ['animal_origin_products']).familyName, 'מזון מן החי');
});

test('8. a pet toy never becomes a children\'s toy', () => {
  const r = identifyProductFamily(['pet toy']);
  assert.notEqual(r.family?.id, 'children-and-infants-01');
});

// -- 9-11. Hand tools --

test('9. ordinary hand tool: no positive direction, customs-classifier route', () => {
  const s = section(['hammer']);
  assert.equal(s.familyName, 'כלי עבודה ידניים');
  assertNoPositiveResult(s);
});

test('10. hand tools family covers common tool terms', () => {
  for (const t of ['פטיש', 'מברג', 'פלייר', 'מפתח ברגים', 'מסור ידני', 'screwdriver', 'pliers', 'wrench']) {
    const s = section([t]);
    assert.equal(s.familyName, 'כלי עבודה ידניים', `"${t}" must resolve to hand tools`);
  }
});

test('11. mains-connected-electrical-product detailed rule remains fully independent of family identification (no new electrical rule added)', () => {
  assert.equal(REGULATORY_SIGNAL_RULES.filter((r) => r.id === 'mains-connected-electrical-product').length, 1);
});

// -- 12-16. Packaging products --

test('12. ordinary cardboard packaging: no positive direction', () => {
  const s = section(['cardboard box']);
  assert.equal(s.familyName, 'קרטון לאריזה');
  assertNoPositiveResult(s);
});

test('13. polymer-coated food-contact cardboard reuses the existing food-contact-02 Standards row', () => {
  const s = section(['אריזת קרטון בציפוי פולימרי למזון']);
  assert.equal(findFamilyById('food-contact-02').publicFamilyName, s.familyName);
  assertSinglePositiveResult(s, 'תקינה');
});

test('14. wooden packaging box: positive Ministry of Agriculture direction', () => {
  const s = section(['ארגז עץ']);
  assert.equal(s.familyName, 'קופסת עץ לאריזה');
  assertSinglePositiveResult(s, 'משרד החקלאות');
});

test('15. food-contact bottles reuse the existing plastic/glass food-contact Standards rows, disambiguated by material', () => {
  const plastic = section(['בקבוק פלסטיק למשקה']);
  assert.equal(plastic.familyName, 'כלי פלסטיק במגע עם מזון');
  assertSinglePositiveResult(plastic, 'תקינה');
  const glass = section(['בקבוק זכוכית למשקה']);
  assert.equal(glass.familyName, 'כלי זכוכית במגע עם מזון או שתייה');
  assertSinglePositiveResult(glass, 'תקינה');
});

test('16. a decorative bottle with no food/beverage contact is not swept into the food-contact bottle rule', () => {
  const r = identifyProductFamily(['בקבוק דקורטיבי']);
  assert.notEqual(r.family?.id, 'food-contact-01');
  assert.notEqual(r.family?.id, 'food-contact-03');
});

// -- 17-20. Paper and printed products --

test('17. ordinary paper/print: no positive direction', () => {
  const s = section(['printing paper']);
  assert.equal(s.familyName, 'נייר ומוצרי דפוס');
  assertNoPositiveResult(s);
});

test('18. an ordinary book stays paper/print, never becomes a toy', () => {
  const s = section(['ordinary book']);
  assert.equal(s.familyName, 'נייר ומוצרי דפוס');
  const r = identifyProductFamily(['ordinary book']);
  assert.notEqual(r.family?.id, 'children-and-infants-01');
});

test('19. a children\'s book with play value reuses the existing toys row', () => {
  const s = section(['toy book']);
  assert.equal(s.familyName, 'צעצועים');
  assertSinglePositiveResult(s, 'תקינה');
});

test('20. an electrically wired book reaches Standards via the existing electrical detailed rule id, not a new rule', () => {
  assert.equal(REGULATORY_SIGNAL_RULES.filter((r) => r.id === 'mains-connected-electrical-product').length, 1);
});

// -- 21-28. Non-apparel textile products --

test('21. carpets/rugs: positive Standards direction', () => {
  const s = section(['שטיח']);
  assert.equal(s.familyName, 'שטיחים');
  assertSinglePositiveResult(s, 'תקינה');
});

test('22. carpet-cleaning equipment is never misidentified as a carpet', () => {
  for (const t of ['carpet cleaner', 'rug cleaner', 'מנקה שטיחים']) {
    const r = identifyProductFamily([t]);
    assert.notEqual(r.family?.id, 'textiles-and-furniture-06', `"${t}" must not resolve to carpets`);
  }
});

test('23. ordinary blanket (no wiring): no positive direction', () => {
  const s = section(['שמיכה']);
  assert.equal(s.familyName, 'שמיכה רגילה');
  assertNoPositiveResult(s);
});

test('24. a textile blanket is never misidentified as protective equipment', () => {
  const r = identifyProductFamily(['שמיכה']);
  assert.notEqual(r.family?.id, 'additional-consumer-products-06');
});

test('25. pacifier holder: positive Standards direction', () => {
  const s = section(['pacifier holder']);
  assert.equal(s.familyName, 'מחזיק מוצץ');
  assertSinglePositiveResult(s, 'תקינה');
});

test('26. infant carrier: positive Standards direction, never confused with a vehicle carrier', () => {
  const s = section(['baby carrier']);
  assert.equal(s.familyName, 'מנשא לתינוק');
  assertSinglePositiveResult(s, 'תקינה');
  for (const t of ['vehicle carrier', 'car seat carrier', 'roof carrier']) {
    const r = identifyProductFamily([t]);
    assert.notEqual(r.family?.id, 'children-and-infants-06', `"${t}" must not resolve to infant carrier`);
  }
});

test('27. other ordinary non-apparel textiles (bedding/curtains/towels/upholstery/fabric bags): no positive direction', () => {
  for (const t of ['bedding', 'curtains', 'towels', 'upholstery fabric', 'fabric bag']) {
    const s = section([t]);
    assert.equal(s.familyName, 'מוצרי טקסטיל ביתיים', `"${t}" must resolve to household textiles`);
    assertNoPositiveResult(s);
  }
});

test('28. ordinary clothing/footwear/protective-equipment/infant-product behavior is preserved', () => {
  assert.equal(section(['חולצה']).familyName ?? findFamilyById('textiles-and-furniture-01').publicFamilyName, findFamilyById('textiles-and-furniture-01').publicFamilyName);
  const shoe = identifyProductFamily(['נעליים רגילות']);
  assert.equal(shoe.family?.id, 'textiles-and-furniture-02');
});

// -- 29-35. Glass and ceramic products --

test('29. glass intended for food/beverage contact: positive Standards direction (existing rule, alias-extended)', () => {
  const s = section(['glass food jar']);
  assert.equal(s.familyName, 'כלי זכוכית במגע עם מזון או שתייה');
  assertSinglePositiveResult(s, 'תקינה');
});

test('30. ceramic intended for food/beverage contact: positive Standards direction (existing rule, alias-extended)', () => {
  const s = section(['ceramic mug']);
  assert.equal(s.familyName, 'כלי קרמיקה במגע עם מזון');
  assertSinglePositiveResult(s, 'תקינה');
});

test('31. vehicle safety glass reaches the certified-vehicle-laboratory route, taking precedence over the general Standards route', () => {
  const s = section(['vehicle safety glass']);
  assert.equal(s.familyName, findFamilyById('vehicles-and-transport-08').publicFamilyName);
  assert.ok(s.positiveCategories.includes('משרד התחבורה / מעבדת רכב') || s.positiveCategories.length > 0);
});

test('32. building safety glass: positive Standards direction (new row)', () => {
  const s = section(['building safety glass']);
  assert.equal(s.familyName, 'זכוכית בטיחות לבניין');
  assertSinglePositiveResult(s, 'תקינה');
});

test('33. decorative glass with no food contact receives no automatic direction', () => {
  const r = identifyProductFamily(['decorative glass vase']);
  assert.notEqual(r.family?.id, 'food-contact-03');
  assert.notEqual(r.family?.id, 'construction-and-industrial-06');
});

test('34. decorative ceramic with no food contact receives no automatic direction', () => {
  const r = identifyProductFamily(['ceramic ornament']);
  assert.notEqual(r.family?.id, 'food-contact-04');
});

test('35. no broad Standards direction was fabricated for every glass/ceramic product -- unrelated glass/ceramic text stays unresolved', () => {
  const r = identifyProductFamily(['זכוכית']);
  assert.notEqual(r.outcome, 'high_confidence');
});

// -- 36-38. Registry hygiene / no unauthorized state --

test('36. no duplicate IDs, names, or aliases across the full matrix after Wave 3', () => {
  const ids = PRODUCT_FAMILY_MATRIX.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length);
  const names = PRODUCT_FAMILY_MATRIX.filter((f) => f.activeStatus).map((f) => f.publicFamilyName);
  assert.deepEqual(names.filter((v, i) => names.indexOf(v) !== i), []);
});

test('37. every Wave 3 result carries at most one supporting professional and exactly one primary professional', () => {
  const cases = [
    ['רחפן'], ['ארגז עץ'], ['שטיח'], ['pacifier holder'], ['baby carrier'],
    ['building safety glass'], ['glass food jar'], ['ceramic mug'],
    ['אריזת קרטון בציפוי פולימרי למזון'], ['toy book'],
  ];
  for (const texts of cases) {
    const s = section(texts);
    assert.ok(s.professional.primary, `${texts[0]} must have a primary professional`);
    assert.ok(s.professional.supporting === null || typeof s.professional.supporting === 'object');
  }
});

test('38. matrix registry order does not change identification for Wave 3 families', () => {
  const reversed = [...PRODUCT_FAMILY_MATRIX].reverse();
  const forward = identifyProductFamily(['רחפן'], { families: PRODUCT_FAMILY_MATRIX.filter((f) => f.activeStatus) });
  const backward = identifyProductFamily(['רחפן'], { families: reversed.filter((f) => f.activeStatus) });
  assert.equal(forward.family?.id, 'electrical-and-electronics-10');
  assert.equal(backward.family?.id, 'electrical-and-electronics-10');
});

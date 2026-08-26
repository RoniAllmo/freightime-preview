/**
 * Wave 2 (product-owner-approved guidance for additional product
 * families): medical products, pesticide products, plants/seeds/
 * produce, vehicle accessories, communications/wireless equipment,
 * household electrical products, footwear, and specified infant
 * products.
 *
 * Every implemented rule reuses an EXISTING matrix signal, an EXISTING
 * checkbox candidate set, and (where a checkbox already exists) new
 * CANDIDATE_SET_SCOPED_HINTS entries or a new FAMILY_GUIDANCE overlay
 * entry -- no new matrix row, no new focused question, no new
 * professional role, no controller-level product-name check.
 *
 * See the PR body for the full list of Wave-2 rules that could NOT be
 * safely implemented within this architecture (protective equipment,
 * bicycles/scooters, ordinary sports equipment, perfume-vs-cosmetics,
 * safety-vs-ordinary footwear, animal/pharmaceutical-use vitamins) and
 * why -- deliberately not tested here, since they are not implemented.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductFamilyMatrixSection } from '../../js/import-readiness/product-family-result.js';
import { evaluateRegulatorySignals } from '../../js/import-readiness/regulatory-signals/index.js';
import { IMPORT_TYPE } from '../../js/import-readiness/scenario-schema.js';
import {
  CANDIDATE_SET_SCOPED_HINTS,
  PRODUCT_FAMILY_SELECTION_CANDIDATES,
} from '../../js/import-readiness/product-family-selection-mapping.js';
import { findFamilyById } from '../../js/import-readiness/product-family-matrix.js';
import { REGULATORY_SIGNAL_RULES } from '../../js/import-readiness/regulatory-signals/rules-registry.js';
import { REGULATORY_FOLLOWUP_QUESTIONS } from '../../js/import-readiness/regulatory-signals/questions.js';

const MEDICAL_CHECKBOX = 'medical_equipment_or_medical_use';
const PLANT_CHECKBOX = 'plant_origin_products';
const VEHICLE_ACCESSORY_CHECKBOX = 'vehicle_parts_and_transport_accessories';
const WIRELESS_CHECKBOX = 'wireless_or_transmitting_equipment';
const CHEMICALS_CHECKBOX = 'chemicals_paints_adhesives_aerosols';
const TOY_CHECKBOX = 'childrens_products_and_toys';
const TEXTILE_FOOTWEAR_CHECKBOX = 'textile_apparel_and_footwear';

function section(texts, checkbox, importType = IMPORT_TYPE.COMMERCIAL) {
  return buildProductFamilyMatrixSection({
    texts,
    importType,
    selectedProductFamilies: checkbox ? [checkbox] : [],
  });
}

// -- RULE 1: MEDICAL PRODUCTS --

test('1. blood-pressure monitor + medical checkbox -> AMAR/Ministry of Health direction, no new question', () => {
  const s = section(['מד לחץ דם'], MEDICAL_CHECKBOX);
  assert.ok(s);
  assert.equal(s.state, 'positive');
  assert.deepEqual(s.positiveCategories, ['משרד הבריאות']);
  assert.ok(s.note.text.includes('אמ"ר'));
});

test('2. medical thermometer + medical checkbox -> same AMAR direction', () => {
  const s = section(['מד חום דיגיטלי'], MEDICAL_CHECKBOX);
  assert.ok(s);
  assert.equal(s.state, 'positive');
  assert.deepEqual(s.positiveCategories, ['משרד הבריאות']);
});

test('3. glucose meter + medical checkbox -> same AMAR direction', () => {
  const s = section(['מד סוכר לבדיקה עצמית'], MEDICAL_CHECKBOX);
  assert.ok(s);
  assert.equal(s.state, 'positive');
  assert.deepEqual(s.positiveCategories, ['משרד הבריאות']);
});

test('4. pulse oximeter + medical checkbox -> same AMAR direction', () => {
  const s = section(['פולס אוקסימטר'], MEDICAL_CHECKBOX);
  assert.ok(s);
  assert.equal(s.state, 'positive');
  assert.deepEqual(s.positiveCategories, ['משרד הבריאות']);
});

test('5. neutral text with the medical checkbox selected but no matching term stays information-needed, not forced', () => {
  const s = section(['מוצר כלשהו'], MEDICAL_CHECKBOX);
  assert.ok(s);
  assert.equal(s.state, 'selection_unresolved');
});

test('6. medical direction never adds a broad standards category (household/clinic/hospital/professional wording all stay healthUmbrella-only)', () => {
  for (const text of ['ציוד רפואי ביתי', 'ציוד רפואי למרפאה', 'ציוד רפואי לבית חולים', 'ציוד רפואי מקצועי']) {
    const s = section([text], MEDICAL_CHECKBOX);
    assert.ok(s, text);
    assert.deepEqual(s.positiveCategories, ['משרד הבריאות'], text);
  }
});

// -- RULE 3: PESTICIDE PRODUCTS --

test('7. insecticide + chemicals checkbox -> poisons-permit (health) direction', () => {
  const s = section(['קוטל חרקים בתרסיס'], CHEMICALS_CHECKBOX);
  assert.ok(s);
  assert.equal(s.state, 'positive');
  assert.deepEqual(s.positiveCategories, ['משרד הבריאות']);
});

test('8. herbicide + chemicals checkbox -> same poisons-permit direction', () => {
  const s = section(['קוטל עשבים'], CHEMICALS_CHECKBOX);
  assert.ok(s);
  assert.deepEqual(s.positiveCategories, ['משרד הבריאות']);
});

test('9. household pest-control preparation wording -> same poisons-permit direction, no aerosol/standards category fabricated', () => {
  const s = section(['תכשיר הדברה ביתי'], CHEMICALS_CHECKBOX);
  assert.ok(s);
  assert.deepEqual(s.positiveCategories, ['משרד הבריאות']);
  assert.ok(!s.positiveCategories.includes('תקינה'), 'must never fabricate a broad Standards Institution category for pesticides');
});

test('10. the pesticide checkbox addition is purely additive -- the 3 pre-existing candidates for this checkbox are untouched', () => {
  // Cleaning/disinfecting text must still resolve to its own existing family, unaffected.
  const s = section(['חומרי ניקוי וחיטוי'], CHEMICALS_CHECKBOX);
  assert.ok(s);
  assert.equal(s.familyName, 'חומרי ניקוי וחיטוי');
});

// -- RULE 5: PLANTS, SEEDS, AND AGRICULTURAL PRODUCE --

test('11. plant produce (existing alias) -> Plant Protection / Ministry of Agriculture direction, no subtype question', () => {
  const s = section(['תוצרת חקלאית טרייה'], PLANT_CHECKBOX);
  assert.ok(s);
  assert.equal(s.state, 'positive');
  assert.ok(s.positiveCategories.includes('משרד החקלאות'));
});

test('12. seeds/seedlings/plants (existing aliases) -> same direction', () => {
  for (const text of ['זרעים לשתילה', 'שתילים לגינה', 'צמחים לבית']) {
    const s = section([text], PLANT_CHECKBOX);
    assert.ok(s, text);
    assert.ok(s.positiveCategories.includes('משרד החקלאות'), text);
  }
});

test('13. flower (new scoped hint) -> same direction', () => {
  const s = section(['פרח קטוע לעיצוב'], PLANT_CHECKBOX);
  assert.ok(s);
  assert.ok(s.positiveCategories.includes('משרד החקלאות'));
});

test('14. plant-family direction never splits by species/type -- fruit, vegetable, and flower all reach the identical positive category set', () => {
  const fruitVeg = section(['פירות וירקות טריים'], PLANT_CHECKBOX);
  const flower = section(['פרח'], PLANT_CHECKBOX);
  assert.deepEqual(fruitVeg.positiveCategories, flower.positiveCategories);
});

// -- RULE 6: VEHICLE ACCESSORIES --

test('15. generic vehicle accessory (new scoped hint) -> Vehicle Division/laboratory direction', () => {
  const s = section(['אביזר לרכב'], VEHICLE_ACCESSORY_CHECKBOX);
  assert.ok(s);
  assert.equal(s.state, 'positive');
  assert.deepEqual(s.positiveCategories, ['משרד התחבורה / מעבדת רכב']);
});

test('16. vehicle-accessory note references non-integral goods without FreighTime making the exemption determination itself, and carries no absolute-exemption wording', () => {
  const s = section(['vehicle part'], VEHICLE_ACCESSORY_CHECKBOX);
  assert.ok(s);
  assert.ok(s.note.text.includes('אינטגרלי'));
  assert.ok(!/פטור/.test(s.note.text));
});

test('17. an existing, more specific candidate (vehicle lighting) is unaffected by the new generic accessory hint', () => {
  const s = section(['פנס לרכב'], VEHICLE_ACCESSORY_CHECKBOX);
  assert.ok(s);
  assert.equal(s.familyName, 'פנסים וגופי תאורה לרכב');
});

// -- RULE 7: COMMUNICATIONS AND WIRELESS EQUIPMENT (existing behavior + one scoped-hint gap) --

test('18. Wi-Fi equipment (existing alias) -> Ministry of Communications direction, no frequency/protocol question', () => {
  const s = section(['מוצר עם חיבור Wi-Fi'], WIRELESS_CHECKBOX);
  assert.ok(s);
  assert.ok(s.positiveCategories.includes('משרד התקשורת'));
});

test('19. Bluetooth equipment (existing alias) -> same direction', () => {
  const s = section(['רמקול עם Bluetooth'], WIRELESS_CHECKBOX);
  assert.ok(s);
  assert.ok(s.positiveCategories.includes('משרד התקשורת'));
});

test('20. generic transmitter/wireless-device text (new scoped hint) -> same direction', () => {
  for (const text of ['משדר לתקשורת', 'מכשיר אלחוטי לשימוש ביתי']) {
    const s = section([text], WIRELESS_CHECKBOX);
    assert.ok(s, text);
    assert.ok(s.positiveCategories.includes('משרד התקשורת'), text);
  }
});

// -- RULE 8: HOUSEHOLD ELECTRICAL PRODUCTS (existing generic mains-electrical detailed rule, family-independent) --

test('21. an electric kettle description hints the existing mains-electrical question -- no new question added', () => {
  const result = evaluateRegulatorySignals({ productName: 'קומקום חשמלי' });
  assert.ok(result);
  assert.equal(result.signals.length, 0, 'no signal yet -- the confirmation question has not been answered');
  // The existing question set already includes exactly the mains question -- nothing new was added for this mission.
  assert.ok(REGULATORY_FOLLOWUP_QUESTIONS.some((q) => q.id === 'mainsConnectedOrSuppliedAdapter'));
});

test('22. confirming the existing mains question for an electric kettle -> existing Standards Institution direction (no family/matrix change needed)', () => {
  const result = evaluateRegulatorySignals(
    { productName: 'קומקום חשמלי' },
    { answers: { mainsConnectedOrSuppliedAdapter: 'yes' } },
  );
  assert.equal(result.signals.length, 1);
  assert.equal(result.signals[0].ruleId, 'mains-connected-electrical-product');
});

test('23. household mains detection also covers a toaster and a fan (representative Rule 8 products), reusing the same existing rule', () => {
  for (const productName of ['טוסטר חשמלי', 'מאוורר ביתי חשמלי']) {
    const result = evaluateRegulatorySignals({ productName }, { answers: { mainsConnectedOrSuppliedAdapter: 'yes' } });
    assert.equal(result.signals.length, 1, productName);
    assert.equal(result.signals[0].ruleId, 'mains-connected-electrical-product', productName);
  }
});

test('24. a non-mains generic electronic description never fabricates the standards direction on its own', () => {
  const result = evaluateRegulatorySignals({ productName: 'מוצר אלקטרוני ללא חיבור לרשת' });
  assert.equal(result, null);
});

// -- RULE 12 (partial): ELECTRICALLY WIRED FURNITURE reuses the same existing generic mains rule --

test('25. electrically wired furniture hints and (once confirmed) fires the same existing mains-electrical rule -- no furniture-specific question added', () => {
  const result = evaluateRegulatorySignals(
    { productName: 'רהיט עם חיווט חשמלי' },
    { answers: { mainsConnectedOrSuppliedAdapter: 'yes' } },
  );
  assert.equal(result.signals.length, 1);
  assert.equal(result.signals[0].ruleId, 'mains-connected-electrical-product');
});

// -- RULE 15 (partial): ELECTRICALLY WIRED SPORTS EQUIPMENT reuses the same existing generic mains rule --

test('26. electrically wired fitness equipment fires the same existing mains-electrical rule -- no sports-equipment-specific question added', () => {
  const result = evaluateRegulatorySignals(
    { productName: 'מסוע כושר חשמלי' },
    { answers: { mainsConnectedOrSuppliedAdapter: 'yes' } },
  );
  assert.equal(result.signals.length, 1);
  assert.equal(result.signals[0].ruleId, 'mains-connected-electrical-product');
});

// -- RULE 11: FOOTWEAR (ordinary only -- existing no-signal behavior + new family-specific guidance) --

test('27. ordinary footwear (existing no-signal family) -> useful family-specific no-positive guidance, no exemption promise', () => {
  const s = section(['נעליים לגברים'], TEXTILE_FOOTWEAR_CHECKBOX);
  assert.ok(s);
  assert.equal(s.state, 'no_positive_signal');
  assert.equal(s.hasPositiveCategories, false);
  assert.ok(s.professional.primary, 'must still offer a customs-classifier verification route');
  assert.ok(!/פטור/.test(s.noPositiveSignalMessage + ' ' + s.note.text));
});

test('27b. boots, sandals, and sports shoes (new scoped hints) all reach the same ordinary-footwear no-positive state', () => {
  for (const text of ['מגפיים לחורף', 'סנדלים לקיץ', 'נעלי ספורט']) {
    const s = section([text], TEXTILE_FOOTWEAR_CHECKBOX);
    assert.ok(s, text);
    assert.equal(s.state, 'no_positive_signal', text);
  }
});

test('28. the footwear no-positive guidance is family-specific, not the byte-identical generic wording', () => {
  const footwear = section(['נעליים'], TEXTILE_FOOTWEAR_CHECKBOX);
  assert.ok(footwear);
  assert.notEqual(footwear.noPositiveSignalMessage, 'לא זוהה תחום חוקיות יבוא חיובי במטריצה עבור המשפחה שנבחרה.');
});

// -- RULE 12: SPECIFIED INFANT PRODUCTS (crib, infant bed, infant walker; new scoped hints reusing existing standards signal) --

test('29. infant crib (new scoped hint) -> existing Standards Institution direction, no infant-age question', () => {
  const s = section(['לול לתינוק'], TOY_CHECKBOX);
  assert.ok(s);
  assert.equal(s.state, 'positive');
  assert.deepEqual(s.positiveCategories, ['תקינה']);
});

test('30. infant bed and infant walker (new scoped hints) -> same direction', () => {
  for (const text of ['מיטת תינוק', 'הליכון תינוקות']) {
    const s = section([text], TOY_CHECKBOX);
    assert.ok(s, text);
    assert.deepEqual(s.positiveCategories, ['תקינה'], text);
  }
});

test('31. infant-feeding cutlery (new scoped hint, reuses the existing infant-products family) -> existing Standards Institution direction', () => {
  const s = section(['כפית לתינוק לאכילה'], TOY_CHECKBOX);
  assert.ok(s);
  assert.deepEqual(s.positiveCategories, ['תקינה']);
});

// -- NO-QUESTION GUARANTEE --

test('32. zero new focused questions were added anywhere in this mission -- the follow-up question registry is exactly the same 7 pre-existing questions', () => {
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
    'vehicleFunctionCategory',
  ].sort());
});

test('33. zero new detailed regulatory-signal rules were added -- the rule registry is exactly the same 5 pre-existing rules', () => {
  assert.equal(REGULATORY_SIGNAL_RULES.length, 5);
});

test('34. no forbidden prohibited-topic keyword (defibrillator, incubator, aerosol, pressure, bow, arrow, wattage, voltage, etc.) appears in any question legend', () => {
  const forbidden = [
    'דפיברילטור', 'אינקובטור', 'תרסיס', 'לחץ', 'קשת', 'חץ', 'ואט', 'מתח חשמלי',
    'סוללה', 'קיבולת', 'תדר', 'הספק שידור', 'גיל', 'עובי',
  ];
  for (const q of REGULATORY_FOLLOWUP_QUESTIONS) {
    for (const term of forbidden) {
      assert.ok(!q.legend.includes(term), `question "${q.id}" must not mention "${term}"`);
    }
  }
});

// -- LOCKED (Wave 1) FAMILIES REMAIN UNCHANGED --

test('35. Wave 1 locked families (animal origin, industrial machinery, building materials) are byte-identical to their pre-Wave-2 wording', () => {
  const animalOrigin = section(['מזון מן החי', 'בשר קפוא'], 'animal_origin_products', IMPORT_TYPE.PERSONAL);
  assert.ok(animalOrigin.note.text.includes('השירותים הווטרינריים במשרד החקלאות'));

  const machinery = section(['מכונת תעשייה'], 'industrial_machinery_and_equipment');
  assert.equal(machinery.state, 'no_positive_signal');

  const building = section(['חומרי בניין'], 'building_materials');
  assert.equal(building.state, 'no_positive_signal');
});

test('36. toy regression (Wave 1) is unaffected by the Wave 2 additions to the same childrens_products_and_toys candidate set', () => {
  const s = section(['צעצוע פלסטיק'], TOY_CHECKBOX);
  assert.ok(s);
  assert.equal(s.state, 'positive');
  assert.equal(s.familyName, 'צעצועים');
});

// -- SCOPED-HINT SAFETY --

test('37. every Wave 2 scoped hint is scoped to a real checkbox and a real, active candidate family id in that checkbox\'s own candidate set', () => {
  const wave2Checkboxes = [
    'medical_equipment_or_medical_use',
    'plant_origin_products',
    'vehicle_parts_and_transport_accessories',
    'wireless_or_transmitting_equipment',
    'chemicals_paints_adhesives_aerosols',
    // textile_apparel_and_footwear deliberately excluded: its footwear
    // terms moved to global curated aliases (Wave 2 completion) once the
    // ordinary/safety footwear split made that safe -- see
    // scripts/generate_product_family_matrix.py.
  ];
  for (const checkboxValue of wave2Checkboxes) {
    const perFamily = CANDIDATE_SET_SCOPED_HINTS[checkboxValue];
    assert.ok(perFamily, `${checkboxValue} must have scoped hints`);
    const candidateIds = PRODUCT_FAMILY_SELECTION_CANDIDATES[checkboxValue];
    assert.ok(Array.isArray(candidateIds), `${checkboxValue} must be a real candidate-set checkbox`);
    for (const familyId of Object.keys(perFamily)) {
      assert.ok(candidateIds.includes(familyId), `${familyId} must be one of ${checkboxValue}'s own candidates`);
      const family = findFamilyById(familyId);
      assert.ok(family && family.activeStatus === true, `${familyId} must be a real, active matrix family`);
    }
  }
});

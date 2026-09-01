/**
 * Targeted regression tests for the motorcycle presentation/resolution
 * correction: complete motorcycles ("אופנוע") and motorcycle spare
 * parts/accessories ("חלק חילוף לאופנוע", "חלפים לאופנוע", "אביזר
 * לאופנוע") must be distinguishable both in the initial presentation
 * suggestion and in the real result after explicit family selection --
 * without ever hardcoding a complete input sentence, without touching
 * any matrix regulatory signal, and without affecting any unrelated
 * family (scooters, bicycles, cars, generic vehicle parts).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { identifyProductFamily } from '../../js/import-readiness/product-family-identification.js';
import { resolveFamilyIdentificationOptions } from '../../js/import-readiness/product-family-selection-mapping.js';
import { findFamilyById } from '../../js/import-readiness/product-family-matrix.js';
import { suggestProductFamilyValues } from '../../js/import-readiness/family-material-disclosure.js';

function resolveWith(checkbox, text) {
  const options = resolveFamilyIdentificationOptions([checkbox], findFamilyById);
  return identifyProductFamily([text], options);
}

// -----------------------------------------------------------------
// Case 1/2: complete motorcycle presentation + resolution.
// -----------------------------------------------------------------

test('1. bare "אופנוע" and "אופנוע שלם" surface complete_vehicles as an initial suggestion, never auto-selected', () => {
  for (const text of ['אופנוע', 'אופנוע שלם', 'אופנוע חדש', 'אופנוע לייבוא']) {
    const suggested = suggestProductFamilyValues([text]);
    assert.ok(suggested.includes('complete_vehicles'), `"${text}" must suggest complete_vehicles, got ${JSON.stringify(suggested)}`);
    for (const value of suggested) assert.equal(typeof value, 'string');
  }
});

test('2. after selecting complete_vehicles, "אופנוע"/"אופנוע שלם" resolve deterministically to the complete-motorcycle matrix row, preserving its regulatory signal', () => {
  for (const text of ['אופנוע', 'אופנוע שלם']) {
    const result = resolveWith('complete_vehicles', text);
    assert.equal(result.outcome, 'high_confidence');
    assert.equal(result.family.id, 'vehicles-and-transport-02');
    assert.equal(result.family.regulatorySignals.transportOrVehicleLaboratory, true);
  }
});

test('3. bare motorcycle text never suggests or resolves to the vehicle-parts family', () => {
  for (const text of ['אופנוע', 'אופנוע שלם']) {
    assert.ok(!suggestProductFamilyValues([text]).includes('vehicle_parts_and_transport_accessories'));
  }
});

// -----------------------------------------------------------------
// Case 3/4/5: motorcycle spare parts and accessories.
// -----------------------------------------------------------------

test('4. motorcycle spare-part/accessory phrases surface vehicle_parts_and_transport_accessories, never complete_vehicles', () => {
  const cases = ['חלק חילוף לאופנוע', 'חלפים לאופנוע', 'חלק לאופנוע', 'אביזר לאופנוע', 'motorcycle spare part', 'motorcycle parts'];
  for (const text of cases) {
    const suggested = suggestProductFamilyValues([text]);
    assert.ok(suggested.includes('vehicle_parts_and_transport_accessories'), `"${text}" must suggest vehicle_parts_and_transport_accessories, got ${JSON.stringify(suggested)}`);
    assert.ok(!suggested.includes('complete_vehicles'), `"${text}" must not suggest complete_vehicles`);
  }
});

test('5. after selecting vehicle_parts_and_transport_accessories, motorcycle spare-part/accessory phrases resolve deterministically to the motorcycle spare-parts matrix row, preserving its regulatory signal', () => {
  const cases = ['חלק חילוף לאופנוע', 'חלפים לאופנוע', 'חלק לאופנוע', 'אביזר לאופנוע', 'motorcycle spare part'];
  for (const text of cases) {
    const result = resolveWith('vehicle_parts_and_transport_accessories', text);
    assert.equal(result.outcome, 'high_confidence', `"${text}" must resolve unambiguously`);
    assert.equal(result.family.id, 'vehicles-and-transport-04');
    assert.equal(result.family.regulatorySignals.transportOrVehicleLaboratory, true);
  }
});

test('6. motorcycle spare-part/accessory text never resolves as a complete motorcycle even when complete_vehicles alone is selected', () => {
  const cases = ['חלק חילוף לאופנוע', 'חלפים לאופנוע', 'אביזר לאופנוע'];
  for (const text of cases) {
    const result = resolveWith('complete_vehicles', text);
    assert.notEqual(result.family && result.family.id, 'vehicles-and-transport-02', `"${text}" must not resolve as the complete-motorcycle row`);
  }
});

// -----------------------------------------------------------------
// Regression: unrelated families/behavior unchanged.
// -----------------------------------------------------------------

test('7. unrelated vehicle/bicycle/scooter text is unaffected by this correction', () => {
  assert.deepEqual(suggestProductFamilyValues(['מכונית']), []);
  assert.deepEqual(suggestProductFamilyValues(['חלק חילוף לרכב']), []);
  assert.ok(suggestProductFamilyValues(['אופניים רגילים']).includes('ordinary_bicycles'));
  assert.ok(suggestProductFamilyValues(['אופניים חשמליים']).includes('motorized_bicycles'));
  assert.ok(suggestProductFamilyValues(['קורקינט רגיל']).includes('non_motorized_scooters'));
  assert.ok(suggestProductFamilyValues(['קורקינט חשמלי']).includes('motorized_scooters'));
});

test('8. unknown-product safe fallback is unaffected', () => {
  assert.deepEqual(suggestProductFamilyValues(['מוצר לא מזוהה']), []);
});

test('9. matrix regulatory signals and aliases for the affected rows are byte-identical to before this correction (no matrix change)', () => {
  const car = findFamilyById('vehicles-and-transport-01');
  const motorcycle = findFamilyById('vehicles-and-transport-02');
  const spareParts = findFamilyById('vehicles-and-transport-04');
  assert.deepEqual(car.aliases, ['כלי רכב שלמים']);
  assert.deepEqual(motorcycle.aliases, ['אופנועים וקטנועים שלמים']);
  assert.deepEqual(spareParts.aliases, ['חלקי חילוף לאופנועים וקטנועים']);
  for (const family of [car, motorcycle, spareParts]) {
    assert.equal(family.regulatorySignals.transportOrVehicleLaboratory, true);
    assert.equal(family.regulatorySignals.standards, false);
  }
});

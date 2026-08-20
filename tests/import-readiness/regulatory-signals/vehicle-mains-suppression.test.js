/**
 * Product-owner acceptance defect: a vehicle-related product (e.g. "פנס
 * קדמי לרכב") must never be asked the generic mains-electricity
 * confirmation question ("האם המוצר מתחבר ישירות לרשת החשמל או מגיע עם
 * תקע או ספק כוח?") merely because it also contains electrical wording
 * or because the customer separately marks it as "electrical" in the
 * sensitive-category selector -- a vehicle's own electrical system
 * (battery, 12V/24V, wiring harness) is not mains electricity. See
 * applyVehicleMainsSuppression() in keyword-hints.js, the single
 * centralized layer this file tests.
 *
 * Pure hint-computation tests only -- no DOM, no controller. See
 * vehicle-mains-question-suppression-live-dom.test.js for the live
 * question-flow/DOM-level proof of the same behavior.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectCategoryHints,
  applyVehicleMainsSuppression,
} from '../../../js/import-readiness/regulatory-signals/keyword-hints.js';
import { computeHintedCategories } from '../../../js/import-readiness/regulatory-signals/index.js';

test('1. a vehicle-lighting product with an electrical keyword suppresses the generic mains category (free text only)', () => {
  const hinted = detectCategoryHints(['פנס אחורי לרכב עם חיווט חשמלי']);
  assert.ok(hinted.has('vehicle_product'));
  assert.ok(!hinted.has('electrical_mains_product'));
});

test('2. a vehicle electrical component suppresses the generic mains category', () => {
  const hinted = computeHintedCategories({ productName: 'רכיב חשמלי לרכב המתחבר למצבר' });
  assert.ok(hinted.has('vehicle_product'));
  assert.ok(!hinted.has('electrical_mains_product'));
});

test('3. a 12V vehicle-system product does not activate the mains category', () => {
  const hinted = computeHintedCategories({
    productName: 'פנס אחורי 12V לחיבור למערכת החשמל של הרכב',
  });
  assert.ok(hinted.has('vehicle_product'));
  assert.ok(!hinted.has('electrical_mains_product'));
});

test('4. a 24V vehicle-system product does not activate the mains category', () => {
  const hinted = computeHintedCategories({
    productName: 'רכיב חשמלי לרכב 24V המתחבר לרתמת החיווט של הרכב',
  });
  assert.ok(hinted.has('vehicle_product'));
  assert.ok(!hinted.has('electrical_mains_product'));
});

test('5. a vehicle-battery connection does not activate the mains category', () => {
  const hinted = computeHintedCategories({ productName: 'רכיב חשמלי המתחבר למצבר הרכב' });
  assert.ok(hinted.has('vehicle_product'));
  assert.ok(!hinted.has('electrical_mains_product'));
});

test('6. a vehicle wiring-harness connection does not activate the mains category', () => {
  const hinted = computeHintedCategories({ productName: 'פנס לרכב המתחבר לרתמת החיווט של הרכב' });
  assert.ok(hinted.has('vehicle_product'));
  assert.ok(!hinted.has('electrical_mains_product'));
});

test('7. ROOT-CAUSE REGRESSION: the sensitive-category selector ("מוצר חשמלי") no longer bypasses the vehicle-mains suppression', () => {
  // This is the exact product-owner acceptance defect: free text hints
  // vehicle_product, and the separate irSensitiveCategory selector
  // (mapped to electrical_mains_product via sensitiveCategoryHint)
  // added the mains hint AFTER the free-text-only suppression ran,
  // bypassing it entirely.
  const hinted = computeHintedCategories({
    productName: 'פנס קדמי לרכב',
    sensitiveCategory: 'electrical',
  });
  assert.ok(hinted.has('vehicle_product'));
  assert.ok(!hinted.has('electrical_mains_product'), 'the sensitive-category selector must not bypass vehicle-mains suppression');
});

test('8. the same bypass is fixed in the opposite field combination (vehicle via selector, electrical via free text)', () => {
  const hinted = computeHintedCategories({
    productName: 'מכשיר חשמלי',
    sensitiveCategory: 'vehicle_or_transport',
  });
  assert.ok(hinted.has('vehicle_product'));
  assert.ok(!hinted.has('electrical_mains_product'));
});

test('9. a known HS code chapter (85, electrical) does not bypass vehicle-mains suppression either', () => {
  const hinted = computeHintedCategories({
    productName: 'פנס קדמי לרכב',
    hsCode: '8512',
    hsCodeKnown: true,
  });
  assert.ok(hinted.has('vehicle_product'));
  assert.ok(!hinted.has('electrical_mains_product'));
});

test('10. an explicit separate wall charger preserves the mains category (scenario E)', () => {
  const hinted = computeHintedCategories({ productName: 'פנס לרכב עם מטען ביתי נפרד לשקע' });
  assert.ok(hinted.has('vehicle_product'));
  assert.ok(hinted.has('electrical_mains_product'), 'a genuinely separate mains-powered accessory must not be suppressed');
});

test('11. an explicit household plug/charger preserves the mains category (scenario F)', () => {
  const hinted = computeHintedCategories({ productName: 'מטען ביתי לסוללת רכב' });
  assert.ok(hinted.has('vehicle_product'));
  assert.ok(hinted.has('electrical_mains_product'));
});

test('12. an electric-vehicle charging station preserves the mains category (scenario G)', () => {
  const hinted = computeHintedCategories({
    productName: 'עמדת טעינה לרכב חשמלי המחוברת לרשת החשמל',
  });
  assert.ok(hinted.has('vehicle_product'));
  assert.ok(hinted.has('electrical_mains_product'));
});

test('13. an explicit external mains power supply preserves the mains category', () => {
  const hinted = computeHintedCategories({ productName: 'אביזר לרכב עם ספק כוח חיצוני לשקע ביתי' });
  assert.ok(hinted.has('vehicle_product'));
  assert.ok(hinted.has('electrical_mains_product'));
});

test('14. garage equipment explicitly connected to the mains preserves the mains category', () => {
  const hinted = computeHintedCategories({ productName: 'ציוד מוסך המתחבר לרשת החשמל' });
  assert.ok(hinted.has('electrical_mains_product'));
});

test('15. a battery charger explicitly connected to a household socket preserves the mains category', () => {
  const hinted = computeHintedCategories({ productName: 'מטען סוללה לרכב המתחבר לשקע ביתי' });
  assert.ok(hinted.has('vehicle_product'));
  assert.ok(hinted.has('electrical_mains_product'));
});

test('16. vehicle family does not suppress an unrelated, independently supported category (plastic food-contact alongside vehicle wording)', () => {
  const hinted = computeHintedCategories({
    productName: 'קופסת פלסטיק למזון',
    commercialDescription: 'כלי אחסון מזון מפלסטיק, נמכר גם לשימוש ברכב',
  });
  assert.ok(hinted.has('plastic_food_contact'), 'an unrelated positive category must survive even when vehicle wording also appears');
  assert.ok(hinted.has('vehicle_product'));
});

test('17. vehicle family does not globally suppress every electrical category -- only the mains-connected one, and only when suppression is warranted', () => {
  // Two independent products checked separately: a pure mains product
  // (no vehicle wording at all) must be completely unaffected by the
  // suppression logic.
  const hinted = computeHintedCategories({ productName: 'מכשיר חשמלי עם תקע' });
  assert.ok(hinted.has('electrical_mains_product'));
  assert.ok(!hinted.has('vehicle_product'));
});

test('18. car-organizer negative: no electrical/mains category is hinted at all for a plain organizer', () => {
  const hinted = computeHintedCategories({ productName: 'ארגונית לרכב', commercialDescription: 'ארגונית אחסון לתא המטען' });
  assert.ok(hinted.has('vehicle_product'));
  assert.ok(!hinted.has('electrical_mains_product'));
});

test('19. applyVehicleMainsSuppression is a no-op when only one of the two categories is present', () => {
  const onlyVehicle = new Set(['vehicle_product']);
  assert.deepEqual([...applyVehicleMainsSuppression(onlyVehicle, [])], ['vehicle_product']);

  const onlyMains = new Set(['electrical_mains_product']);
  assert.deepEqual([...applyVehicleMainsSuppression(onlyMains, [])], ['electrical_mains_product']);
});

test('20. applyVehicleMainsSuppression tolerates non-Set/non-array input safely', () => {
  assert.equal(applyVehicleMainsSuppression(null, []), null);
  assert.equal(applyVehicleMainsSuppression(undefined, []), undefined);
  const s = new Set(['vehicle_product', 'electrical_mains_product']);
  assert.deepEqual([...applyVehicleMainsSuppression(s, null)], ['vehicle_product']);
});

test('21. EXACT product-owner regression: the exact reported product/selection combination never hints electrical_mains_product', () => {
  // Reproduces the exact defect end to end: personal-import, product
  // name "פנס קדמי לרכב", and the sensitive-category selector set to
  // "מוצר חשמלי" (value "electrical") on the personal-import follow-up
  // step -- previously this combination alone was enough to open the
  // generic mains question after the vehicle category tag ("לרכב") was
  // already shown.
  const hinted = computeHintedCategories({
    productName: 'פנס קדמי לרכב',
    commercialDescription: '',
    intendedUse: '',
    sensitiveCategory: 'electrical',
  });
  assert.ok(hinted.has('vehicle_product'));
  assert.ok(!hinted.has('electrical_mains_product'));
});

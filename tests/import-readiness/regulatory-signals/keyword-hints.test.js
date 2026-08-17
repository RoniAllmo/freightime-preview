import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectCategoryHints,
  normalizeHebrewSearchText,
  hsCodeCategoryHint,
  sensitiveCategoryHint,
} from '../../../js/import-readiness/regulatory-signals/keyword-hints.js';
import { computeHintedCategories } from '../../../js/import-readiness/regulatory-signals/index.js';

// Unit tests for pure candidate-detection logic only -- no DOM, no
// controller, no matcher. See regulatory-followup-live-dom.test.js for
// controller DOM tests and the PR body for real-browser acceptance.

test('1. a bare product name mentioning glass hints the glass category', () => {
  const hinted = detectCategoryHints(['כוס זכוכית לשתייה']);
  assert.ok(hinted.has('glass_food_contact'));
});

test('2. malle/haser spelling variants (שתיה vs שתייה) both hint the same category', () => {
  const hintedShort = detectCategoryHints(['כלי זכוכית לשתיה']);
  const hintedFull = detectCategoryHints(['כלי זכוכית לשתייה']);
  assert.ok(hintedShort.has('glass_food_contact'));
  assert.ok(hintedFull.has('glass_food_contact'));
});

test('3. the exact product-owner reproduction text across three fields hints glass even though no single field alone is the full phrase', () => {
  const hinted = detectCategoryHints(['כוס זכוכית לשתיה', 'כוס זכוכית', 'שתיה']);
  assert.ok(hinted.has('glass_food_contact'));
});

test('4. repeated spaces and punctuation do not block a match', () => {
  const hinted = detectCategoryHints(['כוס   זכוכית,  לשתיה.']);
  assert.ok(hinted.has('glass_food_contact'));
});

test('5. Hebrew gershayim/geresh characters do not block a match', () => {
  const hinted = detectCategoryHints(['כוס זכוכית לשתיה - כלי הגשה']);
  assert.ok(hinted.has('glass_food_contact'));
});

test('6. normalizeHebrewSearchText collapses double-yod to single-yod', () => {
  assert.equal(normalizeHebrewSearchText('שתייה'), 'שתיה');
});

test('7. normalizeHebrewSearchText collapses repeated whitespace and trims', () => {
  assert.equal(normalizeHebrewSearchText('  כוס   זכוכית  '), 'כוס זכוכית');
});

test('8. normalizeHebrewSearchText strips punctuation without merging unrelated words', () => {
  assert.equal(normalizeHebrewSearchText('כוס, זכוכית.'), 'כוס זכוכית');
});

test('9. normalizeHebrewSearchText handles non-string input safely', () => {
  assert.equal(normalizeHebrewSearchText(undefined), '');
  assert.equal(normalizeHebrewSearchText(null), '');
  assert.equal(normalizeHebrewSearchText(42), '');
});

test('10. a decorative glass description does not hint the glass food-contact category', () => {
  const hinted = detectCategoryHints(['פסלון זכוכית דקורטיבי']);
  assert.ok(!hinted.has('glass_food_contact'));
});

test('11. laboratory glassware does not hint the glass food-contact category', () => {
  const hinted = detectCategoryHints(['כלי מעבדה מזכוכית']);
  assert.ok(!hinted.has('glass_food_contact'));
});

test('12. glass described as a vehicle part does not hint the glass food-contact category', () => {
  const hinted = detectCategoryHints(['זכוכית לרכב']);
  assert.ok(!hinted.has('glass_food_contact'));
});

test('13. glass described as a vehicle part still hints the vehicle category (a different, still-relevant question)', () => {
  const hinted = detectCategoryHints(['זכוכית לרכב']);
  assert.ok(hinted.has('vehicle_product'));
});

test('14. negative-hint suppression is scoped to glass only -- it does not suppress an unrelated category', () => {
  const hinted = detectCategoryHints(['כוס פלסטיק דקורטיבית לתצוגה בלבד']);
  assert.ok(hinted.has('plastic_food_contact'), 'plastic_food_contact has no negative-hint list, so it is unaffected by "דקורטיבית"');
});

test('15. hsCodeCategoryHint maps HS chapter 70 to glass_food_contact', () => {
  assert.equal(hsCodeCategoryHint('7013'), 'glass_food_contact');
});

test('16. hsCodeCategoryHint maps HS chapter 39 to plastic_food_contact', () => {
  assert.equal(hsCodeCategoryHint('392410'), 'plastic_food_contact');
});

test('17. hsCodeCategoryHint maps HS chapter 85 to electrical_mains_product', () => {
  assert.equal(hsCodeCategoryHint('8516'), 'electrical_mains_product');
});

test('18. hsCodeCategoryHint maps HS chapter 87 to vehicle_product', () => {
  assert.equal(hsCodeCategoryHint('8708'), 'vehicle_product');
});

test('19. hsCodeCategoryHint returns null for an unmapped chapter and for malformed input', () => {
  assert.equal(hsCodeCategoryHint('6109'), null);
  assert.equal(hsCodeCategoryHint(''), null);
  assert.equal(hsCodeCategoryHint('a'), null);
  assert.equal(hsCodeCategoryHint(undefined), null);
});

test('20. hsCodeCategoryHint tolerates punctuation/spacing inside the code', () => {
  assert.equal(hsCodeCategoryHint('70.13'), 'glass_food_contact');
  assert.equal(hsCodeCategoryHint('70 13 00'), 'glass_food_contact');
});

test('21. computeHintedCategories combines free text, sensitive category, and a known HS code into one set', () => {
  const hinted = computeHintedCategories({
    productName: 'מוצר כללי',
    commercialDescription: '',
    intendedUse: '',
    sensitiveCategory: 'not_sure',
    hsCode: '7013',
    hsCodeKnown: true,
  });
  assert.ok(hinted.has('glass_food_contact'));
});

test('22. computeHintedCategories ignores the HS code when hsCodeKnown is false', () => {
  const hinted = computeHintedCategories({
    productName: 'מוצר כללי',
    hsCode: '7013',
    hsCodeKnown: false,
  });
  assert.ok(!hinted.has('glass_food_contact'));
});

test('23. computeHintedCategories reproduces the exact product-owner scenario end to end', () => {
  const hinted = computeHintedCategories({
    productName: 'כוס זכוכית לשתיה',
    commercialDescription: 'כוס זכוכית',
    intendedUse: 'שתיה',
    sensitiveCategory: 'not_sure',
    hsCode: '7013',
    hsCodeKnown: true,
  });
  assert.ok(hinted.has('glass_food_contact'));
});

test('24. computeHintedCategories handles null/undefined input safely', () => {
  assert.deepEqual([...computeHintedCategories(null)], []);
  assert.deepEqual([...computeHintedCategories(undefined)], []);
});

test('25. sensitiveCategoryHint is unaffected by the new normalization/HS-code additions', () => {
  assert.equal(sensitiveCategoryHint('electrical'), 'electrical_mains_product');
  assert.equal(sensitiveCategoryHint('vehicle_or_transport'), 'vehicle_product');
  assert.equal(sensitiveCategoryHint('food'), null);
});

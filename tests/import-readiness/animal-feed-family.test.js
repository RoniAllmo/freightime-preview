/**
 * Animal-feed completion (product-owner decision, 2026-08-27): animal
 * feed is a separate concept from live animals, products of animal
 * origin, and non-food pet products/accessories. Added a new, distinct
 * visible checkbox ("מזון לבעלי חיים", value animal_feed) mapped to a
 * new, genuinely separate canonical row (food-and-beverages-09) that
 * reuses the existing agriculture/Veterinary Services signal,
 * professional routing, CTA, limitation, and document/result-order
 * systems -- nothing new invented. The primary direction does not
 * depend on the animal type the feed is intended for; no animal-type/
 * species question was added. The pre-existing "מזון לחיות מחמד" (pet
 * food) alias was moved off the general non-food pet-products row
 * (additional-consumer-products-05) onto this new row -- a verified
 * contradiction with the newly approved rule, corrected narrowly.
 *
 * Every test exercises final resolution and final result behavior, not
 * only string presence.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildProductFamilyMatrixSection } from '../../js/import-readiness/product-family-result.js';
import { IMPORT_TYPE } from '../../js/import-readiness/scenario-schema.js';
import { PRODUCT_FAMILY_MATRIX, findFamilyById } from '../../js/import-readiness/product-family-matrix.js';
import { PRODUCT_FAMILY_SELECTION_CANDIDATES } from '../../js/import-readiness/product-family-selection-mapping.js';
import { identifyProductFamily } from '../../js/import-readiness/product-family-identification.js';
import { REGULATORY_FOLLOWUP_QUESTIONS } from '../../js/import-readiness/regulatory-signals/questions.js';
import { REGULATORY_SIGNAL_RULES } from '../../js/import-readiness/regulatory-signals/rules-registry.js';

const ANIMAL_FEED_CHECKBOX = 'animal_feed';
const ANIMAL_FEED_FAMILY_ID = 'food-and-beverages-09';
const LIVE_ANIMALS_CHECKBOX = 'live_animals';
const ANIMAL_ORIGIN_CHECKBOX = 'animal_origin_products';
const VET_NOTE_PREFIX = 'נדרש לבדוק אישור של השירותים הווטרינריים במשרד החקלאות.';

function html() {
  return readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
}

function section(texts, checkboxes) {
  return buildProductFamilyMatrixSection({
    texts,
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: checkboxes,
  });
}

// -- Checkbox presence/label/mapping --

test('new visible "מזון לבעלי חיים" checkbox exists exactly once', () => {
  const doc = html();
  const matches = doc.match(/name="irProductFamily" value="animal_feed"/g) || [];
  assert.equal(matches.length, 1);
});

test('checkbox has a valid associated label with the exact Hebrew text, inside the existing fieldset', () => {
  const doc = html();
  const match = doc.match(/<label><input type="checkbox" name="irProductFamily" value="animal_feed">([^<]+)<\/label>/);
  assert.ok(match);
  assert.equal(match[1], 'מזון לבעלי חיים');
  const groupStart = doc.indexOf('id="irProductFamilyGroup"');
  const groupEnd = doc.indexOf('</div>', groupStart);
  const idx = doc.indexOf('value="animal_feed"');
  assert.ok(idx > groupStart && idx < groupEnd);
});

test('checkbox value has exactly one reviewed canonical mapping, forced (single-candidate)', () => {
  const candidates = PRODUCT_FAMILY_SELECTION_CANDIDATES[ANIMAL_FEED_CHECKBOX];
  assert.ok(candidates);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0], ANIMAL_FEED_FAMILY_ID);
  assert.ok(findFamilyById(ANIMAL_FEED_FAMILY_ID).activeStatus);
});

test('"בעלי חיים" and "מוצרים מן החי" checkboxes are preserved', () => {
  const doc = html();
  assert.match(doc, /name="irProductFamily" value="live_animals">בעלי חיים</);
  assert.match(doc, /name="irProductFamily" value="animal_origin_products">מוצרים מן החי</);
});

// -- 1-14: explicit selection / free-text scenarios reach the animal-feed family --

test('1. explicit selection + neutral text reaches the animal-feed family, Veterinary Services direction', () => {
  const s = section(['מוצר לבדיקה'], [ANIMAL_FEED_CHECKBOX]);
  assert.equal(s.state, 'positive');
  assert.equal(s.familyName, 'מזון לבעלי חיים');
  assert.deepEqual(s.positiveCategories, ['משרד החקלאות']);
  assert.match(s.note.text, new RegExp(VET_NOTE_PREFIX.replace(/[.]/g, '\\.')));
  assert.ok(s.professional.primary);
  assert.equal(s.professional.supporting, null);
  assert.equal(typeof s.limitation, 'string');
  assert.ok(s.limitation.length > 0);
});

const FEED_TEXTS = [
  ['2', 'מזון לבעלי חיים'],
  ['3', 'מזון לכלבים'],
  ['4', 'מזון לחתולים'],
  ['5', 'מזון לדגים'],
  ['6', 'מזון לציפורים'],
  ['7', 'מזון לחיות משק'],
  ['8', 'animal feed'],
  ['9', 'dog food'],
  ['10', 'cat food'],
  ['11', 'fish food'],
  ['12', 'bird food'],
  ['13', 'livestock feed'],
  ['14', 'pet food'],
];
for (const [n, text] of FEED_TEXTS) {
  test(`${n}. free text "${text}" resolves to the animal-feed family with Veterinary Services direction`, () => {
    const s = section([text]);
    assert.equal(s.familyName, 'מזון לבעלי חיים');
    assert.deepEqual(s.positiveCategories, ['משרד החקלאות']);
    assert.equal(s.professional.supporting, null);
  });
}

// -- 15-21: nearby animal routes preserved --

test('15. explicit live-animal selection unaffected', () => {
  const s = section(['מוצר לבדיקה'], [LIVE_ANIMALS_CHECKBOX]);
  assert.equal(s.familyName, 'בעלי חיים');
});

test('16. "בעל חיים חי" resolves to live animals, not animal feed', () => {
  const s = section(['בעל חיים חי']);
  assert.equal(s.familyName, 'בעלי חיים');
});

test('17. existing products-of-animal-origin selection unaffected', () => {
  const s = section(['מוצר שמקורו מן החי'], [ANIMAL_ORIGIN_CHECKBOX]);
  assert.equal(s.familyName, 'מזון מן החי');
  assert.deepEqual([...s.positiveCategories].sort(), ['משרד הבריאות', 'משרד החקלאות'].sort());
});

test('18. "מוצר מן החי" is not misclassified as animal feed (pre-existing free-text behavior unaffected by this change)', () => {
  const r = identifyProductFamily(['מוצר מן החי']);
  assert.notEqual(r.family?.id, ANIMAL_FEED_FAMILY_ID);
});

test('19. eggs unchanged', () => {
  const s = section(['ביצים']);
  assert.equal(s.familyName, 'מזון מן החי');
});

test('20. animal remains unaffected (no false positive to animal feed or live animals)', () => {
  const r = identifyProductFamily(['שלד בעל חיים']);
  assert.notEqual(r.family?.id, ANIMAL_FEED_FAMILY_ID);
  assert.notEqual(r.family?.id, 'food-and-beverages-08');
});

test('21. animal-use vitamins unaffected, no duplicate agriculture professional vs. animal feed', () => {
  const s = section(['ויטמינים לבעלי חיים']);
  assert.equal(s.familyName, 'ויטמינים לבעלי חיים');
  const feed = section(['מוצר לבדיקה'], [ANIMAL_FEED_CHECKBOX]);
  assert.deepEqual(s.professional.primary, feed.professional.primary);
});

// -- 22-28: non-food pet products stay unaffected --

const NON_FOOD = [
  ['22', 'צעצוע לכלב'],
  ['23', 'רצועה לכלב'],
  ['24', 'קולר לחתול'],
  ['25', 'מיטה לחיות מחמד'],
  ['26', 'קערה לכלב'],
  ['27', 'pet toy'],
  ['28', 'aquarium accessory'],
];
for (const [n, text] of NON_FOOD) {
  test(`${n}. non-food pet product "${text}" is not classified as animal feed`, () => {
    const r = identifyProductFamily([text]);
    assert.notEqual(r.family?.id, ANIMAL_FEED_FAMILY_ID);
  });
}

test('general pet-products row (additional-consumer-products-05) no longer carries the "מזון לחיות מחמד" (pet food) alias', () => {
  const f = findFamilyById('additional-consumer-products-05');
  assert.ok(!f.aliases.includes('מזון לחיות מחמד'));
});

// -- 29-37: precedence and state --

test('29. explicit animal-feed selection wins over unrelated free text', () => {
  const s = section(['ביצים'], [ANIMAL_FEED_CHECKBOX]);
  assert.equal(s.familyName, 'מזון לבעלי חיים');
});

test('30. another explicit family with animal-feed-like incidental wording does not accidentally win animal feed', () => {
  const s = section(['ביצים'], [ANIMAL_ORIGIN_CHECKBOX]);
  assert.notEqual(s.familyName, 'מזון לבעלי חיים');
});

test('31. two selected families resolved to animal feed via disambiguating text', () => {
  const s = section(['dog food'], [ANIMAL_FEED_CHECKBOX, LIVE_ANIMALS_CHECKBOX]);
  assert.equal(s.familyName, 'מזון לבעלי חיים');
});

test('32. two selected families remaining unresolved with neutral text', () => {
  const s = section(['מוצר לבדיקה'], [ANIMAL_FEED_CHECKBOX, LIVE_ANIMALS_CHECKBOX]);
  assert.equal(s.state, 'selection_unresolved');
});

test('35. array-order independence', () => {
  const a = section(['dog food'], [ANIMAL_FEED_CHECKBOX, LIVE_ANIMALS_CHECKBOX]);
  const b = section(['dog food'], [LIVE_ANIMALS_CHECKBOX, ANIMAL_FEED_CHECKBOX]);
  assert.equal(a.familyName, b.familyName);
  assert.equal(a.state, b.state);
});

test('36. matrix registry order does not change identification', () => {
  const reversed = [...PRODUCT_FAMILY_MATRIX].reverse();
  const forward = identifyProductFamily(['pet food'], { families: PRODUCT_FAMILY_MATRIX.filter((f) => f.activeStatus) });
  const backward = identifyProductFamily(['pet food'], { families: reversed.filter((f) => f.activeStatus) });
  assert.equal(forward.family?.id, ANIMAL_FEED_FAMILY_ID);
  assert.equal(backward.family?.id, ANIMAL_FEED_FAMILY_ID);
});

// -- Zero-question guarantee --

test('focused-question registry and rule registry are unchanged (zero-question guarantee)', () => {
  assert.equal(REGULATORY_FOLLOWUP_QUESTIONS.length, 10);
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
    'vehicleFunctionCategory',
  ]);
  for (const q of REGULATORY_FOLLOWUP_QUESTIONS) {
    for (const bad of ['animal', 'species', 'breed', 'origin', 'health', 'certificate', 'age', 'purpose', 'ingredient', 'process']) {
      assert.ok(!q.id.toLowerCase().includes(bad), `question id "${q.id}" must not be animal-feed-detail related`);
    }
  }
});

// -- Registry hygiene --

test('no duplicate IDs, names, or aliases; deterministic-generation-clean row ledger', () => {
  const ids = PRODUCT_FAMILY_MATRIX.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length);
  const names = PRODUCT_FAMILY_MATRIX.filter((f) => f.activeStatus).map((f) => f.publicFamilyName);
  assert.deepEqual(names.filter((v, i) => names.indexOf(v) !== i), []);
  const newFamily = findFamilyById(ANIMAL_FEED_FAMILY_ID);
  assert.deepEqual(newFamily.aliases, [
    'מזון לבעלי חיים', 'מזון לכלבים', 'מזון לחתולים', 'מזון לדגים', 'מזון לציפורים', 'מזון לחיות משק',
    'מזון לחיות מחמד', 'animal feed', 'dog food', 'cat food', 'fish food', 'bird food', 'livestock feed', 'pet food',
  ]);
  assert.deepEqual(newFamily.regulatorySignals, {
    standards: false, healthUmbrella: false, transportOrVehicleLaboratory: false,
    communications: false, agriculture: true, otherPermit: false,
  });
});

test('broad global aliases (bare מזון/אוכל/feed/food/animal/pet/species names) were deliberately not added', () => {
  const family = findFamilyById(ANIMAL_FEED_FAMILY_ID);
  for (const forbidden of ['מזון', 'אוכל', 'feed', 'food', 'animal', 'pet', 'כלב', 'חתול', 'דג', 'ציפור']) {
    assert.ok(!family.aliases.includes(forbidden), `"${forbidden}" must not be a bare alias`);
  }
});

test('collision guard: fish-food phrase never becomes ambiguous with the products-of-animal-origin "דגים" alias', () => {
  const r = identifyProductFamily(['מזון לדגים']);
  assert.equal(r.outcome, 'high_confidence');
  assert.equal(r.family.id, ANIMAL_FEED_FAMILY_ID);
});

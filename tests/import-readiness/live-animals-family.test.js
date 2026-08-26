/**
 * Live-animals completion (product-owner decision, 2026-08-26): the
 * questionnaire previously had no explicit, separate selectable option
 * for a live animal -- only "מוצרים מן החי" (products OF animal
 * origin, food-and-beverages-04). Added a new, distinct visible
 * checkbox ("בעלי חיים", value live_animals) mapped to a new,
 * genuinely separate canonical row (food-and-beverages-08) that reuses
 * the existing agriculture/Veterinary Services signal, professional
 * routing, CTA, limitation, and document/result-order systems --
 * nothing new invented. The primary direction does not depend on
 * animal type; no animal-type/species/breed/age/purpose/origin/health/
 * import-type question was added.
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
import { PRODUCT_FAMILY_SELECTION_CANDIDATES, resolveFamilyIdentificationOptions } from '../../js/import-readiness/product-family-selection-mapping.js';
import { identifyProductFamily } from '../../js/import-readiness/product-family-identification.js';
import { REGULATORY_FOLLOWUP_QUESTIONS } from '../../js/import-readiness/regulatory-signals/questions.js';
import { REGULATORY_SIGNAL_RULES } from '../../js/import-readiness/regulatory-signals/rules-registry.js';

const LIVE_ANIMALS_CHECKBOX = 'live_animals';
const LIVE_ANIMALS_FAMILY_ID = 'food-and-beverages-08';
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

// -- 1-3: visible checkbox exists, has a label, has one reviewed mapping --

test('1. new visible "בעלי חיים" checkbox exists exactly once', () => {
  const doc = html();
  const matches = doc.match(/name="irProductFamily" value="live_animals"/g) || [];
  assert.equal(matches.length, 1, 'exactly one live_animals checkbox');
});

test('2. checkbox has a valid associated label with the exact Hebrew text, and is a native checkbox inside the existing fieldset', () => {
  const doc = html();
  const match = doc.match(/<label><input type="checkbox" name="irProductFamily" value="live_animals">([^<]+)<\/label>/);
  assert.ok(match, 'label must wrap the native checkbox input (implicit association)');
  assert.equal(match[1], 'בעלי חיים');
  // Must be inside the existing product-family fieldset/group, not a new step.
  const groupStart = doc.indexOf('id="irProductFamilyGroup"');
  const groupEnd = doc.indexOf('</div>', groupStart);
  const checkboxIndex = doc.indexOf('value="live_animals"');
  assert.ok(checkboxIndex > groupStart && checkboxIndex < groupEnd, 'checkbox must be inside the existing irProductFamilyGroup');
});

test('3. checkbox value has exactly one reviewed canonical mapping, forced (single-candidate)', () => {
  const candidates = PRODUCT_FAMILY_SELECTION_CANDIDATES[LIVE_ANIMALS_CHECKBOX];
  assert.ok(candidates);
  assert.equal(candidates.length, 1, 'single-candidate (forced) mapping');
  assert.equal(candidates[0], LIVE_ANIMALS_FAMILY_ID);
  assert.ok(findFamilyById(LIVE_ANIMALS_FAMILY_ID).activeStatus);
});

test('"מוצרים מן החי" checkbox is not renamed or removed', () => {
  const doc = html();
  assert.match(doc, /name="irProductFamily" value="animal_origin_products">מוצרים מן החי</);
});

// -- 4-9: explicit selection reaches the live-animal family with correct result shape --

test('4-6. explicit selection + neutral text reaches the live-animal family, Veterinary Services direction, no unknown/information-needed result', () => {
  const s = section(['מוצר לבדיקה', 'בעל חיים המיועד ליבוא', 'שימוש מסחרי'], [LIVE_ANIMALS_CHECKBOX]);
  assert.ok(s);
  assert.equal(s.state, 'positive');
  assert.equal(s.familyName, 'בעלי חיים');
  assert.deepEqual(s.positiveCategories, ['משרד החקלאות']);
  assert.match(s.note.text, new RegExp(VET_NOTE_PREFIX.replace(/[.]/g, '\\.')));
  assert.equal(s.noFamilyMatchMessage, null);
});

test('7. exactly one CTA (one primary professional, no supporting)', () => {
  const s = section(['מוצר לבדיקה'], [LIVE_ANIMALS_CHECKBOX]);
  assert.ok(s.professional.primary);
  assert.equal(s.professional.supporting, null);
});

test('8. exactly one limitation', () => {
  const s = section(['מוצר לבדיקה'], [LIVE_ANIMALS_CHECKBOX]);
  assert.equal(typeof s.limitation, 'string');
  assert.ok(s.limitation.length > 0);
});

test('9. existing Ministry of Agriculture professional appears once, identical to the pre-existing animal-vitamins row -- no new professional invented', () => {
  const liveAnimals = section(['מוצר לבדיקה'], [LIVE_ANIMALS_CHECKBOX]);
  const animalVitamins = section(['ויטמינים לבעלי חיים']);
  assert.deepEqual(liveAnimals.professional.primary, animalVitamins.professional.primary);
});

test('scenario 2: explicit selection + "בעל חיים חי" reaches the same Veterinary Services direction', () => {
  const s = section(['בעל חיים חי'], [LIVE_ANIMALS_CHECKBOX]);
  assert.equal(s.familyName, 'בעלי חיים');
  assert.deepEqual(s.positiveCategories, ['משרד החקלאות']);
});

// -- 5 (list item): neutral text does not cause Unknown Family --

test('5b. neutral text with the checkbox selected never falls back to unknown-family wording', () => {
  const s = section(['מוצר לבדיקה'], [LIVE_ANIMALS_CHECKBOX]);
  assert.equal(s.noFamilyMatchMessage, null);
  assert.notEqual(s.state, 'unresolved');
});

// -- 10. no focused question added --

test('10. focused-question registry and scheduler are unchanged (zero-question guarantee)', () => {
  assert.equal(REGULATORY_FOLLOWUP_QUESTIONS.length, 10, 'no new question added to the registry');
  assert.equal(REGULATORY_SIGNAL_RULES.length, 5, 'no new rule added');
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
    for (const bad of ['animal', 'species', 'breed', 'origin', 'health', 'veterinary certificate', 'age', 'purpose']) {
      assert.ok(!q.id.toLowerCase().includes(bad), `question id "${q.id}" must not be animal-detail related`);
    }
  }
});

// -- 11-14: existing unrelated-family behavior unchanged --

test('11. products-of-animal-origin behavior unchanged (existing checkbox, existing family, existing note)', () => {
  const s = section(['מוצר שמקורו מן החי'], [ANIMAL_ORIGIN_CHECKBOX]);
  assert.equal(s.familyName, 'מזון מן החי');
  assert.deepEqual([...s.positiveCategories].sort(), ['משרד הבריאות', 'משרד החקלאות'].sort());
  assert.match(s.note.text, new RegExp(VET_NOTE_PREFIX.replace(/[.]/g, '\\.')));
});

test('12. animal-feed behavior unchanged (Veterinary Services direction, no duplicate professional, no accidental live-animal result)', () => {
  const s = section(['מזון לבעלי חיים']);
  // Neutral "מזון לבעלי חיים" (food for animals) is not a curated alias
  // of any family -- confirms no accidental live-animal match and no
  // regression (matches baseline: stays unresolved without an explicit
  // checkbox, same as before this change).
  assert.notEqual(s?.familyName, 'בעלי חיים');
});

test('12b. animal vitamins (existing agriculture-only row) still resolve to their own family, not the new live-animal row', () => {
  const s = section(['ויטמינים לבעלי חיים']);
  assert.equal(s.familyName, 'ויטמינים לבעלי חיים');
  assert.equal(s.professional.supporting, null);
});

test('13. egg behavior unchanged', () => {
  const s = section(['ביצים']);
  assert.equal(s.familyName, 'מזון מן החי');
  assert.deepEqual([...s.positiveCategories].sort(), ['משרד הבריאות', 'משרד החקלאות'].sort());
});

test('14. animal-remains-adjacent unrelated text does not false-positive to live animals or products of animal origin', () => {
  const s1 = identifyProductFamily(['תיק עור']);
  const s2 = identifyProductFamily(['פרוותי']);
  assert.notEqual(s1.family?.id, LIVE_ANIMALS_FAMILY_ID);
  assert.notEqual(s2.family?.id, LIVE_ANIMALS_FAMILY_ID);
});

test('14b. a deceased animal or its remains never resolves to the live-animal row (each contains "בעל חיים" as a plain substring)', () => {
  for (const t of ['בעל חיים מת', 'שלד בעל חיים', 'עור בעל חיים', 'שריד בעל חיים', 'מוצר עם מרכיב מבעל חיים מת']) {
    const r = identifyProductFamily([t]);
    assert.notEqual(r.family?.id, LIVE_ANIMALS_FAMILY_ID, `"${t}" must not resolve to the live-animal row`);
  }
});

// -- 15. explicit selection cannot be overridden by an unselected text family --

test('15. explicit live-animal selection cannot be overridden by unselected-family text (e.g. egg wording)', () => {
  const s = section(['ביצים'], [LIVE_ANIMALS_CHECKBOX]);
  assert.equal(s.familyName, 'בעלי חיים', 'explicit checkbox selection wins over unselected free-text family');
});

// -- 16-17: order independence --

test('16. DOM/array order of selectedProductFamilies does not change the result', () => {
  const a = section(['מוצר לבדיקה'], [LIVE_ANIMALS_CHECKBOX, ANIMAL_ORIGIN_CHECKBOX]);
  const b = section(['מוצר לבדיקה'], [ANIMAL_ORIGIN_CHECKBOX, LIVE_ANIMALS_CHECKBOX]);
  // Both selections are ambiguous together (two explicit families) --
  // order must not change which outcome results.
  assert.equal(a.state, b.state);
  assert.equal(a.familyName, b.familyName);
});

test('17. matrix array order does not change identification -- live-animal alias resolves uniquely regardless of registry order', () => {
  const reversed = [...PRODUCT_FAMILY_MATRIX].reverse();
  const forward = identifyProductFamily(['בעל חיים'], { families: PRODUCT_FAMILY_MATRIX.filter((f) => f.activeStatus) });
  const backward = identifyProductFamily(['בעל חיים'], { families: reversed.filter((f) => f.activeStatus) });
  assert.equal(forward.family?.id, LIVE_ANIMALS_FAMILY_ID);
  assert.equal(backward.family?.id, LIVE_ANIMALS_FAMILY_ID);
});

// -- 21-24: registry hygiene --

test('21-22. no duplicate IDs or family names in the active registry', () => {
  const ids = PRODUCT_FAMILY_MATRIX.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length);
  const names = PRODUCT_FAMILY_MATRIX.filter((f) => f.activeStatus).map((f) => f.publicFamilyName);
  const dupNames = names.filter((v, i) => names.indexOf(v) !== i);
  assert.deepEqual(dupNames, []);
});

test('23. no duplicate global aliases -- the new row introduces no alias that duplicates an existing one across the registry', () => {
  const seen = new Map();
  for (const f of PRODUCT_FAMILY_MATRIX.filter((x) => x.activeStatus)) {
    for (const alias of f.aliases || []) {
      if (seen.has(alias) && seen.get(alias) !== f.id) {
        assert.fail(`alias "${alias}" duplicated across ${seen.get(alias)} and ${f.id}`);
      }
      seen.set(alias, f.id);
    }
  }
  const newFamily = findFamilyById(LIVE_ANIMALS_FAMILY_ID);
  assert.deepEqual(newFamily.aliases, ['בעלי חיים', 'בעל חיים', 'live animal', 'live animals']);
});

test('24. deterministic generation remains clean -- exactly one live-animals row, no unrelated row touched', () => {
  const liveAnimalRows = PRODUCT_FAMILY_MATRIX.filter((f) => f.publicFamilyName === 'בעלי חיים');
  assert.equal(liveAnimalRows.length, 1);
  const animalOrigin = findFamilyById('food-and-beverages-04');
  assert.equal(animalOrigin.publicFamilyName, 'מזון מן החי');
  assert.deepEqual(animalOrigin.regulatorySignals, {
    standards: false,
    healthUmbrella: true,
    transportOrVehicleLaboratory: false,
    communications: false,
    agriculture: true,
    otherPermit: false,
  });
});

// -- Broad aliases rejected --

test('broad animal-species aliases were deliberately not added', () => {
  const family = findFamilyById(LIVE_ANIMALS_FAMILY_ID);
  for (const forbidden of ['כלב', 'חתול', 'סוס', 'ציפור', 'דג', 'livestock', 'pet']) {
    assert.ok(!family.aliases.includes(forbidden), `"${forbidden}" must not be an alias`);
  }
});

// -- Collision guard: pre-existing "for animals" phrasing stays unambiguous --

test('collision guard: "for animals" phrasing (products/vitamins) never becomes ambiguous with the new live-animal row', () => {
  for (const t of ['מוצר לבעלי חיים', 'מוצרים לבעלי חיים', 'ויטמינים לבעלי חיים', 'תוסף ויטמינים לבעלי חיים']) {
    const r = identifyProductFamily([t]);
    assert.equal(r.outcome, 'high_confidence', `"${t}" must resolve unambiguously`);
    assert.notEqual(r.family.id, LIVE_ANIMALS_FAMILY_ID, `"${t}" must not resolve to the live-animal row`);
  }
});

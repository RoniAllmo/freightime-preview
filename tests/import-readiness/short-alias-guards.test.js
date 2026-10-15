/**
 * Short Alias guards (product-owner decisions D1-D7, 2026-10-15).
 *
 * A short alias -- one word of at most 4 Hebrew letters or 5 Latin
 * characters -- used to match as a bare substring, so it fired inside
 * unrelated words and produced false regulatory routing:
 *   "drugs"          -> carpets ("rug")        -> Standards Institution
 *   "תליון בשרשרת"   -> animal-origin food ("בשר") -> Health + Agriculture
 *   "portable ..."   -> furniture ("table")    -> "no general requirement"
 * Short aliases (identification) and short hint keywords (follow-up
 * questions) now match only as a guarded whole word, with explicit
 * plural forms, three approved stems, local negation and a tiny
 * flavor/scent modifier list. No negative term was added. Long aliases
 * keep plain substring matching.
 *
 * Pure Node, no DOM, no network.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { identifyProductFamily, IDENTIFICATION_OUTCOME } from '../../js/import-readiness/product-family-identification.js';
import { buildProductFamilyMatrixSection } from '../../js/import-readiness/product-family-result.js';
import { activeFamilies } from '../../js/import-readiness/product-family-matrix.js';
import { detectCategoryHints, normalizeHebrewSearchText } from '../../js/import-readiness/regulatory-signals/keyword-hints.js';
import {
  isShortTerm, containsShortTerm, HEBREW_PREFIX_LETTERS,
  HEBREW_MODIFIER_PREFIXES, ENGLISH_MODIFIER_SUFFIXES,
} from '../../js/import-readiness/term-boundary.js';
import { IMPORT_TYPE } from '../../js/import-readiness/scenario-schema.js';

const CARPETS = 'textiles-and-furniture-06';
const ANIMAL_FOOD = 'food-and-beverages-04';
const FURNITURE = 'textiles-and-furniture-05';
const CLOTHING = 'textiles-and-furniture-01';
const FOOTWEAR = 'textiles-and-furniture-02';
const HAND_TOOLS = 'construction-and-industrial-04';
const BATTERIES = 'electrical-and-electronics-07';
const MATTRESSES = 'textiles-and-furniture-03';
const DRONES = 'electrical-and-electronics-10';

const ids = (text) => identifyProductFamily([text]).candidates.map((f) => f.id);
const resolvesTo = (text, id) => {
  const r = identifyProductFamily([text]);
  return r.outcome === IDENTIFICATION_OUTCOME.HIGH_CONFIDENCE && r.family.id === id;
};

// -- The threshold (D2) --

test('1. a short term is one word of at most 4 Hebrew letters or 5 Latin characters', () => {
  for (const short of ['רכב', 'בשר', 'שטיח', 'rug', 'table', 'drone']) assert.equal(isShortTerm(short), true, short);
  for (const long of ['חולצה', 'טקסטיל', 'chairs', 'helmet', 'עוף חי', 'safety shoes', '']) assert.equal(isShortTerm(long), false, long);
});

// -- Collisions resolved (D1) --

test('2. "drugs" and "drug test kit" no longer resolve to carpets, and the result shows no Standards direction', () => {
  for (const text of ['drugs', 'drug test kit', 'prescription drugs for export']) {
    assert.ok(!ids(text).includes(CARPETS), text);
    const section = buildProductFamilyMatrixSection({ texts: [text], importType: IMPORT_TYPE.COMMERCIAL });
    assert.equal(section.state, 'unknown_family', text);
    assert.deepEqual(section.positiveCategories, [], text);
  }
});

test('3. "בשרשרת" (on a chain) and "שמדגים" (that demonstrates) no longer resolve to animal-origin food', () => {
  for (const text of ['תליון בשרשרת', 'ערכה שמדגים ניסוי']) {
    assert.ok(!ids(text).includes(ANIMAL_FOOD), text);
    const section = buildProductFamilyMatrixSection({ texts: [text], importType: IMPORT_TYPE.COMMERCIAL });
    assert.ok(!section.positiveCategories.includes('משרד הבריאות'), text);
  }
});

test('4. a short alias inside a longer English word no longer matches ("table", "chair", "shoes")', () => {
  for (const text of ['portable speaker', 'vegetable peeler', 'adjustable stand', 'suitable for kids', 'oral tablets', 'stable base', 'the chairman of the company', 'horseshoes', 'a folding wheelchair']) {
    assert.ok(!ids(text).includes(FURNITURE), `${text} -> furniture`);
    assert.ok(!ids(text).includes(FOOTWEAR), `${text} -> footwear`);
  }
});

test('5. a short Hebrew alias that only starts a different word no longer matches ("מברגה", "מעילה", "אספה")', () => {
  assert.ok(!ids('מברגה חשמלית').includes(HAND_TOOLS), 'a power drill is not a screwdriver');
  assert.ok(!ids('חשד למעילה').includes(CLOTHING), 'embezzlement is not a coat');
  assert.ok(!ids('אספה כללית').includes(FURNITURE), 'an assembly is not a sofa');
});

test('6. every short alias of every active family is rejected when embedded between two non-prefix letters', () => {
  let checked = 0;
  for (const family of activeFamilies()) {
    for (const alias of family.aliases || []) {
      const term = normalizeHebrewSearchText(alias).toLowerCase();
      if (!isShortTerm(term)) continue;
      const hebrew = /[א-ת]/.test(term);
      const embedded = hebrew ? `ז${term}ז` : `q${term}q`;
      assert.ok(!ids(embedded).includes(family.id), `"${alias}" must not match inside "${embedded}"`);
      checked += 1;
    }
  }
  assert.ok(checked >= 25, `expected to check every short alias, checked ${checked}`);
});

// -- Inflections and plurals still work (D2) --

test('7. short aliases still match as a whole word, after one Hebrew prefix letter, and next to a slash', () => {
  assert.ok(resolvesTo('שטיח', CARPETS));
  assert.ok(resolvesTo('כיסוי לשטיח הסלון', CARPETS));
  assert.ok(resolvesTo('ירקות ובשר', ANIMAL_FOOD));
  assert.ok(resolvesTo('table', FURNITURE));
  assert.ok(resolvesTo('ספה/כורסה', FURNITURE));
});

test('8. Hebrew plurals of short aliases still match through the explicit forms', () => {
  const cases = [
    ['כיסאות', FURNITURE], ['מעילים', CLOTHING], ['מצברים', BATTERIES], ['פטישים', HAND_TOOLS],
    ['מברגים', HAND_TOOLS], ['פלירים', HAND_TOOLS], ['בשרים', ANIMAL_FOOD], ['שטיחים', CARPETS],
    ['מזרנים', MATTRESSES], ['רחפנים', DRONES],
  ];
  for (const [text, id] of cases) assert.ok(resolvesTo(text, id), `${text} -> ${id}`);
});

test('9. English plurals of short aliases still match ("rugs", "chairs", "tables", "shirts", "shoes", "drones")', () => {
  const cases = [['rugs', CARPETS], ['chairs', FURNITURE], ['tables', FURNITURE], ['shirts', CLOTHING], ['shoes', FOOTWEAR], ['drones', DRONES]];
  for (const [text, id] of cases) assert.ok(resolvesTo(text, id), `${text} -> ${id}`);
});

test('10. only the three approved stems may continue a word: מכנס, גרב, בגד', () => {
  for (const text of ['מכנסיים', 'גרביים', 'גרבונים', 'בגדים', 'בגדי ילדים']) assert.ok(resolvesTo(text, CLOTHING), text);
  const haystack = 'מברגה';
  assert.equal(containsShortTerm(haystack, 'מברג'), false, 'a non-stem short alias must end the word');
  assert.equal(containsShortTerm(haystack, 'מברג', { wordStart: true }), true, 'the stem mode is what allows continuation');
});

test('11. long aliases keep plain substring matching, unchanged', () => {
  assert.ok(resolvesTo('טקסטילים', CLOTHING), 'טקסטיל (6 letters) still matches inside its plural');
  assert.ok(resolvesTo('חולצה מכותנה', CLOTHING));
  assert.ok(resolvesTo('מצבר לרכב', 'vehicles-and-transport-10'), 'the long vehicle-battery alias still wins');
});

// -- Negation (D3) --

test('12. an explicit negation right before a short alias cancels it; "עם"/"with" resets the window', () => {
  assert.ok(!ids('תבלין ללא בשר').includes(ANIMAL_FOOD));
  assert.ok(!ids('seasoning without rug fibers').includes(CARPETS));
  assert.ok(!ids('מוצר בלי שטיח').includes(CARPETS));
  assert.ok(ids('ערכה ללא סוללה עם שטיח').includes(CARPETS), 'עם re-asserts the next item');
  assert.ok(resolvesTo('שטיח ללא החלקה', CARPETS), 'a negation AFTER the alias never cancels it');
});

// -- Flavor/scent modifiers (D4) --

test('13. the modifier list stays tiny and hardcoded', () => {
  assert.deepEqual([...HEBREW_MODIFIER_PREFIXES], ['בטעם', 'בניחוח']);
  assert.deepEqual([...ENGLISH_MODIFIER_SUFFIXES], ['flavored', 'scented']);
});

test('14. a Hebrew flavor or scent modifier cancels only the next word, optionally across "של"', () => {
  for (const text of ['קרם בניחוח דבש', 'חטיף בטעם בשר', 'סבון בניחוח של דבש']) {
    assert.ok(!ids(text).includes(ANIMAL_FOOD), text);
  }
  assert.ok(resolvesTo('דבש בטעם לימון', ANIMAL_FOOD), 'honey itself, flavored with lemon, is still honey');
  assert.ok(resolvesTo('דבש', ANIMAL_FOOD));
});

test('15. an English modifier cancels the word right before it ("honey-scented" normalizes to "honey scented")', () => {
  const families = [{ id: 'synthetic-honey', aliases: ['honey'] }];
  const match = (text) => identifyProductFamily([text], { families }).outcome === IDENTIFICATION_OUTCOME.HIGH_CONFIDENCE;
  assert.equal(match('honey-scented candle'), false);
  assert.equal(match('honey flavored tea'), false);
  assert.equal(match('raw honey'), true);
  assert.equal(match('scented honey'), true, 'a modifier before the noun leaves the noun itself');
});

// -- Category-hint layer (D6, D7) --

test('16. short hint keywords inside unrelated words no longer open a question', () => {
  for (const [text, category] of [
    ['הרכבה עצמית', 'vehicle_product'], ['בהתאם להרכב המוצר', 'vehicle_product'],
    ['מתחת למיטה', 'electrical_mains_product'], ['אנו מתחייבים', 'electrical_mains_product'],
    ['השקעה חדשה', 'electrical_mains_product'], ['מתחם תעשייה', 'electrical_mains_product'],
  ]) {
    assert.ok(!detectCategoryHints([text]).has(category), `${text} -> ${category}`);
  }
});

test('17. real hint keywords, their plurals and prefixed forms still open the question', () => {
  for (const text of ['רכב', 'פנס לרכב', 'מותקן ברכב', 'רכבים', 'חלק מהרכב']) {
    assert.ok(detectCategoryHints([text]).has('vehicle_product'), text);
  }
  for (const text of ['מוצר חשמלי', 'שקעים', '220 וולט', 'תנור 2 קילוואט', 'כבל עם תקע', 'מטען']) {
    assert.ok(detectCategoryHints([text]).has('electrical_mains_product'), text);
  }
  assert.ok(!detectCategoryHints(['צעצוע ללא חשמל']).has('electrical_mains_product'), 'negated keyword (D3) opens nothing');
});

test('18. D7: a bare material still opens its food-contact confirmation question, unchanged', () => {
  assert.ok(detectCategoryHints(['פלסטיק']).has('plastic_food_contact'));
  assert.ok(detectCategoryHints(['זכוכית']).has('glass_food_contact'));
  assert.equal(identifyProductFamily(['פלסטיק']).outcome, IDENTIFICATION_OUTCOME.NONE, 'but never identifies a family on its own');
  assert.equal(identifyProductFamily(['ברזל']).outcome, IDENTIFICATION_OUTCOME.NONE);
});

// -- One shared implementation --

test('19. identification, hints and presentation share term-boundary.js; the presentation layer keeps no private copy', () => {
  const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
  assert.match(read('js/import-readiness/product-family-identification.js'), /from '\.\/term-boundary\.js'/);
  assert.match(read('js/import-readiness/regulatory-signals/keyword-hints.js'), /from '\.\.\/term-boundary\.js'/);
  const presentation = read('js/import-readiness/family-material-disclosure.js');
  assert.match(presentation, /from '\.\/term-boundary\.js'/);
  for (const name of ['haystackContainsWholeTerm', 'haystackContainsPositiveTerm', 'isMatchNegated']) {
    assert.ok(!presentation.includes(`function ${name}(`), `${name} must not be redefined in the presentation layer`);
  }
  assert.equal(HEBREW_PREFIX_LETTERS, 'מבלוהכש');
});

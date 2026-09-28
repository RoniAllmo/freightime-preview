/**
 * Live animals veterinary domain completion
 * (FT-ONE-PULSE-LIVE-ANIMALS-V2, product owner decision): every
 * complete live animal, across the full taxonomic domain, must safely
 * reach the single existing live-animals family (food-and-beverages-08)
 * and receive one preliminary veterinary import direction using the
 * product owner's exact approved Hebrew wording, one professional
 * referral, and the existing non-binding limitation -- no new family,
 * no new question, no new professional category, no automatic
 * selection, no duplicate output.
 *
 * This suite exercises final resolution and final result behavior for
 * every mandatory taxonomic group, the rejected bare-species terms, and
 * the required collision boundaries against every excluded domain
 * (feed, pet accessories, products of animal origin, reproductive and
 * biological material, and unrelated products).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildProductFamilyMatrixSection } from '../../js/import-readiness/product-family-result.js';
import { IMPORT_TYPE } from '../../js/import-readiness/scenario-schema.js';
import { findFamilyById } from '../../js/import-readiness/product-family-matrix.js';
import { identifyProductFamily } from '../../js/import-readiness/product-family-identification.js';
import { suggestProductFamilyValues } from '../../js/import-readiness/family-material-disclosure.js';
import { REGULATORY_FOLLOWUP_QUESTIONS } from '../../js/import-readiness/regulatory-signals/questions.js';
import { REGULATORY_SIGNAL_RULES } from '../../js/import-readiness/regulatory-signals/rules-registry.js';

const LIVE_ANIMALS_CHECKBOX = 'live_animals';
const LIVE_ANIMALS_FAMILY_ID = 'food-and-beverages-08';
const APPROVED_NOTE =
  'על בסיס המידע שנמסר, מדובר בבעל חיים חי ביבוא מסחרי, ולכן נדרש כיוון לבדיקת רישיון, היתר או אישור וטרינרי ' +
  'מטעם השירותים הווטרינריים במשרד החקלאות וביטחון המזון. התנאים, המסמכים, תעודות הבריאות, החריגים וההליך המדויק ' +
  'עשויים להשתנות לפי סוג בעל החיים והנוהל הרשמי העדכני. יש לאמת את הדרישה מול המקורות הרשמיים והגורם המקצועי ' +
  'המוסמך לפני היבוא או ההגשה הסופית.';

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

function assertResolvesToLiveAnimals(text) {
  const r = identifyProductFamily([text]);
  assert.equal(r.outcome, 'high_confidence', `"${text}" must resolve unambiguously`);
  assert.equal(r.family.id, LIVE_ANIMALS_FAMILY_ID, `"${text}" must resolve to the live-animal family`);
}

function assertPositiveLiveAnimalResult(text) {
  const s = section([text]);
  assert.equal(s.state, 'positive');
  assert.equal(s.familyName, 'בעלי חיים');
  assert.deepEqual(s.positiveCategories, ['משרד החקלאות']);
  assert.equal(s.note.text, APPROVED_NOTE);
  assert.ok(s.professional.primary);
  assert.equal(s.professional.supporting, null);
  assert.equal(typeof s.limitation, 'string');
  assert.ok(s.limitation.length > 0);
  return s;
}

// ---------------------------------------------------------------------
// 1. Exact approved wording
// ---------------------------------------------------------------------

test('the exact product-owner-approved Hebrew guidance is used verbatim', () => {
  const s = section(['בעל חיים חי']);
  assert.equal(s.note.text, APPROVED_NOTE);
});

test('the approved wording never claims approval already granted, a single uniform procedure, or that no additional authority may apply', () => {
  const forbidden = ['אושר', 'מאושר', 'תמיד', 'בכל מקרה', 'בלבד ולא'];
  for (const term of forbidden) {
    assert.ok(!APPROVED_NOTE.includes(term), `approved note must not contain "${term}"`);
  }
});

// ---------------------------------------------------------------------
// 2. Taxonomic coverage -- one representative phrase per mandatory group
// ---------------------------------------------------------------------

const GROUPS = {
  'Companion animals': ['כלב חי', 'live cat'],
  'Livestock': ['פרה חיה', 'live sheep'],
  'Birds and poultry': ['תרנגולת חיה', 'live parrot'],
  'Aquatic animals': ['דג חי', 'live crustacean'],
  'Reptiles': ['נחש חי', 'live turtle'],
  'Amphibians': ['צפרדע חיה', 'live salamander'],
  'Insects': ['דבורה חיה', 'live insect'],
  'Arachnids': ['עכביש חי', 'live scorpion'],
  'Other invertebrates': ['תולעת חיה', 'live invertebrate'],
  'Laboratory animals': ['חיית מעבדה חיה', 'laboratory animal'],
  'Wild animals': ['חיית בר חיה', 'wild animal'],
  'Zoo animals': ['בעל חיים לגן חיות', 'zoo animal'],
  'Exotic animals': ['חיה אקזוטית חיה', 'exotic animal'],
};

for (const [group, phrases] of Object.entries(GROUPS)) {
  for (const phrase of phrases) {
    test(`taxonomic group [${group}]: "${phrase}" resolves uniquely to the live-animal family`, () => {
      assertResolvesToLiveAnimals(phrase);
    });
    test(`taxonomic group [${group}]: "${phrase}" produces the single positive veterinary result`, () => {
      assertPositiveLiveAnimalResult(phrase);
    });
  }
}

// ---------------------------------------------------------------------
// 3. Rejected bare species terms
// ---------------------------------------------------------------------

const REJECTED_BARE_TERMS = ['כלב', 'חתול', 'סוס', 'דג', 'ציפור', 'דבורה', 'dog', 'cat', 'horse', 'fish', 'bird', 'bee', 'animal', 'animals'];

test('rejected bare species terms are not aliases of the live-animal family', () => {
  const family = findFamilyById(LIVE_ANIMALS_FAMILY_ID);
  for (const term of REJECTED_BARE_TERMS) {
    assert.ok(!family.aliases.includes(term), `"${term}" must not be a bare alias`);
  }
});

// ---------------------------------------------------------------------
// 4. Exclusion domains -- must not resolve to the live-animal family
// ---------------------------------------------------------------------

const EXCLUDED_TEXTS = [
  // Animal feed / pet food.
  'מזון לכלבים', 'מזון לחתולים', 'dog food', 'animal feed',
  // Pet accessories / non-food pet products.
  'רצועה לכלב', 'קולר לחתול', 'pet bed', 'pet toy', 'אביזר לאקווריום',
  // Products of animal origin (meat/dairy/eggs/honey).
  'בשר', 'עוף', 'דגים', 'גבינה', 'דבש', 'ביצים',
  // Leather, wool, feathers, gelatin (no dedicated family; must not
  // become a live-animal match).
  'מעיל עור', 'צמר גולמי', 'נוצות לכרית', 'ג\'לטין',
  // Toys, statues, models, images, printed products.
  'צעצוע כלב', 'פסל של סוס', 'תמונה של חתול',
  // Cages, aquariums, carriers, kennels, collars, leashes, harnesses,
  // bowls, bedding, grooming products.
  'כלוב ריק', 'אקווריום ריק', 'תא נשיאה לחיית מחמד', 'כלובון לכלב',
  'רתמה לכלב', 'קערה לחיית מחמד', 'מברשת טיפוח לחיית מחמד',
  // Reproductive / biological material boundaries.
  'עוברים של בעלי חיים', 'זרע להזרעה מלאכותית', 'ביצי דגירה', 'דגימות רקמה',
];

for (const text of EXCLUDED_TEXTS) {
  test(`exclusion boundary: "${text}" never resolves to the live-animal family`, () => {
    const r = identifyProductFamily([text]);
    assert.notEqual(r.family?.id, LIVE_ANIMALS_FAMILY_ID, `"${text}" must not resolve to the live-animal family`);
  });
}

// Feed/pet-accessory/animal-origin text must still resolve to their own,
// unchanged, pre-existing rows -- never silently become "no match".
test('animal feed still resolves to its own dedicated row (unaffected)', () => {
  const r = identifyProductFamily(['מזון לכלבים']);
  assert.equal(r.outcome, 'high_confidence');
  assert.equal(r.family.id, 'food-and-beverages-09');
});

test('non-food pet accessories still resolve to their own dedicated row (unaffected)', () => {
  const r = identifyProductFamily(['רצועה לכלב']);
  assert.equal(r.outcome, 'high_confidence');
  assert.equal(r.family.id, 'additional-consumer-products-05');
});

test('products of animal origin still resolve to their own dedicated row (unaffected)', () => {
  const r = identifyProductFamily(['בשר']);
  assert.equal(r.outcome, 'high_confidence');
  assert.equal(r.family.id, 'food-and-beverages-04');
});

// ---------------------------------------------------------------------
// 5. Live poultry / live fish do not collide with animal-origin food
//    (the two collisions found and resolved during this pass)
// ---------------------------------------------------------------------

test('"עוף חי" (live chicken) resolves to the live-animal family, not the animal-origin-food family', () => {
  assertResolvesToLiveAnimals('עוף חי');
});

test('"דגים חיים" (live fish, plural) resolves to the live-animal family, not the animal-origin-food family', () => {
  assertResolvesToLiveAnimals('דגים חיים');
});

test('bare "עוף" and "דגים" (as food) still resolve to the animal-origin-food family, unaffected', () => {
  assert.equal(identifyProductFamily(['עוף']).family.id, 'food-and-beverages-04');
  assert.equal(identifyProductFamily(['דגים']).family.id, 'food-and-beverages-04');
});

// ---------------------------------------------------------------------
// 6. Suggestions, explicit selection, no automatic selection
// ---------------------------------------------------------------------

test('free-text description suggests the live_animals checkbox (suggestion only, never auto-checked)', () => {
  const suggested = suggestProductFamilyValues(['כלב חי']);
  assert.ok(suggested.includes(LIVE_ANIMALS_CHECKBOX));
});

test('no checkbox in the questionnaire markup is pre-checked (no automatic family selection)', () => {
  const doc = html();
  const groupStart = doc.indexOf('id="irProductFamilyGroup"');
  const groupEnd = doc.indexOf('</div>', groupStart);
  const group = doc.slice(groupStart, groupEnd);
  assert.ok(!group.includes('checked'), 'no product-family checkbox may be pre-checked');
});

test('explicit checkbox selection reaches the live-animal family regardless of neutral free text', () => {
  const s = section(['מוצר לבדיקה'], [LIVE_ANIMALS_CHECKBOX]);
  assert.equal(s.familyName, 'בעלי חיים');
  assert.equal(s.note.text, APPROVED_NOTE);
});

// ---------------------------------------------------------------------
// 7. "Show all" preserved
// ---------------------------------------------------------------------

test('"Show all product families" control is preserved, unchanged, and still lists live_animals', () => {
  const doc = html();
  assert.match(doc, /id="irProductFamilyExpand"[^>]*>הצג את כל משפחות המוצרים</);
  assert.match(doc, /name="irProductFamily" value="live_animals">בעלי חיים</);
});

// ---------------------------------------------------------------------
// 8. Duplicate-output guarantees
// ---------------------------------------------------------------------

test('no duplicate family result, veterinary direction, or referral for a multi-group description', () => {
  const s = section(['כלב חי', 'ופרה חיה', 'ותוכי חי']);
  assert.equal(s.familyName, 'בעלי חיים');
  assert.deepEqual(s.positiveCategories, ['משרד החקלאות']);
  assert.equal(s.professional.supporting, null);
});

test('professional referral is identical across every taxonomic group -- no new professional category invented', () => {
  const baseline = section(['כלב חי']).professional.primary;
  for (const [, phrases] of Object.entries(GROUPS)) {
    const s = section([phrases[0]]);
    assert.deepEqual(s.professional.primary, baseline);
  }
});

// ---------------------------------------------------------------------
// 9. Zero-question guarantee preserved
// ---------------------------------------------------------------------

test('no new focused question or detailed rule was added by this domain expansion', () => {
  assert.equal(REGULATORY_FOLLOWUP_QUESTIONS.length, 9);
  assert.equal(REGULATORY_SIGNAL_RULES.length, 5);
});

// ---------------------------------------------------------------------
// 10. Preservation of unrelated, pre-existing families
// ---------------------------------------------------------------------

test('helmet family is unaffected', () => {
  const s = section(['קסדה']);
  assert.equal(s.familyName, 'קסדות');
});

test('vehicle-related families are unaffected', () => {
  const r = identifyProductFamily(['כלי רכב שלמים']);
  assert.notEqual(r.family?.id, LIVE_ANIMALS_FAMILY_ID);
});

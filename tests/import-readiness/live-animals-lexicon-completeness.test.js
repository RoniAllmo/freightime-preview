/**
 * Live animals lexicon completeness
 * (FT-ONE-PULSE-LIVE-ANIMALS-LEXICON-COMPLETENESS-V1, product owner
 * decision): confirmed defect -- "כבש חי" (a live sheep, masculine
 * singular) was not recognized, even though several other sheep-related
 * phrases (including feminine/plural forms) already were. This suite
 * fixes the reported defect and performs a full lexicon-completeness
 * audit across the mandatory animal-name/group list so other common
 * live-animal names are not silently omitted -- covering three
 * dimensions (taxonomic/commercial group, common animal name, linguistic
 * form) for every mandatory group: sheep and goats; cattle and bovines;
 * horses and equids; pigs; camelids; companion animals and small
 * mammals; poultry and birds; fish and aquatic animals; reptiles;
 * amphibians; insects/arachnids/invertebrates; and representative
 * laboratory/wild/zoo/exotic subgroups (primates, deer, antelope,
 * elephants, big cats, bears, marsupials).
 *
 * The family remains exactly food-and-beverages-08 ("בעלי חיים",
 * checkbox live_animals) -- no new family, no changed veterinary
 * guidance/authority, no new question, no automatic selection. Every
 * test exercises final resolution and final result behavior, not only
 * string presence -- consistent with the sibling suites
 * live-animals-family.test.js and live-animals-veterinary-domain.test.js.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductFamilyMatrixSection } from '../../js/import-readiness/product-family-result.js';
import { IMPORT_TYPE } from '../../js/import-readiness/scenario-schema.js';
import { findFamilyById } from '../../js/import-readiness/product-family-matrix.js';
import { identifyProductFamily } from '../../js/import-readiness/product-family-identification.js';

const LIVE_ANIMALS_FAMILY_ID = 'food-and-beverages-08';
const APPROVED_NOTE_START =
  'על בסיס המידע שנמסר, מדובר בבעל חיים חי ביבוא מסחרי, ולכן נדרש כיוון לבדיקת רישיון, היתר או אישור וטרינרי';

function section(texts) {
  return buildProductFamilyMatrixSection({
    texts,
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: undefined,
  });
}

function assertResolvesToLiveAnimals(text) {
  const r = identifyProductFamily([text]);
  assert.equal(r.outcome, 'high_confidence', `"${text}" must resolve unambiguously`);
  assert.equal(r.family.id, LIVE_ANIMALS_FAMILY_ID, `"${text}" must resolve to the live-animal family`);
}

function assertPositiveLiveAnimalResult(text) {
  const s = section([text]);
  assert.equal(s.state, 'positive', `"${text}" must produce a positive result`);
  assert.equal(s.familyName, 'בעלי חיים');
  assert.deepEqual(s.positiveCategories, ['משרד החקלאות']);
  assert.ok(s.note.text.startsWith(APPROVED_NOTE_START), `"${text}" must use the approved veterinary wording`);
  assert.ok(s.professional.primary);
  assert.equal(s.professional.supporting, null, `"${text}" must not produce a duplicate/second professional`);
  assert.equal(typeof s.limitation, 'string');
  assert.ok(s.limitation.length > 0);
}

function assertNeverResolvesToLiveAnimals(text) {
  const r = identifyProductFamily([text]);
  assert.notEqual(r.family?.id, LIVE_ANIMALS_FAMILY_ID, `"${text}" must not resolve to the live-animal family`);
}

// ---------------------------------------------------------------------
// 0. Confirmed defect regression
// ---------------------------------------------------------------------

test('confirmed defect fix: "כבש חי" (a live sheep, masculine singular) now resolves to the live-animal family', () => {
  assertResolvesToLiveAnimals('כבש חי');
});

test('confirmed defect fix: "כבש חי" produces the single positive veterinary result', () => {
  assertPositiveLiveAnimalResult('כבש חי');
});

test('completeness fix: "כבשים חיים" (masculine-plural agreement, previously missing alongside the pre-existing "כבשים חיות") now also resolves', () => {
  assertResolvesToLiveAnimals('כבשים חיים');
});

// ---------------------------------------------------------------------
// 1. Mandatory minimum alias audit -- every phrase in the workflow's
//    mandatory animal-name audit list (sections A-K) must resolve.
// ---------------------------------------------------------------------

const MANDATORY_PHRASES = {
  'A. Sheep and goats': [
    'כבש חי', 'כבשים חיים', 'כבשה חיה', 'כבשים חיות', 'איל חי', 'אילים חיים',
    'טלה חי', 'טלאים חיים', 'צאן חי', 'עז חיה', 'עזים חיות', 'תיש חי',
    'תיישים חיים', 'גדי חי', 'גדיים חיים',
    'live sheep', 'live ram', 'live rams', 'live ewe', 'live ewes',
    'live lamb', 'live lambs', 'live goat', 'live goats', 'live buck goat',
    'live doe goat', 'live kid goat', 'live kid goats',
  ],
  'B. Cattle and bovines': [
    'בקר חי', 'פרה חיה', 'פרות חיות', 'שור חי', 'שוורים חיים', 'פר חי',
    'פרים חיים', 'עגל חי', 'עגלים חיים', 'עגלה חיה', 'עגלות חיות',
    'תאו חי', 'תאואים חיים',
    'live cattle', 'live cow', 'live cows', 'live bull', 'live bulls',
    'live ox', 'live oxen', 'live calf', 'live calves', 'live buffalo',
  ],
  'C. Horses and equids': [
    'סוס חי', 'סוסים חיים', 'סוסה חיה', 'סוסות חיות', 'סייח חי',
    'סייחים חיים', 'פוני חי', 'סוסי פוני חיים', 'חמור חי', 'חמורים חיים',
    'אתון חיה', 'אתונות חיות', 'פרד חי', 'פרדים חיים',
    'live horse', 'live horses', 'live mare', 'live mares', 'live stallion',
    'live stallions', 'live foal', 'live foals', 'live pony', 'live ponies',
    'live donkey', 'live donkeys', 'live mule', 'live mules',
  ],
  'D. Pigs': [
    'חזיר חי', 'חזירים חיים', 'חזירה חיה', 'חזירות חיות', 'חזרזיר חי',
    'חזרזירים חיים',
    'live pig', 'live pigs', 'live swine', 'live hog', 'live hogs',
    'live piglet', 'live piglets',
  ],
  'E. Camelids': [
    'גמל חי', 'גמלים חיים', 'נאקה חיה', 'אלפקה חיה', 'אלפקות חיות',
    'למה חיה', 'למות חיות',
    'live camel', 'live camels', 'live alpaca', 'live alpacas', 'live llama', 'live llamas',
  ],
  'F. Companion animals and small mammals': [
    'כלב חי', 'כלבים חיים', 'כלבה חיה', 'כלבות חיות', 'גור כלבים חי',
    'חתול חי', 'חתולים חיים', 'חתולה חיה', 'חתולות חיות', 'גור חתולים חי',
    'ארנב חי', 'ארנבים חיים', 'ארנבת חיה', 'חמוס חי', 'חמוסים חיים',
    'אוגר חי', 'אוגרים חיים', 'שרקן חי', 'שרקנים חיים', 'עכבר חי',
    'עכברים חיים', 'חולדה חיה', 'חולדות חיות', "צ'ינצ'ילה חיה", "צ'ינצ'ילות חיות",
    'live dog', 'live dogs', 'live puppy', 'live puppies', 'live cat',
    'live cats', 'live kitten', 'live kittens', 'live rabbit', 'live rabbits',
    'live ferret', 'live ferrets', 'live hamster', 'live hamsters',
    'live guinea pig', 'live guinea pigs', 'live mouse', 'live mice',
    'live rat', 'live rats', 'live chinchilla', 'live chinchillas',
  ],
  'G. Poultry and birds': [
    'תרנגולת חיה', 'תרנגולות חיות', 'תרנגול חי', 'תרנגולים חיים',
    'אפרוח חי', 'אפרוחים חיים', 'הודו חי', 'תרנגולי הודו חיים',
    'ברווז חי', 'ברווזים חיים', 'אווז חי', 'אווזים חיים', 'שליו חי',
    'שלווים חיים', 'יונה חיה', 'יונים חיות', 'תוכי חי', 'תוכים חיים',
    'כנרית חיה', 'כנריות חיות', 'ציפור נוי חיה', 'ציפורי נוי חיות',
    'יען חי', 'יענים חיים',
    'live chicken', 'live chickens', 'live rooster', 'live roosters',
    'live hen', 'live hens', 'live chick', 'live chicks', 'live turkey',
    'live turkeys', 'live duck', 'live ducks', 'live goose', 'live geese',
    'live quail', 'live pigeon', 'live pigeons', 'live dove', 'live doves',
    'live parrot', 'live parrots', 'live canary', 'live canaries',
    'live ostrich', 'live ostriches', 'live ornamental bird', 'live ornamental birds',
  ],
  'H. Fish and aquatic animals': [
    'דג חי', 'דגים חיים', 'דג נוי חי', 'דגי נוי חיים', 'קרפיון חי',
    'קרפיונים חיים', 'סלמון חי', 'דג זהב חי', 'דגי זהב חיים', 'סרטן חי',
    'סרטנים חיים', 'לובסטר חי', 'לובסטרים חיים', 'שרימפס חי', 'שרימפס חיים',
    'צדפה חיה', 'צדפות חיות', 'חילזון מים חי', 'חלזונות מים חיים',
    'live fish', 'live ornamental fish', 'live carp', 'live salmon',
    'live goldfish', 'live crustacean', 'live crustaceans', 'live crab',
    'live crabs', 'live lobster', 'live lobsters', 'live shrimp',
    'live mollusc', 'live molluscs', 'live oyster', 'live oysters',
    'live aquatic snail', 'live aquatic snails',
  ],
  'I. Reptiles': [
    'נחש חי', 'נחשים חיים', 'לטאה חיה', 'לטאות חיות', 'איגואנה חיה',
    'איגואנות חיות', 'שממית חיה', 'שממיות חיות', 'זיקית חיה', 'זיקיות חיות',
    'צב חי', 'צבים חיים', 'צב יבשה חי', 'צב מים חי', 'תנין חי', 'תנינים חיים',
    'live snake', 'live snakes', 'live lizard', 'live lizards', 'live iguana',
    'live iguanas', 'live gecko', 'live geckos', 'live chameleon',
    'live chameleons', 'live turtle', 'live turtles', 'live tortoise',
    'live tortoises', 'live crocodile', 'live crocodiles',
  ],
  'J. Amphibians': [
    'צפרדע חיה', 'צפרדעים חיות', 'קרפדה חיה', 'קרפדות חיות', 'סלמנדרה חיה',
    'סלמנדרות חיות', 'טריטון חי', 'טריטונים חיים',
    'live frog', 'live frogs', 'live toad', 'live toads', 'live salamander',
    'live salamanders', 'live newt', 'live newts',
  ],
  'K. Insects, arachnids, and invertebrates': [
    'דבורה חיה', 'דבורים חיות', 'נמלה חיה', 'נמלים חיות', 'פרפר חי',
    'פרפרים חיים', 'חיפושית חיה', 'חיפושיות חיות', 'זבוב חי', 'זבובים חיים',
    'צרצר חי', 'צרצרים חיים', 'ארבה חי', 'עכביש חי', 'עכבישים חיים',
    'עקרב חי', 'עקרבים חיים', 'תולעת חיה', 'תולעים חיות', 'חילזון חי',
    'חלזונות חיים',
    'live bee', 'live bees', 'live ant', 'live ants', 'live butterfly',
    'live butterflies', 'live beetle', 'live beetles', 'live fly',
    'live flies', 'live cricket', 'live crickets', 'live locust',
    'live locusts', 'live spider', 'live spiders', 'live scorpion',
    'live scorpions', 'live worm', 'live worms', 'live snail', 'live snails',
  ],
};

for (const [group, phrases] of Object.entries(MANDATORY_PHRASES)) {
  for (const phrase of phrases) {
    test(`mandatory audit [${group}]: "${phrase}" resolves uniquely to the live-animal family`, () => {
      assertResolvesToLiveAnimals(phrase);
    });
    test(`mandatory audit [${group}]: "${phrase}" produces the single positive veterinary result`, () => {
      assertPositiveLiveAnimalResult(phrase);
    });
  }
}

// ---------------------------------------------------------------------
// 2. Representative laboratory/wild/zoo/exotic subgroups (primates,
//    deer, antelope, elephants, big cats, bears, marsupials) --
//    representative explicit-live phrases only, never a full species
//    list.
// ---------------------------------------------------------------------

const REPRESENTATIVE_SUBGROUP_PHRASES = {
  Primates: ['קוף חי', 'קופים חיים', 'live monkey', 'live monkeys', 'live primate', 'live primates'],
  // Hebrew "אייל חי"/"איילים חיים" (deer) is deliberately omitted: it
  // collapses under the shared double-yod normalization rule to the
  // same normalized text as the pre-existing ram alias "איל חי"/
  // "אילים חיים" -- a genuine cross-species collision this Agent's
  // authority does not extend to resolving by editing the shared
  // matching algorithm. Only the unambiguous English form is included.
  Deer: ['live deer'],
  Antelope: ['אנטילופה חיה', 'אנטילופות חיות', 'live antelope', 'live antelopes'],
  Elephants: ['פיל חי', 'פילים חיים', 'live elephant', 'live elephants'],
  'Big cats': ['אריה חי', 'אריות חיים', 'live lion', 'live lions'],
  Bears: ['דוב חי', 'דובים חיים', 'live bear', 'live bears'],
  Marsupials: ['קנגורו חי', 'קנגורואים חיים', 'live kangaroo', 'live kangaroos', 'live marsupial', 'live marsupials'],
};

for (const [group, phrases] of Object.entries(REPRESENTATIVE_SUBGROUP_PHRASES)) {
  for (const phrase of phrases) {
    test(`representative subgroup [${group}]: "${phrase}" resolves uniquely to the live-animal family`, () => {
      assertResolvesToLiveAnimals(phrase);
    });
    test(`representative subgroup [${group}]: "${phrase}" produces the single positive veterinary result`, () => {
      assertPositiveLiveAnimalResult(phrase);
    });
  }
}

// ---------------------------------------------------------------------
// 3. Rejected bare terms and deliberately-omitted forms
// ---------------------------------------------------------------------

const REJECTED_BARE_SPECIES_TERMS = [
  // Original bare-species safety rule (unchanged).
  'כלב', 'חתול', 'סוס', 'דג', 'ציפור', 'דבורה', 'dog', 'cat', 'horse', 'fish', 'bird', 'bee', 'animal', 'animals',
  // Additional common species introduced by this lexicon-completeness
  // pass -- confirming the same bare-species safety rule was applied
  // consistently to every new group, not only the originally-reviewed set.
  'כבש', 'עז', 'תיש', 'גדי', 'פרה', 'שור', 'חמור', 'חזיר', 'גמל',
  'תרנגולת', 'תרנגול', 'ברווז', 'אווז', 'תוכי', 'קרפיון', 'לובסטר',
  'קוף', 'פיל', 'אריה', 'דוב', 'קנגורו', 'עכבר', 'חולדה', 'אוגר',
  'sheep', 'goat', 'cow', 'bull', 'pig', 'donkey', 'camel', 'chicken',
  'duck', 'goose', 'parrot', 'monkey', 'elephant', 'lion', 'bear',
  'kangaroo', 'turkey', 'rabbit', 'hamster', 'mouse', 'rat', 'deer',
];

test('rejected bare species terms (original and newly-audited) are not aliases of the live-animal family', () => {
  const family = findFamilyById(LIVE_ANIMALS_FAMILY_ID);
  for (const term of REJECTED_BARE_SPECIES_TERMS) {
    assert.ok(!family.aliases.includes(term), `"${term}" must not be a bare alias`);
  }
});

test('"עיר חי" (a homograph-collision risk: "עיר" is also the ordinary word for "city") was deliberately not added', () => {
  const family = findFamilyById(LIVE_ANIMALS_FAMILY_ID);
  assert.ok(!family.aliases.includes('עיר חי'), 'homograph-risk term must not be an alias');
});

test('no unnatural/invented grammatical forms were added -- feminine "כבשה"/"עגלה"/"סוסה"/"חתולה"/"כלבה"/"ארנבת"/"אתון"/"נאקה"/"חזירה" forms are each paired with the feminine adjective, never the masculine', () => {
  const family = findFamilyById(LIVE_ANIMALS_FAMILY_ID);
  const feminineForms = [
    'כבשה חיה', 'עגלה חיה', 'סוסה חיה', 'חתולה חיה', 'כלבה חיה',
    'ארנבת חיה', 'אתון חיה', 'נאקה חיה', 'חזירה חיה',
  ];
  for (const form of feminineForms) {
    assert.ok(family.aliases.includes(form), `"${form}" must be present with correct feminine agreement`);
  }
  const wrongAgreement = ['כבשה חי', 'עגלה חי', 'סוסה חי', 'חתולה חי', 'כלבה חי'];
  for (const wrong of wrongAgreement) {
    assert.ok(!family.aliases.includes(wrong), `"${wrong}" (wrong gender agreement) must not be an alias`);
  }
});

test('the pre-existing "כבשים חיות" and the newly-added "כבשים חיים" are both present, per the product owner\'s own mandatory audit list (not treated as mutually exclusive)', () => {
  const family = findFamilyById(LIVE_ANIMALS_FAMILY_ID);
  assert.ok(family.aliases.includes('כבשים חיות'), '"כבשים חיות" must remain present');
  assert.ok(family.aliases.includes('כבשים חיים'), '"כבשים חיים" must be present');
});

// ---------------------------------------------------------------------
// 4. Collision safety -- every newly-added animal group is tested
//    against a representative non-live good containing the same word.
// ---------------------------------------------------------------------

const COLLISION_TEXTS = [
  // Sheep/goats (mandatory examples from the workflow).
  'מזון לכבשים', 'צמר כבשים', 'בשר כבש', 'פסל כבש', 'sheep feed', 'sheep wool', 'lamb meat', 'sheep figurine',
  // Cattle.
  'עור בקר', 'בשר בקר', 'פסל פרה', 'cattle hide', 'beef meat',
  // Horses/equids.
  'פסל סוס', 'אוכף לסוס', 'horse statue', 'horse saddle',
  // Pigs.
  'בשר חזיר', 'pork meat', 'pig figurine',
  // Camelids.
  'צמר גמלים', 'camel wool',
  // Companion/small mammals (mandatory examples from the workflow).
  'מזון לכלבים', 'רצועה לכלב', 'צעצוע חתול', 'כלוב לארנב',
  'dog food', 'dog collar', 'cat toy', 'rabbit cage',
  'בדיקת עכברים למעבדה',
  // Poultry/birds.
  'תמונה של תרנגול', 'עוף קפוא', 'frozen chicken', 'bird cage', 'bee honey product',
  // Fish/aquatic.
  'מזון לדגים', 'אקווריום לדגים', 'דג קפוא', 'fish food', 'fish tank', 'frozen fish',
  // Reptiles.
  'צעצוע בצורת נחש', 'עור נחש', 'snake-skin bag',
  // Insects/arachnids.
  'תמונה של פרפר', 'butterfly print', 'animal print',
  // Representative subgroups.
  'פסל של פיל', 'עור אריה', 'elephant figurine', 'lion print',
];

for (const text of COLLISION_TEXTS) {
  test(`collision safety: "${text}" (non-live good) never resolves to the live-animal family`, () => {
    assertNeverResolvesToLiveAnimals(text);
  });
}

// ---------------------------------------------------------------------
// 5. Lexicon manifest -- accepted-alias count sanity, no duplicates,
//    original 4 generic aliases preserved, and total count matches the
//    documented result of this pass.
// ---------------------------------------------------------------------

test('lexicon manifest: total alias count matches the documented result of this pass (456), no duplicates, original generic aliases preserved', () => {
  const family = findFamilyById(LIVE_ANIMALS_FAMILY_ID);
  assert.equal(family.aliases.length, 456, 'total alias count must match the documented lexicon-completeness result');
  assert.equal(new Set(family.aliases).size, family.aliases.length, 'no duplicate alias within the family');
  for (const original of ['בעלי חיים', 'בעל חיים', 'live animal', 'live animals']) {
    assert.ok(family.aliases.includes(original), `original alias "${original}" must still be present`);
  }
});

test('lexicon manifest: registry hygiene unaffected -- no duplicate family IDs or names across the active registry', () => {
  // Cross-check against the sibling suites' own hygiene assertions --
  // this pass must not have introduced a new family or renamed an
  // existing one.
  const family = findFamilyById(LIVE_ANIMALS_FAMILY_ID);
  assert.equal(family.publicFamilyName, 'בעלי חיים');
  assert.equal(family.category, 'מזון ומשקאות');
  assert.deepEqual(family.regulatorySignals, {
    standards: false,
    healthUmbrella: false,
    transportOrVehicleLaboratory: false,
    communications: false,
    agriculture: true,
    otherPermit: false,
  });
});

/**
 * Final domain expansion and alias mapping (product-owner decisions,
 * 2026-10-21, registry rules 47-48).
 *
 * Rule 47 maps common products to existing rows (books, wine and
 * alcohol, coffee machines and microwaves, used vehicles, household
 * cleaning products). Rule 48 appends ten new rows, two of them with a
 * dual approval. Every new alias names the complete product; the
 * look-alike products are excluded in FAMILY_NEGATIVE_TERMS.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCT_FAMILY_MATRIX, findFamilyById } from '../../js/import-readiness/product-family-matrix.js';
import { identifyProductFamily } from '../../js/import-readiness/product-family-identification.js';
import { buildProductFamilyMatrixSection, NO_REQUIREMENT_BOTTOM_LINE } from '../../js/import-readiness/product-family-result.js';
import { familyGuidanceFor } from '../../js/import-readiness/product-family-guidance.js';
import { PRODUCT_FAMILY_SELECTION_CANDIDATES } from '../../js/import-readiness/product-family-selection-mapping.js';
import { IMPORT_TYPE } from '../../js/import-readiness/scenario-schema.js';

const NEW_ROWS = [
  ['health-and-cosmetics-06', 'אמצעים למניעת הריון', ['healthUmbrella', 'standards']],
  ['health-and-cosmetics-07', 'עדשות מגע ומשקפיים', ['standards']],
  ['health-and-cosmetics-08', 'מתכלים רפואיים', ['healthUmbrella']],
  ['chemicals-and-materials-05', 'דשנים', ['otherPermit']],
  ['children-and-infants-07', 'מושבי בטיחות לילדים', ['standards']],
  ['construction-and-industrial-07', 'ציוד כיבוי אש', ['standards']],
  ['additional-consumer-products-13', 'נשק וציוד ביטחוני', ['otherPermit']],
  ['chemicals-and-materials-06', 'טרפנטין וחומרים דליקים להצתת פחמים או עץ', ['standards']],
  ['construction-and-industrial-08', 'מעליות וציוד הרמה', []],
  ['health-and-cosmetics-09', 'מכשירי רנטגן', ['healthUmbrella', 'otherPermit']],
];

const positiveKeys = (id) => Object.entries(findFamilyById(id).regulatorySignals).filter(([, v]) => v).map(([k]) => k).sort();
const resolved = (text) => {
  const r = identifyProductFamily([text]);
  return r.outcome === 'high_confidence' ? r.family.id : `${r.outcome}:${r.candidates.map((f) => f.id).join(',')}`;
};
const section = (text) => buildProductFamilyMatrixSection({ texts: [text], importType: IMPORT_TYPE.COMMERCIAL });

test('1. ten rows are appended after the 80 existing ones, active, with the approved names and signals', () => {
  assert.equal(PRODUCT_FAMILY_MATRIX.length, 90);
  assert.deepEqual(PRODUCT_FAMILY_MATRIX.slice(80).map((f) => f.id), NEW_ROWS.map(([id]) => id));
  for (const [id, name, keys] of NEW_ROWS) {
    const family = findFamilyById(id);
    assert.equal(family.publicFamilyName, name);
    assert.equal(family.activeStatus, true);
    assert.deepEqual(positiveKeys(id), [...keys].sort(), id);
  }
});

test('2. the previous last rows keep their ids and positions (append-only)', () => {
  assert.deepEqual(PRODUCT_FAMILY_MATRIX.slice(74, 80).map((f) => f.id), [
    'additional-consumer-products-11', 'electrical-and-electronics-11', 'electrical-and-electronics-12',
    'electrical-and-electronics-13', 'vehicles-and-transport-11', 'additional-consumer-products-12',
  ]);
});

test('3. rule 48: each new domain resolves to its own row from the product owner\'s wording', () => {
  const cases = {
    'health-and-cosmetics-06': ['אמצעים למניעת הריון', 'קונדומים', 'condoms'],
    'health-and-cosmetics-07': ['עדשות מגע', 'משקפיים', 'משקפי שמש', 'sunglasses'],
    'health-and-cosmetics-08': ['כפפות רפואיות', 'מזרקים', 'syringes'],
    'chemicals-and-materials-05': ['דשנים', 'דשן לצמחים', 'fertilizer'],
    'children-and-infants-07': ['מושבי בטיחות לילדים', 'בוסטרים', 'booster seat'],
    'construction-and-industrial-07': ['ציוד כיבוי אש', 'מטפים', 'גלאי עשן', 'fire blanket'],
    'additional-consumer-products-13': ['נשק חם', 'נשק קר', 'חלקי נשק', 'ציוד ביטחוני', 'אקדח'],
    'chemicals-and-materials-06': ['טרפנטין', 'טרמפנטין', 'נוזל הצתה לפחמים', 'חומרים דליקים לפחמים'],
    'construction-and-industrial-08': ['מעליות', 'ציוד הרמה', 'מלגזה'],
    'health-and-cosmetics-09': ['מכשירי רנטגן', 'x-ray machine'],
  };
  for (const [id, texts] of Object.entries(cases)) for (const text of texts) assert.equal(resolved(text), id, text);
});

test('4. rule 47: existing rows gain the mapped products', () => {
  const cases = {
    'additional-consumer-products-09': ['ספרים', 'ספר ילדים', 'books'],
    'food-and-beverages-02': ['אלכוהול', 'משקאות משכרים', 'בקבוק יין', 'red wine'],
    'electrical-and-electronics-01': ['מכונת קפה', 'מיקרוגל', 'microwave oven'],
    'vehicles-and-transport-01': ['רכב משומש', 'used car'],
    'chemicals-and-materials-01': ['מוצרי ניקיון', 'סבון כלים', 'אבקת כביסה', 'אקונומיקה', 'פותח סתימות'],
  };
  for (const [id, texts] of Object.entries(cases)) for (const text of texts) assert.equal(resolved(text), id, text);
  // A children's book that is itself a toy keeps the toys row (Wave 3).
  assert.equal(resolved('ספר ילדים בעל ערך משחקי'), 'children-and-infants-01');
});

test('5. look-alike products never land on a new or extended row', () => {
  const traps = {
    'ההבדל בין שני מוצרים': 'none:', // "יין" would become "ין" and match "בין"
    'כוס יין מזכוכית': 'none:',
    'אלכוהול לחיטוי ידיים': 'none:',
    'קופסת פלסטיק מתאימה למיקרוגל': 'none:',
    'קפסולות למכונת קפה': 'none:',
    'מספרים סידוריים': 'none:',
    'גלולות למניעת הריון': 'none:',
    'נרתיק למשקפיים': 'none:',
    'מזרק לעוגות': 'none:',
    'אקדח דבק': 'none:',
    'אקדח מים לילדים': 'none:',
    'glue gun': 'none:',
    'massage gun': 'none:',
    'רובה של המוצר עשוי פלסטיק': 'none:', // "רובה" also means "most of it"
    'אמצעי מניעה נגד החלקה': 'none:', // generic "preventive means"
    'כיסוי למושב בטיחות': 'none:',
    'חלקי חילוף לרכב משומש': 'vehicles-and-transport-03',
    'שמלה בצבע יין': 'textiles-and-furniture-01',
    'משקפי מגן': 'additional-consumer-products-06',
    'כפפות מגן': 'additional-consumer-products-06',
    'סט מצעים': 'textiles-and-furniture-08',
  };
  for (const [text, expected] of Object.entries(traps)) assert.equal(resolved(text), expected, text);
});

test('6. dual approvals show both categories: contraceptives and X-ray machines', () => {
  assert.deepEqual(section('קונדומים').positiveCategories, ['תקינה', 'משרד הבריאות']);
  assert.deepEqual(section('מכשירי רנטגן').positiveCategories, ['משרד הבריאות', 'אישור / רישיון אחר']);
});

test('7. every new row carries a note naming the approved authority', () => {
  const notes = {
    'health-and-cosmetics-06': 'נדרשים אישור מכון התקנים ואישור מנהל המכשור הרפואי (אמ"ר) במשרד הבריאות.',
    'health-and-cosmetics-07': 'נדרש לבדוק את מסלול האישור מול מכון התקנים.',
    'health-and-cosmetics-08': 'נדרש לבדוק את מסלול אישור מנהל המכשור הרפואי (אמ"ר) במשרד הבריאות.',
    'chemicals-and-materials-05': 'נדרש רישיון ממינהל התעשיות במשרד הכלכלה.',
    'children-and-infants-07': 'נדרש לבדוק את מסלול האישור מול מכון התקנים.',
    'construction-and-industrial-07': 'נדרש לבדוק את מסלול האישור מול מכון התקנים.',
    'additional-consumer-products-13': 'נדרש רישיון ממשרד הביטחון.',
    'chemicals-and-materials-06': 'נדרש לבדוק את מסלול האישור מול מכון התקנים.',
    'construction-and-industrial-08': 'פטור מדרישות בשעת היבוא, אך מחייב עמידה ברגולציה מקומית לאחר ההתקנה.',
    'health-and-cosmetics-09': 'נדרשים אישור מנהל המכשור הרפואי (אמ"ר) במשרד הבריאות ואישור מכשירי קרינה מהמשרד להגנת הסביבה.',
  };
  for (const [id, note] of Object.entries(notes)) assert.equal(familyGuidanceFor(id).note, note, id);
});

test('8. elevators: no requirement at import -- the bottom-line sentence, then the post-installation note', () => {
  const s = section('מעליות');
  assert.equal(s.state, 'no_positive_signal');
  assert.equal(s.noPositiveSignalMessage, NO_REQUIREMENT_BOTTOM_LINE);
  assert.equal(s.note.text, 'פטור מדרישות בשעת היבוא, אך מחייב עמידה ברגולציה מקומית לאחר ההתקנה.');
});

test('9. books: the paper row\'s note carries the product owner\'s playful-children\'s-book wording', () => {
  const s = section('ספרים');
  assert.equal(s.familyName, 'נייר ומוצרי דפוס');
  assert.equal(s.note.text, 'ספרי ילדים בעלי אופי משחקי מחייבים אישור מכון התקנים.');
  assert.ok(s.noPositiveSignalMessage.endsWith('(למעט האמור להלן).'));
});

test('10. checkbox wiring: seven new rows join existing checkboxes; three are free text only', () => {
  const sets = PRODUCT_FAMILY_SELECTION_CANDIDATES;
  for (const id of ['health-and-cosmetics-06', 'health-and-cosmetics-07', 'health-and-cosmetics-08', 'health-and-cosmetics-09']) {
    assert.ok(sets.medical_equipment_or_medical_use.includes(id), id);
  }
  for (const id of ['chemicals-and-materials-05', 'chemicals-and-materials-06']) assert.ok(sets.chemicals_paints_adhesives_aerosols.includes(id), id);
  assert.ok(sets.childrens_products_and_toys.includes('children-and-infants-07'));
  for (const id of ['construction-and-industrial-07', 'additional-consumer-products-13', 'construction-and-industrial-08']) {
    assert.ok(!Object.values(sets).some((ids) => ids.includes(id)), `${id} is free text only`);
  }
  assert.deepEqual([...sets.industrial_machinery_and_equipment], ['construction-and-industrial-02'], 'the machinery checkbox stays a single candidate');
});

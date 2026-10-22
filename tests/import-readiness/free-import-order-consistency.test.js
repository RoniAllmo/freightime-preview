/**
 * Free Import Order consistency audit (registry rule 49, product-owner
 * decision 2026-10-22).
 *
 * - Industrial chemicals and hazardous materials: "other permit"
 *   direction and the poisons-permit note, never the bottom-line
 *   "no approval at import" sentence.
 * - Perfume: Ministry of Health direction, never the bottom line.
 * - Licence families: a note that says "רישיון יבוא" and names the
 *   issuing authority; agricultural produce says "היתר יבוא" (Plant
 *   Protection Services permit). Their matrix signals are unchanged.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductFamilyMatrixSection, NO_REQUIREMENT_BOTTOM_LINE } from '../../js/import-readiness/product-family-result.js';
import { PRODUCT_FAMILY_MATRIX } from '../../js/import-readiness/product-family-matrix.js';
import { familyGuidanceFor } from '../../js/import-readiness/product-family-guidance.js';
import { IMPORT_TYPE } from '../../js/import-readiness/scenario-schema.js';

const IMPORT_TYPES = [IMPORT_TYPE.COMMERCIAL, IMPORT_TYPE.PERSONAL];
const family = (id) => PRODUCT_FAMILY_MATRIX.find((f) => f.id === id);
const positiveKeys = (id) => Object.entries(family(id).regulatorySignals).filter(([, v]) => v === true).map(([k]) => k);
const sectionFor = (id, importType) => buildProductFamilyMatrixSection({ texts: [family(id).publicFamilyName], importType });

const LICENCE_NOTES = Object.freeze({
  'health-and-cosmetics-04': 'נדרש רישיון יבוא מאגף הרוקחות במשרד הבריאות.',
  'vehicles-and-transport-01': 'נדרש רישיון יבוא ממשרד התחבורה.',
  'vehicles-and-transport-02': 'נדרש רישיון יבוא ממשרד התחבורה.',
});
const PERMIT_NOTES = Object.freeze({
  'food-and-beverages-05': 'נדרש היתר יבוא מהשירותים להגנת הצומח ולביקורת במשרד החקלאות.',
});

test('1. industrial chemicals: "other permit" direction and the exact poisons-permit note, on both routes', () => {
  assert.deepEqual(positiveKeys('chemicals-and-materials-04'), ['otherPermit']);
  assert.equal(familyGuidanceFor('chemicals-and-materials-04').note, 'נדרש היתר רעלים מהמשרד להגנת הסביבה.');
  for (const text of ['כימיקלים תעשייתיים וחומרים מסוכנים', 'כימיקל תעשייתי', 'industrial chemical']) {
    for (const importType of IMPORT_TYPES) {
      const s = buildProductFamilyMatrixSection({ texts: [text], importType });
      assert.equal(s.state, 'positive', `${text} (${importType})`);
      assert.deepEqual(s.positiveCategories, ['אישור / רישיון אחר'], `${text} (${importType})`);
      assert.equal(s.note.text, 'נדרש היתר רעלים מהמשרד להגנת הסביבה.', `${text} (${importType})`);
      assert.notEqual(s.noPositiveSignalMessage, NO_REQUIREMENT_BOTTOM_LINE, `${text} (${importType})`);
    }
  }
});

test('2. perfume: Ministry of Health direction, never the bottom-line sentence; cosmetics stay a separate family', () => {
  assert.deepEqual(positiveKeys('health-and-cosmetics-05'), ['healthUmbrella']);
  for (const text of ['בשמים', 'בושם']) {
    for (const importType of IMPORT_TYPES) {
      const s = buildProductFamilyMatrixSection({ texts: [text], importType });
      assert.equal(s.familyName, 'בשמים', `${text} (${importType})`);
      assert.equal(s.state, 'positive', `${text} (${importType})`);
      assert.deepEqual(s.positiveCategories, ['משרד הבריאות'], `${text} (${importType})`);
      assert.notEqual(s.noPositiveSignalMessage, NO_REQUIREMENT_BOTTOM_LINE, `${text} (${importType})`);
    }
  }
});

test('3. licence and permit families: the exact "רישיון יבוא" / "היתר יבוא" note on both routes, with their signals unchanged', () => {
  const expectedSignals = {
    'health-and-cosmetics-04': ['healthUmbrella'],
    'vehicles-and-transport-01': ['transportOrVehicleLaboratory'],
    'vehicles-and-transport-02': ['transportOrVehicleLaboratory'],
    'food-and-beverages-05': ['healthUmbrella', 'agriculture'],
  };
  for (const [id, note] of Object.entries({ ...LICENCE_NOTES, ...PERMIT_NOTES })) {
    assert.ok(note.includes(id in PERMIT_NOTES ? 'היתר יבוא' : 'רישיון יבוא'), id);
    assert.equal(familyGuidanceFor(id).note, note, id);
    assert.deepEqual(positiveKeys(id), expectedSignals[id], id);
    for (const importType of IMPORT_TYPES) {
      const s = sectionFor(id, importType);
      assert.equal(s.state, 'positive', `${id} (${importType})`);
      assert.equal(s.note.text, note, `${id} (${importType})`);
    }
  }
});

test('4. "רישיון יבוא" appears only in the licence-family notes and the conditional toy warning', () => {
  const withTerm = PRODUCT_FAMILY_MATRIX
    .filter((f) => familyGuidanceFor(f.id) && (familyGuidanceFor(f.id).note || '').includes('רישיון יבוא'))
    .map((f) => f.id)
    .sort();
  assert.deepEqual(withTerm, [...Object.keys(LICENCE_NOTES), 'children-and-infants-01'].sort());
});

test('5. agricultural produce names an import permit ("היתר יבוא"), never an import licence', () => {
  const note = familyGuidanceFor('food-and-beverages-05').note;
  assert.ok(note.includes('היתר יבוא'));
  assert.ok(!note.includes('רישיון'));
});

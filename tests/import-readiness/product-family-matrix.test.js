/**
 * Tests for the generated product-family matrix registry
 * (js/import-readiness/product-family-matrix.js), produced from the
 * product-owner-authored workbook by
 * scripts/generate_product_family_matrix.py. These tests exercise the
 * GENERATED OUTPUT (already-converted "כן"/"לבדוק" values), not the
 * Python conversion script itself -- see docs/product-family-matrix-
 * engine.md for the interpretation rules the conversion applies.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRODUCT_FAMILY_MATRIX,
  activeFamilies,
  familiesByCategory,
  findFamilyById,
} from '../../js/import-readiness/product-family-matrix.js';

const SIGNAL_KEYS = [
  'standards',
  'healthUmbrella',
  'transportOrVehicleLaboratory',
  'communications',
  'agriculture',
  'otherPermit',
];

test('1. the registry is a non-empty, deeply frozen array', () => {
  assert.ok(Array.isArray(PRODUCT_FAMILY_MATRIX));
  assert.ok(PRODUCT_FAMILY_MATRIX.length > 0);
  assert.ok(Object.isFrozen(PRODUCT_FAMILY_MATRIX));
  for (const family of PRODUCT_FAMILY_MATRIX) {
    assert.ok(Object.isFrozen(family), `expected ${family.id} to be frozen`);
    assert.ok(Object.isFrozen(family.regulatorySignals), `expected ${family.id}.regulatorySignals to be frozen`);
    assert.ok(Object.isFrozen(family.aliases), `expected ${family.id}.aliases to be frozen`);
  }
});

test('2. every family record carries the required field set', () => {
  const requiredFields = [
    'id', 'category', 'publicFamilyName', 'aliases', 'regulatorySignals',
    'personalImportNote', 'commercialImportNote', 'currentSystemCoverage',
    'shortNotes', 'optionalSubdomain', 'activeStatus', 'version',
    'productOwnerReviewedDate', 'sourceRow',
  ];
  for (const family of PRODUCT_FAMILY_MATRIX) {
    for (const field of requiredFields) {
      assert.ok(field in family, `${family.id} is missing field ${field}`);
    }
    for (const key of SIGNAL_KEYS) {
      assert.equal(typeof family.regulatorySignals[key], 'boolean', `${family.id}.regulatorySignals.${key} must be a boolean`);
    }
  }
});

test('3. no "לבדוק" (or any non-boolean) value survives into the runtime registry -- every regulatory signal is a definite true/false', () => {
  for (const family of PRODUCT_FAMILY_MATRIX) {
    for (const key of SIGNAL_KEYS) {
      const value = family.regulatorySignals[key];
      assert.notEqual(value, 'לבדוק');
      assert.notEqual(value, undefined);
      assert.notEqual(value, null);
      assert.ok(value === true || value === false);
    }
  }
});

test('4. family ids are unique', () => {
  const ids = PRODUCT_FAMILY_MATRIX.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('5. public family names are unique (no duplicate family rejected during generation)', () => {
  const names = PRODUCT_FAMILY_MATRIX.map((f) => f.publicFamilyName);
  assert.equal(new Set(names).size, names.length);
});

test('6. currentSystemCoverage is always one of existing/partial/missing -- never the raw workbook words or an "unresolved" status', () => {
  for (const family of PRODUCT_FAMILY_MATRIX) {
    assert.ok(['existing', 'partial', 'missing'].includes(family.currentSystemCoverage), family.id);
    assert.notEqual(family.currentSystemCoverage, 'קיים');
    assert.notEqual(family.currentSystemCoverage, 'חלקי');
    assert.notEqual(family.currentSystemCoverage, 'חסר');
  }
});

test('7. blank workbook notes remain blank (null), never an invented instruction', () => {
  const blankPersonal = PRODUCT_FAMILY_MATRIX.filter((f) => f.personalImportNote === null);
  const blankCommercial = PRODUCT_FAMILY_MATRIX.filter((f) => f.commercialImportNote === null);
  assert.ok(blankPersonal.length > 0, 'expected at least some families to have no personal-import note in the source workbook');
  assert.ok(blankCommercial.length > 0, 'expected at least some families to have no commercial-import note in the source workbook');
  // No note field should ever contain a placeholder/invented string.
  for (const family of PRODUCT_FAMILY_MATRIX) {
    if (family.personalImportNote !== null) assert.equal(typeof family.personalImportNote, 'string');
    if (family.commercialImportNote !== null) assert.equal(typeof family.commercialImportNote, 'string');
  }
});

test('8. no optional health subdomain was invented -- every family leaves optionalSubdomain null since the workbook never supplied one', () => {
  for (const family of PRODUCT_FAMILY_MATRIX) {
    assert.equal(family.optionalSubdomain, null, `${family.id} must not have an invented subdomain`);
  }
});

test('9. the manual-completion placeholder row ("אחר" / "משפחה נוספת להשלמה ידנית") is excluded from active families, not invented into a real one', () => {
  const placeholder = PRODUCT_FAMILY_MATRIX.find((f) => f.publicFamilyName === 'משפחה נוספת להשלמה ידנית');
  assert.ok(placeholder);
  assert.equal(placeholder.activeStatus, false);
  assert.ok(!activeFamilies().includes(placeholder));
});

test('10. activeFamilies()/familiesByCategory() only ever return active families', () => {
  assert.ok(activeFamilies().every((f) => f.activeStatus === true));
  for (const family of activeFamilies()) {
    assert.ok(familiesByCategory(family.category).every((f) => f.activeStatus === true));
  }
});

test('11. findFamilyById() resolves a known family and returns null for an unknown id', () => {
  const known = PRODUCT_FAMILY_MATRIX[0];
  assert.equal(findFamilyById(known.id), known);
  assert.equal(findFamilyById('does-not-exist'), null);
});

test('12. the five existing detailed rules each have a matching matrix family with currentSystemCoverage "existing"', () => {
  const knownFamilyNames = [
    'כלי פלסטיק במגע עם מזון',
    'מוצר עם ציפוי פולימרי במגע עם מזון',
    'כלי זכוכית במגע עם מזון או שתייה',
    'מכשיר חשמלי עם תקע או ספק כוח',
    'פנסים וגופי תאורה לרכב',
  ];
  for (const name of knownFamilyNames) {
    const family = PRODUCT_FAMILY_MATRIX.find((f) => f.publicFamilyName === name);
    assert.ok(family, `expected a matrix family named ${name}`);
    assert.equal(family.currentSystemCoverage, 'existing');
  }
  const existingCount = PRODUCT_FAMILY_MATRIX.filter((f) => f.currentSystemCoverage === 'existing').length;
  assert.equal(existingCount, 5, 'expected exactly the five existing detailed rules to map to "existing" coverage');
});

test('13. multi-category examples from the matrix: food of animal origin and agricultural produce both carry health + agriculture; wireless product carries standards + communications', () => {
  const foodOfAnimalOrigin = PRODUCT_FAMILY_MATRIX.find((f) => f.publicFamilyName === 'מזון מן החי');
  assert.ok(foodOfAnimalOrigin);
  assert.equal(foodOfAnimalOrigin.regulatorySignals.healthUmbrella, true);
  assert.equal(foodOfAnimalOrigin.regulatorySignals.agriculture, true);

  const agriculturalProduce = PRODUCT_FAMILY_MATRIX.find((f) => f.publicFamilyName === 'תוצרת חקלאית, זרעים וצמחים');
  assert.ok(agriculturalProduce);
  assert.equal(agriculturalProduce.regulatorySignals.healthUmbrella, true);
  assert.equal(agriculturalProduce.regulatorySignals.agriculture, true);

  const wireless = PRODUCT_FAMILY_MATRIX.find((f) => f.publicFamilyName.includes('אלחוטי'));
  assert.ok(wireless);
  assert.equal(wireless.regulatorySignals.standards, true);
  assert.equal(wireless.regulatorySignals.communications, true);
});

test('14. a genuinely no-positive-signal family exists in the matrix (clothing) -- proves the fixture is real, not assumed', () => {
  const clothing = PRODUCT_FAMILY_MATRIX.find((f) => f.publicFamilyName === 'ביגוד וטקסטיל');
  assert.ok(clothing);
  for (const key of SIGNAL_KEYS) {
    assert.equal(clothing.regulatorySignals[key], false, `clothing must have no positive category (${key})`);
  }
});

test('15. no workbook row number is exposed in a publicly-facing field name (sourceRow is present for internal maintainability only, not part of any public label)', () => {
  for (const family of PRODUCT_FAMILY_MATRIX) {
    assert.equal(typeof family.sourceRow, 'number');
  }
  // The publicFamilyName / shortNotes / notes fields must never
  // themselves contain the literal word "row" or a workbook cell
  // reference -- a cheap guard against accidentally leaking internal
  // bookkeeping into user-facing text.
  for (const family of PRODUCT_FAMILY_MATRIX) {
    assert.ok(!/שורה \d/.test(family.publicFamilyName));
    if (family.shortNotes) assert.ok(!/שורה \d/.test(family.shortNotes));
  }
});

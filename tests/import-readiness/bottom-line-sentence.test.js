/**
 * Bottom-line sentence for no-requirement families (rule 46,
 * product-owner decision 2026-10-18; overrides the cautious tobacco and
 * industrial-chemicals headlines of rule 45 / the P2 backlog).
 *
 * Every family whose matrix row has no positive signal -- except the
 * catch-all `other-01` -- opens with one authoritative sentence scoped
 * to the time of import, followed by a not-exempt line scoped to
 * post-clearance conditions. A family whose note names a subtype that
 * may need approval at import gets the "(למעט האמור להלן)" form. A
 * family that does have positive categories but reached the
 * no-positive state through an exclusion answer is not a
 * "no requirement" group and keeps the generic wording.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildProductFamilyMatrixSection,
  NO_POSITIVE_SIGNAL_MESSAGE,
  NO_REQUIREMENT_BOTTOM_LINE,
  NO_REQUIREMENT_BOTTOM_LINE_WITH_EXCEPTION,
  POST_CLEARANCE_NOT_EXEMPT_NOTE,
} from '../../js/import-readiness/product-family-result.js';
import { PRODUCT_FAMILY_MATRIX } from '../../js/import-readiness/product-family-matrix.js';
import { FAMILY_GUIDANCE, familyGuidanceFor } from '../../js/import-readiness/product-family-guidance.js';
import { IMPORT_TYPE } from '../../js/import-readiness/scenario-schema.js';

const BOTTOM_LINE = 'על סמך המידע שהתקבל, טובין המשתייכים לקבוצה זו אינם חייבים באישור רגולטורי בשעת היבוא לישראל.';
const POST_CLEARANCE = 'הדבר אינו פוטר מדרישות החלות לאחר השחרור ממכס, כגון חוקיות שיווק והפצה בישראל.';
const OLD_NOT_EXEMPT = 'אין בכך אישור שהמוצר פטור מדרישות יבוא או מתנאים אחרים.';

const EXCEPTION_FAMILIES = [
  'textiles-and-furniture-01', 'textiles-and-furniture-02', 'textiles-and-furniture-05', 'textiles-and-furniture-07',
  'additional-consumer-products-01', 'additional-consumer-products-09',
  'electrical-and-electronics-09', 'construction-and-industrial-01', 'construction-and-industrial-04',
];

const hasPositive = (family) => Object.values(family.regulatorySignals).some((v) => v === true);
const NO_REQUIREMENT_FAMILIES = PRODUCT_FAMILY_MATRIX.filter((f) => f.activeStatus && !hasPositive(f) && f.id !== 'other-01');
// The real family-selection path: a family's public name as free text.
const sectionFor = (family, importType = IMPORT_TYPE.COMMERCIAL) =>
  buildProductFamilyMatrixSection({ texts: [family.publicFamilyName], importType });

test('1. the exact product-owner wording', () => {
  assert.equal(NO_REQUIREMENT_BOTTOM_LINE, BOTTOM_LINE);
  assert.equal(NO_REQUIREMENT_BOTTOM_LINE_WITH_EXCEPTION, BOTTOM_LINE.replace(/\.$/, ' (למעט האמור להלן).'));
  assert.equal(POST_CLEARANCE_NOT_EXEMPT_NOTE, POST_CLEARANCE);
});

test('2. all 17 no-requirement families (other-01 aside) open with the bottom line and the post-clearance line, on both routes', () => {
  assert.equal(NO_REQUIREMENT_FAMILIES.length, 17);
  for (const family of NO_REQUIREMENT_FAMILIES) {
    for (const importType of [IMPORT_TYPE.COMMERCIAL, IMPORT_TYPE.PERSONAL]) {
      const s = sectionFor(family, importType);
      assert.equal(s.state, 'no_positive_signal', `${family.id}: reached by its own public name`);
      const expected = EXCEPTION_FAMILIES.includes(family.id) ? NO_REQUIREMENT_BOTTOM_LINE_WITH_EXCEPTION : BOTTOM_LINE;
      assert.equal(s.noPositiveSignalMessage, expected, `${family.id} (${importType})`);
      assert.equal(s.noPositiveSignalNotExemptNote, POST_CLEARANCE, `${family.id} (${importType})`);
    }
  }
});

test('3. exactly the nine exception families carry the flag, and each has a note below the sentence to point to', () => {
  const flagged = Object.entries(FAMILY_GUIDANCE).filter(([, g]) => g.noPositiveException === true).map(([id]) => id).sort();
  assert.deepEqual(flagged, [...EXCEPTION_FAMILIES].sort());
  for (const id of EXCEPTION_FAMILIES) {
    const family = PRODUCT_FAMILY_MATRIX.find((f) => f.id === id);
    assert.ok(!hasPositive(family), `${id} is a no-requirement family`);
    for (const importType of [IMPORT_TYPE.COMMERCIAL, IMPORT_TYPE.PERSONAL]) {
      assert.ok(sectionFor(family, importType).note && familyGuidanceFor(id).note, `${id}: "(למעט האמור להלן)" always has a note below it`);
    }
  }
});

test('4. tobacco and industrial chemicals: the cautious headlines are overridden', () => {
  for (const text of ['סיגריה אלקטרונית', 'כימיקל תעשייתי']) {
    for (const importType of [IMPORT_TYPE.COMMERCIAL, IMPORT_TYPE.PERSONAL]) {
      assert.equal(buildProductFamilyMatrixSection({ texts: [text], importType }).noPositiveSignalMessage, BOTTOM_LINE, `${text} (${importType})`);
    }
  }
});

test('5. the catch-all family other-01 is excluded from the bottom line (D4): it is inactive today, and the code guard keeps it out if it is ever activated', () => {
  const other = PRODUCT_FAMILY_MATRIX.find((f) => f.id === 'other-01');
  assert.equal(other.activeStatus, false, 'other-01 is not reachable today');
  assert.ok(!NO_REQUIREMENT_FAMILIES.some((f) => f.id === 'other-01'));
  const source = readFileSync(new URL('../../js/import-readiness/product-family-result.js', import.meta.url), 'utf8');
  assert.match(source, /const CATCH_ALL_FAMILY_ID = 'other-01';/);
  assert.match(source, /family\.id !== CATCH_ALL_FAMILY_ID/);
  assert.equal(familyGuidanceFor('other-01'), null, 'no overlay can give other-01 an exception flag');
});

test('6. an exclusion answer on a family WITH positive categories is not a "no requirement" result: generic headline, original not-exempt line', () => {
  const s = buildProductFamilyMatrixSection({
    texts: ['כוס זכוכית'], importType: IMPORT_TYPE.PERSONAL,
    matchedExistingRuleIds: [], excludedExistingRuleIds: ['glass-food-contact-vessel'],
  });
  assert.equal(s.state, 'no_positive_signal');
  assert.equal(s.noPositiveSignalMessage, NO_POSITIVE_SIGNAL_MESSAGE);
  assert.equal(s.noPositiveSignalNotExemptNote, OLD_NOT_EXEMPT);
});

test('7. no overlay headline survives: the bottom line is the only family-level no-positive wording', () => {
  for (const [id, g] of Object.entries(FAMILY_GUIDANCE)) assert.equal(g.noPositiveMessage, undefined, id);
});

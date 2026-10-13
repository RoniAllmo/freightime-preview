/**
 * Post-Wave-3 consistency fix (technical defect, no new professional
 * knowledge, 2026-08-28): a pre-existing legacy row
 * (additional-consumer-products-03, own name "רחפנים" / drones-plural)
 * duplicates the same communications-only signal the reviewed Wave-3
 * drone row (electrical-and-electronics-10, own name "רחפן") already
 * carries, but previously carried no family-specific guidance note --
 * so plural-form drone text silently received generic wording instead
 * of the reviewed Ministry of Communications direction.
 *
 * Fixed by adding a FAMILY_GUIDANCE note to the legacy row, sharing
 * the exact same note text as the Wave-3 row via one constant
 * (DRONE_COMMUNICATIONS_NOTE). Deliberately does NOT touch aliases,
 * identification, FAMILY_NEGATIVE_TERMS, the canonical workbook, or
 * activeStatus -- both rows keep their own independent identity and
 * reachability; only the presented wording is unified, since both
 * already reach the same approved authority and signal. This avoids
 * introducing a literal duplicate alias across two active rows (which
 * an existing registry-hygiene test forbids) while still resolving
 * the observed inconsistency.
 *
 * Update 2026-10-13 (product-owner decision, P2 decision backlog): the
 * legacy row was then retired. It stays in the workbook and keeps its
 * id, but is inactive (activeStatus:false), and its plural alias
 * "רחפנים" moved to electrical-and-electronics-10. Tests 1, 3, 5 and 6
 * below now check that end state; the goal -- plural and singular
 * drone text getting the same reviewed direction -- is unchanged.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductFamilyMatrixSection } from '../../js/import-readiness/product-family-result.js';
import { IMPORT_TYPE } from '../../js/import-readiness/scenario-schema.js';
import { identifyProductFamily } from '../../js/import-readiness/product-family-identification.js';
import { findFamilyById, PRODUCT_FAMILY_MATRIX } from '../../js/import-readiness/product-family-matrix.js';

function section(texts) {
  return buildProductFamilyMatrixSection({ texts, importType: IMPORT_TYPE.COMMERCIAL });
}

test('1. plural "רחפנים" resolves to the one active drone row', () => {
  const r = identifyProductFamily(['רחפנים']);
  assert.equal(r.outcome, 'high_confidence');
  assert.equal(r.family.id, 'electrical-and-electronics-10');
});

test('2. singular "רחפן" still resolves to the Wave-3 row (unaffected)', () => {
  const r = identifyProductFamily(['רחפן']);
  assert.equal(r.family.id, 'electrical-and-electronics-10');
});

test('3. plural drone text now carries the same family-specific Ministry of Communications note as singular', () => {
  const s = section(['רחפנים']);
  assert.equal(s.familyName, 'רחפן');
  assert.ok(s.note.text.includes('משרד התקשורת'), 'must carry the shared drone guidance note, not generic wording');
});

test('4. singular and plural drone text now produce byte-identical note text, categories, and professional routing', () => {
  const singular = section(['רחפן']);
  const plural = section(['רחפנים']);
  assert.deepEqual(singular.positiveCategories, plural.positiveCategories);
  assert.equal(singular.note.text, plural.note.text);
  assert.deepEqual(singular.professional, plural.professional);
});

test('5. the legacy drone row is retired (inactive, id kept); the Wave-3 drone row stays active', () => {
  const legacy = findFamilyById('additional-consumer-products-03');
  const wave3 = findFamilyById('electrical-and-electronics-10');
  assert.equal(legacy.activeStatus, false);
  assert.equal(wave3.activeStatus, true);
  assert.equal(legacy.publicFamilyName, 'רחפנים');
  assert.equal(wave3.publicFamilyName, 'רחפן');
});

test('6. the plural alias moved to the active drone row, and no active row other than it carries "רחפנים"', () => {
  const wave3 = findFamilyById('electrical-and-electronics-10');
  assert.ok(wave3.aliases.includes('רחפנים'));
  const activeWithPlural = PRODUCT_FAMILY_MATRIX
    .filter((f) => f.activeStatus && f.aliases.includes('רחפנים'))
    .map((f) => f.id);
  assert.deepEqual(activeWithPlural, ['electrical-and-electronics-10']);
});

test('7. drone accessory/part phrases remain unaffected by this fix', () => {
  for (const t of ['drone accessory', 'drone propeller', 'drone carrying case']) {
    const r = identifyProductFamily([t]);
    assert.notEqual(r.family?.id, 'electrical-and-electronics-10');
    assert.notEqual(r.family?.id, 'additional-consumer-products-03');
  }
});

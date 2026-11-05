/**
 * B2B API family database (PRODUCT_SPEC.md Section 0.5): every active
 * family (batch 1 + batch 2, 2026-11-05).
 *
 * The committed data/api/families.json must be valid, well-formed, in
 * the agreed schema, and exactly what scripts/generate-api-database.js
 * produces from the current matrix and guidance notes.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildDatabase, serialize, OUTPUT_PATH, BATCH_CATEGORIES, MATCH_LEVELS, MAPPING_QUALITIES,
  REQUIREMENT_TYPES, CODE_PATTERN, VERIFICATION_STATUS,
} from '../../scripts/generate-api-database.js';
import { PRODUCT_FAMILY_MATRIX } from '../../js/import-readiness/product-family-matrix.js';

const raw = readFileSync(OUTPUT_PATH, 'utf8');
const db = JSON.parse(raw);
const byId = (id) => db.families.find((f) => f.family_id === id);
const bilingual = (v) => v && typeof v.en === 'string' && v.en.length > 0 && typeof v.he === 'string' && v.he.length > 0;

test('1. the committed file is valid JSON and exactly the generator output (regenerate with node scripts/generate-api-database.js)', () => {
  assert.equal(raw, serialize(buildDatabase()));
});

test('2. the database holds exactly the 88 active matrix families, in matrix order, and no inactive row', () => {
  const expected = PRODUCT_FAMILY_MATRIX.filter((f) => f.activeStatus).map((f) => f.id);
  assert.deepEqual(db.families.map((f) => f.family_id), expected);
  assert.equal(db.family_count, 88);
  assert.equal(db.family_count, db.families.length);
  for (const id of ['other-01', 'additional-consumer-products-03']) assert.equal(byId(id), undefined, `${id} is inactive`);
  assert.deepEqual(db.batch, [...BATCH_CATEGORIES]);
});

test('3. every record has the agreed shape', () => {
  for (const f of db.families) {
    assert.ok(bilingual(f.name), `${f.family_id}: bilingual name`);
    const h = f.hs_mapping;
    assert.equal(h.hs_version, 'HS2022');
    assert.ok(MAPPING_QUALITIES.includes(h.mapping_quality), f.family_id);
    assert.ok(Array.isArray(h.indicative_ranges), f.family_id);
    for (const c of h.codes) {
      assert.ok(MATCH_LEVELS.includes(c.match), `${f.family_id} ${c.code}`);
      assert.match(c.code, CODE_PATTERN[c.match], `${f.family_id} ${c.code}`);
      assert.ok(c.description.length > 0, `${f.family_id} ${c.code}`);
    }
    assert.equal(h.mapping_quality === 'not_mappable_to_6_digit', h.codes.length === 0, `${f.family_id}: codes iff mappable`);
    for (const r of f.requirements) {
      assert.ok(REQUIREMENT_TYPES.includes(r.requirement_type), f.family_id);
      assert.ok(bilingual(r.authority), `${f.family_id}: bilingual authority`);
      assert.ok(r.requirement_type === 'unspecified' ? r.document === null : bilingual(r.document), `${f.family_id}: document`);
      assert.deepEqual(r.legal_basis, { instrument: null, free_import_order_schedule: null }, `${f.family_id}: no legal basis before the broker audit`);
      assert.ok(['matrix_signal', 'guidance_note'].includes(r.basis), f.family_id);
      assert.ok(r.basis === 'matrix_signal' || bilingual(r.applies_when), `${f.family_id}: a note-based requirement states its condition`);
      assert.equal(r.verification_status, VERIFICATION_STATUS, f.family_id);
    }
    assert.equal(typeof f.provenance.source_row, 'number');
    assert.ok(Array.isArray(f.provenance.registry_rules));
  }
});

test('4. every requirement is unverified pending the broker audit', () => {
  const statuses = new Set(db.families.flatMap((f) => f.requirements.map((r) => r.verification_status)));
  assert.deepEqual([...statuses], ['unverified_pending_broker_audit']);
});

test('5. matrix-signal requirements cover each family\'s positive signals exactly once', () => {
  for (const f of db.families) {
    const signals = PRODUCT_FAMILY_MATRIX.find((m) => m.id === f.family_id).regulatorySignals;
    const positive = Object.keys(signals).filter((k) => signals[k] === true).sort();
    assert.deepEqual([...f.provenance.matrix_signals].sort(), positive, f.family_id);
    assert.equal(f.requirements.filter((r) => r.basis === 'matrix_signal').length, positive.length, f.family_id);
  }
});

test('6. key records: condoms map exactly to 4014.10 with SII and AMAR; industrial chemicals are unmappable with a poisons permit', () => {
  const contraceptives = byId('health-and-cosmetics-06');
  assert.deepEqual(contraceptives.hs_mapping.codes.find((c) => c.code === '4014.10').match, 'exact');
  assert.deepEqual(contraceptives.requirements.map((r) => r.requirement_type), ['standards_approval', 'requirements_approval']);

  const chemicals = byId('chemicals-and-materials-04');
  assert.equal(chemicals.hs_mapping.mapping_quality, 'not_mappable_to_6_digit');
  assert.deepEqual(chemicals.hs_mapping.codes, []);
  assert.deepEqual(chemicals.requirements.map((r) => [r.requirement_type, r.document.he, r.authority.en]), [
    ['permit_under_other_law', 'היתר רעלים', 'Ministry of Environmental Protection'],
  ]);
  assert.equal(chemicals.provenance.guidance_note_he, 'נדרש היתר רעלים מהמשרד להגנת הסביבה.');
});

test('7. the generator fails closed when batch data and the matrix disagree', async () => {
  const mod = await import('../../scripts/generate-api-database.js');
  const data = mod.FAMILY_API_DATA['health-and-cosmetics-09'];
  const saved = data.requirements;
  data.requirements = saved.slice(0, 1);
  try {
    assert.throws(() => mod.buildDatabase(), /must cover the positive signals/);
  } finally {
    data.requirements = saved;
  }
});

test('8. an empty requirements list only ever means "no positive signal and no conditional note", never an exemption', () => {
  const empty = db.families.filter((f) => f.requirements.length === 0).map((f) => f.family_id).sort();
  assert.deepEqual(empty, [
    'additional-consumer-products-05', 'additional-consumer-products-08', 'construction-and-industrial-02',
    'construction-and-industrial-08', 'electrical-and-electronics-12', 'textiles-and-furniture-08',
  ]);
  for (const id of empty) assert.deepEqual(byId(id).provenance.matrix_signals, [], id);
  // No requirement field ever states an exemption, even where the source note does (elevators).
  const fields = JSON.stringify(db.families.map((f) => f.requirements));
  assert.ok(!/פטור|exempt/i.test(fields));
});

test('9. conditional notes on no-signal families become guidance-note flags with a condition', () => {
  const expected = {
    'textiles-and-furniture-01': 'ביגוד לילדים ובגדי שינה',
    'construction-and-industrial-04': 'אם הכלי מתחבר לרשת החשמל או מגיע עם מטען',
    'additional-consumer-products-12': 'ביבוא מסחרי',
  };
  for (const [id, he] of Object.entries(expected)) {
    const f = byId(id);
    assert.deepEqual(f.provenance.matrix_signals, [], id);
    assert.equal(f.requirements.length, 1, id);
    assert.equal(f.requirements[0].basis, 'guidance_note', id);
    assert.equal(f.requirements[0].applies_when.he, he, id);
  }
});

test('10. drones map to the HS2022 unmanned-aircraft heading 8806, not to cameras (8525)', () => {
  const drone = byId('electrical-and-electronics-10');
  assert.deepEqual(drone.hs_mapping.codes.map((c) => c.code), ['8806.xx']);
  assert.ok(!JSON.stringify(drone.hs_mapping.codes).includes('8525'));
});

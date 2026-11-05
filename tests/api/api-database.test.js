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
  REQUIREMENT_TYPES, CODE_PATTERN, VERIFICATION_STATUS, PERSONAL_IMPORT_BASELINE, PERSONAL_EXCEPTION_CATEGORIES,
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

// -- Personal import dimension (registry rule 50) --

const STANDARDS = new Set(['Standards Institution of Israel (SII)', 'Standards (authority not named)']);
const generalAuthorities = (f) => f.requirements.filter((r) => r.basis === 'matrix_signal').map((r) => r.authority.en);

test('11. every family has a well-formed personal_import object, unverified pending the broker audit', () => {
  for (const f of db.families) {
    const p = f.personal_import;
    assert.deepEqual(Object.keys(p).sort(), ['allowed_in_personal_import', 'basis', 'commercial_exemption_applies', 'conditions', 'exception_category', 'verification_status'], f.family_id);
    assert.equal(typeof p.allowed_in_personal_import, 'boolean', f.family_id);
    assert.equal(typeof p.commercial_exemption_applies, 'boolean', f.family_id);
    assert.ok(typeof p.conditions === 'string' && p.conditions.length > 0, f.family_id);
    assert.ok(p.exception_category === null || PERSONAL_EXCEPTION_CATEGORIES.includes(p.exception_category), f.family_id);
    assert.equal(p.commercial_exemption_applies, p.exception_category === null, `${f.family_id}: exempt iff no exception category`);
    assert.equal(p.basis, p.exception_category === null ? 'baseline_rule' : 'exception_rule', f.family_id);
    assert.equal(p.verification_status, 'unverified_pending_broker_audit', f.family_id);
    if (p.commercial_exemption_applies) assert.equal(p.conditions, PERSONAL_IMPORT_BASELINE, f.family_id);
  }
});

test('12. no false free pass: any general requirement from a non-standards authority means no personal exemption', () => {
  for (const f of db.families) {
    const nonStandards = generalAuthorities(f).filter((a) => !STANDARDS.has(a));
    if (nonStandards.length > 0) {
      assert.equal(f.personal_import.commercial_exemption_applies, false, f.family_id);
      for (const a of nonStandards) assert.ok(f.personal_import.conditions.includes(a) || f.family_id === 'additional-consumer-products-13', `${f.family_id}: names ${a}`);
    }
  }
});

test('13. the Product Owner\'s named exceptions are never exempt', () => {
  const expected = {
    'electrical-and-electronics-10': 'communications',
    'electrical-and-electronics-05': 'communications',
    'vehicles-and-transport-03': 'transport',
    'vehicles-and-transport-01': 'transport',
    'additional-consumer-products-07': 'transport',
    'additional-consumer-products-13': 'defense_or_hazardous',
    'chemicals-and-materials-04': 'defense_or_hazardous',
    'food-and-beverages-03': 'health',
    'health-and-cosmetics-01': 'health',
    'health-and-cosmetics-02': 'health',
  };
  for (const [id, category] of Object.entries(expected)) {
    assert.equal(byId(id).personal_import.exception_category, category, id);
    assert.equal(byId(id).personal_import.commercial_exemption_applies, false, id);
  }
  assert.ok(byId('electrical-and-electronics-10').personal_import.conditions.includes('Civil Aviation Authority'));
});

test('14. weapons are the only family not allowed as a personal import; toys get the baseline exemption', () => {
  assert.deepEqual(db.families.filter((f) => !f.personal_import.allowed_in_personal_import).map((f) => f.family_id), ['additional-consumer-products-13']);
  const toys = byId('children-and-infants-01').personal_import;
  assert.equal(toys.commercial_exemption_applies, true);
  assert.equal(toys.conditions, PERSONAL_IMPORT_BASELINE);
});

test('15. the Product Owner\'s borderline rulings: flammables, gas, contact lenses and tobacco get no exemption', () => {
  const expected = {
    'chemicals-and-materials-06': 'defense_or_hazardous',
    'additional-consumer-products-11': 'defense_or_hazardous',
    'health-and-cosmetics-07': 'health',
    'additional-consumer-products-12': 'health',
  };
  for (const [id, category] of Object.entries(expected)) {
    assert.equal(byId(id).personal_import.commercial_exemption_applies, false, id);
    assert.equal(byId(id).personal_import.exception_category, category, id);
    assert.equal(byId(id).personal_import.allowed_in_personal_import, true, id);
  }
  assert.ok(byId('health-and-cosmetics-07').personal_import.conditions.includes('AMAR'));
  for (const id of ['food-and-beverages-06', 'food-and-beverages-08', 'construction-and-industrial-05']) {
    assert.equal(byId(id).personal_import.exception_category, 'agriculture', id);
  }
});

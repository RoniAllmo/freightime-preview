/**
 * Generates the B2B API family database (PRODUCT_SPEC.md Section 0.5)
 * at data/api/families.json.
 *
 * Inputs:
 *   - js/import-readiness/product-family-matrix.js -- the matrix generated
 *     from the Product Owner workbook (kept in sync with
 *     data/FreighTime_Simple_Import_Requirements_Matrix.xlsx by CI's
 *     matrix-sync job), so this script needs no spreadsheet library;
 *   - js/import-readiness/product-family-guidance.js -- the family notes.
 *
 * The HS6 mappings and English translations below are new data and
 * every requirement is "unverified_pending_broker_audit" (Section 0.6).
 * Requirements translate only what the matrix and notes already say:
 * one record per positive matrix signal, plus conditional records for
 * the "may also" sentences some notes carry. A positive signal whose
 * note names no document is `unspecified`.
 *
 * Batch 1 (2026-11-05): health-and-cosmetics and chemicals-and-materials
 * only. Inactive rows are excluded.
 *
 * Run: node scripts/generate-api-database.js
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PRODUCT_FAMILY_MATRIX } from '../js/import-readiness/product-family-matrix.js';
import { familyGuidanceFor } from '../js/import-readiness/product-family-guidance.js';

export const SCHEMA_VERSION = '0.1';
export const HS_VERSION = 'HS2022';
export const VERIFICATION_STATUS = 'unverified_pending_broker_audit';
export const BATCH_CATEGORIES = Object.freeze(['health-and-cosmetics', 'chemicals-and-materials']);

export const MATCH_LEVELS = Object.freeze(['exact', 'heading', 'heading_range', 'partial']);
export const MAPPING_QUALITIES = Object.freeze(['exact', 'heading_level', 'heading_range', 'partial', 'not_mappable_to_6_digit']);
export const REQUIREMENT_TYPES = Object.freeze([
  'import_license', 'import_permit', 'requirements_approval', 'standards_approval', 'permit_under_other_law', 'unspecified',
]);

// The code format each match level must use.
export const CODE_PATTERN = Object.freeze({
  exact: /^\d{4}\.\d{2}$/,
  partial: /^\d{4}\.\d{2}$/,
  heading: /^\d{4}\.xx$/,
  heading_range: /^\d{4}-\d{4}$/,
});

// Signal-level authority used when a family's note names no document.
const SIGNAL_AUTHORITY = Object.freeze({
  standards: { en: 'Standards (authority not named)', he: 'תקינה' },
  healthUmbrella: { en: 'Ministry of Health', he: 'משרד הבריאות' },
  transportOrVehicleLaboratory: { en: 'Ministry of Transport / vehicle laboratory', he: 'משרד התחבורה / מעבדת רכב' },
  communications: { en: 'Ministry of Communications', he: 'משרד התקשורת' },
  agriculture: { en: 'Ministry of Agriculture', he: 'משרד החקלאות' },
  otherPermit: { en: 'Other approval or licence (authority not named)', he: 'אישור / רישיון אחר' },
});

const AUTHORITY = Object.freeze({
  amar: { en: 'Ministry of Health – Medical Devices Division (AMAR)', he: 'משרד הבריאות – מנהל המכשור הרפואי (אמ"ר)' },
  sii: { en: 'Standards Institution of Israel (SII)', he: 'מכון התקנים הישראלי' },
  moep: { en: 'Ministry of Environmental Protection', he: 'המשרד להגנת הסביבה' },
  pharma: { en: 'Ministry of Health – Pharmaceutical Division', he: 'אגף הרוקחות במשרד הבריאות' },
  industries: { en: 'Ministry of Economy – Industries Administration', he: 'מינהל התעשיות במשרד הכלכלה' },
});

const DOCUMENT = Object.freeze({
  amar: { en: 'Medical device approval (AMAR)', he: 'אישור אמ"ר' },
  sii: { en: 'Standards Institution approval', he: 'אישור מכון התקנים' },
  poisons: { en: 'Poisons permit', he: 'היתר רעלים' },
  radiation: { en: 'Radiation device approval', he: 'אישור מכשירי קרינה' },
  importLicence: { en: 'Import licence', he: 'רישיון יבוא' },
  licence: { en: 'Licence', he: 'רישיון' },
});

const code = (c, description, match = 'exact') => ({ code: c, description, match });
// A requirement backed by a positive matrix signal.
const fromSignal = (signal, requirement_type, document, authority, applies_when = null) =>
  ({ signal, basis: 'matrix_signal', requirement_type, document, authority, applies_when });
// A positive signal whose note names no document.
const unspecified = (signal) => fromSignal(signal, 'unspecified', null, SIGNAL_AUTHORITY[signal]);
// A conditional "may also" sentence from the family note.
const fromNote = (requirement_type, document, authority, applies_when) =>
  ({ signal: null, basis: 'guidance_note', requirement_type, document, authority, applies_when });

/**
 * Batch 1 family data. `requirements` must cover every positive matrix
 * signal exactly once (checked by buildDatabase).
 */
export const FAMILY_API_DATA = Object.freeze({
  'health-and-cosmetics-01': {
    name_en: 'Cosmetics',
    hs: {
      quality: 'partial',
      codes: [
        code('3304.xx', 'Beauty, make-up and skin-care preparations; manicure and pedicure preparations', 'heading'),
        code('3305.xx', 'Preparations for use on the hair', 'heading'),
        code('3307.10', 'Pre-shave, shaving or after-shave preparations'),
        code('3307.20', 'Personal deodorants and antiperspirants'),
        code('3307.30', 'Perfumed bath salts and other bath preparations'),
      ],
      note: 'Perfumes (3303.00) are a separate family (health-and-cosmetics-05). Oral-hygiene preparations (3306) are not in the family\'s aliases and are not mapped.',
    },
    requirements: [unspecified('healthUmbrella')],
    registry_rules: [21],
  },
  'health-and-cosmetics-02': {
    name_en: 'Medical equipment',
    hs: {
      quality: 'heading_level',
      codes: [
        code('9018.xx', 'Instruments and appliances used in medical, surgical, dental or veterinary sciences', 'heading'),
        code('9019.xx', 'Mechano-therapy, massage, oxygen-therapy and respiratory apparatus', 'heading'),
        code('9021.xx', 'Orthopaedic appliances, hearing aids, pacemakers and other implanted or worn devices', 'heading'),
        code('9402.90', 'Medical, surgical, dental or veterinary furniture', 'partial'),
      ],
      note: 'X-ray apparatus (9022) is a separate family (health-and-cosmetics-09); medical disposables such as syringes are health-and-cosmetics-08.',
    },
    requirements: [
      fromSignal('healthUmbrella', 'requirements_approval', DOCUMENT.amar, AUTHORITY.amar),
      fromNote('standards_approval', DOCUMENT.sii, AUTHORITY.sii, { en: 'may also apply to defibrillators and incubators', he: 'דפיברילטורים ואינקובטורים' }),
    ],
    registry_rules: [28, 39],
  },
  'health-and-cosmetics-03': {
    name_en: 'Products with a medical claim',
    hs: {
      quality: 'not_mappable_to_6_digit',
      codes: [],
      note: 'The family is defined by the claim made for the product, not by what the product is; it is reachable by description only.',
    },
    requirements: [fromSignal('healthUmbrella', 'requirements_approval', DOCUMENT.amar, AUTHORITY.amar)],
    registry_rules: [],
  },
  'health-and-cosmetics-04': {
    name_en: 'Medicines',
    hs: {
      quality: 'heading_level',
      codes: [
        code('3003.xx', 'Medicaments, not in measured doses or packed for retail sale', 'heading'),
        code('3004.xx', 'Medicaments in measured doses or packed for retail sale', 'heading'),
      ],
      note: 'Vaccines, blood products and similar (3002) are not mapped to this family.',
    },
    requirements: [fromSignal('healthUmbrella', 'import_license', DOCUMENT.importLicence, AUTHORITY.pharma)],
    registry_rules: [49],
  },
  'health-and-cosmetics-05': {
    name_en: 'Perfumes',
    hs: {
      quality: 'exact',
      codes: [code('3303.00', 'Perfumes and toilet waters')],
      note: null,
    },
    requirements: [unspecified('healthUmbrella')],
    registry_rules: [21, 49],
  },
  'health-and-cosmetics-06': {
    name_en: 'Contraceptives',
    hs: {
      quality: 'partial',
      codes: [
        code('4014.10', 'Sheath contraceptives of vulcanised rubber (condoms)'),
        code('9018.90', 'Other medical instruments (e.g. intrauterine devices)', 'partial'),
      ],
      note: 'Chemical (hormonal or spermicidal) contraceptive preparations (3006.60) are medicines and are not mapped to this family.',
    },
    requirements: [
      fromSignal('standards', 'standards_approval', DOCUMENT.sii, AUTHORITY.sii),
      fromSignal('healthUmbrella', 'requirements_approval', DOCUMENT.amar, AUTHORITY.amar),
    ],
    registry_rules: [48],
  },
  'health-and-cosmetics-07': {
    name_en: 'Contact lenses and eyewear',
    hs: {
      quality: 'exact',
      codes: [
        code('9001.30', 'Contact lenses'),
        code('9001.40', 'Spectacle lenses of glass'),
        code('9001.50', 'Spectacle lenses of other materials'),
        code('9003.11', 'Frames and mountings for spectacles, of plastics'),
        code('9003.19', 'Frames and mountings for spectacles, of other materials'),
        code('9004.10', 'Sunglasses'),
        code('9004.90', 'Other spectacles (e.g. corrective, reading)'),
      ],
      note: null,
    },
    requirements: [fromSignal('standards', 'standards_approval', DOCUMENT.sii, AUTHORITY.sii)],
    registry_rules: [48],
  },
  'health-and-cosmetics-08': {
    name_en: 'Medical disposables',
    hs: {
      quality: 'exact',
      codes: [
        code('4015.11', 'Surgical gloves of vulcanised rubber'),
        code('4015.12', 'Rubber gloves of a kind used for medical, surgical, dental or veterinary purposes (other than surgical)'),
        code('9018.31', 'Syringes, with or without needles'),
        code('9018.32', 'Tubular metal needles and needles for sutures'),
      ],
      note: 'Gloves of plastics (3926.20) are not mapped.',
    },
    requirements: [fromSignal('healthUmbrella', 'requirements_approval', DOCUMENT.amar, AUTHORITY.amar)],
    registry_rules: [48],
  },
  'health-and-cosmetics-09': {
    name_en: 'X-ray apparatus',
    hs: {
      quality: 'exact',
      codes: [
        code('9022.12', 'Computed tomography apparatus'),
        code('9022.13', 'X-ray apparatus, other, for dental uses'),
        code('9022.14', 'X-ray apparatus, other, for medical, surgical or veterinary uses'),
        code('9022.19', 'X-ray apparatus for other uses'),
        code('9022.30', 'X-ray tubes'),
        code('9022.90', 'Parts and accessories of X-ray apparatus'),
      ],
      note: null,
    },
    requirements: [
      fromSignal('healthUmbrella', 'requirements_approval', DOCUMENT.amar, AUTHORITY.amar),
      fromSignal('otherPermit', 'requirements_approval', DOCUMENT.radiation, AUTHORITY.moep),
    ],
    registry_rules: [48],
  },
  'chemicals-and-materials-01': {
    name_en: 'Cleaning and disinfection products',
    hs: {
      quality: 'partial',
      codes: [
        code('3402.50', 'Washing and cleaning preparations, put up for retail sale'),
        code('3402.90', 'Other washing and cleaning preparations'),
        code('3808.94', 'Disinfectants'),
        code('2828.90', 'Hypochlorites (e.g. household bleach)', 'partial'),
      ],
      note: 'Drain openers may fall under other chemical headings depending on composition.',
    },
    requirements: [unspecified('standards')],
    registry_rules: [47],
  },
  'chemicals-and-materials-02': {
    name_en: 'Paints, adhesives and sealants',
    hs: {
      quality: 'heading_level',
      codes: [
        code('3208.xx', 'Paints and varnishes in a non-aqueous medium', 'heading'),
        code('3209.xx', 'Paints and varnishes in an aqueous medium', 'heading'),
        code('3210.00', 'Other paints and varnishes'),
        code('3214.xx', 'Glaziers\' putty, mastics and sealants', 'heading'),
        code('3506.xx', 'Prepared glues and adhesives', 'heading'),
      ],
      note: null,
    },
    requirements: [fromSignal('otherPermit', 'permit_under_other_law', DOCUMENT.poisons, AUTHORITY.moep)],
    registry_rules: [34],
  },
  'chemicals-and-materials-03': {
    name_en: 'Pesticides',
    hs: {
      quality: 'exact',
      codes: [
        code('3808.91', 'Insecticides'),
        code('3808.92', 'Fungicides'),
        code('3808.93', 'Herbicides, anti-sprouting products and plant-growth regulators'),
        code('3808.99', 'Other (e.g. rodenticides)'),
      ],
      note: 'Disinfectants (3808.94) belong to cleaning and disinfection products (chemicals-and-materials-01).',
    },
    requirements: [
      fromSignal('otherPermit', 'permit_under_other_law', DOCUMENT.poisons, AUTHORITY.moep),
      fromNote('standards_approval', DOCUMENT.sii, AUTHORITY.sii, { en: 'may also apply to a product in an aerosol or pressure container', he: 'תכשיר באריזת תרסיס (אירוסול) או במכל לחץ' }),
    ],
    registry_rules: [26, 39, 40],
  },
  'chemicals-and-materials-04': {
    name_en: 'Industrial chemicals and hazardous substances',
    hs: {
      quality: 'not_mappable_to_6_digit',
      codes: [],
      indicative_ranges: [
        { range: 'Chapter 28', description: 'Inorganic chemicals' },
        { range: 'Chapter 29', description: 'Organic chemicals' },
        { range: 'Chapter 38', description: 'Miscellaneous chemical products' },
      ],
      note: 'The family is defined by hazard, not by product; whether it applies depends on the specific substance (CAS number). Reachable by description only.',
    },
    requirements: [fromSignal('otherPermit', 'permit_under_other_law', DOCUMENT.poisons, AUTHORITY.moep)],
    registry_rules: [35, 49],
  },
  'chemicals-and-materials-05': {
    name_en: 'Fertilizers',
    hs: {
      quality: 'heading_range',
      codes: [code('3101-3105', 'Fertilizers (Chapter 31)', 'heading_range')],
      note: null,
    },
    requirements: [fromSignal('otherPermit', 'import_license', DOCUMENT.licence, AUTHORITY.industries)],
    registry_rules: [48],
  },
  'chemicals-and-materials-06': {
    name_en: 'Turpentine and flammable fire-lighting materials for charcoal or wood',
    hs: {
      quality: 'partial',
      codes: [
        code('3805.10', 'Gum, wood or sulphate turpentine oils'),
        code('3606.90', 'Other articles of combustible materials (e.g. firelighters)'),
        code('3606.10', 'Liquid fuels for lighters, in containers of 300 cm³ or less', 'partial'),
        code('2710.19', 'Petroleum oils, other than light oils (e.g. paraffin-based lighter fluid)', 'partial'),
      ],
      note: null,
    },
    requirements: [fromSignal('standards', 'standards_approval', DOCUMENT.sii, AUTHORITY.sii)],
    registry_rules: [48],
  },
});

const inBatch = (family) => BATCH_CATEGORIES.some((prefix) => family.id.startsWith(`${prefix}-`));
const positiveSignals = (family) => Object.entries(family.regulatorySignals).filter(([, v]) => v === true).map(([k]) => k);

function check(condition, message) {
  if (!condition) throw new Error(`generate-api-database: ${message}`);
}

function validateFamilyData(family, data) {
  check(MAPPING_QUALITIES.includes(data.hs.quality), `${family.id}: unknown mapping quality ${data.hs.quality}`);
  check(data.hs.quality !== 'not_mappable_to_6_digit' || data.hs.codes.length === 0, `${family.id}: an unmappable family lists no codes`);
  check(data.hs.quality === 'not_mappable_to_6_digit' || data.hs.codes.length > 0, `${family.id}: a mappable family lists codes`);
  for (const c of data.hs.codes) {
    check(MATCH_LEVELS.includes(c.match), `${family.id}: unknown match level ${c.match}`);
    check(CODE_PATTERN[c.match].test(c.code), `${family.id}: code ${c.code} does not fit match level ${c.match}`);
  }
  const signals = positiveSignals(family);
  const covered = data.requirements.filter((r) => r.basis === 'matrix_signal').map((r) => r.signal);
  check(JSON.stringify([...covered].sort()) === JSON.stringify([...signals].sort()),
    `${family.id}: requirements must cover the positive signals [${signals}] exactly once, got [${covered}]`);
  for (const r of data.requirements) {
    check(REQUIREMENT_TYPES.includes(r.requirement_type), `${family.id}: unknown requirement type ${r.requirement_type}`);
    check((r.requirement_type === 'unspecified') === (r.document === null), `${family.id}: only an unspecified requirement has no document`);
    check(r.basis === 'matrix_signal' || r.applies_when !== null, `${family.id}: a note-based requirement states its condition`);
  }
}

function toRecord(family, data) {
  const guidance = familyGuidanceFor(family.id);
  return {
    family_id: family.id,
    name: { en: data.name_en, he: family.publicFamilyName },
    hs_mapping: {
      hs_version: HS_VERSION,
      codes: data.hs.codes,
      indicative_ranges: data.hs.indicative_ranges || [],
      mapping_quality: data.hs.quality,
      mapping_note: data.hs.note,
    },
    requirements: data.requirements.map((r) => ({
      requirement_type: r.requirement_type,
      document: r.document,
      authority: r.authority,
      legal_basis: { instrument: null, free_import_order_schedule: null },
      applies_to: 'all_codes_in_family',
      applies_when: r.applies_when,
      basis: r.basis,
      verification_status: VERIFICATION_STATUS,
    })),
    provenance: {
      source_row: family.sourceRow,
      registry_rules: data.registry_rules,
      matrix_signals: positiveSignals(family),
      guidance_note_he: guidance && guidance.note ? guidance.note : null,
    },
  };
}

/** Builds the database object; throws when the batch data and the matrix disagree. */
export function buildDatabase() {
  const families = PRODUCT_FAMILY_MATRIX.filter((f) => f.activeStatus && inBatch(f));
  const ids = families.map((f) => f.id);
  for (const id of Object.keys(FAMILY_API_DATA)) check(ids.includes(id), `${id} is not an active batch family`);
  for (const id of ids) check(FAMILY_API_DATA[id], `${id} has no API data`);
  for (const f of families) validateFamilyData(f, FAMILY_API_DATA[f.id]);
  return {
    schema_version: SCHEMA_VERSION,
    hs_version: HS_VERSION,
    batch: [...BATCH_CATEGORIES],
    family_count: families.length,
    families: families.map((f) => toRecord(f, FAMILY_API_DATA[f.id])),
  };
}

export const OUTPUT_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../data/api/families.json');

export function serialize(database) {
  return `${JSON.stringify(database, null, 2)}\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const database = buildDatabase();
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, serialize(database));
  console.log(`Wrote ${database.family_count} families to ${OUTPUT_PATH}`);
}

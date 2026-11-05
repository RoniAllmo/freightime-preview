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
 * Batch 1 (2026-11-05) covered health-and-cosmetics and
 * chemicals-and-materials; batch 2 (2026-11-05) adds every remaining
 * category, so the file now holds every active family. Inactive rows are
 * excluded. A family with no positive signal and no conditional note has
 * an empty `requirements` list: the API then returns no risk flag, never
 * an exemption statement.
 *
 * Run: node scripts/generate-api-database.js
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PRODUCT_FAMILY_MATRIX } from '../js/import-readiness/product-family-matrix.js';
import { familyGuidanceFor } from '../js/import-readiness/product-family-guidance.js';

export const SCHEMA_VERSION = '0.2';
export const HS_VERSION = 'HS2022';
export const VERIFICATION_STATUS = 'unverified_pending_broker_audit';
export const BATCH_CATEGORIES = Object.freeze([
  'food-and-beverages', 'food-contact', 'electrical-and-electronics', 'vehicles-and-transport', 'children-and-infants',
  'health-and-cosmetics', 'chemicals-and-materials', 'textiles-and-furniture', 'construction-and-industrial',
  'additional-consumer-products',
]);

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
  vet: { en: 'Ministry of Agriculture – Veterinary Services', he: 'השירותים הווטרינריים במשרד החקלאות' },
  vetFood: { en: 'Ministry of Agriculture and Food Security – Veterinary Services', he: 'השירותים הווטרינריים במשרד החקלאות וביטחון המזון' },
  ppis: { en: 'Ministry of Agriculture – Plant Protection and Inspection Services (PPIS)', he: 'השירותים להגנת הצומח ולביקורת במשרד החקלאות' },
  agriculture: { en: 'Ministry of Agriculture', he: 'משרד החקלאות' },
  moc: { en: 'Ministry of Communications', he: 'משרד התקשורת' },
  mot: { en: 'Ministry of Transport', he: 'משרד התחבורה' },
  motOrLab: { en: 'Ministry of Transport or an authorized vehicle laboratory', he: 'משרד התחבורה או מעבדת רכב מוסמכת' },
  vehicleLab: { en: 'Authorized vehicle laboratory', he: 'מעבדת רכב מוסמכת' },
  vehicleLabOrDivision: { en: 'Vehicle laboratory / vehicle division', he: 'מעבדת רכב / אגף הרכב' },
  energy: { en: 'Ministry of Energy', he: 'משרד האנרגיה' },
  importAdmin: { en: 'Ministry of Economy – Import Administration', he: 'מינהל היבוא במשרד הכלכלה' },
  mod: { en: 'Ministry of Defense', he: 'משרד הביטחון' },
  notNamed: { en: 'Authority not named', he: 'לא צוינה רשות' },
});

const DOCUMENT = Object.freeze({
  amar: { en: 'Medical device approval (AMAR)', he: 'אישור אמ"ר' },
  sii: { en: 'Standards Institution approval', he: 'אישור מכון התקנים' },
  poisons: { en: 'Poisons permit', he: 'היתר רעלים' },
  radiation: { en: 'Radiation device approval', he: 'אישור מכשירי קרינה' },
  importLicence: { en: 'Import licence', he: 'רישיון יבוא' },
  licence: { en: 'Licence', he: 'רישיון' },
  importPermit: { en: 'Import permit', he: 'היתר יבוא' },
  pharma: { en: 'Pharmaceutical Division approval', he: 'אישור אגף הרוקחות' },
  veterinary: { en: 'Veterinary approval', he: 'אישור השירותים הווטרינריים' },
  veterinaryLive: { en: 'Veterinary licence, permit or approval', he: 'רישיון, היתר או אישור וטרינרי' },
  communications: { en: 'Ministry of Communications approval', he: 'אישור משרד התקשורת' },
  vehicleApproval: { en: 'Vehicle laboratory or Ministry of Transport approval', he: 'אישור מעבדת רכב / משרד התחבורה' },
  energy: { en: 'Sustainable-energy approval', he: 'אישור אנרגיה מקיימת' },
  woodPackaging: { en: 'Wood-packaging requirements (incl. phytosanitary marking or treatment)', he: 'דרישות לאריזת עץ (לרבות סימון/טיפול פיטוסניטרי)' },
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
 * Family data. `requirements` must cover every positive matrix signal
 * exactly once (checked by buildDatabase).
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
  // ---------------------------------------------------------------
  // Batch 2 (2026-11-05): every remaining active family.
  // ---------------------------------------------------------------

  'food-and-beverages-01': {
    name_en: 'Packaged food',
    hs: {
      quality: 'partial',
      codes: [
        code('1601-1605', 'Preparations of meat, fish or crustaceans (e.g. canned)', 'heading_range'),
        code('1704.xx', 'Sugar confectionery', 'heading'),
        code('1806.xx', 'Chocolate and other food preparations containing cocoa', 'heading'),
        code('1901-1905', 'Preparations of cereals, flour, starch or milk; bakers\' wares', 'heading_range'),
        code('2001-2008', 'Preparations of vegetables, fruit or nuts (e.g. canned)', 'heading_range'),
        code('2101-2106', 'Miscellaneous edible preparations', 'heading_range'),
      ],
      note: 'Packaged food spans most of Chapters 16-21; only the main headings are mapped.',
    },
    requirements: [unspecified('healthUmbrella')],
    registry_rules: [],
  },
  'food-and-beverages-02': {
    name_en: 'Beverages',
    hs: {
      quality: 'heading_range',
      codes: [
        code('2201-2208', 'Waters, soft drinks, beer, wine, spirits and other beverages', 'heading_range'),
        code('2009.xx', 'Fruit and vegetable juices', 'heading'),
      ],
      note: null,
    },
    requirements: [unspecified('healthUmbrella')],
    registry_rules: [47],
  },
  'food-and-beverages-03': {
    name_en: 'Food supplements',
    hs: {
      quality: 'partial',
      codes: [code('2106.90', 'Food preparations not elsewhere specified (e.g. food supplements)', 'partial')],
      note: 'A supplement presented as a medicament falls under medicines (3004).',
    },
    requirements: [unspecified('healthUmbrella')],
    registry_rules: [25],
  },
  'food-and-beverages-04': {
    name_en: 'Food of animal origin',
    hs: {
      quality: 'heading_range',
      codes: [
        code('0201-0210', 'Meat and edible offal', 'heading_range'),
        code('0302-0308', 'Fish, crustaceans and molluscs (other than live fish)', 'heading_range'),
        code('0401-0410', 'Dairy produce, birds\' eggs, natural honey', 'heading_range'),
      ],
      note: 'Prepared meat and fish (1601-1605) are mapped to packaged food.',
    },
    requirements: [
      unspecified('healthUmbrella'),
      fromSignal('agriculture', 'requirements_approval', DOCUMENT.veterinary, AUTHORITY.vet),
    ],
    registry_rules: [10, 16],
  },
  'food-and-beverages-05': {
    name_en: 'Agricultural produce, seeds and plants',
    hs: {
      quality: 'heading_range',
      codes: [
        code('0601-0604', 'Live plants, bulbs, cut flowers and foliage', 'heading_range'),
        code('0701-0714', 'Edible vegetables', 'heading_range'),
        code('0801-0814', 'Edible fruit and nuts', 'heading_range'),
        code('1209.xx', 'Seeds, fruit and spores of a kind used for sowing', 'heading'),
      ],
      note: 'Cereals (Chapter 10) and processed produce (Chapter 20) are not mapped to this family.',
    },
    requirements: [
      unspecified('healthUmbrella'),
      fromSignal('agriculture', 'import_permit', DOCUMENT.importPermit, AUTHORITY.ppis),
    ],
    registry_rules: [24, 49],
  },
  'food-and-beverages-06': {
    name_en: 'Vitamins for animals',
    hs: {
      quality: 'partial',
      codes: [code('2309.90', 'Preparations of a kind used in animal feeding (e.g. vitamin premixes)', 'partial')],
      note: null,
    },
    requirements: [fromSignal('agriculture', 'requirements_approval', DOCUMENT.veterinary, AUTHORITY.vet)],
    registry_rules: [25],
  },
  'food-and-beverages-07': {
    name_en: 'Vitamins for pharmaceutical manufacturing',
    hs: {
      quality: 'heading_level',
      codes: [code('2936.xx', 'Provitamins and vitamins, natural or synthetic', 'heading')],
      note: null,
    },
    requirements: [fromSignal('healthUmbrella', 'requirements_approval', DOCUMENT.pharma, AUTHORITY.pharma)],
    registry_rules: [25],
  },
  'food-and-beverages-08': {
    name_en: 'Live animals',
    hs: {
      quality: 'heading_range',
      codes: [
        code('0101-0106', 'Live animals (mammals, reptiles, birds, insects and others)', 'heading_range'),
        code('0301.xx', 'Live fish', 'heading'),
      ],
      note: 'Live crustaceans and molluscs fall under 0306 and 0307, which also cover non-live products, and are not mapped.',
    },
    requirements: [fromSignal('agriculture', 'requirements_approval', DOCUMENT.veterinaryLive, AUTHORITY.vetFood)],
    registry_rules: [6, 7],
  },
  'food-and-beverages-09': {
    name_en: 'Animal feed',
    hs: {
      quality: 'exact',
      codes: [
        code('2309.10', 'Dog or cat food, put up for retail sale'),
        code('2309.90', 'Other preparations of a kind used in animal feeding'),
      ],
      note: null,
    },
    requirements: [fromSignal('agriculture', 'requirements_approval', DOCUMENT.veterinary, AUTHORITY.vet)],
    registry_rules: [8, 16],
  },
  'food-contact-01': {
    name_en: 'Plastic items in contact with food',
    hs: {
      quality: 'partial',
      codes: [
        code('3924.10', 'Tableware and kitchenware of plastics'),
        code('3923.xx', 'Articles of plastics for the conveyance or packing of goods (e.g. bottles)', 'heading'),
      ],
      note: '3923 also covers packing that never touches food.',
    },
    requirements: [unspecified('standards')],
    registry_rules: [19],
  },
  'food-contact-02': {
    name_en: 'Polymer-coated items in contact with food',
    hs: {
      quality: 'partial',
      codes: [
        code('7615.10', 'Table, kitchen or other household articles of aluminium (e.g. non-stick pans)', 'partial'),
        code('7323.99', 'Table, kitchen or other household articles of iron or steel, other', 'partial'),
        code('4811.59', 'Paper and paperboard coated or covered with plastics', 'partial'),
      ],
      note: 'The family is defined by the coating, which the HS code does not show.',
    },
    requirements: [unspecified('standards')],
    registry_rules: [19, 31],
  },
  'food-contact-03': {
    name_en: 'Glass items in contact with food or drink',
    hs: {
      quality: 'heading_level',
      codes: [
        code('7013.xx', 'Glassware for table, kitchen or similar purposes', 'heading'),
        code('7010.90', 'Glass bottles, jars and similar containers for conveyance or packing', 'partial'),
      ],
      note: null,
    },
    requirements: [unspecified('standards')],
    registry_rules: [31],
  },
  'food-contact-04': {
    name_en: 'Ceramic items in contact with food',
    hs: {
      quality: 'exact',
      codes: [
        code('6911.10', 'Tableware and kitchenware of porcelain or china'),
        code('6912.00', 'Ceramic tableware and kitchenware, other than porcelain'),
      ],
      note: null,
    },
    requirements: [unspecified('standards')],
    registry_rules: [],
  },
  'food-contact-05': {
    name_en: 'Metal items in contact with food',
    hs: {
      quality: 'heading_level',
      codes: [
        code('7323.xx', 'Table, kitchen or other household articles of iron or steel', 'heading'),
        code('7615.10', 'Table, kitchen or other household articles of aluminium'),
      ],
      note: null,
    },
    requirements: [unspecified('standards')],
    registry_rules: [36],
  },
  'electrical-and-electronics-01': {
    name_en: 'Mains-powered electrical appliances',
    hs: {
      quality: 'partial',
      codes: [
        code('8509.xx', 'Electromechanical domestic appliances', 'heading'),
        code('8516.xx', 'Electric heating appliances (incl. coffee makers 8516.71, microwave ovens 8516.50)', 'heading'),
      ],
      note: 'A broad family: any appliance with a plug or power supply, across many chapters.',
    },
    requirements: [unspecified('standards')],
    registry_rules: [47],
  },
  'electrical-and-electronics-02': {
    name_en: 'Chargers and power supplies',
    hs: {
      quality: 'exact',
      codes: [code('8504.40', 'Static converters (e.g. chargers, power supplies)')],
      note: null,
    },
    requirements: [unspecified('standards')],
    registry_rules: [22],
  },
  'electrical-and-electronics-03': {
    name_en: 'Cables and electrical accessories',
    hs: {
      quality: 'heading_level',
      codes: [
        code('8544.42', 'Electric conductors for a voltage of 1,000 V or less, fitted with connectors'),
        code('8544.49', 'Other electric conductors for a voltage of 1,000 V or less'),
        code('8536.xx', 'Switches, plugs, sockets and other apparatus for 1,000 V or less', 'heading'),
      ],
      note: null,
    },
    requirements: [unspecified('standards')],
    registry_rules: [],
  },
  'electrical-and-electronics-04': {
    name_en: 'Electronic products not connected to the mains',
    hs: {
      quality: 'not_mappable_to_6_digit',
      codes: [],
      note: 'The family is defined by its power source, not by what the product is; it is reachable by description only.',
    },
    requirements: [unspecified('standards')],
    registry_rules: [],
  },
  'electrical-and-electronics-05': {
    name_en: 'Wireless, Wi-Fi or Bluetooth products',
    hs: {
      quality: 'partial',
      codes: [
        code('8517.62', 'Machines for the reception, conversion and transmission of data (e.g. Wi-Fi, Bluetooth)'),
        code('8525.60', 'Transmission apparatus incorporating reception apparatus (e.g. walkie-talkies)'),
        code('8518.30', 'Headphones and earphones (e.g. Bluetooth earbuds)', 'partial'),
      ],
      note: 'Many products only contain a wireless module; the family follows that feature, not the product\'s own heading.',
    },
    requirements: [unspecified('standards'), unspecified('communications')],
    registry_rules: [17],
  },
  'electrical-and-electronics-06': {
    name_en: 'Cellular and communications equipment',
    hs: {
      quality: 'exact',
      codes: [
        code('8517.13', 'Smartphones'),
        code('8517.14', 'Other telephones for cellular networks or other wireless networks'),
      ],
      note: null,
    },
    requirements: [unspecified('communications')],
    registry_rules: [17],
  },
  'electrical-and-electronics-07': {
    name_en: 'Batteries and cells',
    hs: {
      quality: 'heading_level',
      codes: [
        code('8506.xx', 'Primary cells and primary batteries', 'heading'),
        code('8507.xx', 'Electric accumulators (incl. lithium-ion 8507.60)', 'heading'),
      ],
      note: 'Vehicle starter batteries (8507.10) are also the vehicle battery family (vehicles-and-transport-10).',
    },
    requirements: [unspecified('standards')],
    registry_rules: [22],
  },
  'electrical-and-electronics-08': {
    name_en: 'Lighting fittings and lamps',
    hs: {
      quality: 'heading_level',
      codes: [
        code('8539.xx', 'Electric lamps (incl. LED lamps 8539.52)', 'heading'),
        code('9405.xx', 'Luminaires and lighting fittings', 'heading'),
      ],
      note: null,
    },
    requirements: [unspecified('standards')],
    registry_rules: [],
  },
  'electrical-and-electronics-09': {
    name_en: 'Equipment containing a battery',
    hs: {
      quality: 'not_mappable_to_6_digit',
      codes: [],
      note: 'The family is defined by containing a battery, not by what the product is; it is reachable by description only.',
    },
    requirements: [
      fromNote('unspecified', null, SIGNAL_AUTHORITY.standards, { en: 'if the product connects to the mains or comes with a charger', he: 'אם המוצר מתחבר לרשת החשמל או מגיע עם מטען' }),
    ],
    registry_rules: [22, 46],
  },
  'electrical-and-electronics-10': {
    name_en: 'Drones',
    hs: {
      quality: 'heading_level',
      codes: [code('8806.xx', 'Unmanned aircraft', 'heading')],
      note: 'HS2022 created heading 8806 for unmanned aircraft; camera drones are no longer classified as cameras (8525).',
    },
    requirements: [fromSignal('communications', 'requirements_approval', DOCUMENT.communications, AUTHORITY.moc)],
    registry_rules: [17, 41],
  },
  'electrical-and-electronics-11': {
    name_en: 'Air conditioners and refrigerators',
    hs: {
      quality: 'heading_level',
      codes: [
        code('8415.xx', 'Air conditioning machines', 'heading'),
        code('8418.10', 'Combined refrigerator-freezers with separate external doors'),
        code('8418.21', 'Household refrigerators, compression-type'),
        code('8418.29', 'Other household refrigerators'),
      ],
      note: 'Accessories, spare parts and vehicle air conditioners are not the appliance itself.',
    },
    requirements: [
      fromSignal('standards', 'standards_approval', DOCUMENT.sii, AUTHORITY.sii),
      fromSignal('otherPermit', 'requirements_approval', DOCUMENT.energy, AUTHORITY.energy),
    ],
    registry_rules: [43],
  },
  'electrical-and-electronics-12': {
    name_en: 'Solar panels',
    hs: {
      quality: 'exact',
      codes: [code('8541.43', 'Photovoltaic cells assembled in modules or made up into panels')],
      note: null,
    },
    requirements: [],
    registry_rules: [44],
  },
  'electrical-and-electronics-13': {
    name_en: 'Solar inverters',
    hs: {
      quality: 'partial',
      codes: [code('8504.40', 'Static converters (e.g. inverters)', 'partial')],
      note: '8504.40 also covers chargers and power supplies (electrical-and-electronics-02).',
    },
    requirements: [fromSignal('standards', 'standards_approval', DOCUMENT.sii, AUTHORITY.sii)],
    registry_rules: [44],
  },
  'vehicles-and-transport-01': {
    name_en: 'Complete vehicles',
    hs: {
      quality: 'heading_level',
      codes: [
        code('8702.xx', 'Motor vehicles for the transport of ten or more persons', 'heading'),
        code('8703.xx', 'Motor cars and other motor vehicles for the transport of persons', 'heading'),
        code('8704.xx', 'Motor vehicles for the transport of goods', 'heading'),
      ],
      note: null,
    },
    requirements: [fromSignal('transportOrVehicleLaboratory', 'import_license', DOCUMENT.importLicence, AUTHORITY.mot)],
    registry_rules: [47, 49],
  },
  'vehicles-and-transport-02': {
    name_en: 'Complete motorcycles and scooters',
    hs: {
      quality: 'heading_level',
      codes: [code('8711.xx', 'Motorcycles and cycles fitted with an auxiliary motor', 'heading')],
      note: 'Electric bicycles and scooters (8711.60) are their own family (additional-consumer-products-07).',
    },
    requirements: [fromSignal('transportOrVehicleLaboratory', 'import_license', DOCUMENT.importLicence, AUTHORITY.mot)],
    registry_rules: [49],
  },
  'vehicles-and-transport-03': {
    name_en: 'Vehicle spare parts',
    hs: {
      quality: 'partial',
      codes: [code('8708.xx', 'Parts and accessories of motor vehicles', 'heading')],
      note: 'Engines, electrical parts and other parts are classified elsewhere (e.g. 8407, 8511).',
    },
    requirements: [fromSignal('transportOrVehicleLaboratory', 'requirements_approval', DOCUMENT.vehicleApproval, AUTHORITY.motOrLab)],
    registry_rules: [23],
  },
  'vehicles-and-transport-04': {
    name_en: 'Motorcycle and scooter spare parts',
    hs: {
      quality: 'exact',
      codes: [code('8714.10', 'Parts and accessories of motorcycles (including mopeds)')],
      note: null,
    },
    requirements: [unspecified('transportOrVehicleLaboratory')],
    registry_rules: [23],
  },
  'vehicles-and-transport-05': {
    name_en: 'Vehicle lamps and lighting',
    hs: {
      quality: 'exact',
      codes: [
        code('8512.20', 'Other lighting or visual signalling equipment for vehicles'),
        code('8539.10', 'Sealed beam lamp units'),
      ],
      note: null,
    },
    requirements: [unspecified('transportOrVehicleLaboratory')],
    registry_rules: [23],
  },
  'vehicles-and-transport-06': {
    name_en: 'Brake, steering and safety parts',
    hs: {
      quality: 'exact',
      codes: [
        code('8708.21', 'Safety seat belts'),
        code('8708.30', 'Brakes and servo-brakes and parts thereof'),
        code('8708.94', 'Steering wheels, steering columns and steering boxes'),
        code('8708.95', 'Safety airbags with inflater system'),
      ],
      note: null,
    },
    requirements: [unspecified('transportOrVehicleLaboratory')],
    registry_rules: [23],
  },
  'vehicles-and-transport-07': {
    name_en: 'Tyres and wheels',
    hs: {
      quality: 'heading_level',
      codes: [
        code('4011.xx', 'New pneumatic tyres of rubber', 'heading'),
        code('4012.xx', 'Retreaded or used pneumatic tyres of rubber', 'heading'),
        code('8708.70', 'Road wheels and parts and accessories thereof'),
      ],
      note: null,
    },
    requirements: [unspecified('transportOrVehicleLaboratory')],
    registry_rules: [23],
  },
  'vehicles-and-transport-08': {
    name_en: 'Vehicle glass and windscreens',
    hs: {
      quality: 'exact',
      codes: [
        code('7007.11', 'Toughened safety glass for vehicles'),
        code('7007.21', 'Laminated safety glass for vehicles'),
      ],
      note: null,
    },
    requirements: [unspecified('transportOrVehicleLaboratory')],
    registry_rules: [23],
  },
  'vehicles-and-transport-09': {
    name_en: 'Vehicle comfort and decoration accessories',
    hs: {
      quality: 'partial',
      codes: [code('8708.29', 'Other parts and accessories of bodies', 'partial')],
      note: 'Textile accessories such as seat covers may be classified under Chapter 63 instead.',
    },
    requirements: [unspecified('transportOrVehicleLaboratory')],
    registry_rules: [23],
  },
  'vehicles-and-transport-10': {
    name_en: 'Vehicle batteries',
    hs: {
      quality: 'exact',
      codes: [code('8507.10', 'Lead-acid accumulators of a kind used for starting piston engines')],
      note: null,
    },
    requirements: [fromSignal('transportOrVehicleLaboratory', 'requirements_approval', DOCUMENT.vehicleApproval, AUTHORITY.vehicleLab)],
    registry_rules: [22, 37],
  },
  'vehicles-and-transport-11': {
    name_en: 'Electric vehicle charging stations',
    hs: {
      quality: 'partial',
      codes: [code('8504.40', 'Static converters (e.g. EV chargers)', 'partial')],
      note: null,
    },
    requirements: [fromSignal('transportOrVehicleLaboratory', 'requirements_approval', DOCUMENT.vehicleApproval, AUTHORITY.vehicleLabOrDivision)],
    registry_rules: [44],
  },
  'children-and-infants-01': {
    name_en: 'Toys',
    hs: {
      quality: 'exact',
      codes: [code('9503.00', 'Toys, scale models, puzzles and similar')],
      note: 'Archery equipment for sport falls under 9506.99.',
    },
    requirements: [
      fromSignal('standards', 'standards_approval', DOCUMENT.sii, AUTHORITY.sii),
      fromNote('import_license', DOCUMENT.importLicence, AUTHORITY.importAdmin, { en: 'may also apply to bows and arrow-shooting games', he: 'קשתות ומשחקים היורים חצים' }),
    ],
    registry_rules: [30, 39],
  },
  'children-and-infants-02': {
    name_en: 'Electric or wireless toys',
    hs: {
      quality: 'partial',
      codes: [code('9503.00', 'Toys (electric or wireless)', 'partial')],
      note: 'Shares 9503.00 with toys; the family follows the electric or wireless feature.',
    },
    requirements: [unspecified('standards')],
    registry_rules: [30],
  },
  'children-and-infants-03': {
    name_en: 'Baby products',
    hs: {
      quality: 'not_mappable_to_6_digit',
      codes: [],
      note: 'The family is defined by its users, across many chapters; it is reachable by description only.',
    },
    requirements: [unspecified('standards')],
    registry_rules: [],
  },
  'children-and-infants-04': {
    name_en: 'Strollers, cots, playpens and high chairs',
    hs: {
      quality: 'partial',
      codes: [
        code('8715.00', 'Baby carriages and parts thereof'),
        code('9403.xx', 'Other furniture (e.g. cots, playpens)', 'heading'),
        code('9401.xx', 'Seats (e.g. high chairs)', 'heading'),
      ],
      note: null,
    },
    requirements: [unspecified('standards')],
    registry_rules: [20],
  },
  'children-and-infants-05': {
    name_en: 'Pacifier holders',
    hs: {
      quality: 'partial',
      codes: [
        code('3926.90', 'Other articles of plastics', 'partial'),
        code('6307.90', 'Other made-up textile articles', 'partial'),
      ],
      note: 'Classification follows the material.',
    },
    requirements: [fromSignal('standards', 'standards_approval', DOCUMENT.sii, AUTHORITY.sii)],
    registry_rules: [33],
  },
  'children-and-infants-06': {
    name_en: 'Baby carriers',
    hs: {
      quality: 'partial',
      codes: [code('6307.90', 'Other made-up textile articles', 'partial')],
      note: null,
    },
    requirements: [fromSignal('standards', 'standards_approval', DOCUMENT.sii, AUTHORITY.sii)],
    registry_rules: [33],
  },
  'children-and-infants-07': {
    name_en: 'Child car seats',
    hs: {
      quality: 'partial',
      codes: [code('9401.20', 'Seats of a kind used for motor vehicles', 'partial')],
      note: '9401.20 covers every vehicle seat, not only child seats.',
    },
    requirements: [fromSignal('standards', 'standards_approval', DOCUMENT.sii, AUTHORITY.sii)],
    registry_rules: [48],
  },
  'textiles-and-furniture-01': {
    name_en: 'Clothing and textiles',
    hs: {
      quality: 'heading_range',
      codes: [
        code('6101-6117', 'Apparel and clothing accessories, knitted or crocheted', 'heading_range'),
        code('6201-6217', 'Apparel and clothing accessories, not knitted or crocheted', 'heading_range'),
      ],
      note: null,
    },
    requirements: [
      fromNote('standards_approval', DOCUMENT.sii, AUTHORITY.sii, { en: 'children\'s clothing and sleepwear', he: 'ביגוד לילדים ובגדי שינה' }),
    ],
    registry_rules: [38, 46],
  },
  'textiles-and-furniture-02': {
    name_en: 'Ordinary footwear',
    hs: {
      quality: 'heading_range',
      codes: [code('6401-6405', 'Footwear', 'heading_range')],
      note: 'Safety footwear is its own family (textiles-and-furniture-04).',
    },
    requirements: [
      fromNote('unspecified', null, SIGNAL_AUTHORITY.standards, { en: 'footwear designed for safety or protection', he: 'הנעלה ייעודית לבטיחות או להגנה' }),
    ],
    registry_rules: [46],
  },
  'textiles-and-furniture-03': {
    name_en: 'Mattresses',
    hs: {
      quality: 'exact',
      codes: [
        code('9404.21', 'Mattresses of cellular rubber or plastics'),
        code('9404.29', 'Mattresses of other materials'),
      ],
      note: null,
    },
    requirements: [unspecified('standards')],
    registry_rules: [20],
  },
  'textiles-and-furniture-04': {
    name_en: 'Safety footwear',
    hs: {
      quality: 'partial',
      codes: [
        code('6401.10', 'Waterproof footwear incorporating a protective metal toe-cap'),
        code('6403.40', 'Other footwear incorporating a protective metal toe-cap'),
      ],
      note: 'Safety footwear without a metal toe-cap is classified with ordinary footwear (6401-6405).',
    },
    requirements: [fromSignal('standards', 'standards_approval', DOCUMENT.sii, AUTHORITY.sii)],
    registry_rules: [],
  },
  'textiles-and-furniture-05': {
    name_en: 'Furniture',
    hs: {
      quality: 'heading_level',
      codes: [
        code('9401.xx', 'Seats', 'heading'),
        code('9403.xx', 'Other furniture', 'heading'),
      ],
      note: 'Vehicle seats (9401.20) belong to child car seats or vehicle parts.',
    },
    requirements: [
      fromNote('unspecified', null, SIGNAL_AUTHORITY.standards, { en: 'if the furniture includes wiring or an electrical system', he: 'אם הרהיט כולל חיווט או מערכת חשמלית' }),
    ],
    registry_rules: [20, 46],
  },
  'textiles-and-furniture-06': {
    name_en: 'Carpets and rugs',
    hs: {
      quality: 'heading_range',
      codes: [code('5701-5705', 'Carpets and other textile floor coverings', 'heading_range')],
      note: null,
    },
    requirements: [fromSignal('standards', 'standards_approval', DOCUMENT.sii, AUTHORITY.sii)],
    registry_rules: [33],
  },
  'textiles-and-furniture-07': {
    name_en: 'Ordinary blankets',
    hs: {
      quality: 'heading_level',
      codes: [code('6301.xx', 'Blankets and travelling rugs (electric blankets 6301.10)', 'heading')],
      note: null,
    },
    requirements: [
      fromNote('unspecified', null, SIGNAL_AUTHORITY.standards, { en: 'an electric blanket or a textile product with electrical wiring', he: 'שמיכה חשמלית או מוצר טקסטיל עם חיווט חשמלי' }),
    ],
    registry_rules: [33, 46],
  },
  'textiles-and-furniture-08': {
    name_en: 'Household textiles',
    hs: {
      quality: 'heading_level',
      codes: [
        code('6302.xx', 'Bed, table, toilet and kitchen linen', 'heading'),
        code('6303.xx', 'Curtains and interior blinds', 'heading'),
        code('5903.xx', 'Textile fabrics impregnated, coated or laminated with plastics (e.g. upholstery fabric)', 'heading'),
        code('4202.92', 'Bags with outer surface of textile materials', 'partial'),
      ],
      note: null,
    },
    requirements: [],
    registry_rules: [33],
  },
  'construction-and-industrial-01': {
    name_en: 'Building materials',
    hs: {
      quality: 'not_mappable_to_6_digit',
      codes: [],
      indicative_ranges: [
        { range: 'Chapter 25', description: 'Salt, earths, stone, lime and cement' },
        { range: 'Chapter 68', description: 'Articles of stone, plaster, cement and similar' },
        { range: 'Chapter 69', description: 'Ceramic products' },
      ],
      note: 'Building materials span many chapters; whether a product is one depends on its use.',
    },
    requirements: [
      fromNote('unspecified', null, AUTHORITY.notNamed, { en: 'certain building-material products, depending on the material, use, tariff item and applicable standards', he: 'מוצרים מסוימים בתחום חומרי הבניין' }),
    ],
    registry_rules: [29, 46],
  },
  'construction-and-industrial-02': {
    name_en: 'Industrial machinery and equipment',
    hs: {
      quality: 'not_mappable_to_6_digit',
      codes: [],
      indicative_ranges: [{ range: 'Chapter 84', description: 'Machinery and mechanical appliances' }],
      note: 'Chapter 84 is too broad to map as one family.',
    },
    requirements: [],
    registry_rules: [29],
  },
  'construction-and-industrial-03': {
    name_en: 'Wood products and plant raw materials',
    hs: {
      quality: 'heading_range',
      codes: [
        code('4401-4421', 'Wood and articles of wood', 'heading_range'),
        code('1401-1404', 'Vegetable plaiting materials and other vegetable products', 'heading_range'),
      ],
      note: 'Wooden packing boxes (4415) are their own family (construction-and-industrial-05).',
    },
    requirements: [unspecified('agriculture')],
    registry_rules: [],
  },
  'construction-and-industrial-04': {
    name_en: 'Hand tools',
    hs: {
      quality: 'heading_range',
      codes: [
        code('8201-8205', 'Hand tools', 'heading_range'),
        code('8206.00', 'Tools of two or more of headings 8202-8205, put up in sets'),
      ],
      note: 'Power tools are classified in 8467.',
    },
    requirements: [
      fromNote('unspecified', null, SIGNAL_AUTHORITY.standards, { en: 'if the tool connects to the mains or comes with a charger', he: 'אם הכלי מתחבר לרשת החשמל או מגיע עם מטען' }),
    ],
    registry_rules: [32, 46],
  },
  'construction-and-industrial-05': {
    name_en: 'Wooden packing boxes',
    hs: {
      quality: 'exact',
      codes: [
        code('4415.10', 'Cases, boxes, crates, drums and similar packings of wood'),
        code('4415.20', 'Pallets, box pallets and other load boards of wood'),
      ],
      note: null,
    },
    requirements: [fromSignal('agriculture', 'requirements_approval', DOCUMENT.woodPackaging, AUTHORITY.agriculture)],
    registry_rules: [31],
  },
  'construction-and-industrial-06': {
    name_en: 'Safety glass for buildings',
    hs: {
      quality: 'exact',
      codes: [
        code('7007.19', 'Toughened safety glass, other than for vehicles'),
        code('7007.29', 'Laminated safety glass, other than for vehicles'),
      ],
      note: null,
    },
    requirements: [fromSignal('standards', 'standards_approval', DOCUMENT.sii, AUTHORITY.sii)],
    registry_rules: [],
  },
  'construction-and-industrial-07': {
    name_en: 'Firefighting equipment',
    hs: {
      quality: 'partial',
      codes: [
        code('8424.10', 'Fire extinguishers'),
        code('8531.10', 'Burglar or fire alarms and similar apparatus (e.g. smoke detectors)'),
        code('6307.90', 'Other made-up textile articles (e.g. fire blankets)', 'partial'),
      ],
      note: null,
    },
    requirements: [fromSignal('standards', 'standards_approval', DOCUMENT.sii, AUTHORITY.sii)],
    registry_rules: [48],
  },
  'construction-and-industrial-08': {
    name_en: 'Elevators and lifting equipment',
    hs: {
      quality: 'heading_level',
      codes: [
        code('8428.10', 'Lifts and skip hoists'),
        code('8425.xx', 'Pulley tackle, hoists, winches and jacks', 'heading'),
        code('8426.xx', 'Cranes', 'heading'),
        code('8427.xx', 'Fork-lift trucks and other works trucks fitted with lifting equipment', 'heading'),
      ],
      note: null,
    },
    requirements: [],
    registry_rules: [48],
  },
  'additional-consumer-products-01': {
    name_en: 'Sports equipment',
    hs: {
      quality: 'heading_level',
      codes: [code('9506.xx', 'Articles and equipment for sports, gymnastics and athletics', 'heading')],
      note: null,
    },
    requirements: [
      fromNote('unspecified', null, SIGNAL_AUTHORITY.standards, { en: 'sports and fitness equipment with electrical wiring', he: 'ציוד ספורט וכושר עם חיווט חשמלי' }),
    ],
    registry_rules: [18, 46],
  },
  'additional-consumer-products-02': {
    name_en: 'Ordinary bicycles and scooters',
    hs: {
      quality: 'partial',
      codes: [code('8712.00', 'Bicycles and other cycles, not motorised')],
      note: 'Non-motorised kick scooters may be classified as toys (9503.00) or sports equipment (9506) depending on design.',
    },
    requirements: [unspecified('standards')],
    registry_rules: [],
  },
  'additional-consumer-products-04': {
    name_en: 'Marine equipment and vessels',
    hs: {
      quality: 'heading_range',
      codes: [code('8901-8908', 'Ships, boats and floating structures', 'heading_range')],
      note: 'Marine equipment other than vessels is classified by its own nature and is not mapped.',
    },
    requirements: [unspecified('otherPermit')],
    registry_rules: [],
  },
  'additional-consumer-products-05': {
    name_en: 'Pet products',
    hs: {
      quality: 'partial',
      codes: [code('4201.00', 'Saddlery and harness for any animal (e.g. leashes, collars)')],
      note: 'Pet beds, bowls, toys and aquarium accessories are classified by material and are not mapped. Pet food is animal feed (food-and-beverages-09).',
    },
    requirements: [],
    registry_rules: [9, 16],
  },
  'additional-consumer-products-06': {
    name_en: 'Personal protective equipment',
    hs: {
      quality: 'partial',
      codes: [
        code('9020.00', 'Other breathing appliances and gas masks'),
        code('9004.90', 'Other spectacles and goggles (e.g. protective goggles)', 'partial'),
        code('6116.10', 'Gloves impregnated, coated or covered with plastics or rubber', 'partial'),
        code('4015.19', 'Other gloves of vulcanised rubber', 'partial'),
      ],
      note: 'Safety harnesses and other items are classified by material and are not mapped.',
    },
    requirements: [fromSignal('standards', 'standards_approval', DOCUMENT.sii, AUTHORITY.sii)],
    registry_rules: [27],
  },
  'additional-consumer-products-07': {
    name_en: 'Bicycles or scooters with an auxiliary motor',
    hs: {
      quality: 'exact',
      codes: [code('8711.60', 'Cycles and scooters with an electric motor for propulsion')],
      note: null,
    },
    requirements: [fromSignal('transportOrVehicleLaboratory', 'requirements_approval', DOCUMENT.vehicleApproval, AUTHORITY.vehicleLab)],
    registry_rules: [],
  },
  'additional-consumer-products-08': {
    name_en: 'Cardboard packaging',
    hs: {
      quality: 'exact',
      codes: [
        code('4819.10', 'Cartons, boxes and cases of corrugated paper or paperboard'),
        code('4819.20', 'Folding cartons, boxes and cases of non-corrugated paper or paperboard'),
      ],
      note: null,
    },
    requirements: [],
    registry_rules: [31],
  },
  'additional-consumer-products-09': {
    name_en: 'Paper and printed products',
    hs: {
      quality: 'heading_range',
      codes: [
        code('4901-4911', 'Printed books, newspapers, pictures and other printed products', 'heading_range'),
        code('4802.xx', 'Uncoated paper for writing or printing', 'heading'),
        code('4820.xx', 'Notebooks, registers and similar stationery', 'heading'),
        code('4821.xx', 'Paper or paperboard labels', 'heading'),
      ],
      note: null,
    },
    requirements: [
      fromNote('standards_approval', DOCUMENT.sii, AUTHORITY.sii, { en: 'children\'s books of a toy-like nature', he: 'ספרי ילדים בעלי אופי משחקי' }),
    ],
    registry_rules: [46, 47],
  },
  'additional-consumer-products-10': {
    name_en: 'Helmets',
    hs: {
      quality: 'exact',
      codes: [code('6506.10', 'Safety headgear')],
      note: null,
    },
    requirements: [fromSignal('standards', 'standards_approval', DOCUMENT.sii, AUTHORITY.sii)],
    registry_rules: [1, 2, 3],
  },
  'additional-consumer-products-11': {
    name_en: 'Gas appliances and gas fittings',
    hs: {
      quality: 'partial',
      codes: [
        code('7321.11', 'Cooking appliances and plate warmers for gas fuel'),
        code('7321.81', 'Other appliances for gas fuel (e.g. heaters)'),
        code('7311.00', 'Containers for compressed or liquefied gas, of iron or steel'),
        code('8481.10', 'Pressure-reducing valves (e.g. gas regulators)', 'partial'),
      ],
      note: null,
    },
    requirements: [fromSignal('standards', 'standards_approval', DOCUMENT.sii, AUTHORITY.sii)],
    registry_rules: [42],
  },
  'additional-consumer-products-12': {
    name_en: 'Tobacco products and e-cigarettes',
    hs: {
      quality: 'heading_range',
      codes: [
        code('2401-2403', 'Tobacco and manufactured tobacco', 'heading_range'),
        code('2404.xx', 'Products containing nicotine intended for inhalation without combustion (e.g. e-liquids)', 'heading'),
        code('8543.40', 'Electronic cigarettes and similar personal electric vaporising devices'),
      ],
      note: null,
    },
    requirements: [
      fromNote('unspecified', null, SIGNAL_AUTHORITY.healthUmbrella, { en: 'commercial import (restrictions may apply)', he: 'ביבוא מסחרי' }),
    ],
    registry_rules: [45, 46],
  },
  'additional-consumer-products-13': {
    name_en: 'Weapons and security equipment',
    hs: {
      quality: 'heading_level',
      codes: [
        code('9301.xx', 'Military weapons', 'heading'),
        code('9302.00', 'Revolvers and pistols'),
        code('9303.xx', 'Other firearms (e.g. sporting, hunting)', 'heading'),
        code('9304.00', 'Other arms (e.g. air guns)'),
        code('9305.xx', 'Parts and accessories of articles of 9301-9304', 'heading'),
        code('9306.xx', 'Ammunition and projectiles', 'heading'),
        code('9307.00', 'Swords, bayonets and similar (cold weapons)'),
      ],
      note: 'Security equipment (ציוד ביטחוני) has no single chapter and is not mapped.',
    },
    requirements: [fromSignal('otherPermit', 'import_license', DOCUMENT.licence, AUTHORITY.mod)],
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

/**
 * Personal import dimension (Product Owner decision, 2026-11-05; registry
 * rule 50). Each family gets a `personal_import` object, derived by rule
 * from its own requirements rather than written family by family:
 *
 *   - Baseline: personal-use quantities are exempt from the commercial
 *     standards approval. So a family whose requirements name only the
 *     standards regime (or nothing at all) gets the exemption.
 *   - Exceptions: a low quantity never exempts a requirement from any
 *     other authority (communications, transport, health, agriculture,
 *     defense, environmental protection, or any other permit). Such a
 *     family gets no exemption, and its conditions name the authorities
 *     whose requirement still applies.
 *   - PERSONAL_IMPORT_OVERRIDES adds what the requirements alone don't
 *     show: weapons are not allowed without a licence, drones also involve
 *     the Civil Aviation Authority, and fire-lighting fluids are flammable
 *     dangerous goods.
 *
 * Every object is unverified pending the broker audit, like the
 * requirements.
 */
export const PERSONAL_IMPORT_BASELINE =
  'Personal-use quantity: up to 30 units if under USD 1,000, or up to 5 units if over USD 1,000. Within these limits, the commercial standards approval does not apply.';
export const PERSONAL_EXCEPTION_CATEGORIES = Object.freeze([
  'defense_or_hazardous', 'communications', 'transport', 'health', 'agriculture', 'other_authority',
]);
const STANDARDS_AUTHORITIES = new Set([AUTHORITY.sii.en, SIGNAL_AUTHORITY.standards.en]);
const PERSONAL_IMPORT_OVERRIDES = Object.freeze({
  'additional-consumer-products-13': {
    category: 'defense_or_hazardous',
    allowed: false,
    conditions: 'Not permitted as a personal import without a Ministry of Defense licence.',
  },
  'electrical-and-electronics-10': {
    extraAuthorities: ['Civil Aviation Authority'],
  },
  'chemicals-and-materials-06': {
    category: 'defense_or_hazardous',
    conditions: 'Flammable dangerous goods: dangerous-goods restrictions and the standards requirement still apply to personal imports.',
  },
});

function exceptionCategory(signals, authorities) {
  const names = authorities.join(' ');
  if (/Ministry of Defense|Ministry of Environmental Protection/.test(names)) return 'defense_or_hazardous';
  if (signals.includes('communications')) return 'communications';
  if (signals.includes('transportOrVehicleLaboratory')) return 'transport';
  if (signals.includes('healthUmbrella')) return 'health';
  if (signals.includes('agriculture')) return 'agriculture';
  if (signals.includes('otherPermit')) return 'other_authority';
  return null;
}

function personalImportFor(family, data) {
  const override = PERSONAL_IMPORT_OVERRIDES[family.id] || {};
  // Only the general (matrix-signal) requirements decide the exemption; a
  // conditional note's flag still travels with the requirement itself.
  const general = data.requirements.filter((r) => r.basis === 'matrix_signal');
  const authorities = [...new Set(general.map((r) => r.authority.en).filter((a) => !STANDARDS_AUTHORITIES.has(a)))];
  const category = override.category || exceptionCategory(positiveSignals(family), authorities);
  const stillRequired = [...authorities, ...(override.extraAuthorities || [])];
  let conditions = PERSONAL_IMPORT_BASELINE;
  if (override.conditions) conditions = override.conditions;
  else if (category) conditions = `Low quantities do not exempt this family. Still required for personal import: ${stillRequired.join('; ')}.`;
  if (family.personalImportNote) conditions += ` Non-commercial quantity only (matrix note: ${family.personalImportNote}).`;
  return {
    allowed_in_personal_import: override.allowed !== false,
    commercial_exemption_applies: category === null,
    conditions,
    exception_category: category,
    basis: category === null ? 'baseline_rule' : 'exception_rule',
    verification_status: VERIFICATION_STATUS,
  };
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
    personal_import: personalImportFor(family, data),
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
  for (const f of PRODUCT_FAMILY_MATRIX.filter((m) => m.activeStatus)) check(inBatch(f), `${f.id} is active but in no batch category`);
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

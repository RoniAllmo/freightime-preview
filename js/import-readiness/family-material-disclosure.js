/**
 * Presentation-only progressive-disclosure suggestion layer for the
 * product-family and material checkbox groups (`irStepProductContext`).
 *
 * Purely advisory and read-only: it computes which of the *existing*
 * checkbox values to show first, so a user typing something narrow
 * (e.g. "אוהל", a tent) is not confronted with all 23 family options
 * and all 13 material options at equal visual prominence, most of them
 * irrelevant. It never adds, removes, renames, or reorders a canonical
 * checkbox value; never auto-checks a checkbox; and never feeds back
 * into family/material identification or result construction -- those
 * continue to read the full, unmodified `productFamilies`/`materials`
 * arrays exactly as before this file existed (see
 * import-readiness-controller.js's `collectRawFormState` and
 * `product-family-result.js`, both untouched by this file).
 *
 * Family suggestions reuse the existing, already-reviewed
 * `identifyProductFamily` free-text matcher (product-family-
 * identification.js) and the existing, already-reviewed checkbox ->
 * matrix-family mapping (`PRODUCT_FAMILY_SELECTION_CANDIDATES` in
 * product-family-selection-mapping.js), inverted so a matched matrix
 * family can point back to the checkbox(es) that can reach it. This is
 * the same free-text signal the questionnaire already computes
 * elsewhere -- no new matching algorithm, no product-name-specific
 * branch, no second identification engine.
 *
 * Material suggestions have no general free-text or family-to-material
 * identification signal anywhere in this codebase (verified: no matrix
 * row carries a material field). Inventing a general one would risk
 * steering users toward a wrong material, which this change must never
 * do. Absent a concept-hint match (see PRESENTATION_CONCEPT_HINTS
 * below -- a narrow, explicitly reviewed exception for a handful of
 * uncontroversial product concepts with no matrix alias at all, such
 * as "אוהל"/tent -> textile), the material suggestion is a fixed,
 * neutral, safe default -- the first few materials in their existing,
 * curated checkbox order -- not a claim of relevance to any particular
 * product. Either way, it reduces the initial visual set from 13 to a
 * handful, with the same "show all" escape hatch.
 */

import { identifyProductFamily, IDENTIFICATION_OUTCOME } from './product-family-identification.js';
import { PRODUCT_FAMILY_SELECTION_CANDIDATES } from './product-family-selection-mapping.js';
import { normalizeHebrewSearchText } from './regulatory-signals/keyword-hints.js';

/**
 * The 23 `irProductFamily` checkbox values, in their exact existing
 * index.html DOM order. Duplicated here deliberately as a literal,
 * reviewable list (rather than importing layered-question-model.js's
 * `PRODUCT_FAMILY` enum) because that enum is the canonical *data*
 * contract consumed by normalization/validation, and this module must
 * never be able to influence it by accident; a plain, obviously-inert
 * presentation-ordering list is safer here. If the two ever drift,
 * `family-material-disclosure.test.js` fails loudly.
 */
export const ALL_PRODUCT_FAMILY_VALUES = Object.freeze([
  'cosmetics_and_beauty',
  'food_and_beverage',
  'dietary_supplements',
  'food_contact_items',
  'electrical_and_electronics',
  'wireless_or_transmitting_equipment',
  'batteries_or_battery_containing',
  'childrens_products_and_toys',
  'textile_apparel_and_footwear',
  'furniture_and_home_goods',
  'glass_ceramics_and_tableware',
  'plastics_polymers_and_coated_products',
  'vehicle_parts_and_transport_accessories',
  'medical_equipment_or_medical_use',
  'chemicals_paints_adhesives_aerosols',
  'animal_origin_products',
  'live_animals',
  'animal_feed',
  'plant_origin_products',
  'industrial_machinery_and_equipment',
  'building_materials',
  'other_general_product',
  'not_sure',
]);

/**
 * The 13 `irMaterial` checkbox values, in their exact existing
 * index.html DOM order. Note: index.html's material checklist does not
 * currently include `mixed_materials` (present in
 * layered-question-model.js's 14-value `MATERIAL` enum) -- a
 * pre-existing gap between that enum and the rendered checklist, out
 * of scope for this presentation-only change and left untouched.
 */
export const ALL_MATERIAL_VALUES = Object.freeze([
  'plastic_or_polymer',
  'metal',
  'glass',
  'ceramic',
  'wood',
  'textile',
  'leather',
  'rubber',
  'paper_or_cardboard',
  'chemical_substance',
  'animal_origin_material',
  'plant_origin_material',
  'unknown',
]);

const MAX_SUGGESTED_FAMILIES = 4;
const MAX_SUGGESTED_MATERIALS = 4;

/**
 * Narrow, presentation-only concept hints (product-owner-authorized UX
 * correction) for product concepts the canonical regulatory matrix has
 * no alias for at all -- so `identifyProductFamily` legitimately
 * returns NONE and the matrix-based suggestion above is empty -- but
 * where the family/material are uncontroversial common knowledge and
 * showing the complete unranked 23/13-option list is still needless
 * cognitive overload (e.g. "אוהל", a tent: there is no tent row
 * anywhere in the matrix, and adding one is out of scope -- see
 * PRODUCT_FAMILY_SELECTION_CANDIDATES's own "Known coverage gaps" doc
 * comment in product-family-selection-mapping.js).
 *
 * This registry is NEVER consulted by identifyProductFamily,
 * product-family-result.js, or any regulatory/result-construction
 * code path -- verified by test (this module is not imported there).
 * It only ever widens the *display* suggestion set computed below, and
 * only when the real matrix-based signal found nothing at all -- it
 * can never override or suppress a genuine matrix match.
 *
 * Each entry requires both a positive term list and a negative
 * (boundary-protection) term list, modeled on the identical, already-
 * reviewed pattern used for `FAMILY_NEGATIVE_TERMS` in
 * product-family-identification.js: a co-occurring negative phrase
 * (an accessory, a spare part, a repair kit -- not the complete
 * product itself) suppresses the match entirely, so "tent pole" or
 * "tent repair kit" never gets treated as a complete tent.
 */
const PRESENTATION_CONCEPT_HINTS = Object.freeze([
  {
    concept: 'tent',
    positiveTerms: Object.freeze(['אוהל', 'tent']),
    negativeTerms: Object.freeze([
      // Hebrew accessory/part/repair phrasing -- an accessory FOR a
      // tent, or a tent part/repair kit, is not a complete tent.
      'אביזר לאוהל', 'אביזרי אוהל', 'אביזר אוהל',
      'עמוד לאוהל', 'עמוד אוהל', 'עמודי אוהל',
      'יתד לאוהל', 'יתד אוהל', 'יתדות אוהל', 'יתדות לאוהל',
      'ערכת תיקון לאוהל', 'ערכת תיקון אוהל', 'תיקון לאוהל', 'תיקון אוהל', 'חלק חילוף לאוהל',
      // English accessory/part/repair phrasing.
      'tent accessory', 'tent accessories', 'tent pole', 'tent poles',
      'tent stake', 'tent stakes', 'tent peg', 'tent pegs',
      'tent repair', 'tent repair kit', 'tent replacement part', 'spare part for tent',
    ]),
    // The existing, real textile_apparel_and_footwear family checkbox
    // -- never a new family, never a matrix alias.
    suggestedFamilyValues: Object.freeze(['textile_apparel_and_footwear']),
    // The existing, real textile material checkbox, plus the same
    // materials the current safe static default already treats as
    // common/unselected possibilities (plastic_or_polymer, metal) and
    // the existing "unknown" (not-sure-equivalent) option -- never a
    // new material, never an automatic selection.
    suggestedMaterialValues: Object.freeze(['textile', 'plastic_or_polymer', 'metal', 'unknown']),
  },
]);

/**
 * @param {string[]} texts
 * @returns {object|null} the first matching PRESENTATION_CONCEPT_HINTS
 *   entry whose haystack contains a positive term and no negative term,
 *   or null if none match.
 */
function matchPresentationConceptHint(texts) {
  const haystack = normalizeHebrewSearchText(
    (Array.isArray(texts) ? texts : []).filter((t) => typeof t === 'string').join(' '),
  ).toLowerCase();
  if (!haystack) return null;

  for (const hint of PRESENTATION_CONCEPT_HINTS) {
    const hasPositive = hint.positiveTerms.some((term) => {
      const normalized = normalizeHebrewSearchText(term).toLowerCase();
      return normalized.length > 0 && haystack.includes(normalized);
    });
    if (!hasPositive) continue;

    const hasNegative = hint.negativeTerms.some((term) => {
      const normalized = normalizeHebrewSearchText(term).toLowerCase();
      return normalized.length > 0 && haystack.includes(normalized);
    });
    if (hasNegative) continue;

    return hint;
  }
  return null;
}

/**
 * matrixFamilyId -> [checkboxValue, ...] (in ALL_PRODUCT_FAMILY_VALUES
 * order), built once from the existing, already-reviewed
 * PRODUCT_FAMILY_SELECTION_CANDIDATES map. A matrix family can be
 * reachable from more than one checkbox (e.g. several food-contact
 * matrix rows are reachable from both `food_contact_items` and one of
 * the material-specific family checkboxes) -- both are legitimate
 * suggestions when that matrix family matches.
 */
const MATRIX_ID_TO_CHECKBOX_VALUES = (() => {
  const map = new Map();
  for (const checkboxValue of ALL_PRODUCT_FAMILY_VALUES) {
    const matrixIds = PRODUCT_FAMILY_SELECTION_CANDIDATES[checkboxValue];
    if (!Array.isArray(matrixIds)) continue;
    for (const matrixId of matrixIds) {
      if (!map.has(matrixId)) map.set(matrixId, []);
      map.get(matrixId).push(checkboxValue);
    }
  }
  return map;
})();

/**
 * @param {string[]} texts - free-text answers to scan (product name,
 *   commercial description, intended use) -- the same inputs already
 *   passed to `identifyProductFamily` elsewhere in the questionnaire.
 * @returns {string[]} an ordered subset of ALL_PRODUCT_FAMILY_VALUES to
 *   show first (0-4 values). An empty array means no safe suggestion
 *   was found -- the caller must show the full, unfiltered list rather
 *   than treat an empty suggestion set as "suggest nothing".
 */
export function suggestProductFamilyValues(texts) {
  const identification = identifyProductFamily(texts);

  let matrixIds = [];
  if (identification.outcome === IDENTIFICATION_OUTCOME.HIGH_CONFIDENCE && identification.family) {
    matrixIds = [identification.family.id];
  } else if (identification.outcome === IDENTIFICATION_OUTCOME.MULTIPLE_CANDIDATES) {
    matrixIds = identification.candidates.map((candidate) => candidate.id);
  }

  if (matrixIds.length > 0) {
    const suggested = [];
    for (const matrixId of matrixIds) {
      const checkboxValues = MATRIX_ID_TO_CHECKBOX_VALUES.get(matrixId) || [];
      for (const checkboxValue of checkboxValues) {
        if (!suggested.includes(checkboxValue)) suggested.push(checkboxValue);
      }
    }
    // A genuine matrix-based match always wins outright -- the concept
    // hint below is only ever consulted when the real identification
    // signal found nothing (see matchPresentationConceptHint's doc
    // comment), so it can never override or narrow a real match.
    return suggested.slice(0, MAX_SUGGESTED_FAMILIES);
  }

  // No matrix-based signal at all -- fall back to the narrow,
  // presentation-only concept-hint registry. When it matches, the
  // catch-all options ("מוצר כללי אחר", "לא בטוח") are appended too,
  // since a concept hint is inherently less certain than a real
  // identification match and the user may still need that escape
  // hatch immediately visible.
  const hint = matchPresentationConceptHint(texts);
  if (!hint) return [];
  const hinted = [...hint.suggestedFamilyValues];
  for (const catchAll of ['other_general_product', 'not_sure']) {
    if (!hinted.includes(catchAll)) hinted.push(catchAll);
  }
  return hinted.slice(0, MAX_SUGGESTED_FAMILIES);
}

/**
 * @param {string[]} [texts] - same free-text answers passed to
 *   suggestProductFamilyValues, consulted only for the narrow
 *   presentation-hint registry (see matchPresentationConceptHint) --
 *   never a new material-identification signal. When omitted, or when
 *   no hint matches, returns the fixed, neutral, non-evidence-based
 *   starting subset of ALL_MATERIAL_VALUES (see module doc comment for
 *   why no general text-driven material signal exists or is invented
 *   here).
 */
export function suggestMaterialValues(texts = []) {
  const hint = matchPresentationConceptHint(texts);
  if (hint && hint.suggestedMaterialValues.length > 0) {
    const hinted = [...hint.suggestedMaterialValues];
    for (const value of ALL_MATERIAL_VALUES) {
      if (hinted.length >= MAX_SUGGESTED_MATERIALS) break;
      if (!hinted.includes(value)) hinted.push(value);
    }
    return hinted.slice(0, MAX_SUGGESTED_MATERIALS);
  }
  return ALL_MATERIAL_VALUES.slice(0, MAX_SUGGESTED_MATERIALS);
}

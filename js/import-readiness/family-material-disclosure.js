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
 * Material suggestions have no equivalent existing free-text or
 * family-to-material signal anywhere in this codebase (verified: no
 * matrix row carries a material field). Inventing one would risk
 * steering users toward a wrong material, which this change must never
 * do. The material suggestion is therefore a fixed, neutral, safe
 * default -- the first few materials in their existing, curated
 * checkbox order -- not a claim of relevance to any particular
 * product. It still reduces the initial visual set from 13 to a
 * handful, with the same "show all" escape hatch.
 */

import { identifyProductFamily, IDENTIFICATION_OUTCOME } from './product-family-identification.js';
import { PRODUCT_FAMILY_SELECTION_CANDIDATES } from './product-family-selection-mapping.js';

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

/** Checkbox values that never represent a real, positive family signal. */
const NON_SUGGESTIBLE_FAMILY_VALUES = Object.freeze(['other_general_product', 'not_sure']);

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
  if (matrixIds.length === 0) return [];

  const suggested = [];
  for (const matrixId of matrixIds) {
    const checkboxValues = MATRIX_ID_TO_CHECKBOX_VALUES.get(matrixId) || [];
    for (const checkboxValue of checkboxValues) {
      if (!suggested.includes(checkboxValue)) suggested.push(checkboxValue);
    }
  }
  return suggested.slice(0, MAX_SUGGESTED_FAMILIES);
}

/**
 * @returns {string[]} a fixed, neutral, non-evidence-based starting
 *   subset of ALL_MATERIAL_VALUES (see module doc comment for why no
 *   text-driven material signal exists or is invented here).
 */
export function suggestMaterialValues() {
  return ALL_MATERIAL_VALUES.slice(0, MAX_SUGGESTED_MATERIALS);
}

export { NON_SUGGESTIBLE_FAMILY_VALUES };

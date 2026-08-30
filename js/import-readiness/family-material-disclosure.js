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
 * The 34 `irProductFamily` checkbox values, in their exact existing
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
  'building_glass',
  'medicines',
  'sports_and_protective_equipment',
  'bicycles_and_scooters',
  'complete_vehicles',
  'marine_equipment',
  'pet_products',
  'hand_tools',
  'cardboard_packaging',
  'wooden_packaging',
  'paper_and_printed_products',
  'household_textile_products',
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
    // Plurals are listed explicitly (not left to substring matching)
    // now that matching requires a whole word/phrase -- see
    // haystackContainsWholeTerm.
    positiveTerms: Object.freeze(['אוהל', 'אוהלים', 'tent', 'tents']),
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
/**
 * Standard single-letter Hebrew prefix particles ("מ"=from/made-of,
 * "ב"=in, "ל"=to, "ו"=and, "ה"=the, "כ"=as/when, "ש"=that) -- ordinary
 * Hebrew morphology attaches these directly to the following word with
 * no space (e.g. "מטקסטיל" = "made of textile"). A trailing-edge word
 * boundary is still required unconditionally; only the leading edge
 * tolerates exactly one of these letters immediately preceded by a
 * real boundary, so "טקסטיל" is still recognized inside "מטקסטיל" --
 * this must keep working, since PR #63's own tent/textile matching
 * already relies on it (see product-family-matrix.js's "טקסטיל" alias
 * and the "אוהל מטקסטיל" scenario).
 */
const HEBREW_PREFIX_LETTERS = 'מבלוהכש';

/**
 * Whole-word/whole-phrase containment, not a plain substring check.
 * The broader, already-reviewed identification system elsewhere
 * (product-family-identification.js) uses plain substring matching
 * deliberately, for longer, review-vetted aliases where that's safe.
 * Both this hint registry's short positive terms ("tent", colliding
 * with "content"/"extent"/"tentative") and the whole-word re-check in
 * suggestProductFamilyValues (the furniture alias "table", colliding
 * with "suitable"/"tablets") need the term to appear as its own word,
 * not embedded inside an unrelated longer one -- code-review-caught in
 * both cases. `haystack` and `term` are already
 * normalizeHebrewSearchText()-normalized to single-spaced, trimmed
 * text before this is called.
 */
function haystackContainsWholeTerm(haystack, term) {
  if (term.length === 0) return false;
  const padded = ` ${haystack} `;
  let searchFrom = 0;
  while (true) {
    const index = padded.indexOf(term, searchFrom);
    if (index === -1) return false;
    const before = padded[index - 1];
    const after = padded[index + term.length];
    const trailingBoundary = after === ' ';
    const leadingBoundary = before === ' '
      || (HEBREW_PREFIX_LETTERS.includes(before) && padded[index - 2] === ' ');
    if (trailingBoundary && leadingBoundary) return true;
    searchFrom = index + 1;
  }
}

/**
 * True when at least one of `family`'s own matrix aliases appears as a
 * genuine whole word/phrase in `haystack` (already normalized and
 * lowercased) -- not merely as a substring identifyProductFamily's own
 * (deliberately looser, already-reviewed) matching accepted. See
 * suggestProductFamilyValues's doc comment for why this presentation-
 * only re-check exists.
 */
function familyHasWholeWordAliasMatch(haystack, family) {
  if (!family || !Array.isArray(family.aliases)) return false;
  return family.aliases.some((alias) => haystackContainsWholeTerm(haystack, normalizeHebrewSearchText(alias).toLowerCase()));
}

/**
 * Explicit, curated additional presentation terms for matrix families
 * that are ALREADY reachable through a checkbox -- not new concepts
 * (see PRESENTATION_CONCEPT_HINTS below for those), but specific
 * missing Hebrew/English inflected or plural forms of a family's own
 * existing alias. Two independent reasons a plural is otherwise
 * invisible here even though identifyProductFamily's own plain
 * substring matching would (sometimes wrongly) have caught it:
 *   - A Hebrew word's final-letter glyph changes under pluralization
 *     ("רחפן" ends in the final-form ן; "רחפנים" uses the medial form
 *     נ), so the singular is never literally a substring of the
 *     plural at all -- whole-word or not.
 *   - An ordinary plural/inflectional suffix attached with no space
 *     ("כיסא"+"ות", "battery"+"s") fails the whole-word trailing-
 *     boundary check by design (see haystackContainsWholeTerm) -- the
 *     exact same protection that fixed "table" inside "tablets".
 *
 * Each entry is treated as if its positive terms were literally that
 * matrix family's own aliases, at the SAME confidence tier as a real
 * matrix match -- never the lower-confidence concept-hint tier (a
 * plural spelling of an already-certain word is not less certain).
 * This registry is NEVER consulted by identifyProductFamily or any
 * other caller of it, so it can never affect final identification,
 * explicit-selection candidate restriction, or any regulatory outcome.
 *
 * Every entry was individually checked against
 * product-family-identification.js's own FAMILY_NEGATIVE_TERMS for
 * its matrix id before being added: a plural/inflected form can defeat
 * an existing singular-only negative-term exclusion (e.g. "מצברים
 * לרכב", vehicle accumulators plural, is not excluded by the existing
 * singular-only "מצבר לרכב" exclusion the same way "מצבר לרכב" itself
 * is) -- reproduced during this review for the battery and drone
 * families, whose plural/English forms are therefore deliberately
 * NOT added here pending a dedicated review of their own negative-term
 * lists (see docs/extending-product-family-guidance.md's review
 * process). Only forms verified to carry no such collision risk (or,
 * for "כיסאות", carrying the exact same negative term the singular
 * family already relies on) are included.
 */
const PRESENTATION_ALIAS_SUPPLEMENTS = Object.freeze([
  // Furniture (textiles-and-furniture-05, reachable via
  // furniture_and_home_goods): Hebrew plurals of the family's own
  // already-registered "ארון"/"שולחן" aliases. No existing negative
  // term for this family involves either word.
  Object.freeze({ matrixId: 'textiles-and-furniture-05', positiveTerms: Object.freeze(['ארונות', 'שולחנות']), negativeTerms: Object.freeze([]) }),
  // Same family, plural of "כיסא" -- kept as its own entry so it can
  // carry the exact existing "כיסאות אוכל" (high chairs) negative
  // term the singular family already relies on (see
  // product-family-identification.js), without that exclusion also
  // suppressing the unrelated ארונות/שולחנות entry above when both
  // happen to co-occur in the same description.
  Object.freeze({ matrixId: 'textiles-and-furniture-05', positiveTerms: Object.freeze(['כיסאות']), negativeTerms: Object.freeze(['כיסאות אוכל']) }),
  // Garments (textiles-and-furniture-01, reachable via
  // textile_apparel_and_footwear): Hebrew plurals of the family's own
  // already-registered "חולצה"/"שמלה"/"ג'קט"/"מעיל" aliases. The
  // family's one existing negative term ("מוצרי טקסטיל ביתיים",
  // household textile products) does not contain any of these words.
  Object.freeze({
    matrixId: 'textiles-and-furniture-01',
    positiveTerms: Object.freeze(['חולצות', 'שמלות', "ג'קטים", 'מעילים']),
    negativeTerms: Object.freeze([]),
  }),
  // Ordinary footwear (textiles-and-furniture-02, reachable via
  // textile_apparel_and_footwear): the Hebrew singular of the family's
  // own already-registered plural alias "סנדלים". The family's
  // existing negative terms (safety-shoes exclusions) do not involve
  // this word.
  Object.freeze({ matrixId: 'textiles-and-furniture-02', positiveTerms: Object.freeze(['סנדל']), negativeTerms: Object.freeze([]) }),
  // Batteries/accumulators (coverage-completion re-review): Hebrew/
  // English plurals of the family's own already-registered "מצבר"/
  // "סוללה"/"battery"/"accumulator" aliases -- previously deferred (see
  // this registry's own doc comment above) pending a dedicated review
  // of the family's negative-term list for plural collision risk. That
  // review is now done: each entry below carries the same vehicle-
  // battery/charger/tester/holder/compartment/internal-battery
  // exclusion phrasing the singular family already relies on, mirrored
  // into plural form, so a plural vehicle-battery or battery-accessory
  // phrase is excluded exactly as safely as its singular counterpart.
  Object.freeze({
    matrixId: 'electrical-and-electronics-07',
    positiveTerms: Object.freeze(['מצברים']),
    negativeTerms: Object.freeze(['מצברים לרכב', 'מצברים ייעודיים לרכב']),
  }),
  Object.freeze({
    matrixId: 'electrical-and-electronics-07',
    positiveTerms: Object.freeze(['סוללות']),
    negativeTerms: Object.freeze([
      'מטענים לסוללות', 'בודקי סוללות', 'בודק סוללות', 'מחזיקי סוללות',
      'מחזיק לסוללות', 'תאי סוללות', 'תא סוללות', 'סוללות פנימיות', 'עם סוללות',
    ]),
  }),
  Object.freeze({
    matrixId: 'electrical-and-electronics-07',
    positiveTerms: Object.freeze(['batteries', 'accumulators']),
    negativeTerms: Object.freeze([
      'vehicle batteries', 'car batteries', 'vehicle accumulators',
      'battery chargers', 'battery testers', 'battery holders',
      'battery compartments', 'internal batteries', 'containing batteries',
      'containing internal batteries',
    ]),
  }),
]);

/**
 * @param {string} haystack - already normalized/lowercased.
 * @returns {string[]} matrix ids whose presentation-alias-supplement
 *   positive terms matched (whole word) with no negative term present.
 */
function suggestedMatrixIdsFromSupplements(haystack) {
  const ids = [];
  for (const entry of PRESENTATION_ALIAS_SUPPLEMENTS) {
    const hasPositive = entry.positiveTerms.some((term) => haystackContainsWholeTerm(haystack, normalizeHebrewSearchText(term).toLowerCase()));
    if (!hasPositive) continue;
    const hasNegative = entry.negativeTerms.some((term) => haystackContainsWholeTerm(haystack, normalizeHebrewSearchText(term).toLowerCase()));
    if (hasNegative) continue;
    if (!ids.includes(entry.matrixId)) ids.push(entry.matrixId);
  }
  return ids;
}

function matchPresentationConceptHint(texts) {
  const haystack = normalizeHebrewSearchText(
    (Array.isArray(texts) ? texts : []).filter((t) => typeof t === 'string').join(' '),
  ).toLowerCase();
  if (!haystack) return null;

  for (const hint of PRESENTATION_CONCEPT_HINTS) {
    const hasPositive = hint.positiveTerms.some((term) => haystackContainsWholeTerm(haystack, normalizeHebrewSearchText(term).toLowerCase()));
    if (!hasPositive) continue;

    const hasNegative = hint.negativeTerms.some((term) => haystackContainsWholeTerm(haystack, normalizeHebrewSearchText(term).toLowerCase()));
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

  let matchedFamilies = [];
  if (identification.outcome === IDENTIFICATION_OUTCOME.HIGH_CONFIDENCE && identification.family) {
    matchedFamilies = [identification.family];
  } else if (identification.outcome === IDENTIFICATION_OUTCOME.MULTIPLE_CANDIDATES) {
    matchedFamilies = identification.candidates;
  }

  // Presentation-only whole-word verification (same defect class, same
  // fix pattern, as the tent hint's own "tent"-inside-"content" fix
  // above): identifyProductFamily matches an alias as a bare substring
  // anywhere in the text, including inside an unrelated longer word --
  // e.g. the furniture alias "table" is a substring of "suitable" and
  // "tablets", so a shaver description ("... suitable for ...") or a
  // medicine description ("... tablets ...") can match the furniture
  // family even though neither product has anything to do with
  // furniture. A family is only promoted to a display suggestion here
  // when at least one of its OWN aliases is a genuine whole-word/
  // whole-phrase match in the text -- never a partial word. This never
  // touches identifyProductFamily's own return value or any other
  // caller of it (product-family-result.js calls it directly and is
  // completely unaffected) -- it only filters what THIS presentation
  // layer treats as safe to display first.
  const haystack = normalizeHebrewSearchText(
    (Array.isArray(texts) ? texts : []).filter((t) => typeof t === 'string').join(' '),
  ).toLowerCase();
  const wholeWordFamilies = matchedFamilies.filter((family) => familyHasWholeWordAliasMatch(haystack, family));

  const suggested = [];
  for (const family of wholeWordFamilies) {
    const checkboxValues = MATRIX_ID_TO_CHECKBOX_VALUES.get(family.id) || [];
    for (const checkboxValue of checkboxValues) {
      if (!suggested.includes(checkboxValue)) suggested.push(checkboxValue);
    }
  }

  // Presentation-only alias supplements (explicit inflected/plural
  // forms of an already-reachable family's own alias -- see
  // PRESENTATION_ALIAS_SUPPLEMENTS's doc comment). Same confidence
  // tier as a genuine matrix match above: merged directly here, never
  // through the lower-confidence concept-hint catch-all path below.
  for (const matrixId of suggestedMatrixIdsFromSupplements(haystack)) {
    const checkboxValues = MATRIX_ID_TO_CHECKBOX_VALUES.get(matrixId) || [];
    for (const checkboxValue of checkboxValues) {
      if (!suggested.includes(checkboxValue)) suggested.push(checkboxValue);
    }
  }

  // The concept-hint registry is always additionally consulted (not
  // only when the matrix found nothing): a genuine matrix match is
  // never overridden or narrowed by it, but a hint's own concept can
  // still have an independent, genuine basis in the same text as a
  // separately-matched real family (e.g. a textile tent that also
  // mentions a rechargeable battery) -- one component/characteristic
  // must not silently replace or hide the product's main family, or
  // vice versa (both are genuine). The hint is merged in only when it
  // contributes at least one checkbox value the matrix match did not
  // already cover; a hint that only repeats what a real match already
  // established (e.g. "אוהל מטקסטיל", where "טקסטיל" is itself a real
  // matrix alias) contributes nothing new and changes nothing --
  // preserving the exact existing PR #63 output for that case. The
  // catch-all options ("מוצר כללי אחר", "לא בטוח") are appended only
  // when the hint actually contributes something, since a concept hint
  // is inherently less certain than a real identification match and
  // the user may still need that escape hatch immediately visible.
  const hint = matchPresentationConceptHint(texts);
  if (hint) {
    const newFromHint = hint.suggestedFamilyValues.filter((value) => !suggested.includes(value));
    if (newFromHint.length > 0) {
      suggested.push(...newFromHint);
      for (const catchAll of ['other_general_product', 'not_sure']) {
        if (!suggested.includes(catchAll)) suggested.push(catchAll);
      }
    }
  }

  return suggested.slice(0, MAX_SUGGESTED_FAMILIES);
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

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
  'sports_and_fitness_equipment',
  'personal_protective_equipment',
  'ordinary_bicycles',
  'motorized_bicycles',
  'non_motorized_scooters',
  'motorized_scooters',
  'complete_vehicles',
  'marine_equipment',
  'pet_products',
  'hand_tools',
  'cardboard_packaging',
  'wooden_packaging',
  'paper_and_printed_products',
  'rugs_and_carpets',
  'blankets',
  'general_household_textile_products',
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
export const PRESENTATION_CONCEPT_HINTS = Object.freeze([
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
  // Concept-level ambiguity correction (product-owner rule): bare
  // "קורקינט"/"scooter" identifies a clear product CONCEPT that is not
  // ambiguous across all 41 families -- it is ambiguous only between
  // its two existing, already-reachable subtype checkboxes
  // (non_motorized_scooters, motorized_scooters), which are
  // distinguished only by motorization. Unlike the tent concept above,
  // this concept DOES have real matrix aliases (see additional-
  // consumer-products-02/-07) -- but only for QUALIFIED phrasing
  // ("קורקינט רגיל", "קורקינט חשמלי", "electric scooter", ...), never
  // for the bare parent word alone, so identifyProductFamily legitimately
  // returns NONE for bare "קורקינט"/"scooter" and the matrix-based
  // suggestion above is empty -- the exact same structural gap the tent
  // concept fills, just with two legitimate subtype alternatives instead
  // of one family.
  //
  // Every qualified subtype phrase (Hebrew and English, on both existing
  // rows, including the two additional phrasings added to
  // PRESENTATION_ALIAS_SUPPLEMENTS above) is listed as a negative term
  // here -- not because those phrases are unsafe, but because this
  // entry's own bare "קורקינט"/"scooter" positive term is, by design, a
  // substring of every one of them too. Without this exclusion, a
  // qualified description would correctly produce its own single, real
  // suggestion earlier in the pipeline (matrix match or supplement
  // above) and then this broader concept hint would redundantly ALSO
  // contribute the OTHER, wrong subtype (e.g. "קורקינט ממונע" would gain
  // a spurious non_motorized_scooters suggestion alongside the correct
  // motorized_scooters one) -- exactly the "apply specific subtype
  // phrases before the broad parent concept" requirement. This mirrors,
  // at concept-hint scope, the same "more specific phrase excluded from
  // a broader/generic entry" discipline already used throughout
  // FAMILY_NEGATIVE_TERMS (product-family-identification.js) and the
  // tent entry's own accessory exclusions above.
  //
  // Accessory/part/repair-kit phrasing (Hebrew and English) is excluded
  // for the identical reason the tent entry excludes "tent pole"/"tent
  // repair kit": a scooter accessory or spare part is not a complete
  // scooter. "חלק חילוף לקורקינט"/"scooter replacement part" are already
  // excluded at the real identification level (FAMILY_NEGATIVE_TERMS for
  // additional-consumer-products-02, product-family-identification.js);
  // the remaining phrasings below have no existing guard anywhere else,
  // since bare "קורקینט"/"scooter" had no presentation route to guard
  // before this entry existed.
  {
    concept: 'scooter',
    positiveTerms: Object.freeze(['קורקינט', 'קורקינטים', 'scooter', 'scooters']),
    negativeTerms: Object.freeze([
      // Qualified subtype phrases -- each already resolves to its own
      // single correct subtype earlier in the pipeline (real matrix
      // alias or PRESENTATION_ALIAS_SUPPLEMENTS above); excluded here so
      // this broader entry never redundantly adds the other subtype.
      'קורקינט רגיל', 'קורקינטים רגילים', 'קורקינט לא ממונע', 'non-motorized scooter',
      'קורקינט ממונע', 'קורקינט ממונעת', 'קורקינט חשמלי', 'קורקינט עם מנוע עזר',
      'motorized scooter', 'electric scooter', 'scooter with auxiliary motor',
      // Accessory/part/repair phrasing -- a scooter accessory or spare
      // part is not a complete scooter.
      'אביזר לקורקינט', 'אביזרים לקורקינט', 'אביזר קורקינט',
      'חלק לקורקינט', 'חלקים לקורקינט', 'חלק חילוף לקורקינט', 'חלקי חילוף לקורקינט',
      'גלגל לקורקינט', 'גלגלים לקורקינט',
      'ערכת תיקון לקורקינט', 'תיקון לקורקינט', 'תיקון קורקינט',
      'scooter accessory', 'scooter accessories', 'scooter part', 'scooter parts',
      'scooter spare part', 'scooter replacement part',
      'scooter repair', 'scooter repair kit', 'scooter carrying case',
      'scooter wheel', 'scooter wheels',
      // Battery/helmet accessory phrasing (code-review correction): a
      // scooter battery or helmet is an accessory, not a complete
      // scooter -- "סוללה לקורקינט" already carries this exclusion
      // meaning at the real-identification tier (see
      // FAMILY_NEGATIVE_TERMS['additional-consumer-products-02'] in
      // product-family-identification.js); mirrored here so the
      // presentation-only concept hint stays consistent with it.
      'סוללה לקורקינט', 'סוללות לקורקינט', 'קסדה לקורקינט', 'קסדות לקורקינט',
      'scooter battery', 'scooter batteries', 'battery for scooter', 'batteries for scooter',
      'scooter helmet', 'scooter helmets', 'helmet for scooter',
    ]),
    // The two existing, real checkboxes for this concept's own
    // legitimate subtypes -- never a new family, never a matrix alias.
    suggestedFamilyValues: Object.freeze(['non_motorized_scooters', 'motorized_scooters']),
    // No associated material is uncontroversial common knowledge for a
    // scooter the way textile is for a tent -- left empty so
    // suggestMaterialValues falls back to its existing, unmodified
    // default behavior (see its own doc comment).
    suggestedMaterialValues: Object.freeze([]),
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
 * Bounded, deterministic explicit-negation support for presentation
 * relevance only (never identifyProductFamily -- see suggestProductFamilyValues's
 * doc comment). Not a natural-language parser: a positive-term match is
 * treated as negated only when one of the fixed negation-marker phrases
 * below appears in the short run of words immediately before the match,
 * with the search stopped as soon as a "reconnector" word (עם/with,
 * which re-asserts a positive relationship) or the start of the text is
 * reached. This keeps negation strictly local to the term it precedes --
 * "מכונת גילוח ללא כבל עם סוללה נטענת" ("shaver without a cable, with a
 * rechargeable battery") negates only "כבל", never "סוללה", because the
 * intervening "עם" resets the window before "ללא" is reached.
 */
const NEGATION_MARKER_PHRASES = Object.freeze([
  'ללא', 'בלי', 'אינו כולל', 'אינה כוללת', 'לא כולל', 'לא כוללת',
  'without', 'no', 'does not include', 'not included',
]);
const NEGATION_RECONNECTOR_TOKENS = Object.freeze(['עם', 'with']);
const NEGATION_WINDOW_TOKENS = 6;

function windowContainsNegationMarker(windowTokens) {
  return NEGATION_MARKER_PHRASES.some((marker) => (
    marker.includes(' ') ? windowTokens.join(' ').includes(marker) : windowTokens.includes(marker)
  ));
}

/**
 * @param {string} paddedHaystack - space-padded haystack (see
 *   haystackContainsWholeTerm), already normalized/lowercased.
 * @param {number} matchIndex - index (in `paddedHaystack`) of the start
 *   of a term match.
 */
function isMatchNegated(paddedHaystack, matchIndex) {
  const tokens = paddedHaystack.slice(0, matchIndex).split(' ').filter(Boolean);
  const windowTokens = [];
  for (let i = tokens.length - 1; i >= 0 && windowTokens.length < NEGATION_WINDOW_TOKENS; i--) {
    if (NEGATION_RECONNECTOR_TOKENS.includes(tokens[i])) break;
    windowTokens.unshift(tokens[i]);
  }
  return windowContainsNegationMarker(windowTokens);
}

/**
 * Same whole-word/phrase boundary rules as haystackContainsWholeTerm,
 * but a match immediately preceded (within the bounded window above) by
 * an explicit negation marker does not count as positive evidence.
 * Used only for presentation-suggestion positive-term checks
 * (PRESENTATION_ALIAS_SUPPLEMENTS / PRESENTATION_CONCEPT_HINTS) -- never
 * for negativeTerms exclusion checks (those stay exactly as strict as
 * before) and never for real matrix alias matching.
 */
function haystackContainsPositiveTerm(haystack, term) {
  if (term.length === 0) return false;
  // A term whose own first word IS a reconnector ("עם סוללה", "with
  // battery") already explicitly reasserts a positive relationship --
  // never subject to the preceding-negation check (which only exists to
  // catch a negation marker immediately before the term's own start).
  const termStartsWithReconnector = NEGATION_RECONNECTOR_TOKENS.some((token) => term === token || term.startsWith(`${token} `));
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
    if (trailingBoundary && leadingBoundary && (termStartsWithReconnector || !isMatchNegated(padded, index))) return true;
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
  return family.aliases.some((alias) => haystackContainsPositiveTerm(haystack, normalizeHebrewSearchText(alias).toLowerCase()));
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
export const PRESENTATION_ALIAS_SUPPLEMENTS = Object.freeze([
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
  // Motorcycles (correction pass, product-owner rule C): the complete-
  // motorcycle row's own alias is the compound plural phrase
  // "אופנועים וקטנועים שלמים" only -- a bare "אופנוע"/"אופנועים" (the
  // natural way a user would describe a single motorcycle) is not a
  // literal substring of it. Widened here at the SAME confidence tier
  // as a real matrix match, guarded against the motorcycle-spare-parts
  // phrasing below (which also contains "אופנוע" as a substring, per
  // the Hebrew "ל" leading-prefix-tolerant boundary rule -- "לאופנוע"
  // legitimately whole-word-matches bare "אופנוע").
  Object.freeze({
    matrixId: 'vehicles-and-transport-02',
    positiveTerms: Object.freeze(['אופנוע', 'אופנועים', 'קטנוע', 'קטנועים']),
    negativeTerms: Object.freeze([
      'חלק חילוף לאופנוע', 'חלקי חילוף לאופנוע', 'חלקי חילוף לאופנועים',
      'חלק חילוף לקטנוע', 'חלקי חילוף לקטנוע', 'חלקי חילוף לקטנועים',
      'motorcycle spare part', 'motorcycle spare parts', 'motorcycle part', 'motorcycle parts',
      'spare part for motorcycle', 'scooter spare part',
      // Motorcycle presentation/resolution correction: additional
      // spare-part/accessory phrasings beyond the "חלק חילוף" wording
      // above -- "חלפים" (a different, equally common Hebrew word for
      // spare parts) and "אביזר" (accessory) also contain "אופנוע" as a
      // substring and must never let the complete-motorcycle suggestion
      // leak through for these phrases either.
      'חלק לאופנוע', 'חלקים לאופנוע', 'חלפים לאופנוע', 'חלפים לאופנועים',
      'אביזר לאופנוע', 'אביזרים לאופנוע', 'אביזר לאופנועים',
      'motorcycle accessory', 'motorcycle accessories',
    ]),
  }),
  // Motorcycle spare parts (correction pass, product-owner rule D): the
  // existing vehicle-parts row's own alias is the compound phrase
  // "חלקי חילוף לאופנועים וקטנועים" only -- a bare singular "חלק חילוף
  // לאופנוע" is not a literal substring of it. Widened here so a
  // motorcycle-spare-part description resolves to the intended
  // vehicle_parts_and_transport_accessories checkbox instead of staying
  // unresolved, without ever risking a match against the complete-
  // motorcycle row above (disjoint phrasing, no shared positive term).
  Object.freeze({
    matrixId: 'vehicles-and-transport-04',
    positiveTerms: Object.freeze([
      'חלק חילוף לאופנוע', 'חלקי חילוף לאופנוע', 'חלק חילוף לקטנוע', 'חלקי חילוף לקטנוע',
      'motorcycle spare part', 'motorcycle spare parts', 'motorcycle part', 'motorcycle parts',
      // Motorcycle presentation/resolution correction: the additional
      // spare-part/accessory phrasings ("חלק לאופנוע", "חלפים לאופנוע",
      // "אביזר לאופנוע") mirror the same concept as the compound "חלק
      // חילוף" phrasing above, so they resolve to this same intended
      // spare-parts checkbox instead of leaking into the complete-
      // motorcycle suggestion (see that entry's own negativeTerms).
      'חלק לאופנוע', 'חלקים לאופנוע', 'חלפים לאופנוע', 'חלפים לאופנועים',
      'אביזר לאופנוע', 'אביזרים לאופנוע', 'motorcycle accessory', 'motorcycle accessories',
    ]),
    negativeTerms: Object.freeze([]),
  }),
  // Motorized bicycles (correction pass, product-owner rule E): the
  // row's own aliases use "חשמליים"/"עם מנוע עזר"/"electric" wording
  // only -- "ממונעים" (motorized, plural) is not a literal substring of
  // any of them. Widened here to the same, already-reachable row (no
  // new regulatory signal). No negative terms needed: "ממונעים" does
  // not co-occur with any accessory/part phrasing this family already
  // excludes.
  Object.freeze({
    matrixId: 'additional-consumer-products-07',
    positiveTerms: Object.freeze([
      'אופניים ממונעים', 'אופניים ממונע', 'קורקינט ממונע', 'קורקינט ממונעת',
      // Concept-level scooter-suggestion correction: "motorized scooter"
      // (bare English) is a genuinely missing phrasing of this already-
      // reachable row -- "electric scooter"/"scooter with auxiliary
      // motor" are already real matrix aliases, but "motorized scooter"
      // itself is not.
      'motorized scooter',
    ]),
    // "non-motorized scooter" normalizes to "non motorized scooter"
    // (normalizeHebrewSearchText maps hyphens to spaces), which then
    // contains "motorized scooter" as a genuine whole-word substring --
    // excluded here so the opposite-subtype row's own real alias
    // ("non-motorized scooter", additional-consumer-products-02) is not
    // also spuriously matched here. Also excluded: accessory/spare-part/
    // battery phrasing built on top of "motorized scooter" -- those
    // describe a component, not a complete motorized scooter, and must
    // not resolve to this complete-vehicle row (code-review correction).
    negativeTerms: Object.freeze([
      'non motorized scooter', 'non-motorized scooter',
      'spare part for motorized scooter', 'spare parts for motorized scooter',
      'motorized scooter spare part', 'motorized scooter spare parts',
      'motorized scooter part', 'motorized scooter parts',
      'motorized scooter accessory', 'motorized scooter accessories',
      'motorized scooter repair', 'motorized scooter repair kit',
      'motorized scooter carrying case', 'motorized scooter wheel', 'motorized scooter wheels',
      'battery for motorized scooter', 'motorized scooter battery',
    ]),
  }),
  // Concept-level scooter-suggestion correction: "קורקינט לא ממונע"
  // (non-motorized scooter, explicit-negation phrasing) is a genuinely
  // missing phrasing of this already-reachable row -- "קורקינט
  // רגיל"/"non-motorized scooter" are already real matrix aliases, but
  // this explicit-negation form is not. Accessory/spare-part phrasing
  // built on top of this phrase is excluded so a component description
  // does not resolve to this complete-vehicle row (code-review
  // correction).
  Object.freeze({
    matrixId: 'additional-consumer-products-02',
    positiveTerms: Object.freeze(['קורקינט לא ממונע']),
    negativeTerms: Object.freeze([
      'חלק חילוף לקורקינט לא ממונע', 'חלקי חילוף לקורקינט לא ממונע',
      'חלק לקורקינט לא ממונע', 'חלקים לקורקינט לא ממונע',
      'אביזר לקורקינט לא ממונע', 'אביזרים לקורקינט לא ממונע',
      'גלגל לקורקינט לא ממונע', 'ערכת תיקון לקורקינט לא ממונע',
      'סוללה לקורקינט לא ממונע', 'קסדה לקורקינט לא ממונע',
    ]),
  }),
  // Sports-context protective equipment vs. general/occupational PPE
  // (correction pass, product-owner rule 2/A): neither matrix row has
  // an alias for either exact compound phrase, so this is a genuine
  // presentation gap, not a text-matching bug. Mapped to the two
  // already-correct, already-reachable rows at the same confidence
  // tier -- sports-context protective wording stays in the no-
  // positive-signal sports row (additional-consumer-products-01) and
  // never receives the general-PPE standards direction; occupational/
  // work-context protective wording resolves to the dedicated PPE row
  // (additional-consumer-products-06). No new regulatory signal is
  // introduced by either supplement.
  Object.freeze({
    matrixId: 'additional-consumer-products-01',
    positiveTerms: Object.freeze([
      'ציוד מגן לספורט', 'ציוד הגנה לספורט', 'sports protective equipment', 'protective equipment for sports',
      // "sport protective equipment" (singular "sport") is the PPE
      // row's own pre-existing matrix alias (final-validation code-
      // review finding) -- now excluded from PPE via FAMILY_NEGATIVE_TERMS
      // in product-family-identification.js and routed here instead, so
      // it stays in the sports context per product-owner rule 2.
      'sport protective equipment',
    ]),
    negativeTerms: Object.freeze([]),
  }),
  Object.freeze({
    matrixId: 'additional-consumer-products-06',
    positiveTerms: Object.freeze([
      'ציוד מגן לעבודה', 'ציוד הגנה לעבודה', 'ציוד מגן תעשייתי', 'ציוד מגן מקצועי',
      'work protective equipment', 'occupational protective equipment', 'industrial protective equipment',
    ]),
    negativeTerms: Object.freeze([]),
  }),
  // Concept-level material/context correction (root-cause fix): the
  // building-materials row's own alias is the single umbrella phrase
  // "חומרי בנייה" only -- no concrete building-material product noun
  // (aluminum profile, steel bar, concrete, cement, gypsum board, ...)
  // is a literal alias, so a real description of one of these products
  // never matched and fell through to the full 41-family fallback (the
  // reproduced defect for "פרופילי אלומיניום לייצור חלונות"). Every term
  // below is a compound phrase combining the material with an explicit
  // construction/building use or a dedicated building-material noun --
  // never the bare material word alone (an "aluminum"/"steel"/"wood"
  // positive term with no context is deliberately never added anywhere
  // in this registry, since a material alone must not prove this or any
  // other family). negativeTerms exclude the same materials used in a
  // vehicle, cookware, or furniture context, which route to their own
  // families below/elsewhere instead.
  Object.freeze({
    matrixId: 'construction-and-industrial-01',
    positiveTerms: Object.freeze([
      'פרופיל אלומיניום לבניה', 'פרופיל אלומיניום לבנייה', 'פרופיל אלומיניום לחלונות',
      'פרופילי אלומיניום לחלונות', 'פרופילי אלומיניום לבניה', 'פרופילי אלומיניום לבנייה',
      'פרופיל אלומיניום לייצור חלונות', 'פרופילי אלומיניום לייצור חלונות',
      'מוט פלדה לבניה', 'מוט פלדה לבנייה', 'מוטות פלדה לבניה', 'מוטות פלדה לבנייה',
      'פלדה לבניה', 'פלדה לבנייה', 'פלדת בניין', 'פלדת בניה',
      'עץ בניה', 'עץ בנייה', 'בלוק בניה', 'בלוק בנייה', 'בלוקי בניה', 'לבנים לבניה', 'לבני בניה',
      'לוח גבס', 'לוחות גבס', 'חומר בידוד לבניה', 'חומרי בידוד לבניה', 'בטון', 'מלט',
      'aluminum profile for construction', 'aluminum profile for windows', 'aluminum profile for building',
      'steel bar for construction', 'steel rod for construction', 'construction steel', 'building steel',
      'gypsum board', 'concrete', 'cement', 'construction material', 'building material',
    ]),
    negativeTerms: Object.freeze([
      'פרופיל אלומיניום לרכב', 'אלומיניום לרכב', 'פרופילי אלומיניום לרכב',
      'סיר אלומיניום', 'מחבת אלומיניום', 'פרופיל אלומיניום לריהוט', 'פרופיל מתכת לריהוט',
      'aluminum profile for vehicle', 'aluminum cookware', 'aluminum pot', 'aluminum pan',
      'steel bar for machine parts', 'steel bars for machine parts',
    ]),
  }),
  // Industrial-machinery counterpart of the correction above: the row's
  // own alias is likewise the single umbrella phrase "מכונות וציוד
  // תעשייתי" only. Terms below name a complete industrial machine, an
  // industrial-equipment concept, or a material explicitly combined with
  // a machine-component/industrial-production use -- never the bare
  // material alone. This family has no separate "machine parts" checkbox
  // in the current 41-family model, so a machine-component description
  // is presented under this same general industrial-equipment family
  // (never as a "complete machine"; the checkbox's own label is the
  // broader "industrial machinery and equipment", not "complete
  // machine").
  Object.freeze({
    matrixId: 'construction-and-industrial-02',
    positiveTerms: Object.freeze([
      'מכונה תעשייתית', 'מכונות תעשייתיות', 'ציוד תעשייתי', 'ציוד ייצור תעשייתי',
      'חלק למכונה תעשייתית', 'חלק חילוף למכונה', 'חלקי חילוף למכונה', 'רכיב למכונה תעשייתית',
      'מוט פלדה לייצור חלקי מכונה', 'מוטות פלדה לייצור חלקי מכונה', 'פלדה לייצור חלקי מכונה',
      'industrial machine', 'industrial machinery', 'industrial equipment',
      'machine part', 'machine parts', 'machine component', 'machine components',
      'steel bar for machine parts', 'steel bars for machine parts',
    ]),
    negativeTerms: Object.freeze([
      'כלי עבודה ידניים', 'hand tool', 'hand tools',
    ]),
  }),
  // Aluminum-in-a-vehicle-context companion to the building-materials
  // correction above: "פרופיל אלומיניום לרכב" names the same material as
  // the construction phrasing but with an explicit vehicle use instead,
  // which must route to the vehicle-parts family, not building materials
  // (see that entry's own negativeTerms, which excludes this exact
  // phrase for the same reason in reverse).
  Object.freeze({
    matrixId: 'vehicles-and-transport-03',
    positiveTerms: Object.freeze([
      'פרופיל אלומיניום לרכב', 'פרופילי אלומיניום לרכב', 'אלומיניום לרכב',
      'aluminum profile for vehicle', 'aluminum vehicle component', 'aluminum vehicle part',
    ]),
    negativeTerms: Object.freeze([]),
  }),
  // Aluminum cookware companion: the food-contact metal-cookware row's
  // own alias is the generic "סיר מתכת"/"מחבת מתכת" ("metal pot"/"metal
  // pan") only -- "aluminum" specifically is not a literal substring of
  // either, so an aluminum-cookware description fell through. Kept
  // strictly to the cookware/cooking-use phrasing so it never collides
  // with the construction or vehicle aluminum phrasing above.
  Object.freeze({
    matrixId: 'food-contact-05',
    positiveTerms: Object.freeze([
      'סיר אלומיניום', 'סיר אלומיניום לבישול', 'מחבת אלומיניום', 'מחבת אלומיניום לבישול',
      'aluminum pot', 'aluminum cookware', 'aluminum pan',
    ]),
    negativeTerms: Object.freeze([]),
  }),
  // Main-product-concept correction: a shaving machine is exactly the
  // small electric-appliance concept electrical-and-electronics-01
  // already represents ("מכשיר חשמלי עם תקע או ספק כוח" -- an electric
  // device with a plug or power supply), but the row's own aliases are
  // generic umbrella phrasing only, with no named appliance. Without
  // this, a shaving-machine description (with or without a battery
  // mention) had no positive term for the main product concept at all --
  // only the (correctly, negation-aware) separate battery evidence could
  // ever surface, losing the primary product family entirely. This
  // supplement only ever contributes the general electrical-appliance
  // family, never a battery signal of its own (that stays exactly where
  // it already was, on the batteries_or_battery_containing supplements
  // above, so the two families combine independently and the battery
  // family still correctly disappears when the battery mention itself is
  // negated).
  Object.freeze({
    matrixId: 'electrical-and-electronics-01',
    positiveTerms: Object.freeze(['מכונת גילוח', 'מכונת גילוח חשמלית', 'electric shaver']),
    negativeTerms: Object.freeze([]),
  }),
  // Charger/power-supply phrasing gap: the row's own alias is the single
  // umbrella phrase "מטענים וספקי כוח" only -- neither a specific device
  // ("מטען לטלפון"/"phone charger") nor the bare compound "ספק כוח"
  // ("power supply") on its own is a literal substring of that umbrella
  // phrase.
  Object.freeze({
    matrixId: 'electrical-and-electronics-02',
    positiveTerms: Object.freeze([
      'מטען לטלפון', 'מטען טלפון', 'טעינה לטלפון', 'ספק כוח', 'מטען נייד',
      'phone charger', 'power supply', 'power adapter', 'wall charger',
    ]),
    negativeTerms: Object.freeze([]),
  }),
  // Internal-battery product-phrasing gap: the row's own alias is
  // "מוצר הכולל סוללה פנימית" (a specific construction with "הכולל")
  // only -- the equally natural "מוצר עם סוללה פנימית" (same meaning,
  // "עם" instead of "הכולל") is not a literal substring of it.
  // "עם סוללה" ("with a battery") is deliberately excluded from the
  // standalone-battery row's own aliases (FAMILY_NEGATIVE_TERMS,
  // product-family-identification.js) so a battery-containing appliance
  // is never misread as the battery itself -- but this battery-
  // containing-equipment row had no positive alias of its own for that
  // same phrase, leaving a dead zone where a battery-powered device
  // description (e.g. an electric shaver with a rechargeable battery)
  // matched neither row. Added here, at the same presentation tier as
  // every other supplement above.
  Object.freeze({
    matrixId: 'electrical-and-electronics-09',
    positiveTerms: Object.freeze([
      'מוצר עם סוללה פנימית', 'product with an internal battery',
      'עם סוללה', 'עם סוללה נטענת', 'battery-powered', 'rechargeable device', 'rechargeable equipment',
    ]),
    negativeTerms: Object.freeze([]),
  }),
  // Wireless-router phrasing gap: the row's own aliases name the
  // wireless standards/umbrella terms ("מוצר אלחוטי", "Wi-Fi",
  // "Bluetooth", ...) but not the specific device noun "נתב" (router),
  // so "נתב אלחוטי" (wireless router) is not a literal substring of any
  // existing alias. Kept as the full compound phrase, never the bare
  // "אלחוטי" (wireless) characteristic alone.
  Object.freeze({
    matrixId: 'electrical-and-electronics-05',
    positiveTerms: Object.freeze(['נתב אלחוטי', 'ראוטר אלחוטי', 'wireless router']),
    negativeTerms: Object.freeze([]),
  }),
  // Medical-device alternate wording gap: the row's own alias is
  // "מכשור רפואי" (a collective-noun form) only -- the equally natural
  // singular-device phrasing "מכשיר רפואי" is not a literal substring of
  // it.
  Object.freeze({
    matrixId: 'health-and-cosmetics-02',
    positiveTerms: Object.freeze(['מכשיר רפואי']),
    negativeTerms: Object.freeze([]),
  }),
  // Supplement/vitamin alternate wording gap: the row's own alias is
  // "ויטמינים למאכל אדם" only -- the equally natural "ויטמינים לבני אדם"
  // (vitamins for human beings, vs. for human consumption) is not a
  // literal substring of it.
  Object.freeze({
    matrixId: 'food-and-beverages-03',
    positiveTerms: Object.freeze(['ויטמינים לבני אדם', 'vitamins for humans']),
    negativeTerms: Object.freeze([]),
  }),
  // Cosmetics spelling-variant gap: "דיאודורנט" (with an extra Hebrew
  // yod) is the row's own alias; the equally common alternate spelling
  // "דאודורנט" is not a literal substring of it.
  Object.freeze({
    matrixId: 'health-and-cosmetics-01',
    positiveTerms: Object.freeze(['דאודורנט']),
    negativeTerms: Object.freeze([]),
  }),
  // Pet-bed wording gap: the pet-products row's own alias is "מיטה
  // לחיית מחמד" ("bed for a pet") only -- the equally natural "מיטה
  // לכלב" (bed for a dog specifically) is not a literal substring of it.
  Object.freeze({
    matrixId: 'additional-consumer-products-05',
    positiveTerms: Object.freeze(['מיטה לכלב', 'מיטה לחתול', 'dog bed', 'cat bed']),
    negativeTerms: Object.freeze([]),
  }),
  // Live-plant wording gap: the plant/produce row's own alias is the
  // plural "צמחים" only -- the equally natural singular "צמח חי" (a
  // live plant) is not a literal substring of it. Kept as the full
  // "live"-qualified compound so it never collides with the cosmetics-
  // ingredient phrasing below (a decorative/ingredient use of "plant"
  // wording must not trigger this agricultural family).
  Object.freeze({
    matrixId: 'food-and-beverages-05',
    positiveTerms: Object.freeze(['צמח חי', 'live plant']),
    negativeTerms: Object.freeze([]),
  }),
  // Household-curtain singular-wording gap: the household-textiles
  // row's own alias is the plural "וילונות" only -- the equally natural
  // singular "וילון" is not a literal substring of it.
  Object.freeze({
    matrixId: 'textiles-and-furniture-08',
    positiveTerms: Object.freeze(['וילון', 'וילון לבית']),
    negativeTerms: Object.freeze([]),
  }),
  // Infant-bed/crib/cradle presentation gap (mirrors the identical,
  // already-reviewed terms CANDIDATE_SET_SCOPED_HINTS carries for real
  // identification once this checkbox is already selected -- see
  // product-family-selection-mapping.js -- extended here to the
  // presentation-suggestion tier so the same safe terms also produce an
  // initial suggestion, not only a resolution after manual selection).
  Object.freeze({
    matrixId: 'children-and-infants-04',
    positiveTerms: Object.freeze([
      'מיטת תינוק', 'לול', 'עריסה', 'הליכון תינוקות',
      'infant bed', 'crib', 'cradle', 'infant walker',
    ]),
    negativeTerms: Object.freeze([]),
  }),
  // --- Thin-group completion (concept-level suggestion completion,
  // part 3): the 11 groups below previously had only their own umbrella
  // matrix-row phrase as an alias, with no concrete product noun -- the
  // same class of gap the material/context correction above closed for
  // building materials and industrial machinery. Every term is either a
  // specific product noun already representing the visible family's own
  // matrix row, or a material/characteristic combined with an explicit
  // vehicle/industrial context -- never a bare adjective or
  // characteristic alone (see the doc comment on the negation helpers
  // above for how "electric"/"wireless" evidence interacts with an
  // already-identified product; this registry never lets such a
  // characteristic alone identify a family). No regulatory signal is
  // referenced or implied by any term below -- these are presentation
  // labels only; the matrix row's own regulatorySignals (poison-permit
  // direction for pest control, automotive-approval direction for
  // vehicle parts, etc.) are unchanged and untouched.

  // 1. Marine equipment (additional-consumer-products-04): concrete
  // marine-safety product nouns already representing this family's own
  // matrix row -- never "waterproof" or "used near water" wording (which
  // the product owner's rule E explicitly excludes).
  Object.freeze({
    matrixId: 'additional-consumer-products-04',
    positiveTerms: Object.freeze([
      'אפוד הצלה', 'מצוף הצלה', 'עוגן לסירה', 'ציוד בטיחות לשיט',
      'life jacket', 'life vest', 'life buoy', 'boat anchor',
    ]),
    negativeTerms: Object.freeze([]),
  }),
  // 2. Paints and adhesives (chemicals-and-materials-02): "צבע"/"paint"
  // and "דבק"/"adhesive" are themselves the product name (like "תרופות"
  // for medicines), not a generic raw material -- kept bare, but "חומר
  // איטום"/"sealant" kept compound since "חומר" (material) alone is
  // exactly the generic-word case this registry must never trigger on.
  Object.freeze({
    matrixId: 'chemicals-and-materials-02',
    positiveTerms: Object.freeze([
      'צבע', 'צבע לבניין', 'צבע תעשייתי', 'דבק', 'דבק תעשייתי', 'חומר איטום',
      'paint', 'industrial adhesive', 'sealant',
    ]),
    negativeTerms: Object.freeze([]),
  }),
  // 3. Pest-control products (chemicals-and-materials-03): the row's own
  // alias is the plural "חומרי הדברה" only.
  Object.freeze({
    matrixId: 'chemicals-and-materials-03',
    positiveTerms: Object.freeze([
      'חומר הדברה', 'תרסיס הדברה', 'קוטל חרקים',
      'pest control product', 'pesticide', 'insecticide',
    ]),
    negativeTerms: Object.freeze([]),
  }),
  // 4. Industrial chemicals (chemicals-and-materials-04).
  Object.freeze({
    matrixId: 'chemicals-and-materials-04',
    positiveTerms: Object.freeze([
      'כימיקל תעשייתי', 'חומר מסוכן', 'חומר כימי מסוכן',
      'industrial chemical', 'hazardous material', 'hazardous substance',
    ]),
    negativeTerms: Object.freeze([]),
  }),
  // 5. Cables and electrical accessories (electrical-and-electronics-03).
  Object.freeze({
    matrixId: 'electrical-and-electronics-03',
    positiveTerms: Object.freeze([
      'כבל חשמלי', 'כבל טעינה', 'אביזר חשמלי',
      'electrical cable', 'power cable', 'electrical accessory',
    ]),
    negativeTerms: Object.freeze([]),
  }),
  // 6. Non-networked electronic products (electrical-and-electronics-04):
  // the row's own alias is the single compound phrase "מוצר אלקטרוני
  // ללא חיבור לרשת" only -- kept to concrete device nouns rather than a
  // bare "electronic" characteristic, per the product-owner rule that
  // "electrical"/"electric" alone must never independently prove a
  // family.
  Object.freeze({
    matrixId: 'electrical-and-electronics-04',
    positiveTerms: Object.freeze([
      'מחשבון כיס', 'שעון דיגיטלי', 'מוצר אלקטרוני ללא רשת',
      'pocket calculator', 'digital watch',
    ]),
    negativeTerms: Object.freeze([]),
  }),
  // 7. Lighting fixtures (electrical-and-electronics-08): the row's own
  // alias is the plural compound "גופי תאורה ונורות" only.
  Object.freeze({
    matrixId: 'electrical-and-electronics-08',
    positiveTerms: Object.freeze([
      'גוף תאורה', 'נורת חשמל', 'מנורת לד',
      'lighting fixture', 'light bulb', 'led lamp',
    ]),
    negativeTerms: Object.freeze([]),
  }),
  // 8. Brake/steering/safety vehicle components
  // (vehicles-and-transport-06): the row's own alias is the compound
  // "חלקי בלימה, היגוי ובטיחות" only -- a single named component (brake
  // pad, steering component) is not a literal substring of it. Never
  // resolves as a complete vehicle (product-owner rule B): this
  // presentation supplement only ever targets the vehicle-PARTS matrix
  // row, the same row real identification already resolves a generic
  // vehicle-accessory description to (see CANDIDATE_SET_SCOPED_HINTS,
  // product-family-selection-mapping.js).
  Object.freeze({
    matrixId: 'vehicles-and-transport-06',
    positiveTerms: Object.freeze([
      'רכיב בלימה לרכב', 'רכיב היגוי לרכב', 'רפידת בלמים',
      'brake component', 'steering component', 'brake pad',
    ]),
    negativeTerms: Object.freeze([]),
  }),
  // 9. Tires and wheels (vehicles-and-transport-07): kept to the
  // explicit vehicle-context compound phrasing, per the product-owner
  // rule that a generic word like "wheel" requires vehicle context where
  // ambiguity exists (a bicycle/scooter wheel is a different, already
  // separately-guarded concept elsewhere in this registry).
  Object.freeze({
    matrixId: 'vehicles-and-transport-07',
    positiveTerms: Object.freeze([
      'צמיג לרכב', 'צמיגי רכב', 'חישוק לרכב',
      'tire for vehicle', 'car tire', 'wheel rim for vehicle',
    ]),
    negativeTerms: Object.freeze([]),
  }),
  // 10. Vehicle comfort and decorative accessories
  // (vehicles-and-transport-09): kept to a specific named accessory
  // rather than the already-existing generic "vehicle accessory" term
  // (CANDIDATE_SET_SCOPED_HINTS, product-family-selection-mapping.js),
  // which already targets the general vehicle-parts row and would
  // otherwise duplicate the same term across two different rows of the
  // same visible family.
  Object.freeze({
    matrixId: 'vehicles-and-transport-09',
    positiveTerms: Object.freeze([
      'כיסוי מושב לרכב', 'אביזר קישוט לרכב',
      'vehicle seat cover', 'vehicle decoration accessory',
    ]),
    negativeTerms: Object.freeze([]),
  }),
  // 11. Electric and wireless toys (children-and-infants-02): toy
  // identity is preserved (this still routes to the same
  // childrens_products_and_toys checkbox every other toy row does, per
  // product-owner rule C -- electrical/wireless characteristics never
  // remove the toy concept, they only select which matrix row within the
  // same family a complete toy resolves to).
  Object.freeze({
    matrixId: 'children-and-infants-02',
    positiveTerms: Object.freeze([
      'צעצוע חשמלי', 'צעצוע אלחוטי', 'צעצוע שלט רחוק',
      'electric toy', 'wireless toy', 'remote control toy',
    ]),
    negativeTerms: Object.freeze([]),
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
    const hasPositive = entry.positiveTerms.some((term) => haystackContainsPositiveTerm(haystack, normalizeHebrewSearchText(term).toLowerCase()));
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
    const hasPositive = hint.positiveTerms.some((term) => haystackContainsPositiveTerm(haystack, normalizeHebrewSearchText(term).toLowerCase()));
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
 * Term-scoped fan-out disambiguation (final-validation correction):
 * additional-consumer-products-02 and -07 each reach TWO checkboxes
 * (ordinary_bicycles/non_motorized_scooters, and
 * motorized_bicycles/motorized_scooters respectively) because the
 * active matrix genuinely combines bicycles and scooters into the same
 * two rows, split only by motorization state (see product-family-
 * selection-mapping.js's own comment on this pair). Without this map,
 * MATRIX_ID_TO_CHECKBOX_VALUES's plain fan-out surfaced BOTH sibling
 * checkboxes together for ANY match of either row -- a verified false
 * positive (final-validation code review): "אופניים רגילים" (bicycle
 * only) was wrongly also suggesting non_motorized_scooters, and
 * "קורקינט רגיל" (scooter only) was wrongly also suggesting
 * ordinary_bicycles. This map restricts a fanned-out matrix id's
 * suggested checkboxes to only the sibling(s) whose own specific term
 * set is genuinely present (whole-word) in the text; if the text
 * contains both bicycle and scooter wording, or neither (e.g. only the
 * row's own combined alias matched), every sibling checkbox is still
 * shown -- preserving the existing safe "genuinely ambiguous -> show
 * every real candidate" behavior for that case, and leaving every other
 * (non-bicycle/scooter) fanned-out matrix id in this file completely
 * unaffected.
 */
const FAN_OUT_CHECKBOX_TERM_SCOPES = Object.freeze({
  'additional-consumer-products-02': Object.freeze({
    ordinary_bicycles: Object.freeze(['אופניים', 'אופני הרים', 'אופני ילדים', 'bicycle', 'mountain bicycle']),
    non_motorized_scooters: Object.freeze(['קורקינט', 'קורקינטים', 'scooter', 'scooters']),
  }),
  'additional-consumer-products-07': Object.freeze({
    motorized_bicycles: Object.freeze(['אופניים', 'bicycle']),
    motorized_scooters: Object.freeze(['קורקינט', 'קורקינטים', 'scooter', 'scooters']),
  }),
});

/**
 * @param {string} matrixId
 * @param {string[]} checkboxValues - the raw fan-out for `matrixId`.
 * @param {string} haystack - already normalized/lowercased.
 * @returns {string[]} `checkboxValues`, narrowed to only the sibling(s)
 *   whose own scoped terms genuinely appear (whole-word) in `haystack`,
 *   when a scope is defined for `matrixId`; unchanged otherwise (and
 *   unchanged if narrowing would eliminate every candidate).
 */
function scopeFannedOutCheckboxes(matrixId, checkboxValues, haystack) {
  const scope = FAN_OUT_CHECKBOX_TERM_SCOPES[matrixId];
  if (!scope || checkboxValues.length < 2) return checkboxValues;
  const matched = checkboxValues.filter((checkboxValue) => {
    const terms = scope[checkboxValue];
    if (!Array.isArray(terms)) return true; // no scope defined for this sibling -- never filter it out
    return terms.some((term) => haystackContainsWholeTerm(haystack, normalizeHebrewSearchText(term).toLowerCase()));
  });
  return matched.length > 0 ? matched : checkboxValues;
}

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
    const checkboxValues = scopeFannedOutCheckboxes(family.id, MATRIX_ID_TO_CHECKBOX_VALUES.get(family.id) || [], haystack);
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
    const checkboxValues = scopeFannedOutCheckboxes(matrixId, MATRIX_ID_TO_CHECKBOX_VALUES.get(matrixId) || [], haystack);
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

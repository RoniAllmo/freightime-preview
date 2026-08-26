/**
 * Conservative, local, deterministic product-family identification
 * against the reviewed product-family matrix
 * (product-family-matrix.js). No external AI, no network, no fuzzy
 * scoring that could produce an unsafe match -- a family is only
 * identified when its own name or one of its curated, explicitly
 * reviewed aliases appears as a substring of the free text the user
 * already typed (product name, commercial description, intended use).
 *
 * This module never asks a new question: it runs once, silently, over
 * text the questionnaire already collected, exactly like the existing
 * regulatory-signals keyword-hint mechanism. When more than one family
 * matches, or none does, it reports that outcome rather than guessing.
 */

import { activeFamilies } from './product-family-matrix.js';
import { normalizeHebrewSearchText } from './regulatory-signals/keyword-hints.js';

export const IDENTIFICATION_OUTCOME = Object.freeze({
  HIGH_CONFIDENCE: 'high_confidence',
  MULTIPLE_CANDIDATES: 'multiple_candidates',
  NONE: 'none',
});

const MAX_CANDIDATES = 3;

/**
 * Narrow, per-family exclusion terms: when free text contains one of a
 * family's own negative terms, that family is never matched for this
 * identification call, even if one of its own aliases also matched.
 * Mirrors the existing, precedented `NEGATIVE_HINT_KEYWORDS` mechanism in
 * regulatory-signals/keyword-hints.js (same purpose: a co-occurring word
 * shows the match would be wrong, without touching the shared matching
 * algorithm for every other family -- opt-in, empty for every family not
 * listed here).
 *
 * additional-consumer-products-02/-07 (ordinary/auxiliary-motor
 * bicycles and scooters, Wave 2 completion): the required positive
 * aliases ("אופניים", "קורקינט") are also, unavoidably, plain
 * substrings of common accessory phrasing ("מנשא אופניים לרכב" -- a
 * bicycle carrier -- literally contains "אופניים"; "כיסוי לאופניים" -- a
 * bicycle cover -- likewise). This list excludes exactly those
 * accessory phrases from ever resolving to the complete-bicycle/scooter
 * families, per the product owner's explicit "protect against
 * accessories" requirement.
 */
const FAMILY_NEGATIVE_TERMS = Object.freeze({
  'additional-consumer-products-02': Object.freeze([
    // Accessory phrases (product owner's explicit "protect against
    // accessories" requirement): these contain "אופניים"/"bicycle" as a
    // plain substring but are not the complete bicycle/scooter product.
    'מנשא אופניים', 'כיסוי לאופניים', 'כיסוי אופניים', 'חלק חילוף לאופניים',
    'חלק חילוף לקורקינט', 'סוללה לקורקינט', 'קסדת אופניים', 'bicycle rack',
    'bicycle carrier', 'bicycle cover', 'scooter replacement part', 'bike helmet',
    // Auxiliary-motor indicators: an ordinary-bicycle description must
    // never also match when the text actually describes the motorized
    // sibling family (additional-consumer-products-07) -- both share
    // the bare "אופניים"/"bicycle" substring, so the motorized
    // description is excluded here rather than risking it resolving to
    // (or becoming ambiguous with) the ordinary/standards direction.
    'חשמלי', 'חשמלית', 'חשמליים', 'מנוע עזר', 'electric', 'auxiliary motor',
  ]),
  'additional-consumer-products-07': Object.freeze([
    'מנשא אופניים', 'כיסוי לאופניים', 'כיסוי אופניים', 'חלק חילוף לאופניים',
    'חלק חילוף לקורקינט', 'קסדת אופניים', 'bicycle rack',
    'bicycle carrier', 'bicycle cover', 'scooter replacement part', 'bike helmet',
  ]),
  // Footwear (Wave 2 completion): "shoes"/"boots" (ordinary footwear's
  // own aliases) are plain substrings of "safety shoes"/"safety boots"
  // -- excluded here so safety-footwear text resolves cleanly to the
  // safety-footwear family instead of becoming falsely ambiguous.
  'textiles-and-furniture-02': Object.freeze([
    'safety shoes', 'safety boots', 'protective footwear', 'נעלי בטיחות', 'נעלי עבודה עם מיגון',
  ]),
  // Medicines/pharma-manufacturing vitamins (Wave 2 completion): the
  // pre-existing "תרופות" (medicines) family's own alias is a plain
  // substring of "...לייצור תרופות" (vitamins for pharmaceutical
  // manufacturing) -- excluded here so that description resolves
  // cleanly to the new pharma-manufacturing-vitamins family instead of
  // becoming falsely ambiguous with the unrelated, unreachable-by-
  // checkbox medicines family.
  'health-and-cosmetics-04': Object.freeze(['ויטמינ']), // root form -- covers both "ויטמינים" and the adjective "ויטמיני"
  // Sports equipment (Wave 2 completion, code-review finding fixed):
  // this row's own base name "ציוד ספורט" is an unavoidable prefix of
  // the legacy compound "ציוד ספורט וציוד מגן" (sports AND protective
  // equipment) -- excluded here so that phrase, which explicitly also
  // names protective equipment, never falsely resolves to this
  // no-signal row (which would wrongly tell a genuinely protective-
  // equipment description that no approval is needed).
  'additional-consumer-products-01': Object.freeze(['וציוד מגן']),
});

function isUsableArray(value) {
  return Array.isArray(value);
}

function isExcludedByNegativeTerms(family, haystack) {
  const negativeTerms = FAMILY_NEGATIVE_TERMS[family.id];
  if (!isUsableArray(negativeTerms) || negativeTerms.length === 0) return false;
  return negativeTerms.some((term) => {
    const normalized = normalizeHebrewSearchText(term).toLowerCase();
    return normalized.length > 0 && haystack.includes(normalized);
  });
}

/**
 * @param {string[]} texts - free-text answer strings to scan.
 * @param {object} [options]
 * @param {Array} [options.families] - override the family list (tests, and
 *   explicit product-family checkbox selections -- see
 *   product-family-selection-mapping.js).
 * @param {object} [options.forcedFamily] - when set, an explicit,
 *   unambiguous product-family selection already identifies this exact
 *   matrix family on its own, without requiring any free-text alias
 *   match. Returned immediately as HIGH_CONFIDENCE. See
 *   product-family-selection-mapping.js for when this is used.
 * @returns {{ outcome: string, family: object|null, candidates: object[] }}
 */
export function identifyProductFamily(texts, options = {}) {
  if (options.forcedFamily) {
    return {
      outcome: IDENTIFICATION_OUTCOME.HIGH_CONFIDENCE,
      family: options.forcedFamily,
      candidates: [options.forcedFamily],
    };
  }

  // Case-insensitive on top of the shared Hebrew normalization, so an
  // English alias like "walkie talkie" matches regardless of the
  // capitalization the user happened to type.
  const haystack = normalizeHebrewSearchText(
    (isUsableArray(texts) ? texts : []).filter((t) => typeof t === 'string').join(' '),
  ).toLowerCase();
  const families = isUsableArray(options.families) ? options.families : activeFamilies();

  if (!haystack) {
    return { outcome: IDENTIFICATION_OUTCOME.NONE, family: null, candidates: [] };
  }

  const matches = families.filter((family) => {
    if (isExcludedByNegativeTerms(family, haystack)) return false;
    return (family.aliases || []).some((alias) => {
      const normalizedAlias = normalizeHebrewSearchText(alias).toLowerCase();
      return normalizedAlias.length > 0 && haystack.includes(normalizedAlias);
    });
  });

  if (matches.length === 0) {
    return { outcome: IDENTIFICATION_OUTCOME.NONE, family: null, candidates: [] };
  }

  if (matches.length === 1) {
    return {
      outcome: IDENTIFICATION_OUTCOME.HIGH_CONFIDENCE,
      family: matches[0],
      candidates: matches,
    };
  }

  return {
    outcome: IDENTIFICATION_OUTCOME.MULTIPLE_CANDIDATES,
    family: null,
    candidates: matches.slice(0, MAX_CANDIDATES),
  };
}

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
    // Correction pass (product-owner rule E, bicycles/scooters):
    // "ממונע"/"ממונעים" (motorized) was a missing motorization
    // indicator -- without it, "אופניים ממונעים" (motorized bicycles)
    // incorrectly resolved to this ordinary/standards row instead of
    // the motorized/vehicle-laboratory row below. Real false-positive
    // bug fix, not a presentation-only concern. Deliberately Hebrew-only
    // (final-validation code-review finding): a bare English "motorized"
    // is a plain substring of this row's own official alias "non-
    // motorized scooter", so adding it here silently broke that exact
    // alias (identifyProductFamily(['non-motorized scooter']) started
    // returning NONE instead of matching this row). None of this row's
    // own Hebrew aliases contain "ממונע"/"ממונעת"/"ממונעים", so those
    // three carry no equivalent collision risk.
    'ממונע', 'ממונעת', 'ממונעים',
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
  // General/occupational PPE (correction pass, final-validation code-
  // review finding): this row's own pre-existing matrix alias "sport
  // protective equipment" (singular "sport", not the plural "sports")
  // directly names sports-context protective equipment, but the
  // product-owner's rule 2 requires that description to stay in the
  // sports context and never receive this row's Standards direction
  // just because it protects during sports. Excluded here -- the text
  // then correctly stays unresolved at the real identification level
  // (no positive direction fabricated) and is separately routed to the
  // sports checkbox by this row's own presentation-layer supplement
  // counterpart in the sibling presentation-suggestion module.
  'additional-consumer-products-06': Object.freeze(['sport protective equipment']),
  // Batteries/accumulators (final completion pass): the standalone
  // battery row's own aliases ("מצבר", "battery", "accumulator") are
  // unavoidable substrings of the new vehicle-dedicated-accumulator
  // row's own phrasing ("מצבר לרכב", "vehicle battery", "car battery",
  // "vehicle accumulator") -- excluded here so vehicle-specific text
  // resolves cleanly to the vehicle-laboratory direction instead of
  // becoming falsely ambiguous with the plain-standards direction.
  'electrical-and-electronics-07': Object.freeze([
    'מצבר לרכב', 'מצבר ייעודי לרכב', 'vehicle battery', 'car battery', 'vehicle accumulator',
    // Boundary protection (product-owner requirement): equipment that
    // merely mentions battery terminology -- a charger, tester, holder,
    // or compartment for a battery, or equipment that only CONTAINS an
    // internal battery -- must never be treated as the standalone
    // battery/accumulator product itself.
    'battery charger', 'מטען לסוללה', 'battery tester', 'בודק סוללות',
    'battery holder', 'מחזיק סוללה', 'battery compartment', 'תא סוללה',
    'סוללה פנימית', 'internal battery', 'הכולל סוללה', 'containing a battery', 'containing an internal battery',
    // Grouped-battery-selection completion (2026-08-26): the additional
    // Case 4/6 boundary phrasing -- "portable equipment WITH a battery"
    // and "battery-powered"/"rechargeable" wording -- must also never
    // resolve to this standalone-battery row (they resolve instead to
    // the new "ציוד הכולל סוללה" row, or stay unresolved).
    'עם סוללה', 'battery-powered', 'rechargeable device', 'rechargeable equipment',
    // Plural forms (coverage-completion pass): this row's own alias
    // "מצבר" is a plain substring of the plural "מצברים" (unlike other
    // Hebrew plurals, the resh in "מצבר" has no final-form glyph
    // change), so once plural battery/accumulator text became a
    // supported presentation path, the plural vehicle-battery/
    // boundary phrases above needed mirroring here too -- otherwise a
    // plural vehicle-battery description would incorrectly resolve to
    // this standalone row at the REAL identification level (not just
    // the presentation layer), the exact collision the product owner
    // required to be checked before any plural battery supplement was
    // added.
    'מצברים לרכב', 'מצברים ייעודיים לרכב', 'vehicle batteries', 'car batteries', 'vehicle accumulators',
    'battery chargers', 'מטענים לסוללות', 'battery testers', 'בודקי סוללות',
    'battery holders', 'מחזיקי סוללות', 'battery compartments', 'תאי סוללות',
    'סוללות פנימיות', 'internal batteries', 'containing batteries', 'containing internal batteries',
    'עם סוללות',
    // Battery/accumulator accessory or part (correction pass, section F
    // review): a false-identification gap found while validating this
    // guard list against the product owner's required scenario "battery
    // accessory or part" -- "battery part"/"battery accessory"/"אביזר
    // לסוללה"/"חלק לסוללה"/"מטען למצבר" etc. were all wrongly resolving
    // to this standalone-battery row (this row's own bare aliases
    // "battery"/"מצבר"/"accumulator" are plain substrings of every one
    // of these accessory/part phrases). Mirrors the existing charger/
    // tester/holder/compartment protection above onto "part"/
    // "accessory" wording and onto "accumulator"/"מצבר"-specific
    // phrasing the original guard list did not cover.
    'battery part', 'battery parts', 'battery accessory', 'battery accessories',
    'accumulator part', 'accumulator parts', 'accumulator accessory', 'accumulator accessories',
    'accumulator charger', 'accumulator holder', 'accumulator compartment',
    'אביזר לסוללה', 'אביזרים לסוללה', 'חלק לסוללה', 'חלקי סוללה', 'חלקים לסוללה',
    'אביזר למצבר', 'אביזרים למצבר', 'חלק למצבר', 'חלקי מצבר',
    'מטען למצבר', 'מטענים למצברים', 'מחזיק למצבר', 'תא למצבר',
  ]),
  // Ordinary furniture (final completion pass): "כיסא" (chair) is an
  // unavoidable substring of the pre-existing infant-products row's own
  // compound alias "...וכיסאות אוכל" (high chairs) -- excluded here so
  // that infant-product text keeps its existing Standards Institution
  // direction instead of becoming falsely ambiguous with the ordinary,
  // no-positive furniture direction.
  'textiles-and-furniture-05': Object.freeze(['כיסאות אוכל']),
  // Live animals (live-animals completion, 2026-08-26): the new row's
  // own plural alias "בעלי חיים" is an unavoidable substring of the
  // pre-existing "מוצרים לבעלי חיים" (products FOR animals) and
  // "ויטמינים לבעלי חיים" (vitamins FOR animals) rows' own names/
  // aliases -- both are literally "<something> לבעלי חיים" ("...for
  // animals"). Excluded here so that existing for-animals product/
  // vitamin text keeps resolving cleanly to its own row instead of
  // becoming falsely ambiguous with the new live-animal-itself row.
  'food-and-beverages-08': Object.freeze([
    'לבעלי חיים',
    // A deceased animal or its remains is not a live animal -- these
    // compound phrases each contain "בעל חיים" as a plain substring
    // but describe the opposite concept.
    'בעל חיים מת', 'שלד בעל חיים', 'עור בעל חיים', 'שריד בעל חיים',
  ]),
  // Products of animal origin (animal-feed completion, 2026-08-27):
  // this row's own bare species alias "דגים" (fish) is an unavoidable
  // substring of the new animal-feed row's "מזון לדגים" (fish food) --
  // food FOR fish is not fish itself. Excluded here so fish-feed text
  // resolves cleanly to the new animal-feed row instead of becoming
  // falsely ambiguous with this row.
  'food-and-beverages-04': Object.freeze(['מזון לדגים']),
  // Beverages (Wave 3, 2026-08-27): this row's own bare alias "משקה"
  // (drink) is an unavoidable substring of the new food-contact
  // bottle phrases added to food-contact-01/03 above (a bottle
  // intended to contact a beverage is the container, not the beverage
  // itself). Excluded here so those bottle phrases resolve cleanly to
  // their own food-contact row instead of becoming falsely ambiguous
  // with this row.
  'food-and-beverages-02': Object.freeze([
    'בקבוק פלסטיק למשקה', 'בקבוק זכוכית למשקה', 'בקבוק הבא במגע עם משקה',
  ]),
  // Carpets/rugs (Wave 3, 2026-08-27): this row's own bare alias "rug"
  // is an unavoidable substring of "corrugated" (as in "corrugated
  // carton", the new ordinary-cardboard-packaging row's own alias) --
  // "co-RRU-Gated" contains "rug" as a plain substring. Excluded here
  // so cardboard-packaging text resolves cleanly instead of becoming
  // falsely ambiguous with this row.
  // Carpets/rugs (Wave 3, 2026-08-27): this row's own bare aliases
  // "carpet" and "rug" are also unavoidable substrings of
  // carpet-CLEANING equipment phrases (e.g. "carpet cleaner", "rug
  // cleaner") -- a machine or product for cleaning carpets is not a
  // carpet itself. Excluded here so those phrases stay unresolved
  // instead of being misidentified as a carpet.
  'textiles-and-furniture-06': Object.freeze([
    'corrugated', 'carpet cleaner', 'rug cleaner', 'carpet cleaning',
    'rug cleaning', 'מנקה שטיחים', 'ניקוי שטיחים',
  ]),
  // Apparel/textile (Wave 3, 2026-08-27): this row's own bare alias
  // "טקסטיל" (textile) is an unavoidable substring of the new
  // household-textile-products row's own name "מוצרי טקסטיל ביתיים".
  // Excluded here so household-textile text resolves cleanly to its
  // own row instead of becoming falsely ambiguous with this one.
  'textiles-and-furniture-01': Object.freeze(['מוצרי טקסטיל ביתיים']),
  // Drones (Wave 3, 2026-08-27): this row's own bare alias "drone" is
  // an unavoidable substring of accessory/part phrases such as "drone
  // accessory", "drone propeller", "drone carrying case", and
  // "replacement part for drone" -- a drone accessory or spare part is
  // not a complete drone. Excluded here so those phrases stay
  // unresolved (or resolve elsewhere) instead of being misidentified
  // as a complete drone.
  'electrical-and-electronics-10': Object.freeze([
    'drone accessory', 'drone propeller', 'drone carrying case',
    'replacement part for drone', 'אביזר לרחפן', 'מדחף לרחפן',
    'תיק נשיאה לרחפן', 'חלק חילוף לרחפן',
    // Plural forms (coverage completion, product-owner-directed, drone
    // duplicate resolution): additional-consumer-products-03 was made
    // reachable via its own plural-only alias "רחפנים", which needs
    // the identical accessory/part protection this row already has for
    // the singular -- listed on both matrix ids' own entries since
    // either could independently match depending on which alias the
    // free text contains.
    'drone accessories', 'drone propellers', 'drone carrying cases',
    'replacement parts for drones', 'אביזרים לרחפנים', 'מדחפים לרחפנים',
    'תיקי נשיאה לרחפנים', 'חלקי חילוף לרחפנים',
    // Bare "part" wording (correction pass, section F review): a false-
    // identification gap found while validating this guard list against
    // the product owner's required "drone part" scenario -- "drone
    // part"/"drone parts"/"חלק לרחפן"/"חלקי רחפן"/"חלקים לרחפנים" were
    // all wrongly resolving to the complete-drone row (only the more
    // specific "replacement part for drone"/"חלק חילוף לרחפן" wording
    // was previously excluded). A drone part is not a complete drone.
    'drone part', 'drone parts', 'חלק לרחפן', 'חלקי רחפן', 'חלקים לרחפן', 'חלקים לרחפנים',
  ]),
  // Drone duplicate (coverage completion, product-owner-directed): this
  // row was previously unreachable via any checkbox, so it never
  // needed its own negative-term protection; now that it is reachable
  // (see wireless_or_transmitting_equipment in
  // product-family-selection-mapping.js), it needs the identical
  // accessory/part exclusion electrical-and-electronics-10 already has
  // -- both singular and plural, since this row's own alias is the
  // plural "רחפנים" but a free-text description could still contain
  // singular accessory phrasing describing the same product.
  'additional-consumer-products-03': Object.freeze([
    'drone accessory', 'drone propeller', 'drone carrying case',
    'replacement part for drone', 'אביזר לרחפן', 'מדחף לרחפן',
    'תיק נשיאה לרחפן', 'חלק חילוף לרחפן',
    'drone accessories', 'drone propellers', 'drone carrying cases',
    'replacement parts for drones', 'אביזרים לרחפנים', 'מדחפים לרחפנים',
    'תיקי נשיאה לרחפנים', 'חלקי חילוף לרחפנים',
    // Bare "part" wording (correction pass, section F review): mirrors
    // the identical fix on electrical-and-electronics-10 above -- see
    // that entry's comment.
    'drone part', 'drone parts', 'חלק לרחפן', 'חלקי רחפן', 'חלקים לרחפן', 'חלקים לרחפנים',
  ]),
  // Complete motorcycles (motorcycle presentation/resolution
  // correction): this row becomes reachable via a
  // CANDIDATE_SET_SCOPED_HINTS entry (product-family-selection-
  // mapping.js) once the complete_vehicles checkbox is explicitly
  // selected, widening its own aliases with bare "אופנוע"/"אופנועים"/
  // "קטנוע"/"קטנועים" -- a spare-part or accessory phrase built on the
  // exact same bare word (e.g. "חלק חילוף לאופנוע") must never resolve
  // as a complete motorcycle. Global, not scoped-hint-specific, since
  // FAMILY_NEGATIVE_TERMS applies to every identifyProductFamily call
  // regardless of which caller widened this row's aliases.
  'vehicles-and-transport-02': Object.freeze([
    'חלק חילוף לאופנוע', 'חלקי חילוף לאופנוע', 'חלקי חילוף לאופנועים',
    'חלק חילוף לקטנוע', 'חלקי חילוף לקטנוע', 'חלקי חילוף לקטנועים',
    'חלק לאופנוע', 'חלקים לאופנוע', 'חלפים לאופנוע', 'חלפים לאופנועים',
    'אביזר לאופנוע', 'אביזרים לאופנוע', 'אביזר לאופנועים',
    'motorcycle spare part', 'motorcycle spare parts', 'motorcycle part', 'motorcycle parts',
    'motorcycle accessory', 'motorcycle accessories', 'spare part for motorcycle', 'scooter spare part',
  ]),
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

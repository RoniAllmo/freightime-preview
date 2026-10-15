/**
 * Conservative, local, deterministic product-family identification
 * against the reviewed product-family matrix
 * (product-family-matrix.js). No external AI, no network, no fuzzy
 * scoring that could produce an unsafe match -- a family is only
 * identified when its own name or one of its curated, explicitly
 * reviewed aliases appears in the free text the user already typed
 * (product name, commercial description, intended use). Longer aliases
 * match as a substring; short ones only as a guarded whole word (see
 * aliasMatches below).
 *
 * This module never asks a new question: it runs once, silently, over
 * text the questionnaire already collected, exactly like the existing
 * regulatory-signals keyword-hint mechanism. When more than one family
 * matches, or none does, it reports that outcome rather than guessing.
 */

import { activeFamilies } from './product-family-matrix.js';
import { normalizeHebrewSearchText } from './regulatory-signals/keyword-hints.js';
import { containsShortTerm, isShortTerm } from './term-boundary.js';

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
    // English bicycle-helmet exclusion (Plan PKG-FB03-01, product
    // owner's explicit "protect against accessories" requirement
    // extended to English bicycle-helmet phrasing, aligning with the
    // existing "bike helmet"/"קסדת אופניים" exclusions above).
    'bicycle helmet', 'bicycle helmets', 'replacement bicycle helmet', 'bicycle helmet replacement',
    // Plural Hebrew/English forms (PKG-FB04-COMPLETE-HELMET-DOMAIN-V1,
    // coverage-completion pass): the singular "קסדת אופניים"/"bike
    // helmet" exclusions above do not cover the plural spellings, which
    // are separate approved complete-helmet aliases (product-family-
    // matrix.js) and must be excluded here just as safely.
    'קסדות אופניים', 'bike helmets',
    // Bicycle-tire exclusion (Plan PKG-FB02-01, product owner's explicit
    // "protect against accessories" requirement extended to tires):
    // narrowly scoped ordinary-bicycle tire phrases, not a global
    // part/tire-language suppression.
    'צמיג לאופניים', 'צמיג אופניים', 'צמיגי אופניים',
    'bicycle tire', 'bicycle tires', 'bicycle tyre', 'bicycle tyres',
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
    // English bicycle-helmet exclusion (Plan PKG-FB03-01, same "protect
    // against accessories" requirement, aligned with the ordinary-
    // bicycle row's identical exclusion above).
    'bicycle helmet', 'bicycle helmets', 'replacement bicycle helmet', 'bicycle helmet replacement',
    // Electric-bicycle-tire exclusion (Plan PKG-FB02-01, same "protect
    // against accessories" requirement extended to tires): narrowly
    // scoped electric-bicycle tire phrases only.
    'צמיג לאופניים חשמליים', 'צמיג אופניים חשמליים', 'צמיגי אופניים חשמליים',
    'electric bicycle tire', 'electric bicycle tires', 'electric bicycle tyre', 'electric bicycle tyres',
    'e-bike tire', 'e-bike tires', 'e-bike tyre', 'e-bike tyres',
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
    // Reproductive and biological material boundary (FT-ONE-PULSE-
    // LIVE-ANIMALS-V2, found and fixed during this pass's own collision
    // testing): embryos, semen, ova, and biological/tissue samples
    // "of animals" ("של בעלי חיים") are not a live animal itself --
    // this row's own plural alias "בעלי חיים" is otherwise an
    // unavoidable substring of that phrasing. Deliberately out of scope
    // for this family per the domain-exclusion rule (embryos, semen,
    // ova, hatching eggs, reproductive material, biological samples,
    // tissues, blood, laboratory specimens are excluded from the
    // live-animals family without implying no approval is required).
    'של בעלי חיים',
  ]),
  // Products of animal origin (animal-feed completion, 2026-08-27):
  // this row's own bare species alias "דגים" (fish) is an unavoidable
  // substring of the new animal-feed row's "מזון לדגים" (fish food) --
  // food FOR fish is not fish itself. Excluded here so fish-feed text
  // resolves cleanly to the new animal-feed row instead of becoming
  // falsely ambiguous with this row.
  // Live animals veterinary domain completion (FT-ONE-PULSE-LIVE-ANIMALS-V2):
  // this row's own bare aliases "עוף" (chicken/poultry, as food) and
  // "דגים" (fish, as food) are unavoidable substrings of the new
  // live-poultry/live-fish phrases added to food-and-beverages-08
  // ("עוף חי", "דגים חיים") -- a live bird or live fish is not itself a
  // food product. Excluded here so those phrases resolve cleanly to the
  // live-animal row instead of becoming falsely ambiguous with this row.
  'food-and-beverages-04': Object.freeze(['מזון לדגים', 'עוף חי', 'דגים חיים']),
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
    // Plural forms (coverage completion, product-owner-directed): the
    // plural alias "רחפנים" belongs to this row (moved here from the
    // retired legacy row additional-consumer-products-03 on 2026-10-13),
    // so it needs the same accessory/part protection as the singular.
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
  // The legacy plural drone row (additional-consumer-products-03) had a
  // mirrored entry here until it was retired on 2026-10-13 (product-
  // owner decision, P2 decision backlog). Its plural alias now belongs
  // to electrical-and-electronics-10, whose entry above already covers
  // the plural accessory/part forms.
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
    // Helmet collision protection (PKG-FB04-COMPLETE-HELMET-DOMAIN-V1):
    // this row's own real alias is the compound "אופנועים וקטנועים
    // שלמים" only, but the complete_vehicles checkbox's own scoped hint
    // (CANDIDATE_SET_SCOPED_HINTS in product-family-selection-mapping.js)
    // widens it with the bare words "אופנוע"/"אופנועים"/"קטנוע"/
    // "קטנועים" -- every one of which is also a plain substring of a
    // complete-helmet description naming that same vehicle. A helmet is
    // a standalone product (the new dedicated helmet family,
    // additional-consumer-products-10) and must never resolve as a
    // complete motorcycle/scooter, regardless of which checkbox widened
    // this row's aliases -- FAMILY_NEGATIVE_TERMS applies globally to
    // every identifyProductFamily call, per this file's own doc comment.
    'קסדת אופנוע', 'קסדות אופנוע', 'קסדת קטנוע', 'קסדות קטנוע',
    'motorcycle helmet', 'motorcycle helmets', 'motorbike helmet', 'motorbike helmets',
    'scooter helmet', 'scooter helmets',
  ]),
  // Domain expansion (2026-10-15, registry rules 42-45): accessory and
  // part phrases built on a new row's own complete-product alias. A
  // fridge magnet, an AC remote or a solar-panel mount is not the
  // appliance or the panel itself; a car air conditioner is a vehicle
  // part. Each list names only its own row's accessories -- exclusion
  // only, no redirect.
  'electrical-and-electronics-11': Object.freeze([
    'מגנט למקרר', 'מגנטים למקרר', 'fridge magnet', 'fridge magnets',
    'מסנן למקרר', 'מסנן מים למקרר', 'fridge water filter', 'refrigerator water filter',
    'שלט למזגן', 'שלט מזגן', 'air conditioner remote',
    'מעמד למזגן', 'air conditioner bracket',
    'חלק חילוף למזגן', 'חלקי חילוף למזגן', 'חלק חילוף למקרר', 'חלקי חילוף למקרר',
    'מזגן לרכב', 'מזגנים לרכב', 'car air conditioner',
  ]),
  // Solar panels: an inverter "for solar panels" contains the panel
  // alias, and belongs to electrical-and-electronics-13 instead.
  'electrical-and-electronics-12': Object.freeze([
    'ממיר לפאנל', 'ממיר לפאנלים', 'ממירים לפאנלים',
    'solar panel inverter', 'inverter for solar panel',
    'מעמד לפאנל', 'מעמדים לפאנלים', 'solar panel mount', 'solar panel mounting',
    'solar panel bracket', 'solar panel brackets',
  ]),
  // Tobacco: a car "cigarette lighter" socket or a lighter is not a
  // tobacco product.
  'additional-consumer-products-12': Object.freeze([
    'cigarette lighter', 'cigarette lighters', 'מצית לסיגריות', 'מצית סיגריות', 'מצת סיגריות',
  ]),
  // Dedicated helmet family itself (PKG-FB04-COMPLETE-HELMET-DOMAIN-V1):
  // once bare "קסדה"/"helmet" (and the many compound complete-helmet
  // phrases) became real aliases of this row, every one of the approved
  // parts, accessory, toy, decorative, miniature, model, and replica
  // phrases below became a plain substring risk (e.g. "רצועה לקסדה",
  // strap FOR a helmet, is not a complete helmet; "קסדות צעצוע", toy
  // helmets, contains this row's own plural base alias "קסדות"). None
  // of these describes a complete, functional helmet -- excluded here so
  // they keep their current (non-helmet-family) behavior instead of
  // silently gaining an unapproved Standards Institution direction. No
  // new parts/toy family or redirect is introduced; this is exclusion
  // only.
  'additional-consumer-products-10': Object.freeze([
    // Helmet parts -- Hebrew.
    'רצועה לקסדה', 'רצועה לקסדת אופניים', 'רצועה חלופית לקסדה',
    'אבזם לקסדה', 'אבזם לקסדת אופניים',
    'ריפוד לקסדה', 'ריפוד לקסדת אופניים',
    'מצחייה לקסדה', 'מצחייה לקסדת אופנוע',
    'מגן פנים לקסדה', 'חלק חילוף לקסדה', 'חלקי חילוף לקסדה', 'מעטפת לקסדה',
    // Helmet parts -- English.
    'helmet strap', 'helmet straps', 'bicycle helmet strap', 'replacement helmet strap',
    'helmet buckle', 'helmet buckles', 'helmet padding', 'bicycle helmet padding',
    'helmet visor', 'helmet visors', 'helmet face shield', 'helmet face shields',
    'helmet replacement part', 'helmet replacement parts',
    'replacement bicycle helmet part', 'replacement bicycle helmet parts',
    'helmet shell', 'helmet shells',
    // Toy and non-functional helmets -- Hebrew.
    'קסדת צעצוע', 'קסדות צעצוע', 'קסדה מיניאטורית', 'קסדות מיניאטוריות',
    'קסדה דקורטיבית', 'קסדות דקורטיביות', 'דגם קסדה', 'דגמי קסדה',
    'העתק קסדה', 'העתקים של קסדה',
    // Toy and non-functional helmets -- English.
    'toy helmet', 'toy helmets', 'miniature helmet', 'miniature helmets',
    'decorative helmet', 'decorative helmets', 'helmet model', 'helmet models',
    'helmet replica', 'helmet replicas',
  ]),
});

/**
 * Short Alias guards (product-owner decisions D1-D4, 2026-10-15). A
 * short alias (a single word of at most 4 Hebrew letters or 5 Latin
 * characters, see isShortTerm) is never matched as a bare substring:
 * "rug" inside "drugs" routed a medicine to the carpets family's
 * Standards direction, and "בשר" inside "בשרשרת" (on a chain) routed
 * jewelry to the animal-origin food family's ministry directions. A
 * short alias now matches only as its own word (one Hebrew prefix
 * letter allowed, plus an English plural ending), not after an explicit
 * negation ("ללא בשר"), and not as a flavor or scent ("בטעם בשר"). See
 * containsShortTerm. Longer aliases keep plain substring matching,
 * unchanged.
 *
 * WORD_START_ALIAS_STEMS: product-owner-approved stems (D2) whose
 * inflections all begin with the stem ("מכנסיים", "גרביים", "בגדים") --
 * they must start a word but may continue it.
 *
 * SHORT_ALIAS_FORMS: explicit plural forms (D2) for short aliases whose
 * plural previously matched only because the singular was a substring
 * of it. Each form passes through the same guard as the alias itself.
 */
const WORD_START_ALIAS_STEMS = Object.freeze(['מכנס', 'גרב', 'בגד']);

const SHORT_ALIAS_FORMS = Object.freeze({
  'בשר': Object.freeze(['בשרים']),
  'מעיל': Object.freeze(['מעילים']),
  'כיסא': Object.freeze(['כיסאות']),
  'מצבר': Object.freeze(['מצברים']),
  'פטיש': Object.freeze(['פטישים']),
  'מברג': Object.freeze(['מברגים']),
  'פליר': Object.freeze(['פלירים']),
  // Short aliases added only by a checkbox's scoped hints
  // (CANDIDATE_SET_SCOPED_HINTS in product-family-selection-mapping.js).
  'לול': Object.freeze(['לולים']),
  'פרח': Object.freeze(['פרחים']),
  'משדר': Object.freeze(['משדרים', 'משדרת']),
});

function aliasMatches(haystack, normalizedAlias) {
  if (normalizedAlias.length === 0) return false;
  if (!isShortTerm(normalizedAlias)) return haystack.includes(normalizedAlias);
  return containsShortTerm(haystack, normalizedAlias, {
    wordStart: WORD_START_ALIAS_STEMS.includes(normalizedAlias),
    forms: SHORT_ALIAS_FORMS[normalizedAlias],
  });
}

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
    return (family.aliases || []).some((alias) => aliasMatches(haystack, normalizeHebrewSearchText(alias).toLowerCase()));
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

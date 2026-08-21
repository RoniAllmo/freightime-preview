/**
 * Free-text keyword hint detection. Suggests WHICH closed-choice
 * follow-up question might be relevant -- never itself a trigger for a
 * signal. Deliberately broad/loose matching is fine here precisely
 * because a hint can only ever open a question, never produce output
 * on its own (enforced in matcher.js, not here).
 *
 * Pure string matching. No DOM, no network.
 */

/** Canonical internalCategory ids (see rules-registry.js) for the two
 * categories the vehicle-vs-mains distinction is about -- exported so
 * callers outside this module (e.g. the reused-answer suppression in
 * import-readiness-controller.js) reference the same canonical id
 * strings this module's own logic uses, rather than duplicating the
 * literal elsewhere. */
export const VEHICLE_PRODUCT_CATEGORY = 'vehicle_product';
export const ELECTRICAL_MAINS_PRODUCT_CATEGORY = 'electrical_mains_product';

const HINT_KEYWORDS = Object.freeze({
  electrical_mains_product: Object.freeze([
    'חשמל', 'חשמלי', 'שקע', 'מתח', 'ואט', 'וולט', 'מטען', 'שנאי', 'כבל חשמל',
    'מכשיר חשמלי', 'מוצר חשמלי', 'תקע', 'ספק כוח', 'מתחבר לחשמל', 'חיבור לרשת החשמל',
  ]),
  plastic_food_contact: Object.freeze([
    'פלסטיק', 'פלסטי', 'ניילון', 'קופסת אוכל', 'כלי אוכל חד פעמי',
    'כלי פלסטיק למזון', 'קופסת פלסטיק למזון', 'כוס פלסטיק', 'צלחת פלסטיק',
    'סכו"ם פלסטיק', 'כלי אוכל מפלסטיק', 'מוצר פלסטיק במגע עם מזון',
  ]),
  polymer_coating_food_contact: Object.freeze([
    'ציפוי לא דביק', 'טפלון', 'ציפוי פולימרי', 'מחבת מצופה',
    'ציפוי פלסטיק', 'כוס נייר מצופה', 'קרטון מצופה', 'שכבת פלסטיק פנימית', 'ציפוי פנימי במגע עם מזון',
  ]),
  glass_food_contact: Object.freeze([
    'זכוכית', 'כוסות זכוכית', 'צנצנת זכוכית', 'קערת זכוכית',
    'כוס זכוכית', 'כלי זכוכית לשתייה', 'כלי זכוכית למזון', 'צלחת זכוכית', 'כלי הגשה מזכוכית',
  ]),
  vehicle_product: Object.freeze([
    'רכב', 'לרכב', 'מכונית', 'רישוי רכב', 'תאורת רכב', 'פנס רכב', 'בלמים', 'משרד התחבורה',
    'פנס לרכב', 'פנס קדמי לרכב', 'פנס אחורי לרכב', 'חלק לרכב', 'רכיב לרכב',
    'מערכת לרכב', 'מוצר להתקנה ברכב',
  ]),
});

/**
 * Narrow, high-precision suppression list: when free text plainly
 * describes a use case the category's own confirmation question would
 * be pointless to ask (a decorative-only glass figure, laboratory
 * glassware, glass sold as a vehicle part), the category is not hinted
 * at all, even if a positive keyword also matched -- avoids an
 * unnecessary question rather than expanding what counts as a match.
 * Never removes a category the matcher itself already gates -- this
 * only ever narrows which QUESTION is offered.
 */
const NEGATIVE_HINT_KEYWORDS = Object.freeze({
  glass_food_contact: Object.freeze([
    'דקורטיבי', 'דקורטיבית', 'לנוי', 'לקישוט', 'פסל', 'פסלון',
    'מעבדה', 'מעבדתי', 'מעבדתית',
    'לרכב', 'רכב', 'מכונית', 'זכוכית בטיחות', 'זכוכית לבניין', 'זכוכית לחלון',
  ]),
});

/** HS chapter (first 2 digits) -> candidate category, using the WCO
 * Harmonized System's own standardized top-level chapter headings
 * (Ch.70 Glass and glassware, Ch.39 Plastics and articles thereof,
 * Ch.85 Electrical machinery and equipment, Ch.87 Vehicles and vehicle
 * parts) -- not a FreighTime classification claim, and like every other
 * hint source this can only ever open a follow-up question, never
 * itself satisfy a rule's trigger predicate or appear in public output. */
const HS_CHAPTER_CATEGORY_HINTS = Object.freeze({
  70: 'glass_food_contact',
  39: 'plastic_food_contact',
  85: 'electrical_mains_product',
  87: 'vehicle_product',
});

/**
 * Safe, narrow Hebrew text normalization for substring matching only --
 * never broad fuzzy matching. Trims, collapses repeated whitespace,
 * strips Hebrew geresh/gershayim and straight/curly quote marks
 * (common inside abbreviations, otherwise irrelevant to matching), and
 * collapses the "malle" double-yod spelling (e.g. שתייה) to the
 * "haser" single-yod spelling (שתיה) so both common spelling variants
 * match identically. Deliberately does NOT perform final-letter
 * (ך/ם/ן/ף/ץ) conversion -- not needed by any current keyword or test
 * phrase, and risks joining unrelated words.
 *
 * @param {string} text
 * @returns {string}
 */
export function normalizeHebrewSearchText(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[׳״"']/g, ' ')
    .replace(/[.,;:!?()[\]{}\-־]/g, ' ')
    .replace(/יי/g, 'י')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * A vehicle's own electrical system (battery, 12V/24V, wiring harness,
 * an installed vehicle circuit) is not mains electricity -- so a
 * product already hinted as vehicle_product must not also open the
 * mains-connected-electrical-product question merely because vehicle
 * wording happens to co-occur with a generic electrical word (e.g.
 * "פנס לרכב", "רכיב חשמלי לרכב המתחבר למצבר"). The mains hint is
 * suppressed for a vehicle-hinted product UNLESS the text explicitly
 * names a genuinely separate mains connection -- a wall socket,
 * household/commercial mains, a supplied mains plug, or a supplied
 * external mains adapter/charging station -- a real second
 * characteristic the vehicle wording alone does not imply. This list
 * intentionally covers the explicit-mains-accessory phrasing (wall
 * charger, home charging station, mains-connected garage equipment)
 * documented in the vehicle-vs-mains acceptance scenarios, not just
 * the original narrow "separate supply" wording.
 */
const VEHICLE_MAINS_OVERRIDE_KEYWORDS = Object.freeze([
  'ספק כוח נפרד', 'מטען נפרד', 'כולל גם ספק כוח', 'כולל גם מטען',
  'מתחבר גם לשקע חשמל', 'טעינה מרשת החשמל הביתית', 'מטען לשקע חשמל ביתי',
  'מטען ביתי', 'שקע ביתי', 'תקע ביתי', 'ספק כוח חיצוני', 'עמדת טעינה',
  'מחובר לרשת החשמל', 'מחוברת לרשת החשמל', 'מתחבר לרשת החשמל', 'מתחברת לרשת החשמל',
  'רשת החשמל הביתית', 'מתחבר לשקע ביתי', 'מתחברת לשקע ביתי', 'שקע קיר',
]);

/**
 * Centralized vehicle-vs-mains cross-family reconciliation -- the
 * single place this project decides "a specific vehicle family is
 * already identified, so the generic mains-electricity question is
 * redundant" for EVERY hint source (free text, the sensitive-category
 * selector, a known HS code chapter), not just free text. Must be
 * applied once, after every hint source has been merged into one Set,
 * so a hint added from a different source than the vehicle hint (e.g.
 * the customer separately selecting "מוצר חשמלי" in the sensitive-
 * category dropdown for a product already identified as vehicle-related
 * from its free-text description) cannot bypass the same suppression a
 * purely free-text match already receives.
 *
 * @param {Set<string>} hinted - mutated in place and returned.
 * @param {string[]} texts - the same free text used to compute `hinted`,
 *   re-used here only to look for an explicit separate-mains phrase.
 * @returns {Set<string>}
 */
export function applyVehicleMainsSuppression(hinted, texts) {
  if (!(hinted instanceof Set)) return hinted;
  if (!hinted.has('vehicle_product') || !hinted.has('electrical_mains_product')) return hinted;
  const haystack = normalizeHebrewSearchText(
    (Array.isArray(texts) ? texts : []).filter((t) => typeof t === 'string').join(' '),
  );
  const explicitSeparateMains = VEHICLE_MAINS_OVERRIDE_KEYWORDS.some(
    (kw) => haystack.includes(normalizeHebrewSearchText(kw)),
  );
  if (!explicitSeparateMains) hinted.delete('electrical_mains_product');
  return hinted;
}

/**
 * @param {string[]} texts - free-text answer strings to scan.
 * @returns {Set<string>} candidate internal categories hinted at.
 */
export function detectCategoryHints(texts) {
  const hinted = new Set();
  const haystack = normalizeHebrewSearchText(
    (Array.isArray(texts) ? texts : []).filter((t) => typeof t === 'string').join(' '),
  );
  if (haystack.length === 0) return hinted;

  for (const [category, keywords] of Object.entries(HINT_KEYWORDS)) {
    const positiveMatch = keywords.some((kw) => haystack.includes(normalizeHebrewSearchText(kw)));
    if (!positiveMatch) continue;
    const negativeKeywords = NEGATIVE_HINT_KEYWORDS[category] ?? [];
    const negativeMatch = negativeKeywords.some((kw) => haystack.includes(normalizeHebrewSearchText(kw)));
    if (negativeMatch) continue;
    hinted.add(category);
  }

  return applyVehicleMainsSuppression(hinted, texts);
}

/** Map a sensitive-category answer (already collected elsewhere in the assessment) to a hinted internal category, when applicable. */
export function sensitiveCategoryHint(sensitiveCategory) {
  if (sensitiveCategory === 'electrical') return 'electrical_mains_product';
  if (sensitiveCategory === 'vehicle_or_transport') return 'vehicle_product';
  return null;
}

/**
 * Maps a known HS code's chapter (first 2 digits) to a candidate
 * category hint. Only ever contributes a QUESTION-opening hint, the
 * same as every other hint source -- never itself a trigger, never
 * itself a classification, never shown to the user.
 *
 * @param {string} hsCode
 * @returns {string|null}
 */
export function hsCodeCategoryHint(hsCode) {
  if (typeof hsCode !== 'string') return null;
  const digits = hsCode.replace(/\D/g, '');
  if (digits.length < 2) return null;
  return HS_CHAPTER_CATEGORY_HINTS[Number(digits.slice(0, 2))] ?? null;
}

export const HINT_KEYWORD_MAP = HINT_KEYWORDS;

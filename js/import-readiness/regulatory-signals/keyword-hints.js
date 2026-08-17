/**
 * Free-text keyword hint detection. Suggests WHICH closed-choice
 * follow-up question might be relevant -- never itself a trigger for a
 * signal. Deliberately broad/loose matching is fine here precisely
 * because a hint can only ever open a question, never produce output
 * on its own (enforced in matcher.js, not here).
 *
 * Pure string matching. No DOM, no network.
 */

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
 * @param {string[]} texts - free-text answer strings to scan.
 * @returns {Set<string>} candidate internal categories hinted at.
 */
export function detectCategoryHints(texts) {
  const hinted = new Set();
  const haystack = (Array.isArray(texts) ? texts : [])
    .filter((t) => typeof t === 'string')
    .join(' ');
  if (haystack.length === 0) return hinted;

  for (const [category, keywords] of Object.entries(HINT_KEYWORDS)) {
    if (keywords.some((kw) => haystack.includes(kw))) {
      hinted.add(category);
    }
  }
  return hinted;
}

/** Map a sensitive-category answer (already collected elsewhere in the assessment) to a hinted internal category, when applicable. */
export function sensitiveCategoryHint(sensitiveCategory) {
  if (sensitiveCategory === 'electrical') return 'electrical_mains_product';
  if (sensitiveCategory === 'vehicle_or_transport') return 'vehicle_product';
  return null;
}

export const HINT_KEYWORD_MAP = HINT_KEYWORDS;

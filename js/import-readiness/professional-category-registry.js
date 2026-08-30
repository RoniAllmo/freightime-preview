/**
 * Explicit, reusable registry of every professional category the
 * Import Readiness result can route to. Every entry names a real
 * category of professional -- never a named person or business, never
 * a claim that FreighTime operates a verified network.
 *
 * Each category carries: a Hebrew display name, a short scope
 * description, a dedicated CTA label, and a disclaimer category used
 * to pick the right boundary sentence (legal / insurance / customs /
 * operational). Rule modules build a `{type, reason, ctaLabel}`
 * referral object via `professionalReferral()` below, matching the
 * shape `buildCompactResult()` already expects for `professional` and
 * `supportingProfessional`.
 *
 * Pure data + one pure helper. DOM-free, network-free, storage-free.
 */

const DISCLAIMER_CATEGORY = Object.freeze({
  LEGAL: 'legal',
  INSURANCE: 'insurance',
  CUSTOMS: 'customs',
  OPERATIONAL: 'operational',
});

export const PROFESSIONAL_CATEGORY = Object.freeze({
  CUSTOMS_CLASSIFIER: Object.freeze({
    id: 'customs_classifier',
    name: 'מסווג מכס מקצועי',
    scope: 'בדיקת סיווג מכס למוצר על בסיס תיאור, שימוש ומפרט טכני.',
    ctaLabel: 'לתיאום בדיקת סיווג ורגולציה',
    disclaimerCategory: DISCLAIMER_CATEGORY.CUSTOMS,
  }),
  LICENSED_CUSTOMS_BROKER: Object.freeze({
    id: 'licensed_customs_broker',
    name: 'עמיל מכס מורשה',
    scope: 'טיפול בהצהרות מכס, שחרור משלוחים ותקשורת מול רשות המכס.',
    ctaLabel: 'לפנייה לעמיל מכס',
    disclaimerCategory: DISCLAIMER_CATEGORY.CUSTOMS,
  }),
  REGULATION_SPECIALIST: Object.freeze({
    id: 'regulation_specialist',
    name: 'מומחה רגולציה ליבוא',
    // The established-import-operation audit flow (established-operation-rules.js)
    // has, since before this registry existed, used a shorter form of
    // this same role's name in its own prose sentences ("מומחה
    // רגולציה" rather than the fuller "מומחה רגולציה ליבוא" used when
    // this category is rendered as a professional referral card).
    // Preserved here, byte-identical to that established public
    // wording, as an explicit field on the SAME canonical id -- rather
    // than as an anonymous inline literal in the consuming file -- so
    // every active reference to this role traces back to one canonical
    // entry. `name` (used by `professionalReferral()`/referral cards)
    // is unchanged; this field is additive and consumed only where the
    // shorter established wording is required.
    legacyShortName: 'מומחה רגולציה',
    scope: 'בדיקת דרישות תקינה, רישוי ואישורים רגולטוריים ליבוא המוצר.',
    ctaLabel: 'לתיאום בדיקת רגולציה',
    disclaimerCategory: DISCLAIMER_CATEGORY.CUSTOMS,
  }),
  FREIGHT_FORWARDER: Object.freeze({
    id: 'freight_forwarder',
    name: 'משלח בינלאומי',
    scope: 'תיאום הובלה, מסמכי שילוח, ותקשורת תפעולית מול המוביל והמסוף.',
    ctaLabel: 'לפנייה למשלח בינלאומי',
    disclaimerCategory: DISCLAIMER_CATEGORY.OPERATIONAL,
  }),
  CARRIER_CLAIMS: Object.freeze({
    id: 'carrier_claims',
    name: 'מחלקת תביעות של חברת הספנות/המוביל',
    scope: 'טיפול בתביעות נזק, אובדן או עיכוב מול המוביל הימי.',
    ctaLabel: 'לפנייה למחלקת תביעות המוביל',
    disclaimerCategory: DISCLAIMER_CATEGORY.OPERATIONAL,
  }),
  AIRLINE_CLAIMS: Object.freeze({
    id: 'airline_claims',
    name: 'מחלקת תביעות של חברת התעופה/מטען אווירי',
    scope: 'טיפול בתביעות נזק, אובדן או עיכוב במטען אווירי.',
    ctaLabel: 'לפנייה למחלקת תביעות חברת התעופה',
    disclaimerCategory: DISCLAIMER_CATEGORY.OPERATIONAL,
  }),
  COURIER_CLAIMS: Object.freeze({
    id: 'courier_claims',
    name: 'מחלקת תביעות של חברת השילוח המהיר',
    scope: 'טיפול בתביעות נזק, אובדן או עיכוב במשלוח קורייר.',
    ctaLabel: 'לפנייה למחלקת תביעות הקורייר',
    disclaimerCategory: DISCLAIMER_CATEGORY.OPERATIONAL,
  }),
  MARINE_INSURANCE_BROKER: Object.freeze({
    id: 'marine_insurance_broker',
    name: 'סוכן ביטוח ימי',
    scope: 'דיווח על אירוע ביטוחי, בדיקת תנאי הכיסוי והכוונה לשמירת זכויות.',
    ctaLabel: 'לפנייה לסוכן ביטוח ימי',
    disclaimerCategory: DISCLAIMER_CATEGORY.INSURANCE,
  }),
  CARGO_INSURER: Object.freeze({
    id: 'cargo_insurer',
    name: 'מבטח המטען',
    scope: 'דיווח ישיר על אירוע ביטוחי ובדיקת הליך הגשת תביעה.',
    ctaLabel: 'לפנייה למבטח המטען',
    disclaimerCategory: DISCLAIMER_CATEGORY.INSURANCE,
  }),
  MARINE_SURVEYOR: Object.freeze({
    id: 'marine_surveyor',
    name: 'שמאי ימי',
    scope: 'תיעוד הנזק, בדיקת היקפו ואיסוף ממצאים מקצועיים.',
    ctaLabel: 'לתיאום שמאות ימית',
    disclaimerCategory: DISCLAIMER_CATEGORY.INSURANCE,
  }),
  CUSTOMS_LAWYER: Object.freeze({
    id: 'customs_lawyer',
    name: 'עורך דין המתמחה במכס, מסי יבוא וסחר בינלאומי',
    scope: 'בדיקת דרישות מכס, מועדי השגה/ערעור, חשיפה כספית וטענות אפשריות.',
    ctaLabel: 'לפנייה לעורך דין בתחום המכס',
    disclaimerCategory: DISCLAIMER_CATEGORY.LEGAL,
  }),
  TRANSPORT_LAWYER: Object.freeze({
    id: 'transport_lawyer',
    name: 'עורך דין המתמחה בהובלה ימית, שילוח וסחר',
    scope: 'בדיקת סכסוכים משמעותיים מול מוביל, משלח או מסוף.',
    ctaLabel: 'לפנייה לעורך דין בתחום ההובלה והסחר',
    disclaimerCategory: DISCLAIMER_CATEGORY.LEGAL,
  }),
  INSURANCE_LAWYER: Object.freeze({
    id: 'insurance_lawyer',
    name: 'עורך דין המתמחה בביטוח ותביעות הובלה',
    scope: 'בדיקת מחלוקות כיסוי, דחיית תביעה או סכסוכי פיצוי מול מבטח.',
    ctaLabel: 'לפנייה לעורך דין בתחום הביטוח',
    disclaimerCategory: DISCLAIMER_CATEGORY.LEGAL,
  }),
  INSURANCE_ADVISER: Object.freeze({
    id: 'insurance_adviser',
    name: 'יועץ ביטוחי',
    scope: 'בדיקת צרכי ביטוח מטען לפני שילוח ובחירת כיסוי מתאים.',
    ctaLabel: 'לפנייה ליועץ ביטוחי',
    disclaimerCategory: DISCLAIMER_CATEGORY.INSURANCE,
  }),
  GOV_REGULATOR: Object.freeze({
    id: 'gov_regulator',
    name: 'הרשות הרגולטורית הרלוונטית',
    scope: 'בירור דרישות אישור או רישוי מול הרשות המוסמכת.',
    ctaLabel: 'לתיאום בדיקת מסמכי יבוא',
    disclaimerCategory: DISCLAIMER_CATEGORY.CUSTOMS,
  }),
  STANDARDS_SPECIALIST: Object.freeze({
    id: 'standards_specialist',
    name: 'מומחה תקינה והתאמה טכנית',
    scope: 'בדיקת התאמת המוצר לתקנים ולדרישות תקינה רלוונטיות.',
    ctaLabel: 'לתיאום בדיקת תקינה',
    disclaimerCategory: DISCLAIMER_CATEGORY.CUSTOMS,
  }),
  TESTING_LABORATORY: Object.freeze({
    id: 'testing_laboratory',
    name: 'מכון התקנים או מעבדת בדיקה מוסמכת',
    scope: 'ביצוע בדיקות מעבדה נדרשות לצורך אישור תקן למוצר לפני יבואו או שיווקו.',
    ctaLabel: 'לתיאום בדיקת מעבדה',
    disclaimerCategory: DISCLAIMER_CATEGORY.CUSTOMS,
  }),
  VEHICLE_TESTING_LAB: Object.freeze({
    id: 'vehicle_testing_lab',
    name: 'מעבדת רכב מוסמכת',
    scope: 'בדיקת התאמת מוצר המיועד להתקנה או לשימוש ברכב לדרישות משרד התחבורה.',
    ctaLabel: 'לתיאום בדיקה במעבדת רכב',
    disclaimerCategory: DISCLAIMER_CATEGORY.CUSTOMS,
  }),
  HAZMAT_SPECIALIST: Object.freeze({
    id: 'hazmat_specialist',
    name: 'מומחה טובין מסוכנים',
    scope: 'טיפול באירועים הכרוכים בסיכון בטיחותי או בטובין מסוכנים.',
    ctaLabel: 'לבדיקה דחופה של המקרה',
    disclaimerCategory: DISCLAIMER_CATEGORY.OPERATIONAL,
  }),
  // Generic, deliberately non-specialized fallback -- used by the
  // established-import-operation audit flow for purposes that need a
  // "some qualified professional should review this" recommendation
  // without narrowing to a specific specialization (e.g. sale-terms
  // review, supplier-process review, and the unmatched "other" audit
  // purpose). Carries no new authority and no regulatory meaning
  // beyond what the established, pre-existing wording already implied
  // -- name/scope/ctaLabel are byte-identical to the established
  // wording this entry replaces as an anonymous inline literal.
  GENERIC_QUALIFIED_PROFESSIONAL: Object.freeze({
    id: 'generic_qualified_professional',
    name: 'גורם מקצועי מוסמך',
    scope: 'בדיקה מקצועית כללית כאשר לא נדרשת התמחות ספציפית נוספת.',
    ctaLabel: 'לתיאום ביקורת מקצועית',
    disclaimerCategory: DISCLAIMER_CATEGORY.CUSTOMS,
  }),
});

/**
 * Build a `{type, reason, ctaLabel}` referral object for a professional
 * category, with a scenario-specific reason sentence. Matches the shape
 * `buildCompactResult()` expects for `professional`/`supportingProfessional`.
 *
 * @param {object} category - One `PROFESSIONAL_CATEGORY` entry.
 * @param {string} reason - Concrete, scenario-specific "why" sentence.
 * @returns {Readonly<{type: string, reason: string, ctaLabel: string}>}
 */
export function professionalReferral(category, reason) {
  const c = category !== null && typeof category === 'object' ? category : {};
  return Object.freeze({
    type: typeof c.name === 'string' ? c.name : '',
    reason: typeof reason === 'string' && reason.length > 0 ? reason : (typeof c.scope === 'string' ? c.scope : ''),
    ctaLabel: typeof c.ctaLabel === 'string' ? c.ctaLabel : '',
    // Internal-only identity field, never rendered -- lets callers
    // compare two referrals by the canonical professional category
    // id(s) they cover (e.g. to detect a generic referral that names
    // the same professional a specific regulatory finding already
    // named) instead of by fragile visible-text comparison. Always
    // exactly one id here, since this referral names exactly one
    // category.
    coveredCategoryIds: typeof c.id === 'string' ? Object.freeze([c.id]) : Object.freeze([]),
  });
}

/**
 * Combine two categories into a "X או Y" joint display, used only for
 * genuinely interchangeable pairs (e.g. "סוכן ביטוח ימי או מבטח המטען")
 * -- still counts as exactly one professional card.
 */
export function jointReferral(categoryA, categoryB, reason) {
  const a = categoryA !== null && typeof categoryA === 'object' ? categoryA : {};
  const b = categoryB !== null && typeof categoryB === 'object' ? categoryB : {};
  const name = [a.name, b.name].filter((n) => typeof n === 'string' && n.length > 0).join(' או ');
  return Object.freeze({
    type: name,
    reason: typeof reason === 'string' && reason.length > 0 ? reason : '',
    ctaLabel: typeof a.ctaLabel === 'string' ? a.ctaLabel : (typeof b.ctaLabel === 'string' ? b.ctaLabel : ''),
    // A joint referral covers both named categories -- confirmed by
    // this function's own two arguments, never guessed from text.
    coveredCategoryIds: Object.freeze([a.id, b.id].filter((id) => typeof id === 'string')),
  });
}

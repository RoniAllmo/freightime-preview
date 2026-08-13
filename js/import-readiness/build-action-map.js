/**
 * Shared compact-result composition helpers for every Import Readiness
 * scenario.
 *
 * Every scenario result has exactly one primary recommendation -- never
 * a page of parallel sections repeating the same conclusion. The result
 * shape is fixed and flat:
 *
 *   routeLabel          short route context (one line)
 *   primaryAction       the one thing to do
 *   primaryReason       one short reason, only when it changes the
 *                        user's decision (never generic filler)
 *   preparationItems    up to 5 relevant items -- never a generic
 *                        every-document checklist
 *   urgency             null, or a short urgency label/sentence
 *   primaryCta          {id, label} | null
 *   secondaryCta        {id, label} | null -- only when materially
 *                        different from the primary action
 *   secondaryDetails     collapsed-by-default extra content: extra
 *                        points, official sources, longer background
 *   visibleDisclaimer    one concise sentence, always shown
 *   extendedDisclaimer   longer explanation, shown only inside the
 *                        collapsed secondary detail
 *
 * Pure, deterministic, DOM-free, network-free, storage-free.
 */

export const VISIBLE_DISCLAIMER =
  'התוצאה היא הכוונה תפעולית ראשונית ואינה מהווה סיווג מכס, קביעה רגולטורית, ייעוץ משפטי או אישור יבוא.';

export const EXTENDED_DISCLAIMER =
  'FreighTime אינו קובע סיווג מכס סופי, חוקיות יבוא, החלטה רגולטורית, אישור יבוא, קביעת מס, ייעוץ משפטי או ייעוץ ביטוחי, ואינו מבטיח שחרור או אישור יבוא של הטובין. פרטים כגון שימוש המוצר, אופן הפעולה, הרכב חומרים, נתוני חשמל, דגם, מפרט ותמונות עשויים להיות חשובים לצורך בדיקת סיווג המכס והרגולציה, אך משמעותם תלויה במוצר ובמסמכים ויש לבחון אותה מקצועית.';

export const CLASSIFICATION_AND_REGULATION_REASON =
  'סוג המוצר, השימוש, החיבורים, המבנה והמפרט הטכני עשויים להשפיע על הסיווג ועל דרישות היבוא. אין מספיק מידע לקביעה סופית במסגרת הבדיקה המקוונת.';

export const LEGAL_OR_INSURANCE_BOUNDARY_MESSAGE =
  'הנושא דורש בחינה של עורך דין, יועץ ביטוחי או גורם מקצועי מתאים. FreighTime אינו מספק ייעוץ משפטי או ביטוחי.';

export const USER_PROVIDED_HS_CODE_NOTE =
  'קוד זה מוצג כפי שהוזן על ידי המשתמש בלבד ואינו מאומת כסופי. מומלץ לוודא את הסיווג ואת המסים וההיתרים הנגזרים ממנו לפני הגשה או שילוח.';

/** Professional roles a scenario may recommend -- never an invented network. */
export const PROFESSIONAL_ROLES = Object.freeze({
  CUSTOMS_CLASSIFIER: 'מסווג מכס מקצועי',
  LICENSED_CUSTOMS_BROKER: 'עמיל מכס מורשה',
  REGULATION_SPECIALIST: 'מומחה רגולציה',
  QUALIFIED_PROFESSIONAL: 'גורם מקצועי מוסמך',
  LEGAL_ADVISER: 'עורך דין',
  INSURANCE_ADVISER: 'יועץ ביטוחי',
});

/**
 * Concrete "who to contact and how" content -- always a named
 * professional type, a one-sentence concrete reason, and a dedicated
 * action-verb CTA label. Never a vague fallback like "מומלץ לפנות לגורם
 * מקצועי". Every scenario module supplies one of these per result --
 * never more than one per result.
 */
export const PROFESSIONAL_REFERRAL = Object.freeze({
  CLASSIFICATION_AND_REGULATION: Object.freeze({
    type: 'מסווג מכס או מומחה רגולציה',
    reason: 'לצורך בדיקת סיווג המכס, מאפייני המוצר ודרישות היבוא לפני הזמנה או שילוח.',
    ctaLabel: 'לתיאום בדיקת סיווג ורגולציה',
  }),
  SUPPLIER_DOCUMENTS: Object.freeze({
    type: 'מסווג מכס, עמיל מכס או גורם מקצועי המטפל במסמכי יבוא',
    reason: 'לצורך בדיקת התאמת מסמכי הספק לדרישות היבוא לפני שילוח.',
    ctaLabel: 'לתיאום בדיקת מסמכים',
  }),
  LEGAL: Object.freeze({
    type: 'עורך דין המתמחה בתחום הרלוונטי',
    reason: 'הנושא חורג מבדיקה עצמית ודורש ייעוץ משפטי מקצועי. FreighTime אינו מספק ייעוץ משפטי.',
    ctaLabel: 'פנייה לייעוץ משפטי',
  }),
  INSURANCE: Object.freeze({
    type: 'יועץ ביטוחי המתמחה בהובלה ויבוא',
    reason: 'הנושא חורג מבדיקה עצמית ודורש ייעוץ ביטוחי מקצועי. FreighTime אינו מספק ייעוץ ביטוחי.',
    ctaLabel: 'פנייה לייעוץ ביטוחי',
  }),
  URGENT_OPERATIONAL: Object.freeze({
    type: 'עמיל מכס או גורם תפעולי המטפל בשחרור המשלוח',
    reason: 'לבדיקה ופתרון מהיר של הבעיה מול הגורם הרלוונטי, לפני שהעיכוב או העלות ממשיכים לגדול.',
    ctaLabel: 'בדיקת המקרה בדחיפות',
  }),
});

/** Official-source category link registry -- static, safe, never carries user input. */
export const OFFICIAL_SOURCES = Object.freeze({
  'customs-tariff': Object.freeze({ label: 'תעריף המכס ומס הקנייה', url: 'https://www.gov.il/he/departments/general/customs_tariff' }),
  'free-import-order': Object.freeze({ label: 'צו יבוא חופשי', url: 'https://www.gov.il/he/departments/policies/free_import_order' }),
  'standards-institution': Object.freeze({ label: 'מכון התקנים הישראלי', url: 'https://www.sii.org.il/' }),
  'health-ministry': Object.freeze({ label: 'משרד הבריאות -- יבוא מוצרים', url: 'https://www.gov.il/he/departments/ministry_of_health' }),
  'transport-ministry': Object.freeze({ label: 'משרד התחבורה', url: 'https://www.gov.il/he/departments/ministry_of_transportation' }),
  'agriculture-ministry': Object.freeze({ label: 'משרד החקלאות ופיתוח הכפר', url: 'https://www.gov.il/he/departments/ministry_of_agriculture_and_rural_development' }),
  'environmental-protection-ministry': Object.freeze({ label: 'המשרד להגנת הסביבה', url: 'https://www.gov.il/he/departments/ministry_of_environmental_protection' }),
  'communications-ministry': Object.freeze({ label: 'משרד התקשורת', url: 'https://www.gov.il/he/departments/ministry_of_communications' }),
});

/** Resolve official-source categories to link objects, labeled "נדרש לבדוק" (never "נדרש אישור"). */
export function resolveOfficialSources(categories) {
  const list = Array.isArray(categories) ? categories : [];
  return Object.freeze(
    [...new Set(list)]
      .filter((c) => OFFICIAL_SOURCES[c])
      .map((c) => Object.freeze({ category: c, ...OFFICIAL_SOURCES[c], noteLabel: 'נדרש לבדוק' })),
  );
}

const MAX_PREPARATION_ITEMS = 5;

/**
 * Compose the single, flat compact result. Never accepts more than 5
 * preparation items (excess is a caller bug, not silently truncated --
 * every scenario module is responsible for selecting only relevant
 * items itself).
 *
 * @param {{
 *   scenario: string, routeLabel: string, primaryAction: string,
 *   primaryReason?: string, preparationItems?: string[], urgency?: string|null,
 *   primaryCta?: {id: string, label: string}|null,
 *   secondaryCta?: {id: string, label: string}|null,
 *   professional?: {type: string, reason: string, ctaLabel: string}|null,
 *   secondaryDetails?: { points?: string[], officialSources?: Array, note?: string },
 * }} input
 */
export function buildCompactResult(input) {
  const i = input !== null && typeof input === 'object' ? input : {};
  const preparationItems = Array.isArray(i.preparationItems) ? i.preparationItems.slice(0, MAX_PREPARATION_ITEMS) : [];
  const secondary = i.secondaryDetails !== null && typeof i.secondaryDetails === 'object' ? i.secondaryDetails : {};
  const professional = i.professional !== null && typeof i.professional === 'object' ? i.professional : null;

  return Object.freeze({
    scenario: typeof i.scenario === 'string' ? i.scenario : '',
    routeLabel: typeof i.routeLabel === 'string' ? i.routeLabel : '',
    primaryAction: typeof i.primaryAction === 'string' ? i.primaryAction : '',
    primaryReason: typeof i.primaryReason === 'string' ? i.primaryReason : '',
    preparationItems: Object.freeze(preparationItems),
    urgency: typeof i.urgency === 'string' && i.urgency.length > 0 ? i.urgency : null,
    primaryCta: i.primaryCta && typeof i.primaryCta === 'object' ? Object.freeze({ ...i.primaryCta }) : null,
    secondaryCta: i.secondaryCta && typeof i.secondaryCta === 'object' ? Object.freeze({ ...i.secondaryCta }) : null,
    professional: professional
      ? Object.freeze({
          type: typeof professional.type === 'string' ? professional.type : '',
          reason: typeof professional.reason === 'string' ? professional.reason : '',
          ctaLabel: typeof professional.ctaLabel === 'string' ? professional.ctaLabel : '',
        })
      : null,
    secondaryDetails: Object.freeze({
      points: Object.freeze(Array.isArray(secondary.points) ? secondary.points : []),
      officialSources: Object.freeze(Array.isArray(secondary.officialSources) ? secondary.officialSources : []),
      note: typeof secondary.note === 'string' ? secondary.note : '',
    }),
    visibleDisclaimer: VISIBLE_DISCLAIMER,
    extendedDisclaimer: EXTENDED_DISCLAIMER,
  });
}

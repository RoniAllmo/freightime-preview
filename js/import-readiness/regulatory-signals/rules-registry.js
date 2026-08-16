/**
 * Candidate rule registry for the Product Regulatory Signals pilot.
 *
 * IMPORTANT -- research method and its limit: every candidate below was
 * researched using WebSearch only. WebFetch (needed to open and read
 * the full text of a primary official source -- gov.il, sii.org.il, or
 * any other domain tested, including non-government control domains)
 * returned EGRESS_BLOCKED for every URL attempted in this environment,
 * so no primary source page's exact current text could be directly
 * read and confirmed. WebSearch surfaced plausible real official URLs
 * and secondhand summaries, but a summary is not the same as reading
 * and verifying the source. Per the pilot's verification bar, that
 * means NONE of these candidates may be `approved_for_pilot`. Every
 * entry below is `professional_review_required` and is, by the hard
 * gate in `rule-status.js`, structurally incapable of producing public
 * output. See docs/regulatory-signals-pilot.md for the full writeup.
 *
 * Fields per candidate:
 *  id, publicTitle, internalCategory, status
 *  triggerPredicate(ctx), exclusionPredicate(ctx)  -- pure functions
 *  followUpQuestionIds, primaryExplanation, potentialImplication
 *  verificationItems (<=3), professionalCategory, secondaryProfessionalCategory
 *  professionalReason, confidenceIfMatched, operationalImpactPriority
 *  officialSources[], verifiedDate, reviewDueDate, ruleVersion, reviewedBy
 *  internalNotes (never exposed to users), publicLimitationText
 *
 * Pure data + pure predicate functions. DOM-free, network-free.
 */

import { RULE_STATUS } from './rule-status.js';
import { CONFIDENCE } from './confidence.js';
import { ANSWER } from './questions.js';

function yes(ctx, questionId) {
  return ctx && ctx.answers && ctx.answers[questionId] === ANSWER.YES;
}

export const REGULATORY_SIGNAL_RULES = Object.freeze([
  Object.freeze({
    id: 'RS-ELEC-001',
    publicTitle: 'מוצר חשמלי המחובר לרשת החשמל',
    internalCategory: 'electrical_mains_product',
    status: RULE_STATUS.PROFESSIONAL_REVIEW_REQUIRED,
    triggerPredicate: (ctx) => yes(ctx, 'mainsConnected'),
    exclusionPredicate: () => false,
    followUpQuestionIds: Object.freeze(['mainsConnected']),
    primaryExplanation: 'זוהה מאפיין המצביע על מוצר חשמלי המתחבר לרשת החשמל.',
    potentialImplication: 'מוצרים חשמליים המתחברים לרשת החשמל עשויים להיות כפופים לדרישת תו תקן ובדיקת התאמה לתקן חשמל ישראלי לפני יבוא או שיווק.',
    verificationItems: Object.freeze([
      'מספר התקן הישראלי הרלוונטי ותחולתו המדויקת על סוג המוצר',
      'האם המוצר כבר נבדק ומחזיק תו תקן ממדינת מקור מוכרת',
      'פרט המכס הרלוונטי ותנאי הפטור האפשריים',
    ]),
    professionalCategory: 'TESTING_LABORATORY',
    secondaryProfessionalCategory: 'CUSTOMS_CLASSIFIER',
    professionalReason: 'מכון התקנים או מעבדת בדיקה מוסמכת יכולים לבדוק את התקן ואת מסלול האישור; מסווג מכס נדרש לאימות פרט המכס שעליו נשענת הדרישה.',
    confidenceIfMatched: CONFIDENCE.PARTIAL,
    operationalImpactPriority: 2, // safety/standards requirement
    officialSources: Object.freeze([
      Object.freeze({
        title: 'אביזרי חשמל -- מכון התקנים הישראלי',
        authority: 'מכון התקנים הישראלי (SII)',
        url: 'https://www.sii.org.il/he/electrical-appliances/',
        dateChecked: '2026-08-16',
      }),
    ]),
    verifiedDate: null,
    reviewDueDate: null,
    ruleVersion: '0.1.0-candidate',
    reviewedBy: null,
    internalNotes: 'WebSearch snippets reference "תקן ישראלי 900" as a governing electrical-safety standard and describe a mandatory standards-mark requirement for electrical/electronic products under the Free Import Order. Could not open sii.org.il directly (WebFetch EGRESS_BLOCKED) to confirm SI 900\'s exact current scope, exceptions (e.g. low-voltage/battery-only exclusions), or whether the number itself is current. Do not treat "SI 900" as confirmed -- it is an unverified lead only. Requires a human standards professional to confirm the exact standard number, scope, and exclusions before any activation is considered.',
    publicLimitationText: 'התוצאה היא בדיקה ראשונית ואינה מהווה סיווג מכס או אישור תקן.',
  }),

  Object.freeze({
    id: 'RS-PLASTIC-FOOD-001',
    publicTitle: 'פלסטיק במגע ישיר עם מזון',
    internalCategory: 'plastic_food_contact',
    status: RULE_STATUS.PROFESSIONAL_REVIEW_REQUIRED,
    triggerPredicate: (ctx) => yes(ctx, 'plasticDirectFoodContact'),
    exclusionPredicate: () => false,
    followUpQuestionIds: Object.freeze(['plasticDirectFoodContact']),
    primaryExplanation: 'זוהה מאפיין המצביע על חומר פלסטיק במגע ישיר עם מזון או משקאות.',
    potentialImplication: 'המוצר עשוי להשתייך לתחום המחייב עמידה בתקן פלסטיק למגע עם מזון לפני יבוא או שיווק.',
    verificationItems: Object.freeze([
      'מספר התקן הישראלי הרלוונטי ותחולתו המדויקת על סוג הפולימר והשימוש',
      'קיום דוחות מעבדה או הצהרת התאמה ממקור מוכר',
      'פרט המכס הרלוונטי',
    ]),
    professionalCategory: 'TESTING_LABORATORY',
    secondaryProfessionalCategory: 'CUSTOMS_CLASSIFIER',
    professionalReason: 'מכון התקנים או מעבדת בדיקה מוסמכת יכולים לבדוק את התקן ואת מסלול האישור; מסווג מכס נדרש לאימות פרט המכס שעליו נשענת הדרישה.',
    confidenceIfMatched: CONFIDENCE.PARTIAL,
    operationalImpactPriority: 3, // pre-import approval / clearance risk
    officialSources: Object.freeze([
      Object.freeze({
        title: 'חומרי פלסטיק ומוצרי פלסטיק הבאים במגע עם מזון ומשקאות -- מכון התקנים הישראלי',
        authority: 'מכון התקנים הישראלי (SII)',
        url: 'https://www.sii.org.il/he/food-testing',
        dateChecked: '2026-08-16',
      }),
    ]),
    verifiedDate: null,
    reviewDueDate: null,
    ruleVersion: '0.1.0-candidate',
    reviewedBy: null,
    internalNotes: 'WebSearch snippets and a chamber.org.il draft-standard PDF title point to "תקן ישראלי 5113" as covering plastic materials/articles in food contact, prepared by technical committee 701, largely referencing EU/FDA rules. Could not open sii.org.il or the chamber.org.il PDF directly (WebFetch EGRESS_BLOCKED) to confirm SI 5113 is the correct, current, in-force number, its exact scope, or its exclusions. Do not treat "SI 5113" as confirmed. Requires a human standards professional to verify before any activation is considered.',
    publicLimitationText: 'התוצאה היא בדיקה ראשונית ואינה מהווה סיווג מכס או אישור תקן.',
  }),

  Object.freeze({
    id: 'RS-POLYMER-COATING-001',
    publicTitle: 'ציפוי פולימרי במגע ישיר עם מזון',
    internalCategory: 'polymer_coating_food_contact',
    status: RULE_STATUS.PROFESSIONAL_REVIEW_REQUIRED,
    triggerPredicate: (ctx) => yes(ctx, 'polymerCoatingDirectFoodContact'),
    exclusionPredicate: () => false,
    followUpQuestionIds: Object.freeze(['polymerCoatingDirectFoodContact']),
    primaryExplanation: 'זוהה מאפיין המצביע על ציפוי פולימרי במגע ישיר עם מזון.',
    potentialImplication: 'המוצר עשוי להשתייך לתחום המחייב בדיקת התאמה של הציפוי לדרישות מגע עם מזון לפני יבוא או שיווק.',
    verificationItems: Object.freeze([
      'האם קיים תקן ישראלי ספציפי לציפוי הפולימרי הנדון, או שהבדיקה נעשית מכוח תקן הפלסטיק הכללי',
      'קיום דוחות מעבדה או הצהרת התאמה ממקור מוכר',
      'פרט המכס הרלוונטי',
    ]),
    professionalCategory: 'TESTING_LABORATORY',
    secondaryProfessionalCategory: 'CUSTOMS_CLASSIFIER',
    professionalReason: 'מכון התקנים או מעבדת בדיקה מוסמכת יכולים לבדוק את התקן ואת מסלול האישור; מסווג מכס נדרש לאימות פרט המכס שעליו נשענת הדרישה.',
    confidenceIfMatched: CONFIDENCE.MORE_INFO_NEEDED,
    operationalImpactPriority: 3,
    officialSources: Object.freeze([
      Object.freeze({
        title: 'חומרים הבאים במגע עם מזון -- מכון התקנים הישראלי',
        authority: 'מכון התקנים הישראלי (SII)',
        url: 'https://www.sii.org.il/he/food-testing',
        dateChecked: '2026-08-16',
      }),
    ]),
    verifiedDate: null,
    reviewDueDate: null,
    ruleVersion: '0.1.0-candidate',
    reviewedBy: null,
    internalNotes: 'No distinct Israeli standard number could be located for "polymer coating in food contact" as a category separate from general plastic food-contact materials -- WebSearch only surfaced the general SII food-contact-materials landing page, not a coating-specific standard or scope statement. This candidate has the weakest evidence of the five and would need a standards professional to determine even which standard (if any) governs it, not only whether it is current. Do not activate.',
    publicLimitationText: 'התוצאה היא בדיקה ראשונית ואינה מהווה סיווג מכס או אישור תקן.',
  }),

  Object.freeze({
    id: 'RS-GLASS-FOOD-001',
    publicTitle: 'כלי זכוכית למגע עם מזון או משקאות',
    internalCategory: 'glass_food_contact',
    status: RULE_STATUS.PROFESSIONAL_REVIEW_REQUIRED,
    triggerPredicate: (ctx) => yes(ctx, 'glassDirectFoodOrDrinkContact'),
    exclusionPredicate: () => false,
    followUpQuestionIds: Object.freeze(['glassDirectFoodOrDrinkContact']),
    primaryExplanation: 'זוהה מאפיין המצביע על כלי זכוכית למגע ישיר עם מזון או משקאות.',
    potentialImplication: 'המוצר עשוי להשתייך לתחום המחייב בדיקת שחרור עופרת וקדמיום מכלי זכוכית וקרמיקה למגע עם מזון, לפני יבוא או שיווק.',
    verificationItems: Object.freeze([
      'מספר התקן הישראלי הרלוונטי ותחולתו המדויקת (סוג הכלי והשימוש)',
      'קיום דוחות מעבדה או הצהרת התאמה ממקור מוכר',
      'פרט המכס הרלוונטי',
    ]),
    professionalCategory: 'TESTING_LABORATORY',
    secondaryProfessionalCategory: 'CUSTOMS_CLASSIFIER',
    professionalReason: 'מכון התקנים או מעבדת בדיקה מוסמכת יכולים לבדוק את התקן ואת מסלול האישור; מסווג מכס נדרש לאימות פרט המכס שעליו נשענת הדרישה.',
    confidenceIfMatched: CONFIDENCE.PARTIAL,
    operationalImpactPriority: 2,
    officialSources: Object.freeze([
      Object.freeze({
        title: 'שחרור עופרת וקדמיום מכלים הבאים במגע עם מזון -- מכון התקנים הישראלי',
        authority: 'מכון התקנים הישראלי (SII)',
        url: 'https://www.sii.org.il/he/food-testing',
        dateChecked: '2026-08-16',
      }),
    ]),
    verifiedDate: null,
    reviewDueDate: null,
    ruleVersion: '0.1.0-candidate',
    reviewedBy: null,
    internalNotes: 'WebSearch snippets describe a standard covering lead/cadmium release limits from ceramic, ceramic-glass, and glass vessels intended for food/drink contact (preparation, cooking, serving, storage), excluding manufacturing vessels and sale-packaging vessels, with one snippet naming "תקן 1003." Could not open sii.org.il directly (WebFetch EGRESS_BLOCKED) to confirm the number, exact scope text, or exclusion wording. Do not treat "SI 1003" as confirmed. Requires a human standards professional to verify before any activation is considered.',
    publicLimitationText: 'התוצאה היא בדיקה ראשונית ואינה מהווה סיווג מכס או אישור תקן.',
  }),

  Object.freeze({
    id: 'RS-VEHICLE-001',
    publicTitle: 'מוצר להתקנה או לשימוש רגולטורי ברכב',
    internalCategory: 'vehicle_product',
    status: RULE_STATUS.PROFESSIONAL_REVIEW_REQUIRED,
    triggerPredicate: (ctx) => yes(ctx, 'vehicleInstallationOrUse'),
    exclusionPredicate: () => false,
    followUpQuestionIds: Object.freeze(['vehicleInstallationOrUse']),
    primaryExplanation: 'זוהה מאפיין המצביע על מוצר המיועד להתקנה או לשימוש רגולטורי ברכב מנועי.',
    potentialImplication: 'מוצרי תעבורה המיועדים להתקנה ברכב עשויים לחייב בדיקה במעבדת רכב מוסמכת ורישיון יבוא ממשרד התחבורה לפני יבוא.',
    verificationItems: Object.freeze([
      'האם המוצר מוגדר כ"מוצר תעבורה" לפי צו יבוא חופשי, ולפי איזה סעיף',
      'האם נדרש רישיון יבוא ממשרד התחבורה עבור סוג המוצר הספציפי',
      'פרט המכס הרלוונטי',
    ]),
    professionalCategory: 'VEHICLE_TESTING_LAB',
    secondaryProfessionalCategory: 'TRANSPORT_MINISTRY_LICENSING',
    professionalReason: 'מעבדת רכב מוסמכת בודקת את התאמת המוצר לדרישות משרד התחבורה; משרד התחבורה או גורם הרישוי נדרש לאישור רישיון היבוא הסופי.',
    confidenceIfMatched: CONFIDENCE.MORE_INFO_NEEDED,
    operationalImpactPriority: 1, // possible prohibition / missing-approval risk
    officialSources: Object.freeze([
      Object.freeze({
        title: 'מוצרי תעבורה -- צו יבוא חופשי (מסמך לשכת המסחר)',
        authority: 'לשכת המסחר (מארח מסמך רשמי; לא הגורם המוסמך עצמו)',
        url: 'https://www.chamber.org.il/media/154103/%D7%9E%D7%95%D7%A6%D7%A8%D7%99-%D7%AA%D7%A2%D7%91%D7%95%D7%A8%D7%94-%D7%A6%D7%95-%D7%99%D7%91%D7%95%D7%90-%D7%97%D7%95%D7%A4%D7%A9%D7%99-%D7%9E%D7%A2%D7%95%D7%93%D7%9B%D7%9F-%D7%9C%D7%9C%D7%90-%D7%94%D7%A2%D7%A8%D7%95%D7%AA-22-12-15-24559415.doc',
        dateChecked: '2026-08-16',
      }),
    ]),
    verifiedDate: null,
    reviewDueDate: null,
    ruleVersion: '0.1.0-candidate',
    reviewedBy: null,
    internalNotes: 'WebSearch snippets describe "מוצרי תעבורה" (transport products) as a Free Import Order category requiring a certified vehicle laboratory check and a Ministry of Transport import license, but no primary gov.il or Ministry of Transport page could be opened (WebFetch EGRESS_BLOCKED) to confirm exact scope, which product types are covered, or current exclusions. The only source found hosting the actual order text is a third-party chamber-of-commerce mirror, not the ministry itself, and is dated 2015 in its filename -- currency cannot be confirmed. Weakest-sourced of the five candidates alongside the polymer-coating one. Do not activate.',
    publicLimitationText: 'התוצאה היא בדיקה ראשונית ואינה מהווה סיווג מכס או אישור רישוי.',
  }),
]);

export function findRuleById(id) {
  return REGULATORY_SIGNAL_RULES.find((r) => r.id === id) ?? null;
}

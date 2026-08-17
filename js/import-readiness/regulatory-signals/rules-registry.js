/**
 * Canonical rule registry for the Product Regulatory Signals pilot --
 * single source of truth, one activation decision per rule.
 *
 * Product-owner-directed redesign: FreighTime's product owner is a
 * qualified customs professional and is the professional author and
 * reviewer of these five pilot rules. External official sources are
 * valuable *optional* supporting evidence but are never a mandatory
 * technical precondition for a rule to be authored, reviewed, or
 * approved for controlled-pilot use (see `rule-status.js`).
 *
 * MECHANICAL STRUCTURE ONLY -- READ BEFORE EDITING
 * Every rule below has its trigger conditions, exclusion conditions,
 * follow-up question wiring, professional-category routing, and
 * priority fully implemented per the product owner's exact
 * specification -- this is operational configuration, not a
 * regulatory claim.
 *
 * The PUBLIC-FACING CONTENT FIELDS -- `publicTitle`, `primaryExplanation`
 * (identification sentence), `potentialImplication` (implication
 * sentence), `verificationItems`, and `professionalReason` -- were
 * entered verbatim by the product owner (a qualified customs
 * professional) on 2026-08-17 and all 5 rules were then deliberately
 * moved to `RULE_STATUS.EXPERT_APPROVED_FOR_PILOT`. None carries an
 * `officialSources` entry and none is `OFFICIAL_SOURCE_SUPPORTED` --
 * official sources remain optional supporting evidence, never attached
 * here. The hard gate in `rule-status.js` (`isPubliclyEligible()`) is
 * what actually governs public output; it independently requires every
 * content field to be non-empty regardless of `status`. See
 * docs/regulatory-signals-pilot.md and
 * docs/product-owner-rule-authoring-guide.md for the fill-in and
 * approval lifecycle these 5 rules just went through.
 *
 * Fields per rule:
 *  id, publicTitle, internalCategory, status
 *  triggerPredicate(ctx), exclusionPredicate(ctx)  -- pure functions
 *  followUpQuestionIds, primaryExplanation, potentialImplication
 *  verificationItems (<=3), professionalCategory, secondaryProfessionalCategory
 *  professionalReason, confidenceIfMatched, operationalImpactPriority
 *  officialSources[] (optional -- only required for OFFICIAL_SOURCE_SUPPORTED)
 *  verifiedDate, reviewDueDate, ruleVersion, authoredByRole
 *  internalNotes (never exposed to users), publicLimitationText
 *
 * Pure data + pure predicate functions. DOM-free, network-free.
 */

import { RULE_STATUS } from './rule-status.js';
import { CONFIDENCE } from './confidence.js';
import { ANSWER } from './questions.js';
import { SHORT_LIMITATION_TEXT } from './matcher.js';

/** Internal-only marker of who authored a rule's professional content.
 * Represented by role, never a personal name -- never shown publicly. */
export const AUTHORED_BY_PRODUCT_OWNER = 'qualified-customs-professional-product-owner';

function answer(ctx, questionId) {
  return ctx && ctx.answers ? ctx.answers[questionId] : undefined;
}
function isYes(ctx, questionId) {
  return answer(ctx, questionId) === ANSWER.YES;
}

export const REGULATORY_SIGNAL_RULES = Object.freeze([
  // -------------------------------------------------------------
  // Rule 1: Mains-connected electrical product
  // -------------------------------------------------------------
  Object.freeze({
    id: 'mains-connected-electrical-product',
    publicTitle: 'נדרש לבדוק דרישות תקינה למוצר חשמלי',
    internalCategory: 'electrical_mains_product',
    status: RULE_STATUS.EXPERT_APPROVED_FOR_PILOT,
    // Activate only when direct mains connection, a supplied plug, or a
    // supplied mains power supply is explicitly confirmed via the
    // single confirmation question. A "no" or "unknown" answer never
    // activates the signal -- per the product owner's rule definition,
    // cable-without-adapter, internal-wiring-only, battery-only,
    // USB-only-without-mains-adapter, and non-complete-component cases
    // are exactly the situations where this question is answered "לא",
    // so no separate exclusion sub-question is needed.
    triggerPredicate: (ctx) => isYes(ctx, 'mainsConnectedOrSuppliedAdapter'),
    exclusionPredicate: () => false,
    followUpQuestionIds: Object.freeze(['mainsConnectedOrSuppliedAdapter']),
    primaryExplanation: 'לפי המידע שנמסר, המוצר מתחבר לרשת החשמל או מגיע עם תקע או ספק כוח.',
    potentialImplication: 'מאפיין זה עשוי לחייב בדיקת תקינה לפני היבוא.',
    verificationItems: Object.freeze(['מתח והספק', 'סוג התקע או ספק הכוח', 'מסלול התקינה המתאים']),
    professionalCategory: 'TESTING_LABORATORY',
    secondaryProfessionalCategory: 'CUSTOMS_CLASSIFIER',
    professionalReason: 'לאימות פרט המכס והדרישות החלות על המוצר לפני ההזמנה או השילוח.',
    confidenceIfMatched: CONFIDENCE.HIGH,
    operationalImpactPriority: 2,
    officialSources: Object.freeze([]),
    verifiedDate: '2026-08-17',
    reviewDueDate: '2027-02-17',
    ruleVersion: '1.0.0-expert-approved-for-pilot',
    authoredByRole: AUTHORED_BY_PRODUCT_OWNER,
    reviewedBy: AUTHORED_BY_PRODUCT_OWNER,
    internalNotes:
      'Candidate terms: מכשיר חשמלי, מוצר חשמלי, תקע, ספק כוח, שנאי, מתחבר לחשמל, חיבור לרשת החשמל. '
      + 'Prior WebSearch-only research pass (see git history) surfaced an unverified lead referencing "תקן ישראלי 900" '
      + 'as a possible governing electrical-safety standard -- never confirmed against a primary source (WebFetch was '
      + 'egress-blocked in that session) and must not be treated as fact; not used as a public source. Public content '
      + 'supplied verbatim by the product owner and approved for controlled pilot on 2026-08-17; no official source attached.',
    publicLimitationText: SHORT_LIMITATION_TEXT,
  }),

  // -------------------------------------------------------------
  // Rule 2: Plastic in direct food contact
  // -------------------------------------------------------------
  Object.freeze({
    id: 'plastic-direct-food-contact',
    publicTitle: 'נדרש לבדוק דרישות תקינה למוצר הבא במגע עם מזון',
    internalCategory: 'plastic_food_contact',
    status: RULE_STATUS.EXPERT_APPROVED_FOR_PILOT,
    // Activate when direct food/drink contact is confirmed AND the
    // direct-contact material is confirmed as plastic. A "no" on either
    // question, or a confirmed non-plastic contact material, never
    // activates the signal.
    triggerPredicate: (ctx) =>
      isYes(ctx, 'directFoodOrDrinkContact') && answer(ctx, 'directContactMaterial') === 'plastic',
    exclusionPredicate: () => false,
    followUpQuestionIds: Object.freeze(['directFoodOrDrinkContact', 'directContactMaterial']),
    primaryExplanation: 'לפי המידע שנמסר, משטח פלסטיק במוצר מיועד למגע ישיר עם מזון או שתייה.',
    potentialImplication: 'מאפיין זה עשוי לחייב בדיקת תקינה לפני היבוא.',
    verificationItems: Object.freeze(['סוג החומר', 'תנאי השימוש', 'מסלול התקינה המתאים']),
    professionalCategory: 'TESTING_LABORATORY',
    secondaryProfessionalCategory: 'CUSTOMS_CLASSIFIER',
    professionalReason: 'לאימות משטח המגע, פרט המכס ומסלול הבדיקה החל.',
    confidenceIfMatched: CONFIDENCE.HIGH,
    operationalImpactPriority: 3,
    officialSources: Object.freeze([]),
    verifiedDate: '2026-08-17',
    reviewDueDate: '2027-02-17',
    ruleVersion: '1.0.0-expert-approved-for-pilot',
    authoredByRole: AUTHORED_BY_PRODUCT_OWNER,
    reviewedBy: AUTHORED_BY_PRODUCT_OWNER,
    internalNotes:
      'Candidate terms: כלי פלסטיק למזון, קופסת פלסטיק למזון, כוס פלסטיק, צלחת פלסטיק, סכו"ם פלסטיק, כלי אוכל '
      + 'מפלסטיק, מוצר פלסטיק במגע עם מזון. Prior WebSearch-only research pass referenced an unverified "תקן ישראלי '
      + '5113" lead -- never confirmed against a primary source, must not be treated as fact; not used as a public '
      + 'source. Public content supplied verbatim by the product owner and approved for controlled pilot on '
      + '2026-08-17; no official source attached.',
    publicLimitationText: SHORT_LIMITATION_TEXT,
  }),

  // -------------------------------------------------------------
  // Rule 3: Polymer coating in direct food contact
  // -------------------------------------------------------------
  Object.freeze({
    id: 'polymer-coated-direct-food-contact',
    publicTitle: 'הציפוי עשוי להשפיע על דרישות היבוא',
    internalCategory: 'polymer_coating_food_contact',
    status: RULE_STATUS.EXPERT_APPROVED_FOR_PILOT,
    // Activate when an internal coating is confirmed, that coating is
    // confirmed in direct food/drink contact, and the coating material
    // is not confirmed as something other than plastic/polymer (i.e.
    // "plastic_or_polymer" or "unknown" both keep the signal open --
    // an unknown coating material lowers confidence rather than
    // blocking the signal; only a confirmed non-polymeric answer
    // excludes it).
    triggerPredicate: (ctx) =>
      isYes(ctx, 'hasInternalCoating')
      && isYes(ctx, 'coatingDirectFoodOrDrinkContact')
      && answer(ctx, 'coatingMaterial') !== 'other_material',
    exclusionPredicate: () => false,
    followUpQuestionIds: Object.freeze(['hasInternalCoating', 'coatingDirectFoodOrDrinkContact', 'coatingMaterial']),
    primaryExplanation: 'לפי המידע שנמסר, שכבת פולימר או פלסטיק באה במגע ישיר עם מזון או שתייה.',
    potentialImplication: 'לכן ייתכן שהמוצר דורש בדיקת תקינה גם כאשר גוף המוצר עשוי מחומר אחר.',
    verificationItems: Object.freeze(['חומר הציפוי', 'תנאי השימוש', 'הדרישות החלות על משטח המגע']),
    professionalCategory: 'TESTING_LABORATORY',
    secondaryProfessionalCategory: 'CUSTOMS_CLASSIFIER',
    professionalReason: 'לאימות מאפייני משטח המגע והדרישות החלות על המוצר השלם.',
    confidenceIfMatched: CONFIDENCE.PARTIAL,
    operationalImpactPriority: 3,
    officialSources: Object.freeze([]),
    verifiedDate: '2026-08-17',
    reviewDueDate: '2027-02-17',
    ruleVersion: '1.0.0-expert-approved-for-pilot',
    authoredByRole: AUTHORED_BY_PRODUCT_OWNER,
    reviewedBy: AUTHORED_BY_PRODUCT_OWNER,
    internalNotes:
      'Candidate terms: ציפוי פלסטיק, ציפוי פולימרי, כוס נייר מצופה, קרטון מצופה, שכבת פלסטיק פנימית, ציפוי פנימי '
      + 'במגע עם מזון. No distinct Israeli standard number was located for this category separately from general '
      + 'plastic food-contact materials in the prior WebSearch-only research pass; not used as a public source. '
      + 'Public content supplied verbatim by the product owner and approved for controlled pilot on 2026-08-17; '
      + 'no official source attached.',
    publicLimitationText: SHORT_LIMITATION_TEXT,
  }),

  // -------------------------------------------------------------
  // Rule 4: Glass vessel in direct food or drink contact
  // -------------------------------------------------------------
  Object.freeze({
    id: 'glass-food-contact-vessel',
    publicTitle: 'נדרש לבדוק דרישות תקינה לכלי זכוכית',
    internalCategory: 'glass_food_contact',
    status: RULE_STATUS.EXPERT_APPROVED_FOR_PILOT,
    // Activate only when direct food/drink contact for the glass
    // vessel is explicitly confirmed. A "no" or "unknown" answer never
    // activates the signal -- per the product owner's rule definition,
    // decorative glass, laboratory/industrial glassware, building/
    // safety/vehicle glass, and raw glass material are exactly the
    // cases where this question is answered "לא" or is not applicable,
    // so no separate exclusion sub-question is needed.
    triggerPredicate: (ctx) => isYes(ctx, 'glassVesselDirectFoodOrDrinkContact'),
    exclusionPredicate: () => false,
    followUpQuestionIds: Object.freeze(['glassVesselDirectFoodOrDrinkContact']),
    primaryExplanation: 'לפי המידע שנמסר, מדובר בכלי זכוכית המיועד למגע ישיר עם מזון או שתייה.',
    potentialImplication: 'מוצרים מסוג זה עשויים להיות כפופים לדרישות תקינה ביבוא.',
    verificationItems: Object.freeze(['סוג הכלי והשימוש', 'פרט המכס', 'מסלול התקינה המתאים']),
    professionalCategory: 'CUSTOMS_CLASSIFIER',
    secondaryProfessionalCategory: 'TESTING_LABORATORY',
    professionalReason: 'לאימות פרט המכס ומסלול התקינה החל לפני היבוא.',
    confidenceIfMatched: CONFIDENCE.HIGH,
    operationalImpactPriority: 2,
    officialSources: Object.freeze([]),
    verifiedDate: '2026-08-17',
    reviewDueDate: '2027-02-17',
    ruleVersion: '1.0.0-expert-approved-for-pilot',
    authoredByRole: AUTHORED_BY_PRODUCT_OWNER,
    reviewedBy: AUTHORED_BY_PRODUCT_OWNER,
    internalNotes:
      'Candidate terms: כוס זכוכית, כוסות זכוכית, כלי זכוכית לשתייה, כלי זכוכית למזון, קערת זכוכית, צלחת זכוכית, '
      + 'כלי הגשה מזכוכית. Prior WebSearch-only research pass referenced an unverified "תקן 1003" lead (lead/cadmium '
      + 'release from glass/ceramic food-contact vessels) -- never confirmed against a primary source, must not be '
      + 'treated as fact; not used as a public source. Public content supplied verbatim by the product owner and '
      + 'approved for controlled pilot on 2026-08-17; no official source attached.',
    publicLimitationText: SHORT_LIMITATION_TEXT,
  }),

  // -------------------------------------------------------------
  // Rule 5: Product intended for installation in a motor vehicle
  // -------------------------------------------------------------
  Object.freeze({
    id: 'vehicle-installed-product',
    publicTitle: 'נדרש לבדוק דרישות תחבורה למוצר המיועד לרכב',
    internalCategory: 'vehicle_product',
    status: RULE_STATUS.EXPERT_APPROVED_FOR_PILOT,
    // Activate only when installation as part of a motor vehicle is
    // explicitly confirmed. A functional-category answer refines the
    // result but is not required to activate -- "אחר" or "לא ידוע" on
    // that question must not block the signal, only leave the function
    // unresolved. A "no" or "unknown" on the installation question
    // never activates the signal -- per the product owner's rule
    // definition, items merely carried inside a vehicle, universal
    // tools, phone holders, organizers, decorative loose items, and
    // "for car"-marketed-but-not-installed products are exactly the
    // cases where that question is answered "לא", so no separate
    // exclusion sub-question is needed.
    triggerPredicate: (ctx) => isYes(ctx, 'installedAsPartOfVehicle'),
    exclusionPredicate: () => false,
    followUpQuestionIds: Object.freeze(['installedAsPartOfVehicle', 'vehicleFunctionCategory']),
    primaryExplanation: 'לפי המידע שנמסר, המוצר מיועד להתקנה כחלק מרכב מנועי.',
    potentialImplication: 'מאפיין זה עשוי לחייב בדיקה מול משרד התחבורה, מעבדת רכב או גורם רישוי מתאים.',
    verificationItems: Object.freeze(['תפקיד המוצר ברכב', 'התאמתו לסוג הרכב', 'מסלול האישור הנדרש']),
    professionalCategory: 'VEHICLE_TESTING_LAB',
    secondaryProfessionalCategory: 'CUSTOMS_CLASSIFIER',
    professionalReason: 'לאימות דרישות התחבורה, תפקיד המוצר ופרט המכס.',
    confidenceIfMatched: CONFIDENCE.PARTIAL,
    operationalImpactPriority: 1,
    officialSources: Object.freeze([]),
    verifiedDate: '2026-08-17',
    reviewDueDate: '2027-02-17',
    ruleVersion: '1.0.0-expert-approved-for-pilot',
    authoredByRole: AUTHORED_BY_PRODUCT_OWNER,
    reviewedBy: AUTHORED_BY_PRODUCT_OWNER,
    internalNotes:
      'Candidate terms: פנס לרכב, פנס קדמי לרכב, פנס אחורי לרכב, חלק לרכב, רכיב לרכב, מערכת לרכב, מוצר להתקנה ברכב. '
      + 'Prior WebSearch-only research pass referenced "מוצרי תעבורה" as a Free Import Order category requiring a '
      + 'certified vehicle-laboratory check and a Ministry of Transport import license, sourced only from a '
      + 'third-party chamber-of-commerce mirror (not the ministry itself) -- currency and exact scope never '
      + 'confirmed against a primary source; not used as a public source. Public content supplied verbatim by the '
      + 'product owner and approved for controlled pilot on 2026-08-17; no official source attached.',
    publicLimitationText: SHORT_LIMITATION_TEXT,
  }),
]);

export function findRuleById(id) {
  return REGULATORY_SIGNAL_RULES.find((r) => r.id === id) ?? null;
}

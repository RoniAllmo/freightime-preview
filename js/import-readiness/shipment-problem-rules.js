/**
 * Shipment-already-in-progress / problem scenario result builder. One
 * immediate action, urgency-first, a short data-to-gather list, one
 * escalation CTA plus a secondary "prepare the timeline" CTA when
 * urgent. Careful, non-committal wording -- never admits fault, never
 * assigns liability, never requests a file upload.
 *
 * Pure, deterministic, DOM-free, network-free, storage-free.
 */

import { buildCompactResult, PROFESSIONAL_REFERRAL } from './build-action-map.js';
import { buildCargoDamageResult, buildCargoShortageOrLossResult } from './cargo-damage-rules.js';
import { buildCustomsDisputeResult } from './customs-dispute-rules.js';
import { buildInsuranceResult } from './insurance-rules.js';
import { buildCarrierDisputeResult } from './carrier-dispute-rules.js';
import { PROFESSIONAL_CATEGORY, professionalReferral } from './professional-category-registry.js';

const URGENT = 'דחוף';
const ATTENTION = 'דורש תשומת לב';

/**
 * New issue-family problem types (professional referral coverage
 * expansion) each dispatch to a dedicated family rule module rather
 * than the flat `PROBLEM_CONFIG` below, which is kept exactly as it
 * was for every pre-existing problem type to avoid altering their
 * already-tested wording, urgency, and CTA behavior.
 */
const FAMILY_DISPATCH = Object.freeze({
  cargo_or_container_damage: buildCargoDamageResult,
  cargo_shortage_or_loss: buildCargoShortageOrLossResult,
  customs_penalty_or_deficit_demand: buildCustomsDisputeResult,
  insurance_issue: buildInsuranceResult,
  carrier_or_forwarder_dispute: buildCarrierDisputeResult,
});

/**
 * Storage/demurrage/detention: when the caller also indicates customs
 * clearance is involved in the delay, add the licensed customs broker
 * as a supporting professional -- purely additive, never changes the
 * primary professional, urgency, or wording of the existing config-
 * driven result below.
 */
function storageDemurrageSupportingProfessional(problemType, customsClearanceInvolved) {
  const relevant = ['storage', 'demurrage', 'detention', 'clearance_delay'].includes(problemType);
  if (!relevant || customsClearanceInvolved !== true) return null;
  return professionalReferral(
    PROFESSIONAL_CATEGORY.LICENSED_CUSTOMS_BROKER,
    'שחרור המכולה או הציוד תלוי גם בהשלמת תהליך המכס.',
  );
}

const PROBLEM_CONFIG = Object.freeze({
  missing_document: {
    label: 'מסמך חסר',
    urgency: ATTENTION,
    dataToGather: ['רשימת המסמכים שהתבקשו', 'מסמכים קיימים שכבר נשלחו'],
    partyToCheckWith: 'עמיל המכס או הגורם שדרש את המסמך',
    cta: { id: 'missing-docs-help', label: 'טיפול במסמכים חסרים' },
    professional: PROFESSIONAL_REFERRAL.SUPPLIER_DOCUMENTS,
  },
  missing_import_permit: {
    label: 'אישור יבוא חסר',
    urgency: URGENT,
    dataToGather: ['סוג האישור הנדרש', 'הרשות המנפיקה', 'סטטוס בקשה קיימת, אם הוגשה'],
    partyToCheckWith: 'הרשות המוסמכת הרלוונטית',
    cta: { id: 'urgent-case-review', label: 'בדיקת המקרה בדחיפות' },
  },
  customs_inspection: {
    label: 'בדיקת מכס או בדיקה פיזית',
    urgency: ATTENTION,
    dataToGather: ['סיבת הבדיקה, אם נמסרה', 'מיקום המטען הנוכחי'],
    partyToCheckWith: 'עמיל המכס',
    cta: { id: 'clearance-support', label: 'תמיכה בשחרור' },
  },
  classification_dispute: {
    label: 'סיווג במחלוקת',
    urgency: ATTENTION,
    dataToGather: ['הסיווג שהוצע', 'הסיווג שנקבע על ידי הרשות', 'נימוק שנמסר, אם קיים'],
    partyToCheckWith: 'עמיל המכס ומסווג מכס מקצועי',
    cta: { id: 'clearance-support', label: 'תמיכה בשחרור' },
  },
  value_dispute: {
    label: 'ערך במחלוקת',
    urgency: ATTENTION,
    dataToGather: ['חשבון מסחרי מקורי', 'אסמכתאות תשלום'],
    partyToCheckWith: 'עמיל המכס',
    cta: { id: 'clearance-support', label: 'תמיכה בשחרור' },
  },
  clearance_delay: {
    label: 'עיכוב בשחרור',
    urgency: ATTENTION,
    dataToGather: ['תאריך הגעת המשלוח', 'שלב נוכחי בתהליך'],
    partyToCheckWith: 'עמיל המכס או הגורם המטפל בשחרור',
    cta: { id: 'clearance-support', label: 'תמיכה בשחרור' },
  },
  storage: {
    label: 'אחסנה',
    urgency: URGENT,
    dataToGather: ['תאריך תחילת חיוב האחסנה', 'תעריף האחסנה היומי'],
    partyToCheckWith: 'המסוף או המחסן הרלוונטי',
    cta: { id: 'urgent-case-review', label: 'בדיקת המקרה בדחיפות' },
  },
  demurrage: {
    label: 'Demurrage',
    urgency: URGENT,
    dataToGather: ['תאריך תחילת החיוב', 'תעריף החיוב'],
    partyToCheckWith: 'חברת הספנות',
    cta: { id: 'urgent-case-review', label: 'בדיקת המקרה בדחיפות' },
  },
  detention: {
    label: 'Detention',
    urgency: URGENT,
    dataToGather: ['תאריך תחילת החיוב', 'תעריף החיוב', 'תאריך יעד להחזרת הציוד'],
    partyToCheckWith: 'חברת הספנות',
    cta: { id: 'urgent-case-review', label: 'בדיקת המקרה בדחיפות' },
  },
  penalty_or_additional_charge: {
    label: 'קנס או חיוב נוסף',
    urgency: ATTENTION,
    dataToGather: ['מסמך החיוב', 'בסיס החיוב שצוין'],
    partyToCheckWith: 'הגורם שהוציא את החיוב',
    cta: { id: 'charge-check', label: 'בדיקת חיוב' },
  },
  supplier_not_responding: {
    label: 'ספק אינו מגיב',
    urgency: ATTENTION,
    dataToGather: ['תיעוד פניות קודמות לספק', 'תאריך הפנייה האחרונה'],
    partyToCheckWith: 'הספק, ובמקביל המשלח או עמיל המכס',
    cta: { id: 'professional-escalation', label: 'הסלמה מקצועית' },
  },
  carrier_not_responding: {
    label: 'חברת שילוח או מוביל אינו מגיב',
    urgency: ATTENTION,
    dataToGather: ['תיעוד פניות קודמות', 'מספר מעקב/הזמנה'],
    partyToCheckWith: 'חברת השילוח או המוביל',
    cta: { id: 'professional-escalation', label: 'הסלמה מקצועית' },
  },
  other: {
    label: 'בעיה אחרת',
    urgency: ATTENTION,
    dataToGather: ['תיאור מפורט של הבעיה'],
    partyToCheckWith: 'עמיל המכס או הגורם הרלוונטי',
    cta: { id: 'professional-escalation', label: 'הסלמה מקצועית' },
  },
});

export function buildShipmentProblemResult(input) {
  const i = input !== null && typeof input === 'object' ? input : {};

  const familyBuilder = FAMILY_DISPATCH[i.problemType];
  if (familyBuilder) return familyBuilder(i);

  const config = PROBLEM_CONFIG[i.problemType] ?? PROBLEM_CONFIG.other;

  const dataToGather = [...config.dataToGather];
  if (i.missingDocumentsNote) dataToGather.push(`מסמכים חסרים שצוינו: ${i.missingDocumentsNote}`);

  // Accumulating costs always escalate urgency, regardless of the
  // problem type's default -- a cost that keeps growing is urgent no
  // matter which category triggered it.
  const isUrgent = config.urgency === URGENT || i.accumulatingCosts === true;
  const urgency = isUrgent ? URGENT : config.urgency;
  const accumulatingWarning = i.accumulatingCosts
    ? ' העלויות עשויות להמשיך להצטבר.'
    : '';

  const primaryAction = isUrgent
    ? `יש לאסוף מיד את הודעת החיוב, מסמכי המשלוח וציר הזמן, ולבדוק את בסיס החיוב מול ${config.partyToCheckWith} בהקדם.${accumulatingWarning}`
    : `בהתאם למידע הקיים בשלב זה, יש לאסוף את המסמכים הרלוונטיים ולבדוק את הנושא מול ${config.partyToCheckWith} לפני מתן מענה סופי.`;

  // Urgent cases always route to the same concrete operational referral
  // (customs broker / operational contact handling release), regardless
  // of which problem type triggered urgency -- an urgent case needs
  // someone able to act immediately, not a topic-specific specialist.
  // Non-urgent cases keep their configured referral (the party the
  // primary action already names), never a vague fallback.
  const professional = isUrgent
    ? PROFESSIONAL_REFERRAL.URGENT_OPERATIONAL
    : (config.professional ?? Object.freeze({
        type: config.partyToCheckWith,
        reason: `לבדוק את הנושא (${config.label}) מול ${config.partyToCheckWith} לפני מתן מענה סופי.`,
        ctaLabel: `לתיאום ${config.cta.label}`,
      }));

  // Additive only: a licensed-customs-broker supporting referral for
  // storage/demurrage/detention/clearance_delay when the caller
  // indicates customs clearance is involved -- never changes the
  // primary professional, urgency, or wording above.
  const supportingProfessional = storageDemurrageSupportingProfessional(i.problemType, i.customsClearanceInvolved);

  return buildCompactResult({
    scenario: 'shipment_problem',
    routeLabel: `בעיה במשלוח קיים — ${config.label}`,
    primaryAction,
    primaryReason: '',
    preparationItems: dataToGather,
    urgency,
    primaryCta: isUrgent ? { id: 'urgent-case-review', label: 'בדיקת המקרה בדחיפות' } : config.cta,
    secondaryCta: isUrgent ? { id: 'timeline-and-docs-prep', label: 'הכנת ציר זמן ומסמכים' } : null,
    professional,
    supportingProfessional,
    accumulatingCostWarning: i.accumulatingCosts === true ? 'העלויות עשויות להמשיך להצטבר. מומלץ לפעול לצמצום המשך ההצטברות.' : null,
    secondaryDetails: {
      points: isUrgent ? [] : ['אם אין מענה תוך זמן סביר או שהבעיה אינה מתבררת, מומלץ לערב עמיל מכס או גורם מקצועי.'],
    },
  });
}

/**
 * Marine/cargo insurance result builder (family J).
 *
 * Never provides a coverage conclusion, never states a loss is or
 * isn't insured, never states an exclusion applies. Every sub-scenario
 * routes to a concrete insurance-side professional, escalating to an
 * insurance-claims lawyer only for a genuine coverage dispute or a
 * rejected claim.
 *
 * Pure, deterministic, DOM-free, network-free, storage-free.
 */

import { buildCompactResult, INSURANCE_ROUTE_DISCLAIMER } from './build-action-map.js';
import { PROFESSIONAL_CATEGORY, professionalReferral, jointReferral } from './professional-category-registry.js';
import { ISSUE_FAMILY } from './scenario-schema.js';

const URGENT = 'דחוף';
const ATTENTION = 'דורש תשומת לב';

const SUB_SCENARIO_CONFIG = Object.freeze({
  notification_of_loss: {
    label: 'דיווח ראשוני על אירוע ביטוחי',
    urgency: URGENT,
    primary: () => jointReferral(
      PROFESSIONAL_CATEGORY.MARINE_INSURANCE_BROKER,
      PROFESSIONAL_CATEGORY.CARGO_INSURER,
      'לדווח על האירוע ולקבל הנחיות מיידיות לשמירת זכויות וראיות.',
    ),
    supporting: () => professionalReferral(PROFESSIONAL_CATEGORY.MARINE_SURVEYOR, 'לתיעוד ובדיקת היקף הנזק או האובדן.'),
    action: 'יש לדווח ללא דיחוי למבטח או לסוכן הביטוח ולשמור את כל הראיות והמסמכים הרלוונטיים.',
  },
  damage_assessment: {
    label: 'הערכת נזק למטען',
    urgency: URGENT,
    primary: () => professionalReferral(PROFESSIONAL_CATEGORY.MARINE_SURVEYOR, 'לתיעוד מקצועי של הנזק, בדיקת היקפו ואיסוף ממצאים.'),
    supporting: () => jointReferral(PROFESSIONAL_CATEGORY.MARINE_INSURANCE_BROKER, PROFESSIONAL_CATEGORY.CARGO_INSURER, 'לתאם את תהליך הבדיקה מול המבטח.'),
    action: 'מומלץ לתאם שמאות ימית בהקדם, במקביל לדיווח למבטח.',
  },
  coverage_dispute: {
    label: 'מחלוקת כיסוי ביטוחי',
    urgency: URGENT,
    primary: () => professionalReferral(PROFESSIONAL_CATEGORY.INSURANCE_LAWYER, 'לבדוק את תנאי הפוליסה, הכיסוי הנטען וזכויות אפשריות בסכסוך מול המבטח.'),
    supporting: () => jointReferral(PROFESSIONAL_CATEGORY.MARINE_INSURANCE_BROKER, PROFESSIONAL_CATEGORY.MARINE_SURVEYOR, 'לבדוק את נסיבות המקרה והתיעוד המקצועי הקיים.'),
    action: 'יש לשמור את כל ההתכתבות עם המבטח ואת הפוליסה, ולפנות לבדיקה משפטית לפני מענה נוסף.',
  },
  rejected_claim: {
    label: 'תביעה שנדחתה',
    urgency: URGENT,
    primary: () => professionalReferral(PROFESSIONAL_CATEGORY.INSURANCE_LAWYER, 'לבדוק את נימוקי הדחייה, תנאי הפוליסה וזכויות אפשריות לערעור.'),
    supporting: () => jointReferral(PROFESSIONAL_CATEGORY.MARINE_INSURANCE_BROKER, PROFESSIONAL_CATEGORY.MARINE_SURVEYOR, 'לבדוק את נסיבות התביעה ואת התיעוד שהוגש.'),
    action: 'יש לשמור את מכתב הדחייה ואת כל מסמכי התביעה, ולפנות לבדיקה משפטית לפני תגובה.',
  },
  pre_shipment_risk_review: {
    label: 'בדיקת ביטוח לפני שילוח',
    urgency: ATTENTION,
    primary: () => jointReferral(PROFESSIONAL_CATEGORY.MARINE_INSURANCE_BROKER, PROFESSIONAL_CATEGORY.INSURANCE_ADVISER, 'לבדוק את היקף הכיסוי המתאים לפני שילוח.'),
    supporting: null,
    action: 'מומלץ לבדוק כיסוי ביטוחי מתאים לפני שילוח המטען, בהתאם לערך ולאמצעי ההובלה.',
  },
  lack_of_insurance: {
    label: 'משלוח ללא ביטוח',
    urgency: ATTENTION,
    primary: () => professionalReferral(PROFESSIONAL_CATEGORY.INSURANCE_ADVISER, 'לבדוק אפשרויות ביטוח רטרואקטיבי או להבא, בהתאם לנסיבות.'),
    supporting: null,
    action: 'מומלץ לבדוק מול יועץ ביטוחי את האפשרויות העומדות בפני משלוח ללא כיסוי.',
  },
  underinsurance_or_deductible: {
    label: 'ביטוח חסר או השתתפות עצמית',
    urgency: ATTENTION,
    primary: () => jointReferral(PROFESSIONAL_CATEGORY.MARINE_INSURANCE_BROKER, PROFESSIONAL_CATEGORY.CARGO_INSURER, 'לבדוק את גובה הכיסוי, ההשתתפות העצמית והשלכות על סכום הפיצוי האפשרי.'),
    supporting: null,
    action: 'יש לבדוק את תנאי הפוליסה מול המבטח או סוכן הביטוח לפני הגשת תביעה.',
  },
});

/**
 * @param {object} input - Normalized readiness input.
 * @returns {Readonly<object>} Compact result.
 */
export function buildInsuranceResult(input) {
  const i = input !== null && typeof input === 'object' ? input : {};
  const config = SUB_SCENARIO_CONFIG[i.insuranceSubScenario] ?? SUB_SCENARIO_CONFIG.notification_of_loss;

  const professional = config.primary();
  const supportingProfessional = config.supporting ? config.supporting() : null;

  return buildCompactResult({
    scenario: 'shipment_problem',
    issueFamily: ISSUE_FAMILY.INSURANCE,
    issueType: `insurance_${i.insuranceSubScenario}`,
    routeLabel: `בעיה במשלוח קיים — ${config.label}`,
    primaryAction: config.action,
    primaryReason: '',
    immediateActions: [
      'שמירת הפוליסה, ההתכתבות עם המבטח וכל מסמכי התביעה',
      'תיעוד הנסיבות בכתב, כולל תאריכים',
    ],
    preparationItems: ['פוליסת הביטוח', 'מסמכי ההובלה', 'תיעוד האירוע (תמונות/דוח)', 'התכתבות עם המבטח, אם קיימת'],
    urgency: config.urgency,
    professional,
    supportingProfessional,
    notificationParties: ['סוכן הביטוח או המבטח', 'המשלח הבינלאומי'],
    deadlineWarning: 'ייתכנו מועדי הודעה או הגשת תביעה קצרים לפי הפוליסה. יש לבדוק אותם מיד מול המבטח.',
    accumulatingCostWarning: null,
    primaryCta: { id: 'marine-insurance-referral', label: professional.ctaLabel },
    secondaryCta: supportingProfessional ? { id: 'marine-survey-referral', label: supportingProfessional.ctaLabel } : null,
    secondaryDetails: { note: INSURANCE_ROUTE_DISCLAIMER },
  });
}

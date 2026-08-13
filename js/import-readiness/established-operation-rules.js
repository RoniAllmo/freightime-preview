/**
 * Established-import-operation scenario result builder. One audit
 * objective, one specialist recommendation, a short document sample --
 * never a large generic service catalogue and never a compliance
 * score. Legal and insurance purposes route straight to the boundary
 * recommendation, never answered directly.
 *
 * Pure, deterministic, DOM-free, network-free, storage-free.
 */

import { buildCompactResult, resolveOfficialSources, PROFESSIONAL_ROLES, PROFESSIONAL_REFERRAL } from './build-action-map.js';

const CUSTOMS_BROKER_REFERRAL = Object.freeze({
  type: PROFESSIONAL_ROLES.LICENSED_CUSTOMS_BROKER,
  reason: 'לבדוק את הנושא לעומק מול פעילות היבוא הקיימת ולזהות חשיפות או תיקונים נדרשים.',
  ctaLabel: 'לתיאום ביקורת מול עמיל מכס',
});

const QUALIFIED_PROFESSIONAL_REFERRAL = Object.freeze({
  type: PROFESSIONAL_ROLES.QUALIFIED_PROFESSIONAL,
  reason: 'לבדוק את הנושא לעומק מול פעילות היבוא הקיימת ולזהות חשיפות או תיקונים נדרשים.',
  ctaLabel: 'לתיאום ביקורת מקצועית',
});

const PURPOSE_CONFIG = Object.freeze({
  existing_classifications_audit: {
    label: 'ביקורת סיווגים קיימים',
    primaryAction: `מומלץ לתאם ביקורת סיווגים מול ${PROFESSIONAL_ROLES.CUSTOMS_CLASSIFIER}, כדי לוודא שהסיווגים הקיימים עדיין תואמים למוצרים בפועל.`,
    primaryReason: 'סיווג שגוי עלול להוביל לגירעון מס וקנסות רטרואקטיביים.',
    preparationItems: ['רשימת סיווגים קיימים', 'מדגם חשבוניות אחרונות'],
    primaryCta: { id: 'classification-audit', label: 'ביקורת סיווגים' },
    professional: PROFESSIONAL_REFERRAL.CLASSIFICATION_AND_REGULATION,
    sources: ['customs-tariff'],
  },
  regulation_and_permits_audit: {
    label: 'ביקורת רגולציה ואישורים',
    primaryAction: `מומלץ לתאם ביקורת רגולציה מול ${PROFESSIONAL_ROLES.REGULATION_SPECIALIST}, לוודא שהיתרים בתוקף עבור כל קטגוריית מוצר.`,
    primaryReason: 'היתר שפג תוקף עלול לעצור שחרור משלוחים.',
    preparationItems: ['רשימת היתרים קיימים ותוקפם'],
    primaryCta: { id: 'regulation-audit', label: 'ביקורת רגולציה' },
    professional: PROFESSIONAL_REFERRAL.CLASSIFICATION_AND_REGULATION,
    sources: ['standards-institution'],
  },
  document_process_audit: {
    label: 'ביקורת תהליך מסמכים',
    primaryAction: `מומלץ לתאם ביקורת תהליך מול ${PROFESSIONAL_ROLES.LICENSED_CUSTOMS_BROKER}, לבדוק אחידות ותיעוד בקבלת מסמכי ספק.`,
    primaryReason: 'תיעוד חסר מקשה על בדיקה עתידית או ערעור.',
    preparationItems: ['מדגם תהליכי קבלת מסמכים אחרונים'],
    primaryCta: { id: 'process-audit', label: 'ביקורת תהליך היבוא' },
    professional: PROFESSIONAL_REFERRAL.SUPPLIER_DOCUMENTS,
    sources: [],
  },
  penalty_or_shortfall_exposure: {
    label: 'בדיקת חשיפות לקנסות או גירעונות',
    primaryAction: `מומלץ לתאם בדיקת חשיפות מול ${PROFESSIONAL_ROLES.LICENSED_CUSTOMS_BROKER}, לבדוק היסטוריית שומות וקנסות.`,
    primaryReason: 'חשיפה מצטברת עלולה להשפיע על תזרים ותכנון.',
    preparationItems: ['היסטוריית שומות וקנסות'],
    primaryCta: { id: 'exposure-audit', label: 'ביקורת חשיפות' },
    professional: CUSTOMS_BROKER_REFERRAL,
    sources: [],
  },
  storage_demurrage_charges: {
    label: 'בדיקת אחסנה, השהייה וחיובים',
    primaryAction: `מומלץ לתאם בדיקה מול ${PROFESSIONAL_ROLES.LICENSED_CUSTOMS_BROKER}, לבדוק דפוסי חיוב חוזרים ואפשרות לצמצום.`,
    primaryReason: 'חיובים חוזרים עלולים להצטבר משמעותית לאורך זמן.',
    preparationItems: ['דפוסי חיוב אחרונים באחסנה/השהייה'],
    primaryCta: { id: 'exposure-audit', label: 'ביקורת חשיפות' },
    professional: CUSTOMS_BROKER_REFERRAL,
    sources: [],
  },
  sale_terms_review: {
    label: 'בדיקת תנאי מכר',
    primaryAction: `מומלץ לתאם בדיקה מול ${PROFESSIONAL_ROLES.QUALIFIED_PROFESSIONAL}, לוודא שתנאי המכר תואמים את חלוקת האחריות בפועל.`,
    primaryReason: 'אי-התאמה בין תנאי המכר לפועל עלולה ליצור עלויות בלתי צפויות.',
    preparationItems: ['חוזי מכר נוכחיים'],
    primaryCta: { id: 'process-audit', label: 'ביקורת תהליך היבוא' },
    professional: QUALIFIED_PROFESSIONAL_REFERRAL,
    sources: [],
  },
  insurance_coverage_review: {
    label: 'בדיקת כיסוי ביטוחי',
    primaryAction: 'פנייה ליועץ ביטוחי המתמחה בסיכוני הובלה ויבוא.',
    primaryReason: 'FreighTime אינו מספק ייעוץ ביטוחי.',
    preparationItems: [],
    primaryCta: { id: 'insurance-advice', label: 'ייעוץ ביטוחי' },
    professional: PROFESSIONAL_REFERRAL.INSURANCE,
    sources: [],
  },
  supplier_process_review: {
    label: 'בדיקת תהליך ספקים',
    primaryAction: `מומלץ לתאם בדיקה מול ${PROFESSIONAL_ROLES.QUALIFIED_PROFESSIONAL}, לבדוק אחידות תיעוד הנדרש מספקים.`,
    primaryReason: 'תלות בספק בודד או מידע חסר מגדילים סיכון תפעולי.',
    preparationItems: ['רשימת ספקים פעילים ותיעוד נדרש'],
    primaryCta: { id: 'process-audit', label: 'ביקורת תהליך היבוא' },
    professional: PROFESSIONAL_REFERRAL.SUPPLIER_DOCUMENTS,
    sources: [],
  },
  brokerage_and_clearance_process: {
    label: 'בדיקת תהליך עמילות ושחרור',
    primaryAction: `מומלץ לתאם בדיקה מול ${PROFESSIONAL_ROLES.LICENSED_CUSTOMS_BROKER}, לבדוק זמני תגובה ונהלי טיפול בעיכובים.`,
    primaryReason: 'תהליך לא יעיל עלול להאריך זמני שחרור.',
    preparationItems: ['נהלי עבודה מול עמיל המכס'],
    primaryCta: { id: 'brokerage-process-check', label: 'בדיקת תהליך עמילות' },
    professional: CUSTOMS_BROKER_REFERRAL,
    sources: [],
  },
  legal_advice: {
    label: 'ייעוץ משפטי',
    primaryAction: 'פנייה לייעוץ משפטי מתאים.',
    primaryReason: 'FreighTime אינו מספק ייעוץ משפטי.',
    preparationItems: [],
    primaryCta: { id: 'legal-advice', label: 'ייעוץ משפטי' },
    professional: PROFESSIONAL_REFERRAL.LEGAL,
    sources: [],
  },
  other: {
    label: 'נושא אחר',
    primaryAction: 'מומלץ לפרט את מטרת הבדיקה לצורך הפניה מדויקת יותר.',
    primaryReason: '',
    preparationItems: [],
    primaryCta: { id: 'process-audit', label: 'ביקורת תהליך היבוא' },
    professional: QUALIFIED_PROFESSIONAL_REFERRAL,
    sources: [],
  },
});

export function buildEstablishedOperationResult(input) {
  const i = input !== null && typeof input === 'object' ? input : {};
  const config = PURPOSE_CONFIG[i.auditPurpose] ?? PURPOSE_CONFIG.other;

  return buildCompactResult({
    scenario: 'established_operation',
    routeLabel: `פעילות יבוא קיימת — ${config.label}`,
    primaryAction: config.primaryAction,
    primaryReason: config.primaryReason,
    preparationItems: config.preparationItems,
    primaryCta: config.primaryCta,
    professional: config.professional,
    secondaryDetails: {
      officialSources: resolveOfficialSources(config.sources),
    },
  });
}

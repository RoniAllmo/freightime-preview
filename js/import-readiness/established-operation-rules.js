/**
 * Established-import-operation scenario result builder. Provides
 * focused review areas -- never a readiness score, never a compliance
 * certificate, never a legal or insurance conclusion.
 *
 * Pure, deterministic, DOM-free, network-free, storage-free.
 */

import { buildAuditResult, resolveOfficialSources, LEGAL_OR_INSURANCE_BOUNDARY_MESSAGE, PROFESSIONAL_ROLES } from './build-action-map.js';

const PURPOSE_CONFIG = Object.freeze({
  existing_classifications_audit: {
    label: 'ביקורת סיווגים קיימים',
    auditPoints: ['לוודא שהסיווגים בשימוש עדיין תואמים למוצרים בפועל', 'לבדוק אם חלו שינויים בתעריף המכס מאז הסיווג האחרון'],
    exposures: ['סיווג שגוי עלול להוביל לגירעון מס וקנסות רטרואקטיביים'],
    recommendedProfessional: PROFESSIONAL_ROLES.CUSTOMS_CLASSIFIER,
    sources: ['customs-tariff'],
  },
  regulation_and_permits_audit: {
    label: 'ביקורת רגולציה ואישורים',
    auditPoints: ['לוודא שהיתרים ואישורים בתוקף עבור כל קטגוריית מוצר', 'לבדוק שינויים רגולטוריים שחלו לאחרונה'],
    exposures: ['היתר שפג תוקף עלול לעצור שחרור משלוחים'],
    recommendedProfessional: PROFESSIONAL_ROLES.REGULATION_SPECIALIST,
    sources: ['standards-institution'],
  },
  document_process_audit: {
    label: 'ביקורת תהליך מסמכים',
    auditPoints: ['לבדוק אחידות ותיעוד בתהליך קבלת מסמכי ספק', 'לבדוק שמירת עותקים ותיעוד היסטורי'],
    exposures: ['תיעוד חסר מקשה על בדיקה עתידית או ערעור'],
    recommendedProfessional: PROFESSIONAL_ROLES.LICENSED_CUSTOMS_BROKER,
    sources: [],
  },
  penalty_or_shortfall_exposure: {
    label: 'בדיקת חשיפות לקנסות או גירעונות',
    auditPoints: ['לבדוק היסטוריית שומות וקנסות', 'לבדוק חשיפה מצטברת לפי סוג מוצר או ספק'],
    exposures: ['חשיפה מצטברת עלולה להשפיע על תזרים ותכנון'],
    recommendedProfessional: PROFESSIONAL_ROLES.LICENSED_CUSTOMS_BROKER,
    sources: [],
  },
  storage_demurrage_charges: {
    label: 'בדיקת אחסנה, השהייה וחיובים',
    auditPoints: ['לבדוק דפוסי חיוב חוזרים באחסנה ובהשהייה', 'לבדוק אם ניתן לצמצם באמצעות תכנון שחרור מוקדם יותר'],
    exposures: ['חיובים חוזרים עלולים להצטבר משמעותית לאורך זמן'],
    recommendedProfessional: PROFESSIONAL_ROLES.LICENSED_CUSTOMS_BROKER,
    sources: [],
  },
  sale_terms_review: {
    label: 'בדיקת תנאי מכר',
    auditPoints: ['לוודא שתנאי המכר (Incoterms) תואמים את חלוקת האחריות בפועל'],
    exposures: ['אי-התאמה בין תנאי המכר לפועל עלולה ליצור עלויות בלתי צפויות'],
    recommendedProfessional: PROFESSIONAL_ROLES.QUALIFIED_PROFESSIONAL,
    sources: [],
  },
  insurance_coverage_review: {
    label: 'בדיקת כיסוי ביטוחי',
    auditPoints: [],
    exposures: [],
    recommendedProfessional: PROFESSIONAL_ROLES.INSURANCE_ADVISER,
    sources: [],
    forceLegalOrInsurance: true,
  },
  supplier_process_review: {
    label: 'בדיקת תהליך ספקים',
    auditPoints: ['לבדוק אחידות תיעוד ומידע הנדרש מספקים חדשים וקיימים'],
    exposures: ['תלות בספק בודד או מידע חסר מגדילים סיכון תפעולי'],
    recommendedProfessional: PROFESSIONAL_ROLES.QUALIFIED_PROFESSIONAL,
    sources: [],
  },
  brokerage_and_clearance_process: {
    label: 'בדיקת תהליך עמילות ושחרור',
    auditPoints: ['לבדוק זמני תגובה ותיאום מול עמיל המכס', 'לבדוק נהלים לטיפול בעיכובים'],
    exposures: ['תהליך לא יעיל עלול להאריך זמני שחרור'],
    recommendedProfessional: PROFESSIONAL_ROLES.LICENSED_CUSTOMS_BROKER,
    sources: [],
  },
  legal_advice: {
    label: 'ייעוץ משפטי',
    auditPoints: [],
    exposures: [],
    recommendedProfessional: PROFESSIONAL_ROLES.LEGAL_ADVISER,
    sources: [],
    forceLegalOrInsurance: true,
  },
  other: {
    label: 'נושא אחר',
    auditPoints: ['מומלץ לפרט את מטרת הבדיקה לצורך הפניה מדויקת יותר'],
    exposures: [],
    recommendedProfessional: PROFESSIONAL_ROLES.QUALIFIED_PROFESSIONAL,
    sources: [],
  },
});

export function buildEstablishedOperationResult(input) {
  const i = input !== null && typeof input === 'object' ? input : {};
  const config = PURPOSE_CONFIG[i.auditPurpose] ?? PURPOSE_CONFIG.other;

  return buildAuditResult({
    routeLabel: `פעילות יבוא קיימת -- ${config.label}`,
    purposeLabel: config.label,
    auditPoints: config.auditPoints,
    exposures: config.exposures,
    documentsAndSample: config.forceLegalOrInsurance ? [] : ['מדגם מסמכים אחרונים לבדיקה (חשבוניות, סיווגים, אישורים)'],
    recommendedProfessional: config.forceLegalOrInsurance ? LEGAL_OR_INSURANCE_BOUNDARY_MESSAGE : `גורם מקצועי מומלץ: ${config.recommendedProfessional}`,
    nextStep: config.forceLegalOrInsurance
      ? 'לפנות ישירות לעורך דין או יועץ ביטוחי מתאים.'
      : `לתאם בדיקה ממוקדת מול ${config.recommendedProfessional}.`,
    officialSources: resolveOfficialSources(config.sources),
    ctas: [
      { id: 'process-audit', label: 'ביקורת תהליך היבוא' },
      { id: 'classification-audit', label: 'ביקורת סיווגים' },
      { id: 'exposure-audit', label: 'ביקורת חשיפות' },
      { id: 'legal-advice', label: 'ייעוץ משפטי' },
      { id: 'insurance-advice', label: 'ייעוץ ביטוחי' },
      { id: 'brokerage-process-check', label: 'בדיקת תהליך עמילות' },
    ],
  });
}

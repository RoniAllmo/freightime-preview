/**
 * Orchestrates FreighTime Import Readiness Check V1: combines the
 * document checklist, regulatory-risk rules, and classification
 * questions into one explainable result, and computes a deterministic
 * readiness level (`high`/`partial`/`low`).
 *
 * Pure, deterministic, DOM-free, network-free, storage-free. Never
 * produces a final HS code, a final duty/tax rate, or a definite
 * permit/standard determination -- see `regulatory-risk-rules.js` and
 * `document-rules.js` for why every regulatory statement is phrased as
 * "requires verification," never as a decision.
 */

import { DOCUMENT_STATUS, RISK_SEVERITY, READINESS_LEVEL } from './readiness-schema.js';
import { buildDocumentChecklist } from './document-rules.js';
import { buildRegulatoryRisks } from './regulatory-risk-rules.js';
import { buildClassificationQuestions } from './classification-question-rules.js';
import { normalizeReadinessInput } from './normalize-readiness-input.js';

export const RESULT_DISCLAIMER =
  'על בסיס המידע שנמסר, FreighTime מציג בדיקת מוכנות תפעולית בלבד. התוצאה אינה מהווה סיווג מכס סופי, אישור יבוא, קביעה רגולטורית, ייעוץ משפטי או תחליף לבדיקה מול רשות מוסמכת או איש מקצוע.';

/** Static, non-calculated list of cost components a user should plan for. Never a quote. */
const COST_COMPONENTS_TO_CONSIDER = Object.freeze([
  'ערך הסחורה (Invoice Value)',
  'עלות הובלה בינלאומית',
  'ביטוח מטען',
  'מכס (בהתאם לסיווג שייקבע)',
  'מס קנייה (אם חל על הפריט)',
  'מע״מ',
  'עמלת עמיל מכס',
  'אגרות נמל/מסוף',
  'עלויות אחסנה',
  'עלות בדיקות מעבדה/תקן, אם נדרשות',
  'עלות היתר יבוא, אם נדרש',
  'הובלה מקומית מהנמל/שדה התעופה',
]);

/** Official-source category link registry -- static, safe, never carries user input. */
const OFFICIAL_SOURCES = Object.freeze({
  'customs-tariff': Object.freeze({
    label: 'תעריף המכס ומס הקנייה',
    url: 'https://www.gov.il/he/departments/general/customs_tariff',
  }),
  'free-import-order': Object.freeze({
    label: 'צו יבוא חופשי',
    url: 'https://www.gov.il/he/departments/policies/free_import_order',
  }),
  'standards-institution': Object.freeze({
    label: 'מכון התקנים הישראלי',
    url: 'https://www.sii.org.il/',
  }),
  'health-ministry': Object.freeze({
    label: 'משרד הבריאות -- יבוא מוצרים',
    url: 'https://www.gov.il/he/departments/ministry_of_health',
  }),
  'transport-ministry': Object.freeze({
    label: 'משרד התחבורה',
    url: 'https://www.gov.il/he/departments/ministry_of_transportation',
  }),
  'agriculture-ministry': Object.freeze({
    label: 'משרד החקלאות ופיתוח הכפר',
    url: 'https://www.gov.il/he/departments/ministry_of_agriculture_and_rural_development',
  }),
  'environmental-protection-ministry': Object.freeze({
    label: 'המשרד להגנת הסביבה',
    url: 'https://www.gov.il/he/departments/ministry_of_environmental_protection',
  }),
  'communications-ministry': Object.freeze({
    label: 'משרד התקשורת',
    url: 'https://www.gov.il/he/departments/ministry_of_communications',
  }),
});

function countMissingCoreInfo(input) {
  const coreFields = ['productName', 'commercialDescription', 'intendedUse', 'primaryMaterial'];
  return coreFields.filter((f) => input[f].length === 0).length;
}

function computeReadinessLevel(input, risks, documents) {
  const highRisks = risks.filter((r) => r.severity === RISK_SEVERITY.HIGH);
  const attentionRisks = risks.filter((r) => r.severity === RISK_SEVERITY.ATTENTION);
  const missingCoreInfo = countMissingCoreInfo(input);
  const invoiceMissing = documents.find((d) => d.id === 'commercialInvoice').status === DOCUMENT_STATUS.MISSING;
  const packingListMissing = documents.find((d) => d.id === 'packingList').status === DOCUMENT_STATUS.MISSING;

  if (highRisks.length > 0 || missingCoreInfo >= 3 || (invoiceMissing && packingListMissing)) {
    return READINESS_LEVEL.LOW;
  }
  if (attentionRisks.length > 0 || missingCoreInfo >= 1 || invoiceMissing || packingListMissing || !input.hsCodeKnown) {
    return READINESS_LEVEL.PARTIAL;
  }
  return READINESS_LEVEL.HIGH;
}

function buildMissingInformation(input) {
  const missing = [];
  if (input.productName.length === 0) missing.push('שם המוצר');
  if (input.commercialDescription.length === 0) missing.push('תיאור מסחרי');
  if (input.intendedUse.length === 0) missing.push('ייעוד/שימוש מיועד');
  if (input.primaryMaterial.length === 0) missing.push('חומר הרכב עיקרי');
  if (input.countryOfOrigin.length === 0) missing.push('מדינת מקור');
  if (input.quantity.length === 0) missing.push('כמות');
  if (input.invoiceValue.length === 0) missing.push('ערך חשבונית');
  if (input.incoterm === 'unknown') missing.push('תנאי מסירה (Incoterm)');
  if (input.shipmentMode === 'unknown') missing.push('אמצעי הובלה');
  return Object.freeze(missing);
}

function buildClearanceDelayRisks(risks, documents) {
  const highAndAttention = risks.filter((r) => r.severity !== RISK_SEVERITY.INFORMATION);
  const missingCoreDocs = documents.filter(
    (d) => d.status === DOCUMENT_STATUS.MISSING || d.status === DOCUMENT_STATUS.VERIFY_APPLICABILITY,
  );
  const items = [];
  for (const risk of highAndAttention) {
    items.push(`נושא רגולטורי לבדיקה: ${risk.reason}`);
  }
  if (missingCoreDocs.length > 0) {
    items.push(`מסמכים שטרם אומתו כזמינים (${missingCoreDocs.length}) עלולים לעכב שחרור מהמכס`);
  }
  return Object.freeze(items);
}

function buildNextActions(input, risks, documents, missingInfo) {
  const actions = [];
  if (missingInfo.length > 0) {
    actions.push('להשלים את פרטי המוצר החסרים לפני מתן הוראות סופיות לספק');
  }
  const missingCoreDocs = documents.filter((d) => d.status === DOCUMENT_STATUS.MISSING);
  if (missingCoreDocs.length > 0) {
    actions.push('לבקש מהספק את המסמכים המסחריים הבסיסיים החסרים לפני שילוח');
  }
  if (!input.hsCodeKnown) {
    actions.push('לאסוף מידע טכני מלא לצורך בדיקת סיווג מכס מול עמיל מכס');
  }
  const professionalReviewRisks = risks.filter((r) => r.professionalReviewFlag);
  if (professionalReviewRisks.length > 0) {
    actions.push('מומלץ לקבל בדיקה מקצועית לנושאים הרגולטוריים שסומנו לפני שילוח');
  }
  if (actions.length === 0) {
    actions.push('המידע שנמסר סביר -- מומלץ עדיין לאמת מול מקור רשמי ולפני מתן הוראות סופיות לספק');
  }
  return Object.freeze(actions);
}

function buildOfficialSourceLinks(risks) {
  const categories = new Set(risks.map((r) => r.sourceCategory));
  const links = [...categories]
    .filter((c) => OFFICIAL_SOURCES[c])
    .map((c) => Object.freeze({ category: c, ...OFFICIAL_SOURCES[c], noteLabel: 'נדרש לבדוק' }));
  return Object.freeze(links);
}

/**
 * Build the full Import Readiness Check V1 result from a normalized input.
 *
 * @param {*} input - A normalized input from `normalizeReadinessInput`.
 * @returns {Readonly<object>} A frozen result object with every section
 *   required by the product design (readiness level, missing information,
 *   documents, classification questions, regulatory risks, cost
 *   components to consider, clearance-delay risks, next actions, official
 *   sources, and the fixed disclaimer).
 */
export function buildReadinessResult(input) {
  // Always run through the normalizer so every field is safely typed
  // (an already-normalized, frozen input passes through unchanged --
  // normalizing twice is idempotent and cheap).
  const in_ = normalizeReadinessInput(input !== null && typeof input === 'object' ? input : {});

  const documents = buildDocumentChecklist(in_);
  const risks = buildRegulatoryRisks(in_);
  const classificationQuestions = buildClassificationQuestions(in_);
  const missingInformation = buildMissingInformation(in_);
  const readinessLevel = computeReadinessLevel(in_, risks, documents);

  return Object.freeze({
    readinessLevel,
    missingInformation,
    documents,
    documentsAvailable: Object.freeze(documents.filter((d) => d.status === DOCUMENT_STATUS.AVAILABLE)),
    documentsToObtain: Object.freeze(
      documents.filter((d) => d.status === DOCUMENT_STATUS.MISSING || d.status === DOCUMENT_STATUS.VERIFY_APPLICABILITY || d.status === DOCUMENT_STATUS.MAY_BE_REQUIRED),
    ),
    classificationQuestions,
    regulatoryRisks: risks,
    costComponentsToConsider: COST_COMPONENTS_TO_CONSIDER,
    clearanceDelayRisks: buildClearanceDelayRisks(risks, documents),
    nextActions: buildNextActions(in_, risks, documents, missingInformation),
    officialSources: buildOfficialSourceLinks(risks),
    userProvidedHsCode: in_.hsCodeKnown && in_.hsCode.length > 0 ? in_.hsCode : null,
    disclaimer: RESULT_DISCLAIMER,
  });
}

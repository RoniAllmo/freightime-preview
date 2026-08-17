/**
 * Eight-section professional importer-readiness brief structure --
 * the new result-presentation layer for the Import Readiness
 * assessment.
 *
 * Restructures the PRESENTATION of a result that one of the existing,
 * already-reviewed scenario result builders (personal-import-rules.js,
 * first-commercial-import-rules.js, existing-importer-rules.js,
 * established-operation-rules.js, shipment-problem-rules.js, or their
 * family-specific sub-rule modules) already produced via
 * `buildCompactResult` (see build-action-map.js). It never invents new
 * regulatory facts, scores, ranks, or gamified labels -- every section
 * is populated purely by re-shaping fields that already exist on the
 * compact result, plus the purely mechanical document-readiness
 * checklist and the already gate-enforced regulatory-signals
 * evaluation.
 *
 * Sections:
 *   A. מצב הבדיקה               -- one operational status label
 *   B. תמונת מצב                 -- route + one-line situation reason
 *   C. נקודות לבדיקה לפני המשך    -- checkpoints (dedup of prep items + immediate actions)
 *   D. מסמכים שכדאי להשיג         -- document-readiness gaps (mechanical only)
 *   E. פעולות מומלצות לפי סדר עדיפות -- ordered action list
 *   F. גורם מקצועי מתאים          -- professional + supporting professional
 *   G. מידע שחסר להמשך בדיקה      -- honest "insufficient information" section
 *   H. הסתייגות קצרה              -- short + extended disclaimer
 *
 * No scores, stars, trophies, badges, or gamification anywhere in this
 * module. Never labels the importer as good/bad/expert/beginner/
 * failed/passed.
 *
 * Pure, deterministic, DOM-free, network-free, storage-free.
 */

export const RESULT_STATUS = Object.freeze({
  CAN_PROCEED_GATHERING_INFO: 'ניתן להתקדם באיסוף מידע',
  COMPLETE_DETAILS_BEFORE_ORDERING: 'מומלץ להשלים פרטים לפני הזמנה',
  PROFESSIONAL_CHECK_BEFORE_SHIPPING: 'מומלץ לבצע בדיקה מקצועית לפני שילוח',
  OPERATIONAL_ACTION_NEEDED_SOON: 'נדרשת פעולה תפעולית בהקדם',
  URGENT_HANDLING_NEEDED: 'נדרש טיפול דחוף',
});

const URGENT_LABEL = 'דחוף';
const ATTENTION_LABEL = 'דורש תשומת לב';

export const NO_FOCUSED_DIRECTION_MESSAGE =
  'לא זוהה כיוון בדיקה ממוקד על בסיס הפרטים שנמסרו.';
export const NO_FOCUSED_DIRECTION_HELP =
  'כדי למקד את הבדיקה, כדאי להשלים את חומרי המוצר, השימוש המיועד, המפרט הטכני ותיאור הספק.';

/**
 * Deterministic status derivation from fields the compact result
 * already carries -- never invents a new signal.
 */
function deriveStatus(result) {
  if (result.urgency === URGENT_LABEL) return RESULT_STATUS.URGENT_HANDLING_NEEDED;
  if (result.urgency === ATTENTION_LABEL) return RESULT_STATUS.OPERATIONAL_ACTION_NEEDED_SOON;
  if (result.scenario === 'personal') return RESULT_STATUS.CAN_PROCEED_GATHERING_INFO;
  if (result.scenario === 'first_commercial') return RESULT_STATUS.COMPLETE_DETAILS_BEFORE_ORDERING;
  if (result.scenario === 'existing_importer' || result.scenario === 'established_operation') {
    return RESULT_STATUS.PROFESSIONAL_CHECK_BEFORE_SHIPPING;
  }
  return RESULT_STATUS.COMPLETE_DETAILS_BEFORE_ORDERING;
}

function dedupStrings(lists) {
  const seen = new Set();
  const out = [];
  for (const list of lists) {
    for (const item of Array.isArray(list) ? list : []) {
      if (typeof item !== 'string' || item.length === 0) continue;
      if (seen.has(item)) continue;
      seen.add(item);
      out.push(item);
    }
  }
  return out;
}

/**
 * @param {object} result - output of `buildCompactResult` from one of
 *   the existing scenario builders.
 * @param {{
 *   documentReadiness?: { worthObtaining?: Array<{id:string,label:string}> },
 *   regulatoryEvaluation?: { noMatchMessage?: string|null, noMatchNotExemptNote?: string|null, hasAnyHint?: boolean, signals?: object[] },
 *   noFocusedDirection?: boolean,
 * }} [context]
 * @returns {Readonly<object>} the eight-section brief
 */
export function buildResultBrief(result, context) {
  const r = result !== null && typeof result === 'object' ? result : {};
  const ctx = context !== null && typeof context === 'object' ? context : {};
  const docReadiness = ctx.documentReadiness !== null && typeof ctx.documentReadiness === 'object' ? ctx.documentReadiness : {};
  const regulatory = ctx.regulatoryEvaluation !== null && typeof ctx.regulatoryEvaluation === 'object' ? ctx.regulatoryEvaluation : null;

  // Section A -- מצב הבדיקה
  const status = deriveStatus(r);

  // Section B -- תמונת מצב
  const situation = Object.freeze({
    routeLabel: r.routeLabel ?? '',
    summary: r.primaryReason ?? '',
  });

  // Section C -- נקודות לבדיקה לפני המשך
  const checkpoints = Object.freeze(dedupStrings([r.preparationItems, r.immediateActions]));

  // Section D -- מסמכים שכדאי להשיג (mechanical only)
  const documentsToObtain = Object.freeze(
    (Array.isArray(docReadiness.worthObtaining) ? docReadiness.worthObtaining : []).map((d) => d.label),
  );

  // Section E -- פעולות מומלצות לפי סדר עדיפות
  const actions = [];
  if (r.primaryAction) actions.push(r.primaryAction);
  for (const item of Array.isArray(r.immediateActions) ? r.immediateActions : []) {
    if (item !== r.primaryAction) actions.push(item);
  }
  if (r.secondaryCta && r.secondaryCta.label && !actions.includes(r.secondaryCta.label)) {
    actions.push(r.secondaryCta.label);
  }
  const prioritizedActions = Object.freeze(dedupStrings([actions]));

  // Section F -- גורם מקצועי מתאים
  const professional = Object.freeze({
    primary: r.professional && r.professional.type ? r.professional : null,
    supporting: r.supportingProfessional && r.supportingProfessional.type ? r.supportingProfessional : null,
  });

  // Section G -- מידע שחסר להמשך בדיקה. This is the honest, safe home
  // for "we collected structured answers but have no specific verified
  // regulatory content to offer" -- never implies exemption, never
  // invents a category-specific fact.
  const missingInfoLines = [];
  if (regulatory && regulatory.noMatchMessage) missingInfoLines.push(regulatory.noMatchMessage);
  if (regulatory && regulatory.noMatchNotExemptNote) missingInfoLines.push(regulatory.noMatchNotExemptNote);
  if (ctx.noFocusedDirection === true) {
    missingInfoLines.push(NO_FOCUSED_DIRECTION_MESSAGE, NO_FOCUSED_DIRECTION_HELP);
  }
  const missingInformation = Object.freeze(dedupStrings([missingInfoLines]));

  // Section H -- הסתייגות קצרה
  const disclaimer = Object.freeze({
    short: r.visibleDisclaimer ?? '',
    extended: r.extendedDisclaimer ?? '',
  });

  return Object.freeze({
    status,
    situation,
    checkpoints,
    documentsToObtain,
    prioritizedActions,
    professional,
    missingInformation,
    disclaimer,
  });
}

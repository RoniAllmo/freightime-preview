/**
 * Personal-use clarification: replaces the removed exact-quantity
 * ("=== 100") pilot rule. Instead of inferring commercial character
 * from a specific number, this asks the user directly -- for personal
 * import only, only for a small, explicit, product-owner-maintained
 * list of sensitive families, and only when a quantity was actually
 * entered.
 *
 * The one live question this module contributes flows through the
 * SAME question scheduler, the SAME shared answer store, and the SAME
 * global question budget as the five detailed regulatory-signal rules
 * (see regulatory-signals/question-scheduler.js) -- it is not a
 * separate mechanism bolted on the side. `PERSONAL_USE_CLARIFICATION_RULE`
 * below is a minimal "rule" shape usable by that same scheduler; it is
 * never passed to the detailed-rule matcher (regulatory-signals/matcher.js)
 * and never produces a public "signal card" -- only this module's own
 * three cautious messages.
 *
 * Pure, DOM-free, network-free, storage-free. No quantity or answer
 * value is ever stored beyond the caller's own in-memory state.
 */

import { IMPORT_TYPE } from './scenario-schema.js';
import { parsePositiveWholeQuantity } from './personal-quantity-warning.js';

/**
 * The one explicit, product-owner-maintained list of matrix family ids
 * for which the personal-use clarification question may ever be asked.
 * Adding a family here is a deliberate, reviewed decision -- no family
 * outside this list is ever asked this question, regardless of
 * quantity. For this controlled pilot: cosmetics/תמרוקים only.
 */
export const SENSITIVE_FAMILY_IDS = Object.freeze([
  'health-and-cosmetics-01', // תמרוקים ובשמים (includes לק ג'ל)
]);

export const PERSONAL_USE_CLARIFICATION_CATEGORY = 'personal_use_sensitive_family';
export const PERSONAL_USE_CLARIFICATION_QUESTION_ID = 'personalUseOnlyConfirmation';

export const PERSONAL_USE_YES_MESSAGE =
  'הכמות והשימוש שנמסרו עדיין עשויים לדרוש בדיקה כדי לוודא שהמשלוח מתאים למסלול יבוא אישי.';
export const PERSONAL_USE_NO_MESSAGE =
  'לפי השימוש שנמסר, ייתכן שהמשלוח מתאים למסלול יבוא מסחרי ולא ליבוא אישי.';
export const PERSONAL_USE_NOT_SURE_MESSAGE =
  'מומלץ לבדוק את מסלול היבוא לפני ההזמנה או השילוח.';

/**
 * Minimal "rule" shape accepted by
 * regulatory-signals/question-scheduler.js's computeNextFollowUpQuestionId
 * and pruneAnswersInvalidatedByExclusion -- both only ever read
 * `internalCategory`, `followUpQuestionIds`, `operationalImpactPriority`,
 * and `status` from a rule object for scheduling purposes. This is
 * intentionally NOT shaped like a regulatory-signals/rules-registry.js
 * entry (no publicTitle, no professionalCategory, ...): it is never
 * passed to matchRegulatorySignals() and must never produce a public
 * signal card there.
 */
export const PERSONAL_USE_CLARIFICATION_RULE = Object.freeze({
  id: 'personal-use-clarification',
  internalCategory: PERSONAL_USE_CLARIFICATION_CATEGORY,
  followUpQuestionIds: Object.freeze([PERSONAL_USE_CLARIFICATION_QUESTION_ID]),
  // Lower priority than the five detailed-rule questions (priorities
  // 1-3) -- within a tight question budget, the existing product-safety
  // questions are asked first; this clarification only ever follows.
  operationalImpactPriority: 5,
  status: 'expert_approved_for_pilot',
});

export function isSensitiveFamily(familyId) {
  return typeof familyId === 'string' && SENSITIVE_FAMILY_IDS.includes(familyId);
}

/**
 * @param {{ importType?: string, family?: {id?: string}|null, rawQuantity?: string|number|null }} params
 * @returns {boolean} whether the personal-use clarification question is
 *   relevant for this product -- personal import only, a
 *   product-owner-approved sensitive family only, and only when a
 *   positive whole-number quantity was actually entered (blank
 *   quantity never asks this question).
 */
export function shouldAskPersonalUseClarification(params) {
  const p = params !== null && typeof params === 'object' ? params : {};
  if (p.importType !== IMPORT_TYPE.PERSONAL) return false;
  if (!p.family || !isSensitiveFamily(p.family.id)) return false;
  return parsePositiveWholeQuantity(p.rawQuantity) !== null;
}

/**
 * @param {string|undefined} answerValue - 'yes' | 'no' | 'unknown' (the
 *   question's own option values; 'unknown' here means "לא בטוח", not
 *   an unrelated regulatory "לא ידוע").
 * @returns {string|null} the exact approved cautious sentence for that
 *   answer, or null when the question was never answered (or never
 *   asked). Never states the quantity is commercial, never names a
 *   legal threshold, never claims the shipment qualifies for personal
 *   import, is exempt, or that import is approved.
 */
export function personalUseClarificationMessage(answerValue) {
  switch (answerValue) {
    case 'yes':
      return PERSONAL_USE_YES_MESSAGE;
    case 'no':
      return PERSONAL_USE_NO_MESSAGE;
    case 'unknown':
      return PERSONAL_USE_NOT_SURE_MESSAGE;
    default:
      return null;
  }
}

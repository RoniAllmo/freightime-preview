/**
 * Personal-versus-commercial import-type routing (entry Question 1).
 *
 * Pure, deterministic, DOM-free, network-free, storage-free. Never makes
 * a final legal determination -- when the user is uncertain, the
 * clarification questions produce only a leaning plus an explicit
 * "verify before proceeding" instruction, never a decision.
 */

import { IMPORT_TYPE } from './scenario-schema.js';

export const IMPORT_TYPE_EXPLANATIONS = Object.freeze({
  [IMPORT_TYPE.PERSONAL]:
    'יבוא לשימוש אישי או משפחתי, בכמות סבירה, שאינו מיועד למכירה, להפצה, לייצור או לשימוש במסגרת פעילות עסקית.',
  [IMPORT_TYPE.COMMERCIAL]:
    'יבוא המיועד למכירה, להפצה, לייצור, למתן שירות או לשימוש במסגרת עסק קיים, גם כאשר הכמות אינה גדולה.',
});

export const IMPORT_TYPE_DISCLAIMER =
  'אופי היבוא נקבע לפי נסיבות המקרה, מטרת היבוא, הכמות והשימוש. ההסבר הוא כלי עזר ואינו קביעה משפטית או החלטת מכס.';

export const UNCERTAIN_LEANS_COMMERCIAL_MESSAGE =
  'על בסיס התשובות, נראה שהיבוא עשוי להיחשב מסחרי. מומלץ לוודא את אופי היבוא והדרישות החלות לפני הזמנה או שילוח.';

export const UNCERTAIN_LEANS_PERSONAL_MESSAGE =
  'על בסיס התשובות, נראה שהיבוא עשוי להתאים למסלול אישי. יש לוודא שהכמות, השימוש וסוג המוצר עומדים בתנאים החלים.';

/**
 * Normalize the raw import-type answer to a known enum value.
 *
 * @param {*} rawAnswer - 'personal' | 'commercial' | 'uncertain', or any
 *   other malformed/unexpected value (handled safely).
 * @returns {string} One of `IMPORT_TYPE`'s values, defaulting to UNCERTAIN.
 */
export function normalizeImportTypeAnswer(rawAnswer) {
  if (rawAnswer === IMPORT_TYPE.PERSONAL || rawAnswer === IMPORT_TYPE.COMMERCIAL) {
    return rawAnswer;
  }
  return IMPORT_TYPE.UNCERTAIN;
}

/**
 * Resolve the three short clarification questions asked only when the
 * user selected "still not sure" for Question 1. Never returns a final
 * legal determination -- only a leaning plus the required verification
 * instruction.
 *
 * @param {{forSaleOrDistribution: boolean, forBusinessUse: boolean, personalOrFamilyUseOnly: boolean}} clarification
 * @returns {Readonly<{leaning: string, message: string}>}
 */
export function resolveUncertainImportType(clarification) {
  const c = clarification !== null && typeof clarification === 'object' ? clarification : {};
  const leansCommercial = c.forSaleOrDistribution === true || c.forBusinessUse === true;

  if (leansCommercial) {
    return Object.freeze({ leaning: IMPORT_TYPE.COMMERCIAL, message: UNCERTAIN_LEANS_COMMERCIAL_MESSAGE });
  }
  if (c.personalOrFamilyUseOnly === true) {
    return Object.freeze({ leaning: IMPORT_TYPE.PERSONAL, message: UNCERTAIN_LEANS_PERSONAL_MESSAGE });
  }
  return Object.freeze({ leaning: IMPORT_TYPE.UNCERTAIN, message: UNCERTAIN_LEANS_COMMERCIAL_MESSAGE });
}

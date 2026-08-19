/**
 * Personal-import quantity safeguard: a simple, optional "כמות משוערת"
 * field on the personal-import product route is checked against a
 * conservative commercial-appearance threshold and, when exceeded,
 * produces one cautious verification sentence -- never a definitive
 * "this quantity is commercial" claim, never an invented legal
 * quantity limit, and never commercial-import instructions on a
 * personal-import journey.
 *
 * Pure, DOM-free. The quantity value itself never leaves this module's
 * callers' in-memory state -- no transmission, no storage, no URL use.
 */

// No family in the current matrix supplies a reviewed, family-specific
// quantity threshold (the workbook has no such column), so every
// family falls back to this one general, product-owner-approved
// pilot threshold. This is a deliberately conservative "appearance"
// trigger for the cautious verification sentence below -- it is not a
// legal quantity limit, and the public wording never claims one.
export const GENERAL_COMMERCIAL_APPEARANCE_THRESHOLD = 20;

export const QUANTITY_WARNING_TEXT =
  'הכמות שנמסרה עשויה להיחשב כבעלת אופי מסחרי. מומלץ לבדוק את מסלול היבוא לפני ההזמנה או השילוח.';

/**
 * Parses the raw quantity field value into a positive whole number, or
 * null when blank/unknown/invalid -- blank and "unknown" are always
 * accepted and never treated as an error; the native `<input
 * type="number" min="1" step="1">` control already rejects most
 * invalid input at the browser level, this is a defensive second check
 * for any value that reaches this function some other way.
 *
 * @param {string|number|null|undefined} rawQuantity
 * @returns {number|null}
 */
export function parsePositiveWholeQuantity(rawQuantity) {
  if (rawQuantity === null || rawQuantity === undefined) return null;
  const text = String(rawQuantity).trim();
  if (text.length === 0) return null;
  if (!/^\d+$/.test(text)) return null;
  const n = Number(text);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

/**
 * @param {{ rawQuantity: string|number|null|undefined, family?: { quantityWarningThreshold?: number } }} params
 * @returns {string|null} the exact approved warning sentence, or null when no warning applies.
 */
export function evaluatePersonalQuantityWarning({ rawQuantity, family } = {}) {
  const quantity = parsePositiveWholeQuantity(rawQuantity);
  if (quantity === null) return null;

  const threshold = family && typeof family.quantityWarningThreshold === 'number'
    ? family.quantityWarningThreshold
    : GENERAL_COMMERCIAL_APPEARANCE_THRESHOLD;

  return quantity > threshold ? QUANTITY_WARNING_TEXT : null;
}

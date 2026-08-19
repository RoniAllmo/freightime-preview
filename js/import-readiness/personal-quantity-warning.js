/**
 * Personal-import quantity safeguard: a simple, optional "כמות משוערת"
 * field on the personal-import product route. There is NO general,
 * application-wide quantity threshold -- a warning is only ever shown
 * for a family the product owner has explicitly reviewed and listed
 * in `personalQuantityReviewRules` below. Every other family, no
 * matter the quantity entered, produces no quantity warning at all.
 *
 * Pure, DOM-free. The quantity value itself never leaves this module's
 * callers' in-memory state -- no transmission, no storage, no URL use.
 */

export const QUANTITY_WARNING_TEXT =
  'הכמות שנמסרה עשויה להיחשב כבעלת אופי מסחרי. מומלץ לבדוק את מסלול היבוא לפני ההזמנה או השילוח.';

/**
 * The one explicit, product-owner-maintained location for reviewed
 * personal-import quantity-warning rules. Adding a family here is a
 * deliberate, reviewed decision -- there is no fallback/default rule
 * that applies to a family not listed here.
 *
 * Each entry:
 *   familyId          the matrix family's `id` (product-family-matrix.js)
 *   aboveQuantity     the warning fires when the entered quantity is
 *                     strictly greater than this reviewed number
 *   warningText       the exact approved public sentence
 *   reviewed          must be true for the rule to ever apply -- an
 *                     entry present but not yet reviewed is inert
 */
export const personalQuantityReviewRules = Object.freeze([
  Object.freeze({
    familyId: 'health-and-cosmetics-01', // תמרוקים ובשמים (includes לק ג'ל)
    aboveQuantity: 20,
    warningText: QUANTITY_WARNING_TEXT,
    reviewed: true,
  }),
]);

function findReviewRule(familyId) {
  if (!familyId) return null;
  return personalQuantityReviewRules.find((rule) => rule.reviewed && rule.familyId === familyId) ?? null;
}

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
 * @param {{ rawQuantity: string|number|null|undefined, family?: { id?: string } }} params
 * @returns {string|null} the exact approved warning sentence, or null when
 *   no reviewed rule applies to this family (or the quantity does not
 *   exceed that rule's reviewed number).
 */
export function evaluatePersonalQuantityWarning({ rawQuantity, family } = {}) {
  const quantity = parsePositiveWholeQuantity(rawQuantity);
  if (quantity === null) return null;

  const rule = findReviewRule(family && family.id);
  if (!rule) return null;

  return quantity > rule.aboveQuantity ? rule.warningText : null;
}

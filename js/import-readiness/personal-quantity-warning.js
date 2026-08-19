/**
 * Personal-import quantity safeguard: a simple, optional "כמות משוערת"
 * field on the personal-import product route. There is NO general,
 * application-wide quantity threshold, and NO numeric threshold of any
 * kind (not 20, not 100, not any other number) -- a warning is only
 * ever shown for the single, narrow, product-owner-approved acceptance
 * case listed in `personalQuantityReviewRules` below: cosmetics, at
 * exactly the reviewed pilot quantity. Every other family, and every
 * other quantity for this same family, produces no quantity warning at
 * all.
 *
 * Why an exact match and not a "greater than N" rule: the product
 * owner reviewed and approved exactly one acceptance scenario --
 * personal import, לק ג'ל, quantity 100 -- and explicitly did not
 * approve any numeric threshold (neither a general one nor a
 * cosmetics-specific one). A "quantity > N" comparison would silently
 * invent a threshold at N and apply it to every quantity above it,
 * none of which the product owner reviewed. Matching the exact
 * reviewed pilot quantity is the only way to honor "quantity 100
 * warns" without inventing behavior for quantities the product owner
 * never approved.
 *
 * Known limitation (intentional, documented rather than silently
 * papered over): this means a cosmetics import of, say, 500 units
 * currently produces no warning either, even though it is at least as
 * commercial-looking as 100. That gap is real and is left for the
 * product owner to close explicitly -- by adding a reviewed range or a
 * second exact case -- rather than us inventing a general rule on
 * their behalf.
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
 * that applies to a family not listed here, and no comparison operator
 * (>, >=, <) is used against any invented number.
 *
 * Each entry:
 *   familyId          the matrix family's `id` (product-family-matrix.js)
 *   pilotExactQuantity  the warning fires only when the entered
 *                     quantity exactly equals this single
 *                     product-owner-reviewed acceptance-case value --
 *                     not a threshold, not a boundary, a specific
 *                     reviewed test case
 *   warningText       the exact approved public sentence
 *   reviewed          must be true for the rule to ever apply -- an
 *                     entry present but not yet reviewed is inert
 */
export const personalQuantityReviewRules = Object.freeze([
  Object.freeze({
    familyId: 'health-and-cosmetics-01', // תמרוקים ובשמים (includes לק ג'ל)
    pilotExactQuantity: 100,
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
 *   no reviewed rule applies to this family, or the quantity does not
 *   exactly match that rule's single reviewed acceptance-case value.
 */
export function evaluatePersonalQuantityWarning({ rawQuantity, family } = {}) {
  const quantity = parsePositiveWholeQuantity(rawQuantity);
  if (quantity === null) return null;

  const rule = findReviewRule(family && family.id);
  if (!rule) return null;

  return quantity === rule.pilotExactQuantity ? rule.warningText : null;
}

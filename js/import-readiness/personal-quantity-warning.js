/**
 * Personal-import quantity parsing: a simple, optional "כמות משוערת"
 * field on the personal-import product route.
 *
 * There is NO numeric quantity trigger and NO numeric threshold of any
 * kind here, or anywhere else in this codebase (not 20, not exactly
 * 100, not a range, not any other number). An earlier pilot version of
 * this module used an exact match against quantity 100 to decide
 * whether to show a cautious warning for cosmetics -- that was removed
 * because the product owner's "לק ג'ל, quantity 100" acceptance
 * scenario was an EXAMPLE proving a personal-import shipment can
 * warrant a commercial-character review, not approval of the number
 * 100 as a trigger value. Inferring commercial character from any
 * specific quantity number invents behavior the product owner never
 * reviewed for any quantity other than the one example given.
 *
 * The replacement is a direct question, not a number: see
 * `personal-use-clarification.js`, which asks the user whether the
 * shipment is for personal use only, for a small, explicit,
 * product-owner-maintained list of sensitive families, whenever a
 * quantity was entered at all (any positive whole number, not a
 * specific one). This module now only contains the shared quantity
 * parsing helper that both the (removed) old mechanism and the new
 * question-gating logic have always needed.
 *
 * Pure, DOM-free. The quantity value itself never leaves this module's
 * callers' in-memory state -- no transmission, no storage, no URL use.
 */

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

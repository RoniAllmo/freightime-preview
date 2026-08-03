/**
 * Input normalization layer for the FreighTime Single-input tracking router.
 *
 * Responsibility: convert a raw user-entered string into a normalized input
 * model (see TRACKING_ROUTER_DESIGN.md, Section 4) that downstream detectors
 * can consume without each re-implementing trimming/casing/compacting rules.
 *
 * Must NOT contain: identifier-type detection, carrier logic, routing
 * decisions, or any DOM/UI manipulation. This module only transforms a
 * string into a structured, still-untyped, normalized representation.
 *
 * STRUCTURAL STAGE NOTICE: this is a placeholder implementation only.
 * The real normalization rules (trim, uppercase, compact, digits-only,
 * length, letter/digit presence flags) described in
 * TRACKING_ROUTER_DESIGN.md Section 4 are not yet implemented.
 */

/**
 * Produce a normalized input object from raw user input.
 *
 * Placeholder behavior: preserves the original input and marks the result
 * as not yet normalized. Does not mutate the supplied value. Does not
 * implement trimming, casing, compacting, or digit extraction yet.
 *
 * @param {string} rawInput - The raw string value from the tracking input.
 * @returns {{
 *   originalInput: string,
 *   trimmedInput: null,
 *   uppercaseInput: null,
 *   compactInput: null,
 *   digitsOnly: null,
 *   length: null,
 *   hasLetters: null,
 *   hasDigits: null,
 *   normalized: false,
 *   note: string
 * }} A placeholder normalized-input object. Fields other than
 *   `originalInput` are intentionally unset until this stage is
 *   authorized for real implementation.
 */
export function normalizeTrackingInput(rawInput) {
  return {
    originalInput: rawInput,
    trimmedInput: null,
    uppercaseInput: null,
    compactInput: null,
    digitsOnly: null,
    length: null,
    hasLetters: null,
    hasDigits: null,
    normalized: false,
    note: 'Placeholder only: normalization rules are not yet implemented.',
  };
}

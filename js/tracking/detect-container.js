/**
 * Ocean container identifier detector for the FreighTime Single-input
 * tracking router.
 *
 * Responsibility: evaluate an already-normalized input (produced by
 * `normalizeTrackingInput` in normalize.js) against the standard ISO-style
 * freight-container structure — 4 ASCII letters followed by 7 digits (11
 * alphanumeric characters total) — and, when the structure matches, verify
 * the ISO 6346 check digit.
 *
 * This module reports a *structural and check-digit* result only. It does
 * not identify a carrier, does not infer ownership from the 4-letter
 * prefix, does not add tracking URLs, and does not retrieve any external
 * tracking data. The 4-letter prefix in an ISO 6346 container number
 * represents an owner code and equipment category identifier — it is not
 * proof of which ocean carrier operates the container, so it must never be
 * treated as a carrier match.
 *
 * Must NOT contain: carrier selection, routing decisions, user-facing
 * display text, or knowledge of the other detectors (air waybill,
 * courier). This module only judges the "ocean container" identifier type
 * in isolation, using `normalizedInput.alphanumericInput` as produced by
 * normalize.js. It does not repeat normalize.js's trimming/casing/
 * compacting logic and does not access `normalizedInput`'s original raw
 * input.
 */

/**
 * The four possible detector reason/action keys used by this module.
 * These are stable technical keys, not user-facing display text.
 */
const REASON_VALID_CONTAINER = 'container_structure_and_check_digit_valid';
const REASON_INVALID_CHECK_DIGIT = 'container_structure_valid_check_digit_invalid';
const REASON_NOT_CONTAINER_STRUCTURE = 'not_container_structure';

const ACTION_PROCEED_TO_CARRIER_MATCHING = 'proceed_to_carrier_matching';
const ACTION_ASK_USER_TO_VERIFY = 'ask_user_to_verify_identifier';
const ACTION_CONTINUE_OTHER_DETECTORS = 'continue_other_detectors';

/**
 * Matches exactly 4 ASCII letters followed by exactly 7 digits. Exported
 * (in addition to being used internally below) so that other modules --
 * e.g. `js/tools/container-validator-tool.js` -- can recognize the same
 * structure without duplicating this pattern.
 */
export const CONTAINER_STRUCTURE_PATTERN = /^[A-Z]{4}[0-9]{7}$/;

/**
 * ISO 6346 letter-to-value table. Values run from 10 upward, skipping
 * every multiple of 11, until all 26 letters (A-Z) have a value.
 *
 * @returns {number[]} A 26-entry array; index 0 is 'A', index 25 is 'Z'.
 */
function buildIso6346LetterValues() {
  const values = [];
  let candidate = 10;
  while (values.length < 26) {
    if (candidate % 11 !== 0) {
      values.push(candidate);
    }
    candidate += 1;
  }
  return values;
}

const ISO_6346_LETTER_VALUES = buildIso6346LetterValues();

/**
 * Resolve the ISO 6346 numeric value of a single character (digit or
 * uppercase ASCII letter).
 *
 * @param {string} char - A single character, expected to be '0'-'9' or
 *   'A'-'Z'.
 * @returns {number} The character's ISO 6346 value.
 */
function iso6346CharValue(char) {
  if (char >= '0' && char <= '9') {
    return Number(char);
  }
  return ISO_6346_LETTER_VALUES[char.charCodeAt(0) - 65];
}

/**
 * Calculate the ISO 6346 check digit for a 10-character container prefix
 * (4 letters + 6 digits).
 *
 * Algorithm:
 * 1. Each of the 10 characters is mapped to its ISO 6346 numeric value
 *    (digits map to themselves; letters map via `ISO_6346_LETTER_VALUES`,
 *    a sequence starting at 10 that skips multiples of 11).
 * 2. Each value is multiplied by a positional weight of 2^i, where i is
 *    the character's zero-based position from the left (2^0 for the
 *    first character, up to 2^9 for the tenth).
 * 3. The weighted values are summed and reduced modulo 11.
 * 4. A remainder of 10 maps to a check digit of 0; any other remainder
 *    (0-9) is used as-is.
 *
 * Exported (in addition to being used internally below) so that other
 * modules -- e.g. `js/tools/container-validator-tool.js` -- can compute
 * the same expected check digit without duplicating this algorithm.
 *
 * @param {string} first10Chars - Exactly 10 characters: 4 ASCII letters
 *   followed by 6 digits.
 * @returns {number} The expected check digit (0-9).
 */
export function calculateIso6346CheckDigit(first10Chars) {
  let weightedSum = 0;
  for (let position = 0; position < 10; position += 1) {
    const value = iso6346CharValue(first10Chars[position]);
    weightedSum += value * Math.pow(2, position);
  }
  const remainder = weightedSum % 11;
  return remainder === 10 ? 0 : remainder;
}

/**
 * Build a frozen detector result object. Centralizes the shared shape so
 * every return path produces exactly the required public fields.
 *
 * @returns {Readonly<object>} A frozen structured detection-result object.
 */
function buildResult({
  identifierType,
  matched,
  normalizedIdentifier,
  confidence,
  valid,
  ambiguous,
  reason,
  recommendedAction,
}) {
  return Object.freeze({
    identifierType,
    matched,
    normalizedIdentifier,
    possibleCarriers: Object.freeze([]),
    confidence,
    valid,
    ambiguous,
    reason,
    recommendedAction,
  });
}

/**
 * Build the "not a container structure" result, safely reusing whatever
 * alphanumeric identifier is available (or an empty string if none is
 * safely available).
 *
 * @param {string} safeIdentifier - The alphanumeric identifier to report,
 *   or an empty string.
 * @returns {Readonly<object>} A frozen "unknown" detector result.
 */
function buildUnknownResult(safeIdentifier) {
  return buildResult({
    identifierType: 'unknown',
    matched: false,
    normalizedIdentifier: safeIdentifier,
    confidence: 'none',
    valid: false,
    ambiguous: false,
    reason: REASON_NOT_CONTAINER_STRUCTURE,
    recommendedAction: ACTION_CONTINUE_OTHER_DETECTORS,
  });
}

/**
 * Evaluate a normalized input for a possible ocean container match.
 *
 * Reads only `normalizedInput.alphanumericInput` (already produced by
 * `normalizeTrackingInput` in normalize.js — this function does not
 * repeat trimming/casing/compacting logic and does not read
 * `normalizedInput`'s original raw input). Never throws: a missing,
 * malformed, or unsupported `normalizedInput` safely yields the "unknown"
 * result shape.
 *
 * Structural match vs. valid check digit are reported distinctly:
 * - If the value does not match the 4-letters-then-7-digits structure,
 *   `identifierType` is `"unknown"` and `matched` is `false`.
 * - If the structure matches but the ISO 6346 check digit is wrong,
 *   `identifierType` is `"ocean-container"` and `matched` is `true`, but
 *   `valid` is `false` — the shape looks like a container number, but the
 *   specific number did not pass validation.
 * - Only when both the structure and the check digit are correct is
 *   `valid` also `true`.
 *
 * This function performs no carrier identification (the 4-letter prefix
 * is never interpreted as an operating carrier) and retrieves no external
 * tracking data; `possibleCarriers` is always an empty, frozen array.
 *
 * @param {{alphanumericInput?: string}} normalizedInput - The normalized
 *   input object produced by `normalizeTrackingInput` in normalize.js.
 * @returns {Readonly<{
 *   identifierType: 'ocean-container'|'unknown',
 *   matched: boolean,
 *   normalizedIdentifier: string,
 *   possibleCarriers: ReadonlyArray<never>,
 *   confidence: 'high'|'medium'|'none',
 *   valid: boolean,
 *   ambiguous: false,
 *   reason: string,
 *   recommendedAction: string
 * }>} A frozen structured detector result.
 */
export function detectContainer(normalizedInput) {
  const hasUsableField =
    normalizedInput !== null &&
    normalizedInput !== undefined &&
    typeof normalizedInput === 'object' &&
    typeof normalizedInput.alphanumericInput === 'string';

  if (!hasUsableField) {
    return buildUnknownResult('');
  }

  const candidate = normalizedInput.alphanumericInput;

  if (candidate.length !== 11 || !CONTAINER_STRUCTURE_PATTERN.test(candidate)) {
    return buildUnknownResult(candidate);
  }

  const prefix = candidate.slice(0, 10);
  const suppliedCheckDigit = Number(candidate[10]);
  const expectedCheckDigit = calculateIso6346CheckDigit(prefix);

  if (suppliedCheckDigit === expectedCheckDigit) {
    return buildResult({
      identifierType: 'ocean-container',
      matched: true,
      normalizedIdentifier: candidate,
      confidence: 'high',
      valid: true,
      ambiguous: false,
      reason: REASON_VALID_CONTAINER,
      recommendedAction: ACTION_PROCEED_TO_CARRIER_MATCHING,
    });
  }

  return buildResult({
    identifierType: 'ocean-container',
    matched: true,
    normalizedIdentifier: candidate,
    confidence: 'medium',
    valid: false,
    ambiguous: false,
    reason: REASON_INVALID_CHECK_DIGIT,
    recommendedAction: ACTION_ASK_USER_TO_VERIFY,
  });
}

/**
 * Air waybill (AWB) identifier detector for the FreighTime Single-input
 * tracking router.
 *
 * Responsibility: evaluate an already-normalized input (produced by
 * `normalizeTrackingInput` in normalize.js) against the standard 11-digit
 * master air waybill structure:
 *
 *   PPPSSSSSSSC
 *
 *   - PPP        : 3-digit airline accounting prefix
 *   - SSSSSSS    : 7-digit serial number (leading zeros significant)
 *   - C          : 1 check digit, the unweighted Modulus 7 remainder of
 *                  the 7-digit serial number
 *
 * This detector does NOT accept raw user input directly — it only reads
 * `normalizedInput.alphanumericInput`, which normalize.js has already
 * produced from the raw value (e.g. `123-12345678`, `12312345678`, or
 * `123 12345678` all normalize to the same 11-digit alphanumeric string
 * before reaching this module). This module does not repeat normalize.js's
 * trimming/casing/compacting logic and does not read `normalizedInput`'s
 * original raw input.
 *
 * This module reports a *structural and check-digit* result only. It does
 * not identify an airline from the 3-digit accounting prefix, does not
 * add tracking URLs, does not maintain a list of airline prefixes, and
 * retrieves no external tracking data. Airline-prefix matching is a
 * separate, later stage.
 *
 * Must NOT contain: airline/carrier selection, routing decisions,
 * user-facing display text, or knowledge of the other detectors (ocean
 * container, courier).
 */

/** Stable technical reason/action keys — not user-facing display text. */
const REASON_VALID_AWB = 'awb_structure_and_check_digit_valid';
const REASON_INVALID_CHECK_DIGIT = 'awb_structure_valid_check_digit_invalid';
const REASON_NOT_AWB_STRUCTURE = 'not_awb_structure';

const ACTION_PROCEED_TO_AIRLINE_MATCHING = 'proceed_to_airline_prefix_matching';
const ACTION_ASK_USER_TO_VERIFY = 'ask_user_to_verify_identifier';
const ACTION_CONTINUE_OTHER_DETECTORS = 'continue_other_detectors';

/**
 * Matches exactly 11 digits and nothing else. Applied to
 * `alphanumericInput` (not `digitsOnly`) so that a value containing
 * letters plus 11 embedded digits is correctly rejected rather than
 * incorrectly accepted as an AWB.
 */
const AWB_STRUCTURE_PATTERN = /^[0-9]{11}$/;

/**
 * Calculate the unweighted Modulus 7 check digit for a 7-digit AWB serial
 * number.
 *
 * Algorithm:
 * 1. The first three digits of the AWB (the airline accounting prefix)
 *    are ignored for this calculation.
 * 2. The next seven digits are the serial number, interpreted as a
 *    decimal integer (leading zeros do not change the numeric value used
 *    here, though they are preserved in the reported
 *    `normalizedIdentifier`).
 * 3. The serial number is divided by 7; the remainder (0-6) is the
 *    expected check digit.
 *
 * @param {string} serial7Digits - Exactly 7 digit characters.
 * @returns {number} The expected check digit (0-6).
 */
function calculateModulus7CheckDigit(serial7Digits) {
  return Number(serial7Digits) % 7;
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
 * Build the "not an AWB structure" result, safely reusing whatever
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
    reason: REASON_NOT_AWB_STRUCTURE,
    recommendedAction: ACTION_CONTINUE_OTHER_DETECTORS,
  });
}

/**
 * Evaluate a normalized input for a possible air waybill match.
 *
 * Reads only `normalizedInput.alphanumericInput`. Never throws: a
 * missing, malformed, or unsupported `normalizedInput` safely yields the
 * "unknown" result shape and retains no unsafe object reference.
 *
 * Structural match vs. valid check digit are reported distinctly:
 * - If the value is not exactly 11 digits, `identifierType` is
 *   `"unknown"` and `matched` is `false`. This includes values that
 *   contain letters alongside 11 embedded digits — such values are
 *   rejected, not accepted via `digitsOnly`.
 * - If the value is 11 digits but the Modulus 7 check digit does not
 *   match, `identifierType` is `"air-waybill"` and `matched` is `true`,
 *   but `valid` is `false` — the shape looks like an AWB, but the
 *   specific number did not pass validation.
 * - Only when both the structure and the check digit are correct is
 *   `valid` also `true`.
 *
 * This function performs no airline identification (the 3-digit
 * accounting prefix is never interpreted as an operating airline) and
 * retrieves no external tracking data; `possibleCarriers` is always an
 * empty, frozen array.
 *
 * @param {{alphanumericInput?: string}} normalizedInput - The normalized
 *   input object produced by `normalizeTrackingInput` in normalize.js.
 * @returns {Readonly<{
 *   identifierType: 'air-waybill'|'unknown',
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
export function detectAwb(normalizedInput) {
  const hasUsableField =
    normalizedInput !== null &&
    normalizedInput !== undefined &&
    typeof normalizedInput === 'object' &&
    typeof normalizedInput.alphanumericInput === 'string';

  if (!hasUsableField) {
    return buildUnknownResult('');
  }

  const candidate = normalizedInput.alphanumericInput;

  if (candidate.length !== 11 || !AWB_STRUCTURE_PATTERN.test(candidate)) {
    return buildUnknownResult(candidate);
  }

  const serial = candidate.slice(3, 10);
  const suppliedCheckDigit = Number(candidate[10]);
  const expectedCheckDigit = calculateModulus7CheckDigit(serial);

  if (suppliedCheckDigit === expectedCheckDigit) {
    return buildResult({
      identifierType: 'air-waybill',
      matched: true,
      normalizedIdentifier: candidate,
      confidence: 'high',
      valid: true,
      ambiguous: false,
      reason: REASON_VALID_AWB,
      recommendedAction: ACTION_PROCEED_TO_AIRLINE_MATCHING,
    });
  }

  return buildResult({
    identifierType: 'air-waybill',
    matched: true,
    normalizedIdentifier: candidate,
    confidence: 'medium',
    valid: false,
    ambiguous: false,
    reason: REASON_INVALID_CHECK_DIGIT,
    recommendedAction: ACTION_ASK_USER_TO_VERIFY,
  });
}

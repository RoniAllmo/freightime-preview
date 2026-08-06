/**
 * UPU S10 postal identifier detector for the FreighTime Single-input
 * tracking router.
 *
 * Responsibility: evaluate an already-normalized input (produced by
 * `normalizeTrackingInput` in normalize.js) against the standard 13-character
 * UPU S10 structure and, when the structure matches, verify the S10 check
 * digit. This detector performs *structural and mathematical* validation
 * only, per the boundary-mapping evidence recorded in
 * `S10_AUTHORITATIVE_VERIFICATION.md`.
 *
 * S10 structure (13 characters total):
 *   - Positions 1-2:  two ASCII letters, the service indicator.
 *   - Positions 3-10: eight decimal digits, the serial number.
 *   - Position 11:    one decimal digit, the check digit.
 *   - Positions 12-13: two ASCII letters, the issuing-country code.
 *
 * Check-digit algorithm (verified against the official UPU S10 check-digit
 * validation tool, see S10_AUTHORITATIVE_VERIFICATION.md):
 *   1. Each of the eight serial digits (positions 3-10, left to right) is
 *      multiplied by a fixed positional weight: 8, 6, 4, 2, 3, 5, 9, 7.
 *   2. The eight weighted products are summed.
 *   3. The sum is reduced modulo 11.
 *   4. The intermediate result is `11 - (sum mod 11)`.
 *   5. The intermediate result is mapped to the final check digit:
 *      - intermediate 10 -> check digit 0
 *      - intermediate 11 -> check digit 5
 *      - any other intermediate value (0-9) -> used as-is
 *   6. The final check digit is compared with position 11.
 *
 * EMS classification (approved 2026-08-04, see POSTAL_DETECTOR_DESIGN.md's
 * "EMS classification decision" section and EMS_CLASSIFICATION_RESEARCH.md,
 * both based on direct inspection of the original UPU Technical Standard
 * S10 document): a structurally and mathematically valid S10 identifier
 * whose two-letter service indicator falls in the range `EA`-`EZ` is
 * recognized as EMS. `EA`-`EW` is the standard (non-bilateral) EMS
 * sub-range; `EX`-`EZ` remains EMS but requires bilateral agreement
 * between designated postal operators — a distinction represented *only*
 * through the `reason` key (`s10_ems_standard_valid` vs.
 * `s10_ems_bilateral_valid`), never through a new public field or a
 * different `identifierType`. Both EMS sub-ranges are still reported as
 * `identifierType: "international-postal"`, exactly like every other S10
 * category — EMS is a service classification within that family, not a
 * separate top-level type. A value merely *starting* with the letter "E"
 * is never sufficient by itself: classification requires the complete
 * two-letter service indicator to fall within `EA`-`EZ`, and requires
 * both a valid S10 structure and a valid S10 check digit; a structurally
 * valid `EA`-`EZ` identifier whose check digit is invalid is reported
 * with `reason: "s10_ems_invalid_check_digit"`, not as any kind of
 * EMS-confirmed result. This module performs no other service-category
 * classification for non-`E` service indicators, no postal-operator
 * identification (EMS or otherwise), and no Israel Post identification —
 * those remain explicitly out of scope and deferred to a separately
 * authorized future stage (see POSTAL_DETECTOR_DESIGN.md Sections 6-8,
 * 18, and 20).
 *
 * The two-letter issuing-country code (positions 12-13) is treated only as
 * a structural component here — it is not validated against an ISO country
 * list, translated, exposed as metadata, or used to infer a destination or
 * postal operator.
 *
 * This module retrieves no external tracking data, makes no network
 * request, and does not interact with the assistant/chat interface.
 *
 * Must NOT contain: EMS/service-category classification, carrier or postal-
 * operator selection, routing decisions, user-facing display text, or
 * knowledge of the other detectors (ocean container, air waybill, courier).
 * This module only judges the "international postal (S10)" identifier type
 * in isolation, using `normalizedInput.alphanumericInput` as produced by
 * normalize.js. It does not repeat normalize.js's trimming/casing/
 * compacting logic and does not access `normalizedInput`'s original raw
 * input.
 */

/** Stable technical reason/action keys — not user-facing display text. */
const REASON_S10_VALID = 's10_valid';
const REASON_S10_INVALID_CHECK_DIGIT = 's10_invalid_check_digit';
const REASON_NOT_S10_STRUCTURE = 'not_s10_structure';
const REASON_S10_EMS_STANDARD_VALID = 's10_ems_standard_valid';
const REASON_S10_EMS_BILATERAL_VALID = 's10_ems_bilateral_valid';
const REASON_S10_EMS_INVALID_CHECK_DIGIT = 's10_ems_invalid_check_digit';

const ACTION_POSTAL_SERVICE_CLASSIFICATION_PENDING = 'postal_service_classification_pending';
const ACTION_VERIFY_IDENTIFIER = 'verify_identifier';
const ACTION_CONTINUE_OTHER_DETECTORS = 'continue_other_detectors';
const ACTION_EMS_SERVICE_IDENTIFIED = 'ems_service_identified';

/**
 * Approved EMS service-indicator sub-range boundaries (inclusive), per
 * POSTAL_DETECTOR_DESIGN.md's "EMS classification decision" section.
 * `EA`-`EW` is the standard sub-range; `EX`-`EZ` is the bilateral
 * sub-range. Both remain part of the EMS classification.
 */
const EMS_STANDARD_RANGE_START = 'EA';
const EMS_STANDARD_RANGE_END = 'EW';
const EMS_BILATERAL_RANGE_START = 'EX';
const EMS_BILATERAL_RANGE_END = 'EZ';

/**
 * Classify a complete, already-structurally-valid two-letter service
 * indicator as standard EMS, bilateral EMS, or non-EMS. Requires the
 * complete two-letter indicator to fall within `EA`-`EZ` — a leading "E"
 * alone is never sufficient.
 *
 * @param {string} serviceIndicator - Exactly 2 uppercase ASCII letters.
 * @returns {'standard'|'bilateral'|null} The EMS sub-range, or `null` if
 *   the indicator is not within `EA`-`EZ`.
 */
function classifyEmsServiceIndicator(serviceIndicator) {
  if (serviceIndicator >= EMS_STANDARD_RANGE_START && serviceIndicator <= EMS_STANDARD_RANGE_END) {
    return 'standard';
  }
  if (serviceIndicator >= EMS_BILATERAL_RANGE_START && serviceIndicator <= EMS_BILATERAL_RANGE_END) {
    return 'bilateral';
  }
  return null;
}

/**
 * Matches exactly: 2 ASCII letters, 8 digits, 1 digit, 2 ASCII letters
 * (13 characters total). Not exported — kept private to this module.
 */
const S10_STRUCTURE_PATTERN = /^[A-Z]{2}[0-9]{9}[A-Z]{2}$/;

/** Verified positional weights for the eight serial digits, left to right. */
const S10_SERIAL_WEIGHTS = [8, 6, 4, 2, 3, 5, 9, 7];

/**
 * Calculate the S10 check digit for an 8-digit serial number, applying the
 * verified boundary-case mapping (10 -> 0, 11 -> 5).
 *
 * @param {string} serial8Digits - Exactly 8 digit characters.
 * @returns {number} The expected check digit (0-9).
 */
function calculateS10CheckDigit(serial8Digits) {
  let weightedSum = 0;
  for (let position = 0; position < 8; position += 1) {
    const digit = Number(serial8Digits[position]);
    weightedSum += digit * S10_SERIAL_WEIGHTS[position];
  }
  const remainder = weightedSum % 11;
  const intermediateResult = 11 - remainder;
  if (intermediateResult === 10) {
    return 0;
  }
  if (intermediateResult === 11) {
    return 5;
  }
  return intermediateResult;
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
 * Build the "not an S10 structure" result, safely reusing whatever
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
    reason: REASON_NOT_S10_STRUCTURE,
    recommendedAction: ACTION_CONTINUE_OTHER_DETECTORS,
  });
}

/**
 * Evaluate a normalized input for a possible UPU S10 postal identifier
 * match.
 *
 * Reads only `normalizedInput.alphanumericInput` (already produced by
 * `normalizeTrackingInput` in normalize.js — this function does not
 * repeat trimming/casing/compacting logic and does not read
 * `normalizedInput`'s original raw input, and does not use `digitsOnly`
 * to accept an identifier). Never throws: a missing, malformed, or
 * unsupported `normalizedInput` safely yields the "unknown" result shape.
 *
 * Structural match vs. valid check digit are reported distinctly:
 * - If the value does not match the 13-character S10 structure,
 *   `identifierType` is `"unknown"` and `matched` is `false`.
 * - If the structure matches but the check digit is wrong,
 *   `identifierType` is `"international-postal"` and `matched` is `true`,
 *   but `valid` is `false`.
 * - Only when both the structure and the check digit are correct is
 *   `valid` also `true`.
 *
 * This function classifies only the approved EMS sub-ranges (`EA`-`EW`
 * standard, `EX`-`EZ` bilateral) via the `reason` key, per the "EMS
 * classification decision" in POSTAL_DETECTOR_DESIGN.md — it performs no
 * other service-category classification, no postal-operator
 * identification, and retrieves no external tracking data;
 * `possibleCarriers` is always an empty, frozen array.
 *
 * @param {{alphanumericInput?: string}} normalizedInput - The normalized
 *   input object produced by `normalizeTrackingInput` in normalize.js.
 * @returns {Readonly<{
 *   identifierType: 'international-postal'|'unknown',
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
export function detectPostal(normalizedInput) {
  const hasUsableField =
    normalizedInput !== null &&
    normalizedInput !== undefined &&
    typeof normalizedInput === 'object' &&
    typeof normalizedInput.alphanumericInput === 'string';

  if (!hasUsableField) {
    return buildUnknownResult('');
  }

  const candidate = normalizedInput.alphanumericInput;

  if (candidate.length !== 13 || !S10_STRUCTURE_PATTERN.test(candidate)) {
    return buildUnknownResult(candidate);
  }

  const serviceIndicator = candidate.slice(0, 2);
  const serial = candidate.slice(2, 10);
  const suppliedCheckDigit = Number(candidate[10]);
  const expectedCheckDigit = calculateS10CheckDigit(serial);
  const emsClassification = classifyEmsServiceIndicator(serviceIndicator);

  if (suppliedCheckDigit === expectedCheckDigit) {
    if (emsClassification === 'standard') {
      return buildResult({
        identifierType: 'international-postal',
        matched: true,
        normalizedIdentifier: candidate,
        confidence: 'high',
        valid: true,
        ambiguous: false,
        reason: REASON_S10_EMS_STANDARD_VALID,
        recommendedAction: ACTION_EMS_SERVICE_IDENTIFIED,
      });
    }

    if (emsClassification === 'bilateral') {
      return buildResult({
        identifierType: 'international-postal',
        matched: true,
        normalizedIdentifier: candidate,
        confidence: 'high',
        valid: true,
        ambiguous: false,
        reason: REASON_S10_EMS_BILATERAL_VALID,
        recommendedAction: ACTION_EMS_SERVICE_IDENTIFIED,
      });
    }

    return buildResult({
      identifierType: 'international-postal',
      matched: true,
      normalizedIdentifier: candidate,
      confidence: 'high',
      valid: true,
      ambiguous: false,
      reason: REASON_S10_VALID,
      recommendedAction: ACTION_POSTAL_SERVICE_CLASSIFICATION_PENDING,
    });
  }

  if (emsClassification !== null) {
    return buildResult({
      identifierType: 'international-postal',
      matched: true,
      normalizedIdentifier: candidate,
      confidence: 'medium',
      valid: false,
      ambiguous: false,
      reason: REASON_S10_EMS_INVALID_CHECK_DIGIT,
      recommendedAction: ACTION_VERIFY_IDENTIFIER,
    });
  }

  return buildResult({
    identifierType: 'international-postal',
    matched: true,
    normalizedIdentifier: candidate,
    confidence: 'medium',
    valid: false,
    ambiguous: false,
    reason: REASON_S10_INVALID_CHECK_DIGIT,
    recommendedAction: ACTION_VERIFY_IDENTIFIER,
  });
}

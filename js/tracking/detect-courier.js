/**
 * Commercial courier tracking-number detector for the FreighTime
 * Single-input tracking router.
 *
 * Responsibility: evaluate an already-normalized input (produced by
 * `normalizeTrackingInput` in normalize.js) against the UPS structural
 * rules approved in COURIER_IMPLEMENTATION_DECISION.md (the first
 * commercial-courier implementation wave). This detector does not accept
 * or normalize raw input directly — it only reads
 * `normalizedInput.alphanumericInput`, which normalize.js has already
 * uppercased and stripped of separators. It does not repeat normalize.js's
 * trimming/casing/compacting logic, does not use `digitsOnly` as matching
 * input, and does not read `normalizedInput`'s original raw input.
 *
 * Approved UPS structures (COURIER_IMPLEMENTATION_DECISION.md Section 5,
 * 9, 13; UPS_COURIER_IDENTIFIER_RESEARCH.md Sections 6, 7, 10):
 *   - UPS Small Package "1Z": literal prefix `1Z` + 16 uppercase ASCII
 *     alphanumeric characters (`[0-9A-Z]`), 18 characters total.
 *   - UPS Roadie "1R" short: literal prefix `1R` + 14 uppercase ASCII
 *     alphanumeric characters, 16 characters total.
 *   - UPS Roadie "1R" long: literal prefix `1R` + 26 uppercase ASCII
 *     alphanumeric characters, 28 characters total.
 *
 * This detector reports a *structural* result only. `valid: true` for a
 * UPS match means only: "the identifier satisfies a directly verified
 * local UPS structural rule." It does NOT mean the shipment exists, that
 * UPS has confirmed the number, that a check digit was verified, or that
 * live tracking information was retrieved. No UPS check-digit algorithm
 * is implemented, approved, or implied anywhere in this module — no
 * official UPS source confirms one (UPS_COURIER_IDENTIFIER_RESEARCH.md
 * Section 9), and COURIER_IMPLEMENTATION_DECISION.md Section 10 requires
 * this distinction to be documented explicitly.
 *
 * A `1Z`- or `1R`-prefixed value that fails its full structural rule
 * (wrong length or disallowed characters) is reported as a recognized-but-
 * invalid structural match (`matched: true`, `valid: false`), never as a
 * "check digit failed" outcome — no check digit is computed here at all.
 *
 * Explicitly out of scope for this module (COURIER_IMPLEMENTATION_
 * DECISION.md Sections 5, 6, 7, 8, 9): UPS Mail Innovations (a distinct,
 * USPS-format identifier family, not `1Z`/`1R`-prefixed); DSV, DHL,
 * FedEx, and Aramex (all remain deferred pending stronger evidence, and
 * must never be returned as a possible carrier from this module); generic
 * numeric-only courier detection of any kind.
 *
 * This module makes no tracking URL, no API call, no OAuth request, no
 * external navigation, and retrieves no live tracking data — it performs
 * local, synchronous structural pattern matching only.
 *
 * Must NOT contain: carrier-registry population, routing decisions,
 * user-facing display text, or knowledge of the other detectors (ocean
 * container, air waybill, postal). This module only judges the
 * "commercial courier" identifier type in isolation.
 */

/** Stable technical reason/action keys — not user-facing display text. */
const REASON_UPS_1Z_VALID = 'ups_1z_structure_valid';
const REASON_UPS_ROADIE_1R_SHORT_VALID = 'ups_roadie_1r_short_structure_valid';
const REASON_UPS_ROADIE_1R_LONG_VALID = 'ups_roadie_1r_long_structure_valid';
const REASON_UPS_1Z_INVALID_STRUCTURE = 'ups_1z_invalid_structure';
const REASON_UPS_ROADIE_1R_INVALID_STRUCTURE = 'ups_roadie_1r_invalid_structure';
const REASON_NOT_SUPPORTED_COURIER_STRUCTURE = 'not_supported_courier_structure';

const ACTION_COURIER_CARRIER_IDENTIFIED = 'courier_carrier_identified';
const ACTION_VERIFY_IDENTIFIER = 'verify_identifier';
const ACTION_CONTINUE_OTHER_DETECTORS = 'continue_other_detectors';

const CARRIER_ID_UPS = 'ups';
const CARRIER_ID_UPS_ROADIE = 'ups-roadie';

/** Matches the complete UPS Small Package structure: `1Z` + 16 `[0-9A-Z]` (18 total). */
const UPS_1Z_STRUCTURE_PATTERN = /^1Z[0-9A-Z]{16}$/;
/** Matches the complete UPS Roadie short structure: `1R` + 14 `[0-9A-Z]` (16 total). */
const UPS_ROADIE_1R_SHORT_STRUCTURE_PATTERN = /^1R[0-9A-Z]{14}$/;
/** Matches the complete UPS Roadie long structure: `1R` + 26 `[0-9A-Z]` (28 total). */
const UPS_ROADIE_1R_LONG_STRUCTURE_PATTERN = /^1R[0-9A-Z]{26}$/;

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
  possibleCarriers,
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
    possibleCarriers: Object.freeze(possibleCarriers),
    confidence,
    valid,
    ambiguous,
    reason,
    recommendedAction,
  });
}

/**
 * Build the "not a supported courier structure" result, safely reusing
 * whatever alphanumeric identifier is available (or an empty string if
 * none is safely available). Never returns a possible carrier.
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
    possibleCarriers: [],
    confidence: 'none',
    valid: false,
    ambiguous: false,
    reason: REASON_NOT_SUPPORTED_COURIER_STRUCTURE,
    recommendedAction: ACTION_CONTINUE_OTHER_DETECTORS,
  });
}

/**
 * Evaluate a normalized input for a possible UPS commercial-courier
 * structural match.
 *
 * Reads only `normalizedInput.alphanumericInput` (already produced by
 * `normalizeTrackingInput` in normalize.js — this function does not
 * repeat trimming/casing/compacting logic, does not use `digitsOnly`,
 * and does not read `normalizedInput`'s original raw input). Never
 * throws: a missing, malformed, or unsupported `normalizedInput` safely
 * yields the "unknown" result shape and retains no unsafe object
 * reference.
 *
 * Three outcomes are reported distinctly:
 * - **Complete structural match** (`1Z` + exactly 16 `[0-9A-Z]`, or `1R`
 *   + exactly 14 or 26 `[0-9A-Z]`): `identifierType: "commercial-courier"`,
 *   `matched: true`, `valid: true`, `confidence: "high"`. `valid: true`
 *   here means only that the local structural rule is satisfied — see
 *   this module's header comment for what it explicitly does not mean.
 * - **Recognizable UPS prefix (`1Z`/`1R`) but incomplete structure**
 *   (wrong length or a disallowed character among the remaining
 *   positions): `identifierType: "commercial-courier"`, `matched: true`,
 *   `valid: false`, `confidence: "medium"`. This is a structural
 *   mismatch, not a failed check digit — no check digit is computed by
 *   this module.
 * - **No recognizable UPS prefix at all**: `identifierType: "unknown"`,
 *   `matched: false`, `confidence: "none"`, `possibleCarriers: []`. This
 *   includes generic numeric-only input and any input whose shape might
 *   coincidentally resemble another courier's claimed format — DSV, DHL,
 *   FedEx, and Aramex are never returned as a possible carrier by this
 *   module, consistent with COURIER_IMPLEMENTATION_DECISION.md Section 9.
 *
 * This function performs no check-digit validation, no UPS Mail
 * Innovations detection, no carrier-registry lookup, no tracking-URL
 * construction, and retrieves no external tracking data.
 *
 * @param {{alphanumericInput?: string}} normalizedInput - The normalized
 *   input object produced by `normalizeTrackingInput` in normalize.js.
 * @returns {Readonly<{
 *   identifierType: 'commercial-courier'|'unknown',
 *   matched: boolean,
 *   normalizedIdentifier: string,
 *   possibleCarriers: ReadonlyArray<'ups'|'ups-roadie'>,
 *   confidence: 'high'|'medium'|'none',
 *   valid: boolean,
 *   ambiguous: false,
 *   reason: string,
 *   recommendedAction: string
 * }>} A frozen structured detector result.
 */
export function detectCourier(normalizedInput) {
  const hasUsableField =
    normalizedInput !== null &&
    normalizedInput !== undefined &&
    typeof normalizedInput === 'object' &&
    typeof normalizedInput.alphanumericInput === 'string';

  if (!hasUsableField) {
    return buildUnknownResult('');
  }

  const candidate = normalizedInput.alphanumericInput;

  if (UPS_1Z_STRUCTURE_PATTERN.test(candidate)) {
    return buildResult({
      identifierType: 'commercial-courier',
      matched: true,
      normalizedIdentifier: candidate,
      possibleCarriers: [CARRIER_ID_UPS],
      confidence: 'high',
      valid: true,
      ambiguous: false,
      reason: REASON_UPS_1Z_VALID,
      recommendedAction: ACTION_COURIER_CARRIER_IDENTIFIED,
    });
  }

  if (UPS_ROADIE_1R_SHORT_STRUCTURE_PATTERN.test(candidate)) {
    return buildResult({
      identifierType: 'commercial-courier',
      matched: true,
      normalizedIdentifier: candidate,
      possibleCarriers: [CARRIER_ID_UPS_ROADIE],
      confidence: 'high',
      valid: true,
      ambiguous: false,
      reason: REASON_UPS_ROADIE_1R_SHORT_VALID,
      recommendedAction: ACTION_COURIER_CARRIER_IDENTIFIED,
    });
  }

  if (UPS_ROADIE_1R_LONG_STRUCTURE_PATTERN.test(candidate)) {
    return buildResult({
      identifierType: 'commercial-courier',
      matched: true,
      normalizedIdentifier: candidate,
      possibleCarriers: [CARRIER_ID_UPS_ROADIE],
      confidence: 'high',
      valid: true,
      ambiguous: false,
      reason: REASON_UPS_ROADIE_1R_LONG_VALID,
      recommendedAction: ACTION_COURIER_CARRIER_IDENTIFIED,
    });
  }

  if (candidate.startsWith('1Z')) {
    return buildResult({
      identifierType: 'commercial-courier',
      matched: true,
      normalizedIdentifier: candidate,
      possibleCarriers: [CARRIER_ID_UPS],
      confidence: 'medium',
      valid: false,
      ambiguous: false,
      reason: REASON_UPS_1Z_INVALID_STRUCTURE,
      recommendedAction: ACTION_VERIFY_IDENTIFIER,
    });
  }

  if (candidate.startsWith('1R')) {
    return buildResult({
      identifierType: 'commercial-courier',
      matched: true,
      normalizedIdentifier: candidate,
      possibleCarriers: [CARRIER_ID_UPS_ROADIE],
      confidence: 'medium',
      valid: false,
      ambiguous: false,
      reason: REASON_UPS_ROADIE_1R_INVALID_STRUCTURE,
      recommendedAction: ACTION_VERIFY_IDENTIFIER,
    });
  }

  return buildUnknownResult(candidate);
}

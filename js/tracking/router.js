/**
 * Router / orchestration layer for the FreighTime Single-input tracking
 * router (see TRACKING_ROUTER_DESIGN.md, Sections 6 and 8, and
 * POSTAL_DETECTOR_DESIGN.md, Section 12).
 *
 * Responsibility: take one raw shipment identifier, normalize it via
 * `normalizeTrackingInput` (normalize.js), run the currently active
 * detectors independently — `detectContainer` (detect-container.js),
 * `detectAwb` (detect-awb.js), and `detectPostal` (detect-postal.js) —
 * without letting any one of them exclusively "claim" the identifier, and
 * select a single structured router result from their combined output.
 *
 * All three active detectors always run, in this order — container, AWB,
 * postal — against the same normalized input, regardless of whether any
 * of them match. This is what allows ambiguity (more than one detector
 * matching) to be represented honestly instead of silently resolved by
 * whichever detector happens to run first.
 *
 * `detectPostal` recognizes the UPU S10 structure and validates its check
 * digit only (see S10_AUTHORITATIVE_VERIFICATION.md for the verified
 * algorithm and boundary-case mappings). It performs no EMS or other
 * service-category classification, and a valid S10 result is always
 * reported as `identifierType: "international-postal"` — never as EMS —
 * regardless of the identifier's service-indicator letters. Postal-
 * operator identification (including any Israel Post identification) is
 * not performed by this router or by `detectPostal`.
 *
 * Courier detection (`detectCourier` in detect-courier.js) is NOT active
 * in this stage. It remains an inactive placeholder module and is not
 * imported or called here; it is intentionally excluded from
 * `detectorResults` and from the ambiguity/match evaluation below.
 * Enabling it is a separate, later, authorized stage.
 *
 * This router performs no carrier or postal-operator identification —
 * `possibleCarriers` is always an empty, frozen array, and
 * `carrier-registry.js` is not imported or consulted at this stage. It
 * performs no external navigation, no DOM access, and no network
 * requests: `routingDecisionMade` is always `false`,
 * `externalUrlSelected` is always `null`, and
 * `externalNavigationOccurred` is always `false`. No live tracking data
 * is retrieved or displayed by this module.
 *
 * Structural matches and validity are reported distinctly: a detector can
 * report `matched: true` while `valid: false` (the shape resembles a
 * known identifier type, but the value failed check-digit validation).
 * The router surfaces this as `status: "recognized-invalid"` rather than
 * treating it as a full match.
 *
 * Ambiguity handling: if more than one active detector reports
 * `matched: true` for the same normalized input, the router returns
 * `status: "ambiguous"` and preserves all detector results rather than
 * silently selecting one. With the current container (4 letters + 7
 * digits), AWB (11 digits, no letters), and postal/S10 (13 characters:
 * 2 letters + 9 digits + 2 letters) formats, this branch is not naturally
 * reachable — no value can simultaneously satisfy more than one of these
 * mutually exclusive structural shapes (differing lengths and letter/digit
 * layouts rule out any overlap). The branch is still fully implemented
 * and exercised by dedicated tests using directly-constructed
 * detector-shaped inputs, since production identifiers that satisfy more
 * than one format do not exist and must not be fabricated.
 *
 * Must NOT contain: DOM access, UI rendering, hardcoded carrier-specific
 * rules (those belong in carrier-registry.js), postal-operator
 * identification, or forced carrier/operator matches when detection is
 * genuinely ambiguous or unknown.
 */

import { normalizeTrackingInput } from './normalize.js';
import { detectContainer } from './detect-container.js';
import { detectAwb } from './detect-awb.js';
import { detectPostal } from './detect-postal.js';

/** Stable technical reason keys — not user-facing display text. */
const REASON_EMPTY_INPUT = 'empty_input';
const REASON_RECOGNIZED_VALID = 'recognized_identifier_valid';
const REASON_RECOGNIZED_INVALID = 'recognized_structure_invalid';
const REASON_MULTIPLE_MATCHES = 'multiple_detector_matches';
const REASON_UNRECOGNIZED = 'unrecognized_identifier';

/** Stable technical action keys — not user-facing display text. */
const ACTION_ENTER_IDENTIFIER = 'enter_identifier';
const ACTION_PROCEED_TO_CARRIER_MATCHING = 'proceed_to_carrier_matching';
const ACTION_PROCEED_TO_POSTAL_SERVICE_CLASSIFICATION = 'proceed_to_postal_service_classification';
const ACTION_ASK_USER_TO_VERIFY = 'ask_user_to_verify_identifier';
const ACTION_ASK_USER_TO_SELECT_TYPE = 'ask_user_to_select_identifier_type';
const ACTION_CONTINUE_OTHER_DETECTORS = 'continue_other_detectors';

/**
 * Build a frozen router result object. Centralizes the shared shape so
 * every return path produces exactly the required public fields, with a
 * freshly frozen `possibleCarriers` array on every call.
 *
 * @returns {Readonly<object>} A frozen structured router result.
 */
function buildRouterResult({
  status,
  originalInput,
  normalizedInput,
  identifierType,
  normalizedIdentifier,
  confidence,
  valid,
  ambiguous,
  reason,
  recommendedAction,
  detectorResults,
}) {
  return Object.freeze({
    status,
    originalInput,
    normalizedInput,
    identifierType,
    normalizedIdentifier,
    possibleCarriers: Object.freeze([]),
    confidence,
    valid,
    ambiguous,
    reason,
    recommendedAction,
    detectorResults,
    routingDecisionMade: false,
    externalUrlSelected: null,
    externalNavigationOccurred: false,
  });
}

/**
 * Route a raw tracking input through normalization and the currently
 * active detectors (ocean container, air waybill, international postal
 * S10), returning one structured, immutable router result.
 *
 * Never throws for any input type: normalization and all three detectors
 * are already safe for empty strings, whitespace, `null`, `undefined`,
 * numbers, `BigInt`, booleans, objects, arrays, symbols, and functions,
 * and this function performs no additional logic that could throw for
 * those inputs.
 *
 * `detectContainer`, `detectAwb`, and `detectPostal` always run, in that
 * order, against the same normalized input; the router never stops after
 * the first structural match, so a genuinely ambiguous result (more than
 * one detector matching) can be reported honestly rather than silently
 * resolved.
 *
 * This function performs no carrier, airline, or postal-operator
 * identification (including no Israel Post identification), no EMS or
 * other postal service-category classification, no external navigation,
 * no DOM access, and no network requests.
 *
 * @param {*} rawInput - The raw value from the tracking input. Any type
 *   is accepted; unsupported types are safely normalized to an empty
 *   working value by `normalizeTrackingInput`.
 * @returns {Readonly<{
 *   status: 'empty'|'recognized-valid'|'recognized-invalid'|'ambiguous'|'unrecognized',
 *   originalInput: *,
 *   normalizedInput: Readonly<object>,
 *   identifierType: 'ocean-container'|'air-waybill'|'international-postal'|'unknown'|'ambiguous',
 *   normalizedIdentifier: string,
 *   possibleCarriers: ReadonlyArray<never>,
 *   confidence: 'high'|'medium'|'none'|'ambiguous',
 *   valid: boolean,
 *   ambiguous: boolean,
 *   reason: string,
 *   recommendedAction: string,
 *   detectorResults: ReadonlyArray<Readonly<object>>,
 *   routingDecisionMade: false,
 *   externalUrlSelected: null,
 *   externalNavigationOccurred: false
 * }>} A frozen structured router result.
 */
export function routeTrackingInput(rawInput) {
  const normalizedInput = normalizeTrackingInput(rawInput);

  const containerResult = detectContainer(normalizedInput);
  const awbResult = detectAwb(normalizedInput);
  const postalResult = detectPostal(normalizedInput);
  const detectorResults = Object.freeze([containerResult, awbResult, postalResult]);

  if (normalizedInput.isEmpty) {
    return buildRouterResult({
      status: 'empty',
      originalInput: normalizedInput.originalInput,
      normalizedInput,
      identifierType: 'unknown',
      normalizedIdentifier: '',
      confidence: 'none',
      valid: false,
      ambiguous: false,
      reason: REASON_EMPTY_INPUT,
      recommendedAction: ACTION_ENTER_IDENTIFIER,
      detectorResults,
    });
  }

  const matchedResults = detectorResults.filter((result) => result.matched);

  if (matchedResults.length > 1) {
    return buildRouterResult({
      status: 'ambiguous',
      originalInput: normalizedInput.originalInput,
      normalizedInput,
      identifierType: 'ambiguous',
      normalizedIdentifier: normalizedInput.alphanumericInput,
      confidence: 'ambiguous',
      valid: false,
      ambiguous: true,
      reason: REASON_MULTIPLE_MATCHES,
      recommendedAction: ACTION_ASK_USER_TO_SELECT_TYPE,
      detectorResults,
    });
  }

  if (matchedResults.length === 1) {
    const selected = matchedResults[0];

    if (selected.valid) {
      const recommendedAction =
        selected.identifierType === 'international-postal'
          ? ACTION_PROCEED_TO_POSTAL_SERVICE_CLASSIFICATION
          : ACTION_PROCEED_TO_CARRIER_MATCHING;

      return buildRouterResult({
        status: 'recognized-valid',
        originalInput: normalizedInput.originalInput,
        normalizedInput,
        identifierType: selected.identifierType,
        normalizedIdentifier: selected.normalizedIdentifier,
        confidence: selected.confidence,
        valid: true,
        ambiguous: false,
        reason: REASON_RECOGNIZED_VALID,
        recommendedAction,
        detectorResults,
      });
    }

    return buildRouterResult({
      status: 'recognized-invalid',
      originalInput: normalizedInput.originalInput,
      normalizedInput,
      identifierType: selected.identifierType,
      normalizedIdentifier: selected.normalizedIdentifier,
      confidence: selected.confidence,
      valid: false,
      ambiguous: false,
      reason: REASON_RECOGNIZED_INVALID,
      recommendedAction: ACTION_ASK_USER_TO_VERIFY,
      detectorResults,
    });
  }

  return buildRouterResult({
    status: 'unrecognized',
    originalInput: normalizedInput.originalInput,
    normalizedInput,
    identifierType: 'unknown',
    normalizedIdentifier: normalizedInput.alphanumericInput,
    confidence: 'none',
    valid: false,
    ambiguous: false,
    reason: REASON_UNRECOGNIZED,
    recommendedAction: ACTION_CONTINUE_OTHER_DETECTORS,
    detectorResults,
  });
}

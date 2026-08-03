/**
 * Air waybill (AWB) identifier detector for the FreighTime Single-input
 * tracking router.
 *
 * Responsibility: in its future implementation, this module will evaluate a
 * normalized input against air waybill identifier patterns (e.g. the
 * 3-digit airline prefix plus check-digit plus serial number structure) and
 * report whether the input plausibly represents an AWB number.
 *
 * Must NOT contain: carrier selection, routing decisions, user-facing text,
 * or knowledge of the other detectors (ocean container, courier). This
 * module only judges the "air waybill" identifier type in isolation.
 *
 * STRUCTURAL STAGE NOTICE: this is a placeholder implementation only.
 * No AWB detection logic and no airline-prefix data are implemented.
 * This module never claims a match at this stage.
 */

/**
 * Evaluate a normalized input for a possible air waybill match.
 *
 * Placeholder behavior: always reports no match and no validation
 * performed. Real detection logic is not yet implemented.
 *
 * @param {object} normalizedInput - The normalized input object produced by
 *   `normalizeTrackingInput` in normalize.js.
 * @returns {{
 *   identifierType: 'air_waybill',
 *   matched: false,
 *   normalizedIdentifier: null,
 *   possibleCarriers: [],
 *   confidence: 'none',
 *   valid: false,
 *   ambiguous: false,
 *   reason: string,
 *   recommendedAction: 'none'
 * }} A structured placeholder detector result.
 */
export function detectAwb(normalizedInput) {
  return {
    identifierType: 'air_waybill',
    matched: false,
    normalizedIdentifier: null,
    possibleCarriers: [],
    confidence: 'none',
    valid: false,
    ambiguous: false,
    reason: 'Placeholder only: air waybill detection is not yet implemented.',
    recommendedAction: 'none',
  };
}

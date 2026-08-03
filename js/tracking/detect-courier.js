/**
 * Courier / express tracking number detector for the FreighTime
 * Single-input tracking router.
 *
 * Responsibility: in its future implementation, this module will evaluate a
 * normalized input against courier and express tracking number patterns.
 * Because courier tracking number formats vary widely and can overlap
 * between providers, this detector may eventually return several possible
 * carrier matches rather than a single one — that ambiguity must be
 * reported honestly, not resolved by guessing.
 *
 * Must NOT contain: carrier selection beyond reporting candidates, routing
 * decisions, user-facing text, or knowledge of the other detectors (ocean
 * container, air waybill). This module only judges the "courier" identifier
 * type in isolation.
 *
 * STRUCTURAL STAGE NOTICE: this is a placeholder implementation only.
 * No courier pattern logic and no courier company data are implemented.
 * This module never claims a match at this stage.
 */

/**
 * Evaluate a normalized input for a possible courier tracking number match.
 *
 * Placeholder behavior: always reports no match and no validation
 * performed. Real detection logic is not yet implemented.
 *
 * @param {object} normalizedInput - The normalized input object produced by
 *   `normalizeTrackingInput` in normalize.js.
 * @returns {{
 *   identifierType: 'courier',
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
export function detectCourier(normalizedInput) {
  return {
    identifierType: 'courier',
    matched: false,
    normalizedIdentifier: null,
    possibleCarriers: [],
    confidence: 'none',
    valid: false,
    ambiguous: false,
    reason: 'Placeholder only: courier detection is not yet implemented.',
    recommendedAction: 'none',
  };
}

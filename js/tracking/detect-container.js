/**
 * Ocean container identifier detector for the FreighTime Single-input
 * tracking router.
 *
 * Responsibility: in its future implementation, this module will evaluate a
 * normalized input against ocean container identifier patterns (e.g. the
 * ISO 6346 four-letter-prefix plus seven-digit structure, including its
 * check-digit rule) and report whether the input plausibly represents an
 * ocean container number.
 *
 * Must NOT contain: carrier selection, routing decisions, user-facing text,
 * or knowledge of the other detectors (air waybill, courier). This module
 * only judges the "ocean container" identifier type in isolation.
 *
 * STRUCTURAL STAGE NOTICE: this is a placeholder implementation only.
 * No container validation and no check-digit algorithm are implemented.
 * This module never claims a match at this stage.
 */

/**
 * Evaluate a normalized input for a possible ocean container match.
 *
 * Placeholder behavior: always reports no match and no validation
 * performed. Real detection logic is not yet implemented.
 *
 * @param {object} normalizedInput - The normalized input object produced by
 *   `normalizeTrackingInput` in normalize.js.
 * @returns {{
 *   identifierType: 'ocean_container',
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
export function detectContainer(normalizedInput) {
  return {
    identifierType: 'ocean_container',
    matched: false,
    normalizedIdentifier: null,
    possibleCarriers: [],
    confidence: 'none',
    valid: false,
    ambiguous: false,
    reason: 'Placeholder only: ocean container detection is not yet implemented.',
    recommendedAction: 'none',
  };
}

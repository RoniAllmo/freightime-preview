/**
 * Router / orchestration layer for the FreighTime Single-input tracking
 * router.
 *
 * Responsibility: in its future implementation, this module will coordinate
 * normalization, run all independent detectors (ocean container, air
 * waybill, courier) without letting any one of them exclusively "claim" an
 * identifier, consult the carrier registry, handle ambiguity honestly when
 * more than one valid interpretation exists, and select the final routing
 * action described in TRACKING_ROUTER_DESIGN.md Section 8.
 *
 * Must NOT contain: DOM access, UI rendering, hardcoded carrier-specific
 * rules (those belong in carrier-registry.js), or forced carrier matches
 * when detection is genuinely ambiguous or unknown.
 *
 * STRUCTURAL STAGE NOTICE: this is a placeholder implementation only.
 * No live routing, no external navigation, and no network requests are
 * performed by this module at this stage.
 */

/**
 * Route a raw tracking input through the (not-yet-implemented) detection
 * and routing pipeline.
 *
 * Placeholder behavior: performs no normalization, detection, or carrier
 * lookup. Returns a structured result that explicitly states no routing
 * decision was made, no external URL was selected, and no external
 * navigation occurred.
 *
 * @param {string} rawInput - The raw string value from the tracking input.
 * @returns {{
 *   identifierType: 'unknown',
 *   matched: false,
 *   normalizedIdentifier: null,
 *   possibleCarriers: [],
 *   confidence: 'none',
 *   valid: false,
 *   ambiguous: false,
 *   reason: string,
 *   recommendedAction: 'none',
 *   routingDecisionMade: false,
 *   externalUrlSelected: null,
 *   externalNavigationOccurred: false
 * }} A structured placeholder router result.
 */
export function routeTrackingInput(rawInput) {
  return {
    identifierType: 'unknown',
    matched: false,
    normalizedIdentifier: null,
    possibleCarriers: [],
    confidence: 'none',
    valid: false,
    ambiguous: false,
    reason: 'Placeholder only: the tracking router is not yet implemented.',
    recommendedAction: 'none',
    routingDecisionMade: false,
    externalUrlSelected: null,
    externalNavigationOccurred: false,
  };
}

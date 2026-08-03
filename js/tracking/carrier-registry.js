/**
 * Configurable carrier/provider registry for the FreighTime Single-input
 * tracking router.
 *
 * Responsibility: hold carrier registry data (once populated in a future,
 * separately authorized task) and provide safe lookup functions. Carrier
 * rules must live only here — never embedded directly inside index.html or
 * any visual UI code (see CLAUDE.md Sections 8 and 10).
 *
 * Future carrier-record fields (see TRACKING_ROUTER_DESIGN.md, Section 7):
 *   - carrierId: internal identifier for the carrier/provider entry
 *   - displayName: human-readable carrier name shown to the user
 *   - shipmentCategory: identifier type(s) this entry applies to
 *   - identifierPatterns: structural pattern(s) associated with this carrier
 *   - awbPrefixes: applicable only to air waybill entries
 *   - officialTrackingUrl: the carrier's official tracking page/template
 *   - routingMethod: how the identifier is passed to the tracking URL
 *   - enabled: whether this entry is currently active
 *   - notes: free-text limitations or caveats
 *
 * Must NOT contain: identifier detection pattern logic (that belongs in the
 * detect-*.js modules), UI code, routing decisions, or visual interface
 * text of any kind.
 *
 * STRUCTURAL STAGE NOTICE: this is a placeholder implementation only.
 * The registry is intentionally empty. No carriers, airlines, couriers,
 * AWB prefixes, or tracking URLs are added at this stage.
 */

/**
 * The carrier registry. Intentionally empty at this structural stage.
 * Frozen to make clear it must not be mutated in place by consumers.
 *
 * @type {ReadonlyArray<object>}
 */
export const carrierRegistry = Object.freeze([]);

/**
 * Look up a single carrier registry entry by its internal ID.
 *
 * Placeholder behavior: the registry is empty, so this always safely
 * returns no match.
 *
 * @param {string} carrierId - The internal carrier ID to look up.
 * @returns {object|null} The matching carrier entry, or null if none exists.
 */
export function getCarrierById(carrierId) {
  return carrierRegistry.find((entry) => entry.carrierId === carrierId) ?? null;
}

/**
 * Look up carrier registry entries belonging to a shipment category
 * (e.g. "ocean_container", "air_waybill", "courier").
 *
 * Placeholder behavior: the registry is empty, so this always safely
 * returns an empty list.
 *
 * @param {string} category - The shipment category to filter by.
 * @returns {Array<object>} Matching carrier entries, or an empty array.
 */
export function getCarriersByCategory(category) {
  return carrierRegistry.filter((entry) => entry.shipmentCategory === category);
}

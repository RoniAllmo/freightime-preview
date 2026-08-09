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

/**
 * Official tracking destination registry.
 *
 * This is a data-only, immutable registry — it holds no logic beyond a
 * frozen lookup. It does not import, call, or reference `router.js`,
 * `ui-controller.js`, `ui-messages.js`, `index.html`, or any DOM, network,
 * storage, or navigation API. Importing this module has no side effects.
 *
 * Only three generic official landing pages are approved for a first
 * release, each manually verified and approved by the project owner (see
 * SAFE_EXTERNAL_ROUTING_DESIGN.md, Sections 6–8): UPS, UPS Roadie, and
 * EMS. Every `officialUrl` below is the bare approved generic page —
 * tracking identifiers must never be appended to any of these URLs, as a
 * query parameter, a path segment, or a URL fragment
 * (`identifierPrefillSupported: false` on every record records this).
 *
 * Any future navigation to one of these destinations requires a separate,
 * explicit user action (e.g. a button click) in a future UI-implementation
 * stage — this module itself performs no network request and no
 * navigation of any kind.
 *
 * Generic (non-EMS) S10, AWB, ocean containers, and every other courier
 * (DSV, DHL, FedEx, Aramex, UPS Mail Innovations) remain deferred per
 * SAFE_EXTERNAL_ROUTING_DESIGN.md, Sections 9–11, and are intentionally
 * absent from this registry.
 *
 * @type {ReadonlyArray<Readonly<{
 *   id: string,
 *   displayName: string,
 *   identifierType: string,
 *   carrierId: string|null,
 *   officialUrl: string,
 *   identifierPrefillSupported: boolean,
 *   enabled: boolean,
 *   evidenceStatus: string,
 *   privacyMode: string
 * }>>}
 */
export const officialTrackingDestinations = Object.freeze([
  Object.freeze({
    id: 'ups',
    displayName: 'UPS',
    identifierType: 'commercial-courier',
    carrierId: 'ups',
    officialUrl: 'https://www.ups.com/track?loc=EN_US',
    identifierPrefillSupported: false,
    enabled: true,
    evidenceStatus: 'project_owner_approved_official_destination',
    privacyMode: 'generic_page_no_identifier',
  }),
  Object.freeze({
    id: 'ups-roadie',
    displayName: 'UPS Roadie',
    identifierType: 'commercial-courier',
    carrierId: 'ups-roadie',
    officialUrl: 'https://track.roadie.com/',
    identifierPrefillSupported: false,
    enabled: true,
    evidenceStatus: 'project_owner_approved_official_destination',
    privacyMode: 'generic_page_no_identifier',
  }),
  Object.freeze({
    id: 'ems',
    displayName: 'EMS',
    identifierType: 'international-postal',
    carrierId: null,
    officialUrl: 'https://items.ems.post/',
    identifierPrefillSupported: false,
    enabled: true,
    evidenceStatus: 'project_owner_approved_official_destination',
    privacyMode: 'generic_page_no_identifier',
  }),
]);

/**
 * Look up a single official tracking destination by its internal ID.
 *
 * Performs an exact, un-normalized string match only — no case-folding,
 * trimming, or guessing. Returns `null` for a missing, unknown, empty,
 * `null`, `undefined`, numeric, or non-string `destinationId`, and never
 * mutates the caller's input. The returned record (when found) is the
 * same frozen object stored in `officialTrackingDestinations` — callers
 * cannot mutate the registry through the returned reference.
 *
 * @param {*} destinationId - The internal destination ID to look up. Any
 *   type is accepted; only an exact string match against a registry
 *   record's `id` can return a result.
 * @returns {Readonly<object>|null} The matching frozen destination record,
 *   or `null` if none exists.
 */
export function getOfficialTrackingDestination(destinationId) {
  if (typeof destinationId !== 'string') {
    return null;
  }
  return (
    officialTrackingDestinations.find((entry) => entry.id === destinationId) ?? null
  );
}

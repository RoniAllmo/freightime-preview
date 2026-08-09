# Full-Container-Load (FCL) Ocean Tracking — Technical Design

Status: documentation-only. No production code, test, dependency,
credential, or existing file is modified by this document. No identifier
was submitted to any carrier. No live API request occurred during
research — every official carrier domain attempted was blocked by this
environment's network egress proxy (see Sections 8–10 for the exact
attempted URLs and the resulting evidence limitation).

Branch: `claude/fcl-container-tracking-phase-1`
Base commit: `6feba35f770b77551f311021b93edacce36b527d` (main, after PR #7 —
explicit tracking-number copy action)

---

## 1. Purpose

FreighTime's existing container detector (`detect-container.js`)
recognizes ISO 6346 ocean container numbers structurally (four letters +
seven digits, with a verified check-digit algorithm) but performs no
carrier identification and no live tracking of any kind — it only reports
a valid/invalid structural match, exactly like every other detector in
`js/tracking/`.

This document is the first design stage toward a future **Full-Container-
Load (FCL) ocean tracking** capability: letting a user who has entered a
structurally valid container number see authorized, carrier-sourced
container movement information — carrier/shipping line, ETA, vessel name,
voyage number (when available), latest milestone, latest event location,
port of loading, port of discharge, and (only when an authorized source
provides it) last reported vessel coordinates — retrieved through a
future, separately implemented backend, following the same architecture
pattern already approved for UPS in-house tracking
(`INHOUSE_TRACKING_ARCHITECTURE.md`).

This document designs the architecture and researches carrier
capabilities only. It does not implement a backend, does not add a
dependency, does not call any carrier, and does not request or use any
credential.

## 2. Strict FCL scope

This design covers **full-container-load ocean container tracking only**,
by ISO 6346 container number, for exactly these data points:

- Ocean carrier or shipping line
- Estimated arrival time (ETA)
- Vessel name
- Voyage number, when available
- Latest container milestone
- Latest event location
- Port of loading
- Port of discharge
- Last reported vessel coordinates, only when available from an
  authorized source
- Data retrieval time

**Explicitly out of scope for this document and for any stage it
recommends**, unless separately authorized in a future task:

- LCL (less-than-container-load) shipments
- House Bill of Lading tracking
- Partial-shipment status of any kind
- Freight-forwarder references or forwarder-specific tracking
- Customs status or customs-clearance milestones
- Air freight / AWB tracking (already separately designed and approved
  only for UPS, per `INHOUSE_TRACKING_ARCHITECTURE.md` — unrelated to
  this document)
- Courier tracking (UPS/UPS Roadie — already covered by the existing
  official-link feature, `SAFE_EXTERNAL_ROUTING_DESIGN.md`)
- Postal/EMS tracking (already covered by the existing official-link
  feature)

## 3. Required user information

For a future FCL result to be shown, the user must have entered an
identifier FreighTime's existing local detector already reports as a
structurally valid ISO 6346 container number
(`identifierType: "ocean-container"`, `status: "recognized-valid"`, per
`router.js`). This design does not change that existing detection logic
in any way, and does not lower or alter the existing check-digit
validation.

Beyond a valid container number, this design requires **carrier
confirmation** before any tracking request could ever be made (Sections
5–7) — a container number alone is never sufficient input for a future
backend call.

## 4. Container-number limitations

A container number identifies a piece of physical equipment and its
movements. It is not, by itself, proof of:

- Which specific shipment or booking that equipment currently carries.
- Which forwarder or NVOCC is involved.
- Cargo contents, quantity, or condition.
- Customs status.
- The current operating carrier (see Section 5).

Consistent with `CLAUDE.md` Section 10 and the approach already used for
every other identifier family in this project, this design must never
imply certainty beyond what the identifier and an authorized source can
actually support. A container number tracks **container movement only**,
per this task's explicit strict product rule 1; it does not prove the
status of a specific partial shipment (rule 2).

## 5. BIC owner versus current shipping line

Every ISO 6346 container number's first four characters are a
BIC-registered owner code (already relied upon structurally, but not
semantically, by `detect-container.js`). This owner code identifies the
*registered equipment owner or principal operator* — it does **not**
always identify the carrier currently operating the shipment the
container is part of, for the same reasons already documented for the
identical ambiguity in `SAFE_EXTERNAL_ROUTING_DESIGN.md` Section 11:
containers are frequently leased, interchanged, and slot-shared between
carriers (e.g. vessel-sharing agreements/alliances), so equipment
ownership and the operating carrier for a specific voyage are
independent facts.

**Strict rule (per this task and consistent with prior approved
principles)**: FreighTime must not present the BIC owner as the confirmed
shipping line without stronger evidence. This document does not implement
or approve any code path that infers a carrier from the owner-code prefix
alone.

## 6. Carrier-confirmation models

Three models were compared for how FreighTime could ever determine which
carrier (MSC, ZIM, or Maersk, in this first-wave scope) to query for a
given container number:

### Model A — explicit user selection

The user enters a container number and manually selects MSC, ZIM, or
Maersk from a small, fixed list.

- **Pros**: no inference at all; the user is the authoritative source of
  carrier identity; trivially simple to implement and test; requires no
  backend intelligence.
- **Cons**: requires the user to already know their carrier, which is not
  always the case for someone who only has a container number in hand.

### Model B — BIC owner as a non-binding clue

FreighTime shows the BIC equipment owner only as a **non-binding
suggestion** (e.g. "this container's registered owner is commonly
associated with Carrier X — please confirm"), and the user must still
explicitly confirm the carrier before any tracking request is made.

- **Pros**: reduces user effort in the common case where owner and
  operating carrier coincide, while never asserting the owner as fact.
- **Cons**: requires a maintained owner-code → likely-carrier reference
  table (scope and maintenance burden not evaluated in this document);
  risks user confusion if the suggested carrier is wrong and the
  confirmation step is not sufficiently prominent; still fundamentally
  requires the same explicit-confirmation step as Model A.

### Model C — authorized backend discovery

A future, separately authorized backend queries approved carrier
adapters (or a carrier-agnostic discovery service, if one exists and is
separately vetted) and accepts a carrier only after an official provider
response confirms a match — no inference from the container number
itself at any point.

- **Pros**: most accurate when it works, since the confirmation comes
  from the carrier's own system rather than a heuristic.
- **Cons**: highest complexity; requires either a multi-carrier query
  fan-out (calling MSC, ZIM, and Maersk in parallel, which triples the
  request volume for something that starts as a single lookup) or an
  as-yet-unidentified official discovery service; introduces new backend
  logic and failure modes; not evaluated as feasible within this
  document's carrier research (Sections 8–10 found no official
  discovery-by-container-number-only capability directly confirmable for
  any of the three carriers).

## 7. Recommended first-release model

**Recommended: Model A (explicit user selection)**, for the first
release. **This recommendation requires explicit project-owner approval**
before any implementation stage in Section 18 begins — it is not
authorized by this document alone.

Rationale:

- It carries zero risk of FreighTime ever asserting an unconfirmed carrier
  as fact, satisfying the strict rule in Section 5 (and this task's
  explicit product rules 3–5) with the simplest possible mechanism.
- It requires no owner-code → carrier reference table (deferring Model
  B's maintenance burden entirely) and no multi-carrier discovery fan-out
  (deferring Model C's complexity and the carrier-API gaps found in
  Sections 8–10).
- It matches the existing, already-approved UX pattern in this project:
  ambiguous or uncertain automatic detection is never silently resolved —
  the user is asked to choose, exactly as `router.js`'s `ambiguous` status
  already does for genuinely overlapping identifier structures.

Model B remains a reasonable **future enhancement** once a properly
sourced and maintained owner-code reference exists and its accuracy has
been evaluated; it is not recommended for the first release because that
reference table's evidence basis was not researched in this document.
Model C remains a **long-term direction** worth revisiting once each
carrier's API capabilities are more fully confirmed (Sections 8–10 found
significant gaps), but is not recommended first given its added
complexity relative to Model A's simplicity and safety.

## 8. MSC official assessment

**Official sources attempted (blocked by this environment's network
egress proxy, `EGRESS_BLOCKED` — no content retrieved)**:

- `https://www.msc.com/en/track-a-shipment`
- `https://developer.msc.com` (also failed DNS resolution —
  `ENOTFOUND developer.msc.com` — a second, independent access failure)

**Directly inspected**: No.

**Secondary evidence found via web search (recorded as a limitation only
— explicitly not used as approval evidence for any capability, per this
task's rule "do not approve a capability from search-result text
alone")**: search results reference an MSC "Developer Portal" at
`developerportal.msc.com`, described in secondary sources (a blog post
and a third-party aggregator site, not MSC's own primary documentation)
as containing API definitions and EDI guidelines for Track & Trace,
Booking, and Shipping Instructions, and as **not self-service** — access
reportedly gated behind a sales-representative request/integration form,
unlike some other carriers' portals. None of this was directly confirmed.

**Capability status — all unverified pending direct inspection**:

| Capability | Status |
| --- | --- |
| Official container-tracking page | Unverified — URL attempted, blocked |
| Container-number lookup support | Unverified |
| Official Track and Trace API | Unverified — secondary sources reference a developer portal; not directly confirmed |
| Developer registration | Unverified — secondary sources suggest a sales-gated request process rather than self-service; not directly confirmed |
| Authentication requirements | Unverified |
| Customer-account requirements | Unverified |
| Sandbox or test access | Unverified |
| Container milestones | Unverified |
| ETA | Unverified |
| Vessel name | Unverified |
| Voyage number | Unverified |
| Port of loading / discharge | Unverified |
| Transshipment events | Unverified |
| Discharge event | Unverified |
| Gate-out event | Unverified |
| Vessel coordinates | Unverified |
| Position timestamp | Unverified |
| Webhook support | Unverified |
| Suitability for server-side FreighTime integration | Cannot be assessed without direct inspection |

## 9. ZIM official assessment

**Official sources attempted (blocked by this environment's network
egress proxy, `EGRESS_BLOCKED` — no content retrieved)**:

- `https://www.zim.com/tools/track-a-shipment`
- `https://developer.zim.com` (also failed DNS resolution —
  `ENOTFOUND developer.zim.com` — a second, independent access failure,
  and notably this exact hostname pattern does not appear to exist at
  all, unlike MSC's and Maersk's developer-portal domains)

**Directly inspected**: No.

**Secondary evidence found via web search (recorded as a limitation only
— explicitly not used as approval evidence)**: unlike MSC and Maersk, no
search result referenced an official ZIM-operated developer portal or
first-party API at all. Every result was a **third-party tracking
aggregator** (e.g. commercial tracking-reseller sites that describe
offering their own API built on top of scraped or resold ZIM tracking
data). This is a materially different — and more concerning — finding
than MSC's or Maersk's: it suggests ZIM may not currently operate a
self-service or even sales-gated official developer API comparable to
the other two carriers, though this document cannot confirm that absence
either, since it rests on the same excluded secondary-source evidence.

**Capability status — all unverified pending direct inspection**:

| Capability | Status |
| --- | --- |
| Official container-tracking page | Unverified — URL attempted, blocked |
| Container-number lookup support | Unverified |
| Official Track and Trace API | Unverified — no official (first-party) API reference found even in secondary sources; only third-party resellers found |
| Developer registration | Unverified |
| Authentication requirements | Unverified |
| Customer-account requirements | Unverified |
| Sandbox or test access | Unverified |
| Container milestones | Unverified |
| ETA | Unverified |
| Vessel name | Unverified |
| Voyage number | Unverified |
| Port of loading / discharge | Unverified |
| Transshipment events | Unverified |
| Discharge event | Unverified |
| Gate-out event | Unverified |
| Vessel coordinates | Unverified |
| Position timestamp | Unverified |
| Webhook support | Unverified |
| Suitability for server-side FreighTime integration | Cannot be assessed without direct inspection; the apparent absence of an official first-party API is itself a significant open risk if confirmed in a future session |

## 10. Maersk official assessment

**Official sources attempted (blocked by this environment's network
egress proxy, `EGRESS_BLOCKED` — no content retrieved)**:

- `https://developers.maersk.com`
- `https://www.maersk.com/tracking/`

**Directly inspected**: No.

**Secondary evidence found via web search (recorded as a limitation only
— explicitly not used as approval evidence)**: search results reference a
Maersk developer portal (at a domain rendered inconsistently across
secondary sources as `developer.maersk.com` and `delivers.maersk.com` —
this inconsistency itself is a reason direct inspection is required
before relying on any specific URL) describing self-service registration,
API-key generation, and a sandbox environment. Secondary sources describe
two tracking-relevant APIs by name — "Track and Trace Plus" (detailed
milestone history per container/B-L) and "MEC Tracking" (event-level data
for Maersk, Hamburg Süd, and Sealand) — both reportedly following the
DCSA Track and Trace v2.2 standard, and describe two authentication
approaches (an `X-API-Key` header, and a separately mentioned username/
password flow). None of this was directly confirmed from Maersk's own
documentation.

**Capability status — all unverified pending direct inspection**:

| Capability | Status |
| --- | --- |
| Official container-tracking page | Unverified — URL attempted, blocked |
| Container-number lookup support | Unverified |
| Official Track and Trace API | Unverified — secondary sources name specific products ("Track and Trace Plus", "MEC Tracking"); not directly confirmed |
| Developer registration | Unverified — secondary sources describe a self-service flow; not directly confirmed |
| Authentication requirements | Unverified — secondary sources mention an `X-API-Key` header and/or username/password; not directly confirmed, and the two descriptions are not reconciled |
| Customer-account requirements | Unverified |
| Sandbox or test access | Unverified — secondary sources claim a sandbox exists; not directly confirmed |
| Container milestones | Unverified — secondary sources claim DCSA Track and Trace v2.2 conformance, which would imply a standardized milestone set; not directly confirmed |
| ETA | Unverified |
| Vessel name | Unverified |
| Voyage number | Unverified |
| Port of loading / discharge | Unverified |
| Transshipment events | Unverified |
| Discharge event | Unverified |
| Gate-out event | Unverified |
| Vessel coordinates | Unverified — a separate secondary source mentions an in-progress vessel-connectivity program (targeted for early 2026) explicitly **not yet surfaced in the public tracking portal** as of that source's writing; this is recorded only as a limitation, not as evidence of any current or near-term coordinate capability |
| Webhook support | Unverified |
| Suitability for server-side FreighTime integration | Cannot be assessed without direct inspection, though secondary sources suggest Maersk's developer program is the most mature of the three researched carriers — this impression is explicitly not a basis for approval |

## 11. Carrier comparison matrix

All rows reflect the unverified status recorded in Sections 8–10 — no row
represents an approved or confirmed capability.

| Carrier | Official source directly inspected | Container lookup | API found | Authentication | Sandbox | ETA | Vessel name | Voyage | POL/POD | Milestones | Coordinates | Webhook | Integration status | Main blocker |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MSC | No — `msc.com`/`developer.msc.com` both blocked | Unverified | Unverified (secondary sources reference a developer portal) | Unverified | Unverified | Unverified | Unverified | Unverified | Unverified | Unverified | Unverified | Unverified | Not integration-ready — no direct evidence | Network egress block; secondary sources suggest access may be sales-gated rather than self-service |
| ZIM | No — `zim.com` blocked; `developer.zim.com` does not resolve | Unverified | Unverified — no official API reference found even in secondary sources | Unverified | Unverified | Unverified | Unverified | Unverified | Unverified | Unverified | Unverified | Unverified | Not integration-ready — no direct evidence, and possibly no official API at all | Network egress block; apparent absence of an official developer portal in any source found |
| Maersk | No — `developers.maersk.com`/`maersk.com` both blocked | Unverified | Unverified (secondary sources name "Track and Trace Plus" and "MEC Tracking") | Unverified | Unverified | Unverified | Unverified | Unverified | Unverified | Unverified | Unverified | Unverified | Not integration-ready — no direct evidence | Network egress block |

## 12. ETA definition and reliability

Per this task's strict product rule 6, an ETA field is never a bare
timestamp — it must always be a structured value containing:

- **Target port or milestone** — which arrival event the ETA refers to
  (e.g. arrival at the port of discharge), since "ETA" is ambiguous
  without stating what event it estimates.
- **Source** — which carrier/system produced the estimate.
- **Retrieval time** — when FreighTime's backend obtained this estimate
  (distinct from the estimate's own target time).
- **Null when unavailable** — the entire ETA value is `null`, never a
  fabricated or inferred date, when the authorized source does not
  provide one.

No reliability guarantee beyond "this is the carrier's own stated
estimate as of the retrieval time" is ever implied — FreighTime does not
compute, adjust, or improve upon a carrier-provided ETA in this design.

## 13. Vessel-name and voyage design

Vessel name and voyage number are carried as plain, optional string
fields in the response contract (Section 16) — `null` when the
authorized source does not provide them (e.g. before the container is
loaded onto a vessel, or if the source's data model does not always
populate voyage number, per this task's "when available" framing for
voyage number specifically).

Neither field is used by this design to infer or corroborate the carrier
(Section 5) or to independently verify vessel identity — that remains
entirely the authorized source's responsibility. No vessel database,
vessel-identity registry, or IMO-number cross-check is designed or
implied here.

## 14. Vessel-position and AIS limitations

Per this task's explicit research requirement, this document records
whether MSC, ZIM, or Maersk directly provide vessel coordinates through
an official API — and, per Section 10, one secondary source describes an
in-progress Maersk vessel-connectivity program explicitly **not yet
surfaced in the public tracking portal**, which this document treats as
evidence of *unavailability*, not of a usable near-term capability. No
carrier's provision of vessel coordinates through an official,
directly-confirmed API was established by this document's research.

**Recorded conclusion: vessel coordinates are unavailable from any of the
three researched carriers' official channels, as far as this session's
research could directly confirm.** Consistent with the strict rules in
this task and Section 6 of `SAFE_EXTERNAL_ROUTING_DESIGN.md`'s privacy
principles:

- Coordinates are never inferred from a vessel name.
- No unofficial AIS (Automatic Identification System) service is used or
  approved.
- No vessel-tracking website is scraped.
- Coordinates are never described as real-time unless the authorized
  source itself guarantees real-time data (per this task's strict product
  rule 9) — since no such guarantee was found, the response contract
  (Section 16) treats `vesselPosition` as `null` by default and, if ever
  populated by a future authorized source, always carries an explicit
  `freshness` field (Section 16) rather than an implied "live" status.

**A future AIS adapter is explicitly out of scope for this document and
requires, at minimum, before any future task may implement it**: separate
project-owner approval, a licensed (not scraped or unofficial) AIS data
source, server-side credentials for that source, a vessel-identity
confirmation step (matching the tracked container's carrier-reported
vessel to the AIS-reported vessel before trusting a position), a position
timestamp, an explicit freshness threshold (a maximum age beyond which a
position is no longer shown), rate limiting against the AIS provider, and
clear source attribution shown to the user. None of these are designed
in further detail here, and no AIS adapter of any kind is implemented or
implied as ready to build.

## 15. Future endpoint contract

Conceptual design only — no endpoint is implemented by this document,
mirroring the pattern already used for the UPS mock endpoint design in
`INHOUSE_TRACKING_ARCHITECTURE.md` Section 12.

**Endpoint**: `POST /api/tracking/ocean/container`

**Future request fields**:

- `containerNumber` — the structurally valid ISO 6346 container number
  (already locally validated by `detect-container.js` before this
  endpoint would ever be called).
- `carrierId` — one of the initially approved carrier IDs below. Per
  Section 7's recommended Model A, this field must be **selected by the
  user or otherwise officially confirmed** — this design never routes
  solely from the BIC owner-code prefix (Section 5), and the endpoint
  contract itself has no code path that would infer `carrierId` from
  `containerNumber` alone.

**Initially approved carrier IDs**: `msc`, `zim`, `maersk` — matching the
three carriers researched in Sections 8–10. No other carrier ID is
approved by this document (Section 18's future-provider boundary applies
identically to ocean carriers as it already does to couriers/postal
operators in `SAFE_EXTERNAL_ROUTING_DESIGN.md` and
`INHOUSE_TRACKING_ARCHITECTURE.md`).

This endpoint is not implemented, and no server-side validation,
authentication, rate-limiting, or CORS behavior is designed in further
detail here beyond noting that any future implementation must follow the
same security baseline already approved for the UPS backend design
(`INHOUSE_TRACKING_ARCHITECTURE.md` Section 6) — server-side-only
credentials, restricted CORS, mandatory input validation and rate
limiting, generic error messages, and no raw upstream response returned
to the browser.

## 16. Normalized response and milestones

A conceptual, provider-neutral result shape — not implementation code,
and not populated with any real or synthetic data by this document:

- `mode` — a fixed marker distinguishing this ocean-FCL result from the
  existing UPS-style courier/postal result contract (e.g. `"ocean-fcl"`),
  so a future frontend never confuses the two response shapes.
- `provider` — a stable identifier for which carrier sourced this result
  (one of `msc`/`zim`/`maersk`).
- `providerDisplayName` — the human-readable carrier name.
- `containerNumberMasked` — the container number with all but a small,
  fixed number of characters replaced, mirroring the mandatory masking
  already required for `trackingNumberMasked` in
  `INHOUSE_TRACKING_ARCHITECTURE.md` Section 13 — the full identifier is
  never returned to the browser in this field.
- `currentMilestone` — one of the fixed milestone values below.
- `statusLabel` — a short, already-approved-for-display label
  corresponding to `currentMilestone` (future Hebrew UI-message work, not
  implemented here).
- `latestEventTime` — timestamp of the most recent milestone event, if
  the source provided one.
- `latestEventLocation` — a coarse location for the most recent event
  (e.g. port/terminal-level), never a precise address.
- `portOfLoading` — the origin port, if known.
- `portOfDischarge` — the destination port, if known.
- `vesselName` — see Section 13; `null` when unavailable.
- `voyageNumber` — see Section 13; `null` when unavailable.
- `estimatedArrival` — the structured ETA object described in Section 12;
  `null` when unavailable.
- `actualArrival` — the actual arrival timestamp, once known; `null`
  beforehand.
- `discharged` — boolean, whether the container has been discharged from
  the vessel.
- `gateOut` — boolean, whether the container has exited the terminal gate.
- `vesselPosition` — per Section 14, either `null`, or an object
  containing **exactly**:
  - `latitude`
  - `longitude`
  - `positionTimestamp`
  - `source`
  - `freshness`
- `source` — a fixed marker identifying this as carrier-sourced data
  (mirroring the `source` field already used in the UPS design).
- `retrievedAt` — when the backend retrieved this data from the carrier.

**Explicitly excluded from this contract**: shipper, consignee, notify
party, addresses, cargo description, invoice data, customs documents,
package count, weight, and the complete raw carrier response. None of
these are ever copied to the browser under any circumstance in this
design.

**Fixed milestone set** (`currentMilestone`):

`BOOKED`, `EMPTY_RELEASED`, `EMPTY_PICKED_UP`, `GATE_IN`, `LOADED`,
`VESSEL_DEPARTED`, `TRANSSHIPMENT_ARRIVED`, `TRANSSHIPMENT_DEPARTED`,
`VESSEL_ARRIVED`, `DISCHARGED`, `AVAILABLE_FOR_PICKUP`, `GATE_OUT`,
`EMPTY_RETURNED`, `DELIVERED`, `UNKNOWN`.

No customs-clearance milestone is included in this set, consistent with
Section 2's strict scope exclusion.

## 17. Security, privacy, and fallback behavior

This design inherits, without weakening, every security and privacy
principle already approved for the UPS in-house tracking backend
(`INHOUSE_TRACKING_ARCHITECTURE.md` Sections 6 and 14), applied here to
ocean-carrier data specifically:

- Provider credentials (for whichever of MSC/ZIM/Maersk are eventually
  integrated) remain server-side only, exactly as designed for UPS.
- The browser only ever calls FreighTime's own backend endpoint (Section
  15); it never calls a carrier API directly.
- Only the minimal normalized fields (Section 16) are ever returned —
  never a carrier's full raw response.
- No container number is logged by default; only the masked form may
  ever appear in a log line.
- No permanent tracking history is persisted beyond the single
  request/response cycle, absent a separately justified, time-bounded
  cache (same standard as `INHOUSE_TRACKING_ARCHITECTURE.md` Section 14).
- No browser storage of the container number or result by default.
- Rate limiting, input validation, HTTPS, and restricted CORS are all
  mandatory, matching the existing approved security checklist.

**Fallback behavior when live ocean tracking is unavailable** (carrier
outage, timeout, rate-limited, authentication failure, or the backend
itself unreachable) — mirroring the already-approved UPS fallback
behavior (`INHOUSE_TRACKING_ARCHITECTURE.md` Section 16):

1. The existing local container-detection result and its Hebrew message
   continue to render exactly as today, unaffected.
2. A clear, distinct "live status unavailable" message is shown (a
   future, separately approved Hebrew message — not created here).
3. No existing FreighTime behavior is removed — this design is strictly
   additive.
4. A provider-unavailable or timeout condition is never presented as "no
   such container" or "not found."
5. No raw upstream carrier error is ever exposed to the browser.
6. No automatic, indefinite retry occurs.

## 18. Implementation roadmap, open decisions, and next action

### Roadmap

Each stage is scoped the same way prior FreighTime work has been — one
stage per task, small and independently reviewable:

1. **Project-owner approval** — completion criterion: the project owner
   has explicitly approved the recommended carrier-confirmation model
   (Section 7, Model A) and this document's security baseline (Section
   17), or specified changes, before any further stage begins.
2. **Carrier-selection UX** — completion criterion: a design (not code)
   for how the user explicitly selects MSC, ZIM, or Maersk after entering
   a valid container number, reviewed and approved.
3. **MSC, ZIM, and Maersk registry** — completion criterion: a registry
   module (analogous to `carrier-registry.js`'s
   `officialTrackingDestinations`) records the three carrier IDs and
   display names only — no API endpoint, credential, or capability claim
   until directly verified.
4. **Mock container response contract** — completion criterion: the
   Section 16 contract is implemented as a data shape (no live data) with
   automated tests confirming its exact field set.
5. **Mock MSC adapter** — completion criterion: a mock adapter returns
   deterministic synthetic responses for MSC scenarios, with no network
   call to any MSC host.
6. **Mock ZIM adapter** — completion criterion: same as stage 5, for ZIM.
7. **Mock Maersk adapter** — completion criterion: same as stage 5, for
   Maersk.
8. **Mock `POST /api/tracking/ocean/container`** — completion criterion:
   the endpoint (Section 15) is implemented against the three mock
   adapters, enforcing `carrierId` selection/confirmation and rejecting
   any attempt to omit it.
9. **Milestone normalization** — completion criterion: each mock
   adapter's scenario output maps correctly to the fixed milestone set
   (Section 16), with tests covering every milestone value.
10. **ETA normalization** — completion criterion: the structured ETA
    object (Section 12) is correctly populated or `null`, with tests for
    both cases.
11. **Vessel and voyage normalization** — completion criterion: vessel
    name and voyage number are correctly populated or `null`, per Section
    13, with tests for both cases.
12. **Position-data boundary** — completion criterion: `vesselPosition`
    is provably always `null` in the mock-only phase (since no AIS
    adapter exists yet, per Section 14), enforced by a dedicated test.
13. **Security and rate-limit tests** — completion criterion: automated
    tests confirm input validation, rate limiting, CORS restriction, and
    that no credential or raw upstream data ever appears in a response,
    matching the equivalent UPS-stage tests.
14. **Frontend result card** — completion criterion: a new, isolated
    frontend module renders the Section 16 contract additively, without
    modifying existing container-detection rendering, with its own
    automated tests.
15. **First official development credential** — completion criterion:
    the project owner has explicitly approved obtaining a development/
    sandbox credential for whichever carrier is prioritized first (based
    on the direct-inspection findings a future session must still
    obtain, per Sections 8–10's unresolved status), stored only in the
    backend's secret store.
16. **First carrier sandbox adapter** — completion criterion: the mock
    adapter for the prioritized carrier is replaced by a real sandbox
    adapter, validated end-to-end against that carrier's sandbox/test
    environment.
17. **Controlled beta** — completion criterion: the feature is enabled
    for a small, explicitly scoped audience, with monitoring for
    correctness before wider release.
18. **Production approval** — completion criterion: the project owner has
    explicitly approved production credentials and general availability,
    following a successful, monitored controlled beta.

### Open decisions

1. **Which carrier to prioritize for stages 15–16** — not resolved here;
   Sections 8–10 could not directly confirm any of the three carriers'
   actual API capabilities, so this decision requires a future session
   with either unblocked network access to `developerportal.msc.com`,
   `developer.maersk.com` (exact domain to be confirmed), and any
   official ZIM developer resource (none was even indirectly identified
   in this session's secondary sources), or project-owner-supplied
   official documentation — following the same pattern that previously
   unblocked the EMS/UPU research (`EMS_CLASSIFICATION_RESEARCH.md`).
2. **Whether ZIM has any official first-party tracking API at all** — an
   open and materially significant question given Section 9's findings;
   if confirmed absent, ZIM may need to be deferred entirely from the
   first carrier wave.
3. **Whether Model B (BIC owner as a non-binding clue) is ever worth
   building**, and if so, the evidence basis and maintenance plan for an
   owner-code → likely-carrier reference table (Section 6).
4. **Whether an AIS adapter is ever in scope for FreighTime**, given the
   substantial additional approval, licensing, and verification burden
   described in Section 14.
5. **The exact carrier-selection UX** (Section 18, stage 2) — not
   designed in this document.

### Recommended next action

Obtain direct, first-party evidence for MSC's, ZIM's, and Maersk's actual
tracking-API capabilities before any further design or implementation
work on this feature — either through a future session with unblocked
network access to each carrier's official developer domain, or through
project-owner-supplied official documentation. Until that evidence
exists, no stage beyond Section 18, stage 1 (project-owner approval of
this document's model recommendation and security baseline) should
begin.

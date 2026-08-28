# Historical Tracking Architecture

> **HISTORICAL — NOT ACTIVE RUNTIME BEHAVIOR.** Everything in this document describes FreighTime's former "Single-input tracking router" and its planned extensions. That feature was **removed from the public product in full** by product-owner decision (see `CLAUDE.md` §1 and `IMPORT_READINESS_V1.md` §10). None of the modules, endpoints, or contracts described below exist in the current codebase. This file is a preservation record for a later verification/deletion pass over the 14 original source documents — it is not a specification for anything to be rebuilt. **No reintroduction of tracking is authorized by this document.** See `TRACKING_FEATURE_STATUS.md` for the current-state statement.

## Provenance

This document consolidates the approved historical design content from six source documents, all retained at the repository root as of this writing:

- `TRACKING_ROUTER_DESIGN.md` — the original detection/routing architecture (container, AWB, courier at the time; postal added later).
- `POSTAL_DETECTOR_DESIGN.md` — the UPU S10 / EMS detector design.
- `FCL_CONTAINER_TRACKING_DESIGN.md` — the ocean-container (FCL) live-tracking design, including carrier research (MSC/ZIM/Maersk).
- `SAFE_EXTERNAL_ROUTING_DESIGN.md` — the design and approvals for linking out to official carrier tracking pages.
- `COURIER_IMPLEMENTATION_DECISION.md` — the consolidated commercial-courier (UPS/UPS Roadie) implementation decision.
- `INHOUSE_TRACKING_ARCHITECTURE.md` — the later, never-built design for a backend that would fetch live UPS tracking data server-side.

Only content the project owner is recorded as having **approved** (or that was implemented and later removed) is presented here as historical fact. Recommendations, options, and open decisions that were never resolved are marked as such, not upgraded to "approved." Stale claims of the form "this is currently implemented," specific commit SHAs, specific test-suite counts, and other point-in-time repository state have been **omitted** — see the traceability table in `TRACKING_FEATURE_STATUS.md` for exactly what was dropped and why.

---

## 1. What was built and shipped (then later removed)

At the time of removal, the live product had implemented and shipped:

- A central tracking input (`#trackInput`) and button (`#trackBtn`) on `index.html`, wired to a local detection pipeline — no live API calls, no backend.
- Four independent local detectors, all running against the same normalized input on every submission (never short-circuiting on first match):
  - **Ocean container** (`detect-container.js`) — ISO 6346 structural + check-digit validation.
  - **Air waybill / AWB** (`detect-awb.js`) — 11-digit IATA-style structural + check-digit validation.
  - **International postal / UPU S10** (`detect-postal.js`) — including EMS service-category classification.
  - **Commercial courier** (`detect-courier.js`) — UPS `1Z` and UPS Roadie `1R` structural recognition only.
- An explicit, user-clicked "go to official tracking page" link for three approved destinations: UPS `1Z`, UPS Roadie `1R`, and EMS.

Everything below records the architecture behind these pieces, plus later-designed but **never implemented** extensions (in-house live UPS tracking, FCL ocean tracking, additional couriers).

## 2. Router architecture (historical)

**Module boundary (all under the removed `js/tracking/` directory):**

| Module | Responsibility |
|---|---|
| `normalize.js` | Raw input → normalized input model. No detection or carrier logic. |
| `detect-container.js` | Ocean container structural/check-digit detection only. |
| `detect-awb.js` | Air waybill structural/check-digit detection only. |
| `detect-postal.js` | UPU S10 structural/check-digit detection, plus EMS service-category classification. |
| `detect-courier.js` | Commercial courier structural detection only (UPS `1Z`/`1R`). |
| `carrier-registry.js` | Configurable registry of carrier records; no detection logic. |
| `router.js` | Orchestrates normalize → run all detectors → aggregate into one result + routing decision. No DOM access. |
| `official-routing.js` | Resolved the approved external "official tracking page" links (Section 6 below). |
| `ui-controller.js` / `ui-messages.js` | DOM binding and Hebrew message rendering only; no detection logic. |

**Design principles that governed every detector:**

- All active detectors always ran against the same normalized input; no detector could "claim" an identifier exclusively or suppress another detector.
- If more than one detector reported a valid match, the router set `ambiguous: true`, preserved every detector's result, and required the user to choose manually — the router never auto-selected an interpretation.
- Every detector shared one result contract: `identifierType`, `matched`, `normalizedIdentifier`, `possibleCarriers`, `confidence`, `valid`, `ambiguous`, `reason`, `recommendedAction`.
- No detector accessed the DOM, made a network request, or logged the identifier.
- `originalInput` was always preserved unmodified, separate from every derived/normalized field.

**Detection order:** container → AWB → postal → commercial courier (courier was added last, after container/AWB/postal were already implemented).

**Routing behavior by case:**

- One confident match → offer the official tracking link for that carrier (if one was approved).
- Several possible matches → do not auto-select; present candidates for manual user choice.
- Recognized type, unknown carrier → show the identifier type, state the carrier could not be determined.
- Invalid identifier (structure matches a family but check digit fails) → show "not recognized," no carrier guess, no external link.
- Empty input → prompt for input, no detection attempted.
- Unknown identifier → show the unrecognized state without implying no such shipment exists.

## 3. Container-number detection (historical)

- Structure: ISO 6346 — four letters (owner code + equipment category) + seven digits, including a verified check-digit algorithm.
- The four-letter prefix is a **BIC-registered equipment owner code** — it identifies who owns the physical container, **not** necessarily the shipping line currently operating the shipment (containers are routinely leased, interchanged, and slot-shared across carrier alliances). This distinction was treated as a hard rule throughout the project: FreighTime's design never allowed inferring an operating carrier from the owner-code prefix alone.
- A container number, on its own, was explicitly documented as **not** proof of: which shipment/booking the equipment currently carries, which forwarder is involved, cargo contents/quantity/condition, customs status, or the current operating carrier.

## 4. AWB detection (historical)

- Structure: 11 digits, no letters, following the generic IATA-style (Resolution 600a) master-AWB numbering convention, with a Modulus-7 check digit.
- The three-digit numeric prefix identifies the *issuing* airline via IATA's airline-prefix allocation, but the detector validated structure and check digit only — it never resolved or claimed to resolve the issuing airline, since no verified prefix→airline→tracking-URL registry was ever built.

## 5. UPU S10 (international postal, including EMS) (historical)

**Structure**, confirmed against the original UPU Technical Standard S10 document (Version 12, approved 17 October 2017), directly inspected via a project-owner-supplied copy after this environment's own network access to `upu.int`/`ems.post` was blocked throughout the project:

- 13 characters total: 2-letter service indicator + 8-digit serial + 1-digit check digit + 2-letter country code.
- **Check-digit algorithm** (weighted Modulus 11), authoritatively confirmed via the official UPU S10 check-digit validation spreadsheet and project-owner-verified boundary-case screenshots:
  1. Weight the 8 serial digits, left to right, by `8, 6, 4, 2, 3, 5, 9, 7`.
  2. Sum the weighted products (`S`).
  3. Compute `S mod 11`, then `C = 11 − (S mod 11)`.
  4. Special-case mapping (confirmed against the official tool): intermediate result `10` → check digit `0`; intermediate result `11` → check digit `5`.
- **Country code** (positions 12–13): confirmed, directly from the official standard, to identify the **issuing postal administration**, not the destination, current custodian, or delivery operator.
- **Service indicator** (positions 1–2): confirmed to identify a **product/service category** (e.g. EMS), not a specific postal operator.

**EMS classification**, confirmed against the same primary standard document (Table 5.6, "Assigned service indicators by product type"):

- EMS is assigned the service-indicator range `EA`–`EZ`.
- `EA`–`EW` is the standard (non-bilateral) sub-range.
- `EX`–`EZ` requires bilateral agreement between specific postal operators, but remains part of the EMS product-type row — it was still classified as EMS (with the bilateral condition carried only as internal technical metadata, never shown to the user), not excluded or reclassified.
- Public design decision (approved): EMS did **not** get its own `identifierType` value. It continued to use `identifierType: "international-postal"`, with the EMS-vs-other distinction carried only in the internal `reason`/`recommendedAction` keys (`s10_ems_standard_valid`, `s10_ems_bilateral_valid`, `s10_ems_invalid_check_digit`). This preserved the existing nine-field detector contract without adding a public field.
- A valid check digit was **required** before any high-confidence EMS classification — a structurally S10-shaped, `E`-prefixed value with an invalid check digit was reported as an invalid S10 identifier, never as a special "invalid EMS" case.
- Non-EMS S10 categories (`RR` registered mail, `LX` tracked letter post, `CP` international parcel post, insured mail, e-commerce parcels) never reached a confirmed range beyond a single observed prefix each; they remained classified as `postal-unsupported` and were never implemented as named categories.
- No postal operator (including Israel Post) was ever identified from the country code or service indicator; no postal routing URL was ever built or approved for anything but the generic EMS Cooperative page (Section 6).

## 6. Commercial courier detection: UPS and UPS Roadie (historical)

The only commercial courier(s) that ever reached approved, structural-only local detection were UPS Small Package and UPS Roadie, based on an officially fetched UPS specification (`UPSTrackAlertEnhanced.yaml`, from `github.com/UPS-API/api-documentation`):

- **UPS `1Z`** (display name "UPS", internal ID `ups`): literal prefix `1Z` + 16 uppercase alphanumeric characters (`[0-9A-Z]`) = 18 characters total.
- **UPS Roadie `1R` short** (display name "UPS Roadie", internal ID `ups-roadie`): `1R` + 14 alphanumeric characters = 16 total.
- **UPS Roadie `1R` long** (same display name/ID): `1R` + 26 alphanumeric characters = 28 total.
- **No check-digit algorithm was ever officially confirmed for any of the three formats.** `valid: true` for a UPS/Roadie match meant *structural validity only* — never shipment existence, UPS confirmation, check-digit validation, or live tracking data. This distinction was explicitly approved to avoid confusion with the check-digit-validated meaning of `valid: true` used by the container/AWB/postal detectors.
- `possibleCarriers` for a match was a frozen array of internal carrier-ID strings only (`["ups"]` or `["ups-roadie"]`) — never a nested public carrier object.
- **UPS Mail Innovations was explicitly excluded** from all detection — its identifiers are USPS-format numeric strings with no `1Z`/`1R` prefix and were never treated as UPS.
- **DSV, DHL, FedEx, and Aramex never reached implementation.** All four remained officially deferred (see `TRACKING_EVIDENCE_MATRIX.md` for the evidence status of each) and were never added as possible carriers, including in ambiguous multi-candidate matches.

## 7. Official tracking links / "safe external routing" (historical)

FreighTime never retrieved live tracking data. The only live-tracking-adjacent feature it ever shipped was an explicit, user-clicked outbound link to a carrier's *own* official tracking page, governed by these approved rules:

- **Approved destinations (generic landing pages only, no identifier in the URL):**
  - UPS `1Z` → `https://www.ups.com/track?loc=EN_US`
  - UPS Roadie `1R` → `https://track.roadie.com/`
  - EMS → `https://items.ems.post/`
- **Identifier prefill was never approved for any destination or any identifier family.** The tracking number was never placed in a URL, query parameter, or fragment for any carrier — only the bare generic landing page was linked.
- **Deferred / never approved for a link at all:** generic non-EMS S10 (issuing-country suffix is not sufficient evidence of the correct national operator), AWB (no verified airline-prefix registry existed), ocean container (BIC owner code is not sufficient evidence of the operating carrier).
- **Mandatory link requirements**, applied to every approved destination:
  - Never navigate automatically — only an explicit user click could trigger navigation.
  - Disclose, before the click, that the destination is external and the official carrier/operator's own site.
  - Open in a new tab with `target="_blank"` and `rel="noopener noreferrer"`.
  - No FreighTime-side logging, analytics, or storage triggered by the click or its presentation.
  - Never offered for an `ambiguous`, `unrecognized`, or `recognized-invalid` result — only for a `recognized-valid` result of a family with an approved destination.
- **Approved Hebrew copy** (recorded, for the three approved families):
  - Button: `מעבר לאתר המעקב הרשמי`
  - Disclosure: `הקישור ייפתח באתר חיצוני. יש להזין שם את מספר המעקב.`
- Placing an identifier in any URL was treated as a materially higher-risk action than a generic link, because URLs can leak through browser history, `Referer` headers, server logs (on both sides), and shared/copy-pasted links — this reasoning is why prefill was never approved.

## 8. In-house live tracking design (designed, never implemented)

A later design (`INHOUSE_TRACKING_ARCHITECTURE.md`) proposed — but never built — a backend that would fetch live UPS tracking data server-side and return a minimal, normalized result to the browser, strictly additive to (never replacing) the existing local detection result and official-link behavior. Key approved-but-unbuilt decisions:

- **Backend platform (approved, never provisioned):** Azure Functions with Node.js, in a **separate** repository (`freightime-tracking-api`) — never in the `freightime-preview` frontend repository.
- **First implementation mode (approved, never built):** mock-only — no UPS credentials, no UPS API call, no live tracking data, ever, in the first phase. The mock would accept only synthetic UPS `1Z` fixtures (e.g. `1ZCIETST0111111114`, `1ZCIETST0422222228`, UPS's own labeled test values) and deterministically produce one of six scenarios: `in_transit`, `delivered`, `not_found`, `provider_unavailable`, `invalid_input`, `rate_limited`.
- **Security baseline for any such backend** (approved as mandatory, for the record — never implemented since no backend was built): HTTPS everywhere, restricted CORS (no wildcard origin), JSON-only request bodies with a size limit, input length/character validation before any upstream call, mandatory rate limiting (inbound and outbound), no tracking-identifier logging by default, no public/shared-cache of responses, generic error messages with no stack traces or raw upstream error bodies, no credential ever present in a repository file or a browser-delivered response, server-side-only credential storage, a bounded/small fixed retry count (no unlimited retries), and no real customer identifiers in tests.
- **Provider-neutral response contract (designed, never implemented):** `provider`, `trackingNumberMasked` (identifier masked, never returned in full), `statusCode`, `statusLabel`, `latestEventTime`, `latestEventLocation` (coarse only, never a precise address), `estimatedDelivery`, `delivered`, `events` (short milestone list only), `source`, `retrievedAt`. Explicitly excluded from this contract: the full raw upstream response, recipient personal information, signatures, delivery addresses, contact details, and proof-of-delivery images.
- **Fallback behavior (designed):** if live tracking was ever unavailable, the existing local detection result and its message would keep rendering unaffected, a distinct "live status unavailable" message would show, the existing official-tracking-page link would remain visible, a provider outage would never be presented as "not found," raw upstream errors would never reach the browser, and no automatic/indefinite retry would occur.
- **Roadmap status:** a 20-stage roadmap was defined; only stage 1 (the architecture decision itself) was ever completed. No repository, code, dependency, or credential for this backend was ever created.

## 9. FCL / ocean container live tracking design (designed, never implemented)

A later design (`FCL_CONTAINER_TRACKING_DESIGN.md`) covered **full-container-load ocean tracking only**, for a strictly scoped set of data points (shipping line, ETA, vessel name, voyage number when available, latest milestone, latest event location, port of loading, port of discharge, retrieval time; vessel coordinates optional and conditioned). It was never implemented — no backend, endpoint, or frontend code was ever built for it. Key approved-but-unbuilt decisions:

- **Carrier-confirmation model (approved): explicit user selection only** (Model A) — the user manually picks the carrier from a small fixed list (MSC, ZIM, Maersk, the only three researched). The design explicitly rejected inferring the operating carrier from the container's BIC owner-code prefix (Model B) or from an automated multi-carrier discovery fan-out (Model C) for the first release.
- **Carrier evidence status at the time this design stopped being pursued:**
  - MSC: an official DCSA Track and Trace API confirmed to exist (project-owner-verified); authentication, sandbox, exact schema, and commercial eligibility never verified.
  - ZIM: an official, registration-gated API confirmed to exist, using OAuth 2.0 Client Credentials, with a described sandbox; exact response fields never verified.
  - Maersk: an official "Track and Trace Plus" Ocean Track and Trace product confirmed to exist; authentication and commercial-access requirements never verified; vessel-coordinate availability explicitly remained unverified.
- **Vessel position / AIS:** the design's recorded conclusion was that vessel coordinates were **unavailable from any of the three researched carriers' official channels**, as far as the research could confirm. No unofficial AIS source was ever approved or used; coordinates were never to be inferred from a vessel name, and were never to be described as real-time unless the authorized source itself guaranteed it. A future AIS adapter was explicitly scoped as requiring separate approval, a licensed (non-scraped) data source, vessel-identity confirmation, a freshness threshold, and clear attribution — none of this was ever built.
- **ETA design rule (approved):** an ETA was never to be a bare timestamp — it required a structured value carrying the target milestone/port, the source, the retrieval time, and `null` when unavailable (never a fabricated/inferred date).
- **Fixed milestone set (designed, never implemented):** `BOOKED`, `EMPTY_RELEASED`, `EMPTY_PICKED_UP`, `GATE_IN`, `LOADED`, `VESSEL_DEPARTED`, `TRANSSHIPMENT_ARRIVED`, `TRANSSHIPMENT_DEPARTED`, `VESSEL_ARRIVED`, `DISCHARGED`, `AVAILABLE_FOR_PICKUP`, `GATE_OUT`, `EMPTY_RETURNED`, `DELIVERED`, `UNKNOWN` — no customs-clearance milestone was ever included, since customs status was explicitly out of scope.
- Explicitly out of scope for this design at every stage: LCL shipments, House Bill of Lading tracking, partial-shipment status, freight-forwarder references, and customs-clearance milestones.

## 10. Copy-number behavior (historical)

The project's routing design (Section 7) never approved placing an identifier into any outbound URL. Where the product surfaced a "copy the tracking number" affordance, it was scoped narrowly: an explicit, user-initiated copy action, never automatic, never combined with navigation, and never logged. No copy-to-URL prefill behavior was ever approved for any carrier or postal family.

## 11. Privacy constraints (historical, cross-cutting)

These constraints applied across every stage of the removed feature and its unbuilt extensions:

- Shipment identifiers were treated as potentially sensitive operational data throughout.
- No product data (a tracking identifier, in particular) was ever placed in an outbound URL, query parameter, or fragment for any approved external link.
- No identifier was logged by default; where any future logging was ever contemplated, only a masked form was permitted.
- No persistent identifier storage existed in the shipped product — no cookie, `localStorage`, `sessionStorage`, or database ever captured an entered identifier (verified at the time by dedicated tests).
- No credential of any kind (UPS, ZIM, MSC, Maersk, or otherwise) was ever placed in browser-delivered code, and none was ever obtained or used — every backend design remained mock-only or entirely undesigned at the credential stage.
- No carrier or postal operator was ever inferred from a bare structural fragment of an identifier (container owner code, AWB airline prefix, S10 country suffix) without a verified, authoritative registry backing that inference — and no such registry was ever built.

## 12. Rejected / never-approved unsafe routing patterns

The following patterns were explicitly considered and explicitly **rejected** or left permanently unapproved, and must not be treated as a menu of options for any future work without new authorization:

- **Prefilled tracking URLs** for any carrier or postal family — never approved, for any of the six identifier families ever detected.
- **Inferring the operating shipping line from a container's BIC owner code** — explicitly rejected; ownership and the operating carrier for a given shipment are independent facts.
- **Inferring the issuing/operating carrier from an AWB's numeric prefix alone**, without a verified prefix→airline→destination registry — never approved; no such registry was ever built.
- **Routing generic (non-EMS) S10 identifiers by country suffix alone** — explicitly rejected; the issuing-country code does not identify a specific tracking operator or guarantee that operator offers public tracking at all.
- **Adding DSV, DHL, FedEx, or Aramex as possible carriers based on generic numeric length alone** — explicitly rejected in every research document that touched these carriers; none of the four ever had a distinctive, officially verified prefix or check digit.
- **Using an unofficial/scraped AIS source for vessel position, or presenting any position as real-time without an explicit source guarantee** — explicitly rejected.
- **Any router result triggering automatic external navigation** — never permitted at any stage; every external link required one explicit user click.
- **Any live provider (UPS, ZIM, MSC, Maersk) API call from the browser directly** — never permitted; every live-tracking design routed exclusively through a server-side backend that was, itself, never built beyond a documented mock design.

## 13. Known detection boundaries (historical)

- **Structural detection ≠ mathematical validation ≠ shipment existence.** Container, AWB, and S10 all had a confirmed check-digit algorithm; UPS `1Z`/`1R` never did. A `valid: true` UPS/Roadie result meant structural validity only.
- **Structural overlap was checked, not assumed.** S10 (13 chars, letter/digit/digit/letter layout) was structurally distinct from container (11 chars) and AWB (11 digits, no letters) by length and character composition alone. Overlap between S10/container/AWB and any future courier format was explicitly flagged as needing re-verification once (if ever) additional courier formats were confirmed — this re-verification never happened because no additional courier format was ever confirmed.
- **UPS Mail Innovations was a known, accepted detection gap** — its USPS-format numeric identifiers carry no `1Z`/`1R` prefix and were never recognized by the UPS detector, by design (to avoid conflating it with native USPS identifiers or other couriers' numeric formats).
- **DSV, DHL, FedEx, and Aramex all remained below the evidence bar for even a "possible match."** See `TRACKING_EVIDENCE_MATRIX.md` for the specific evidence level, gaps, and blockers recorded for each.
- **FCL/ocean carrier capability confirmation stalled at "official API confirmed to exist,"** never reaching confirmed authentication, sandbox access, or a confirmed response schema for MSC, ZIM, or Maersk.

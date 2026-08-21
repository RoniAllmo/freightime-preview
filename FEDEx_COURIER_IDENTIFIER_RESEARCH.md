# FedEx Parcel Identifier Research

> **Removed feature:** The implementation described in this document is no longer active. FreighTime's "Single-input tracking router" was removed from the public product in full (see `CLAUDE.md` §1 and `IMPORT_READINESS_V1.md` §10). This file is retained only as historical reference.

Research date: 2026-08-04

## 1. Research purpose

This document researches the feasibility of local, format-based identifier detection for FedEx commercial parcel identifiers (FedEx Express, FedEx Ground, FedEx Ground Economy). It is research and documentation only — no detection code, pattern, or rule is implemented or approved for implementation by this document.

## 2. Scope and freight exclusion

**In scope:** FedEx Express, FedEx Ground, FedEx Ground Economy, FedEx parcel/small-package tracking, FedEx Basic Integrated Visibility (formerly "Track API"), FedEx Advanced Integrated Visibility only where relevant to tracking-number structure, and official FedEx tracking interfaces.

**Explicitly excluded:** FedEx Freight, less-than-truckload (LTL) freight, freight forwarding, air cargo, master air waybills, ocean freight, booking references, customer references, container tracking, FedEx Office order references, EMS, UPU S10, DSV, UPS, DHL, and Aramex. Where a search result mentioned FedEx Freight or a reference-number type in passing (e.g. the Track lookup tool's own description lists FedEx Freight and customer references as accepted input types alongside parcel tracking numbers), it is noted only to explicitly exclude it, not analyzed as evidence for parcel/courier detection.

## 3. FedEx parcel-product separation

Search-engine synthesis referencing the FedEx Developer Portal indicates that FedEx Express, FedEx Ground, and FedEx Ground Economy are documented as distinct service lines within FedEx's tracking ecosystem — for example, a FedEx Ground Economy-specific developer-portal announcement page was found (`Apr2022-FGEAnnouncements.html`), separate from general Express/Ground documentation. This mirrors the division-separation pattern already observed for DHL (`DHL_COURIER_IDENTIFIER_RESEARCH.md` Section 3): FedEx does not appear, from available evidence, to operate one single universal tracking-number scheme across all its parcel-adjacent products.

## 4. Official FedEx tracking interfaces

The primary official interface researched is FedEx's **Basic Integrated Visibility** API (referred to in developer-portal page titles simply as the "Track API"), hosted under `developer.fedex.com/api/.../catalog/track/`. **Advanced Integrated Visibility** and a **Tracking Number Subscription** API are also referenced by page title (`tracking-number-subscription/document.html`) but were not directly read. The general public FedEx.com tracking page (`fedex.com/en-us/tracking.html`) is also referenced as an interface, consistent with FedEx's own tracking guide content surfaced by search.

## 5. Basic Integrated Visibility findings

Per search synthesis referencing FedEx's own Track API/tracking-guide pages, the Track lookup accepts **up to 30 identifiers per request**, of several distinct types (see Section 13 for full detail): FedEx tracking number, door tag number, FedEx Office order number, Transportation Control Number (TCN), and reference numbers (purchase order, customer reference, invoice, Bill of Lading, part number) — the last of which explicitly apply "to FedEx Express, FedEx Freight, FedEx Ground, and FedEx Ground Economy" per the synthesized guide text. **No field-level length or character-set constraint specific to the tracking-number identifier type was found** in any source reached during this research — search results reference only the request-level "up to 30 identifiers" constraint, not a per-identifier pattern.

**Access limitation:** every `developer.fedex.com` URL attempted (the Track API docs landing page, the FedEx Ground Economy announcement page, and the API Authorization documentation page) returned **HTTP 403 Forbidden** via direct `WebFetch`, consistent with the same environment-level network restriction already documented for UPU, DSV, DHL, and `developer.ups.com` in prior research tasks. A general search for a FedEx GitHub organization hosting reachable OpenAPI specifications (the approach that succeeded for UPS) found **no such repository** — only unofficial, non-authoritative third-party repositories (e.g. `clooney/fedex-tracking-api`, `mantrax314/fedex-tracking-api-wrapper`), which are explicitly excluded from consideration as authoritative sources per the task's rules. As a result, **no FedEx source was directly read in this research** — every finding below is sourced through `WebSearch` synthesis referencing official page titles and snippet content, at the same reduced-confidence tier as the DHL research in this phase, not the directly-fetched tier achieved for UPS.

## 6. FedEx Express identifier evidence

No officially confirmed format was found. The commonly repeated secondary claim — a 12-digit numeric tracking number (e.g. illustrative form `961234567890`) — is the same unverified claim already recorded in `COURIER_EMS_RESEARCH.md`, and no stronger or new official corroboration was found in this research session.

## 7. FedEx Ground identifier evidence

No officially confirmed format was found. Secondary sources claim a 15-digit numeric tracking ID as the "modern default," with some sources noting older/commercial labels sometimes use a 12-digit format instead. This is internally inconsistent across sources and not confirmed by any official FedEx page found in this research.

## 8. FedEx Ground Economy identifier evidence

This is the most concrete (though still not directly read) finding in this document. A FedEx Developer Portal announcement page specifically for FedEx Ground Economy (`Apr2022-FGEAnnouncements.html`) was identified by search, and the resulting synthesis describes FedEx Ground Economy shipment labels as including **"a 12-digit FedEx master tracking number with a 34-digit FedEx barcode string."** This 12-digit/34-digit pairing is attributed to the official announcement page's title/indexed content, giving it somewhat higher confidence than the plain secondary-aggregator claims for Express/Ground — but the page itself was not directly opened (blocked, Section 5), so this remains **unconfirmed at the "directly verified" tier**. Additional claims found alongside this (a "92" numeric prefix, "SSCC-18"/GS1-128 barcode structure, and specific claims that the barcode encodes postal code/service type/account identifier) were **not** attributed to the official announcement page in the search synthesis and are treated here as **secondary/unverified only** — they must not be conflated with the more directly-attributed 12-digit/34-digit claim.

## 9. Published tracking-number lengths

No length was found with a directly-read official source. In summary of the (unconfirmed) claims gathered:

- FedEx Express: 12 digits (secondary-sourced only)
- FedEx Ground: 15 digits, with some 12-digit legacy/commercial variants claimed (secondary-sourced only, internally inconsistent)
- FedEx Ground Economy: 12-digit master tracking number + separate 34-character barcode string (search-synthesized from an official-page title, moderate confidence)
- FedEx Door Tag: "DT" + 12 digits (search-synthesized, referencing FedEx's own tracking-guide page — see Section 10)

None of these lengths were confirmed via a directly-read regex, schema, or field-length specification.

## 10. Character and prefix rules

**Door tags** are the one identifier family in this research with a distinctive, letter-based prefix: **"DT" followed by 12 numeric digits**, per search synthesis referencing FedEx's own tracking-guide page ("Tracking and Managing Deliveries | FedEx"). However, a door tag is a notice left at a delivery address when a recipient is unavailable — **not** the primary parcel tracking number a customer would typically enter into a search field — so its practical relevance to this project's "single tracking identifier input" use case is limited, even though it is the most distinctively-prefixed FedEx identifier family found. No distinctive prefix was found for the primary FedEx Express, Ground, or Ground Economy tracking numbers themselves — all are described (with varying, unconfirmed confidence) as plain numeric strings.

## 11. Barcode and public tracking-number relationship

For FedEx Ground Economy specifically, the search-synthesized finding (Section 8) describes a **34-character barcode string** as distinct from the **12-digit master tracking number** printed/displayed to the customer — implying the barcode is not identical to the public-facing tracking number but instead encodes it alongside additional routing/service data. This relationship (barcode ≠ public tracking number, for at least this one product) was not directly confirmed by reading the official specification, and no equivalent finding was obtained for FedEx Express or standard FedEx Ground.

## 12. Check-digit evidence

**Not found in any officially-sourced or search-synthesized reference to an official page.** No source located in this research — official or secondary — described a specific check-digit algorithm for any FedEx tracking-number family with a citation to an official FedEx source. (`COURIER_EMS_RESEARCH.md` previously recorded an unconfirmed secondary claim of a "Modulo 11, last-digit check" for FedEx; this research did not find any new evidence to confirm or refute that claim.)

## 13. Tracking-request identifier types

Per search synthesis referencing FedEx's own Track API/tracking-guide documentation, the lookup tool accepts several distinct identifier types in a single request (up to 30 total):

- FedEx tracking number (the parcel identifier itself — in scope for this research)
- Door tag number (`DT` + 12 digits — in scope, see Section 10)
- FedEx Office order number (explicitly **out of scope** per this task's exclusions)
- Transportation Control Number (TCN) — a distinct identifier type (commonly associated with U.S. government/DoD logistics shipments); its structure was not documented in any source found, and it is not analyzed further here since it falls outside "commercial parcel identifiers"
- Reference numbers (purchase order, customer reference, invoice, Bill of Lading, part number) — explicitly **out of scope** per this task's exclusion of "customer references" and "booking references," and explicitly stated (per the synthesized source) to apply across FedEx Express, FedEx Freight, FedEx Ground, and FedEx Ground Economy alike, meaning these are not tracking numbers at all and must never be treated as such by a future detector.

Whether the API can *automatically distinguish* which identifier type was submitted (research question 16) was **not confirmed** by any source found — no description of type-detection logic in the API was located.

## 14. Identifier overlap and ambiguity

- **FedEx Express (claimed 12-digit numeric)** and **FedEx Ground (claimed 15-digit numeric, sometimes 12-digit)** would, if ever implemented on the current unconfirmed evidence, overlap significantly with other numeric identifier schemes from other couriers, and even with each other (both claim a possible 12-digit form).
- **FedEx Ground Economy's 12-digit master tracking number** shares the same length as the claimed FedEx Express format, meaning digit-count alone cannot distinguish between the two even if both were eventually confirmed.
- **Door tags (`DT` + 12 digits)** are distinctive but represent a different identifier purpose (a delivery-attempt notice, not the shipment's primary tracking number), so recognizing them would not serve the same product need as recognizing a parcel tracking number.
- **Reference numbers and TCNs** explicitly must never be treated as tracking numbers, since they are customer/business references or government logistics identifiers, not carrier-assigned parcel identifiers — a future detector must be careful not to conflate "the Track API accepts many identifier types" with "any numeric string is a plausible tracking number."

## 15. API availability, authentication, and browser limitations

- FedEx APIs (including Basic Integrated Visibility) use **OAuth 2.0** via a client-credentials flow: a `client_id` and `client_secret` are exchanged for a bearer access token, which expires after **60 minutes** and must be renewed. This is search-synthesis-referenced from FedEx's own "API Authorization Documentation" page title, not directly read.
- FedEx's own **Best Practices** documentation (page title referenced, not directly read) is described by the search synthesis as **explicitly stating** that API Key/Secret values must not be distributed via email or client-side code (including client-side JavaScript), and that access tokens must be stored on the web-application server only, never exposed to the browser.
- No official statement specifically using the term "CORS" was located, but the explicit "never expose to the browser" guidance above functionally answers the same underlying concern.
- **Conclusion:** consistent with every other courier researched in this project (DSV, UPS, DHL), the FedEx Track API is **not** open/anonymous, and **direct browser-side API access would be inappropriate** — doubly so given FedEx's own documented guidance against client-side credential exposure, which aligns with `CLAUDE.md`'s existing credential rules.

## 16. Local detection feasibility

No FedEx parcel tracking-number format researched in this document currently supports high-confidence local recognition:

- FedEx Express and FedEx Ground length claims rest entirely on secondary, mutually-inconsistent sources.
- FedEx Ground Economy has the strongest (though still unconfirmed) evidence — a 12-digit tracking number referenced via an official-page title — but 12 digits alone is not distinctive enough to separate it from Express's claimed format or from unrelated numeric strings.
- Door tags have a distinctive prefix (`DT` + 12 digits) but are not the primary tracking-number identifier type relevant to this product's use case.
- No official check-digit algorithm was found for any FedEx family, and no official regex/schema pattern was found for the tracking-number field itself.

This places FedEx in a similar evidentiary position to DHL in this phase — weaker than UPS (which had a directly-fetched official regex), and arguably weaker even than DSV (which at least had one project-owner-supplied concrete example, however limited).

## 17. Proposed safe recognition options

### Option A: Recognize only a FedEx format that has a distinctive, directly verified prefix and complete official structure

**Not applicable to primary parcel tracking numbers** — no FedEx Express/Ground/Ground Economy tracking number has a distinctive prefix or a directly-verified complete structure in this research. The one distinctive-prefix family found (`DT` + 12 digits, door tags) is not a parcel tracking number and is out of scope for the product's core "enter a tracking identifier" use case, so Option A does not meaningfully apply here.

### Option B: Recognize officially documented FedEx numeric lengths only as possible FedEx matches

**Not currently applicable either**, since no FedEx numeric length was *officially* documented with direct-read confidence in this research — the closest is the Ground Economy 12-digit claim, sourced only via search synthesis referencing an official page title, not direct verification.

### Option C: When a numeric identifier matches both FedEx and another courier family, return several possible courier matches

The most defensible fit for FedEx's current evidence state **if and when** any FedEx numeric length is eventually confirmed — plain numeric strings of common lengths (12, 15 digits) inherently overlap with other couriers' claimed formats (e.g. DHL Express's claimed 10-digit, or other 12/15-digit schemes), so any future recognition should default to ambiguous/multi-candidate handling rather than confident single-carrier attribution, mirroring the same conclusion already reached for DHL.

### Option D: Do not implement local FedEx recognition and require user selection or future API verification

**Recommended as the primary posture**, based strictly on the evidence quality gathered. No FedEx parcel tracking-number format has been confirmed by a directly-read official source in this session, and the strongest available lead (Ground Economy 12-digit) is still only page-title-level search synthesis, not verified content.

**Combined recommendation:** **Option D now**, with **Option C reserved as the eventual fallback behavior** if FedEx numeric formats are later officially confirmed (mirroring the identical conclusion reached for DHL in this same phase) — given the near-total absence of distinctive prefixes for actual parcel tracking numbers (as opposed to door tags) and the significant length overlap between FedEx's own claimed sub-formats and other couriers' claimed formats. **This recommendation requires project-owner approval before any implementation** and does not itself authorize any detection rule.

## 18. Proposed detector-result behavior

Not implemented at this stage, and not currently proposed in concrete form given the Option D recommendation. If future evidence strengthens this position, any FedEx-aware detector result would need to follow the same structured contract already used by `detect-container.js`, `detect-awb.js`, and `detect-postal.js` (`identifierType`, `matched`, `normalizedIdentifier`, `possibleCarriers`, `confidence`, `valid`, `ambiguous`, `reason`, `recommendedAction`), with `confidence` capped well below `"high"` and ambiguous/multi-candidate handling (Option C) strongly preferred over confident single-carrier attribution, consistent with the DHL research's equivalent conclusion. This is a conceptual note only, not a design decision.

## 19. Open product decisions

The following require explicit project-owner decisions and are not resolved by this document:

- Whether to pursue direct FedEx Developer Portal access through another channel (different network environment, or a manually supplied document, mirroring how the UPU S10 blocker was resolved) before any FedEx implementation work.
- Whether FedEx should be deprioritized relative to UPS (the strongest evidence so far in this phase) in any future implementation wave.
- Whether door tags (`DT` + 12 digits) are worth recognizing at all, given they are not the primary tracking-number use case for this product.
- Whether the project owner can supply an official FedEx tracking-number example (similar to the DSV `DSVPH#########` evidence) to help corroborate or refute the secondary-sourced length claims recorded here.
- Whether FedEx, DHL, DSV, and UPS should be evaluated together for a single combined implementation-wave decision once Aramex research is also complete.

## 20. Recommended next stage and explicit exclusions

**Recommended next stage:** complete the approved commercial-courier research sequence with **Aramex** — the last remaining candidate — using the same directly-fetch-first methodology attempted throughout this phase (checking for a reachable official GitHub-hosted spec or directly-fetchable developer-portal page before falling back to search synthesis), so that all five candidates (DSV, UPS, DHL, FedEx, Aramex) can be compared on a consistent evidentiary basis before any single project-owner-approved implementation-wave decision. This recommendation is not carried out by this document.

This research task does **not** authorize:

- Production implementation of any FedEx detection rule
- Creation or modification of `detect-courier.js`
- Creation or modification of `carrier-registry.js`
- Modification of `router.js`
- Modification of `index.html`
- Addition of any tracking URL
- Research or implementation of FedEx Freight, LTL freight, freight forwarding, air cargo, master air waybills, or ocean freight
- Research or implementation of booking references, customer references, or FedEx Office order references
- Research or implementation of DSV, UPS, DHL, or Aramex (each covered separately)
- Container tracking work beyond the existing detector
- EMS classification or UPU S10 classification work
- Submission of any tracking number, real or synthetic, to a live FedEx tracking service or API
- Use of reverse-engineered FedEx website endpoints or unofficial GitHub code as evidence or as future test fixtures
- Copying operational tracking numbers observed in public search results into this document or any test fixture

## Evidence matrix

| Claim | FedEx product/division | Source authority | Source title | Source URL | Directly accessed | Evidence strength | Remaining uncertainty | Safe for local implementation |
|---|---|---|---|---|---|---|---|---|
| FedEx Developer Portal hosts Basic Integrated Visibility (Track API), Advanced Integrated Visibility, and a Tracking Number Subscription API | All | FedEx (official, referenced) | Basic Integrated Visibility \| FedEx Developer Portal; Advanced Integrated Visibility Tracking Number Subscription Documentation | https://developer.fedex.com/api/en-us/catalog/track.html ; https://developer.fedex.com/api/en-dz/catalog/tracking-number-subscription/document.html | No — 403 | Medium | Page content unread | Partial |
| Track lookup accepts up to 30 identifiers per request, of types: tracking number, door tag, FedEx Office order number, TCN, reference numbers | Express, Ground, Ground Economy, Freight (excluded) | FedEx (official, referenced) | Track API Documentation; Tracking and Managing Deliveries \| FedEx | https://developer.fedex.com/api/en-us/catalog/track/docs.html ; https://www.fedex.com/en-us/tracking/guide-for-tracking-managing-deliveries.html | No | Medium | Exact schema/field names unread | Partial |
| Door tag numbers are "DT" + 12 digits | All (delivery-attempt notices) | FedEx (official, referenced) | Tracking and Managing Deliveries \| FedEx | https://www.fedex.com/en-us/tracking/guide-for-tracking-managing-deliveries.html | No | Medium | Not directly read | Partial |
| FedEx Ground Economy labels include a 12-digit master tracking number and a 34-character barcode string | FedEx Ground Economy | FedEx (official, referenced) | April 2022 - FedEx Ground Economy Announcements | https://developer.fedex.com/api/en-us/announcements/Apr2022-FGEAnnouncements.html | No — 403 | Medium (attributed to an official page title) | Page content unread; barcode-composition detail (SSCC-18, encoded fields) unconfirmed | Partial |
| FedEx Express uses a 12-digit numeric tracking number | FedEx Express | Secondary aggregators (not authoritative) | ParcelDetect FAQ, Ship24, 17TRACK | (multiple aggregator URLs, not cited as sole evidence) | No | Low | Not confirmed by any FedEx source | No |
| FedEx Ground uses a 15-digit numeric tracking number (with some 12-digit variants) | FedEx Ground | Secondary aggregators (not authoritative), internally inconsistent | ParcelDetect FAQ, InstantParcels, ParcelPath | (multiple aggregator URLs, not cited as sole evidence) | No | Low | Not confirmed; conflicting length claims | No |
| FedEx Ground Economy barcode encodes postal code, service type, and account identifier (SSCC-18/GS1-128 style) | FedEx Ground Economy | Secondary blogs (not authoritative) | BulkBarcode blog, BarcodesInc | (aggregator/blog URLs, not cited as sole evidence) | No | Low | Not attributed to any official FedEx source | No |
| FedEx tracking-number check-digit algorithm (Modulo 11, last digit) | Express/Ground (unspecified) | Secondary (not authoritative, already recorded in COURIER_EMS_RESEARCH.md) | (aggregator sources) | (not re-cited here) | No | Low | Never confirmed by an official FedEx source | No |
| FedEx APIs use OAuth 2.0 client-credentials flow; 60-minute token expiry; credentials/tokens must never be exposed to the browser | All (API-wide) | FedEx (official, referenced) | API Authorization Documentation; Best Practices \| FedEx Developer Portal | https://developer.fedex.com/api/en-us/catalog/authorization/docs.html ; https://developer.fedex.com/api/en-us/guides/best-practices.html | No — 403 | Medium-high (specific, directly-quotable guidance referenced) | Exact token scope/claims unread | Yes (sufficient to conclude "not open access, not browser-appropriate") |
| Reference numbers (PO, customer reference, invoice, BOL, part number) apply across Express/Freight/Ground/Ground Economy and are not tracking numbers | All (explicitly non-tracking-number identifier type) | FedEx (official, referenced) | Tracking and Managing Deliveries \| FedEx | https://www.fedex.com/en-us/tracking/guide-for-tracking-managing-deliveries.html | No | Medium | Not directly read | N/A (explicitly out of scope) |

No real customer tracking number was used, referenced, or submitted anywhere in this research. No identifier was submitted to any FedEx tracking service or API. No reverse-engineered FedEx website endpoint and no unofficial GitHub repository content was used as evidence.

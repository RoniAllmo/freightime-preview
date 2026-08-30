# Historical Tracking — Carrier/Identifier Evidence Matrix

> **HISTORICAL — NOT ACTIVE RUNTIME BEHAVIOR.** This is a snapshot of the carrier/identifier research the removed "Single-input tracking router" project produced. It is not current, has not been re-verified, and describes no active product capability. See `TRACKING_FEATURE_STATUS.md` for the current-state statement. Sourced only from the project's own 14 historical research/design documents — no internet access, no new research, was used to produce this table.

## Reading this table

- **Last known evidence** — the identifier format/regex/structure recorded in the source research, with its evidence level where the source used one.
- **Prior implementation status** — what actually shipped, if anything, at the time the feature was removed.
- **Confidence** — the confidence level the source research itself assigned (never upgraded here).
- **Collision risk** — documented overlap with other identifier families.
- **Official-link status** — whether an outbound "official tracking page" link was ever approved.
- **Historical test status** — whether automated tests existed for this identifier at the time of removal.
- **Last known limitation** — the single most important open gap recorded in the source research.

Evidence levels, as defined in `COURIER_IMPLEMENTATION_DECISION.md` §3: **Level 1** = directly inspected official spec; **Level 2** = official source identified but not directly read; **Level 3** = project-owner-supplied example, uncorroborated; **Level 4** = secondary/aggregator sources only, often inconsistent; **Level 5** = no evidence at all.

---

## Ocean container (ISO 6346)

| Field | Value |
|---|---|
| Format | 4 letters (BIC owner code + equipment category) + 7 digits, with a verified ISO 6346 check-digit algorithm |
| Evidence level | Level 1 equivalent — pre-existing, standards-based, implemented before the research phase covered by these documents |
| Prior implementation status | **Implemented and shipped** (`detect-container.js`) |
| Confidence | High (structural + check-digit validated) |
| Collision risk | None documented with AWB (11 digits, no letters) or S10 (13 chars); not assessed against any commercial courier format, since none of those were ever confirmed |
| Official-link status | **Not approved.** No single official pan-industry container tracking site exists; the BIC owner code identifies equipment ownership, not the operating carrier, so no link was ever approved (`SAFE_EXTERNAL_ROUTING_DESIGN.md` §11) |
| Historical test status | Tested (part of the original, removed `tests/tracking/*.test.js` suite per `INHOUSE_TRACKING_ARCHITECTURE.md`'s description of the pre-removal baseline) |
| Last known limitation | Owner code ≠ operating carrier; a container number alone proves equipment movement only, never shipment/booking identity, cargo contents, or customs status |

## Air waybill (AWB)

| Field | Value |
|---|---|
| Format | 11 digits, no letters (generic IATA Resolution 600a master-AWB convention), Modulus-7 check digit |
| Evidence level | Level 1 equivalent — pre-existing, standards-based |
| Prior implementation status | **Implemented and shipped** (`detect-awb.js`) |
| Confidence | High (structural + check-digit validated) |
| Collision risk | None documented with container or S10 by length/character composition; a future courier's numeric sub-format could theoretically coincide with 11 digits, but this was never confirmed as an actual risk |
| Official-link status | **Not approved.** No single official pan-industry AWB tracking site exists; the 3-digit numeric prefix identifies the issuing airline via IATA allocation, but no verified prefix→airline→tracking-URL registry was ever built (`SAFE_EXTERNAL_ROUTING_DESIGN.md` §10) |
| Historical test status | Tested (part of the pre-removal suite) |
| Last known limitation | Prefix identifies the issuing airline only if a registry existed to resolve it — none did; a bare number could never be safely routed to a specific airline |

## UPU S10 (international postal, non-EMS)

| Field | Value |
|---|---|
| Format | 13 chars: 2-letter service indicator + 8-digit serial + 1-digit check digit + 2-letter country code; weighted Modulus 11 check digit (weights `8,6,4,2,3,5,9,7`; boundary mapping `10→0`, `11→5`) |
| Evidence level | Level 1 — directly confirmed from the original UPU Technical Standard S10 document (Version 12) and the official UPU check-digit validation spreadsheet, both project-owner-supplied after network access to `upu.int` was blocked throughout |
| Prior implementation status | **Implemented and shipped** (`detect-postal.js`) for structure and check digit; specific non-EMS categories (`RR` registered mail, `LX` tracked letter post, `CP` international parcel post, insured mail, e-commerce parcels) never reached implementation — each had at most a single unconfirmed prefix observation and was classified `postal-unsupported` |
| Confidence | High for structure/check digit; **low** ("say so plainly") for any specific non-EMS category — none had a confirmed range |
| Collision risk | None documented with container or AWB (differing length/character layout) |
| Official-link status | **Deferred, never approved.** The country-code suffix does not identify a specific national operator's tracking site with sufficient confidence; would require an individually-verified country→operator registry that was never built (`SAFE_EXTERNAL_ROUTING_DESIGN.md` §9) |
| Historical test status | Tested (structure/check digit; part of the pre-removal suite) |
| Last known limitation | Non-EMS category ranges never confirmed beyond a single prefix each; country code identifies the *issuing* administration only, never the destination or current custodian |

## EMS (UPU S10, service indicators `EA`–`EZ`)

| Field | Value |
|---|---|
| Format | Same S10 structure as above, service indicator restricted to `EA`–`EZ` |
| Evidence level | Level 1 — directly confirmed from the original UPU Technical Standard S10 document, Table 5.6 ("Assigned service indicators by product type") |
| Prior implementation status | **Implemented and shipped** (`detect-postal.js`), including the `EA`–`EW` (standard) vs. `EX`–`EZ` (bilateral) distinction, carried only via internal `reason`/`recommendedAction` keys, never a separate public `identifierType` |
| Confidence | High, contingent on a valid check digit — a structurally EMS-shaped value with an invalid check digit was never classified as EMS |
| Collision risk | None documented (S10-wide structural distinctiveness applies) |
| Official-link status | **Approved.** Generic landing page only: `https://items.ems.post/`. No identifier prefill approved. Issuing-operator ambiguity (an EMS item may also be trackable via the issuing national postal operator) was noted but never resolved with a link |
| Historical test status | Tested (part of the pre-removal suite) |
| Last known limitation | `EX`–`EZ` requires bilateral agreement between specific postal operators — this condition was tracked internally but deliberately never surfaced to the user; no exception list within `EA`–`EZ` was ever ruled out (only 4 of 20 standard pages were directly read) |

## UPS `1Z` (Small Package)

| Field | Value |
|---|---|
| Format | Literal `1Z` + 16 chars `[0-9A-Z]` = 18 total |
| Evidence level | Level 1 — directly fetched official spec (`UPSTrackAlertEnhanced.yaml`, `github.com/UPS-API/api-documentation`) |
| Prior implementation status | **Implemented and shipped** (`detect-courier.js`), display name "UPS", internal ID `ups` |
| Confidence | High for structure only. **No check-digit algorithm was ever officially confirmed** — `valid: true` meant structural validity only, never mathematical validation, shipment existence, or UPS confirmation |
| Collision risk | Low for the `1Z` prefix itself; a random 18-char string starting `1Z` would satisfy the structural rule with no check digit to rule out a coincidental match |
| Official-link status | **Approved.** Generic landing page only: `https://www.ups.com/track?loc=EN_US`. No identifier prefill approved |
| Historical test status | Tested (part of the pre-removal suite) |
| Last known limitation | Check-digit algorithm never officially confirmed by any UPS source; a widely-cited secondary-source algorithm (odd/even weighting, mod 10) was never adopted |

## UPS Roadie `1R`

| Field | Value |
|---|---|
| Format | `1R` + 14 chars `[0-9A-Z]` (16 total, "short") **or** `1R` + 26 chars `[0-9A-Z]` (28 total, "long") |
| Evidence level | Level 1 — same official spec as UPS `1Z` |
| Prior implementation status | **Implemented and shipped** (`detect-courier.js`), display name "UPS Roadie" (kept distinct from "UPS"), internal ID `ups-roadie` |
| Confidence | High for structure only; same "no check digit" caveat as `1Z` |
| Collision risk | Higher than `1Z` — two valid lengths widen the space of coincidentally-matching strings |
| Official-link status | **Approved.** Generic landing page only: `https://track.roadie.com/`. No identifier prefill approved |
| Historical test status | Tested (part of the pre-removal suite) |
| Last known limitation | Same check-digit gap as `1Z`; two valid lengths never independently corroborated beyond the one official spec |

## UPS Mail Innovations

| Field | Value |
|---|---|
| Format | USPS-style numeric (e.g. a 26-digit `USPS_PIC` example found in the official UPS Track API spec); no `1Z`/`1R` prefix |
| Evidence level | Level 1 for the *existence* of this category and one example value; no confirmed length range or check digit |
| Prior implementation status | **Explicitly excluded** — never implemented, and explicitly must not be inferred from a generic USPS-style numeric string |
| Confidence | Not applicable — excluded by design, not a confidence question |
| Collision risk | High if ever implemented — indistinguishable from native USPS identifiers or a future generic long-numeric detector without external confirmation |
| Official-link status | Not approved; never designed |
| Historical test status | Not tested (never implemented) |
| Last known limitation | No official length/character/check-digit specification was ever found beyond the single example |

## DSV

| Field | Value |
|---|---|
| Format | `DSVPH` + 9 digits (14 total) — from a single project-owner-supplied, masked example only |
| Evidence level | **Level 3** — one project-owner example, zero independent corroboration |
| Prior implementation status | **Never implemented.** Status: `deferred_pending_evidence` |
| Confidence | Low — explicitly not to be treated as a documented standard; the source research states plainly that `PH` has no approved meaning and 9 trailing digits is not an approved universal rule |
| Collision risk | High if ever implemented on this evidence alone — both false-positive (an unrelated string could coincidentally match) and false-negative (DSV may use other, unobserved prefixes) risk were flagged |
| Official-link status | Not approved; never designed |
| Historical test status | Not tested (never implemented) |
| Last known limitation | Single unconfirmed example; no official DSV source was ever directly read (developer portal access was blocked throughout) |

## DHL

| Field | Value |
|---|---|
| Format | No confirmed format. DHL Express reportedly 10-digit numeric with a Modulo-7 check digit (unconfirmed); DHL eCommerce (US domestic) reportedly reuses the full USPS IMpb/PIC number, not a DHL-distinctive format; DHL Paket/Germany variously claimed as 12-digit, 20/21-digit, `JD`-prefixed, or `GM`-prefixed, with sources mutually contradicting each other |
| Evidence level | **Level 2/4** — official pages referenced by title only, never directly read; secondary aggregator claims are internally inconsistent |
| Prior implementation status | **Never implemented.** Status: `deferred_due_to_ambiguity` |
| Confidence | Low — no claim in this row should be read as verified |
| Collision risk | High — DHL Express's claimed 10-digit shape overlaps with generic numeric formats; DHL eCommerce domestic identifiers are literally USPS-format and indistinguishable from native USPS numbers |
| Official-link status | Not approved; never designed |
| Historical test status | Not tested (never implemented) |
| Last known limitation | No distinctive, officially-confirmed prefix exists for any DHL parcel/courier product; DHL operates several separate, division-specific identifier schemes rather than one universal format |

## FedEx

| Field | Value |
|---|---|
| Format | No confirmed format. FedEx Express reportedly 12-digit numeric (unconfirmed); FedEx Ground reportedly 15-digit, with some 12-digit legacy variants claimed (unconfirmed, inconsistent); FedEx Ground Economy reportedly a 12-digit master tracking number plus a separate 34-character barcode (attributed to an official page title, but the page itself was never read); FedEx door tags (`DT` + 12 digits) are a distinctive but different identifier — a delivery-attempt notice, not a primary tracking number |
| Evidence level | **Level 2/4** — the Ground Economy claim is the strongest lead (an official page title), everything else is secondary-aggregator-only and internally inconsistent |
| Prior implementation status | **Never implemented.** Status: `deferred_due_to_ambiguity` |
| Confidence | Low across the board |
| Collision risk | High — FedEx Express and Ground Economy both claim a possible 12-digit form, meaning digit-count alone could not even distinguish FedEx's own sub-formats from each other, let alone from other couriers |
| Official-link status | Not approved; never designed |
| Historical test status | Not tested (never implemented) |
| Last known limitation | No official regex/schema was ever directly read for any FedEx parcel product; no check-digit algorithm was ever found with any official attribution |

## Aramex

| Field | Value |
|---|---|
| Format | No confirmed format at all. Secondary aggregator claims variously describe 10, 10–11, 10–15, or 10/11/12/20 digits; no distinctive prefix was ever found in any source, official or secondary |
| Evidence level | **Level 2/4** — official manual titles referenced only ("Your Guide to Embedding Aramex's Tracking API," "Aramex's Guide to Embedding the Shipping Services API"), never directly read; aggregator length claims are mutually inconsistent |
| Prior implementation status | **Never implemented.** Status: `deferred_due_to_insufficient_evidence` — the weakest evidence position of the five researched couriers |
| Confidence | Very low |
| Collision risk | Cannot be assessed — no confirmed format exists to assess collision risk against |
| Official-link status | Not approved; never designed |
| Historical test status | Not tested (never implemented) |
| Last known limitation | No distinctive prefix, no officially confirmed length, no character-set rule, and no check-digit algorithm were found in any directly-inspected source; the only path to a verified format would have required directly reading the official PDF manuals, which was never possible in this environment |

---

## Ocean carriers (FCL container tracking — never implemented)

These three carriers were researched only for a *never-built* future live-tracking capability (`FCL_CONTAINER_TRACKING_DESIGN.md`) — they were never part of local identifier detection, since the existing container detector (ISO 6346, above) already covered structural recognition. Included here for completeness since they are carrier evidence within the removed feature's scope.

| Carrier | Evidence level | Confirmed | Never confirmed |
|---|---|---|---|
| MSC | Project-owner manually verified (Claude Code's own fetch remained blocked) | Official DCSA Track and Trace API exists at `developerportal.msc.com/api-catalogue`; describes equipment milestones, vessel events, ETA | Authentication, sandbox access, exact response schema, commercial eligibility, vessel-coordinate availability |
| ZIM | Project-owner manually verified | Official API program exists (`www.zim.com/tools/zim-api`, `api.zim.com/APIGuide`); OAuth 2.0 Client Credentials; registration/approval required; sandbox described | Exact response fields (milestones, ETA, vessel, voyage, ports, coordinates) |
| Maersk | Project-owner manually verified | Official "Track and Trace Plus" Ocean Track and Trace product exists at `developer.maersk.com/api-catalogue`; describes container milestones, transport plans, historical events, ETA | Authentication mechanism, commercial-access requirements, sandbox access; vessel-coordinate availability explicitly remained unverified |

No carrier's vessel-position/coordinate capability was ever confirmed through an official, directly-inspected source. No AIS (Automatic Identification System) adapter of any kind was ever designed in implementable detail or approved.

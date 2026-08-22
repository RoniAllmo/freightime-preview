# UPS Parcel Identifier Research

> **Removed feature:** The implementation described in this document is no longer active. FreighTime's "Single-input tracking router" was removed from the public product in full (see `CLAUDE.md` §1 and `IMPORT_READINESS_V1.md` §10). This file is retained only as historical reference.

Research date: 2026-08-04

## 1. Research purpose

This document researches the feasibility of local, format-based identifier detection for commercial UPS parcel tracking identifiers (UPS Small Package "1Z" and UPS Roadie "1R"). It is research and documentation only — no detection code, pattern, or rule is implemented or approved for implementation by this document.

## 2. Scope and exclusions

**In scope:** UPS Small Package (1Z) tracking numbers, UPS Roadie (1R) tracking numbers where officially relevant, UPS Mail Innovations only insofar as official documentation clearly defines its identifiers, official UPS parcel tracking interfaces, the official UPS Track API, and the official UPS Track Alert API.

**Explicitly excluded from this document:** UPS Freight, UPS Supply Chain Solutions, freight forwarding, air cargo, ocean freight, booking references, customer references, container tracking, EMS, UPU S10, DSV, DHL, FedEx, and Aramex. Where a fetched official source mentioned an excluded category in passing (e.g. the Track API's own description lists "UPS Freight" as one of several shipment types it can look up), it is noted only to explicitly exclude it, not analyzed as evidence for this document's scope.

## 3. Official UPS parcel products

UPS's own Track API specification (fetched directly, see Section 5) describes itself as retrieving "current status of shipments such as Small Package 1Z, Infonotice, Mail Innovations, FGV, or UPS Freight shipments." This directly confirms, from an official source, that **UPS Small Package** and **UPS Mail Innovations** are both product lines with a defined place in UPS's own tracking system. **UPS Roadie** is confirmed as a separate product by the official Track Alert API specification (see Section 10), which explicitly supports "Roadie packages (1R tracking numbers)" alongside standard UPS 1Z packages.

## 4. Official UPS tracking interfaces

The official UPS Track API and UPS Track Alert API (both hosted in UPS's own GitHub organization, `github.com/UPS-API/api-documentation`) are the two officially confirmed programmatic tracking interfaces researched in this document. `developer.ups.com` (the UPS Developer Portal website itself) was attempted but blocked (see Section 5) — its existence as UPS's developer portal is well-established generally but its page content was not directly read in this research.

## 5. Official API availability and authentication

- **Access limitation:** `WebFetch` to `https://developer.ups.com/` returned **HTTP 403 Forbidden** in this environment, consistent with the network restriction already documented for other UPU/DSV portals in prior research tasks in this repository.
- **Successful direct access:** unlike `developer.ups.com`, UPS's own GitHub organization (`github.com/UPS-API/api-documentation`) **was directly reachable** in this environment. This repository is UPS's official, GitHub-hosted collection of OpenAPI/YAML specifications for its APIs (Tracking, Shipping, Rating, Pickup, Address Validation, Time in Transit, OAuth, and 30+ others), matching the task's explicitly listed priority-3 source ("Official UPS GitHub organization and API specifications"). The following findings in this document are based on **directly fetched raw file content** from this repository (`Tracking.yaml` and `UPSTrackAlertEnhanced.yaml`), not secondary summaries.
- **Authentication:** the repository includes `OAuthClientCredentials.yaml` and `OAuthAuthCode.yaml` specifications. UPS's Track API and Track Alert API require an **OAuth 2.0 Bearer token**, obtained via the Client Credentials flow (using UPS login credentials and a UPS account number) or the Authorization Code flow, submitted in subsequent Track API calls.
- **Conclusion:** the API is **not open/anonymous** — it requires an approved UPS integration, OAuth credentials, and a token exchange. Consistent with `CLAUDE.md`'s credential rules, **browser-side direct API usage would be inappropriate**, since it would require embedding OAuth client credentials in browser-side code.

## 6. Official 1Z evidence

**Directly confirmed, official, primary source.** The `Tracking.yaml` specification (fetched directly from `github.com/UPS-API/api-documentation`) explicitly names "Small Package 1Z" as one of the shipment types the Track API retrieves status for. The `UPSTrackAlertEnhanced.yaml` specification (also fetched directly) goes further and defines a **regex validation pattern** for tracking numbers submitted to the Track Alert API:

```
(^1Z[0-9A-Z]{16}$)|(^1R[0-9A-Z]{14}$)|(^1R[0-9A-Z]{26}$)
```

This is a directly-sourced, official confirmation that `1Z` is a recognized UPS Small Package tracking-number prefix, with an exact, officially enforced structure for the Track Alert API specifically (see Section 7).

## 7. Complete 1Z structure evidence

From the officially fetched Track Alert regex: a `1Z` tracking number is exactly **18 characters total** — the literal 2-character prefix `1Z` followed by exactly **16 alphanumeric characters** drawn from `[0-9A-Z]` (uppercase digits and letters only; no lowercase, no punctuation). This matches the commonly cited secondary-source structure (`1Z` + 6-char shipper number + 2-char service code + 8-char package identifier + 1 check digit = 16 characters after the prefix), though the *official* regex itself validates only the aggregate 16-character alphanumeric block — it does not encode the internal shipper/service/package/check-digit sub-field boundaries as separate regex groups. The internal sub-field breakdown (shipper number, service code, package identifier, check digit) is **secondary-sourced only** (see Section 9) and was not found broken out in the officially fetched specification text.

The Track API's own `inquiryNumber` field (a more general "look up any trackable shipment" parameter, not 1Z-specific) is documented with a much looser constraint: **7 to 34 characters**, no regex pattern enforced — because this single field also accepts non-1Z identifiers such as Infonotice numbers and Mail Innovations/USPS-style numbers (see Sections 3 and 11).

**Official example tracking numbers found directly in the fetched specifications** (illustrative examples embedded in UPS's own documentation, not real customer shipments):

- `1Z023E2X0214323462` (from `Tracking.yaml`, 18 characters, matches the 1Z+16 structure)
- `1Z1234567891234556` (from `UPSTrackAlertEnhanced.yaml`, 18 characters)
- Official **test/sandbox** tracking numbers, explicitly labeled for testing purposes in the Track Alert specification: `1ZCIETST0111111114` and `1ZCIETST0422222228` (both 18 characters, matching the 1Z+16 structure). These are UPS-provided test identifiers, not customer data, and are safe to record as future test fixtures per Section 15 of this document and the task's test-fixture rules.

## 8. 1Z length and character rules

- **Total length:** 18 characters (officially confirmed via the Track Alert regex).
- **Allowed characters after the prefix:** both letters and digits, restricted to uppercase `A-Z` and `0-9` (officially confirmed — the regex character class is `[0-9A-Z]`, which does not include lowercase letters).
- **Lowercase input:** not addressed by the specification as an input-acceptance question (the spec describes the canonical stored/validated form, not client-side normalization behavior) — but since the official pattern only accepts uppercase, any future local detector must uppercase input before matching, consistent with the existing `normalize.js` behavior already used by `detect-container.js`/`detect-awb.js`/`detect-postal.js`.
- **Spaces or hyphens:** not present in any officially fetched example or pattern — the official regex has no allowance for separators, implying that if UPS tracking numbers are ever displayed with spaces/hyphens on labels or web pages, those are formatting characters removed before validation, not part of the raw identifier. This is consistent with how this project's `normalize.js` already strips separators into `alphanumericInput`.

## 9. 1Z check-digit evidence

**Not found in any officially fetched source.** Neither `Tracking.yaml` nor `UPSTrackAlertEnhanced.yaml` documents a check-digit algorithm, a checksum formula, or which of the 16 post-prefix characters (if any) functions as a validation digit — the official regex validates only character set and length, not mathematical correctness. The commonly cited secondary-source check-digit algorithm (odd/even positional weighting of 2 and 3, modulo 10, referenced in `COURIER_EMS_RESEARCH.md` from a third-party CodeProject article) remains **unconfirmed by any official UPS source** found in this research. This is an unresolved evidentiary gap, distinct from — and less resolved than — the S10 check-digit blocker that was eventually resolved via the official UPU spreadsheet.

## 10. Official 1R and Roadie evidence

**Directly confirmed, official, primary source.** The same officially fetched Track Alert regex explicitly defines two Roadie formats:

- `1R` + exactly 14 alphanumeric characters (`[0-9A-Z]`) = **16 characters total** ("short" Roadie format)
- `1R` + exactly 26 alphanumeric characters (`[0-9A-Z]`) = **28 characters total** ("long" Roadie format)

The specification's own description states: "Track Alert supports UPS packages that have a 1Z tracking number, as well as Roadie packages (1R tracking numbers)." Official example values found in the fetched spec: `1R12345678912345` (short format) and `1R123456789123456789012345` (long format) — both illustrative, not customer data.

**Can `1R` be safely classified as UPS Roadie rather than standard UPS Small Package?** Yes, with reasonable confidence at the structural level — `1R` is a distinct, officially documented prefix separate from `1Z`, explicitly tied to Roadie by the same official specification. However, Roadie has **two** valid lengths (16 or 28 total characters), which is a more complex structural rule than 1Z's single fixed length, and no check-digit or other mathematical validation was found for either Roadie format either.

## 11. UPS Mail Innovations identifier evidence

The Track API specification's own example set includes an alternate, non-1Z tracking number explicitly labeled `USPS_PIC`: `92419900000033499522966220` (26 numeric digits). This is a directly-sourced, official confirmation that **UPS Mail Innovations shipments can be tracked using a USPS-style numeric Package Intercept/PIC tracking number**, not a `1Z`-prefixed UPS identifier. This is an important finding for false-positive risk analysis (Section 14): a Mail Innovations identifier may be a long, purely numeric string with no `1Z`/`1R` prefix at all, meaning **it would not be caught by a 1Z/1R-only recognition rule**, and conversely, its numeric-only shape could coincide with other numeric identifier families (e.g. a future generic postal or courier numeric detector) unrelated to UPS specifically. No further official structural detail (exact length range, checksum) for Mail Innovations/USPS-style numbers was found in the fetched specifications — this remains a gap.

## 12. Other UPS identifier families

The Track API description also references "Infonotice" as a distinct trackable identifier type, alongside Small Package (1Z), Mail Innovations, FGV, and UPS Freight (the latter explicitly out of scope for this document). No structural format for Infonotice or FGV identifiers was found in the fetched specifications — both remain undocumented gaps, and neither is analyzed further here since they are not the focus of this research (1Z/1R) and no evidence exists to characterize them.

## 13. Local detection feasibility

- **1Z structural recognition** (exact 18-character length, `1Z` literal prefix, remaining 16 characters restricted to uppercase `[0-9A-Z]`) is supported by a **directly fetched, official UPS specification** — a materially stronger evidentiary basis than the DSV research in this same phase, and comparable in directness to how the S10 structure was confirmed via the official UPU spreadsheet.
- **1Z mathematical (check-digit) validation** is **not** supported by any official source found — only by an unconfirmed secondary-source algorithm. A future local detector could implement structural recognition without check-digit validation, analogous to a detector that only ever reaches "structurally plausible" confidence, never "validated," until the check-digit algorithm is officially confirmed.
- **1R structural recognition** is similarly officially confirmed but with two valid lengths, and likewise lacks a confirmed check-digit algorithm.
- **Mail Innovations/USPS-style numbers** cannot be reliably distinguished from other long numeric strings using only the evidence gathered here — no official structural rule beyond "looks like a USPS PIC number" was found.

## 14. False-positive and false-negative risks

- **False positive (1Z):** a random 18-character uppercase alphanumeric string beginning with `1Z` would satisfy the officially documented structural pattern without being a real UPS shipment, since no check-digit validation is available to rule out coincidental matches.
- **False positive (1R):** the same risk applies, compounded by two valid lengths, further widening the space of strings that could coincidentally match.
- **False negative (Mail Innovations):** since Mail Innovations/USPS-style numbers do not use the `1Z`/`1R` prefix at all, a UPS detector limited to `1Z`/`1R` recognition would never recognize this UPS-handled shipment category — a known, accepted gap rather than a defect, consistent with the task's explicit scope limiting this research to 1Z/1R/Mail-Innovations-if-clearly-defined (which it is not, structurally).
- **Cross-family overlap:** the Mail Innovations/USPS-style numeric example (26 digits) does not structurally overlap with this project's existing container (11 chars), AWB (11 digits), or S10 (13 chars) detectors due to differing lengths — but it could overlap with a future generic long-numeric detector for another courier, a risk to flag for any future courier-detector design stage.

## 15. Proposed safe recognition options

### Option A: Recognize any normalized identifier beginning with `1Z` and matching an officially verified full structure

The officially fetched Track Alert regex provides exactly this: `1Z` + 16 uppercase alphanumeric characters (18 total). This option is fully supported by directly-fetched, official evidence for the *structural* shape, though not for mathematical (check-digit) validation, which remains unconfirmed.

### Option B: Recognize an identifier beginning with `1Z` as a high-confidence UPS candidate, even if mathematical validation is unavailable

Functionally similar to Option A in terms of what is actually implementable today (since no check-digit algorithm is officially confirmed either way), but frames the result as "high confidence based on structure alone" rather than "structurally valid, mathematically unvalidated." The distinction matters for how `confidence`/`valid` fields would be reported by a future detector (see Section 16) — Option A's framing (structural match without claimed validation) is more honest about what has and has not been verified.

### Option C: Treat `1Z` as a possible UPS match only and require user confirmation

More conservative than A/B; would treat every structural 1Z/1R match as ambiguous/unconfirmed by default. This underuses the evidentiary strength actually available (a directly-fetched official structural pattern is stronger evidence than, e.g., the DSV `DSVPH` single-example case in the prior research document), but would be reasonable if the project owner wants an extra caution margin given the missing check-digit validation.

### Option D: Do not implement UPS recognition until the full format and validation rules are officially verified

Not warranted by the evidence gathered here for the *structural* question — the structure **is** officially verified, directly, from UPS's own specification. This option would be appropriate only if the project owner requires check-digit-level validation parity with the container/AWB/S10 detectors before implementing anything, which is a legitimate but stricter bar than what was required to approve S10 (which also went through an interim "structural blocker, check-digit blocker" staging before both were resolved).

**Recommendation: Option A**, based strictly on the evidence gathered. The 1Z structural pattern is now backed by a directly fetched, official UPS specification (`UPSTrackAlertEnhanced.yaml`) — a stronger evidentiary basis than any other commercial courier researched in this project to date, including the DSV research in this same phase. The recommendation explicitly does **not** extend to check-digit validation, which remains unconfirmed and should be reported as such (`valid: unknown`/structural-only, not `valid: true`) in any future detector design, mirroring how this project distinguished "structural match" from "mathematically valid" for the container, AWB, and S10 detectors. **This recommendation requires project-owner approval before any implementation** and does not itself authorize building `detect-courier.js` logic.

## 16. Proposed detector-result behavior

Not implemented at this stage. If Option A is separately approved by the project owner, a future UPS-aware `detectCourier` (or similar) result would need to follow the same structured contract already used by `detect-container.js`, `detect-awb.js`, and `detect-postal.js` (`identifierType`, `matched`, `normalizedIdentifier`, `possibleCarriers`, `confidence`, `valid`, `ambiguous`, `reason`, `recommendedAction`). Given the confirmed structure but unconfirmed check digit, the conceptual behavior would resemble:

- A structurally matching `1Z`/`1R` identifier: `matched: true`, but `valid` would need a defined meaning distinct from the container/AWB/S10 detectors' "check-digit-validated" meaning — e.g. `valid: false` with a `reason` key indicating "structure confirmed, mathematical validation not available" rather than "check digit failed," since these are different situations that must not be conflated. This distinction is a design decision for a future stage, not resolved here.
- A non-matching value: the existing `unknown`/`not_matched` pattern, unchanged.

This is a conceptual note only, not a design decision.

## 17. Open product decisions

The following require explicit project-owner decisions and are not resolved by this document:

- Whether Option A (structural-only 1Z/1R recognition) is an acceptable interim state, or whether check-digit-level confirmation must be obtained first (favoring Option D) before any implementation.
- How a future detector should represent "structurally confirmed but mathematically unvalidated" in the shared `valid`/`confidence` contract, without conflating it with the "check digit failed" case already used by the container/AWB/S10 detectors.
- Whether UPS Roadie (`1R`) should be treated identically to UPS Small Package (`1Z`) in the eventual `identifierType` taxonomy, or as a distinct sub-type.
- Whether UPS Mail Innovations/USPS-style numeric identifiers should be researched further as their own category (given they don't use the 1Z/1R prefix at all) or left entirely out of scope.
- Whether to attempt obtaining the UPS check-digit algorithm from another authoritative channel (e.g. `developer.ups.com` via a different network path, or a manually supplied document, mirroring how the UPU S10 check-digit blocker was ultimately resolved).
- Whether DSV, UPS, and the remaining candidates (DHL, FedEx, Aramex) should be evaluated together for a combined first commercial-courier implementation wave, given their now-visibly different evidence quality (UPS structurally strong; DSV weak).

## 18. Recommended next stage and explicit exclusions

**Recommended next stage:** proceed to research the remaining commercial-courier candidates (DHL, FedEx, Aramex) using the same directly-fetch-first methodology that succeeded here (attempting official GitHub-hosted API specifications before falling back to search synthesis), so that a complete, evidence-ranked comparison across all courier candidates can inform a single, project-owner-approved implementation-wave decision — rather than implementing UPS in isolation. This recommendation is not carried out by this document.

This research task does **not** authorize:

- Production implementation of any UPS detection rule
- Creation or modification of `detect-courier.js`
- Creation or modification of `carrier-registry.js`
- Modification of `router.js`
- Modification of `index.html`
- Addition of any tracking URL
- Research or implementation of UPS Freight or UPS Supply Chain Solutions
- Research or implementation of DHL, FedEx, Aramex, or DSV (covered separately)
- Research or implementation of freight forwarding, air cargo, ocean freight, booking references, or customer references
- Container tracking work beyond the existing detector
- EMS classification or UPU S10 classification work
- Submission of any tracking number, real or synthetic, to a live UPS tracking service or API

## Evidence matrix

| Claim | Source authority | Source title | Source URL | Directly accessed | Evidence strength | Remaining uncertainty | Safe for implementation |
|---|---|---|---|---|---|---|---|
| 1Z is a UPS Small Package tracking-number prefix | UPS (official) | Tracking.yaml (UPS Track API spec) | https://raw.githubusercontent.com/UPS-API/api-documentation/main/Tracking.yaml | Yes | High | None for this specific claim | Yes |
| 1Z tracking numbers are exactly 18 characters: `1Z` + 16 chars from `[0-9A-Z]` | UPS (official) | UPSTrackAlertEnhanced.yaml (UPS Track Alert API spec) | https://raw.githubusercontent.com/UPS-API/api-documentation/main/UPSTrackAlertEnhanced.yaml | Yes | High | Internal sub-field boundaries (shipper/service/package/check-digit) not confirmed by this source | Partial (structure yes, sub-fields no) |
| 1R (Roadie) tracking numbers are `1R` + 14 or `1R` + 26 chars from `[0-9A-Z]` | UPS (official) | UPSTrackAlertEnhanced.yaml | https://raw.githubusercontent.com/UPS-API/api-documentation/main/UPSTrackAlertEnhanced.yaml | Yes | High | Two valid lengths increase ambiguity | Partial |
| UPS Track API accepts a general `inquiryNumber` of 7-34 characters, no fixed pattern | UPS (official) | Tracking.yaml | https://raw.githubusercontent.com/UPS-API/api-documentation/main/Tracking.yaml | Yes | High | None for this specific claim | Yes (as a general constraint, not 1Z-specific) |
| Mail Innovations can use a USPS-style numeric (PIC) tracking number, e.g. 26 digits, no 1Z/1R prefix | UPS (official) | Tracking.yaml (example value) | https://raw.githubusercontent.com/UPS-API/api-documentation/main/Tracking.yaml | Yes | Medium-high (one example, not a full spec) | Exact valid length range/structure for USPS-style numbers not documented | Partial |
| UPS Track/Track Alert APIs require OAuth 2.0 (Client Credentials or Auth Code) | UPS (official) | OAuthClientCredentials.yaml, OAuthAuthCode.yaml (repository structure) | https://github.com/UPS-API/api-documentation | Yes (repository structure); file contents not individually fetched | Medium-high | Exact token scope/claims not read in detail | Yes (sufficient to conclude "not open access") |
| Official 1Z/1R example values, incl. UPS-provided test identifiers `1ZCIETST0111111114`, `1ZCIETST0422222228` | UPS (official) | Tracking.yaml, UPSTrackAlertEnhanced.yaml | https://raw.githubusercontent.com/UPS-API/api-documentation/main/Tracking.yaml ; https://raw.githubusercontent.com/UPS-API/api-documentation/main/UPSTrackAlertEnhanced.yaml | Yes | High | None — explicitly labeled test values | Yes, as future test fixtures |
| 1Z internal sub-structure: 6-char shipper + 2-char service code + 8-char package ID + 1 check digit | Secondary aggregators (not authoritative) | GoComet blog, ParcelPath, Ship24, ParcelDetect | (aggregator URLs, not cited as sole evidence) | No | Low-medium (widely repeated but not UPS-sourced) | Not confirmed against an official source | No |
| 1Z check-digit algorithm (odd/even positions × 2/3, mod 10) | Secondary/third-party (not authoritative) | CodeProject article (already recorded in COURIER_EMS_RESEARCH.md) | https://www.codeproject.com/Articles/21224/Calculating-the-UPS-Tracking-Number-Check-Digit | No | Low | Not confirmed against an official UPS source | No |
| `developer.ups.com` portal content | UPS (official, attempted) | UPS Developer Portal | https://developer.ups.com/ | No — WebFetch returned 403 | N/A | Portal content entirely unread | N/A |

No real customer tracking number was used, referenced, or submitted anywhere in this research. All example values recorded above are either UPS's own illustrative/test values (explicitly labeled as such in the fetched specifications) or secondary-source claims explicitly marked as unverified.

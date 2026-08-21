# DSV Parcel / Courier Identifier Research

> **Removed feature:** The implementation described in this document is no longer active. FreighTime's "Single-input tracking router" was removed from the public product in full (see `CLAUDE.md` §1 and `IMPORT_READINESS_V1.md` §10). This file is retained only as historical reference.

Research date: 2026-08-04

## 1. Research purpose

This document researches the feasibility of local, format-based identifier detection for DSV parcel and courier tracking identifiers only, as the first candidate in the newly approved commercial-courier phase. It is research and documentation only — no detection code, pattern, or rule is implemented or approved for implementation by this document.

## 2. Scope and freight-forwarding exclusion

This research is strictly limited to **DSV Parcel, DSV Courier, and DSV XPress** identifiers and their associated tracking interfaces.

Freight-forwarding identifiers are explicitly and completely out of scope for this document, including: DSV air-freight shipment numbers, DSV sea-freight shipment numbers, DSV road-freight shipment references, house air waybills, house bills of lading, booking references, customer references, freight files or case numbers, container references (already covered by the existing `detect-container.js`), and ERP/TMS references. Where a search result surfaced freight-forwarding-related information (e.g. DSV's general road/sea/air container or reference formats), it is noted only to explicitly exclude it, not analyzed as parcel/courier evidence.

DHL, FedEx, UPS, and Aramex are also out of scope for this document — they remain deferred to their own future research stage, per the existing `COURIER_EMS_RESEARCH.md`.

## 3. Masked project-owner evidence

The project owner supplied one DSV parcel/courier example as structural research evidence. Per the privacy restrictions for this task, the complete value is not recorded anywhere in this document, the repository, or any external request. It is represented only as:

`DSVPH#########`

**Directly observable structure** (from the masked form only):

- Literal prefix: `DSVPH`
- Nine trailing digits
- Fourteen total characters
- The numeric part may contain leading zeros

**This is project-owner-provided evidence, not an independently verified fact.** Per the task's explicit instruction, none of the following is inferred from this single example: that all DSV parcel numbers use this format, that `PH` has a known meaning, that nine digits are universal, that a check digit exists, or that the number is active or valid. The example was not submitted to any website, API, search engine, or tracking service, and does not appear anywhere in this document or repository in its complete form.

## 4. Official DSV parcel and courier products

Search-engine synthesis referencing the DSV Developer Portal (`developer.dsv.com`) indicates the existence of separate developer guides for at least three DSV product lines: **DSV XPress** (`guide-xpress`), **DSV Solutions** (`guide-solutions`), and **myDSV** (`guide-mydsv`), alongside a general **API Catalogue** (`apicatalogue`) and an `eDC` developer guide. DSV XPress appears to be DSV's parcel/express delivery product line, consistent with the task's framing of "DSV Parcel / Courier / XPress" as one family. No independent, directly-read confirmation of each product's exact scope was obtained — this finding is sourced through search synthesis referencing the portal's page structure, not a directly opened page (see Section 6 for access details).

## 5. Official DSV tracking interfaces

**myDSV** (`mydsv.com`) is referenced as DSV's general-purpose Track & Trace tool, described (via search synthesis, not direct access) as public-facing for basic tracking — searchable by shipment ID, booking ID, customer reference, or booking/shipment reference number — without requiring login for basic results, though a login is described as providing more detail. This tool spans DSV's broader shipment types (not exclusively parcel), consistent with the general reference-number search fields described.

No independent confirmation was obtained of a parcel-specific public tracking page distinct from the general myDSV Track & Trace tool.

## 6. Official API availability and authentication

A relevant DSV Tracking API is referenced via the Developer Portal's API Catalogue. Per search-synthesis findings referencing the portal's own developer guide content:

- Authentication uses an HTTP header named `DSV-Subscription-Key`.
- Two keys are allocated per subscribed product/API ("primary" and "secondary"); only one is used per request.
- The subscription key is obtained by subscribing to the API through the Developer Portal, and is issued only after DSV approves the subscription request.
- OAuth 2.0 is also referenced as part of DSV's authentication approach.
- Separate credentials exist for test and production environments.

**This means the API is not open or anonymously accessible** — it requires an approved subscription and a secret key (or OAuth token), which must never be placed in browser-side code per `CLAUDE.md`. Browser-side direct API access would therefore be inappropriate for this API, consistent with the same conclusion already reached for DHL/FedEx/UPS in `COURIER_EMS_RESEARCH.md`.

**Access limitation:** direct `WebFetch` requests to `https://developer.dsv.com/`, `https://developer.dsv.com/guide-xpress`, and related portal pages all returned **HTTP 403 Forbidden** in this environment (the same outbound network restriction documented in prior research tasks in this repository). No portal page was directly opened; all Developer Portal findings in this document come from `WebSearch` synthesis referencing the portal's publicly indexed page titles and snippet content, not from directly reading the pages.

## 7. Published identifier-format evidence

One notable, moderately-sourced finding: search synthesis referencing the DSV Developer Portal's own `guide-xpress` content describes the tracking API as retrieving shipment information "by DSV XPress Shipment ID (e.g. `10123456`)" — an **8-digit numeric** example, structurally different from the project-owner-supplied `DSVPH#########` (14 characters, 5-character alphabetic-prefix-plus-2-letters, 9 trailing digits). This suggests that the API-level "XPress Shipment ID" and the customer-facing tracking number printed on a parcel label/used in myDSV (which the project-owner example may represent) could be two different identifier schemes for the same shipment — a common pattern among couriers — but this is not confirmed by any directly-read source.

No source, official or secondary, was found that documents a complete, authoritative DSV parcel/courier tracking-number format specification.

## 8. DSVPH prefix analysis

No source — official or secondary — found during this research mentions the string `DSVPH` in any form. Multiple targeted searches (including a search for the literal string `DSVPH` and the split form `DSV PH`) returned no matching results referencing this prefix. This means:

- `DSVPH` is **not** an officially documented parcel prefix as far as this research could determine.
- Whether `PH` represents a product code, country/region code, system code, or service code **cannot be determined** from available evidence.
- The prefix's presence in the project-owner's single example is the only evidence for it that exists in this research.

## 9. Nine-digit suffix and leading-zero analysis

No official or secondary source confirms a nine-digit suffix as standard for any DSV parcel identifier family. The only evidence for "nine trailing digits" is the single project-owner-supplied example. Whether leading zeros are structurally significant (i.e., whether the field is a fixed-width zero-padded serial number) versus coincidental cannot be determined from one example. No evidence of a check digit was found for any DSV parcel/courier identifier.

## 10. Regional and service-format variation

Secondary (non-authoritative) sources claim DSV tracking numbers "usually" start with a single letter (`D` or `S`) or two letters (`DS`) followed by 10–12 digits — a description that is internally inconsistent between sources, does not match the project-owner's `DSVPH` + 9-digit (14-character total) example, and is not corroborated by any DSV-owned source. This is recorded only as an illustration of how unreliable secondary tracking-aggregator claims are for this carrier — **not** as evidence of an actual format, per the task's explicit instruction not to treat aggregators as authoritative. No evidence, official or secondary, addresses whether the format varies by country or service.

## 11. Local detection feasibility

Given the findings above:

- A literal `DSVPH` prefix match, if implemented, would only reflect **one unverified example**, not a documented format rule.
- No structural validation (e.g., a check digit) exists to distinguish a genuine DSV parcel identifier from a coincidental string with the same shape.
- The API-level "XPress Shipment ID" format (8 digits) evidenced in Section 7 is structurally unrelated to the `DSVPH` example, so it cannot be used to corroborate or implement detection of the customer-facing tracking-number family either.

Local recognition of `DSVPH`-shaped values is possible to implement mechanically, but it would be recognition of an **unverified, single-example pattern**, not a documented standard — a materially weaker evidentiary basis than the container (ISO 6346), AWB (IATA Resolution 600a/Modulus-7), or S10 (UPU Technical Standard, subsequently confirmed via the official spreadsheet) detectors already implemented in this project.

## 12. False-positive and false-negative risks

- **False positive risk:** any 14-character string beginning with the 5 letters `DSVPH` followed by 9 digits would match a literal-prefix rule, regardless of whether it is a genuine DSV identifier — since the prefix is unverified as an exclusive DSV scheme, an unrelated internal reference number happening to start with those letters could be misclassified.
- **False negative risk:** if DSV in fact uses multiple prefixes (as hinted, though not verified, by the low-confidence secondary sources in Section 10), a rule recognizing only `DSVPH` would miss other valid DSV parcel identifiers entirely.
- **Corroboration gap:** because no independent example beyond the single project-owner-supplied one exists, there is no way with current evidence to distinguish "the general DSV parcel format" from "a format specific to one country, product, or customer account."

## 13. Proposed safe recognition options

### Option A: Recognize only `DSVPH` followed by exactly nine digits

Matches the single available example exactly. Simplest to implement, but generalizes from exactly one data point — the risk described in Section 12 (both false-positive and false-negative) is highest relative to evidentiary support, since neither the prefix nor the digit count has any independent confirmation.

### Option B: Recognize a broader `DSV`-prefixed alphanumeric family

Would reduce false-negative risk if DSV in fact uses multiple prefix variants, but has **no evidentiary basis at all** — no source, official or secondary, describes a broader `DSV`-prefixed family with any specific shape. This option would require inventing a pattern not supported by any evidence, which the task's research rules explicitly prohibit ("Do not invent a format").

### Option C: Do not recognize DSV automatically until stronger official evidence exists

Defers any DSV-specific detection until either (a) the DSV Developer Portal's parcel/XPress tracking-number format documentation is directly read (currently blocked by this environment's network policy), or (b) the project owner supplies additional corroborating examples or an official reference confirming the `DSVPH` pattern (or another pattern) as a genuine, general DSV parcel/courier scheme.

**Recommendation: Option C**, based strictly on evidence quality. A single unverified example is not equivalent to a documented standard, and the project's existing detectors (container, AWB, S10) were all built only after either an authoritative published standard or, in the S10 case, direct confirmation from the official validation tool itself. DSV parcel/courier identification does not yet meet that bar. **This recommendation requires project-owner approval before any implementation** and does not itself authorize Option A, B, or any other detection rule.

## 14. Proposed detector-result behavior

Not applicable at this stage under the recommended Option C — no detector is proposed for implementation until stronger evidence exists. If Option A were ever separately approved by the project owner despite its evidentiary weakness, a future `detectCourier` (or DSV-specific) result would need to follow the same structured contract already used by `detect-container.js`, `detect-awb.js`, and `detect-postal.js` (`identifierType`, `matched`, `normalizedIdentifier`, `possibleCarriers`, `confidence`, `valid`, `ambiguous`, `reason`, `recommendedAction`), with a `confidence` no higher than `"low"` or `"possible"` given the single-example basis — never `"high"`, which is reserved for identifiers with independently verified structural and/or check-digit validation. This is a conceptual note only, not a design decision.

## 15. Future test-fixture policy

If a future stage authorizes DSV detection, any test fixtures must be:

- Synthetic values generated to match whatever pattern is eventually approved (not the project-owner's real example, which must remain masked and unused).
- Explicitly labeled as non-operational and not submitted to any tracking service.
- Never presented as confirmed-valid identifiers, since no check-digit or other mathematical validation mechanism has been identified for DSV parcel identifiers.

## 16. Open product decisions

The following require explicit project-owner decisions and are not resolved by this document:

- Whether to proceed with Option A (literal `DSVPH` + 9 digits) despite the single-example evidentiary basis, or wait for stronger confirmation (Option C).
- Whether the project owner can supply additional DSV parcel tracking-number examples to corroborate or refute the `DSVPH` pattern.
- Whether DSV Developer Portal access (subscription approval, or a manually supplied copy of the parcel/XPress tracking-number documentation, similar to the manually uploaded UPU spreadsheet in the postal phase) should be pursued to close this evidence gap.
- Whether `DSVPH` might specifically represent a country/region code (e.g. a Philippines-related code, given "PH" is also the ISO 3166-1 alpha-2 code for the Philippines) rather than a universal DSV prefix — this is a plausible but entirely unverified hypothesis, explicitly not adopted as a finding in this document.
- Whether DSV should be researched jointly with DHL/FedEx/UPS/Aramex in a combined next stage, or continue as an isolated single-carrier research effort.

## 17. Recommended next stage

Given the evidentiary gaps identified — most critically, the complete absence of any independent corroboration for the `DSVPH` prefix or the 9-digit suffix — the recommended next stage is to **seek additional authoritative evidence before any implementation stage**, specifically:

1. Attempt to obtain direct access to the DSV Developer Portal's XPress/parcel tracking-number format documentation (via a network environment without this session's restriction, or a manually supplied document/screenshot, following the same pattern that successfully resolved the UPU S10 check-digit blocker).
2. Ask the project owner whether additional DSV parcel tracking-number examples are available to corroborate or refute the single supplied example.

This recommendation is not carried out by this document.

## 18. Explicit exclusions

This research task does **not** authorize:

- Production implementation of any DSV detection rule
- Creation or modification of `detect-courier.js`
- Creation or modification of `carrier-registry.js`
- Modification of `router.js`
- Modification of `index.html`
- Addition of any tracking URL
- Research or implementation of DHL, FedEx, UPS, or Aramex identifiers
- Research or implementation of freight-forwarding, air-freight, sea-freight, or road-freight references
- Research or implementation of house AWBs, house bills of lading, booking references, customer references, or ERP/TMS references
- Container reference work beyond the existing detector
- EMS classification or other S10 postal classification
- Submission of the project-owner-supplied identifier, in complete form, to any website, API, search engine, or tracking service

## Evidence matrix

| Claim | Source authority | Source title | Source URL | Directly accessed | Evidence strength | Remaining uncertainty | Safe for implementation |
|---|---|---|---|---|---|---|---|
| DSV Developer Portal exists with XPress/Solutions/myDSV guides and an API catalogue | DSV (official, referenced) | Developer Guide (xp/sol/my); API Catalogue | https://developer.dsv.com/guide-xpress ; https://developer.dsv.com/guide-solutions ; https://developer.dsv.com/guide-mydsv ; https://developer.dsv.com/apicatalogue | No — WebFetch returned 403; found via search synthesis only | Medium | Page content not directly read | Partial |
| API authentication uses `DSV-Subscription-Key` header, OAuth 2.0, subscription approval, primary/secondary keys | DSV (official, referenced) | DSV Developer Portal guides | https://developer.dsv.com/ | No — same access limitation | Medium | Exact endpoint/scope details unread | Partial (sufficient to conclude "not open access, requires credentials") |
| XPress Shipment ID example format is 8-digit numeric (e.g. `10123456`) | DSV (official, referenced) | Developer Guide (xp) | https://developer.dsv.com/guide-xpress | No — same access limitation | Medium | Whether this differs from the customer-facing parcel tracking number is unconfirmed | Partial |
| myDSV Track & Trace is public, no login required for basic tracking, searchable by shipment/booking/customer reference | DSV (official, referenced) | myDSV / DSV Track & Trace | https://mydsv.com/track-shipment ; http://tracktrace.dsv.com/ | No — not directly opened | Medium | Exact input-field validation rules unread | Partial |
| `DSVPH` prefix or `DSVPH#########` pattern | None found | — | — | N/A — no source found at all | None (absence of evidence) | Complete — no corroboration exists beyond the project-owner example | No |
| DSV tracking numbers "usually" start with `D`, `S`, or `DS` + 10–12 digits | Secondary aggregators (not authoritative) | DSV Tracking pages (TrackingMore, ParcelsApp, etc.) | (multiple aggregator URLs, not cited as evidence per task rules) | No | Very low — internally inconsistent, not DSV-sourced | High | No |
| DSV general road/sea/air container format (4 letters + 7 digits) | Secondary aggregator (out of scope) | DSV Tracking page | (aggregator URL, out of scope) | No | N/A — excluded scope, noted only for exclusion | N/A | No (out of scope) |
| `DSVPH#########` masked structural shape | Project owner (direct, first-hand) | N/A | N/A | N/A — provided directly, not researched | High confidence in the observation itself, zero confidence in its generality | Whether this is a universal, country-specific, or account-specific format is entirely unknown | No (single example only, per task rules) |

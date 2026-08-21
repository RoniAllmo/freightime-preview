# DHL Parcel and Courier Identifier Research

> **Removed feature:** The implementation described in this document is no longer active. FreighTime's "Single-input tracking router" was removed from the public product in full (see `CLAUDE.md` §1 and `IMPORT_READINESS_V1.md` §10). This file is retained only as historical reference.

Research date: 2026-08-04

## 1. Research purpose

This document researches the feasibility of local, format-based identifier detection for DHL commercial parcel and courier identifiers (DHL Express, DHL eCommerce, DHL Parcel/Paket). It is research and documentation only — no detection code, pattern, or rule is implemented or approved for implementation by this document.

## 2. Scope and freight-forwarding exclusion

**In scope:** DHL Express, DHL eCommerce, DHL Parcel, DHL Paket (where relevant to parcel tracking), DHL Xpress-style parcel services if officially documented, DHL Shipment Tracking Unified (where relevant to parcel/courier identifiers), and MyDHL API tracking (where relevant to DHL Express).

**Explicitly excluded:** DHL Global Forwarding, air freight, ocean freight, road freight references, rail freight, freight forwarding generally, house air waybill numbers, house bills of lading, master bills, container tracking, freight booking references, customer freight references, DHL Supply Chain order references, EMS, UPU S10 postal classification, DSV, UPS, FedEx, and Aramex.

DHL's own "Shipment Tracking - Unified" API was found (via search synthesis, see Section 6) to span multiple DHL divisions in a single API, **including DHL Global Forwarding**. Where this overlap appears in the research below, DHL Global Forwarding content is noted only to explicitly exclude it from any future parcel/courier detection rule — it must never be allowed to influence parcel or courier detection logic, per the task's explicit instruction.

## 3. DHL business-division separation

DHL Group operates multiple, separately branded divisions relevant to parcel/courier tracking, each apparently documented as a distinct API on the DHL API Developer Portal (per page titles surfaced by search, not directly read — see Section 5):

- **DHL Express** — international express parcels/documents, via the MyDHL API.
- **DHL eCommerce** — e-commerce parcel delivery, with region-specific APIs referenced for Americas, UK, and Europe (the Europe variant is referred to as "eConnect").
- **DHL Parcel / Post & Parcel Germany** — domestic German parcel/mail tracking, referenced under "DHL Parcel DE Tracking (Post & Parcel Germany)."
- **DHL Global Forwarding** — freight forwarding; explicitly excluded from this document (Section 2).

This division separation is itself evidence that DHL does **not** appear to operate a single, unified identifier scheme across all its parcel-adjacent products — each division's API is documented and referenced separately, and (per Section 9) at least one division (DHL eCommerce, US domestic) is documented as using a different carrier's numbering scheme entirely (USPS), not a DHL-specific one.

## 4. Official DHL parcel and courier products

Based on DHL API Developer Portal page titles surfaced by search (not directly read): **MyDHL API (DHL Express)**, **DHL eCommerce Americas API**, **eCommerce UK**, **eConnect (DHL eCommerce Europe)**, and **DHL Parcel DE Tracking (Post & Parcel Germany)** all exist as distinct, named API products. No official page or documentation for a distinct "DHL Xpress-style" parcel product separate from DHL Express itself was found in this research — "DHL Xpress" in the task's research scope appears to refer to DHL Express itself rather than a separate product line, based on available evidence.

## 5. Official public tracking interfaces

**Access limitation:** every DHL-controlled URL attempted in this research returned **HTTP 403 Forbidden** via direct `WebFetch`, consistent with the same environment-level network restriction already documented for UPU, DSV, and `developer.ups.com` in prior research tasks in this repository. Attempted URLs included:

- `https://developer.dhl.com/api-reference/shipment-tracking` (Shipment Tracking - Unified)
- `https://support-developer.dhl.com/support/solutions/articles/47001175751-what-is-a-unified-api-`
- `https://docs.api.dhlecs.com/` (DHL eCommerce Americas API docs, a separate domain)
- `https://developer.dhl.com/api-reference/dhl-parcel-de-shipment-tracking-post-parcel-germany`
- `https://developer.dhl.com/sites/default/files/2025-04/DHL%20EXPRESS%20-%20MyDHL%20API%20-%20SOAP%20Developer%20Guide%20-%20v2.33.pdf` (official PDF guide, hosted on developer.dhl.com)
- `https://dhlexpress.pl/wp-content/uploads/2023/05/DHL-EXPRESS-MyDHL-API-SOAP-Developer-Guide-v2.20.pdf` (a third-party-hosted mirror of the same official guide, on a different domain — also blocked)

Unlike the UPS research in this same phase, **no reachable GitHub-hosted official specification repository was found for DHL** (a general search for a DHL GitHub organization with API specifications returned only unofficial, third-party community repositories such as `clooney/dhl-tracking-api` and `booni3/dhl-express-rest`, none of which are DHL-controlled and none of which are treated as authoritative here). This means, unlike the UPS research, **no DHL source was directly read in this research** — all findings below are sourced through `WebSearch` synthesis referencing the developer portal's own indexed page titles and snippet content, at a lower confidence tier than the UPS findings.

## 6. Shipment Tracking Unified findings

The "Shipment Tracking - Unified" API page title and associated search snippets indicate it covers multiple DHL divisions through one API, including **Post & Parcel Germany** (with mail/letter tracking) and **DHL Global Forwarding** (including DHL Same Day). A DHL support article titled "What is a Unified API?" exists (page confirmed to exist via search, content not read — blocked) suggesting DHL documents the concept of a cross-division unified API explicitly. Whether this Unified API can auto-identify which DHL division a given tracking number belongs to (research question 13/14) **could not be determined** — no source found describes this behavior; it remains an open question requiring direct portal access to resolve.

A test/example tracking value associated with the Post & Parcel Germany tracking documentation was surfaced via search: `00340434161094042557` (21 characters, all numeric). This value's exact status (whether an official test fixture, an illustrative example, or something else) could not be confirmed since the source page was not directly read — it is recorded here with reduced confidence and is **not** treated as a confirmed official test fixture without further verification.

## 7. MyDHL API and DHL Express findings

The MyDHL API is confirmed (via search synthesis referencing DHL's own developer-portal and DHL-Express-partner pages) to be DHL Express's shipping/tracking API, historically documented via a SOAP Developer Guide (multiple versions, up to at least v2.33 per a filename found on `developer.dhl.com`) and apparently also available in a more modern form referenced on the API Developer Portal's `api-reference` section. Access to the MyDHL API is gated: **an active DHL Express customer account is required**, with credentials provided by a DHL Express consultant — this is a directly-relevant, if not directly-read, authentication finding (Section 15). The `TrackingRequest` service is described as accepting "specific waybill numbers" and returning checkpoint-level tracking data — but the exact field-level format/length/pattern constraints for the waybill number were **not found** in any source reached during this research (the official PDF guide that would likely contain this detail was attempted directly and blocked, per Section 5).

## 8. DHL Express identifier-format evidence

**No official source was directly read or found describing the DHL Express tracking-number format with authority.** The widely repeated secondary claim — a 10-digit numeric identifier validated by a Modulo 7 check digit over the first 9 digits — is the same claim already recorded (and already flagged as secondary-only) in `COURIER_EMS_RESEARCH.md`. This research did not find any new, stronger source for this claim; it remains **secondary-sourced only**, not confirmed by DHL directly. No length or structure beyond this 10-digit claim was found for DHL Express in this research.

## 9. DHL eCommerce identifier-format evidence

This is the most concrete finding in this document, sourced through search synthesis referencing the "DHL eCommerce Americas API" documentation page. Per that synthesis, DHL eCommerce package identification involves **multiple, distinct identifier types depending on context**:

- **CCN (Customer Confirmation Number)** — customer-provided, not DHL-generated.
- **DHL-generated package IDs** — generated differently depending on destination: a **"mail identifier"** for domestic (US) packages, versus a **TMUID** for international packages.
- **Last-mile carrier package ID** — for domestic US shipments, this is described as **"always available"** and is stated to be **the full USPS IMpb number**, "sometimes referred to as the PIC (package identification code)."

**This is an important structural finding:** for domestic US DHL eCommerce shipments, the customer-facing tracking number is described as being a **USPS-format identifier**, not a DHL-distinctive one. This directly parallels the UPS Mail Innovations finding in `UPS_COURIER_IDENTIFIER_RESEARCH.md` (Section 11) — both UPS and DHL "last-mile handoff to USPS" products appear to reuse USPS's own numbering scheme for the customer-facing domestic tracking number, rather than a carrier-specific prefix. No specific length/character-set/regex detail for the "mail identifier" or "TMUID" fields themselves was found.

## 10. DHL Parcel and Paket identifier-format evidence

**No authoritative, directly-confirmed format was found.** Secondary aggregator sources offered several mutually inconsistent claims for DHL Paket/Germany tracking numbers — 12-digit numeric, 20-digit "Deutsche Post"-style numeric, `JD`-prefixed 16–20 character international/express formats, and `GM`-prefixed 11–13 digit Netherlands/Germany formats — none corroborated by a directly-read official source, and several of these contradict each other on basic length. Per the task's explicit rule not to approve a format from search-result snippets alone, **none of these claims is treated as verified**. The one search-synthesized 21-character all-numeric value referenced in Section 6 (associated with the official Post & Parcel Germany tracking page title) is the closest this research came to an official example, and even that carries reduced confidence since the source page itself was not read.

## 11. Published length and character rules

No officially confirmed, single length or character-set rule exists across DHL's parcel/courier divisions researched here — the evidence instead points toward **multiple, division-specific, and in some cases carrier-inherited (USPS) formats**, none of which was directly confirmed with an authoritative source in this research session. This is a materially weaker evidentiary position than either the UPS research (which had a directly-fetched official regex) or even the DSV research (which had at least one project-owner-supplied example, however unverified).

## 12. Prefix evidence

No officially confirmed DHL-specific fixed prefix was found for parcel/courier identifiers within the scope of this research. Secondary sources' claims of `JD` and `GM` prefixes for certain Paket/international formats are unconfirmed and, per Section 10, inconsistent with each other and with no official corroboration.

## 13. Check-digit evidence

**Not found in any directly-read or search-synthesized official source.** The only check-digit claim available (DHL Express, Modulo 7 over the first 9 of 10 digits) remains exactly as unconfirmed as it was when first recorded in `COURIER_EMS_RESEARCH.md` — no new evidence, official or otherwise, was found to strengthen or refute it in this research.

## 14. Identifier overlap and ambiguity

- **DHL Express (claimed 10-digit numeric)** would structurally overlap with any other 10-digit numeric identifier scheme from another courier or an unrelated internal reference number — high false-positive risk if ever implemented on the unconfirmed secondary claim alone.
- **DHL eCommerce (US domestic)** identifiers are, per Section 9, literally USPS-format numbers — meaning a DHL-specific detection rule could not distinguish a DHL eCommerce domestic shipment from a native USPS shipment at all, without carrier-specific external confirmation. This mirrors the equivalent UPS Mail Innovations finding.
- **DHL Paket/Germany** claimed formats (12-digit, 20/21-digit, `JD`-prefixed, `GM`-prefixed) span a wide range of shapes, several of which could overlap with generic long numeric identifiers from other couriers or postal systems (e.g. the 20/21-digit shape is in the same general range as some USPS/international postal tracking numbers).
- **No DHL format researched here has a distinctive, officially-confirmed fixed prefix** comparable to UPS's `1Z`/`1R`, which materially limits how confidently any DHL identifier could be locally recognized without ambiguity.

## 15. API availability and authentication

- **MyDHL API (DHL Express):** requires an active DHL Express customer account; credentials are provided by a DHL Express consultant after account setup — not self-service, not open/anonymous.
- **DHL eCommerce APIs (Americas/UK/Europe):** referenced as part of the same DHL Developer Portal ecosystem; a Postman collection is mentioned as available for the Americas API, implying credentialed API access is the norm, though the exact authentication mechanism (API key vs. OAuth) was not confirmed in this research.
- **General:** the DHL API Developer Portal itself is described (via search synthesis) as "DPDHL's single point of contact for access to APIs from all its business divisions" — implying a registration/subscription model is standard practice across DHL's API catalog, consistent with every other courier researched in this project to date (UPS, and implicitly DSV).
- **Conclusion:** no evidence was found of any DHL parcel/courier tracking API being open or anonymously accessible. As with every other courier researched, **direct browser-side API access would be inappropriate**, since it would require embedding credentials in browser-side code, prohibited by `CLAUDE.md`.

## 16. Local detection feasibility

Given the findings above, **no DHL parcel/courier format researched in this document currently supports high-confidence local recognition**:

- DHL Express's claimed 10-digit format rests entirely on unconfirmed secondary sources, identical in strength to what was already known before this research task.
- DHL eCommerce domestic identifiers are not DHL-specific at all — they are USPS-format, making "DHL detection" for this sub-case a misnomer; any future detection here would really be detecting a USPS-style number and then requiring external confirmation of DHL eCommerce handling.
- DHL Paket/Germany formats are contradictorily described across secondary sources with no official resolution.
- No distinctive DHL prefix exists anywhere in the evidence gathered, unlike UPS's `1Z`/`1R`.

This is the weakest evidentiary position among the three commercial couriers researched so far in this phase (DSV: single unverified example; UPS: directly-fetched official regex; DHL: search-synthesized official page references only, with internally contradictory secondary claims and no distinctive prefix).

## 17. Proposed safe recognition options

### Option A: Recognize only DHL formats with a directly verified, distinctive fixed prefix and complete official structure

**Not currently applicable to any DHL format researched.** No DHL parcel/courier identifier researched here has both a directly-verified official structure and a distinctive fixed prefix — the closest candidate (DHL Express 10-digit numeric) has neither a confirmed official source nor a distinctive prefix (it is a plain numeric string).

### Option B: Recognize officially documented DHL numeric lengths as possible DHL matches, but never as high-confidence matches

**Not currently applicable either**, because no DHL numeric length was *officially* documented in this research — only secondary-sourced. Applying Option B today would mean treating an unconfirmed secondary claim as if it were "officially documented," which this document explicitly avoids doing.

### Option C: Return several possible courier matches when a numeric value matches both DHL and another courier family

Conceptually the most honest fit for DHL's current evidence state **if and when** any DHL numeric format is eventually confirmed — since DHL Express's claimed 10-digit format and DHL eCommerce's USPS-inherited format both carry meaningful overlap risk with other numeric identifier families (Section 14), any future implementation should default to ambiguous/multi-candidate handling rather than confident single-carrier attribution.

### Option D: Do not implement local DHL recognition and require user selection or future API verification

**Recommended**, based strictly on the evidence quality gathered in this research. No DHL parcel/courier format has been confirmed by a directly-read official source in this session (unlike UPS), and the DHL eCommerce finding (Section 9) suggests that at least one major DHL sub-product does not even have its own distinctive identifier scheme to detect. Implementing any DHL-specific local recognition today would mean encoding unconfirmed, and in places contradictory, secondary-sourced claims as if they were verified — which this task's rules explicitly prohibit ("Do not approve a format from a search-result snippet alone").

**Combined recommendation:** **Option D now**, with **Option C reserved as the eventual fallback behavior** if a DHL numeric format is later officially confirmed (e.g. via direct developer-portal access or a project-owner-supplied example, mirroring how the DSV and UPS research proceeded) — at that point, given DHL's apparent lack of a distinctive prefix and multiple overlapping numeric sub-formats, ambiguous/multi-candidate handling (Option C) would be the appropriate posture rather than high-confidence single-carrier attribution (Option A/B). **This recommendation requires project-owner approval before any implementation** and does not itself authorize any detection rule.

## 18. Proposed detector-result behavior

Not implemented at this stage, and not currently proposed in concrete form given the Option D recommendation. If, in a future stage, DHL evidence is strengthened enough to revisit this, any DHL-aware detector result would need to follow the same structured contract already used by `detect-container.js`, `detect-awb.js`, and `detect-postal.js` (`identifierType`, `matched`, `normalizedIdentifier`, `possibleCarriers`, `confidence`, `valid`, `ambiguous`, `reason`, `recommendedAction`), with `confidence` capped well below `"high"` given the current evidence, and `ambiguous`-style handling strongly preferred over confident single-carrier attribution, per Section 17's Option C fallback. This is a conceptual note only, not a design decision.

## 19. Open product decisions

The following require explicit project-owner decisions and are not resolved by this document:

- Whether to pursue direct DHL Developer Portal access through another channel (different network environment, or a manually supplied document/PDF, mirroring how the UPU S10 blocker and the DSV/UPS research approached similar gaps) before any DHL implementation work.
- Whether DHL should be deprioritized relative to UPS in any future implementation wave, given the markedly weaker evidence gathered here.
- Whether DHL eCommerce's USPS-inherited domestic identifiers should be treated as "DHL" at all in the product's taxonomy, or reclassified conceptually as a USPS-format case that happens to be DHL-eCommerce-handled.
- Whether the project owner can supply an official DHL Express/eCommerce/Paket example (similar to the DSV `DSVPH#########` evidence) to help corroborate or refute the secondary-sourced claims recorded here.
- Whether DHL, DSV, and UPS should be evaluated together for a combined implementation-wave decision once FedEx and Aramex research is also complete.

## 20. Recommended next stage and explicit exclusions

**Recommended next stage:** continue the approved commercial-courier research sequence with FedEx and Aramex, using the same directly-fetch-first methodology attempted here and successfully used for UPS (checking for a reachable official GitHub-hosted spec before falling back to search synthesis), so that all four remaining candidates (DHL, FedEx, UPS, Aramex — DSV already researched) can be compared on a consistent evidentiary basis before any single project-owner-approved implementation-wave decision. Given this document's finding that DHL evidence is currently the weakest of the three couriers researched so far, revisiting DHL with either direct portal access or a project-owner-supplied example (Section 19) is a reasonable parallel or follow-up action, but is not itself the recommended *next* research stage. This recommendation is not carried out by this document.

This research task does **not** authorize:

- Production implementation of any DHL detection rule
- Creation or modification of `detect-courier.js`
- Creation or modification of `carrier-registry.js`
- Modification of `router.js`
- Modification of `index.html`
- Addition of any tracking URL
- Research or implementation of DHL Global Forwarding or any freight-forwarding, air-freight, ocean-freight, road-freight, or rail-freight reference
- Research or implementation of house AWBs, house bills of lading, master bills, freight booking references, customer freight references, or DHL Supply Chain order references
- Research or implementation of DSV, UPS, FedEx, or Aramex (each covered separately)
- Container tracking work beyond the existing detector
- EMS classification or UPU S10 classification work
- Submission of any tracking number, real or synthetic, to a live DHL tracking service or API
- Copying operational tracking numbers observed in public search results into this document or any test fixture

## Evidence matrix

| Claim | DHL division | Source authority | Source title | Source URL | Directly accessed | Evidence strength | Remaining uncertainty | Safe for local implementation |
|---|---|---|---|---|---|---|---|---|
| DHL API Developer Portal exists as single access point for all DHL divisions' APIs | All | DHL (official, referenced) | DHL API Developer Portal | https://developer.dhl.com/ | No — 403 | Medium | Portal content unread | Partial |
| "Shipment Tracking - Unified" API spans Post & Parcel Germany and DHL Global Forwarding | Post & Parcel Germany; DHL Global Forwarding (excluded) | DHL (official, referenced) | Shipment Tracking - Unified | https://developer.dhl.com/api-reference/shipment-tracking | No — 403 | Medium | Whether/how division is auto-identified is unknown | Partial (DGF portion explicitly excluded) |
| MyDHL API (DHL Express) requires active customer account and consultant-issued credentials | DHL Express | DHL (official, referenced) / DHL partner help page | MyDHL API (DHL Express); ShipStation Help article | https://developer.dhl.com/api-reference/mydhl-api-dhl-express ; https://help.shipstation.com/hc/en-us/articles/46755497112219-DHL-Express-MyDHL-API | No | Medium | Exact auth mechanism (API key vs OAuth) unconfirmed | Yes (sufficient to conclude "not open access") |
| DHL eCommerce (US domestic) tracking number is the full USPS IMpb/PIC number | DHL eCommerce Americas | DHL (official, referenced) | DHL eCommerce Americas API docs | https://docs.api.dhlecs.com/ ; https://developer.dhl.com/api-reference/references-dhl-ecommerce-americas | No — 403 | Medium-high (specific, detailed synthesis) | Exact field name/validation not directly read | Partial (structurally important negative finding) |
| DHL eCommerce international packages use a DHL-generated "TMUID" | DHL eCommerce Americas | DHL (official, referenced) | DHL eCommerce Americas API docs | https://docs.api.dhlecs.com/ | No | Medium | Format of TMUID itself unknown | No |
| DHL Express uses a 10-digit numeric tracking number with a Modulo 7 check digit | DHL Express | Secondary aggregator (not authoritative) | Parcel Detect FAQ | https://parceldetect.com/faq/dhl-tracking-number-format | No | Low | Not confirmed by any DHL source, direct or synthesized | No |
| DHL Paket/Germany formats: 12-digit, 20/21-digit, `JD`-prefixed, `GM`-prefixed | DHL Parcel / Post & Parcel Germany | Secondary aggregators (not authoritative), mutually inconsistent | ParcelsApp, 17TRACK, Parcel Monitor, postal.ninja | (multiple aggregator URLs, not cited as sole evidence) | No | Very low — internally contradictory | High | No |
| Post & Parcel Germany example value `00340434161094042557` (21 digits) | Post & Parcel Germany | DHL (official page referenced, content not read) | DHL Parcel DE Tracking (Post & Parcel Germany) | https://developer.dhl.com/api-reference/dhl-parcel-de-shipment-tracking-post-parcel-germany | No — 403 | Low-medium (attributed to an official page title via search snippet only) | Whether this is a genuine test fixture or coincidental snippet text is unconfirmed | No |
| Official MyDHL API SOAP Developer Guide PDF exists at v2.33 | DHL Express | DHL (official, referenced) | DHL EXPRESS - MyDHL API - SOAP Developer Guide | https://developer.dhl.com/sites/default/files/2025-04/DHL%20EXPRESS%20-%20MyDHL%20API%20-%20SOAP%20Developer%20Guide%20-%20v2.33.pdf | No — 403 (also blocked via a third-party mirror on a different domain) | Medium (existence confirmed, content unread) | Complete format/check-digit content unread | No |

No real customer tracking number was used, referenced, or submitted anywhere in this research. No identifier was submitted to any DHL tracking service or API.

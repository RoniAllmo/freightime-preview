# Courier and EMS Identifier Research

Research date: 2026-08-04

## 1. Research purpose

This document evaluates the feasibility of local, format-based identifier detection for three additional shipment categories not yet covered by the FreighTime Single-input tracking router: commercial courier tracking numbers, EMS (Express Mail Service) identifiers, and other international postal identifiers that follow the UPU S10 standard.

This is a **research and design document only**. It does not implement, authorize, or approve any production code, detector, carrier registry entry, or user-interface change. Its purpose is to determine what can be detected reliably through local format validation alone, what remains structurally ambiguous, and what would require carrier selection, additional user input, or an authorized tracking API in a later, separately approved stage.

## 2. Product-category separation

For the purposes of this router, the following categories are conceptually distinct and must not be collapsed into one another:

- **Commercial courier** — a shipment handled end-to-end by a private express/parcel company (e.g. DHL, FedEx, UPS, Aramex) under that company's own tracking-number scheme.
- **EMS (Express Mail Service)** — a specific, UPU-coordinated express product operated by national postal administrations under a shared international standard (UPU S10, service-indicator range `EA`–`EZ`). EMS is postal, not a private courier network, even though it competes commercially with courier services.
- **International postal item (non-EMS)** — any other UPU S10-identified item (registered mail, tracked letter post, insured mail, international parcel post, etc.) handled by national postal administrations.
- **Domestic postal item** — a postal item that never leaves its country of origin. Domestic-only identifier schemes are out of scope for this research, which is limited to internationally identifiable formats; some domestic schemes may not use S10 at all.
- **Freight or cargo reference** — an ocean container number, air waybill, or similar freight-industry reference, already covered by the existing `detect-container.js` and `detect-awb.js` modules. Freight references are a different domain from parcel/mail tracking and must not be conflated with courier or postal identifiers.

**Why EMS must not be treated as equivalent to a commercial courier:** EMS uses a single shared international identifier standard (S10) issued and structurally defined by the UPU, with the service indicator letters `EA`–`EZ` reserved specifically for EMS. A commercial courier such as DHL, FedEx, UPS, or Aramex instead defines and controls its own proprietary tracking-number format, independent of the UPU. Treating an EMS number as if it were a "courier" number (or vice versa) would misrepresent both the operator and the correct tracking destination, and would violate the router's requirement (`TRACKING_ROUTER_DESIGN.md`, `CLAUDE.md`) not to force an unsupported or incorrect match.

## 3. UPU S10 identifier structure

**Verified structural summary** (converged from multiple independent secondary sources, cross-referencing the official UPU standard document; the primary PDF itself — `S10-12.pdf` at upu.int — could not be directly fetched in this environment; see Section 15 and the Network Limitation note below):

- **Total length:** 13 characters.
- **Structure:** `AA` (service indicator, 2 letters) + `NNNNNNNN` (serial number, 8 digits) + `C` (check digit, 1 digit) + `CC` (country code, 2 letters). Pattern: 2 letters, 8 digits, 1 digit, 2 letters.
- **Service-indicator positions:** characters 1–2.
- **Serial-number positions:** characters 3–10 (8 digits, numeric range `00000000`–`99999999`).
- **Check-digit position:** character 11 (a single digit, 0–9).
- **Country-code positions:** characters 12–13 (2 letters, an ISO 3166-1 alpha-2-style code).
- **Allowed character types:** uppercase ASCII letters in the service-indicator and country-code fields; ASCII digits in the serial-number and check-digit fields. No punctuation, spaces, or lowercase letters are part of the identifier itself (though they may appear as visual separators on printed labels or barcodes).
- **Check-digit calculation:** a weighted Modulus 11 algorithm over the 8 serial-number digits (documented in full in Section 6).
- **Meaning of the final country code:** the two trailing letters identify the **issuing postal administration's country** — i.e. the postal operator that assigned/issued the identifier — **not necessarily the current custodian or the final delivery operator**. An S10 identifier ending in a given country code is issued only under the authority of the UPU-designated organization for that country. This distinction matters for FreighTime: the trailing country code cannot, by itself, be treated as proof of "where this item currently is" or "who will deliver it."

**Status:** structurally verified with high confidence (consistent across the official standard's title/description as surfaced in search results, Wikipedia's summary, and independent technical blog posts). The exact byte-for-byte wording of the UPU standard document was not independently read in this environment.

## 4. EMS identification inside S10

- **EMS service-indicator range:** `EA` through `EZ` (i.e., any service indicator beginning with the letter `E`) is the range assigned to EMS. Multiple independent sources converge on "EMS gets all E-prefixes."
- **Is every identifier beginning with `E` necessarily EMS?** **Not with full certainty.** Available secondary sources indicate that within the `E` range, the sub-range `EX`–`EZ` requires a **bilateral agreement between specific postal operators** and may be used for exceptional or operator-specific arrangements rather than standard EMS. This means an identifier of the general shape `E?########?##` is a **high-confidence EMS candidate**, but the exact sub-range `EA`–`EW` versus `EX`–`EZ` should be treated as a meaningful distinction: `EA`–`EW` can be treated as standard EMS with higher confidence, while `EX`–`EZ` should be flagged as "EMS-range but bilateral/exceptional — confidence reduced" rather than asserted as ordinary EMS without qualification.
- **Distinguishing EMS from other postal categories:** based on the (unofficial, aggregated) service-indicator mapping found during this research:
  - Registered mail: prefix `RR` (secondary-source evidence only).
  - Tracked letter / small packet post: prefix `LX` (secondary-source evidence only).
  - International parcel post: prefix `CP` (secondary-source evidence only).
  - Insured mail: a specific prefix range was referenced in aggregate descriptions of "trackable items" but no letter-range was independently confirmed for insured mail in the sources reached during this research; this must be marked **unverified**.
  - E-commerce postal items: no distinct, independently confirmed service-indicator range was found; marked **unverified**.
- **What can be detected with high confidence vs. what requires caution:**
  - High confidence: the identifier is *structurally* S10-shaped (13 characters, correct type layout) **and** has a valid check digit **and** begins with `E` in the `EA`–`EW` sub-range → reasonable to label "likely EMS."
  - Requires caution: `EX`–`EZ` prefixes (bilateral/exceptional), any prefix whose category could not be confirmed against an authoritative source (see incomplete mapping above), and any case where the check digit is invalid (structure resembles S10 but the number itself does not validate).

## 5. Other S10 postal categories

| Service indicator (as found) | Conceptual identifier type | Support in first postal phase? | Classification if implemented |
|---|---|---|---|
| `EA`–`EW` | EMS (standard) | Candidate for first phase | EMS |
| `EX`–`EZ` | EMS (bilateral/exceptional agreement) | Not recommended for first phase without further verification | Postal (EMS-range, reduced confidence) — not asserted as standard EMS |
| `RR` | Registered mail | Candidate, pending confirmation of full range (only `RR` prefix seen in secondary sources, not a documented range of letters) | Postal |
| `LX` | Tracked letter / small packet post | Candidate, pending confirmation of full range | Postal |
| `CP` | International parcel post | Candidate, pending confirmation of full range | Postal |
| Insured mail range | Insured letter/parcel post | **Not sufficiently verified** — no confirmed indicator range found | Unsupported until verified |
| E-commerce postal items | E-commerce postal item | **Not sufficiently verified** — no confirmed indicator range found | Unsupported until verified |
| Any other/reserved range | Unknown/reserved | Not supported | Unsupported |

This table intentionally does **not** approve any of these categories for implementation. It records what a first postal-detection phase would need to decide on, contingent on further verification of the exact service-indicator letter ranges (ideally by directly reading the UPU S10-12 PDF, which could not be fetched in this environment).

## 6. S10 check-digit design

**Algorithm (weighted Modulus 11), as converged from research:**

1. Only the 8 serial-number digits participate in the calculation. The service indicator, country code, and the check digit itself are not inputs to the calculation.
2. Each of the 8 digits (left to right) is multiplied by a fixed positional weight: `8, 6, 4, 2, 3, 5, 9, 7`.
3. The 8 weighted products are summed (call this sum `S`).
4. `S` is reduced modulo 11.
5. The check digit `C` is computed as `C = 11 − (S mod 11)`.
6. Special-case handling of the result:
   - If `C = 10`, the check digit is set to `0`.
   - If `C = 11` (i.e., `S mod 11 = 0`), the check digit is set to `5`.
   - Otherwise, `C` (a value 0–9, excluding the two special cases above) is used directly.
7. Valid outcome: the computed `C` equals the identifier's 11th character (the printed check digit). Invalid outcome: it does not.

**Worked examples reproduced from secondary sources (documentation fixtures, not customer shipments):**

- Serial `47312482` → weighted sum `S = 4×8 + 7×6 + 3×4 + 1×2 + 2×3 + 4×5 + 8×9 + 2×7 = 200`; `200 mod 11 = 2`; `C = 11 − 2 = 9`. (This example covers only the 8-digit serial, not a full 13-character identifier with service indicator and country code.)
- Full identifier `AG018300045CN` → serial `01830004`; `S = 0×8 + 1×6 + 8×4 + 3×2 + 0×3 + 0×5 + 0×9 + 4×7 = 72`; `72 mod 11 = 6`; `C = 11 − 6 = 5`. This matches the printed check digit `5` in `AG018300045CN` (positions: `AG` + `01830004` + `5` + `CN` = 13 characters), which is internally self-consistent with the algorithm above.

Both examples were independently recomputed during this research (not merely copied) and are consistent with the stated algorithm, which increases confidence in the algorithm's correctness even though the primary UPU document itself was not directly read.

## 7. Commercial courier candidates

### DHL

- **Official source reached:** none directly accessible in this environment (`dhl.com`, DHL developer portal not fetchable — see Network Limitation section). All findings below are from secondary aggregator sources (e.g. ParcelDetect, Ship24, FreightAmigo) and are **not independently confirmed against an official DHL source**.
- **Tracking products/divisions covered:** DHL Express (10-digit numeric) is distinguished from DHL eCommerce (reportedly longer, sometimes alphanumeric, e.g. prefixes like `JJD01`).
- **Does DHL publish a definitive public tracking-number format?** Not confirmed — no official DHL format specification page was reached in this research.
- **Known identifier categories (secondary-sourced only):** DHL Express — 10 numeric digits; check digit reportedly a Modulo 7 calculation over the first 9 digits. DHL eCommerce — reportedly longer/alphanumeric, format not independently confirmed.
- **Overlap risk:** a 10-digit all-numeric string overlaps in length and character set with many other numeric identifier schemes (see Section 8); it is not visually distinctive.
- **Local-format confidence:** **low-to-medium** for DHL Express specifically, and only if the (unverified) Modulo 7 rule is confirmed against an official source; DHL eCommerce format is **not sufficiently verified** to attempt detection.
- **Would identification require:** likely a second-stage carrier lookup or user selection, given the overlap risk with generic numeric formats and lack of an official format specification reached in this research.
- **Official tracking API / authentication:** DHL is known industry-wide to operate a developer API program requiring authentication (API keys); this was not independently re-confirmed by direct portal access in this research, but no evidence was found suggesting anonymous/unauthenticated public tracking exists.
- **Browser-side API access:** would be inappropriate — any DHL API requires credentials, and `CLAUDE.md` explicitly prohibits placing API keys or credentials in browser-side code.
- **Suitable for first courier implementation phase?** **Not recommended yet** — format not officially verified in this research; recommend gathering official documentation before implementation (see Section 10 and 18).

### FedEx

- **Official source reached:** none directly accessible in this environment. Findings are from secondary aggregators (ParcelDetect, Ship24, InstantParcels) only.
- **Tracking products/divisions covered:** FedEx Express (reported 12-digit numeric), FedEx Ground (reported 15-digit numeric, following the RPS/Roadway Package System acquisition), FedEx SmartPost (reported 20-digit), FedEx Freight (reported 15–25 digit, commonly starting with "96").
- **Does FedEx publish a definitive public format?** Not confirmed in this research — no official FedEx developer-portal page was reached.
- **Known categories (secondary-sourced only):** purely numeric across all reported formats (no letter prefixes, unlike UPS); last digit reportedly a Modulo 11 check digit, but the exact weighting algorithm was not found or verified.
- **Overlap risk:** 12- and 15-digit all-numeric strings substantially overlap with other numeric schemes, including domestic parcel and even some freight references, in raw shape.
- **Local-format confidence:** **low** without official confirmation of the exact check-digit algorithm; length alone (12 vs. 15 vs. 20 digits) is not distinctive enough by itself.
- **Would identification require:** likely additional context (declared service type) or a second-stage lookup, given multiple internal formats and overlap risk.
- **Official tracking API / authentication:** FedEx is known industry-wide to require API credentials for its developer platform; not independently re-confirmed here.
- **Browser-side API access:** inappropriate for the same reason as DHL.
- **Suitable for first courier implementation phase?** **Not recommended yet** — check-digit algorithm not verified against an official source.

### UPS

- **Official source reached:** none directly accessible in this environment (`developer.ups.com` not fetchable). Findings are from secondary sources (ParcelPath, GoComet, CodeProject, a personal blog "Sid's FishNet") only.
- **Tracking products/divisions covered:** the standard "1Z" tracking number format, used broadly across UPS ground and air services.
- **Does UPS publish a definitive public format?** The 1Z format is very widely and consistently described (18 characters: `1Z` + 6-character shipper number + 2-character service code + 8-character package identifier + 1 check digit), giving reasonable convergent confidence, but this was not confirmed by directly reading `developer.ups.com` in this research.
- **Known categories:** the 1Z format is distinctive — it always begins with the literal prefix `1Z`, which is a strong, low-collision structural signal compared to purely numeric couriers.
- **Overlap risk:** low for the `1Z` prefix itself (very few other schemes start with this exact two-character sequence), though UPS is also reported to use some purely numeric or 9-digit formats for other services, which would carry the same overlap risk as other numeric formats.
- **Local-format confidence:** **medium-to-high** specifically for the `1Z...` structural pattern (length 18, fixed prefix), **contingent on independently confirming the check-digit algorithm against an official UPS source** — the Modulo-10 weighted algorithm found here came only from a third-party CodeProject article and a personal blog, not from UPS itself.
- **Would identification require:** for the `1Z` format specifically, local structural detection is plausible at "possible match" confidence; full validation would still benefit from confirming the check-digit algorithm officially.
- **Official tracking API / authentication:** UPS is known industry-wide to require registration and API credentials; not independently re-confirmed here.
- **Browser-side API access:** inappropriate for the same reason as above.
- **Suitable for first courier implementation phase?** **Best candidate among the four researched couriers** for a *structural, non-final* detection ("looks like a UPS 1Z number") specifically because of the distinctive fixed prefix, but check-digit validation should not be implemented until the algorithm is confirmed against an official UPS source.

### Aramex

- **Official source reached:** none directly accessible in this environment. Aramex's own developer documentation (`aramex.com/developers`) was referenced by search results but not fetchable.
- **Tracking products/divisions covered:** unclear from available sources — Aramex does not appear (based on available secondary evidence) to publish one universal global tracking-number format; format may vary by product/region.
- **Does Aramex publish a definitive public format?** **No** — this was the clearest negative finding of the four candidates. Available evidence explicitly indicates no single confirmed public format exists.
- **Known categories:** none confirmed.
- **Overlap risk:** cannot be assessed without a confirmed format.
- **Local-format confidence:** **not sufficiently verified** — no reliable basis for any local structural detection.
- **Would identification require:** almost certainly a second-stage lookup, user selection of "Aramex" as the carrier, or API-based confirmation, rather than local pattern detection.
- **Official tracking API / authentication:** an Aramex developer portal is referenced by name, but its authentication model, endpoints, and public tracking-number documentation were not reachable in this research.
- **Browser-side API access:** inappropriate regardless of confirmation, per `CLAUDE.md`'s credential rules.
- **Suitable for first courier implementation phase?** **Not recommended** — insufficient evidence exists to support even structural detection.

## 8. Courier-pattern ambiguity analysis

- **Same-length numeric identifiers:** DHL Express (10 digits), FedEx Express (12 digits), and various domestic/regional identifiers can share the same digit count as each other or as unrelated reference numbers (order numbers, invoice numbers, etc.). Digit count alone is a weak signal.
- **Multiple valid formats within one courier:** FedEx alone reportedly spans 12-, 15-, 20-, and 15–25-digit formats depending on service (Express, Ground, SmartPost, Freight). A single "FedEx detector" would need to account for several sub-formats, each with its own risk of false positives.
- **Legacy and regional formats:** DHL Express vs. DHL eCommerce reportedly differ structurally (numeric-only vs. longer/alphanumeric); similar regional splits likely exist for other couriers not covered by this research pass. Any detector would need to track that such splits exist even where the details are not yet confirmed.
- **Postal identifiers handled by courier networks:** some postal administrations contract EMS or parcel handling through commercial courier networks in specific corridors, which can blur the line between "postal" and "courier" at the operational level even though the identifier standard (S10 vs. proprietary) remains a clean technical distinction.
- **Freight references vs. parcel references:** a purely numeric string could coincidentally match the shape of an ocean container's digit portion, an AWB's 11-digit structure, or a courier's numeric tracking number. The existing router (`router.js`) already demonstrates the correct pattern for this: run all detectors independently and report ambiguity honestly rather than guessing (see Section 12).
- **Risk of false-positive carrier identification:** given that DHL, FedEx, and various domestic schemes are described in secondary sources as "purely numeric" with only digit-count as a distinguishing feature, a naive detector risks confidently mislabeling one courier's number as another's, or as an unrelated numeric string entirely.

**Three confidence levels and their evidentiary requirements:**

- **High confidence:** structure matches a documented, sufficiently distinctive pattern (e.g., a fixed alphabetic prefix like UPS's `1Z`, or a validated S10 check digit) **and** ideally the check-digit algorithm has been confirmed against an authoritative source.
- **Possible match:** structure matches a documented pattern, but the pattern is not distinctive on its own (e.g., digit-count-only match against a known courier length) **or** the check-digit algorithm is only sourced from secondary references.
- **Ambiguous:** the input's shape (length, character set) is consistent with more than one candidate category (e.g., a plain 10–15 digit numeric string that could be DHL, FedEx, a domestic reference, or nothing at all), and no distinguishing structural feature exists to prefer one interpretation over another.

## 9. Proposed identifier taxonomy

Proposed future `identifierType` values (naming convention consistent with the existing `ocean-container` / `air-waybill` / `unknown` style already used in `detect-container.js`, `detect-awb.js`, and `router.js`):

- `ocean-container` (existing)
- `air-waybill` (existing)
- `commercial-courier`
- `ems`
- `international-postal`
- `unknown` (existing)

**Architecture evaluation:**

- **Should EMS have a dedicated detector, or share one with other S10 postal items?** EMS is structurally just one service-indicator range within the single S10 standard — it does not require a different parsing or check-digit algorithm from any other S10 item. A single "S10 structural detector" that also classifies the service-indicator range (EMS vs. registered vs. parcel vs. unknown-postal) appears architecturally cleaner than a separate EMS-only detector, since it avoids duplicating the S10 structure/check-digit logic.
- **Should `detect-courier.js` remain limited to commercial couriers?** Yes — this preserves the existing module's documented boundary (`detect-courier.js`'s current JSDoc already scopes it to "courier and express tracking number patterns") and matches the Section 2 category separation above: postal (UPU-governed) and commercial-courier (privately governed) are different domains with different validation rules.
- **Should a future `detect-postal.js` module be introduced instead of placing S10 logic inside `detect-courier.js`?** Based on this research, **yes, a dedicated `detect-postal.js` is recommended** over extending `detect-courier.js`, because: (a) S10 is a single, well-defined standard with its own check-digit algorithm, unrelated to any single commercial courier's proprietary rules; (b) mixing S10 parsing into `detect-courier.js` would blur the Section 2 category boundary this document argues for; (c) it keeps each detector module's responsibility narrow, consistent with `TRACKING_ROUTER_DESIGN.md`'s module-responsibility design.

**This is a proposed architecture recommendation only and requires project-owner approval before any implementation.**

## 10. Proposed first implementation wave

| Candidate | Category | Evidence quality | Wave |
|---|---|---|---|
| UPU S10 structural detection (13-char shape) | Postal/EMS | High — structure independently converged across multiple sources | 1. Safe to implement locally |
| S10 check-digit validation | Postal/EMS | High — algorithm reproduced and independently recomputed against two examples | 1. Safe to implement locally |
| EMS classification (`EA`–`EW`) | EMS | Medium-high — range well-attested, but full letter-by-letter table not confirmed against the primary UPU document | 2. Possible but ambiguous |
| EMS classification (`EX`–`EZ`, bilateral) | EMS (exceptional) | Medium — range attested but its practical implications not fully documented | 2. Possible but ambiguous |
| Other S10 categories (`RR`, `LX`, `CP`, insured, e-commerce) | International postal | Low-medium — only single-prefix, not full documented ranges; insured and e-commerce ranges unverified | 4. Not sufficiently verified (insured/e-commerce); 2. Possible but ambiguous (RR/LX/CP, pending range confirmation) |
| UPS `1Z...` structural shape | Commercial courier | Medium — format widely and consistently described, but not from an official UPS source | 2. Possible but ambiguous |
| UPS `1Z` check-digit validation | Commercial courier | Low — algorithm sourced only from a third-party article, not confirmed officially | 4. Not sufficiently verified |
| DHL Express 10-digit format | Commercial courier | Low — no official source reached; overlaps heavily with generic numeric formats | 3. Requires API or user selection / 4. Not sufficiently verified |
| FedEx formats (12/15/20/etc.) | Commercial courier | Low — no official source reached; multiple overlapping sub-formats | 3. Requires API or user selection / 4. Not sufficiently verified |
| Aramex format | Commercial courier | Very low — no confirmed public format exists | 4. Not sufficiently verified |

This wave assessment is a recommendation for evaluation, not an implementation authorization.

## 11. Proposed detector contracts

### `detectCourier(normalizedInput)` (future)

- **Input:** the normalized-input object from `normalize.js` (same pattern as `detectContainer`/`detectAwb`).
- **Output:** a structured result matching the existing detector shape used by `detect-container.js`/`detect-awb.js`: `identifierType`, `matched`, `normalizedIdentifier`, `possibleCarriers`, `confidence`, `valid`, `ambiguous`, `reason`, `recommendedAction`.
- **Identifier type:** `commercial-courier` when a candidate courier structural pattern is matched (e.g. `1Z...`); `unknown` otherwise.
- **Possible matches:** conceptually a list of candidate courier names *only if and when* courier identification is separately approved and populated in a registry — this research does not populate one (`possibleCarriers` must remain empty until that approval).
- **Confidence:** one of the three levels defined in Section 8 (`high`, `possible`/`medium`, or absent/`none` for no structural match).
- **Validation status:** whether a courier-specific check digit (where one is confirmed, e.g. UPS) passed.
- **Ambiguity:** true when the structure could plausibly belong to more than one courier candidate (e.g. an unadorned numeric string matching both DHL's and FedEx's reported lengths).
- **Technical reason key:** stable keys analogous to the existing detectors' `not_container_structure` / `container_structure_and_check_digit_valid` style, e.g. `not_courier_structure`, `courier_structure_possible_match`, `courier_structure_check_digit_invalid`.
- **Recommended action:** analogous to existing actions, e.g. `continue_other_detectors`, `ask_user_to_select_identifier_type`, or a new key indicating that a second-stage lookup would be required (not implemented in this research).

### `detectPostal(normalizedInput)` (future, proposed)

- **Input:** same normalized-input object.
- **Output:** the same shared result shape as above.
- **Identifier type:** `ems` when the S10 structure validates **and** the service indicator falls in the EMS range; `international-postal` when the S10 structure validates but the service indicator maps to a different, supported postal category; `unknown` when the structure does not match S10 at all.
- **Possible matches:** conceptually empty for postal items in the first phase — no carrier/operator registry is proposed to be populated by this research (postal administration is not itself a "carrier" in the same sense as a commercial courier, and Section 17 leaves open whether the issuing administration should even be surfaced).
- **Confidence:** `high` when S10 structure and check digit both validate and the service indicator is in a well-attested range (e.g. `EA`–`EW`); `medium`/`possible` for the `EX`–`EZ` bilateral range or unverified service-indicator ranges; `none` for non-S10 input.
- **Validation status:** whether the S10 check digit (Section 6) passed.
- **Ambiguity:** S10 by design does not overlap structurally with the other detectors' formats in an obvious way (13 characters, fixed letter/digit layout), so ambiguity here would mainly arise if a future courier format happened to also be 13 characters in the same layout — not confirmed as a risk in this research, but should be checked once courier formats are officially verified.
- **Technical reason key:** e.g. `not_s10_structure`, `s10_structure_and_check_digit_valid`, `s10_structure_valid_check_digit_invalid`, `s10_service_indicator_unverified_category`.
- **Recommended action:** e.g. `proceed_to_postal_operator_matching` (future), `ask_user_to_verify_identifier`, `continue_other_detectors`.

Neither contract is implemented, and no JavaScript file is created or modified by this research task.

## 12. Router implications

- **All detectors running independently:** consistent with the existing `router.js` design (documented in `TRACKING_ROUTER_DESIGN.md` Section 6 and implemented in the current router), any future `detectCourier`/`detectPostal` should also always run against the same normalized input, never short-circuiting on the first match — this is what allows genuine ambiguity to be represented honestly.
- **Overlap between 11-digit AWB and numeric courier numbers:** the existing AWB detector requires *exactly* 11 digits with no letters. Some courier formats reported in this research (e.g. an 11-digit substring within a longer FedEx or DHL number) could theoretically coincide in length with a valid-shaped AWB. The router's existing ambiguity-handling design (Section 6 of `TRACKING_ROUTER_DESIGN.md`) already anticipates exactly this kind of future collision and requires it to be surfaced as an ambiguous result, not silently resolved.
- **Overlap between postal and courier identifiers:** S10's fixed 13-character, 2-letter/8-digit/1-digit/2-letter layout is structurally distinctive compared to the purely numeric or `1Z`-prefixed courier formats researched here, so a collision is not expected based on current evidence — but this should be explicitly re-verified once official courier formats are confirmed.
- **Ambiguous results:** as with the existing container/AWB detectors, a future courier or postal detector must report `ambiguous: true` and preserve all matching detector results, rather than the router (or any detector) forcing a single interpretation.
- **Validated S10 result vs. unverified courier-format match:** the router's `confidence` field already distinguishes `high` from `medium`/`none`. A future S10 result with a valid check digit should be able to report `high` confidence (per Section 6's verified algorithm), while an unverified courier structural match (e.g. DHL's un-confirmed check-digit rule) should report a lower confidence, consistent with the "possible match" tier in Section 8.
- **No automatic carrier selection when several matches exist:** consistent with `CLAUDE.md` Section 8 and the existing router's ambiguity handling — this remains a hard requirement for any future detector.
- **No external navigation during detection:** consistent with the existing router's `routingDecisionMade: false` / `externalUrlSelected: null` / `externalNavigationOccurred: false` invariants — any future postal/courier detector must not introduce navigation, and this research does not propose changing that.

## 13. User-interface implications

The following are **conceptual future Hebrew interface states only** — no wording is finalized, and `ui-messages.js` is not modified by this research:

- Valid EMS identifier (structure + check digit valid, service indicator in a well-attested EMS range).
- Valid international postal identifier (S10 valid, non-EMS supported category).
- Invalid S10 check digit (structure resembles S10, but check digit fails — analogous to the existing container/AWB "recognized-invalid" pattern).
- One confident courier match (a single courier structural pattern matched with high confidence, e.g. `1Z...`).
- Several possible courier matches (structure is ambiguous between more than one courier candidate).
- Recognized courier-style number with unknown specific carrier (structure looks like *some* courier's format, but not distinctively enough to name one).
- Unsupported or unverified pattern (input does not match any currently supported category, including postal/courier — mirrors the existing `unrecognized` state).

Exact Hebrew wording, and whether new states are added to `trackingUiMessages` versus reusing existing ones, is left for a future, separately authorized implementation stage.

## 14. Privacy and security

- Local detection (structural and check-digit validation) should occur before any external transmission, consistent with the existing normalize → detect → router pipeline, which performs no network calls today.
- Identifiers must not be logged unnecessarily, consistent with the existing detectors' and router's behavior (verified in earlier stages via test assertions that no `console.*` output occurs).
- This research did not use any real customer identifier — the only identifiers referenced in this document are (a) worked examples reproduced from public secondary sources for the purpose of documenting the check-digit algorithm, explicitly labeled as such, and (b) synthetic fixtures newly computed during this research (Section 16), also explicitly labeled and safe.
- Live API integration with any courier or postal operator requires separate, explicit project-owner approval — not authorized by this document.
- Credentials must not be placed in browser-side code, consistent with `CLAUDE.md` Sections 6 and 9 — no credentials of any kind were used, stored, or referenced in this research.
- No external API calls were implemented or executed against any tracking service during this research; only read-only search/document lookups were performed, and no identifier was submitted to any live tracking system.
- Carrier websites were not scraped; no automated scraping was performed at any point.

## 15. Evidence matrix

| Provider / standard | Source authority | Source title | Source URL | Information verified | Confidence | Remaining uncertainty | Safe for local detection |
|---|---|---|---|---|---|---|---|
| UPU S10 | Official standard (referenced, not directly fetched) | S10: Identification of postal items — 13-character identifier | https://www.upu.int/UPU/media/upu/files/postalSolutions/programmesAndServices/standards/S10-12.pdf | Structure, length, field layout (via convergent secondary description) | Medium-high | Primary PDF not directly read in this environment (fetch blocked); exact clause wording unverified | Partial |
| UPU S10 | Encyclopedia (secondary, but structurally consistent with official description) | S10 (UPU standard) | https://en.wikipedia.org/wiki/S10_(UPU_standard) | Structure, check-digit algorithm, EMS range, country-code meaning | Medium-high | Could not directly open the page to confirm citations; relied on search-engine synthesis | Partial |
| UPU S10 check digit | Independent technical blog | The International Standard for Identifying Postal Items | https://www.akpain.net/blog/s10-upu/ | Check-digit weights, worked example (`47312482` → `9`) | Medium | Independently recomputed and matched, but page not directly opened | Partial |
| UPU S10 worked example | Secondary aggregator | International Postal Item Identification: S10 Codes | https://medium.com/postagemaker/international-postal-item-identification-s10-codes-b8ba49d345c5 | Full-identifier worked example (`AG018300045CN`), self-consistent with recomputed check digit | Medium | Not independently opened; relied on search synthesis | Partial |
| EMS service-indicator range | UPU EMS Cooperative (referenced) | EMSEVT V3 part 2 | https://www.ems.post/sites/default/files/content-block-files/EMSEVT%20V3%20part%202.pdf | Referenced as an official EMS Cooperative document; not directly opened | Low-medium | Document not fetched in this environment | Partial |
| Other S10 categories (RR/LX/CP) | Aggregated secondary sources | (multiple, see search results) | n/a (aggregated) | Single-prefix mapping for registered/tracked/parcel | Low-medium | Full documented letter ranges not confirmed | No (until confirmed) |
| DHL Express format | Secondary aggregator | DHL Tracking Number Format: 10 vs 11 Digits | https://parceldetect.com/faq/dhl-tracking-number-format | 10-digit numeric format, reported Modulo 7 check digit | Low | No official DHL source reached | No |
| FedEx format | Secondary aggregator | FedEx Tracking Number Formats: 12, 15, 20, and 22 Digits | https://parceldetect.com/faq/fedex-tracking-number-format | Multiple numeric lengths by service | Low | No official FedEx source reached; check-digit algorithm not detailed | No |
| UPS 1Z format | Secondary aggregator | The Anatomy Of UPS Tracking Numbers | https://www.gocomet.com/blog/ups-tracking-numbers/ | 18-character `1Z` structural layout | Medium | No official UPS source reached | Partial (structure only) |
| UPS 1Z check digit | Third-party technical article | Calculating the UPS Tracking Number Check Digit | https://www.codeproject.com/Articles/21224/Calculating-the-UPS-Tracking-Number-Check-Digit | Modulo-10 weighted algorithm and worked example | Low-medium | No official UPS confirmation | No |
| Aramex format | Aggregated secondary sources | (multiple, see search results) | n/a (aggregated) | Explicit finding: no single public format documented | Low (finding itself is that evidence is absent) | Entirely unverified | No |
| S10 check-digit reference implementation | Open-source repository (unread) | anton-bot/s10 | https://github.com/anton-bot/s10 | Repository exists and states its purpose; internal code not read | Low | Source code not inspected in this environment | Not used as evidence |

No credentials, private developer portals, or customer data are included anywhere in this matrix.

## 16. Proposed public test fixtures

All fixtures below are either (a) reproduced from public secondary documentation for illustration, or (b) newly self-generated during this research by applying the documented S10 algorithm. None represent a real, traceable shipment.

| Fixture | Category | Expected structural result | Expected validation result | Source / method | Safe for public testing? |
|---|---|---|---|---|---|
| `47312482` (serial only, no full identifier) | S10 serial fragment | N/A — not a full 13-character identifier | Check digit `9` | Reproduced from akpain.net worked example, independently recomputed | Yes — illustrative only |
| `AG018300045CN` | S10 (full identifier) | Matches 13-character S10 layout | Check digit `5` valid | Reproduced from Medium/postagemaker worked example, independently recomputed | Yes — illustrative only |
| `EA000000005IL` | S10 / EMS (synthetic) | Matches S10 layout, service indicator `EA` (EMS, well-attested range) | Check digit `5` valid (self-computed: all-zero serial → sum 0 → `C = 11 − 0 = 11 → 5`) | Self-generated in this research using the documented algorithm | Yes — synthetic, safe |
| `EA000000014IL` | S10 / EMS (synthetic) | Matches S10 layout, service indicator `EA` | Check digit `4` valid (self-computed: serial `00000001` → sum `7` → `C = 11 − 7 = 4`) | Self-generated in this research using the documented algorithm | Yes — synthetic, safe |
| `EA000000019IL` | S10 / EMS (synthetic, invalid variant) | Matches S10 layout, service indicator `EA` | Check digit **invalid** — serial `00000001` computes to `4` (see row above), but this fixture deliberately uses `9` instead, to serve as a negative/invalid test case | Self-generated — deliberately altered check digit of the `EA000000014IL` fixture above | Yes — synthetic, safe |
| `1Z999AA10123456784` (commonly cited illustrative UPS-style number) | Commercial courier (UPS, structural only) | Matches `1Z` + 17-character layout | **Not confirmed** — check-digit algorithm unverified against an official source | Widely cited illustrative example in secondary sources | Use with caution — structural example only, not validated against an official source |

Note: the fourth row above illustrates the intended purpose (a deliberately invalid check-digit fixture) but should be recomputed cleanly before any actual use — see the "known limitation" note in Section 19. This document does not certify final numeric fixture values for implementation; any future implementation stage must recompute and verify its own fixtures directly against the algorithm in code, the same way `detect-container.test.js` and `detect-awb.test.js` did for container and AWB numbers.

## 17. Open product decisions

The following require explicit project-owner decisions and are not resolved by this document:

- Whether the initial commercial-courier launch group includes UPS only, or additional couriers once officially verified.
- Whether Aramex belongs in the first wave at all, given the near-total absence of a confirmed public format.
- Whether EMS is shown to users as a separate visible category, or folded into a generic "international postal" label.
- Whether non-EMS S10 postal items (registered, tracked, parcel, insured, e-commerce) are supported in the first postal phase, or whether the first phase is EMS-only.
- Whether a new `detect-postal.js` module should be created (recommended by this research, Section 9) versus another architectural approach.
- Whether ambiguous courier matches require mandatory manual user selection, or may instead route to a generic "select carrier" prompt automatically.
- Whether the first postal/courier release performs local recognition only, or also adds official-site routing (as the container/AWB MVP already does).
- Whether Israel Post is treated as an operator whose S10-issued identifiers should be specially recognized, a routing destination, both, or neither, for this Israel-market-focused product.
- Whether commercial courier detection should be postponed entirely until an authorized, verified API-based carrier-detection approach is available, given how little of the courier research in this document could be confirmed against official sources.

## 18. Recommended next stage

**Recommendation: Create a postal-detector technical design** (an S10/EMS-focused equivalent of `TRACKING_ROUTER_DESIGN.md`), rather than implementing code or gathering more courier evidence first.

Rationale, based strictly on evidence quality gathered in this research:

- UPU S10 structure and its check-digit algorithm reached the highest confidence level in this research — independently recomputed and self-consistent across two separate worked examples from different sources.
- EMS classification within S10 is well-attested at the `E`-prefix level, with a clear (if not fully granular) understanding of the `EA`–`EW` vs. `EX`–`EZ` distinction.
- By contrast, all four researched commercial couriers (DHL, FedEx, UPS, Aramex) rest on secondary-source-only evidence, with UPS being the strongest candidate but still lacking an officially confirmed check-digit algorithm, and Aramex having essentially no confirmed public format at all.

Given this asymmetry, the highest-value, lowest-risk next technical step is to formally design the postal/EMS detector (module contracts, service-indicator table finalization, test-fixture generation) while leaving commercial-courier work for a later stage that either (a) manages to reach official developer-portal documentation directly, or (b) is explicitly scoped as "structural-pattern-only, unvalidated" per project-owner decision.

This recommendation is not self-executing — implementation of even the postal design remains contingent on the open decisions in Section 17.

## 19. Explicit exclusions

This research task does **not** authorize:

- Production code changes
- Courier detection implementation
- EMS implementation
- Postal detection implementation
- Carrier registry population
- Tracking URLs
- External navigation
- Live tracking
- Paid APIs
- Website scraping
- Browser-side API calls
- User-interface changes
- Assistant changes
- Framework migration
- Package installation

## Network limitation note

Direct fetching of external documentation pages (`WebFetch`, and direct `curl`/HTTP requests through this environment's outbound proxy) returned **HTTP 403 Forbidden** for every external, non-Anthropic domain attempted during this research, including the official UPU standard PDF, Wikipedia, official courier sites, and GitHub. This is a network-policy restriction of this sandboxed environment, not a property of the target sites. Only the built-in `WebSearch` tool (which returns synthesized, source-attributed summaries rather than raw page content) was available.

As a result, every finding in this document that depends on an external source is sourced through `WebSearch` synthesis rather than a directly read primary document, and confidence levels throughout this document have been adjusted downward accordingly and stated explicitly per finding. No finding has been presented as more certain than this limitation allows, and several items (full S10 category letter-ranges beyond `EA`–`EZ`/`RR`/`LX`/`CP`, and all four commercial couriers' official specifications) are explicitly marked as unverified or only partially verified as a direct consequence.

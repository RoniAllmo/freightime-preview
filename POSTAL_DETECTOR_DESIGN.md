# FreighTime — Postal Detector Technical Design

Design date: 2026-08-04

This document is a technical design only. It does not implement, authorize, or approve any production code. It builds on the research recorded in `COURIER_EMS_RESEARCH.md` and the approved architecture in `TRACKING_ROUTER_DESIGN.md` and `CLAUDE.md`, and does not repeat the external courier/EMS research already documented there.

## 1. Purpose

This document defines the technical design for a future, dedicated local detector for UPU S10 international postal identifiers.

The planned detector may distinguish between:

- **EMS** — an S10 identifier with a service indicator in the EMS range.
- **Other supported international postal identifiers** — S10 identifiers whose service category has been sufficiently verified and is deliberately supported.
- **Valid but unsupported S10 categories** — identifiers that are structurally and mathematically valid S10 items, but whose service category is not (yet) supported by FreighTime.
- **Invalid S10-style identifiers** — values that match the S10 shape but fail check-digit validation.
- **Non-postal identifiers** — values that do not match the S10 structure at all.

This detector, like the existing `detect-container.js` and `detect-awb.js` modules, performs **local structural and mathematical validation only**. It will not retrieve live tracking information, contact any postal operator, or otherwise make an external request.

## 2. Approved architecture decision

The following decisions are recorded as approved (per the current task) and govern this design:

- The planned module is `js/tracking/detect-postal.js`.
- `detect-courier.js` remains limited to commercial couriers and is not modified by this design.
- UPU S10 and EMS logic must not be placed inside `detect-courier.js`.
- Commercial courier implementation (DHL, FedEx, UPS, Aramex) remains deferred.
- No commercial courier is approved for implementation by this document.

This mirrors the existing separation already established between `detect-container.js`, `detect-awb.js`, and (not yet implemented) `detect-courier.js`, and is consistent with the category separation documented in `COURIER_EMS_RESEARCH.md` Section 2.

## 3. Detector input

The planned public function signature is:

`detectPostal(normalizedInput)`

It receives the object produced by `normalizeTrackingInput(rawInput)` in `normalize.js` — the same normalized-input object already consumed by `detectContainer` and `detectAwb`.

**Recommended field to inspect:** `normalizedInput.alphanumericInput`, consistent with the existing detectors. This field already contains only uppercase ASCII letters and digits with all separators removed, which matches the S10 structural model (Section 4) directly.

The detector must not:

- Accept raw input directly.
- Repeat the full normalization layer (trimming, casing, compacting) already implemented in `normalize.js`.
- Transliterate non-ASCII characters (e.g. Hebrew letters must not be converted to Latin letters; they are simply absent from `alphanumericInput` by design, per `normalize.js`'s documented ASCII-only behavior).
- Remove separators itself — that responsibility belongs entirely to `normalize.js`.
- Access the DOM.

## 4. S10 structural model

The normalized structural model for a candidate S10 identifier, based on `COURIER_EMS_RESEARCH.md` Section 3:

- **Positions 1–2:** two ASCII service-indicator letters.
- **Positions 3–10:** eight decimal serial digits.
- **Position 11:** one decimal check digit.
- **Positions 12–13:** two ASCII country-code letters.
- **Total length:** 13 characters.

Conceptually, a candidate string is structurally consistent with S10 when: its length is exactly 13; its first two characters are ASCII letters; its next eight characters are ASCII digits; its eleventh character is an ASCII digit; and its final two characters are ASCII letters. No production regular expression or other implementation code is defined here — this is a structural description only, for a future implementation stage to translate into code.

**On the final two-letter country code**, per `COURIER_EMS_RESEARCH.md` Section 3, this design states clearly and will require any future implementation to reflect:

- The country code identifies the **issuing postal administration**, not necessarily the item's current location.
- It is **not necessarily the destination country** of the shipment.
- It does **not prove the current delivery operator** handling the item.
- It does **not prove that Israel Post currently holds the item**, even if the code happens to be `IL`.

## 5. S10 check-digit algorithm

The planned calculation, per `COURIER_EMS_RESEARCH.md` Section 6:

1. Use the eight serial digits in positions 3–10.
2. Apply weights, in order: `8, 6, 4, 2, 3, 5, 9, 7`.
3. Sum the eight weighted products.
4. Calculate the sum modulo 11.
5. Subtract the remainder from 11 to obtain a candidate result.
6. Apply the S10 special-result mapping (see below).
7. Compare the final calculated digit with the character at position 11.

**Review of the special-result mapping, per `COURIER_EMS_RESEARCH.md`:** the research document states that a candidate result of `10` maps to check digit `0`, and a candidate result of `11` maps to check digit `5`. This mapping was corroborated across more than one independent secondary source and is internally self-consistent with two worked examples that were independently recomputed during the research (a serial-only example and the full identifier `AG018300045CN`). However, `COURIER_EMS_RESEARCH.md`'s own "Network limitation note" states plainly that **no primary UPU document was directly read** in that research — all findings, including this mapping, came from search-engine-synthesized secondary sources.

Per this task's explicit instruction not to resolve such a mapping "merely from convention," this design **treats the exact special-result mapping (10 → 0, 11 → 5) as an unresolved implementation blocker** (see Section 18), notwithstanding the reasonably convergent secondary evidence. It must be confirmed against the primary UPU S10-12 standard document (or another sufficiently authoritative source) before being encoded in production check-digit logic.

## 6. Postal classification model

Proposed classification outputs (design-stage names, not yet approved as final public API values — see Section 10):

- `ems`
- `international-postal`
- `postal-unsupported`
- `unknown`

These four proposed outputs are deliberately separated across five distinct concerns, which must not be conflated in implementation:

- **Structural recognition** — does the candidate match the 13-character S10 shape (Section 4)? This is independent of validity or category.
- **Mathematical validation** — does the check digit computed per Section 5 match position 11? This is independent of category.
- **Service-category classification** — does the service indicator (positions 1–2) fall into a category the detector can name (EMS, or another verified category)? This depends on the evidence available (Sections 7–8).
- **Postal-operator identification** — determining *which* postal administration or operator handles the item. This is explicitly **out of scope** for this design (Section 11) and is not part of any proposed classification output.
- **Live-tracking availability** — whether tracking events can be retrieved for the item. This is explicitly out of scope; this detector never retrieves live data (Section 1, Section 17).

## 7. EMS classification

Based on `COURIER_EMS_RESEARCH.md` Section 4:

- **Proposed `EA`–`EZ` range:** service indicators beginning with the letter `E` are the EMS-designated range.
- **Caution concerning `EX`–`EZ`:** this sub-range is documented in the research as requiring a bilateral agreement between specific postal operators, and should not be treated identically to the standard `EA`–`EW` sub-range.
- **Why the first letter `E` alone is insufficient:** an `E`-prefixed service indicator is a necessary but not sufficient condition for confident EMS classification, because (a) the `EX`–`EZ` bilateral sub-range carries different, less-certain implications, and (b) a structural match on the first letter says nothing about whether the identifier is even a valid S10 item (Section 5).
- **Why a valid check digit is required for high confidence:** a structural-only match (correct shape, `E`-prefixed) with an invalid check digit indicates either a transcription error or a non-S10 string that coincidentally resembles the shape; only a validated check digit combined with the structural match should support a "confident EMS" classification.

**Conceptual outcomes:**

| Case | Conceptual classification |
|---|---|
| Structurally valid S10, service indicator in `EA`–`EW`, valid check digit | Valid, high-confidence EMS |
| Structurally valid S10, service indicator in `EA`–`EZ` (any), invalid check digit | EMS-style identifier with invalid check digit — structural match only, not validated |
| Structurally valid S10, service indicator in `EX`–`EZ`, valid check digit | Exceptional/bilateral EMS indicator — reduced confidence, not asserted as standard EMS |
| Structurally valid S10, service indicator not in `EA`–`EZ` | Non-EMS S10 item — see Section 8 |

This section does not implement the range check; it documents the intended behavior for a future implementation.

## 8. Non-EMS S10 handling

For valid S10 identifiers not classified as EMS:

- **Verified supported postal category** — a service indicator with sufficiently authoritative range evidence (per `COURIER_EMS_RESEARCH.md` Section 5) that the project owner has approved for support. At the time of this design, no non-EMS category has both (a) sufficiently authoritative range evidence and (b) project-owner approval — see Section 18.
- **Valid but unsupported postal category** — a service indicator with some evidence (e.g. the single-prefix findings `RR`, `LX`, `CP` noted in the research) but not a confirmed complete range, or a category not yet approved for support. This case should classify as `postal-unsupported`, per this task's instruction.
- **Unknown or reserved service indicator** — a service indicator with no evidence at all in the research. This should also classify as `postal-unsupported` rather than being guessed at.
- **Invalid check digit** — regardless of the service indicator's category, a structurally valid but mathematically invalid S10 identifier is not "supported" or "unsupported" by category — it is simply invalid, and should be reported as such (see Section 9, case 6).

Any category without sufficiently authoritative range evidence remains `postal-unsupported`, per this task's explicit instruction. This design does not guess or invent category names for any service-indicator range beyond what `COURIER_EMS_RESEARCH.md` documents.

## 9. Detector-result contract

The future `detectPostal` result would use the same common detector fields already established by `detect-container.js` and `detect-awb.js`: `identifierType`, `matched`, `normalizedIdentifier`, `possibleCarriers`, `confidence`, `valid`, `ambiguous`, `reason`, `recommendedAction`. No postal operator, carrier record, or tracking URL is added to this contract.

Conceptual expected behavior:

1. **Valid EMS** (structural + check digit valid, `EA`–`EW` or `EX`–`EZ`): **superseded by the approved "EMS classification decision" section at the end of this document** — `identifierType: "international-postal"` (not `"ems"`), `matched: true`, `valid: true`, `confidence: "high"`, with `reason: "s10_ems_standard_valid"` or `"s10_ems_bilateral_valid"`.
2. **EMS-style identifier with invalid check digit** (structural match, `E`-prefixed, check digit fails): **superseded** — `matched: true`, `valid: false`, `confidence: "medium"`, `reason: "s10_ems_invalid_check_digit"`, per the approved decision below; conceptually still mirrors the existing "structure valid, check digit invalid" pattern from `detect-container.js`/`detect-awb.js`.
3. **Valid supported non-EMS postal item** (structural + check digit valid, category verified and approved): `identifierType: "international-postal"` (pending Section 10), `matched: true`, `valid: true`, `confidence: "high"`. *(No category currently qualifies — see Section 8 and 18.)*
4. **Valid but unsupported S10 category** (structural + check digit valid, category not approved/verified): `identifierType: "postal-unsupported"` (pending Section 10), `matched: true`, `valid: true`, `confidence` reduced (e.g. `"medium"`), reflecting that the number is mathematically valid but FreighTime cannot meaningfully classify or route it yet.
5. **Structurally valid S10 with unknown service indicator** (no evidence at all for the indicator, check digit not yet evaluated or also unverifiable in context): treated the same as case 4 — `postal-unsupported`, not guessed.
6. **Invalid S10 check digit** (structure matches, digit fails, regardless of service indicator): `matched: true`, `valid: false`, `confidence: "medium"`.
7. **Non-S10 input** (structure does not match at all): `identifierType: "unknown"`, `matched: false`, `confidence: "none"` — mirrors the existing unknown-result pattern.
8. **Missing or malformed normalized input**: must not throw; returns the same safe "unknown" shape as the existing detectors' documented handling of missing/malformed input.

## 10. Identifier-type decision

Two options are compared for the public `identifierType` values:

**Option A** — two distinct public values:
- `ems`
- `international-postal`

**Option B** — a single public value:
- `international-postal` for all recognized S10 items (EMS or not)
- The specific service category (EMS vs. other) represented only through the existing `reason`/`recommendedAction` technical keys, not through a new public field

The current common detector contract (Section 9) has **no public service-category field** — only `identifierType`. Adding a category-specific field would expand the shared contract beyond what `detect-container.js`/`detect-awb.js` currently expose, which this design does not want to do without explicit approval.

**Recommendation (design recommendation only, not an implemented decision):** Option B is recommended — a single `identifierType: "international-postal"` value for all recognized S10 items, with EMS-vs-other-category distinction carried only in the `reason` key (e.g. `s10_ems_valid` vs. `s10_postal_valid`). This preserves the existing four-field-per-detector contract shape without introducing a new public field, and keeps `detectPostal`'s public surface consistent with `detectContainer`/`detectAwb`. This recommendation requires project-owner approval before implementation, and Section 17 of `COURIER_EMS_RESEARCH.md` already lists "whether EMS is shown as a separate category" as an open product decision this recommendation feeds into but does not resolve.

**Update (2026-08-04): Option B is now the approved decision for EMS.**
The project owner has approved Option B specifically for EMS
classification — see the "EMS classification decision" section at the
end of this document for the exact approved `reason`/`recommendedAction`
key values. This approval is scoped to EMS; whether the same Option B
approach extends to any future non-EMS S10 category remains an open
decision (Section 18).

## 11. Country-code handling

The final two letters (positions 12–13) may later be treated as issuing-country metadata, but **not** in the first implementation. For the first implementation:

- Do not identify a postal operator from the country code.
- Do not add an Israel Post routing rule.
- Do not assume the suffix is the destination.
- Do not return a tracking URL.
- Do not submit the identifier externally.

The country code's role in this first design is limited to **structural presence** (Section 4) — confirming two ASCII letters occupy positions 12–13 — not to any semantic interpretation.

## 12. Router integration design

Planned future detector order in `router.js`:

1. Container
2. AWB
3. Postal
4. Commercial courier (when approved and implemented)

Consistent with the existing router design (`TRACKING_ROUTER_DESIGN.md` Section 6, and the current `router.js` implementation), **all active detectors must run independently** against the same normalized input — postal detection matching must never suppress or skip the container, AWB, or (future) courier detectors.

**Theoretical overlap analysis:**

- **Postal vs. container:** the S10 shape (2 letters + 8 digits + 1 digit + 2 letters, 13 characters total) does not match the container shape (4 letters + 7 digits, 11 characters total) — different total lengths make an overlap structurally impossible under the current definitions.
- **Postal vs. AWB:** the AWB shape (11 digits, no letters) also differs in total length (11 vs. 13) and character composition (S10 requires letters in positions 1–2 and 12–13) — likewise structurally impossible to collide under current definitions.
- **Postal vs. future courier formats:** not yet assessable with confidence, because commercial courier formats remain largely unverified (`COURIER_EMS_RESEARCH.md` Section 7). If a future courier format happens to also be 13 characters with a similar letter/digit layout, this must be explicitly re-checked once courier formats are officially confirmed (per `COURIER_EMS_RESEARCH.md` Section 12).

The router must not suppress other detectors merely because postal detection matched. If, in a future scenario, more than one detector reports `matched: true` for the same input, the existing router's ambiguity handling (`status: "ambiguous"`, `identifierType: "ambiguous"`, `ambiguous: true`, all detector results preserved, no automatic selection) applies unchanged — this design does not propose any modification to that existing mechanism, only that a future `postalResult` be added to the array of detector results the router evaluates.

## 13. User-interface implications

Conceptual future Hebrew UI states (wording not finalized, `ui-messages.js` not modified by this document):

- Valid EMS.
- Invalid EMS check digit.
- Valid international postal item (non-EMS, supported category).
- Valid but unsupported postal category.
- Invalid S10 check digit (general, non-EMS-specific case).
- Unknown postal-style input (structurally similar but not S10, or S10-shaped with no recognizable service indicator evidence).
- Ambiguous postal/courier result (for the future scenario where courier detection is also active and overlaps).

## 14. Proposed module and test files

**Planned future files (not created by this task):**

- `js/tracking/detect-postal.js`
- `tests/tracking/detect-postal.test.js`

**Files that may require later changes, once postal detection is approved and implemented (not modified by this task):**

- `js/tracking/router.js` — to import and run `detectPostal`, per Section 12.
- `tests/tracking/router.test.js` — to cover the new detector's integration.
- `js/tracking/ui-messages.js` — to add the Hebrew states described in Section 13.
- `js/tracking/ui-controller.js` — to map new router statuses to messages, per the existing `resolveMessageKey` pattern.
- `tests/tracking/ui-controller.test.js` — to cover the new UI states.

No file in either list is created or modified by this design task.

## 15. Test-fixture policy

Future tests for `detect-postal.js` may use only:

- Authoritative public documentation examples (e.g. the recomputed worked examples already recorded in `COURIER_EMS_RESEARCH.md` Section 6/16).
- Synthetic identifiers generated from the verified algorithm (once the Section 18 blockers are resolved), following the same pattern already used for `EA000000005IL` / `EA000000014IL` in `COURIER_EMS_RESEARCH.md`.
- Deliberately invalid versions of safe synthetic fixtures (e.g. `EA000000019IL`, already recorded as a negative-test example).

Future tests must **not** use:

- Real customer identifiers.
- Operational company records.
- Live tracking submissions.
- Any claim that a synthetic fixture represents an active shipment.

## 16. Required future tests

Future test coverage for `detect-postal.js` should address at least:

- Valid EMS
- Invalid EMS check digit
- Lowercase manually constructed normalized input
- Valid non-EMS S10 item
- Unsupported service indicator
- Reserved service indicator
- Invalid country-code positions (e.g. digits where letters are expected)
- Invalid service-indicator positions (e.g. digits where letters are expected)
- Input that is too short
- Input that is too long
- Numeric-only input
- Container-style input (cross-detector negative case)
- AWB-style input (cross-detector negative case)
- Spaces remaining in `alphanumericInput` (should not occur given `normalize.js`'s contract, but tested defensively, mirroring the existing detectors' manually constructed malformed-object tests)
- Hyphens remaining in `alphanumericInput` (same rationale)
- Hebrew characters
- Non-ASCII letters
- Missing normalized input
- Malformed normalized object
- Frozen result
- Frozen `possibleCarriers`
- No input mutation
- No DOM access
- No storage access
- No logging
- No navigation
- No network access

This mirrors the test-category structure already established in `tests/tracking/detect-container.test.js` and `tests/tracking/detect-awb.test.js`. No test file is created by this task.

## 17. Security and privacy

The future `detect-postal.js` detector must:

- Run locally, using only local pattern matching and arithmetic.
- Make no external request of any kind.
- Not log identifiers.
- Not store identifiers.
- Not identify a postal operator without sufficiently authoritative evidence.
- Contain no credentials.
- Not scrape postal websites.
- Not activate or interact with the assistant/chat interface.

## 18. Implementation blockers

The following were originally documented as unresolved. Several have since
been resolved by later, dedicated verification tasks and are marked
accordingly below; see the "EMS classification decision" section at the
end of this document for the full, current, approved EMS design.

- ~~**Exact S10 special-result mapping for calculated values 10 and 11**~~
  — **Resolved.** Directly confirmed against the official UPU S10
  check-digit validation tool (project-owner-supplied spreadsheet and
  screenshots); see `S10_AUTHORITATIVE_VERIFICATION.md`, "Manual
  boundary-case verification" section. Already implemented in
  `detect-postal.js`.
- ~~**Complete EMS service-indicator range.**~~ — **Resolved.** Directly
  confirmed as `EA`–`EZ` against the original UPU Technical Standard S10
  document (Version 12); see `EMS_CLASSIFICATION_RESEARCH.md`,
  "Authoritative verification from the original UPU S10 standard"
  section, and the "EMS classification decision" section below.
- ~~**Treatment of `EX`–`EZ`.**~~ — **Resolved.** `EX`–`EZ` remains part
  of the EMS product-type range and requires bilateral agreement between
  designated operators; the classification consequence (still `ems`
  service classification, not `postal-unsupported`, and not excluded) is
  approved in the "EMS classification decision" section below.
- **Verified non-EMS service-indicator ranges.** Only single-prefix
  evidence exists for `RR`, `LX`, `CP`; no confirmed complete ranges, and
  no evidence at all for insured mail or e-commerce postal items. **Still
  a blocker** — not addressed by the EMS-focused verification.
- **Whether country-code validation should use a complete ISO 3166-1 list
  or structural letters only.** Not addressed in `COURIER_EMS_RESEARCH.md`
  or the EMS verification tasks; both approaches are technically
  possible, but no evidence or decision favors one over the other yet.
  **Still a blocker (decision).**
- **Whether `postal-unsupported` should return `matched: true`.** This
  design's working assumption (Section 9, cases 4–5) is `matched: true`
  (since the S10 structure did match, even though the category is
  unsupported), but this has not been confirmed as the intended
  router-facing behavior; it affects how the router's ambiguity logic
  (Section 12) would treat such results. **Still a blocker (decision)** —
  unaffected by the EMS decision below, which only concerns the EMS
  category itself.
- ~~**Exact `identifierType` design without changing the existing public
  result contract.**~~ — **Resolved.** Option B (Section 10) is now the
  approved decision; see the "EMS classification decision" section below.
- **Availability of authoritative public test fixtures.** Synthetic
  fixtures generated from the now-approved algorithm and ranges may be
  used in a future implementation stage, per the test-fixture policy in
  Section 15; no fixture has yet been created or approved by this
  document. **Still a blocker for implementation, but the underlying
  algorithm/range evidence it depended on is now resolved.**

No blocker listed above is resolved *by this document itself* — the
resolutions noted above were made by the dedicated verification and
decision tasks cited in each entry, and are only cross-referenced here.

## 19. Incremental implementation plan

Proposed future stages, each with a completion criterion:

1. **Resolve authoritative S10 blockers.** Completion criterion: the check-digit special-result mapping, EMS range boundaries, and at least one non-EMS category range are confirmed against a primary or otherwise sufficiently authoritative source, and the project owner has made the pending decisions listed in Section 18.
2. **Create `detect-postal.js` with structural and check-digit validation.** Completion criterion: the module correctly classifies structural match/non-match and check-digit validity for a documented set of test cases, without yet performing service-category classification.
3. **Add postal detector tests.** Completion criterion: the test cases in Section 16 exist and pass.
4. **Add EMS classification.** Completion criterion: the module correctly distinguishes `EA`–`EW`, `EX`–`EZ`, and non-`E` service indicators per the resolved Section 18 decisions, with corresponding tests passing.
5. **Add verified non-EMS categories.** Completion criterion: any category with sufficiently authoritative evidence and project-owner approval is classified correctly; all unverified categories remain `postal-unsupported`.
6. **Integrate postal detection into `router.js`.** Completion criterion: the router runs `detectPostal` alongside the existing detectors, in the order defined in Section 12, with ambiguity handling verified by tests.
7. **Add Hebrew interface states.** Completion criterion: `ui-messages.js` and `ui-controller.js` render the states described in Section 13, with corresponding UI-controller tests passing.
8. **Run local regression tests.** Completion criterion: the full `tests/tracking/*.test.js` suite passes, including all pre-existing tests.
9. **Deploy through a separate Pull Request.** Completion criterion: a PR is opened, reviewed, and (subject to a separate authorized merge task) merged, following the same controlled process used for the container/AWB MVP.
10. **Perform public manual tests.** Completion criterion: the deployed public site is manually verified to correctly classify representative valid/invalid EMS and postal test fixtures, following the same manual-test pattern used after the container/AWB deployment.

## 20. Explicit exclusions

This design does **not** authorize:

- Production implementation
- Creation of `detect-postal.js`
- Modification of `detect-courier.js`
- Commercial courier implementation
- Carrier registry population
- Postal-operator identification
- Israel Post routing
- Tracking URLs
- External navigation
- Live tracking
- API integration
- Website scraping
- Interface changes
- Assistant changes
- Framework migration
- Package installation

## 21. Recommended immediate next action

**Original recommendation (superseded): Obtain authoritative confirmation of unresolved S10 details.**

Based on the blockers documented in Section 18 — most critically the unconfirmed check-digit special-result mapping and the incomplete EMS/non-EMS service-indicator ranges — implementing `detect-postal.js` now would require encoding rules that `COURIER_EMS_RESEARCH.md` itself flags as sourced only through secondary aggregation, not a directly read primary standard. This is the same evidentiary gap already identified as the limiting factor in `COURIER_EMS_RESEARCH.md` Section 18's recommendation. Implementing postal detection or conducting further postal-category research before closing this gap risks building on unverified assumptions; obtaining direct, authoritative confirmation (e.g. successfully retrieving the primary UPU S10-12 document, or another equally authoritative source, from an environment without this session's network restriction) is the most evidence-appropriate next step.

**Update (2026-08-04):** the check-digit mapping and the EMS service-indicator range have both since been authoritatively confirmed (see `S10_AUTHORITATIVE_VERIFICATION.md` and `EMS_CLASSIFICATION_RESEARCH.md`), and the EMS design decision is now approved — see the "EMS classification decision" section at the end of this document for the current recommended next stage.

This recommendation is not carried out by this document.

## EMS classification decision (2026-08-04) — approved

This section records the project-owner-approved EMS classification
design, based on the authoritative UPU verification recorded in
`EMS_CLASSIFICATION_RESEARCH.md`. This is a documentation-only decision
record. No production code is implemented, and `detect-postal.js` is not
modified by this section.

### 1. Public identifier type

EMS remains under the existing public `identifierType:
"international-postal"` value. A new public `identifierType: "ems"`
value is **not** introduced. EMS is a service classification *within*
the broader UPU S10 international-postal identifier family, not a
separate top-level identifier type. This finalizes, as an approved
decision, the "Option B" recommendation already proposed in Section 10.

### 2. No new service-category field

No new public field (e.g. a `serviceCategory` field, as considered under
"Option C" in earlier research) is added to the shared detector-result
contract. The contract remains exactly the same nine fields already used
by `detect-container.js`, `detect-awb.js`, `detect-postal.js`, and
`detect-courier.js`:

- `identifierType`
- `matched`
- `normalizedIdentifier`
- `possibleCarriers`
- `confidence`
- `valid`
- `ambiguous`
- `reason`
- `recommendedAction`

The EMS-vs-other-category distinction is carried entirely through the
existing `reason` and `recommendedAction` keys (Section 7 below).

### 3. Mandatory validity conditions

A future high-confidence EMS result must satisfy **all three** of the
following conditions — a value beginning with the single letter `E` is
never sufficient on its own:

1. Valid UPU S10 structure (13 characters: 2-letter service indicator, 8-digit serial, 1-digit check digit, 2-letter country code).
2. A valid UPU S10 check digit (weighted Modulus 11 algorithm, including the boundary-case mapping, per `S10_AUTHORITATIVE_VERIFICATION.md`).
3. A service indicator within the approved `EA`–`EZ` range.

### 4. EA–EW: standard EMS range

`EA`–`EW` is the approved standard (non-bilateral) EMS service-indicator
sub-range, directly confirmed against the original UPU Technical Standard
S10 document (Version 12); see `EMS_CLASSIFICATION_RESEARCH.md`,
"Authoritative verification from the original UPU S10 standard," Section
6.

### 5. EX–EZ: bilateral EMS range

`EX`–`EZ` remains part of the EMS product-type range and is approved as
EMS — it is **not** excluded, reclassified, or treated as
`postal-unsupported`. Its use requires bilateral agreement between
designated postal operators, per the same official standard document
(`EMS_CLASSIFICATION_RESEARCH.md`, Section 7). This bilateral condition
is recorded as internal technical metadata only (Section 6 below) — it
does not change the identifier's public classification.

### 6. First-release user-facing behavior

For a valid S10 identifier in **either** `EA`–`EW` or `EX`–`EZ`, the
future user interface must display **one general EMS message**, common
to both ranges. The bilateral-agreement condition (Section 5 above) must
**not** be exposed in this first user-facing message — it remains
internal technical metadata, distinguished only at the `reason`-key level
(Section 7 below), not in any Hebrew text shown to the user. No future UI
message may claim:

- That the shipment exists.
- That a postal operator confirmed it.
- That live tracking information was retrieved.
- That the destination or current delivery operator is known.

### 7. Approved technical keys

**Valid `EA`–`EW` EMS identifier:**

- `identifierType`: `"international-postal"`
- `matched`: `true`
- `confidence`: `"high"`
- `valid`: `true`
- `ambiguous`: `false`
- `reason`: `"s10_ems_standard_valid"`
- `recommendedAction`: `"ems_service_identified"`

**Valid `EX`–`EZ` EMS identifier:**

- `identifierType`: `"international-postal"`
- `matched`: `true`
- `confidence`: `"high"`
- `valid`: `true`
- `ambiguous`: `false`
- `reason`: `"s10_ems_bilateral_valid"`
- `recommendedAction`: `"ems_service_identified"`

**`EA`–`EZ` S10-style identifier with an invalid check digit:**

- `identifierType`: `"international-postal"`
- `matched`: `true`
- `confidence`: `"medium"`
- `valid`: `false`
- `ambiguous`: `false`
- `reason`: `"s10_ems_invalid_check_digit"`
- `recommendedAction`: `"verify_identifier"`

### 8. Non-EMS S10 behavior unchanged

A valid non-EMS S10 identifier (service indicator outside `EA`–`EZ`)
continues to use the existing generic `detect-postal.js` behavior already
implemented today: `identifierType: "international-postal"`, `reason:
"s10_valid"`, `recommendedAction:
"postal_service_classification_pending"` for a structurally and
mathematically valid result, and `reason: "s10_invalid_check_digit"` for
an invalid one (per `detect-postal.js`'s current implementation). This
EMS decision does not alter that existing behavior in any way.

### 9. Carrier, operator, and routing restrictions

EMS classification must not:

- Add a postal operator to `possibleCarriers`.
- Identify Israel Post specifically, or any other postal operator.
- Infer the destination country from the country-code suffix.
- Infer the current custodian of the item.
- Infer the final delivery operator.
- Create or return a tracking URL.
- Make any external request (API call, live tracking lookup, or
  otherwise).

`possibleCarriers` must remain an empty, frozen array for every S10
result, EMS or otherwise — unchanged from the existing
`detect-postal.js` contract.

### 10. Next technical stage

Standalone implementation of EMS classification inside
`detect-postal.js`, together with corresponding automated tests, following
exactly the technical keys and constraints approved in this section. This
implementation is a **separate, future, explicitly authorized task** —
it is not carried out by this document. Router integration
(`router.js`), Hebrew UI messages (`ui-messages.js`, `ui-controller.js`),
and their respective tests remain further, separately authorized stages
after the standalone detector implementation, per the existing
incremental plan in Section 19.

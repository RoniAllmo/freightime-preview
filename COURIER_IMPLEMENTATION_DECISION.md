# Consolidated Commercial Courier Implementation Decision

Decision date: 2026-08-04

## 1. Decision purpose

This document consolidates the five commercial-courier research reports
completed in this project phase — `DSV_COURIER_IDENTIFIER_RESEARCH.md`,
`UPS_COURIER_IDENTIFIER_RESEARCH.md`, `DHL_COURIER_IDENTIFIER_RESEARCH.md`,
`FEDEx_COURIER_IDENTIFIER_RESEARCH.md`, and
`ARAMEX_COURIER_IDENTIFIER_RESEARCH.md` — into a single implementation
decision. It records which courier(s), if any, currently have sufficient
evidence to justify a first implementation wave, and which remain
deferred pending further evidence. This document does not implement any
production code. It authorizes only the review step described in
Section 20.

## 2. Current product scope

The current implementation phase covers **commercial parcel and courier
identifiers only**, per the project-owner-approved direction that opened
this phase and per `PRODUCT_SPEC.md` Sections 7 and 10.

**Explicitly excluded from this phase and from this document:**

- Freight forwarding
- Air freight references
- Ocean freight references
- House AWB
- House BL
- Booking references
- Customer freight references
- EMS classification
- Additional postal classification

These categories are already addressed, where applicable, by the existing
container (`detect-container.js`), air waybill (`detect-awb.js`), and
postal/S10 (`detect-postal.js`) detectors, or remain out of scope entirely
for this product phase. Nothing in this document extends, narrows, or
otherwise modifies those existing detectors or their scope.

## 3. Evidence-ranking method

This document uses the following five evidence levels, consistent with
the evidence-tiering approach already used across all five research
documents:

- **Level 1 — Directly inspected official structural specification.**
  The identifier's structure was read directly from an official,
  carrier-controlled source (e.g. a fetched OpenAPI/YAML spec, a directly
  opened developer-portal page).
- **Level 2 — Official source identified but not directly inspected.**
  An official document or page is known to exist and is referenced by
  title/URL, but its content was not directly read (e.g. blocked by
  network policy); findings are search-synthesis-referenced only.
- **Level 3 — Project-owner-provided structural example.** A single
  example was supplied directly by the project owner as research
  evidence, without independent corroboration from any official source.
- **Level 4 — Secondary or conflicting evidence.** Only non-authoritative
  aggregator, blog, or forum sources describe the format, and these
  sources are often mutually inconsistent.
- **Level 5 — No reliable structural evidence.** No source, official or
  secondary, was found describing a structure for the identifier family.

**Sufficiency for each detection posture:**

- **High-confidence local detection** (structural match reported with
  `confidence: high`) requires **Level 1** evidence for the structural
  shape. Level 1 evidence alone does not establish mathematical
  (check-digit) validation — that requires its own, separately confirmed
  Level 1 evidence.
- **Possible-match detection** (a structural match reported with reduced
  confidence, e.g. `confidence: low`/`possible`, and typically
  `ambiguous: true`) could in principle be supported by **Level 2 or
  Level 3** evidence, but only where the candidate structure does not
  meaningfully overlap with other known identifier families. None of the
  Level 2/3 evidence gathered in this phase meets that bar (see Sections
  4, 6, 7, 8).
- **Research only, no implementation** applies to **Level 2, 3, and 4**
  evidence in all other cases — the evidence is useful for informing
  future research priorities and open decisions, but is not sufficient to
  justify even a possible-match detector today.
- **No implementation** applies unconditionally to **Level 5** evidence.

## 4. DSV decision

- DSV remains an **approved courier candidate** for future evidence
  gathering; it is not removed from the product roadmap.
- The masked example `DSVPH#########` is **project-owner-provided
  structural evidence** (Level 3), per `DSV_COURIER_IDENTIFIER_RESEARCH.md`
  Section 3.
- No universal DSV parcel format was officially verified (Level 1 or
  Level 2 evidence does not exist for any DSV parcel/courier format).
- `PH` has **no approved meaning** — it is an unexplained component of a
  single example, not a confirmed code.
- Nine trailing digits are **not approved as a universal rule** — this
  reflects one example, not a documented standard.
- **No DSV production detector should be implemented in the first wave.**

**DSV status: `deferred_pending_evidence`**

## 5. UPS decision

The following structures were **directly verified** (Level 1 evidence),
sourced from officially fetched UPS specifications
(`Tracking.yaml`, `UPSTrackAlertEnhanced.yaml`, both retrieved directly
from `github.com/UPS-API/api-documentation`), per
`UPS_COURIER_IDENTIFIER_RESEARCH.md` Sections 6, 7, and 10:

- **UPS Small Package:**
  - Prefix `1Z`
  - Sixteen following uppercase ASCII alphanumeric characters (`[0-9A-Z]`)
  - Eighteen total characters

- **UPS Roadie short:**
  - Prefix `1R`
  - Fourteen following uppercase ASCII alphanumeric characters
    (`[0-9A-Z]`)
  - Sixteen total characters

- **UPS Roadie long:**
  - Prefix `1R`
  - Twenty-six following uppercase ASCII alphanumeric characters
    (`[0-9A-Z]`)
  - Twenty-eight total characters

**Clarifications:**

- The **structure** is verified (Level 1).
- A **check-digit algorithm is not approved** — no official UPS source
  confirmed a checksum or check-digit rule for any of these three
  formats (`UPS_COURIER_IDENTIFIER_RESEARCH.md` Section 9).
- **Structural recognition does not constitute mathematical validation.**
  A future detector matching these structures may report `matched: true`
  and a structural `confidence: high`, but must not report `valid: true`
  in the sense of "mathematically validated" (see Section 10 below for
  the precise meaning of `valid` in this context).
- **UPS Mail Innovations numeric identifiers are excluded from the first
  wave** — these are USPS-format identifiers (per
  `UPS_COURIER_IDENTIFIER_RESEARCH.md` Section 11), not `1Z`/`1R`-prefixed,
  and are a distinct, unresolved evidentiary question.

**UPS status: `approved_for_structural_detection`**

**Project-owner approval (2026-08-04):** the project owner has approved
UPS `1Z` and both UPS `1R` Roadie structures (short and long) for
inclusion in the first commercial-courier implementation wave, with the
following approved display names and internal carrier IDs:

- UPS `1Z` → display name **`UPS`**, internal carrier ID **`ups`**
- UPS `1R` (short and long) → display name **`UPS Roadie`**, internal
  carrier ID **`ups-roadie`**

`1R` identifiers must **not** be displayed simply as `UPS` without the
Roadie distinction — `1Z` and `1R` are approved as two separate,
distinctly named/identified candidates, not one undifferentiated "UPS"
entry. This resolves the corresponding open decisions previously recorded
in Section 19.

**Project-owner approval (2026-08-04) — UPS Mail Innovations:** UPS Mail
Innovations remains **excluded from the first implementation wave**.
Generic USPS-style or numeric identifiers must not be detected as UPS
Mail Innovations. This exclusion is confirmed, not merely proposed.

## 6. DHL decision

- No distinctive, directly verified DHL parcel format was obtained. All
  DHL findings in `DHL_COURIER_IDENTIFIER_RESEARCH.md` are Level 2
  (official pages referenced, not read) or Level 4 (secondary aggregator
  claims), with no Level 1 evidence for any DHL parcel/courier format.
- Numeric length claims (10-digit DHL Express, 12/20/21-digit Paket
  variants) are **unverified and overlap** with other couriers' claimed
  numeric formats.
- DHL eCommerce (US domestic) **may use postal identifiers** — per
  `DHL_COURIER_IDENTIFIER_RESEARCH.md` Section 9, the domestic
  last-mile-carrier package ID is described as the full USPS IMpb/PIC
  number, not a DHL-distinctive format.
- **No DHL production detector should be implemented in the first wave.**

**DHL status: `deferred_due_to_ambiguity`**

## 7. FedEx decision

- No directly verified standard FedEx parcel-number structure was
  obtained. All FedEx findings in `FEDEx_COURIER_IDENTIFIER_RESEARCH.md`
  are Level 2 (Ground Economy 12-digit/34-character claim, referenced
  from an official page title) or Level 4 (Express/Ground length claims,
  secondary and internally inconsistent).
- Numeric length claims (12-digit Express, 15-digit Ground, 12-digit
  Ground Economy) **overlap with other couriers and with generic
  references**, and even overlap with each other.
- **No standard FedEx production detector should be implemented in the
  first wave.**
- **FedEx Door Tag research remains separate from primary parcel-number
  detection** — door tags (`DT` + 12 digits) are a distinctive but
  different identifier purpose (a delivery-attempt notice, not a
  shipment's primary tracking number), per
  `FEDEx_COURIER_IDENTIFIER_RESEARCH.md` Sections 10 and 14, and are not
  addressed further by this decision.

**FedEx status: `deferred_due_to_ambiguity`**

## 8. Aramex decision

- No directly verified distinctive Aramex parcel structure was obtained.
  All Aramex findings in `ARAMEX_COURIER_IDENTIFIER_RESEARCH.md` are
  Level 2 (official manual titles/structure referenced, not read) or
  Level 4 (aggregator length claims).
- Numeric length claims (10, 10–11, 10–15, or 10/11/12/20 digits) are
  **inconsistent and overlap** with other courier identifiers.
- **No Aramex production detector should be implemented in the first
  wave.**

**Aramex status: `deferred_due_to_insufficient_evidence`**

## 9. First implementation wave

**Approved for the first implementation wave (project-owner approved,
2026-08-04):**

- UPS `1Z` structural recognition — display name `UPS`, internal carrier
  ID `ups`
- UPS `1R` short structural recognition — display name `UPS Roadie`,
  internal carrier ID `ups-roadie`
- UPS `1R` long structural recognition — display name `UPS Roadie`,
  internal carrier ID `ups-roadie`

**Explicitly excluded from the first implementation wave:**

- UPS Mail Innovations
- DSV
- DHL
- FedEx
- Aramex

Excluded couriers **remain in the product roadmap** — exclusion from the
first wave reflects current evidence quality only, not a permanent
product decision. Each excluded courier's future evidence path is
recorded in Section 17. DSV, DHL, FedEx, and Aramex must not be added as
possible carriers based only on generic numeric length, and must not be
included in ambiguous multi-candidate matches until an approved
structural rule exists for them.

## 10. Confidence model

For the UPS verified structures (Section 5):

- `matched: true`
- `confidence: high`
- `valid: true` — **for structural validity only**

**What `valid: true` means in the shared detector contract, in this
context:**

- The value satisfies the approved local structural rule (correct
  prefix, correct total length, correct character set) for a UPS `1Z`,
  `1R` short, or `1R` long identifier.

**What `valid: true` does NOT mean, in this context:**

- The shipment exists.
- UPS confirms the number.
- A check digit was verified (no UPS check-digit algorithm is officially
  confirmed for any of the three formats — Section 5).
- Live tracking data was found.

This distinction must be made explicit in any future detector's `reason`
field or accompanying documentation, so that `valid: true` for UPS
structural detection is never confused with the check-digit-validated
meaning of `valid: true` already used by `detect-container.js`,
`detect-awb.js`, and `detect-postal.js`.

**Project-owner approval (2026-08-04):** this interpretation of
`valid: true` — structural validity only, never shipment existence, UPS
confirmation, check-digit validation, or live tracking data — is approved
as the exact semantics for UPS `1Z` and UPS `1R` results in the first
implementation wave. No UPS check-digit validation is approved. This
resolves the corresponding open decision previously recorded in
Section 19.

## 11. Proposed courier result contract

Any future UPS-aware detector result should use the existing common
detector fields already shared by `detect-container.js`, `detect-awb.js`,
and `detect-postal.js`:

- `identifierType`
- `matched`
- `normalizedIdentifier`
- `possibleCarriers`
- `confidence`
- `valid`
- `ambiguous`
- `reason`
- `recommendedAction`

**Recommended values for a matching UPS structural result:**

- `identifierType: 'commercial-courier'`
- `possibleCarriers`: a frozen array containing one structured UPS
  candidate, or an approved carrier-ID representation compatible with the
  existing architecture (the exact shape is a Section 12 design question,
  not finalized here)
- `confidence: 'high'`
- `ambiguous: false`

**Project-owner approval (2026-08-04) — `possibleCarriers`
representation:** for the first implementation wave, `possibleCarriers`
must be a frozen array of internal carrier-ID strings, not a nested
public carrier object. Approved examples:

- UPS `1Z` match: `["ups"]`
- UPS `1R` match (short or long): `["ups-roadie"]`

No public carrier object or new nested schema is introduced in this
phase. The display name and any further configuration (official tracking
URL, future API availability, etc.) will be managed separately through
`carrier-registry.js`, per Section 12. This resolves the corresponding
open decision previously recorded in Section 19.

This document does **not** finalize or implement a new public
carrier-object schema. That decision must be made only after reviewing
`carrier-registry.js`'s existing structure and its documented future
record fields (see Section 12).

## 12. Carrier registry implications

A future UPS record in `carrier-registry.js` would conceptually need to
contain, consistent with the future-fields already documented in
`carrier-registry.js`'s own header comment and
`TRACKING_ROUTER_DESIGN.md` Section 7:

- Internal ID — **approved (2026-08-04):** `ups` for the `1Z` structure,
  `ups-roadie` for the `1R` short/long structures
- Display name — **approved (2026-08-04):** `UPS` for the `1Z` structure,
  `UPS Roadie` for the `1R` short/long structures
- Category (identifying this as a commercial-courier entry, distinct
  from ocean container / air waybill / postal entries)
- Supported identifier families (UPS Small Package `1Z`; UPS Roadie `1R`
  short; UPS Roadie `1R` long — as three distinct sub-patterns or three
  distinct sub-entries, a design question left open)
- Verified structural rules (the three structures in Section 5)
- Confidence (structural-only, per Section 10 — not mathematically
  validated)
- Enabled status
- Official evidence references (pointing to
  `UPS_COURIER_IDENTIFIER_RESEARCH.md` and the specific fetched UPS
  specification files/URLs)
- Future official tracking destination (UPS's official tracking page —
  not selected or populated by this document)
- Future API availability (a placeholder for UPS's officially confirmed,
  credentialed Track/Track Alert API — not integrated by this document)

**This document does not populate `carrier-registry.js`.** No record is
created, and the file is not modified.

## 13. UPS pattern design

The following describes the approved rules **conceptually**, without
writing final production JavaScript code or a final production regular
expression.

The rules must:

- Inspect `normalizedInput.alphanumericInput` (the existing normalized
  field already used by the container, AWB, and postal detectors for
  separator-stripped, alphanumeric matching).
- Require uppercase normalized input (consistent with how
  `normalize.js` already uppercases input before detectors operate on
  it).
- Require an exact total length for each of the three approved formats:
  eighteen characters (`1Z`), sixteen characters (`1R` short), or
  twenty-eight characters (`1R` long).
- Require the exact literal `1Z` or `1R` prefix at the start of the
  normalized value.
- Allow only ASCII uppercase letters and digits (`A`–`Z`, `0`–`9`) in the
  remaining positions after the prefix.
- Reject spaces, hyphens, punctuation, lowercase characters in a
  malformed normalized object, and non-ASCII characters — none of these
  are present in the officially fetched UPS specification's character
  class or example values.
- **Not claim check-digit validation** — no check-digit computation may
  be implemented or asserted, consistent with Section 5 and Section 10.
- **Not make a network request** — structural matching only, entirely
  local, consistent with the existing container/AWB/postal detectors and
  `PRODUCT_SPEC.md` NFR1/NFR5.

## 14. Ambiguity handling

- UPS `1Z` and `1R` matches are **high-confidence structural matches**,
  per Section 5's directly verified evidence.
- **Generic numeric values must remain `unknown`** until another reliable
  detector is separately approved — no numeric-only identifier may be
  attributed to any courier absent Level 1 (or, per Section 3, a
  sufficiently non-overlapping Level 2/3) evidence.
- **DSV, DHL, FedEx, and Aramex must not be inserted as possible carriers
  solely based on numeric length.** This directly reflects the
  project-owner-approved direction (Section 6 of the approved direction
  given for this task) and the overlap findings recorded in each
  courier's own research document (Sections 6–8 of this document).
- **Future overlapping courier matches must be preserved and presented
  honestly** — consistent with `TRACKING_ROUTER_DESIGN.md` Section 6 and
  `CLAUDE.md` Section 8's requirement that ambiguous matches be
  represented honestly rather than forcing an unsupported carrier match.

## 15. Router integration implications

The future detector order is documented as:

1. Container
2. AWB
3. Postal
4. Commercial courier

**All detectors must run independently** — consistent with the existing
`router.js` design (already implemented for container/AWB/postal), no
detector may short-circuit or suppress another.

**Clarifications:**

- Courier detection must not suppress another detector.
- No external tracking page should open during detection.
- No live lookup should occur.
- UPS detection will be added only after standalone tests pass, mirroring
  the existing pattern already used for `detect-postal.js` (implemented
  and tested standalone before router integration).

**Project-owner approval (2026-08-04) — routing status:** official-site
routing (an outbound link to UPS's official tracking page), external
navigation, live UPS tracking, UPS API integration, OAuth, and
browser-side API calls are all **excluded from the first UPS detection
implementation**. The first implementation performs **local recognition
only**. Official-site routing remains deferred to a later, separately
authorized stage. This resolves the corresponding open decision
previously recorded in Section 19.

This document does **not** modify `router.js`. It records these
implications for a future, separately authorized implementation stage.

## 16. User-interface implications

The following are **conceptual future Hebrew interface states only** — no
wording is finalized by this document, and `ui-messages.js` is not
modified:

- UPS parcel number recognized (a `1Z` structural match)
- UPS Roadie number recognized (a `1R` short or long structural match)
- Courier-style number not recognized (input resembles a courier
  identifier in general shape, but does not match any approved structure)
- Ambiguous courier match (input structurally matches more than one
  candidate interpretation)

Exact Hebrew wording, and whether these become new keys in
`trackingUiMessages` or reuse an existing pattern, remain open for a
future, separately authorized implementation stage.

## 17. Future evidence plan

The following evidence requirements and acceptable evidence types apply
to each deferred item:

- **DSV:** requires either (a) direct access to the DSV Developer
  Portal's XPress/parcel tracking-number format documentation, or (b)
  multiple additional project-owner-provided structural examples
  corroborating (or refuting) the `DSVPH#########` shape.
- **DHL:** requires direct access to DHL's official developer-portal
  pages or PDF guides (MyDHL API SOAP Developer Guide, DHL eCommerce
  Americas API docs, or the Post & Parcel Germany tracking API docs), or
  a project-owner-provided official document/example.
- **FedEx:** requires direct access to `developer.fedex.com`'s Track API
  documentation or schema, or a project-owner-provided official
  document/example.
- **Aramex:** requires direct access to the official Tracking API manual
  or Shipping Services API manual PDFs, or a project-owner-provided
  official document/example.
- **UPS check-digit validation:** requires either direct access to
  `developer.ups.com` (blocked in this environment) or another
  authoritative UPS source describing a confirmed check-digit algorithm
  for `1Z`/`1R` identifiers.
- **UPS Mail Innovations:** requires a confirmed, distinctive structural
  rule for USPS-style numeric identifiers as used by UPS Mail
  Innovations, distinguishing them from native USPS numbers and from
  other couriers' numeric formats.

**Acceptable evidence types** for closing any of the above gaps:

- Official API specifications (e.g. directly fetched OpenAPI/YAML/WSDL)
- Official developer documentation (directly read, not search-synthesized)
- Official test fixtures (explicitly labeled as such by the carrier)
- Project-owner-provided official documents
- Multiple masked, non-customer structural examples where appropriate
  (as used for DSV in Section 4), sufficient in number and consistency
  to establish a general rule rather than a single data point

## 18. Proposed implementation stages

The following future technical stages are recommended, each with its own
completion criterion. None is carried out by this document.

1. **Define the carrier-registry record format.**
   Completion criterion: a reviewed, documented record shape for
   `carrier-registry.js` exists (per Section 12) without populating any
   entry yet.
2. **Implement UPS structural detection in `detect-courier.js`.**
   Completion criterion: `detect-courier.js` correctly classifies a
   documented set of valid/invalid `1Z`/`1R` structural test cases,
   consistent with Section 13's rules, with no check-digit logic.
3. **Add UPS courier tests.**
   Completion criterion: a standalone `tests/tracking/detect-courier.test.js`
   exists and passes, covering valid/invalid/edge cases for all three
   approved formats.
4. **Integrate courier detection into `router.js`.**
   Completion criterion: `router.js` runs `detectCourier` as the fourth,
   independent detector (Section 15), with router-level tests passing and
   no suppression of the other three detectors.
5. **Add Hebrew UI messages.**
   Completion criterion: `ui-messages.js` and `ui-controller.js` render
   the states described in Section 16, with UI-controller tests passing.
6. **Perform full regression tests.**
   Completion criterion: the complete `tests/tracking/*.test.js` suite
   passes with zero failures, including all pre-existing container/AWB/
   postal tests plus the new courier tests.
7. **Create a separate Pull Request.**
   Completion criterion: a PR is opened for the courier-implementation
   changes only, following this project's established PR process.
8. **Deploy.**
   Completion criterion: the PR is merged (only when explicitly
   instructed) and GitHub Pages deployment is verified, following this
   project's established deployment-verification process.
9. **Perform public manual tests.**
   Completion criterion: the deployed site is manually exercised with
   UPS's own officially-labeled test/sandbox identifiers (e.g.
   `1ZCIETST0111111114`, `1ZCIETST0422222228`, per
   `UPS_COURIER_IDENTIFIER_RESEARCH.md` Section 7) to confirm correct
   structural-match behavior.
10. **Resume evidence gathering for the deferred couriers.**
    Completion criterion: at least one of the Section 17 evidence gaps
    (DSV, DHL, FedEx, Aramex, UPS check digit, UPS Mail Innovations) is
    closed with Level 1 evidence, or a project-owner decision formally
    keeps a given courier deferred indefinitely.

## 19. Open product decisions

**Resolved by project-owner approval (2026-08-04):**

- ~~Whether UPS `1R` Roadie belongs in the first public release~~ —
  **resolved:** both UPS `1R` structures (short and long) are included in
  the first implementation wave, per Section 5 and Section 9.
- ~~Whether `1Z` and `1R` display the same carrier name~~ — **resolved:**
  `1Z` displays as `UPS` (internal ID `ups`); `1R` displays as
  `UPS Roadie` (internal ID `ups-roadie`) — distinguished, not merged.
- ~~Whether Roadie should display as `UPS Roadie` specifically~~ —
  **resolved:** `UPS Roadie` is the approved display name.
- ~~Whether structural validity may use `valid: true`~~ — **resolved:**
  `valid: true` is approved to mean structural validity only, per the
  Section 10 clarification, with no separate `structuralOnly` flag
  introduced.
- ~~How `possibleCarriers` should be represented~~ — **resolved:** a
  frozen array of internal carrier-ID strings (e.g. `["ups"]`,
  `["ups-roadie"]`), per Section 11. No public carrier object or nested
  schema is introduced in this phase.
- ~~Whether official-site routing is included in a later courier
  release, or deferred further~~ — **resolved:** official-site routing is
  deferred; the first implementation performs local recognition only, per
  Section 15.

**Still open and not resolved by this document:**

- Whether the deferred couriers (DSV, DHL, FedEx, Aramex) appear in a
  manual carrier-selection list even while automatic detection remains
  unimplemented for them.
- Whether DSV should be prioritized over DHL/FedEx/Aramex when additional
  evidence becomes available, given it already has at least one
  project-owner-supplied example (Level 3), unlike the others (Level 2
  at best).

This document does not resolve the still-open items above automatically.

## 20. Explicit exclusions and recommended next action

This decision document does **not** authorize:

- Production code
- `carrier-registry.js` population
- `detect-courier.js` implementation
- Router changes
- UI changes
- Tracking URLs
- External navigation
- API integration
- Live tracking
- Freight forwarding
- EMS work
- Package installation

**Recommended next stage:**

Implement standalone UPS 1Z and UPS 1R structural detection in detect-courier.js with automated tests.

## Comparison matrix

| Courier | Evidence level | Distinctive verified prefix | Verified total length | Verified character set | Verified check digit | Local recognition decision | First-wave status | Main blocker |
|---|---|---|---|---|---|---|---|---|
| DSV | Level 3 (project-owner example only) | No (`DSVPH` unconfirmed by any independent source) | No (9-digit suffix is single-example only) | No | No | Deferred | `deferred_pending_evidence` | Single unverified example; no independent corroboration |
| UPS 1Z (`ups`, display "UPS") | Level 1 (directly fetched official spec) | Yes (`1Z`) | Yes (18 characters) | Yes (`[0-9A-Z]`) | No | Structural detection approved — **first-wave approved** | `approved_for_structural_detection` | Check-digit algorithm unconfirmed |
| UPS 1R short (`ups-roadie`, display "UPS Roadie") | Level 1 (directly fetched official spec) | Yes (`1R`) | Yes (16 characters) | Yes (`[0-9A-Z]`) | No | Structural detection approved — **first-wave approved** | `approved_for_structural_detection` | Check-digit algorithm unconfirmed |
| UPS 1R long (`ups-roadie`, display "UPS Roadie") | Level 1 (directly fetched official spec) | Yes (`1R`) | Yes (28 characters) | Yes (`[0-9A-Z]`) | No | Structural detection approved — **first-wave approved** | `approved_for_structural_detection` | Check-digit algorithm unconfirmed; two valid Roadie lengths increase collision space |
| DHL | Level 2/4 (official pages referenced only; aggregator claims inconsistent) | No | No (10/12/20/21-digit claims, unconfirmed and inconsistent) | No | No | Deferred | `deferred_due_to_ambiguity` | No directly verified format; DHL eCommerce domestic may reuse USPS numbers |
| FedEx | Level 2/4 (Ground Economy page-title reference; Express/Ground secondary only) | No (Door Tag `DT` prefix exists but is out of scope for primary tracking numbers) | No (12/15-digit claims, unconfirmed and overlapping) | No | No | Deferred | `deferred_due_to_ambiguity` | No directly verified format for any standard parcel product |
| Aramex | Level 2/4 (official manual titles referenced only; aggregator claims inconsistent) | No | No (10–20-digit claims, unconfirmed and inconsistent) | No | No | Deferred | `deferred_due_to_insufficient_evidence` | No directly verified format; no distinctive prefix found at all |

# EMS Classification Research

## 1. Research purpose

This document verifies the exact UPU S10 service-indicator rules needed to
classify an already structurally valid S10 identifier as EMS (Express
Mail Service). It is research-only. It does not implement, authorize, or
modify `detect-postal.js`, `router.js`, `ui-controller.js`,
`ui-messages.js`, or any other production file. The S10 structure and
check-digit algorithm are already implemented in `detect-postal.js` and
are explicitly **not** re-researched here — this document concerns only
service-*category* classification (EMS vs. non-EMS) of an already
structurally/mathematically valid S10 identifier.

## 2. Research date

2026-08-04

## 3. Existing S10 implementation boundary

`js/tracking/detect-postal.js` (already implemented and unmodified by
this task) performs only structural validation (13-character S10 shape)
and check-digit validation (weighted Modulus 11, per the boundary-case
mapping confirmed in `S10_AUTHORITATIVE_VERIFICATION.md`'s "Manual
boundary-case verification" section). It explicitly does **not** classify
service categories: its own header comment states that "every
structurally and mathematically valid S10 identifier — including one
whose service indicator begins with 'E' — is reported as
`identifierType: "international-postal"`, never as EMS." This boundary
was directly re-confirmed by inspection in this task (see Section 6 of
the preliminary checks): no `EMS`, service-indicator-range, or
category-classification logic exists anywhere in `detect-postal.js`,
`router.js`, `ui-controller.js`, or `ui-messages.js` — only comments
explicitly documenting this exclusion. This document evaluates only what
would be needed to *add* such classification in a future stage; it does
not touch the structural/check-digit implementation itself.

## 4. Authoritative sources attempted

In the priority order specified for this task:

1. Current UPU Technical Standard S10 — attempted via the direct document
   URL `https://www.upu.int/UPU/media/upu/files/postalSolutions/programmesAndServices/standards/S10-12.pdf`.
2. Current UPU Standards Catalogue — attempted via
   `https://www.upu.int/en/Postal-Solutions/Programmes-Services/Standards`.
3. Official EMS Cooperative standards/operational documentation —
   attempted via `https://www.ems.post/` and `https://www.upu.int/UPU/media/upu/TPC_CAA/RFPs/2020/RFP-2022-016-EMS-Annex-2_Statement-of-work.pdf`
   (surfaced by search as an EMS Cooperative-related official document,
   not opened).
4. Official UPU code lists or guidance — attempted via the general
   `upu.int` and `www.upu.int` root domains, since the specific
   sub-pages were unreachable once the root domain itself was confirmed
   blocked.
5. Official EMS-owned tracking or technical documentation — attempted via
   `ems.post` and `www.ems.post`.

Each domain-level attempt was made using two independent methods —
`WebFetch` and direct `curl` through this environment's configured
outbound proxy — to rule out a tool-specific failure rather than a
genuine access restriction. This mirrors the two-method verification
approach already used in `S10_AUTHORITATIVE_VERIFICATION.md`.

## 5. Sources directly accessed

**None.** No official UPU or EMS Cooperative resource was successfully
and directly accessed during this task. This section is intentionally
empty, per the requirement to report this outcome honestly rather than
invent a positive result. No document (PDF, spreadsheet, or HTML page)
was downloaded as a result — there was nothing to inspect, and
consequently no temporary file to delete.

## 6. Sources blocked or incomplete

| Resource | URL | curl (via proxy) | WebFetch |
|---|---|---|---|
| UPU S10 Technical Standard PDF | `https://www.upu.int/UPU/media/upu/files/postalSolutions/programmesAndServices/standards/S10-12.pdf` | `curl: (56) CONNECT tunnel failed, response 403` | HTTP 403 Forbidden |
| UPU Standards landing page | `https://www.upu.int/en/Postal-Solutions/Programmes-Services/Standards` | `curl: (56) CONNECT tunnel failed, response 403` | HTTP 403 Forbidden |
| UPU root domain (`www`) | `https://www.upu.int/` | `curl: (56) CONNECT tunnel failed, response 403` | — |
| UPU root domain (no `www`) | `https://upu.int/` | `curl: (56) CONNECT tunnel failed, response 403` | — |
| EMS Cooperative domain (`www`) | `https://www.ems.post/` | `curl: (56) CONNECT tunnel failed, response 403` | HTTP 403 Forbidden |
| EMS Cooperative domain | `https://ems.post/` | `curl: (56) CONNECT tunnel failed, response 403` | — |

This environment's outbound proxy independently confirmed the cause at
the gateway level: its status endpoint recorded matching
`"kind": "connect_rejected", "detail": "gateway answered 403 to CONNECT
(policy denial or upstream failure)"` entries for `www.upu.int:443`,
`upu.int:443`, `www.ems.post:443`, and `ems.post:443`, timestamped to
this task's verification attempts. This is the same network-policy
restriction already documented in `S10_AUTHORITATIVE_VERIFICATION.md`
Section 5, applied uniformly to the entire `upu.int` and `ems.post`
domain space — not a property of a specific page, and not an
authentication requirement of either site. No 403 response was treated
as a successful source access.

As a fallback, `WebSearch` (search-engine synthesis, not direct page
access) was used to check whether any new, more directly-citable lead had
emerged since `COURIER_EMS_RESEARCH.md` was written. It returned only
secondary/aggregator sources — Wikipedia, Grokipedia, Medium
("postagemaker"), and similar third-party summaries — repeating the same
`EA`–`EZ` / `EX`–`EZ` claims already recorded in `COURIER_EMS_RESEARCH.md`.
Per this task's explicit instruction, these are **not** treated as an
approval basis; they are recorded only as unchanged secondary
corroboration (Section 7–9 below), identical in status to the existing
research.

## 7. Official EMS service-indicator range

**Not verified against an authoritative source in this task.** No
official UPU or EMS Cooperative document was reachable (Section 6). The
claim that the complete EMS service-indicator range is `EA`–`EZ` remains
exactly as it was recorded in `COURIER_EMS_RESEARCH.md` Section 4:
corroborated by convergent secondary sources (and, in this task,
re-confirmed as still the prevailing secondary-source claim via
`WebSearch`), but never confirmed by directly reading a primary UPU or
EMS Cooperative document. **Status: not approved for implementation.**

## 8. EA–EW treatment

**Not verified against an authoritative source in this task.** The claim
that `EA`–`EW` are standard (non-bilateral) EMS indicators is unchanged
from `COURIER_EMS_RESEARCH.md` Section 4 — secondary-sourced only, no
new authoritative confirmation obtained. **Status: not approved for
implementation.**

## 9. EX–EZ bilateral treatment

**Not verified against an authoritative source in this task.** The claim
that `EX`–`EZ` requires a bilateral agreement between specific postal
operators, and should be treated with reduced confidence relative to
`EA`–`EW`, is unchanged from `COURIER_EMS_RESEARCH.md` Section 4 —
secondary-sourced only. Whether `EX`–`EZ` should still be classified as
"EMS" (with reduced confidence) or as a distinct, non-EMS category
despite the bilateral condition is **not resolved** by any source reached
in this task; it remains an open product decision (Section 15), not a
factual question this research could settle. **Status: not approved for
implementation.**

## 10. E-prefix exclusions or exceptions

**No evidence found, in this task or in prior research, of any
E-prefixed two-letter combination excluded from the EMS range or
reserved for another category.** No source — official or secondary —
was reached in this task that lists individual exceptions within
`EA`–`EZ`. This absence of evidence is not treated as proof that no
exceptions exist; it only means none has been found. **Status: unknown,
not approved for implementation.**

## 11. Check-digit requirement for EMS classification

This question does not require new external evidence: it follows
directly from the already-approved S10 check-digit algorithm
(`S10_AUTHORITATIVE_VERIFICATION.md`, "Manual boundary-case verification"
section, "Approved for implementation") and the existing detector-result
contract pattern already used by `detect-container.js`, `detect-awb.js`,
and `detect-postal.js`. Per that established, already-approved pattern —
which this document does not re-derive from any new source, only applies
by analogy — a structural match with an invalid check digit is reported
as `matched: true, valid: false`, never as a confident category match.
Applying that same pattern to EMS classification: **a valid check digit
should be required before any identifier is classified with high
confidence as EMS.** An `E`-prefixed value that is only structurally
S10-shaped but fails the check digit should be reported as an invalid S10
identifier (mirroring the existing "structure valid, check digit
invalid" case), not as an "EMS-style invalid" special case, since
`detect-postal.js` does not and would not perform category classification
before or independently of check-digit validation.

## 12. Country-code and postal-operator limitations

Unchanged from `COURIER_EMS_RESEARCH.md` Section 3 and
`POSTAL_DETECTOR_DESIGN.md` Section 4, and not re-verified against an
authoritative source in this task (no official document was reachable):
the trailing two-letter country code identifies the **issuing postal
administration**, not necessarily the destination, current custodian, or
delivery operator. The service indicator alone does not identify a
specific postal operator either — it identifies a *product/service
category* (e.g. EMS), not an operator. Neither field should be used to
infer a postal operator, a delivery destination, or Israel Post
involvement, consistent with the existing, unmodified exclusions already
documented in `POSTAL_DETECTOR_DESIGN.md` Section 11 and reaffirmed as
out of scope for this EMS phase.

## 13. Proposed EMS classification behavior

Based on the existing detector-result contract pattern (Section 11
above) and the unresolved evidence status (Sections 7–10), the following
conceptual behavior is proposed for a **future** implementation stage —
not implemented here:

| Case | Structural match | Check digit | Proposed classification |
|---|---|---|---|
| `EA`–`EW`, valid check digit | Yes | Valid | Standard EMS — high confidence, contingent on the EMS range itself being approved (Section 7, currently not approved) |
| `EX`–`EZ`, valid check digit | Yes | Valid | Bilateral/exceptional EMS — reduced confidence, contingent on both the range and the `EX`–`EZ` product-design question (Section 9, currently unresolved) being approved |
| `E`-prefixed (any), invalid check digit | Yes | Invalid | Invalid S10 identifier — `matched: true, valid: false`, mirroring the existing pattern; not described as "invalid EMS," since category is not evaluated before check-digit validity |
| Non-`E`-prefixed, valid S10 | Yes | Valid | Non-EMS S10 item — remains `international-postal` (or `postal-unsupported`, per `POSTAL_DETECTOR_DESIGN.md` Section 8, itself unresolved) |

No confidence level, reason key, or field name proposed here is
implemented by this document.

## 14. IdentifierType design options

Three options were compared against the existing shared detector-result
contract (`identifierType`, `matched`, `normalizedIdentifier`,
`possibleCarriers`, `confidence`, `valid`, `ambiguous`, `reason`,
`recommendedAction`), consistent with the same nine-field shape already
used by `detect-container.js`, `detect-awb.js`, `detect-postal.js`, and
`detect-courier.js`.

**Option A — public `identifierType: "ems"`.** Would introduce a new
public value distinct from `"international-postal"` for the same
underlying S10 structure. This is a small, additive contract change (one
new enum value on an existing field), consistent with how
`"commercial-courier"` was already added as a new `identifierType` value
in the courier phase. It gives the router and UI a direct signal without
inspecting `reason`.

**Option B — keep `identifierType: "international-postal"`, express EMS
only via `reason`/`recommendedAction`.** This is the option already
recommended (as "Option B") in `POSTAL_DETECTOR_DESIGN.md` Section 10,
prior to this task. It makes no change to the public field surface at
all — the category distinction lives entirely in the existing `reason`
key (e.g. `s10_ems_valid` vs. `s10_postal_valid`), which downstream
consumers (like `ui-controller.js`'s `resolveMessageKey`) already branch
on for other detectors' finer-grained states.

**Option C — keep `identifierType: "international-postal"`, add a new
service-category field in a future contract revision.** This would
introduce a tenth field (e.g. `serviceCategory`) shared across all
detectors, since the contract is uniform across `detect-*.js` modules.
Unlike Option A, this changes the *shape* of the shared contract itself,
not just the range of an existing field's values — every existing
detector's `buildResult`/`buildUnknownResult` helper would need to grow a
new field (or explicitly omit it), which is a materially larger,
cross-cutting change than adding one enum value.

**Comparison against the existing contract:** Option B requires zero
contract changes. Option A requires one new enum value on an existing
field (a precedent already set by the courier phase's
`"commercial-courier"` addition). Option C requires a new field across
every detector, the largest change of the three.

**Recommendation (research recommendation only, requiring project-owner
approval):** **Option B**, for the same reasons already given in
`POSTAL_DETECTOR_DESIGN.md` Section 10 — it preserves the existing
contract shape exactly, and the EMS-range evidence itself is not yet
strong enough (Sections 7–10) to justify introducing a new public
`identifierType` value whose exact boundary is still unresolved. If the
EMS range is later authoritatively confirmed, Option A remains a
reasonable alternative to revisit, given the precedent of adding
`"commercial-courier"` as a new value. **This recommendation requires
project-owner approval before any implementation** and is not carried out
by this document.

## 15. Remaining blockers and open decisions

Carried forward, unresolved, from `POSTAL_DETECTOR_DESIGN.md` Section 18
and `S10_AUTHORITATIVE_VERIFICATION.md` Section 15/"Blockers that remain
unresolved," and re-confirmed as still blocked by this task's
verification attempt:

- **Complete EMS service-indicator range (`EA`–`EZ`)** — corroborated by
  secondary sources only; no authoritative confirmation obtained.
- **`EX`–`EZ` bilateral treatment and its classification consequence** —
  corroborated by secondary sources only; whether `EX`–`EZ` should even
  be labeled "EMS" to the user (with a caveat) or as something else is an
  unresolved product decision, not only a factual question.
- **E-prefix exclusions or exceptions** — no evidence found either way.
- **Whether `identifierType: "ems"` (Option A) or `reason`-only (Option
  B) is the approved design** — Option B recommended here, pending
  project-owner approval (Section 14).
- **Whether `EX`–`EZ` should be described to the user without mentioning
  the bilateral condition** — not recommended by this research (see
  Section 16's product-design note below), but this remains a product
  decision, not resolved by this document.
- **Non-EMS S10 category ranges** (`RR`, `LX`, `CP`, insured mail,
  e-commerce parcels) — unchanged, still only single-prefix or no
  evidence at all, per `COURIER_EMS_RESEARCH.md` and
  `S10_AUTHORITATIVE_VERIFICATION.md`; out of scope for this EMS-focused
  document but noted as still blocked.

## 16. Recommended next technical stage and explicit exclusions

**Recommended next stage:** Obtain authoritative confirmation of the
complete EMS service-indicator range and the `EX`–`EZ` bilateral
treatment before implementing any EMS classification logic. The specific
sources most likely to resolve this, in priority order, remain: (1) the
official UPU Technical Standard S10 document itself, (2) official EMS
Cooperative documentation at `ems.post`, (3) a project-owner-supplied
copy of either document, mirroring how the check-digit boundary-mapping
blocker was resolved in `S10_AUTHORITATIVE_VERIFICATION.md` via a
manually supplied spreadsheet and screenshots. None of these could be
reached from this sandboxed environment in this task, for the same
network-policy reason documented in Section 6. This recommendation is not
carried out by this document.

Regarding question 11 in this task's brief (whether FreighTime should
describe `EX`–`EZ` as EMS without mentioning the bilateral condition):
based on the evidence available, this research does **not** support
omitting the bilateral caveat — `POSTAL_DETECTOR_DESIGN.md` Section 7
already treats `EX`–`EZ` as warranting "reduced confidence, not asserted
as standard EMS," and nothing found in this task's verification attempt
changes that. This is recorded as a research observation, not a resolved
product decision.

This task does **not** authorize:

- Modification of `detect-postal.js`
- EMS implementation of any kind
- Router changes
- UI changes
- Hebrew EMS messages
- Postal-operator identification
- Israel Post routing
- Tracking URLs
- Live tracking
- API integration
- Courier changes (DSV, DHL, FedEx, Aramex, or further UPS work)
- Freight forwarding
- Package installation

## Evidence matrix

| Claim | Source authority | Document title | Public URL | Version/date | Section/page | Directly inspected | Evidence strength | Approved for implementation | Remaining uncertainty |
|---|---|---|---|---|---|---|---|---|---|
| EMS service-indicator range is `EA`–`EZ` | UPU/EMS Cooperative (attempted, not reached) | UPU Technical Standard S10 (referenced only) | https://www.upu.int/UPU/media/upu/files/postalSolutions/programmesAndServices/standards/S10-12.pdf | Unknown (not opened) | Unknown (not opened) | No | Low (secondary aggregator convergence only) | No | Full authoritative range not confirmed |
| `EA`–`EW` is standard EMS; `EX`–`EZ` requires bilateral agreement | UPU/EMS Cooperative (attempted, not reached) | UPU Technical Standard S10 (referenced only) | https://www.upu.int/UPU/media/upu/files/postalSolutions/programmesAndServices/standards/S10-12.pdf | Unknown (not opened) | Unknown (not opened) | No | Low (secondary aggregator convergence only) | No | Practical classification consequence of the bilateral condition unresolved |
| S10 13-character structure (service indicator, serial, check digit, country code) | UPU (directly inspected in a prior task) | "S10 Check digit validation tool" (official spreadsheet) | Not a public URL — project-owner-supplied file, referenced in `S10_AUTHORITATIVE_VERIFICATION.md` | Not stated in the file | N/A (extracted via `strings`) | Yes (prior task, not repeated here) | High — approved for implementation | Yes (already implemented in `detect-postal.js`) | None (out of scope for this document) |
| S10 check-digit algorithm and boundary-case mapping (10→0, 11→5) | UPU (directly observed in a prior task via project-owner screenshots of the official tool) | "S10 Check digit validation tool" (official spreadsheet) | Not a public URL | Not stated | N/A | Yes (prior task, not repeated here) | High — approved for implementation | Yes (already implemented in `detect-postal.js`) | None (out of scope for this document) |
| No E-prefix exclusions or exceptions found | N/A (absence of evidence) | N/A | N/A | N/A | N/A | No | N/A | No | Cannot rule out an undiscovered exception |
| Country code identifies issuing postal administration, not destination/operator | UPU (attempted, not reached in this task; unchanged from prior secondary-sourced research) | UPU Technical Standard S10 (referenced only) | https://www.upu.int/UPU/media/upu/files/postalSolutions/programmesAndServices/standards/S10-12.pdf | Unknown (not opened) | Unknown (not opened) | No | Low-medium (secondary aggregator convergence only) | No | Not re-confirmed against a primary source in this task |

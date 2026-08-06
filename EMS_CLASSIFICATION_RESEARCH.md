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

## Offline verification from the uploaded official UPU S10 standard (2026-08-04)

This section documents a follow-up offline verification attempt after a
PDF, described as an official UPU Technical Standard S10 document, was
manually uploaded to this environment, since direct network access to
`upu.int` and `ems.post` remains blocked (Sections 4–6 above).

### 1. Uploaded source identity and checksum

- **Uploaded file path:** `/root/.claude/uploads/e5edf2a9-84c2-5d60-ae35-fe891cddf77e/c1c0e200-123.pdf`
- **File size:** 5,051,691 bytes (non-empty)
- **SHA-256 checksum:** `f75c32347885c5eaaccc214488c33ef24a7232ed006a515f42b918b121ed62da`
- **File type** (via `file` command): `PDF document, version 1.7, 20 page(s)` — a genuine PDF, not a placeholder, empty file, or non-PDF format. Page count was independently cross-checked by counting `/Type /Page` objects directly in the PDF's object structure, which also returned `20`, matching a `/Count 20` field found in the document's page-tree node.
- **PDF metadata:** `/Producer (Microsoft: Print To PDF)`; `/Title` is present but **empty** (no title string set); no `/Author` value set; `/CreationDate` and `/ModDate` both `D:20260804185910+03'00'` (i.e. the PDF was generated at upload time via a print-to-PDF operation, not carrying an original UPU-issued creation timestamp). **This metadata alone does not establish UPU authorship or origin** — it only shows the PDF container itself was produced by a generic "print to PDF" pipeline, which is consistent with someone printing an official web page or document to PDF, but is not, by itself, proof of UPU source identity. No UPU-specific metadata field (e.g. a UPU document-control ID, organization name, or classification marking) was found in the PDF's metadata dictionary.
- The uploaded file was **not** moved, copied into the repository, staged, committed, renamed, deleted, or modified at any point. Its checksum was verified identical before and after this task's inspection attempts.

### 2. Standard version and date

**Could not be determined.** As detailed in Section 3 below, no page content — including any title page, version marking, or approval-date text — could be extracted or read by any tool available in this environment. The PDF's own container metadata (Section 1) provides no standard version or approval date either. This item is **unresolved**, not merely "not yet checked."

### 3. Relevant pages and sections

**None could be inspected.** This is the central finding of this verification attempt, reported in full below.

**Inspection tools attempted, in order:**

1. **`Read` tool (page-range PDF rendering):** failed immediately — `pdftoppm is not installed. Install poppler-utils ... to enable PDF page rendering.` No page could be rendered or read through this path.
2. **`strings` (already-installed, read-only Unix utility):** applied directly to the raw PDF file. This recovered only the PDF's internal metadata dictionary (Section 1) and isolated, non-contiguous character fragments (e.g. `"EMs"`) with no surrounding readable context — consistent with the file's text content being stored in compressed binary streams, not as plain text.
3. **Manual stream decompression (Python 3 standard library only — `zlib`, no package installed):** every `stream ... endstream` block in the raw PDF was located and decompressed with `zlib.decompress`. This succeeded for 183 streams, yielding approximately 34.6 MB of decompressed PDF content-stream data — confirming the streams themselves are intact, valid, standard Flate-compressed PDF content (not corrupted or encrypted).
4. **Text-operator extraction from the decompressed content:** the decompressed content was searched for PDF text-showing operators (`Tj`, `TJ`) and text-block markers (`BT`/`ET`), which is how a PDF normally encodes visible words. **Zero occurrences of `Tj`, `TJ`, or `BT` were found anywhere in the ~34.6 MB of decompressed content.** Direct inspection of the decompressed stream content instead showed only vector path-drawing operators — sequences of `m` (moveto), `l` (lineto), `c` (curveto), `h` (closepath), and `f` (fill), e.g. a representative excerpt: `"...l\n3.520000 -6.410000 l\n1.120000 0.000000 l\n0.000000 0.000000 l\nh\nf\nQ\n..."`. This is the signature of a PDF where every character glyph was converted into filled vector outline shapes at export time (a common outcome of certain "print to PDF" / "flatten to outlines" pipelines), rather than being encoded as selectable, extractable text. **A PDF built this way has no text layer at all — this is a property of the file itself, not a limitation of any single tool.**
5. **LibreOffice (`soffice`), headless mode:** attempted as a fallback (same tool already used, and already found broadly non-functional for headless conversion in this sandbox, in the prior `S10_AUTHORITATIVE_VERIFICATION.md` task). `soffice --headless --convert-to txt` against this PDF failed with the same error already documented for that unrelated `.xls` file: `Error: source file could not be loaded`. This reconfirms the same environment-wide headless-conversion defect, independent of file type.
6. **OCR:** no OCR tool (e.g. `tesseract`) is installed in this environment, and no PDF-to-image rasterization tool (`pdftoppm`, `pdftocairo`, Ghostscript `gs`, ImageMagick `convert`/`magick`, `mutool`) is installed either — so even if OCR software were present, there was no available way to rasterize the vector-outline pages into images for it to read. Per this task's explicit restriction, no package was installed to compensate.
7. **Python PDF libraries:** `PyPDF2`, `pypdf`, `fitz` (PyMuPDF), and `pdfminer` were all checked and confirmed **not installed**. None was installed, per this task's explicit restriction.

**Conclusion of this section:** with every read-only tool available in this environment exhausted, **no page, section, table, or line of readable text could be extracted from this PDF.** This is not a partial result — literally zero words were recovered from the document body (only the empty container-level metadata in Section 1). Consequently, none of the "relevant pages and sections" requested by this task's structure could be identified or cited.

### 4. Exact EMS range result

**Not confirmed. Not approved for implementation.** No content from the uploaded PDF could be read (Section 3). Per this task's explicit approval rule, this fact cannot be marked approved without direct, in-document support, and no secondary source may be used to fill the gap. Status is unchanged from the rest of this document: `EA`–`EZ` remains a secondary-sourced-only claim.

### 5. EA–EW treatment

**Not confirmed. Not approved for implementation.** Same reason as Section 4 above — no document content was readable.

### 6. EX–EZ treatment

**Not confirmed. Not approved for implementation.** Same reason as Section 4 above.

### 7. E-prefix exceptions

**Not confirmed.** No content was readable, so neither the presence nor the absence of any E-prefix exception, reservation, or conditional assignment could be checked against this document.

### 8. Check-digit requirement

**Not addressed by this document's readable content, because none was readable.** This question's answer is unchanged from `EMS_CLASSIFICATION_RESEARCH.md` Section 11 above, which derives it by analogy to the already-approved, already-implemented S10 check-digit contract pattern (`detect-postal.js`) rather than from any new external source — that reasoning is independent of this PDF and is not affected by this document being unreadable.

### 9. Country-code limitation

**Not confirmed.** No content was readable, so the country-code semantics (issuing administration vs. destination vs. custodian vs. delivery operator) could not be checked against this specific document. Status remains unchanged and secondary-sourced only, per Section 12 above.

### 10. Postal-operator limitation

**Not confirmed**, for the same reason. Unchanged from Section 12 above.

### 11. Facts approved for implementation

**None.** No fact from this uploaded PDF meets the approval standard for this task, because no fact could be directly read from it at all. This is distinct from — and stricter than — the outcome of the prior `.xls` spreadsheet verification recorded elsewhere in this project's documents, where at least the file's own embedded text strings (extracted via `strings`, since that file used uncompressed or partially-plain-text-encoded cells) yielded a worked example and structural field labels. This PDF's content is entirely vector-outlined, so even that partial `strings`-based path was unavailable here.

### 12. Blockers still unresolved

All blockers listed in this document's Sections 7–10 and 15 remain exactly as they were before this task, with one addition:

- **New blocker: this specific uploaded PDF has no extractable text layer** and cannot be read by any read-only tool available in this environment (`strings`, manual `zlib` stream decompression plus text-operator search, `soffice` headless conversion). Resolving this would require either (a) a PDF-rendering/rasterization tool (e.g. `poppler-utils`' `pdftoppm`) combined with an OCR tool (e.g. `tesseract`) — neither installed, and this task does not authorize installing packages — or (b) a different copy of the same standard that was exported with a genuine text layer rather than as vector-outlined pages, or (c) the project owner directly reading and transcribing the relevant EMS-range table/section from the document.
- Complete EMS service-indicator range — still not approved.
- `EX`–`EZ` bilateral treatment and its classification consequence — still not approved.
- E-prefix exceptions — still unknown.
- Non-EMS S10 category ranges — still not approved (out of scope for this document, unchanged from Section 15).

### 13. Recommended identifierType design

Unchanged from Section 14 above: **Option B** (keep `identifierType:
"international-postal"`, express EMS distinction only through `reason`/
`recommendedAction`) remains the research recommendation, since it
requires no contract change and the EMS-range evidence needed to justify
introducing a new `identifierType: "ems"` value (Option A) is still not
authoritatively confirmed — if anything, this task's outcome (the
uploaded PDF being unreadable) leaves the evidence gap exactly as wide as
before. This recommendation still requires project-owner approval and is
not implemented by this document.

### 14. Recommended next technical stage

**Do not implement EMS classification.** The evidentiary gap identified
in `EMS_CLASSIFICATION_RESEARCH.md` Sections 7–10 remains fully open.
This task's specific recommendation, given the new PDF-readability
blocker documented above:

`Obtain a text-readable (non-vector-flattened) copy of the official UPU Technical Standard S10 document, or have the project owner directly transcribe the EMS service-indicator range table/section, since no tool available in this environment can extract text from the currently uploaded PDF.`

Failing that, the same fallback paths already recorded in this document's
Section 16 remain valid: official EMS Cooperative documentation at
`ems.post` (still blocked by network policy), or explicit project-owner
confirmation of the range through another authoritative channel. This
recommendation is not carried out by this document.

## Authoritative verification from the original UPU S10 standard (2026-08-04)

This section documents a successful offline authoritative review of a
second uploaded PDF, confirmed to be text-searchable (unlike the earlier
vector-flattened `c1c0e200-123.pdf`). Using only already-installed,
read-only tools (Python 3 standard library `zlib` for stream
decompression, plus regex-based extraction of PDF text-showing operators
and embedded ToUnicode CMaps — no package installed), the document's own
body text was directly read and is cited below by page and section.

### 1. Uploaded PDF path, size, and checksum

- **Path:** `/root/.claude/uploads/e5edf2a9-84c2-5d60-ae35-fe891cddf77e/6a199910-UPU_S10_Original.pdf`
- **Size:** 1,176,959 bytes
- **SHA-256:** `cf44eaca624f7135b9217b1da629482e1d18c7ff93e7d7d217baf8e539679c6b`
- The file was not moved, copied into the repository, staged, committed,
  modified, or deleted at any point. Its checksum was verified identical
  before and after this review.

### 2. Document title and version

Directly extracted from the document's own front matter: **"Data
definition and encoding standards — S10 — Identification of postal items
– 13-character identifier."** A recurring page-footer marker throughout
the document reads **"– 12 – 2018 –"**, consistent with this being
Version 12 of the standard, published/current as of 2018 — matching the
`S10-12.pdf` filename pattern already referenced (but never reached) in
this project's earlier research.

### 3. Approval/publication date

Directly extracted from the document's status page: **"UPU status: ...
Date of adoption at this status: 10 May 2011 ... Date of approval of this
version: 17 October 2017."**

### 4. Pages and sections inspected

Page numbers were determined by directly reading the document's own
repeating footer markers (e.g. "4 © UPU All rights reserved", "6 © UPU
All rights reserved"), which appear between each page's content in the
extracted stream and were used to bound page ranges.

- **Page 3 — Section 5.1/5.2 ("Overall structure" / "Service
  indicator"):** read directly.
- **Page 4 — Section 5.5 ("Country code"):** read directly.
- **Page 5 — Section 5.6 ("Assigned service indicators by product
  type"), including the table row for the EMS product type:** read
  directly.
- **Page 9 — Section 10 ("Domestic, bilateral, or multilateral use of
  S10 identifiers") and its footnote 10:** read directly.

### 5. EMS range conclusion

**Approved for implementation, with a documented extraction caveat.**
Table 5.6 ("Assigned service indicators by product type"), page 5,
contains a row for the product type **"EMS"** whose "Allowable service
indicator values" cell reads, as directly extracted: *"EMS; [t]he use of
EX[–]EZ require[s] bilateral agreement"*, followed by the table's own
worked example *"EE123456785KR (EMS item identifier issued by Korea
(Rep))."* Separately, footnote 10 on page 9 (Section 10) explicitly names
*"service indicators EA[–]EZ"* together as a recognized set of universal-
use service indicators, in the context of a hypothetical bilateral
agreement scenario. Combined with Section 5.2's rule (page 3) that "the
first character indicates the type of postal product or service and the
second character is assigned by the origin operator from a range of
allowed values," these two independently-located, directly-read passages
of the same primary document converge on the same conclusion already
carried from secondary sources: **the EMS product type is assigned the
service-indicator range `EA`–`EZ`.**

**Extraction caveat, reported for full transparency:** the em/en-dash
character between "EA" and "EZ" in the table cell, and a small number of
individual leading characters elsewhere in this extraction (e.g. "t" in
"[t]he use of," "s" in "[S]ervice indicator[s]"), were not recovered by
the available extraction tooling due to incomplete ToUnicode CMap
coverage for certain embedded font subsets (documented in the earlier
attachment-check task). No dropped character changes the substantive
meaning of any passage cited above — each reconstructs unambiguously to
the same reading with or without the missing character — but this is
disclosed so the "approved" status here is understood to rest on
internally consistent primary-source text assembled from two passages,
not one single perfectly clean sentence.

### 6. EA–EW conclusion

**Approved for implementation, by direct inference from the same Table
5.6 row.** The table's EMS row states only that *"the use of EX–EZ
requires bilateral agreement"* — it does not state any equivalent
restriction for the rest of the `EA`–`EZ` range. Since `EX`–`EZ` is
explicitly carved out as the sub-range requiring bilateral agreement, the
remaining sub-range `EA`–`EW` is, by direct textual contrast within the
same sentence, the standard (non-bilateral) portion of the EMS
assignment. The document does not use the literal string "EA–EW"
anywhere found in this review; this conclusion is a direct reading of the
table's own EX–EZ carve-out, not an external assumption.

### 7. EX–EZ bilateral conclusion

**Approved for implementation — directly and unambiguously confirmed.**
Table 5.6, page 5, EMS row: *"the use of EX–EZ requires bilateral
agreement."* This is the single cleanest, most directly-readable passage
recovered in this review — the core clause ("requires bilateral
agreement") was extracted with no missing or ambiguous characters.
`EX`–`EZ` remains part of the EMS product-type row in the table (it is
not listed as a separate, excluded, or reassigned product type) — the
bilateral condition is a qualifier on EMS's own assigned range, not a
statement that `EX`–`EZ` belongs to a different category.

### 8. E-prefix limitations

**No exception, exclusion, reservation, or conditional assignment was
found for any individual two-letter combination within `EA`–`EZ`**, in
any of the pages/sections read in this review. Table 5.6 (page 5) lists
several other product types with their own single-letter-first-character
ranges or specific codes (e.g. letter-post/parcel-post rows using `L`,
`M`, `Q`, `R`, `V`, `C`, `H` first characters) — none of these overlaps
with or carves an exception out of the `E`-prefixed EMS range in the
portion read. This is not proof that no such exception exists elsewhere
in the 20-page document (only pages 3, 4, 5, and 9 were read); it reports
only what was and was not found in the sections actually inspected.

### 9. Check-digit requirement for classification

Not a new external-evidence question — unchanged from
`EMS_CLASSIFICATION_RESEARCH.md` Section 11: a valid S10 check digit
should be required before any confident EMS classification, by analogy
to the existing, already-approved, already-implemented check-digit
contract pattern in `detect-postal.js`. This review's page-5/page-9
findings only concern the service-indicator range itself, not check-digit
mechanics (which were separately, authoritatively confirmed in a prior
task via the official UPU check-digit tool, per
`S10_AUTHORITATIVE_VERIFICATION.md`).

### 10. Country-code limitation

**Approved for implementation — directly and unambiguously confirmed.**
Section 5.5 ("Country code"), page 4: *"This shall be the two-character
ISO 3166-1 code of [the] UPU member country under whose authority the S10
identifier was issued."* This directly confirms the country code
identifies the **issuing** postal administration's country — the
document does not state that it identifies the destination, the current
custodian, or the final delivery operator. This matches, and now directly
confirms with a primary-source citation, the finding already carried
(previously secondary-sourced only) in `COURIER_EMS_RESEARCH.md` and
`POSTAL_DETECTOR_DESIGN.md`.

### 11. Postal-operator limitation

**Approved for implementation — directly confirmed.** Section 5.2
("Service indicator"), page 3: *"the first character indicates the type
of postal product or service and the second character is assigned by the
origin operator from a range of allowed values."* This confirms the
service indicator's first character identifies a **product/service
category** (e.g. EMS), not a specific postal operator by itself — while
its second character is merely *assigned by* an origin operator from an
allowed range, it does not itself name or identify that operator to a
reader of the identifier. Neither the service indicator nor the country
code, individually or together, identifies a specific delivery operator
or current custodian, consistent with the existing exclusions already in
place in `detect-postal.js` and `POSTAL_DETECTOR_DESIGN.md` Section 11.

### 12. Facts approved for implementation

Based on this review of the original, official UPU Technical Standard S10
document (Version 12, approved 17 October 2017):

- The EMS service-indicator range is `EA`–`EZ` (Section 5, item 5 above)
  — **Approved for implementation.**
- `EA`–`EW` is the standard (non-bilateral) portion of the EMS range
  (Section 6 above) — **Approved for implementation.**
- `EX`–`EZ` requires bilateral agreement and remains part of the EMS
  product-type row (Section 7 above) — **Approved for implementation.**
- The country code identifies the issuing postal administration only
  (Section 10 above) — **Approved for implementation.**
- The service indicator's first character identifies a product/service
  category, not a specific postal operator (Section 11 above) —
  **Approved for implementation.**

### 13. Remaining blockers, if any

- **No E-prefix exception was found**, but only 4 of the document's 20
  pages were read in this review (Section 8 above) — this remains an
  open item, not a confirmed "no exceptions exist" fact.
- **Non-EMS service-indicator ranges** (`RR`, `LX`, `CP`, insured mail,
  e-commerce parcels, etc.) were partially visible in the same Table 5.6
  excerpt read in this review (e.g. `LZ`, `MZ`, `QM`, `RZ`, `VZ`, `CZ`/
  `CV`/`CP`, `HX`/`HY`/`HZ` appear as specific codes or sub-ranges for
  other product types) but were not the focus of this review and are
  **not** approved by this document — a dedicated future review of the
  same table would be needed before any non-EMS category could be
  approved for implementation.
- **The `identifierType` design decision** (Option A vs. Option B)
  remains a product decision requiring project-owner approval, not a
  factual verification question (Section 14 below).
- **Whether `postal-unsupported` should return `matched: true`** and
  other open product decisions listed in `POSTAL_DETECTOR_DESIGN.md`
  Section 18 remain unresolved, unaffected by this review.

### 14. Recommended identifierType design

**Recommendation: Option B.** Keep the public `identifierType` as
`"international-postal"` for all valid S10 identifiers, including EMS,
and represent the EMS distinction using dedicated existing-contract keys
(`reason`, `recommendedAction`) rather than introducing a new public
`identifierType: "ems"` value.

**Rationale**, evaluated against the criteria specified for this task:

- **Existing shared detector-result contract:** Option B requires zero
  changes to the nine-field contract already shared by
  `detect-container.js`, `detect-awb.js`, `detect-postal.js`, and
  `detect-courier.js`. Option A would add a new enum value to
  `identifierType` — a smaller change than Option C's new field, but
  still a public contract change Option B avoids entirely.
- **Backward compatibility:** any existing consumer of `detectPostal`'s
  results (currently only `router.js` and, transitively,
  `ui-controller.js`) that branches on `identifierType ===
  "international-postal"` would continue to match EMS results unchanged
  under Option B; Option A would silently stop matching EMS results
  under that same check unless every consumer were updated in lockstep.
- **Router behavior:** the router's existing ambiguity/selection logic
  (`TRACKING_ROUTER_DESIGN.md` Section 6, `router.js`'s current
  implementation) already treats `identifierType` as the router-level
  category signal; Option B keeps EMS within the same
  `"international-postal"` bucket the router already knows how to route,
  avoiding any new router-level branch. Option A would require the
  router (and its tests) to learn a new `identifierType` value.
- **UI clarity:** Option B does not prevent clear EMS messaging — the
  existing `ui-controller.js` `resolveMessageKey` pattern already
  branches on `reason` for finer-grained states within a single
  `identifierType` (e.g. container/AWB/postal valid vs. invalid), so an
  EMS-specific Hebrew message can be resolved from a `reason` value like
  `s10_ems_valid` without any new public field.
- **Future postal-category support:** Option B scales naturally to
  additional verified non-EMS categories (e.g. a future confirmed `RR`/
  `LX`/`CP` category) by adding further `reason` values under the same
  `"international-postal"` umbrella, without repeatedly growing the
  `identifierType` enum for every newly-verified postal product.

This recommendation requires **project-owner approval** before any
implementation and is **not implemented** by this document.

### 15. Recommended next technical stage

**Do not implement EMS classification yet**, even though the EMS range
itself is now approved for implementation (Section 12 above), because:

1. The `identifierType` design decision (Section 14) still requires
   explicit project-owner approval.
2. `POSTAL_DETECTOR_DESIGN.md` Section 18's other open product decisions
   (e.g. whether `postal-unsupported` should return `matched: true`) are
   unaffected by this review and remain open.
3. Per this task's own implementation-approval criteria, a high-confidence
   future EMS classification must require valid S10 structure, a valid
   S10 check digit, **and** a service indicator within the now-approved
   `EA`–`EZ` range — all three preconditions should be explicitly
   designed together before any code is written, which this
   documentation-only task does not do.

**Recommended next stage:** obtain project-owner approval of the Option B
`identifierType` design (Section 14) and the remaining open decisions in
`POSTAL_DETECTOR_DESIGN.md` Section 18, then proceed to a dedicated
technical-design update (not this document) that specifies the exact
`reason`/`recommendedAction` key names and detector-result behavior for
EMS classification, before any `detect-postal.js` implementation work
begins. This recommendation is not carried out by this document.

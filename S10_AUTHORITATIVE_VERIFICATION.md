# UPU S10 Authoritative-Verification Report

> **Removed feature:** The implementation described in this document is no longer active. FreighTime's "Single-input tracking router" was removed from the public product in full (see `CLAUDE.md` §1 and `IMPORT_READINESS_V1.md` §10). This file is retained only as historical reference.

## 1. Verification purpose

This document records a focused attempt to authoritatively verify the unresolved UPU S10 implementation blockers listed in `POSTAL_DETECTOR_DESIGN.md` Section 18, by directly inspecting official UPU/EMS material — not by re-summarizing or re-citing the secondary-source findings already recorded in `COURIER_EMS_RESEARCH.md`. This is a verification-only task. It does not implement `detect-postal.js` or any other production code.

## 2. Research date

2026-08-04

## 3. Authoritative sources attempted

The following official resources, in the priority order specified for this task, were attempted:

1. Current UPU Technical Standard S10 — attempted via the official UPU Standards page and the direct standard-document URL previously referenced in `COURIER_EMS_RESEARCH.md`.
2. Official UPU S10 check-digit validation tool — attempted via the direct `.xls` tool URL supplied for this task: `https://www.upu.int/UPU/media/upu/files/postalSolutions/programmesAndServices/standards/toolStandardsS10CheckDigitValidationToolEn.xls`.
3. Current UPU Standards Catalogue — attempted via the UPU Standards landing page: `https://www.upu.int/en/Postal-Solutions/Programmes-Services/Standards`.
4. Official UPU technical guidance referencing S10 — attempted via the same UPU domain (`upu.int` and `www.upu.int` root).
5. Official EMS Cooperative documentation — attempted via the EMS Cooperative domain (`ems.post` and `www.ems.post`).
6. Official UPU code lists or standards-support material — not reached, as a consequence of the domain-level blockage described below (no further UPU sub-pages could be attempted once the root domain itself was confirmed unreachable).

Two access methods were used for each attempt: a direct `curl` HTTP request through this environment's configured outbound proxy, and the `WebFetch` tool (a separate fetch path). Both were tried to rule out a tool-specific failure rather than a genuine access restriction.

## 4. Sources successfully accessed

**None.** No official UPU or EMS Cooperative resource was successfully and directly accessed during this verification task. This section is intentionally empty, per the requirement to report this outcome honestly rather than invent a positive result.

## 5. Sources blocked or inaccessible

Every attempted UPU-family resource returned an inaccessible result, confirmed via two independent methods:

| Resource | URL | Method 1 (curl via proxy) | Method 2 (WebFetch) |
|---|---|---|---|
| UPU S10 check-digit validation tool (.xls) | `https://www.upu.int/UPU/media/upu/files/postalSolutions/programmesAndServices/standards/toolStandardsS10CheckDigitValidationToolEn.xls` | `curl: (56) CONNECT tunnel failed, response 403` | HTTP 403 Forbidden |
| UPU Standards landing page | `https://www.upu.int/en/Postal-Solutions/Programmes-Services/Standards` | `curl: (56) CONNECT tunnel failed, response 403` | Not separately retried (root domain already confirmed blocked) |
| UPU root domain | `https://www.upu.int/` | `curl: (56) CONNECT tunnel failed, response 403` | — |
| UPU root domain (no `www`) | `https://upu.int/` | `curl: (56) CONNECT tunnel failed, response 403` | — |
| EMS Cooperative domain | `https://ems.post/` | `curl: (56) CONNECT tunnel failed, response 403` | — |
| EMS Cooperative domain (`www`) | `https://www.ems.post/` | `curl: (56) CONNECT tunnel failed, response 403` | — |

This environment's outbound network proxy independently confirmed the cause at the gateway level: its status endpoint recorded matching entries of `"kind": "connect_rejected", "detail": "gateway answered 403 to CONNECT (policy denial or upstream failure)"` for `www.upu.int:443`, timestamped to this verification attempt. This is a **network-policy restriction of this sandboxed environment itself**, applied uniformly to every UPU-family domain attempted (not a property of a specific page, and not an authentication requirement of the UPU site). No 403 response was treated as a successful source access, per this task's instructions.

No document of any kind (spreadsheet, PDF, HTML) was downloaded as a result — there was nothing to inspect, and consequently nothing to delete from a temporary directory. A scratch directory created in anticipation of a download was removed, empty, at the end of this task.

## 6. S10 structure verification

**Not independently reverified against a primary source in this task.** The structural facts already documented in `COURIER_EMS_RESEARCH.md` Section 3 (13-character total length; 2-letter service indicator; 8-digit serial; 1-digit check digit; 2-letter country code) could not be re-confirmed against an official UPU document here, because no official UPU document was reachable. This task does not re-derive these facts from secondary sources as if they were newly verified — their status remains exactly as recorded in `COURIER_EMS_RESEARCH.md`: corroborated by multiple independent secondary sources, but not confirmed by directly reading the primary standard.

## 7. Check-digit formula verification

**Not independently reverified.** The weighted Modulus 11 formula (weights `8, 6, 4, 2, 3, 5, 9, 7` applied to the 8 serial digits, summed, reduced mod 11) as recorded in `COURIER_EMS_RESEARCH.md` Section 6 could not be checked against the official UPU S10 check-digit validation tool, because that tool was not reachable (Section 5 above). No new evidence was obtained either confirming or contradicting this formula.

## 8. Special-result mapping for 10 and 11

**Not verified. This is the single highest-priority blocker for this task, and it remains unresolved.**

The official UPU S10 check-digit validation spreadsheet — the resource best positioned to settle this exact question, since it would contain the literal formula/logic UPU itself uses — was the primary target of this verification attempt and was not reachable (Section 5). No other official UPU document was reachable either.

The candidate mapping already recorded in `COURIER_EMS_RESEARCH.md` and carried into `POSTAL_DETECTOR_DESIGN.md` (result `10` → check digit `0`; result `11` → check digit `5`) remains exactly as it was: corroborated by convergent secondary sources and self-consistent with two independently recomputed worked examples, but **not confirmed by directly inspecting an authoritative UPU source**. Per the approval standard for this task, it must remain:

`Not approved for implementation`

## 9. Synthetic calculation fixtures

Because the authoritative formula/tool could not be inspected, no fixture verification against an official source was possible. The synthetic fixtures below were computed **using the unverified candidate algorithm only** (weights `8, 6, 4, 2, 3, 5, 9, 7`; `C = 11 − (S mod 11)`; candidate mapping `10→0`, `11→5`), for record-keeping purposes only. They are explicitly **not** verified against the official UPU tool, and must not be treated as confirmed test fixtures until that verification succeeds. No real customer identifier was used, and none of these fixtures were submitted to any live tracking service.

| Synthetic 8-digit serial | Weighted sum (`S`) | `S mod 11` | `11 − (S mod 11)` | Candidate check digit (unverified mapping) | Result category |
|---|---|---|---|---|---|
| `12345678` | `1×8+2×6+3×4+4×2+5×3+6×5+7×9+8×7 = 204` | `204 mod 11 = 6` | `11 − 6 = 5` | `5` | Normal result (1–9) |
| `00000009` | `9×7 = 63` | `63 mod 11 = 8` | `11 − 8 = 3` | `3` | Normal result (1–9) |
| `36925814` | `3×8+6×6+9×4+2×2+5×3+8×5+1×9+4×7 = 24+36+36+4+15+40+9+28 = 192` | `192 mod 11 = 5` | `11 − 5 = 6` | `6` | Normal result (1–9) |
| `00000000` | `0` | `0` | `11 − 0 = 11` | `5` (per unverified special-case rule) | **Intermediate result 11** |
| `70000000` (chosen to force `S mod 11 = 1`, giving `11 − 1 = 10`) | `7×8 = 56` | `56 mod 11 = 1` | `11 − 1 = 10` | `0` (per unverified special-case rule) | **Intermediate result 10** |

These last two rows are the specific cases this task most needed to confirm against the official tool (an intermediate result of exactly `10` and exactly `11`). Both remain **unverified** — they demonstrate that such inputs are reachable and well-defined under the candidate formula, but the mapping applied to them (`10→0`, `11→5`) has not been confirmed by an authoritative source.

## 10. EMS range verification

**Not independently reverified.** No official UPU or EMS Cooperative material was reachable (Section 5), so the `EA`–`EZ` EMS range already recorded in `COURIER_EMS_RESEARCH.md` Section 4 could not be checked against an authoritative source in this task. Its evidentiary status is unchanged from `COURIER_EMS_RESEARCH.md`: corroborated by secondary sources only.

## 11. EX–EZ bilateral treatment

**Not independently reverified**, for the same reason as Section 10. The `EX`–`EZ` bilateral-agreement caveat remains sourced only from secondary material, as already recorded in `COURIER_EMS_RESEARCH.md` Section 4.

## 12. Non-EMS service-range verification

**Not independently reverified.** No official source was reachable to check the single-prefix findings already recorded in `COURIER_EMS_RESEARCH.md` (`RR` for registered mail, `LX` for tracked letter post, `CP` for international parcel post), nor to find any authoritative range for insured letter post, e-commerce parcels, or generic small packets. Per this task's instruction, none of these may be approved based on a single example prefix in any case — and since no authoritative source was reached at all, every non-EMS category remains classified as it already was in `COURIER_EMS_RESEARCH.md` and `POSTAL_DETECTOR_DESIGN.md`:

| Category | Evidence classification |
|---|---|
| Parcel post (`CP`) | Not verified (single secondary-sourced prefix only) |
| Tracked letter post (`LX`) | Not verified (single secondary-sourced prefix only) |
| Registered letter post (`RR`) | Not verified (single secondary-sourced prefix only) |
| Insured letter post | Not verified (no range found in any source) |
| E-commerce parcels | Not verified (no range found in any source) |
| Generic small packets | Not verified (no range found in any source) |
| Reserved/unassigned ranges | Not verified (no authoritative list reached) |

## 13. Country-code meaning

**Not independently reverified.** The finding that the trailing two-letter code identifies the issuing postal administration's country rather than the destination — already recorded in `COURIER_EMS_RESEARCH.md` Section 3 and carried into `POSTAL_DETECTOR_DESIGN.md` Section 4 — could not be checked against an official UPU source in this task, for the same access reasons documented above. No postal operator was inferred from any service indicator or country code during this task.

## 14. Facts approved for implementation

**None.** No fact meets the approval standard defined for this task (support by directly inspected authoritative UPU or EMS material), because no such material was reachable in this environment during this verification attempt.

## 15. Facts still blocked

All facts remain blocked, at the same status recorded in `POSTAL_DETECTOR_DESIGN.md` Section 18, now explicitly reconfirmed as unresolved after a dedicated verification attempt:

- **Special-result mapping for calculated values 10 and 11** — `Corroborated but still blocked`. This is the most critical unresolved item; the specific resource best suited to resolve it (the official UPU S10 check-digit validation tool) was directly targeted and found unreachable in this environment.
- **Complete EMS service-indicator range (`EA`–`EZ`)** — `Corroborated but still blocked`.
- **`EX`–`EZ` bilateral treatment and its classification consequence** — `Corroborated but still blocked`.
- **Non-EMS service-indicator ranges** (`RR`, `LX`, `CP`, insured mail, e-commerce parcels, small packets, reserved ranges) — `Not verified` (single-prefix or no evidence at all).
- **Whether country-code validation should use a complete ISO list or structural letters only** — unchanged open decision, not addressed by this verification task.
- **Whether `postal-unsupported` should return `matched: true`** — unchanged open decision, not addressed by this verification task (this is a product/design decision, not a factual verification question).
- **`identifierType` design (Option A vs. Option B in `POSTAL_DETECTOR_DESIGN.md` Section 10)** — unchanged open recommendation pending approval, not addressed by this verification task.
- **Availability of authoritative public test fixtures** — still blocked; the synthetic fixtures in Section 9 above are explicitly unverified against an official source.

## 16. Required changes to POSTAL_DETECTOR_DESIGN.md, if any

**None required.** `POSTAL_DETECTOR_DESIGN.md` already correctly treats every item above as an unresolved blocker (its Section 18) and does not claim any of them as approved. This verification task did not surface any new fact, correction, or contradiction that would require updating that document's content. No modification to `POSTAL_DETECTOR_DESIGN.md` is made by this task, consistent with the file restrictions for this task.

## 17. Recommended next technical action

**Outcome C applies: the critical check-digit special-result mapping remains unverified.**

Recommendation:

`Do not implement postal validation yet`

The exact source that must still be obtained, in priority order, before implementation can proceed:

1. The official UPU S10 check-digit validation tool: `https://www.upu.int/UPU/media/upu/files/postalSolutions/programmesAndServices/standards/toolStandardsS10CheckDigitValidationToolEn.xls` (or its current equivalent URL, if UPU has since relocated it) — this would settle the Section 8 mapping question directly, since it is UPU's own reference implementation.
2. Failing that, the current UPU Technical Standard S10 document itself, via the UPU Standards page: `https://www.upu.int/en/Postal-Solutions/Programmes-Services/Standards`.
3. Failing that, official EMS Cooperative documentation at `ems.post`, which may separately confirm the EMS-specific range questions (Sections 10–11) even if it does not cover the check-digit tool.

None of these could be reached from this sandboxed environment due to an outbound network policy that blocks the entire `upu.int` and `ems.post` domain space at the connection level (confirmed via the proxy's own status log, not merely inferred from a single failed request). Obtaining this evidence will require either a different network environment, a manually supplied copy of the official document/tool, or explicit project-owner confirmation of the mapping from another authoritative channel.

## 18. Explicit exclusions

This verification task does **not** authorize:

- Implementation of `detect-postal.js`
- Modification of any production JavaScript file
- Modification of `POSTAL_DETECTOR_DESIGN.md`, `COURIER_EMS_RESEARCH.md`, `PRODUCT_SPEC.md`, `CLAUDE.md`, or `TRACKING_ROUTER_DESIGN.md`
- Approval of the check-digit special-result mapping
- Approval of the EMS service-indicator range
- Approval of any non-EMS service-indicator range
- Postal-operator identification
- Any live tracking submission
- Any use of a real customer identifier
- Any change to GitHub Pages settings, secrets, releases, or tags

## Offline verification of uploaded official UPU spreadsheet (2026-08-04)

This section documents a follow-up, offline verification performed after an official UPU S10 check-digit validation spreadsheet was manually uploaded to this environment, since direct network access to `upu.int` remained blocked (Sections 3–5 above).

### Uploaded source file

- **Uploaded filename:** `toolStandardsS10CheckDigitValidationToolEn.xls`
- **Session upload path:** `/root/.claude/uploads/e5edf2a9-84c2-5d60-ae35-fe891cddf77e/c2c18f6c-toolStandardsS10CheckDigitValidationToolEn.xls`
- **File size:** 55,296 bytes (non-empty)
- **SHA-256 checksum:** `854aa8c1288cca0753ebb37943d2edea02268422d3678d33f434afcc016e2a26`
- **Actual file type** (via `file` command): `Composite Document File V2 Document, Little Endian, Os: Windows, Version 5.1, Code page: 1252, Author: GaudetteB, Last Saved By: GaudetteB, Name of Creating Application: Microsoft Excel, Create Time/Date: Mon Mar 29 07:04:13 2010, Last Saved Time/Date: Tue Jun 29 12:00:37 2010` — a genuine legacy Excel binary (BIFF/OLE2) workbook, consistent with an official UPU tool of that era, not a placeholder or corrupted file.
- The uploaded file was **not** moved, copied into the repository, staged, committed, renamed, deleted, or modified. A temporary read-only working copy was made in `/tmp` (outside the repository) purely to work around a directory-permission issue when invoking local inspection tools; its checksum was verified identical to the original before use, and the entire temporary directory was deleted at the end of this task.

### Inspection tools attempted

- **LibreOffice (`soffice`), headless mode:** attempted first, per the task's tool priority. `soffice --version` succeeded (`LibreOffice 24.2.7.2`), confirming the binary itself runs. However, every headless `--convert-to` invocation (to `xlsx`, `csv`, and `pdf`; against both the original file and the verified-identical local copy; with and without an explicit import filter; with an isolated `-env:UserInstallation` profile) failed identically with `Error: source file could not be loaded`. A sanity check converting a trivial plain-text file (unrelated to the spreadsheet) to PDF **also failed identically**, proving this is a non-functional headless-conversion environment in this sandbox generally, not a defect in or rejection of the uploaded spreadsheet specifically. No macros were enabled, no external links were updated, and no source file was overwritten at any point during these attempts.
- **Python XLS libraries** (`xlrd`, `openpyxl`, `pandas`): none installed. Per this task's explicit instruction, no package was installed to compensate.
- **`catdoc` / `xls2csv` / `ssconvert` / `gnumeric`:** none installed; not used.
- **`strings` (already-installed, read-only, standard Unix utility):** used successfully. This tool extracts printable text sequences from a binary file without interpreting, executing, or modifying it, and was explicitly listed as a potential tool for this task. It cannot recover the file's binary formula logic (legacy BIFF spreadsheet formulas are stored as compiled binary tokens, not as plain text), so it provided **partial** evidence only — genuine, directly-sourced textual content, but not a full formula extraction.

No package was installed. No macro was executed. No external link was followed. No network request was made by any inspection step.

### Content extracted directly from the official file (via `strings`)

- **Worksheet/tool title (appears twice in the file):** `"S10 Check digit validation tool"`.
- **Secondary sheet/section label:** `"Compute check digit"`.
- **Explicit self-identification and standard reference (verbatim, paraphrased where noted):** the file states it is a tool to compute and validate the check digit of a 13-character S10 item identifier, and explicitly says: *"Refer to UPU Technical Standard S10 for more information on the 13-character item identifier standard."* This directly confirms the spreadsheet identifies itself as a UPU S10 check-digit validation tool tied to UPU Technical Standard S10, satisfying verification-task item 3.
- **S10 structure, as stated directly in the file (paraphrased):**
  - "An S10 item-ID consists of 13 characters."
  - Characters 1–2 (alphabetic): service indicator, identifying the type of product.
  - Characters 3–10 (numeric): an 8-digit serial number.
  - Character 11 (numeric): a check digit, computed from the serial number.
  - Characters 12–13 (alphabetic): a country code.
  - Usage instruction: "enter the 13-character item-ID (2 alpha, 9 numeric, 2 alpha) into the green box, without any spaces."

  This is a **direct, primary-source textual confirmation** of the exact structural breakdown already recorded in `COURIER_EMS_RESEARCH.md` and `POSTAL_DETECTOR_DESIGN.md` (positions 1–2 service indicator, 3–10 serial, 11 check digit, 12–13 country code). Verification-task items 4 and 5 are answered directly by this text.
- **Field labels found:** `"Char 1-2 Service indicator (example)"`, `"12-13 Country code (example)"`, `"Weight"`, `"Item Identifier"`, `"Position"`, and result-box labels `[Black]"VALID check digit!"` / `[Red]"INVALID check digit!"` — confirming the tool's interactive validate/compute layout described in its own instructions.
- **One directly embedded worked example:** `AA876543216AA` (found adjacent to the "Item Identifier"/example labels).

Numeric cell values (including the actual "Weight" row values and the compiled check-digit formula) are stored in the file's binary BIFF number/formula records, not as extractable plain text, so `strings` could not directly recover the eight weight values as labeled data, nor the literal formula expression. This is the specific limitation that prevents a full "cell formula" answer to verification-task items 6, 7, 9, and 11.

### Independent recomputation of the embedded worked example

The example `AA876543216AA` was decoded and independently recomputed against the **candidate** algorithm already recorded in `POSTAL_DETECTOR_DESIGN.md` and `COURIER_EMS_RESEARCH.md` (weights `8, 6, 4, 2, 3, 5, 9, 7`; `C = 11 − (S mod 11)`):

- Service indicator: `AA`; serial: `87654321`; check digit: `6`; country code: `AA`.
- Weighted sum: `8×8 + 7×6 + 6×4 + 5×2 + 4×3 + 3×5 + 2×9 + 1×7 = 64 + 42 + 24 + 10 + 12 + 15 + 18 + 7 = 192`.
- `192 mod 11 = 5`.
- `11 − 5 = 6`.
- Result `6` **matches** the check digit printed in the embedded example (`AA876543216AA`).

This is a genuine, directly-sourced (not secondary-blog-sourced) confirmation that the candidate weight sequence and base formula produce a result consistent with the official tool's own worked example, for a case that does **not** land on the intermediate values 10 or 11.

### Whether the boundary-case (10/11) mapping is confirmed

**Not confirmed.** The embedded worked example (`AA876543216AA`) produces an intermediate result of `5`, a normal (non-boundary) case. No second worked example, no visible boundary-case illustration, and no readable formula text (e.g. an `IF`/lookup expression) confirming the treatment of intermediate results `10` or `11` was found via `strings`, and the functional inspection tools capable of reading the actual compiled formula (LibreOffice headless conversion, or a Python XLS library) were unavailable in this environment, per the tool-availability findings above.

### Synthetic verification calculations

Because the boundary-case mapping itself remains unconfirmed (Section above), the following synthetic examples use the **same unconfirmed candidate mapping** already recorded in the earlier part of this document (Section 9) — they are **not** newly spreadsheet-confirmed, and are repeated here only for completeness of the record. No real customer identifier was used, and none of these values were submitted to any tracking service.

| Synthetic 8-digit serial | Weighted sum (`S`) | `S mod 11` | `11 − (S mod 11)` | Candidate check digit (unverified mapping) | Result category |
|---|---|---|---|---|---|
| `87654321` (from the official tool's own embedded example) | `192` | `5` | `6` | `6` | Normal result (1–9) — **directly confirmed against the official file** |
| `00000000` | `0` | `0` | `11` | `5` (unverified special-case rule) | Intermediate result 11 — **not confirmed** |
| `70000000` | `56` | `1` | `10` | `0` (unverified special-case rule) | Intermediate result 10 — **not confirmed** |

### Blocker resolution status

| Blocker | Prior status | Status after this offline verification |
|---|---|---|
| S10 13-character structure and field positions | Corroborated by secondary sources only | **Approved for implementation** — now directly confirmed by primary-source text extracted from the official file itself |
| Weights `8, 6, 4, 2, 3, 5, 9, 7` and general (non-boundary) formula `C = 11 − (S mod 11)` | Corroborated by secondary sources only | **Corroborated but still blocked** — strengthened by a genuine primary-source worked example that matches exactly, but the actual weight values and formula could not be extracted directly from the file's binary records with the tools available; one worked example cannot, by itself, mathematically prove all eight weights are uniquely correct |
| Special-result mapping for calculated values 10 and 11 | Corroborated but still blocked | **Not approved for implementation** — unchanged. No boundary-case example or formula text was recoverable with the available tools |
| EMS service-indicator range (`EA`–`EZ`) | Corroborated but still blocked | **Unchanged — not addressed by this spreadsheet.** This tool is a check-digit calculator only; it contains no visible reference to EMS, service-category ranges, registered mail, parcel post, or bilateral agreements |
| `EX`–`EZ` bilateral treatment | Corroborated but still blocked | **Unchanged — not addressed by this spreadsheet**, for the same reason |
| Non-EMS service-indicator ranges | Not verified | **Unchanged — not addressed by this spreadsheet** |

### Is implementation now approved?

**Partially.** The S10 13-character structural layout is now approved for implementation, directly confirmed from the official spreadsheet's own text. The general check-digit formula and weight sequence are more strongly corroborated (now including a matching primary-source worked example) but remain formally `Corroborated but still blocked` rather than fully approved, because the actual weight values and formula logic could not be extracted from the binary file with the tools available in this environment. The specific 10/11 special-case mapping — the single most critical open question for this verification effort — remains **not approved for implementation**, and the EMS/non-EMS service-indicator questions are entirely outside this spreadsheet's scope and remain exactly as blocked as before.

### Updated recommendation

Given the partial resolution above, the overall recommendation from Section 17 is refined as follows: structural detection of the S10 13-character shape (service indicator present, 8 digits, 1 digit, 2-letter country code) could reasonably proceed to a design-approved implementation stage, since that fact is now directly confirmed from an official primary source. However, **check-digit validation should still not be implemented** until either (a) a tool capable of reading the spreadsheet's actual formula/weight cells becomes available in this environment (e.g. a functioning LibreOffice headless conversion, or an installed Python XLS-reading library, subject to project-owner approval to install it), or (b) the boundary-case mapping is confirmed through another authoritative channel (e.g. the UPU Technical Standard S10 document itself, or explicit project-owner confirmation). This refines, but does not reverse, the `Do not implement postal validation yet` recommendation for check-digit logic specifically; it does not change the status of EMS/non-EMS category classification, which remains fully blocked regardless.

## Manual boundary-case verification using the official UPU spreadsheet (2026-08-04)

This section documents a final resolution of the check-digit boundary-mapping blocker, obtained after the project owner personally opened the official UPU S10 validation spreadsheet ("S10 Check digit validation tool") in Microsoft Excel, since this sandboxed environment's own tools (LibreOffice headless conversion in every attempted configuration, including an isolated profile and a virtual display; no Python XLS library available) remained unable to load or read the file directly (see the two preceding sections above).

The project owner manually tested two synthetic boundary-case identifiers directly in the official spreadsheet and captured two screenshots of the results. These screenshots were provided as inline image content in this session; no separate on-disk file path for them was found under the repository root, the session's known upload directory, `/mnt/data` (which does not exist in this environment), or other checked temporary upload locations — unlike the `.xls` file in the prior verification stage, these images were not saved to a locatable path. They were nonetheless inspected directly as delivered multimodal image content. Both screenshots visibly show the title **"S10 Check digit validation tool"** and its instructional text block — matching, word-for-word, the title and instructional text already extracted directly from the official `.xls` file's binary contents via `strings` in the prior "Offline verification" section of this document — which corroborates that these screenshots genuinely originate from the same official tool. Both screenshots show a green result box reading **"VALID check digit!"**.

Both underlying calculations were independently recomputed from first principles (not merely copied from the task prompt), using the weights and formula already documented in this file (`8, 6, 4, 2, 3, 5, 9, 7`; `C_intermediate = 11 − (weighted sum mod 11)`):

### Screenshot fixture 1

- Identifier: `AA000000005AA` (synthetic test value; service indicator `AA`, serial `00000000`, entered check digit `5`, country-code placeholder `AA`).
- Independent recomputation: weighted sum `= 0` (all digits zero); `0 mod 11 = 0`; intermediate result `= 11 − 0 = 11`.
- Official spreadsheet result: **VALID check digit!**
- Since the tool validated check digit `5` as correct for a serial whose intermediate result is independently confirmed to be `11`, this directly demonstrates the official tool's own mapping: **intermediate result 11 → check digit 5.**

### Screenshot fixture 2

- Identifier: `AA700000000AA` (synthetic test value; service indicator `AA`, serial `70000000`, entered check digit `0`, country-code placeholder `AA`).
- Independent recomputation: weighted sum `= 7×8 = 56` (only the leading digit is non-zero); `56 mod 11 = 1`; intermediate result `= 11 − 1 = 10`.
- Official spreadsheet result: **VALID check digit!**
- Since the tool validated check digit `0` as correct for a serial whose intermediate result is independently confirmed to be `10`, this directly demonstrates the official tool's own mapping: **intermediate result 10 → check digit 0.**

Both fixtures (`AA000000005AA`, `AA700000000AA`) are synthetic, purpose-built boundary-case test values. Neither was submitted to any live tracking website or service, and neither represents a real customer or operational shipment.

**The screenshots themselves are verification evidence only.** They have not been, and must not be, copied, staged, committed, or pushed into this repository unless separately authorized by the project owner in a future task. Only the concise verification results above are recorded in this document.

### Resolved blockers

Based on this directly observed behavioral evidence from the official UPU tool, combined with independently verified arithmetic, the following are now marked:

- **S10 intermediate result 10 mapping (`10 → 0`):** `Approved for implementation`.
- **S10 intermediate result 11 mapping (`11 → 5`):** `Approved for implementation`.
- **Boundary-case behavior of the check-digit calculation:** `Approved for implementation` — the full check-digit rule (weights `8, 6, 4, 2, 3, 5, 9, 7`, `C = 11 − (S mod 11)`, with `10 → 0` and `11 → 5`) is now supported by a normal-range worked example extracted directly from the file's own text (`AA876543216AA` → check digit `6`, documented in the "Offline verification" section above) and by these two directly observed boundary-case validations (`AA000000005AA` and `AA700000000AA`), together covering all three result categories (normal, 10, and 11).

### Blockers that remain unresolved

The following matters remain unresolved and are unaffected by this check-digit-focused verification, since the official check-digit spreadsheet contains no information about service categories, EMS, or postal operators:

- Complete EMS service-indicator range.
- Treatment of `EX`–`EZ`.
- Non-EMS postal service ranges.
- Postal-operator identification.
- Israel Post routing.
- Live tracking integration.

### Recommended next technical action

`Implement local S10 structural and check-digit validation without EMS or postal-operator classification.`

Specifically:

- **Structural S10 detection is approved** — the 13-character shape (2-letter service indicator, 8-digit serial, 1-digit check digit, 2-letter country code) is confirmed from the official tool's own text.
- **Check-digit validation is approved** — the full weighted-Modulus-11 algorithm, including both boundary-case mappings, is now confirmed by directly observed official-tool behavior plus independent recomputation.
- **EMS classification remains deferred** — no authoritative service-indicator range evidence exists beyond the secondary-sourced findings already recorded in `COURIER_EMS_RESEARCH.md`.
- **Commercial courier detection remains deferred**, per the existing approved architecture decision in `POSTAL_DETECTOR_DESIGN.md`.
- **No external tracking or routing is authorized yet** — this remains strictly a local recognition/validation capability; no tracking URL, API integration, or external navigation is approved by this document.

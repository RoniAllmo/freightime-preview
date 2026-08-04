# UPU S10 Authoritative-Verification Report

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

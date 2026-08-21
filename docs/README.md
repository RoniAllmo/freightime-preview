# FreighTime Documentation Index

This is the entry point for FreighTime's project documentation. It exists
so a reader never has to guess which document is authoritative for a
given area, or accidentally implement against a removed or historical
design. This index does not restate the content of any document below —
follow the link for that.

Every entry states one classification:

- **ACTIVE_CANONICAL** — the current source of truth for that area. Implementation and maintenance decisions should follow this document.
- **ACTIVE_SUPPORTING** — current and accurate, but secondary to a canonical document for the same area, or covering a narrower/adjacent concern.
- **HISTORICAL_REFERENCE** — describes an earlier implementation, retained for project history. Not the current source of truth.
- **REMOVED_FEATURE_HISTORY** — describes functionality that is no longer active in the product. Retained only as historical reference.

## Active canonical documents (current sources of truth)

| Area | Document | Notes |
|---|---|---|
| Questionnaire architecture, result hierarchy, professional referral, protected behavior | [`IMPORT_READINESS_V1.md`](../IMPORT_READINESS_V1.md) | The primary current product specification for the Import Readiness assessment. |
| Product-family matrix engine | [`product-family-matrix-engine.md`](product-family-matrix-engine.md) | Matrix data generation, reconciliation with detailed rules, update workflow. |
| Expert-authored regulatory guidance (5-rule pilot) | [`regulatory-signals-pilot.md`](regulatory-signals-pilot.md) | Current architecture in §16 onward; §1–14 are an explicitly marked historical record of an earlier, superseded activation model within the same file. |
| Adding or editing a pilot rule | [`product-owner-rule-authoring-guide.md`](product-owner-rule-authoring-guide.md) | Step-by-step authoring workflow and validation commands. |
| Adding a product family or detailed rule end to end | [`extending-product-family-guidance.md`](extending-product-family-guidance.md) | New in this pass — the approved workflow spanning the workbook, matrix, reconciliation, and tests. |
| Privacy and data flow | [`DATA_FLOW_INVENTORY.md`](DATA_FLOW_INVENTORY.md) | Verified trace of what data exists, where it goes, and what never leaves the browser. |
| Accessibility | [`ACCESSIBILITY_TEST_REPORT.md`](ACCESSIBILITY_TEST_REPORT.md) | What was actually tested (automated + source review) and what was not (no screen reader, no certified auditor). |
| Operations toolkit (CBM / chargeable-weight calculators) | [`OPERATIONS_TOOLKIT_V1.md`](../OPERATIONS_TOOLKIT_V1.md) | Current status: restored on the dedicated `tools.html` page. |
| Testing (canonical command, test roots, CI) | [`product-family-matrix-engine.md`](product-family-matrix-engine.md) §"Update workflow" and [`IMPORT_READINESS_V1.md`](../IMPORT_READINESS_V1.md) | See also the dedicated summary in this index's "Testing" section below. |
| Deployment | `.github/workflows/frontend-ci.yml` and GitHub Pages settings | No separate deployment document exists; the workflow file is itself the source of truth. This documentation pass did not modify it. |
| Git branch cleanup | [`git-branch-cleanup.md`](git-branch-cleanup.md) | New in this pass — evidence required before any branch deletion; no bulk-delete commands included. |
| Repository contribution rules for Claude Code | [`../CLAUDE.md`](../CLAUDE.md) | Governs what an automated contributor may and may not do in this repository; also the authoritative record of the tracking-router removal. |

## Active supporting documents

| Document | Purpose |
|---|---|
| [`PRODUCT_SPEC.md`](../PRODUCT_SPEC.md) | Original foundational product specification (name, vision, problem statement). Its tracking-search sections are historical design context only — see the correction note at the top of the file — but the document as a whole is still referenced for product identity. |
| [`DESIGN_SYSTEM_V1.md`](../DESIGN_SYSTEM_V1.md) | Visual design tokens and layout system; does not change result-computation logic. |
| [`ISRAELI_COMPLIANCE_READINESS_AUDIT.md`](ISRAELI_COMPLIANCE_READINESS_AUDIT.md) | Top-level index for the compliance-readiness pass; links the documents below. |
| [`LEGAL_CONTENT_STATUS.md`](LEGAL_CONTENT_STATUS.md) | Status tracker for the legal/compliance draft pages (`accessibility-statement.html`, `privacy-policy.html`, `terms-of-use.html`). |
| [`PRE_PUBLICATION_COMPLIANCE_CHECKLIST.md`](PRE_PUBLICATION_COMPLIANCE_CHECKLIST.md) | Unresolved placeholders that must be filled before the legal/compliance draft pages can be considered final. Not release-blocking by itself. |
| [`PRIVACY_TRACKING_AUDIT.md`](PRIVACY_TRACKING_AUDIT.md) | Summary audit; see `DATA_FLOW_INVENTORY.md` for the full technical trace. |
| [`SOURCE_REGISTER.md`](SOURCE_REGISTER.md) | Research inputs recorded during the compliance pass. Explicitly not a legal citation register. |

## Historical documents

| Document | Why it is historical |
|---|---|
| [`PRODUCT_READINESS_V1.md`](../PRODUCT_READINESS_V1.md) | Self-describes as a historical document in its own opening note; retained as the record of an earlier release-readiness pass across features that have since changed. |

## Removed-feature documents

All of the following describe FreighTime's earlier **Single-input tracking router** and its supporting courier/postal-identifier research. That feature was **removed from the public product in full** (see `CLAUDE.md` §1 and `IMPORT_READINESS_V1.md` §10) and none of this design is currently implemented. Each file below now carries its own "Removed feature" banner.

| Document |
|---|
| [`TRACKING_ROUTER_DESIGN.md`](../TRACKING_ROUTER_DESIGN.md) |
| [`INHOUSE_TRACKING_ARCHITECTURE.md`](../INHOUSE_TRACKING_ARCHITECTURE.md) |
| [`FCL_CONTAINER_TRACKING_DESIGN.md`](../FCL_CONTAINER_TRACKING_DESIGN.md) |
| [`SAFE_EXTERNAL_ROUTING_DESIGN.md`](../SAFE_EXTERNAL_ROUTING_DESIGN.md) |
| [`POSTAL_DETECTOR_DESIGN.md`](../POSTAL_DETECTOR_DESIGN.md) |
| [`S10_AUTHORITATIVE_VERIFICATION.md`](../S10_AUTHORITATIVE_VERIFICATION.md) |
| [`COURIER_IMPLEMENTATION_DECISION.md`](../COURIER_IMPLEMENTATION_DECISION.md) |
| [`COURIER_EMS_RESEARCH.md`](../COURIER_EMS_RESEARCH.md) |
| [`EMS_CLASSIFICATION_RESEARCH.md`](../EMS_CLASSIFICATION_RESEARCH.md) |
| [`ARAMEX_COURIER_IDENTIFIER_RESEARCH.md`](../ARAMEX_COURIER_IDENTIFIER_RESEARCH.md) |
| [`DHL_COURIER_IDENTIFIER_RESEARCH.md`](../DHL_COURIER_IDENTIFIER_RESEARCH.md) |
| [`DSV_COURIER_IDENTIFIER_RESEARCH.md`](../DSV_COURIER_IDENTIFIER_RESEARCH.md) |
| [`FEDEx_COURIER_IDENTIFIER_RESEARCH.md`](../FEDEx_COURIER_IDENTIFIER_RESEARCH.md) |
| [`UPS_COURIER_IDENTIFIER_RESEARCH.md`](../UPS_COURIER_IDENTIFIER_RESEARCH.md) |

## Superseded documents

None currently. No document in this repository has been fully replaced by
a single newer document on the same topic — the closest cases
(`PRODUCT_SPEC.md`, `PRODUCT_READINESS_V1.md`) still hold unique content
not duplicated elsewhere, so they are classified as supporting/historical
rather than superseded. This section is kept so a future full replacement
has a place to be recorded.

## Legal and compliance drafts

The rendered draft pages themselves (`accessibility-statement.html`,
`privacy-policy.html`, `terms-of-use.html`, `contact.html`) are not
documentation files and are out of scope for this index — see
[`LEGAL_CONTENT_STATUS.md`](LEGAL_CONTENT_STATUS.md) for their current
status, and [`PRE_PUBLICATION_COMPLIANCE_CHECKLIST.md`](PRE_PUBLICATION_COMPLIANCE_CHECKLIST.md)
for what remains unresolved before they can be considered final. This
documentation pass did not modify their wording.

## Testing

- **A. Maintained Node test suite (required on every Pull Request):** run with `node --test` from the repository root — no path arguments. This is Node's own recursive test-file discovery; it finds every maintained `*.test.js` file under `tests/`, matching the exact command `.github/workflows/frontend-ci.yml` runs in CI. A dedicated guard, `tests/ci-workflow-completeness.test.js`, fails if the workflow's command ever drifts from this, or if a maintained test file ends up outside an approved test root (`tests/readiness/`, `tests/import-readiness/` and its `regulatory-signals/` subdirectory, `tests/tools/`).
- **B. Real-browser acceptance scripts:** used during product-owner acceptance for a specific change (headless Chromium via Playwright, driven only through visible UI controls — never internal matcher calls). These are ad hoc scripts written per task, not committed to this repository as a maintained suite, and are not part of CI.
- **C. Backend read-only verification:** the frontend's automated tasks never modify `/home/user/freightime-tracking-api`; every task confirms its HEAD, syntax, OpenAPI validity, and `npm test` result (299/299 at the time of writing) unchanged before and after frontend work.

No claim of screen-reader testing is made anywhere in this repository's documentation unless it was actually performed — see `ACCESSIBILITY_TEST_REPORT.md` for exactly what accessibility testing did and did not occur.

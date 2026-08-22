# Extending Product-Family Guidance

This document is the canonical, end-to-end workflow for adding a new
product family or a new detailed regulatory-signal rule to FreighTime's
Import Readiness assessment. It cross-references, but does not duplicate,
the two documents that own the mechanics of each step:

- [`product-family-matrix-engine.md`](product-family-matrix-engine.md) — the matrix data generation, reconciliation model, and existing-rule mapping.
- [`product-owner-rule-authoring-guide.md`](product-owner-rule-authoring-guide.md) — the exact fields and validation steps for authoring one detailed rule.

Nothing in this document adds new regulatory content. It describes
*process* only.

## The approved workflow

1. **Product owner updates the reviewed workbook.** Edit `data/FreighTime_Simple_Import_Requirements_Matrix.xlsx` directly — this is the single source of product-owner-authored family/category data. See `product-family-matrix-engine.md` for the expected sheet name and column layout.
2. **Run the deterministic workbook conversion.** `python3 scripts/generate_product_family_matrix.py` regenerates `js/import-readiness/product-family-matrix.js` from the workbook. The script is deterministic and DOM-free; it never invents a category value.
3. **Review the generated registry diff.** Confirm the diff contains exactly the intended new/changed rows — no unrelated row should move or change.
4. **Add only reviewed aliases.** A family's `aliases` list is curated free-text matched by the identification engine (`product-family-identification.js`) — add only aliases the product owner has reviewed as genuinely identifying that family, not speculative synonyms.
5. **Add a detailed rule only when a family-level signal is insufficient.** The matrix already produces a positive-category card for a recognized family; author a new entry in `js/import-readiness/regulatory-signals/rules-registry.js` (see the rule-authoring guide) only when the family needs its own specific finding, confirmation question, or professional routing that the generic matrix card cannot express.
6. **Add only questions that change activation, exclusion, categories, confidence, or professional routing.** A new rule's `followUpQuestionIds` must each materially change the outcome — never add a question merely because a schema field exists. See `IMPORT_READINESS_V1.md`'s question-planning section for the same discipline applied to every existing question.
7. **Add explicit exclusions.** A rule's `exclusionPredicate` (or a "no" answer on its own gating question, the pattern every current rule uses) must be able to turn the rule off — never a rule that, once hinted, always fires.
8. **Add reconciliation between the detailed rule and overlapping matrix categories.** Add an entry to `EXISTING_RULE_TO_FAMILY` in `js/import-readiness/product-family-reconciliation.js` mapping the new rule's id to the family id(s) and `regulatorySignals` key(s) it covers. Skipping this step is the single most common way a new rule would silently double-render alongside its own matrix category — see `product-family-matrix-engine.md`'s "Known limitations" note.
9. **Ensure detailed exclusions suppress only overlapping categories.** `suppressedSignalKeysForFamily()` in `product-family-reconciliation.js` must only ever remove the specific `regulatorySignals` key(s) the new rule's own reconciliation entry names — never every category for that family.
10. **Preserve unrelated positive categories.** A family may carry several positive categories (e.g. health *and* agriculture); adding or excluding one detailed rule must never suppress a category that rule's reconciliation entry does not name.
11. **Add professional routing.** Populate the rule's `professionalCategory`/`secondaryProfessionalCategory` fields from the existing `PROFESSIONAL_CATEGORY` registry (`professional-category-registry.js`) — never invent a new professional type inline. If the rule's professional overlaps a category the generic scenario-level referral already covers, confirm `coveredCategoryIds` is populated correctly (via `professionalReferral()`/`jointReferral()`) so the existing dedup logic (`resolveProfessionalDedup()` in `import-readiness-controller.js`) can suppress the duplicate.
12. **Add positive, negative, and exclusion tests.** At minimum: the rule fires for its intended positive case; a negative/decorative-style description never fires it; an explicit "no" answer excludes it; the matrix category it reconciles against is not double-rendered once the rule matches.
13. **Run the canonical complete test command.** `node --test`, run with no path arguments from the repository root — see the "Testing" section of `docs/README.md`.
14. **Open a Pull Request.** Include the workbook diff, the generated-registry diff, the new/changed reconciliation entry, and the new tests.
15. **Perform product-owner acceptance.** A qualified customs professional reviews the rule's public-facing wording and confirms the workbook change before the rule is approved for pilot use (see `product-owner-rule-authoring-guide.md`'s status lifecycle).

## Rules that govern every step above

- The matrix's `כן` (yes) becomes a positive signal (`true`) in the generated registry.
- The matrix's `לבדוק` (to check) becomes `false` — never a positive signal, and never left as an unresolved string in runtime data.
- A `false` category is never displayed publicly.
- `false` never means the product is exempt from that category's requirements — only that no positive signal was identified in the reviewed matrix.
- Existing detailed rules remain primary: when both a detailed rule and a matrix category could describe the same finding, the detailed rule's own approved wording renders, never the generic matrix presentation (see the precedence order in `product-family-matrix-engine.md`).
- A detailed rule's exclusion (an explicit "no" answer) overrides only the matrix category or categories that rule's own reconciliation entry names — it must never suppress an unrelated category.
- Unrelated positive categories remain active regardless of any other rule's own trigger/exclusion state.
- The user is never asked which authority applies — professional routing is always assigned by rule/matrix data (`professionalCategory` fields), never sourced from user input.
- No internet validation is required for expert-authored preliminary guidance — official sources remain optional supporting evidence, never a mandatory precondition (see `regulatory-signals-pilot.md`).
- Final classification and regulatory decisions remain professional work — nothing this workflow produces is a customs classification, import approval, or legal determination.

## Out of scope for this document

This guide describes *process*. It does not authorize or perform:

- Adding new regulatory content (that is the product owner's authored rule content, entered directly in `rules-registry.js`).
- Merging the two professional-referral registries (`PROFESSIONAL_CATEGORY` and `PROFESSIONAL_REFERRAL` — see `IMPORT_READINESS_V1.md`'s "Two professional-registry sources" note).
- Removing the dormant existing-importer confirmation screen.
- Introducing a brand-new matrix category column not already in the reviewed workbook.
- Changing existing question behavior, budgets, or suppression rules.

Each of these remains a product-owner decision, made separately from — and before — following this workflow.

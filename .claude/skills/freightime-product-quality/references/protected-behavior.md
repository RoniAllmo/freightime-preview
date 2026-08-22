# Protected Behavior

Extracted from FreighTime's current canonical documentation
(`docs/README.md`'s index, `IMPORT_READINESS_V1.md`,
`docs/product-family-matrix-engine.md`,
`docs/regulatory-signals-pilot.md` §16+,
`docs/extending-product-family-guidance.md`,
`docs/DATA_FLOW_INVENTORY.md`) — not from any single past PR's
task-specific instructions. If a document listed here is later updated,
re-read it; this file summarizes behavior, it does not own it.

## Never change without separate, explicit product-owner authorization

- **Product-family matrix data** (`js/import-readiness/product-family-matrix.js`
  and the workbook it's generated from). Only
  `docs/extending-product-family-guidance.md`'s workflow may touch this,
  starting from the reviewed workbook — never hand-edit the generated file.
- **Regulatory content** — any wording of a finding, positive category,
  confirmation question, or rule in `regulatory-signals/rules-registry.js`
  or the matrix. This is product-owner-authored expert content.
- **Professional outcomes / routing** — which professional type is
  recommended for a given result. Two distinct registries exist by
  design: `PROFESSIONAL_CATEGORY` (`professional-category-registry.js`)
  and `PROFESSIONAL_REFERRAL` (`build-action-map.js`). They are
  intentionally **not** consolidated (see `IMPORT_READINESS_V1.md`'s "Two
  professional-registry sources" section) — do not merge them, and do not
  change which one a scenario uses.
- **Question logic** — question order, gating, `followUpQuestionIds`,
  exclusion predicates, or which answer activates/excludes a signal.
- **Quantity behavior** — anything that changes how answer counts or
  multi-select quantities affect the result.
- **The Hero section** — both entry-point choice cards and their copy/layout.
- **The calculators** — CBM and air-freight chargeable-weight calculators
  on `tools.html` (see `OPERATIONS_TOOLKIT_V1.md`).
- **The backend** (`/home/user/freightime-tracking-api`) — this skill
  operates on the frontend repository only. Any task using this skill
  confirms the backend is unchanged (HEAD, `npm test` at 299/299) before
  and after, but never edits it.
- **The result-state resolver** — `js/import-readiness/result-state.js`'s
  `RESULT_STATE` enum and `isNoDirectionMessageAllowed()` are the single
  source of truth for whether a "no direction" message may render.
  Presentation changes must call this resolver, never re-derive its logic.
- **The canonical result hierarchy** (route context → status →
  professional direction → specific finding title →
  identification/implication → positive regulatory categories →
  verification items → primary professional+reason → optional supporting
  professional → recommended action → one CTA → secondary actions →
  additional info → one limitation). UX/motion work may restyle how these
  render; it must not reorder, remove, merge, or duplicate them.
- **The dormant existing-importer confirmation screen** — do not remove
  or reactivate it as a side effect of an unrelated UX pass.

## Always true, and must stay true after any change

- A `false`/`לבדוק` category is never displayed publicly and never means
  "exempt."
- The user is never asked which authority applies — routing always comes
  from rule/matrix data, never user input.
- No internet validation is a precondition for expert-authored guidance.
- Nothing this product produces is a customs classification, import
  approval, or legal determination.
- No outbound data transmission, storage, tracking, analytics, or
  external-AI call (see `docs/DATA_FLOW_INVENTORY.md`) — the one accepted,
  pre-existing exception is the Google Fonts `<link>`.

## What this skill *may* touch (in IMPLEMENT_AUTHORIZED mode, scoped to approved findings)

- CSS (existing stylesheets, no new library).
- Vanilla JavaScript for presentation/interaction only — never logic that
  computes a result, activates a rule, or selects a professional.
- Markup structure, ARIA attributes, focus management, motion timing.

## Out of scope for this skill entirely

Per `docs/extending-product-family-guidance.md`'s own "Out of scope"
section — adding regulatory content, merging the two professional
registries, removing the dormant existing-importer screen, adding a new
matrix category, or changing question behavior/budgets/suppression
rules. Route these requests to that document's workflow instead.

---
name: freightime-regression-validation
description: Select the smallest sufficient validation scope for a FreighTime change — targeted tests, escalation to integration/full-suite/release validation, bounded browser checks, accessibility/privacy checks, and read-only backend confirmation. Use when modifying application source or tests, fixing a bug, changing UX/CSS/HTML/JS/routing/family-suggestion/result-rendering/privacy/accessibility behavior, validating a branch, preparing a Pull Request, reviewing test sufficiency, verifying a release, or investigating a failing test or apparent browser defect. Does not own branch/commit/push/PR/merge/deploy sequencing — see freightime-safe-git-workflow for that.
---

# FreighTime Regression Validation

## Purpose

Choose the smallest validation that actually proves a change is safe,
and escalate only when the change's real risk or dependency surface
requires it. This prevents both failure modes seen in this project:
shipping a risky change under-tested, and rerunning the full suite,
browser matrix, CI, or Pages check after every small edit.

**Boundary with `freightime-safe-git-workflow`:** that skill owns
branch/commit/push/PR/merge/CI-and-Pages-waiting/branch-deletion
sequencing. This skill owns *what to test and how much*, at each of
those stages — it never pushes, merges, or deletes anything itself.

**Boundary with `freightime-product-quality`:** that skill owns product
UX/accessibility/privacy/domain *quality standards* and audit-vs-implement
modes for UX work. This skill owns *test-scope selection* for any
change (UX or otherwise) — reuse `freightime-product-quality`'s own
checklists (`accessibility-checklist.md`, `browser-acceptance.md`,
`protected-behavior.md`) as the content source when a UX-quality task
needs them; do not duplicate their content here.

This skill contains no product, regulatory, or product-family
knowledge, and no Git/GitHub operation instructions.

## Confirmed project commands (read from the repository, not invented)

- **Complete frontend suite:** `node --test` — bare, no path arguments,
  run from the repository root. This is Node's own recursive
  test-discovery default (verified by `tests/ci-workflow-completeness.test.js`).
  There is no `package.json`/build step in this repository.
- **Targeted tests:** `node --test <path1> <path2> ...` — pass the
  exact directly-related test file paths.
- **JavaScript syntax check:** `find . -name '*.js' -not -path './.git/*' -print0 | xargs -0 -n1 node --check`
  (the same command CI runs — no separate lint/build tool exists).
- **CI workflow:** GitHub Actions workflow "Frontend CI"
  (`.github/workflows/frontend-ci.yml`), job `validate`, running the
  syntax check then `node --test`.
- **Browser acceptance:** no maintained in-repo suite — ad hoc
  Playwright scripts against the already-installed Chromium runtime
  (`/opt/pw-browsers`), per `freightime-product-quality`'s own
  `references/browser-acceptance.md`. Never commit these as new
  project test files unless a genuine regression test belongs in
  `tests/`.
- **CI completeness / deterministic-generation / duplicate-collision
  checks:** already embedded inside the complete suite (e.g.
  `tests/ci-workflow-completeness.test.js`,
  `tests/import-readiness/product-family-matrix.test.js`,
  `tests/import-readiness/family-suggestion-registry-boundary.test.js`)
  — these are not separate standalone commands to invent; running the
  complete suite already covers them.
- **Backend:** a separate repository (`/home/user/freightime-tracking-api`
  in this environment). For frontend-only work, verify its branch/HEAD/
  working-tree status read-only; never invent backend commands — use
  the backend repository's own guidance when backend validation is
  actually required.

## Core principles

1. Test the changed **behavior**, not merely the changed file.
2. Start with the smallest directly relevant validation.
3. Escalate only when risk or dependency surface justifies it (see
   Change-Risk Classification).
4. Never repeat passing validation on unchanged code at the same SHA.
5. Rerun a validation only when: it previously failed; a relevant
   correction was made since; the existing evidence belongs to a
   different SHA; or the environment materially changed.
6. Distinguish product defect / test defect / test-harness defect /
   environment limitation / expected ambiguous behavior — always name
   which one a failure is.
7. Never weaken an assertion just to make a test pass.
8. Never call a local check "public-production verification."
9. Never report validation complete while a required check is pending.
10. Stop any command with no useful progress for 5 minutes; never
    replace it with polling, repeated sleep, `while`, `watch`,
    `tail -f`, or background log monitoring.
11. Keep validation proportional to the change — this applies both
    ways (not too little, not too much).

## Validation levels

### Level 0 — Static
Documentation, Skill/guidance files, comments, non-runtime text,
repository metadata.
- Changed-file scope check, file-structure validation, syntax/parse
  check where applicable, `git diff --check`, working-tree status.
- Do not run the frontend suite merely because files changed.
- No browser validation unless a runtime file changed unexpectedly.

### Level 1 — Targeted
During implementation and for narrow fixes (one selector fix, one
alias correction, one wording change, one isolated state-lifecycle
defect, one Skill's own test).
- Directly related test files; direct syntax check on changed JS;
  focused structural assertions; focused accessibility/privacy checks
  only when directly affected; `git diff --check`; working-tree status.
- Do not run the complete suite after every edit.

### Level 2 — Integration
The change crosses module boundaries or touches shared state (e.g.
free-text→checkbox visibility, family selection→result routing, Edit
Answers, Reset/New Assessment, document state reused by results,
professional selection/CTA construction, a shared normalization/
matching/dedup helper).
- All directly related unit tests; relevant integration tests; bounded
  browser validation via real visible controls; lifecycle checks for
  affected transitions; accessibility checks when interactive
  visibility/focus changes; privacy checks when text/storage/URL/
  network behavior may be affected; complete frontend suite **once**
  before publishing when production logic changed materially.

### Level 3 — Release
Before merging a significant production change, or when explicitly
requested.
- Targeted + integration evidence already passing; complete frontend
  suite passed once on the exact candidate SHA; CI completeness
  verified (part of the suite); deterministic-generation and
  duplicate/collision protections passed where relevant (part of the
  suite); bounded browser smoke for the changed behavior; backend
  confirmed unchanged for frontend-only work; CI green on the exact PR
  head; Pages verified only after merge, only when production frontend
  content changed.
- If the exact candidate SHA already passed the complete required CI
  suite and nothing changed since: reuse that evidence, do not rerun.

## Change-risk classification (pick the default level, then check escalation triggers)

- **A. Documentation/governance only** (Skills, checklists, docs, PR
  template, Definition of Done) → **Level 0**. Escalate only if runtime
  or workflow files also changed in the same task.
- **B. Presentation-only CSS/static markup** (spacing, logical RTL
  property, inline-style removal with no computed-style change,
  non-interactive presentation) → **Level 1**, add bounded browser
  checks when visual behavior matters. Escalate to **Level 2** if
  responsive layout, focus visibility, hidden-state behavior,
  interactive markup, or accessibility semantics change.
- **C. Interactive UI or state** (checkboxes, progressive disclosure,
  Edit Answers, navigation, fallback state, Reset, New Assessment) →
  **Level 2**.
- **D. Shared JavaScript helper** (normalization, matching, dedup,
  routing, state commit, result construction) → **Level 2**; require
  tests across every direct consumer.
- **E. Product or professional routing** (family resolution, result
  routing, professional selection, CTA target, document suggestions) →
  **Level 2** during development, **Level 3** before merge.
- **F. Privacy or data-flow change** (URL, storage, network, analytics,
  free-text handling) → **Level 2**; require explicit privacy
  validation (see below).
- **G. Workflow/CI/deployment/dependency change** → **Level 2 or 3**
  depending on impact. Never install or update a dependency merely to
  run validation.
- **H. Backend change** → use the backend repository's own validation
  guidance; do not assume frontend validation covers it, and do not
  make backend changes as part of frontend validation.

## Targeted test selection

Before choosing tests, identify: changed production files; their
direct imports/consumers; existing tests naming or importing those
modules; affected state transitions; affected user-visible behavior;
potential cross-family/cross-route/cross-result collisions; privacy,
accessibility, and RTL impact. Select only the tests that cover that
affected behavior — do not scan the whole repository when the direct
consumers and their tests are already known, and do not fabricate test
paths.

If no direct test exists for the changed behavior: add one focused
regression test as part of the implementation task. Do not compensate
with manual browser testing alone, and do not create a broad,
unrelated test suite while doing it.

## Full-suite rule

Run the complete frontend suite **once**, before publication, when: a
shared production JS module changed; result or routing logic changed;
shared state changed; a family or professional mapping changed; a
normalization/matching/collision/dedup helper changed; several runtime
modules changed in one task; or the user explicitly requested release
validation.

Do not run it for: guidance-only changes; documentation-only changes;
static evaluation artifacts; a Skill with no executable runtime
behavior; a proven test-only correction with no production-behavior
change. If it already passed on the exact unchanged HEAD, record and
reuse that evidence instead of rerunning it.

## Browser validation rules

Use it only when user-visible or lifecycle behavior changed. Use real
visible controls — never inject internal state or call internal result
builders and present that as acceptance. Use the smallest
representative scenario set. Default viewports: 375px mobile, 1440px
desktop; add another only when a breakpoint-specific change requires
it. Per scenario, record only the relevant checks (initial visible
options, selection, result state, CTA count, limitation count,
selected-option persistence, focus, overflow, console errors, storage,
URL changes, network hosts) — do not require every possible check for
every task, and do not run a large scenario matrix when a small set
already proves the behavior.

### Harness-defect discipline
On a script failure: classify it first — product defect, harness
defect, selector mismatch, environment issue, or expected state. Never
change product code until a product defect is independently
reproduced. If the harness is wrong, fix only the harness and rerun
only the affected scenario once. Never count an expected no-result or
fallback state as a failure. Never omit a failed scenario from the
report.

## Accessibility validation scope

Required when the change affects focus, keyboard operation, hidden
elements, expand/collapse controls, ARIA, labels, fieldsets, legends,
heading structure, contrast, or responsive reflow. Relevant checks:
visible focus, keyboard reachability, no hidden focusable control,
correct `aria-expanded`, valid `aria-controls`, valid label
association, no focus loss, no keyboard trap, RTL behavior, 320–375px
reflow. Do not run a broad accessibility audit for unrelated
logic-only work — use `freightime-product-quality`'s
`accessibility-checklist.md` as the content source when this scope
applies.

## Privacy validation scope

Required when product descriptions, answers, tracking data, or user
state could be affected. Confirm as relevant: no product text in the
URL; no unexpected `localStorage`/`sessionStorage`; no cookies added;
no analytics transmission; no product-data network request; no
persistent logs. Never claim privacy verification without actually
inspecting network/storage/URL behavior for that change.

## Backend validation scope

For frontend-only changes: confirm backend HEAD and working-tree state
read-only. Rerun backend tests only when backend files changed, a
shared contract changed, API behavior changed, the user explicitly
requested it, or the backend state differs from the previously
verified SHA. Never rerun the backend suite after every frontend-only
change when its SHA and tree are unchanged. For genuine backend
changes, use that repository's own guidance — never invent a backend
command here.

## CI and Pages evidence

CI evidence must reference the exact PR-head or `main` SHA; queued or
running is not success; do not poll repeatedly — use
`freightime-safe-git-workflow`'s bounded-waiting policy (one check, one
≤3-minute wait, one more check, then report pending and stop). Pages
verification is required only after merge and only when frontend
production content changed; confirm the deployed SHA; a local smoke
check on the same SHA is supporting evidence, never equivalent to
public Pages access — if public access is blocked, report the
workflow/SHA evidence and the environment limitation as two separate
facts, not one conclusion.

## Validation evidence record (report every time)

- Validation level selected, and why.
- Exact SHA.
- Files changed.
- Tests run / tests not run (with the reason).
- Browser scenarios run (or "not run", with reason).
- Backend validation performed or skipped (with reason).
- CI state; Pages state when applicable.
- Failures, harness defects, environment limitations, residual risks.

Never report "all checks passed" without listing exactly which checks
were run.

## Stop conditions

Stop and report instead of continuing when: the working tree has
unrelated changes; an expected test file cannot be located; the
required test command is unknown; validation would require
unauthorized scope expansion; a product or regulatory decision is
missing; a command exceeds 5 minutes with no useful progress; CI
remains pending after the one permitted bounded check; the browser
environment cannot distinguish product from harness behavior; backend
state unexpectedly differs; or destructive recovery would be required.
Do not continue autonomously into another task.

## References

- `references/validation-matrix.md` — change type → level/checks/
  escalation quick lookup.
- `evaluations/scenarios.md` — the 14 required scenario evaluations
  used to validate this skill's rules before first use.

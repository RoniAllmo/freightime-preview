---
name: freightime-product-quality
description: Review and (only when explicitly authorized) implement FreighTime questionnaire/result UX, motion, accessibility, RTL, responsive, and privacy quality work, with Playwright browser acceptance and hard safety gates against product-logic, regulatory-content, and dependency changes. Use for any request to audit, polish, fix, or verify FreighTime's frontend UX.
---

# FreighTime Product Quality

## Purpose

Review and improve FreighTime's questionnaire and result-screen UX —
motion, accessibility, Hebrew RTL, responsive layout, and privacy —
without ever changing product logic, regulatory content, or professional
outcomes, and without adding a runtime dependency. This skill is the
single, safe entry point for that class of work; it replaces ad hoc UX
passes with one repeatable, safety-gated procedure.

## Trigger conditions

Invoke `/freightime-product-quality` (or load this skill directly) when
asked to:

- Review, audit, or improve the questionnaire flow or a result screen's UX.
- Add, adjust, or evaluate motion/animation on any FreighTime page.
- Check or fix accessibility, RTL/Hebrew layout, or responsive behavior.
- Verify privacy behavior of a UI change (no new data transmission/storage).
- Run a Playwright-based browser-acceptance pass on the frontend.

Do **not** use this skill for: matrix/rule content changes, question
logic changes, professional-registry changes, backend work, or anything
already covered by `docs/extending-product-family-guidance.md` — those
are separate, out-of-scope workflows (see `protected-behavior.md`).

## Operating modes (pick exactly one, state it up front)

### AUDIT_ONLY (default)
- Inspect the live UI (Playwright, real visible controls) and/or source.
- Produce a findings report only — see `references/reporting-template.md`.
- **Make no code changes.**

### IMPLEMENT_AUTHORIZED (only when the user has explicitly approved specific findings)
- Implement **only** the findings the user named as approved — not the
  full audit list, not adjacent cleanup.
- Create a dedicated branch before editing anything.
- Run the full frontend `node --test` suite and re-check backend
  read-only status (see `references/protected-behavior.md`).
- Run a Playwright browser-acceptance pass (`references/browser-acceptance.md`).
- Open a Pull Request. **Never merge or deploy** without separate,
  explicit product-owner authorization for that specific action.

If it is unclear which mode applies, default to AUDIT_ONLY and ask.

## Workflow

1. **Load safety gates first.** Read `references/protected-behavior.md`
   before touching anything — it lists what must never change and why.
2. **Scope the request** against the trigger conditions above. If it
   requires matrix, regulatory-content, question-logic, professional-registry,
   calculator, Hero, or backend changes, stop and say so — that is out of
   scope for this skill.
3. **Load only the reference files the task needs:**
   - Motion work → `references/motion-guidelines.md`.
   - Accessibility/RTL/responsive work → `references/accessibility-checklist.md`.
   - Any browser verification → `references/browser-acceptance.md`.
   - Visual/design judgment calls → invoke the built-in `frontend-design`
     skill as a supporting reference (guidance only, not a replacement
     for the safety gates here).
4. **AUDIT_ONLY:** gather findings, classify each against the safety
   gates, write the report per `references/reporting-template.md`, stop.
5. **IMPLEMENT_AUTHORIZED:** confirm the exact approved finding list with
   the user's own words, create a branch, implement only those findings,
   run the frontend test suite and backend read-only check, run the
   Playwright browser-acceptance pass, then invoke the built-in
   `code-review` skill on the diff before opening a PR.
6. **Always report** using the field structure in
   `references/reporting-template.md`, including explicit "no" lines for
   every safety gate that wasn't touched.

## Safety gates (hard rules, apply in every mode)

- No product-family matrix changes, no regulatory-content changes, no
  professional-outcome changes, no question-logic changes, no
  answer-quantity behavior changes.
- No changes to the Hero, the CBM/chargeable-weight calculators, or any
  backend file (`/home/user/freightime-tracking-api` is never touched by
  this skill).
- No new runtime dependency (no animation library, no framework) without
  separate, explicit product-owner approval — CSS and vanilla JavaScript
  only.
- No data transmission, storage, tracking, analytics, or external-AI call
  introduced by any change.
- Full detail: `references/protected-behavior.md`.

## Required outputs

Every invocation ends with a report using the exact field labels in
`references/reporting-template.md` (skill name/invocation, files
touched, mode, safeguard confirmations, test results, PR link if any).
Never claim a test result, browser check, or PR state that wasn't
actually run/observed in this invocation.

## References (load on demand, not all at once)

- `references/protected-behavior.md` — what must never change, and why.
- `references/motion-guidelines.md` — the functional-motion rules and ban list.
- `references/accessibility-checklist.md` — accessibility/RTL/responsive checklist.
- `references/browser-acceptance.md` — Playwright acceptance requirements.
- `references/reporting-template.md` — required report shape for both modes.

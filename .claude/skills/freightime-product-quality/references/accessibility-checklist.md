# Accessibility, RTL, and Responsive Checklist

Scope: what to verify on any questionnaire or result-screen UX change.
This checklist reflects what `docs/ACCESSIBILITY_TEST_REPORT.md` actually
covers (automated checks + source review) — it does not claim
screen-reader or certified-auditor testing, and neither should any report
produced with this skill unless that testing actually happened.

## Structure and semantics

- Question groups use `fieldset`/`legend`, not generic `div`s with visual-only labels.
- Answer controls are native `input[type=radio]`/`checkbox` (or equivalent
  native elements) — never a `div` with a click handler standing in for one.
- No duplicate `id` attributes anywhere on the page.
- Every `aria-*` reference (`aria-labelledby`, `aria-describedby`,
  `aria-controls`, etc.) points to an `id` that actually exists.
- Hidden content (`display:none`, `hidden`) is never focusable; visible
  content is always reachable by keyboard.

## Keyboard and focus

- Full keyboard flow: tab order follows visual/logical order through the
  questionnaire and into the result screen.
- Visible focus indicator on every interactive element (never
  `outline: none` without a replacement indicator).
- When a new question appears dynamically, focus moves to it (or is
  otherwise clearly signaled) rather than leaving focus stranded.
- When the result renders, it is announced (`aria-live` region or
  equivalent) so a screen-reader user isn't left waiting silently.

## Motion and phase semantics

- Reduced motion respected (see `motion-guidelines.md`).
- Phase/step semantics (which step is current, how many remain) are
  exposed in a way assistive tech can read, not conveyed by color/position alone.

## Hebrew RTL

- Page/section `dir="rtl"` is correct and consistent — no stray LTR
  islands except where content genuinely requires it (e.g. embedded
  Latin product codes).
- Icons, chevrons, and directional affordances are mirrored correctly
  for RTL reading order.
- Text alignment, list markers, and form-control alignment all follow RTL.

## Responsive

- No horizontal overflow at any viewport tested (see
  `browser-acceptance.md` for the viewport set).
- Touch targets are usable at mobile widths (no controls requiring
  precision smaller than a comfortable tap target).
- Content reflows correctly at 200% browser zoom and at 400% zoom
  (reflow, not just scaling) without loss of content or function.

## Reporting discipline

- Only report a check as "passed" if it was actually performed in this
  invocation (source review or live browser check) — never assume prior
  session results still hold without re-verifying.
- Never claim screen-reader testing unless it actually happened.

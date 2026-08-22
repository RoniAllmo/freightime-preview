# Motion Guidelines

## The one rule everything else follows

Every animation must have a functional job: communicating state change,
directing attention to what just became relevant, or softening an
abrupt layout shift. If you cannot name the functional job in one
sentence, the recommendation is **no animation** — not a smaller one.

## Requirements

- **Preserve immediate interaction.** Motion must never delay a control
  becoming clickable/focusable/readable, or gate content behind a
  transition finishing. If a user can act before the animation ends,
  they must be able to.
- **Restrained durations.** Match the existing codebase's scale (roughly
  150–400ms for UI feedback; the existing `hero-fade-up` and
  `ir-result-fade-in` keyframes in `index.html` are the calibration
  reference — new motion should read as part of the same system, not a
  new, more dramatic one).
- **Preserve `prefers-reduced-motion`.** `index.html` already wraps its
  keyframe-driven motion in `@media (prefers-reduced-motion: reduce)`
  overrides. Any new animation must follow the same pattern — reduced
  motion gets the end state immediately, no exceptions.
- **Vanilla CSS and vanilla JavaScript only.** Extend the existing
  `@keyframes` / CSS-transition approach already used in `index.html`.
  Never introduce Motion, Framer Motion, GSAP, React, Vue, or any other
  runtime animation/UI library — that requires separate, explicit
  product-owner approval and is out of scope for this skill regardless.

## Banned outright (no functional-job justification accepted)

- Bounce / spring overshoot easing.
- Parallax scrolling effects.
- Typewriter text reveal.
- Artificial loading delays/spinners where no real asynchronous work is
  happening.
- Scroll hijacking (intercepting or overriding native scroll behavior).

## Review checklist for any motion change

1. State the functional job in one sentence. If you can't, recommend removal.
2. Confirm the control/content is usable before the animation completes.
3. Confirm duration is consistent with the existing `hero-fade-up` /
   `ir-result-fade-in` scale.
4. Confirm a `prefers-reduced-motion: reduce` override exists and shows
   the end state instantly.
5. Confirm no library was added — `git diff package.json` (or equivalent)
   shows no new dependency.
6. Confirm the animation isn't on the banned list above.

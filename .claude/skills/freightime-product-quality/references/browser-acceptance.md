# Browser Acceptance (Playwright)

This skill uses the already-installed Playwright/Chromium runtime
directly (`/opt/pw-browsers`) via an ad hoc script written for the task —
consistent with `docs/README.md`'s "Testing" section item B. No new
package or skill is added for this; nothing here is committed as a
maintained test suite or added to CI.

## Hard requirements

- **Real, visible UI controls only.** Drive the page the way a user
  would: click, type, select. Never call internal JS functions/matchers
  directly and present that as end-to-end acceptance.
- **No internal state injection.** Never set `window.__someState` or call
  an internal controller method to fast-forward the flow — reach every
  state by interacting with the rendered UI.
- **No direct matcher calls presented as browser acceptance.** Unit/DOM
  assertions from the Node test suite are not a substitute for a real
  rendered-page check, and must not be reported as one.

## Required coverage per invocation that touches UI

- **Viewports:** at minimum a mobile width and a desktop width (this
  project's practical minimum pair is 375px and 1440px; use the fuller
  set — 320/375/430/768/1024/1440/1920 — when the change is
  layout-sensitive).
- **Focus and scroll checks:** verify focus lands where
  `accessibility-checklist.md` requires, and that no unexpected scroll
  jump occurs.
- **RTL rendering:** verify the Hebrew RTL layout renders correctly at
  each tested viewport.
- **No horizontal overflow:** check `document.documentElement.scrollWidth`
  does not exceed the viewport width at any tested size.
- **Console validation:** capture console errors/warnings during the
  run; any new error introduced by the change is a failure.
- **Privacy validation:** capture network requests during the run;
  confirm no new outbound request carries product/answer data, no new
  storage write (`localStorage`/`sessionStorage`/cookies) occurs, and the
  URL is never mutated with product data. The pre-existing Google Fonts
  request is the one accepted exception.
- **Protected-journey regression:** re-run the standard scenario set
  through the real UI to confirm no protected result changed — at
  minimum: glass, cosmetics, eggs, walkie-talkie, vehicle headlamp, car
  organizer, clothing/no-positive, unknown-family, and a cargo-damage
  path. Compare rendered result text/structure before and after.

## Reporting

State exactly which viewports, scenarios, and checks were run in this
invocation. Never report a browser-acceptance pass as complete if any
required item above was skipped — say what was skipped and why instead.

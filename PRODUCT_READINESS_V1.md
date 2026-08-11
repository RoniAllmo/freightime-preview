# FreighTime Product Readiness V1

This document summarizes the product-readiness work performed across the
tracking search, Smart Tracking Import, and Operations Toolkit features,
and the checks a release decision should rely on. It does not itself
constitute a release approval.

**Update (post-cleanup):** Smart Tracking Import (V1 and V2) and the
sea-transit calculator and standalone container-number validator tool
described below were removed after product-owner review, since they were
never approved and risked implying a live-tracking capability FreighTime
does not have. This document is kept as a historical record of the
Product Readiness V1 task; see `OPERATIONS_TOOLKIT_V1.md` for the toolkit
as currently shipped, and the "Current product capabilities" list below
no longer reflects the shipped product for the two removed items.

## Current product capabilities (as of Product Readiness V1 -- see update note above)

- Tracking-number/container-number detection and structural + check-digit
  validation (ISO 6346 containers, AWB Modulus-7, UPU S10/EMS, UPS 1Z,
  UPS Roadie 1R).
- Safe official-tracking continuation links (never navigated automatically,
  never carry the entered identifier in the URL).
- Normalized-identifier copy action.
- Ocean carrier-selection continuation (MSC/ZIM/Maersk), including a
  single high-confidence route when a verified container-owner code
  applies (added after this task, see `container-owner-registry.js`).
- Operations Toolkit V1: originally sea-transit, CBM, and air
  chargeable-weight calculators, plus container/AWB structural
  validators. **Now (post-cleanup) reduced to CBM, air chargeable-weight,
  and AWB validator only** -- see `OPERATIONS_TOOLKIT_V1.md`.
- ~~Smart Tracking Import V2~~ **(removed post-cleanup)**: previously
  offered user-mediated, entirely local parsing of text copied from an
  official carrier tracking page. No longer part of the product.

## Honest tracking limitations (unchanged by this task)

- FreighTime never contacts a carrier and never claims to. It detects and
  validates identifiers, offers a safe link to the official tracker, and
  can locally organize text the user pastes back in from that tracker.
- A `detection_only` result is exactly that -- no operational information
  group was found, and this task did not change that behavior.
- A `partial` result reflects at least one reliable operational group
  extracted from pasted text -- never live vessel position, never proof
  of carrier contact, never proof of actual shipment movement.
- `scheduled`/`estimated`/`actual`/`calculated` labeling is preserved
  exactly as implemented in Smart Tracking Import V1/V2 and the
  Operations Toolkit.

## What this task changed

- Fixed a pre-existing ~17px horizontal-overflow bug at narrow mobile
  viewports (root cause: the footer's 4-column CSS grid had no
  responsive breakpoint, unlike every other grid on the page). See
  `index.html`'s `@media (max-width:980px)` block.
- Added a `<main>` landmark (previously absent), fixed a heading-level
  skip (h1 → h3) on the Smart Tracking Import panel's heading (now h2),
  and added `aria-label` to five inputs that previously relied on
  `placeholder` alone (`trackInput`, `cfName`, `cfContact`, `cfMsg`,
  `chatInput`).
- Added `<meta name="description">`, `<meta name="theme-color">`, and a
  favicon (a self-contained inline SVG data URI matching the existing
  brand mark -- no external request). No production URL, social account,
  carrier partnership, or usage-volume claim was invented.
- Added `.github/workflows/frontend-ci.yml`: runs the exact same syntax
  checks and `node --test` commands already used for local validation, on
  every pull request into `main` and every push to `main`. No secrets,
  no external API calls, no paid service, least-privilege
  (`permissions: contents: read`).
- Added `tests/readiness/product-readiness.test.js` (16 tests) verifying
  the above fixes against the real `index.html`/workflow files.

## Privacy and security model (unchanged, reconfirmed)

Every module under `js/tracking-import/`, `js/tracking/`, and `js/tools/`
was re-audited for `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`,
`sendBeacon`, `localStorage`, `sessionStorage`, `indexedDB`,
`document.cookie`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`,
`eval`, and console logging -- **zero matches** in actual code (only
matches inside doc comments describing what the code deliberately does
*not* do), confirmed automatically in CI going forward via
`tests/readiness/product-readiness.test.js` tests 12-13.

**Note on the pre-existing AI chat widget (historical -- since removed)**:
at the time of this task, the page had a separate, pre-existing
AI-assistant chat panel (not part of the tracking search, Smart Tracking
Import, or Operations Toolkit) that called `fetch()` to an external AI
API with the user's typed chat messages, and used `innerHTML` to render
its own message bubbles. It was flagged here for transparency and left
unmodified at the time, since redesigning it was outside that task's
scope. It was subsequently **removed entirely** in a later repository
cleanup task, precisely because of the external data transmission and
unsafe `innerHTML` rendering described above -- see `PRODUCT_SPEC.md`
Section 18 and `CLAUDE.md` Section 6 for the current status.

## Local validation commands

```
node --test "tests/tracking/*.test.js" "tests/tools/*.test.js" "tests/readiness/*.test.js"
python3 -m http.server 8934   # then open index.html in a browser
```

(Updated post-cleanup: the `tests/tracking-import/*.test.js` glob was
removed along with the deleted `js/tracking-import/` module.)

## Release-readiness checks this task performed

- All tests pass locally and in CI.
- Zero horizontal overflow at 320/360/375/390/430/768/1024/1440px.
- No duplicate element IDs; exactly one `<main>` landmark; no heading-level
  skips; every form control has an accessible name.
- No user input (pasted tracking text, calculator inputs, search
  identifiers) is transmitted, stored, or logged anywhere in the
  tracking/import/toolkit code paths.

## Release-readiness decision

**Ready for a separate release decision.** Passing this task's checks
means the audited concerns are addressed -- it is not itself a
production-approval decision, which remains a separate business step.

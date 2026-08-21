# FreighTime — Single-Input Tracking Router: Technical Design

> **Removed feature:** The implementation described in this document is no longer active. FreighTime's "Single-input tracking router" was removed from the public product in full (see `CLAUDE.md` §1 and `IMPORT_READINESS_V1.md` §10). This file is retained only as historical reference.

This document defines the technical design for the first FreighTime **Single-input tracking router**, as approved in `PRODUCT_SPEC.md` (Section 9) and governed by the operating rules in `CLAUDE.md` (Sections 3, 4, 7, 8, 9). It is a design document only. No tracking functionality is implemented by this document.

## 1. Purpose

The Single-input tracking router connects the existing central tracking field in `index.html` to a chain of internal, framework-free JavaScript logic: input normalization, identifier detection, carrier matching, and routing to an official carrier tracking page.

The first MVP does **not** retrieve or display live shipment events inside FreighTime. It identifies the likely identifier type and carrier, then hands the user off to that carrier's own tracking page. Live milestone data, ETAs, and shipment histories are explicitly out of scope for this design (see Section 14).

## 2. Existing interface integration

The following elements already exist in `index.html` and are not modified by this task:

| Element | ID | Current role |
|---|---|---|
| Tracking tabs | `#searchTabs` (container `<span data-tab="container">`, `<span data-tab="air">`, `<span data-tab="parcel">`) | Currently a manual, decorative hint switcher — clicking a tab only changes the hint text below the input. |
| Tracking input | `#trackInput` | Free-text field, placeholder: "הכניסו מספר מכולה, מספר מעקב או מספר הזמנה" (enter a container number, tracking number, or order number). |
| Tracking button | `#trackBtn` | Currently shows an `alert()` demo message; not connected to any real logic. |
| Tracking hint | `#searchHint` | Currently a static example string (e.g. "לדוגמה: MSCU1234567") driven by the `tabHints` object in the existing inline `<script>` block. |

**Future integration approach:**

- `#trackBtn`'s click handler will be replaced so it calls the router's entry point instead of showing a demo `alert()`.
- `#trackInput`'s value will be read at click time (and optionally on `Enter` keydown, matching the existing pattern used elsewhere on the page) and passed into the normalization layer.
- `#searchTabs` may continue to drive the hint text as today, but should not be assumed to constrain or pre-select the detected identifier type — detection must remain independent of which tab is visually active (see Section 6).
- `#searchHint` remains a static example display; it is not part of the detection or routing logic.
- All existing markup, styling, and the current single inline `<script>` block remain untouched during this design stage. Future implementation stages (Section 13) will introduce a modular loading approach; no such change is made here.

The page currently has no external script files and no module-loading mechanism (`<script src="...">` or `type="module"`) — this is a relevant constraint carried into Section 3 and the "open technical decisions" in Section 15.

## 3. Proposed module structure

All modules are plain, framework-free JavaScript. No build step, bundler, or framework is selected or implied.

### `js/tracking/normalize.js`
- **Responsibility:** Convert raw user input into a normalized input model (Section 4).
- **Expected inputs:** The raw string value from `#trackInput`.
- **Expected outputs:** A normalized input object (Section 4).
- **Must not contain:** Any identifier-type detection, carrier logic, or UI/DOM manipulation.

### `js/tracking/detect-container.js`
- **Responsibility:** Evaluate a normalized input against ocean container identifier patterns.
- **Expected inputs:** The normalized input object.
- **Expected outputs:** A partial detection result (Section 5) specific to the "ocean container" identifier type, or an explicit non-match.
- **Must not contain:** Carrier selection, routing decisions, UI text, or knowledge of other detectors.

### `js/tracking/detect-awb.js`
- **Responsibility:** Evaluate a normalized input against air waybill (AWB) identifier patterns.
- **Expected inputs:** The normalized input object.
- **Expected outputs:** A partial detection result (Section 5) specific to the "air waybill" identifier type, or an explicit non-match.
- **Must not contain:** Carrier selection, routing decisions, UI text, or knowledge of other detectors.

### `js/tracking/detect-courier.js`
- **Responsibility:** Evaluate a normalized input against courier/express tracking number patterns.
- **Expected inputs:** The normalized input object.
- **Expected outputs:** A partial detection result (Section 5) specific to the "courier" identifier type, or an explicit non-match.
- **Must not contain:** Carrier selection, routing decisions, UI text, or knowledge of other detectors.

### `js/tracking/carrier-registry.js`
- **Responsibility:** Hold and expose the configurable carrier registry data structure (Section 7) and provide lookup functions (e.g., "which carriers match this identifier type and pattern").
- **Expected inputs:** An identifier type and/or a normalized identifier.
- **Expected outputs:** A list of candidate carrier registry entries.
- **Must not contain:** Detection pattern logic (that belongs in the `detect-*` modules), UI code, or routing decisions.

### `js/tracking/router.js`
- **Responsibility:** Orchestrate the flow: call normalization, run detectors, consult the carrier registry, and produce a final structured detection/routing result (Section 5) and a routing decision (Section 8).
- **Expected inputs:** The raw input string (it calls `normalize.js` itself) or an already-normalized input object.
- **Expected outputs:** A structured result object combining the detection result and the recommended routing action.
- **Must not contain:** DOM access, UI rendering, or hardcoded carrier-specific rules (those live in `carrier-registry.js`).

### `js/tracking/ui-controller.js`
- **Responsibility:** Bind to the existing DOM elements (`#trackInput`, `#trackBtn`, `#searchTabs`, `#searchHint`), call `router.js`, and render the appropriate interface state (Section 9).
- **Expected inputs:** DOM events (click, keydown) and the router's structured result object.
- **Expected outputs:** DOM updates (rendered state, messages, links) — no return value consumed elsewhere.
- **Must not contain:** Normalization logic, detection patterns, or carrier data. This module only reacts to user events and renders results.

## 4. Normalized input model

A conceptual object, not implementation code:

- `originalInput` — the raw string exactly as entered by the user, preserved unmodified.
- `trimmedInput` — `originalInput` with leading/trailing whitespace removed.
- `uppercaseInput` — `trimmedInput` converted to uppercase.
- `compactInput` — `uppercaseInput` with internal separators (spaces, hyphens, etc.) removed, where appropriate for pattern matching.
- `digitsOnly` — only the digit characters extracted from `compactInput`, where applicable to a given detector.
- `length` — the character length of `trimmedInput`.
- `hasLetters` — boolean, whether any alphabetic characters are present.
- `hasDigits` — boolean, whether any digit characters are present.

`originalInput` must always be preserved separately from all derived fields, consistent with `CLAUDE.md` Section 10 (Architecture principles).

## 5. Detection result model

A conceptual structured object, not implementation code:

- `identifierType` — one of: `"ocean_container"`, `"air_waybill"`, `"courier"`, `"unknown"`.
- `normalizedIdentifier` — the normalized representation used for the match (from Section 4).
- `possibleCarriers` — a list of zero, one, or multiple candidate carrier registry entries (Section 7).
- `confidenceLevel` — a qualitative indicator (e.g., `"confident"`, `"possible"`, `"low"`), not a numeric score requiring calibration in this design stage.
- `validationResult` — whether the identifier passed basic structural validation for its detected type (e.g., correct length/checksum-shape), independent of carrier matching.
- `ambiguityStatus` — boolean or enum indicating whether more than one valid interpretation exists.
- `userFacingReason` — a message key or structured reason (not hardcoded translated text — see Section 10), describing why this result was produced.
- `recommendedNextAction` — one of the routing behaviors defined in Section 8 (e.g., "route directly," "ask user to choose," "show unrecognized state").

Possible `identifierType` values for the first MVP are limited to: **ocean container, air waybill, courier, unknown** — matching `PRODUCT_SPEC.md` Section 10.

## 6. Detection sequence

Proposed order: **ocean container → air waybill → courier**, with all three detectors always run against the same normalized input rather than stopping at the first match.

Rationale:
- Running all detectors independently (rather than short-circuiting on the first match) is what allows ambiguous results to be recognized at all — if detection stopped at the first positive match, a valid alternate interpretation could be silently discarded.
- Ocean container numbers have the most rigid, well-defined structural format (four letters + seven digits, per ISO 6346), making them the cheapest and most reliable to rule in or out first, but this does not grant them priority over other valid matches.
- No detector may "claim" an identifier exclusively. Each `detect-*` module returns its own independent partial result (match or non-match); `router.js` is responsible for aggregating all partial results into one final detection result.
- If more than one detector reports a valid match, `ambiguityStatus` is set to true, `possibleCarriers` may span multiple identifier types' candidate carriers, and `recommendedNextAction` becomes "ask user to choose" (Section 8) rather than the router silently picking one interpretation.
- Ambiguous results are returned to the interface as a single structured result object (Section 5) with `ambiguityStatus: true`; `ui-controller.js` is responsible for rendering the "ambiguous match" state (Section 9) and presenting the candidate interpretations for manual user selection, consistent with `PRODUCT_SPEC.md` Section 10, item 9 (manual selection when detection is uncertain).

## 7. Carrier registry model

A conceptual, configurable data structure — not a final carrier list:

- `carrierId` — internal identifier for the carrier/provider entry.
- `displayName` — human-readable carrier name shown to the user.
- `shipmentCategory` — the identifier type(s) this entry applies to (e.g., ocean container, air waybill, courier).
- `identifierPatterns` — the structural pattern(s) used to associate an identifier with this carrier.
- `awbPrefixes` — applicable only to air waybill entries, where a numeric airline prefix helps identify the carrier.
- `officialTrackingUrl` — the carrier's official tracking page or URL template.
- `routingMethod` — how the identifier is passed to the tracking URL (e.g., appended as a path segment or query parameter) — described conceptually only, not implemented here.
- `enabled` — whether this registry entry is currently active for detection/routing.
- `notes` — free-text limitations or caveats about this entry's reliability.

Carrier rules must **not** be embedded directly inside `index.html` or any visual UI code — they must live only in `carrier-registry.js`, consistent with `CLAUDE.md` Sections 8 and 10. This design does not populate a final carrier list; that remains an open technical decision (Section 15).

## 8. Routing behavior

First-MVP behavior by case:

- **One confident match:** Route directly to that carrier's official tracking page.
- **Several possible matches:** Do not auto-select; present the candidates and require the user to choose one before routing.
- **Recognized type but unknown carrier:** Show the detected identifier type, state that the specific carrier could not be determined, and allow manual carrier selection if a relevant carrier list exists in the registry; otherwise show an unrecognized-identifier state.
- **Invalid identifier:** Structurally fails validation for any known type — show a clear "not recognized" message; do not attempt to guess a carrier.
- **Empty input:** Do not attempt detection or routing; prompt the user to enter an identifier.
- **Unknown identifier:** No detector produces a match — show the unrecognized-identifier state (Section 9) without implying that no such shipment exists.

The first MVP routes only to **official carrier tracking pages** via outbound links. This design does not define scraping behavior or live API retrieval of tracking data; both remain excluded per `PRODUCT_SPEC.md` Section 11 and `CLAUDE.md` Section 4.

## 9. User-interface states

Future interface states for `ui-controller.js` to render:

- **Initial** — default state before any search is submitted.
- **Empty input error** — user submitted with no identifier entered.
- **Detecting** — transient state while normalization/detection runs (expected to be near-instant since detection is local pattern matching, per `PRODUCT_SPEC.md` NFR1).
- **Confident match** — a single identifier type and carrier were identified; show a direct link to the official tracking page.
- **Ambiguous match** — multiple valid interpretations exist; present them for manual selection.
- **Recognized type with unknown carrier** — identifier type is known but no specific carrier could be matched.
- **Invalid format** — the identifier does not structurally match any known type.
- **Unrecognized identifier** — no match at all; clearly state this without guessing.
- **External routing confirmation** — before or upon following the outbound link to a carrier's site, make clear to the user that they are leaving FreighTime for the carrier's own official page.

No chatbot functionality is part of this flow. The existing chat interface elsewhere on the page is entirely separate from these tracking states and is not touched, referenced, or activated by this router design (see Section 11).

## 10. Hebrew and future English readiness

- The first MVP interface is **Hebrew and RTL**, matching the current `index.html` (`lang="he" dir="rtl"`) and `PRODUCT_SPEC.md` Section 8.
- User-facing messages must **not** be hardcoded inside detection modules (`normalize.js`, `detect-*.js`, `router.js`, `carrier-registry.js`). These modules only return message keys or structured reasons (`userFacingReason` in Section 5).
- `ui-controller.js` is responsible for resolving message keys into displayed text, which allows the underlying detection/routing logic to remain language-independent.
- Hebrew text may initially be stored in a dedicated interface-text configuration (a future module or data file, not created in this task), separate from functional logic.
- This structure is intended to allow future English and LTR support to be added by introducing an additional interface-text configuration, without modifying detection or routing logic.
- All technical names, module filenames, function names, and internal identifiers remain in English, regardless of interface language, consistent with `CLAUDE.md` Section 7.
- No language selector is implemented or implied by this design.

## 11. Privacy and security

- Shipment identifiers must not be sent to any external service during local detection — detection is local pattern matching only in the first MVP.
- Shipment identifiers should not be logged unnecessarily by any module in this design.
- Routing to an external official carrier website must be clear to the user (see the "external routing confirmation" state in Section 9), not a silent or disguised redirect.
- No API keys or credentials belong in any browser-side code produced by this design — the router design as described requires no external API calls or credentials at all.
- The future assistant feature (`PRODUCT_SPEC.md` Section 18) is explicitly **outside** this router design. The router does not call, depend on, or reference the assistant/chat interface in any way.
- The existing assistant/chat interface in `index.html` is not modified, activated, or referenced by this task or by the router design it describes.

## 12. Testing strategy

Future tests to be defined for the modules in Section 3 (no test files are created in this task):

- Empty input handling.
- Whitespace handling (leading, trailing, internal).
- Hyphen and separator handling in identifiers.
- Uppercase conversion correctness.
- Valid and invalid ocean container structures.
- Valid and invalid AWB structures.
- Ambiguous courier patterns (inputs that could plausibly match more than one identifier type).
- Unknown/unrecognized identifiers.
- Structural correctness of the detection result object (all required fields present, valid enum values).
- Routing safety (e.g., confirming that routing only ever targets a carrier's `officialTrackingUrl` from the registry, never an arbitrary or unsanitized URL derived from user input).

## 13. Incremental implementation stages

Each stage below is intentionally small and independently completable, per `CLAUDE.md` Section 5 (Incremental working method).

1. **Create module directories and empty module interfaces.**
   Completion criterion: the `js/tracking/` file set exists with each file containing only its intended responsibility as a stub/interface — no detection or routing behavior yet, and `index.html` is unchanged.
2. **Implement normalization.**
   Completion criterion: `normalize.js` reliably produces the model in Section 4 for a range of manually verified sample inputs, with no DOM dependency.
3. **Connect normalization to the existing input.**
   Completion criterion: submitting `#trackInput` produces a normalized object visible for verification (e.g., temporary console output), without altering `#trackBtn`'s visible behavior yet.
4. **Implement container detection.**
   Completion criterion: `detect-container.js` correctly classifies a documented set of valid/invalid container-number test cases.
5. **Implement AWB detection.**
   Completion criterion: `detect-awb.js` correctly classifies a documented set of valid/invalid AWB test cases.
6. **Implement courier detection.**
   Completion criterion: `detect-courier.js` correctly classifies a documented set of valid/invalid courier test cases.
7. **Add configurable carrier registry.**
   Completion criterion: `carrier-registry.js` exposes a queryable registry structure (Section 7) with a small illustrative (non-final) entry set, without hardcoding carrier rules elsewhere.
8. **Implement routing decisions.**
   Completion criterion: `router.js` combines detection results and registry lookups into the Section 5 result object and a routing decision per Section 8's cases, verified against sample inputs for each case.
9. **Build user-interface result states.**
   Completion criterion: `ui-controller.js` renders each state from Section 9 correctly for corresponding router outputs, replacing the current demo `alert()` in `#trackBtn`'s handler.
10. **Add automated tests.**
    Completion criterion: the test cases from Section 12 exist and pass against the implemented modules.
11. **Validate the complete flow.**
    Completion criterion: a manual end-to-end pass confirms that entering a real-world-shaped identifier for each supported type reaches the correct interface state and, where applicable, the correct official tracking page.

## 14. Explicit exclusions

This technical design does **not** authorize:

- Live tracking APIs
- Paid APIs
- Website scraping
- Freight quotations
- Freight bookings
- User accounts
- Shipment history
- Customer notifications
- Assistant implementation
- Framework migration

## 15. Open technical decisions

The following remain open and are not resolved by this document:

- JavaScript module-loading approach compatible with GitHub Pages (e.g., native ES modules via `<script type="module">`, versus separate classic `<script>` tags — the current page has neither).
- Testing tool or test runner to use for the tests described in Section 12.
- The initial carrier list to populate in `carrier-registry.js`.
- The official tracking URL format per carrier (path-based, query-parameter-based, or other).
- The exact external-link confirmation behavior (e.g., new tab, inline confirmation dialog, or plain link).
- Whether the existing tracking tabs (`#searchTabs`) remain manual hints only, or become automatic indicators reflecting the router's detected type.
- Where Hebrew interface messages will ultimately be stored (inline configuration object, separate JSON/data file, or another approach).
- How the website will visually expose ambiguous results to the user (e.g., a list of choices, a dropdown, or another pattern).

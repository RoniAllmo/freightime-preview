# FreighTime Operations Toolkit V1

Status: implemented. This document describes the five logistics
calculators added under the "כלים לוגיסטיים" (Logistics Tools) section
of the FreighTime homepage, alongside the existing Single-input tracking
router.

## 1. Purpose

Lawful, free, reliable live carrier tracking data is not currently
available to FreighTime (see `FCL_CONTAINER_TRACKING_DESIGN.md` and the
sibling backend repository's own carrier-access research). Rather than
pausing product development while that remains unresolved, this toolkit
delivers immediate, honest, privacy-safe operational value: five
calculators that logistics staff and importers/exporters commonly need,
computed entirely client-side from user-supplied numbers.

None of these tools are tracking. None of them claim to be live. Every
tool states its assumptions and limitations explicitly.

## 2. Tools delivered

1. **Sea transit-time calculator** (`js/tools/sea-transit-calculator.js`)
2. **CBM calculator** (`js/tools/cbm-calculator.js`)
3. **Air-freight chargeable-weight calculator**
   (`js/tools/air-chargeable-weight-calculator.js`)
4. **Container-number validator** (`js/tools/container-validator-tool.js`)
5. **AWB validator** (`js/tools/awb-validator-tool.js`)

Each is a pure calculation module (no DOM, no network, no storage, no
logging) wired to the page by a single shared controller,
`js/tools/tools-controller.js`, following the same defensive, additive
patterns already used by `js/tracking/ui-controller.js`.

The container and AWB validators **reuse** the exact same ISO 6346
check-digit algorithm and AWB Modulus-7 check-digit algorithm already
used by the primary tracking search's detectors
(`js/tracking/detect-container.js`, `js/tracking/detect-awb.js`) via
small additive named exports on those two files -- neither algorithm is
duplicated or forked.

## 3. Formulas and assumptions

### Sea transit-time calculator

- Planned sailing duration = ETA − ETD.
- Elapsed time = now − (actual departure, if supplied; otherwise ETD).
- Remaining time = ETA − now.
- Percentage elapsed = elapsed ÷ planned duration × 100, clamped to
  [0, 100], only computed when the planned duration is positive.
- ETD is always labeled **scheduled**. ETA is always labeled
  **estimated**. An actual departure, only if the user supplies one, is
  labeled **actual**. Percentage and durations are labeled
  **calculated**.
- The tool never infers an actual departure or actual arrival. It never
  claims the shipment "actually" departed unless the user explicitly
  entered an actual departure date.
- All dates/times are interpreted in the browser's local time zone via
  component-wise construction (never UTC-parsed). A date with no time
  supplied is calculated as midnight (00:00) local time, and this
  assumption is stated in the result.
- An ETA earlier than the ETD is rejected as invalid input.

### CBM calculator

```
CBM = length(m) × width(m) × height(m) × quantity
```

Dimensions may be entered in mm, cm, or m; all are normalized to meters
before calculating. The result shows both a full-precision value and a
3-decimal rounded display value, and always states that the final
carrier or warehouse measurement may differ.

### Air-freight chargeable-weight calculator

```
volumetric weight (kg) = length(cm) × width(cm) × height(cm) × quantity ÷ divisor
chargeable weight (kg) = max(actual gross weight, volumetric weight)
```

The default divisor is 6000 cm³/kg; 5000 cm³/kg and a custom positive
divisor are also supported. Dimensions in mm/cm/m are normalized to
centimeters before calculating. The result shows the exact chargeable
weight and a practically-rounded value (rounded up to the nearest 0.5
kg, the common air-freight rounding convention), and states this is an
operational estimate, not a binding freight charge -- airline,
forwarder, product, route, or tariff rules may set different rounding
or divisor rules.

### Container-number validator

Reuses the existing ISO 6346 structural pattern (4 letters + 7 digits)
and check-digit algorithm. Reports the owner code, equipment category
identifier, serial number, supplied check digit, and calculated check
digit. Explicitly states that the 4-letter prefix identifies a
BIC-registered equipment owner/category only -- it never claims to
identify the current operating shipping line.

### AWB validator

Reuses the existing 11-digit structure and unweighted Modulus-7
check-digit algorithm. Reports the 3-digit airline accounting prefix,
7-digit serial number, supplied check digit, and calculated check
digit. No airline-prefix-to-carrier mapping exists anywhere in this
repository yet, so the tool always shows the fixed note "קוד חברת
התעופה טרם אומת במערכת" ("the airline code has not yet been verified in
the system") rather than inventing or guessing an airline name.

## 4. Privacy and data-storage behavior

- No calculator input is ever sent to FreighTime's backend or to any
  external service -- every calculation runs entirely client-side.
- No calculator input or result is written to `localStorage`,
  `sessionStorage`, cookies, `IndexedDB`, the URL (query parameters or
  otherwise), or any analytics call. FreighTime does not use analytics
  at all.
- No calculator input is logged to the browser console or anywhere
  else.
- Each tool is independently usable and independently resettable; no
  tool's state affects another tool's state, and none of the five tools
  affect the primary tracking search or vice versa.

## 5. Limitations (stated explicitly to the user in the UI)

- Sea transit calculations are based entirely on the dates/times the
  user supplies -- they are not live tracking and do not confirm
  whether a vessel actually departed or arrived.
- CBM and chargeable-weight results are operational estimates; the
  carrier, forwarder, or warehouse's own measurement is authoritative.
- The container and AWB validators check structure and check digits
  only -- a structurally valid number is not proof that a shipment with
  that number exists, and neither tool identifies an operating carrier
  or airline.
- Final freight quotations and carrier-confirmed data always take
  precedence over any of these tools' output.

## 6. Running tests locally

```bash
node --test "tests/tracking/*.test.js" "tests/tools/*.test.js"
```

All tests use the built-in Node.js test runner and assertion library
(`node:test` / `node:assert`) -- no test framework or DOM library is
installed. Pure calculation modules are tested directly; the shared
controller is tested with small local fake-DOM-element test doubles,
matching the existing convention in `tests/tracking/ui-controller.test.js`.

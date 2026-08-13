# FreighTime Operations Toolkit V1

Status: implemented. This document describes the two logistics
calculators available under the "כלים לוגיסטיים" (Logistics Tools) section
of the FreighTime homepage.

Update: the sea transit-time calculator, the standalone
container-number validator tool, and the standalone AWB validator tool
were all removed after product-owner review. The sea-transit calculator
implied a live-tracking capability FreighTime does not have. The
container and AWB validator tools duplicated validation already
available in the Hero tracking search without adding meaningful
capability beyond it.

Update (product-owner acceptance correction): the "existing Single-input
tracking router" and Hero tracking search these two tools were once
compared against have since been removed in full -- see
`IMPORT_READINESS_V1.md` §10. Only the two calculators described below
remain. This document now reflects the toolkit as shipped.

## 1. Purpose

Lawful, free, reliable live carrier tracking data is not currently
available to FreighTime (see `FCL_CONTAINER_TRACKING_DESIGN.md` and the
sibling backend repository's own carrier-access research). Rather than
pausing product development while that remains unresolved, this toolkit
delivers immediate, honest, privacy-safe operational value: calculators
that logistics staff and importers/exporters commonly need, computed
entirely client-side from user-supplied numbers.

None of these tools are tracking. None of them claim to be live. Every
tool states its assumptions and limitations explicitly.

## 2. Tools delivered

1. **CBM calculator** (`js/tools/cbm-calculator.js`)
2. **Air-freight chargeable-weight calculator**
   (`js/tools/air-chargeable-weight-calculator.js`)

Each is a pure calculation module (no DOM, no network, no storage, no
logging) wired to the page by a single shared controller,
`js/tools/tools-controller.js`, following the same defensive, additive
patterns already used by `js/tracking/ui-controller.js`.

Container-number structural/check-digit validation and AWB structural/
Modulus-7 check-digit validation are both available only in the Hero
search (`js/tracking/detect-container.js`, `js/tracking/detect-awb.js`),
as part of the single-input tracking router. There is no separate
standalone container-validator or AWB-validator tool in the toolkit --
both were audited and found to duplicate the Hero search's own
validation without adding meaningful capability beyond it, so both were
removed rather than kept as parallel, less-capable copies.

## 3. Formulas and assumptions

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
  tool's state affects another tool's state, and neither tool affects
  the primary tracking search or vice versa.

## 5. Limitations (stated explicitly to the user in the UI)

- CBM and chargeable-weight results are operational estimates; the
  carrier, forwarder, or warehouse's own measurement is authoritative.
- Final freight quotations and carrier-confirmed data always take
  precedence over any of these tools' output.

## 6. Running tests locally

```bash
node --test "tests/tools/*.test.js" "tests/readiness/*.test.js"
```

All tests use the built-in Node.js test runner and assertion library
(`node:test` / `node:assert`) -- no test framework or DOM library is
installed. Pure calculation modules are tested directly; the shared
controller is tested with small local fake-DOM-element test doubles,
matching the existing convention in `tests/tracking/ui-controller.test.js`.

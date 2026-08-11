# FreighTime Import Readiness Check V1

Status: implemented. This document describes the product pivot from
"universal shipment tracking" to "free Israel commercial-import
readiness platform," and the Import Readiness Check V1 assessment that
is now FreighTime's primary Hero experience.

## 1. The pivot

**From:** universal shipment tracking as the primary traffic engine.

**To:** a free Israel commercial-import readiness platform that helps
users understand what must be checked before purchasing, shipping, or
clearing goods.

The existing tracking-number search (`#tracking`) remains available as
a secondary utility -- it is unchanged in behavior, still identifies
and validates container/AWB/EMS/UPS/Roadie identifiers and routes to
official carrier pages, and still never claims to retrieve live
tracking data. It is simply no longer the page's primary promise.

## 2. What Import Readiness Check V1 does

A short, multi-step, entirely client-side form (`js/import-readiness/`)
collects product identity, composition, commercial details,
classification context, and document availability, then returns:

- A readiness level (**high** / **partial** / **low**) -- an
  operational signal, never a legal eligibility determination.
- Missing information the user should complete.
- A document checklist, each item labeled `available`, `missing`,
  `may_be_required`, `verify_applicability`, or `not_indicated` --
  never a definite requirement.
- Classification-context questions (never an HS code guess).
- Regulatory topics to verify, each with a severity
  (`information`/`attention`/`high`), an explainable reason, and a
  link to the relevant official Israeli source category (only shown
  when the user's own answers make that regulator potentially
  relevant).
- A static list of cost components to plan for (never a computed
  total -- see "What V1 does not do" below).
- Clearance/delay risk notes derived from the same triggered risks and
  document gaps.
- Practical next actions.
- Honest professional-service conversion CTAs.
- The fixed required disclaimer (see Section 5).

## 3. What Import Readiness Check V1 does not do

- **No AI.** The entire assessment is a deterministic, explainable
  rule engine (`document-rules.js`, `regulatory-risk-rules.js`,
  `classification-question-rules.js`) -- every triggered result traces
  back to one named, testable rule.
- **No HS code guessing or final classification.** If a user enters an
  HS code, it is displayed exactly as entered, explicitly labeled as
  user-provided and unvalidated, alongside a link to the official
  Customs Tariff.
- **No final duty/tax rate, permit decision, or standards
  determination.** Every regulatory statement is phrased as "requires
  verification," never as a decision -- see the forbidden-phrase list
  enforced by `tests/readiness/product-readiness.test.js`.
- **No file upload or parsing.**
- **No login, no user accounts.**
- **No cost-planning calculator in V1.** Phase H of the governing task
  explicitly allows deferring this if it would make V1 too broad; it
  is deferred to a possible V2 (see `PRODUCT_SPEC.md`/this file's
  "Recommended V2" note). V1 instead shows a static, non-calculated
  list of cost components to plan for.
- **No network request, no storage write, no logging, no URL
  mutation.** The entire assessment runs in memory in the browser tab
  and is discarded on reload.

## 4. Readiness levels

- **High** -- basic commercial/technical information is present, core
  documents are present or planned, and no unresolved high-risk
  category was identified from the user's answers. Official
  verification may still be required.
- **Partial** -- important information or documents are missing, or
  one or more regulatory categories require checking.
- **Low** -- essential commercial/technical information is missing, or
  a significant regulatory risk is unresolved. Shipping now may create
  clearance delay, storage, or cost exposure.

Computed deterministically in `build-readiness-result.js` from: any
high-severity regulatory risk, the count of missing core fields, and
whether the two most essential documents (commercial invoice, packing
list) are both missing.

## 5. Required disclaimer

Every result includes, verbatim:

> על בסיס המידע שנמסר, FreighTime מציג בדיקת מוכנות תפעולית בלבד.
> התוצאה אינה מהווה סיווג מכס סופי, אישור יבוא, קביעה רגולטורית,
> ייעוץ משפטי או תחליף לבדיקה מול רשות מוסמכת או איש מקצוע.

## 6. Privacy and no-storage model

- No form field value is ever sent to FreighTime's backend or to any
  external service -- the entire assessment runs client-side.
- No form field value is written to `localStorage`, `sessionStorage`,
  cookies, `IndexedDB`, or the URL (query parameters or otherwise).
- No form field value is logged to the console.
- The "copy summary" action builds a plain-text summary
  (`build-readiness-summary.js`) that deliberately excludes supplier
  country/contact details, invoice value/currency, and any hidden
  diagnostic data -- the user must copy and send it manually; nothing
  is transmitted automatically.
- Resetting the assessment when substantial data has been entered asks
  for confirmation (a native `confirm()`, not a custom modal); starting
  a new assessment from the result screen does not, since a completed
  assessment is a natural stopping point.

## 7. Official-source links

Official-source links are static, hardcoded, category-based (Customs
Tariff, Free Import Order equivalent, Standards Institution, Ministry
of Health, Ministry of Transport, Ministry of Agriculture, Ministry of
Environmental Protection, Ministry of Communications), open with
`target="_blank" rel="noopener noreferrer"`, never carry any user input
in the URL, and are only shown when the user's own answers make that
regulator category potentially relevant. Every link is labeled "נדרש
לבדוק" ("requires checking"), never "נדרש אישור" ("approval
required"), since V1 never has enough verified information to assert
that a permit or approval is required.

## 8. Unsupported claims removed during this task

The public site previously displayed:

- "500+ משלחים ועמילי מכס ברשת" (a "500+ forwarders/brokers in our
  network" statistic)
- "רשת נותני שירות מאומתת" ("verified service-provider network")
- A "התייעצות עם אנשי מקצוע" section with non-functional "קבעו שיחה"
  ("schedule a call") buttons implying a working professional-booking
  system

None of these described an implemented capability. All were removed
outright, with no invented replacement number or claim. See
`tests/readiness/product-readiness.test.js` test 22 for the automated
check that they do not reappear.

**Known remaining review item (not acted on in this task):** the
"מסמכים שתמיד צריך למצוא מהר" (`#docs`) section still presents
document-template "download" cards with no real file behind them, and
the footer's "500+"/network claims were the ones explicitly targeted
for removal -- the `#docs` section's non-functional downloads were not
in this task's named scope and are flagged for a future product-owner
decision rather than acted on unilaterally.

## 9. Architecture

```
js/import-readiness/
  readiness-schema.js               field IDs and enumerated option constants
  normalize-readiness-input.js      raw form state -> safely-typed frozen input
  document-rules.js                 explainable document checklist
  regulatory-risk-rules.js          explainable, deterministic risk rule engine
  classification-question-rules.js  classification-context questions (never an HS code)
  build-readiness-result.js         orchestrates the above into one result + readiness level
  build-readiness-summary.js        privacy-safe plain-text copy summary
  import-readiness-controller.js    DOM binding: steps, conditional questions, rendering
```

Every rule module is pure, deterministic, DOM-free, network-free,
storage-free, and independently testable -- following the same
architectural convention already used by `js/tracking/*-registry.js`
and `ocean-container-routing.js`. The controller binds only within an
explicitly supplied root element (never queries `document` globally)
and renders exclusively via `createElement`/`textContent` -- never
`innerHTML`.

## 10. Retained product capabilities

- Tracking search (`#tracking`): container/AWB/EMS/UPU S10/UPS/Roadie
  identification and validation, container-owner context, safe
  official routing, copy/reset -- unchanged.
- CBM calculator and air-freight chargeable-weight calculator
  (`#tools`) -- unchanged.

## 11. Running tests locally

```bash
node --test "tests/tracking/*.test.js" "tests/tools/*.test.js" "tests/readiness/*.test.js" "tests/import-readiness/*.test.js"
```

## 12. Recommended V2

- Cost-planning calculator (Phase H of the governing task), deferred
  from V1 to keep the core readiness product manageable in scope.
- Deeper classification-question coverage for additional product
  categories, added the same way the current four conditional blocks
  (electrical/battery/wireless/food-contact) were added -- as
  additional small, named, testable rule entries, not a redesign of
  the engine.

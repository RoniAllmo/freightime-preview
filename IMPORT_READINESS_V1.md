# FreighTime Import Readiness -- Scenario Routing

Status: implemented. This document describes FreighTime's primary Hero
experience: a short, entirely local, scenario-routed assessment that
helps a user find the right import-preparation path and understand
what to check before purchasing, shipping, or clearing goods.

**Update (product-owner correction):** the original Import Readiness
Check V1 (a single long, generic technical questionnaire ending in a
universal high/partial/low readiness score) has been replaced. It
asked technical questions too early and created the impression that
answering them determined customs classification or import legality.
This document describes the corrected product; nothing below refers to
the removed questionnaire or score.

## 1. Why it changed

Direct product-owner and customs-operations feedback identified three
problems with the original flow:

1. It treated every visitor as a first-time commercial importer, even
   personal-use shoppers and experienced import operations.
2. It asked technical questions (voltage, power, material composition,
   battery chemistry, wireless frequency) before understanding who the
   user was or what they actually needed -- and presented those
   answers as if they let FreighTime determine classification or
   legality.
3. It ended in a single "readiness score," which read as a legal or
   customs-clearance signal rather than an operational to-do list.

## 2. The corrected entry flow

Every assessment (except the shipment-problem shortcut, see Section 4)
begins with exactly three questions, in this order:

1. **"האם מדובר ביבוא אישי או ביבוא מסחרי?"** (personal / commercial /
   still not sure) -- with a short, honest explanation of each, and the
   required disclaimer that this classification is a planning aid, not
   a legal determination (`js/import-readiness/import-type-routing.js`).
   Selecting "still not sure" asks three short clarifying questions
   (for sale/distribution? for business use? personal/family use
   only?) and shows a leaning message -- never a final determination.
2. **"האם זה היבוא הראשון שלך?"** -- first-time / prior importer /
   ongoing operation / planning-only.
3. **"מה המוצר שברצונך לייבא?"** -- product name, short commercial
   description, intended use, plus optional declarations (technical
   spec / catalog / photos / supplier invoice / supplier-provided HS
   code available) and an optional HS-code field. No file upload.

Answers 1 and 2 route the user into one of five scenarios
(`js/import-readiness/experience-routing.js`); answer 3's product
identity carries into whichever scenario is selected.

## 3. The five scenarios

| Scenario | Who | Module |
|---|---|---|
| Personal import | Selected "personal" import type | `personal-import-rules.js` |
| First commercial import | Commercial/uncertain + first-time or planning-only | `first-commercial-import-rules.js` |
| Existing importer | Commercial/uncertain + prior importer | `existing-importer-rules.js` |
| Established operation | Commercial/uncertain + ongoing operation | `established-operation-rules.js` |
| Shipment problem | Explicit shortcut from the intro screen | `shipment-problem-rules.js` |

Each scenario asks only the follow-up questions it actually needs and
returns a result built from the same shared "action map" structure
(`build-action-map.js`) -- but the sections shown differ by scenario
(see Section 5). No scenario forces a user through content meant for a
different situation: an established operation is never shown
first-time educational content, and a personal-import user is never
shown a commercial document checklist.

### Personal import

Stays short: personal/family use, quantity, approximate value, country
of origin (if known), shipment method, and whether the product belongs
to a sensitive category (food, cosmetics, health, wireless, vehicle,
agriculture, chemical, electrical, battery, toy, none known, not
sure). Never claims personal import is automatically exempt from
standards, permits, taxes, restrictions, labeling, or inspection --
see `PERSONAL_IMPORT_NOT_AUTOMATICALLY_EXEMPT_NOTE`.

### First commercial import

Educational and operational: explains which professional inputs
(technical spec, material composition, electrical data, model,
photos) are commonly relevant to classification and regulation
review, without claiming they determine it, and lists what to prepare
before ordering and before shipping.

### Existing importer

One question -- "במה תרצה להתמקד?" (new product / new supplier /
classification / regulation / supplier documents / taxes and costs /
Incoterms / sea or air shipping / clearance delay / additional
charges / other) -- and a focused result on that single concern only.

### Established operation

"מה מטרת הבדיקה?" -- audit-style review areas (existing-classification
audit, regulation/permit audit, document-process audit,
penalty/shortfall exposure, storage/demurrage charges, sale-terms
review, insurance-coverage review, supplier-process review,
brokerage/clearance-process review, legal advice, other). Never a
readiness score, never a compliance certificate. Legal-advice and
insurance-coverage-review selections route straight to the
legal/insurance boundary message (`LEGAL_OR_INSURANCE_BOUNDARY_MESSAGE`)
-- FreighTime never gives legal or insurance advice directly.

### Shipment problem

Reached via an explicit shortcut on the intro screen
("יש לי כבר משלוח בדרך ונתקלתי בבעיה"), bypassing the three primary
questions entirely -- a shipment problem is rarely well-served by first
asking whether the import is personal or commercial. Asks "מה הבעיה
המרכזית?" (missing document, missing permit, customs inspection,
classification/value dispute, clearance delay, storage, demurrage,
detention, penalty, unresponsive supplier/carrier, other) plus a short
set of follow-ups (shipment mode, current stage, issuing party,
deadline, missing documents, written notice, accumulating costs). Uses
careful, non-committal wording throughout ("בהתאם למידע הקיים בשלב
זה...", "נדרש לבדוק את בסיס החיוב מול הגורם הרלוונטי...") -- never
admits fault or assigns liability. No file upload.

## 4. The compact-result principle

**Update (result-focus correction):** the scenario-routed flow above
was already an improvement, but the *result* it produced was still too
long, repetitive, and generic -- a page and a half restating the same
conclusion (professional classification/regulation review) across
separate "review purpose," "audit points," "possible exposure,"
"documents and sample," "recommended professional," and "official
sources" sections, plus a long list of parallel service CTAs. A
product-owner correction replaced that sectioned model with one flat,
compact result. Nothing below describes the removed sectioned model.

**More information is not automatically more useful.** The primary
result must answer, within a few seconds: what should I do, why, what
should I prepare, who should review it, and is there urgency.
Everything else is secondary and collapsed by default.

Every scenario's `build*Result` function returns exactly this flat
shape (`build-action-map.js`'s `buildCompactResult`):

```
routeLabel          short route context, one line
primaryAction       the one thing to do -- exactly one per result
primaryReason       one short reason, only when it changes the decision
preparationItems    up to 5 relevant items -- never a generic
                     every-document checklist
urgency             null, or a short urgency label ("דחוף" / "דורש תשומת לב")
primaryCta          {id, label} | null
secondaryCta        {id, label} | null -- only when materially different
secondaryDetails    { points, officialSources, note } -- collapsed by default
visibleDisclaimer   one concise sentence, always shown
extendedDisclaimer  longer explanation, shown only inside the collapsed detail
```

**Density limits** (enforced by `tests/import-readiness/result-density.test.js`):
preparation items capped at 5; at most one primary and one secondary
CTA, and they must be materially different; the default-visible text
(excluding the collapsed detail) targets 60-120 Hebrew words, with 160
as the acceptable ceiling for ordinary cases -- urgent shipment
problems may run longer to explain a deadline or accumulating cost,
but stay under a safe upper bound. The limit is met by removing
repetition and choosing one conclusion, never by removing safety
information.

**Recommendation priority** (`decideScenario` + each scenario's own
focus/purpose lookup table) is deterministic: an urgent shipment
action always wins; a legal or insurance concern routes straight to
the professional boundary and never gets parallel classification/
freight/process CTAs; classification and regulation concerns are
deliberately merged into one "בדיקת סיווג ורגולציה משולבת"
recommendation, since this product cannot cleanly separate them
without more information than an online check can gather.

**Progressive disclosure**: exactly one native `<details>` element per
result, labeled "מידע נוסף והסברים", holding the extended disclaimer,
any extra explanatory points, and official-source links. The primary
result is fully understandable without opening it. Urgent warnings are
never hidden inside it.

**Official sources** are useful but never dominate the result -- they
live only inside the collapsed detail, labeled "נדרש לבדוק" (never
"נדרש אישור"), and only for regulator categories the user's own
answers actually triggered.

### Charging-cable acceptance case

The required acceptance case (a synthetic mobile-phone charging cable,
commercial import, existing importer, focus on regulation/import
approvals, no technical spec yet) is asserted verbatim in
`tests/import-readiness/charging-cable-acceptance.test.js` and
confirmed in real-browser validation at 84 default-visible words, with
the primary action visible without scrolling at desktop width:

- Route: `יבוא מסחרי קיים — בדיקת סיווג ורגולציה למוצר`
- Primary action: `יש לתאם בדיקה מקצועית של סיווג המכס ודרישות היבוא מול מסווג מכס או מומחה רגולציה, לפני הזמנה או שילוח.`
- Reason: mentions product type, use, connections/structure, and
  technical spec, and states there is not enough information for a
  final determination in the online check.
- Preparation (exactly 5): תיאור מסחרי מלא, מפרט טכני או קטלוג, תמונות
  המוצר והחיבורים, דגם או מק"ט, חשבון ספק (אם קיים).
- Primary CTA: `בדיקת סיווג ורגולציה`.

Detailed professional analysis belongs in the professional
consultation itself, never in the default automated result.

## 5. The classification and professional-review boundary

FreighTime may identify which additional details are commonly relevant
to classification, but never claims a technical detail alone
determines it:

> פרטים כגון שימוש המוצר, אופן הפעולה, הרכב חומרים, נתוני חשמל, דגם,
> מפרט ותמונות עשויים להיות חשובים לצורך בדיקת סיווג המכס, חוקיות
> היבוא והרגולציה. המשמעות של כל פרט תלויה במוצר ובמסמכים ויש לבחון
> אותה מקצועית.

When classification review is indicated:

> על בסיס המידע שנמסר, נדרשת בדיקת סיווג מקצועית. אין מספיק מידע
> לקביעת פרט מכס סופי במסגרת הבדיקה המקוונת.

A user-provided HS code is echoed exactly as entered, labeled
user-provided, never validated as final, with a recommendation to
verify before filing or shipping.

Professional roles referenced are always specific and real job
functions, never an invented network: מסווג מכס מקצועי, עמיל מכס
מורשה, מומחה רגולציה, גורם מקצועי מוסמך, עורך דין, יועץ ביטוחי
(`PROFESSIONAL_ROLES` in `build-action-map.js`).

## 6. Required disclaimer

**Update:** the disclaimer is now split into two, so the always-visible
default result stays short:

Every result shows, always visible, one concise sentence
(`visibleDisclaimer`):

> התוצאה היא הכוונה תפעולית ראשונית ואינה מהווה סיווג מכס, קביעה
> רגולטורית, ייעוץ משפטי או אישור יבוא.

The longer explanation appears only inside the collapsed secondary
detail (`extendedDisclaimer`):

> FreighTime אינו קובע סיווג מכס סופי, חוקיות יבוא, החלטה רגולטורית,
> אישור יבוא, קביעת מס, ייעוץ משפטי או ייעוץ ביטוחי, ואינו מבטיח
> שחרור או אישור יבוא של הטובין. פרטים כגון שימוש המוצר, אופן הפעולה,
> הרכב חומרים, נתוני חשמל, דגם, מפרט ותמונות עשויים להיות חשובים
> לצורך בדיקת סיווג המכס והרגולציה, אך משמעותם תלויה במוצר ובמסמכים
> ויש לבחון אותה מקצועית.

Neither disclaimer is ever repeated in more than one place.

## 7. Privacy and no-storage model (unchanged)

No form field value is ever sent to FreighTime's backend or any
external service, written to browser storage, logged, or added to the
URL. The "copy summary" action builds a plain-text summary
(`build-scenario-summary.js`) the user must copy and send manually.
Resetting after substantial data entry asks for confirmation via a
native `confirm()`.

## 8. Official-source links (unchanged principle)

Static, hardcoded, category-based, `target="_blank" rel="noopener noreferrer"`,
never carry user input, only shown when a scenario's answers make that
regulator category potentially relevant, labeled "נדרש לבדוק" (never
"נדרש אישור").

## 9. Architecture

```
js/import-readiness/
  scenario-schema.js               field IDs, scenario keys, action-status labels, option constants
  import-type-routing.js           personal/commercial/uncertain routing + clarification questions
  experience-routing.js            (import type, experience) -> scenario
  normalize-readiness-input.js     raw form state -> safely-typed frozen input
  personal-import-rules.js         personal-import scenario result
  first-commercial-import-rules.js first-commercial-import scenario result
  existing-importer-rules.js       existing-importer scenario result
  established-operation-rules.js   established-operation scenario result
  shipment-problem-rules.js        shipment-problem scenario result
  build-action-map.js              shared result-composition helpers + boundary language
  build-scenario-summary.js        privacy-safe plain-text copy summary
  import-readiness-controller.js   DOM binding: branching step flow, conditional routing, rendering
```

Every rule module is pure, deterministic, DOM-free, network-free,
storage-free, and independently testable. The controller binds only
within an explicitly supplied root element and renders exclusively via
`createElement`/`textContent` -- never `innerHTML`.

## 10. Retained product capabilities

- Tracking search (`#tracking`): container/AWB/EMS/UPU S10/UPS/Roadie
  identification and validation, container-owner context, safe
  official routing, copy/reset -- unchanged.
- CBM calculator and air-freight chargeable-weight calculator
  (`#tools`) -- unchanged.

**Update:** the `#docs` section ("מסמכים שתמיד צריך למצוא מהר") was
removed. Its four "download" cards had no real file behind them and no
`href` or click handler -- a non-functional control that performed no
action, flagged as a product-owner review item in an earlier task and
now removed per this task's Phase R. No placeholder file was
generated; the nav and footer links pointing to it were removed with
it.

## 11. Running tests locally

```bash
node --test "tests/tracking/*.test.js" "tests/tools/*.test.js" "tests/readiness/*.test.js" "tests/import-readiness/*.test.js"
```

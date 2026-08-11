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

## 4. What replaced the readiness score

There is no more universal high/partial/low score. Every result is an
**action map**: each item is labeled with one of seven action
statuses that classify the *action*, never the user
(`ACTION_STATUS_LABELS` in `scenario-schema.js`):

- ידוע לפי התשובות
- נדרש להשלים מידע
- נדרש לבדוק
- מומלץ לבצע לפני הזמנה
- מומלץ לבצע לפני שילוח
- דורש בדיקה מקצועית
- דחוף

The personal/first-commercial/existing-importer scenarios show
whichever of these sections are non-empty: מה כבר ידוע, מה חסר, מה
מומלץ לבדוק, מסמכים שכדאי להכין, לפני הזמנה, לפני שילוח, סיכונים
אפשריים, הצעד הבא, מקורות רשמיים, מתי נדרשת בדיקה מקצועית.

The established-operation scenario instead shows: מטרת הבדיקה, נקודות
לביקורת, חשיפות אפשריות, מסמכים ומדגם לבדיקה, גורם מקצועי מומלץ, הצעד
הבא.

The shipment-problem scenario instead shows: רמת דחיפות, נתונים
ומסמכים לאיסוף, ציר הזמן שיש לשחזר, הגורם שמולו נדרש לבדוק, עלויות
שעלולות להמשיך להצטבר, פעולה מומלצת, מתי להסלים.

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

Every result includes, verbatim:

> המסלול והצעדים המוצגים הם כלי עזר תפעולי בלבד. FreighTime אינו קובע
> סיווג מכס סופי, חוקיות יבוא, החלטה רגולטורית, אישור יבוא, קביעת מס,
> ייעוץ משפטי או ייעוץ ביטוחי, ואינו מבטיח שחרור או אישור יבוא של
> הטובין.

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

## 11. Running tests locally

```bash
node --test "tests/tracking/*.test.js" "tests/tools/*.test.js" "tests/readiness/*.test.js" "tests/import-readiness/*.test.js"
```

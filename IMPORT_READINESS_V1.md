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

**Update (product-owner acceptance correction, 2026-08):** the two
entry points (Hero + a duplicate `#readiness` intro block repeating
the same heading, explanation, and route cards) were consolidated into
one -- the route-entry choice cards now live only in the Hero, and
selecting one continues directly into the same assessment workspace.
"The intro screen" referenced throughout this document now means the
Hero. A dedicated professional-referral component was also added to
the result (Section 4a). The public tracking/identifier-validation
utility described in the old Section 10 was removed in full -- see
Section 10 for what that means going forward.

**Update (Hero visual correction, 2026-08):** the two entry points
described just above (`readinessStartButton` / `readinessProblemShortcutButton`)
are unchanged in behavior and still route into exactly the same
assessment workspace described in this document, but their visual form
changed: the Hero's two `.choice-card` route cards (each with an icon,
title, and subtitle) were replaced by one visually dominant primary CTA
button ("התחלת בדיקת יבוא") and one visually subdued secondary text
action ("יש לי בעיה במשלוח קיים"), inside a single unified image-led
Hero composition instead of a split headline/white-card layout.
Activating either control now also smooth-scrolls to and moves focus
onto the first revealed question, for predictable keyboard/screen-
reader landing -- purely presentational, it does not change routing,
validation, or result content. See `DESIGN_SYSTEM_V1.md` §3/§8 for the
full visual specification and approved copy.

**Update (Hero-to-assessment transition fix, 2026-08 acceptance
finding):** a product-owner review found two defects in the reveal
described just above: (1) the `#readiness` section reserved its full
section padding as an empty, unexplained gap below the Hero even while
completely inactive, because only the inner form/result were
`hidden` -- the section wrapper itself was not; and (2) the scroll
target for "smooth-scrolls to ... the first revealed question" was the
active `<fieldset>` itself, whose progress indicator and step-indicator
sit *above* it in the DOM, so scrolling the fieldset to the top of the
viewport pushed those above the top edge and, combined with no
sticky-header offset, could also leave the question's own heading
partly covered by the header. Both are now fixed:

- The `#readiness` section itself now carries the native `hidden`
  attribute and is toggled in lockstep with the form/result by the
  controller (`elements.section`), so it reserves zero layout height
  whenever nothing inside it is visible -- including after a full
  reset back to nothing shown. No placeholder box or second
  assessment-intro section was added; the next real section (`#tools`)
  simply follows the Hero at its own normal top padding once the
  orphaned section padding is gone.
- The scroll target is now the whole `<form id="readinessForm">`
  (heading/progress + the active question together), not the active
  fieldset alone, with `scroll-margin-top` set at call time from the
  sticky header's live `getBoundingClientRect().height` plus a fixed
  24px breathing-room gap -- so the offset adapts to the header's own
  mobile/desktop height change instead of a single hardcoded pixel
  value. `scrollIntoView({ block: 'start', behavior })` is used, never
  `'center'`/`'nearest'`. Focus still lands on the active question's
  `<legend>`, now with `{ preventScroll: true }` so it cannot trigger a
  second, conflicting native scroll on top of the intentional one.
  `prefers-reduced-motion: reduce` is honored per call via
  `matchMedia` (`behavior: 'auto'` instead of `'smooth'`), landing on
  the identical final position immediately rather than animated.
  See `DESIGN_SYSTEM_V1.md` §8 for the corresponding anti-pattern this
  fix closes.

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

## 4a. Professional referral

**Update (product-owner acceptance correction):** direct product-owner
review found that "who to contact and how" was not clear enough in the
result. Every scenario's `build*Result` function now also returns a
`professional` field (`{type, reason, ctaLabel}` -- see
`PROFESSIONAL_REFERRAL` in `build-action-map.js`), rendered by the
controller as a single, visually distinct "מי צריך לבדוק?" block
positioned right after the primary recommendation + reason and before
the preparation checklist -- never buried below it, never inside the
collapsed `<details>`. It always names a concrete professional type
(WHO), states one concrete reason (WHY), and offers one dedicated,
action-verb CTA (WHAT TO CLICK) that navigates to `#contact`. It never
falls back to a vague phrase ("מומלץ לפנות לגורם מקצועי", "המשך עם איש
מקצוע", "גורם מקצועי מומלץ") and never renders more than one
professional/CTA pairing per result. This is a presentation-layer
addition only -- it does not change which recommendation fires; the
existing rule-selection logic in each `*-rules.js` module and
`build-action-map.js` is unchanged.

Per-scenario mapping:

| Scenario / focus | Professional (WHO) | CTA label |
|---|---|---|
| Existing importer -- new product / classification / regulation & permits | מסווג מכס או מומחה רגולציה | לתיאום בדיקת סיווג ורגולציה |
| Existing importer -- new supplier / supplier documents / incoterms | מסווג מכס, עמיל מכס או גורם מקצועי המטפל במסמכי יבוא | לתיאום בדיקת מסמכים |
| Shipment problem -- missing document | מסווג מכס, עמיל מכס או גורם מקצועי המטפל במסמכי יבוא | לתיאום בדיקת מסמכים |
| Established operation -- legal advice | עורך דין המתמחה בתחום הרלוונטי | פנייה לייעוץ משפטי |
| Established operation -- insurance-coverage review | יועץ ביטוחי המתמחה בהובלה ויבוא | פנייה לייעוץ ביטוחי |
| Shipment problem -- urgent (storage / demurrage / detention / missing permit / accumulating costs) | עמיל מכס או גורם תפעולי המטפל בשחרור המשלוח | בדיקת המקרה בדחיפות |
| First commercial import | מסווג מכס או מומחה רגולציה | לתיאום בדיקת סיווג ורגולציה |
| Personal import | גורם מקצועי המטפל בדרישות יבוא אישי (עמיל מכס או הרשות הרלוונטית) | לבדיקת דרישות המוצר |
| All other existing-importer/established-operation focus areas | closest analogous professional consistent with that focus area's existing `primaryCta`/`primaryAction` (e.g. a customs broker for audit/exposure/brokerage-process purposes) | matching action-verb CTA |
| Shipment problem -- other non-urgent types | the party the primary action already names (e.g. "עמיל המכס", "חברת הספנות") | "לתיאום " + the existing CTA label |

Test coverage: `tests/import-readiness/professional-referral.test.js`.

## 4b. Professional referral coverage expansion (issue families E-M)

**Update (coverage expansion):** the shipment-problem scenario's flat
`SHIPMENT_PROBLEM_TYPE` enum was audited against the full range of
common import/customs/shipping/cargo-damage/insurance/legal/
documentation/regulatory/additional-charge scenarios a shipment
already in progress can run into. FreighTime's core position is: **"FreighTime
מסייע לזהות את סוג הגורם המקצועי שעשוי להתאים למקרה."** -- never
"FreighTime קובע למי האחריות."

### Audit findings

The existing five problem types covering storage/demurrage/detention
and document/permit/inspection/dispute issues already routed to a
concrete professional, but five real-world issue families had no
dedicated routing and fell back to generic wording: cargo/container
damage, cargo shortage/loss, a significant customs penalty or deficit
demand (as opposed to a plain classification disagreement), marine/
cargo insurance, and carrier/forwarder/terminal disputes that escalate
past an operational fix. Two structural gaps: (1) every "urgent"
shipment problem collapsed onto one interchangeable "עמיל מכס או גורם
תפעולי" referral regardless of whether the real issue was legal,
insurance, or operational; (2) there was no concept of a *supporting*
professional distinct from the primary one, so a case needing both a
lawyer and a classifier, or an insurer and a surveyor, could only show
one.

### Issue-family taxonomy delivered

`ISSUE_FAMILY` in `scenario-schema.js`: `customs_clearance`,
`customs_dispute`, `cargo_damage`, `cargo_shortage_or_loss`,
`storage_demurrage_detention`, `additional_charge`,
`carrier_or_forwarder_dispute`, `insurance`, `documentation`,
`unclear`. Progressive disclosure: the problem-type `<select>` is
grouped by family with `<optgroup>`, and only the one follow-up
question group relevant to the selected problem type is shown
(`ir-conditional-group[data-show-for]`, toggled by
`updateProblemDetailsVisibility()` in the controller) -- never every
sub-scenario's questions at once.

### Professional-category registry

`js/import-readiness/professional-category-registry.js` defines every
professional category FreighTime can route to -- id, Hebrew name,
scope, dedicated CTA label, and a disclaimer category (legal /
insurance / customs / operational): customs classifier, licensed
customs broker, import-regulation specialist, freight forwarder,
shipping-line/carrier claims department, airline claims department,
courier claims department, terminal/warehouse claims representative,
marine-insurance broker, cargo insurer, marine surveyor, customs-and-
import-taxation lawyer, maritime/transport/shipping lawyer, insurance-
claims lawyer, general commercial lawyer, insurance adviser,
accountant/tax adviser, the relevant government regulator, a standards/
conformity specialist, and a hazardous-goods specialist. Never a named
person or business; never a claim of a verified network.

### Primary/supporting model

`buildCompactResult()` (`build-action-map.js`) gained additive,
backward-compatible fields: `issueFamily`, `issueType`,
`supportingProfessional` (zero-or-one), `immediateActions` (up to 5,
distinct from the single-sentence `primaryAction`),
`notificationParties` (rendered as a plain pill list -- "גורמים שכדאי
לעדכן" -- never as extra professional cards), `deadlineWarning`
(always conditional -- "אם קיים מועד..." / "ייתכנו מועדים..." -- never
an invented date), and `accumulatingCostWarning`. Every pre-existing
scenario is unaffected: these fields default to `null`/`[]` and every
problem type that predates this expansion (`missing_document`,
`missing_import_permit`, `customs_inspection`, `classification_dispute`,
`value_dispute`, `clearance_delay`, `storage`, `demurrage`,
`detention`, `penalty_or_additional_charge`, `supplier_not_responding`,
`carrier_not_responding`, `other`) keeps its exact prior wording,
urgency, and CTA -- storage/demurrage/detention only additionally gain
a licensed-customs-broker *supporting* referral when the caller
indicates customs clearance is involved in the delay.

### Family rule modules

- `cargo-damage-rules.js` -- families F (cargo/container damage) and G
  (shortage/loss). Damage discovered after discharge always routes
  primary to "סוכן ביטוח ימי או מבטח המטען", supporting to "שמאי ימי",
  with a fixed evidence-preservation immediate action and a
  conditional short-notice-period deadline warning. A safety-risk flag
  overrides everything: primary routes to a hazardous-goods specialist
  with safety-first wording and no technical handling instructions.
  Shortage/loss without insurance routes to the freight forwarder
  instead.
- `customs-dispute-rules.js` -- families B/E's penalty stage. A plain
  classification disagreement routes to a customs classifier/broker,
  never a lawyer. High financial exposure or held goods escalates the
  primary to the customs-and-import-taxation lawyer, with the
  classifier/broker as supporting -- never states the broker was
  negligent, never states the demand is valid or invalid.
- storage/demurrage/detention (family H) -- handled additively inside
  `shipment-problem-rules.js` (see above): customs-clearance
  involvement adds the licensed customs broker as supporting;
  accumulating costs always escalate urgency and add an
  `accumulatingCostWarning`.
- `insurance-rules.js` -- family J's seven sub-scenarios (notification
  of loss, damage assessment, coverage dispute, rejected claim,
  pre-shipment risk review, lack of insurance, underinsurance/
  deductible). Coverage-dispute and rejected-claim sub-scenarios route
  primary to the insurance-claims lawyer; every other sub-scenario
  stays with the insurance broker/insurer/surveyor/adviser. Never
  states a loss is or isn't covered, never states an exclusion
  applies.
- `carrier-dispute-rules.js` -- family I. Distinguishes an operational
  issue (routes to the freight forwarder), a formal claim (routes to
  the shipment-mode-specific claims department -- carrier/airline/
  courier), and a significant dispute or received legal notice (routes
  primary to the transport/maritime lawyer, supporting to the claims
  department). Never assigns fault or states a party breached the
  contract.

### Required disclaimers (family-specific, collapsed `secondaryDetails.note`)

- Legal routes: "FreighTime אינו מספק ייעוץ משפטי ואינו קובע אחריות.
  ההפניה נועדה לסייע בזיהוי סוג הגורם המקצועי המתאים."
  (`LEGAL_ROUTE_DISCLAIMER`)
- Insurance routes: "FreighTime אינו קובע כיסוי ביטוחי, חבות או
  זכאות לפיצוי. יש לבדוק את הפוליסה והנסיבות מול גורם ביטוחי או
  משפטי מתאים." (`INSURANCE_ROUTE_DISCLAIMER`)
- Customs disputes: "FreighTime אינו קובע את הסיווג הנכון, את תוקף
  דרישת המכס או את האחריות לטעות. נדרשת בדיקה מקצועית של המסמכים
  וההליך." (`CUSTOMS_DISPUTE_DISCLAIMER`)

### Five required acceptance cases (all shipped and tested)

1. Container cargo damage discovered after discharge at port → urgent,
   primary "סוכן ביטוח ימי או מבטח המטען", supporting "שמאי ימי",
   immediate actions include photograph/preserve/notify-without-delay,
   a conditional short-notice-period deadline warning, no liability
   conclusion.
2. Alleged broker misclassification + a large customs penalty/deficit
   demand → urgent, primary the customs-and-import-taxation lawyer,
   supporting the classifier/broker, immediate actions include
   preserve-notice/identify-deadline/collect-documents/avoid-
   admission/reconstruct-history, no negligence or liability
   conclusion.
3. Demurrage accumulating because a release document is missing →
   primary the freight forwarder/carrier operational contact,
   supporting the licensed customs broker (clearance involved), urgent.
4. An insurance company rejected a cargo-damage claim → primary the
   insurance-claims lawyer, supporting the insurance broker/surveyor.
5. First commercial import of a technically regulated product →
   primary the customs classifier/regulation specialist, no lawyer by
   default.

Test coverage: `tests/import-readiness/professional-referral-coverage.test.js`
(family routing, all 5 acceptance cases, liability/coverage/negligence
safeguards, deadline-invention safeguard, density bounds) and
`tests/import-readiness/import-readiness-controller.test.js` tests 26-32
(progressive disclosure, supporting-professional/immediate-actions/
notification-parties rendering, CTA/`#contact`-only safeguard,
edit/reset still work).

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

- CBM calculator and air-freight chargeable-weight calculator
  (`#tools`) -- unchanged.

**Update (product-owner acceptance correction):** the public tracking
utility ("מעקב ואימות מספר" -- container/AWB/EMS/UPU S10/UPS/Roadie
identification and validation, container-owner context, official
routing) was removed **in full**, not merely demoted. Product-owner
decision: FreighTime cannot return real operational tracking data
(destination, ETA, carrier, vessel/flight, latest event), so a
validate-only utility was not valuable enough to keep public. Removed:
the `#tracking` section and its search UI in `index.html`, the
`js/tracking/` module directory and every file in it (all fourteen
files were dependency-mapped first -- `js/tools/tools-controller.js`
only referenced them in comments, which were updated; nothing else
imported them), `tests/tracking/` and its tests, the nav/mobile-menu
link, the footer product link, and every "מעקב"/tracking-capability
sentence in the meta description, footer tagline, and this document.
No replacement or "coming soon" placeholder was added. This is a
historical record only; the utility is not a current capability.

**Update:** the `#docs` section ("מסמכים שתמיד צריך למצוא מהר") was
removed. Its four "download" cards had no real file behind them and no
`href` or click handler -- a non-functional control that performed no
action, flagged as a product-owner review item in an earlier task and
now removed per this task's Phase R. No placeholder file was
generated; the nav and footer links pointing to it were removed with
it.

## 11. Running tests locally

```bash
node --test "tests/tools/*.test.js" "tests/readiness/*.test.js" "tests/import-readiness/*.test.js"
```

# Product-family matrix guidance engine

## What this is

`data/FreighTime_Simple_Import_Requirements_Matrix.xlsx` is a workbook
authored and reviewed by FreighTime's product owner -- a qualified
customs professional -- listing product families the questionnaire
should recognize, and for each one, whether a positive regulatory
signal exists in six categories (standards, health umbrella, transport
or vehicle laboratory, communications, agriculture, other permit/
license).

**This workbook is professional guidance knowledge, not an official
legal database.** It is authoritative for *identifying that a positive
regulatory-family signal exists*; it is never a final customs
classification, a guaranteed exemption, or a substitute for a licensed
customs classifier, broker, or the relevant regulator.

## Interpretation rules

- **"כן"** in a regulatory column means: a positive import-legality or
  regulatory-check signal definitely exists for that product family
  and category, according to the product owner's professional
  knowledge. Converted to `true`.
- **"לבדוק"** means the family needs to be checked -- treated
  internally as **false**, a definite negative signal. It is *not*
  "unknown" or "pending," and no unresolved "לבדוק" status ever
  survives into the runtime registry.
- A `false` value is never shown publicly as "no approval required,"
  "exempt," "no standard applies," "import is permitted," or "no
  regulatory requirement exists." It means only: that category is not
  a positive signal for this family. Public results show **only**
  categories marked `true`.

## Health umbrella

The workbook's "משרד הבריאות" column is an intentional umbrella
category the product owner uses to group food, beverages, dietary
supplements, cosmetics, medical equipment, medical-claim products,
medicines, veterinary products, plant-protection products, pesticides,
and other health-related regulation. The engine supports an optional
internal subdomain (`מזון` / `תוספי תזונה` / `תמרוקים` / `ציוד רפואי` /
`תרופות` / `וטרינריה` / `הגנת הצומח` / `חומרי הדברה` / `תחום בריאות
אחר`) for future rules, but **the current workbook never supplies
one** -- every family's `optionalSubdomain` is `null`, and the public
wording stays conservatively generic ("משרד הבריאות") rather than
guessing a subdomain.

## Personal vs. commercial notes

Each family carries two independent note fields (`הערה ליבוא אישי`,
`הערה ליבוא מסחרי`). Only the note matching the user's selected import
type is shown:

- **Personal import**: shows `personalImportNote` when the matrix
  supplies one (e.g. "כמות לא מסחרית"). No quantity threshold or
  personal-import exemption is ever invented when the matrix is blank.
- **Commercial import**: shows `commercialImportNote` when supplied;
  when blank, uses the one approved generic sentence: *"יש לאמת את
  הדרישה, פרט המכס ומסלול האישור לפני ההזמנה או השילוח."* -- never an
  invented document or authority procedure.

A blank note never renders an empty subsection, and personal/
commercial sections are never shown identically when no distinct note
exists.

## Family identification

Identification is **local, conservative, and deterministic** (see
`js/import-readiness/product-family-identification.js`): a family
matches only when its own name or one of its curated, explicitly
reviewed aliases (`CURATED_ALIASES` in the generator script) appears as
a substring of the free text the questionnaire already collected
(product name, commercial description, intended use). No external AI,
no network call, no broad fuzzy scoring that could produce an unsafe
match.

- **Unique match** -> the family is used.
- **Multiple aliases match** -> currently treated the same as "no
  match": the matrix contributes nothing to the result rather than
  guessing between candidates. See "Known limitations" below -- the
  full multi-candidate confirmation UI described in the original task
  brief (a "האם זה נכון?" confirmation screen, a filtered up-to-three
  candidate list, and a category-first fallback for zero matches) is
  **not implemented in this increment**.
- **No match** -> the matrix contributes nothing; the existing
  questionnaire and its five detailed rules are completely unaffected.

This means the matrix, in its current form, **never adds a new
question** to the default questionnaire path -- it runs once, silently,
over text already collected, exactly like the existing keyword-hint
mechanism in `regulatory-signals/keyword-hints.js`.

## Question-minimization

The questionnaire is never turned into "one question per matrix
column." The system infers regulatory categories from the identified
family; it never asks "האם נדרש תקן?" / "האם נדרש משרד הבריאות?" / etc.
See `tests/import-readiness/product-family-matrix-render.test.js` test
1 for the regression guard.

## Positive-only public output

Only categories marked `true` (after suppression, see below) are ever
displayed. When a family has one positive category, it is shown
directly; when it has two or more, they are shown as one compact list
(`תחומי בדיקה רלוונטיים: ...`), never as one card per authority. See
`renderProductFamilyMatrixBlock` in `import-readiness-controller.js`,
which reuses the exact same visual pattern (and CSS classes) as the
existing detailed-rule signal card, so the premium result hierarchy is
unchanged.

## No-exemption boundary

When a family has no positive category at all, the result shows the
approved neutral pair:

> לא זוהה תחום חוקיות יבוא חיובי במטריצה עבור המשפחה שנבחרה.
> אין בכך אישור שהמוצר פטור מדרישות יבוא או מתנאים אחרים.

...plus one safe, universal verification route (customs
classification) so the user is never left with nothing actionable.
Every public string produced by this feature is covered by the shared
`scanForBannedAbsoluteClaims()` guard from
`regulatory-signals/language-safety.js`
(`tests/import-readiness/product-family-result.test.js` test 15,
`product-family-matrix-render.test.js` test 6).

## Professional routing

Each positive category maps to one primary (and at most one
supporting) professional referral drawn from the existing
`professional-category-registry.js` -- no new professional categories
were invented:

| Category | Primary | Supporting |
|---|---|---|
| תקינה (standards) | מומחה תקינה והתאמה טכנית | מסווג מכס מקצועי |
| משרד הבריאות (health umbrella) | מומחה רגולציה ליבוא | -- |
| משרד התחבורה / מעבדת רכב | מעבדת רכב מוסמכת | מסווג מכס מקצועי |
| משרד התקשורת (communications) | הרשות הרגולטורית הרלוונטית | מסווג מכס מקצועי |
| משרד החקלאות (agriculture) | הרשות הרגולטורית הרלוונטית | -- |
| אישור / רישיון אחר (other permit) | הרשות הרגולטורית הרלוונטית | -- |

When a family has multiple positive categories, only the
highest-priority category's professional pairing is shown (never one
referral per category), matching the matrix's own column order as the
operational-priority order.

## Existing-rule reconciliation

The five existing expert-approved detailed rules
(`mains-connected-electrical-product`, `plastic-direct-food-contact`,
`polymer-coated-direct-food-contact`, `glass-food-contact-vessel`,
`vehicle-installed-product`) remain the single source of truth for
their product families. `product-family-reconciliation.js` maps each
rule id to its matrix family id and the regulatory category that
rule's own card already covers publicly. When a result already
includes one of these rules' cards, the matrix:

- **suppresses** that category so it is never shown a second time, and
- returns **no section at all** if every one of that family's positive
  categories is already covered (rather than showing a contradictory
  "no positive signal" message next to a card that already shows one).

All five of these families happen to be exactly the five workbook rows
marked `מענה במערכת = קיים` ("existing"), confirming the reconciliation
mapping is complete and correct for the current workbook.

## Coverage ("מענה במערכת")

`currentSystemCoverage` (`existing` / `partial` / `missing`) is used
only internally to decide whether the matrix defers entirely to an
existing rule, adds to partial existing logic, or is the sole source
for a family with no detailed rule yet. The words "active," "partial,"
"missing," "matrix row," and "registry status" are never shown to the
user -- they see only the resulting content.

## Privacy

Family matching runs entirely in the browser, over text already
entered into the form. No product description, family selection, or
regulatory result is ever transmitted, stored, placed in the URL, sent
to analytics/tracking, or sent to an external AI or government query.
See `tests/import-readiness/product-family-matrix-render.test.js` test
5 for the static guard (no `fetch`/`XMLHttpRequest`/`WebSocket`/
`localStorage`/`sessionStorage`/`history.pushState`/`document.cookie`
reference anywhere in the new modules).

## Accessibility

The matrix result renders using the same native, semantic markup as
the existing regulatory-signal card (`<section>`, `<h3>`, `<p>`,
`<ul>`) -- no new custom widgets, no color-only state, and it inherits
the existing result region's `aria-live="polite"` announcement,
reduced-motion behavior, and RTL layout unchanged.

## Update workflow

1. The product owner edits `data/FreighTime_Simple_Import_Requirements_Matrix.xlsx`
   (must keep the sheet name "דרישות יבוא" and the twelve existing
   column headers, in order).
2. The updated workbook is placed at that same path in the repository
   (or uploaded and copied there for a development session).
3. A developer runs the conversion command:
   ```
   python3 scripts/generate_product_family_matrix.py
   ```
   This validates every row (unsupported values, malformed rows,
   duplicate family names all fail the run loudly) and regenerates
   `js/import-readiness/product-family-matrix.js` deterministically --
   the same workbook content always produces byte-identical output.
4. The generated registry diff is reviewed like any other code change.
5. `node --test` (run with no path arguments, from the repository root -- the canonical command, also used by CI) is run.
6. A PR is opened.
7. The product owner validates the public wording before the PR is
   merged.

The conversion script requires `openpyxl` (`pip install openpyxl`) and
runs only at development time -- it is never invoked from the browser,
and no Excel-parsing library is part of the production runtime.

## Product-owner acceptance fixes (second pass)

A round of real public-site testing surfaced seven defects, fixed as
follows (matrix content and interpretation rules unchanged throughout):

1. **Personal-import quantity safeguard -- a clarification question,
   not a quantity trigger.** The existing (previously unused) "כמות"
   field on the personal-import route was relabeled "כמות משוערת" with
   supporting text, changed to `type="number" min="1" step="1"`
   (accessible native rejection of invalid input; blank/unknown always
   allowed). An earlier pilot version of this feature compared the
   entered quantity against a number (first a general 20-unit
   threshold, then an exact match against 100) to decide whether to
   show a cautious warning. Both were replaced: the product owner's
   "לק ג'ל, quantity 100" acceptance case was an EXAMPLE proving a
   personal-import shipment can warrant a commercial-character review,
   not approval of any specific number as a trigger. There is now no
   numeric quantity trigger anywhere in this feature. Instead, for
   personal import only, when any positive whole-number quantity is
   entered AND the identified family is on the explicit,
   product-owner-maintained sensitive-family list
   (`personal-use-clarification.js`'s `SENSITIVE_FAMILY_IDS` -- for
   this controlled pilot: cosmetics/תמרוקים ובשמים only), the live
   focused-checks phase asks one question: "האם המוצרים מיועדים
   לשימוש אישי שלך בלבד, ללא מכירה, חלוקה או שימוש עסקי?" (כן / לא /
   לא בטוח). Each answer produces its own exact approved cautious
   sentence -- never a claim that the quantity is commercial, that a
   legal threshold applies, that the shipment qualifies for personal
   import, that it is exempt, or that import is approved. This
   question reuses the exact same scheduler, shared answer store, and
   global question budget as the five detailed regulatory-signal
   questions (see `PERSONAL_USE_CLARIFICATION_RULE` in
   `personal-use-clarification.js`) rather than being a separate
   mechanism. Never asked for commercial import; blank quantity never
   asks it either.
2. **Fresh-eggs / food-of-animal-origin recognition.** Added curated
   aliases (ביצים, ביצים טריות, ביצי מאכל, מוצרי ביצים) to the existing
   "מזון מן החי" family -- no new family, no reinterpretation.
3. **Walkie-talkie / communications recognition.** Added curated
   aliases (ווקי טוקי, מכשיר קשר, מכשירי קשר, רדיו דו כיווני, מקמ"ש,
   walkie talkie, two-way radio, case-insensitive) to the existing
   "מוצר אלחוטי, Wi-Fi או Bluetooth" family.
4. **Vehicle-lighting aliases** (פנס קדמי/אחורי/ראשי/איתות לרכב) added
   to "פנסים וגופי תאורה לרכב".
5. **Malformed boolean-question rendering.** The product-context step's
   "מגע עם מזון" and "מאפיינים טכניים וחשמליים" groups used to wrap
   multiple independent yes/no/unknown questions inside one shared
   `<fieldset>`/`<legend>`, with each question's own "yes" option
   labeled with the full question sentence instead of "כן". Fixed:
   each question now has its own `<fieldset><legend>`, correct
   כן/לא/לא-ידוע options, inside a plain (non-fieldset) grouping `<div>`
   so no group-level label can ever be mistaken for a question.
6. **Vehicle question suppression.** A vehicle-hinted product no longer
   also opens the mains-connected-electrical-product question merely
   because vehicle wording co-occurs with an electrical word (a
   vehicle's own electrical system is not mains electricity) --
   suppressed unless the text explicitly names a genuinely separate
   mains charger/power supply. Separately, `vehicle-context-inference.js`
   pre-answers the installation and function-category follow-up
   questions when the description already explicitly states them
   ("...להתקנה ברכב", "פנס"/"גוף תאורה"), so neither question is asked
   when its answer is already given -- ambiguous vehicle wording alone
   still asks normally.
7. **Canonical result wording/structure.** The family sentence changed
   to the shorter canonical "משפחת המוצר שזוהתה: [family]" and a
   generic, non-invented three-item verification list (confirm family,
   confirm customs classification, confirm the approval route) was
   added to the matrix result block, aligning it with the same visual
   hierarchy used everywhere else in the result.

## Known limitations

- **No multi-candidate confirmation UI.** The original brief describes
  a "נראה שהמוצר שייך למשפחת: [family]. האם זה נכון?" confirmation
  question, a filtered up-to-three-candidate picker, and a
  category-first fallback when nothing matches. This increment
  implements only the conservative auto-identify path (unique match or
  nothing) to guarantee zero new default-path questions and zero risk
  of an unsafe suggested match; the confirmation/candidate UI is the
  natural next iteration once the product owner has reviewed this
  version's wording and alias coverage.
- **Alias coverage is intentionally partial.** Every family's own name
  is an alias; a curated set of additional, explicitly reviewed
  aliases exists for the families exercised in this task's acceptance
  scenarios. Extending alias coverage to the remaining families is
  future, product-owner-reviewed work -- broad automatic synonym
  generation was deliberately avoided per the task's boundary against
  inventing professional scope.
- **The manual-completion placeholder row** ("אחר" / "משפחה נוספת
  להשלמה ידנית") is excluded from the active registry rather than
  guessed into a real family.
- **The "no family identified at all" state is now wired into the
  live UI** (a later pass in this PR). The distinct message "לא זוהתה
  משפחת מוצר מתאימה מתוך המידע שנמסר." shows for an unrecognized
  product, separate from the recognized-family/no-positive-signal
  wording, suppressed only when a detailed rule's own dedicated
  no-match block already explains the result.
- **The personal-import quantity safeguard has no numeric threshold at
  all, exact-match or otherwise.** It is now a live clarification
  question, gated by import type + an explicit sensitive-family list +
  any entered quantity -- see item 1 above and
  `personal-use-clarification.js`. The sensitive-family list
  (`SENSITIVE_FAMILY_IDS`) currently contains only cosmetics/תמרוקים
  ובשמים for this controlled pilot; extending it to further families
  is future, explicit product-owner-reviewed work -- no family may be
  added without that review.
- **Matrix-vs-detailed-rule reconciliation covers only the categories
  explicitly mapped in `regulatory-signal-reconciliation.js`** (glass/
  plastic/polymer food contact, vehicle-installed, mains-connected). A
  detailed rule's exclusion answer for a regulatory subject outside
  that explicit map does not suppress a matching matrix category --
  extending the map to further detailed rules is future,
  product-owner-reviewed work.

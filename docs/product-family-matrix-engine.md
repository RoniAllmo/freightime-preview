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
exists -- **except** for the small, explicitly authorized
`FAMILY_GUIDANCE` overlay (`product-family-guidance.js`): when a family
has an approved guidance `note`, that note is shown for both import
types regardless of the matrix's own `personalImportNote`/
`commercialImportNote`. Products of animal origin
(`food-and-beverages-04`) is the one case where this actually changes
observable behavior today -- its Veterinary Services guidance note
deliberately supersedes the matrix's own distinct personal-import note
("כמות לא מסחרית"), a product-owner-accepted choice, not an oversight.

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

### Explicit family-selection checkboxes

The questionnaire's own `irProductFamily` checkboxes ("לאיזו משפחת
מוצרים המוצר שייך?") also participate in identification, through the
one centralized, explicit mapping in
`js/import-readiness/product-family-selection-mapping.js`
(`PRODUCT_FAMILY_SELECTION_CANDIDATES`), applied in
`buildProductFamilyMatrixSection` (`product-family-result.js`) before
free-text matching runs:

- **A single checkbox that maps to exactly one matrix family** is
  authoritative -- that family is used even if the free text doesn't
  mention it at all, or mentions something else.
- **A single checkbox that maps to a genuinely ambiguous group of
  matrix families** (e.g. food-contact items, glass/ceramics
  tableware, electrical/electronics, medical equipment vs. medical
  claim, vehicle parts/accessories -- see the mapping module's own
  comments for the full list and the reasoning) restricts
  identification to that candidate set; free text is then used only to
  disambiguate within it, via the same unique/multiple/no-match
  handling as plain free-text identification above.
- **Multiple checkboxes selected together** restrict identification to
  the union of every selected checkbox's candidate set. Free text must
  still narrow that union to exactly one family; if it doesn't, nothing
  is claimed -- never a combined result, never an arbitrary "first"
  selection, never resolved by DOM/selection order.
- **No checkbox selected** (including when only `not_sure` and/or
  `other_general_product` is checked) is identical to today's
  free-text-only behavior. `not_sure` never maps to a family and never
  overrides a normal selection checked alongside it;
  `other_general_product` preserves the same cautious, unmapped
  behavior it already had.

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
   this controlled pilot: cosmetics/תמרוקים and perfume/בשמים only), the live
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

## Wave 1 alias expansion (2026-08-25)

Product-owner-approved, alias-only. 23 of 24 approved curated aliases
were added to `CURATED_ALIASES` in
`scripts/generate_product_family_matrix.py` for 5 already-existing,
already-reviewed families -- `מזון ארוז` (6: שימורים, שימורי ירקות,
קופסת שימורים, מזון משומר, canned food, canned goods), `חומרי ניקוי
וחיטוי` (4: חומר ניקוי, נוזל ניקוי, אבקת כביסה, cleaning product),
`ביגוד וטקסטיל` (10: חולצה, מכנס, מכנסיים, שמלה, ג'קט, מעיל, גרביים,
גרב, shirt, t-shirt), `כלי פלסטיק במגע עם מזון` (2: כלי פלסטיק למזון,
קופסת אוכל), `תמרוקים ובשמים` (1: קרם לחות) -- then regenerated
deterministically into `product-family-matrix.js`. No family, matrix
category, regulatory signal, detailed rule, question, or professional
route changed; every family's existing result state
(positive/no-positive/detailed-rule) is preserved exactly.

**One approved alias, "dress", was found unsafe during code review and
omitted rather than added.** It is a plain substring of common
unrelated English words -- "address", "dresser", "dressing",
"redress", "dressage", "undressed" -- so adding it would have
misidentified a shipping address, a piece of furniture, or a food
dressing as the clothing family. The Hebrew alias "שמלה" already
covers the same product concept safely; the unsafe English alias was
omitted rather than the substring-match architecture changed, per this
pass's explicit safety boundary. See
`tests/import-readiness/wave-1-alias-expansion.test.js` tests 32/33.

Deliberately excluded from this pass, pending a separate product-owner
decision: `שימורי דגים`/`שימורי בשר` (collide with the existing
food-of-animal-origin family's own `"דגים"`/`"בשר"` aliases), `מגבת`/
`towel` (ambiguous with a cleaning cloth), bare `קרם`/`מטען`/`דבק`/
`חומר`/`תא`, and every bicycle/scooter/battery/charger/paint/adhesive/
sealant/toy alias.

**Known, disclosed limitation surfaced by this pass:** the Hebrew
construct-state ("smichut") form of a noun is not a substring of its
absolute form -- e.g. "חולצת כותנה" does not contain the approved
alias "חולצה" (the ת/ה ending changes under smichut). This is a
pre-existing property of substring alias matching, not something this
pass introduced or fixed; "חולצה מכותנה" (absolute form) matches
correctly. Addressing the general case would need either per-family
construct-state alias variants or normalizer-level Hebrew morphology,
both out of this pass's alias-only scope.

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
  (`SENSITIVE_FAMILY_IDS`) currently contains only cosmetics/תמרוקים and
  perfume/בשמים (both halves of the original combined row, kept in sync
  when that row was split -- see the "Wave 2 completion" section) for
  this controlled pilot; extending it to further families is future,
  explicit product-owner-reviewed work -- no family may be added
  without that review.
- **Matrix-vs-detailed-rule reconciliation covers only the categories
  explicitly mapped in `regulatory-signal-reconciliation.js`** (glass/
  plastic/polymer food contact, vehicle-installed, mains-connected). A
  detailed rule's exclusion answer for a regulatory subject outside
  that explicit map does not suppress a matching matrix category --
  extending the map to further detailed rules is future,
  product-owner-reviewed work.

## Wave 2: additional product-family guidance (2026-08-26)

Product-owner-approved general professional guidance for 15 requested
product areas. Implemented via the same two mechanisms Wave 1
established -- `CANDIDATE_SET_SCOPED_HINTS`
(`product-family-selection-mapping.js`) for identification gaps within
an already-restricted checkbox candidate set, and `FAMILY_GUIDANCE`
(`product-family-guidance.js`) for family-specific note/no-positive
wording -- reusing existing matrix signals throughout. No matrix row,
regulatory signal, detailed rule, or focused question was added.

**Implemented (existing signal + new identification/guidance only):**
- Medical products (`health-and-cosmetics-02`/`-03`): existing
  `healthUmbrella` signal; new scoped hints for blood-pressure monitor,
  thermometer, glucose meter, pulse oximeter; new AMAR/Medical Devices
  Division guidance note.
- Pesticide products (`chemicals-and-materials-03`): existing
  `healthUmbrella` signal (poisons-permit route); **candidate-set
  membership change** -- added to the `chemicals_paints_adhesives_aerosols`
  checkbox's candidate list (purely additive; the checkbox's own label
  already names "תרסיסים"/sprays); new scoped hints for
  insecticide/herbicide/fungicide/pest-control-preparation wording; new
  guidance note.
- Plants, seeds, and agricultural produce (`food-and-beverages-05`):
  existing `agriculture` signal and most aliases already worked; one new
  scoped hint for "flower" (the one gap).
- Vehicle accessories (`vehicles-and-transport-03`, the general
  "spare parts for a vehicle" row): existing
  `transportOrVehicleLaboratory` signal; new scoped hints for a generic
  accessory/part description; new guidance note clarifying that
  non-integral goods may be treated differently without FreighTime
  making that determination itself.
- Communications/wireless equipment (`electrical-and-electronics-05`/
  `-06`): existing `communications` signal and most aliases already
  worked; new scoped hints for a generic "wireless device"/"transmitter"
  description.
- Household electrical products, electrically wired furniture, and
  electrically wired sports/fitness equipment: **no code change** -- all
  three already reuse the pre-existing, family-independent
  `mains-connected-electrical-product` detailed rule (its own
  `mainsConnectedOrSuppliedAdapter` confirmation question, hinted by the
  existing generic "חשמלי" keyword), confirmed correct by new regression
  tests rather than new implementation.
- Ordinary footwear (`textiles-and-furniture-02`): existing "no positive
  category" behavior already matched the approved rule; new scoped
  hints for shoes/boots/sandals/sports shoes (the row's only alias was
  the abstract noun "הנעלה"); new family-specific no-positive guidance
  note.
- Specified infant products -- infant bed, crib, infant walker
  (`children-and-infants-04`) and infant-feeding cutlery (reusing
  `children-and-infants-03`): existing `standards` signal; new scoped
  hints for each specific item (the row's only alias was one long
  compound phrase).
- Human-use food supplements/vitamins (`food-and-beverages-03`):
  existing `healthUmbrella` signal and existing single-candidate
  checkbox already correctly route to the Ministry of Health -- no
  change needed.

**Originally deferred, then completed below (product-owner decision,
2026-08-26: these deferrals were "not accepted as completion"):**
protective equipment, bicycles/scooters (both ordinary and
auxiliary-motor), ordinary sports/fitness equipment, perfume vs.
cosmetics, safety vs. ordinary footwear, and vitamins for animal
consumption or pharmaceutical manufacturing. See "Wave 2 completion"
below for how each was implemented.

**Ordinary furniture and batteries/accumulators, originally deferred
here, were completed in the final completion pass below** (product-owner
decision, 2026-08-26) -- see that section for the exact mechanism.

**Still deferred -- genuinely, narrowly out of scope, not architecturally
blocked:**
- **Standards Institution exception for defibrillators/infant
  incubators, and for aerosol/pressure-container pesticide packaging.**
  Explicitly out of scope for every pass so far (no question authorized
  to distinguish them, and adding a narrower matrix row for this
  specific sub-exception was not requested) -- left for professional
  review, exactly as instructed.
Equipment that merely contains an internal battery, reached via the
`batteries_or_battery_containing` checkbox, was deferred here and
completed in the "Grouped-battery-selection completion" section below.

Every remaining deferred item above was reasoned through and reported
rather than worked around with a controller-level product-name check, a
global alias, or a fabricated matrix split.

## Final completion pass (2026-08-26)

Product-owner decision: PR #50 was not yet approved for merge, with two
exact remaining implementation gaps -- batteries/accumulators, and
ordinary furniture vs. mattresses. Both completed via the same
canonical-data-split mechanism as "Wave 2 completion" above.

**Matrix changes:**
- `textiles-and-furniture-03` renamed in place (id and `regulatorySignals`
  unchanged) from "ריהוט ומזרנים" (furniture+mattresses) to "מזרנים"
  (mattresses only).
- 2 new rows appended: `textiles-and-furniture-05` ("ריהוט"/ordinary
  furniture, no positive signal) and `vehicles-and-transport-10`
  ("מצבר ייעודי לרכב"/vehicle-dedicated accumulator,
  `transportOrVehicleLaboratory` only -- deliberately NOT also
  `standards`, so exactly one direction/CTA shows, since
  `selectPrimaryAndSupportingProfessional`'s `SIGNAL_ORDER` precedence
  would otherwise prefer `standards` over the vehicle-laboratory
  direction if both were set).
- The pre-existing standalone-battery row (`electrical-and-electronics-07`,
  "סוללות ותאים") is unchanged in id/signal -- only gained curated
  aliases and a `FAMILY_NEGATIVE_TERMS` boundary (see below). Registry
  grew from 57 to 59 rows.

**Checkbox change:** `furniture_and_home_goods` changed from
single-candidate (forced) to ambiguous
`[textiles-and-furniture-03, textiles-and-furniture-05]` (mattress vs.
ordinary furniture) -- the same pattern already used for
`cosmetics_and_beauty`/`dietary_supplements`. `batteries_or_battery_containing`
was left unchanged in this specific pass (vehicle-dedicated
accumulators were reached via global curated aliases instead) -- its
own forced-checkbox behavior was corrected in the
"Grouped-battery-selection completion" pass below.

**New `FAMILY_NEGATIVE_TERMS` entries** (`product-family-identification.js`):
- `electrical-and-electronics-07` excludes vehicle-accumulator phrasing
  (so it resolves to the vehicle-laboratory row instead) AND the
  boundary-protection phrasing the product owner explicitly required
  never be treated as a standalone battery: battery charger/tester/
  holder/compartment, and "equipment merely containing an internal
  battery" (Hebrew and English forms of each).
- `textiles-and-furniture-05` excludes "כיסאות אוכל" (high chairs) --
  the required "כיסא"/chair alias is otherwise an unavoidable substring
  of the pre-existing infant-products row's own "...וכיסאות אוכל"
  compound alias, which would have falsely put infant high-chair text
  into the no-positive ordinary-furniture direction instead of its
  correct, unchanged Standards Institution direction.

**Existing-mechanism reuse, no new rule:** equipment supplied with a
mains/wall charger, and electrically wired furniture, both reuse the
pre-existing, family-independent `mains-connected-electrical-product`
detailed rule -- confirmed correct by regression tests. One small,
narrowly-scoped addition was needed to make this actually reachable for
English-only text: the rule's own keyword-hint list
(`HINT_KEYWORDS.electrical_mains_product` in
`regulatory-signals/keyword-hints.js`) was Hebrew-only before this pass,
so an English-only description like "product supplied with wall
charger" never opened the mains-connection confirmation question at
all -- "charger"/"wall charger"/"mains charger" were added to that
existing hint list (a hint only ever opens a question, never itself
produces output, per that module's own documented design).

**Zero new focused question, detailed rule, or professional category**
-- confirmed by regression tests (`product-family-final-completion.test.js`)
locking the question registry at exactly 10 entries and the
detailed-rule registry at exactly 5, both unchanged from before this
pass.

## Wave 2 completion (2026-08-26)

Product-owner decision: the Wave 2 deferrals above were not accepted as
final. This pass explicitly authorized touching the canonical workbook
source (`data/FreighTime_Simple_Import_Requirements_Matrix.xlsx`) and
its generator metadata (`scripts/generate_product_family_matrix.py`),
previously off-limits, specifically to resolve the "one matrix row, two
required directions" and "no checkbox reaches this family" blockers.

**Matrix changes (workbook edits, all additive or in-place-renamed with
signals unchanged -- see the generator script's CURATED_ALIASES
comments for the full per-row rationale):**
- 4 existing rows renamed to reflect their now-narrower scope, with
  their **id and `regulatorySignals` unchanged**: `health-and-cosmetics-01`
  ("תמרוקים ובשמים" -> "תמרוקים", cosmetics-only), `textiles-and-furniture-02`
  ("הנעלה" -> "הנעלה רגילה", ordinary footwear only),
  `additional-consumer-products-01` ("ציוד ספורט וציוד מגן" -> "ציוד ספורט",
  sports only), `additional-consumer-products-02` ("אופניים וקורקינטים" ->
  "אופניים וקורקינטים רגילים", ordinary only).
- 6 new rows appended (never inserted mid-category, so no existing id
  shifted): `health-and-cosmetics-05` (בשמים/perfume, no positive
  signal), `textiles-and-furniture-04` (הנעלת בטיחות/safety footwear,
  `standards`), `additional-consumer-products-06` (ציוד מגן אישי/personal
  protective equipment, `standards`), `additional-consumer-products-07`
  (אופניים או קורקינט עם מנוע עזר/auxiliary-motor bicycle-scooter,
  `transportOrVehicleLaboratory`), `food-and-beverages-06` (ויטמינים
  לבעלי חיים/animal-use vitamins, `agriculture`), `food-and-beverages-07`
  (ויטמינים לייצור תרופות/pharmaceutical-manufacturing vitamins,
  `healthUmbrella`).
- Registry grew from 51 to 57 rows. Deterministic regeneration
  (`python3 scripts/generate_product_family_matrix.py`, run twice)
  produces a byte-identical file both times.

**Checkbox candidate-set changes:**
- `cosmetics_and_beauty`: single-candidate (forced) -> ambiguous
  `[health-and-cosmetics-01, health-and-cosmetics-05]` (cosmetics vs.
  perfume).
- `dietary_supplements`: single-candidate (forced) -> ambiguous
  `[food-and-beverages-03, food-and-beverages-06, food-and-beverages-07]`
  (human vs. animal vs. pharmaceutical-manufacturing use).
- `textile_apparel_and_footwear`: 2 candidates -> 3
  (`textiles-and-furniture-04` added for safety footwear).
- `chemicals_paints_adhesives_aerosols`: 3 candidates -> 4
  (`chemicals-and-materials-03`/pesticides, added in Wave 2, unaffected
  by this pass).
- Protective equipment, sports equipment, and bicycles/scooters
  deliberately received **no new checkbox** (not authorized) -- made
  reachable instead via global curated aliases (free-text-only
  identification, case 3 in `resolveFamilyIdentificationOptions`).

**New identification-safety mechanism:** `FAMILY_NEGATIVE_TERMS` in
`product-family-identification.js` -- a small, per-family, opt-in
exclusion list (empty for every family not listed), mirroring the
pre-existing `NEGATIVE_HINT_KEYWORDS` pattern in
`regulatory-signals/keyword-hints.js`. Needed because some required
positive terms are unavoidably substrings of accessory/sibling-family
phrasing under pure substring matching (e.g. "אופניים" inside "מנשא
אופניים לרכב", a bicycle rack; "ויטמינ" inside "...לייצור תרופות",
colliding with the pre-existing, unrelated "תרופות"/medicines family).
Used for: ordinary bicycles/scooters (excludes accessory phrasing and
auxiliary-motor indicators), the auxiliary-motor row (excludes the same
accessory phrasing), ordinary footwear (excludes safety-footwear
phrasing), and the medicines family (excludes vitamin-root phrasing).

**Global curated aliases added** (`CURATED_ALIASES` in the generator
script, reviewed against the full matrix for collisions with an
automated script before merge): ordinary/safety footwear terms,
sports/protective-equipment terms, ordinary/motorized bicycle terms,
human/animal/pharma vitamin terms, cosmetics-specific terms
(deodorant/skin-cream/hair-preparation/makeup), perfume terms (בושם
only -- deliberately never the plural "בשמים", which collides with the
legacy compound "תמרוקים ובשמים" wording still used as literal input
text in several pre-existing tests).

**Rejected unsafe terms:** bare "נעל" (singular shoe, collides with
"נעלי בטיחות"); bare "ויטמינים" left on the human-supplement row
(collided with the two new vitamin rows -- replaced with human-use-
specific compound phrases); bare "אופניים"/"bicycle" without the
FAMILY_NEGATIVE_TERMS protection (would have forced accessory phrasing
into the complete-bicycle families).

**Family-specific guidance added** (`product-family-guidance.js`):
notes for safety footwear, personal protective equipment, the
auxiliary-motor bicycle/scooter family, animal-use vitamins, and
pharmaceutical-manufacturing vitamins (the last names the more specific
"אגף הרוקחות"/Pharmaceutical Division within the Ministry of Health,
distinguishing it from the ordinary human-use note without a new signal
key or professional category); no-positive guidance for perfume and for
ordinary sports/fitness equipment.

**No new focused question, detailed rule, or professional category was
added** -- confirmed by dedicated regression tests
(`product-family-wave2-completion.test.js`) locking the question
registry at exactly 10 entries and the detailed-rule registry at
exactly 5, both unchanged from before this pass.

## Grouped-battery-selection completion (2026-08-26)

Product-owner final decision: the visible "batteries or
battery-containing products" checkbox (`batteries_or_battery_containing`)
previously forced EVERY selection into the standalone-battery approval
result -- including equipment that merely contains a battery as a
component, not the product itself. This was the one remaining blocker
to PR #50's merge approval.

**Matrix change:** one new row appended, `electrical-and-electronics-09`
("ציוד הכולל סוללה"/equipment containing a battery), no positive
signal. Registry grows from 59 to 60 rows. No existing row's id or
signal changed.

**Checkbox change:** `batteries_or_battery_containing` changed from
single-candidate (forced) to an ambiguous 3-candidate set --
`electrical-and-electronics-07` (standalone battery/accumulator,
standards), `vehicles-and-transport-10` (vehicle-dedicated accumulator,
vehicle-laboratory), `electrical-and-electronics-09` (equipment merely
containing a battery, no positive) -- the same pattern already used for
`cosmetics_and_beauty`/`dietary_supplements`/`furniture_and_home_goods`.
Free text now disambiguates within this set; genuinely neutral text
("מוצר לבדיקה") correctly stays information-needed instead of
defaulting to the standalone-battery direction.

**`FAMILY_NEGATIVE_TERMS` additions** (`product-family-identification.js`,
on `electrical-and-electronics-07`): "עם סוללה" (portable equipment
*with* a battery), "battery-powered", "rechargeable device"/"rechargeable
equipment" -- extending the boundary protection already in place for
charger/tester/holder/compartment wording, so these additional Case-4/6
phrasings also never resolve to the standalone-battery row.

**Existing behavior reused:** equipment supplied with a mains/wall
charger continues to reuse the pre-existing, family-independent
mains-connected-electrical-product detailed rule, unaffected by this
change (it fires independently of the family checkbox).

**No new focused question, detailed rule, or professional category** --
confirmed by regression tests
(`product-family-battery-grouping.test.js`) exercising the full
grouped-checkbox precedence.

## Live-animals completion (2026-08-26)

Product-owner decision: a live animal is not merely a generic "product
of animal origin" from the user's perspective. The questionnaire had a
checkbox for "מוצרים מן החי" (products OF animal origin,
`food-and-beverages-04`, e.g. meat, dairy, eggs) but no separate,
explicit option for the animal itself.

**New visible option:** "בעלי חיים" (`live_animals`), added to the
existing `#irProductFamilyGroup` fieldset -- no new questionnaire step,
no new follow-up question.

**Canonical row used:** a new row, `food-and-beverages-08`
("בעלי חיים"), appended to the reviewed workbook (row 62). Registry
grows from 60 to 61 rows. No existing row's id, signal, or wording
changed. A separate row was used rather than reusing
`food-and-beverages-04` because the product owner's rule requires the
two concepts to remain distinct and separately recognizable in the
result -- reusing the animal-origin row would have made a live animal
and, say, imported meat produce the identical family result.

**Checkbox mapping:** `live_animals` is a single-candidate (forced)
mapping to `food-and-beverages-08` in
`product-family-selection-mapping.js` -- selecting the checkbox alone
is sufficient to reach the live-animal result regardless of free text,
the same pattern used for `animal_origin_products` itself.

**Signal and direction reused, not invented:** the new row sets only
`agriculture: true` (the same signal shape as the pre-existing
`food-and-beverages-06`, animal vitamins) and its `FAMILY_GUIDANCE`
note reuses the identical Veterinary Services wording already used by
`food-and-beverages-04`/`food-and-beverages-06`: "נדרש לבדוק אישור של
השירותים הווטרינריים במשרד החקלאות." The professional routing this
produces (`הרשות הרגולטורית הרלוונטית`) is byte-identical to the
existing animal-vitamins row's -- confirmed by a dedicated regression
test comparing the two results -- so no new professional category or
duplicate Veterinary Services wording was introduced.

**Aliases added** (`CURATED_ALIASES` in the generator script, and the
new row's own name): "בעלי חיים" (own name), "בעל חיים", "live animal",
"live animals" -- deliberately narrow, per the product owner's explicit
rule against adding broad animal-species aliases (no "כלב"/"חתול"/
"סוס"/"ציפור"/"דג"/"livestock"/"pet"). The plural "בעלי חיים" is an
unavoidable substring of the pre-existing "מוצרים לבעלי חיים"
(products FOR animals) and "ויטמינים לבעלי חיים" (vitamins FOR
animals) rows' own names -- a `FAMILY_NEGATIVE_TERMS` entry on
`food-and-beverages-08` excludes the prepositional phrase "לבעלי חיים"
so those two pre-existing rows keep resolving cleanly, unaffected.

**Zero-new-question decision:** the animal's species, breed, age, sex,
health condition, purpose of import, country of origin, and personal-
vs-commercial status all remain outside the questionnaire by design --
the primary direction does not depend on the animal type. These details
are explicitly deferred to professional review after referral, per the
product owner's rule; `REGULATORY_FOLLOWUP_QUESTIONS.length` and
`REGULATORY_SIGNAL_RULES.length` are unchanged (10 and 5), confirmed by
a dedicated regression test.

**Professional exceptions remain:** as with every family in this
registry, product-specific requirements (species-specific permits,
transport documentation, quarantine requirements, and similar) are not
enumerated here and remain a matter for professional review of the
exact animal and shipment -- this workbook identifies that Veterinary
Services review is required, not what it will conclude.

See `tests/import-readiness/live-animals-family.test.js` for the full
regression suite (checkbox presence/label/mapping, result behavior,
zero-question guarantee, collision guards, registry hygiene).

**Update (2026-08-27):** the overnight consistency audit that followed
this pass flagged an open routing question -- whether "animal feed"
correctly reached the Veterinary Services direction. It did not: no
dedicated animal-feed row existed, so "food for animals" text resolved
(if at all) to the general, unmapped-by-checkbox
`additional-consumer-products-05` row (Ministry of Health), never to
Agriculture/Veterinary Services. The product owner has since resolved
this explicitly -- see "Animal-feed completion" below, which corrects
it with a dedicated row.

## Animal-feed completion (2026-08-27)

Product-owner decision, resolving the routing question raised in the
2026-08-26 overnight audit: animal feed is not a live animal, not a
product of animal origin, and not the same concept as a non-food pet
product or accessory (leash, collar, bed, bowl, toy, grooming
accessory, aquarium accessory) -- **every animal-feed product requires
Veterinary Services review, regardless of the animal type**, and this
must be distinct from the existing general pet-products row.

**Previous incorrect/ambiguous behavior:** the only pre-existing row
reachable by general "food/product for animals" phrasing,
`additional-consumer-products-05` ("מוצרים לבעלי חיים"), carried
`healthUmbrella: true` / `agriculture: false` and its own curated
aliases included `"מזון לחיות מחמד"` (pet food) -- meaning pet food
text, if it matched at all, resolved to a Ministry of Health direction,
never Veterinary Services/Agriculture.

**New visible option:** `"מזון לבעלי חיים"` (`animal_feed`), added to
the existing `#irProductFamilyGroup` fieldset next to `"בעלי חיים"` and
`"מוצרים מן החי"` -- no new questionnaire step, no new follow-up
question.

**New canonical row:** `food-and-beverages-09` ("מזון לבעלי חיים"),
appended to the reviewed workbook. Registry: 61 → 62 rows (60 → 61
active). Sets only `agriculture: true` (same signal shape as the
pre-existing `food-and-beverages-06`/`food-and-beverages-08`), and its
`FAMILY_GUIDANCE` note reuses the identical Veterinary Services wording
verbatim. The professional routing produced is byte-identical to the
live-animals/animal-vitamins rows' own result -- no new professional
category, no duplicate Veterinary Services wording.

**Correction applied:** `"מזון לחיות מחמד"` was removed from
`additional-consumer-products-05`'s curated aliases (its own name and
`"מוצר לבעלי חיים"`/`"מוצרים לחיות מחמד"` remain, so general non-food
pet-product text is completely unaffected) and added to the new row
instead. This is the one narrow correction to pre-existing data this
pass makes; every other row, alias, and signal is untouched.

**Aliases added** (narrow, curated, exact compound phrases only):
`"מזון לבעלי חיים"` (own name), `"מזון לכלבים"`, `"מזון לחתולים"`,
`"מזון לדגים"`, `"מזון לציפורים"`, `"מזון לחיות משק"`,
`"מזון לחיות מחמד"` (moved, see above), `"animal feed"`, `"dog food"`,
`"cat food"`, `"fish food"`, `"bird food"`, `"livestock feed"`,
`"pet food"`. No bare `"מזון"`/`"אוכל"`/`"feed"`/`"food"`/`"animal"`/
`"pet"`/species-name alias was added, per the product owner's explicit
rule.

**Collision guard added** (`FAMILY_NEGATIVE_TERMS`, on
`food-and-beverages-04`): `"מזון לדגים"` (fish food) is excluded from
the pre-existing products-of-animal-origin row, whose own alias
`"דגים"` (fish) is otherwise a plain substring of that phrase -- food
FOR fish is not fish itself. Found and fixed during this pass's own
collision testing.

**Non-food pet products unaffected:** leash, collar, bed, bowl, toy,
grooming-accessory, and aquarium-accessory phrasing (Hebrew and
English) never matched any alias before this pass and still do not --
confirmed by regression tests, since none of the new animal-feed
aliases are bare species/pet words that could accidentally match them.

**Zero-new-question decision:** the animal type the feed is intended
for (dog, cat, fish, bird, livestock, or any other animal), and its
composition, processing, origin, or ingredients, all remain outside the
questionnaire -- the primary direction does not depend on any of these.
`REGULATORY_FOLLOWUP_QUESTIONS.length` and `REGULATORY_SIGNAL_RULES.length`
are unchanged (10 and 5).

**Professional exceptions remain:** as with every family in this
registry, product-specific requirements (composition, processing,
manufacturer-specific documentation, and similar) are not enumerated
here and remain a matter for professional review of the exact product
-- this workbook identifies that Veterinary Services review is
required, not what it will conclude.

See `tests/import-readiness/animal-feed-family.test.js` for the full
regression suite.

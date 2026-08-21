# Product Regulatory Signals — Pilot Research & Architecture Record

This document is an operational product record and not a legal opinion, binding classification, or import approval.

> **Superseded model notice (read this first).** Sections 1–14 below
> describe an earlier phase of this pilot, in which a rule could only
> become publicly active if an autonomous coding agent could genuinely
> open and read a real official Israeli source (`WebFetch`) — that
> environment's outbound web access was blocked for every URL tested,
> so zero rules were ever activated under that model, exactly as
> documented below. **The product owner — FreighTime's qualified
> customs professional — has since redirected this pilot: external
> official-source verification is no longer a mandatory technical
> precondition for a rule to be authored, reviewed, or approved for
> controlled-pilot use.** The product owner is the professional author
> and reviewer of pilot rule content; official sources remain valuable
> *optional* supporting evidence, never a hard gate. See **§16** for
> the current architecture, status model, and the five rules as they
> stand today. As of 2026-08-17 (see **§16.7**) the product owner
> supplied verbatim public-facing content for all five rules and
> approved each for controlled-pilot use (`expert_approved_for_pilot`);
> none carries an official-source citation. Sections 1–14 remain
> below as an accurate historical record of the earlier research
> attempts and the (still valid, still reused) engine mechanics they
> built — not as a description of the current activation policy.

Date of this research: 2026-08-16 (initial pilot). Re-attempted the
same day, in a separate follow-up session (see §14), while building the
adaptive phase-based progress model. Researcher: an autonomous coding
agent working from this repository, using the WebSearch and WebFetch
tools available in its environment at the time.

## 1. What this pilot is

A rule engine that can, in principle, give a beginner importer a short,
evidence-based preliminary indication that their described product may
fall into an Israeli import-regulation category worth checking before
referring them to a professional — never a final classification, never
an exemption claim, never a substitute for professional review.

## 2. Research method and its critical limitation

Research was scoped to five target candidate categories:

- **A.** Mains-connected electrical product (potential standards/safety review)
- **B.** Plastic material in direct food contact
- **C.** Polymer coating in direct food contact
- **D.** Glass drinking/food-contact vessel
- **E.** Product intended for installation/regulated use in a motor vehicle

**WebSearch** was available and used for all five categories, returning
search-engine result snippets and short AI-generated summaries of those
snippets, together with real candidate URLs on `gov.il`, `sii.org.il`,
and other domains.

**WebFetch** — needed to actually open and read the full text of any
primary source page — returned `EGRESS_BLOCKED` for **every** URL
attempted in this environment, without exception. This was verified not
to be a domain-specific restriction: `www.gov.il`, `www.sii.org.il`,
`www.chamber.org.il`, and even `en.wikipedia.org` (a control domain
unrelated to this research) all returned the same error. In other
words, this environment could search for sources but could not open and
directly read a single one of them.

Per this pilot's non-negotiable verification rule — *a rule may only
produce a public regulatory signal if it is genuinely, verifiably
backed by a real official Israeli source the agent actually found and
can cite, with confidence in its exact current scope* — a secondhand
search-engine summary of a page is **not** sufficient evidence of that
page's exact scope, exclusions, standard number, or currency. It is
evidence that a real official source *probably* exists and *probably*
says something in the vicinity of what was found, and no more than
that.

**Conclusion: zero of the five candidate rules could be verified to
the required bar in this environment. All five stay in
`professional_review_required` status and are, by the rule engine's
hard code-level gate, structurally incapable of producing any public
output.** This is treated in this pilot as a legitimate, expected
outcome, not a failure to work around.

## 3. Rule-engine architecture (built regardless of activation count)

Location: `js/import-readiness/regulatory-signals/`.

| File | Responsibility |
|---|---|
| `rule-status.js` | Review-state enum (`draft` / `source_verified` / `professional_review_required` / `approved_for_pilot` / `expired` / `disabled`) and the **hard publication gate**, `isPubliclyEligible(rule)`. Only a rule with status exactly `approved_for_pilot`, a valid `verifiedDate`, a valid `reviewDueDate`, at least one well-formed official source, a `professionalCategory`, and a `publicLimitationText` clears the gate. Also exposes `isStale(rule, now)` with an injectable clock for testability, and `computeReviewDueDate()` (6-month period, see §7). |
| `confidence.js` | The three word-only confidence labels — never a number. |
| `questions.js` | Closed-choice follow-up question definitions, one per candidate category, each with an explicit "לא ידוע" option. |
| `keyword-hints.js` | Loose free-text keyword matching used only to decide which follow-up question *might* be worth asking — never itself a trigger. |
| `rules-registry.js` | The 5 real researched candidates, as data (see §5). |
| `matcher.js` | Deterministic matching: checks the hard gate first (unconditionally, before any trigger logic runs), then the rule's own trigger/exclusion predicates against confirmed closed-choice answers only, sorts matches by operational-impact priority, caps output at 3, and produces the honest no-match wording when a category was hinted but nothing verified matched it. |
| `language-safety.js` | Regex-based scanner for the banned absolute-claim wording pattern class (see §9), reused by the test suite. |
| `index.js` | `evaluateRegulatorySignals(normalizedInput, options)` — the integration entry point wired into the existing assessment; returns `null` (no change to the assessment at all) unless the user's own free text or an already-collected answer hints at a candidate category. |

**The gate is enforced in code, not by convention**:
`tests/import-readiness/regulatory-signals/matcher.test.js` includes
fixture rules whose `status` is `draft`, `disabled`,
`professional_review_required`, and `expired`, each with its
`triggerPredicate` forced to unconditionally return `true` — and proves
every one of them still produces zero output, because the gate check in
`matcher.js` runs before any predicate is even evaluated.

## 4. Matching behavior

- Free text can only ever *suggest* which single closed-choice question
  to ask (via `keyword-hints.js`) — it can never itself satisfy a
  rule's `triggerPredicate`.
- Every real candidate rule's trigger requires an explicit `"yes"`
  answer to one dedicated closed-choice question (see §5's "follow-up
  questions" column) — never a guess from free text alone.
- An `"unknown"` answer never satisfies a `"yes"`-gated trigger. It
  falls through to the honest no-match wording rather than blocking or
  penalizing the user.
- "No rule matched" always renders as two sentences together: *"לא
  זוהתה התאמה לכלל מאומת במאגר המצומצם שנבדק."* followed immediately by
  *"אין בכך אישור שהמוצר פטור מדרישות יבוא."* — never reworded as "no
  approval needed" or "import permitted."

## 5. Candidate rules researched

All five share the same fate for the same reason (§2), so this table
lists what was found, not what was confirmed.

| ID | Public title | Trigger (closed-choice) | Candidate official source found | Status | Why not approved |
|---|---|---|---|---|---|
| `RS-ELEC-001` | מוצר חשמלי המחובר לרשת החשמל | "האם המוצר מתחבר ישירות לשקע החשמל (מתח רשת)?" | [אביזרי חשמל — מכון התקנים הישראלי](https://www.sii.org.il/he/electrical-appliances/) | `professional_review_required` | WebSearch snippets reference a governing standard (a snippet named "תקן ישראלי 900") and a mandatory standards-mark requirement for electrical/electronic products under the Free Import Order, but the SII page itself could not be opened to confirm the number, its exact scope, or any battery-only/low-voltage exclusions. |
| `RS-PLASTIC-FOOD-001` | פלסטיק במגע ישיר עם מזון | "האם חלק פלסטיק במוצר נועד למגע ישיר עם מזון או משקאות?" | [חומרי פלסטיק ומוצרי פלסטיק הבאים במגע עם מזון ומשקאות — מכון התקנים הישראלי](https://www.sii.org.il/he/food-testing) | `professional_review_required` | Search results and a chamber.org.il draft-standard PDF title point to "תקן ישראלי 5113," largely referencing EU/FDA rules, but neither the SII page nor the PDF could be opened to confirm the number is correct, current, and in force, or its precise exclusions. |
| `RS-POLYMER-COATING-001` | ציפוי פולימרי במגע ישיר עם מזון | "האם ציפוי פולימרי (למשל ציפוי לא-דביק) על המוצר נועד למגע ישיר עם מזון?" | [חומרים הבאים במגע עם מזון — מכון התקנים הישראלי](https://www.sii.org.il/he/food-testing) | `professional_review_required` | Weakest evidence of the five: no distinct standard number or scope statement for coatings specifically was found even via search — only the general SII food-contact-materials landing page. A standards professional would need to determine even *which* standard (if any) governs this, not only whether it is current. |
| `RS-GLASS-FOOD-001` | כלי זכוכית למגע עם מזון או משקאות | "האם כלי הזכוכית מיועד למגע ישיר עם מזון או משקאות...?" | [שחרור עופרת וקדמיום מכלים הבאים במגע עם מזון — מכון התקנים הישראלי](https://www.sii.org.il/he/food-testing) | `professional_review_required` | Search results describe a standard covering lead/cadmium release from ceramic/ceramic-glass/glass vessels for food/drink use, excluding manufacturing and sale-packaging vessels, with one snippet naming "תקן 1003," but the SII page could not be opened to confirm the number or exact exclusion wording. |
| `RS-VEHICLE-001` | מוצר להתקנה או לשימוש רגולטורי ברכב | "האם המוצר מיועד להתקנה קבועה או לשימוש רגולטורי ברכב מנועי...?" | [מוצרי תעבורה — צו יבוא חופשי (מסמך לשכת המסחר)](https://www.chamber.org.il/media/154103/) | `professional_review_required` | Weakest-sourced alongside the polymer-coating candidate: the only document found hosting the actual order text is a third-party chamber-of-commerce mirror (not the Ministry of Transport or gov.il itself), its filename suggests a 2015 date, and its currency could not be confirmed since it could not be opened. |

Full trigger predicates, exclusion predicates (currently all "none
identified" — another reason none can be approved: exclusions were
never confirmed either), verification items, and internal research
notes for every candidate live as data in
`js/import-readiness/regulatory-signals/rules-registry.js`.

## 6. Professional-verification paths

Distinguished per candidate, reusing the existing
`js/import-readiness/professional-category-registry.js` where it
already fit, and extending it with two new categories this pilot
genuinely needed and that did not previously exist there:

- `TESTING_LABORATORY` ("מכון התקנים או מעבדת בדיקה מוסמכת") — used by
  the electrical, plastic-food-contact, polymer-coating, and
  glass-food-contact candidates, paired with the existing
  `CUSTOMS_CLASSIFIER` for the customs-item side of the same question.
- `VEHICLE_TESTING_LAB` ("מעבדת רכב מוסמכת") and
  `TRANSPORT_MINISTRY_LICENSING` ("משרד התחבורה או גורם רישוי מתאים") —
  used by the vehicle candidate, since classification, standards
  testing, and vehicle licensing are three genuinely different
  professional functions and none of the pre-existing categories
  covered vehicle-specific testing/licensing.

No existing professional-category entry or existing scenario's
professional referral was modified.

## 7. Stale-rule protection

`rule-status.js#computeReviewDueDate()` adds a fixed 6-month period to
a rule's `verifiedDate`. Six months was chosen because this is a
static, unbuilt marketing/preview site with no scheduled re-crawl or
build pipeline — a shorter period would create reviews no process
exists to act on, and a longer period risks presenting Free-Import-Order
and standards content, which does change, as current for too long.
`isStale(rule, now)` takes an injectable clock rather than calling
`new Date()` internally, and `matcher.js` downgrades a stale rule's
public confidence label to "נדרש מידע נוסף" and swaps its collapsed-detail
date line for "נדרש אימות מקור מעודכן" instead of continuing to claim
currency — tested in
`tests/import-readiness/regulatory-signals/matcher.test.js` (tests 12–13)
with a rule dated in the past relative to a mocked "current date."
Because no real candidate is `approved_for_pilot`, this behavior is
exercised today only via fixture rules in the test suite, and is ready
the day a candidate might actually be approved.

## 8. UI integration

Wired into the two existing scenario result builders that already own
product-identity data — `js/import-readiness/personal-import-rules.js`
and `js/import-readiness/first-commercial-import-rules.js` — never into
a new homepage section, never a second competing assessment. No new
form step or new question was added to `index.html`: since zero rules
can currently fire, a follow-up question that could never change any
output would violate this pilot's own "only ask a question that can
materially change the result" rule, so none is shown today. What *is*
live: `evaluateRegulatorySignals()` runs against the already-collected
`productName` / `commercialDescription` / `intendedUse` /
`sensitiveCategory` fields, and — only when they hint at one of the
five categories — adds the honest no-match sentence pair to the
result's existing collapsed "מידע נוסף והסברים" (`<details>`) region.
The primary visible result card is completely unaffected in every
case. `js/import-readiness/regulatory-signals/questions.js` and the
matcher's per-question wiring exist and are fully tested so that the
day a candidate clears review and is set to `approved_for_pilot`, the
follow-up question and full signal-card rendering activate without any
further architectural work — see §12 for the couple of small
follow-ups this leaves open.

## 9. Language safety

`language-safety.js#scanForBannedAbsoluteClaims()` flags the exact
banned-wording class from the pilot brief (unconditional obligation /
exemption / final-approval / final-classification claims), and is run
in tests against: the fixture examples, every string actually shipped
by the real candidate registry, every follow-up question's legend and
option labels, the shared no-match strings, and a full personal-import
and first-commercial-import result object built with a hinted product
description. All pass.

## 10. Privacy

The module is grep- and test-verified (see
`tests/import-readiness/regulatory-signals/privacy-and-purity.test.js`)
to contain no `fetch`/`XMLHttpRequest`/`WebSocket` call, no
`localStorage`/`sessionStorage`/`indexedDB`/cookie write, no
`console.*` call, no external AI API reference, and no URL/history
mutation. `docs/DATA_FLOW_INVENTORY.md` was updated with a dedicated
section for this pilot.

## 11. Implementation status summary

| Rule ID | Status |
|---|---|
| `RS-ELEC-001` | `professional_review_required` |
| `RS-PLASTIC-FOOD-001` | `professional_review_required` |
| `RS-POLYMER-COATING-001` | `professional_review_required` |
| `RS-GLASS-FOOD-001` | `professional_review_required` |
| `RS-VEHICLE-001` | `professional_review_required` |

**Zero rules are `approved_for_pilot`.** This is by design given what
could actually be verified in this environment, not a shortcut taken to
finish faster — the task explicitly treats this as an acceptable, even
expected, outcome, and the alternative (activating a rule on the
strength of a search-engine summary alone) is exactly what the
verification rule exists to prevent.

## 12. Unresolved questions / what a human reviewer needs to do next

For every candidate above, a human professional (standards specialist
for A–D, a vehicle/Ministry-of-Transport-familiar professional for E)
needs to, using direct access to the primary source:

1. Confirm the exact, current, in-force standard number (or Free Import
   Order clause, for the vehicle candidate).
2. Confirm the standard/order's precise scope wording and any
   exclusions (e.g., battery-only devices for the electrical candidate;
   manufacturing/sale-packaging vessels for the glass candidate).
3. Confirm whether the source snippets found are still current (none
   carried a clearly visible "last updated" date in what WebSearch
   returned).
4. For `RS-POLYMER-COATING-001` and `RS-VEHICLE-001` specifically:
   confirm a governing source exists at all in the form assumed here,
   since evidence for these two was noticeably thinner than for the
   other three.
5. Only after that: set `verifiedDate`, compute `reviewDueDate` (see
   §7), set `status: 'approved_for_pilot'` in `rules-registry.js`, and
   — separately — decide whether the closed-choice follow-up question
   for that category should be added to `index.html`'s product-identity
   step (the question definitions already exist in `questions.js` and
   are unit-tested; only the DOM wiring in `index.html` and
   `import-readiness-controller.js` remains, deliberately left undone
   while no rule can use it).

No reviewer name is recorded anywhere in this pilot (`reviewedBy:
null` throughout `rules-registry.js`) — inventing one was avoided per
this repository's standing rule against fabricated facts.

## 13. Explicit disclaimers

This document is an operational product record and not a legal opinion, binding classification, or import approval.

This pilot does not certify any product's compliance with Israeli
import regulation, does not constitute customs classification, and does
not constitute an import approval, in this document or anywhere in the
shipped product.

## 14. Follow-up verification re-attempt (2026-08-16, adaptive-progress task)

A later task on the same day asked this repository to retry real-source
verification of all five candidates before building the adaptive
phase-based progress model on top of the existing rule engine. Per that
task's own instruction ("test whether WebFetch actually works in THIS
session ... a couple of real attempts is enough evidence"), three real
`WebFetch` calls were made in this follow-up session:

1. `https://www.gov.il/he/service/customs-tariff` — `EGRESS_BLOCKED`.
2. `https://en.wikipedia.org/wiki/Israel` — a control domain with no
   relationship to this research, used specifically to check whether
   the block was `gov.il`/`sii.org.il`-specific or environment-wide —
   also `EGRESS_BLOCKED`.
3. `https://www.sii.org.il/he/electrical-appliances/` (the candidate
   source already cited for `RS-ELEC-001` above) — also
   `EGRESS_BLOCKED`.

All three failed identically, confirming this is the same
environment-wide egress restriction found in the original pilot
session, not a fluke of a single domain. `WebSearch` again worked and
surfaced the same class of secondhand snippets as before (e.g. a
snippet naming "תקן ישראלי 900" and describing a mandatory
standards-mark requirement for electrical products) — useful as a
pointer for a future human reviewer, but, per this pilot's
non-negotiable verification rule, not sufficient to actually open and
read a primary source's exact current scope, exclusions, or standard
number.

**Outcome: no status changed.** All five candidates remain exactly as
listed in §11 (`professional_review_required`), none were promoted to
`approved_for_pilot`, and none were demoted or newly disabled. This is
the same honest, legitimate "0 active rules" outcome as the original
pilot, reached independently in a second session rather than assumed
from the first. The rule-engine architecture (§3–§10) was not modified
in this follow-up session; only the adaptive phase-based progress model
and question-budget architecture described below were added on top of
it.

### 14.1 Journey-phase model (new, this session)

`js/import-readiness/journey-phase-model.js` replaces the assessment's
previous fixed "שלב X מתוך Y" *question*-count progress display (which
had promised an exact total that a future conditional regulatory
question could invalidate) with four STABLE *phases* that never change
in number:

| Phase | Label |
|---|---|
| A | מצב היבוא |
| B | פרטי המוצר או הבעיה |
| C | בדיקות ממוקדות (conditional; shown only when a regulatory follow-up question is actually asked — not reachable today since no rule is `approved_for_pilot`) |
| D | התוצאה שלך |

The progress bar's `aria-valuemin`/`aria-valuemax`/`aria-valuenow`/
`aria-valuetext` describe this fixed 4-phase progress, never a question
total. The visible `#readinessProgressCount` label shows the current
phase's name only (e.g. "מצב היבוא"), never an "X מתוך Y" count of
anything user-question-shaped. See
`tests/import-readiness/journey-phase-model.test.js` and the
phase-related tests in
`tests/import-readiness/progress-indicator.test.js`.

### 14.2 Question-budget architecture (new, this session)

`js/import-readiness/regulatory-signals/question-budget.js` implements
budget (B) from the task brief: conditional regulatory follow-up
questions are capped at `MAX_REGULATORY_QUESTIONS_NORMAL = 3`, with a
hard-documented exceptional 4th slot
(`MAX_REGULATORY_QUESTIONS_EXCEPTIONAL = 4`) available only to a
question that itself carries a non-empty
`exceptionalBudgetJustification` string explaining why omitting it
could produce a materially misleading signal. No such 4th-question
justification exists for any of the five candidates today, because
none of them is active; the mechanism exists ready for whichever
candidate a future human reviewer approves. The module reuses
already-collected core-route answers (via a `reusableAnswers` map keyed
by question id) and already-answered regulatory questions from earlier
in the same session, so neither counts against the budget or gets
re-asked. When more candidate questions exist than the budget allows,
selection stops rather than looping, and the caller is told exactly
which question ids were skipped so it can lower confidence and surface
a verification item instead of collecting more than the budget
permits. See
`tests/import-readiness/regulatory-signals/question-budget.test.js`.

Because zero rules are active, this budget is exercised today only by
its own unit tests, exactly like the stale-rule protection in §7 — both
are ready the day a candidate clears review.

### 14.3 Hero / how-it-works copy correction (new, this session)

Independently of the rule-verification outcome, the Hero supporting
sentence and "איך זה עובד" section were corrected because they promised
an exact question count ("שלוש שאלות קצרות") and a fixed 3-step
progress model that a conditional regulatory question could make
inaccurate. New copy (see `index.html`):

- Hero supporting sentence: "כמה שאלות קצרות יעזרו להבין מה צריך
  לבדוק, מה להכין ולמי נכון לפנות."
- How-it-works heading: "תהליך קצר וממוקד", with step copy describing
  the process without naming a fixed question count.

No fixed question total appears anywhere in the public interface as of
this session. See
`tests/readiness/onboarding-correction.test.js`,
`tests/readiness/hero-image-v2.test.js`, and the fixed-count-rejection
tests in `tests/import-readiness/progress-indicator.test.js`.

## 15. Evidence-package intake format (new, this session)

A later task added a documented, validated **intake format** the
product owner can use to supply a reviewed regulatory evidence package
for one candidate rule at a time, going forward -- pure infrastructure,
no new regulatory content or activation. Full detail lives in
[`docs/evidence-package-schema.md`](./evidence-package-schema.md);
summary:

- **Schema**: 19 required fields (rule ID, public category, trigger
  phrases, confirmation questions, activation conditions, exclusions,
  public Hebrew wording, verification items, primary verification
  professional, professional reason, official source title, issuing
  authority, exact source URL, tariff/order/standard reference,
  verification date, review-due date, reviewer status, active/disabled
  status, public limitation wording), defined in
  `js/import-readiness/regulatory-signals/evidence-package.js`. It
  formalizes and extends the field set the 5 existing candidates in
  `rules-registry.js` already use -- not a parallel, incompatible
  format.
- **Validator**: `validateEvidencePackage()` is a real, deterministic,
  field-by-field check. A package missing an official source, a
  verification date, a review-due date, the exclusions field, a
  professional-verification path, or safe public limitation wording is
  rejected -- and so is a package missing any other one of the 19
  fields. A rejected package can never be adapted into a rule shape or
  reach the matcher.
- **Activation gate**: reuses the existing `RULE_STATUS.APPROVED_FOR_PILOT`
  value from `rule-status.js` as-is (this codebase's "approved for
  controlled pilot" concept) -- not a second status system. Only a
  package that is schema-valid AND explicitly `approved_for_pilot` AND
  clears the existing, unmodified `isPubliclyEligible()` gate can ever
  produce public output; "approved for controlled pilot" means
  product-owner-reviewed, explicitly not government-verified or a
  final classification.
- **Free text stays suggestion-only**: exactly like `keyword-hints.js`,
  a package's `triggerPhrases` can only ever suggest which
  `confirmationQuestions` entry to ask -- never itself satisfy
  `activationConditions`, which are evaluated only against confirmed
  closed-choice answers.
- **The 5 existing candidates are untouched**: `rules-registry.js` was
  not edited by this task (byte-for-byte hash unchanged, same as every
  prior task -- see the top-level regression tests). All 5 remain
  `professional_review_required` and gate-blocked.
- **Where the next real package goes**: the product owner's first real
  evidence package (glass-food-contact-vessel) has its exact intake
  slot prepared at
  `js/import-readiness/regulatory-signals/evidence-packages/glass-food-contact-vessel.evidence.js`
  -- today an intentionally-empty, schema-shaped template pinned to
  `RULE_STATUS.DISABLED`, with no invented content. See
  `docs/evidence-package-schema.md` §9 for the exact fill-in and
  activation steps.

Tests: `tests/import-readiness/evidence-package-intake.test.js`
(top-level, CI-covered) -- schema enumeration, per-field rejection
tests, activation-gate tests (approved+valid produces output through
the real matcher; unapproved-but-complete produces none), the
free-text-suggestion-only regression, the glass-food-contact-vessel
template's placeholder/disabled state, and regressions confirming the
5 real candidates and the evidence-packages registry are unaffected.
All fixture data is clearly synthetic
(`EXAMPLE-TEST-RULE-001`/`test-trigger-only`), never real category
content.

## 16. Redesign: product-owner-authored expert model (current, this session)

This section describes the **current, active** architecture. It
supersedes the external-source-verification gate described in §§1–15
above — see the notice at the top of this document.

### 16.1 Why the redesign

FreighTime's product owner is a qualified customs professional with
practical expertise in commercial import, customs brokerage, customs
classification, Israeli import requirements, documentation,
standards-related import checks, regulatory routing, customs-clearance
risk, and air/sea logistics. Requiring an autonomous agent to
independently open and read a primary government source before any
preliminary "worth checking" signal could ever appear was, on
reflection, the wrong technical precondition for this product: it
conflated *external-source verification* with *professional review*,
when the product owner's own direct professional review is itself a
legitimate basis for a hedged, non-final "direction to check" signal —
provided the result never claims to be a final regulatory
determination, and provided every safeguard against absolute/binding
language stays fully in force.

### 16.2 Canonical status model (`rule-status.js`)

| Status | Meaning | Can appear publicly? |
|---|---|---|
| `EXPERT_AUTHORED` | Professional rule content exists (product-owner-authored) but has not yet been deliberately approved for public pilot use. | No |
| `EXPERT_APPROVED_FOR_PILOT` | The product owner has explicitly reviewed and approved this rule's trigger, exclusions, questions, public wording, verification items, and professional route for a controlled pilot. No official source is required. | **Yes** |
| `OFFICIAL_SOURCE_SUPPORTED` | Same bar as `EXPERT_APPROVED_FOR_PILOT`, plus the rule also carries an official supporting reference. Does not make the result binding or final. | **Yes** |
| `REVIEW_DUE` | The rule has passed its own review-due date and needs professional re-review. | No (downgraded) |
| `DISABLED` | Never public, regardless of any other field. | No |

Only `EXPERT_APPROVED_FOR_PILOT` and `OFFICIAL_SOURCE_SUPPORTED` may
ever produce a public signal — enforced by the same hard code-level
gate as before (`isPubliclyEligible()` in `rule-status.js`), now
requiring: correct status, a professional-reviewed date, a review-due
date, explicit `exclusionPredicate`, a professional-verification
category, non-empty `publicLimitationText`/`publicTitle`/
`primaryExplanation`/`potentialImplication` — and, **only** for
`OFFICIAL_SOURCE_SUPPORTED`, at least one complete official source
(title + authority + URL). An official source is explicitly **not**
required for `EXPERT_APPROVED_FOR_PILOT`.

"Approved" always means *approved by the FreighTime product owner for
presentation as a professional direction for checking* — it never
means government-approved, legally certified, or professionally
reviewed by an external party.

### 16.3 Single canonical registry

The separate `evidence-package.js` schema/validator and
`evidence-packages/` scaffold directory from an earlier session
(including the unrequested `cosmetics-and-toiletries` scaffold) have
been **removed**. `js/import-readiness/regulatory-signals/rules-registry.js`
is now the single source of truth — one array, one status field per
rule, one activation decision (`isPubliclyEligible()`), consumed by the
one live matcher (`matcher.js`) via the one public entry point
(`index.js`'s `evaluateRegulatorySignals()`, already wired into
`personal-import-rules.js`, `first-commercial-import-rules.js`, and
`import-readiness-controller.js`).

### 16.4 The five rules — mechanical structure implemented, public content pending (superseded — see §16.7)

`rules-registry.js` now contains exactly five rules, using the product
owner's exact specified canonical ids:

1. `mains-connected-electrical-product`
2. `plastic-direct-food-contact`
3. `polymer-coated-direct-food-contact`
4. `glass-food-contact-vessel`
5. `vehicle-installed-product`

Each rule has its **trigger conditions, exclusion conditions,
follow-up question wiring (`questions.js`), free-text candidate terms
(`keyword-hints.js`), professional-category routing, and priority**
implemented exactly per the product owner's specification — this is
operational configuration, not a regulatory claim, and it is real,
tested, live logic.

Each rule's **public-facing content fields** — `publicTitle`
(status/category label), `primaryExplanation` (identification
sentence), `potentialImplication` (implication sentence),
`verificationItems`, and `professionalReason` — are **intentionally
left empty**. These are the sentences that assert something about what
a product characteristic may require, and per this task's own
execution boundary they must be entered directly by the product owner
into `rules-registry.js`, not generated from a task description. Until
they are filled in **and** `status` is deliberately changed to
`RULE_STATUS.EXPERT_APPROVED_FOR_PILOT` (or `OFFICIAL_SOURCE_SUPPORTED`),
the hard gate keeps every one of these five rules structurally silent
— empty content fields alone are enough to fail the gate, independent
of status. See `docs/product-owner-rule-authoring-guide.md` for the
exact fill-in and approval lifecycle, and the safety-boundary test at
`tests/import-readiness/regulatory-signal-candidates-remain-disabled.test.js`
(top-level path, CI-covered) for the enforced proof.

### 16.5 Shared public framing (`matcher.js`)

- Shared status label on every signal card: **"כיוון בדיקה מקצועי"**
  (`SIGNAL_STATUS_LABEL`).
- Shared short visible limitation on every card: **"התוצאה היא כיוון
  בדיקה ראשוני ואינה מהווה סיווג מכס או אישור יבוא."**
  (`SHORT_LIMITATION_TEXT`) — replaces the old per-rule limitation
  text; a rule's own `publicLimitationText` field still exists (the
  gate still requires it non-empty as a defense-in-depth check) but the
  *rendered* text is always this one shared sentence.
- A separate, longer, shown-**once**-per-result expanded limitation
  (`EXPANDED_LIMITATION_TEXT`) is available for the result-brief layer
  to surface a single time, never repeated per signal card: "התוצאה
  מבוססת על מאפייני המוצר ועל כללים מקצועיים שהוגדרו במערכת. היא
  נועדה לסייע בזיהוי נושאים שכדאי לבדוק לפני היבוא ואינה מהווה סיווג
  מכס, אישור תקן או החלטת רשות מוסמכת."
- No-match wording updated to reflect the expert-authored model rather
  than an external-verification claim: **"לא זוהה כיוון בדיקה מקצועי
  במאגר המצומצם שנבדק."** followed by **"אין בכך אישור שהמוצר פטור
  מדרישות יבוא."** — the term "כלל מאומת" is intentionally no longer
  used, reserved for a future `OFFICIAL_SOURCE_SUPPORTED` context only.
- "Professional-review freshness" wording ("נדרש עדכון מקצועי של
  הכלל.") replaces the old "official-source expiry" framing
  ("נדרש אימות מקור מעודכן.") for the stale-rule downgrade note — the
  concept applies identically whether or not a rule happens to also
  carry an optional official source.

### 16.6 What was not done in this session, and why (superseded — see §16.8)

Wiring a live, dynamically-rendered, accessible follow-up-question step
into the DOM (so a user is actually asked `mainsConnectedOrSuppliedAdapter`,
`directFoodOrDrinkContact`, etc. as part of the visible questionnaire,
with focus management and the documented question-budget UI) was **not**
built in this session — `evaluateRegulatorySignals()`'s
`relevantQuestions` output already exists and is already computed
correctly, but nothing in `import-readiness-controller.js` currently
renders it as an interactive step; this predates this session and is a
distinct, sizeable UI-engineering task in its own right, not something
this pass's scope covered. Free-text keyword hints continue to work as
before. This is an honest, explicitly-flagged gap, not a silent one.

This gap was closed in a later session — see §16.8.

### 16.7 Content entered and rules approved (2026-08-17)

On 2026-08-17 the product owner (a qualified customs professional)
supplied the five rules' public-facing content verbatim in chat, framed
explicitly as mechanical data-entry: the engineering session's task was
to copy the strings into `rules-registry.js` unchanged, not to author,
verify, or improve them. All five fields per rule — `publicTitle`,
`primaryExplanation`, `potentialImplication`, `verificationItems`
(≤3 items), `professionalReason` — were entered verbatim, and each
rule's `status` was then deliberately changed from `EXPERT_AUTHORED` to
`RULE_STATUS.EXPERT_APPROVED_FOR_PILOT` (never
`OFFICIAL_SOURCE_SUPPORTED` — no `officialSources` entry was added for
any rule). `verifiedDate` was set to `2026-08-17` and `reviewDueDate` to
`2027-02-17` (the standard `REVIEW_PERIOD_MONTHS = 6` period) for all
five. `professionalCategory`/`secondaryProfessionalCategory`,
`triggerPredicate`/`exclusionPredicate`, and `followUpQuestionIds` were
left exactly as previously implemented, per the product owner's
instruction not to touch them.

All 5 rules now clear `isPubliclyEligible()` and can produce a public
signal card once their trigger question is answered "כן" (or, for
`polymer-coated-direct-food-contact`, once the coating-material answer
is not `other_material`) and the user's free text already hints at the
relevant category. The safety-boundary test at
`tests/import-readiness/regulatory-signal-candidates-remain-disabled.test.js`
was rewritten to match: it no longer asserts the rules stay silent, but
still enforces the real remaining boundaries — exactly these 5 rule ids
(no 6th rule), status is `expert_approved_for_pilot` only (never
`official_source_supported`, never re-labeled), no `officialSources`
entries were fabricated, and a signal's content never asserts a final
classification, import approval, or exemption. `registry-honesty.test.js`
was updated the same way. The 9 acceptance scenarios specified by the
product owner (glass cup / glass figurine, coated paper cup, USB
cable / plugged device, vehicle headlight / car organizer, plastic food
box / non-food plastic handle) were each verified directly against
`evaluateRegulatorySignals()` with synthetic confirming answers — all 9
passed. The gap noted in §16.6 (no live DOM-rendered follow-up-question
step) remained open after this pass and was closed in the next session
-- see §16.8.

### 16.8 Live DOM integration for the focused-checks phase (2026-08-17, later session)

The gap flagged in §16.6 is closed. A new pure module,
`js/import-readiness/regulatory-signals/question-scheduler.js`, decides
which single live question to ask next (`computeNextFollowUpQuestionId`)
given the currently hinted candidate categories, the answers collected
so far, and the canonical rule registry — ordering candidates by
`operationalImpactPriority`, treating a "no" on the first question in a
rule's own chain as excluding the rest of that rule's questions (the
documented pattern all 5 rules already use), reusing a shared answer
across rules rather than re-asking it, and enforcing the question
budget (`NORMAL_QUESTION_BUDGET = 3`, `EXCEPTIONAL_QUESTION_BUDGET = 4`
— the exceptional 4th question is only ever used to finish a chain
already in progress, never to start a new one). Two further pure helpers,
`pruneStaleRegulatoryAnswers` and `pruneAnswersInvalidatedByExclusion`,
drop a stored answer once its category is no longer hinted (the user
edited the product description) or once an earlier answer in its own
chain excludes the rule that would have asked it (the user changed an
earlier answer to "no").

`import-readiness-controller.js` gained a new step, `regulatoryFollowup`
(element id `irStepRegulatoryFollowup`, already mapped to the existing
adaptive journey model's Phase C "בדיקות ממוקדות" — see
`journey-phase-model.js`, which already reserved this exact mapping).
Entered from every non-shipment-problem scenario path right before it
would otherwise compute a result; skipped cleanly (straight to the
result, no blank phase) when nothing is hinted. Each live question is
rendered directly from the canonical `questions.js` data (fieldset,
legend, native radio controls with stable `irReg-<questionId>-<value>`
ids, the question's own "לא ידוע" option, a previously-given answer
pre-selected) — the controller never hard-codes any of the 5 rules'
Hebrew wording. Only one question is present in the DOM at a time (the
previous one is fully replaced via `host.textContent = ''`, not merely
hidden, so a stale question is never focusable). Answers live only in
an in-memory object in the controller's closure (`regulatoryAnswers`) —
never `localStorage`/`sessionStorage`/`IndexedDB`/a cookie/the URL —
and are cleared entirely on reset.

The live-collected answers feed the existing, unmodified matcher
(`evaluateRegulatorySignals(normalized, { answers: regulatoryAnswers })`)
to produce a genuine result. The result view gained one new block,
rendered by `renderRegulatorySignalsBlock()`: the single highest-priority
matched signal fully expanded (status label, title, identification,
implication, up to 3 verification items, primary professional, at most
one supporting professional, confidence label, limitation, and one
collapsed "למה התקבלה התוצאה?" area), plus a one-line-each compact list
for any additional matched signals (never a second fully-expanded card
— "no information overload" per the task's own acceptance criteria).
`matcher.js` gained two small additive fields on each signal card,
`primaryProfessional`/`supportingProfessional` (split out of the
existing combined `professional` field, which is untouched for any
other consumer) — no existing field, rule content, trigger, exclusion,
professional-category mapping, confidence label, or no-match wording
was changed.

Editing the result returns to the last live regulatory question shown
(answer preserved) rather than skipping past the whole phase; changing
an earlier answer prunes any now-stale downstream answer via
`pruneAnswersInvalidatedByExclusion`, so a changed answer never leaves a
stale signal behind. Back navigation steps backward through the live
question sequence before falling back to the previous static step.
Starting a new assessment clears all regulatory state.

Verified via `tests/import-readiness/regulatory-signals/question-scheduler.test.js`
(20 pure unit tests: ordering, exclusion, shared-answer reuse, budget
enforcement including the exceptional-4th-question rule, both prune
functions, and a no-infinite-loop proof) and
`tests/import-readiness/regulatory-followup-live-dom.test.js` (22
hand-rolled-fake-DOM controller tests: candidate detection, canonical
question wording, skip-when-irrelevant, multi-question chains, budget,
back/edit/reset behavior, no fetch, no internal-id/status exposure).
Real-browser acceptance (Playwright, scratch-run only, never added to
this build-free repository) exercised all 9 product-owner-specified
scenarios by actually clicking through the rendered page at
`http://localhost:8000/index.html` — not by calling the matcher
directly — confirming: the right question appears/doesn't appear, the
right signal appears/doesn't appear, no exemption is ever implied, no
unexpected third-party network request occurs, and the focused-checks
question legend receives focus. The same run checked 7 viewports (320,
375, 430, 768, 1024, 1440, 1920px) for horizontal overflow and duplicate
element ids, checked `localStorage`/`sessionStorage`/cookies/the URL
stay empty/unmutated through a full live-question pass, and checked the
browser console stays free of errors through a full edit-then-reset
pass. See the PR body for the exact pass/fail counts from this run.

# Product Regulatory Signals — Pilot Research & Architecture Record

This document is an operational product record and not a legal opinion, binding classification, or import approval.

Date of this research: 2026-08-16. Researcher: an autonomous coding
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

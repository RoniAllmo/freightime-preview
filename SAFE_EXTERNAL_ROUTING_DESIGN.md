# Safe External Routing — Technical Design

Status: documentation-only. No routing behavior is implemented by this
document. No production code, configuration, or test file was created or
modified alongside it.

Branch: `claude/safe-official-routing-phase-1`
Base commit: `23d3038dd0ee76221fa5f548d8ab44e0ae70964f` (main, after PR #4 —
EMS classification)

---

## 1. Purpose

FreighTime currently identifies a shipment identifier's type (and, for
UPS/UPS Roadie, a possible carrier) but never navigates the user anywhere.
This document assesses whether — and how — FreighTime could later offer the
user an explicit, optional button such as:

> מעבר למעקב הרשמי

("Go to official tracking") that opens the shipment's *official* carrier or
postal-operator tracking destination in a new tab, after an explicit user
click.

This is a research and design document only. It does not implement the
button, does not modify `carrier-registry.js`, `router.js`, any
`detect-*.js` module, `ui-controller.js`, `ui-messages.js`, or `index.html`,
and does not add any tracking URL to a production file.

## 2. Current supported identifiers

As detected by the existing Single-input tracking router
(`js/tracking/router.js`, four detectors, all previously implemented and
merged):

| Identifier family | Detector | Result `identifierType` |
| --- | --- | --- |
| Ocean container | `detect-container.js` | `ocean-container` |
| Air waybill (AWB) | `detect-awb.js` | `air-waybill` |
| UPU S10 international postal (incl. EMS) | `detect-postal.js` | `international-postal` |
| UPS `1Z` | `detect-courier.js` | `commercial-courier` (`possibleCarriers: ["ups"]`) |
| UPS Roadie `1R` | `detect-courier.js` | `commercial-courier` (`possibleCarriers: ["ups-roadie"]`) |

These six identifier families are the entire scope of this research. No
other carrier (DSV, DHL, FedEx, Aramex, UPS Mail Innovations) is in scope,
per Section titled "Strict exclusions" in the originating task.

## 3. Product boundary

Per `CLAUDE.md` Sections 3, 4, and 8, and per this task's explicit
instructions, the following remain out of scope for this document and for
any future stage it recommends, unless separately authorized:

- Automatic detection of DSV, DHL, FedEx, or Aramex identifiers.
- UPS Mail Innovations.
- Freight forwarding references.
- Live tracking milestones rendered inside FreighTime.
- Any paid or authenticated tracking API integration.
- OAuth or any authentication flow.
- Carrier-website scraping.
- Automatic external navigation (the user must always click explicitly).
- Analytics or click tracking on the routing action.
- Storage of the entered shipment identifier, in memory beyond the current
  render cycle or on disk/remote.
- Any change to the assistant/chat interface.

This document proposes designs that respect these boundaries; it does not
request an exception to any of them.

## 4. Privacy and security principles

1. A shipment identifier is potentially sensitive operational data
   (`CLAUDE.md` Section 10) and must be handled the same way whether it is
   about to be classified or about to be handed to an external link.
2. Placing an identifier in a URL is not privacy-neutral: URLs can be
   captured by browser history, `Referer`/`Referrer-Policy` headers sent to
   third parties, server access logs (FreighTime's own and the destination
   carrier's), analytics tools on either site, and shared screenshots or
   copy-pasted links.
3. Because of (2), prefilling an identifier into an external URL is treated
   as a materially higher-risk action than linking to a generic tracking
   landing page, and must only be done when the official destination
   documents and supports that exact usage.
4. No destination is "approved" in this document without direct inspection
   of an official source in this working session. Aggregator sites,
   tracking-URL directories, blog posts, and forum threads are not
   acceptable evidence of an official, supported URL format, even when they
   describe a plausible-looking pattern.
5. No carrier or postal operator is inferred from a structural fragment of
   an identifier (container owner code, AWB airline prefix, S10 country
   suffix) without a verified, authoritative registry backing that
   inference. See Sections 9–11.

## 5. External-navigation user experience

Regardless of which identifier family is involved, any future external
link must:

- Never navigate automatically — the router result alone must never trigger
  navigation.
- Require one explicit user click on a clearly labeled button or link.
- Disclose, before the click, that the destination is external and is the
  official carrier/postal operator's own site (not a FreighTime tracking
  result).
- Open in a new tab (`target="_blank"`) with `rel="noopener noreferrer"`, so
  FreighTime's page retains no reference to the opened tab and the
  destination cannot access `window.opener`.
- Never be accompanied by any FreighTime-side logging, analytics event, or
  storage write triggered by the click.
- Never silently substitute a different destination than the one disclosed
  to the user.

## 6. UPS 1Z routing assessment

**Official destination found**: Not directly confirmed in this session.
UPS's tracking domain (`www.ups.com`) is widely known publicly, but it was
not directly reachable from this environment (see below), so it cannot be
recorded as "directly inspected" evidence.

**Directly inspected**: No. `https://www.ups.com` and
`https://www.ups.com/track` were both blocked by this environment's network
egress proxy (`EGRESS_BLOCKED`) on every attempt.

**Secondary evidence found (not used for approval)**: A web search located
several third-party tracking-URL directories and blog posts describing a
`tracknum` query parameter on `ups.com/track`. Per the task's explicit
source-priority rules, aggregator sites, tracking-URL directories, and blog
posts are excluded from the evidence basis for approving a destination or a
URL format — they are recorded here only as a limitation, not as evidence.

**Login required**: Unknown — could not be verified directly.

**Manual paste on official page**: Presumed yes (consistent with UPS being
a mainstream commercial carrier with public tracking), but not directly
verified this session.

**Prefilled URL officially documented**: Not verified. No official UPS
developer documentation was directly inspected.

**Recommended first-release action**: No external link. UPS 1Z routing
should not be approved until an official UPS source (developer
documentation or the tracking page itself) is directly inspected in a
future session, or the project owner supplies verified official
documentation.

## 7. UPS Roadie 1R routing assessment

**Official destination found**: Not directly confirmed.
`https://www.roadie.com` and `https://www.roadie.com/tracking` were both
blocked by the network egress proxy.

**Directly inspected**: No.

**Login required / manual paste / prefilled URL**: Unknown — could not be
verified directly. No secondary evidence was gathered for Roadie at all in
this session (unlike UPS, no aggregator data was even attempted, since it
would be excluded from the evidence basis regardless).

**Recommended first-release action**: No external link, for the same
reason as UPS 1Z — official-source verification is required and did not
occur in this session.

## 8. EMS routing assessment

**Official destination found**: Not directly confirmed. `https://ems.post`
and `https://www.ems.post/en/global-network/tracking` were both blocked by
the network egress proxy — this is a recurrence of the same blocker already
documented in `EMS_CLASSIFICATION_RESEARCH.md` from the earlier EMS
classification research task.

**Directly inspected**: No.

**Login required / manual paste / prefilled URL**: Unknown.

**Additional consideration specific to EMS**: even if the EMS Cooperative's
own tracking page were confirmed, EMS items are frequently tracked more
reliably through the *issuing national postal operator's* own tracking
system rather than (or in addition to) a central EMS page — see Section 9's
S10-country-suffix discussion, which applies equally to EMS since EMS
identifiers are a subset of S10.

**Recommended first-release action**: No external link. Do not route to
either an EMS-owned page or an inferred national postal operator without
direct official verification of each.

## 9. Generic S10 routing assessment

**Official destination found**: Not directly confirmed.
`https://www.upu.int` and the UPU track-and-trace page were both blocked by
the network egress proxy — again a recurrence of the blocker already
documented for the UPU domain in this project's earlier EMS research.

**Directly inspected**: No.

**Does the final S10 country suffix identify the correct tracking
operator?** The S10 standard's two-letter country code (confirmed
authoritatively in `S10_AUTHORITATIVE_VERIFICATION.md` from the official
UPU S10 PDF) identifies the *UPU member country under whose authority the
identifier was issued* — it does not, by itself, identify a specific
tracking website, a specific operator's tracking system URL, or guarantee
that operator offers public online tracking at all. Some postal operators
have no public online tracking; others require the full 13-character code
in a specific format; others require additional user input (e.g. a
destination postal code).

**Can generic S10 safely route to a specific national postal operator based
on the country suffix alone?** No. Inferring a specific operator's tracking
URL from the two-letter suffix alone would require a verified,
maintained registry mapping every ISO 3166-1 country code that can appear
in an S10 identifier to that country's designated postal operator's
official tracking destination — no such registry has been built or
verified in this project. Per the approved safety principles (Section 4,
item 5; task principle 7), this inference must not be made.

**Recommended first-release action**: No external link for generic
(non-EMS) S10. A future stage would need either (a) a verified
country→operator tracking-destination registry (large scope, many official
sources to individually verify), or (b) a single UPU-operated central
track-and-trace destination that accepts any valid S10 code — which would
first require directly inspecting `upu.int`'s track-and-trace service to
confirm it exists, requires no login, and supports this use.

## 10. AWB routing assessment

**Official destination found**: None, by design. Air waybills are
issued and tracked per-airline; there is no single official pan-industry
AWB tracking website. The three-digit numeric prefix of an eleven-digit AWB
number identifies the *issuing* airline via IATA's airline prefix
allocation, but FreighTime's `detect-awb.js` currently validates only AWB
structure and check digit — it does not resolve or claim to resolve the
issuing airline.

**Directly inspected**: Not applicable in the same sense as a single
website — there is no single destination to inspect. (No fetch was
attempted against IATA's prefix registry in this session, since resolving
a prefix to a specific airline would still require a verified,
maintained registry before any routing decision could be considered, per
task principle 9. Building or verifying such a registry is out of scope for
this document.)

**Can an AWB route to a carrier only after an officially verified
three-digit airline prefix is available?** Yes — and only then. Without a
verified prefix→airline→tracking-URL registry, any AWB routing would be a
guess based on a bare three-digit number, which the approved safety
principles explicitly forbid (Section 4, item 5; task principle 9).

**Recommended first-release action**: Registry required before routing. No
external link should be offered for AWB results until a verified
airline-prefix registry (mapping prefix → airline → official tracking
destination, each entry individually verified) exists and is
project-owner-approved.

## 11. Ocean-container routing assessment

**Official destination found**: None, by design. Ocean container numbers
carry a four-letter BIC-registered owner code, but there is no single
official pan-industry container tracking website — tracking is performed
per shipping line, and the BIC owner-code registry identifies the
*equipment owner*, not necessarily the operating carrier for a given
shipment (containers are frequently leased and interchanged between
carriers).

**Can a container route to a shipping line based only on the ISO owner
code?** No. Even a verified BIC owner-code lookup would only identify who
*owns* the container equipment, not which shipping line is operating the
specific shipment or which line's tracking system should be queried. This
is a stronger inference gap than the AWB case, not merely an unverified
one. Per the approved safety principles (Section 4, item 5; task
principle 8), this inference must not be made.

**Recommended first-release action**: Registry required before routing —
and even with an owner-code registry, additional per-shipment operator
confirmation would be needed before any specific destination could be
proposed. No external link should be offered for ocean-container results
in a first release.

## 12. Generic page versus prefilled-link decision

Across all six identifier families, this session could not directly inspect
a single official destination (all attempted official domains —
`ups.com`, `roadie.com`, `ems.post`, `upu.int` — were blocked by this
environment's network egress proxy; AWB and ocean containers have no single
official destination by design). Consequently:

- No prefilled link is approved for any identifier family in this
  document, because the task's explicit rule — "Do not approve a prefilled
  link unless directly supported by an official source" — cannot currently
  be satisfied for any of the four web-based destinations, and does not
  apply at all to AWB/container (no registry yet, so no destination of any
  kind is approved).
- No generic tracking-page link is approved either, for the same
  directly-inspected-evidence requirement, even though the general
  existence of `ups.com`, `roadie.com`, `ems.post`, and `upu.int` as
  carrier/operator domains is common public knowledge. This document
  deliberately does not rely on "common knowledge" in place of direct
  inspection, consistent with the task's instruction not to invent or
  assume a URL pattern.
- Once official sources are reachable (a future session, or a
  project-owner-supplied source document, similar to how the UPU S10 PDF
  was supplied for the EMS classification research), the generic-page
  option should be preferred over a prefilled link by default, per
  principle 5 in "Approved safety direction" — prefilled links are the
  higher-risk, higher-bar option.

## 13. Safe external-link requirements

Any future implementation of an external routing link must satisfy all of
the following before release, regardless of identifier family:

1. The destination domain has been directly inspected in an official
   capacity (official carrier/operator site, official developer
   documentation, or an official document such as a supplied PDF/API
   spec).
2. If the link is a generic tracking-page link: the page is confirmed to
   be the operator's own official domain and requires no pre-existing
   login merely to view the tracking form.
3. If the link is a prefilled link containing the identifier: the exact
   query-parameter or path format is confirmed directly from an official
   source, not inferred or reused from a third-party aggregator.
4. The link opens only after an explicit user click, in a new tab, with
   `rel="noopener noreferrer"`.
5. The user is shown, before the click, that they are leaving FreighTime
   for the operator's own official site.
6. No FreighTime-side logging, analytics, or storage occurs as part of
   presenting or following the link.
7. The link is never offered for an `ambiguous` or `unrecognized` router
   result, or for a `recognized-invalid` (structurally or check-digit
   invalid) result — only for a `recognized-valid` result of a family that
   has cleared checks 1–3 above.

## 14. Ambiguous and unsupported-result behavior

- `ambiguous` results (possible-carrier lists with more than one entry)
  must not show any external link — there is no single destination to
  disclose, and offering one destination among several would misrepresent
  the identifier as belonging to a specific carrier.
- `unrecognized` results must not show any external link, for the same
  reason — there is no known destination.
- `recognized-invalid` results (valid structure family, invalid check
  digit or invalid structural detail) must not show any external link —
  routing a probably-incorrect identifier to an external carrier site
  could send the user to a false-negative "not found" experience that
  looks like a FreighTime error, or could resemble the router "vouching"
  for structurally invalid input.
- Only `recognized-valid` results for an identifier family that has an
  approved destination (none currently, per Sections 6–11) may ever show
  a link.

## 15. Proposed routing data model

This section is conceptual only — it does not modify `carrier-registry.js`
or introduce any new production file. A future standalone routing-decision
module (see Section 16, stage 3) could represent each approved external
destination as a record with fields such as:

- **Internal destination ID** — a stable internal key (e.g. `ups`,
  `ups-roadie`, `ems`, `upu-s10-generic`), analogous to the existing
  internal carrier IDs already used in `possibleCarriers`.
- **Display name** — the human-readable operator/carrier name, never shown
  to the user without also disclosing it is an external destination.
- **Official domain** — the exact verified domain the link will point to,
  recorded alongside the evidence that verified it.
- **Generic tracking-page URL** — the verified, non-prefilled landing page,
  when confirmed.
- **Identifier-prefill supported (boolean)** — whether a documented,
  officially supported prefilled-URL format exists; false by default until
  proven.
- **Supported identifier type** — which router `identifierType` /
  `possibleCarriers` combination this destination applies to.
- **Confidence requirement** — the minimum router confidence/validity this
  destination may be offered for (see Section 14 — `recognized-valid`
  only).
- **Enabled status** — an explicit on/off flag, defaulting to off for any
  newly added destination until project-owner approval, mirroring the
  approval discipline already used for carrier detection (e.g. the UPS
  first-wave approval record in `COURIER_IMPLEMENTATION_DECISION.md`).
- **Evidence source** — a reference to exactly which official source (URL,
  document, date inspected) justified this destination's approval, so the
  evidence trail is auditable the same way `S10_AUTHORITATIVE_VERIFICATION.md`
  and `EMS_CLASSIFICATION_RESEARCH.md` document the S10/EMS technical
  decisions.
- **Privacy notes** — any destination-specific privacy caveat (e.g. "this
  operator's tracking page is known to require a CAPTCHA" or "this
  operator's URL format is not documented as safe for identifier
  prefill").

## 16. Future implementation stages

Each stage below is deliberately scoped the same way prior FreighTime
feature work has been (research → decision → implementation → tests →
integration → UI → review → deployment → validation), one stage per task.

1. **Project-owner approval of routing decisions** — completion criterion:
   the project owner has explicitly approved, in writing, which specific
   identifier families (if any) may receive an external link, and which
   destinations (generic page vs. prefilled) for each, based on directly
   inspected official evidence gathered in a future research stage (see
   Section 17, open decision 1).
2. **Registry design** — completion criterion: a design document (not
   code) describing the concrete schema for the data model in Section 15,
   reviewed and approved, with no production file changed.
3. **Standalone routing-decision module** — completion criterion: a new,
   isolated module (e.g. `js/tracking/resolve-routing.js`) that takes a
   router result and the approved registry and returns a structured
   routing decision (destination or "none"), with no DOM access and no
   navigation side effects, matching the existing detector-module pattern.
4. **Automated tests** — completion criterion: unit tests covering every
   approved and unapproved identifier family, ambiguous/unrecognized/
   invalid exclusions (Section 14), and confirming the module performs no
   navigation, storage, or logging.
5. **Router integration** — completion criterion: the router result
   optionally carries a routing decision field, with existing detector
   results, `possibleCarriers`, and all other router contract fields
   unchanged, and existing router tests still passing.
6. **Hebrew disclosure and button text** — completion criterion: Hebrew
   message(s) drafted and approved (e.g. the "מעבר למעקב הרשמי" button
   label plus an explicit external-destination disclosure), added to
   `ui-messages.js` only, with no functional logic in that file.
7. **UI implementation** — completion criterion: the button/link is
   rendered only for approved, `recognized-valid` results, uses
   `target="_blank"` and `rel="noopener noreferrer"`, requires an explicit
   click, and does not alter the existing tracking input/button behavior.
8. **Security review** — completion criterion: a review confirming no
   identifier leakage beyond the officially-approved prefill cases, no new
   logging/analytics, and correct `noopener`/`noreferrer` usage.
9. **Local smoke test** — completion criterion: manual verification in a
   local server that the button appears only for approved cases, opens the
   correct destination in a new tab, and does not affect any other tab
   behavior (search tabs, chat interface).
10. **Pull Request** — completion criterion: a PR is opened describing the
    exact scope, diff limited to the approved files, and test results
    included.
11. **Deployment** — completion criterion: PR merged and GitHub Pages
    deployment verified successful, following the same pattern used for
    PR #3 and PR #4.
12. **Public manual testing** — completion criterion: the project owner (or
    an authorized tester) manually confirms the button behaves as
    designed on the live site for each approved identifier family.

## 17. Open product decisions

These are explicitly left open — this document does not resolve them:

1. **Which identifier families, if any, get a first-release external
   link at all?** Given that zero official sources were directly
   inspectable in this session, the honest current answer is "none yet."
   The project owner must decide whether to (a) wait for a future session
   with network access to the relevant official domains, (b) supply
   official source documents directly (as was done for the UPU S10 PDF),
   or (c) explicitly accept a "generic domain, not independently verified
   this session" risk for well-known carriers like UPS — this document
   does not recommend option (c).
2. **Whether a country→postal-operator registry for generic S10 routing
   is worth building at all**, given its scope (potentially dozens of
   individually-verified official sources) versus its value (a route that
   still cannot promise the destination page will accept every valid S10
   code).
3. **Whether an AWB airline-prefix registry is in scope for FreighTime
   at all**, or whether AWB should permanently remain "no external link"
   given the multi-airline complexity.
4. **Whether ocean-container routing should ever be attempted**, given
   that even a fully verified BIC owner-code registry does not resolve to
   an operating carrier.
5. **Whether "EMS" should route to a UPU-operated central page, the
   issuing national operator, or remain unrouted indefinitely** — unresolved
   pending direct inspection of `ems.post` and `upu.int`.

## 18. Recommended immediate next action and explicit exclusions

**Recommended immediate next action**: obtain direct access to official
evidence for the four web-based destinations before any further routing
design work — either through a future session with unblocked network
access to `ups.com`, `roadie.com`, `ems.post`, and `upu.int`, or through
project-owner-supplied official source documents (PDFs, developer-docs
exports, or explicit written confirmation), following the same pattern
that successfully unblocked the EMS classification research
(`EMS_CLASSIFICATION_RESEARCH.md`). Until that evidence exists, no further
implementation stage in Section 16 should begin.

**Explicit exclusions from this document and from any near-term follow-up
it implies**:

- No routing button, link, or navigation was implemented.
- No file other than this one was created or modified.
- No production tracking URL was written anywhere in the repository.
- No carrier or postal-operator inference was approved from a bare
  structural fragment (container owner code, AWB prefix, S10 country
  suffix).
- No DSV, DHL, FedEx, Aramex, or UPS Mail Innovations research or
  implementation occurred.
- No analytics, storage, scraping, OAuth, or live-tracking-API work
  occurred.
- No assistant/chat interface change occurred.

---

## Assessment matrix

| Identifier family | Official destination found | Directly inspected | Login required | Official prefilled URL verified | Privacy risk | False-routing risk | Recommended first-release action | Approved for future implementation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UPS 1Z | Not confirmed (domain blocked) | No | Unknown | No | Unverified — treat as high until confirmed | Low (structural match is carrier-specific) | No external link | Not yet — pending direct source verification |
| UPS Roadie 1R | Not confirmed (domain blocked) | No | Unknown | No | Unverified — treat as high until confirmed | Low (structural match is carrier-specific) | No external link | Not yet — pending direct source verification |
| EMS | Not confirmed (domain blocked) | No | Unknown | No | Unverified — treat as high until confirmed | Medium (EMS page vs. issuing operator ambiguity) | No external link | Not yet — pending direct source verification |
| Generic S10 | Not confirmed (domain blocked) | No | Unknown | No | Unverified — treat as high until confirmed | High (country suffix ≠ verified operator URL) | No external link | Not yet — registry or UPU central page needed |
| AWB | None by design (no single official site) | Not applicable | Not applicable | No | N/A until a destination exists | High (prefix ≠ verified airline without registry) | Registry required before routing | Not yet — needs verified airline-prefix registry |
| Ocean container | None by design (no single official site) | Not applicable | Not applicable | No | N/A until a destination exists | High (owner code ≠ operating carrier) | Registry required before routing | Not yet — needs registry plus per-shipment operator confirmation |

---

## Sources consulted

**Official sources attempted (all blocked by this environment's network
egress proxy — `EGRESS_BLOCKED`, no content retrieved)**:

- `https://www.ups.com`
- `https://www.ups.com/track`
- `https://roadie.com`
- `https://www.roadie.com/tracking`
- `https://www.upu.int`
- `https://www.upu.int/en/postal-solutions/programmes-and-services/track-and-trace`
- `https://ems.post`
- `https://www.ems.post/en/global-network/tracking`

**Secondary sources found via web search (recorded as a limitation only —
explicitly not used as approval evidence, per the task's source-priority
rules)**: third-party tracking-URL directories and blog posts describing an
unverified `tracknum` query-parameter pattern for `ups.com/track`.

**Prior project research reused for context (not re-verified in this
session)**: `S10_AUTHORITATIVE_VERIFICATION.md` and
`EMS_CLASSIFICATION_RESEARCH.md`, both already authoritatively sourced from
an official UPU S10 standard PDF in an earlier task.

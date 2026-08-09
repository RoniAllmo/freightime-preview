# In-house Tracking Architecture — Technical Design (Phase 1)

Status: documentation-only. No backend, dependency, API request, credential,
or production/test code change is made by this document. No UPS or EMS
request of any kind was made while researching or writing it. No real
tracking identifier or credential appears anywhere below — every example
value is explicitly synthetic and marked as such.

Branch: `claude/inhouse-tracking-architecture-phase-1`
Base commit: `afc520b7c5aaf13ac0e9f07d42264c07a9c5db0c` (main, after PR #5 —
safe links to official tracking pages)

**Update (following commit `1d85920` — initial architecture design):** the
project owner has approved four architecture decisions: the backend
platform (Azure Functions with Node.js, Section 8), the backend's future
location (a separate repository, `freightime-tracking-api`, never this
frontend repository, Section 18), the first backend implementation mode
(mock-only — no UPS credentials, no UPS API calls, no live tracking,
Sections 12, 13, 19), and the roadmap order (Section 19, updated to 20
stages). These approvals are recorded throughout Sections 6, 8, 12, 13,
17, 18, 19, and 20 below. **No backend repository, code, dependency,
credential, or Azure/UPS request exists as a result of this update** —
this remains a documentation-only decision record.

---

## 1. Purpose

FreighTime's Single-input tracking router (`js/tracking/`) currently
detects an identifier's type and possible carrier, and — for UPS, UPS
Roadie, and EMS — offers an explicit, user-clicked link to that carrier's
generic official tracking page (`SAFE_EXTERNAL_ROUTING_DESIGN.md`,
`js/tracking/official-routing.js`). It never retrieves live tracking data
itself.

This document is the first design stage toward a future **In-house
Tracking** capability: letting a user see authorized, provider-sourced
live tracking status *inside* FreighTime, for identifiers FreighTime has
already locally validated, without ever exposing a provider's credentials
in browser-delivered code. It designs the architecture only. It does not
implement a backend, does not add a dependency, does not call any
provider, and does not request or use any credential.

UPS is evaluated as the first candidate provider, because FreighTime
already has an approved, structurally-verified UPS detector
(`detect-courier.js`) and an approved UPS official-tracking-page link
(`SAFE_EXTERNAL_ROUTING_DESIGN.md` Section 6). EMS and every other carrier
remain future candidates, each requiring its own separate approval
(Section 20).

## 2. Current FreighTime architecture

As of this document, FreighTime is:

- A static website hosted on GitHub Pages (`index.html`, plain CSS, no
  build step).
- Native browser JavaScript only — ES modules under `js/tracking/`
  (`normalize.js`, `detect-container.js`, `detect-awb.js`,
  `detect-postal.js`, `detect-courier.js`, `carrier-registry.js`,
  `official-routing.js`, `router.js`, `ui-controller.js`,
  `ui-messages.js`), no framework, no bundler.
- Entirely client-side: there is no backend, no server-side process, and
  no server-side code anywhere in this repository.
- Free of secret storage of any kind — no environment file, no secrets
  manager, no server-side configuration exists to store one.
- Free of any live tracking API call — `router.js` and every `detect-*.js`
  module perform local pattern matching only (`CLAUDE.md` Section 10;
  `PRODUCT_SPEC.md` Section 11).
- Free of persistent identifier storage — no cookie, `localStorage`,
  `sessionStorage`, database, or log captures the entered identifier
  (verified by dedicated tests across `tests/tracking/*.test.js`).

This baseline is the starting point every design decision below must
preserve or explicitly justify changing.

## 3. Product objective

Allow a user who has entered a shipment identifier that FreighTime's
existing detectors already recognize as `recognized-valid` for a supported
provider (UPS first) to additionally see authorized, minimally-scoped live
tracking status retrieved from that provider's API, rendered inside
FreighTime — as a strict *addition* to, not a replacement for, the
existing local detection result and the existing official-tracking-page
link (`SAFE_EXTERNAL_ROUTING_DESIGN.md`). The existing static site,
detection pipeline, and official-link behavior must remain fully
operational throughout backend development and must not depend on the
backend being available (Section 16).

## 4. Non-goals

This document explicitly does not:

- Select, provision, or configure any backend platform, hosting account,
  or cloud subscription (a *recommendation* is made in Section 8, but
  selection requires separate project-owner approval per Section 20).
- Implement any code, endpoint, dependency, `package.json`, or workflow
  file.
- Register a UPS Developer application or request/handle any real client
  ID, client secret, or access token.
- Make any request to the UPS API, the EMS API, or any other provider.
- Add live tracking data, browser storage, analytics, or persistent
  identifier history to the live website.
- Decide EMS's, or any other carrier's, in-house tracking design — those
  remain separate, later-approved efforts (Section 20).
- Change `index.html`, any file under `js/tracking/`, any test file, or
  any other existing file in this repository.

## 5. Threat model

Actors and risks this design must defend against:

- **A malicious or curious website visitor** who views page source,
  browser dev tools, or network requests: must never see a provider
  credential, a provider access token, or an unredacted upstream response,
  regardless of how the tracking request is made.
- **An attacker attempting credential theft via the repository or build
  artifacts**: since GitHub Pages serves this repository's committed files
  directly, any credential committed here is instantly public — the
  backend must live in a separate, non-Pages-served execution environment
  with its own secret store (Section 6, item 1–2).
- **An attacker attempting to abuse the backend endpoint** (scraping
  arbitrary tracking numbers at volume, probing for injection, or using
  FreighTime's backend as a free proxy to the UPS API): mitigated by input
  validation, rate limiting, and restricted CORS (Section 15).
- **An attacker attempting cross-origin abuse** (a third-party site
  calling FreighTime's backend on a visitor's behalf): mitigated by
  restricting CORS to FreighTime's own approved origins (Section 6, item
  11).
- **Accidental data exposure through logs, caches, or error messages**: a
  misconfigured logger, a public CDN cache, or a verbose error handler
  could each leak a tracking identifier or upstream response content —
  mitigated by explicit no-logging-by-default, no-public-caching, and
  redacted-error-message rules (Sections 6, 14, 16).
- **Provider outage or throttling degrading the local product**: a UPS
  outage must degrade to the existing local-detection experience, never to
  a broken or misleading page (Section 16).
- **Scope creep into unapproved providers**: nothing in this design may be
  read as approving EMS, DSV, DHL, FedEx, Aramex, or any airline/shipping
  line for in-house tracking (Section 20).

## 6. Security principles

The design is bound by these non-negotiable rules, matching the task's
security baseline and `CLAUDE.md` Sections 4, 9, and 13:

1. Provider credentials (client ID, client secret, any access/refresh
   token) exist only in the backend's server-side execution environment —
   never in any file this repository's static site serves.
2. No client secret of any kind appears in JavaScript, HTML, Git history,
   GitHub Pages output, or browser storage.
3. The browser only ever calls FreighTime's own backend endpoint
   (Section 12) — it never calls a provider API directly.
4. The backend, not the browser, calls the provider API.
5. The backend returns only the minimum normalized fields defined in
   Section 13 — never the provider's full raw response.
6. Tracking identifiers are not logged by default (Section 14).
7. Responses are not cached in any public/shared cache (CDN, browser HTTP
   cache marked public, reverse proxy) — see Section 14 for the narrow,
   justified exception.
8. Rate limiting is mandatory on the backend endpoint (Section 15).
9. Input validation is mandatory before any upstream call is made
   (Section 12).
10. HTTPS is mandatory for every hop: browser→backend and backend→provider.
11. CORS on the backend endpoint is restricted to FreighTime's approved
    origins only — no wildcard `*` origin.
12. Error messages returned to the browser never include a provider
    credential, a provider access token, or a raw/unredacted upstream
    response body (Section 16).
13. No scraping and no reverse-engineered/undocumented provider endpoint
    is used — only the provider's official, documented API.

**Approved as mandatory (following commit `1d85920`)**, restating and
extending the above into one authoritative checklist for every future
implementation stage:

- HTTPS.
- Restricted CORS.
- JSON request body only.
- Request-size limit.
- Input-length limit.
- Character validation.
- Rate limiting.
- No identifier logging.
- No public response caching.
- Generic error messages.
- Security headers.
- No stack traces in responses.
- No credentials in repository files.
- No real customer identifiers in tests.
- No unlimited retries.

## 7. Platform comparison

| Criterion | Azure Functions | Azure App Service (Node.js) | Cloudflare Workers | GitHub Pages + external serverless |
| --- | --- | --- | --- | --- |
| Secret management | Native (Azure Key Vault / Function App settings, encrypted at rest) | Native (App Service configuration / Key Vault references) | Native (Workers Secrets, encrypted) | Depends entirely on whichever platform is chosen — no built-in option, since GitHub Pages itself cannot hold secrets |
| OAuth support | Full — any Node.js OAuth client library runs normally | Full — same as Functions, longer-running process available | Partial — Workers' runtime is a V8 isolate (no Node.js `http`/`net`/`fs`); OAuth token exchange is possible via `fetch`, but some Node-specific OAuth libraries need adaptation | Depends on the chosen external platform (effectively evaluated by whichever of the other three rows is selected) |
| Deployment complexity | Low–medium (single Function App, `func` CLI or CI/CD) | Medium (App Service plan, deployment slots, more infrastructure surface) | Low (`wrangler` CLI, single-file or small-module deploy) | Adds a second deployment target/pipeline on top of the existing GitHub Pages deploy — inherently more moving parts than a single backend platform |
| Cost | Consumption plan: pay-per-execution, generous free grant, near-zero at FreighTime's expected early volume | Always-on plan has a fixed monthly floor even at low traffic (unless using a free/shared tier with cold-start and quota limits) | Free tier covers a large number of requests/month; paid tier is usage-based and low-cost at this scale | Cost = cost of whichever platform is chosen, plus GitHub Pages' cost (currently $0) |
| Rate limiting | Built into Azure API Management if fronted by it; otherwise must be implemented in-function or via Azure Front Door | Same options as Functions | Built-in Cloudflare rate-limiting rules available at the edge, independent of application code | Depends on the chosen platform; no rate limiting is native to GitHub Pages itself (it serves static files only) |
| Logging controls | Azure Monitor / Application Insights, configurable retention and redaction | Same as Functions | Workers Logs / Logpush, configurable; smaller built-in retention window than Azure Monitor | Depends on the chosen platform |
| CORS | Configurable per-Function or via API Management | Configurable in App Service / via code | Configurable in Worker code (full control over response headers) | Depends on the chosen platform |
| Scalability | Automatic, scales to zero and up with load | Manual scaling rules or autoscale, does not scale to zero on the always-on tiers | Automatic, runs at Cloudflare's edge, very high ceiling | Depends on the chosen platform |
| Maintenance | Low — no server to patch, managed runtime | Medium — more configuration surface (plan sizing, scaling rules) to maintain over time | Low — no server to patch, managed runtime | Adds the maintenance burden of a second platform relationship on top of GitHub Pages |
| Microsoft ecosystem compatibility | Native — first-party Azure service, integrates directly with Azure Key Vault, Azure AD app registrations, Azure Monitor | Native — same ecosystem as Functions | None — Cloudflare is a separate ecosystem from Microsoft/Azure | Neutral — compatibility is whatever the chosen external platform offers |
| Suitability for UPS Tracking API | Good — standard Node.js `fetch`/`https` and OAuth client libraries work without modification | Good — same as Functions, plus more headroom for longer-running or stateful logic if ever needed | Workable — UPS's API is reachable via `fetch`, and token caching can use Workers KV, but the non-Node runtime is an added integration constraint versus a plain Node.js host | Depends entirely on the chosen external platform — this row does not evaluate a concrete runtime by itself |
| Suitability for future providers | Good — any additional Node.js-compatible provider client integrates the same way | Good — same as Functions | Workable, with the same `fetch`-based constraint noted above for every future provider | Same caveat as above |

## 8. Recommended backend platform

**Approved (following commit `1d85920`): Azure Functions with Node.js**,
for the first backend implementation. The project owner has explicitly
approved this platform — it is no longer only a recommendation pending
approval (compare Section 20, open decision 1, now resolved).

**Approved reasons, as recorded by the project owner**:

- Server-side secret isolation.
- Native Azure secret-management options.
- HTTPS endpoints.
- CORS configuration.
- Serverless scaling.
- Suitable OAuth token handling.
- Low initial operating cost.
- Compatibility with the Microsoft ecosystem.
- Ability to add future provider adapters.

**Original recommendation rationale (unchanged, retained for the
record)**:

- Native secret management (Azure Key Vault or encrypted Function App
  settings) directly satisfies Security principle 1–2 (Section 6) without
  introducing a third-party secrets product.
- Consumption-plan pricing keeps cost near zero at FreighTime's expected
  early traffic, while still auto-scaling if usage grows.
- A standard Node.js runtime means the UPS OAuth client and Tracking API
  integration (Section 10–11) can use conventional, well-documented
  Node.js HTTP/OAuth libraries with no platform-specific rewrites,
  unlike Cloudflare Workers' non-Node runtime.
- Scales to zero when idle, avoiding the fixed monthly cost floor of an
  always-on Azure App Service plan.
- Deployment complexity is lower than App Service (no App Service plan or
  deployment-slot configuration required for a single small endpoint).
- If FreighTime later stays within (or moves further into) a Microsoft-
  centric toolchain, Azure Functions integrates most directly with Azure
  Monitor for logging controls (Section 14) and Azure API Management for
  rate limiting (Section 15), should either become necessary beyond
  in-code implementations.

Cloudflare Workers is the strongest alternative — comparable cost profile
and strong built-in rate limiting/edge scalability — but its non-Node.js
runtime is a real integration cost for OAuth-heavy provider clients like
UPS's, without a corresponding benefit for FreighTime's current expected
scale. Azure App Service is not recommended as the *first* implementation
because its always-on cost floor and larger configuration surface are not
justified for a single low-traffic endpoint. GitHub Pages plus an external
serverless backend is not itself a platform choice — it restates that the
static site stays on Pages while a *separate* platform (one of the other
three rows) hosts the backend, which this design already assumes
regardless of which specific platform is picked.

**This platform choice is now approved** (see Section 20, open decision 1,
now resolved). No Azure resource, subscription, or configuration is
created by this document — approval of the platform is a decision record
only, not a provisioning action.

## 9. High-level request flow

```
+-----------+        HTTPS         +----------------------+        HTTPS         +----------------+
|  Browser  |  ----------------->  |  FreighTime Backend   |  ----------------->  |   UPS API      |
| (static   |  POST /api/         |  (Azure Functions,     |  OAuth + Tracking    | (provider-     |
|  FreighTime|  tracking/ups       |  server-side only)     |  request              |  owned)        |
|  website) |  {trackingNumber}    |                        |                       |                |
|           |  <-----------------  |  - validates input     |  <-----------------  |                |
|           |  normalized JSON     |  - holds credentials    |  raw JSON response    |                |
|           |  result (Sec. 13)    |  - calls UPS            |                       |                |
+-----------+                       |  - maps/redacts result |                      +----------------+
                                     +----------------------+
```

The browser never holds a credential and never talks to `api.ups.com`
directly. Only the backend process, running outside the statically-served
GitHub Pages site, ever sees the UPS client secret or an issued UPS access
token.

## 10. UPS authentication design

Server-side only, per Security principle 1 (Section 6):

1. **Registered UPS Developer application** — a UPS Developer Kit account
   and application must be registered by the project owner (not by Claude
   Code, and not as part of this document) to obtain a Client ID and
   Client Secret. This document does not request, receive, or use any such
   credential.
2. **Client ID and Client Secret** — stored only in the backend platform's
   secret store (Section 8's recommended Azure Key Vault / Function App
   application settings), never in this repository, never in any file
   served by GitHub Pages.
3. **OAuth token acquisition** — the backend exchanges the Client ID and
   Client Secret for a short-lived UPS OAuth access token via UPS's
   documented OAuth 2.0 client-credentials token endpoint, server-side
   only.
4. **Server-side token caching** — the backend caches the issued access
   token in server-side memory or the backend platform's own secret/cache
   store (never returned to the browser) for the token's stated validity
   window, to avoid requesting a new token on every tracking request.
5. **Token expiry handling** — the backend tracks the token's expiry time
   and proactively requests a new token before expiry (or reactively, on
   receiving an authentication-failure response from the UPS Tracking API)
   rather than assuming a fixed lifetime.

```
Backend                                UPS OAuth Token Endpoint
   |                                          |
   |--- POST client_id + client_secret ----->|
   |                                          |
   |<-- access_token + expires_in -----------|
   |                                          |
   |  [cache token server-side until near     |
   |   expiry; never sent to the browser]     |
   |                                          |
   |--- (on later requests) reuse cached ---->|  (no token request needed
   |     token until it nears expiry               until refresh is due)
```

6. No token, client ID, or client secret is ever included in any response
   the backend sends to the browser (Section 12, 13).

## 11. UPS tracking-request design

7. **UPS Tracking API request** — the backend calls UPS's documented
   Tracking API using the cached access token as a bearer credential,
   passing the already-locally-validated tracking number (Section 12) as
   the only shipment-identifying input.
8. **Timeout handling** — the backend applies a bounded request timeout
   (e.g. a single-digit number of seconds) to the UPS call; a timed-out
   request is treated the same as a provider-unavailable failure
   (Section 16), never left to hang indefinitely.
9. **Retry rules** — at most a small, fixed number of retries (e.g. one)
   for a transient/network-level failure only, with a short backoff;
   application-level errors (invalid tracking number, not found,
   authentication failure) are never retried, per Security principle 6
   in the "Failure and fallback behavior" section (Section 16, item 6:
   "do not retry indefinitely").
10. **Rate limiting** — the backend enforces its own outbound rate limit
    toward UPS (in addition to the inbound rate limit toward the browser,
    Section 15) so a burst of FreighTime traffic cannot itself violate
    UPS's API terms or trigger UPS-side throttling.
11. **Error mapping** — any UPS-side error (authentication failure, rate
    limit, not-found, malformed request, service outage) is mapped to one
    of the backend's own defined response shapes (Section 12) — the raw
    UPS error body is never forwarded to the browser verbatim.
12. **Minimal response transformation** — only the fields defined in the
    provider-neutral contract (Section 13) are extracted from UPS's
    response; nothing else from UPS's response is retained past the
    request that produced it (Section 14 — no permanent tracking
    history).
13. **No raw credential exposure** — the access token, client ID, and
    client secret are used only in the backend→UPS request; none of them
    appear in the backend→browser response under any circumstance,
    including in error paths.
14. **No browser-side direct UPS API call** — the browser is never given a
    UPS endpoint URL, a UPS access token, or any means to call UPS
    directly; it only ever calls FreighTime's own backend endpoint
    (Section 12).

```
Backend                                UPS Tracking API
   |                                          |
   |--- GET/POST tracking request ---------->|
   |     (Authorization: Bearer <token>,      |
   |      trackingNumber)                     |
   |                                          |
   |<-- raw UPS tracking response ------------|
   |                                          |
   |  [map to minimal normalized result       |
   |   (Section 13); discard the rest]        |
   |                                          |
   v
Browser receives only the normalized result.
```

## 12. FreighTime backend endpoint contract

Conceptual design only — no endpoint is implemented by this document.

**Endpoint**: `POST /api/tracking/ups`

**Example request shape** (illustrative structure only — `synthetic-value`
is a placeholder, never a real tracking number, and no request using this
shape is made by this document):

```json
{
  "trackingNumber": "synthetic-value"
}
```

**Input requirements**:

- `trackingNumber` is required and must be a string.
- **Maximum length**: bounded to the longest structurally valid value the
  existing local UPS/UPS Roadie detector already accepts (`detect-
  courier.js`: up to 28 characters for the UPS Roadie long form) plus a
  small safety margin — any longer value is rejected before any upstream
  call is attempted.
- **Allowed characters**: uppercase letters and digits only (matching the
  existing local UPS structural rules in `detect-courier.js`); any other
  character causes rejection.
- **Request-size limit**: the request body is capped at a small fixed size
  (e.g. a few kilobytes) at the platform/framework level, independent of
  the `trackingNumber` field's own length limit, to reject oversized or
  malformed payloads before they reach application code.
- **Content-Type requirement**: `application/json` only; any other
  `Content-Type` is rejected.

**Rate-limit behavior**: requests beyond the configured per-client rate
(Section 15) receive a `429 Too Many Requests`-class response with no
tracking data and no upstream call made.

**CORS behavior**: only FreighTime's approved production and (if used)
staging origins are permitted via `Access-Control-Allow-Origin`; no
wildcard origin is served.

**Response shapes** (conceptual — status codes illustrative of the
category, not a final API specification):

- **Success response**: `200 OK` with the provider-neutral result object
  (Section 13), `available: true`-equivalent semantics.
- **Not-found response**: a `404`-class response indicating UPS reported
  no shipment for the given (already locally-valid) tracking number —
  distinct from an invalid-input response, since the input already passed
  local structural validation.
- **Invalid-input response**: a `400`-class response when the input fails
  the length/character rules above — no upstream UPS call is made in this
  case at all.
- **Provider-unavailable response**: a `502`/`503`-class response when UPS
  times out, is unreachable, or returns a service-level error — this
  response never includes UPS's raw error body (Section 16).
- **Internal-error response**: a generic `500`-class response for any
  unexpected backend failure, with a minimal, non-diagnostic message —
  never a stack trace or internal implementation detail.

### First implementation mode: mock-only (approved, following commit `1d85920`)

The project owner has approved a **mock-only** first backend
implementation. The first backend phase must not:

- Register a UPS application.
- Request UPS credentials.
- Store a Client ID.
- Store a Client Secret.
- Request an OAuth token.
- Call the UPS Tracking API.
- Return live shipment information.
- Use a real tracking number.

### Approved mock endpoint

`POST /api/tracking/ups` (the same endpoint contract above) is approved,
for the mock-only phase, to accept only **synthetic UPS `1Z` fixtures that
satisfy the existing structural rule** already implemented and tested in
`detect-courier.js` (`1Z` + 16 `[0-9A-Z]` characters) — the same kind of
non-operational fixture already used throughout
`tests/tracking/detect-courier.test.js`, `tests/tracking/router.test.js`,
and `tests/tracking/ui-controller.test.js` (e.g. a `1Z` prefix followed by
repeated digits). No real UPS tracking number is used at this or any
future mock stage.

The future mock must support these deterministic scenarios, selected by
some future, separately designed mechanism (e.g. a reserved synthetic
fixture pattern per scenario — not decided by this document):

1. `in_transit`
2. `delivered`
3. `not_found`
4. `provider_unavailable`
5. `invalid_input`
6. `rate_limited`

Each scenario deterministically exercises one of the response shapes
already defined above (success, not-found, provider-unavailable,
invalid-input, rate-limit) without ever calling UPS.

## 13. Provider-neutral response contract

A conceptual, provider-neutral result shape — not implementation code,
and not populated with any real data by this document:

- `provider` — a stable identifier for which provider sourced this result
  (e.g. `"ups"`), so the frontend can label the source without hardcoding
  provider-specific assumptions.
- `trackingNumberMasked` — the tracking number with all but a small,
  fixed number of leading/trailing characters replaced (e.g. asterisks),
  **required** on every response that includes it — the full identifier
  is never returned to the browser in this field.
- `statusCode` — a stable, provider-neutral status key (not UPS's raw
  internal status code) — e.g. a small closed set such as
  `in_transit`/`delivered`/`exception`/`unknown`.
- `statusLabel` — a short, already-approved-for-display label
  corresponding to `statusCode` (subject to future Hebrew UI-message work,
  per the same pattern as `ui-messages.js` — not implemented here).
- `latestEventTime` — timestamp of the most recent tracking event, if UPS
  provided one.
- `latestEventLocation` — a coarse location for the most recent event
  (e.g. city/country-level), never a precise delivery address.
- `estimatedDelivery` — an estimated delivery date/time, if UPS provided
  one.
- `delivered` — boolean, whether the shipment has been marked delivered.
- `events` — a short, minimal list of prior tracking milestones (status +
  time + coarse location only — same redaction rules as
  `latestEventLocation`), not UPS's complete raw event history.
- `source` — a fixed marker (e.g. `"live-provider"`) distinguishing this
  result from FreighTime's existing local detection result, so the
  frontend never confuses the two.
- `retrievedAt` — the timestamp the backend retrieved this data from UPS,
  so the frontend can show data freshness.

**Explicitly excluded from this contract, for the first release**: the
complete raw upstream response, personal recipient information,
signatures, delivery addresses, contact details (phone/email), and
proof-of-delivery images. None of these are copied to the browser under
any circumstance in this first release.

### Mock-response requirements (approved, following commit `1d85920`)

For the mock-only phase (Section 12), the mock response may contain only
the fields listed above — `provider`, `trackingNumberMasked`,
`statusCode`, `statusLabel`, `latestEventTime`, `latestEventLocation`,
`estimatedDelivery`, `delivered`, `events`, `source`, `retrievedAt` — and
no others, with these additional mock-specific requirements:

- `provider` must be `"ups"`.
- `source` must clearly indicate mock data (e.g. a value distinct from any
  future live-provider marker), so a mock response can never be mistaken
  for real provider data.
- `trackingNumberMasked` must never reveal the complete synthetic
  identifier, even though the identifier itself is already synthetic —
  the same masking discipline applies regardless of whether the
  underlying value is real or synthetic.
- No recipient name.
- No address.
- No telephone number.
- No email.
- No signature.
- No proof-of-delivery image.
- No customs document.
- No raw provider response — the mock adapter has no real provider
  response to begin with, since it never calls UPS.

## 14. Privacy and retention policy

- **No tracking identifiers in application logs by default** — the
  backend's default logging configuration excludes the `trackingNumber`
  field entirely; only the masked form (Section 13) may ever appear in a
  log line, and only if a future, separately justified need requires it.
- **No full tracking identifiers in analytics** — any future analytics
  integration (not part of this design) must never receive an unmasked
  tracking number.
- **No permanent tracking history** — the backend does not persist
  tracking results to a database or long-term store; each request is
  processed and its data discarded once the response is sent, beyond the
  short-lived cache described next.
- **No browser storage by default** — the frontend (Section 17) does not
  write the tracking number or the live result to `localStorage`,
  `sessionStorage`, or a cookie by default, consistent with the existing
  site's behavior.
- **Short server-side cache only if legally and technically justified** —
  any server-side response cache (e.g. to reduce duplicate UPS calls for
  the same tracking number within a short window) must be: private (never
  a shared/public CDN cache, per Security principle 7), time-bounded to a
  short, explicitly documented window, and separately justified against
  UPS's own API terms of use before implementation — no such cache exists
  yet, and none is implemented by this document.
- **Explicit retention period**: given the above, the default retention
  period for a tracking number and its result is effectively zero beyond
  the single request/response cycle, until and unless a specific,
  justified, time-bounded cache is separately approved.
- **Redaction standards**: any tracking number appearing anywhere outside
  the single request/response cycle (a log line, an error report, a
  monitoring dashboard) must use the masked form (Section 13) — never the
  full value.
- **Data minimization**: only the fields in Section 13 are ever returned
  or retained; nothing else from UPS's response is kept.
- **Abuse prevention**: covered operationally by rate limiting and input
  validation (Section 15) and architecturally by the backend never
  exposing a general-purpose UPS proxy (it only accepts the exact request
  shape in Section 12).
- **Privacy notice requirements**: before this feature is user-facing, the
  website's privacy notice (a separate, not-yet-existing document/section)
  must disclose that entering a tracking number for a supported provider
  causes FreighTime's backend to query that provider's API on the user's
  behalf.
- **User disclosure that data is retrieved from the provider**: the
  frontend result card (Section 17) must visibly indicate the data came
  from the provider (using the `source`/`provider` fields, Section 13),
  not imply FreighTime itself is the authoritative source of the
  tracking status.

## 15. Rate limiting and abuse prevention

- Rate limiting is enforced per client (e.g. by IP address and/or a
  lightweight request-fingerprint, to be finalized in a later
  implementation stage — not decided by this document) at the backend
  endpoint, independent of whatever the chosen platform additionally
  offers at the edge (Section 7).
- A request that fails input validation (Section 12) is rejected before
  it counts toward — or triggers — any upstream UPS call, so invalid
  input cannot be used to indirectly probe or exhaust UPS's own rate
  limits.
- The backend's own outbound call rate to UPS is separately bounded
  (Section 11, item 10), so a permitted burst of FreighTime-side traffic
  cannot itself violate UPS's API terms.
- Sustained abusive traffic patterns (e.g. rapid sequential requests for
  many distinct tracking numbers from one client) are logged in
  aggregate/statistical form only (request counts, not the tracking
  numbers themselves), consistent with Section 14's no-identifier-logging
  default.

## 16. Error and fallback behavior

If live tracking is unavailable (UPS outage, timeout, rate-limited,
authentication failure, or the backend itself is unreachable):

1. **Preserve the existing local identifier result** — the router's local
   `recognized-valid`/`recognized-invalid` result and its existing Hebrew
   message (`ui-messages.js`) continue to render exactly as they do today,
   unaffected by the live-tracking attempt's outcome.
2. **Show a clear provider-unavailable message** — a distinct, separately
   approved future Hebrew message (not created by this document) informs
   the user that live status could not be retrieved right now, without
   implying anything false about the shipment itself.
3. **Keep the existing generic official tracking-page link** — the
   already-approved UPS official-tracking-page link (`official-
   routing.js`, `SAFE_EXTERNAL_ROUTING_DESIGN.md`) remains visible and
   functional regardless of live-tracking success or failure, so the user
   always has a way to check status directly on UPS's own site.
4. **Do not claim the shipment does not exist** — a provider-unavailable
   or timeout condition is never presented as "not found"; those are
   distinct response categories (Section 12).
5. **Do not expose raw upstream errors** — the frontend never receives or
   displays UPS's raw error body, status text, or any backend stack
   trace (Section 6, item 12).
6. **Do not retry indefinitely** — the backend's own retry policy is
   small and fixed (Section 11, item 9); the frontend does not
   automatically re-request on failure — any retry is a future, explicit
   user action, mirroring the existing "explicit click required" pattern
   already approved for the official-tracking link.

```
User submits identifier
        |
        v
Local router result (existing, unaffected) --------> always rendered
        |
        v
Backend live-tracking request attempted
        |
   +----+----+
   |         |
 success   failure (timeout / rate-limited / auth failure / outage)
   |         |
   v         v
Show live   Show "live status unavailable" message
result       (existing local result + official link
(Sec. 13)    still shown, per items 1 and 3 above)
```

## 17. Frontend integration concept

Conceptual only — no frontend code is added by this document, and this
concept does not modify `router.js`, `ui-controller.js`,
`official-routing.js`, or `index.html`.

A future, separately implemented frontend client module (analogous in
spirit to `official-routing.js` — a small, isolated module, not embedded
in visual interface code, per `CLAUDE.md` Section 8) would:

- Be invoked only after the existing router already reports a
  `recognized-valid` result for a provider this design supports (UPS
  first).
- Call `POST /api/tracking/ups` (Section 12) with only the already-
  locally-normalized tracking number — never a raw, unvalidated user
  input.
- Never construct a UPS URL or hold a UPS credential itself — exactly the
  same "browser never talks to the provider directly" rule already
  enforced by Security principle 3 (Section 6).
- Render the provider-neutral result (Section 13) in a new, separate UI
  result card — additive to, not replacing, the existing tracking-hint
  message and the existing official-tracking-page link.
- Follow the same explicit-user-action discipline already established for
  the official-tracking link (`SAFE_EXTERNAL_ROUTING_DESIGN.md` Section
  5): live tracking may be fetched automatically after a valid local
  result (since it queries FreighTime's own backend, not an external
  site directly), but no automatic *navigation* to any external page is
  introduced by this concept — that remains the existing, unchanged,
  explicit-click-only official-link behavior.
- On failure, render the fallback behavior described in Section 16.

### Frontend boundary (approved, following commit `1d85920`)

The existing public frontend (`RoniAllmo/freightime-preview`) must not be
modified during mock-backend creation — no file in this repository
changes as part of building the separate `freightime-tracking-api` mock
backend (Section 18).

Future frontend integration (this section's concept becoming real code)
requires a **separate approval**, granted only after all of the following
are true:

- Mock backend tests pass.
- Security tests pass.
- CORS behavior is verified.
- Rate limiting is verified.
- Error responses are verified.
- No secrets exist.
- No real identifiers are used.

## 18. Deployment and environment strategy

### Repository separation (approved, following commit `1d85920`)

- **Approved future backend repository**: `freightime-tracking-api` — a
  new, separate repository, not created by this task (Section 19, stage
  2 remains a distinct future stage).
- **The frontend remains in** `RoniAllmo/freightime-preview` (this
  repository) as a static GitHub Pages site.
- Frontend and backend have **independent deployment lifecycles** — a
  backend deployment never requires or triggers a frontend deployment,
  and vice versa.
- **No backend secret may exist in the frontend repository** — no Azure
  Function key, UPS client ID, UPS client secret, or any other backend
  credential is ever committed to `freightime-preview`.
- **No UPS credential may exist in GitHub Pages code** — the statically
  served `index.html`/`js/tracking/` files never contain a UPS
  credential, under any circumstance.
- **The backend repository must not be created until a separately
  authorized task** — this document approves the *decision* to use a
  separate repository named `freightime-tracking-api`; it does not create
  that repository (see "Explicit exclusions," this task's restrictions).
- **The frontend must continue working when the backend is unavailable**
  — the existing local detection pipeline and UI render fully without any
  dependency on the backend's availability (consistent with Section 3 and
  Section 16).
- **The existing official tracking-page link remains the fallback** — the
  already-approved UPS/UPS Roadie/EMS official-tracking-page links
  (`SAFE_EXTERNAL_ROUTING_DESIGN.md`, `official-routing.js`) continue to
  be the user's path to carrier-provided tracking whenever in-house live
  tracking is unavailable or not yet implemented.

### Future environment structure (approved, following commit `1d85920`)

Recommended environments:

- **Local development** — a developer's own machine, running the mock
  adapter (Section 12) only, no cloud resource involved.
- **Azure development** — a non-production Azure Functions environment,
  used for early cloud-hosted testing of the mock adapter and, later, the
  UPS sandbox adapter (Section 19, stage 17).
- **Azure production** — the eventual live environment serving real
  users, requiring production credentials (Section 19, stage 11) and out
  of scope for the mock-only phase.

**The first implementation must use only Local development and Azure
development.** Production deployment remains explicitly out of scope for
this phase and every stage through Section 19's mock-and-sandbox stages —
it is reached only at Section 19, stage 20.

### General deployment notes (unchanged, retained for the record)

- The existing GitHub Pages static site deployment (`.github` Pages
  workflow, already in production) is not changed by this design and
  must remain the deployment path for `index.html` and `js/tracking/`
  throughout backend development.
- The backend (Section 8's now-approved Azure Functions with Node.js)
  would be deployed as an entirely separate resource/pipeline, with its
  own environment configuration per the three environments above and its
  own secret store per environment — no shared secret material between
  environments.
- No production credential is provisioned, requested, or used until a
  separate, explicit "production credential approval" stage (Section 19,
  stage 11) is completed.
- Until a backend is deployed and approved, the frontend integration
  concept (Section 17) has no live target to call and is not activated —
  the existing static site continues operating exactly as today.

## 19. Implementation stages and completion criteria

**Updated and approved (following commit `1d85920`)**: the roadmap below
replaces the prior 14-stage list with the project-owner-approved 20-stage
order. Each stage is scoped the same way prior FreighTime work has been —
one stage per task, small and independently reviewable:

1. **Architecture decision completed** — completion criterion: this
   document records the project owner's approval of the backend platform
   (Section 8), repository separation (Section 18), and mock-only first
   implementation (Sections 12, 13) — satisfied by this update itself.
2. **Create separate backend repository** — completion criterion: the
   `freightime-tracking-api` repository (Section 18) exists, empty or
   with only minimal scaffolding, created in a separately authorized
   task — not this one.
3. **Initialize Azure Functions Node.js project** — completion criterion:
   a minimal, runnable Azure Functions Node.js project exists in
   `freightime-tracking-api`, with no route logic, no dependency beyond
   the Functions runtime itself, and no credential of any kind.
4. **Add mock UPS provider adapter** — completion criterion: a backend
   module implements the six deterministic scenarios (Section 12) against
   synthetic `1Z` fixtures only, with no network call to any UPS host.
5. **Add `POST /api/tracking/ups`** — completion criterion: the endpoint
   (Section 12) is implemented against the mock adapter from stage 4,
   returning the response shapes defined in Section 12.
6. **Add validation and masking** — completion criterion: the input
   length/character rules (Section 12) and `trackingNumberMasked`
   masking (Section 13) are implemented and enforced before any mock
   scenario is selected.
7. **Add deterministic mock scenarios** — completion criterion: each of
   the six scenarios (`in_transit`, `delivered`, `not_found`,
   `provider_unavailable`, `invalid_input`, `rate_limited`) is
   individually reachable and produces the correct response shape and
   status-code class from Section 12.
8. **Add unit and endpoint tests** — completion criterion: automated
   tests (in `freightime-tracking-api`, this frontend repository's test
   suite is untouched) cover every scenario in stage 7 and the response
   contract in Section 13, using only synthetic fixtures.
9. **Add CORS restrictions** — completion criterion: the endpoint accepts
   requests only from FreighTime's approved origins (Section 6, item 11),
   verified by a test asserting a disallowed origin is rejected.
10. **Add rate limiting** — completion criterion: the endpoint enforces a
    documented per-client rate limit (Section 15), verified by a test
    that exceeds the limit and observes the `429`-class response.
11. **Add security and privacy tests** — completion criterion: automated
    tests confirm no credential, raw upstream data, stack trace, or
    unmasked identifier ever appears in any response, matching the
    mandatory security checklist (Section 6).
12. **Run local smoke testing** — completion criterion: the mock backend
    runs locally (Local development environment, Section 18) and
    responds correctly to a manual request for each of the six
    scenarios.
13. **Deploy only to Azure development** — completion criterion: the
    mock-only backend is deployed to the Azure development environment
    (Section 18) — Azure production is not touched at this stage.
14. **Test frontend-to-development-backend integration** — completion
    criterion: a still-not-yet-built frontend client module (Section 17)
    is exercised against the Azure development backend end-to-end,
    strictly following the separate frontend-integration approval gate
    already recorded in Section 17.
15. **Perform privacy review** — completion criterion: the privacy notice
    requirement (Section 14) is fulfilled — the website's privacy
    disclosure is updated and reviewed before any live-provider work
    begins.
16. **Obtain UPS Developer approval and sandbox credentials** —
    completion criterion: the project owner has registered a UPS
    Developer application and obtained sandbox (not production)
    credentials, stored only in the backend's secret store, never in
    either repository.
17. **Replace mock adapter with sandbox adapter** — completion criterion:
    the mock adapter from stage 4 is replaced by a UPS sandbox adapter
    implementing the OAuth and tracking-request design (Sections 10–11)
    against UPS's sandbox environment only.
18. **Controlled beta** — completion criterion: the feature is enabled for
    a small, explicitly scoped audience (mechanism to be decided in a
    later stage — e.g. a feature flag), with monitoring for abuse and
    correctness before wider release.
19. **Production approval** — completion criterion: the project owner has
    explicitly approved provisioning real UPS production credentials and
    deploying to the Azure production environment (Section 18), following
    a successful, monitored controlled beta.
20. **Production launch** — completion criterion: the backend is deployed
    to Azure production with real UPS production credentials, and the
    frontend integration (Section 17) is enabled for general availability.

## 20. Open decisions and recommended next action

The following are explicitly left open — this document does not resolve
them:

1. ~~**Backend platform selection** (Section 8)~~ — **Resolved** (following
   commit `1d85920`): Azure Functions with Node.js is approved by the
   project owner, per the reasons recorded in Section 8.
2. ~~**Where the backend code will live**~~ — **Resolved** (following
   commit `1d85920`): a separate repository, `freightime-tracking-api`
   (Section 18). The repository itself is not yet created (Section 19,
   stage 2 remains a distinct future task).
3. **Exact rate-limit thresholds** (requests per client per time window)
   — not numerically specified by this document; a future stage must
   propose and justify specific values.
4. **Exact client-identification method for rate limiting** (IP-based,
   fingerprint-based, or another approach) — Section 15.
5. **Whether any server-side response cache is ever justified**, and if
   so its exact retention window — Section 14.
6. **UPS sandbox/test-credential process** — whether UPS provides a
   sandbox environment suitable for Section 19 stage 10, and how test
   credentials would be obtained and stored.
7. **Feature-flag or beta-gating mechanism** for Section 19 stage 13 — not
   designed here.
8. **EMS's, and every other carrier's, in-house tracking design** — none
   is designed, approved, or implied by this document (Section 3, "Future
   provider boundary" below).

**Recommended next action (updated, following commit `1d85920`)**:

`Create the separate freightime-tracking-api repository and initialize a
mock-only Azure Functions Node.js project without credentials or live
provider calls.`

This corresponds to Section 19, stages 2–3, and is not performed by this
task — this document records the decision and the next action only.

### Future provider boundary

EMS, airlines, shipping lines, DSV, DHL, FedEx, and Aramex each require
their own separate, future, provider-specific approval before any
in-house tracking design or implementation work begins for them. This
document does not assume a single universal tracking API can serve every
provider, and does not design, approve, or implement in-house tracking for
any provider other than the conceptual UPS design above.

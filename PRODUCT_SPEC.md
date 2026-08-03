# FreighTime — Product Specification

## 1. Product name

FreighTime

## 2. Product vision

FreighTime aims to become the single, trusted entry point for tracking any shipment, regardless of transport mode or carrier, by removing the need for users to know which carrier system to visit or how to interpret a tracking number.

## 3. One-sentence product description

FreighTime is a universal shipment tracking search engine that takes a single shipment identifier, detects its type and likely carrier, and routes the user to the correct tracking information.

## 4. Problem being solved

Shipment tracking today is fragmented across ocean carriers, airlines, couriers, and last-mile providers, each with their own tracking number formats and tracking websites. Users who receive a container number, an air waybill, or a courier tracking number often do not know which carrier the number belongs to or where to track it. This creates friction, wasted time, and reliance on freight forwarders or customer support for basic status checks.

## 5. Proposed solution

A single central search field where a user pastes or types any shipment identifier. FreighTime normalizes the input, applies pattern-based detection logic to determine the likely identifier type (ocean container, air waybill, courier tracking number, etc.), infers the probable carrier(s) from the identifier format, and presents the user with the detected type and carrier so they can proceed to the carrier's official tracking page. Where detection is ambiguous, the user can manually select the shipment type or carrier.

## 6. Target users

- Importers and exporters tracking their own shipments
- Freight forwarder staff who need a fast, carrier-agnostic lookup tool
- Logistics coordinators handling shipments across multiple carriers
- Individuals or businesses who receive a tracking number and don't know which carrier it belongs to

## 7. Supported shipment categories

Long-term target categories (not all required for MVP — see Section 10):

1. Ocean container numbers
2. Ocean bill of lading numbers
3. Air waybill numbers
4. Courier tracking numbers
5. Express delivery and last-mile tracking numbers
6. LCL shipment references, where reliable tracking access exists

## 8. Language and localization strategy — approved decision

**Status: resolved.** This section resolves the previously open decision on whether Hebrew is included in the first MVP.

- The first MVP will launch with a **Hebrew user interface**.
- The first MVP will use an **RTL (right-to-left) layout**.
- Standard professional terms such as **AWB, Container, Carrier, Courier, and Tracking Number** may remain in English where appropriate, even within the Hebrew interface.
- A complete English interface and a visible language selector are **not** included in the first MVP.
- A full English version is planned for a **near-future phase**, intended to reach an international audience and support English-language organic traffic.
- The architecture and interface structure must be **localization-ready from the beginning**, even though only Hebrew ships at MVP stage.
- Future interface components must support both RTL and LTR layouts.
- Interface text should be separated from functional logic where technically reasonable, so translations can be added without rewriting logic.
- Technical code, variable names, configuration keys, and internal identifiers should use English, regardless of the interface language.
- Future language-specific routes may use structures such as `/he/` and `/en/`; the exact routing method remains a future technical decision and is not selected here.

## 9. Single-input tracking router — approved decision

FreighTime will use one central shipment-tracking input visible to the user. Internally, this is referred to as the **Single-input tracking router**.

### Conceptual internal flow

1. Receive one shipment identifier.
2. Preserve the original user input.
3. Create and normalize a separate working copy.
4. Detect one or more possible identifier types.
5. Detect one or more possible carriers or tracking providers.
6. Select the relevant tracking route.
7. If several valid matches exist, ask the user to choose.
8. If no valid match is found, show an unrecognized-identifier state.
9. In the first MVP, route the user to the selected carrier's official tracking page.
10. In a future version, approved provider adapters may retrieve tracking data through authorized APIs and display standardized tracking events inside FreighTime.

### Distinct internal layers

The following layers are conceptually distinct and must not be collapsed into one another:

- **The single search field** visible to the user (interface layer only).
- **The identifier normalization layer** (produces a working copy of the input; the original input is preserved separately, per Section 7 of `CLAUDE.md`).
- **The identifier detector** (determines possible identifier types).
- **The carrier/provider registry** (maps identifier patterns to candidate carriers or tracking providers).
- **The routing layer** (selects the tracking destination and hands off to the carrier's page in the MVP).
- **Future API provider adapters** (a future-phase concept for retrieving standardized tracking data through authorized APIs).

Carriers and tracking providers must eventually be represented through configurable data and dedicated modules, rather than carrier-specific rules embedded directly in visual interface code (consistent with `CLAUDE.md` Section 7, Architecture principles).

No carriers, APIs, frameworks, hosting providers, or other external services are selected by this decision.

## 10. First MVP scope

The first MVP will:

1. Display one central tracking search field.
2. Accept one shipment identifier as input.
3. Normalize the entered identifier (trim whitespace, standardize case/format).
4. Attempt to identify whether the identifier is one of:
   - An ocean container number
   - An air waybill number
   - A courier tracking number
5. Identify one or more possible carriers based on the identifier's format.
6. Display the detected shipment type to the user.
7. Display the possible carrier(s) to the user.
8. Allow the user to continue to the carrier's official tracking page (external link).
9. Allow manual shipment-type or carrier selection when automatic detection is uncertain or ambiguous.
10. Clearly state when an identifier cannot be recognized, without guessing incorrectly.

Ocean bill of lading numbers, LCL references, and express/last-mile tracking numbers beyond basic courier formats are part of the long-term category list (Section 7) but are **not** guaranteed in the first MVP.

The interface for this MVP scope is Hebrew, RTL, per Section 8.

## 11. Features excluded from the first MVP

The first MVP will **not**:

- Display live tracking events inside FreighTime
- Use paid tracking APIs
- Scrape carrier websites
- Guarantee detection of all bill of lading numbers
- Guarantee detection of house bill numbers
- Provide estimated freight costs
- Provide freight quotations
- Provide bookings
- Provide customs or regulatory advice
- Require user registration
- Send shipment notifications
- Store customer shipment history
- Include a complete English interface or a visible language selector (see Section 8)
- Include an active, customer-facing assistant or chat feature (see Section 18)

## 12. Basic user journey

1. User arrives at FreighTime and sees a single central search field.
2. User enters a shipment identifier (e.g., a container number or tracking number).
3. FreighTime normalizes the input and attempts detection.
4. FreighTime displays the detected shipment type and the likely carrier(s).
   - If detection is confident, the user is shown a clear result with a link to the carrier's official tracking page.
   - If detection is ambiguous, the user is offered a manual selection of shipment type and/or carrier.
   - If the identifier is unrecognized, the user is clearly informed that no match was found.
5. User clicks through to the carrier's official tracking page to view actual tracking events.

## 13. Functional requirements

- FR1: The system must provide a single input field for shipment identifier entry.
- FR2: The system must normalize input (whitespace trimming, case normalization, removal of non-alphanumeric separators where appropriate).
- FR3: The system must apply pattern-based rules to classify the identifier as container number, air waybill number, courier tracking number, or unrecognized.
- FR4: The system must map recognized identifier formats to one or more candidate carriers.
- FR5: The system must present the detected type and candidate carrier(s) to the user.
- FR6: The system must provide an outbound link to the relevant carrier's official tracking page.
- FR7: The system must allow manual override of detected type/carrier when confidence is low or multiple carriers match.
- FR8: The system must display an explicit "not recognized" state when no pattern matches.
- FR9: The system must not require account creation or login to perform a search.

## 14. Non-functional requirements

- NFR1: The search interface must load quickly and respond to input without noticeable delay, since detection is local pattern matching rather than external API calls in the MVP.
- NFR2: The system must not persist entered shipment identifiers or search history server-side in the MVP (no customer shipment history storage).
- NFR3: The detection logic must be maintainable and extensible, so new carrier patterns can be added without architectural rework.
- NFR4: The system must degrade gracefully and clearly communicate uncertainty rather than presenting a wrong carrier as certain.
- NFR5: The system must not depend on paid third-party tracking APIs or scraping in the MVP.

## 15. Success criteria for the first MVP

- Users can enter a shipment identifier and receive a correct type classification for the supported categories (ocean container, air waybill, courier tracking) at a reasonable accuracy rate.
- Users can reach the correct carrier's tracking page in a small number of steps from a single search.
- Ambiguous or unrecognized identifiers are handled transparently, without misleading the user into a wrong carrier.
- The product is usable without registration, quotation, or booking flows.

## 16. Known limitations

- Identifier format patterns are not unique across all carriers; some formats overlap, so detection may return multiple candidate carriers or require manual disambiguation.
- Bill of lading numbers and house bill numbers vary significantly by carrier and forwarder and are not guaranteed to be detected in the MVP.
- No live tracking events are shown inside FreighTime in the MVP; the product routes users to carriers' own systems for actual status information.
- Detection accuracy depends entirely on publicly known format patterns and is not validated against live carrier systems in the MVP.

## 17. Future development phases

After the first MVP has been validated, future versions may:

1. Connect to approved ocean tracking APIs.
2. Connect to approved air cargo tracking APIs.
3. Connect to approved courier tracking APIs.
4. Display standardized shipment milestones.
5. Display ETD, ETA, actual departure, and actual arrival when available.
6. Display shipment history in a unified timeline.
7. Allow users to save and monitor shipments.
8. Provide delay and exception notifications.
9. Support customer accounts and business dashboards.
10. Launch a full English interface alongside the Hebrew interface, per the language strategy in Section 8.
11. Support secure integrations with ERP and TMS platforms.
12. Introduce a supporting assistant feature, per Section 18, subject to a separate approved development stage.

## 18. Future assistant feature — approved decision

- A customer-facing assistant is **not** part of the first tracking MVP.
- The existing chat interface in the static website (`index.html` and the archived `legacy/static-preview/freightime-original-preview.html`) is a **future product concept** and must not be treated as current working functionality.
- The existing chat interface and its visual design may be **preserved** for future development.
- It must **not** make active external API requests during the first tracking MVP.
- It must **not** be presented to users as an operational feature until it has been securely and explicitly implemented.
- A future assistant may support the tracking experience by:
  - Helping users when an identifier cannot be recognized
  - Requesting missing shipment details
  - Helping users distinguish between ambiguous carrier matches
  - Explaining shipment milestones or tracking statuses
- A future assistant is a **supporting feature** and is **not a replacement** for the Single-input tracking router (Section 9).
- Any future assistant integration must use a secure server-side approach or another explicitly approved secure architecture.
- API credentials must **never** be placed in browser-side code.
- Implementation of the future assistant requires a **separate approved development stage**; it is not authorized by this specification.

This resolves the product boundary on customer-facing AI stated in Section 20 as follows:

- Customer-facing AI is excluded from the first tracking MVP.
- A supporting assistant may be introduced in a future approved phase.
- No assistant implementation is authorized by this specification.

## 19. Open product decisions

The following decisions have been resolved and are documented in the referenced sections, and are no longer open:

- Whether Hebrew is included in the first MVP — resolved, see Section 8.
- The conceptual architecture of the tracking router — resolved, see Section 9.
- The product boundary on customer-facing AI relative to the first MVP and future phases — resolved, see Section 18.

The following matters remain open and are not decided by this specification; they require explicit product/business input before implementation:

- Which specific carriers are prioritized for pattern-based detection in the MVP (full list not yet defined).
- How to handle identifiers that structurally match more than one carrier's format (ranking logic, disambiguation UX).
- Whether any tracking-page redirects require legal/attribution disclaimers when linking to third-party carrier sites.
- Whether the "verified service provider network," "document" features, and "consultation with professionals" shown in the existing static preview are intended for any future phase, or are out of scope entirely.
- Data retention and privacy posture for search input, even though no shipment history storage is planned for the MVP.
- Branding and domain decisions beyond the existing FreighTime name.
- When the future assistant (Section 18) should be introduced.
- Whether the future assistant should initially be hidden, visibly marked as "coming soon," or otherwise made unavailable during the MVP.
- Which secure server-side architecture and provider should power the future assistant.
- What operational topics the future assistant may and may not address.
- What privacy and data-retention rules will apply to future assistant conversations.

## 20. Product boundaries: what FreighTime is and is not

FreighTime **is**:

- A unified shipment tracking search engine
- A shipment identifier detection system
- A carrier detection and routing system
- In later stages, a unified interface for displaying shipment tracking events

FreighTime's first tracking MVP **is not**:

- A chatbot or customer-facing AI assistant
- A freight quotation platform
- A freight booking platform
- A customs classification tool
- A general logistics information website
- A customs brokerage application

AI may be used during software development of FreighTime. Customer-facing AI is excluded from the first tracking MVP; a supporting assistant may be introduced in a future approved phase, per Section 18. No assistant implementation is authorized by this specification alone.

## 21. Relationship to the existing static preview

The file `legacy/static-preview/freightime-original-preview.html` is preserved as a **visual and product reference only**. It reflects an earlier design exploration of the FreighTime concept and is not a functional specification. A working copy of this file has also been restored to the repository root as `index.html` to keep the published website operational; this does not change its status as a reference implementation rather than the tracking product itself.

A read-only inspection of the preview shows it references several concepts beyond the defined MVP scope, including live tracking display, an AI-guided chat assistant ("עוזר AI מנתב"), a verified service-provider network, a documents section, and consultation with professionals. These elements are **not automatically approved for implementation**. Any such feature must be evaluated against this specification and explicitly approved before being built.

The chat interface specifically reflects the future assistant concept described in Section 18: it is preserved for future development, must not make active external API requests during the first tracking MVP, and must not be presented to users as operational functionality until it is securely and explicitly implemented in a separate approved development stage. The verified service-provider network, documents section, and consultation-with-professionals features remain open product decisions (Section 19) and are not carried forward by default.

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

Long-term target categories (not all required for MVP — see Section 8):

1. Ocean container numbers
2. Ocean bill of lading numbers
3. Air waybill numbers
4. Courier tracking numbers
5. Express delivery and last-mile tracking numbers
6. LCL shipment references, where reliable tracking access exists

## 8. First MVP scope

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

## 9. Features excluded from the first MVP

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

## 10. Basic user journey

1. User arrives at FreighTime and sees a single central search field.
2. User enters a shipment identifier (e.g., a container number or tracking number).
3. FreighTime normalizes the input and attempts detection.
4. FreighTime displays the detected shipment type and the likely carrier(s).
   - If detection is confident, the user is shown a clear result with a link to the carrier's official tracking page.
   - If detection is ambiguous, the user is offered a manual selection of shipment type and/or carrier.
   - If the identifier is unrecognized, the user is clearly informed that no match was found.
5. User clicks through to the carrier's official tracking page to view actual tracking events.

## 11. Functional requirements

- FR1: The system must provide a single input field for shipment identifier entry.
- FR2: The system must normalize input (whitespace trimming, case normalization, removal of non-alphanumeric separators where appropriate).
- FR3: The system must apply pattern-based rules to classify the identifier as container number, air waybill number, courier tracking number, or unrecognized.
- FR4: The system must map recognized identifier formats to one or more candidate carriers.
- FR5: The system must present the detected type and candidate carrier(s) to the user.
- FR6: The system must provide an outbound link to the relevant carrier's official tracking page.
- FR7: The system must allow manual override of detected type/carrier when confidence is low or multiple carriers match.
- FR8: The system must display an explicit "not recognized" state when no pattern matches.
- FR9: The system must not require account creation or login to perform a search.

## 12. Non-functional requirements

- NFR1: The search interface must load quickly and respond to input without noticeable delay, since detection is local pattern matching rather than external API calls in the MVP.
- NFR2: The system must not persist entered shipment identifiers or search history server-side in the MVP (no customer shipment history storage).
- NFR3: The detection logic must be maintainable and extensible, so new carrier patterns can be added without architectural rework.
- NFR4: The system must degrade gracefully and clearly communicate uncertainty rather than presenting a wrong carrier as certain.
- NFR5: The system must not depend on paid third-party tracking APIs or scraping in the MVP.

## 13. Success criteria for the first MVP

- Users can enter a shipment identifier and receive a correct type classification for the supported categories (ocean container, air waybill, courier tracking) at a reasonable accuracy rate.
- Users can reach the correct carrier's tracking page in a small number of steps from a single search.
- Ambiguous or unrecognized identifiers are handled transparently, without misleading the user into a wrong carrier.
- The product is usable without registration, quotation, or booking flows.

## 14. Known limitations

- Identifier format patterns are not unique across all carriers; some formats overlap, so detection may return multiple candidate carriers or require manual disambiguation.
- Bill of lading numbers and house bill numbers vary significantly by carrier and forwarder and are not guaranteed to be detected in the MVP.
- No live tracking events are shown inside FreighTime in the MVP; the product routes users to carriers' own systems for actual status information.
- Detection accuracy depends entirely on publicly known format patterns and is not validated against live carrier systems in the MVP.

## 15. Future development phases

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
10. Support Hebrew and English.
11. Support secure integrations with ERP and TMS platforms.

## 16. Open product decisions

The following matters are not decided by this specification and require explicit product/business input before implementation:

- Which specific carriers are prioritized for pattern-based detection in the MVP (full list not yet defined).
- Whether Hebrew language support is required at MVP stage or only in a future phase (the existing static preview is Hebrew-first; this spec does not resolve that conflict).
- How to handle identifiers that structurally match more than one carrier's format (ranking logic, disambiguation UX).
- Whether any tracking-page redirects require legal/attribution disclaimers when linking to third-party carrier sites.
- Whether the "verified service provider network," "document" features, and "consultation with professionals" shown in the existing static preview are intended for any future phase, or are out of scope entirely.
- Data retention and privacy posture for search input, even though no shipment history storage is planned for the MVP.
- Branding and domain decisions beyond the existing FreighTime name.

## 17. Product boundaries: what FreighTime is and is not

FreighTime **is**:

- A unified shipment tracking search engine
- A shipment identifier detection system
- A carrier detection and routing system
- In later stages, a unified interface for displaying shipment tracking events

FreighTime **is not**:

- A chatbot
- An AI assistant for end users
- A freight quotation platform
- A freight booking platform
- A customs classification tool
- A general logistics information website
- A customs brokerage application

AI may be used during software development of FreighTime, but customer-facing AI chat functionality is explicitly not part of the product.

## 18. Relationship to the existing static preview

The file `legacy/static-preview/freightime-original-preview.html` is preserved as a **visual and product reference only**. It reflects an earlier design exploration of the FreighTime concept and is not a functional specification.

A read-only inspection of the preview shows it references several concepts beyond the defined MVP scope, including live tracking display, an "AI-guided assistant" ("עוזר AI מנתב"), a verified service-provider network, a documents section, and consultation with professionals. These elements are **not automatically approved for implementation**. Any such feature must be evaluated against this specification and explicitly approved before being built. In particular, any AI-assistant-style feature shown in the preview conflicts with the product boundary in Section 17 (no customer-facing AI chat) and would require a deliberate product decision to override or revise that boundary — it is not carried forward by default.

# FreighTime Smart Tracking Import V1

## Purpose

Provide useful, normalized operational tracking information without paid
APIs, carrier credentials, scraping, browser automation, or external
network retrieval. UPS, EasyPost, SeaRates, and ShipStation were all
investigated and rejected for the free public V1 product (see prior
research docs); this feature delivers real product value without any of
those dependencies.

## User-mediated workflow

1. The user searches for a tracking identifier in FreighTime as usual.
2. FreighTime shows the official carrier tracking link (existing
   behavior, unchanged).
3. The user opens the official tracker in a new tab, copies the visible
   tracking details, and returns to FreighTime.
4. The user pastes the copied text into the "פענוח חכם של תוצאת מעקב"
   panel (shown next to the official-tracking action after a recognized
   search), optionally selects a source type, and clicks "פענח מידע".
5. FreighTime parses the pasted text **entirely in the browser** and
   displays whichever operational fields it can confidently identify.

This is **not** automated carrier tracking, scraping, a carrier API
integration, live GPS tracking, or proof that FreighTime contacted a
carrier or that a container is aboard a particular vessel. Official
carrier data remains authoritative; FreighTime's summary is a
convenience layer over text the user already has in front of them.

## Locally processed data

All parsing happens in the browser via pure JavaScript modules
(`js/tracking-import/`). No pasted text or extracted value is ever sent
to the FreighTime backend, a carrier, an OCR service, an AI service, or
any other third party, and none of it is written to `localStorage`,
`sessionStorage`, cookies, `IndexedDB`, the URL, browser history, or the
console. The textarea and result are cleared on explicit reset and on
every new tracking search.

## Supported generic labels

English: Vessel/Vessel Name, Voyage/Voyage Number, Port of Loading/POL,
Port of Discharge/POD, ETD/Estimated Time of Departure, ATD/Actual Time
of Departure, ETA/Estimated Time of Arrival, ATA/Actual Time of Arrival,
Latest Event/Last Event, Status/Current Status, Estimated
Delivery/Scheduled Delivery, Delivered, Flight/Flight Number, Departure,
Arrival, Origin, Destination, Location, Event Time.

Hebrew: שם אונייה/אונייה, מספר הפלגה/הפלגה, נמל מוצא/נמל טעינה, נמל
יעד/נמל פריקה, יציאה מתוכננת, יציאה בפועל, הגעה משוערת, הגעה בפועל,
אירוע אחרון, סטטוס/סטטוס נוכחי, מסירה משוערת, נמסר, מספר טיסה, שדה
מוצא, שדה יעד, מיקום, זמן אירוע.

A label must start its own line, followed by a colon, hyphen, tab, or
two-or-more spaces, and a non-empty value.

## Support-level rules

A result is `partial` only when at least one "meaningful group" (per
`OCEAN_MEANINGFUL_GROUPS` / `AIR_MEANINGFUL_GROUPS` /
`COURIER_MEANINGFUL_GROUPS` in the corresponding `extract-*-fields.js`)
is fully present **with every field in that group at high or medium
confidence** — a low-confidence (e.g. ambiguous-date) value alone never
grants `partial` status. Otherwise the result is `detection_only` and
the user is told to copy the full visible result section instead.

## Time semantics

Every date/time field carries a fixed semantic: `etd`/`scheduledDeparture`
is always `scheduled`, `eta`/`estimatedArrival`/`estimatedDelivery` is
always `estimated`, `atd`/`ata`/`actualDeparture`/`actualArrival`/
`actualDelivery`/`latestEventTime` is always `actual` — unless the date
itself could not be parsed, in which case the semantic falls back to
`unknown`. Ambiguous numeric dates (e.g. `03/04/2026`, where both
day/month interpretations are plausible) are never silently resolved —
they are reported `ambiguous: true`, `confidence: 'low'`, and shown only
under "מידע שדורש אימות" (never mixed with confirmed fields). No time
zone conversion ever occurs; a source-supplied time zone marker is kept
as display text only.

## Limitations

- Only labels appearing at the start of a line are recognized (a
  combined "Vessel / Voyage" listing on one line is not parsed).
- No carrier, airline, or delivery outcome is ever inferred — only what
  is explicitly labeled in the pasted text.
- Location values are not verified against any gazetteer (confidence
  capped at `medium`).
- Maximum pasted-text length is 20,000 characters; longer input is
  rejected with an explanation, never silently truncated.

## Synthetic test fixtures

All test fixtures in `tests/tracking-import/` are synthetic
representative text (e.g. `MSC EXAMPLE`, `LY001`) matching the generic
label style described above — never content copied from a real carrier
website, per the product spec's fixture policy.

## How to validate locally

```
node --test "tests/tracking/*.test.js" "tests/tools/*.test.js" "tests/tracking-import/*.test.js"
python3 -m http.server 8934   # then open index.html in a browser
```

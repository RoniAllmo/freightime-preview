# FreighTime Smart Tracking Import

*(Filename retained as `SMART_TRACKING_IMPORT_V1.md` for continuity with existing links; this document now also covers the V2 capabilities described below.)*

## Purpose

Provide useful, normalized operational tracking information without paid
APIs, carrier credentials, scraping, browser automation, or external
network retrieval. UPS Tracking API, EasyPost, SeaRates Ship Schedules
API, and ShipStation were all investigated and rejected for the free
public product in prior research.

## User-mediated workflow

1. The user searches for a tracking identifier in FreighTime as usual.
2. FreighTime shows the existing official-tracking link.
3. The user opens the official tracker, copies the visible tracking
   details, and returns to FreighTime.
4. The user pastes the text into the "פענוח חכם של תוצאת מעקב" panel
   (shown next to the official-tracking action after a recognized
   search), optionally picks a source type, and clicks "פענח מידע".
5. FreighTime parses the pasted text **entirely in the browser** and
   shows whichever fields it can confidently identify.

This is **not** automated carrier tracking, scraping, a carrier API
integration, live GPS tracking, proof FreighTime contacted a carrier, or
proof a container is aboard a particular vessel. Official carrier data
remains authoritative; copied text quality directly affects extraction
quality, and schedules are never proof of actual shipment movement.

## V1 capabilities (unchanged, still fully supported)

- Labels that start their own line: `Vessel: MSC EXAMPLE`.
- English and Hebrew label recognition for ocean, air, and courier/postal modes.
- Conservative date parsing with `scheduled`/`estimated`/`actual`/`unknown` semantics.
- `partial` vs `detection_only` support-level decisions based on meaningful information groups.
- Low-confidence value separation ("מידע שדורש אימות").
- 20,000-character input limit, copy-summary action, reset behavior.

## V2 additions

### Combined-label parsing (`js/tracking-import/split-combined-line.js`)

A single pasted line encoding more than one field is safely split into
independent "Label: value" sub-lines before normal field extraction
runs, via three conservative patterns:

- **Paired combined headers**: `Vessel / Voyage: MSC EXAMPLE / FV632R`
  (and the Hebrew equivalent `שם אונייה / מספר הפלגה: ...`), split only
  for a fixed list of known field pairs (Vessel/Voyage, Carrier/Vessel,
  Origin/Destination, POL/POD, ETD/ETA, ATD/ATA, Flight/Route,
  Status/Latest Event, Event Time/Location), and only when the value
  portion contains exactly one `/` (an ambiguous multi-slash value is
  left unsplit).
- **Pipe/semicolon-segmented lines**: `Vessel: A | Voyage: B | ETA: C`
  is split into three independent segments, each still parsed by the
  normal single-line label matcher.
- **Multi-column, colon-free label/value runs**:
  `Port of Loading    Shanghai    ETD    2026-08-10` is split into
  label/value pairs only when *every* label-position token matches the
  known label vocabulary — otherwise the line is left completely
  untouched (never a partial/guessed split).

`normalizeImportedText` exposes both the original `lines` (unchanged,
used by nothing outside this codebase's own V1-era call sites) and a new
`expandedLines` array (combined-line-aware) that every extractor now
searches.

### Table parsing (`js/tracking-import/parse-table.js`)

Recognizes a header row (tab-, pipe-, or 2+-space-separated) whose every
cell matches a known logistics-header vocabulary, followed by data rows
using the same separator. Repeated header rows are safely skipped. A row
with fewer cells than the header ends the block (rather than guessing);
a row with more cells merges the overflow into the last column. A "data
row" that is itself a valid header for a *different* table structure
ends the current block, so two back-to-back tables (with no blank line
between them) are each recognized correctly.

**Known limitation**: a data row's columns must be separated
unambiguously (2+ spaces, a tab, or a pipe). If a cell's own text already
contains an internal single space and the next cell is separated by only
a single space, the parser cannot safely tell them apart and will treat
that row as not fitting the table (ending the block there) rather than
guess the boundary.

### Event timeline (`js/tracking-import/extract-events.js`)

Builds a deduplicated, capped (50 events max) list of tracking events
from parsed tables and from repeated "Event Date"/"Event"/"Location"
labeled lines grouped by line proximity. The pasted order is **never**
assumed to be chronological: a latest event is only ever selected when
every retained event's date parsed unambiguously and there is no tie at
the most recent timestamp. Otherwise, the original pasted order is
preserved and no automatic "latest event" is claimed — the user sees the
full list and a note that chronology needs manual verification. The UI
shows the 5 most relevant events by default with a native, accessible
expand/collapse control (`aria-expanded`) for the rest.

### Duplicate and conflict handling (`js/tracking-import/build-field-value.js`)

Every field now considers *every* matching line for its labels, not just
the first:

- Two matches with the **same** normalized value are a duplicate —
  collapsed safely, confidence unaffected.
- Two matches with **different** values are a genuine conflict — the
  field's value becomes `null`, confidence drops to `'low'`, and both
  candidates are preserved and shown under "מידע שדורש אימות" as
  "נמצאו מספר ערכים ויש לאמת את הנתון". This is **never** silently
  resolved. A conflict in one field never invalidates an unrelated valid
  group — e.g. a conflicting ETA does not prevent a `latestEvent +
  latestEventTime` group from still qualifying as `partial`.
- ETA and ATA (or ETD and ATD) present together are *not* a conflict —
  they are different semantic fields (estimated vs. actual) and are
  always shown separately.

### Revision/update-timestamp handling

An explicit "Updated"/"Last Updated"/"עדכון אחרון" label (if present) is
parsed and shown purely as source recency metadata
(`sourceUpdatedAt`) — it is **never** treated as an event, departure,
arrival, or delivery time. This is a deliberately bounded implementation
of the product spec's revision-handling rules: FreighTime surfaces the
source's own stated update time honestly, but does not attempt to
automatically resolve which of several conflicting values is "more
current" based on per-candidate proximity to that timestamp — an
unresolved conflict is always shown for manual verification instead of a
heuristic guess.

### New meaningful groups

In addition to the V1 groups, a result also qualifies as `partial` when:

- Ocean: `vesselName + voyageNumber + portOfLoading + portOfDischarge`,
  or an event timeline with 2+ high/medium-confidence dated events.
- Air: `flightNumber + scheduledDeparture + estimatedArrival`, or an
  event timeline with 2+ high/medium-confidence dated events.
- Courier/postal: 2+ high/medium-confidence dated tracking events.

A group is only counted when every field in it is present, unconflicted,
and not low-confidence — never on the strength of a carrier name,
tracking number, container number, AWB, a single unlabeled date, a
single location, a single low-confidence field, or an official external
link alone.

### Result interface

The summary card is now organized into clearly separated sections:
תקציר תפעולי (primary fields, in a fixed bare-minimum-first priority
order per mode), אירועים אחרונים (timeline, default 5 visible), מגבלות
הפענוח (plain-language diagnostics — e.g. "זוהה מבנה של טבלה", "נמצאו
מספר ערכי ETA" — plus the fixed disclaimer), and מידע שדורש אימות
(low-confidence and conflicted values, kept completely separate from
confirmed fields). User-derived text values carry `dir="auto"` for
readable mixed Hebrew/English rendering, without changing the page's own
primary RTL direction.

### Copy-summary format

The copied, customer-facing summary now follows a fixed structure:

```
תקציר מעקב FreighTime

סוג מעקב: <mode>
<field label>: <value> (<semantic>)
...

מקור: טקסט שהודבק מהמעקב הרשמי
זמן הפענוח: <value>

יש לאמת שינויים ונתונים חסרים מול המקור הרשמי.
```

Only fields actually present are included (no empty labels); low-
confidence and conflicted fields, the raw pasted text, evidence
references, and internal diagnostics are never included.

## Privacy model (unchanged, extended)

All parsing (including combined-line splitting, table parsing, and event
extraction) happens entirely in the browser via pure JavaScript modules.
Nothing pasted or derived is ever sent to the backend, a carrier, an
OCR/AI service, or any third party, and none of it is written to
`localStorage`, `sessionStorage`, cookies, `IndexedDB`, the URL, browser
history, or the console. HTML/script/JSON-like pasted text is always
treated as plain text (never executed, never rendered via `innerHTML`).
The clipboard is never read automatically — only explicitly written to
on a user's copy-summary click.

## Limitations

- Only labels at the start of a line (or a recognized combined-line
  pattern) are parsed.
- No carrier, airline, or delivery outcome is ever inferred.
- Location values are not verified against any gazetteer (confidence
  capped at `medium`).
- Table rows separated by only a single ambiguous space cannot always be
  split correctly (documented above).
- Per-candidate revision-timestamp resolution (picking the "most
  recently updated" of several conflicting values) is not implemented —
  conflicts are always surfaced for manual verification instead.
- Maximum pasted-text length is 20,000 characters; a normalized line
  count above 2,000 is safely capped (excess lines dropped, never an
  operational value truncated).

## Synthetic test fixtures

All test fixtures in `tests/tracking-import/` are synthetic
representative text (e.g. `MSC EXAMPLE`, `FV632R`, `LY001`) matching the
generic label/table style described above — never content copied from a
real carrier website.

## How to validate locally

```
node --test "tests/tracking/*.test.js" "tests/tools/*.test.js" "tests/tracking-import/*.test.js" "tests/readiness/*.test.js"
python3 -m http.server 8934   # then open index.html in a browser
```

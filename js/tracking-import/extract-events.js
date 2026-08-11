/**
 * Generic event-timeline extraction for FreighTime's Smart Tracking
 * Import V2 (Phase F of the product spec).
 *
 * Responsibility: gather individual tracking events from two sources --
 * a parsed table (`parse-table.js`) containing a date/event/status
 * column, and repeated "Event Date" / "Latest Event" / "Location"
 * labeled lines grouped by line proximity -- deduplicate exact repeats,
 * cap the result at a reasonable maximum, and decide (conservatively)
 * whether the events can be safely ordered chronologically and whether a
 * single "latest event" can be identified without guessing.
 *
 * This module never assumes the pasted order is chronological (rule 24)
 * and never labels an event "latest" from its pasted position alone
 * (rule 25) -- a latest event is only ever selected when every event's
 * date parsed unambiguously and no tie exists at the top (rules 26-27).
 *
 * Performs no DOM/network/storage access and no logging.
 */

import { findAllLabeledValues } from './normalize-imported-text.js';
import { parseDateValue } from './extract-dates.js';
import { extractLocationValue } from './extract-locations.js';

const EVENT_DATE_LABELS = Object.freeze(['Event Date', 'Date', 'תאריך']);
const EVENT_DESCRIPTION_LABELS = Object.freeze(['Latest Event', 'Last Event', 'Event', 'אירוע אחרון', 'אירוע']);
const EVENT_LOCATION_LABELS = Object.freeze(['Location', 'מיקום']);

/** Maximum number of events retained (rule 22). Extra events are counted but dropped, never silently claiming completeness. */
export const MAX_EVENTS = 50;

/** Default number of events shown before the user expands the timeline (rule 23). */
export const DEFAULT_VISIBLE_EVENTS = 5;

const MAX_PROXIMITY_LINES = 3;

function buildEventFromTableRow(row) {
  const description = row.valuesByField.event ?? row.valuesByField.status ?? null;
  const dateText = row.valuesByField.date ?? row.valuesByField.etd ?? row.valuesByField.eta ?? row.valuesByField.atd ?? row.valuesByField.ata ?? null;
  const locationText = row.valuesByField.location ?? null;
  if (!description) {
    return null;
  }
  const parsedDate = dateText ? parseDateValue(dateText) : null;
  const location = locationText ? extractLocationValue(locationText) : null;
  return {
    description,
    dateIso: parsedDate?.isoDate ?? null,
    rawDateText: dateText,
    timeText: parsedDate?.timeText ?? null,
    timezoneText: parsedDate?.timezoneText ?? null,
    dateAmbiguous: parsedDate?.ambiguous ?? false,
    location: location?.value ?? null,
    confidence: parsedDate && parsedDate.parsed ? 'medium' : 'low',
    evidence: `שורת טבלה: ${Object.values(row.valuesByField).join(' / ')}`,
    sourceLineIndex: row.sourceLineIndex,
  };
}

/** Pair up nearby date/event/location labeled-line matches (proximity-grouped triplets, rule 21). */
function buildEventsFromLabeledBlocks(lines) {
  const dateMatches = findAllLabeledValues(lines, EVENT_DATE_LABELS);
  const eventMatches = findAllLabeledValues(lines, EVENT_DESCRIPTION_LABELS);
  const locationMatches = findAllLabeledValues(lines, EVENT_LOCATION_LABELS);

  if (dateMatches.length === 0 || eventMatches.length === 0) {
    return [];
  }

  const usedEvents = new Set();
  const usedLocations = new Set();
  const events = [];

  for (const dateMatch of dateMatches) {
    let bestEvent = null;
    let bestDist = Infinity;
    for (const eventMatch of eventMatches) {
      if (usedEvents.has(eventMatch)) continue;
      const dist = Math.abs(eventMatch.lineIndex - dateMatch.lineIndex);
      if (dist <= MAX_PROXIMITY_LINES && dist < bestDist) {
        bestEvent = eventMatch;
        bestDist = dist;
      }
    }
    if (!bestEvent) continue;
    usedEvents.add(bestEvent);

    let bestLocation = null;
    let bestLocDist = Infinity;
    for (const locationMatch of locationMatches) {
      if (usedLocations.has(locationMatch)) continue;
      const dist = Math.min(
        Math.abs(locationMatch.lineIndex - dateMatch.lineIndex),
        Math.abs(locationMatch.lineIndex - bestEvent.lineIndex),
      );
      if (dist <= MAX_PROXIMITY_LINES && dist < bestLocDist) {
        bestLocation = locationMatch;
        bestLocDist = dist;
      }
    }
    if (bestLocation) usedLocations.add(bestLocation);

    const parsedDate = parseDateValue(dateMatch.value);
    const location = bestLocation ? extractLocationValue(bestLocation.value) : null;

    events.push({
      description: bestEvent.value,
      dateIso: parsedDate.isoDate,
      rawDateText: dateMatch.value,
      timeText: parsedDate.timeText,
      timezoneText: parsedDate.timezoneText,
      dateAmbiguous: parsedDate.ambiguous,
      location: location?.value ?? null,
      confidence: parsedDate.parsed ? 'medium' : 'low',
      evidence: `"${dateMatch.lineText}" / "${bestEvent.lineText}"`,
      sourceLineIndex: Math.min(dateMatch.lineIndex, bestEvent.lineIndex),
    });
  }

  return events;
}

function dedupeEvents(events) {
  const seen = new Map();
  for (const event of events) {
    const key = `${event.dateIso ?? event.rawDateText ?? ''}::${event.description}::${event.location ?? ''}`;
    if (!seen.has(key)) {
      seen.set(key, { ...event, occurrenceCount: 0 });
    }
    seen.get(key).occurrenceCount += 1;
  }
  return Array.from(seen.values());
}

/**
 * Extract a deduplicated, capped event timeline from a table-parse result
 * and the normalized line array, and decide whether chronology is
 * reliable enough to sort the events and identify a single latest event.
 *
 * @param {{lines: ReadonlyArray<string>, tables: Readonly<{tables: ReadonlyArray}>}} input
 * @returns {Readonly<{
 *   events: ReadonlyArray<Readonly<object>>,
 *   totalFound: number,
 *   omittedCount: number,
 *   orderConfidence: 'chronological'|'source-order',
 *   latestEvent: Readonly<object>|null,
 *   latestEventNote: string,
 * }>}
 */
export function extractEventTimeline(input) {
  const lines = Array.isArray(input?.lines) ? input.lines : [];
  const tableResult = input?.tables && Array.isArray(input.tables.tables) ? input.tables.tables : [];

  const tableEvents = [];
  for (const table of tableResult) {
    const hasEventLikeColumn = table.headerFields.includes('event') || table.headerFields.includes('status');
    if (!hasEventLikeColumn) continue;
    for (const row of table.rows) {
      const event = buildEventFromTableRow(row);
      if (event) tableEvents.push(event);
    }
  }

  const blockEvents = buildEventsFromLabeledBlocks(lines);

  const combined = dedupeEvents([...tableEvents, ...blockEvents]).sort((a, b) => a.sourceLineIndex - b.sourceLineIndex);

  const totalFound = combined.length;
  const omittedCount = Math.max(0, totalFound - MAX_EVENTS);
  const retained = combined.slice(0, MAX_EVENTS).map((event) => Object.freeze(event));

  const allDatesUnambiguous = retained.length > 0 && retained.every((e) => e.dateIso !== null && !e.dateAmbiguous);

  let orderConfidence = 'source-order';
  let sorted = retained;
  let latestEvent = null;
  let latestEventNote = 'סדר האירועים נשמר כפי שהודבק. חלק מהתאריכים אינם ניתנים לזיהוי חד-משמעי, ולכן לא זוהה אירוע אחרון באופן אוטומטי.';

  if (allDatesUnambiguous) {
    orderConfidence = 'chronological';
    sorted = [...retained].sort((a, b) => {
      const aKey = `${a.dateIso}T${a.timeText ?? '00:00'}`;
      const bKey = `${b.dateIso}T${b.timeText ?? '00:00'}`;
      return aKey.localeCompare(bKey);
    });
    const last = sorted[sorted.length - 1];
    const secondLast = sorted.length > 1 ? sorted[sorted.length - 2] : null;
    const lastKey = `${last.dateIso}T${last.timeText ?? '00:00'}`;
    const secondLastKey = secondLast ? `${secondLast.dateIso}T${secondLast.timeText ?? '00:00'}` : null;
    if (secondLastKey && secondLastKey === lastKey) {
      latestEvent = null;
      latestEventNote = 'נמצאו מספר אירועים עם אותו תאריך אחרון; לא ניתן לקבוע אירוע אחרון יחיד באופן חד-משמעי.';
    } else {
      latestEvent = last;
      latestEventNote = 'האירוע האחרון זוהה לפי סדר כרונולוגי של תאריכים חד-משמעיים.';
    }
  } else if (retained.length === 0) {
    latestEventNote = '';
  }

  return Object.freeze({
    events: Object.freeze(sorted),
    totalFound,
    omittedCount,
    orderConfidence,
    latestEvent: latestEvent ? Object.freeze(latestEvent) : null,
    latestEventNote,
  });
}

/**
 * Air-mode field extraction for FreighTime's Smart Tracking Import V1.
 *
 * Responsibility: given normalized lines (from `normalize-imported-text.js`),
 * look for the air-cargo-relevant labels listed in the product spec
 * (English and Hebrew) and return a plain, evidence-bearing field for
 * each one found. Every field carries its value, semantic tag,
 * confidence, evidence (the matched line + label), and an
 * `inferred: false` flag. This module never infers an airline identity
 * from an unverified AWB prefix, and never infers an actual departure or
 * arrival from a scheduled/estimated value.
 *
 * Performs no DOM/network/storage access and no logging.
 */

import {
  findLabeledValue,
  LATEST_EVENT_LABELS,
  EVENT_TIME_LABELS,
  EVENT_LOCATION_LABELS,
} from './normalize-imported-text.js';
import { parseDateValue } from './extract-dates.js';
import { extractLocationValue } from './extract-locations.js';

const FLIGHT_LABELS = Object.freeze(['Flight Number', 'Flight', 'מספר טיסה']);
const ORIGIN_LABELS = Object.freeze(['Origin', 'שדה מוצא']);
const DESTINATION_LABELS = Object.freeze(['Destination', 'שדה יעד']);
const SCHEDULED_DEPARTURE_LABELS = Object.freeze([
  'Estimated Time of Departure',
  'ETD',
  'Departure',
  'יציאה מתוכננת',
]);
const ACTUAL_DEPARTURE_LABELS = Object.freeze(['Actual Time of Departure', 'ATD', 'יציאה בפועל']);
const ESTIMATED_ARRIVAL_LABELS = Object.freeze([
  'Estimated Time of Arrival',
  'ETA',
  'Arrival',
  'הגעה משוערת',
]);
const ACTUAL_ARRIVAL_LABELS = Object.freeze(['Actual Time of Arrival', 'ATA', 'הגעה בפועל']);

/** Meaningful air information groups (rule 26): each entry lists the field names that must all be present. */
export const AIR_MEANINGFUL_GROUPS = Object.freeze([
  Object.freeze(['flightNumber', 'origin', 'destination']),
  Object.freeze(['scheduledDeparture', 'estimatedArrival']),
  Object.freeze(['latestEvent', 'latestEventTime']),
]);

function buildTextField(match, confidence) {
  if (!match) {
    return null;
  }
  return Object.freeze({
    value: match.value,
    semantic: 'unknown',
    confidence,
    evidence: `"${match.lineText}" (label: ${match.matchedLabel})`,
    inferred: false,
  });
}

function buildDateField(match, defaultSemantic) {
  if (!match) {
    return null;
  }
  const parsed = parseDateValue(match.value);
  const semantic = parsed.parsed ? defaultSemantic : 'unknown';
  return Object.freeze({
    value: parsed.isoDate ?? match.value,
    rawText: match.value,
    semantic,
    confidence: parsed.confidence,
    evidence: `"${match.lineText}" (label: ${match.matchedLabel})`,
    inferred: false,
    ambiguous: parsed.ambiguous,
    timeText: parsed.timeText,
    timezoneText: parsed.timezoneText,
  });
}

function buildLocationField(match) {
  if (!match) {
    return null;
  }
  const located = extractLocationValue(match.value);
  if (!located) {
    return null;
  }
  return Object.freeze({
    value: located.value,
    semantic: 'unknown',
    confidence: located.confidence,
    evidence: `"${match.lineText}" (label: ${match.matchedLabel})`,
    inferred: false,
  });
}

/**
 * Extract every recognizable air-cargo field from normalized lines.
 *
 * @param {ReadonlyArray<string>} lines - Normalized lines from `normalizeImportedText`.
 * @returns {Readonly<object>} A frozen map of air field name to a frozen
 *   field descriptor, or `null` for a field that was not found.
 */
export function extractAirFields(lines) {
  const safeLines = Array.isArray(lines) ? lines : [];

  return Object.freeze({
    flightNumber: buildTextField(findLabeledValue(safeLines, FLIGHT_LABELS), 'medium'),
    origin: buildLocationField(findLabeledValue(safeLines, ORIGIN_LABELS)),
    destination: buildLocationField(findLabeledValue(safeLines, DESTINATION_LABELS)),
    scheduledDeparture: buildDateField(findLabeledValue(safeLines, SCHEDULED_DEPARTURE_LABELS), 'scheduled'),
    actualDeparture: buildDateField(findLabeledValue(safeLines, ACTUAL_DEPARTURE_LABELS), 'actual'),
    estimatedArrival: buildDateField(findLabeledValue(safeLines, ESTIMATED_ARRIVAL_LABELS), 'estimated'),
    actualArrival: buildDateField(findLabeledValue(safeLines, ACTUAL_ARRIVAL_LABELS), 'actual'),
    latestEvent: buildTextField(findLabeledValue(safeLines, LATEST_EVENT_LABELS), 'medium'),
    latestEventTime: buildDateField(findLabeledValue(safeLines, EVENT_TIME_LABELS), 'actual'),
    latestEventLocation: buildLocationField(findLabeledValue(safeLines, EVENT_LOCATION_LABELS)),
  });
}

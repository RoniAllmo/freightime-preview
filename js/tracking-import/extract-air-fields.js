/**
 * Air-mode field extraction for FreighTime's Smart Tracking Import.
 *
 * Responsibility: given normalized lines (V2: `expandedLines`), look for
 * the air-cargo-relevant labels listed in the product spec (English and
 * Hebrew) and return a plain, evidence-bearing field for each one found.
 * Every field carries its value, semantic tag, confidence, evidence (the
 * matched line + label), and an `inferred: false` flag. This module
 * never infers an airline identity from an unverified AWB prefix, and
 * never infers an actual departure or arrival from a scheduled/estimated
 * value.
 *
 * V2: every field considers *every* matching line for its labels (via
 * `findAllLabeledValues`), not just the first -- duplicates are
 * collapsed safely, conflicting values are surfaced (never silently
 * resolved) via `build-field-value.js`.
 *
 * Performs no DOM/network/storage access and no logging.
 */

import {
  findAllLabeledValues,
  LATEST_EVENT_LABELS,
  EVENT_TIME_LABELS,
  EVENT_LOCATION_LABELS,
} from './normalize-imported-text.js';
import { buildTextFieldFromMatches, buildDateFieldFromMatches, buildLocationFieldFromMatches } from './build-field-value.js';

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

/** Meaningful air information groups (rules 26 & 44): each entry lists the field names that must all be present, confident, and unconflicted. */
export const AIR_MEANINGFUL_GROUPS = Object.freeze([
  Object.freeze(['flightNumber', 'origin', 'destination']),
  Object.freeze(['scheduledDeparture', 'estimatedArrival']),
  Object.freeze(['latestEvent', 'latestEventTime']),
  Object.freeze(['flightNumber', 'scheduledDeparture', 'estimatedArrival']),
]);

/**
 * Extract every recognizable air-cargo field from normalized lines.
 *
 * @param {ReadonlyArray<string>} lines - Normalized lines (pass `expandedLines` for V2 combined-line support).
 * @returns {Readonly<object>} A frozen map of air field name to a frozen
 *   field descriptor, or `null` for a field that was not found.
 */
export function extractAirFields(lines) {
  const safeLines = Array.isArray(lines) ? lines : [];

  return Object.freeze({
    flightNumber: buildTextFieldFromMatches(findAllLabeledValues(safeLines, FLIGHT_LABELS), 'medium'),
    origin: buildLocationFieldFromMatches(findAllLabeledValues(safeLines, ORIGIN_LABELS)),
    destination: buildLocationFieldFromMatches(findAllLabeledValues(safeLines, DESTINATION_LABELS)),
    scheduledDeparture: buildDateFieldFromMatches(findAllLabeledValues(safeLines, SCHEDULED_DEPARTURE_LABELS), 'scheduled'),
    actualDeparture: buildDateFieldFromMatches(findAllLabeledValues(safeLines, ACTUAL_DEPARTURE_LABELS), 'actual'),
    estimatedArrival: buildDateFieldFromMatches(findAllLabeledValues(safeLines, ESTIMATED_ARRIVAL_LABELS), 'estimated'),
    actualArrival: buildDateFieldFromMatches(findAllLabeledValues(safeLines, ACTUAL_ARRIVAL_LABELS), 'actual'),
    latestEvent: buildTextFieldFromMatches(findAllLabeledValues(safeLines, LATEST_EVENT_LABELS), 'medium'),
    latestEventTime: buildDateFieldFromMatches(findAllLabeledValues(safeLines, EVENT_TIME_LABELS), 'actual'),
    latestEventLocation: buildLocationFieldFromMatches(findAllLabeledValues(safeLines, EVENT_LOCATION_LABELS)),
  });
}

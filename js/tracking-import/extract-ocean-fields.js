/**
 * Ocean-mode field extraction for FreighTime's Smart Tracking Import.
 *
 * Responsibility: given normalized lines (V2: `expandedLines`, which also
 * covers combined multi-field lines -- see `normalize-imported-text.js`),
 * look for the ocean-relevant labels listed in the product spec (English
 * and Hebrew) and return a plain, evidence-bearing field for each one
 * found. Every field carries its value, semantic tag, confidence,
 * evidence (the matched line + label), and an `inferred: false` flag --
 * this module never infers a value it did not read directly from a
 * labeled line (e.g. it never infers an actual departure from an ETD, or
 * a carrier from a container owner code).
 *
 * V2: every field now considers *every* matching line for its labels
 * (via `findAllLabeledValues`), not just the first -- a repeated
 * identical value is safely collapsed (`occurrenceCount`); two different
 * values under the same label become a `conflict: true` field with
 * `confidence: 'low'` and its candidates preserved, never silently
 * resolved (see `build-field-value.js`).
 *
 * Performs no DOM/network/storage access and no logging.
 */

import {
  findAllLabeledValues,
  STATUS_LABELS,
  LATEST_EVENT_LABELS,
  EVENT_TIME_LABELS,
  EVENT_LOCATION_LABELS,
} from './normalize-imported-text.js';
import { buildTextFieldFromMatches, buildDateFieldFromMatches, buildLocationFieldFromMatches } from './build-field-value.js';

const VESSEL_LABELS = Object.freeze(['Vessel Name', 'Vessel', 'שם אונייה', 'אונייה']);
const VOYAGE_LABELS = Object.freeze(['Voyage Number', 'Voyage', 'מספר הפלגה', 'הפלגה']);
const POL_LABELS = Object.freeze(['Port of Loading', 'POL', 'נמל מוצא', 'נמל טעינה']);
const POD_LABELS = Object.freeze(['Port of Discharge', 'POD', 'נמל יעד', 'נמל פריקה']);
const ETD_LABELS = Object.freeze(['Estimated Time of Departure', 'ETD', 'יציאה מתוכננת']);
const ATD_LABELS = Object.freeze(['Actual Time of Departure', 'ATD', 'יציאה בפועל']);
const ETA_LABELS = Object.freeze(['Estimated Time of Arrival', 'ETA', 'הגעה משוערת']);
const ATA_LABELS = Object.freeze(['Actual Time of Arrival', 'ATA', 'הגעה בפועל']);

/** Meaningful ocean information groups (rules 26 & 44): each entry lists the field names that must all be present, confident, and unconflicted. */
export const OCEAN_MEANINGFUL_GROUPS = Object.freeze([
  Object.freeze(['vesselName', 'voyageNumber', 'eta']),
  Object.freeze(['portOfLoading', 'etd', 'portOfDischarge', 'eta']),
  Object.freeze(['actualDeparture', 'eta']),
  Object.freeze(['latestEvent', 'latestEventTime']),
  Object.freeze(['latestEvent', 'latestEventLocation']),
  Object.freeze(['vesselName', 'voyageNumber', 'portOfLoading', 'portOfDischarge']),
]);

/**
 * Extract every recognizable ocean field from normalized lines.
 *
 * @param {ReadonlyArray<string>} lines - Normalized lines (pass `expandedLines` for V2 combined-line support).
 * @returns {Readonly<object>} A frozen map of ocean field name to a frozen
 *   field descriptor, or `null` for a field that was not found.
 */
export function extractOceanFields(lines) {
  const safeLines = Array.isArray(lines) ? lines : [];

  return Object.freeze({
    status: buildTextFieldFromMatches(findAllLabeledValues(safeLines, STATUS_LABELS), 'medium'),
    vesselName: buildTextFieldFromMatches(findAllLabeledValues(safeLines, VESSEL_LABELS), 'medium'),
    voyageNumber: buildTextFieldFromMatches(findAllLabeledValues(safeLines, VOYAGE_LABELS), 'medium'),
    portOfLoading: buildLocationFieldFromMatches(findAllLabeledValues(safeLines, POL_LABELS)),
    portOfDischarge: buildLocationFieldFromMatches(findAllLabeledValues(safeLines, POD_LABELS)),
    etd: buildDateFieldFromMatches(findAllLabeledValues(safeLines, ETD_LABELS), 'scheduled'),
    actualDeparture: buildDateFieldFromMatches(findAllLabeledValues(safeLines, ATD_LABELS), 'actual'),
    eta: buildDateFieldFromMatches(findAllLabeledValues(safeLines, ETA_LABELS), 'estimated'),
    actualArrival: buildDateFieldFromMatches(findAllLabeledValues(safeLines, ATA_LABELS), 'actual'),
    latestEvent: buildTextFieldFromMatches(findAllLabeledValues(safeLines, LATEST_EVENT_LABELS), 'medium'),
    latestEventTime: buildDateFieldFromMatches(findAllLabeledValues(safeLines, EVENT_TIME_LABELS), 'actual'),
    latestEventLocation: buildLocationFieldFromMatches(findAllLabeledValues(safeLines, EVENT_LOCATION_LABELS)),
  });
}

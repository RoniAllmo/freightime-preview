/**
 * Ocean-mode field extraction for FreighTime's Smart Tracking Import V1.
 *
 * Responsibility: given normalized lines (from `normalize-imported-text.js`),
 * look for the ocean-relevant labels listed in the product spec (English
 * and Hebrew) and return a plain, evidence-bearing field for each one
 * found. Every field carries its value, semantic tag, confidence,
 * evidence (the matched line + label), and an `inferred: false` flag --
 * this module never infers a value it did not read directly from a
 * labeled line (e.g. it never infers an actual departure from an ETD, or
 * a carrier from a container owner code).
 *
 * Performs no DOM/network/storage access and no logging.
 */

import {
  findLabeledValue,
  STATUS_LABELS,
  LATEST_EVENT_LABELS,
  EVENT_TIME_LABELS,
  EVENT_LOCATION_LABELS,
} from './normalize-imported-text.js';
import { parseDateValue } from './extract-dates.js';
import { extractLocationValue } from './extract-locations.js';

const VESSEL_LABELS = Object.freeze(['Vessel Name', 'Vessel', 'שם אונייה', 'אונייה']);
const VOYAGE_LABELS = Object.freeze(['Voyage Number', 'Voyage', 'מספר הפלגה', 'הפלגה']);
const POL_LABELS = Object.freeze(['Port of Loading', 'POL', 'נמל מוצא', 'נמל טעינה']);
const POD_LABELS = Object.freeze(['Port of Discharge', 'POD', 'נמל יעד', 'נמל פריקה']);
const ETD_LABELS = Object.freeze(['Estimated Time of Departure', 'ETD', 'יציאה מתוכננת']);
const ATD_LABELS = Object.freeze(['Actual Time of Departure', 'ATD', 'יציאה בפועל']);
const ETA_LABELS = Object.freeze(['Estimated Time of Arrival', 'ETA', 'הגעה משוערת']);
const ATA_LABELS = Object.freeze(['Actual Time of Arrival', 'ATA', 'הגעה בפועל']);

/** Meaningful ocean information groups (rule 26): each entry lists the field names that must all be present. */
export const OCEAN_MEANINGFUL_GROUPS = Object.freeze([
  Object.freeze(['vesselName', 'voyageNumber', 'eta']),
  Object.freeze(['portOfLoading', 'etd', 'portOfDischarge', 'eta']),
  Object.freeze(['actualDeparture', 'eta']),
  Object.freeze(['latestEvent', 'latestEventTime']),
  Object.freeze(['latestEvent', 'latestEventLocation']),
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
 * Extract every recognizable ocean field from normalized lines.
 *
 * @param {ReadonlyArray<string>} lines - Normalized lines from `normalizeImportedText`.
 * @returns {Readonly<object>} A frozen map of ocean field name to a frozen
 *   field descriptor, or `null` for a field that was not found.
 */
export function extractOceanFields(lines) {
  const safeLines = Array.isArray(lines) ? lines : [];

  return Object.freeze({
    status: buildTextField(findLabeledValue(safeLines, STATUS_LABELS), 'medium'),
    vesselName: buildTextField(findLabeledValue(safeLines, VESSEL_LABELS), 'medium'),
    voyageNumber: buildTextField(findLabeledValue(safeLines, VOYAGE_LABELS), 'medium'),
    portOfLoading: buildLocationField(findLabeledValue(safeLines, POL_LABELS)),
    portOfDischarge: buildLocationField(findLabeledValue(safeLines, POD_LABELS)),
    etd: buildDateField(findLabeledValue(safeLines, ETD_LABELS), 'scheduled'),
    actualDeparture: buildDateField(findLabeledValue(safeLines, ATD_LABELS), 'actual'),
    eta: buildDateField(findLabeledValue(safeLines, ETA_LABELS), 'estimated'),
    actualArrival: buildDateField(findLabeledValue(safeLines, ATA_LABELS), 'actual'),
    latestEvent: buildTextField(findLabeledValue(safeLines, LATEST_EVENT_LABELS), 'medium'),
    latestEventTime: buildDateField(findLabeledValue(safeLines, EVENT_TIME_LABELS), 'actual'),
    latestEventLocation: buildLocationField(findLabeledValue(safeLines, EVENT_LOCATION_LABELS)),
  });
}

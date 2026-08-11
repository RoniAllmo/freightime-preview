/**
 * Courier/postal-mode field extraction for FreighTime's Smart Tracking
 * Import V1.
 *
 * Responsibility: given normalized lines (from `normalize-imported-text.js`),
 * look for the courier/postal-relevant labels listed in the product spec
 * (English and Hebrew) and return a plain, evidence-bearing field for
 * each one found. Every field carries its value, semantic tag,
 * confidence, evidence (the matched line + label), and an
 * `inferred: false` flag. This module never infers a delivery outcome or
 * a carrier identity that was not read directly from a labeled line.
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

const ESTIMATED_DELIVERY_LABELS = Object.freeze([
  'Estimated Delivery',
  'Scheduled Delivery',
  'מסירה משוערת',
]);
const ACTUAL_DELIVERY_LABELS = Object.freeze(['Delivered', 'נמסר']);

/** Meaningful courier/postal information groups (rule 26): each entry lists the field names that must all be present. */
export const COURIER_MEANINGFUL_GROUPS = Object.freeze([
  Object.freeze(['currentStatus', 'latestEvent']),
  Object.freeze(['latestEvent', 'latestEventTime']),
  Object.freeze(['latestEvent', 'latestEventLocation']),
  Object.freeze(['currentStatus', 'estimatedDelivery']),
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
 * Extract every recognizable courier/postal field from normalized lines.
 *
 * @param {ReadonlyArray<string>} lines - Normalized lines from `normalizeImportedText`.
 * @returns {Readonly<object>} A frozen map of courier/postal field name to
 *   a frozen field descriptor, or `null` for a field that was not found.
 */
export function extractCourierFields(lines) {
  const safeLines = Array.isArray(lines) ? lines : [];

  return Object.freeze({
    currentStatus: buildTextField(findLabeledValue(safeLines, STATUS_LABELS), 'medium'),
    estimatedDelivery: buildDateField(findLabeledValue(safeLines, ESTIMATED_DELIVERY_LABELS), 'estimated'),
    actualDelivery: buildDateField(findLabeledValue(safeLines, ACTUAL_DELIVERY_LABELS), 'actual'),
    latestEvent: buildTextField(findLabeledValue(safeLines, LATEST_EVENT_LABELS), 'medium'),
    latestEventTime: buildDateField(findLabeledValue(safeLines, EVENT_TIME_LABELS), 'actual'),
    latestEventLocation: buildLocationField(findLabeledValue(safeLines, EVENT_LOCATION_LABELS)),
  });
}

/**
 * Courier/postal-mode field extraction for FreighTime's Smart Tracking
 * Import.
 *
 * Responsibility: given normalized lines (V2: `expandedLines`), look for
 * the courier/postal-relevant labels listed in the product spec (English
 * and Hebrew) and return a plain, evidence-bearing field for each one
 * found. Every field carries its value, semantic tag, confidence,
 * evidence (the matched line + label), and an `inferred: false` flag.
 * This module never infers a delivery outcome or a carrier identity that
 * was not read directly from a labeled line.
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
  STATUS_LABELS,
  LATEST_EVENT_LABELS,
  EVENT_TIME_LABELS,
  EVENT_LOCATION_LABELS,
} from './normalize-imported-text.js';
import { buildTextFieldFromMatches, buildDateFieldFromMatches, buildLocationFieldFromMatches } from './build-field-value.js';

const ESTIMATED_DELIVERY_LABELS = Object.freeze([
  'Estimated Delivery',
  'Scheduled Delivery',
  'מסירה משוערת',
]);
const ACTUAL_DELIVERY_LABELS = Object.freeze(['Delivered', 'נמסר']);

/** Meaningful courier/postal information groups (rule 26): each entry lists the field names that must all be present, confident, and unconflicted. */
export const COURIER_MEANINGFUL_GROUPS = Object.freeze([
  Object.freeze(['currentStatus', 'latestEvent']),
  Object.freeze(['latestEvent', 'latestEventTime']),
  Object.freeze(['latestEvent', 'latestEventLocation']),
  Object.freeze(['currentStatus', 'estimatedDelivery']),
]);

/**
 * Extract every recognizable courier/postal field from normalized lines.
 *
 * @param {ReadonlyArray<string>} lines - Normalized lines (pass `expandedLines` for V2 combined-line support).
 * @returns {Readonly<object>} A frozen map of courier/postal field name to
 *   a frozen field descriptor, or `null` for a field that was not found.
 */
export function extractCourierFields(lines) {
  const safeLines = Array.isArray(lines) ? lines : [];

  return Object.freeze({
    currentStatus: buildTextFieldFromMatches(findAllLabeledValues(safeLines, STATUS_LABELS), 'medium'),
    estimatedDelivery: buildDateFieldFromMatches(findAllLabeledValues(safeLines, ESTIMATED_DELIVERY_LABELS), 'estimated'),
    actualDelivery: buildDateFieldFromMatches(findAllLabeledValues(safeLines, ACTUAL_DELIVERY_LABELS), 'actual'),
    latestEvent: buildTextFieldFromMatches(findAllLabeledValues(safeLines, LATEST_EVENT_LABELS), 'medium'),
    latestEventTime: buildDateFieldFromMatches(findAllLabeledValues(safeLines, EVENT_TIME_LABELS), 'actual'),
    latestEventLocation: buildLocationFieldFromMatches(findAllLabeledValues(safeLines, EVENT_LOCATION_LABELS)),
  });
}

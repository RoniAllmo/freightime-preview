/**
 * Conservative combined-line splitting for FreighTime's Smart Tracking
 * Import V2.
 *
 * Responsibility: given a single normalized line that may encode more
 * than one field (a pipe/semicolon-separated run of "Label: value"
 * segments, a paired combined header such as `"Vessel / Voyage: A / B"`,
 * or a multi-column label/value run such as
 * `"Port of Loading    Shanghai    ETD    2026-08-10"`), split it into
 * independent synthetic "Label: value" sub-lines that the existing
 * `findLabeledValue`/`findAllLabeledValues` machinery can search
 * normally.
 *
 * This module is deliberately conservative (rule 12 of the product
 * spec): when a line cannot be split with confidence, it returns `null`
 * and the line is left completely untouched by the caller
 * (`normalizeImportedText`). It never guesses a field boundary inside an
 * ordinary value (a date, a timezone offset, a location, a vessel name)
 * -- only a small set of explicitly recognized separators and label
 * pairs are ever used to split.
 *
 * Performs no DOM/network/storage access and no logging.
 */

import { escapeRegExp } from './normalize-imported-text.js';

/**
 * Explicitly supported label pairs (rule 13). Each pair's `a`/`b` lists
 * are English+Hebrew label variants for that specific field -- not every
 * slash in a line is treated as a field separator, only a line whose
 * *labels* match one of these known pairs.
 */
const PAIR_DEFINITIONS = Object.freeze([
  { aLabels: ['Vessel Name', 'Vessel', 'שם אונייה', 'אונייה'], aCanonical: 'Vessel Name', bLabels: ['Voyage Number', 'Voyage', 'מספר הפלגה', 'הפלגה'], bCanonical: 'Voyage Number' },
  { aLabels: ['Carrier', 'חברת ספנות'], aCanonical: 'Carrier', bLabels: ['Vessel Name', 'Vessel', 'שם אונייה', 'אונייה'], bCanonical: 'Vessel Name' },
  { aLabels: ['Origin', 'שדה מוצא'], aCanonical: 'Origin', bLabels: ['Destination', 'שדה יעד'], bCanonical: 'Destination' },
  { aLabels: ['Port of Loading', 'POL', 'נמל מוצא', 'נמל טעינה'], aCanonical: 'Port of Loading', bLabels: ['Port of Discharge', 'POD', 'נמל יעד', 'נמל פריקה'], bCanonical: 'Port of Discharge' },
  { aLabels: ['Estimated Time of Departure', 'ETD', 'יציאה מתוכננת'], aCanonical: 'ETD', bLabels: ['Estimated Time of Arrival', 'ETA', 'הגעה משוערת'], bCanonical: 'ETA' },
  { aLabels: ['Actual Time of Departure', 'ATD', 'יציאה בפועל'], aCanonical: 'ATD', bLabels: ['Actual Time of Arrival', 'ATA', 'הגעה בפועל'], bCanonical: 'ATA' },
  { aLabels: ['Flight Number', 'Flight', 'מספר טיסה'], aCanonical: 'Flight Number', bLabels: ['Route'], bCanonical: 'Route' },
  { aLabels: ['Current Status', 'Status', 'סטטוס נוכחי', 'סטטוס'], aCanonical: 'Status', bLabels: ['Latest Event', 'Last Event', 'אירוע אחרון'], bCanonical: 'Latest Event' },
  { aLabels: ['Event Time', 'זמן אירוע'], aCanonical: 'Event Time', bLabels: ['Location', 'מיקום'], bCanonical: 'Location' },
]);

/** Flat vocabulary of every recognized label, used to validate a multi-column label/value run (pattern C) before splitting it. */
const KNOWN_LABEL_VOCABULARY = Object.freeze(
  Array.from(
    new Set(
      [
        'Vessel Name', 'Vessel', 'שם אונייה', 'אונייה',
        'Voyage Number', 'Voyage', 'מספר הפלגה', 'הפלגה',
        'Carrier', 'חברת ספנות',
        'Port of Loading', 'POL', 'נמל מוצא', 'נמל טעינה',
        'Port of Discharge', 'POD', 'נמל יעד', 'נמל פריקה',
        'Estimated Time of Departure', 'ETD', 'יציאה מתוכננת',
        'Actual Time of Departure', 'ATD', 'יציאה בפועל',
        'Estimated Time of Arrival', 'ETA', 'הגעה משוערת',
        'Actual Time of Arrival', 'ATA', 'הגעה בפועל',
        'Current Status', 'Status', 'סטטוס נוכחי', 'סטטוס',
        'Latest Event', 'Last Event', 'אירוע אחרון',
        'Event Time', 'זמן אירוע',
        'Location', 'מיקום',
        'Estimated Delivery', 'Scheduled Delivery', 'מסירה משוערת',
        'Delivered', 'נמסר',
        'Flight Number', 'Flight', 'מספר טיסה',
        'Origin', 'שדה מוצא',
        'Destination', 'שדה יעד',
        'Route',
        'Event Date', 'תאריך',
        'Event', 'אירוע',
        'Time', 'שעה',
        'Description',
      ].map((label) => label.toLowerCase()),
    ),
  ),
);

/** Split a segment on `|` or `;`, trimming and dropping empty parts. Requires 2+ non-empty segments to count as a split. */
function trySegmentSplit(line) {
  if (!line.includes('|') && !line.includes(';')) {
    return null;
  }
  const separator = line.includes('|') ? '|' : ';';
  const segments = line
    .split(separator)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
  return segments.length >= 2 ? segments : null;
}

/** Try each known label pair against a combined "LabelA / LabelB: valueA / valueB" header line. */
function tryPairedSlashSplit(line) {
  for (const pair of PAIR_DEFINITIONS) {
    for (const aLabel of pair.aLabels) {
      for (const bLabel of pair.bLabels) {
        const pattern = new RegExp(
          `^\\s*${escapeRegExp(aLabel)}\\s*\\/\\s*${escapeRegExp(bLabel)}\\s*(?:[:\\-–—]|\\t| {2,})\\s*(.+)$`,
          'i',
        );
        const match = line.match(pattern);
        if (!match) {
          continue;
        }
        const remainder = match[1].trim();
        const slashParts = remainder.split('/');
        if (slashParts.length !== 2) {
          // Zero or ambiguous (2+) slashes in the value portion -- cannot split confidently.
          continue;
        }
        const valueA = slashParts[0].trim();
        const valueB = slashParts[1].trim();
        if (valueA.length === 0 || valueB.length === 0) {
          continue;
        }
        return [`${pair.aCanonical}: ${valueA}`, `${pair.bCanonical}: ${valueB}`];
      }
    }
  }
  return null;
}

/** Try splitting a multi-column, colon-free label/value run (e.g. "Port of Loading    Shanghai    ETD    2026-08-10"). */
function tryMultiColumnSplit(line) {
  const tokens = line
    .split(/\t+| {2,}/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  if (tokens.length < 4 || tokens.length % 2 !== 0) {
    return null;
  }

  for (let i = 0; i < tokens.length; i += 2) {
    if (!KNOWN_LABEL_VOCABULARY.includes(tokens[i].toLowerCase())) {
      return null;
    }
  }

  const subLines = [];
  for (let i = 0; i < tokens.length; i += 2) {
    subLines.push(`${tokens[i]}: ${tokens[i + 1]}`);
  }
  return subLines;
}

/**
 * Attempt to split a single normalized line into multiple synthetic
 * "Label: value" sub-lines.
 *
 * @param {*} line - A single normalized line (already trimmed).
 * @returns {ReadonlyArray<string>|null} The split sub-lines (2 or more),
 *   or `null` when the line cannot be split with confidence -- callers
 *   must leave the original line untouched in that case.
 */
export function splitCombinedLine(line) {
  if (typeof line !== 'string' || line.length === 0) {
    return null;
  }

  const paired = tryPairedSlashSplit(line);
  if (paired) {
    return Object.freeze(paired);
  }

  const segmented = trySegmentSplit(line);
  if (segmented) {
    return Object.freeze(segmented);
  }

  const multiColumn = tryMultiColumnSplit(line);
  if (multiColumn) {
    return Object.freeze(multiColumn);
  }

  return null;
}

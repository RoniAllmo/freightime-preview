/**
 * Text normalization and generic labeled-value lookup for FreighTime's
 * Smart Tracking Import V1 (user-mediated paste-and-parse feature).
 *
 * Responsibility: turn raw pasted text (copied by the user from an
 * official carrier tracking page) into a normalized line array, and
 * provide a single generic "find a labeled value" primitive that every
 * mode-specific extractor (`extract-ocean-fields.js`, `extract-air-fields.js`,
 * `extract-courier-fields.js`) reuses with its own label list, instead of
 * each extractor re-implementing label parsing.
 *
 * This module performs no DOM access, no network access, no storage
 * access, and no logging of any kind -- it accepts a string and returns a
 * plain, frozen structured result. It never invents a value: a label that
 * is not found simply yields `null` from `findLabeledValue`.
 */

/** Maximum accepted pasted-text length, in characters. Longer input is rejected, never silently truncated. */
export const MAX_IMPORT_LENGTH = 20000;

/** Shared generic labels reused by every tracking mode (ocean/air/courier). */
export const STATUS_LABELS = Object.freeze(['Current Status', 'Status', 'סטטוס נוכחי', 'סטטוס']);
export const LATEST_EVENT_LABELS = Object.freeze(['Latest Event', 'Last Event', 'אירוע אחרון']);
export const EVENT_TIME_LABELS = Object.freeze(['Event Time', 'זמן אירוע']);
export const EVENT_LOCATION_LABELS = Object.freeze(['Location', 'מיקום']);

/**
 * Escape a string for safe inclusion inside a `RegExp` source, treating it
 * as a literal.
 *
 * @param {string} value
 * @returns {string}
 */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalize raw pasted text into a validated, line-oriented structure.
 *
 * Accepts a string only. Normalizes CRLF/CR line endings to `\n`, splits
 * into lines, trims each line, and drops empty lines while preserving the
 * original relative order (evidence lines are still reported from the
 * normalized set, not the raw untrimmed text). HTML-like text (e.g. a
 * user accidentally pasting markup) is treated as ordinary plain-text
 * characters -- this module never parses or executes it, and no HTML is
 * ever stripped, since stripping could itself alter meaning; the tag
 * characters simply become part of the line text and are matched (or not
 * matched) like any other characters.
 *
 * @param {*} text - The raw pasted text, expected to be a string.
 * @returns {Readonly<{valid: boolean, error?: string, lines?: ReadonlyArray<string>, length?: number}>}
 *   A frozen result. `error` is one of `'empty_input'` (not a string, or
 *   empty/whitespace-only) or `'too_long'` (exceeds `MAX_IMPORT_LENGTH`).
 */
export function normalizeImportedText(text) {
  if (typeof text !== 'string') {
    return Object.freeze({ valid: false, error: 'empty_input' });
  }
  if (text.length > MAX_IMPORT_LENGTH) {
    return Object.freeze({ valid: false, error: 'too_long', length: text.length });
  }
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return Object.freeze({ valid: false, error: 'empty_input' });
  }

  const lines = Object.freeze(
    trimmed
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0),
  );

  return Object.freeze({ valid: true, lines, length: text.length });
}

/**
 * Find the first line matching one of the given labels, where "matching"
 * means the line starts with the literal label text followed by a
 * recognized separator (colon, hyphen, en-dash, em-dash, tab, or two or
 * more spaces) and a non-empty remaining value. Case-insensitive for
 * English labels; Hebrew labels are matched as-is (Hebrew has no case).
 *
 * Only the first matching line (in document order) is returned per call
 * -- callers needing a different field's value call this again with a
 * different label list, so the same physical line can still contribute to
 * more than one field (e.g. a combined "Vessel / Voyage" listing is not
 * supported, but two separate lines are each found independently).
 *
 * @param {ReadonlyArray<string>} lines - Normalized lines from `normalizeImportedText`.
 * @param {ReadonlyArray<string>} labelVariants - Candidate label strings (English and/or Hebrew).
 * @returns {Readonly<{value: string, matchedLabel: string, lineIndex: number, lineText: string}>|null}
 */
export function findLabeledValue(lines, labelVariants) {
  if (!Array.isArray(lines) || !Array.isArray(labelVariants)) {
    return null;
  }
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    if (typeof line !== 'string') {
      continue;
    }
    for (const label of labelVariants) {
      if (typeof label !== 'string' || label.length === 0) {
        continue;
      }
      const escaped = escapeRegExp(label);
      const pattern = new RegExp(`^\\s*${escaped}\\s*(?:[:\\-–—]|\\t| {2,})\\s*(.+)$`, 'i');
      const match = line.match(pattern);
      if (match && match[1] && match[1].trim().length > 0) {
        return Object.freeze({
          value: match[1].trim(),
          matchedLabel: label,
          lineIndex,
          lineText: line,
        });
      }
    }
  }
  return null;
}

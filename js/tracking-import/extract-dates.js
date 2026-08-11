/**
 * Conservative date-value parsing for FreighTime's Smart Tracking Import
 * V1.
 *
 * Responsibility: given a raw text value already isolated as the content
 * following a recognized label (e.g. the `"2026-08-01"` in
 * `"ETD: 2026-08-01"`), determine whether it is a clearly recognizable
 * date, and if so, with what confidence. This module never guesses
 * between two equally plausible interpretations of an ambiguous numeric
 * date (e.g. `03/04/2026`) -- an ambiguous value is reported as such
 * (`ambiguous: true`, `confidence: 'low'`, no `isoDate`), never silently
 * resolved one way or the other.
 *
 * Performs no DOM/network/storage access and no logging. Never converts
 * a time zone -- a source-supplied time zone marker is preserved as text
 * only (`timezoneText`), never used to shift the parsed date/time.
 */

const MONTH_NAMES = Object.freeze({
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
});

const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?\s*(Z|[+-]\d{2}:?\d{2})?)?/;
const NUMERIC_PATTERN = /^(\d{1,2})[./](\d{1,2})[./](\d{4})\b(.*)$/;
const MONTH_NAME_LEADING_PATTERN = /^(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})\b(.*)$/;
const MONTH_NAME_TRAILING_PATTERN = /^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\b(.*)$/;
const TRAILING_TIME_PATTERN = /(\d{1,2}):(\d{2})(?::(\d{2}))?/;
const TRAILING_TZ_PATTERN = /\b(UTC|GMT|Z|[+-]\d{2}:?\d{2})\b/;

function pad2(n) {
  return String(n).padStart(2, '0');
}

function isValidCalendarDate(year, monthIndex0, day) {
  if (monthIndex0 < 0 || monthIndex0 > 11 || day < 1 || day > 31) {
    return false;
  }
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate();
  return day <= daysInMonth;
}

/** Extract a trailing time-of-day and/or timezone marker from remainder text (after the date portion). */
function extractTrailingTimeAndZone(remainder) {
  const text = typeof remainder === 'string' ? remainder : '';
  const timeMatch = text.match(TRAILING_TIME_PATTERN);
  const tzMatch = text.match(TRAILING_TZ_PATTERN);
  return {
    timeText: timeMatch ? `${pad2(timeMatch[1])}:${timeMatch[2]}` : null,
    timezoneText: tzMatch ? tzMatch[1] : null,
  };
}

function buildResult({ raw, isoDate, timeText, timezoneText, confidence, ambiguous, recognizedFormat, parsed }) {
  return Object.freeze({
    raw,
    isoDate: isoDate ?? null,
    timeText: timeText ?? null,
    timezoneText: timezoneText ?? null,
    confidence,
    ambiguous,
    recognizedFormat: recognizedFormat ?? null,
    parsed,
  });
}

/**
 * Parse a raw date/time value with conservative, non-guessing rules.
 *
 * Supported unambiguous formats: ISO 8601 (`YYYY-MM-DD`, optionally with
 * time and an explicit timezone marker), month-name formats (English,
 * e.g. `12 Aug 2026` or `August 12, 2026`), and numeric `D.M.YYYY` /
 * `D/M/YYYY` values where the day-vs-month order can be determined
 * unambiguously because one of the two numbers is greater than 12. A
 * numeric date where both components are `<= 12` (e.g. `03/04/2026`) is
 * reported as ambiguous rather than resolved by guessing.
 *
 * @param {*} rawValue - The raw text value (already isolated from its label).
 * @returns {Readonly<{
 *   raw: string,
 *   isoDate: string|null,
 *   timeText: string|null,
 *   timezoneText: string|null,
 *   confidence: 'high'|'medium'|'low',
 *   ambiguous: boolean,
 *   recognizedFormat: string|null,
 *   parsed: boolean,
 * }>}
 */
export function parseDateValue(rawValue) {
  const raw = typeof rawValue === 'string' ? rawValue.trim() : '';
  if (raw.length === 0) {
    return buildResult({ raw, confidence: 'low', ambiguous: false, parsed: false });
  }

  const isoMatch = raw.match(ISO_PATTERN);
  if (isoMatch) {
    const [, y, mo, d, h, mi] = isoMatch;
    const year = Number(y);
    const monthIndex0 = Number(mo) - 1;
    const day = Number(d);
    if (isValidCalendarDate(year, monthIndex0, day)) {
      const timeText = h !== undefined ? `${pad2(h)}:${mi}` : null;
      return buildResult({
        raw,
        isoDate: `${y}-${mo}-${d}`,
        timeText,
        timezoneText: isoMatch[7] ?? null,
        confidence: 'high',
        ambiguous: false,
        recognizedFormat: 'iso8601',
        parsed: true,
      });
    }
  }

  const monthLeading = raw.match(MONTH_NAME_LEADING_PATTERN);
  if (monthLeading) {
    const [, dayStr, monthName, yearStr, rest] = monthLeading;
    const monthIndex0 = MONTH_NAMES[monthName.toLowerCase()];
    const day = Number(dayStr);
    const year = Number(yearStr);
    if (monthIndex0 !== undefined && isValidCalendarDate(year, monthIndex0, day)) {
      const { timeText, timezoneText } = extractTrailingTimeAndZone(rest);
      return buildResult({
        raw,
        isoDate: `${year}-${pad2(monthIndex0 + 1)}-${pad2(day)}`,
        timeText,
        timezoneText,
        confidence: 'high',
        ambiguous: false,
        recognizedFormat: 'month_name',
        parsed: true,
      });
    }
  }

  const monthTrailing = raw.match(MONTH_NAME_TRAILING_PATTERN);
  if (monthTrailing) {
    const [, monthName, dayStr, yearStr, rest] = monthTrailing;
    const monthIndex0 = MONTH_NAMES[monthName.toLowerCase()];
    const day = Number(dayStr);
    const year = Number(yearStr);
    if (monthIndex0 !== undefined && isValidCalendarDate(year, monthIndex0, day)) {
      const { timeText, timezoneText } = extractTrailingTimeAndZone(rest);
      return buildResult({
        raw,
        isoDate: `${year}-${pad2(monthIndex0 + 1)}-${pad2(day)}`,
        timeText,
        timezoneText,
        confidence: 'high',
        ambiguous: false,
        recognizedFormat: 'month_name',
        parsed: true,
      });
    }
  }

  const numericMatch = raw.match(NUMERIC_PATTERN);
  if (numericMatch) {
    const [, aStr, bStr, yearStr, rest] = numericMatch;
    const a = Number(aStr);
    const b = Number(bStr);
    const year = Number(yearStr);
    const aOver12 = a > 12;
    const bOver12 = b > 12;

    if (aOver12 && !bOver12) {
      // Unambiguous: first number can only be a day.
      if (isValidCalendarDate(year, b - 1, a)) {
        const { timeText, timezoneText } = extractTrailingTimeAndZone(rest);
        return buildResult({
          raw,
          isoDate: `${year}-${pad2(b)}-${pad2(a)}`,
          timeText,
          timezoneText,
          confidence: 'medium',
          ambiguous: false,
          recognizedFormat: 'numeric_day_month',
          parsed: true,
        });
      }
    } else if (bOver12 && !aOver12) {
      // Unambiguous: second number can only be a day.
      if (isValidCalendarDate(year, a - 1, b)) {
        const { timeText, timezoneText } = extractTrailingTimeAndZone(rest);
        return buildResult({
          raw,
          isoDate: `${year}-${pad2(a)}-${pad2(b)}`,
          timeText,
          timezoneText,
          confidence: 'medium',
          ambiguous: false,
          recognizedFormat: 'numeric_day_month',
          parsed: true,
        });
      }
    } else if (!aOver12 && !bOver12) {
      // Both components are plausible as either day or month: genuinely
      // ambiguous. Never silently choose one interpretation.
      return buildResult({
        raw,
        confidence: 'low',
        ambiguous: true,
        recognizedFormat: 'ambiguous_numeric',
        parsed: false,
      });
    }
    // Both over 12: not a valid calendar date under either order -- falls
    // through to the unrecognized result below.
  }

  return buildResult({ raw, confidence: 'low', ambiguous: false, parsed: false });
}

/**
 * Sea transit-time calculator -- pure calculation module for FreighTime's
 * logistics toolkit (`OPERATIONS_TOOLKIT_V1.md`).
 *
 * Responsibility: given user-supplied ETD, ETA, and an optional actual
 * departure date/time, compute planned sailing duration, elapsed time,
 * remaining time until ETA, percentage of the planned transit elapsed, and
 * an honest status label -- entirely from the values the user typed in.
 *
 * This module performs no network I/O, no DOM access, no storage access,
 * and no logging of any kind. It never claims a container or vessel
 * actually departed unless an actual departure date/time was explicitly
 * supplied, never infers an actual arrival, and never calls its own
 * output "live tracking" -- every date-derived figure carries an explicit
 * semantic tag (`'scheduled'`, `'actual'`, `'estimated'`, or
 * `'calculated'`), matching the same time-semantics discipline already
 * used by the mock ocean tracking contract in the sibling backend
 * repository.
 *
 * All date/time values are interpreted in the local time zone of
 * whichever environment evaluates this function (the user's browser, in
 * production) via component-wise `Date` construction -- never via a
 * UTC-parsed ISO string -- so a date-only value (no time supplied) always
 * means "midnight, local time" consistently. When no time is supplied for
 * a date, this is recorded explicitly (`timeSupplied: false`) so a caller
 * can explain the assumption to the user.
 */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const STATUS_NOT_YET_DEPARTED = 'טרם יצא לפי התכנון';
const STATUS_SAILING_ON_SCHEDULE = 'בהפלגה לפי לוח הזמנים';
const STATUS_ETA_PASSED = 'ETA עבר';
const STATUS_ARRIVING_TODAY = 'הגעה צפויה היום';
const STATUS_INSUFFICIENT_DATA = 'נתונים לא מספיקים';

const TIMEZONE_NOTE =
  'כל התאריכים והשעות מחושבים לפי אזור הזמן המקומי של הדפדפן שלכם. כאשר לא סופקה שעה, החישוב מניח 00:00 באותו יום.';

/**
 * Parse a `YYYY-MM-DD` date string and an optional `HH:MM` time string
 * into a local-time `Date`. Returns `null` for any malformed or
 * out-of-range value (including impossible calendar dates such as
 * `2024-02-30`, which `Date`'s own component overflow would otherwise
 * silently roll forward into March).
 *
 * @param {*} dateStr
 * @param {*} timeStr - `null`/`undefined` is treated as `'00:00'`.
 * @returns {{date: Date, timeSupplied: boolean}|null}
 */
function parseLocalDateTime(dateStr, timeStr) {
  if (typeof dateStr !== 'string' || !DATE_PATTERN.test(dateStr)) {
    return null;
  }
  const timeSupplied = timeStr !== null && timeStr !== undefined && timeStr !== '';
  const effectiveTime = timeSupplied ? timeStr : '00:00';
  if (typeof effectiveTime !== 'string' || !TIME_PATTERN.test(effectiveTime)) {
    return null;
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = effectiveTime.split(':').map(Number);

  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) {
    return null;
  }

  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  // Reject calendar overflow (e.g. day 30 in February) by confirming the
  // constructed Date's components match what was requested.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return null;
  }

  return { date, timeSupplied };
}

/**
 * Whether two `Date` values fall on the same local calendar day.
 *
 * @param {Date} a
 * @param {Date} b
 * @returns {boolean}
 */
function isSameLocalDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Round a millisecond duration to whole days, always toward zero decimal
 * noise but preserving the exact millisecond value alongside it.
 *
 * @param {number} ms
 * @returns {{ms: number, days: number}}
 */
function durationFields(ms) {
  return Object.freeze({ ms, days: ms / MS_PER_DAY });
}

function buildError(reason) {
  return Object.freeze({
    valid: false,
    error: reason,
    status: STATUS_INSUFFICIENT_DATA,
  });
}

/**
 * Calculate sea transit-time figures from user-supplied ETD/ETA and an
 * optional actual departure date/time.
 *
 * @param {{
 *   etdDate: string,
 *   etdTime?: string|null,
 *   etaDate: string,
 *   etaTime?: string|null,
 *   actualDepartureDate?: string|null,
 *   actualDepartureTime?: string|null,
 *   now?: Date,
 * }} input - `now` defaults to `new Date()` (the moment this function is
 *   called); callers that need deterministic output (tests, or a caller
 *   wanting to freeze "now") should pass an explicit `Date`.
 * @returns {Readonly<object>} A frozen result. On success,
 *   `valid: true` and every date-derived field carries an explicit
 *   semantic tag. On failure, `valid: false` with a stable `error` code
 *   and `status: 'נתונים לא מספיקים'`.
 */
export function calculateSeaTransit(input) {
  if (input === null || typeof input !== 'object') {
    return buildError('invalid_input');
  }

  const { etdDate, etdTime = null, etaDate, etaTime = null, actualDepartureDate = null, actualDepartureTime = null } =
    input;
  const now = input.now instanceof Date && !Number.isNaN(input.now.getTime()) ? input.now : new Date();

  const etdParsed = parseLocalDateTime(etdDate, etdTime);
  if (!etdParsed) {
    return buildError('invalid_etd');
  }
  const etaParsed = parseLocalDateTime(etaDate, etaTime);
  if (!etaParsed) {
    return buildError('invalid_eta');
  }

  let actualParsed = null;
  if (actualDepartureDate !== null && actualDepartureDate !== undefined && actualDepartureDate !== '') {
    actualParsed = parseLocalDateTime(actualDepartureDate, actualDepartureTime);
    if (!actualParsed) {
      return buildError('invalid_actual_departure');
    }
  }

  if (etaParsed.date.getTime() < etdParsed.date.getTime()) {
    return buildError('eta_before_etd');
  }

  const etd = Object.freeze({
    dateTime: etdParsed.date,
    timeSupplied: etdParsed.timeSupplied,
    type: 'scheduled',
  });
  const eta = Object.freeze({
    dateTime: etaParsed.date,
    timeSupplied: etaParsed.timeSupplied,
    type: 'estimated',
  });
  const actualDeparture = actualParsed
    ? Object.freeze({
        dateTime: actualParsed.date,
        timeSupplied: actualParsed.timeSupplied,
        type: 'actual',
      })
    : null;

  const basisStart = actualDeparture ? actualDeparture.dateTime : etd.dateTime;
  const basisType = actualDeparture ? 'actual' : 'scheduled';

  const plannedDuration = durationFields(eta.dateTime.getTime() - etd.dateTime.getTime());
  const elapsedSinceBasis = durationFields(now.getTime() - basisStart.getTime());
  const remainingUntilEta = durationFields(eta.dateTime.getTime() - now.getTime());

  let percentElapsed = null;
  if (plannedDuration.ms > 0) {
    const raw = ((now.getTime() - basisStart.getTime()) / plannedDuration.ms) * 100;
    percentElapsed = Math.min(100, Math.max(0, raw));
  }

  let status;
  if (now.getTime() < basisStart.getTime()) {
    status = STATUS_NOT_YET_DEPARTED;
  } else if (isSameLocalDay(now, eta.dateTime)) {
    // Same calendar day as ETA takes priority over an exact-instant
    // comparison, so a user checking a few hours after the ETA instant
    // (but still the same day) sees "arriving today" rather than "ETA
    // passed" -- both remain honest, but "today" is the more useful
    // framing while the calendar day has not yet ended.
    status = STATUS_ARRIVING_TODAY;
  } else if (now.getTime() < eta.dateTime.getTime()) {
    status = STATUS_SAILING_ON_SCHEDULE;
  } else {
    status = STATUS_ETA_PASSED;
  }

  return Object.freeze({
    valid: true,
    error: null,
    etd,
    eta,
    actualDeparture,
    plannedDuration: Object.freeze({ ...plannedDuration, type: 'calculated' }),
    elapsedSinceBasis: Object.freeze({ ...elapsedSinceBasis, type: basisType, basisType }),
    remainingUntilEta: Object.freeze({ ...remainingUntilEta, type: 'estimated' }),
    percentElapsed,
    percentElapsedType: 'calculated',
    status,
    timezoneNote: TIMEZONE_NOTE,
  });
}

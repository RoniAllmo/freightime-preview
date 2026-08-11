import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDateValue } from '../../js/tracking-import/extract-dates.js';

test('1. ISO 8601 date-only is parsed with high confidence', () => {
  const result = parseDateValue('2026-08-01');
  assert.equal(result.isoDate, '2026-08-01');
  assert.equal(result.confidence, 'high');
  assert.equal(result.recognizedFormat, 'iso8601');
  assert.equal(result.parsed, true);
});

test('2. ISO 8601 with time and explicit timezone is parsed and the timezone is preserved as text only', () => {
  const result = parseDateValue('2026-08-01T14:30:00+02:00');
  assert.equal(result.isoDate, '2026-08-01');
  assert.equal(result.timeText, '14:30');
  assert.equal(result.timezoneText, '+02:00');
});

test('3. ISO 8601 with Z (UTC) timezone marker is preserved as text, never converted', () => {
  const result = parseDateValue('2026-08-01T09:00Z');
  assert.equal(result.timeText, '09:00');
  assert.equal(result.timezoneText, 'Z');
});

test('4. unambiguous DD/MM/YYYY (day > 12) is parsed with medium confidence', () => {
  const result = parseDateValue('25/03/2026');
  assert.equal(result.isoDate, '2026-03-25');
  assert.equal(result.confidence, 'medium');
  assert.equal(result.ambiguous, false);
});

test('5. unambiguous DD.MM.YYYY (day > 12) with dot separators is parsed', () => {
  const result = parseDateValue('25.03.2026');
  assert.equal(result.isoDate, '2026-03-25');
});

test('6. ambiguous numeric date (both components <= 12) is reported as ambiguous, never guessed', () => {
  const result = parseDateValue('03/04/2026');
  assert.equal(result.isoDate, null);
  assert.equal(result.ambiguous, true);
  assert.equal(result.confidence, 'low');
  assert.equal(result.recognizedFormat, 'ambiguous_numeric');
});

test('7. English month-name format "12 Aug 2026" is parsed with high confidence', () => {
  const result = parseDateValue('12 Aug 2026');
  assert.equal(result.isoDate, '2026-08-12');
  assert.equal(result.confidence, 'high');
});

test('8. English month-name format "August 12, 2026" is parsed', () => {
  const result = parseDateValue('August 12, 2026');
  assert.equal(result.isoDate, '2026-08-12');
});

test('9. full month name "12 August 2026" is parsed', () => {
  const result = parseDateValue('12 August 2026');
  assert.equal(result.isoDate, '2026-08-12');
});

test('10. a trailing time after a month-name date is captured', () => {
  const result = parseDateValue('12 Aug 2026 14:05');
  assert.equal(result.timeText, '14:05');
});

test('11. an impossible calendar date is not parsed', () => {
  const result = parseDateValue('2026-02-30');
  assert.equal(result.parsed, false);
  assert.equal(result.isoDate, null);
});

test('12. completely unrecognizable text is reported unparsed with low confidence, never guessed', () => {
  const result = parseDateValue('sometime next week');
  assert.equal(result.parsed, false);
  assert.equal(result.confidence, 'low');
  assert.equal(result.ambiguous, false);
});

test('13. empty or non-string input is handled safely', () => {
  assert.equal(parseDateValue('').parsed, false);
  assert.equal(parseDateValue(null).parsed, false);
  assert.equal(parseDateValue(undefined).parsed, false);
});

test('14. both numeric components over 12 is not resolved as a valid date', () => {
  const result = parseDateValue('13/14/2026');
  assert.equal(result.parsed, false);
  assert.equal(result.ambiguous, false);
});

test('15. the raw input text is always preserved on the result', () => {
  assert.equal(parseDateValue('  2026-08-01  ').raw, '2026-08-01');
});

test('16. the result object is frozen', () => {
  assert.ok(Object.isFrozen(parseDateValue('2026-08-01')));
});

test('17. no timezone conversion occurs: a value with a timezone marker keeps the same date/time components', () => {
  const result = parseDateValue('2026-08-01T23:50+05:00');
  assert.equal(result.isoDate, '2026-08-01');
  assert.equal(result.timeText, '23:50');
});

test('18. calling the module performs no network, DOM, or storage access', () => {
  assert.equal(typeof window, 'undefined');
  assert.equal(typeof document, 'undefined');
  parseDateValue('2026-08-01');
});

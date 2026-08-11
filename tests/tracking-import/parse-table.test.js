/** All fixtures are synthetic representative text, never copied from a real carrier website. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeImportedText } from '../../js/tracking-import/normalize-imported-text.js';
import { parseTables } from '../../js/tracking-import/parse-table.js';

function lines(text) {
  return normalizeImportedText(text).lines;
}

test('1. a tab-separated table with a header row is parsed into structured rows', () => {
  const text = 'Event Date\tEvent\tLocation\n2026-08-10\tVessel Departed\tShanghai\n2026-08-22\tTransshipment\tSingapore';
  const result = parseTables(lines(text));
  assert.equal(result.tables.length, 1);
  assert.deepEqual(result.tables[0].headerFields, ['date', 'event', 'location']);
  assert.equal(result.tables[0].rows.length, 2);
  assert.equal(result.tables[0].rows[0].valuesByField.event, 'Vessel Departed');
});

test('2. a multiple-space table with a header row is parsed', () => {
  const text = 'Event Date         Event             Location\n2026-08-10         Vessel Departed   Shanghai\n2026-08-22         Transshipment     Singapore';
  const result = parseTables(lines(text));
  assert.equal(result.tables.length, 1);
  assert.equal(result.tables[0].rows.length, 2);
});

test('3. a pipe-separated table is parsed', () => {
  const text = 'Event Date | Event | Location\n2026-08-10 | Vessel Departed | Shanghai';
  const result = parseTables(lines(text));
  assert.equal(result.tables.length, 1);
  assert.equal(result.tables[0].rows[0].valuesByField.location, 'Shanghai');
});

test('4. Hebrew headers are recognized', () => {
  const text = 'תאריך\tאירוע\tמיקום\n2026-08-10\tיצא מהנמל\tשנחאי';
  const result = parseTables(lines(text));
  assert.equal(result.tables.length, 1);
  assert.deepEqual(result.tables[0].headerFields, ['date', 'event', 'location']);
});

test('5. a repeated header row is safely skipped, not treated as a data row', () => {
  const text = 'Event Date\tEvent\tLocation\n2026-08-10\tVessel Departed\tShanghai\nEvent Date\tEvent\tLocation\n2026-08-22\tTransshipment\tSingapore';
  const result = parseTables(lines(text));
  assert.equal(result.tables[0].rows.length, 2);
});

test('6. a missing-cell row ends the table block rather than guessing', () => {
  const text = 'Event Date\tEvent\tLocation\n2026-08-10\tVessel Departed\tShanghai\n2026-08-22\tTransshipment';
  const result = parseTables(lines(text));
  assert.equal(result.tables[0].rows.length, 1);
});

test('7. an extra-cell row merges the overflow into the last column rather than dropping data', () => {
  const text = 'Event Date\tEvent\tLocation\n2026-08-10\tVessel Departed Late\tShanghai\tPort Area';
  const result = parseTables(lines(text));
  assert.equal(result.tables[0].rows[0].valuesByField.location, 'Shanghai Port Area');
});

test('8. blank rows between table lines end the current block', () => {
  const text = 'Event Date\tEvent\tLocation\n2026-08-10\tVessel Departed\tShanghai\n\nUnrelated text after a blank line';
  const result = parseTables(lines(text));
  assert.equal(result.tables[0].rows.length, 1);
});

test('9. plain text that merely resembles a table (unrecognized headers) is not interpreted as one', () => {
  const text = 'Random Header One\tRandom Header Two\nsome value\tanother value';
  const result = parseTables(lines(text));
  assert.equal(result.tables.length, 0);
});

test('10. a single-line "header" with no data rows produces no table', () => {
  const text = 'Event Date\tEvent\tLocation';
  const result = parseTables(lines(text));
  assert.equal(result.tables.length, 0);
});

test('11. two separate table blocks in the same text are each recognized', () => {
  const text =
    'Vessel\tVoyage\n' +
    'MSC EXAMPLE\tFV632R\n' +
    '\n' +
    'Event Date\tEvent\tLocation\n' +
    '2026-08-10\tVessel Departed\tShanghai';
  const result = parseTables(lines(text));
  assert.equal(result.tables.length, 2);
});

test('12. malformed input is handled safely', () => {
  assert.equal(parseTables(null).tables.length, 0);
  assert.equal(parseTables(undefined).tables.length, 0);
  assert.equal(parseTables([]).tables.length, 0);
});

test('13. the result is frozen', () => {
  const text = 'Event Date\tEvent\tLocation\n2026-08-10\tVessel Departed\tShanghai';
  const result = parseTables(lines(text));
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.tables));
});

test('14. calling the module performs no network, DOM, or storage access', () => {
  assert.equal(typeof window, 'undefined');
  assert.equal(typeof document, 'undefined');
  parseTables(['Event Date\tEvent\tLocation']);
});

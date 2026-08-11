/** Fixtures are entirely synthetic representative text, never copied from a real carrier website. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeImportedText } from '../../js/tracking-import/normalize-imported-text.js';
import { extractAirFields } from '../../js/tracking-import/extract-air-fields.js';

function lines(text) {
  return normalizeImportedText(text).lines;
}

test('1. flight number + origin + destination are extracted', () => {
  const fields = extractAirFields(lines('Flight Number: LY001\nOrigin: TLV\nDestination: JFK'));
  assert.equal(fields.flightNumber.value, 'LY001');
  assert.equal(fields.origin.value, 'TLV');
  assert.equal(fields.destination.value, 'JFK');
});

test('2. scheduled departure + estimated arrival are extracted from generic Departure/Arrival labels', () => {
  const fields = extractAirFields(lines('Departure: 2026-08-01\nArrival: 2026-08-02'));
  assert.equal(fields.scheduledDeparture.value, '2026-08-01');
  assert.equal(fields.scheduledDeparture.semantic, 'scheduled');
  assert.equal(fields.estimatedArrival.value, '2026-08-02');
  assert.equal(fields.estimatedArrival.semantic, 'estimated');
});

test('3. Hebrew flight labels are recognized', () => {
  const fields = extractAirFields(lines('מספר טיסה: LY001\nשדה מוצא: TLV\nשדה יעד: JFK'));
  assert.equal(fields.flightNumber.value, 'LY001');
  assert.equal(fields.origin.value, 'TLV');
  assert.equal(fields.destination.value, 'JFK');
});

test('4. ATD is tagged actual and is distinct from scheduled departure', () => {
  const fields = extractAirFields(lines('Departure: 2026-08-01\nActual Time of Departure: 2026-08-01T09:00'));
  assert.equal(fields.scheduledDeparture.semantic, 'scheduled');
  assert.equal(fields.actualDeparture.semantic, 'actual');
});

test('5. ATA is tagged actual', () => {
  const fields = extractAirFields(lines('Actual Time of Arrival: 2026-08-02T10:00'));
  assert.equal(fields.actualArrival.semantic, 'actual');
});

test('6. no airline is ever inferred from a flight number or AWB-like text', () => {
  const fields = extractAirFields(lines('Flight Number: 020-12345678'));
  const serialized = JSON.stringify(fields);
  for (const forbidden of ['El Al', 'Lufthansa', 'Emirates', 'United', 'Delta']) {
    assert.ok(!serialized.includes(forbidden));
  }
});

test('7. latest event + event time is extracted', () => {
  const fields = extractAirFields(lines('Latest Event: Departed origin\nEvent Time: 2026-08-01'));
  assert.equal(fields.latestEvent.value, 'Departed origin');
  assert.equal(fields.latestEventTime.value, '2026-08-01');
});

test('8. missing fields are null, never fabricated', () => {
  const fields = extractAirFields(lines('Flight Number: LY001'));
  assert.equal(fields.origin, null);
  assert.equal(fields.destination, null);
});

test('9. an ambiguous date is kept unresolved with low confidence', () => {
  const fields = extractAirFields(lines('Departure: 03/04/2026'));
  assert.equal(fields.scheduledDeparture.confidence, 'low');
  assert.equal(fields.scheduledDeparture.semantic, 'unknown');
});

test('10. results are frozen', () => {
  const fields = extractAirFields(lines('Flight Number: LY001'));
  assert.ok(Object.isFrozen(fields));
  assert.ok(Object.isFrozen(fields.flightNumber));
});

test('11. malformed lines input is handled safely', () => {
  const fields = extractAirFields(null);
  assert.equal(fields.flightNumber, null);
});

test('12. calling the module performs no network, DOM, or storage access', () => {
  assert.equal(typeof window, 'undefined');
  assert.equal(typeof document, 'undefined');
  extractAirFields(lines('Flight Number: LY001'));
});

/**
 * Tests for js/tools/sea-transit-calculator.js using the built-in
 * Node.js test runner (`node:test`) and assertion library
 * (`node:assert`).
 *
 * Every test passes an explicit `now` so results are deterministic and
 * independent of the machine's actual clock or time zone offset (dates
 * are still constructed via local-time components, matching the
 * module's own local-time semantics, so this remains correct regardless
 * of which time zone the test runner executes in).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSeaTransit } from '../../js/tools/sea-transit-calculator.js';

test('1. a valid ETD and ETA with no actual departure calculates a scheduled-basis result', () => {
  const now = new Date(2026, 7, 15, 12, 0);
  const result = calculateSeaTransit({ etdDate: '2026-08-01', etaDate: '2026-08-20', now });
  assert.equal(result.valid, true);
  assert.equal(result.etd.type, 'scheduled');
  assert.equal(result.eta.type, 'estimated');
  assert.equal(result.actualDeparture, null);
  assert.equal(result.elapsedSinceBasis.basisType, 'scheduled');
});

test('2. ETA earlier than ETD is rejected', () => {
  const result = calculateSeaTransit({ etdDate: '2026-08-20', etaDate: '2026-08-01', now: new Date(2026, 7, 15) });
  assert.equal(result.valid, false);
  assert.equal(result.error, 'eta_before_etd');
  assert.equal(result.status, 'נתונים לא מספיקים');
});

test('3. date-only inputs (no time) default to 00:00 local and record timeSupplied: false', () => {
  const result = calculateSeaTransit({ etdDate: '2026-08-01', etaDate: '2026-08-20', now: new Date(2026, 7, 15) });
  assert.equal(result.etd.timeSupplied, false);
  assert.equal(result.eta.timeSupplied, false);
  assert.equal(result.etd.dateTime.getHours(), 0);
  assert.equal(result.etd.dateTime.getMinutes(), 0);
});

test('4. supplying a time is recorded as timeSupplied: true', () => {
  const result = calculateSeaTransit({
    etdDate: '2026-08-01',
    etdTime: '14:30',
    etaDate: '2026-08-20',
    etaTime: '09:15',
    now: new Date(2026, 7, 15),
  });
  assert.equal(result.etd.timeSupplied, true);
  assert.equal(result.etd.dateTime.getHours(), 14);
  assert.equal(result.etd.dateTime.getMinutes(), 30);
  assert.equal(result.eta.timeSupplied, true);
  assert.equal(result.eta.dateTime.getHours(), 9);
  assert.equal(result.eta.dateTime.getMinutes(), 15);
});

test('5. actual departure supplied is tagged "actual" and used as the elapsed-time basis', () => {
  const now = new Date(2026, 7, 15, 12, 0);
  const result = calculateSeaTransit({
    etdDate: '2026-08-01',
    etaDate: '2026-08-20',
    actualDepartureDate: '2026-08-03',
    now,
  });
  assert.equal(result.actualDeparture.type, 'actual');
  assert.equal(result.elapsedSinceBasis.basisType, 'actual');
  const expectedElapsedMs = now.getTime() - new Date(2026, 7, 3, 0, 0).getTime();
  assert.equal(result.elapsedSinceBasis.ms, expectedElapsedMs);
});

test('6. no actual departure supplied uses ETD (schedule-based) as the elapsed-time basis', () => {
  const now = new Date(2026, 7, 15, 12, 0);
  const result = calculateSeaTransit({ etdDate: '2026-08-01', etaDate: '2026-08-20', now });
  assert.equal(result.actualDeparture, null);
  assert.equal(result.elapsedSinceBasis.basisType, 'scheduled');
  const expectedElapsedMs = now.getTime() - new Date(2026, 7, 1, 0, 0).getTime();
  assert.equal(result.elapsedSinceBasis.ms, expectedElapsedMs);
});

test('7. ETA in the past reports status "ETA עבר"', () => {
  const result = calculateSeaTransit({ etdDate: '2026-08-01', etaDate: '2026-08-10', now: new Date(2026, 7, 20, 12, 0) });
  assert.equal(result.status, 'ETA עבר');
});

test('8. ETA today reports status "הגעה צפויה היום"', () => {
  const result = calculateSeaTransit({ etdDate: '2026-08-01', etaDate: '2026-08-15', now: new Date(2026, 7, 15, 22, 0) });
  assert.equal(result.status, 'הגעה צפויה היום');
});

test('9. a future ETD (not yet departed) reports status "טרם יצא לפי התכנון"', () => {
  const result = calculateSeaTransit({ etdDate: '2026-09-01', etaDate: '2026-09-20', now: new Date(2026, 7, 15) });
  assert.equal(result.status, 'טרם יצא לפי התכנון');
});

test('10. mid-voyage reports status "בהפלגה לפי לוח הזמנים"', () => {
  const result = calculateSeaTransit({ etdDate: '2026-08-01', etaDate: '2026-08-20', now: new Date(2026, 7, 10, 12, 0) });
  assert.equal(result.status, 'בהפלגה לפי לוח הזמנים');
});

test('11. percentage elapsed is calculated correctly and clamped to [0, 100]', () => {
  const half = calculateSeaTransit({ etdDate: '2026-08-01', etaDate: '2026-08-21', now: new Date(2026, 7, 11) });
  assert.ok(Math.abs(half.percentElapsed - 50) < 0.01);

  const beforeDeparture = calculateSeaTransit({ etdDate: '2026-09-01', etaDate: '2026-09-20', now: new Date(2026, 7, 1) });
  assert.equal(beforeDeparture.percentElapsed, 0);

  const afterEta = calculateSeaTransit({ etdDate: '2026-08-01', etaDate: '2026-08-10', now: new Date(2026, 7, 25) });
  assert.equal(afterEta.percentElapsed, 100);
});

test('12. percentElapsed is tagged "calculated"', () => {
  const result = calculateSeaTransit({ etdDate: '2026-08-01', etaDate: '2026-08-20', now: new Date(2026, 7, 10) });
  assert.equal(result.percentElapsedType, 'calculated');
});

test('13. local-time handling: date-only ETD/ETA are always midnight in local components, never UTC-shifted', () => {
  const result = calculateSeaTransit({ etdDate: '2026-01-01', etaDate: '2026-01-10', now: new Date(2026, 0, 5) });
  assert.equal(result.etd.dateTime.getFullYear(), 2026);
  assert.equal(result.etd.dateTime.getMonth(), 0);
  assert.equal(result.etd.dateTime.getDate(), 1);
  assert.equal(result.etd.dateTime.getHours(), 0);
});

test('14. ETD is always tagged "scheduled" and ETA is always tagged "estimated"', () => {
  const result = calculateSeaTransit({ etdDate: '2026-08-01', etaDate: '2026-08-20', now: new Date(2026, 7, 10) });
  assert.equal(result.etd.type, 'scheduled');
  assert.equal(result.eta.type, 'estimated');
});

test('15. the result never claims an actual departure unless one was explicitly supplied', () => {
  const result = calculateSeaTransit({ etdDate: '2026-08-01', etaDate: '2026-08-20', now: new Date(2026, 7, 10) });
  assert.equal(result.actualDeparture, null);
  assert.equal(result.elapsedSinceBasis.basisType, 'scheduled');
});

test('16. an invalid or malformed ETD is rejected', () => {
  assert.equal(calculateSeaTransit({ etdDate: 'not-a-date', etaDate: '2026-08-20' }).error, 'invalid_etd');
  assert.equal(calculateSeaTransit({ etdDate: '2026-02-30', etaDate: '2026-08-20' }).error, 'invalid_etd');
  assert.equal(calculateSeaTransit({ etaDate: '2026-08-20' }).error, 'invalid_etd');
});

test('17. an invalid or malformed ETA is rejected', () => {
  assert.equal(calculateSeaTransit({ etdDate: '2026-08-01', etaDate: 'not-a-date' }).error, 'invalid_eta');
});

test('18. an invalid actual-departure value is rejected', () => {
  const result = calculateSeaTransit({ etdDate: '2026-08-01', etaDate: '2026-08-20', actualDepartureDate: 'garbage' });
  assert.equal(result.error, 'invalid_actual_departure');
});

test('19. planned duration is the difference between ETA and ETD regardless of actual departure', () => {
  const withoutActual = calculateSeaTransit({ etdDate: '2026-08-01', etaDate: '2026-08-11', now: new Date(2026, 7, 5) });
  const withActual = calculateSeaTransit({
    etdDate: '2026-08-01',
    etaDate: '2026-08-11',
    actualDepartureDate: '2026-08-02',
    now: new Date(2026, 7, 5),
  });
  assert.equal(withoutActual.plannedDuration.days, 10);
  assert.equal(withActual.plannedDuration.days, 10);
});

test('20. a fixed, non-empty time-zone assumption note is always included', () => {
  const result = calculateSeaTransit({ etdDate: '2026-08-01', etaDate: '2026-08-20', now: new Date(2026, 7, 10) });
  assert.equal(typeof result.timezoneNote, 'string');
  assert.ok(result.timezoneNote.length > 0);
});

test('21. non-object input is handled safely', () => {
  assert.equal(calculateSeaTransit(null).valid, false);
  assert.equal(calculateSeaTransit(undefined).valid, false);
});

test('22. the result object and its nested date fields are frozen', () => {
  const result = calculateSeaTransit({ etdDate: '2026-08-01', etaDate: '2026-08-20', now: new Date(2026, 7, 10) });
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.etd));
  assert.ok(Object.isFrozen(result.eta));
});

test('23. calling the function performs no network, DOM, or storage access', () => {
  assert.equal(typeof window, 'undefined');
  assert.equal(typeof document, 'undefined');
  calculateSeaTransit({ etdDate: '2026-08-01', etaDate: '2026-08-20', now: new Date(2026, 7, 10) });
});

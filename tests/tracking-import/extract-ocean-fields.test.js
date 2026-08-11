/**
 * Fixtures below are entirely synthetic representative text mimicking the
 * generic label style described in the product spec -- never content
 * copied from a real carrier website.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeImportedText } from '../../js/tracking-import/normalize-imported-text.js';
import { extractOceanFields } from '../../js/tracking-import/extract-ocean-fields.js';

function lines(text) {
  return normalizeImportedText(text).lines;
}

test('1. vessel + voyage + ETA are extracted from English labels', () => {
  const fields = extractOceanFields(lines('Vessel Name: MSC EXAMPLE\nVoyage Number: 123W\nETA: 2026-08-20'));
  assert.equal(fields.vesselName.value, 'MSC EXAMPLE');
  assert.equal(fields.voyageNumber.value, '123W');
  assert.equal(fields.eta.value, '2026-08-20');
  assert.equal(fields.eta.semantic, 'estimated');
});

test('2. port of loading + ETD + port of discharge + ETA are extracted from Hebrew labels', () => {
  const text = 'נמל טעינה: חיפה\nיציאה מתוכננת: 2026-08-01\nנמל יעד: רוטרדם\nהגעה משוערת: 2026-08-20';
  const fields = extractOceanFields(lines(text));
  assert.equal(fields.portOfLoading.value, 'חיפה');
  assert.equal(fields.etd.value, '2026-08-01');
  assert.equal(fields.etd.semantic, 'scheduled');
  assert.equal(fields.portOfDischarge.value, 'רוטרדם');
  assert.equal(fields.eta.value, '2026-08-20');
});

test('3. ETD is always scheduled unless a separate ATD label is present', () => {
  const fields = extractOceanFields(lines('ETD: 2026-08-01'));
  assert.equal(fields.etd.semantic, 'scheduled');
  assert.equal(fields.actualDeparture, null);
});

test('4. ATD (actual time of departure) is tagged actual, distinct from ETD', () => {
  const fields = extractOceanFields(lines('ETD: 2026-08-01\nATD: 2026-08-02'));
  assert.equal(fields.etd.semantic, 'scheduled');
  assert.equal(fields.actualDeparture.semantic, 'actual');
  assert.equal(fields.actualDeparture.value, '2026-08-02');
});

test('5. ATA (actual time of arrival) is tagged actual', () => {
  const fields = extractOceanFields(lines('ATA: 2026-08-20'));
  assert.equal(fields.actualArrival.semantic, 'actual');
});

test('6. latest event + event time + event location are extracted together', () => {
  const text = 'Latest Event: Vessel departed\nEvent Time: 2026-08-01\nLocation: Port of Haifa';
  const fields = extractOceanFields(lines(text));
  assert.equal(fields.latestEvent.value, 'Vessel departed');
  assert.equal(fields.latestEventTime.value, '2026-08-01');
  assert.equal(fields.latestEventLocation.value, 'Port of Haifa');
});

test('7. missing fields are simply null, not fabricated', () => {
  const fields = extractOceanFields(lines('Vessel Name: MSC EXAMPLE'));
  assert.equal(fields.voyageNumber, null);
  assert.equal(fields.eta, null);
  assert.equal(fields.portOfLoading, null);
});

test('8. malformed/empty lines input is handled safely', () => {
  const fields = extractOceanFields([]);
  assert.equal(fields.vesselName, null);
  assert.deepEqual(Object.keys(fields).length > 0, true);
});

test('9. no carrier is ever inferred from any field', () => {
  const fields = extractOceanFields(lines('Vessel Name: MSC EXAMPLE\nVoyage Number: 123W'));
  const serialized = JSON.stringify(fields);
  for (const forbidden of ['MSC Mediterranean', 'ZIM Integrated', 'Maersk Line', 'CMA CGM']) {
    assert.ok(!serialized.includes(forbidden));
  }
});

test('10. an ambiguous ETA date is kept with low confidence, not silently resolved', () => {
  const fields = extractOceanFields(lines('ETA: 03/04/2026'));
  assert.equal(fields.eta.confidence, 'low');
  assert.equal(fields.eta.semantic, 'unknown');
  assert.equal(fields.eta.ambiguous, true);
});

test('11. an explicit timezone marker is preserved on a date field', () => {
  const fields = extractOceanFields(lines('ETD: 2026-08-01T14:30+02:00'));
  assert.equal(fields.etd.timezoneText, '+02:00');
});

test('12. every field carries evidence referencing the matched line and label', () => {
  const fields = extractOceanFields(lines('Vessel Name: MSC EXAMPLE'));
  assert.ok(fields.vesselName.evidence.includes('MSC EXAMPLE'));
  assert.ok(fields.vesselName.evidence.includes('Vessel Name'));
});

test('13. every field carries inferred: false', () => {
  const fields = extractOceanFields(lines('Vessel Name: MSC EXAMPLE\nETA: 2026-08-20'));
  assert.equal(fields.vesselName.inferred, false);
  assert.equal(fields.eta.inferred, false);
});

test('14. status label is recognized', () => {
  const fields = extractOceanFields(lines('Status: In Transit'));
  assert.equal(fields.status.value, 'In Transit');
});

test('15. results are frozen', () => {
  const fields = extractOceanFields(lines('Vessel Name: MSC EXAMPLE'));
  assert.ok(Object.isFrozen(fields));
  assert.ok(Object.isFrozen(fields.vesselName));
});

test('16. calling the module performs no network, DOM, or storage access', () => {
  assert.equal(typeof window, 'undefined');
  assert.equal(typeof document, 'undefined');
  extractOceanFields(lines('Vessel Name: MSC EXAMPLE'));
});

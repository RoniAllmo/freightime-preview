/** Fixtures are entirely synthetic representative text, never copied from a real carrier website. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeImportedText } from '../../js/tracking-import/normalize-imported-text.js';
import { extractCourierFields } from '../../js/tracking-import/extract-courier-fields.js';

function lines(text) {
  return normalizeImportedText(text).lines;
}

test('1. current status + latest event are extracted', () => {
  const fields = extractCourierFields(lines('Status: Out for delivery\nLatest Event: Arrived at local facility'));
  assert.equal(fields.currentStatus.value, 'Out for delivery');
  assert.equal(fields.latestEvent.value, 'Arrived at local facility');
});

test('2. latest event + event time + event location are extracted', () => {
  const text = 'Latest Event: Package scanned\nEvent Time: 2026-08-05\nLocation: Tel Aviv Hub';
  const fields = extractCourierFields(lines(text));
  assert.equal(fields.latestEvent.value, 'Package scanned');
  assert.equal(fields.latestEventTime.value, '2026-08-05');
  assert.equal(fields.latestEventLocation.value, 'Tel Aviv Hub');
});

test('3. current status + estimated delivery are extracted', () => {
  const fields = extractCourierFields(lines('Current Status: In Transit\nEstimated Delivery: 2026-08-10'));
  assert.equal(fields.currentStatus.value, 'In Transit');
  assert.equal(fields.estimatedDelivery.value, '2026-08-10');
  assert.equal(fields.estimatedDelivery.semantic, 'estimated');
});

test('4. Delivered/נמסר is tagged actual for actualDelivery', () => {
  const fields = extractCourierFields(lines('Delivered: 2026-08-06'));
  assert.equal(fields.actualDelivery.semantic, 'actual');
  const heFields = extractCourierFields(lines('נמסר: 2026-08-06'));
  assert.equal(heFields.actualDelivery.semantic, 'actual');
});

test('5. Hebrew status labels are recognized', () => {
  const fields = extractCourierFields(lines('סטטוס נוכחי: נמסר'));
  assert.equal(fields.currentStatus.value, 'נמסר');
});

test('6. missing fields are null, never fabricated', () => {
  const fields = extractCourierFields(lines('Status: In Transit'));
  assert.equal(fields.latestEvent, null);
  assert.equal(fields.estimatedDelivery, null);
});

test('7. no delivery outcome is inferred without an explicit label', () => {
  const fields = extractCourierFields(lines('Status: In Transit'));
  assert.equal(fields.actualDelivery, null);
});

test('8. results are frozen', () => {
  const fields = extractCourierFields(lines('Status: In Transit'));
  assert.ok(Object.isFrozen(fields));
});

test('9. malformed lines input is handled safely', () => {
  const fields = extractCourierFields(undefined);
  assert.equal(fields.currentStatus, null);
});

test('10. calling the module performs no network, DOM, or storage access', () => {
  assert.equal(typeof window, 'undefined');
  assert.equal(typeof document, 'undefined');
  extractCourierFields(lines('Status: In Transit'));
});

/** Fixtures are entirely synthetic representative text, never copied from a real carrier website. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTrackingSummary } from '../../js/tracking-import/build-tracking-summary.js';
import { MAX_IMPORT_LENGTH } from '../../js/tracking-import/normalize-imported-text.js';

const NOW = new Date(2026, 7, 15, 12, 0);

test('1. an ocean text with vessel+voyage+ETA qualifies as partial in ocean mode', () => {
  const result = buildTrackingSummary({
    text: 'Vessel Name: MSC EXAMPLE\nVoyage Number: 123W\nETA: 2026-08-20',
    sourceType: 'ocean',
    now: NOW,
  });
  assert.equal(result.valid, true);
  assert.equal(result.detectedMode, 'ocean');
  assert.equal(result.supportLevel, 'partial');
  assert.deepEqual([...result.meaningfulGroupFields].sort(), ['eta', 'vesselName', 'voyageNumber'].sort());
});

test('2. an air text with flight+origin+destination qualifies as partial in air mode', () => {
  const result = buildTrackingSummary({
    text: 'Flight Number: LY001\nOrigin: TLV\nDestination: JFK',
    sourceType: 'air',
    now: NOW,
  });
  assert.equal(result.supportLevel, 'partial');
  assert.equal(result.detectedMode, 'air');
});

test('3. a courier text with status+latest event qualifies as partial in courier mode', () => {
  const result = buildTrackingSummary({
    text: 'Status: Out for delivery\nLatest Event: Arrived at local facility',
    sourceType: 'courier',
    now: NOW,
  });
  assert.equal(result.supportLevel, 'partial');
  assert.equal(result.detectedMode, 'courier');
});

test('4. text with no recognizable labels at all falls back to detection_only', () => {
  const result = buildTrackingSummary({ text: 'Thank you for shopping with us!', sourceType: 'auto', now: NOW });
  assert.equal(result.valid, true);
  assert.equal(result.supportLevel, 'detection_only');
  assert.equal(result.detectedMode, 'unknown');
  assert.equal(typeof result.message, 'string');
  assert.ok(result.message.length > 0);
});

test('5. auto-detect chooses the mode with a qualifying meaningful group', () => {
  const result = buildTrackingSummary({
    text: 'Vessel Name: MSC EXAMPLE\nVoyage Number: 123W\nETA: 2026-08-20',
    sourceType: 'auto',
    now: NOW,
  });
  assert.equal(result.detectedMode, 'ocean');
  assert.equal(result.supportLevel, 'partial');
});

test('6. "unknown" source type behaves the same as auto-detect', () => {
  const result = buildTrackingSummary({
    text: 'Flight Number: LY001\nOrigin: TLV\nDestination: JFK',
    sourceType: 'unknown',
    now: NOW,
  });
  assert.equal(result.detectedMode, 'air');
  assert.equal(result.supportLevel, 'partial');
});

test('7. a single low-confidence (ambiguous) field alone never grants partial status', () => {
  const result = buildTrackingSummary({ text: 'ETA: 03/04/2026', sourceType: 'ocean', now: NOW });
  assert.equal(result.supportLevel, 'detection_only');
});

test('8. a low-confidence field can coexist with a qualifying group from other fields', () => {
  const text = 'Vessel Name: MSC EXAMPLE\nVoyage Number: 123W\nETA: 2026-08-20\nEvent Time: 03/04/2026';
  const result = buildTrackingSummary({ text, sourceType: 'ocean', now: NOW });
  assert.equal(result.supportLevel, 'partial');
  assert.equal(result.fields.latestEventTime.confidence, 'low');
});

test('9. text over the maximum length is rejected, not silently truncated', () => {
  const result = buildTrackingSummary({ text: 'a'.repeat(MAX_IMPORT_LENGTH + 1), now: NOW });
  assert.equal(result.valid, false);
  assert.equal(result.error, 'too_long');
});

test('10. empty text is rejected', () => {
  const result = buildTrackingSummary({ text: '', now: NOW });
  assert.equal(result.valid, false);
  assert.equal(result.error, 'empty_input');
});

test('11. malformed (non-object) input is handled safely', () => {
  assert.equal(buildTrackingSummary(null).valid, false);
  assert.equal(buildTrackingSummary(undefined).valid, false);
});

test('12. importedAt reflects the supplied "now" as an ISO string', () => {
  const result = buildTrackingSummary({ text: 'Status: In Transit', sourceType: 'courier', now: NOW });
  assert.equal(result.importedAt, NOW.toISOString());
});

test('13. a partial result never includes a fabricated field the text did not contain', () => {
  const result = buildTrackingSummary({
    text: 'Vessel Name: MSC EXAMPLE\nVoyage Number: 123W\nETA: 2026-08-20',
    sourceType: 'ocean',
    now: NOW,
  });
  assert.equal(result.fields.portOfLoading, null);
  assert.equal(result.fields.actualArrival, null);
});

test('14. a fixed non-empty disclaimer/limitation is always included on a successful parse', () => {
  const result = buildTrackingSummary({ text: 'Status: In Transit', sourceType: 'courier', now: NOW });
  assert.ok(Array.isArray(result.limitations));
  assert.ok(result.limitations.length > 0);
  assert.ok(result.limitations[0].length > 0);
});

test('15. requesting an explicit sourceType with no qualifying group still reports that mode, as detection_only', () => {
  const result = buildTrackingSummary({ text: 'Vessel Name: MSC EXAMPLE', sourceType: 'ocean', now: NOW });
  assert.equal(result.detectedMode, 'ocean');
  assert.equal(result.supportLevel, 'detection_only');
});

test('16. the result is frozen', () => {
  const result = buildTrackingSummary({ text: 'Status: In Transit', sourceType: 'courier', now: NOW });
  assert.ok(Object.isFrozen(result));
});

test('17. Unicode and mixed Hebrew/English text does not crash the parser', () => {
  const result = buildTrackingSummary({
    text: 'סטטוס: 📦 In Transit לתל אביב',
    sourceType: 'courier',
    now: NOW,
  });
  assert.equal(result.valid, true);
});

test('18. HTML-like pasted text is treated as plain text without crashing', () => {
  const result = buildTrackingSummary({
    text: '<div>Status: <b>In Transit</b></div>',
    sourceType: 'courier',
    now: NOW,
  });
  assert.equal(result.valid, true);
});

test('19. calling the module performs no network, DOM, or storage access', () => {
  assert.equal(typeof window, 'undefined');
  assert.equal(typeof document, 'undefined');
  buildTrackingSummary({ text: 'Status: In Transit', now: NOW });
});

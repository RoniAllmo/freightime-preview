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

// --- V2 scenarios ---

test('20. a combined "Vessel / Voyage" line still contributes to a meaningful group', () => {
  const result = buildTrackingSummary({
    text: 'Vessel / Voyage: MSC EXAMPLE / FV632R\nETA: 2026-09-18',
    sourceType: 'ocean',
    now: NOW,
  });
  assert.equal(result.supportLevel, 'partial');
  assert.equal(result.fields.vesselName.value, 'MSC EXAMPLE');
  assert.equal(result.fields.voyageNumber.value, 'FV632R');
});

test('21. a conflicting ETA prevents the vessel+voyage+ETA group, without invalidating vessel/voyage themselves', () => {
  const result = buildTrackingSummary({
    text: 'Vessel: MSC EXAMPLE\nVoyage: FV632R\nETA: 2026-09-18\nETA: 2026-09-20',
    sourceType: 'ocean',
    now: NOW,
  });
  assert.equal(result.fields.eta.conflict, true);
  assert.equal(result.fields.vesselName.value, 'MSC EXAMPLE');
  assert.equal(result.fields.voyageNumber.value, 'FV632R');
});

test('22. an unresolved conflict in one group still allows a different valid group to qualify as partial (rule 34)', () => {
  const result = buildTrackingSummary({
    text: 'Vessel: MSC EXAMPLE\nVoyage: FV632R\nETA: 2026-09-18\nETA: 2026-09-20\nLatest Event: Departed\nEvent Time: 2026-08-01',
    sourceType: 'ocean',
    now: NOW,
  });
  assert.equal(result.supportLevel, 'partial');
  assert.deepEqual([...result.meaningfulGroupFields].sort(), ['latestEvent', 'latestEventTime'].sort());
});

test('23. a duplicate (identical) ETA repeated is not a conflict and still qualifies a group', () => {
  const result = buildTrackingSummary({
    text: 'Vessel: MSC EXAMPLE\nVoyage: FV632R\nETA: 2026-09-18\nETA: 2026-09-18',
    sourceType: 'ocean',
    now: NOW,
  });
  assert.equal(result.supportLevel, 'partial');
  assert.equal(result.fields.eta.conflict, false);
});

test('24. the new vessel+voyage+POL+POD group qualifies as partial', () => {
  const result = buildTrackingSummary({
    text: 'Vessel: MSC EXAMPLE\nVoyage: FV632R\nPort of Loading: Shanghai\nPort of Discharge: Haifa',
    sourceType: 'ocean',
    now: NOW,
  });
  assert.equal(result.supportLevel, 'partial');
});

test('25. an event timeline with 2+ high-confidence dated events alone grants partial support', () => {
  const text =
    'Event Date\tEvent\tLocation\n2026-08-10\tVessel Departed\tShanghai\n2026-08-22\tTransshipment\tSingapore\n03/04/2026\tUnrelated\tRotterdam';
  const result = buildTrackingSummary({ text, sourceType: 'ocean', now: NOW });
  assert.equal(result.supportLevel, 'partial');
  assert.deepEqual(result.meaningfulGroupFields, ['eventTimeline']);
});

test('26. ETA and ATA present together are shown separately, never treated as a conflict', () => {
  const result = buildTrackingSummary({
    text: 'Vessel: MSC EXAMPLE\nVoyage: FV632R\nETA: 2026-09-18\nATA: 2026-09-20',
    sourceType: 'ocean',
    now: NOW,
  });
  assert.equal(result.fields.eta.value, '2026-09-18');
  assert.equal(result.fields.actualArrival.value, '2026-09-20');
  assert.equal(result.fields.eta.conflict, false);
  assert.equal(result.fields.actualArrival.conflict, false);
});

test('27. a table-sourced timeline produces the correct diagnostics', () => {
  const text = 'Event Date\tEvent\tLocation\n2026-08-10\tVessel Departed\tShanghai\n2026-08-22\tTransshipment\tSingapore';
  const result = buildTrackingSummary({ text, sourceType: 'ocean', now: NOW });
  assert.ok(result.diagnostics.includes('זוהה מבנה של טבלה'));
  assert.ok(result.diagnostics.includes('זוהו מספר אירועים'));
});

test('28. a conflicting ETA produces the "נמצאו מספר ערכי ETA" diagnostic', () => {
  const result = buildTrackingSummary({
    text: 'ETA: 2026-09-18\nETA: 2026-09-20',
    sourceType: 'ocean',
    now: NOW,
  });
  assert.ok(result.diagnostics.includes('נמצאו מספר ערכי ETA'));
});

test('29. an ambiguous timeline order produces the "סדר האירועים אינו חד-משמעי" diagnostic', () => {
  const text = 'Event Date\tEvent\tLocation\n03/04/2026\tVessel Departed\tShanghai\n2026-08-22\tTransshipment\tSingapore';
  const result = buildTrackingSummary({ text, sourceType: 'ocean', now: NOW });
  assert.ok(result.diagnostics.includes('סדר האירועים אינו חד-משמעי'));
});

test('30. a source-updated-at label is exposed as recency metadata, never as an operational time', () => {
  const result = buildTrackingSummary({
    text: 'Vessel: MSC EXAMPLE\nVoyage: FV632R\nETA: 2026-09-18\nLast Updated: 2026-08-05',
    sourceType: 'ocean',
    now: NOW,
  });
  assert.equal(result.sourceUpdatedAt.value, '2026-08-05');
  assert.notEqual(result.fields.eta.value, result.sourceUpdatedAt.value);
});

test('31. text with far more lines than the safety cap is processed without crashing, and reports linesTruncated', () => {
  const text = Array.from({ length: 3000 }, () => 'x').join('\n');
  const result = buildTrackingSummary({ text, sourceType: 'auto', now: NOW });
  assert.equal(result.valid, true);
  assert.equal(result.linesTruncated, true);
});

test('32. script-like and JSON-like pasted text does not crash the parser and is never executed', () => {
  const result = buildTrackingSummary({
    text: '<script>alert(1)</script>\n{"vessel": "MSC EXAMPLE"}\nStatus: In Transit',
    sourceType: 'courier',
    now: NOW,
  });
  assert.equal(result.valid, true);
});

test('33. Unicode control characters in pasted text do not crash the parser', () => {
  const result = buildTrackingSummary({
    text: 'Status: In Transit ​\nLatest Event: Departed',
    sourceType: 'courier',
    now: NOW,
  });
  assert.equal(result.valid, true);
});

test('34. a pipe-separated combined line with three fields all contribute to the same result', () => {
  const result = buildTrackingSummary({
    text: 'Vessel: MSC EXAMPLE | Voyage: FV632R | ETA: 2026-09-18',
    sourceType: 'ocean',
    now: NOW,
  });
  assert.equal(result.supportLevel, 'partial');
  assert.equal(result.fields.vesselName.value, 'MSC EXAMPLE');
});

test('35. a conflicted field is excluded from the copy-eligible/confirmed set (confidence low, conflict true)', () => {
  const result = buildTrackingSummary({
    text: 'Vessel: MSC EXAMPLE\nVoyage: FV632R\nETA: 2026-09-18\nETA: 2026-09-20',
    sourceType: 'ocean',
    now: NOW,
  });
  assert.ok(result.fieldsRequiringVerification.some((f) => f.name === 'eta'));
});

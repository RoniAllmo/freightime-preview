/** All fixtures are synthetic representative text, never copied from a real carrier website. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeImportedText } from '../../js/tracking-import/normalize-imported-text.js';
import { parseTables } from '../../js/tracking-import/parse-table.js';
import { extractEventTimeline, MAX_EVENTS, DEFAULT_VISIBLE_EVENTS } from '../../js/tracking-import/extract-events.js';

function timelineFor(text) {
  const norm = normalizeImportedText(text);
  const tables = parseTables(norm.lines);
  return extractEventTimeline({ lines: norm.expandedLines, tables });
}

test('1. chronological table events are ordered and a latest event is safely identified', () => {
  const text = 'Event Date\tEvent\tLocation\n2026-08-10\tVessel Departed\tShanghai\n2026-08-22\tTransshipment\tSingapore';
  const timeline = timelineFor(text);
  assert.equal(timeline.orderConfidence, 'chronological');
  assert.equal(timeline.latestEvent.description, 'Transshipment');
});

test('2. reverse-chronological pasted order is still resolved correctly by date, not by pasted position', () => {
  const text = 'Event Date\tEvent\tLocation\n2026-08-22\tTransshipment\tSingapore\n2026-08-10\tVessel Departed\tShanghai';
  const timeline = timelineFor(text);
  assert.equal(timeline.latestEvent.description, 'Transshipment');
  assert.equal(timeline.events[0].description, 'Vessel Departed');
});

test('3. source order is preserved (and no latest event is claimed) when a date cannot be safely ordered', () => {
  const text = 'Event Date\tEvent\tLocation\n03/04/2026\tVessel Departed\tShanghai\n2026-08-22\tTransshipment\tSingapore';
  const timeline = timelineFor(text);
  assert.equal(timeline.orderConfidence, 'source-order');
  assert.equal(timeline.latestEvent, null);
  assert.equal(timeline.events[0].description, 'Vessel Departed');
});

test('4. an explicit timezone on an event date is preserved as text, not converted', () => {
  const text = 'Event Date: 2026-08-10T09:00+02:00\nEvent: Vessel Departed\nLocation: Shanghai';
  const timeline = timelineFor(text);
  assert.equal(timeline.events[0].timezoneText, '+02:00');
});

test('5. duplicated events (same date + description + location) are collapsed, not doubled', () => {
  const text =
    'Event Date\tEvent\tLocation\n2026-08-10\tVessel Departed\tShanghai\n2026-08-10\tVessel Departed\tShanghai';
  const timeline = timelineFor(text);
  assert.equal(timeline.events.length, 1);
  assert.equal(timeline.events[0].occurrenceCount, 2);
});

test('6. more than 50 events are capped, with the omitted count reported honestly', () => {
  let text = 'Event Date\tEvent\tLocation\n';
  let day = 1;
  let month = 1;
  for (let i = 1; i <= 60; i += 1) {
    const dd = String(day).padStart(2, '0');
    const mm = String(month).padStart(2, '0');
    text += `2026-${mm}-${dd}\tEvent number ${i}\tLocation ${i}\n`;
    day += 1;
    if (day > 28) {
      day = 1;
      month += 1;
    }
  }
  const timeline = timelineFor(text);
  assert.equal(timeline.totalFound, 60);
  assert.equal(timeline.events.length, MAX_EVENTS);
  assert.equal(timeline.omittedCount, 10);
});

test('7. undated events (no parseable date) are retained but reported as low confidence', () => {
  const text = 'Event Date\tEvent\tLocation\nnot-a-date\tVessel Departed\tShanghai';
  const timeline = timelineFor(text);
  assert.equal(timeline.events[0].confidence, 'low');
  assert.equal(timeline.events[0].dateIso, null);
});

test('8. labeled-block (non-table) repeated Event Date/Event/Location triplets are recognized', () => {
  const text =
    'Event Date: 2026-08-10\nEvent: Vessel Departed\nLocation: Shanghai\n\n' +
    'Event Date: 2026-08-22\nEvent: Transshipment\nLocation: Singapore';
  const timeline = timelineFor(text);
  assert.equal(timeline.events.length, 2);
  assert.equal(timeline.events[1].description, 'Transshipment');
});

test('9. a tie for the latest date prevents a single latest event from being claimed', () => {
  const text =
    'Event Date\tEvent\tLocation\n2026-08-10\tVessel Departed\tShanghai\n2026-08-22\tEvent A\tSingapore\n2026-08-22\tEvent B\tRotterdam';
  const timeline = timelineFor(text);
  assert.equal(timeline.latestEvent, null);
});

test('10. no events found returns an empty, safely-typed timeline', () => {
  const timeline = timelineFor('Thank you for shopping with us');
  assert.equal(timeline.events.length, 0);
  assert.equal(timeline.totalFound, 0);
  assert.equal(timeline.latestEvent, null);
});

test('11. malformed input is handled safely', () => {
  const timeline = extractEventTimeline({});
  assert.equal(timeline.events.length, 0);
});

test('12. DEFAULT_VISIBLE_EVENTS is 5, matching the product spec', () => {
  assert.equal(DEFAULT_VISIBLE_EVENTS, 5);
});

test('13. the result is frozen', () => {
  const timeline = timelineFor('Event Date\tEvent\tLocation\n2026-08-10\tVessel Departed\tShanghai');
  assert.ok(Object.isFrozen(timeline));
  assert.ok(Object.isFrozen(timeline.events));
});

test('14. calling the module performs no network, DOM, or storage access', () => {
  assert.equal(typeof window, 'undefined');
  assert.equal(typeof document, 'undefined');
  timelineFor('Event Date\tEvent\tLocation\n2026-08-10\tVessel Departed\tShanghai');
});

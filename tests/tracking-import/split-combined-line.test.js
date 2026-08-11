/** All fixtures are synthetic representative text, never copied from a real carrier website. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { splitCombinedLine } from '../../js/tracking-import/split-combined-line.js';

test('1. Vessel / Voyage combined header is split into two clean sub-lines', () => {
  const result = splitCombinedLine('Vessel / Voyage: MSC EXAMPLE / FV632R');
  assert.deepEqual(result, ['Vessel Name: MSC EXAMPLE', 'Voyage Number: FV632R']);
});

test('2. Hebrew paired header (שם אונייה / מספר הפלגה) is split correctly', () => {
  const result = splitCombinedLine('שם אונייה / מספר הפלגה: MSC EXAMPLE / FV632R');
  assert.deepEqual(result, ['Vessel Name: MSC EXAMPLE', 'Voyage Number: FV632R']);
});

test('3. POL / POD combined header is split', () => {
  const result = splitCombinedLine('POL / POD: Shanghai / Haifa');
  assert.deepEqual(result, ['Port of Loading: Shanghai', 'Port of Discharge: Haifa']);
});

test('4. ETD / ETA combined header is split', () => {
  const result = splitCombinedLine('ETD / ETA: 2026-08-01 / 2026-08-20');
  assert.deepEqual(result, ['ETD: 2026-08-01', 'ETA: 2026-08-20']);
});

test('5. pipe-separated fields are split into independent segments', () => {
  const result = splitCombinedLine('Vessel: MSC EXAMPLE | Voyage: FV632R | ETA: 2026-09-18');
  assert.deepEqual(result, ['Vessel: MSC EXAMPLE', 'Voyage: FV632R', 'ETA: 2026-09-18']);
});

test('6. semicolon-separated fields are split into independent segments', () => {
  const result = splitCombinedLine('Port of Loading: Shanghai; Port of Discharge: Haifa');
  assert.deepEqual(result, ['Port of Loading: Shanghai', 'Port of Discharge: Haifa']);
});

test('7. multiple fields on one pipe-separated line (3+) all split correctly', () => {
  const result = splitCombinedLine('Status: In Transit | Latest Event: Departed | Location: Shanghai');
  assert.equal(result.length, 3);
});

test('8. a slash inside an ordinary value (not a recognized label pair) is not split', () => {
  const result = splitCombinedLine('Notes: container is 20/40ft mixed load');
  assert.equal(result, null);
});

test('9. a multi-column colon-free label/value run is split (Port of Loading / ETD example)', () => {
  const result = splitCombinedLine('Port of Loading    Shanghai    ETD    2026-08-10');
  assert.deepEqual(result, ['Port of Loading: Shanghai', 'ETD: 2026-08-10']);
});

test('10. a timezone offset containing punctuation is never split apart', () => {
  const result = splitCombinedLine('ETD: 2026-08-01T14:30+02:00');
  // No recognized pair/segment/multi-column pattern applies -- stays a single unsplit line.
  assert.equal(result, null);
});

test('11. an ambiguous paired value (more than one slash) is not split confidently', () => {
  const result = splitCombinedLine('Vessel / Voyage: MSC / EXAMPLE / FV632R');
  assert.equal(result, null);
});

test('12. a plain ordinary line is left untouched (returns null)', () => {
  assert.equal(splitCombinedLine('Vessel: MSC EXAMPLE'), null);
  assert.equal(splitCombinedLine('Thank you for shopping with us'), null);
});

test('13. an unrecognized multi-column line (labels not in vocabulary) is left untouched', () => {
  const result = splitCombinedLine('Random Column    Another Value    Third Column    Fourth');
  assert.equal(result, null);
});

test('14. empty or non-string input is handled safely', () => {
  assert.equal(splitCombinedLine(''), null);
  assert.equal(splitCombinedLine(null), null);
  assert.equal(splitCombinedLine(undefined), null);
});

test('15. Status / Latest Event combined header is split', () => {
  const result = splitCombinedLine('Status / Latest Event: In Transit / Departed Shanghai');
  assert.deepEqual(result, ['Status: In Transit', 'Latest Event: Departed Shanghai']);
});

test('16. calling the module performs no network, DOM, or storage access', () => {
  assert.equal(typeof window, 'undefined');
  assert.equal(typeof document, 'undefined');
  splitCombinedLine('Vessel / Voyage: MSC EXAMPLE / FV632R');
});

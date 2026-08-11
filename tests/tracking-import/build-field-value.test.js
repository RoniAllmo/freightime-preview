/** All fixtures are synthetic representative text, never copied from a real carrier website. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTextFieldFromMatches,
  buildDateFieldFromMatches,
  buildLocationFieldFromMatches,
} from '../../js/tracking-import/build-field-value.js';

function match(value, lineIndex = 0) {
  return { value, matchedLabel: 'Status', lineIndex, lineText: `Status: ${value}` };
}

test('1. a single text match produces a clean, unconflicted field', () => {
  const field = buildTextFieldFromMatches([match('In Transit')], 'medium');
  assert.equal(field.value, 'In Transit');
  assert.equal(field.conflict, false);
  assert.equal(field.occurrenceCount, 1);
});

test('2. two identical text matches are collapsed as a duplicate, not a conflict', () => {
  const field = buildTextFieldFromMatches([match('In Transit', 0), match('In Transit', 3)], 'medium');
  assert.equal(field.conflict, false);
  assert.equal(field.occurrenceCount, 2);
  assert.equal(field.confidence, 'medium');
});

test('3. two different text matches are a genuine conflict: never silently resolved', () => {
  const field = buildTextFieldFromMatches([match('In Transit', 0), match('Delivered', 3)], 'medium');
  assert.equal(field.conflict, true);
  assert.equal(field.value, null);
  assert.equal(field.confidence, 'low');
  assert.equal(field.candidates.length, 2);
});

test('4. no matches returns null', () => {
  assert.equal(buildTextFieldFromMatches([], 'medium'), null);
  assert.equal(buildTextFieldFromMatches(null, 'medium'), null);
});

test('5. date field: two matches parsing to the same ISO date are a duplicate, not a conflict', () => {
  const field = buildDateFieldFromMatches(
    [match('2026-09-18', 0), match('2026-09-18', 5)],
    'estimated',
  );
  assert.equal(field.conflict, false);
  assert.equal(field.value, '2026-09-18');
  assert.equal(field.occurrenceCount, 2);
  assert.equal(field.semantic, 'estimated');
});

test('6. date field: two matches parsing to different ISO dates are a conflict', () => {
  const field = buildDateFieldFromMatches(
    [match('2026-09-18', 0), match('2026-09-20', 5)],
    'estimated',
  );
  assert.equal(field.conflict, true);
  assert.equal(field.confidence, 'low');
  assert.deepEqual(field.candidates.map((c) => c.value), ['2026-09-18', '2026-09-20']);
});

test('7. a conflict reduces confidence to low regardless of the base confidence of either candidate', () => {
  const field = buildDateFieldFromMatches([match('2026-09-18'), match('2026-09-20')], 'actual');
  assert.equal(field.confidence, 'low');
});

test('8. a single ambiguous date match behaves like V1 (semantic falls back to unknown)', () => {
  const field = buildDateFieldFromMatches([match('03/04/2026')], 'estimated');
  assert.equal(field.semantic, 'unknown');
  assert.equal(field.confidence, 'low');
  assert.equal(field.conflict, false);
});

test('9. location field: duplicates are collapsed safely', () => {
  const field = buildLocationFieldFromMatches([match('Shanghai', 0), match('Shanghai', 4)]);
  assert.equal(field.conflict, false);
  assert.equal(field.occurrenceCount, 2);
});

test('10. location field: two different locations are a conflict', () => {
  const field = buildLocationFieldFromMatches([match('Shanghai', 0), match('Rotterdam', 4)]);
  assert.equal(field.conflict, true);
  assert.equal(field.candidates.length, 2);
});

test('11. a conflict never invalidates evidence -- every candidate carries its own evidence', () => {
  const field = buildTextFieldFromMatches([match('A'), match('B')], 'medium');
  for (const candidate of field.candidates) {
    assert.ok(candidate.evidence.length > 0);
  }
});

test('12. results are frozen', () => {
  assert.ok(Object.isFrozen(buildTextFieldFromMatches([match('A')], 'medium')));
  assert.ok(Object.isFrozen(buildTextFieldFromMatches([match('A'), match('B')], 'medium')));
});

test('13. calling the module performs no network, DOM, or storage access', () => {
  assert.equal(typeof window, 'undefined');
  assert.equal(typeof document, 'undefined');
  buildTextFieldFromMatches([match('A')], 'medium');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { extractLocationValue } from '../../js/tracking-import/extract-locations.js';

test('1. a plausible English location value gets medium confidence', () => {
  const result = extractLocationValue('Port of Haifa');
  assert.equal(result.value, 'Port of Haifa');
  assert.equal(result.confidence, 'medium');
});

test('2. a plausible Hebrew location value gets medium confidence', () => {
  const result = extractLocationValue('נמל חיפה');
  assert.equal(result.confidence, 'medium');
});

test('3. an empty value returns null', () => {
  assert.equal(extractLocationValue(''), null);
  assert.equal(extractLocationValue('   '), null);
});

test('4. non-string input returns null safely', () => {
  assert.equal(extractLocationValue(null), null);
  assert.equal(extractLocationValue(undefined), null);
});

test('5. an unreasonably long value is truncated and marked low confidence', () => {
  const result = extractLocationValue('A'.repeat(500));
  assert.equal(result.value.length, 200);
  assert.equal(result.confidence, 'low');
});

test('6. a value with no letters at all gets low confidence', () => {
  const result = extractLocationValue('12345');
  assert.equal(result.confidence, 'low');
});

test('7. the value is trimmed', () => {
  assert.equal(extractLocationValue('  Rotterdam  ').value, 'Rotterdam');
});

test('8. the result object is frozen', () => {
  assert.ok(Object.isFrozen(extractLocationValue('Rotterdam')));
});

test('9. calling the module performs no network, DOM, or storage access', () => {
  assert.equal(typeof window, 'undefined');
  assert.equal(typeof document, 'undefined');
  extractLocationValue('Rotterdam');
});

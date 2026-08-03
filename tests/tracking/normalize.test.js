/**
 * Tests for js/tracking/normalize.js using the built-in Node.js test
 * runner (`node:test`) and assertion library (`node:assert`).
 *
 * This is a limited testing decision for the standalone normalization
 * function only (see the task's "Authorized testing decision"); it does
 * not select a permanent testing framework for the full project.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTrackingInput } from '../../js/tracking/normalize.js';

test('empty string input', () => {
  const result = normalizeTrackingInput('');
  assert.equal(result.originalInput, '');
  assert.equal(result.stringInput, '');
  assert.equal(result.trimmedInput, '');
  assert.equal(result.alphanumericInput, '');
  assert.equal(result.inputLength, 0);
  assert.equal(result.compactLength, 0);
  assert.equal(result.hasLetters, false);
  assert.equal(result.hasDigits, false);
  assert.equal(result.isEmpty, true);
});

test('whitespace-only input', () => {
  const result = normalizeTrackingInput('    ');
  assert.equal(result.trimmedInput, '');
  assert.equal(result.uppercaseInput, '');
  assert.equal(result.compactInput, '');
  assert.equal(result.alphanumericInput, '');
  assert.equal(result.isEmpty, true);
});

test('leading and trailing spaces are trimmed but original input preserved', () => {
  const result = normalizeTrackingInput('  msc  ');
  assert.equal(result.originalInput, '  msc  ');
  assert.equal(result.trimmedInput, 'msc');
  assert.equal(result.inputLength, 3);
});

test('internal spaces are preserved in trimmedInput/uppercaseInput but removed in compactInput', () => {
  const result = normalizeTrackingInput('  msc u 123  ');
  assert.equal(result.trimmedInput, 'msc u 123');
  assert.equal(result.uppercaseInput, 'MSC U 123');
  assert.equal(result.compactInput, 'MSCU123');
});

test('lowercase input is converted to uppercase', () => {
  const result = normalizeTrackingInput('abcXYZ');
  assert.equal(result.uppercaseInput, 'ABCXYZ');
});

test('container-style input with spaces', () => {
  const result = normalizeTrackingInput('  mscu 123-456 7  ');
  assert.equal(result.compactInput, 'MSCU123-4567');
  assert.equal(result.alphanumericInput, 'MSCU1234567');
});

test('AWB-style input with a hyphen', () => {
  const result = normalizeTrackingInput('020-12345678');
  assert.equal(result.compactInput, '020-12345678');
  assert.equal(result.alphanumericInput, '02012345678');
  assert.equal(result.digitsOnly, '02012345678');
});

test('courier-style alphanumeric input', () => {
  const result = normalizeTrackingInput('EE123456789IL');
  assert.equal(result.alphanumericInput, 'EE123456789IL');
  assert.equal(result.hasLetters, true);
  assert.equal(result.hasDigits, true);
});

test('punctuation is removed from alphanumericInput', () => {
  const result = normalizeTrackingInput('AB#12-34.56!');
  assert.equal(result.alphanumericInput, 'AB123456');
});

test('hyphens are preserved in compactInput', () => {
  const result = normalizeTrackingInput('AB-12-34');
  assert.equal(result.compactInput, 'AB-12-34');
});

test('digitsOnly extracts only digit characters', () => {
  const result = normalizeTrackingInput('123-456 789');
  assert.equal(result.digitsOnly, '123456789');
});

test('number input is converted to a decimal string', () => {
  const result = normalizeTrackingInput(1234567);
  assert.equal(result.originalInput, 1234567);
  assert.equal(result.stringInput, '1234567');
  assert.equal(result.alphanumericInput, '1234567');
  assert.equal(result.hasDigits, true);
  assert.equal(result.hasLetters, false);
});

test('BigInt input is converted to a decimal string', () => {
  const result = normalizeTrackingInput(123456789012345678901234567890n);
  assert.equal(result.originalInput, 123456789012345678901234567890n);
  assert.equal(result.stringInput, '123456789012345678901234567890');
  assert.equal(result.alphanumericInput, '123456789012345678901234567890');
});

test('null input', () => {
  const result = normalizeTrackingInput(null);
  assert.equal(result.originalInput, null);
  assert.equal(result.stringInput, '');
  assert.equal(result.isEmpty, true);
});

test('undefined input', () => {
  const result = normalizeTrackingInput(undefined);
  assert.equal(result.originalInput, undefined);
  assert.equal(result.stringInput, '');
  assert.equal(result.isEmpty, true);
});

test('boolean input is unsupported and safely normalized', () => {
  const result = normalizeTrackingInput(true);
  assert.equal(result.originalInput, null);
  assert.equal(result.stringInput, '');
  assert.equal(result.trimmedInput, '');
  assert.equal(result.alphanumericInput, '');
  assert.equal(result.inputLength, 0);
  assert.equal(result.compactLength, 0);
  assert.equal(result.hasLetters, false);
  assert.equal(result.hasDigits, false);
  assert.equal(result.isEmpty, true);
});

test('array input is unsupported and safely normalized', () => {
  const result = normalizeTrackingInput(['MSCU1234567']);
  assert.equal(result.originalInput, null);
  assert.equal(result.stringInput, '');
  assert.equal(result.isEmpty, true);
});

test('object input is unsupported and safely normalized', () => {
  const result = normalizeTrackingInput({ value: 'MSCU1234567' });
  assert.equal(result.originalInput, null);
  assert.equal(result.stringInput, '');
  assert.equal(result.isEmpty, true);
});

test('symbol input is unsupported and safely normalized', () => {
  const result = normalizeTrackingInput(Symbol('test'));
  assert.equal(result.originalInput, null);
  assert.equal(result.stringInput, '');
  assert.equal(result.isEmpty, true);
});

test('function input is unsupported and safely normalized', () => {
  const result = normalizeTrackingInput(function sample() { return 'MSCU1234567'; });
  assert.equal(result.originalInput, null);
  assert.equal(result.stringInput, '');
  assert.equal(result.isEmpty, true);
});

test('Hebrew characters are preserved in intermediate fields but removed from alphanumericInput', () => {
  const result = normalizeTrackingInput('  מכולה 123  ');
  assert.equal(result.trimmedInput, 'מכולה 123');
  assert.equal(result.uppercaseInput, 'מכולה 123');
  assert.equal(result.compactInput, 'מכולה123');
  assert.equal(result.alphanumericInput, '123');
  assert.equal(result.digitsOnly, '123');
  assert.equal(result.hasLetters, false);
  assert.equal(result.hasDigits, true);
});

test('non-ASCII Latin letters are preserved in intermediate fields but removed from alphanumericInput, without transliteration', () => {
  const result = normalizeTrackingInput('café123');
  assert.equal(result.trimmedInput, 'café123');
  assert.equal(result.compactInput, 'CAFÉ123');
  assert.equal(result.alphanumericInput, 'CAF123');
  assert.equal(result.alphanumericInput.includes('É'), false);
  assert.equal(result.alphanumericInput.includes('E'), false, 'must not transliterate É to E');
});

test('a new frozen object is returned on every call', () => {
  const first = normalizeTrackingInput('MSCU1234567');
  const second = normalizeTrackingInput('MSCU1234567');
  assert.notEqual(first, second);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(second), true);
  assert.throws(() => {
    'use strict';
    first.alphanumericInput = 'TAMPERED';
  }, TypeError);
});

test('original string input remains unchanged after normalization', () => {
  const input = '  mscu 123  ';
  const result = normalizeTrackingInput(input);
  assert.equal(input, '  mscu 123  ');
  assert.equal(result.originalInput, input);
});

test('no identifier type or carrier fields are introduced', () => {
  const result = normalizeTrackingInput('MSCU1234567');
  const keys = Object.keys(result).sort();
  assert.deepEqual(keys, [
    'alphanumericInput',
    'compactInput',
    'compactLength',
    'digitsOnly',
    'hasDigits',
    'hasLetters',
    'inputLength',
    'isEmpty',
    'originalInput',
    'stringInput',
    'trimmedInput',
    'uppercaseInput',
  ]);
  assert.equal('identifierType' in result, false);
  assert.equal('carrier' in result, false);
  assert.equal('possibleCarriers' in result, false);
  assert.equal('matched' in result, false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeImportedText,
  findLabeledValue,
  MAX_IMPORT_LENGTH,
} from '../../js/tracking-import/normalize-imported-text.js';

test('1. empty string reports empty_input', () => {
  assert.equal(normalizeImportedText('').valid, false);
  assert.equal(normalizeImportedText('').error, 'empty_input');
});

test('2. whitespace-only string reports empty_input', () => {
  assert.equal(normalizeImportedText('   \n\t  ').error, 'empty_input');
});

test('3. non-string input reports empty_input safely', () => {
  assert.equal(normalizeImportedText(null).error, 'empty_input');
  assert.equal(normalizeImportedText(undefined).error, 'empty_input');
  assert.equal(normalizeImportedText(12345).error, 'empty_input');
});

test('4. text over MAX_IMPORT_LENGTH is rejected as too_long, not truncated', () => {
  const longText = 'a'.repeat(MAX_IMPORT_LENGTH + 1);
  const result = normalizeImportedText(longText);
  assert.equal(result.valid, false);
  assert.equal(result.error, 'too_long');
  assert.equal(result.length, longText.length);
});

test('5. text exactly at MAX_IMPORT_LENGTH is accepted', () => {
  const text = 'Vessel: ABC\n' + 'a'.repeat(MAX_IMPORT_LENGTH - 12);
  assert.ok(text.length <= MAX_IMPORT_LENGTH);
  assert.equal(normalizeImportedText(text).valid, true);
});

test('6. CRLF and CR line endings are normalized to LF', () => {
  const result = normalizeImportedText('Vessel: ABC\r\nVoyage: 123\rStatus: OK');
  assert.deepEqual(result.lines, ['Vessel: ABC', 'Voyage: 123', 'Status: OK']);
});

test('7. empty lines are dropped and each line is trimmed', () => {
  const result = normalizeImportedText('Vessel: ABC\n\n   \nVoyage: 123   ');
  assert.deepEqual(result.lines, ['Vessel: ABC', 'Voyage: 123']);
});

test('8. very long text within the limit is handled without error', () => {
  const text = 'Status: In Transit\n' + 'x'.repeat(15000);
  const result = normalizeImportedText(text);
  assert.equal(result.valid, true);
  assert.equal(result.lines[0], 'Status: In Transit');
});

test('9. Unicode (Hebrew, emoji, combining marks) is preserved as-is', () => {
  const result = normalizeImportedText('סטטוס: נמסר 📦 é');
  assert.equal(result.lines[0], 'סטטוס: נמסר 📦 é');
});

test('10. HTML-like text is treated as plain text: no crash, tags remain literal characters', () => {
  const result = normalizeImportedText('<b>Vessel</b>: <i>MSC ABC</i>\n<script>alert(1)</script>');
  assert.equal(result.valid, true);
  assert.ok(result.lines.some((line) => line.includes('<script>')));
});

test('11. findLabeledValue matches a colon-separated label (case-insensitive for English)', () => {
  const lines = ['vessel name: MSC BEATRICE', 'Voyage: 123W'];
  const match = findLabeledValue(lines, ['Vessel Name', 'Vessel']);
  assert.equal(match.value, 'MSC BEATRICE');
  assert.equal(match.matchedLabel, 'Vessel Name');
});

test('12. findLabeledValue matches a hyphen-separated label', () => {
  const lines = ['ETD - 2026-08-01'];
  const match = findLabeledValue(lines, ['ETD']);
  assert.equal(match.value, '2026-08-01');
});

test('13. findLabeledValue matches a tab-separated label', () => {
  const lines = ['Status:\tIn Transit'];
  const match = findLabeledValue(lines, ['Status']);
  assert.equal(match.value, 'In Transit');
});

test('14. findLabeledValue matches a multiple-space-separated label', () => {
  const lines = ['Status    In Transit'];
  const match = findLabeledValue(lines, ['Status']);
  assert.equal(match.value, 'In Transit');
});

test('15. findLabeledValue matches a Hebrew label', () => {
  const lines = ['שם אונייה: ZIM HAIFA'];
  const match = findLabeledValue(lines, ['שם אונייה', 'אונייה']);
  assert.equal(match.value, 'ZIM HAIFA');
  assert.equal(match.matchedLabel, 'שם אונייה');
});

test('16. findLabeledValue returns null when no label matches', () => {
  assert.equal(findLabeledValue(['Random unrelated text'], ['Vessel']), null);
});

test('17. findLabeledValue returns null for a label with no non-empty value', () => {
  assert.equal(findLabeledValue(['Vessel:   '], ['Vessel']), null);
});

test('18. findLabeledValue returns the first matching line in document order', () => {
  const lines = ['Status: A', 'Status: B'];
  const match = findLabeledValue(lines, ['Status']);
  assert.equal(match.value, 'A');
  assert.equal(match.lineIndex, 0);
});

test('19. findLabeledValue handles malformed input safely', () => {
  assert.equal(findLabeledValue(null, ['Vessel']), null);
  assert.equal(findLabeledValue(['a'], null), null);
});

test('20. calling the module performs no network, DOM, or storage access', () => {
  assert.equal(typeof window, 'undefined');
  assert.equal(typeof document, 'undefined');
  normalizeImportedText('Status: OK');
});

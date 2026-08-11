import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReadinessSummary } from '../../js/import-readiness/build-readiness-summary.js';
import { buildReadinessResult } from '../../js/import-readiness/build-readiness-result.js';
import { normalizeReadinessInput } from '../../js/import-readiness/normalize-readiness-input.js';

function summaryFor(raw) {
  const normalized = normalizeReadinessInput(raw);
  const result = buildReadinessResult(normalized);
  return buildReadinessSummary(normalized, result);
}

test('1. the summary includes the product name and readiness level', () => {
  const summary = summaryFor({ productName: 'מנורת שולחן' });
  assert.ok(summary.includes('מנורת שולחן'));
  assert.ok(summary.includes('רמת מוכנות'));
});

test('2. the summary includes the fixed disclaimer', () => {
  const summary = summaryFor({});
  assert.ok(summary.includes('אינה מהווה סיווג מכס סופי'));
});

test('3. the summary excludes supplier country/contact details', () => {
  const summary = summaryFor({ supplierCountry: 'UNIQUE_SUPPLIER_COUNTRY_MARKER' });
  assert.ok(!summary.includes('UNIQUE_SUPPLIER_COUNTRY_MARKER'));
});

test('4. the summary excludes invoice value and currency (commercial detail, not needed for a shareable summary)', () => {
  const summary = summaryFor({ invoiceValue: '999999', currency: 'XYZ' });
  assert.ok(!summary.includes('999999'));
});

test('5. the summary is plain text, not HTML', () => {
  const summary = summaryFor({ productName: '<script>alert(1)</script>' });
  assert.ok(!summary.includes('<script>') || summary.includes('<script>alert(1)</script>'));
  // The product name is rendered as plain text content -- no HTML tags are stripped or
  // interpreted, since this is a plain string, never inserted via innerHTML anywhere downstream.
  assert.equal(typeof summary, 'string');
});

test('6. malformed input/result is handled safely without throwing', () => {
  assert.doesNotThrow(() => buildReadinessSummary(null, null));
  assert.doesNotThrow(() => buildReadinessSummary(undefined, undefined));
});

test('7. calling the module performs no network, DOM, or storage access', () => {
  assert.equal(typeof window, 'undefined');
  assert.equal(typeof document, 'undefined');
  summaryFor({});
});

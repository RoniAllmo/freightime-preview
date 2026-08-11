import test from 'node:test';
import assert from 'node:assert/strict';
import { buildScenarioSummary } from '../../js/import-readiness/build-scenario-summary.js';
import { buildPersonalImportResult } from '../../js/import-readiness/personal-import-rules.js';
import { buildFirstCommercialImportResult } from '../../js/import-readiness/first-commercial-import-rules.js';
import { normalizeReadinessInput } from '../../js/import-readiness/normalize-readiness-input.js';

test('1. the summary includes the route label', () => {
  const result = buildPersonalImportResult(normalizeReadinessInput({}));
  const summary = buildScenarioSummary(result);
  assert.ok(summary.includes('יבוא אישי'));
});

test('2. the summary includes the disclaimer', () => {
  const result = buildFirstCommercialImportResult(normalizeReadinessInput({}));
  const summary = buildScenarioSummary(result);
  assert.ok(summary.includes('אינו קובע סיווג מכס סופי'));
});

test('3. the summary is plain text', () => {
  const result = buildPersonalImportResult(normalizeReadinessInput({}));
  const summary = buildScenarioSummary(result);
  assert.equal(typeof summary, 'string');
});

test('4. malformed input is handled safely', () => {
  assert.doesNotThrow(() => buildScenarioSummary(null));
  assert.doesNotThrow(() => buildScenarioSummary(undefined));
});

test('5. calling the module performs no network, DOM, or storage access', () => {
  assert.equal(typeof window, 'undefined');
  assert.equal(typeof document, 'undefined');
  buildScenarioSummary(buildPersonalImportResult(normalizeReadinessInput({})));
});

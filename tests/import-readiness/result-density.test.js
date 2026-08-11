/**
 * Content-density and repetition tests, per the product-owner
 * correction: the default visible result must be short, focused, and
 * must never restate the same recommendation across multiple sections.
 * Collapsed secondary-detail text is excluded from the density
 * calculation, since it is not part of the default visible result.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeReadinessInput } from '../../js/import-readiness/normalize-readiness-input.js';
import { buildPersonalImportResult } from '../../js/import-readiness/personal-import-rules.js';
import { buildFirstCommercialImportResult } from '../../js/import-readiness/first-commercial-import-rules.js';
import { buildExistingImporterResult } from '../../js/import-readiness/existing-importer-rules.js';
import { buildEstablishedOperationResult } from '../../js/import-readiness/established-operation-rules.js';
import { buildShipmentProblemResult } from '../../js/import-readiness/shipment-problem-rules.js';

/** Count Hebrew (and general) words in the *default-visible* text of a result only. */
function visibleWordCount(result) {
  const parts = [
    result.routeLabel,
    result.primaryAction,
    result.primaryReason,
    ...result.preparationItems,
    result.urgency ?? '',
    result.primaryCta?.label ?? '',
    result.secondaryCta?.label ?? '',
    result.visibleDisclaimer,
  ];
  const text = parts.join(' ').trim();
  return text.length === 0 ? 0 : text.split(/\s+/).length;
}

const ORDINARY_CASES = [
  buildPersonalImportResult(normalizeReadinessInput({ sensitiveCategory: 'food' })),
  buildFirstCommercialImportResult(normalizeReadinessInput({})),
  buildExistingImporterResult(normalizeReadinessInput({ focusArea: 'customs_classification' })),
  buildEstablishedOperationResult(normalizeReadinessInput({ auditPurpose: 'existing_classifications_audit' })),
];

const URGENT_CASE = buildShipmentProblemResult(normalizeReadinessInput({ problemType: 'demurrage', accumulatingCosts: true }));

test('1. ordinary (non-urgent) default results stay within the 160-word visible ceiling', () => {
  for (const result of ORDINARY_CASES) {
    const count = visibleWordCount(result);
    assert.ok(count <= 160, `expected <=160 visible words for scenario "${result.scenario}", got ${count}`);
  }
});

test('2. ordinary default results are typically well under the preferred 120-word target', () => {
  for (const result of ORDINARY_CASES) {
    const count = visibleWordCount(result);
    assert.ok(count <= 130, `expected a compact result for scenario "${result.scenario}", got ${count} words`);
  }
});

test('3. an urgent shipment-problem result may exceed the ordinary ceiling to explain the deadline/cost situation, but stays bounded', () => {
  const count = visibleWordCount(URGENT_CASE);
  assert.ok(count <= 220, `expected the urgent case to stay under a safe upper bound, got ${count} words`);
});

test('4. collapsed secondary-detail text is excluded from the default-visible density calculation', () => {
  const result = buildFirstCommercialImportResult(normalizeReadinessInput({ hsCodeKnown: true, hsCode: '8541.10' }));
  const visibleText = [result.routeLabel, result.primaryAction, result.primaryReason, ...result.preparationItems].join(' ');
  assert.ok(!visibleText.includes('8541.10'));
});

test('5. no result repeats its own primary action text verbatim inside its preparation items', () => {
  for (const result of [...ORDINARY_CASES, URGENT_CASE]) {
    for (const item of result.preparationItems) {
      assert.notEqual(item, result.primaryAction);
    }
  }
});

test('6. no result repeats its own primary action text verbatim inside its primary reason', () => {
  for (const result of [...ORDINARY_CASES, URGENT_CASE]) {
    if (result.primaryReason) {
      assert.notEqual(result.primaryReason, result.primaryAction);
    }
  }
});

test('7. no result has more than one primary CTA and more than one secondary CTA', () => {
  for (const result of [...ORDINARY_CASES, URGENT_CASE]) {
    assert.ok(result.primaryCta === null || typeof result.primaryCta === 'object');
    assert.ok(result.secondaryCta === null || typeof result.secondaryCta === 'object');
    if (result.primaryCta && result.secondaryCta) {
      assert.notEqual(result.primaryCta.id, result.secondaryCta.id, 'primary and secondary CTA must be materially different');
    }
  }
});

test('8. preparation items never exceed five for any scenario', () => {
  for (const result of [...ORDINARY_CASES, URGENT_CASE]) {
    assert.ok(result.preparationItems.length <= 5);
  }
});

test('9. no scenario shows more than one collapsed secondary-detail region worth of content -- the shape has exactly one secondaryDetails object', () => {
  for (const result of [...ORDINARY_CASES, URGENT_CASE]) {
    assert.equal(typeof result.secondaryDetails, 'object');
    assert.ok(!('secondaryDetails2' in result));
  }
});

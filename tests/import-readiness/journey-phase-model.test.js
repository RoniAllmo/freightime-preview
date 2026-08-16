/**
 * Tests for the adaptive four-phase journey model
 * (js/import-readiness/journey-phase-model.js) that replaces the
 * previous fixed "שלב X מתוך Y" question-count promise. The phase
 * count is stable at 4 regardless of how many questions any given path
 * actually asks.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  JOURNEY_PHASE,
  JOURNEY_PHASE_ORDER,
  JOURNEY_PHASE_COUNT,
  phaseForStepId,
  phaseLabel,
  phaseIndex,
  describeProgress,
} from '../../js/import-readiness/journey-phase-model.js';

test('1. exactly four stable phases exist, in order A -> B -> C -> D', () => {
  assert.equal(JOURNEY_PHASE_COUNT, 4);
  assert.deepEqual(JOURNEY_PHASE_ORDER, [
    JOURNEY_PHASE.IMPORT_MODE,
    JOURNEY_PHASE.PRODUCT_OR_ISSUE,
    JOURNEY_PHASE.FOCUSED_CHECKS,
    JOURNEY_PHASE.RESULT,
  ]);
});

test('2. every phase has a non-empty Hebrew label matching the approved copy', () => {
  assert.equal(phaseLabel(JOURNEY_PHASE.IMPORT_MODE), 'מצב היבוא');
  assert.equal(phaseLabel(JOURNEY_PHASE.PRODUCT_OR_ISSUE), 'פרטי המוצר או הבעיה');
  assert.equal(phaseLabel(JOURNEY_PHASE.FOCUSED_CHECKS), 'בדיקות ממוקדות');
  assert.equal(phaseLabel(JOURNEY_PHASE.RESULT), 'התוצאה שלך');
});

test('3. core routing steps map to Phase A, product-identity/follow-up steps map to Phase B', () => {
  assert.equal(phaseForStepId('q1'), JOURNEY_PHASE.IMPORT_MODE);
  assert.equal(phaseForStepId('q1clarify'), JOURNEY_PHASE.IMPORT_MODE);
  assert.equal(phaseForStepId('q2'), JOURNEY_PHASE.IMPORT_MODE);
  assert.equal(phaseForStepId('problemType'), JOURNEY_PHASE.IMPORT_MODE);

  assert.equal(phaseForStepId('q3'), JOURNEY_PHASE.PRODUCT_OR_ISSUE);
  assert.equal(phaseForStepId('personalFollowup'), JOURNEY_PHASE.PRODUCT_OR_ISSUE);
  assert.equal(phaseForStepId('existingImporterFollowup'), JOURNEY_PHASE.PRODUCT_OR_ISSUE);
  assert.equal(phaseForStepId('establishedOperationFollowup'), JOURNEY_PHASE.PRODUCT_OR_ISSUE);
  assert.equal(phaseForStepId('problemDetails'), JOURNEY_PHASE.PRODUCT_OR_ISSUE);
});

test('4. the reserved conditional regulatory-followup step maps to Phase C, and result maps to Phase D', () => {
  assert.equal(phaseForStepId('regulatoryFollowup'), JOURNEY_PHASE.FOCUSED_CHECKS);
  assert.equal(phaseForStepId('result'), JOURNEY_PHASE.RESULT);
});

test('5. an unknown step id safely falls back to Phase A rather than throwing or reporting an invalid phase', () => {
  assert.equal(phaseForStepId('someFutureStep'), JOURNEY_PHASE.IMPORT_MODE);
  assert.equal(phaseForStepId(undefined), JOURNEY_PHASE.IMPORT_MODE);
});

test('6. phaseIndex is 1-based and stable across the fixed phase count', () => {
  assert.equal(phaseIndex(JOURNEY_PHASE.IMPORT_MODE), 1);
  assert.equal(phaseIndex(JOURNEY_PHASE.PRODUCT_OR_ISSUE), 2);
  assert.equal(phaseIndex(JOURNEY_PHASE.FOCUSED_CHECKS), 3);
  assert.equal(phaseIndex(JOURNEY_PHASE.RESULT), 4);
});

test('7. describeProgress never includes a "total questions" field, only a stable phase count', () => {
  const progress = describeProgress('q1');
  const keys = Object.keys(progress);
  assert.deepEqual(keys.sort(), ['count', 'index', 'label', 'percent', 'phase']);
  assert.equal(progress.count, 4);
});

test('8. describeProgress percent is proportional to phase index out of the fixed 4-phase total', () => {
  assert.equal(describeProgress('q1').percent, 25);
  assert.equal(describeProgress('q3').percent, 50);
  assert.equal(describeProgress('regulatoryFollowup').percent, 75);
  assert.equal(describeProgress('result').percent, 100);
});

test('9. a skipped Phase C (no regulatory follow-up shown) does not break progress: going straight from Phase B to Phase D (result) is a valid, honest jump', () => {
  const beforeResult = describeProgress('q3');
  const atResult = describeProgress('result');
  assert.equal(beforeResult.phase, JOURNEY_PHASE.PRODUCT_OR_ISSUE);
  assert.equal(atResult.phase, JOURNEY_PHASE.RESULT);
  assert.ok(atResult.index > beforeResult.index);
});

test('10. going back from a Phase B step to a Phase A step honestly reports Phase A again (never a false forward-stuck progress)', () => {
  const atProductStep = describeProgress('q3');
  const backToImportMode = describeProgress('q1');
  assert.equal(atProductStep.phase, JOURNEY_PHASE.PRODUCT_OR_ISSUE);
  assert.equal(backToImportMode.phase, JOURNEY_PHASE.IMPORT_MODE);
  assert.ok(backToImportMode.index < atProductStep.index);
});

test('11. no phase label or output field ever contains a fixed-question-count phrase', () => {
  const forbidden = ['שלוש שאלות', '3 שאלות', 'מתוך 3'];
  for (const phase of JOURNEY_PHASE_ORDER) {
    const label = phaseLabel(phase);
    for (const needle of forbidden) {
      assert.ok(!label.includes(needle), `phase label "${label}" must not contain "${needle}"`);
    }
  }
});

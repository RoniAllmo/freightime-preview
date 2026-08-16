/**
 * Tests for the conditional regulatory-follow-up question-budget
 * architecture (js/import-readiness/regulatory-signals/question-budget.js).
 * Covers: normal cap of 3, exceptional cap of 4 requiring a documented
 * justification, existing-answer reuse (never re-asking), and honest
 * budget-exhaustion behavior (stop asking, never loop, never silently
 * over-collect).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  selectQuestionsWithinBudget,
  MAX_REGULATORY_QUESTIONS_NORMAL,
  MAX_REGULATORY_QUESTIONS_EXCEPTIONAL,
} from '../../../js/import-readiness/regulatory-signals/question-budget.js';

function q(id, extra = {}) {
  return { id, legend: `legend-${id}`, options: [], ...extra };
}

test('1. the normal cap is 3 and the exceptional cap is 4', () => {
  assert.equal(MAX_REGULATORY_QUESTIONS_NORMAL, 3);
  assert.equal(MAX_REGULATORY_QUESTIONS_EXCEPTIONAL, 4);
});

test('2. up to 3 candidate questions are all selected within the normal budget', () => {
  const result = selectQuestionsWithinBudget([q('a'), q('b'), q('c')]);
  assert.equal(result.questionsToAsk.length, 3);
  assert.equal(result.budgetExhausted, false);
  assert.equal(result.usedExceptionalSlot, false);
});

test('3. a 4th candidate question is dropped by default (normal cap enforced) unless it documents an exceptional justification', () => {
  const result = selectQuestionsWithinBudget([q('a'), q('b'), q('c'), q('d')]);
  assert.equal(result.questionsToAsk.length, 3);
  assert.deepEqual(result.skippedForBudgetIds, ['d']);
  assert.equal(result.budgetExhausted, true);
  assert.equal(result.usedExceptionalSlot, false);
});

test('4. a 4th candidate question IS asked when it carries a documented exceptionalBudgetJustification', () => {
  const result = selectQuestionsWithinBudget([
    q('a'), q('b'), q('c'),
    q('d', { exceptionalBudgetJustification: 'Omitting this would produce a materially misleading signal for X.' }),
  ]);
  assert.equal(result.questionsToAsk.length, 4);
  assert.equal(result.usedExceptionalSlot, true);
  assert.equal(result.budgetExhausted, false);
});

test('5. even the exceptional budget is a hard cap: a 5th candidate is still dropped', () => {
  const result = selectQuestionsWithinBudget([
    q('a'), q('b'), q('c'),
    q('d', { exceptionalBudgetJustification: 'documented reason' }),
    q('e'),
  ]);
  assert.equal(result.questionsToAsk.length, 4);
  assert.deepEqual(result.skippedForBudgetIds, ['e']);
  assert.equal(result.budgetExhausted, true);
});

test('6. a question already answered in this session is reused, not re-asked, and does not consume budget', () => {
  const result = selectQuestionsWithinBudget([q('a'), q('b'), q('c'), q('d')], {
    answers: { a: 'yes' },
  });
  assert.deepEqual(result.alreadyAnsweredIds, ['a']);
  assert.deepEqual(result.questionsToAsk.map((x) => x.id), ['b', 'c', 'd']);
  assert.equal(result.budgetExhausted, false, 'reused answers must not count against the cap');
});

test('7. a question already satisfiable from existing core-route answers (reusableAnswers) is never re-asked', () => {
  const result = selectQuestionsWithinBudget([q('mainsConnected'), q('b'), q('c')], {
    reusableAnswers: { mainsConnected: 'yes' },
  });
  assert.deepEqual(result.alreadyAnsweredIds, ['mainsConnected']);
  assert.deepEqual(result.questionsToAsk.map((x) => x.id), ['b', 'c']);
});

test('8. an empty candidate list produces an empty, non-exhausted result (no crash, no fabricated question)', () => {
  const result = selectQuestionsWithinBudget([]);
  assert.deepEqual(result.questionsToAsk, []);
  assert.equal(result.budgetExhausted, false);
});

test('9. malformed candidate entries (no id) are safely ignored rather than throwing', () => {
  assert.doesNotThrow(() => {
    const result = selectQuestionsWithinBudget([null, {}, q('a')]);
    assert.deepEqual(result.questionsToAsk.map((x) => x.id), ['a']);
  });
});

test('10. budget exhaustion never loops or grows unbounded -- the skipped list is exactly the overflow, once', () => {
  const many = Array.from({ length: 10 }, (_, i) => q(`q${i}`));
  const result = selectQuestionsWithinBudget(many);
  assert.equal(result.questionsToAsk.length, 3);
  assert.equal(result.skippedForBudgetIds.length, 7);
  assert.equal(result.budgetExhausted, true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeNextFollowUpQuestionId,
  pruneStaleRegulatoryAnswers,
  pruneAnswersInvalidatedByExclusion,
  NORMAL_QUESTION_BUDGET,
  EXCEPTIONAL_QUESTION_BUDGET,
} from '../../../js/import-readiness/regulatory-signals/question-scheduler.js';
import { RULE_STATUS } from '../../../js/import-readiness/regulatory-signals/rule-status.js';
import { REGULATORY_SIGNAL_RULES } from '../../../js/import-readiness/regulatory-signals/rules-registry.js';
import { ANSWER } from '../../../js/import-readiness/regulatory-signals/questions.js';

function fakeRule(overrides) {
  return {
    id: 'fake-rule',
    internalCategory: 'fake_category',
    status: RULE_STATUS.EXPERT_APPROVED_FOR_PILOT,
    followUpQuestionIds: ['mainsConnectedOrSuppliedAdapter'],
    operationalImpactPriority: 1,
    ...overrides,
  };
}

test('1. returns null when no category is hinted', () => {
  const next = computeNextFollowUpQuestionId({ hintedCategories: new Set(), answers: {}, rules: REGULATORY_SIGNAL_RULES });
  assert.equal(next, null);
});

test('2. returns the first unanswered question for a hinted single-question rule', () => {
  const next = computeNextFollowUpQuestionId({
    hintedCategories: new Set(['electrical_mains_product']),
    answers: {},
    rules: REGULATORY_SIGNAL_RULES,
  });
  assert.equal(next, 'mainsConnectedOrSuppliedAdapter');
});

test('3. returns null once the only question for a hinted rule is already answered', () => {
  const next = computeNextFollowUpQuestionId({
    hintedCategories: new Set(['electrical_mains_product']),
    answers: { mainsConnectedOrSuppliedAdapter: ANSWER.YES },
    rules: REGULATORY_SIGNAL_RULES,
  });
  assert.equal(next, null);
});

test('4. walks a multi-question rule chain in order', () => {
  const hintedCategories = new Set(['polymer_coating_food_contact']);
  let answers = {};
  const q1 = computeNextFollowUpQuestionId({ hintedCategories, answers, rules: REGULATORY_SIGNAL_RULES });
  assert.equal(q1, 'hasInternalCoating');

  answers = { hasInternalCoating: ANSWER.YES };
  const q2 = computeNextFollowUpQuestionId({ hintedCategories, answers, rules: REGULATORY_SIGNAL_RULES });
  assert.equal(q2, 'coatingDirectFoodOrDrinkContact');

  answers = { ...answers, coatingDirectFoodOrDrinkContact: ANSWER.YES };
  const q3 = computeNextFollowUpQuestionId({ hintedCategories, answers, rules: REGULATORY_SIGNAL_RULES });
  assert.equal(q3, 'coatingMaterial');

  answers = { ...answers, coatingMaterial: 'plastic_or_polymer' };
  const q4 = computeNextFollowUpQuestionId({ hintedCategories, answers, rules: REGULATORY_SIGNAL_RULES });
  assert.equal(q4, null);
});

test('5. a "no" answer on the first question in a chain excludes the rule -- no further question from it', () => {
  const next = computeNextFollowUpQuestionId({
    hintedCategories: new Set(['polymer_coating_food_contact']),
    answers: { hasInternalCoating: ANSWER.NO },
    rules: REGULATORY_SIGNAL_RULES,
  });
  assert.equal(next, null);
});

test('6. "unknown" does not exclude a rule -- the chain continues', () => {
  const next = computeNextFollowUpQuestionId({
    hintedCategories: new Set(['polymer_coating_food_contact']),
    answers: { hasInternalCoating: ANSWER.UNKNOWN },
    rules: REGULATORY_SIGNAL_RULES,
  });
  assert.equal(next, 'coatingDirectFoodOrDrinkContact');
});

test('7. candidate rules are ordered by operationalImpactPriority (lower first)', () => {
  const highPriorityRule = fakeRule({ id: 'r-high', internalCategory: 'cat_a', operationalImpactPriority: 1, followUpQuestionIds: ['qHigh'] });
  const lowPriorityRule = fakeRule({ id: 'r-low', internalCategory: 'cat_b', operationalImpactPriority: 5, followUpQuestionIds: ['qLow'] });
  // Deliberately supply in reverse-priority order to prove sorting, not
  // array order, decides which question comes first.
  const next = computeNextFollowUpQuestionId({
    hintedCategories: new Set(['cat_a', 'cat_b']),
    answers: {},
    rules: [lowPriorityRule, highPriorityRule],
  });
  assert.equal(next, 'qHigh');
});

test('8. a disabled rule never produces a question even when its category is hinted', () => {
  const disabledRule = fakeRule({ internalCategory: 'cat_disabled', status: RULE_STATUS.DISABLED, followUpQuestionIds: ['qDisabled'] });
  const next = computeNextFollowUpQuestionId({
    hintedCategories: new Set(['cat_disabled']),
    answers: {},
    rules: [disabledRule],
  });
  assert.equal(next, null);
});

test('9. a review_due rule never produces a question even when its category is hinted', () => {
  const reviewDueRule = fakeRule({ internalCategory: 'cat_review', status: RULE_STATUS.REVIEW_DUE, followUpQuestionIds: ['qReview'] });
  const next = computeNextFollowUpQuestionId({
    hintedCategories: new Set(['cat_review']),
    answers: {},
    rules: [reviewDueRule],
  });
  assert.equal(next, null);
});

test('10. a shared question id between two candidate rules is asked once and reused, never duplicated', () => {
  const ruleA = fakeRule({ id: 'r-a', internalCategory: 'cat_a', operationalImpactPriority: 1, followUpQuestionIds: ['sharedQ', 'qOnlyA'] });
  const ruleB = fakeRule({ id: 'r-b', internalCategory: 'cat_b', operationalImpactPriority: 2, followUpQuestionIds: ['sharedQ', 'qOnlyB'] });
  const hintedCategories = new Set(['cat_a', 'cat_b']);

  const q1 = computeNextFollowUpQuestionId({ hintedCategories, answers: {}, rules: [ruleA, ruleB] });
  assert.equal(q1, 'sharedQ');

  // Once sharedQ is answered, both rules treat it as satisfied -- next
  // is ruleA's own question (higher priority), not sharedQ again.
  const q2 = computeNextFollowUpQuestionId({ hintedCategories, answers: { sharedQ: ANSWER.YES }, rules: [ruleA, ruleB] });
  assert.equal(q2, 'qOnlyA');
});

test('11. normal budget (3) is not exceeded when starting brand-new rule chains', () => {
  const rules = [
    fakeRule({ id: 'r1', internalCategory: 'c1', operationalImpactPriority: 1, followUpQuestionIds: ['q1'] }),
    fakeRule({ id: 'r2', internalCategory: 'c2', operationalImpactPriority: 2, followUpQuestionIds: ['q2'] }),
    fakeRule({ id: 'r3', internalCategory: 'c3', operationalImpactPriority: 3, followUpQuestionIds: ['q3'] }),
    fakeRule({ id: 'r4', internalCategory: 'c4', operationalImpactPriority: 4, followUpQuestionIds: ['q4'] }),
  ];
  const hintedCategories = new Set(['c1', 'c2', 'c3', 'c4']);
  const answers = { q1: ANSWER.YES, q2: ANSWER.YES, q3: ANSWER.YES };
  const next = computeNextFollowUpQuestionId({ hintedCategories, answers, rules });
  assert.equal(next, null, 'a 4th brand-new rule chain must not start once 3 questions are already answered');
});

test('12. exceptional budget (4) allows finishing an already-started chain past the normal budget', () => {
  const rules = [
    fakeRule({ id: 'r1', internalCategory: 'c1', operationalImpactPriority: 1, followUpQuestionIds: ['q1'] }),
    fakeRule({ id: 'r2', internalCategory: 'c2', operationalImpactPriority: 2, followUpQuestionIds: ['q2'] }),
    fakeRule({ id: 'r3', internalCategory: 'c3', operationalImpactPriority: 3, followUpQuestionIds: ['q3a', 'q3b'] }),
  ];
  const hintedCategories = new Set(['c1', 'c2', 'c3']);
  // q1, q2 answered (2), q3a answered as the 3rd -- q3b would be the 4th,
  // continuing a chain already in progress, so it's allowed.
  const answers = { q1: ANSWER.YES, q2: ANSWER.YES, q3a: ANSWER.YES };
  const next = computeNextFollowUpQuestionId({ hintedCategories, answers, rules });
  assert.equal(next, 'q3b');
});

test('13. the hard ceiling of 4 is never exceeded, even mid-chain', () => {
  const rules = [
    fakeRule({ id: 'r1', internalCategory: 'c1', operationalImpactPriority: 1, followUpQuestionIds: ['q1', 'q1b'] }),
  ];
  const hintedCategories = new Set(['c1']);
  const answers = { q1: ANSWER.YES, extra1: ANSWER.YES, extra2: ANSWER.YES, extra3: ANSWER.YES };
  // Not realistic (extra* aren't real question ids) but proves the pure
  // counting logic caps strictly at 4 regardless of which rule is mid-chain.
  const next = computeNextFollowUpQuestionId({ hintedCategories, answers, rules });
  assert.equal(next, null);
});

test('14. NORMAL_QUESTION_BUDGET is 3 and EXCEPTIONAL_QUESTION_BUDGET is 4', () => {
  assert.equal(NORMAL_QUESTION_BUDGET, 3);
  assert.equal(EXCEPTIONAL_QUESTION_BUDGET, 4);
});

test('15. pruneStaleRegulatoryAnswers drops answers whose question category is no longer hinted', () => {
  const answers = { mainsConnectedOrSuppliedAdapter: ANSWER.YES, glassVesselDirectFoodOrDrinkContact: ANSWER.YES };
  const pruned = pruneStaleRegulatoryAnswers(answers, new Set(['electrical_mains_product']));
  assert.deepEqual(pruned, { mainsConnectedOrSuppliedAdapter: ANSWER.YES });
});

test('16. pruneStaleRegulatoryAnswers keeps answers whose category is still hinted', () => {
  const answers = { mainsConnectedOrSuppliedAdapter: ANSWER.YES };
  const pruned = pruneStaleRegulatoryAnswers(answers, new Set(['electrical_mains_product']));
  assert.deepEqual(pruned, { mainsConnectedOrSuppliedAdapter: ANSWER.YES });
});

test('17. pruneAnswersInvalidatedByExclusion clears downstream answers once an earlier answer excludes the rule', () => {
  const answers = {
    hasInternalCoating: ANSWER.NO, // now excludes the rule
    coatingDirectFoodOrDrinkContact: ANSWER.YES, // stale -- should be dropped
    coatingMaterial: 'plastic_or_polymer', // stale -- should be dropped
  };
  const pruned = pruneAnswersInvalidatedByExclusion(answers, REGULATORY_SIGNAL_RULES);
  assert.deepEqual(pruned, { hasInternalCoating: ANSWER.NO });
});

test('18. pruneAnswersInvalidatedByExclusion keeps a fully-answered, non-excluded chain intact', () => {
  const answers = {
    hasInternalCoating: ANSWER.YES,
    coatingDirectFoodOrDrinkContact: ANSWER.YES,
    coatingMaterial: 'plastic_or_polymer',
  };
  const pruned = pruneAnswersInvalidatedByExclusion(answers, REGULATORY_SIGNAL_RULES);
  assert.deepEqual(pruned, answers);
});

test('19. pruneAnswersInvalidatedByExclusion keeps a shared question reachable by a still-active rule even if another rule using it is excluded', () => {
  const ruleA = fakeRule({ id: 'r-a', internalCategory: 'cat_a', followUpQuestionIds: ['sharedQ', 'qA'] });
  const ruleB = fakeRule({ id: 'r-b', internalCategory: 'cat_b', followUpQuestionIds: ['sharedQ'] });
  const answers = { sharedQ: ANSWER.NO, qA: ANSWER.YES };
  // ruleA is excluded by sharedQ=NO too (its first question), so qA
  // should indeed be dropped -- but sharedQ itself stays since ruleB
  // still reaches it as its own first question.
  const pruned = pruneAnswersInvalidatedByExclusion(answers, [ruleA, ruleB]);
  assert.deepEqual(pruned, { sharedQ: ANSWER.NO });
});

test('20. no infinite loop -- repeatedly answering the returned question always terminates', () => {
  const hintedCategories = new Set(REGULATORY_SIGNAL_RULES.map((r) => r.internalCategory));
  let answers = {};
  let iterations = 0;
  let next = computeNextFollowUpQuestionId({ hintedCategories, answers, rules: REGULATORY_SIGNAL_RULES });
  while (next !== null && iterations < 100) {
    answers = { ...answers, [next]: ANSWER.YES };
    next = computeNextFollowUpQuestionId({ hintedCategories, answers, rules: REGULATORY_SIGNAL_RULES });
    iterations += 1;
  }
  assert.ok(iterations < 100, 'the scheduler must terminate well before 100 iterations');
  assert.ok(iterations <= EXCEPTIONAL_QUESTION_BUDGET, 'the scheduler must never exceed the exceptional budget of 4 questions');
});

/**
 * Question-budget architecture for the Product Regulatory Signals
 * pilot.
 *
 * Two separate budgets exist for the assessment as a whole:
 *
 *   (A) Core routing questions -- the existing minimum questions
 *       already required to determine the general route (import type,
 *       experience, product identity, etc.). Unchanged by this pilot,
 *       already implemented in import-readiness-controller.js, and NOT
 *       governed by this module.
 *   (B) Conditional regulatory follow-up questions -- appear only
 *       after a candidate trigger is detected. This module enforces
 *       that budget: a hard cap of `MAX_REGULATORY_QUESTIONS_NORMAL`
 *       (3), extendable to `MAX_REGULATORY_QUESTIONS_EXCEPTIONAL` (4)
 *       only for a question explicitly flagged
 *       `exceptionalBudgetJustification` on its own definition (a 4th
 *       question must document, in that field, why omitting it could
 *       produce a materially misleading signal -- see
 *       docs/regulatory-signals-pilot.md).
 *
 * The regulatory budget never re-counts a question whose answer is
 * already known -- either because the exact same regulatory question
 * id was already answered earlier in this session, or because the
 * caller supplies a `reusableAnswers` map of core-route fields
 * (productName / commercialDescription / intendedUse /
 * sensitiveCategory, etc.) that a rule can be satisfied from directly.
 * When more candidate questions exist than the budget allows, this
 * module stops selecting further questions rather than looping or
 * silently over-asking, and reports `budgetExhausted: true` so the
 * caller can lower the resulting confidence and surface a "needs
 * verification" note instead of extracting more detail than the
 * budget permits.
 *
 * Pure, deterministic, DOM-free, network-free, storage-free.
 */

export const MAX_REGULATORY_QUESTIONS_NORMAL = 3;
export const MAX_REGULATORY_QUESTIONS_EXCEPTIONAL = 4;

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * @param {object[]} candidateQuestions - question definitions (see questions.js), in priority order.
 * @param {{ answers?: Record<string,string>, reusableAnswers?: Record<string,string> }} [context]
 * @returns {Readonly<{
 *   questionsToAsk: object[],
 *   alreadyAnsweredIds: string[],
 *   skippedForBudgetIds: string[],
 *   budgetExhausted: boolean,
 *   usedExceptionalSlot: boolean,
 * }>}
 */
export function selectQuestionsWithinBudget(candidateQuestions, context = {}) {
  const questions = Array.isArray(candidateQuestions) ? candidateQuestions : [];
  const answers = context && typeof context.answers === 'object' && context.answers !== null ? context.answers : {};
  const reusable = context && typeof context.reusableAnswers === 'object' && context.reusableAnswers !== null ? context.reusableAnswers : {};

  const alreadyAnsweredIds = [];
  const remaining = [];

  for (const q of questions) {
    if (!q || typeof q !== 'object' || !isNonEmptyString(q.id)) continue;
    const alreadyKnown = isNonEmptyString(answers[q.id]) || isNonEmptyString(reusable[q.id]);
    if (alreadyKnown) {
      alreadyAnsweredIds.push(q.id);
      continue;
    }
    remaining.push(q);
  }

  const normalSlice = remaining.slice(0, MAX_REGULATORY_QUESTIONS_NORMAL);
  const nextCandidate = remaining[MAX_REGULATORY_QUESTIONS_NORMAL];

  let questionsToAsk = normalSlice;
  let usedExceptionalSlot = false;

  if (nextCandidate && isNonEmptyString(nextCandidate.exceptionalBudgetJustification)) {
    questionsToAsk = remaining.slice(0, MAX_REGULATORY_QUESTIONS_EXCEPTIONAL);
    usedExceptionalSlot = true;
  }

  const skippedForBudgetIds = remaining.slice(questionsToAsk.length).map((q) => q.id);

  return Object.freeze({
    questionsToAsk: Object.freeze(questionsToAsk),
    alreadyAnsweredIds: Object.freeze(alreadyAnsweredIds),
    skippedForBudgetIds: Object.freeze(skippedForBudgetIds),
    budgetExhausted: skippedForBudgetIds.length > 0,
    usedExceptionalSlot,
  });
}

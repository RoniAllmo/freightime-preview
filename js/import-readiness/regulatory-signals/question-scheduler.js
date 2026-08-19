/**
 * Deterministic scheduler for the live regulatory follow-up question
 * flow -- decides which single question to show next, given the
 * currently hinted candidate categories, the answers collected so far,
 * and the canonical rule registry. Never decides WHAT a question says
 * (that stays in questions.js) and never decides whether a rule may
 * ever produce public output (that stays in rule-status.js /
 * matcher.js) -- this module only decides ordering and budget for the
 * live DOM question flow the controller renders one question at a time.
 *
 * Pure, deterministic, DOM-free, network-free, storage-free.
 */

import { RULE_STATUS } from './rule-status.js';
import { ANSWER, findQuestionById } from './questions.js';

/** Normal question-budget ceiling for the focused-checks phase. */
export const NORMAL_QUESTION_BUDGET = 3;
/** Hard ceiling -- only reachable to let an already-started rule's own
 * question chain finish, never to start a brand-new rule's chain. */
export const EXCEPTIONAL_QUESTION_BUDGET = 4;

function isQuestioningEligible(rule) {
  return rule.status !== RULE_STATUS.DISABLED && rule.status !== RULE_STATUS.REVIEW_DUE;
}

/**
 * True once an earlier question in the rule's own chain was answered
 * "no" -- the documented exclusion pattern shared by all 5 pilot rules
 * (see rules-registry.js's per-rule comments): a "no" on the first
 * question always means the rest of that rule's questions are moot.
 */
export function isRuleExcludedByAnswers(rule, answers) {
  for (const qId of rule.followUpQuestionIds ?? []) {
    const value = answers[qId];
    if (value === undefined) return false;
    if (value === ANSWER.NO) return true;
  }
  return false;
}

/**
 * @param {Record<string,string>} answers
 * @param {object[]} rules
 * @returns {string[]} ids of every rule whose own answer chain was
 *   explicitly excluded (an earlier question in its chain answered
 *   "no") -- the single source of truth for "this detailed rule's
 *   answers say no" that both the live question flow above and the
 *   matrix reconciliation layer (product-family-reconciliation.js) rely
 *   on, so the two never disagree about what counts as excluded.
 */
export function excludedRuleIds(answers, rules) {
  const source = answers !== null && typeof answers === 'object' ? answers : {};
  const ruleList = Array.isArray(rules) ? rules : [];
  return ruleList.filter((rule) => isRuleExcludedByAnswers(rule, source)).map((rule) => rule.id);
}

/**
 * Counts entries already present in the regulatory answer map. `answers`
 * is expected to be a dedicated regulatory-answer store (only ever
 * populated with ids this scheduler itself returned) -- callers must
 * not mix in unrelated form-field answers.
 */
function countAnsweredRegulatoryQuestions(answers) {
  return Object.keys(answers).length;
}

/**
 * @param {{ hintedCategories: Set<string>, answers: Record<string,string>, rules: object[] }} params
 * @returns {string|null} the next question id to ask, or null when the
 *   focused-checks phase has nothing left to ask (budget exhausted, or
 *   every candidate rule's questions are already answered or excluded).
 */
export function computeNextFollowUpQuestionId(params) {
  const p = params !== null && typeof params === 'object' ? params : {};
  const hintedCategories = p.hintedCategories instanceof Set ? p.hintedCategories : new Set();
  const answers = p.answers !== null && typeof p.answers === 'object' ? p.answers : {};
  const rules = Array.isArray(p.rules) ? p.rules : [];

  const candidateRules = rules
    .filter((r) => hintedCategories.has(r.internalCategory))
    .filter(isQuestioningEligible)
    .filter((r) => !isRuleExcludedByAnswers(r, answers))
    .slice()
    .sort((a, b) => (a.operationalImpactPriority ?? 99) - (b.operationalImpactPriority ?? 99));

  const answeredCount = countAnsweredRegulatoryQuestions(answers);

  for (const rule of candidateRules) {
    for (const qId of rule.followUpQuestionIds ?? []) {
      if (answers[qId] !== undefined) continue; // already answered -- shared answers are reused, never re-asked
      if (answeredCount >= EXCEPTIONAL_QUESTION_BUDGET) return null;
      if (answeredCount >= NORMAL_QUESTION_BUDGET) {
        // Beyond the normal budget, only continue a chain already in
        // progress -- never start questioning a brand-new rule.
        const ruleAlreadyStarted = (rule.followUpQuestionIds ?? []).some((id) => answers[id] !== undefined);
        if (!ruleAlreadyStarted) return null;
      }
      return qId;
    }
  }
  return null;
}

/**
 * Drops any stored regulatory answer whose question no longer belongs
 * to a currently-hinted category -- called whenever the user edits
 * earlier product information (product name/description/intended use/
 * sensitive category) so a stale answer from a no-longer-relevant
 * category never silently persists or reaches the matcher.
 *
 * @param {Record<string,string>} answers
 * @param {Set<string>} hintedCategories
 * @returns {Record<string,string>}
 */
export function pruneStaleRegulatoryAnswers(answers, hintedCategories) {
  const source = answers !== null && typeof answers === 'object' ? answers : {};
  const hinted = hintedCategories instanceof Set ? hintedCategories : new Set();
  const next = {};
  for (const [qId, value] of Object.entries(source)) {
    const question = findQuestionById(qId);
    if (question !== null && hinted.has(question.category)) next[qId] = value;
  }
  return next;
}

/**
 * Drops any stored regulatory answer for a question that no rule can
 * still reach given the CURRENT answers -- e.g. changing an earlier
 * answer in a rule's chain to "no" must clear any downstream answer
 * that chain would have produced, so editing an earlier answer never
 * leaves a stale, no-longer-reachable later answer behind.
 *
 * @param {Record<string,string>} answers
 * @param {object[]} rules
 * @returns {Record<string,string>}
 */
export function pruneAnswersInvalidatedByExclusion(answers, rules) {
  const source = answers !== null && typeof answers === 'object' ? answers : {};
  const ruleList = Array.isArray(rules) ? rules : [];
  const stillReachable = new Set();
  for (const rule of ruleList) {
    let excluded = false;
    for (const qId of rule.followUpQuestionIds ?? []) {
      if (excluded) continue;
      stillReachable.add(qId);
      if (source[qId] === ANSWER.NO) excluded = true;
    }
  }
  const next = {};
  for (const [qId, value] of Object.entries(source)) {
    if (stillReachable.has(qId)) next[qId] = value;
  }
  return next;
}

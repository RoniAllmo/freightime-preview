/**
 * Tests for the personal-use clarification model
 * (personal-use-clarification.js), which replaced the earlier
 * exact-quantity-100 pilot rule. There is no numeric quantity trigger
 * of any kind here -- only a live question, gated by import type, an
 * explicit product-owner-maintained sensitive-family list, and whether
 * any positive whole-number quantity was entered.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SENSITIVE_FAMILY_IDS,
  PERSONAL_USE_CLARIFICATION_CATEGORY,
  PERSONAL_USE_CLARIFICATION_QUESTION_ID,
  PERSONAL_USE_CLARIFICATION_RULE,
  PERSONAL_USE_YES_MESSAGE,
  PERSONAL_USE_NO_MESSAGE,
  PERSONAL_USE_NOT_SURE_MESSAGE,
  isSensitiveFamily,
  shouldAskPersonalUseClarification,
  personalUseClarificationMessage,
} from '../../js/import-readiness/personal-use-clarification.js';
import { findFamilyById } from '../../js/import-readiness/product-family-matrix.js';
import { IMPORT_TYPE } from '../../js/import-readiness/scenario-schema.js';
import { REGULATORY_FOLLOWUP_QUESTIONS, findQuestionById } from '../../js/import-readiness/regulatory-signals/questions.js';
import { REGULATORY_SIGNAL_RULES } from '../../js/import-readiness/regulatory-signals/rules-registry.js';
import { computeNextFollowUpQuestionId, NORMAL_QUESTION_BUDGET } from '../../js/import-readiness/regulatory-signals/question-scheduler.js';

const cosmeticsFamily = findFamilyById('health-and-cosmetics-01');
// A recognized, but deliberately NOT product-owner-approved, family --
// stands in for "an unrelated product" throughout these tests.
const unrelatedFamily = { id: 'textiles-and-furniture-01', publicFamilyName: 'ביגוד' };

function moduleSource() {
  return readFileSync(new URL('../../js/import-readiness/personal-use-clarification.js', import.meta.url), 'utf8');
}
function quantityModuleSource() {
  return readFileSync(new URL('../../js/import-readiness/personal-quantity-warning.js', import.meta.url), 'utf8');
}

// --- No numeric trigger remains -----------------------------------------

test('1. no numeric quantity trigger remains anywhere in the personal-use-clarification module\'s actual code (comparisons, not prose mentioning the removed mechanism)', () => {
  const source = moduleSource();
  assert.ok(!/quantity\s*===\s*100\b/i.test(source), 'no exact-match comparison against 100 may remain in code');
  assert.ok(!/quantity\s*>=?\s*100\b/i.test(source), 'no greater-than comparison against 100 may exist in code');
  assert.ok(!/aboveQuantity|pilotExactQuantity/.test(source), 'the old threshold/exact-match field names must not reappear');
});

test('2. no exact quantity 100 trigger remains: shouldAskPersonalUseClarification does not special-case any specific number', () => {
  const at50 = shouldAskPersonalUseClarification({ importType: IMPORT_TYPE.PERSONAL, family: cosmeticsFamily, rawQuantity: '50' });
  const at100 = shouldAskPersonalUseClarification({ importType: IMPORT_TYPE.PERSONAL, family: cosmeticsFamily, rawQuantity: '100' });
  const at1000 = shouldAskPersonalUseClarification({ importType: IMPORT_TYPE.PERSONAL, family: cosmeticsFamily, rawQuantity: '1000' });
  assert.equal(at50, true);
  assert.equal(at100, true);
  assert.equal(at1000, true);
});

test('3. the old exact-match quantity module carries no revived threshold constant', () => {
  const source = quantityModuleSource();
  assert.ok(!/personalQuantityReviewRules/.test(source));
  assert.ok(!/QUANTITY_WARNING_TEXT/.test(source));
  assert.ok(!/evaluatePersonalQuantityWarning/.test(source));
});

// --- The sensitive-family list is explicit and product-owner maintained --

test('4. the sensitive-family list is a real, explicit, frozen array', () => {
  assert.ok(Array.isArray(SENSITIVE_FAMILY_IDS));
  assert.ok(Object.isFrozen(SENSITIVE_FAMILY_IDS));
  assert.ok(SENSITIVE_FAMILY_IDS.length > 0);
});

test('5. for this controlled pilot, the sensitive-family list contains only cosmetics/תמרוקים', () => {
  assert.deepEqual(SENSITIVE_FAMILY_IDS, ['health-and-cosmetics-01']);
  const family = findFamilyById('health-and-cosmetics-01');
  assert.equal(family.publicFamilyName, 'תמרוקים ובשמים');
});

test('6. only approved families trigger the clarification -- an unrelated recognized family never does, at any quantity', () => {
  assert.equal(isSensitiveFamily(unrelatedFamily.id), false);
  assert.equal(shouldAskPersonalUseClarification({ importType: IMPORT_TYPE.PERSONAL, family: unrelatedFamily, rawQuantity: '100' }), false);
  assert.equal(shouldAskPersonalUseClarification({ importType: IMPORT_TYPE.PERSONAL, family: unrelatedFamily, rawQuantity: '5' }), false);
});

test('7. no family at all (unrecognized product) never triggers the clarification', () => {
  assert.equal(shouldAskPersonalUseClarification({ importType: IMPORT_TYPE.PERSONAL, family: null, rawQuantity: '100' }), false);
  assert.equal(shouldAskPersonalUseClarification({ importType: IMPORT_TYPE.PERSONAL, family: undefined, rawQuantity: '100' }), false);
});

// --- Personal and commercial behavior remain separate ---------------------

test('8. commercial import never triggers the clarification, even for the sensitive family with a quantity', () => {
  assert.equal(shouldAskPersonalUseClarification({ importType: IMPORT_TYPE.COMMERCIAL, family: cosmeticsFamily, rawQuantity: '100' }), false);
});

test('9. "uncertain" import type never triggers the clarification either -- personal import only', () => {
  assert.equal(shouldAskPersonalUseClarification({ importType: IMPORT_TYPE.UNCERTAIN, family: cosmeticsFamily, rawQuantity: '100' }), false);
});

// --- Blank quantity ---------------------------------------------------------

test('10. blank quantity never triggers the clarification for the sensitive family, personal import', () => {
  assert.equal(shouldAskPersonalUseClarification({ importType: IMPORT_TYPE.PERSONAL, family: cosmeticsFamily, rawQuantity: '' }), false);
  assert.equal(shouldAskPersonalUseClarification({ importType: IMPORT_TYPE.PERSONAL, family: cosmeticsFamily, rawQuantity: undefined }), false);
  assert.equal(shouldAskPersonalUseClarification({ importType: IMPORT_TYPE.PERSONAL, family: cosmeticsFamily, rawQuantity: null }), false);
});

// --- Quantity must be a positive whole number when entered -----------------

test('11. a non-whole or non-positive quantity never triggers the clarification', () => {
  assert.equal(shouldAskPersonalUseClarification({ importType: IMPORT_TYPE.PERSONAL, family: cosmeticsFamily, rawQuantity: '0' }), false);
  assert.equal(shouldAskPersonalUseClarification({ importType: IMPORT_TYPE.PERSONAL, family: cosmeticsFamily, rawQuantity: '-3' }), false);
  assert.equal(shouldAskPersonalUseClarification({ importType: IMPORT_TYPE.PERSONAL, family: cosmeticsFamily, rawQuantity: '3.5' }), false);
  assert.equal(shouldAskPersonalUseClarification({ importType: IMPORT_TYPE.PERSONAL, family: cosmeticsFamily, rawQuantity: 'abc' }), false);
});

// --- The three exact approved answers --------------------------------------

test('12. each of the three answers produces exactly its own approved cautious message', () => {
  assert.equal(personalUseClarificationMessage('yes'), PERSONAL_USE_YES_MESSAGE);
  assert.equal(personalUseClarificationMessage('no'), PERSONAL_USE_NO_MESSAGE);
  assert.equal(personalUseClarificationMessage('unknown'), PERSONAL_USE_NOT_SURE_MESSAGE);
  assert.equal(personalUseClarificationMessage(undefined), null, 'an unanswered question produces no message');
});

test('13. none of the three messages claims the quantity is commercial, a legal threshold applies, an unqualified "this shipment IS personal import", exemption, or that import is approved', () => {
  // Each banned phrase is an unqualified/bare claim -- distinct from the
  // approved YES message's own hedged "עדיין עשויים לדרוש בדיקה כדי
  // לוודא ש..." (still may require verification to confirm...), which
  // is exactly the opposite of a bare claim and must not trip this
  // check.
  const banned = [/הכמות (היא|הינה) מסחרית/, /סף חוקי/, /^המשלוח מתאים למסלול יבוא אישי\.?$/, /פטור/, /היבוא מאושר/, /^אושר\b/];
  for (const message of [PERSONAL_USE_YES_MESSAGE, PERSONAL_USE_NO_MESSAGE, PERSONAL_USE_NOT_SURE_MESSAGE]) {
    for (const pattern of banned) {
      assert.ok(!pattern.test(message), `message "${message}" must not match banned pattern ${pattern}`);
    }
  }
});

// --- Wired into the question registry, once, findable ----------------------

test('14. the personal-use clarification question is registered exactly once in the shared question registry', () => {
  const matches = REGULATORY_FOLLOWUP_QUESTIONS.filter((q) => q.id === PERSONAL_USE_CLARIFICATION_QUESTION_ID);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].category, PERSONAL_USE_CLARIFICATION_CATEGORY);
});

test('15. the question has exactly three options labeled כן / לא / לא בטוח', () => {
  const question = findQuestionById(PERSONAL_USE_CLARIFICATION_QUESTION_ID);
  assert.ok(question);
  assert.deepEqual(question.options.map((o) => o.label), ['כן', 'לא', 'לא בטוח']);
});

test('16. the exact approved question text is used verbatim', () => {
  const question = findQuestionById(PERSONAL_USE_CLARIFICATION_QUESTION_ID);
  assert.equal(question.legend, 'האם המוצרים מיועדים לשימוש אישי שלך בלבד, ללא מכירה, חלוקה או שימוש עסקי?');
});

// --- Reuses the existing scheduler; question budget is preserved -----------

const COMBINED_RULES = Object.freeze([...REGULATORY_SIGNAL_RULES, PERSONAL_USE_CLARIFICATION_RULE]);

test('17. when hinted, the personal-use question is the one the scheduler returns and it appears exactly once per pass', () => {
  const hinted = new Set([PERSONAL_USE_CLARIFICATION_CATEGORY]);
  const firstId = computeNextFollowUpQuestionId({ hintedCategories: hinted, answers: {}, rules: COMBINED_RULES });
  assert.equal(firstId, PERSONAL_USE_CLARIFICATION_QUESTION_ID);
  const afterAnswered = computeNextFollowUpQuestionId({
    hintedCategories: hinted,
    answers: { [PERSONAL_USE_CLARIFICATION_QUESTION_ID]: 'yes' },
    rules: COMBINED_RULES,
  });
  assert.equal(afterAnswered, null, 'once answered, the question must never be asked again in the same pass');
});

test('18. the personal-use question shares the SAME global question budget as the detailed-rule questions -- it counts toward NORMAL_QUESTION_BUDGET, not a separate allowance', () => {
  const hinted = new Set(['electrical_mains_product', PERSONAL_USE_CLARIFICATION_CATEGORY]);
  const answers = {};
  for (let i = 0; i < NORMAL_QUESTION_BUDGET; i += 1) answers[`filler-${i}`] = 'yes';
  const nextId = computeNextFollowUpQuestionId({ hintedCategories: hinted, answers, rules: COMBINED_RULES });
  assert.equal(nextId, null, 'once the shared budget is exhausted, the personal-use question must not be asked either');
});

test('19. the personal-use rule is a lower scheduling priority than the five detailed-rule questions, so it never displaces a product-safety question within a tight budget', () => {
  const detailedPriorities = REGULATORY_SIGNAL_RULES.map((r) => r.operationalImpactPriority);
  assert.ok(PERSONAL_USE_CLARIFICATION_RULE.operationalImpactPriority > Math.max(...detailedPriorities));
});

test('20. the personal-use pseudo-rule is never publicly eligible as a detailed-signal rule -- it has no public-signal-card content fields, so matchRegulatorySignals must never be able to build a card for it', () => {
  assert.equal(typeof PERSONAL_USE_CLARIFICATION_RULE.publicTitle, 'undefined');
  assert.equal(typeof PERSONAL_USE_CLARIFICATION_RULE.professionalCategory, 'undefined');
});

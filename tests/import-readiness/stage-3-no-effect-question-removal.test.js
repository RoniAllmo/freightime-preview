/**
 * Stage 3 cleanup (product-owner approved, 2026-08-28): removal of the
 * vehicleFunctionCategory follow-up question, proven to have zero
 * material effect on any observable result.
 *
 * Proof performed before removal:
 *  - Exhaustive repo-wide grep found the field read nowhere except the
 *    question definition itself, its own follow-up-question-id entry
 *    on the vehicle-installed-product rule, and the (now-removed)
 *    lighting-phrase pre-answering logic in
 *    vehicle-context-inference.js.
 *  - The vehicle-installed-product rule's triggerPredicate only reads
 *    installedAsPartOfVehicle; vehicleFunctionCategory was never part
 *    of any trigger or exclusion condition.
 *  - The rule's verificationItems are static strings, never derived
 *    from the answer.
 *  - A live browser behavior matrix (all 9 answer options, identical
 *    product context, installedAsPartOfVehicle=yes) produced
 *    byte-identical rendered results for every option.
 *
 * This test file locks in that the question is fully gone (registry,
 * scheduling, inference) and that the remaining vehicle question/rule
 * still work exactly as before.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { REGULATORY_FOLLOWUP_QUESTIONS, findQuestionById } from '../../js/import-readiness/regulatory-signals/questions.js';
import { REGULATORY_SIGNAL_RULES } from '../../js/import-readiness/regulatory-signals/rules-registry.js';
import { inferVehicleContextAnswers } from '../../js/import-readiness/regulatory-signals/vehicle-context-inference.js';
import { matchRegulatorySignals } from '../../js/import-readiness/regulatory-signals/matcher.js';

test('1. vehicleFunctionCategory no longer exists in the question registry', () => {
  assert.equal(findQuestionById('vehicleFunctionCategory'), null);
  const ids = REGULATORY_FOLLOWUP_QUESTIONS.map((q) => q.id);
  assert.ok(!ids.includes('vehicleFunctionCategory'));
});

test('2. the question registry now has exactly 9 questions (10 minus the removed one)', () => {
  assert.equal(REGULATORY_FOLLOWUP_QUESTIONS.length, 9);
});

test('3. the rule registry is still exactly 5 rules -- removal did not touch any other rule', () => {
  assert.equal(REGULATORY_SIGNAL_RULES.length, 5);
});

test('4. the vehicle-installed-product rule now lists only installedAsPartOfVehicle as its follow-up question', () => {
  const rule = REGULATORY_SIGNAL_RULES.find((r) => r.id === 'vehicle-installed-product');
  assert.ok(rule);
  assert.deepEqual(rule.followUpQuestionIds, ['installedAsPartOfVehicle']);
});

test('5. the vehicle-installed-product rule\'s trigger, professional routing, and public text are unchanged', () => {
  const rule = REGULATORY_SIGNAL_RULES.find((r) => r.id === 'vehicle-installed-product');
  assert.equal(rule.triggerPredicate({ answers: { installedAsPartOfVehicle: 'yes' } }), true);
  assert.equal(rule.triggerPredicate({ answers: { installedAsPartOfVehicle: 'no' } }), false);
  assert.equal(rule.triggerPredicate({ answers: { installedAsPartOfVehicle: 'unknown' } }), false);
  assert.equal(rule.professionalCategory, 'VEHICLE_TESTING_LAB');
  assert.equal(rule.secondaryProfessionalCategory, 'CUSTOMS_CLASSIFIER');
  assert.equal(rule.primaryExplanation, 'לפי המידע שנמסר, המוצר מיועד להתקנה כחלק מרכב מנועי.');
  assert.deepEqual(rule.verificationItems, ['תפקיד המוצר ברכב', 'התאמתו לסוג הרכב', 'מסלול האישור הנדרש']);
});

test('6. the matcher still produces the vehicle signal from installedAsPartOfVehicle alone, with no vehicleFunctionCategory answer supplied', () => {
  const allCategories = new Set(['vehicle_product']);
  const result = matchRegulatorySignals({ answers: { installedAsPartOfVehicle: 'yes' } }, allCategories, REGULATORY_SIGNAL_RULES);
  assert.equal(result.signals.length, 1);
  assert.equal(result.signals[0].ruleId, 'vehicle-installed-product');
});

test('7. vehicle-context-inference.js no longer infers vehicleFunctionCategory, but installedAsPartOfVehicle inference is unchanged', () => {
  const lighting = inferVehicleContextAnswers(['פנס לרכב']);
  assert.equal('vehicleFunctionCategory' in lighting, false);

  const installed = inferVehicleContextAnswers(['פנס קדמי להתקנה ברכב פרטי']);
  assert.equal(installed.installedAsPartOfVehicle, 'yes');
  assert.equal('vehicleFunctionCategory' in installed, false);
});

test('8. no question id in the registry references any vehicle-function-category concept', () => {
  for (const q of REGULATORY_FOLLOWUP_QUESTIONS) {
    assert.ok(!q.id.toLowerCase().includes('functioncategory'));
  }
});

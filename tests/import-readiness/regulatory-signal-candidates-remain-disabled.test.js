import test from 'node:test';
import assert from 'node:assert/strict';
import { REGULATORY_SIGNAL_RULES } from '../../js/import-readiness/regulatory-signals/rules-registry.js';
import { RULE_STATUS, isPubliclyEligible } from '../../js/import-readiness/regulatory-signals/rule-status.js';
import { evaluateRegulatorySignals } from '../../js/import-readiness/regulatory-signals/index.js';
import { matchRegulatorySignals } from '../../js/import-readiness/regulatory-signals/matcher.js';

// THIS IS THE SAFETY-BOUNDARY TEST FOR THE PRODUCT-OWNER EXPERT-AUTHORED
// ARCHITECTURE. It exists at this top-level path (not nested under
// regulatory-signals/) specifically so it is picked up by the CI glob
// in .github/workflows/frontend-ci.yml, which does not recurse into
// subdirectories. It must never be deleted, weakened, or moved out of
// CI's reach.
//
// On 2026-08-17 the product owner (a qualified customs professional)
// supplied verbatim public-facing content for all 5 pilot rules and
// deliberately approved each one for controlled pilot use. This test no
// longer asserts the rules stay silent -- it asserts the boundaries that
// must hold true regardless: exactly these 5 rules, none upgraded to a
// claim of official-source support, and the structural gate is still
// genuinely enforced rather than bypassed by a status flip alone.

const EXPECTED_IDS = [
  'mains-connected-electrical-product',
  'plastic-direct-food-contact',
  'polymer-coated-direct-food-contact',
  'glass-food-contact-vessel',
  'vehicle-installed-product',
];

test('1. the registry has exactly the 5 approved rules, by their canonical ids -- no rule was added or removed', () => {
  assert.equal(REGULATORY_SIGNAL_RULES.length, 5);
  assert.deepEqual(REGULATORY_SIGNAL_RULES.map((r) => r.id).sort(), [...EXPECTED_IDS].sort());
});

test('2. every rule is expert_approved_for_pilot -- not official_source_supported, not any other status', () => {
  for (const rule of REGULATORY_SIGNAL_RULES) {
    assert.equal(rule.status, RULE_STATUS.EXPERT_APPROVED_FOR_PILOT, `${rule.id} status must be exactly expert_approved_for_pilot`);
  }
});

test('3. no rule carries an officialSources entry -- approval was not represented as official-source-backed', () => {
  for (const rule of REGULATORY_SIGNAL_RULES) {
    assert.deepEqual(rule.officialSources, [], `${rule.id} must not carry an official source; approval is expert-authored, not official-source-supported`);
  }
});

test('4. every rule now clears the hard publication gate', () => {
  for (const rule of REGULATORY_SIGNAL_RULES) {
    assert.equal(isPubliclyEligible(rule), true, `${rule.id} must clear the gate now that content is filled in and status is approved`);
  }
});

test('5. every rule\'s public-facing content fields are non-empty and verificationItems has 1-3 items', () => {
  for (const rule of REGULATORY_SIGNAL_RULES) {
    assert.ok(rule.publicTitle.length > 0, `${rule.id} publicTitle must be filled in`);
    assert.ok(rule.primaryExplanation.length > 0, `${rule.id} primaryExplanation must be filled in`);
    assert.ok(rule.potentialImplication.length > 0, `${rule.id} potentialImplication must be filled in`);
    assert.ok(rule.professionalReason.length > 0, `${rule.id} professionalReason must be filled in`);
    assert.ok(rule.verificationItems.length > 0 && rule.verificationItems.length <= 3, `${rule.id} verificationItems must have 1-3 items`);
  }
});

test('6. when every trigger condition is satisfied for every rule, the real matcher produces signals (capped at 3)', () => {
  const allCategories = new Set(REGULATORY_SIGNAL_RULES.map((r) => r.internalCategory));
  const result = matchRegulatorySignals({
    answers: {
      mainsConnectedOrSuppliedAdapter: 'yes',
      directFoodOrDrinkContact: 'yes',
      directContactMaterial: 'plastic',
      hasInternalCoating: 'yes',
      coatingDirectFoodOrDrinkContact: 'yes',
      coatingMaterial: 'plastic_or_polymer',
      glassVesselDirectFoodOrDrinkContact: 'yes',
      installedAsPartOfVehicle: 'yes',
      vehicleFunctionCategory: 'lighting',
    },
  }, allCategories, REGULATORY_SIGNAL_RULES);
  assert.ok(result.signals.length > 0, 'at least one rule should produce a public signal now that content fields are filled in and status is approved');
  assert.ok(result.signals.length <= 3, 'signals must stay capped at 3 per the existing matcher contract');
});

test('7. the public evaluateRegulatorySignals() entry point never claims a final classification, import approval, or exemption, even when a signal actually fires', () => {
  // Confirming answers included so each hint actually produces a signal --
  // without them, trigger predicates never fire and this test would pass
  // vacuously without checking any real signal content.
  const scenarios = [
    { hint: 'מוצר חשמלי המתחבר לחשמל', answers: { mainsConnectedOrSuppliedAdapter: 'yes' } },
    { hint: 'קופסת פלסטיק לאחסון מזון', answers: { directFoodOrDrinkContact: 'yes', directContactMaterial: 'plastic' } },
    { hint: 'כוס נייר עם ציפוי פלסטיק פנימי למגע עם מזון', answers: { hasInternalCoating: 'yes', coatingDirectFoodOrDrinkContact: 'yes', coatingMaterial: 'plastic_or_polymer' } },
    { hint: 'כוס זכוכית להגשת מזון', answers: { glassVesselDirectFoodOrDrinkContact: 'yes' } },
    { hint: 'פנס קדמי לרכב', answers: { installedAsPartOfVehicle: 'yes' } },
  ];
  // "אישור יבוא" is deliberately excluded here: the required disclaimer
  // itself says "...ואינה מהווה סיווג מכס או אישור יבוא" (does NOT
  // constitute ... import approval) -- a plain substring match on that
  // phrase would false-positive on the correct negated disclaimer.
  const forbiddenAffirmativeTerms = ['המוצר מאושר', 'אושר לייבוא', 'סיווג מכס סופי', 'המוצר פטור', 'החלטה סופית'];
  let sawAtLeastOneSignal = false;
  for (const { hint, answers } of scenarios) {
    const evaluation = evaluateRegulatorySignals({ productName: hint, commercialDescription: hint }, { answers });
    if (evaluation === null) continue;
    for (const signal of evaluation.signals) {
      sawAtLeastOneSignal = true;
      const combined = `${signal.title} ${signal.identification} ${signal.implication} ${signal.limitation}`;
      for (const forbidden of forbiddenAffirmativeTerms) {
        assert.ok(!combined.includes(forbidden), `"${hint}" signal must not contain forbidden term "${forbidden}"`);
      }
      assert.ok(signal.limitation.includes('אינה מהווה'), `"${hint}" signal limitation must carry the negation disclaimer`);
    }
  }
  assert.ok(sawAtLeastOneSignal, 'this test must actually exercise at least one real signal, not pass vacuously');
});

test('8. no other questionnaire-architecture module imports or re-exports a rule set of its own', async () => {
  const layered = await import('../../js/import-readiness/layered-question-model.js');
  const brief = await import('../../js/import-readiness/result-brief.js');
  const docs = await import('../../js/import-readiness/document-readiness.js');
  const multiSignal = await import('../../js/import-readiness/multi-signal-presentation.js');
  for (const mod of [layered, brief, docs, multiSignal]) {
    assert.ok(!('REGULATORY_SIGNAL_RULES' in mod), 'other modules must not re-export or shadow the one canonical rule registry');
  }
});

test('9. a synthetic rule with real content but status reverted to expert_authored is rejected by the gate -- approval must be an explicit, deliberate status', () => {
  const clone = { ...REGULATORY_SIGNAL_RULES[0], status: RULE_STATUS.EXPERT_AUTHORED };
  assert.equal(isPubliclyEligible(clone), false, 'content alone is not enough -- status must be deliberately expert_approved_for_pilot or official_source_supported');
});

test('10. a synthetic rule claiming official_source_supported without any officialSources entry is rejected by the gate', () => {
  const clone = { ...REGULATORY_SIGNAL_RULES[0], status: RULE_STATUS.OFFICIAL_SOURCE_SUPPORTED, officialSources: [] };
  assert.equal(isPubliclyEligible(clone), false, 'official_source_supported must require at least one real officialSources entry, not just the label');
});

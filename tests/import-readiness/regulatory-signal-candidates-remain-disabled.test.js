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
// The five rules (mains-connected-electrical-product,
// plastic-direct-food-contact, polymer-coated-direct-food-contact,
// glass-food-contact-vessel, vehicle-installed-product) have real,
// product-owner-specified mechanical structure (triggers, exclusions,
// question wiring, professional routing) but their PUBLIC-FACING
// CONTENT FIELDS (publicTitle, primaryExplanation, potentialImplication)
// are deliberately left empty pending direct product-owner content
// entry -- see rules-registry.js's header comment and
// docs/product-owner-rule-authoring-guide.md. Empty content fields
// alone are enough to fail `isPubliclyEligible()`, independent of
// `status`, so every rule below must remain structurally silent no
// matter what answers are supplied.

const EXPECTED_IDS = [
  'mains-connected-electrical-product',
  'plastic-direct-food-contact',
  'polymer-coated-direct-food-contact',
  'glass-food-contact-vessel',
  'vehicle-installed-product',
];

test('1. the registry has exactly the 5 expert-authored rules, by their canonical ids', () => {
  assert.equal(REGULATORY_SIGNAL_RULES.length, 5);
  assert.deepEqual(REGULATORY_SIGNAL_RULES.map((r) => r.id).sort(), [...EXPECTED_IDS].sort());
});

test('2. every rule is expert_authored -- not expert_approved_for_pilot, not official_source_supported, not any other status', () => {
  for (const rule of REGULATORY_SIGNAL_RULES) {
    assert.equal(rule.status, RULE_STATUS.EXPERT_AUTHORED, `${rule.id} status must stay expert_authored until the product owner deliberately approves it`);
  }
});

test('3. every rule therefore still fails the hard publication gate', () => {
  for (const rule of REGULATORY_SIGNAL_RULES) {
    assert.equal(isPubliclyEligible(rule), false, `${rule.id} must not clear the gate`);
  }
});

test('4. every rule\'s public-facing content fields (title, identification, implication) are still empty, pending direct product-owner entry', () => {
  for (const rule of REGULATORY_SIGNAL_RULES) {
    assert.equal(rule.publicTitle, '', `${rule.id} publicTitle must be empty until the product owner fills it in`);
    assert.equal(rule.primaryExplanation, '', `${rule.id} primaryExplanation must be empty until the product owner fills it in`);
    assert.equal(rule.potentialImplication, '', `${rule.id} potentialImplication must be empty until the product owner fills it in`);
    assert.equal(rule.professionalReason, '', `${rule.id} professionalReason must be empty until the product owner fills it in`);
    assert.deepEqual(rule.verificationItems, [], `${rule.id} verificationItems must be empty until the product owner fills them in`);
  }
});

test('5. even if every trigger condition is satisfied for every rule, no signal card is produced through the real matcher', () => {
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
  assert.equal(result.signals.length, 0, 'no rule should ever produce a public signal while its content fields stay empty, regardless of trigger predicates matching');
});

test('6. the public evaluateRegulatorySignals() entry point never surfaces a signal for any product-name/description hint', () => {
  const hints = [
    'מוצר חשמלי המתחבר לחשמל', 'קופסת פלסטיק לאחסון מזון', 'כוס נייר עם ציפוי פלסטיק פנימי למגע עם מזון',
    'כוס זכוכית להגשת מזון', 'חלק רכב', 'פנס קדמי לרכב',
  ];
  for (const hint of hints) {
    const evaluation = evaluateRegulatorySignals({ productName: hint, commercialDescription: hint });
    if (evaluation !== null) {
      assert.equal(evaluation.signals.length, 0, `"${hint}" must not produce a public signal`);
    }
  }
});

test('7. no other questionnaire-architecture module imports or re-exports a rule set of its own', async () => {
  const layered = await import('../../js/import-readiness/layered-question-model.js');
  const brief = await import('../../js/import-readiness/result-brief.js');
  const docs = await import('../../js/import-readiness/document-readiness.js');
  const multiSignal = await import('../../js/import-readiness/multi-signal-presentation.js');
  for (const mod of [layered, brief, docs, multiSignal]) {
    assert.ok(!('REGULATORY_SIGNAL_RULES' in mod), 'other modules must not re-export or shadow the one canonical rule registry');
  }
});

test('8. approving a rule requires a deliberate content edit, not a status flip alone -- a synthetic clone with status flipped but content still empty stays silent', () => {
  const clone = { ...REGULATORY_SIGNAL_RULES[0], status: RULE_STATUS.EXPERT_APPROVED_FOR_PILOT, verifiedDate: '2026-01-01', reviewDueDate: '2026-07-01' };
  assert.equal(isPubliclyEligible(clone), false, 'flipping status alone, with publicTitle/primaryExplanation/potentialImplication still empty, must not clear the gate');
});

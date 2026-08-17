import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EVIDENCE_PACKAGE_REQUIRED_FIELDS,
  REVIEWER_STATUS,
  validateEvidencePackage,
  toRuleShape,
  isEligibleForControlledPilot,
  eligibleRuleShapesFromPackages,
} from '../../js/import-readiness/regulatory-signals/evidence-package.js';
import { RULE_STATUS, isPubliclyEligible } from '../../js/import-readiness/regulatory-signals/rule-status.js';
import { matchRegulatorySignals } from '../../js/import-readiness/regulatory-signals/matcher.js';
import { REGULATORY_SIGNAL_RULES } from '../../js/import-readiness/regulatory-signals/rules-registry.js';
import { GLASS_FOOD_CONTACT_VESSEL_EVIDENCE } from '../../js/import-readiness/regulatory-signals/evidence-packages/glass-food-contact-vessel.evidence.js';
import { EVIDENCE_PACKAGES, getEligiblePilotRuleShapes } from '../../js/import-readiness/regulatory-signals/evidence-packages/index.js';

// THIS IS A CI-COVERED SAFETY TEST for the evidence-package intake
// format. It lives at this top-level path (not nested under
// regulatory-signals/) specifically so it is picked up by the CI glob
// in .github/workflows/frontend-ci.yml, which does not recurse into
// subdirectories -- same convention as
// regulatory-signal-candidates-remain-disabled.test.js.
//
// ALL fixture data below is clearly synthetic test-only content
// (EXAMPLE-TEST-RULE-001 / "test-trigger-only" style values) -- never
// real-sounding regulatory-category content, and never one of the 5
// real candidate categories.

function buildValidSyntheticPackage(overrides = {}) {
  return {
    ruleId: 'EXAMPLE-TEST-RULE-001',
    publicCategory: 'example_test_category_only',
    triggerPhrases: ['test-trigger-only', 'synthetic-fixture-phrase'],
    confirmationQuestions: [{ questionId: 'exampleTestQuestion', legend: 'EXAMPLE test-only question -- not real regulatory content?' }],
    activationConditions: [{ questionId: 'exampleTestQuestion', equals: 'yes' }],
    exclusions: [],
    publicHebrewWording: {
      identification: 'EXAMPLE (synthetic test fixture) -- זוהה מאפיין בדיקה בלבד.',
      implication: 'EXAMPLE (synthetic test fixture) -- אין בכך תוכן רגולטורי אמיתי.',
    },
    verificationItems: ['EXAMPLE test verification item only'],
    primaryVerificationProfessional: 'CUSTOMS_CLASSIFIER',
    professionalReason: 'EXAMPLE test-only professional-reason fixture text.',
    officialSourceTitle: 'EXAMPLE Test Fixture Source Title',
    issuingAuthority: 'EXAMPLE Test Fixture Authority',
    exactSourceUrl: 'https://example.invalid/test-fixture-source',
    tariffOrStandardReference: 'EXAMPLE-TEST-STANDARD-0000',
    verificationDate: '2026-01-01',
    reviewDueDate: '2026-07-01',
    reviewerStatus: REVIEWER_STATUS.PRODUCT_OWNER_REVIEWED,
    activeOrDisabledStatus: RULE_STATUS.APPROVED_FOR_PILOT,
    publicLimitationWording: 'EXAMPLE (synthetic test fixture) -- התוצאה היא בדיקה ראשונית בלבד.',
    ...overrides,
  };
}

test('1. schema has exactly the 19 specified required fields', () => {
  assert.equal(EVIDENCE_PACKAGE_REQUIRED_FIELDS.length, 19);
  const expected = [
    'ruleId', 'publicCategory', 'triggerPhrases', 'confirmationQuestions', 'activationConditions',
    'exclusions', 'publicHebrewWording', 'verificationItems', 'primaryVerificationProfessional',
    'professionalReason', 'officialSourceTitle', 'issuingAuthority', 'exactSourceUrl',
    'tariffOrStandardReference', 'verificationDate', 'reviewDueDate', 'reviewerStatus',
    'activeOrDisabledStatus', 'publicLimitationWording',
  ];
  assert.deepEqual([...EVIDENCE_PACKAGE_REQUIRED_FIELDS].sort(), [...expected].sort());
});

test('2. a complete, valid synthetic package passes validation', () => {
  const result = validateEvidencePackage(buildValidSyntheticPackage());
  assert.equal(result.valid, true, `expected valid, got errors: ${result.errors.join('; ')}`);
  assert.equal(result.errors.length, 0);
});

test('3. rejects a package missing an official source (title, authority, or URL) one at a time', () => {
  const missingTitle = validateEvidencePackage(buildValidSyntheticPackage({ officialSourceTitle: '' }));
  const missingAuthority = validateEvidencePackage(buildValidSyntheticPackage({ issuingAuthority: '' }));
  const missingUrl = validateEvidencePackage(buildValidSyntheticPackage({ exactSourceUrl: '' }));
  assert.equal(missingTitle.valid, false);
  assert.equal(missingAuthority.valid, false);
  assert.equal(missingUrl.valid, false);
});

test('4. rejects a package missing verificationDate', () => {
  const result = validateEvidencePackage(buildValidSyntheticPackage({ verificationDate: '' }));
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('verificationDate')));
});

test('5. rejects a package missing reviewDueDate', () => {
  const result = validateEvidencePackage(buildValidSyntheticPackage({ reviewDueDate: '' }));
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('reviewDueDate')));
});

test('6. rejects a package missing exclusions entirely (field must exist, even if empty array)', () => {
  const result = validateEvidencePackage(buildValidSyntheticPackage({ exclusions: undefined }));
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('exclusions')));
});

test('7. an empty exclusions array (honestly "none identified") is allowed -- only a missing field is rejected', () => {
  const result = validateEvidencePackage(buildValidSyntheticPackage({ exclusions: [] }));
  assert.equal(result.valid, true, `expected valid, got errors: ${result.errors.join('; ')}`);
});

test('8. rejects a package missing the professional-verification path (professional or reason)', () => {
  const missingProfessional = validateEvidencePackage(buildValidSyntheticPackage({ primaryVerificationProfessional: '' }));
  const missingReason = validateEvidencePackage(buildValidSyntheticPackage({ professionalReason: '' }));
  assert.equal(missingProfessional.valid, false);
  assert.equal(missingReason.valid, false);
});

test('9. rejects a package missing safe public limitation wording', () => {
  const result = validateEvidencePackage(buildValidSyntheticPackage({ publicLimitationWording: '' }));
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('publicLimitationWording')));
});

test('10. rejects a package missing any other individual required field, one at a time', () => {
  for (const field of EVIDENCE_PACKAGE_REQUIRED_FIELDS) {
    const broken = buildValidSyntheticPackage({ [field]: undefined });
    const result = validateEvidencePackage(broken);
    assert.equal(result.valid, false, `expected rejection when "${field}" is missing`);
  }
});

test('11. an invalid package can never be adapted into a publicly eligible rule shape', () => {
  const incomplete = buildValidSyntheticPackage({ verificationDate: '' });
  assert.equal(isEligibleForControlledPilot(incomplete), false);
});

test('12. a complete package NOT marked "approved for controlled pilot" produces zero output, even though otherwise valid', () => {
  const notApproved = buildValidSyntheticPackage({ activeOrDisabledStatus: RULE_STATUS.PROFESSIONAL_REVIEW_REQUIRED });
  assert.equal(validateEvidencePackage(notApproved).valid, true, 'package itself is schema-complete');
  assert.equal(isEligibleForControlledPilot(notApproved), false, 'must still be ineligible without explicit approval');

  const rule = toRuleShape(notApproved);
  const result = matchRegulatorySignals(
    { answers: { exampleTestQuestion: 'yes' } },
    new Set([rule.internalCategory]),
    [rule]
  );
  assert.equal(result.signals.length, 0, 'unapproved package must produce zero signals through the real matcher');
});

test('13. a complete package explicitly marked "approved for controlled pilot" CAN produce output through the standard matcher/gate pipeline', () => {
  const approved = buildValidSyntheticPackage();
  assert.equal(isEligibleForControlledPilot(approved), true);

  const rule = toRuleShape(approved);
  assert.equal(isPubliclyEligible(rule), true);

  const result = matchRegulatorySignals(
    { answers: { exampleTestQuestion: 'yes' }, now: new Date('2026-03-01') },
    new Set([rule.internalCategory]),
    [rule]
  );
  assert.equal(result.signals.length, 1, 'approved+matched synthetic package must produce exactly one signal card');
  assert.equal(result.signals[0].ruleId, 'EXAMPLE-TEST-RULE-001');
});

test('14. "approved for controlled pilot" maps to the SAME RULE_STATUS.APPROVED_FOR_PILOT already used elsewhere -- not a second parallel status system', () => {
  const approved = buildValidSyntheticPackage();
  assert.equal(approved.activeOrDisabledStatus, RULE_STATUS.APPROVED_FOR_PILOT);
  assert.equal(RULE_STATUS.APPROVED_FOR_PILOT, 'approved_for_pilot');
});

test('15. free text can only ever suggest a confirmation question, never itself satisfy an evidence-package trigger', () => {
  const approved = buildValidSyntheticPackage();
  const rule = toRuleShape(approved);
  // No closed-choice answer given at all -- only "free text" would have
  // hinted at this category. The trigger must not fire.
  const result = matchRegulatorySignals({ answers: {} }, new Set([rule.internalCategory]), [rule]);
  assert.equal(result.signals.length, 0, 'a hinted category with no closed-choice yes-answer must never produce a signal');

  // Explicitly wrong/unknown answer must not fire it either.
  const resultUnknown = matchRegulatorySignals({ answers: { exampleTestQuestion: 'unknown' } }, new Set([rule.internalCategory]), [rule]);
  assert.equal(resultUnknown.signals.length, 0);
});

test('16. the glass-food-contact-vessel evidence-package template is present but fails validation (placeholder, not real content)', () => {
  const result = validateEvidencePackage(GLASS_FOOD_CONTACT_VESSEL_EVIDENCE);
  assert.equal(result.valid, false, 'the template must stay incomplete until the product owner fills in real content');
  assert.ok(result.errors.length > 0);
});

test('17. the glass-food-contact-vessel template is pinned to RULE_STATUS.DISABLED, not approved_for_pilot', () => {
  assert.equal(GLASS_FOOD_CONTACT_VESSEL_EVIDENCE.activeOrDisabledStatus, RULE_STATUS.DISABLED);
});

test('18. the glass-food-contact-vessel template is therefore ineligible for the controlled pilot no matter what', () => {
  assert.equal(isEligibleForControlledPilot(GLASS_FOOD_CONTACT_VESSEL_EVIDENCE), false);
});

test('19. the registered evidence-packages list produces zero eligible pilot rule shapes today', () => {
  // Now 5 registered scaffolds (one per candidate category), all still
  // placeholder-empty and pinned DISABLED -- see
  // tests/import-readiness/product-owner-scaffolds.test.js for the
  // per-scaffold coverage added alongside this expansion.
  assert.equal(EVIDENCE_PACKAGES.length, 5);
  assert.deepEqual(getEligiblePilotRuleShapes(), []);
});

test('20. eligibleRuleShapesFromPackages() silently drops invalid/unapproved packages rather than partially including them', () => {
  const mixed = [
    buildValidSyntheticPackage(), // eligible
    buildValidSyntheticPackage({ ruleId: 'EXAMPLE-TEST-RULE-002', activeOrDisabledStatus: RULE_STATUS.DISABLED }), // not approved
    buildValidSyntheticPackage({ ruleId: 'EXAMPLE-TEST-RULE-003', verificationDate: '' }), // invalid
    GLASS_FOOD_CONTACT_VESSEL_EVIDENCE, // invalid placeholder
  ];
  const eligible = eligibleRuleShapesFromPackages(mixed);
  assert.equal(eligible.length, 1);
  assert.equal(eligible[0].id, 'EXAMPLE-TEST-RULE-001');
});

test('21. regression -- none of the 5 real existing candidates appear anywhere in the evidence-packages registry', () => {
  const realIds = new Set(REGULATORY_SIGNAL_RULES.map((r) => r.id));
  for (const pkg of EVIDENCE_PACKAGES) {
    assert.ok(!realIds.has(pkg.ruleId) || pkg.activeOrDisabledStatus === RULE_STATUS.DISABLED,
      'any package reusing a real candidate id must stay pinned to disabled until genuinely supplied');
  }
});

test('22. regression -- the 5 real candidates are still all professional_review_required and gate-blocked (unaffected by this intake format)', () => {
  for (const rule of REGULATORY_SIGNAL_RULES) {
    assert.equal(rule.status, RULE_STATUS.PROFESSIONAL_REVIEW_REQUIRED);
    assert.equal(isPubliclyEligible(rule), false);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { REGULATORY_SIGNAL_RULES } from '../../../js/import-readiness/regulatory-signals/rules-registry.js';
import { RULE_STATUS, isPubliclyEligible } from '../../../js/import-readiness/regulatory-signals/rule-status.js';
import { PROFESSIONAL_CATEGORY } from '../../../js/import-readiness/professional-category-registry.js';

// This suite is the honesty check for the pilot's real rule registry
// under the product-owner-directed expert-authored model. On
// 2026-08-17 the product owner supplied verbatim public-facing content
// for all 5 rules and deliberately approved each for controlled pilot
// use -- this suite now asserts that approved state honestly (real
// content, real approval status, no fabricated official source, no
// fabricated reviewer identity beyond role-based attribution).

test('1. the registry has exactly the 5 expert-approved rules (the 5 product-owner-directed categories)', () => {
  assert.equal(REGULATORY_SIGNAL_RULES.length, 5);
});

test('2. every rule in the real registry is expert_approved_for_pilot, not official_source_supported', () => {
  for (const rule of REGULATORY_SIGNAL_RULES) {
    assert.equal(rule.status, RULE_STATUS.EXPERT_APPROVED_FOR_PILOT, `${rule.id} should be expert_approved_for_pilot`);
    assert.notEqual(rule.status, RULE_STATUS.OFFICIAL_SOURCE_SUPPORTED, `${rule.id} must not claim official_source_supported`);
  }
});

test('3. every rule in the real registry therefore clears the hard publication gate', () => {
  for (const rule of REGULATORY_SIGNAL_RULES) {
    assert.equal(isPubliclyEligible(rule), true, `${rule.id} must clear the gate`);
  }
});

test('4. no rule fabricates an official source -- officialSources stays empty (official sources are optional supporting evidence, never required for expert_approved_for_pilot)', () => {
  for (const rule of REGULATORY_SIGNAL_RULES) {
    assert.deepEqual(rule.officialSources, [], `${rule.id} must not carry a fabricated official source`);
  }
});

test('5. every rule documents internal notes explaining its research history and that content was supplied and approved by the product owner', () => {
  for (const rule of REGULATORY_SIGNAL_RULES) {
    assert.ok(typeof rule.internalNotes === 'string' && rule.internalNotes.length > 40, `${rule.id} needs real internal notes`);
    assert.ok(rule.internalNotes.includes('approved for controlled pilot'), `${rule.id} internal notes must record the approval`);
  }
});

test('6. no rule carries a fabricated reviewer name -- reviewedBy and authoredByRole are role-based only, never a personal name', () => {
  for (const rule of REGULATORY_SIGNAL_RULES) {
    assert.equal(rule.reviewedBy, 'qualified-customs-professional-product-owner', `${rule.id} reviewedBy must be role-based only, never a personal name`);
    assert.equal(rule.authoredByRole, 'qualified-customs-professional-product-owner', `${rule.id} must attribute authorship by role only, never a personal name`);
  }
});

test('7. every rule carries a genuine, valid verifiedDate and reviewDueDate now that it is approved', () => {
  for (const rule of REGULATORY_SIGNAL_RULES) {
    assert.ok(typeof rule.verifiedDate === 'string' && !Number.isNaN(new Date(rule.verifiedDate).getTime()), `${rule.id} verifiedDate must be a valid date now that it is approved`);
    assert.ok(typeof rule.reviewDueDate === 'string' && !Number.isNaN(new Date(rule.reviewDueDate).getTime()), `${rule.id} reviewDueDate must be a valid date now that it is approved`);
    assert.ok(new Date(rule.reviewDueDate).getTime() > new Date(rule.verifiedDate).getTime(), `${rule.id} reviewDueDate must be after verifiedDate`);
  }
});

test('8. every rule names a real professional-category key that exists in the shared registry', () => {
  for (const rule of REGULATORY_SIGNAL_RULES) {
    assert.ok(PROFESSIONAL_CATEGORY[rule.professionalCategory], `${rule.id} professionalCategory "${rule.professionalCategory}" must exist`);
    if (rule.secondaryProfessionalCategory) {
      assert.ok(PROFESSIONAL_CATEGORY[rule.secondaryProfessionalCategory], `${rule.id} secondaryProfessionalCategory must exist`);
    }
  }
});

test('9. every rule carries a non-empty shared public limitation sentence, ready for use the day it is approved', () => {
  for (const rule of REGULATORY_SIGNAL_RULES) {
    assert.ok(typeof rule.publicLimitationText === 'string' && rule.publicLimitationText.length > 0);
  }
});

test('10. every rule has at most 3 verification items', () => {
  for (const rule of REGULATORY_SIGNAL_RULES) {
    assert.ok(rule.verificationItems.length <= 3, `${rule.id} must have at most 3 verification items`);
  }
});

test('11. every rule has between 1 and 3 follow-up questions wired, matching the product owner\'s exact specification per rule', () => {
  for (const rule of REGULATORY_SIGNAL_RULES) {
    assert.ok(rule.followUpQuestionIds.length >= 1 && rule.followUpQuestionIds.length <= 3, `${rule.id} should have 1-3 closed-choice confirmations`);
  }
});

test('12. the five target categories are all present (electrical, plastic food-contact, polymer-coating food-contact, glass food-contact, vehicle)', () => {
  const categories = new Set(REGULATORY_SIGNAL_RULES.map((r) => r.internalCategory));
  assert.ok(categories.has('electrical_mains_product'));
  assert.ok(categories.has('plastic_food_contact'));
  assert.ok(categories.has('polymer_coating_food_contact'));
  assert.ok(categories.has('glass_food_contact'));
  assert.ok(categories.has('vehicle_product'));
});

test('13. every rule uses the exact five canonical ids specified by the product owner', () => {
  const ids = REGULATORY_SIGNAL_RULES.map((r) => r.id).sort();
  assert.deepEqual(ids, [
    'glass-food-contact-vessel',
    'mains-connected-electrical-product',
    'plastic-direct-food-contact',
    'polymer-coated-direct-food-contact',
    'vehicle-installed-product',
  ]);
});

test('14. every rule has a real exclusionPredicate function (even when it currently always returns false)', () => {
  for (const rule of REGULATORY_SIGNAL_RULES) {
    assert.equal(typeof rule.exclusionPredicate, 'function', `${rule.id} needs an exclusionPredicate function`);
  }
});

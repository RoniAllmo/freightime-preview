import test from 'node:test';
import assert from 'node:assert/strict';
import { REGULATORY_SIGNAL_RULES } from '../../../js/import-readiness/regulatory-signals/rules-registry.js';
import { RULE_STATUS, isPubliclyEligible } from '../../../js/import-readiness/regulatory-signals/rule-status.js';
import { PROFESSIONAL_CATEGORY } from '../../../js/import-readiness/professional-category-registry.js';

// This suite is the honesty check for the pilot's real candidate
// registry. It intentionally does NOT assert that any rule is
// approved -- if the research the pilot actually completed in this
// environment did not clear the verification bar, that must show up
// here as zero approved rules, not be papered over.

test('1. the registry has exactly 5 researched candidates (the 5 target categories)', () => {
  assert.equal(REGULATORY_SIGNAL_RULES.length, 5);
});

test('2. no rule in the real registry is approved_for_pilot (honest research outcome -- WebFetch to every official source tested returned EGRESS_BLOCKED in this environment, so no primary source could be directly read and confirmed)', () => {
  for (const rule of REGULATORY_SIGNAL_RULES) {
    assert.notEqual(rule.status, RULE_STATUS.APPROVED_FOR_PILOT, `${rule.id} must not be approved_for_pilot`);
  }
});

test('3. every rule in the real registry therefore fails the hard publication gate', () => {
  for (const rule of REGULATORY_SIGNAL_RULES) {
    assert.equal(isPubliclyEligible(rule), false, `${rule.id} must not clear the gate`);
  }
});

test('4. every candidate still carries at least one real-looking official source with a URL, for the evidence record', () => {
  for (const rule of REGULATORY_SIGNAL_RULES) {
    assert.ok(Array.isArray(rule.officialSources) && rule.officialSources.length > 0, `${rule.id} needs a source`);
    for (const source of rule.officialSources) {
      assert.ok(typeof source.url === 'string' && source.url.startsWith('https://'), `${rule.id} source needs a real https URL`);
      assert.ok(typeof source.title === 'string' && source.title.length > 0);
      assert.ok(typeof source.authority === 'string' && source.authority.length > 0);
    }
  }
});

test('5. every candidate documents internal notes explaining exactly why it is not verified (never silently disabled)', () => {
  for (const rule of REGULATORY_SIGNAL_RULES) {
    assert.ok(typeof rule.internalNotes === 'string' && rule.internalNotes.length > 40, `${rule.id} needs real internal notes`);
  }
});

test('6. no candidate carries a fabricated reviewer name -- reviewedBy stays unfilled', () => {
  for (const rule of REGULATORY_SIGNAL_RULES) {
    assert.equal(rule.reviewedBy, null, `${rule.id} must not invent a reviewer`);
  }
});

test('7. no candidate carries a fabricated verifiedDate/reviewDueDate (unverified rules stay null, never a made-up date)', () => {
  for (const rule of REGULATORY_SIGNAL_RULES) {
    assert.equal(rule.verifiedDate, null, `${rule.id} verifiedDate must stay null while unverified`);
    assert.equal(rule.reviewDueDate, null, `${rule.id} reviewDueDate must stay null while unverified`);
  }
});

test('8. every candidate names a real professional-category key that exists in the shared registry', () => {
  for (const rule of REGULATORY_SIGNAL_RULES) {
    assert.ok(PROFESSIONAL_CATEGORY[rule.professionalCategory], `${rule.id} professionalCategory "${rule.professionalCategory}" must exist`);
    if (rule.secondaryProfessionalCategory) {
      assert.ok(PROFESSIONAL_CATEGORY[rule.secondaryProfessionalCategory], `${rule.id} secondaryProfessionalCategory must exist`);
    }
  }
});

test('9. every candidate carries a non-empty public limitation sentence, ready for use the day it might be approved', () => {
  for (const rule of REGULATORY_SIGNAL_RULES) {
    assert.ok(typeof rule.publicLimitationText === 'string' && rule.publicLimitationText.length > 0);
  }
});

test('10. every candidate has at most 3 verification items', () => {
  for (const rule of REGULATORY_SIGNAL_RULES) {
    assert.ok(rule.verificationItems.length <= 3, `${rule.id} must have at most 3 verification items`);
  }
});

test('11. every candidate has exactly one follow-up question wired (minimal by design)', () => {
  for (const rule of REGULATORY_SIGNAL_RULES) {
    assert.equal(rule.followUpQuestionIds.length, 1, `${rule.id} should need exactly one closed-choice confirmation`);
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

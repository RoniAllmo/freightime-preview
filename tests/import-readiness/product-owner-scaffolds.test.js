import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateEvidencePackage,
  validateAuthoringScaffoldExtras,
  validateAuthoringScaffoldReadyForReview,
  isEligibleForControlledPilot,
  findDuplicateRuleIdsWithinPackages,
  AUTHORING_SCAFFOLD_EXTRA_FIELDS,
  AUTHORITY_TYPE,
  REVIEWER_STATUS,
} from '../../js/import-readiness/regulatory-signals/evidence-package.js';
import { RULE_STATUS, isPubliclyEligible } from '../../js/import-readiness/regulatory-signals/rule-status.js';
import { scanForBannedAbsoluteClaims } from '../../js/import-readiness/regulatory-signals/language-safety.js';
import { matchRegulatorySignals } from '../../js/import-readiness/regulatory-signals/matcher.js';
import { REGULATORY_SIGNAL_RULES } from '../../js/import-readiness/regulatory-signals/rules-registry.js';
import { EVIDENCE_PACKAGES, getEligiblePilotRuleShapes } from '../../js/import-readiness/regulatory-signals/evidence-packages/index.js';
import { COSMETICS_AND_TOILETRIES_EVIDENCE } from '../../js/import-readiness/regulatory-signals/evidence-packages/cosmetics-and-toiletries.evidence.js';
import { ELECTRICAL_PRODUCTS_EVIDENCE } from '../../js/import-readiness/regulatory-signals/evidence-packages/electrical-products.evidence.js';
import { POLYMER_FOOD_CONTACT_EVIDENCE } from '../../js/import-readiness/regulatory-signals/evidence-packages/polymer-food-contact.evidence.js';
import { GLASS_FOOD_CONTACT_VESSEL_EVIDENCE } from '../../js/import-readiness/regulatory-signals/evidence-packages/glass-food-contact-vessel.evidence.js';
import { VEHICLE_INSTALLED_PRODUCT_EVIDENCE } from '../../js/import-readiness/regulatory-signals/evidence-packages/vehicle-installed-product.evidence.js';

// THIS IS A CI-COVERED SAFETY TEST for the 5 product-owner authoring
// scaffolds. Lives at this top-level path (not nested under
// regulatory-signals/) so it is picked up by the CI glob in
// .github/workflows/frontend-ci.yml, same convention as the other
// evidence-package/regulatory-signal safety tests.
//
// This file must NEVER assert that any of the 5 scaffolds becomes
// active or produces real output -- only that they exist, are
// structurally well-formed placeholders, stay inactive today, and are
// correctly rejected by the validator until a human product owner
// fills them in for real.

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

const SCAFFOLDS = Object.freeze([
  { name: 'cosmetics-and-toiletries', path: 'js/import-readiness/regulatory-signals/evidence-packages/cosmetics-and-toiletries.evidence.js', pkg: COSMETICS_AND_TOILETRIES_EVIDENCE },
  { name: 'electrical-products', path: 'js/import-readiness/regulatory-signals/evidence-packages/electrical-products.evidence.js', pkg: ELECTRICAL_PRODUCTS_EVIDENCE },
  { name: 'polymer-food-contact', path: 'js/import-readiness/regulatory-signals/evidence-packages/polymer-food-contact.evidence.js', pkg: POLYMER_FOOD_CONTACT_EVIDENCE },
  { name: 'glass-food-contact-vessel', path: 'js/import-readiness/regulatory-signals/evidence-packages/glass-food-contact-vessel.evidence.js', pkg: GLASS_FOOD_CONTACT_VESSEL_EVIDENCE },
  { name: 'vehicle-installed-product', path: 'js/import-readiness/regulatory-signals/evidence-packages/vehicle-installed-product.evidence.js', pkg: VEHICLE_INSTALLED_PRODUCT_EVIDENCE },
]);

const AUTHORING_GUIDANCE_SENTENCE =
  'Content in this section must be entered directly by the FreighTime product owner. The scaffold must remain inactive until productOwnerAuthored is true and the required content validator passes.';

// Block comments wrap the sentence across multiple ` * `-prefixed
// lines -- normalize block-comment line noise before substring
// matching so this check reflects the actual sentence, not its exact
// on-disk line-wrapping.
function normalizeCommentText(text) {
  return text
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function listAllFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listAllFiles(full));
    else out.push(full);
  }
  return out;
}

// ---------------------------------------------------------------------
// 1. Existence
// ---------------------------------------------------------------------

test('1. all 5 scaffold files exist at their documented paths', () => {
  for (const s of SCAFFOLDS) {
    assert.doesNotThrow(() => statSync(join(repoRoot, s.path)), `${s.path} must exist`);
  }
});

test('2. all 5 scaffolds are registered in evidence-packages/index.js', () => {
  assert.equal(EVIDENCE_PACKAGES.length, 5);
  const registeredIds = new Set(EVIDENCE_PACKAGES.map((p) => p.ruleId));
  for (const s of SCAFFOLDS) {
    assert.ok(registeredIds.has(s.pkg.ruleId), `${s.name} (${s.pkg.ruleId}) must be registered`);
  }
});

// ---------------------------------------------------------------------
// 2. Inactive by default -- zero public output through the real pipeline
// ---------------------------------------------------------------------

test('3. every scaffold is pinned to RULE_STATUS.DISABLED', () => {
  for (const s of SCAFFOLDS) {
    assert.equal(s.pkg.activeOrDisabledStatus, RULE_STATUS.DISABLED, `${s.name} must be DISABLED`);
  }
});

test('4. every scaffold fails full schema validation (placeholder, not real content)', () => {
  for (const s of SCAFFOLDS) {
    const result = validateEvidencePackage(s.pkg);
    assert.equal(result.valid, false, `${s.name} must stay incomplete`);
    assert.ok(result.errors.length > 0);
  }
});

test('5. every scaffold is ineligible for the controlled pilot no matter what', () => {
  for (const s of SCAFFOLDS) {
    assert.equal(isEligibleForControlledPilot(s.pkg), false, `${s.name} must be ineligible`);
  }
});

test('6. the registered evidence-packages list produces zero eligible pilot rule shapes', () => {
  assert.deepEqual(getEligiblePilotRuleShapes(), []);
});

test('7. every scaffold produces zero signals through the real matcher pipeline even when force-fed as a candidate rule', () => {
  for (const s of SCAFFOLDS) {
    // toRuleShape() is only ever safe to call on a validated package;
    // this test deliberately calls it on an invalid one to prove that
    // even the resulting shape still cannot pass isPubliclyEligible /
    // reach the matcher's output -- belt-and-braces on top of test 5.
    const rule = {
      id: s.pkg.ruleId,
      publicTitle: s.pkg.publicHebrewWording.identification,
      internalCategory: s.pkg.publicCategory,
      status: s.pkg.activeOrDisabledStatus,
      triggerPredicate: () => true,
      exclusionPredicate: () => false,
      followUpQuestionIds: [],
      verifiedDate: null,
      reviewDueDate: null,
      officialSources: [],
      professionalCategory: '',
      publicLimitationText: '',
    };
    assert.equal(isPubliclyEligible(rule), false);
    const result = matchRegulatorySignals({ answers: {} }, new Set([s.pkg.publicCategory]), [rule]);
    assert.equal(result.signals.length, 0, `${s.name} must never produce a signal while disabled/incomplete`);
  }
});

// ---------------------------------------------------------------------
// 3. Rejection behavior
// ---------------------------------------------------------------------

test('8. productOwnerAuthored: false blocks activation even if every other field were somehow filled in', () => {
  const otherwiseComplete = {
    ruleId: 'TEST-SCAFFOLD-FIXTURE-001',
    publicCategory: 'test_scaffold_fixture_only',
    triggerPhrases: ['test-only-fixture-phrase'],
    confirmationQuestions: [{ questionId: 'fixtureQ', legend: 'TEST FIXTURE question only?' }],
    activationConditions: [{ questionId: 'fixtureQ', equals: 'yes' }],
    exclusions: [],
    publicHebrewWording: { identification: 'TEST FIXTURE ONLY', implication: 'TEST FIXTURE ONLY' },
    verificationItems: ['TEST FIXTURE ONLY'],
    primaryVerificationProfessional: 'CUSTOMS_CLASSIFIER',
    professionalReason: 'TEST FIXTURE ONLY',
    officialSourceTitle: 'TEST FIXTURE ONLY',
    issuingAuthority: 'TEST FIXTURE ONLY',
    exactSourceUrl: 'https://example.invalid/test-fixture',
    tariffOrStandardReference: 'TEST-FIXTURE-0000',
    verificationDate: '2026-01-01',
    reviewDueDate: '2026-07-01',
    reviewerStatus: REVIEWER_STATUS.PRODUCT_OWNER_REVIEWED,
    activeOrDisabledStatus: RULE_STATUS.APPROVED_FOR_PILOT,
    publicLimitationWording: 'TEST FIXTURE ONLY',
    authorityType: AUTHORITY_TYPE.PRODUCT_OWNER,
    productOwnerAuthored: false, // <-- the one thing left false
    lastProductOwnerReview: null,
    internalName: 'test-scaffold-fixture',
    changeNotes: [],
  };
  assert.equal(validateEvidencePackage(otherwiseComplete).valid, true, 'base 19-field schema is otherwise complete');
  const readyResult = validateAuthoringScaffoldReadyForReview(otherwiseComplete);
  assert.equal(readyResult.valid, false, 'must be rejected while productOwnerAuthored is false');
  assert.ok(readyResult.errors.some((e) => e.includes('productOwnerAuthored')));
});

test('9. an active status (approved_for_pilot) with empty content fields fails validation', () => {
  for (const s of SCAFFOLDS) {
    const forcedActive = { ...s.pkg, activeOrDisabledStatus: RULE_STATUS.APPROVED_FOR_PILOT };
    assert.equal(validateEvidencePackage(forcedActive).valid, false, `${s.name} with empty fields must fail even if forced active`);
    assert.equal(isEligibleForControlledPilot(forcedActive), false);
  }
});

test('10. an active status without triggers fails validation', () => {
  for (const s of SCAFFOLDS) {
    const forced = {
      ...s.pkg,
      activeOrDisabledStatus: RULE_STATUS.APPROVED_FOR_PILOT,
      triggerPhrases: [],
      activationConditions: [],
    };
    const result = validateEvidencePackage(forced);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('triggerPhrases') || e.includes('activationConditions')));
  }
});

test('11. duplicate ruleIds across the 5 scaffolds themselves are detected as errors', () => {
  const ids = SCAFFOLDS.map((s) => s.pkg.ruleId);
  assert.equal(new Set(ids).size, ids.length, 'the 5 scaffolds must not share a ruleId with each other');
  assert.deepEqual(findDuplicateRuleIdsWithinPackages(SCAFFOLDS.map((s) => s.pkg)), []);

  const withDuplicate = [...SCAFFOLDS.map((s) => s.pkg), { ruleId: SCAFFOLDS[0].pkg.ruleId }];
  assert.deepEqual(findDuplicateRuleIdsWithinPackages(withDuplicate), [SCAFFOLDS[0].pkg.ruleId]);
});

test('12. authorityType is required to be exactly "product_owner" for every scaffold', () => {
  for (const s of SCAFFOLDS) {
    assert.equal(s.pkg.authorityType, 'product_owner', `${s.name} authorityType must be "product_owner"`);
    assert.equal(validateAuthoringScaffoldExtras(s.pkg).valid, true, `${s.name} extras block must itself validate (only content fields are empty)`);
  }
  const wrongType = { ...SCAFFOLDS[0].pkg, authorityType: 'ai_agent' };
  const result = validateAuthoringScaffoldExtras(wrongType);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('authorityType')));
});

test('13. AUTHORING_SCAFFOLD_EXTRA_FIELDS lists exactly the 5 documented extra fields', () => {
  assert.deepEqual(
    [...AUTHORING_SCAFFOLD_EXTRA_FIELDS].sort(),
    ['authorityType', 'changeNotes', 'internalName', 'lastProductOwnerReview', 'productOwnerAuthored'].sort()
  );
});

test('14. banned absolute wording is rejected using an obviously-synthetic test fixture string', () => {
  const scan = scanForBannedAbsoluteClaims(['היבוא מאושר ללא כל בדיקה נוספת (SYNTHETIC TEST FIXTURE STRING ONLY)']);
  assert.equal(scan.ok, false);
  assert.ok(scan.violations.length > 0);
});

test('15. no scaffold currently contains any banned absolute wording (they are empty, so this is vacuously true, but checked directly)', () => {
  for (const s of SCAFFOLDS) {
    const strings = [
      s.pkg.publicHebrewWording.identification,
      s.pkg.publicHebrewWording.implication,
      s.pkg.publicLimitationWording,
      ...s.pkg.verificationItems,
    ];
    const scan = scanForBannedAbsoluteClaims(strings);
    assert.equal(scan.ok, true, `${s.name} must not contain banned wording`);
  }
});

// ---------------------------------------------------------------------
// 4. No external-dependency fields required at the schema level
// ---------------------------------------------------------------------

test('16. no url/citation/source-verification field is required for a scaffold to exist or be registered (only to pass full activation validation)', () => {
  // The scaffolds exist, are registered, and are importable/inert with
  // exactly-empty exactSourceUrl/officialSourceTitle/issuingAuthority
  // -- those fields only block *activation* (test 4/9), never
  // existence or registration (tests 1-3).
  for (const s of SCAFFOLDS) {
    assert.equal(s.pkg.exactSourceUrl, '');
    assert.equal(s.pkg.officialSourceTitle, '');
    assert.equal(s.pkg.issuingAuthority, '');
  }
  assert.equal(EVIDENCE_PACKAGES.length, 5);
});

// ---------------------------------------------------------------------
// 5. No leakage of internal authoring-guidance comment text into any
//    rendered/public-facing string
// ---------------------------------------------------------------------

test('17. the internal authoring-guidance sentence never appears in any scaffold FIELD VALUE (only allowed in source comments)', () => {
  for (const s of SCAFFOLDS) {
    const values = JSON.stringify(s.pkg);
    assert.ok(!values.includes(AUTHORING_GUIDANCE_SENTENCE), `${s.name}: guidance sentence leaked into a field value`);
    assert.ok(!values.includes('productOwnerAuthored is true'), `${s.name}: guidance fragment leaked into a field value`);
  }
});

test('18. the internal authoring-guidance sentence never appears in any .html file (nothing rendered to users)', () => {
  const htmlFiles = listAllFiles(repoRoot).filter((f) => f.endsWith('.html'));
  assert.ok(htmlFiles.length > 0, 'sanity check: there should be html files in this repo');
  for (const file of htmlFiles) {
    const content = normalizeCommentText(readFileSync(file, 'utf8'));
    assert.ok(!content.includes(AUTHORING_GUIDANCE_SENTENCE), `${file} leaked the internal authoring-guidance sentence`);
    assert.ok(!content.includes('productOwnerAuthored'), `${file} leaked the productOwnerAuthored field name`);
  }
});

test('19. every scaffold file header comment carries the exact required guidance sentence (so the leakage test above is meaningful, not vacuous)', () => {
  for (const s of SCAFFOLDS) {
    const content = normalizeCommentText(readFileSync(join(repoRoot, s.path), 'utf8'));
    assert.ok(content.includes(AUTHORING_GUIDANCE_SENTENCE), `${s.path} must carry the exact required guidance sentence`);
  }
});

// ---------------------------------------------------------------------
// 6. Zero regulatory content anywhere in any of the 5 files (structural check)
// ---------------------------------------------------------------------

test('20. every content field on every scaffold is genuinely empty (empty string, empty array, or null)', () => {
  const stringFieldsMustBeEmpty = [
    'primaryVerificationProfessional', 'professionalReason', 'officialSourceTitle',
    'issuingAuthority', 'exactSourceUrl', 'tariffOrStandardReference',
    'verificationDate', 'reviewDueDate', 'publicLimitationWording',
  ];
  const arrayFieldsMustBeEmpty = [
    'triggerPhrases', 'confirmationQuestions', 'activationConditions', 'exclusions', 'verificationItems', 'changeNotes',
  ];
  for (const s of SCAFFOLDS) {
    for (const field of stringFieldsMustBeEmpty) {
      assert.equal(s.pkg[field], '', `${s.name}.${field} must be empty string`);
    }
    for (const field of arrayFieldsMustBeEmpty) {
      assert.deepEqual([...s.pkg[field]], [], `${s.name}.${field} must be empty array`);
    }
    assert.equal(s.pkg.publicHebrewWording.identification, '');
    assert.equal(s.pkg.publicHebrewWording.implication, '');
    assert.equal(s.pkg.productOwnerAuthored, false);
    assert.equal(s.pkg.lastProductOwnerReview, null);
  }
});

// ---------------------------------------------------------------------
// 7. Preserved-safety regression -- disabled/deprecated rules stay blocked
// ---------------------------------------------------------------------

test('21. regression -- the 5 real existing rules-registry.js candidates are unaffected by this scaffold expansion', () => {
  for (const rule of REGULATORY_SIGNAL_RULES) {
    assert.equal(rule.status, RULE_STATUS.PROFESSIONAL_REVIEW_REQUIRED);
    assert.equal(isPubliclyEligible(rule), false);
  }
  assert.equal(REGULATORY_SIGNAL_RULES.length, 5);
});

test('22. regression -- an evidence package pinned DISABLED can never be eligible no matter its other content (existing DISABLED/expired regression, reused)', () => {
  const disabledButOtherwiseComplete = {
    ruleId: 'TEST-DISABLED-FIXTURE-001',
    publicCategory: 'test_disabled_fixture_only',
    triggerPhrases: ['test-fixture'],
    confirmationQuestions: [{ questionId: 'q', legend: 'TEST FIXTURE q' }],
    activationConditions: [{ questionId: 'q', equals: 'yes' }],
    exclusions: [],
    publicHebrewWording: { identification: 'TEST', implication: 'TEST' },
    verificationItems: ['TEST'],
    primaryVerificationProfessional: 'CUSTOMS_CLASSIFIER',
    professionalReason: 'TEST',
    officialSourceTitle: 'TEST',
    issuingAuthority: 'TEST',
    exactSourceUrl: 'https://example.invalid/test',
    tariffOrStandardReference: 'TEST-0000',
    verificationDate: '2026-01-01',
    reviewDueDate: '2026-07-01',
    reviewerStatus: REVIEWER_STATUS.PRODUCT_OWNER_REVIEWED,
    activeOrDisabledStatus: RULE_STATUS.DISABLED,
    publicLimitationWording: 'TEST',
  };
  assert.equal(validateEvidencePackage(disabledButOtherwiseComplete).valid, true);
  assert.equal(isEligibleForControlledPilot(disabledButOtherwiseComplete), false, 'DISABLED must always be ineligible regardless of content completeness');
});

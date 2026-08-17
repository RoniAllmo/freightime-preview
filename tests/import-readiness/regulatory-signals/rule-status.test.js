import test from 'node:test';
import assert from 'node:assert/strict';
import { RULE_STATUS, isPubliclyEligible, isStale, computeReviewDueDate, isPubliclyEligibleStatus } from '../../../js/import-readiness/regulatory-signals/rule-status.js';

function baseExpertApprovedRule(overrides = {}) {
  return {
    id: 'FIXTURE-1',
    status: RULE_STATUS.EXPERT_APPROVED_FOR_PILOT,
    verifiedDate: '2026-01-01',
    reviewDueDate: '2026-07-01',
    officialSources: [],
    professionalCategory: 'TESTING_LABORATORY',
    publicLimitationText: 'התוצאה היא כיוון בדיקה ראשוני ואינה מהווה סיווג מכס או אישור יבוא.',
    publicTitle: 'כותרת ציבורית לדוגמה',
    primaryExplanation: 'זיהוי לדוגמה.',
    potentialImplication: 'משמעות אפשרית לדוגמה.',
    exclusionPredicate: () => false,
    ...overrides,
  };
}

test('1. a fully-formed expert_approved_for_pilot rule with no official source clears the gate -- official sources are NOT required for this status', () => {
  assert.equal(isPubliclyEligible(baseExpertApprovedRule()), true);
});

test('2. a fully-formed official_source_supported rule WITH a complete official source clears the gate', () => {
  const rule = baseExpertApprovedRule({
    status: RULE_STATUS.OFFICIAL_SOURCE_SUPPORTED,
    officialSources: [{ title: 'Some source', authority: 'Some authority', url: 'https://example.gov.il/x' }],
  });
  assert.equal(isPubliclyEligible(rule), true);
});

test('3. official_source_supported WITHOUT a complete official source fails the gate', () => {
  assert.equal(isPubliclyEligible(baseExpertApprovedRule({ status: RULE_STATUS.OFFICIAL_SOURCE_SUPPORTED, officialSources: [] })), false);
  assert.equal(isPubliclyEligible(baseExpertApprovedRule({ status: RULE_STATUS.OFFICIAL_SOURCE_SUPPORTED, officialSources: [{ title: 'x', authority: 'y' }] })), false);
});

for (const status of [RULE_STATUS.EXPERT_AUTHORED, RULE_STATUS.REVIEW_DUE, RULE_STATUS.DISABLED]) {
  test(`4. status "${status}" never clears the gate even with otherwise-complete fields`, () => {
    assert.equal(isPubliclyEligible(baseExpertApprovedRule({ status })), false);
  });
}

test('5. missing verifiedDate blocks the gate', () => {
  assert.equal(isPubliclyEligible(baseExpertApprovedRule({ verifiedDate: null })), false);
});

test('6. missing reviewDueDate blocks the gate', () => {
  assert.equal(isPubliclyEligible(baseExpertApprovedRule({ reviewDueDate: '' })), false);
});

test('7. missing publicLimitationText blocks the gate', () => {
  assert.equal(isPubliclyEligible(baseExpertApprovedRule({ publicLimitationText: '' })), false);
});

test('8. missing professionalCategory blocks the gate', () => {
  assert.equal(isPubliclyEligible(baseExpertApprovedRule({ professionalCategory: '' })), false);
});

test('9. missing publicTitle, primaryExplanation, or potentialImplication each independently blocks the gate', () => {
  assert.equal(isPubliclyEligible(baseExpertApprovedRule({ publicTitle: '' })), false);
  assert.equal(isPubliclyEligible(baseExpertApprovedRule({ primaryExplanation: '' })), false);
  assert.equal(isPubliclyEligible(baseExpertApprovedRule({ potentialImplication: '' })), false);
});

test('10. a missing exclusionPredicate function blocks the gate', () => {
  assert.equal(isPubliclyEligible(baseExpertApprovedRule({ exclusionPredicate: undefined })), false);
});

test('11. null/non-object input is handled safely', () => {
  assert.equal(isPubliclyEligible(null), false);
  assert.equal(isPubliclyEligible(undefined), false);
  assert.equal(isPubliclyEligible('expert_approved_for_pilot'), false);
});

test('12. isStale compares against an injectable clock, not a hidden new Date()', () => {
  const rule = baseExpertApprovedRule();
  assert.equal(isStale(rule, new Date('2026-03-01T00:00:00Z')), false);
  assert.equal(isStale(rule, new Date('2026-08-01T00:00:00Z')), true);
});

test('13. isStale treats a missing reviewDueDate as stale', () => {
  assert.equal(isStale({}, new Date()), true);
});

test('14. computeReviewDueDate adds the documented 6-month review period', () => {
  assert.equal(computeReviewDueDate('2026-01-15'), '2026-07-15');
});

test('15. isPubliclyEligibleStatus recognizes exactly the two publicly-eligible statuses', () => {
  assert.equal(isPubliclyEligibleStatus(RULE_STATUS.EXPERT_APPROVED_FOR_PILOT), true);
  assert.equal(isPubliclyEligibleStatus(RULE_STATUS.OFFICIAL_SOURCE_SUPPORTED), true);
  assert.equal(isPubliclyEligibleStatus(RULE_STATUS.EXPERT_AUTHORED), false);
  assert.equal(isPubliclyEligibleStatus(RULE_STATUS.REVIEW_DUE), false);
  assert.equal(isPubliclyEligibleStatus(RULE_STATUS.DISABLED), false);
});

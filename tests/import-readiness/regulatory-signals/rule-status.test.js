import test from 'node:test';
import assert from 'node:assert/strict';
import { RULE_STATUS, isPubliclyEligible, isStale, computeReviewDueDate } from '../../../js/import-readiness/regulatory-signals/rule-status.js';

function baseApprovedRule(overrides = {}) {
  return {
    id: 'FIXTURE-1',
    status: RULE_STATUS.APPROVED_FOR_PILOT,
    verifiedDate: '2026-01-01',
    reviewDueDate: '2026-07-01',
    officialSources: [{ title: 'Some source', authority: 'Some authority', url: 'https://example.gov.il/x' }],
    professionalCategory: 'TESTING_LABORATORY',
    publicLimitationText: 'התוצאה היא בדיקה ראשונית ואינה מהווה אישור יבוא.',
    ...overrides,
  };
}

test('1. a fully-formed approved_for_pilot rule clears the gate', () => {
  assert.equal(isPubliclyEligible(baseApprovedRule()), true);
});

for (const status of [RULE_STATUS.DRAFT, RULE_STATUS.SOURCE_VERIFIED, RULE_STATUS.PROFESSIONAL_REVIEW_REQUIRED, RULE_STATUS.EXPIRED, RULE_STATUS.DISABLED]) {
  test(`2. status "${status}" never clears the gate even with otherwise-complete fields`, () => {
    assert.equal(isPubliclyEligible(baseApprovedRule({ status })), false);
  });
}

test('3. missing verifiedDate blocks the gate', () => {
  assert.equal(isPubliclyEligible(baseApprovedRule({ verifiedDate: null })), false);
});

test('4. missing reviewDueDate blocks the gate', () => {
  assert.equal(isPubliclyEligible(baseApprovedRule({ reviewDueDate: '' })), false);
});

test('5. an empty official-sources array blocks the gate', () => {
  assert.equal(isPubliclyEligible(baseApprovedRule({ officialSources: [] })), false);
});

test('6. a malformed official source (missing url) blocks the gate', () => {
  assert.equal(isPubliclyEligible(baseApprovedRule({ officialSources: [{ title: 'x', authority: 'y' }] })), false);
});

test('7. missing publicLimitationText blocks the gate', () => {
  assert.equal(isPubliclyEligible(baseApprovedRule({ publicLimitationText: '' })), false);
});

test('8. missing professionalCategory blocks the gate', () => {
  assert.equal(isPubliclyEligible(baseApprovedRule({ professionalCategory: '' })), false);
});

test('9. null/non-object input is handled safely', () => {
  assert.equal(isPubliclyEligible(null), false);
  assert.equal(isPubliclyEligible(undefined), false);
  assert.equal(isPubliclyEligible('approved_for_pilot'), false);
});

test('10. isStale compares against an injectable clock, not a hidden new Date()', () => {
  const rule = baseApprovedRule();
  assert.equal(isStale(rule, new Date('2026-03-01T00:00:00Z')), false);
  assert.equal(isStale(rule, new Date('2026-08-01T00:00:00Z')), true);
});

test('11. isStale treats a missing reviewDueDate as stale', () => {
  assert.equal(isStale({}, new Date()), true);
});

test('12. computeReviewDueDate adds the documented 6-month review period', () => {
  assert.equal(computeReviewDueDate('2026-01-15'), '2026-07-15');
});

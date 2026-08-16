import test from 'node:test';
import assert from 'node:assert/strict';
import { matchRegulatorySignals } from '../../../js/import-readiness/regulatory-signals/matcher.js';
import { RULE_STATUS } from '../../../js/import-readiness/regulatory-signals/rule-status.js';
import { CONFIDENCE } from '../../../js/import-readiness/regulatory-signals/confidence.js';

function fixtureRule(overrides = {}) {
  return {
    id: 'FIXTURE-APPROVED',
    publicTitle: 'כותרת בדיקה',
    internalCategory: 'test_category',
    status: RULE_STATUS.APPROVED_FOR_PILOT,
    triggerPredicate: (ctx) => ctx.answers.q1 === 'yes',
    exclusionPredicate: () => false,
    followUpQuestionIds: ['q1'],
    primaryExplanation: 'זוהה מאפיין בדיקה.',
    potentialImplication: 'ייתכן שיידרש אישור.',
    verificationItems: ['פריט 1', 'פריט 2'],
    professionalCategory: 'TESTING_LABORATORY',
    professionalReason: 'סיבה לבדיקה מקצועית.',
    confidenceIfMatched: CONFIDENCE.HIGH,
    operationalImpactPriority: 2,
    officialSources: [{ title: 'מקור', authority: 'רשות', url: 'https://example.gov.il/x', dateChecked: '2026-01-01' }],
    verifiedDate: '2026-01-01',
    reviewDueDate: '2026-12-01',
    ruleVersion: '1.0.0',
    reviewedBy: null,
    internalNotes: 'internal only',
    publicLimitationText: 'התוצאה היא בדיקה ראשונית ואינה מהווה אישור יבוא.',
    ...overrides,
  };
}

test('1. an approved, triggered rule with no exclusion produces exactly one signal', () => {
  const rule = fixtureRule();
  const result = matchRegulatorySignals({ answers: { q1: 'yes' } }, new Set(['test_category']), [rule]);
  assert.equal(result.signals.length, 1);
  assert.equal(result.signals[0].ruleId, 'FIXTURE-APPROVED');
});

test('2. a draft rule can NEVER produce output, even when its trigger predicate is forced true', () => {
  const rule = fixtureRule({ status: RULE_STATUS.DRAFT, triggerPredicate: () => true });
  const result = matchRegulatorySignals({ answers: { q1: 'yes' } }, new Set(['test_category']), [rule]);
  assert.equal(result.signals.length, 0);
});

test('3. a disabled rule can NEVER produce output, even when its trigger predicate is forced true', () => {
  const rule = fixtureRule({ status: RULE_STATUS.DISABLED, triggerPredicate: () => true });
  const result = matchRegulatorySignals({ answers: {} }, new Set(['test_category']), [rule]);
  assert.equal(result.signals.length, 0);
});

test('4. a professional_review_required rule can NEVER produce output, even when its trigger predicate is forced true', () => {
  const rule = fixtureRule({ status: RULE_STATUS.PROFESSIONAL_REVIEW_REQUIRED, triggerPredicate: () => true });
  const result = matchRegulatorySignals({ answers: {} }, new Set(['test_category']), [rule]);
  assert.equal(result.signals.length, 0);
});

test('5. an expired rule can NEVER produce output, even when its trigger predicate is forced true', () => {
  const rule = fixtureRule({ status: RULE_STATUS.EXPIRED, triggerPredicate: () => true });
  const result = matchRegulatorySignals({ answers: {} }, new Set(['test_category']), [rule]);
  assert.equal(result.signals.length, 0);
});

test('6. an exclusion condition correctly prevents an otherwise-triggered match', () => {
  const rule = fixtureRule({ exclusionPredicate: (ctx) => ctx.answers.excluded === 'yes' });
  const result = matchRegulatorySignals({ answers: { q1: 'yes', excluded: 'yes' } }, new Set(['test_category']), [rule]);
  assert.equal(result.signals.length, 0);
});

test('7. an "unknown" answer does not satisfy a yes-gated trigger (never guesses)', () => {
  const rule = fixtureRule();
  const result = matchRegulatorySignals({ answers: { q1: 'unknown' } }, new Set(['test_category']), [rule]);
  assert.equal(result.signals.length, 0);
  // Still surfaces the honest no-match wording rather than silence.
  assert.ok(result.noMatchMessage);
});

test('8. free text alone (a hinted category with no answer at all) never produces a signal', () => {
  const rule = fixtureRule();
  const result = matchRegulatorySignals({ answers: {} }, new Set(['test_category']), [rule]);
  assert.equal(result.signals.length, 0);
});

test('9. no-match wording never implies exemption or "no approval needed"', () => {
  const rule = fixtureRule();
  const result = matchRegulatorySignals({ answers: {} }, new Set(['test_category']), [rule]);
  assert.match(result.noMatchMessage, /לא זוהתה התאמה/);
  assert.match(result.noMatchNotExemptNote, /אין בכך אישור/);
  for (const text of [result.noMatchMessage, result.noMatchNotExemptNote]) {
    assert.ok(!text.includes('אינו דורש אישור'));
    assert.ok(!text.includes('היבוא מותר'));
  }
  // The mandated safe wording ("אין בכך אישור שהמוצר פטור מדרישות יבוא")
  // legitimately contains the word "פטור" inside a negated sentence --
  // the language-safety scanner (not a raw substring check) is the
  // correct tool to confirm it reads as a denial, not a claim.
  assert.equal(result.noMatchNotExemptNote, 'אין בכך אישור שהמוצר פטור מדרישות יבוא.');
});

test('10. no hinted category at all yields no no-match message either (nothing to report)', () => {
  const rule = fixtureRule();
  const result = matchRegulatorySignals({ answers: {} }, new Set(), [rule]);
  assert.equal(result.noMatchMessage, null);
  assert.equal(result.hasAnyHint, false);
});

test('11. multiple matches are prioritized by operational impact and capped at 3', () => {
  const rules = [
    fixtureRule({ id: 'A', internalCategory: 'cat', operationalImpactPriority: 3 }),
    fixtureRule({ id: 'B', internalCategory: 'cat', operationalImpactPriority: 1 }),
    fixtureRule({ id: 'C', internalCategory: 'cat', operationalImpactPriority: 2 }),
    fixtureRule({ id: 'D', internalCategory: 'cat', operationalImpactPriority: 4 }),
  ];
  const result = matchRegulatorySignals({ answers: { q1: 'yes' } }, new Set(['cat']), rules);
  assert.equal(result.signals.length, 3);
  assert.deepEqual(result.signals.map((s) => s.ruleId), ['B', 'C', 'A']);
  assert.equal(result.extraSignalCount, 1);
});

test('12. a stale rule (past its review-due date) is downgraded, not shown as current-high-confidence', () => {
  const rule = fixtureRule({ reviewDueDate: '2026-01-01', confidenceIfMatched: CONFIDENCE.HIGH });
  const result = matchRegulatorySignals({ answers: { q1: 'yes' }, now: new Date('2026-08-16T00:00:00Z') }, new Set(['test_category']), [rule]);
  assert.equal(result.signals.length, 1);
  assert.equal(result.signals[0].confidence, CONFIDENCE.MORE_INFO_NEEDED);
  assert.match(result.signals[0].details.verifiedLabel, /נדרש אימות מקור מעודכן/);
});

test('13. a fresh (non-stale) rule keeps its rule-defined confidence and shows a "נבדק לאחרונה" date', () => {
  const rule = fixtureRule({ reviewDueDate: '2026-12-01', confidenceIfMatched: CONFIDENCE.HIGH, verifiedDate: '2026-01-15' });
  const result = matchRegulatorySignals({ answers: { q1: 'yes' }, now: new Date('2026-08-16T00:00:00Z') }, new Set(['test_category']), [rule]);
  assert.equal(result.signals[0].confidence, CONFIDENCE.HIGH);
  assert.equal(result.signals[0].details.verifiedLabel, 'נבדק לאחרונה: 15.01.2026');
});

test('14. every signal card exposes a professional referral, a confidence label, and a limitation line', () => {
  const rule = fixtureRule();
  const result = matchRegulatorySignals({ answers: { q1: 'yes' } }, new Set(['test_category']), [rule]);
  const [signal] = result.signals;
  assert.ok(signal.professional.type.length > 0);
  assert.ok(signal.professional.reason.length > 0);
  assert.ok(['התאמה גבוהה', 'התאמה חלקית', 'נדרש מידע נוסף'].includes(signal.confidence));
  assert.ok(signal.limitation.length > 0);
});

test('15. verification items never exceed 3 per signal', () => {
  const rule = fixtureRule({ verificationItems: ['a', 'b', 'c', 'd', 'e'] });
  const result = matchRegulatorySignals({ answers: { q1: 'yes' } }, new Set(['test_category']), [rule]);
  assert.ok(result.signals[0].verificationItems.length <= 3);
});

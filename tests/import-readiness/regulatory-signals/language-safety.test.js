import test from 'node:test';
import assert from 'node:assert/strict';
import { scanForBannedAbsoluteClaims } from '../../../js/import-readiness/regulatory-signals/language-safety.js';
import { REGULATORY_SIGNAL_RULES } from '../../../js/import-readiness/regulatory-signals/rules-registry.js';
import { REGULATORY_FOLLOWUP_QUESTIONS } from '../../../js/import-readiness/regulatory-signals/questions.js';
import { matchRegulatorySignals, NO_MATCH_MESSAGE, NO_MATCH_NOT_EXEMPT_NOTE } from '../../../js/import-readiness/regulatory-signals/matcher.js';
import { RULE_STATUS } from '../../../js/import-readiness/regulatory-signals/rule-status.js';
import { CONFIDENCE } from '../../../js/import-readiness/regulatory-signals/confidence.js';

test('1. the scanner catches each documented banned pattern (fixtures only)', () => {
  const badExamples = [
    'כל מוצר עם חיווט חשמלי חייב באישור מכון התקנים',
    'המוצר פטור מאישור',
    'לא נדרש תקן',
    'היבוא מאושר',
    'הסיווג הוא 8501.10',
    'התקן החל הוא בוודאות ת"י 900',
    'המוצר אינו דורש אישור יבוא',
  ];
  const result = scanForBannedAbsoluteClaims(badExamples);
  assert.equal(result.ok, false);
  assert.equal(result.violations.length, badExamples.length);
});

test('2. the scanner does not flag careful, hedged wording', () => {
  const goodExamples = [
    'זוהתה דרישת יבוא אפשרית.',
    'המוצר עשוי להשתייך לתחום המחייב בדיקת תקינה.',
    'נדרשת בדיקה מול פרט המכס ותנאי היבוא המעודכנים.',
    'לא ניתן לקבוע פטור על בסיס התיאור בלבד.',
    'התוצאה היא בדיקה ראשונית ולא אישור יבוא.',
    'לא זוהתה התאמה לכלל מאומת במאגר המצומצם שנבדק.',
    'אין בכך אישור שהמוצר פטור מדרישות יבוא.',
  ];
  const result = scanForBannedAbsoluteClaims(goodExamples);
  assert.equal(result.ok, true);
  assert.equal(result.violations.length, 0);
});

function collectShippedStringsFromRule(rule) {
  return [
    rule.publicTitle, rule.primaryExplanation, rule.potentialImplication,
    rule.professionalReason, rule.publicLimitationText,
    ...(rule.verificationItems ?? []),
  ];
}

test('3. every string actually shipped by the real candidate registry is free of banned absolute claims', () => {
  const strings = REGULATORY_SIGNAL_RULES.flatMap(collectShippedStringsFromRule);
  const result = scanForBannedAbsoluteClaims(strings);
  assert.equal(result.ok, true, JSON.stringify(result.violations));
});

test('4. every follow-up question legend and option label is free of banned absolute claims', () => {
  const strings = REGULATORY_FOLLOWUP_QUESTIONS.flatMap((q) => [q.legend, ...q.options.map((o) => o.label)]);
  const result = scanForBannedAbsoluteClaims(strings);
  assert.equal(result.ok, true, JSON.stringify(result.violations));
});

test('5. the shared no-match strings are free of banned absolute claims', () => {
  const result = scanForBannedAbsoluteClaims([NO_MATCH_MESSAGE, NO_MATCH_NOT_EXEMPT_NOTE]);
  assert.equal(result.ok, true);
});

test('6. a signal card built from a matched fixture rule ships only safe wording', () => {
  const rule = {
    id: 'X', publicTitle: 'כותרת', internalCategory: 'c', status: RULE_STATUS.APPROVED_FOR_PILOT,
    triggerPredicate: () => true, exclusionPredicate: () => false, followUpQuestionIds: ['q'],
    primaryExplanation: 'זוהה מאפיין אפשרי.', potentialImplication: 'המוצר עשוי לחייב בדיקה נוספת.',
    verificationItems: ['פריט'], professionalCategory: 'TESTING_LABORATORY', professionalReason: 'סיבה מקצועית.',
    confidenceIfMatched: CONFIDENCE.PARTIAL, operationalImpactPriority: 2,
    officialSources: [{ title: 't', authority: 'a', url: 'https://example.gov.il/x', dateChecked: '2026-01-01' }],
    verifiedDate: '2026-01-01', reviewDueDate: '2026-12-01', ruleVersion: '1.0.0', reviewedBy: null,
    internalNotes: 'internal', publicLimitationText: 'התוצאה היא בדיקה ראשונית ואינה מהווה אישור יבוא.',
  };
  const result = matchRegulatorySignals({ answers: { q: 'yes' } }, new Set(['c']), [rule]);
  const [signal] = result.signals;
  const strings = [signal.identification, signal.implication, signal.limitation, signal.professional.reason];
  assert.equal(scanForBannedAbsoluteClaims(strings).ok, true);
});

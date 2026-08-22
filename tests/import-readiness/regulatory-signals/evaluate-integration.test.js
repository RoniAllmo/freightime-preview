import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRegulatorySignals, toSecondaryDetailContent } from '../../../js/import-readiness/regulatory-signals/index.js';
import { RULE_STATUS } from '../../../js/import-readiness/regulatory-signals/rule-status.js';
import { CONFIDENCE } from '../../../js/import-readiness/regulatory-signals/confidence.js';

test('1. a product description with no candidate keywords produces no evaluation at all (assessment stays exactly as short as today)', () => {
  const result = evaluateRegulatorySignals({ productName: 'שולחן עץ', commercialDescription: 'שולחן אוכל פשוט', intendedUse: 'ריהוט בית' });
  assert.equal(result, null);
});

test('2. a hinted description against the real (unverified) registry never produces a signal, but does return an honest no-match', () => {
  const result = evaluateRegulatorySignals({ productName: 'כוסות זכוכית לשתייה', commercialDescription: '', intendedUse: '' }, { answers: { glassDirectFoodOrDrinkContact: 'yes' } });
  assert.ok(result !== null);
  assert.equal(result.signals.length, 0);
  assert.ok(result.noMatchMessage);
  assert.ok(result.noMatchNotExemptNote);
});

test('3. free text alone (no closed-choice answer yet) still never produces a signal against a fixture-approved rule requiring explicit confirmation', () => {
  const fixtureRule = {
    id: 'F', publicTitle: 'כלי זכוכית למגע עם מזון', internalCategory: 'glass_food_contact', status: RULE_STATUS.EXPERT_APPROVED_FOR_PILOT,
    triggerPredicate: (ctx) => ctx.answers.glassDirectFoodOrDrinkContact === 'yes',
    exclusionPredicate: () => false, followUpQuestionIds: ['glassDirectFoodOrDrinkContact'],
    primaryExplanation: 'זוהה מאפיין.', potentialImplication: 'עשוי לחייב בדיקה.',
    verificationItems: ['פריט'], professionalCategory: 'TESTING_LABORATORY', professionalReason: 'סיבה.',
    confidenceIfMatched: CONFIDENCE.HIGH, operationalImpactPriority: 2,
    officialSources: [{ title: 't', authority: 'a', url: 'https://example.gov.il/x', dateChecked: '2026-01-01' }],
    verifiedDate: '2026-01-01', reviewDueDate: '2026-12-01', ruleVersion: '1.0.0', reviewedBy: null,
    internalNotes: 'x', publicLimitationText: 'התוצאה היא בדיקה ראשונית ואינה מהווה אישור יבוא.',
  };
  // No answers supplied yet -- description text alone ("כוסות זכוכית לשתייה") must not be enough.
  const noAnswerYet = evaluateRegulatorySignals({ productName: 'כוסות זכוכית לשתייה' }, { rules: [fixtureRule] });
  assert.equal(noAnswerYet.signals.length, 0);

  // Only after an explicit "yes" confirmation does the fixture rule fire.
  const withConfirmation = evaluateRegulatorySignals({ productName: 'כוסות זכוכית לשתייה' }, { rules: [fixtureRule], answers: { glassDirectFoodOrDrinkContact: 'yes' } });
  assert.equal(withConfirmation.signals.length, 1);
  assert.equal(withConfirmation.signals[0].confidence, CONFIDENCE.HIGH);
});

test('4. an "unknown" closed-choice answer against a fixture-approved rule does not fabricate a high-confidence match', () => {
  const fixtureRule = {
    id: 'F2', publicTitle: 'מוצר חשמלי', internalCategory: 'electrical_mains_product', status: RULE_STATUS.EXPERT_APPROVED_FOR_PILOT,
    triggerPredicate: (ctx) => ctx.answers.mainsConnected === 'yes',
    exclusionPredicate: () => false, followUpQuestionIds: ['mainsConnected'],
    primaryExplanation: 'x', potentialImplication: 'y', verificationItems: ['z'],
    professionalCategory: 'TESTING_LABORATORY', professionalReason: 'r', confidenceIfMatched: CONFIDENCE.HIGH,
    operationalImpactPriority: 2, officialSources: [{ title: 't', authority: 'a', url: 'https://example.gov.il/x', dateChecked: '2026-01-01' }],
    verifiedDate: '2026-01-01', reviewDueDate: '2026-12-01', ruleVersion: '1.0.0', reviewedBy: null,
    internalNotes: 'x', publicLimitationText: 'התוצאה היא בדיקה ראשונית ואינה מהווה אישור יבוא.',
  };
  const result = evaluateRegulatorySignals({ productName: 'מטען חשמלי' }, { rules: [fixtureRule], answers: { mainsConnected: 'unknown' } });
  assert.equal(result.signals.length, 0);
  assert.ok(result.noMatchMessage, 'unknown answers fall through to the honest no-match message, never a guess');
});

test('5. the summary heading only appears with 2+ signals', () => {
  const makeRule = (id, priority) => ({
    id, publicTitle: `כותרת ${id}`, internalCategory: 'electrical_mains_product', status: RULE_STATUS.EXPERT_APPROVED_FOR_PILOT,
    triggerPredicate: () => true, exclusionPredicate: () => false, followUpQuestionIds: [],
    primaryExplanation: 'x', potentialImplication: 'y', verificationItems: ['z'],
    professionalCategory: 'TESTING_LABORATORY', professionalReason: 'r', confidenceIfMatched: CONFIDENCE.PARTIAL,
    operationalImpactPriority: priority, officialSources: [{ title: 't', authority: 'a', url: 'https://example.gov.il/x', dateChecked: '2026-01-01' }],
    verifiedDate: '2026-01-01', reviewDueDate: '2026-12-01', ruleVersion: '1.0.0', reviewedBy: null,
    internalNotes: 'x', publicLimitationText: 'התוצאה היא בדיקה ראשונית ואינה מהווה אישור יבוא.',
  });
  const oneRule = evaluateRegulatorySignals({ productName: 'חשמל' }, { rules: [makeRule('A', 1)] });
  assert.equal(oneRule.summaryHeading, null);

  const twoRules = evaluateRegulatorySignals({ productName: 'חשמל' }, { rules: [makeRule('A', 1), makeRule('B', 2)] });
  assert.equal(twoRules.summaryHeading, 'זוהו 2 תחומי בדיקה לפני היבוא');
});

test('6. toSecondaryDetailContent never fabricates points when evaluation is null', () => {
  const content = toSecondaryDetailContent(null);
  assert.deepEqual(content, { points: [], note: '' });
});

test('7. toSecondaryDetailContent surfaces the honest no-match note in secondary content', () => {
  const result = evaluateRegulatorySignals({ productName: 'כוסות זכוכית' }, { answers: {} });
  const content = toSecondaryDetailContent(result);
  assert.ok(content.note.includes('לא זוהה כיוון בדיקה מקצועי'));
  assert.ok(content.note.includes('אין בכך אישור'));
});

test('8. an already-collected sensitiveCategory of "electrical" hints the electrical category without needing keyword text', () => {
  const result = evaluateRegulatorySignals({ productName: 'מכשיר כלשהו', sensitiveCategory: 'electrical' }, { answers: {} });
  assert.ok(result !== null);
  assert.ok(result.hasAnyHint);
});

// -----------------------------------------------------------------
// F7 investigation: a completed audit reported that a confirmed
// mains-connected electrical product did not activate the existing
// mains-connected-electrical-product detailed rule. A live-browser
// reproduction using the real UI, and a direct call to this module with
// the identical inputs, both show the rule firing correctly -- the
// original audit's negative result was caused by a bug in the audit's
// own test script (an unintentional no-op selector that left
// connectsToPower answered "no" instead of "yes"), not a product
// defect. These tests lock in the already-correct end-to-end behavior
// so it stays provably correct going forward.
// -----------------------------------------------------------------

test('9. F7: an explicit mains-connection description with connectsToPower=yes activates the detailed electrical rule', () => {
  const result = evaluateRegulatorySignals(
    { productName: 'מכשיר חשמלי ביתי עם תקע', commercialDescription: 'מכשיר חשמלי המתחבר לשקע ביתי', intendedUse: 'שימוש ביתי' },
    { answers: { mainsConnectedOrSuppliedAdapter: 'yes' } },
  );
  assert.ok(result !== null);
  assert.equal(result.signals.length, 1);
  assert.equal(result.signals[0].ruleId, 'mains-connected-electrical-product');
  assert.equal(result.signals[0].title, 'נדרש לבדוק דרישות תקינה למוצר חשמלי');
  assert.equal(result.noMatchMessage, null, 'a matched signal must never also carry a no-match message');
});

test('10. F7: hasBattery=no does not block the mains rule from firing (battery is a separate, unrelated concept)', () => {
  const result = evaluateRegulatorySignals(
    { productName: 'מכשיר חשמלי ביתי עם תקע' },
    { answers: { mainsConnectedOrSuppliedAdapter: 'yes', hasBattery: 'no' } },
  );
  assert.equal(result.signals.length, 1);
  assert.equal(result.signals[0].ruleId, 'mains-connected-electrical-product');
});

test('11. F7: a vehicle-hinted product with no explicit separate mains wording never activates the mains rule (vehicle-vs-mains protection intact)', () => {
  const result = evaluateRegulatorySignals(
    { productName: 'פנס ראשי לרכב חשמלי', commercialDescription: 'פנס המחובר למצבר הרכב' },
    { answers: {} },
  );
  const mainsSignal = result && result.signals.find((s) => s.ruleId === 'mains-connected-electrical-product');
  assert.equal(mainsSignal, undefined, 'a vehicle-hinted product must never also trigger the generic mains rule without explicit separate mains wording');
});

test('12. F7: a vehicle product with an explicitly described separate wall charger still activates the mains rule', () => {
  const result = evaluateRegulatorySignals(
    { productName: 'סוללה נטענת לרכב', commercialDescription: 'כולל גם ספק כוח נפרד לטעינה מרשת החשמל הביתית' },
    { answers: { mainsConnectedOrSuppliedAdapter: 'yes' } },
  );
  const mainsSignal = result && result.signals.find((s) => s.ruleId === 'mains-connected-electrical-product');
  assert.ok(mainsSignal, 'an explicitly described separate wall charger must remain eligible for the mains rule');
});

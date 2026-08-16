import test from 'node:test';
import assert from 'node:assert/strict';
import { buildResultBrief, RESULT_STATUS, NO_FOCUSED_DIRECTION_MESSAGE, NO_FOCUSED_DIRECTION_HELP } from '../../js/import-readiness/result-brief.js';
import { buildFirstCommercialImportResult } from '../../js/import-readiness/first-commercial-import-rules.js';
import { buildPersonalImportResult } from '../../js/import-readiness/personal-import-rules.js';
import { normalizeReadinessInput } from '../../js/import-readiness/normalize-readiness-input.js';
import { computeDocumentReadiness } from '../../js/import-readiness/document-readiness.js';
import { evaluateRegulatorySignals } from '../../js/import-readiness/regulatory-signals/index.js';

test('1. all 8 sections are present on every brief', () => {
  const normalized = normalizeReadinessInput({ importType: 'commercial' });
  const result = buildFirstCommercialImportResult(normalized);
  const brief = buildResultBrief(result, {});
  for (const key of ['status', 'situation', 'checkpoints', 'documentsToObtain', 'prioritizedActions', 'professional', 'missingInformation', 'disclaimer']) {
    assert.ok(key in brief, `missing section ${key}`);
  }
});

test('2. status is always one of the defined status labels -- never a score or star rating', () => {
  const normalized = normalizeReadinessInput({ importType: 'commercial' });
  const result = buildFirstCommercialImportResult(normalized);
  const brief = buildResultBrief(result, {});
  assert.ok(Object.values(RESULT_STATUS).includes(brief.status));
});

test('3. personal-import result derives the "can proceed gathering info" status', () => {
  const normalized = normalizeReadinessInput({ importType: 'personal' });
  const result = buildPersonalImportResult(normalized);
  const brief = buildResultBrief(result, {});
  assert.equal(brief.status, RESULT_STATUS.CAN_PROCEED_GATHERING_INFO);
});

test('4. no section ever contains a numeric score, star rating, badge, or gamified word', () => {
  const normalized = normalizeReadinessInput({ importType: 'commercial' });
  const result = buildFirstCommercialImportResult(normalized);
  const brief = buildResultBrief(result, {});
  const serialized = JSON.stringify(brief);
  assert.ok(!/כוכב|תג הישג|ניקוד|badge|trophy|score:\s*\d/i.test(serialized));
});

test('5. no section ever labels the importer as good/bad/expert/beginner/failed/passed', () => {
  const normalized = normalizeReadinessInput({ importType: 'commercial' });
  const result = buildFirstCommercialImportResult(normalized);
  const brief = buildResultBrief(result, {});
  const serialized = JSON.stringify(brief);
  assert.ok(!/יבואן מתחיל|יבואן מומחה|יבואן נכשל|יבואן שעבר|beginner importer|expert importer|you (failed|passed)/i.test(serialized));
});

test('6. document-readiness gaps feed section D verbatim as labels only (mechanical, no regulatory claim)', () => {
  const docReadiness = computeDocumentReadiness({ selectedDocuments: ['supplier_invoice'] });
  const normalized = normalizeReadinessInput({ importType: 'commercial' });
  const result = buildFirstCommercialImportResult(normalized);
  const brief = buildResultBrief(result, { documentReadiness: docReadiness });
  assert.ok(brief.documentsToObtain.length > 0);
  assert.ok(!brief.documentsToObtain.includes('חשבון ספק'));
});

test('7. section G carries the honest no-focused-direction wording when flagged, and never implies exemption', () => {
  const normalized = normalizeReadinessInput({ importType: 'commercial' });
  const result = buildFirstCommercialImportResult(normalized);
  const brief = buildResultBrief(result, { noFocusedDirection: true });
  assert.ok(brief.missingInformation.includes(NO_FOCUSED_DIRECTION_MESSAGE));
  assert.ok(brief.missingInformation.includes(NO_FOCUSED_DIRECTION_HELP));
  assert.ok(!brief.missingInformation.some((line) => /פטור/.test(line)));
});

test('8. section G stays empty when there is nothing missing to report and no regulatory no-match message', () => {
  const normalized = normalizeReadinessInput({ importType: 'commercial' });
  const result = buildFirstCommercialImportResult(normalized);
  const brief = buildResultBrief(result, {});
  assert.deepEqual(brief.missingInformation, []);
});

test('9. section G surfaces the existing gate-enforced regulatory no-match message honestly, without fabricating a specific category claim', () => {
  const normalized = normalizeReadinessInput({ importType: 'commercial', productName: 'מוצר חשמלי לבית' });
  const evaluation = evaluateRegulatorySignals(normalized);
  const result = buildFirstCommercialImportResult(normalized);
  const brief = buildResultBrief(result, { regulatoryEvaluation: evaluation });
  if (evaluation && evaluation.hasAnyHint) {
    assert.equal(evaluation.signals.length, 0, 'no candidate is approved_for_pilot, so signals must stay empty');
    assert.ok(brief.missingInformation.some((line) => typeof line === 'string' && line.length > 0));
  }
});

test('10. section F carries the professional referral fields unchanged from the existing safe result', () => {
  const normalized = normalizeReadinessInput({ importType: 'commercial' });
  const result = buildFirstCommercialImportResult(normalized);
  const brief = buildResultBrief(result, {});
  assert.equal(brief.professional.primary.type, result.professional.type);
});

test('11. section E never lists the same action twice', () => {
  const normalized = normalizeReadinessInput({ importType: 'commercial' });
  const result = buildFirstCommercialImportResult(normalized);
  const brief = buildResultBrief(result, {});
  assert.equal(new Set(brief.prioritizedActions).size, brief.prioritizedActions.length);
});

test('12. section H always carries the existing short disclaimer verbatim', () => {
  const normalized = normalizeReadinessInput({ importType: 'commercial' });
  const result = buildFirstCommercialImportResult(normalized);
  const brief = buildResultBrief(result, {});
  assert.equal(brief.disclaimer.short, result.visibleDisclaimer);
});

test('13. malformed result/context input never throws', () => {
  assert.doesNotThrow(() => buildResultBrief(null, null));
  assert.doesNotThrow(() => buildResultBrief(undefined, undefined));
  assert.doesNotThrow(() => buildResultBrief('nope', 42));
});

test('14. urgent shipment-problem-family results derive the urgent status label', async () => {
  const { buildShipmentProblemResult } = await import('../../js/import-readiness/shipment-problem-rules.js');
  const normalized = normalizeReadinessInput({
    importType: 'commercial', problemType: 'cargo_or_container_damage', hasWrittenNotice: true,
    damageDiscoveryTiming: 'after_delivery', hasInsurance: 'unknown',
  });
  const result = buildShipmentProblemResult(normalized);
  const brief = buildResultBrief(result, {});
  if (result.urgency === 'דחוף') {
    assert.equal(brief.status, RESULT_STATUS.URGENT_HANDLING_NEEDED);
  }
});

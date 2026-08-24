import test from 'node:test';
import assert from 'node:assert/strict';
import { buildResultBrief, RESULT_STATUS, NO_FOCUSED_DIRECTION_MESSAGE, NO_FOCUSED_DIRECTION_HELP } from '../../js/import-readiness/result-brief.js';
import { buildFirstCommercialImportResult } from '../../js/import-readiness/first-commercial-import-rules.js';
import { buildPersonalImportResult } from '../../js/import-readiness/personal-import-rules.js';
import { normalizeReadinessInput } from '../../js/import-readiness/normalize-readiness-input.js';
import { computeDocumentReadiness } from '../../js/import-readiness/document-readiness.js';
import { evaluateRegulatorySignals } from '../../js/import-readiness/regulatory-signals/index.js';
import { dedupeDocumentsAgainstText, DOCUMENT_ALIAS_PATTERNS } from '../../js/import-readiness/document-dedup.js';
import { COMMONLY_RELEVANT_DOCUMENTS } from '../../js/import-readiness/document-readiness.js';

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

test('15. dedupeDocumentsAgainstText removes an exact-text duplicate and keeps unrelated documents', () => {
  const candidates = COMMONLY_RELEVANT_DOCUMENTS;
  const kept = dedupeDocumentsAgainstText(candidates, 'חשבון ספק');
  assert.ok(!kept.some((d) => d.id === 'supplier_invoice'));
  assert.ok(kept.some((d) => d.id === 'product_photos'));
  assert.ok(kept.some((d) => d.id === 'certificate_of_origin'));
});

test('16. dedupeDocumentsAgainstText removes a reviewed equivalent name (חשבון מסחרי / Commercial Invoice for supplier_invoice)', () => {
  const candidates = COMMONLY_RELEVANT_DOCUMENTS;
  const kept = dedupeDocumentsAgainstText(candidates, 'יש לצרף חשבון מסחרי (Commercial Invoice) לפני ההזמנה');
  assert.ok(!kept.some((d) => d.id === 'supplier_invoice'));
});

test('17. dedupeDocumentsAgainstText keeps documents with different operational purposes distinct (technical_spec vs certificate_of_origin)', () => {
  const candidates = COMMONLY_RELEVANT_DOCUMENTS;
  const kept = dedupeDocumentsAgainstText(candidates, 'מפרט טכני');
  assert.ok(!kept.some((d) => d.id === 'technical_spec'));
  assert.ok(kept.some((d) => d.id === 'certificate_of_origin'), 'certificate of origin must not be suppressed by an unrelated technical-spec mention');
  assert.ok(kept.some((d) => d.id === 'packing_list'), 'packing list must not be suppressed by an unrelated technical-spec mention');
});

test('18. dedupeDocumentsAgainstText never suppresses a document with no reviewed alias entry, even with overlapping words', () => {
  const noAliasDoc = { id: 'sds_or_msds', label: 'גיליון בטיחות (SDS/MSDS)' };
  const kept = dedupeDocumentsAgainstText([noAliasDoc], 'גיליון בטיחות רלוונטי צורף כבר בעבר');
  assert.equal(kept.length, 1, 'a document outside the reviewed alias map must never be suppressed by broad text overlap');
});

test('19. dedupeDocumentsAgainstText preserves candidate order and returns candidates unchanged when nothing overlaps', () => {
  const candidates = COMMONLY_RELEVANT_DOCUMENTS;
  const kept = dedupeDocumentsAgainstText(candidates, '');
  assert.deepEqual(kept, candidates);
});

test('20. DOCUMENT_ALIAS_PATTERNS only covers reviewed canonical ids that exist in COMMONLY_RELEVANT_DOCUMENTS', () => {
  const knownIds = new Set(COMMONLY_RELEVANT_DOCUMENTS.map((d) => d.id));
  for (const id of Object.keys(DOCUMENT_ALIAS_PATTERNS)) {
    assert.ok(knownIds.has(id), `alias entry ${id} must correspond to a real canonical document id`);
  }
});

test('21. buildResultBrief section D is deduplicated against the result\'s own preparation checklist before rendering (integration, precedence: preparation wins over the generic suggestion)', () => {
  const docReadiness = { worthObtaining: COMMONLY_RELEVANT_DOCUMENTS };
  const fakeResult = {
    routeLabel: 'test route',
    preparationItems: ['תיאור מסחרי של המוצר', 'חשבון מסחרי (Commercial Invoice)', 'רשימת אריזה (Packing List)'],
    immediateActions: [],
  };
  const brief = buildResultBrief(fakeResult, { documentReadiness: docReadiness });
  assert.ok(!brief.documentsToObtain.includes('חשבון ספק'), 'supplier invoice must not repeat -- already named in the preparation checklist');
  assert.ok(!brief.documentsToObtain.includes('Packing List'), 'packing list must not repeat -- already named in the preparation checklist');
  assert.ok(brief.documentsToObtain.includes('תמונות מוצר'), 'a document not mentioned in the preparation checklist must still be suggested');
  assert.ok(brief.documentsToObtain.includes('תעודת מקור'), 'a document not mentioned in the preparation checklist must still be suggested');
});

test('22. buildResultBrief section D also dedups against immediateActions text, not only preparationItems', () => {
  const docReadiness = { worthObtaining: COMMONLY_RELEVANT_DOCUMENTS };
  const fakeResult = {
    routeLabel: 'test route',
    preparationItems: [],
    immediateActions: ['לצרף תעודת מקור לתיק היבוא'],
  };
  const brief = buildResultBrief(fakeResult, { documentReadiness: docReadiness });
  assert.ok(!brief.documentsToObtain.includes('תעודת מקור'), 'certificate of origin must not repeat -- already named as an immediate action');
  assert.ok(brief.documentsToObtain.includes('חשבון ספק'), 'an unrelated document must still be suggested');
});

test('23. buildResultBrief section D never over-deduplicates: with no overlapping preparation/action text, all worthObtaining documents remain', () => {
  const docReadiness = { worthObtaining: COMMONLY_RELEVANT_DOCUMENTS };
  const fakeResult = {
    routeLabel: 'test route',
    preparationItems: ['תיאור מסחרי של המוצר'],
    immediateActions: [],
  };
  const brief = buildResultBrief(fakeResult, { documentReadiness: docReadiness });
  assert.equal(brief.documentsToObtain.length, COMMONLY_RELEVANT_DOCUMENTS.length);
});

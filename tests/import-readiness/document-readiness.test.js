import test from 'node:test';
import assert from 'node:assert/strict';
import { computeDocumentReadiness, COMMONLY_RELEVANT_DOCUMENTS } from '../../js/import-readiness/document-readiness.js';

test('1. with no documents selected, every commonly-relevant document is reported as worth obtaining', () => {
  const result = computeDocumentReadiness({ selectedDocuments: [] });
  assert.equal(result.worthObtaining.length, COMMONLY_RELEVANT_DOCUMENTS.length);
  assert.equal(result.have.length, 0);
});

test('2. a selected document moves from "worth obtaining" to "have" and is never listed twice', () => {
  const result = computeDocumentReadiness({ selectedDocuments: ['supplier_invoice'] });
  assert.ok(result.have.some((d) => d.id === 'supplier_invoice'));
  assert.ok(!result.worthObtaining.some((d) => d.id === 'supplier_invoice'));
});

test('3. "none received yet" is tracked as a flag, not listed as a "have" document', () => {
  const result = computeDocumentReadiness({ selectedDocuments: ['none_received_yet'] });
  assert.equal(result.noneReceivedYet, true);
  assert.equal(result.have.length, 0);
});

test('4. unknown/invalid document ids are ignored, never crash', () => {
  assert.doesNotThrow(() => computeDocumentReadiness({ selectedDocuments: ['not-a-real-id', 123, null] }));
  const result = computeDocumentReadiness({ selectedDocuments: ['not-a-real-id'] });
  assert.equal(result.have.length, 0);
});

test('5. malformed input never throws', () => {
  assert.doesNotThrow(() => computeDocumentReadiness(null));
  assert.doesNotThrow(() => computeDocumentReadiness(undefined));
  assert.doesNotThrow(() => computeDocumentReadiness('nope'));
});

test('6. every worth-obtaining entry has a plain label with no regulatory-claim language (no "נדרש על פי חוק"/"required by law" style wording)', () => {
  const result = computeDocumentReadiness({ selectedDocuments: [] });
  for (const doc of result.worthObtaining) {
    assert.ok(!/נדרש על פי חוק|required by law|חובה חוקית|mandatory by regulation/.test(doc.label));
  }
});

test('7. the commonly-relevant document list is product-family-independent (same list regardless of any category input)', () => {
  const a = computeDocumentReadiness({ selectedDocuments: [] });
  const b = computeDocumentReadiness({ selectedDocuments: [], productFamilies: ['electrical_and_electronics'] });
  assert.deepEqual(a.worthObtaining.map((d) => d.id), b.worthObtaining.map((d) => d.id));
});

test('8. selecting every commonly-relevant document leaves nothing worth obtaining', () => {
  const ids = COMMONLY_RELEVANT_DOCUMENTS.map((d) => d.id);
  const result = computeDocumentReadiness({ selectedDocuments: ids });
  assert.equal(result.worthObtaining.length, 0);
  assert.equal(result.have.length, ids.length);
});

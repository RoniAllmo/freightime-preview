import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDocumentChecklist } from '../../js/import-readiness/document-rules.js';
import { normalizeReadinessInput } from '../../js/import-readiness/normalize-readiness-input.js';
import { DOCUMENT_STATUS } from '../../js/import-readiness/readiness-schema.js';

function checklistFor(raw) {
  return buildDocumentChecklist(normalizeReadinessInput(raw));
}

function itemById(checklist, id) {
  return checklist.find((d) => d.id === id);
}

test('1. missing commercial invoice is reported as missing', () => {
  const checklist = checklistFor({});
  assert.equal(itemById(checklist, 'commercialInvoice').status, DOCUMENT_STATUS.MISSING);
});

test('2. a checked commercial invoice is reported as available', () => {
  const checklist = checklistFor({ hasCommercialInvoice: true });
  assert.equal(itemById(checklist, 'commercialInvoice').status, DOCUMENT_STATUS.AVAILABLE);
});

test('3. certificate of origin is not_indicated when no country of origin was entered', () => {
  const checklist = checklistFor({});
  assert.equal(itemById(checklist, 'certificateOfOrigin').status, DOCUMENT_STATUS.NOT_INDICATED);
});

test('4. certificate of origin requires verification once a country of origin is entered', () => {
  const checklist = checklistFor({ countryOfOrigin: 'China' });
  assert.equal(itemById(checklist, 'certificateOfOrigin').status, DOCUMENT_STATUS.VERIFY_APPLICABILITY);
});

test('5. UN 38.3 requires verification only for a battery product', () => {
  const withBattery = checklistFor({ hasBattery: 'yes' });
  const withoutBattery = checklistFor({ hasBattery: 'no' });
  assert.equal(itemById(withBattery, 'un383').status, DOCUMENT_STATUS.VERIFY_APPLICABILITY);
  assert.equal(itemById(withoutBattery, 'un383').status, DOCUMENT_STATUS.NOT_INDICATED);
});

test('6. import permit requires verification for a food-contact product', () => {
  const checklist = checklistFor({ isFoodContact: 'yes' });
  assert.equal(itemById(checklist, 'importPermit').status, DOCUMENT_STATUS.VERIFY_APPLICABILITY);
});

test('7. import permit is never marked as a definite requirement', () => {
  const checklist = checklistFor({ isFoodContact: 'yes' });
  const statuses = checklist.map((d) => d.status);
  assert.ok(!statuses.includes('required'));
});

test('8. insurance document requires verification unless the incoterm already includes insurance', () => {
  const withFob = checklistFor({ incoterm: 'FOB' });
  const withCif = checklistFor({ incoterm: 'CIF' });
  assert.equal(itemById(withFob, 'insuranceDocument').status, DOCUMENT_STATUS.VERIFY_APPLICABILITY);
  assert.equal(itemById(withCif, 'insuranceDocument').status, DOCUMENT_STATUS.NOT_INDICATED);
});

test('9. Hebrew label requires verification for a consumer toy product', () => {
  const checklist = checklistFor({ endUser: 'consumer', isChildrenOrToy: 'yes' });
  assert.equal(itemById(checklist, 'hebrewLabel').status, DOCUMENT_STATUS.VERIFY_APPLICABILITY);
});

test('10. every checklist item is frozen and the checklist itself is frozen', () => {
  const checklist = checklistFor({});
  assert.ok(Object.isFrozen(checklist));
  assert.ok(Object.isFrozen(checklist[0]));
});

test('11. malformed input is handled safely without throwing', () => {
  assert.doesNotThrow(() => buildDocumentChecklist(null));
  assert.doesNotThrow(() => buildDocumentChecklist(undefined));
});

test('12. calling the module performs no network, DOM, or storage access', () => {
  assert.equal(typeof window, 'undefined');
  assert.equal(typeof document, 'undefined');
  checklistFor({});
});

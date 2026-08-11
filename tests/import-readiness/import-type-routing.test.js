import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeImportTypeAnswer, resolveUncertainImportType, IMPORT_TYPE_DISCLAIMER } from '../../js/import-readiness/import-type-routing.js';
import { IMPORT_TYPE } from '../../js/import-readiness/scenario-schema.js';

test('1. a personal answer normalizes to personal', () => {
  assert.equal(normalizeImportTypeAnswer('personal'), IMPORT_TYPE.PERSONAL);
});

test('2. a commercial answer normalizes to commercial', () => {
  assert.equal(normalizeImportTypeAnswer('commercial'), IMPORT_TYPE.COMMERCIAL);
});

test('3. any unrecognized value safely normalizes to uncertain', () => {
  assert.equal(normalizeImportTypeAnswer('maybe'), IMPORT_TYPE.UNCERTAIN);
  assert.equal(normalizeImportTypeAnswer(null), IMPORT_TYPE.UNCERTAIN);
});

test('4. for-sale-or-distribution leans commercial with the required explanation, never a final determination', () => {
  const result = resolveUncertainImportType({ forSaleOrDistribution: true });
  assert.equal(result.leaning, IMPORT_TYPE.COMMERCIAL);
  assert.ok(result.message.includes('מומלץ לוודא'));
});

test('5. business use leans commercial', () => {
  const result = resolveUncertainImportType({ forBusinessUse: true });
  assert.equal(result.leaning, IMPORT_TYPE.COMMERCIAL);
});

test('6. personal/family use only, with no commercial signal, leans personal', () => {
  const result = resolveUncertainImportType({ personalOrFamilyUseOnly: true });
  assert.equal(result.leaning, IMPORT_TYPE.PERSONAL);
});

test('7. a small quantity flagged for business use still leans commercial (no quantity-based override)', () => {
  const result = resolveUncertainImportType({ forBusinessUse: true, personalOrFamilyUseOnly: false });
  assert.equal(result.leaning, IMPORT_TYPE.COMMERCIAL);
});

test('8. no signal at all safely defaults to the conservative (commercial-leaning) message without a final determination', () => {
  const result = resolveUncertainImportType({});
  assert.ok(result.message.length > 0);
  assert.ok(!result.message.includes('קביעה סופית'));
});

test('9. the required disclaimer text is exported and non-empty', () => {
  assert.ok(IMPORT_TYPE_DISCLAIMER.includes('אינו קביעה משפטית'));
});

test('10. malformed clarification input is handled safely', () => {
  assert.doesNotThrow(() => resolveUncertainImportType(null));
  assert.doesNotThrow(() => resolveUncertainImportType(undefined));
});

test('11. results are frozen', () => {
  assert.ok(Object.isFrozen(resolveUncertainImportType({})));
});

test('12. calling the module performs no network, DOM, or storage access', () => {
  assert.equal(typeof window, 'undefined');
  assert.equal(typeof document, 'undefined');
  resolveUncertainImportType({});
});

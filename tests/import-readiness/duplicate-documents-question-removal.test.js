/**
 * UX correction (product-owner-authorized): the available-documents
 * question was previously asked twice -- once as a narrow 5-checkbox
 * "מידע ומסמכים זמינים" block in the Q3 (product-identity) step, and
 * again as the full canonical 15-document "אילו מסמכים כבר יש לך?"
 * checklist (`selectedDocuments`, name="irDocument") in the
 * productContext step. Only the second instance was ever wired to
 * document-preparation/result rendering (`computeDocumentReadiness`);
 * the first was a narrower, mostly-dead duplicate (only its
 * `hasTechnicalSpec` flag had any effect, and only in one scenario
 * builder). The duplicate Q3 block is removed; the canonical
 * `selectedDocuments` question and state remain the single source of
 * truth, now asked exactly once.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeDocumentReadiness } from '../../js/import-readiness/document-readiness.js';
import { buildFirstCommercialImportResult } from '../../js/import-readiness/first-commercial-import-rules.js';
import { normalizeReadinessInput } from '../../js/import-readiness/normalize-readiness-input.js';

function html() {
  return readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
}

// -----------------------------------------------------------------
// 1-3: the available-documents question appears exactly once, with
// unique ids and valid labels.
// -----------------------------------------------------------------

test('1. the "אילו מסמכים כבר יש לך?" legend appears exactly once in index.html', () => {
  const source = html();
  const matches = source.match(/אילו מסמכים כבר יש לך\?/g) || [];
  assert.equal(matches.length, 1);
});

test('2. exactly one document checklist group (#irDocumentsGroup, name="irDocument") exists, with 15 unique canonical values and no duplicate input id', () => {
  const source = html();
  const groupMatches = source.match(/id="irDocumentsGroup"/g) || [];
  assert.equal(groupMatches.length, 1, 'exactly one irDocumentsGroup container');

  const valueMatches = [...source.matchAll(/name="irDocument" value="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(valueMatches.length, 15);
  const uniqueValues = new Set(valueMatches);
  assert.equal(uniqueValues.size, 15, 'no duplicate document value');
});

test('3. every irDocument checkbox is wrapped in a <label> (a valid associated accessible label), and the removed duplicate Q3 checkboxes no longer exist', () => {
  const source = html();
  const documentsBlock = source.match(/<div class="ir-checklist" id="irDocumentsGroup">[\s\S]*?<\/div>/)[0];
  const checkboxCount = (documentsBlock.match(/<input type="checkbox" name="irDocument"/g) || []).length;
  const labelCount = (documentsBlock.match(/<label>/g) || []).length;
  assert.equal(checkboxCount, 15);
  assert.equal(labelCount, 15, 'every checkbox must be inside its own <label>');

  for (const removedId of ['irHasTechnicalSpec', 'irHasCatalogOrProductPage', 'irHasPhotos', 'irHasSupplierInvoice', 'irHasSupplierProvidedHsCode']) {
    assert.ok(!source.includes(`id="${removedId}"`), `${removedId} must be fully removed from index.html`);
  }
});

test('4. the removed duplicate block left no orphaned structure -- Q3 now has exactly two .ir-form-group sections (identity, customs info), and the secondary intake column (which held the removed group) still contains at least one real control', () => {
  const source = html();
  const q3Match = source.match(/<fieldset class="ir-fieldset" id="irStepQ3"[\s\S]*?<\/fieldset>\s*\n\s*<fieldset class="ir-fieldset" id="irStepProductContext"/);
  assert.ok(q3Match);
  const q3 = q3Match[0];
  const titles = [...q3.matchAll(/class="ir-form-group-title">([^<]+)/g)].map((m) => m[1].trim());
  assert.deepEqual(titles, ['זהות המוצר', 'מידע מכסי']);

  const secondaryMatch = q3.match(/<div class="ir-intake-secondary">[\s\S]*?<\/div>\s*<\/div>\s*<\/fieldset>/);
  assert.ok(secondaryMatch, 'the secondary intake column must still exist');
  assert.ok(/<input/.test(secondaryMatch[0]), 'the secondary intake column must not be left empty -- the customs-info group still has real controls');
});

// -----------------------------------------------------------------
// 5-7: single state property, no conflicting duplicate, available to
// result construction.
// -----------------------------------------------------------------

test('5. import-readiness-controller.js no longer reads the 5 removed duplicate document/HS-code-flag fields', () => {
  const controllerSrc = readFileSync(new URL('../../js/import-readiness/import-readiness-controller.js', import.meta.url), 'utf8');
  for (const removedId of ['irHasTechnicalSpec', 'irHasCatalogOrProductPage', 'irHasPhotos', 'irHasSupplierInvoice', 'irHasSupplierProvidedHsCode']) {
    assert.ok(!controllerSrc.includes(`'${removedId}'`), `controller must no longer read ${removedId}`);
  }
  assert.ok(controllerSrc.includes("selectedDocuments: readCheckedValues(root, 'irDocument')"), 'the single canonical selectedDocuments read must remain, unchanged');
});

test('6. normalize-readiness-input.js no longer normalizes the 5 removed duplicate fields; selectedDocuments normalization is unchanged', () => {
  const normalizeSrc = readFileSync(new URL('../../js/import-readiness/normalize-readiness-input.js', import.meta.url), 'utf8');
  for (const field of ['hasTechnicalSpec', 'hasCatalogOrProductPage', 'hasPhotos', 'hasSupplierInvoice', 'hasSupplierProvidedHsCode']) {
    assert.ok(!normalizeSrc.includes(`${field}: bool(s.${field})`), `${field} normalization must be removed`);
  }
  assert.ok(normalizeSrc.includes('selectedDocuments: stringArray(s.selectedDocuments, DOCUMENT_TYPE)'), 'selectedDocuments normalization must remain, unchanged');
});

test('7. the selected documents remain fully available to document-readiness (result construction) -- computeDocumentReadiness still works from selectedDocuments alone', () => {
  const readiness = computeDocumentReadiness({ selectedDocuments: ['supplier_invoice', 'technical_spec', 'product_photos'] });
  assert.ok(readiness);
  const text = JSON.stringify(readiness);
  assert.ok(text.includes('supplier_invoice') || /available|have/.test(text.toLowerCase()) || readiness.available || readiness.have, 'readiness output must reflect the selected documents in some recognizable way');
});

// -----------------------------------------------------------------
// 8-9: no duplicate state, no conflicting answer possible.
// -----------------------------------------------------------------

test('8. no duplicate document-selection state property remains: normalize-readiness-input.js output has exactly one document-selection (array/checkbox-driven) field, selectedDocuments -- missingDocumentsNote is a legitimately distinct free-text field (an operational "what\'s missing" note, not a duplicate selection mechanism) and is left untouched', () => {
  const normalized = normalizeReadinessInput({ selectedDocuments: ['technical_spec'] });
  assert.equal(Array.isArray(normalized.selectedDocuments), true);
  assert.equal(typeof normalized.missingDocumentsNote, 'string');
  const arrayShapedDocumentKeys = Object.keys(normalized).filter((k) => /document/i.test(k) && Array.isArray(normalized[k]));
  assert.deepEqual(arrayShapedDocumentKeys, ['selectedDocuments']);
});

test('9. no conflicting duplicate answer can be created -- there is only one input mechanism for "do I have a technical spec", so the two former sources can never disagree', () => {
  const withSpec = normalizeReadinessInput({ selectedDocuments: ['technical_spec'] });
  const withoutSpec = normalizeReadinessInput({ selectedDocuments: [] });
  assert.ok(withSpec.selectedDocuments.includes('technical_spec'));
  assert.ok(!withoutSpec.selectedDocuments.includes('technical_spec'));
  // No second, independent "hasTechnicalSpec"-shaped field exists to disagree with the above.
  assert.equal('hasTechnicalSpec' in withSpec, false);
  assert.equal('hasTechnicalSpec' in withoutSpec, false);
});

// -----------------------------------------------------------------
// 10: preparation-item behavior preserved via the single canonical
// source (first-commercial-import-rules.js's technical-spec nudge).
// -----------------------------------------------------------------

test('10. buildFirstCommercialImportResult still suggests preparing a technical spec when the user has not indicated they have one, now derived from selectedDocuments alone', () => {
  const withSpec = buildFirstCommercialImportResult({ selectedDocuments: ['technical_spec'] }, null);
  const withoutSpec = buildFirstCommercialImportResult({ selectedDocuments: [] }, null);
  assert.ok(!withSpec.preparationItems.some((item) => item.includes('מפרט טכני')), 'must not suggest preparing a technical spec when the user already has one');
  assert.ok(withoutSpec.preparationItems.some((item) => item.includes('מפרט טכני')), 'must still suggest preparing a technical spec when the user has none');
});

test('11. buildFirstCommercialImportResult handles missing/malformed selectedDocuments safely (never throws, defaults to "does not have")', () => {
  assert.doesNotThrow(() => buildFirstCommercialImportResult({}, null));
  assert.doesNotThrow(() => buildFirstCommercialImportResult({ selectedDocuments: null }, null));
  const result = buildFirstCommercialImportResult({}, null);
  assert.ok(result.preparationItems.some((item) => item.includes('מפרט טכני')));
});

// -----------------------------------------------------------------
// 12-13: question ordering, no gap, operational flows unaffected.
// -----------------------------------------------------------------

test('12. Q3 and productContext step ordering contains no gap -- both fieldsets are still present and adjacent in source order', () => {
  const source = html();
  const q3Index = source.indexOf('id="irStepQ3"');
  const contextIndex = source.indexOf('id="irStepProductContext"');
  const documentsIndex = source.indexOf('id="irDocumentsGroup"');
  assert.ok(q3Index > -1 && contextIndex > -1 && documentsIndex > -1);
  assert.ok(q3Index < contextIndex, 'Q3 must still precede productContext');
  assert.ok(contextIndex < documentsIndex, 'the surviving documents group must still be inside productContext');
});

test('13. operational-flow (shipment-problem / established-operation) result builders never referenced the removed fields, and remain untouched', () => {
  const files = [
    'js/import-readiness/shipment-problem-rules.js',
    'js/import-readiness/established-operation-rules.js',
    'js/import-readiness/customs-dispute-rules.js',
    'js/import-readiness/cargo-damage-rules.js',
  ];
  for (const rel of files) {
    const content = readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');
    for (const removedId of ['hasTechnicalSpec', 'hasCatalogOrProductPage', 'hasPhotos', 'hasSupplierInvoice', 'hasSupplierProvidedHsCode']) {
      assert.ok(!content.includes(removedId), `${rel} must never have referenced ${removedId}`);
    }
  }
});

// -----------------------------------------------------------------
// 14: document aliases/canonical labels unchanged.
// -----------------------------------------------------------------

test('14. no existing document alias or canonical label changed -- the 15 canonical irDocument values are byte-identical to before this PR', () => {
  const source = html();
  const expected = [
    'supplier_invoice', 'packing_list', 'quote', 'catalog', 'technical_spec', 'product_photos',
    'label_photo', 'usage_instructions', 'manufacturer_declaration', 'certificate_of_origin',
    'test_reports', 'sds_or_msds', 'battery_documents', 'bill_of_lading', 'none_received_yet',
  ];
  const actual = [...source.matchAll(/name="irDocument" value="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(actual, expected);
});

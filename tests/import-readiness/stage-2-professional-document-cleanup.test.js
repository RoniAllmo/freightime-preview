/**
 * Stage 2 cleanup (product-owner approved, 2026-08-28): two proven,
 * narrow technical fixes -- no product-rule change, no professional-
 * routing change, no new document type, no result wording change.
 *
 * 1. TRANSPORT_MINISTRY_LICENSING (professional-category-registry.js)
 *    was exhaustively proven to have zero runtime references anywhere
 *    in the repo -- never assigned as a professionalCategory or
 *    secondaryProfessionalCategory on any rule, never referenced by
 *    any test, generator, or acceptance runner; only a stale
 *    documentation claim. Removed. The vehicle-installed-product rule
 *    continues to use VEHICLE_TESTING_LAB (primary) and
 *    CUSTOMS_CLASSIFIER (secondary) exactly as before -- verified
 *    byte-identical here.
 *
 * 2. document-dedup.js's supplier_invoice alias list was missing
 *    'חשבונית ספק' (existing-importer-rules.js's own preparation-item
 *    wording for that document) and the English 'supplier invoice'
 *    variant -- Hebrew's word-final letter form ("ן" in חשבון) versus
 *    mid-word form ("נ" in חשבונית) means the two phrases never
 *    literally overlap, so the canonical supplier_invoice suggestion
 *    was never suppressed against that route's own item, risking two
 *    differently-worded invoice lines in the same result. Fixed by
 *    adding both missing aliases.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { PROFESSIONAL_CATEGORY } from '../../js/import-readiness/professional-category-registry.js';
import { REGULATORY_SIGNAL_RULES } from '../../js/import-readiness/regulatory-signals/rules-registry.js';
import { dedupeDocumentsAgainstText, DOCUMENT_ALIAS_PATTERNS } from '../../js/import-readiness/document-dedup.js';

// -- TRANSPORT_MINISTRY_LICENSING removal --

test('1. TRANSPORT_MINISTRY_LICENSING no longer exists in the professional-category registry', () => {
  assert.equal('TRANSPORT_MINISTRY_LICENSING' in PROFESSIONAL_CATEGORY, false);
});

test('2. the vehicle-installed-product rule still uses VEHICLE_TESTING_LAB as primary and CUSTOMS_CLASSIFIER as secondary, unchanged', () => {
  const rule = REGULATORY_SIGNAL_RULES.find((r) => r.id === 'vehicle-installed-product');
  assert.ok(rule);
  assert.equal(rule.professionalCategory, 'VEHICLE_TESTING_LAB');
  assert.equal(rule.secondaryProfessionalCategory, 'CUSTOMS_CLASSIFIER');
  assert.equal(rule.professionalDisplayText, 'מעבדת רכב או גורם רישוי מתאים');
});

test('3. no rule anywhere references the removed TRANSPORT_MINISTRY_LICENSING category', () => {
  for (const rule of REGULATORY_SIGNAL_RULES) {
    assert.notEqual(rule.professionalCategory, 'TRANSPORT_MINISTRY_LICENSING');
    assert.notEqual(rule.secondaryProfessionalCategory, 'TRANSPORT_MINISTRY_LICENSING');
  }
});

test('4. VEHICLE_TESTING_LAB itself is unchanged', () => {
  const cat = PROFESSIONAL_CATEGORY.VEHICLE_TESTING_LAB;
  assert.equal(cat.id, 'vehicle_testing_lab');
  assert.equal(cat.name, 'מעבדת רכב מוסמכת');
  assert.equal(cat.ctaLabel, 'לתיאום בדיקה במעבדת רכב');
});

// -- document-dedup alias fix --

function docs() {
  return [{ id: 'supplier_invoice', label: 'חשבון ספק' }];
}

test('5. canonical "חשבון ספק" suggestion is suppressed when the route already shows "חשבונית ספק"', () => {
  const result = dedupeDocumentsAgainstText(docs(), 'חשבונית ספק, תעודת מקור, מפרט טכני');
  assert.deepEqual(result, []);
});

test('6. canonical "חשבון ספק" suggestion is still suppressed against its own pre-existing alias "חשבון ספק"', () => {
  const result = dedupeDocumentsAgainstText(docs(), 'חשבון ספק, אם קיים');
  assert.deepEqual(result, []);
});

test('7. "commercial invoice" (English) still suppresses the canonical suggestion', () => {
  const result = dedupeDocumentsAgainstText(docs(), 'commercial invoice required before shipment');
  assert.deepEqual(result, []);
});

test('8. "supplier invoice" (English) now suppresses the canonical suggestion', () => {
  const result = dedupeDocumentsAgainstText(docs(), 'please prepare the supplier invoice in advance');
  assert.deepEqual(result, []);
});

test('9. mixed Hebrew and English variants in the same text all suppress correctly', () => {
  const result = dedupeDocumentsAgainstText(docs(), 'חשבונית ספק ו-supplier invoice, תעודת מקור');
  assert.deepEqual(result, []);
});

test('10. an unrelated document is never collapsed by the invoice aliases', () => {
  const candidates = [
    { id: 'supplier_invoice', label: 'חשבון ספק' },
    { id: 'certificate_of_origin', label: 'תעודת מקור' },
  ];
  const result = dedupeDocumentsAgainstText(candidates, 'חשבונית ספק');
  assert.deepEqual(result, [{ id: 'certificate_of_origin', label: 'תעודת מקור' }]);
});

test('11. exactly one invoice item remains after dedup when both wordings would otherwise appear', () => {
  const candidates = [{ id: 'supplier_invoice', label: 'חשבון ספק' }];
  const alreadyShown = ['חשבונית ספק', 'תעודת מקור', 'מפרט טכני'].join(' \n ');
  const remaining = dedupeDocumentsAgainstText(candidates, alreadyShown);
  assert.equal(remaining.length, 0, 'the canonical suggestion must not duplicate the already-shown item');
});

test('12. no unrelated document alias entry was changed', () => {
  assert.deepEqual(DOCUMENT_ALIAS_PATTERNS.packing_list, ['packing list', 'רשימת אריזה']);
  assert.deepEqual(DOCUMENT_ALIAS_PATTERNS.technical_spec, ['מפרט טכני']);
  assert.deepEqual(DOCUMENT_ALIAS_PATTERNS.certificate_of_origin, ['תעודת מקור']);
  assert.deepEqual(DOCUMENT_ALIAS_PATTERNS.product_photos, ['תמונות מוצר', 'תמונות של המוצר']);
  assert.deepEqual(DOCUMENT_ALIAS_PATTERNS.label_photo, ['תמונת תווית', 'תמונת התווית']);
});

test('13. the fixed supplier_invoice alias list contains exactly the expected 6 entries, no more', () => {
  assert.deepEqual(DOCUMENT_ALIAS_PATTERNS.supplier_invoice, [
    'חשבון ספק', 'חשבונית ספק', 'חשבון מסחרי', 'חשבונית מסחרית', 'commercial invoice', 'supplier invoice',
  ]);
});

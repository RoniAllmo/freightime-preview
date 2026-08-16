/**
 * Purely mechanical document-readiness / completeness bookkeeping for
 * the Import Readiness assessment.
 *
 * This module NEVER asserts a regulatory requirement ("you must have a
 * certificate of origin for this product"). It only reports, from
 * documents the user has already indicated having (or not), which of a
 * small set of commonly-useful, generically-relevant import documents
 * they have not yet indicated -- neutral completeness bookkeeping, the
 * same category of thing as an unchecked checkbox, never a compliance
 * claim tied to a product category.
 *
 * Pure, deterministic, DOM-free, network-free, storage-free.
 */

import { DOCUMENT_TYPE } from './layered-question-model.js';

/** Documents that are commonly useful for most commercial-import paths, in a stable priority order. Static, product-family-independent -- deliberately not a category-specific requirement list. */
export const COMMONLY_RELEVANT_DOCUMENTS = Object.freeze([
  { id: 'supplier_invoice', label: 'חשבון ספק' },
  { id: 'packing_list', label: 'Packing List' },
  { id: 'technical_spec', label: 'מפרט טכני' },
  { id: 'product_photos', label: 'תמונות מוצר' },
  { id: 'label_photo', label: 'תמונת תווית' },
  { id: 'certificate_of_origin', label: 'תעודת מקור' },
]);

const DOCUMENT_LABEL = Object.freeze(
  Object.fromEntries([
    ...COMMONLY_RELEVANT_DOCUMENTS.map((d) => [d.id, d.label]),
    ['quote', 'הצעת מחיר'],
    ['catalog', 'קטלוג'],
    ['usage_instructions', 'הוראות שימוש'],
    ['manufacturer_declaration', 'הצהרת יצרן'],
    ['test_reports', 'מסמכי בדיקה'],
    ['sds_or_msds', 'SDS או MSDS'],
    ['battery_documents', 'מסמכי סוללה'],
    ['bill_of_lading', 'שטר מטען'],
    ['none_received_yet', 'טרם התקבלו מסמכים'],
  ]),
);

function isValidDocumentId(id) {
  return DOCUMENT_TYPE.includes(id);
}

/**
 * @param {{ selectedDocuments?: string[] }} answers - multi-select
 *   answer to "אילו מסמכים כבר יש לך?".
 * @returns {Readonly<{
 *   have: Array<{id:string,label:string}>,
 *   worthObtaining: Array<{id:string,label:string}>,
 *   noneReceivedYet: boolean,
 * }>}
 */
export function computeDocumentReadiness(answers) {
  const a = answers !== null && typeof answers === 'object' ? answers : {};
  const selected = Array.isArray(a.selectedDocuments) ? a.selectedDocuments.filter(isValidDocumentId) : [];
  const selectedSet = new Set(selected);
  const noneReceivedYet = selectedSet.has('none_received_yet');

  const have = selected
    .filter((id) => id !== 'none_received_yet')
    .map((id) => Object.freeze({ id, label: DOCUMENT_LABEL[id] ?? id }));

  const worthObtaining = COMMONLY_RELEVANT_DOCUMENTS
    .filter((d) => !selectedSet.has(d.id))
    .map((d) => Object.freeze({ ...d }));

  return Object.freeze({
    have: Object.freeze(have),
    worthObtaining: Object.freeze(worthObtaining),
    noneReceivedYet,
  });
}

export { DOCUMENT_LABEL };

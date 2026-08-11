/**
 * First-commercial-import scenario result builder. Educational and
 * operational -- identifies which professional information may be
 * required rather than asking every technical question in the system.
 *
 * Pure, deterministic, DOM-free, network-free, storage-free.
 */

import { actionItem, buildStandardResult, resolveOfficialSources, CLASSIFICATION_REVIEW_NEEDED_MESSAGE, TECHNICAL_DETAIL_BOUNDARY_MESSAGE, USER_PROVIDED_HS_CODE_NOTE } from './build-action-map.js';
import { ACTION_STATUS } from './scenario-schema.js';

export const CLASSIFICATION_INPUTS_NOTE =
  'לצורך בדיקת סיווג ורגולציה עשויים להידרש מפרט טכני, הרכב חומרים, נתוני חשמל, אופן פעולה, דגם, שימוש ותמונות, בהתאם למוצר.';

export function buildFirstCommercialImportResult(input) {
  const i = input !== null && typeof input === 'object' ? input : {};

  const known = [];
  if (i.productName) known.push(actionItem('product-name', `מוצר: ${i.productName}`, ACTION_STATUS.KNOWN));
  if (i.commercialDescription) known.push(actionItem('description', `תיאור: ${i.commercialDescription}`, ACTION_STATUS.KNOWN));
  if (i.intendedUse) known.push(actionItem('use', `ייעוד: ${i.intendedUse}`, ACTION_STATUS.KNOWN));

  const missing = [];
  if (!i.commercialDescription) missing.push(actionItem('description', 'תיאור מסחרי של המוצר', ACTION_STATUS.NEEDS_INFO));
  if (!i.intendedUse) missing.push(actionItem('use', 'ייעוד/שימוש מיועד', ACTION_STATUS.NEEDS_INFO));

  const toCheck = [
    actionItem('technical-inputs', CLASSIFICATION_INPUTS_NOTE, ACTION_STATUS.NEEDS_CHECK),
    actionItem('technical-boundary', TECHNICAL_DETAIL_BOUNDARY_MESSAGE, ACTION_STATUS.NEEDS_CHECK),
  ];

  const documentsToPrepare = [
    actionItem('invoice', 'חשבון מסחרי (Commercial Invoice)', ACTION_STATUS.BEFORE_SHIPMENT),
    actionItem('packing-list', 'רשימת אריזה (Packing List)', ACTION_STATUS.BEFORE_SHIPMENT),
    actionItem('supplier-docs', 'מסמכי ספק (הצהרה, מפרט, קטלוג, ככל שקיימים)', ACTION_STATUS.BEFORE_ORDER),
  ];
  if (!i.hasTechnicalSpec) documentsToPrepare.push(actionItem('technical-spec', 'מפרט טכני מהספק, אם קיים', ACTION_STATUS.BEFORE_ORDER));
  if (!i.hasSupplierInvoice) documentsToPrepare.push(actionItem('supplier-invoice', 'הצעת מחיר/חשבון מהספק', ACTION_STATUS.BEFORE_ORDER));

  const beforeOrder = [
    actionItem('confirm-classification', 'בדיקת סיווג ורגולציה ראשונית מול עמיל מכס לפני סגירת ההזמנה', ACTION_STATUS.BEFORE_ORDER),
    actionItem('confirm-supplier-docs', 'לבקש מהספק מפרט טכני, קטלוג ותמונות ככל שרלוונטי', ACTION_STATUS.BEFORE_ORDER),
  ];

  const beforeShipment = [
    actionItem('confirm-invoice-packing', 'לוודא קבלת חשבון מסחרי ורשימת אריזה תואמים', ACTION_STATUS.BEFORE_SHIPMENT),
    actionItem('confirm-origin', 'לוודא מדינת מקור ותיעוד נדרש', ACTION_STATUS.BEFORE_SHIPMENT),
  ];

  const risks = [
    actionItem('delay-risk', 'מסמכים חסרים או סיווג לא ברור עלולים לעכב שחרור ולהוסיף עלויות אחסנה', ACTION_STATUS.NEEDS_CHECK),
  ];

  const whenProfessionalReviewNeeded = [
    actionItem('classification-review', CLASSIFICATION_REVIEW_NEEDED_MESSAGE, ACTION_STATUS.PROFESSIONAL_REVIEW),
  ];
  if (i.hsCodeKnown && i.hsCode) {
    whenProfessionalReviewNeeded.push(actionItem('hs-code-note', `קוד מכס שהוזן: ${i.hsCode}. ${USER_PROVIDED_HS_CODE_NOTE}`, ACTION_STATUS.PROFESSIONAL_REVIEW));
  }

  return buildStandardResult({
    scenario: 'first_commercial',
    routeLabel: 'יבוא מסחרי ראשון',
    sections: { known, missing, toCheck, documentsToPrepare, beforeOrder, beforeShipment, risks, whenProfessionalReviewNeeded },
    officialSources: resolveOfficialSources(['customs-tariff', 'free-import-order']),
    ctas: [
      { id: 'classification-check', label: 'בדיקת סיווג מכס' },
      { id: 'regulation-check', label: 'בדיקת רגולציה' },
      { id: 'supplier-docs-check', label: 'בדיקת מסמכי ספק' },
      { id: 'shipping-quote', label: 'הצעת שילוח' },
      { id: 'brokerage-service', label: 'שירות עמילות מכס' },
    ],
  });
}

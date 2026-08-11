/**
 * Personal-import scenario result builder. Deliberately short -- never
 * expands into a commercial-import checklist. Never claims personal
 * import is automatically exempt from standards, permits, taxes,
 * restrictions, labeling, or inspection.
 *
 * Pure, deterministic, DOM-free, network-free, storage-free.
 */

import { actionItem, buildStandardResult, resolveOfficialSources, PROFESSIONAL_ROLES } from './build-action-map.js';
import { ACTION_STATUS } from './scenario-schema.js';

const SENSITIVE_CATEGORY_SOURCE = Object.freeze({
  food: 'health-ministry',
  cosmetics: 'health-ministry',
  health_or_medical: 'health-ministry',
  communications_or_wireless: 'communications-ministry',
  vehicle_or_transport: 'transport-ministry',
  agriculture: 'agriculture-ministry',
  chemical_or_hazardous: 'environmental-protection-ministry',
  electrical: 'standards-institution',
  battery: 'standards-institution',
  toy_or_childrens: 'standards-institution',
});

export const PERSONAL_IMPORT_NOT_AUTOMATICALLY_EXEMPT_NOTE =
  'יבוא אישי אינו פטור אוטומטית מתקנים, היתרים, מסים, הגבלות, סימון או בדיקה. חלק מהמוצרים נותרים כפופים לדרישות גם ביבוא אישי.';

/**
 * @param {*} input - A normalized readiness input.
 * @returns {Readonly<object>} A standard scenario result.
 */
export function buildPersonalImportResult(input) {
  const i = input !== null && typeof input === 'object' ? input : {};

  const known = [];
  if (i.commercialDescription) known.push(actionItem('product', `מוצר: ${i.commercialDescription}`, ACTION_STATUS.KNOWN));
  if (i.quantity) known.push(actionItem('quantity', `כמות: ${i.quantity}`, ACTION_STATUS.KNOWN));
  if (i.countryOfOrigin) known.push(actionItem('origin', `מדינת מקור: ${i.countryOfOrigin}`, ACTION_STATUS.KNOWN));

  const missing = [];
  if (!i.approxValue) missing.push(actionItem('value', 'ערך משוער של הפריט', ACTION_STATUS.NEEDS_INFO));
  if (i.shipmentMethod === 'unknown') missing.push(actionItem('shipment-method', 'אמצעי המשלוח', ACTION_STATUS.NEEDS_INFO));

  const toCheck = [actionItem('personal-exemption', PERSONAL_IMPORT_NOT_AUTOMATICALLY_EXEMPT_NOTE, ACTION_STATUS.NEEDS_CHECK)];
  const sourceCategories = [];
  if (i.sensitiveCategory && i.sensitiveCategory !== 'none_known' && i.sensitiveCategory !== 'not_sure') {
    toCheck.push(
      actionItem(
        'sensitive-category',
        'המוצר מסומן כשייך לקטגוריה שעשויה להיות רגישה -- מומלץ לוודא דרישות ספציפיות לקטגוריה זו לפני הזמנה.',
        ACTION_STATUS.NEEDS_CHECK,
      ),
    );
    const source = SENSITIVE_CATEGORY_SOURCE[i.sensitiveCategory];
    if (source) sourceCategories.push(source);
  }

  const documentsToPrepare = [
    actionItem('receipt', 'חשבונית/אישור רכישה', ACTION_STATUS.BEFORE_SHIPMENT),
    actionItem('tracking-doc', 'מסמך משלוח או מספר מעקב, אם קיים', ACTION_STATUS.BEFORE_SHIPMENT),
  ];

  const whenProfessionalReviewNeeded =
    i.sensitiveCategory && i.sensitiveCategory !== 'none_known' && i.sensitiveCategory !== 'not_sure'
      ? [
          actionItem(
            'professional-review',
            `אם המוצר אכן שייך לקטגוריה הרגישה שסומנה, מומלץ לוודא מול ${PROFESSIONAL_ROLES.QUALIFIED_PROFESSIONAL} או הרשות הרלוונטית לפני הזמנה.`,
            ACTION_STATUS.PROFESSIONAL_REVIEW,
          ),
        ]
      : [];

  return buildStandardResult({
    scenario: 'personal',
    routeLabel: 'יבוא אישי',
    sections: { known, missing, toCheck, documentsToPrepare, whenProfessionalReviewNeeded },
    officialSources: resolveOfficialSources(sourceCategories),
    ctas: [
      { id: 'product-requirements', label: 'בדיקת דרישות למוצר' },
      { id: 'document-help', label: 'עזרה בהבנת מסמכים' },
      { id: 'official-source', label: 'מעבר למקור הרשמי' },
    ],
  });
}

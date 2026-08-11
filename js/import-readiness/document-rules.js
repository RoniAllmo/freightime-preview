/**
 * Explainable document checklist for FreighTime Import Readiness Check V1.
 *
 * Pure, deterministic, DOM-free, network-free, storage-free. Every
 * checklist item's status is derived only from the user's own answers --
 * never from an assumption about what regulation applies. Conditional
 * documents are only ever labeled `may_be_required` or
 * `verify_applicability`, never a definite requirement, per the
 * product's classification-safety rules.
 */

import { DOCUMENT_STATUS } from './readiness-schema.js';

/**
 * @typedef {Readonly<{id: string, label: string, status: string, reason: string}>} DocumentChecklistItem
 */

function coreItem(id, label, has) {
  return Object.freeze({
    id,
    label,
    status: has ? DOCUMENT_STATUS.AVAILABLE : DOCUMENT_STATUS.MISSING,
    reason: has ? 'המסמך סומן כזמין' : 'מסמך מסחרי בסיסי שטרם סומן כזמין',
  });
}

function conditionalItem(id, label, has, applies, reason) {
  if (has) {
    return Object.freeze({ id, label, status: DOCUMENT_STATUS.AVAILABLE, reason: 'המסמך סומן כזמין' });
  }
  if (!applies) {
    return Object.freeze({
      id,
      label,
      status: DOCUMENT_STATUS.NOT_INDICATED,
      reason: 'לא עולה כרלוונטי מהתשובות שהוזנו',
    });
  }
  return Object.freeze({ id, label, status: DOCUMENT_STATUS.VERIFY_APPLICABILITY, reason });
}

/**
 * Build the full document checklist for a normalized readiness input.
 *
 * @param {*} input - A normalized input from `normalizeReadinessInput`, or
 *   any other malformed/unexpected value (handled safely).
 * @returns {ReadonlyArray<DocumentChecklistItem>}
 */
export function buildDocumentChecklist(input) {
  const raw = input !== null && typeof input === 'object' ? input : {};
  const in_ = {
    ...raw,
    commercialDescription: typeof raw.commercialDescription === 'string' ? raw.commercialDescription : '',
    countryOfOrigin: typeof raw.countryOfOrigin === 'string' ? raw.countryOfOrigin : '',
    isElectrical: raw.isElectrical ?? 'unknown',
    isWireless: raw.isWireless ?? 'unknown',
    isFoodContact: raw.isFoodContact ?? 'unknown',
    isMedicalOrHealth: raw.isMedicalOrHealth ?? 'unknown',
    isCosmeticOrPersonalCare: raw.isCosmeticOrPersonalCare ?? 'unknown',
    isChildrenOrToy: raw.isChildrenOrToy ?? 'unknown',
    isAutomotiveOrTransport: raw.isAutomotiveOrTransport ?? 'unknown',
    isAgricultureOrFood: raw.isAgricultureOrFood ?? 'unknown',
    isChemicalOrHazardous: raw.isChemicalOrHazardous ?? 'unknown',
    hasBattery: raw.hasBattery ?? 'unknown',
    hasUn383: raw.hasUn383 ?? 'unknown',
    hasMsds: raw.hasMsds ?? 'unknown',
    primaryMaterial: typeof raw.primaryMaterial === 'string' ? raw.primaryMaterial : '',
    incoterm: typeof raw.incoterm === 'string' ? raw.incoterm : '',
    endUser: raw.endUser ?? 'unknown',
  };

  const items = [
    coreItem('commercialInvoice', 'חשבון מסחרי (Commercial Invoice)', in_.hasCommercialInvoice),
    coreItem('packingList', 'רשימת אריזה (Packing List)', in_.hasPackingList),
    coreItem('transportDocument', 'מסמך הובלה (שטר מטען / AWB / אישור מסירה)', in_.hasTransportDocument),
    conditionalItem(
      'technicalDescription',
      'תיאור טכני של המוצר',
      in_.commercialDescription.length > 0,
      true,
      'תיאור טכני נדרש כמעט תמיד לצורך בחינת סיווג ורגולציה',
    ),
    conditionalItem(
      'certificateOfOrigin',
      'תעודת מקור (Certificate of Origin)',
      in_.hasCertificateOfOrigin,
      in_.countryOfOrigin.length > 0,
      'ייתכן שנדרשת בהתאם למדינת המקור ולהסכמי סחר -- יש לוודא מול עמיל מכס',
    ),
    conditionalItem(
      'technicalDatasheet',
      'גיליון נתונים טכני (Datasheet)',
      in_.hasTechnicalDatasheet,
      !in_.hsCodeKnown || in_.isElectrical === 'yes' || in_.isWireless === 'yes',
      'מסייע בבחינת סיווג ורגולציה כאשר קוד המכס אינו ידוע או שמדובר במוצר חשמלי/אלחוטי',
    ),
    conditionalItem('catalog', 'קטלוג יצרן', in_.hasCatalog, in_.technicalCatalogAvailable === false && !in_.hsCodeKnown, 'עשוי לסייע לבחינת הסיווג כאשר אין קוד מכס ידוע'),
    conditionalItem(
      'productPhotos',
      'תמונות מוצר',
      in_.productPhotoAvailable === true,
      !in_.hsCodeKnown,
      'עשויות לסייע לבחינת הסיווג כאשר קוד המכס אינו ידוע',
    ),
    conditionalItem(
      'supplierDeclaration',
      'הצהרת ספק על הרכב/ייעוד המוצר',
      in_.hasSupplierDeclaration,
      in_.primaryMaterial.length === 0 || in_.isChemicalOrHazardous === 'unknown',
      'עשויה לסייע כאשר פרטי ההרכב אינם מלאים',
    ),
    conditionalItem(
      'testReport',
      'דו״ח בדיקה מעבדתי',
      in_.hasTestReport,
      ['isElectrical', 'isMedicalOrHealth', 'isFoodContact', 'isCosmeticOrPersonalCare', 'isChildrenOrToy'].some(
        (f) => in_[f] === 'yes',
      ),
      'ייתכן שנדרש דו״ח בדיקה בהתאם לקטגוריית המוצר -- יש לוודא מול הרשות הרלוונטית',
    ),
    conditionalItem(
      'msds',
      'גיליון בטיחות חומר (MSDS)',
      in_.hasMsds === 'yes',
      in_.hasBattery === 'yes' || in_.isChemicalOrHazardous === 'yes',
      'ייתכן שנדרש להובלת חומרים כימיים או סוללות',
    ),
    conditionalItem('un383', 'אישור UN 38.3 להובלת סוללות', in_.hasUn383 === 'yes', in_.hasBattery === 'yes', 'נדרש לרוב להובלה אווירית/ימית של סוללות ליתיום -- יש לוודא מול המוביל'),
    conditionalItem(
      'conformityDeclaration',
      'הצהרת התאמה (CE / תקן רלוונטי)',
      in_.hasConformityDocuments,
      in_.isElectrical === 'yes' || in_.isWireless === 'yes' || in_.isChildrenOrToy === 'yes',
      'ייתכן שנדרשת הצהרת התאמה בהתאם לסוג המוצר -- יש לוודא מול מכון התקנים',
    ),
    conditionalItem(
      'importPermit',
      'אישור/היתר יבוא',
      in_.hasImportPermit,
      ['isMedicalOrHealth', 'isFoodContact', 'isAgricultureOrFood', 'isCosmeticOrPersonalCare', 'isChemicalOrHazardous'].some(
        (f) => in_[f] === 'yes',
      ),
      'ייתכן שנדרש היתר ממשרד ממשלתי רלוונטי -- יש לוודא מול הרשות המוסמכת',
    ),
    conditionalItem(
      'standardsDocumentation',
      'תיעוד עמידה בתקן ישראלי',
      in_.hasStandardsDocumentation,
      in_.isElectrical === 'yes' || in_.isAutomotiveOrTransport === 'yes' || in_.isChildrenOrToy === 'yes',
      'ייתכן שהמוצר כפוף לתקן רשמי -- יש לוודא מול מכון התקנים הישראלי',
    ),
    conditionalItem(
      'hebrewLabel',
      'תווית/הוראות בעברית',
      in_.hasHebrewLabel,
      in_.endUser === 'consumer' && (in_.isFoodContact === 'yes' || in_.isCosmeticOrPersonalCare === 'yes' || in_.isChildrenOrToy === 'yes'),
      'ייתכן שנדרשת תווית בעברית למוצרי צריכה בקטגוריות אלה',
    ),
    conditionalItem(
      'insuranceDocument',
      'מסמך ביטוח מטען',
      in_.hasInsuranceDocument,
      in_.incoterm !== 'CIF' && in_.incoterm !== 'CIP' && in_.incoterm !== 'unknown' && in_.incoterm.length > 0,
      'תנאי המסירה שנבחר אינו כולל ביטוח מטען מטעם הספק -- מומלץ לבדוק כיסוי ביטוחי',
    ),
  ];

  return Object.freeze(items);
}

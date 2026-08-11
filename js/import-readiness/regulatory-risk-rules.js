/**
 * Deterministic, explainable regulatory-risk rule engine for FreighTime
 * Import Readiness Check V1.
 *
 * Each rule is a small, frozen declaration: an `id`, `category`,
 * `trigger(input)` predicate, `severity`, and human-readable `reason`,
 * `missingInput`, `recommendedCheck`, `sourceCategory`, and
 * `professionalReviewFlag`. `buildRegulatoryRisks` runs every rule
 * against the normalized input and returns only the ones that trigger --
 * there is no hidden scoring step that cannot be traced back to a single
 * named rule. No rule ever asserts that a permit, standard, tax, or
 * approval definitely applies; every triggered rule states only that the
 * topic requires verification.
 */

import { RISK_SEVERITY } from './readiness-schema.js';

/**
 * @typedef {Readonly<{
 *   id: string, category: string, severity: string, reason: string,
 *   missingInput: string, recommendedCheck: string, sourceCategory: string,
 *   professionalReviewFlag: boolean
 * }>} RegulatoryRisk
 */

function rule(id, category, trigger, severity, reason, missingInput, recommendedCheck, sourceCategory, professionalReviewFlag) {
  return Object.freeze({ id, category, trigger, severity, reason, missingInput, recommendedCheck, sourceCategory, professionalReviewFlag });
}

const RULES = Object.freeze([
  rule(
    'incomplete-description',
    'classification-uncertainty',
    (i) => i.commercialDescription.length === 0,
    RISK_SEVERITY.HIGH,
    'לא הוזן תיאור מסחרי של המוצר',
    'תיאור מסחרי',
    'להשלים תיאור מסחרי מפורט של המוצר לפני המשך הבדיקה',
    'customs-tariff',
    true,
  ),
  rule(
    'missing-intended-use',
    'classification-uncertainty',
    (i) => i.intendedUse.length === 0,
    RISK_SEVERITY.ATTENTION,
    'לא הוזן ייעוד/שימוש מיועד למוצר',
    'ייעוד המוצר',
    'להגדיר את השימוש המיועד -- משפיע על סיווג ועל רגולציה אפשרית',
    'customs-tariff',
    false,
  ),
  rule(
    'missing-material',
    'incomplete-product-description',
    (i) => i.primaryMaterial.length === 0,
    RISK_SEVERITY.ATTENTION,
    'לא הוזן חומר הרכב עיקרי',
    'חומר הרכב עיקרי',
    'להשלים את חומר ההרכב העיקרי -- נדרש כמעט תמיד לסיווג מכס',
    'customs-tariff',
    false,
  ),
  rule(
    'unknown-origin',
    'origin-document-uncertainty',
    (i) => i.countryOfOrigin.length === 0,
    RISK_SEVERITY.ATTENTION,
    'לא הוזנה מדינת מקור',
    'מדינת מקור',
    'לוודא את מדינת המקור בפועל של המוצר, ולא רק מדינת הספק',
    'free-import-order',
    false,
  ),
  rule(
    'missing-invoice',
    'missing-commercial-invoice-fields',
    (i) => !i.hasCommercialInvoice,
    RISK_SEVERITY.HIGH,
    'לא סומן חשבון מסחרי כזמין',
    'חשבון מסחרי',
    'לקבל חשבון מסחרי מהספק לפני שילוח',
    'customs-tariff',
    false,
  ),
  rule(
    'missing-packing-list',
    'missing-packing-information',
    (i) => !i.hasPackingList,
    RISK_SEVERITY.ATTENTION,
    'לא סומנה רשימת אריזה כזמינה',
    'רשימת אריזה',
    'לקבל רשימת אריזה מהספק לפני שילוח',
    'customs-tariff',
    false,
  ),
  rule(
    'electrical-review',
    'electrical-product-review',
    (i) => i.isElectrical === 'yes',
    RISK_SEVERITY.ATTENTION,
    'המוצר סומן כחשמלי -- ייתכן שנדרש תיעוד עמידה בתקן ובטיחות חשמלית',
    'מתח, תדר, הספק ותיעוד התאמה',
    'לוודא דרישות תקן ובטיחות חשמלית מול מכון התקנים הישראלי',
    'standards-institution',
    true,
  ),
  rule(
    'battery-transport-review',
    'battery-transport-review',
    (i) => i.hasBattery === 'yes',
    RISK_SEVERITY.HIGH,
    'המוצר כולל סוללה -- הובלה בינלאומית של סוללות כפופה לרוב לדרישות תיעוד ואריזה מיוחדות',
    'סוג כימי, אישור UN 38.3 וגיליון בטיחות',
    'לוודא דרישות הובלת סוללות מול המוביל ולפני שילוח',
    'transport-ministry',
    true,
  ),
  rule(
    'wireless-review',
    'radio-or-communications-review',
    (i) => i.isWireless === 'yes',
    RISK_SEVERITY.ATTENTION,
    'המוצר כולל תקשורת אלחוטית -- ייתכן שנדרש אישור תדרים או תיעוד תקשורת',
    'טכנולוגיה, תדר ותיעוד תקשורת',
    'לוודא מול משרד התקשורת האם נדרש אישור תדרים',
    'communications-ministry',
    true,
  ),
  rule(
    'food-contact-review',
    'food-product-review',
    (i) => i.isFoodContact === 'yes',
    RISK_SEVERITY.HIGH,
    'המוצר מיועד למגע עם מזון -- ייתכן שנדרש אישור משרד הבריאות',
    'חומר, סוג מזון ותיעוד עמידה בתקן מגע מזון',
    'לוודא דרישות מגע-מזון מול משרד הבריאות',
    'health-ministry',
    true,
  ),
  rule(
    'agriculture-review',
    'agriculture-or-veterinary-review',
    (i) => i.isAgricultureOrFood === 'yes',
    RISK_SEVERITY.HIGH,
    'המוצר עשוי להיות כפוף לפיקוח משרד החקלאות',
    'מקור, סוג המוצר ותיעוד וטרינרי/פיטוסניטרי',
    'לוודא דרישות יבוא חקלאי מול משרד החקלאות',
    'agriculture-ministry',
    true,
  ),
  rule(
    'cosmetic-review',
    'cosmetic-product-review',
    (i) => i.isCosmeticOrPersonalCare === 'yes',
    RISK_SEVERITY.ATTENTION,
    'המוצר קוסמטי/לטיפוח אישי -- ייתכן שנדרש תיעוד עמידה בדרישות משרד הבריאות',
    'הרכב והצהרת בטיחות',
    'לוודא דרישות רגולציה קוסמטית מול משרד הבריאות',
    'health-ministry',
    true,
  ),
  rule(
    'medical-device-review',
    'medical-device-review',
    (i) => i.isMedicalOrHealth === 'yes',
    RISK_SEVERITY.HIGH,
    'המוצר קשור לבריאות/רפואה -- ייתכן שהוא כפוף לרגולציית ציוד רפואי',
    'סיווג רפואי ותיעוד עמידה בתקן',
    'לוודא מול משרד הבריאות האם נדרש רישום כציוד רפואי',
    'health-ministry',
    true,
  ),
  rule(
    'toy-review',
    'labeling-review',
    (i) => i.isChildrenOrToy === 'yes',
    RISK_SEVERITY.HIGH,
    'המוצר מיועד לילדים/צעצוע -- כפוף לרוב לתקן בטיחות ולתווית בעברית',
    'תיעוד עמידה בתקן צעצועים ותווית בעברית',
    'לוודא דרישות תקן צעצועים מול מכון התקנים הישראלי',
    'standards-institution',
    true,
  ),
  rule(
    'automotive-review',
    'transport-product-review',
    (i) => i.isAutomotiveOrTransport === 'yes',
    RISK_SEVERITY.ATTENTION,
    'המוצר קשור לרכב/תחבורה -- ייתכן שכפוף לתקן משרד התחבורה',
    'תיעוד עמידה בתקן רכב',
    'לוודא דרישות מול משרד התחבורה',
    'transport-ministry',
    true,
  ),
  rule(
    'chemical-review',
    'chemical-or-hazardous-goods-review',
    (i) => i.isChemicalOrHazardous === 'yes',
    RISK_SEVERITY.HIGH,
    'המוצר כימי/מסוכן -- כפוף לרוב לדרישות תיעוד, אריזה והובלה מיוחדות',
    'גיליון בטיחות (MSDS) ותיעוד סיווג מסוכן',
    'לוודא דרישות הובלת חומרים מסוכנים מול המוביל ומול המשרד להגנת הסביבה',
    'environmental-protection-ministry',
    true,
  ),
  rule(
    'sample-quantity',
    'sample-versus-commercial-quantity-risk',
    (i) => i.quantityType === 'sample',
    RISK_SEVERITY.INFORMATION,
    'הכמות סומנה כדוגמה -- ייתכנו כללי יבוא שונים מכמות מסחרית',
    '—',
    'לוודא האם קיימות הקלות/כללים שונים ליבוא דוגמאות',
    'customs-tariff',
    false,
  ),
  rule(
    'unknown-shipment-mode',
    'shipment-mode-documentation-risk',
    (i) => i.shipmentMode === 'unknown',
    RISK_SEVERITY.INFORMATION,
    'אמצעי ההובלה טרם נבחר -- מסמכי ההובלה הנדרשים תלויים באמצעי',
    'אמצעי הובלה',
    'לבחור אמצעי הובלה כדי להבין אילו מסמכי הובלה נדרשים',
    'customs-tariff',
    false,
  ),
  rule(
    'hs-code-unknown',
    'classification-uncertainty',
    (i) => !i.hsCodeKnown,
    RISK_SEVERITY.ATTENTION,
    'קוד המכס (HS) אינו ידוע',
    'קוד מכס (HS)',
    'איסוף מידע טכני מלא לצורך בדיקת סיווג מול עמיל מכס',
    'customs-tariff',
    true,
  ),
]);

/**
 * Run every regulatory-risk rule against a normalized readiness input and
 * return only the risks that triggered.
 *
 * @param {*} input - A normalized input from `normalizeReadinessInput`, or
 *   any other malformed/unexpected value (handled safely).
 * @returns {ReadonlyArray<RegulatoryRisk>}
 */
export function buildRegulatoryRisks(input) {
  const in_ = input !== null && typeof input === 'object' ? input : {};
  const triggered = RULES.filter((r) => {
    try {
      return r.trigger(in_) === true;
    } catch {
      return false;
    }
  }).map((r) =>
    Object.freeze({
      id: r.id,
      category: r.category,
      severity: r.severity,
      reason: r.reason,
      missingInput: r.missingInput,
      recommendedCheck: r.recommendedCheck,
      sourceCategory: r.sourceCategory,
      professionalReviewFlag: r.professionalReviewFlag,
    }),
  );
  return Object.freeze(triggered);
}

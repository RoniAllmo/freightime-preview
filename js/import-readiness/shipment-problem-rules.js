/**
 * Shipment-already-in-progress / problem scenario result builder.
 * Careful, non-committal operational wording -- never admits fault,
 * never assigns liability, never requests a file upload.
 *
 * Pure, deterministic, DOM-free, network-free, storage-free.
 */

import { buildProblemResult, resolveOfficialSources } from './build-action-map.js';

const URGENT = 'דחוף';
const ATTENTION = 'דורש תשומת לב';

const PROBLEM_CONFIG = Object.freeze({
  missing_document: {
    label: 'מסמך חסר',
    urgency: ATTENTION,
    dataToGather: ['רשימת המסמכים שהתבקשו', 'מסמכים קיימים שכבר נשלחו'],
    partyToCheckWith: 'עמיל המכס או הגורם שדרש את המסמך',
  },
  missing_import_permit: {
    label: 'אישור יבוא חסר',
    urgency: URGENT,
    dataToGather: ['סוג האישור הנדרש', 'הרשות המנפיקה', 'סטטוס בקשה קיימת, אם הוגשה'],
    partyToCheckWith: 'הרשות המוסמכת הרלוונטית',
  },
  customs_inspection: {
    label: 'בדיקת מכס או בדיקה פיזית',
    urgency: ATTENTION,
    dataToGather: ['סיבת הבדיקה, אם נמסרה', 'מיקום המטען הנוכחי'],
    partyToCheckWith: 'עמיל המכס',
  },
  classification_dispute: {
    label: 'סיווג במחלוקת',
    urgency: ATTENTION,
    dataToGather: ['הסיווג שהוצע על ידכם', 'הסיווג שנקבע על ידי הרשות', 'נימוק שנמסר, אם קיים'],
    partyToCheckWith: 'עמיל המכס ומסווג מכס מקצועי',
  },
  value_dispute: {
    label: 'ערך במחלוקת',
    urgency: ATTENTION,
    dataToGather: ['חשבון מסחרי מקורי', 'אסמכתאות תשלום'],
    partyToCheckWith: 'עמיל המכס',
  },
  clearance_delay: {
    label: 'עיכוב בשחרור',
    urgency: ATTENTION,
    dataToGather: ['תאריך הגעת המשלוח', 'שלב נוכחי בתהליך'],
    partyToCheckWith: 'עמיל המכס או הגורם המטפל בשחרור',
  },
  storage: {
    label: 'אחסנה',
    urgency: URGENT,
    dataToGather: ['תאריך תחילת חיוב האחסנה', 'תעריף האחסנה היומי'],
    partyToCheckWith: 'המסוף או המחסן הרלוונטי',
  },
  demurrage: {
    label: 'Demurrage',
    urgency: URGENT,
    dataToGather: ['תאריך תחילת החיוב', 'תעריף החיוב'],
    partyToCheckWith: 'חברת הספנות',
  },
  detention: {
    label: 'Detention',
    urgency: URGENT,
    dataToGather: ['תאריך תחילת החיוב', 'תעריף החיוב', 'תאריך יעד להחזרת הציוד'],
    partyToCheckWith: 'חברת הספנות',
  },
  penalty_or_additional_charge: {
    label: 'קנס או חיוב נוסף',
    urgency: ATTENTION,
    dataToGather: ['מסמך החיוב', 'בסיס החיוב שצוין'],
    partyToCheckWith: 'הגורם שהוציא את החיוב',
  },
  supplier_not_responding: {
    label: 'ספק אינו מגיב',
    urgency: ATTENTION,
    dataToGather: ['תיעוד פניות קודמות לספק', 'תאריך הפנייה האחרונה'],
    partyToCheckWith: 'הספק, ובמקביל המשלח או עמיל המכס',
  },
  carrier_not_responding: {
    label: 'חברת שילוח או מוביל אינו מגיב',
    urgency: ATTENTION,
    dataToGather: ['תיעוד פניות קודמות', 'מספר מעקב/הזמנה'],
    partyToCheckWith: 'חברת השילוח או המוביל',
  },
  other: {
    label: 'בעיה אחרת',
    urgency: ATTENTION,
    dataToGather: ['תיאור מפורט של הבעיה'],
    partyToCheckWith: 'עמיל המכס או הגורם הרלוונטי',
  },
});

export function buildShipmentProblemResult(input) {
  const i = input !== null && typeof input === 'object' ? input : {};
  const config = PROBLEM_CONFIG[i.problemType] ?? PROBLEM_CONFIG.other;

  const dataToGather = [...config.dataToGather];
  if (i.missingDocumentsNote) dataToGather.push(`מסמכים חסרים שצוינו: ${i.missingDocumentsNote}`);
  if (i.deadline) dataToGather.push(`מועד יעד שצוין: ${i.deadline}`);

  const accumulatingCosts = i.accumulatingCosts
    ? ['סומן שקיימות עלויות מצטברות -- מומלץ לברר את קצב הצבירה ואת הדרך לעצור אותו בהקדם.']
    : [];

  return buildProblemResult({
    routeLabel: `בעיה במשלוח קיים -- ${config.label}`,
    urgencyLabel: config.urgency,
    dataToGather,
    timelineNote: 'בהתאם למידע הקיים בשלב זה, מומלץ לשחזר את ציר הזמן: מועד ההזמנה, מועד השילוח, מועד ההגעה המשוער, ומועד קבלת ההודעה על הבעיה.',
    partyToCheckWith: `נדרש לבדוק את בסיס החיוב או הדרישה מול ${config.partyToCheckWith}.`,
    accumulatingCosts,
    recommendedAction: 'מומלץ לוודא את המסמכים והזמנים לפני מתן מענה סופי לגורם הרלוונטי.',
    whenToEscalate: config.urgency === URGENT
      ? 'מומלץ לפנות לבדיקה מקצועית בהקדם, מאחר שהעלויות עלולות להמשיך להצטבר.'
      : 'אם אין מענה תוך זמן סביר או שהבעיה אינה מתבררת, מומלץ לערב עמיל מכס או גורם מקצועי.',
    officialSources: resolveOfficialSources([]),
    ctas: [
      { id: 'missing-docs-help', label: 'טיפול במסמכים חסרים' },
      { id: 'clearance-support', label: 'תמיכה בשחרור' },
      { id: 'charge-check', label: 'בדיקת חיוב' },
      { id: 'storage-check', label: 'בדיקת אחסנה או השהייה' },
      { id: 'delay-help', label: 'טיפול בעיכוב' },
      { id: 'professional-escalation', label: 'הסלמה מקצועית' },
    ],
  });
}

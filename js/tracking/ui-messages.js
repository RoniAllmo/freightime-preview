/**
 * Hebrew interface messages for the FreighTime Single-input tracking
 * router UI (see TRACKING_ROUTER_DESIGN.md Section 10 and CLAUDE.md
 * Section 7 — interface text must stay separate from functional logic).
 *
 * This module contains display text only. It must not be imported by
 * normalize.js, any detect-*.js module, or router.js — those modules
 * return stable technical reason/action keys, never translated text.
 *
 * English configuration keys are used intentionally so this object can
 * later be joined by a parallel English (LTR) message object without
 * touching detection/routing logic, per the approved language strategy.
 * No English messages are added at this stage.
 *
 * No carrier names, tracking URLs, or live-tracking language appear here.
 */

/**
 * @type {Readonly<{
 *   initial: string,
 *   empty: string,
 *   recognizedValidContainer: string,
 *   recognizedInvalidContainer: string,
 *   recognizedValidAwb: string,
 *   recognizedInvalidAwb: string,
 *   recognizedValidInternationalPostal: string,
 *   recognizedInvalidInternationalPostal: string,
 *   recognizedValidUps: string,
 *   recognizedInvalidUps: string,
 *   recognizedValidUpsRoadie: string,
 *   recognizedInvalidUpsRoadie: string,
 *   recognizedValidEms: string,
 *   recognizedInvalidEms: string,
 *   officialTrackingButton: string,
 *   officialTrackingDisclosure: string,
 *   oceanContainerRoutingDisclosure: string,
 *   copyTrackingButton: string,
 *   copyTrackingSuccess: string,
 *   copyTrackingFailure: string,
 *   ambiguous: string,
 *   unrecognized: string,
 *   processing: string,
 *   unexpectedError: string
 * }>}
 */
export const trackingUiMessages = Object.freeze({
  initial: 'הזינו מספר מכולה, מספר AWB או מספר מעקב',
  empty: 'יש להזין מספר מעקב',
  recognizedValidContainer: 'זוהה מספר מכולה תקין',
  recognizedInvalidContainer:
    'המספר נראה כמספר מכולה, אך ספרת הביקורת אינה תקינה. מומלץ לבדוק את המספר.',
  recognizedValidAwb: 'זוהה מספר שטר מטען אווירי (AWB) תקין',
  recognizedInvalidAwb:
    'המספר נראה כמספר AWB, אך ספרת הביקורת אינה תקינה. מומלץ לבדוק את המספר.',
  recognizedValidInternationalPostal: 'זוהה מספר דואר בינלאומי תקין',
  recognizedInvalidInternationalPostal:
    'המספר נראה כמספר דואר בינלאומי, אך ספרת הביקורת אינה תקינה. מומלץ לבדוק את המספר.',
  recognizedValidUps: 'זוהה מספר מעקב של UPS',
  recognizedInvalidUps:
    'המספר נראה כמספר UPS, אך המבנה אינו תקין. מומלץ לבדוק את המספר.',
  recognizedValidUpsRoadie: 'זוהה מספר מעקב של UPS Roadie',
  recognizedInvalidUpsRoadie:
    'המספר נראה כמספר UPS Roadie, אך המבנה אינו תקין. מומלץ לבדוק את המספר.',
  recognizedValidEms: 'זוהה מספר EMS תקין',
  recognizedInvalidEms:
    'המספר נראה כמספר EMS, אך ספרת הביקורת אינה תקינה. מומלץ לבדוק את המספר.',
  officialTrackingButton: 'מעבר לאתר המעקב הרשמי',
  officialTrackingDisclosure: 'הקישור ייפתח באתר חיצוני. יש להזין שם את מספר המעקב.',
  oceanContainerRoutingDisclosure:
    'לא ניתן לדעת מהמספר בלבד איזו חברת ספנות מפעילה כרגע את המכולה. FreighTime אינו מציג עדיין נתוני מעקב חיים למכולות ימיות — ניתן לבחור את חברת הספנות הרלוונטית ולעבור לאתר המעקב הרשמי שלה, ושם להזין את מספר המכולה.',
  copyTrackingButton: 'העתקת מספר המעקב',
  copyTrackingSuccess: 'מספר המעקב הועתק',
  copyTrackingFailure: 'לא ניתן היה להעתיק את המספר. ניתן לסמן ולהעתיק ידנית.',
  ambiguous: 'המספר מתאים ליותר מסוג משלוח אחד. בחירה ידנית תתווסף בהמשך.',
  unrecognized: 'לא הצלחנו לזהות את סוג המספר. מומלץ לבדוק את המספר שהוזן.',
  processing: 'בודקים את המספר...',
  unexpectedError: 'לא ניתן לבדוק את המספר כרגע. מומלץ לנסות שוב.',
});

/**
 * Identification-context message builders for the container owner/
 * operator, AWB issuing-airline, and S10 issuing-country features.
 *
 * These build a single concise sentence from a *registry-sourced*
 * organization/country name only -- never the raw shipment identifier,
 * never a claim of "current carrier"/"operating airline"/"live
 * tracking". Kept as functions (rather than a static object like
 * `trackingUiMessages`) only because the organization/country name is
 * dynamic; the surrounding sentence itself is always one of these fixed
 * templates.
 */

/** @param {string} ownerName */
export function containerOwnerShippingLineMessage(ownerName) {
  return `בעלים/מפעיל רשום לפי קוד המכולה: ${ownerName}. ניתן להמשיך למעקב הרשמי. ייתכן שהמוביל במשלוח הנוכחי שונה.`;
}

/** @param {string} ownerName */
export function containerOwnerNonCarrierMessage(ownerName) {
  return `בעלים רשום לפי קוד המכולה: ${ownerName}. הקוד אינו מזהה בוודאות את חברת הספנות במשלוח הנוכחי.`;
}

export const containerOwnerUnknownMessage =
  'מספר המכולה תקין, אך קוד הבעלים עדיין אינו מזוהה במאגר המאומת של FreighTime.';

/** @param {string} airlineName */
export function awbIssuerKnownWithRouteMessage(airlineName) {
  return `חברת התעופה המנפיקה לפי קידומת AWB: ${airlineName}. ניתן להמשיך לאתר המטען הרשמי.`;
}

/** @param {string} airlineName */
export function awbIssuerKnownNoRouteMessage(airlineName) {
  return `חברת התעופה המנפיקה לפי קידומת AWB: ${airlineName}. אין עדיין יעד מעקב מטען רשמי מאומת עבור חברה זו.`;
}

export const awbIssuerUnknownMessage = 'קידומת ה-AWB טרם אומתה במאגר המאומת של FreighTime.';

/** @param {string} countryName */
export function postalAuthorityKnownMessage(countryName) {
  return `מדינת ההנפקה לפי קוד S10: ${countryName}. ניתן להמשיך למעקב הרשמי.`;
}

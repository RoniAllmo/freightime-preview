/**
 * Existing-importer scenario result builder. One primary action per
 * focus area -- never a long parallel list of services. Classification
 * and regulation concerns are deliberately combined into one
 * recommendation ("בדיקת סיווג ורגולציה משולבת"), since this product
 * cannot cleanly separate them without more information than an online
 * check can gather.
 *
 * Pure, deterministic, DOM-free, network-free, storage-free.
 */

import { buildCompactResult, resolveOfficialSources, CLASSIFICATION_AND_REGULATION_REASON } from './build-action-map.js';

const CLASSIFICATION_AND_REGULATION_PREP = Object.freeze([
  'תיאור מסחרי מלא',
  'מפרט טכני או קטלוג',
  'תמונות המוצר והחיבורים',
  'דגם או מק"ט',
  'חשבון ספק, אם קיים',
]);

const FOCUS_CONFIG = Object.freeze({
  new_product: {
    label: 'בדיקת סיווג ורגולציה למוצר',
    primaryAction: 'יש לתאם בדיקה מקצועית של סיווג המכס ודרישות היבוא מול מסווג מכס או מומחה רגולציה, לפני הזמנה או שילוח.',
    primaryReason: CLASSIFICATION_AND_REGULATION_REASON,
    preparationItems: CLASSIFICATION_AND_REGULATION_PREP,
    primaryCta: { id: 'classification-and-regulation-check', label: 'בדיקת סיווג ורגולציה' },
    secondaryCta: { id: 'product-docs-check', label: 'בדיקת מסמכי מוצר' },
    sources: ['customs-tariff'],
  },
  customs_classification: {
    label: 'בדיקת סיווג ורגולציה למוצר',
    primaryAction: 'יש לתאם בדיקה מקצועית של סיווג המכס ודרישות היבוא מול מסווג מכס או מומחה רגולציה, לפני הזמנה או שילוח.',
    primaryReason: CLASSIFICATION_AND_REGULATION_REASON,
    preparationItems: CLASSIFICATION_AND_REGULATION_PREP,
    primaryCta: { id: 'classification-and-regulation-check', label: 'בדיקת סיווג ורגולציה' },
    secondaryCta: { id: 'product-docs-check', label: 'בדיקת מסמכי מוצר' },
    sources: ['customs-tariff'],
  },
  regulation_and_permits: {
    label: 'בדיקת סיווג ורגולציה למוצר',
    primaryAction: 'יש לתאם בדיקה מקצועית של סיווג המכס ודרישות היבוא מול מסווג מכס או מומחה רגולציה, לפני הזמנה או שילוח.',
    primaryReason: CLASSIFICATION_AND_REGULATION_REASON,
    preparationItems: CLASSIFICATION_AND_REGULATION_PREP,
    primaryCta: { id: 'classification-and-regulation-check', label: 'בדיקת סיווג ורגולציה' },
    secondaryCta: { id: 'product-docs-check', label: 'בדיקת מסמכי מוצר' },
    sources: ['standards-institution', 'health-ministry'],
  },
  new_supplier: {
    label: 'בדיקת ספק חדש',
    primaryAction: 'מומלץ לוודא מסמכי ספק (חשבונית, מפרט, תעודת מקור) ולבדוק התאמה מול הסיווגים הקיימים לפני הזמנה.',
    primaryReason: 'שינוי ספק עשוי לשנות מדינת מקור, הרכב או תיעוד -- כל אלה עשויים להשפיע על הסיווג.',
    preparationItems: ['חשבונית ספק', 'תעודת מקור', 'מפרט טכני'],
    primaryCta: { id: 'supplier-docs-check', label: 'בדיקת מסמכי ספק' },
    secondaryCta: null,
    sources: [],
  },
  supplier_documents: {
    label: 'בדיקת מסמכי ספק',
    primaryAction: 'מומלץ לוודא שחשבון מסחרי, רשימת אריזה ותעודת מקור תואמים למשלוח לפני שילוח.',
    primaryReason: '',
    preparationItems: ['חשבון מסחרי', 'רשימת אריזה', 'תעודת מקור'],
    primaryCta: { id: 'supplier-docs-check', label: 'בדיקת מסמכי ספק' },
    secondaryCta: null,
    sources: [],
  },
  taxes_and_costs: {
    label: 'בדיקת מסים ועלויות',
    primaryAction: 'יש לוודא סיווג סופי לפני הסתמכות על שיעורי מכס, מס קנייה ומע״מ.',
    primaryReason: 'שיעורי המס תלויים בסיווג הסופי ואינם ניתנים לאומדן מחייב מראש.',
    preparationItems: ['ערך חשבונית', 'סיווג משוער, אם קיים'],
    primaryCta: { id: 'classification-and-regulation-check', label: 'בדיקת סיווג ורגולציה' },
    secondaryCta: null,
    sources: ['customs-tariff'],
  },
  incoterms: {
    label: 'בדיקת תנאי מכר',
    primaryAction: 'יש לוודא מי נושא בעלויות הובלה, ביטוח ומכס בהתאם לתנאי המכר (Incoterms) שנקבע.',
    primaryReason: '',
    preparationItems: ['חוזה/הזמנה עם תנאי המכר'],
    primaryCta: { id: 'supplier-docs-check', label: 'בדיקת מסמכי ספק' },
    secondaryCta: null,
    sources: [],
  },
  sea_or_air_shipping: {
    label: 'בדיקת מסמכי שילוח',
    primaryAction: 'יש לוודא מסמכי הובלה מתאימים לאמצעי השילוח שנבחר לפני שילוח.',
    primaryReason: '',
    preparationItems: ['מסמך הובלה (שטר מטען / AWB)'],
    primaryCta: { id: 'shipping-quote', label: 'הצעת שילוח' },
    secondaryCta: null,
    sources: [],
  },
  clearance_delay: {
    label: 'בדיקת עיכוב בשחרור',
    primaryAction: 'יש לבדוק את הסיבה לעיכוב מול עמיל המכס או הרשות הרלוונטית בהקדם.',
    primaryReason: '',
    preparationItems: ['מספר משלוח/הצהרה', 'הודעת העיכוב, אם קיימת'],
    primaryCta: { id: 'clearance-support', label: 'תמיכה בשחרור' },
    secondaryCta: null,
    sources: [],
  },
  additional_charges: {
    label: 'בדיקת חיוב נוסף',
    primaryAction: 'יש לוודא את בסיס החיוב מול הגורם שהוציא אותו לפני תשלום.',
    primaryReason: '',
    preparationItems: ['מסמך החיוב'],
    primaryCta: { id: 'charge-check', label: 'בדיקת חיוב' },
    secondaryCta: null,
    sources: [],
  },
  other: {
    label: 'נושא אחר',
    primaryAction: 'מומלץ לפרט את הנושא לצורך הפניה מדויקת יותר לגורם המקצועי המתאים.',
    primaryReason: '',
    preparationItems: [],
    primaryCta: { id: 'classification-and-regulation-check', label: 'בדיקת סיווג ורגולציה' },
    secondaryCta: null,
    sources: [],
  },
});

export function buildExistingImporterResult(input) {
  const i = input !== null && typeof input === 'object' ? input : {};
  const config = FOCUS_CONFIG[i.focusArea] ?? FOCUS_CONFIG.other;

  return buildCompactResult({
    scenario: 'existing_importer',
    routeLabel: `יבוא מסחרי קיים — ${config.label}`,
    primaryAction: config.primaryAction,
    primaryReason: config.primaryReason,
    preparationItems: config.preparationItems,
    primaryCta: config.primaryCta,
    secondaryCta: config.secondaryCta,
    secondaryDetails: {
      officialSources: resolveOfficialSources(config.sources),
    },
  });
}

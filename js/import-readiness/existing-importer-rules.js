/**
 * Existing-importer scenario result builder. A user who has imported
 * before is not shown beginner content -- the result is focused on the
 * single concern they selected.
 *
 * Pure, deterministic, DOM-free, network-free, storage-free.
 */

import { actionItem, buildStandardResult, resolveOfficialSources, CLASSIFICATION_REVIEW_NEEDED_MESSAGE, TECHNICAL_DETAIL_BOUNDARY_MESSAGE } from './build-action-map.js';
import { ACTION_STATUS } from './scenario-schema.js';

const FOCUS_CONFIG = Object.freeze({
  new_product: {
    label: 'מוצר חדש',
    toCheck: [TECHNICAL_DETAIL_BOUNDARY_MESSAGE, 'מומלץ לוודא סיווג ורגולציה עבור המוצר החדש לפני הזמנה.'],
    sources: ['customs-tariff'],
    review: CLASSIFICATION_REVIEW_NEEDED_MESSAGE,
  },
  new_supplier: {
    label: 'ספק חדש',
    toCheck: ['מומלץ לוודא מסמכי ספק (חשבונית, מפרט, תעודת מקור) ולוודא התאמה מול הסיווגים הקיימים.'],
    sources: ['customs-tariff'],
    review: 'שינוי ספק עשוי להשפיע על מדינת מקור ותיעוד -- מומלץ בדיקה מקצועית כאשר יש שינוי מהותי.',
  },
  customs_classification: {
    label: 'סיווג מכס',
    toCheck: [TECHNICAL_DETAIL_BOUNDARY_MESSAGE],
    sources: ['customs-tariff'],
    review: CLASSIFICATION_REVIEW_NEEDED_MESSAGE,
  },
  regulation_and_permits: {
    label: 'רגולציה ואישורי יבוא',
    toCheck: ['נדרש לבדוק אילו אישורים או תקנים עשויים לחול על המוצר הספציפי.'],
    sources: ['standards-institution', 'health-ministry'],
    review: 'מומלץ בדיקה מול מומחה רגולציה או הרשות הרלוונטית.',
  },
  supplier_documents: {
    label: 'מסמכי ספק',
    toCheck: ['נדרש לוודא חשבון מסחרי, רשימת אריזה, תעודת מקור ומפרט תואמים למשלוח.'],
    sources: ['customs-tariff'],
    review: '',
  },
  taxes_and_costs: {
    label: 'מסים ועלויות',
    toCheck: ['שיעורי מכס, מס קנייה ומע״מ תלויים בסיווג הסופי -- אין להסתמך על אומדן כמחייב.'],
    sources: ['customs-tariff'],
    review: '',
  },
  incoterms: {
    label: 'תנאי מכר ו-Incoterms',
    toCheck: ['נדרש לוודא מי נושא בעלויות הובלה, ביטוח ומכס בהתאם לתנאי המכר שנקבע.'],
    sources: [],
    review: '',
  },
  sea_or_air_shipping: {
    label: 'שילוח ימי או אווירי',
    toCheck: ['נדרש לוודא מסמכי הובלה מתאימים לאמצעי השילוח שנבחר.'],
    sources: [],
    review: '',
  },
  clearance_delay: {
    label: 'עיכוב בשחרור',
    toCheck: ['נדרש לבדוק את הסיבה לעיכוב מול עמיל המכס או הרשות הרלוונטית.'],
    sources: [],
    review: '',
  },
  additional_charges: {
    label: 'חיובים נוספים',
    toCheck: ['נדרש לוודא את בסיס החיוב מול הגורם שהוציא אותו לפני תשלום.'],
    sources: [],
    review: '',
  },
  other: {
    label: 'נושא אחר',
    toCheck: ['מומלץ לפרט את הנושא לצורך הפניה מדויקת יותר.'],
    sources: [],
    review: '',
  },
});

export function buildExistingImporterResult(input) {
  const i = input !== null && typeof input === 'object' ? input : {};
  const config = FOCUS_CONFIG[i.focusArea] ?? FOCUS_CONFIG.other;

  const toCheck = config.toCheck.map((text, idx) => actionItem(`focus-${idx}`, text, ACTION_STATUS.NEEDS_CHECK));
  const whenProfessionalReviewNeeded = config.review
    ? [actionItem('review', config.review, ACTION_STATUS.PROFESSIONAL_REVIEW)]
    : [];

  return buildStandardResult({
    scenario: 'existing_importer',
    routeLabel: `יבואן קיים -- ${config.label}`,
    sections: { toCheck, whenProfessionalReviewNeeded },
    officialSources: resolveOfficialSources(config.sources),
    ctas: [
      { id: 'new-product-check', label: 'בדיקת מוצר חדש' },
      { id: 'classification-check', label: 'בדיקת סיווג' },
      { id: 'regulation-check', label: 'בדיקת רגולציה' },
      { id: 'documents-check', label: 'בדיקת מסמכים' },
      { id: 'cost-check', label: 'בדיקת עלויות' },
    ],
  });
}

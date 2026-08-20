/**
 * Personal-import scenario result builder. Compact by design -- one
 * primary action, one short reason, up to three preparation points.
 * Never claims personal import is automatically exempt from standards,
 * permits, taxes, restrictions, labeling, or inspection.
 *
 * Pure, deterministic, DOM-free, network-free, storage-free.
 */

import { buildCompactResult, resolveOfficialSources } from './build-action-map.js';
import { evaluateRegulatorySignals, toSecondaryDetailContent } from './regulatory-signals/index.js';
import { PROFESSIONAL_CATEGORY } from './professional-category-registry.js';

const PERSONAL_IMPORT_PROFESSIONAL_REFERRAL = Object.freeze({
  type: 'גורם מקצועי המטפל בדרישות יבוא אישי (עמיל מכס או הרשות הרלוונטית)',
  reason: 'לבדיקת הדרישות, ההיתרים והמסים החלים על סוג המוצר ועל הכמות המבוקשת, לפני הזמנה.',
  ctaLabel: 'לבדיקת דרישות המוצר',
  // Confirmed only for the explicitly named "עמיל מכס" -- "הרשות
  // הרלוונטית" is deliberately left unmapped as too vague to match a
  // specific PROFESSIONAL_CATEGORY entry without guessing.
  coveredCategoryIds: Object.freeze([PROFESSIONAL_CATEGORY.LICENSED_CUSTOMS_BROKER.id]),
});

export const PERSONAL_IMPORT_NOT_AUTOMATICALLY_EXEMPT_NOTE =
  'יבוא אישי אינו פטור אוטומטית מתקנים, היתרים, מסים או בדיקה.';

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

const NO_SENSITIVE_CATEGORY = Object.freeze(['none_known', 'not_sure']);

export function buildPersonalImportResult(input) {
  const i = input !== null && typeof input === 'object' ? input : {};
  const isSensitive = i.sensitiveCategory && !NO_SENSITIVE_CATEGORY.includes(i.sensitiveCategory);

  const primaryAction = isSensitive
    ? 'מומלץ לוודא מול הרשות הרלוונטית או גורם מקצועי את הדרישות החלות על סוג המוצר, לפני הזמנה.'
    : 'מומלץ לוודא שכמות המוצר, ערכו והשימוש בו עומדים בתנאי היבוא האישי, לפני הזמנה.';

  const preparationItems = ['חשבונית או אישור רכישה', 'מסמך משלוח או מספר מעקב, אם קיים'];
  if (isSensitive) preparationItems.push('פרטי המוצר (סוג, יצרן, דגם)');

  const sources = isSensitive && SENSITIVE_CATEGORY_SOURCE[i.sensitiveCategory]
    ? [SENSITIVE_CATEGORY_SOURCE[i.sensitiveCategory]]
    : [];

  // Product Regulatory Signals pilot -- local-only, deterministic, and
  // gate-enforced (see js/import-readiness/regulatory-signals). Only
  // ever adds collapsed secondary-detail content, never touches the
  // primary card; produces nothing at all unless the free-text product
  // description or the sensitive-category answer already hints at a
  // candidate category.
  const regulatorySignals = evaluateRegulatorySignals(i);
  const regulatoryContent = toSecondaryDetailContent(regulatorySignals);

  return buildCompactResult({
    scenario: 'personal',
    routeLabel: 'יבוא אישי',
    primaryAction,
    primaryReason: PERSONAL_IMPORT_NOT_AUTOMATICALLY_EXEMPT_NOTE,
    preparationItems,
    primaryCta: { id: 'product-requirements', label: 'בדיקת דרישות למוצר' },
    professional: PERSONAL_IMPORT_PROFESSIONAL_REFERRAL,
    secondaryDetails: {
      points: regulatoryContent.points,
      officialSources: resolveOfficialSources(sources),
      note: regulatoryContent.note,
    },
  });
}

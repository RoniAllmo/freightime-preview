/**
 * First-commercial-import scenario result builder. One primary
 * preparation action, up to five basic items, one professional CTA --
 * never a long parallel list of everything that might be needed.
 *
 * Pure, deterministic, DOM-free, network-free, storage-free.
 */

import { buildCompactResult, resolveOfficialSources, USER_PROVIDED_HS_CODE_NOTE, PROFESSIONAL_REFERRAL } from './build-action-map.js';

export function buildFirstCommercialImportResult(input) {
  const i = input !== null && typeof input === 'object' ? input : {};

  const preparationItems = [];
  if (!i.commercialDescription) preparationItems.push('תיאור מסחרי של המוצר');
  if (!i.intendedUse) preparationItems.push('ייעוד/שימוש מיועד');
  preparationItems.push('חשבון מסחרי (Commercial Invoice)');
  preparationItems.push('רשימת אריזה (Packing List)');
  if (!i.hasTechnicalSpec) preparationItems.push('מפרט טכני או קטלוג מהספק');

  const notes = [];
  if (i.hsCodeKnown && i.hsCode) {
    notes.push(`קוד מכס שהוזן: ${i.hsCode}. ${USER_PROVIDED_HS_CODE_NOTE}`);
  }

  return buildCompactResult({
    scenario: 'first_commercial',
    routeLabel: 'יבוא מסחרי ראשון',
    primaryAction: 'לפני ההזמנה מומלץ להשלים תיאור מוצר ומפרט טכני, ולתאם בדיקת סיווג ורגולציה ראשונית מול עמיל מכס.',
    primaryReason: 'ביבוא מסחרי ראשון, בדיקת סיווג ומסמכים לפני שילוח מונעת עיכוב ועלויות בלתי צפויות בשחרור.',
    preparationItems,
    primaryCta: { id: 'classification-and-regulation-check', label: 'בדיקת סיווג ורגולציה' },
    secondaryCta: { id: 'supplier-docs-check', label: 'בדיקת מסמכי ספק' },
    professional: PROFESSIONAL_REFERRAL.CLASSIFICATION_AND_REGULATION,
    secondaryDetails: {
      points: notes,
      officialSources: resolveOfficialSources(['customs-tariff', 'free-import-order']),
    },
  });
}

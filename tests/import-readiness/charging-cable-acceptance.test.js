/**
 * Required acceptance test: a synthetic mobile-phone charging-cable
 * import, matching the product-owner's example exactly. Input: existing
 * commercial importer, focus on regulation/classification review,
 * technical specification not yet supplied.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeReadinessInput } from '../../js/import-readiness/normalize-readiness-input.js';
import { decideScenario } from '../../js/import-readiness/experience-routing.js';
import { buildExistingImporterResult } from '../../js/import-readiness/existing-importer-rules.js';
import { SCENARIO } from '../../js/import-readiness/scenario-schema.js';

const CHARGING_CABLE_RAW = {
  importType: 'commercial',
  experience: 'prior_importer',
  productName: 'כבל טעינה לטלפון נייד',
  commercialDescription: 'כבל טעינה וסנכרון נתונים לטלפון נייד',
  intendedUse: 'טעינה וחיבור נתונים',
  hasTechnicalSpec: false,
  focusArea: 'regulation_and_permits',
};

test('1. this input routes to the existing-importer scenario', () => {
  const normalized = normalizeReadinessInput(CHARGING_CABLE_RAW);
  const scenario = decideScenario({ importType: normalized.importType, experience: normalized.experience });
  assert.equal(scenario, SCENARIO.EXISTING_IMPORTER);
});

test('2. the route context matches the required wording', () => {
  const result = buildExistingImporterResult(normalizeReadinessInput(CHARGING_CABLE_RAW));
  assert.equal(result.routeLabel, 'יבוא מסחרי קיים — בדיקת סיווג ורגולציה למוצר');
});

test('3. the primary recommendation is the required professional-review action, not a self-determined classification', () => {
  const result = buildExistingImporterResult(normalizeReadinessInput(CHARGING_CABLE_RAW));
  assert.equal(
    result.primaryAction,
    'יש לתאם בדיקה מקצועית של סיווג המכס ודרישות היבוא מול מסווג מכס או מומחה רגולציה, לפני הזמנה או שילוח.',
  );
});

test('4. the reason mentions product type, use, and technical spec, and states insufficient information for a final determination', () => {
  const result = buildExistingImporterResult(normalizeReadinessInput(CHARGING_CABLE_RAW));
  assert.ok(result.primaryReason.includes('מפרט הטכני'));
  assert.ok(result.primaryReason.includes('אין מספיק מידע לקביעה סופית'));
});

test('5. the preparation checklist has exactly the five required items, no more', () => {
  const result = buildExistingImporterResult(normalizeReadinessInput(CHARGING_CABLE_RAW));
  assert.deepEqual(result.preparationItems, [
    'תיאור מסחרי מלא',
    'מפרט טכני או קטלוג',
    'תמונות המוצר והחיבורים',
    'דגם או מק"ט',
    'חשבון ספק, אם קיים',
  ]);
});

test('6. the primary CTA is "בדיקת סיווג ורגולציה"', () => {
  const result = buildExistingImporterResult(normalizeReadinessInput(CHARGING_CABLE_RAW));
  assert.equal(result.primaryCta.label, 'בדיקת סיווג ורגולציה');
});

test('7. the default result does NOT include a separate review-purpose, audit-points, exposure, or "professional recommended" section as visible top-level fields', () => {
  const result = buildExistingImporterResult(normalizeReadinessInput(CHARGING_CABLE_RAW));
  for (const forbiddenField of ['purpose', 'auditPoints', 'exposures', 'recommendedProfessional', 'sections']) {
    assert.ok(!(forbiddenField in result), `unexpected legacy field "${forbiddenField}" in the compact result`);
  }
});

test('8. official sources are not a default top-level field -- they live only inside secondaryDetails', () => {
  const result = buildExistingImporterResult(normalizeReadinessInput(CHARGING_CABLE_RAW));
  assert.ok(!('officialSources' in result));
  assert.ok(Array.isArray(result.secondaryDetails.officialSources));
});

test('9. the default-visible result (excluding collapsed secondary detail) is short -- well under the page-and-a-half the product owner rejected', () => {
  const result = buildExistingImporterResult(normalizeReadinessInput(CHARGING_CABLE_RAW));
  const visibleText = [
    result.routeLabel,
    result.primaryAction,
    result.primaryReason,
    ...result.preparationItems,
    result.primaryCta?.label ?? '',
    result.visibleDisclaimer,
  ].join(' ');
  const wordCount = visibleText.trim().split(/\s+/).length;
  assert.ok(wordCount <= 130, `expected a compact charging-cable result, got ${wordCount} words`);
});

test('10. the visible disclaimer is the single concise required sentence, not a large panel', () => {
  const result = buildExistingImporterResult(normalizeReadinessInput(CHARGING_CABLE_RAW));
  assert.equal(
    result.visibleDisclaimer,
    'התוצאה היא הכוונה תפעולית ראשונית ואינה מהווה סיווג מכס, קביעה רגולטורית, ייעוץ משפטי או אישור יבוא.',
  );
});

test('11. no final HS code, duty rate, or classification is fabricated for the charging cable', () => {
  const result = buildExistingImporterResult(normalizeReadinessInput(CHARGING_CABLE_RAW));
  const text = JSON.stringify(result);
  assert.ok(!text.includes('הסיווג הנכון הוא'));
  assert.ok(!/\b\d{4}\.\d{2}\b/.test(text));
});

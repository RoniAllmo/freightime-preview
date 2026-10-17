/**
 * Professional-neutral action lines (PR E, product-owner decision
 * 2026-10-17): on every route that can show the unified "הצעד הבא"
 * block (personal, first commercial, existing importer, established
 * operation), the action line states only WHAT to do. WHO to contact
 * is the professional line's job -- an action naming a professional
 * could contradict the professional the precedence rule picked.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPersonalImportResult } from '../../js/import-readiness/personal-import-rules.js';
import { buildFirstCommercialImportResult } from '../../js/import-readiness/first-commercial-import-rules.js';
import { buildExistingImporterResult } from '../../js/import-readiness/existing-importer-rules.js';
import { buildEstablishedOperationResult } from '../../js/import-readiness/established-operation-rules.js';
import { normalizeReadinessInput } from '../../js/import-readiness/normalize-readiness-input.js';
import { PROFESSIONAL_CATEGORY } from '../../js/import-readiness/professional-category-registry.js';
import { PROFESSIONAL_REFERRAL } from '../../js/import-readiness/build-action-map.js';
import { EXISTING_IMPORTER_FOCUS, ESTABLISHED_OPERATION_PURPOSE, SENSITIVE_CATEGORY } from '../../js/import-readiness/scenario-schema.js';

const PROFESSIONAL_NAMES = [
  ...Object.values(PROFESSIONAL_CATEGORY).flatMap((c) => [c.name, c.legacyShortName]),
  ...Object.values(PROFESSIONAL_REFERRAL).map((r) => r.type),
  'עמיל מכס', 'מסווג מכס', 'מומחה רגולציה', 'יועץ ביטוחי', 'עורך דין', 'גורם מקצועי',
].filter((n) => typeof n === 'string' && n.length > 0);

function assertNeutral(label, action) {
  assert.ok(typeof action === 'string' && action.length > 0, `${label}: expected an action line`);
  for (const name of PROFESSIONAL_NAMES) {
    assert.ok(!action.includes(name), `${label}: action line names a professional ("${name}"): ${action}`);
  }
}

const results = () => [
  ...SENSITIVE_CATEGORY.map((sensitiveCategory) => [`personal/${sensitiveCategory}`,
    buildPersonalImportResult(normalizeReadinessInput({ sensitiveCategory }), {})]),
  ['first commercial', buildFirstCommercialImportResult(normalizeReadinessInput({}), {})],
  ...EXISTING_IMPORTER_FOCUS.map((focusArea) => [`existing importer/${focusArea}`,
    buildExistingImporterResult(normalizeReadinessInput({ focusArea }))]),
  ...ESTABLISHED_OPERATION_PURPOSE.map((auditPurpose) => [`established operation/${auditPurpose}`,
    buildEstablishedOperationResult(normalizeReadinessInput({ auditPurpose }))]),
];

test('no action line on a route that can show "הצעד הבא" names a professional', () => {
  const all = results();
  assert.ok(all.length >= 25, `expected every variant to be covered, got ${all.length}`);
  for (const [label, result] of all) assertNeutral(label, result.primaryAction);
});

test('every one of those results still names its professional in the referral (WHO moved, never lost)', () => {
  for (const [label, result] of results()) {
    assert.ok(result.professional && result.professional.type, `${label}: expected a professional referral`);
  }
});

test('the product-owner example wording is used verbatim for the first commercial import', () => {
  const result = buildFirstCommercialImportResult(normalizeReadinessInput({}), {});
  assert.equal(result.primaryAction, 'לפני ההזמנה מומלץ להשלים תיאור מוצר ומפרט טכני ולתאם בדיקה ראשונית.');
});

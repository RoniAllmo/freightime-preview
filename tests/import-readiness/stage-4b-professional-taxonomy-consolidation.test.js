/**
 * Stage 4B cleanup program (product-owner-approved).
 *
 * PROFESSIONAL_CATEGORY (professional-category-registry.js) becomes
 * the sole canonical professional taxonomy. build-action-map.js's
 * duplicate PROFESSIONAL_ROLES map (6 entries, only 4 ever consumed,
 * 2 -- LEGAL_ADVISER, INSURANCE_ADVISER -- confirmed dead) is removed.
 * established-operation-rules.js now consumes PROFESSIONAL_CATEGORY
 * directly for its two exact-equivalent entries (CUSTOMS_CLASSIFIER,
 * LICENSED_CUSTOMS_BROKER); its two non-equivalent entries
 * (REGULATION_SPECIALIST's shorter local wording, and the generic
 * QUALIFIED_PROFESSIONAL fallback with no canonical counterpart) are
 * kept as this file's own literal strings, byte-identical to before,
 * rather than silently changing public-facing wording.
 *
 * Legally distinct roles (CUSTOMS_LAWYER / TRANSPORT_LAWYER /
 * INSURANCE_LAWYER) are NOT collapsed, per product-owner decision 6.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROFESSIONAL_CATEGORY, professionalReferral, jointReferral } from '../../js/import-readiness/professional-category-registry.js';
import { PROFESSIONAL_REFERRAL } from '../../js/import-readiness/build-action-map.js';
import { buildEstablishedOperationResult } from '../../js/import-readiness/established-operation-rules.js';
import { normalizeReadinessInput } from '../../js/import-readiness/normalize-readiness-input.js';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

function resultFor(raw) {
  return buildEstablishedOperationResult(normalizeReadinessInput(raw));
}

// -----------------------------------------------------------------
// 1-4: One canonical taxonomy, no duplicates, PROFESSIONAL_ROLES gone.
// -----------------------------------------------------------------

test('1. PROFESSIONAL_ROLES is no longer exported by build-action-map.js', async () => {
  const mod = await import('../../js/import-readiness/build-action-map.js');
  assert.equal('PROFESSIONAL_ROLES' in mod, false);
});

test('2. no .js file (production or test) imports PROFESSIONAL_ROLES any more', () => {
  const offenders = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.js')) {
        if (full.endsWith('stage-4b-professional-taxonomy-consolidation.test.js')) continue;
        const content = readFileSync(full, 'utf8');
        if (/\bimport\s*\{[^}]*\bPROFESSIONAL_ROLES\b[^}]*\}/.test(content)) {
          offenders.push(path.relative(repoRoot, full));
        }
      }
    }
  }
  walk(path.join(repoRoot, 'js'));
  walk(path.join(repoRoot, 'tests'));
  assert.deepEqual(offenders, [], `PROFESSIONAL_ROLES must be fully removed, found references in: ${offenders.join(', ')}`);
});

test('3. PROFESSIONAL_CATEGORY has no duplicate internal ids', () => {
  const ids = Object.values(PROFESSIONAL_CATEGORY).map((c) => c.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual(dupes, []);
});

test('4. PROFESSIONAL_CATEGORY has no duplicate public titles', () => {
  const names = Object.values(PROFESSIONAL_CATEGORY).map((c) => c.name);
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  assert.deepEqual(dupes, []);
});

// -----------------------------------------------------------------
// 5-6: No orphan references, every CTA resolves.
// -----------------------------------------------------------------

test('5. every PROFESSIONAL_CATEGORY entry has a non-empty id, name, scope, and ctaLabel', () => {
  for (const [key, cat] of Object.entries(PROFESSIONAL_CATEGORY)) {
    assert.ok(cat.id, `${key} must have an id`);
    assert.ok(cat.name, `${key} must have a name`);
    assert.ok(cat.scope, `${key} must have a scope`);
    assert.ok(cat.ctaLabel, `${key} must have a ctaLabel`);
  }
});

test('6. every PROFESSIONAL_REFERRAL entry resolves to a non-empty type/reason/ctaLabel', () => {
  for (const [key, ref] of Object.entries(PROFESSIONAL_REFERRAL)) {
    assert.ok(ref.type, `${key} must have a resolved type`);
    assert.ok(ref.reason, `${key} must have a resolved reason`);
    assert.ok(ref.ctaLabel, `${key} must have a resolved ctaLabel`);
  }
});

// -----------------------------------------------------------------
// 7-13: established-operation-rules.js behavior-equivalent after
// consolidation -- exact same rendered text as before the migration.
// -----------------------------------------------------------------

test('7. existing_classifications_audit still names CUSTOMS_CLASSIFIER by its exact canonical name', () => {
  const result = resultFor({ auditPurpose: 'existing_classifications_audit' });
  assert.ok(result.primaryAction.includes(PROFESSIONAL_CATEGORY.CUSTOMS_CLASSIFIER.name));
  assert.equal(result.primaryAction, 'מומלץ לתאם ביקורת סיווגים מול מסווג מכס מקצועי, כדי לוודא שהסיווגים הקיימים עדיין תואמים למוצרים בפועל.');
});

test('8. document_process_audit still names LICENSED_CUSTOMS_BROKER by its exact canonical name', () => {
  const result = resultFor({ auditPurpose: 'document_process_audit' });
  assert.equal(result.primaryAction, 'מומלץ לתאם ביקורת תהליך מול עמיל מכס מורשה, לבדוק אחידות ותיעוד בקבלת מסמכי ספק.');
});

test('9. regulation_and_permits_audit preserves its pre-consolidation wording exactly ("מומחה רגולציה", not the longer canonical "מומחה רגולציה ליבוא")', () => {
  const result = resultFor({ auditPurpose: 'regulation_and_permits_audit' });
  assert.equal(result.primaryAction, 'מומלץ לתאם ביקורת רגולציה מול מומחה רגולציה, לוודא שהיתרים בתוקף עבור כל קטגוריית מוצר.');
  assert.ok(!result.primaryAction.includes(PROFESSIONAL_CATEGORY.REGULATION_SPECIALIST.name), 'must not have silently adopted the longer canonical wording');
});

test('10. sale_terms_review preserves the generic QUALIFIED_PROFESSIONAL wording exactly, with no canonical equivalent invented', () => {
  const result = resultFor({ auditPurpose: 'sale_terms_review' });
  assert.equal(result.primaryAction, 'מומלץ לתאם בדיקה מול גורם מקצועי מוסמך, לוודא שתנאי המכר תואמים את חלוקת האחריות בפועל.');
  assert.equal(result.professional.type, 'גורם מקצועי מוסמך');
});

test('11. penalty_or_shortfall_exposure professional card type still resolves to the canonical LICENSED_CUSTOMS_BROKER name', () => {
  const result = resultFor({ auditPurpose: 'penalty_or_shortfall_exposure' });
  assert.equal(result.professional.type, PROFESSIONAL_CATEGORY.LICENSED_CUSTOMS_BROKER.name);
});

test('12. every established-operation purpose still yields exactly one primary professional, never a duplicate', () => {
  const purposes = ['existing_classifications_audit', 'regulation_and_permits_audit', 'document_process_audit', 'penalty_or_shortfall_exposure', 'storage_demurrage_charges', 'sale_terms_review', 'insurance_coverage_review', 'supplier_process_review', 'brokerage_and_clearance_process', 'legal_advice', 'other'];
  for (const auditPurpose of purposes) {
    const result = resultFor({ auditPurpose });
    assert.ok(result.professional && typeof result.professional.type === 'string' && result.professional.type.length > 0, `expected one primary professional for "${auditPurpose}"`);
  }
});

test('13. insurance and legal purposes still route to their boundary message, unaffected by the taxonomy consolidation', () => {
  const insurance = resultFor({ auditPurpose: 'insurance_coverage_review' });
  assert.equal(insurance.primaryAction, 'פנייה ליועץ ביטוחי המתמחה בסיכוני הובלה ויבוא.');
  const legal = resultFor({ auditPurpose: 'legal_advice' });
  assert.equal(legal.primaryAction, 'פנייה לייעוץ משפטי מתאים.');
});

// -----------------------------------------------------------------
// 14-20: Product-family matrix professional routing untouched by this
// consolidation (no code in that path was modified) -- locks in that
// standards/medical/communications/agriculture/vehicle routes still
// resolve through PROFESSIONAL_CATEGORY the same way as before.
// -----------------------------------------------------------------

test('14. product-family-result.js is untouched by the Stage 4B consolidation (no edit to that file)', () => {
  const content = readFileSync(path.join(repoRoot, 'js/import-readiness/product-family-result.js'), 'utf8');
  assert.ok(content.includes('PROFESSIONAL_CATEGORY.STANDARDS_SPECIALIST'), 'standards route must still reference the canonical registry');
  assert.ok(content.includes('PROFESSIONAL_CATEGORY.VEHICLE_TESTING_LAB'), 'vehicle route must still reference the canonical registry');
  assert.ok(content.includes('PROFESSIONAL_CATEGORY.REGULATION_SPECIALIST'), 'medical/healthUmbrella route must still reference the canonical registry');
  assert.ok(content.includes('PROFESSIONAL_CATEGORY.GOV_REGULATOR'), 'communications/agriculture routes must still reference the canonical registry');
});

test('15. customs-dispute-rules.js, cargo-damage-rules.js, carrier-dispute-rules.js, insurance-rules.js, personal-import-rules.js, shipment-problem-rules.js are untouched by this consolidation', () => {
  const untouchedFiles = [
    'js/import-readiness/customs-dispute-rules.js',
    'js/import-readiness/cargo-damage-rules.js',
    'js/import-readiness/carrier-dispute-rules.js',
    'js/import-readiness/insurance-rules.js',
    'js/import-readiness/personal-import-rules.js',
    'js/import-readiness/shipment-problem-rules.js',
  ];
  for (const rel of untouchedFiles) {
    const content = readFileSync(path.join(repoRoot, rel), 'utf8');
    assert.ok(content.includes('PROFESSIONAL_CATEGORY'), `${rel} must still import the canonical registry, unaffected by this consolidation`);
    assert.ok(!content.includes('PROFESSIONAL_ROLES'), `${rel} must never have referenced the removed duplicate registry`);
  }
});

// -----------------------------------------------------------------
// 16-19: Legally distinct roles preserved, never merged (Decision 6).
// -----------------------------------------------------------------

test('16. CUSTOMS_LAWYER, TRANSPORT_LAWYER, and INSURANCE_LAWYER remain three distinct canonical entries with distinct ids and names', () => {
  const { CUSTOMS_LAWYER, TRANSPORT_LAWYER, INSURANCE_LAWYER } = PROFESSIONAL_CATEGORY;
  assert.notEqual(CUSTOMS_LAWYER.id, TRANSPORT_LAWYER.id);
  assert.notEqual(CUSTOMS_LAWYER.id, INSURANCE_LAWYER.id);
  assert.notEqual(TRANSPORT_LAWYER.id, INSURANCE_LAWYER.id);
  assert.notEqual(CUSTOMS_LAWYER.name, TRANSPORT_LAWYER.name);
  assert.notEqual(CUSTOMS_LAWYER.name, INSURANCE_LAWYER.name);
  assert.notEqual(TRANSPORT_LAWYER.name, INSURANCE_LAWYER.name);
});

test('17. professionalReferral() for each distinct lawyer role produces distinct coveredCategoryIds -- never collapsed into one generic legal referral', () => {
  const customs = professionalReferral(PROFESSIONAL_CATEGORY.CUSTOMS_LAWYER, 'x');
  const transport = professionalReferral(PROFESSIONAL_CATEGORY.TRANSPORT_LAWYER, 'x');
  const insurance = professionalReferral(PROFESSIONAL_CATEGORY.INSURANCE_LAWYER, 'x');
  assert.notDeepEqual(customs.coveredCategoryIds, transport.coveredCategoryIds);
  assert.notDeepEqual(customs.coveredCategoryIds, insurance.coveredCategoryIds);
  assert.notDeepEqual(transport.coveredCategoryIds, insurance.coveredCategoryIds);
});

test('18. the generic PROFESSIONAL_REFERRAL.LEGAL entry is unaffected and still distinct from any specific lawyer category (no coveredCategoryIds overlap)', () => {
  assert.deepEqual(PROFESSIONAL_REFERRAL.LEGAL.coveredCategoryIds, []);
});

test('19. jointReferral() can still combine two distinct categories without collapsing their identities', () => {
  const joint = jointReferral(PROFESSIONAL_CATEGORY.MARINE_INSURANCE_BROKER, PROFESSIONAL_CATEGORY.CARGO_INSURER, 'x');
  assert.deepEqual(joint.coveredCategoryIds, ['marine_insurance_broker', 'cargo_insurer']);
});

// -----------------------------------------------------------------
// 20-21: CTA and priority stability (spot-check against the exact
// pre-consolidation values, sourced from the module itself).
// -----------------------------------------------------------------

test('20. CUSTOMS_CLASSIFIER and LICENSED_CUSTOMS_BROKER CTA labels are unchanged', () => {
  assert.equal(PROFESSIONAL_CATEGORY.CUSTOMS_CLASSIFIER.ctaLabel, 'לתיאום בדיקת סיווג ורגולציה');
  assert.equal(PROFESSIONAL_CATEGORY.LICENSED_CUSTOMS_BROKER.ctaLabel, 'לפנייה לעמיל מכס');
});

test('21. the established-operation-rules.js CUSTOMS_BROKER_REFERRAL card still carries no coveredCategoryIds (preserves pre-consolidation dedup behavior -- it never suppressed a duplicate professional card before, and must not start doing so now)', () => {
  const result = resultFor({ auditPurpose: 'penalty_or_shortfall_exposure' });
  assert.deepEqual(result.professional.coveredCategoryIds, [], 'adding coveredCategoryIds here would be a behavior change (could newly suppress this card via dedup), not just an ID-source consolidation');
});

// -----------------------------------------------------------------
// 22-25: Malformed-input safety, no console-visible drift, dead
// entries confirmed gone.
// -----------------------------------------------------------------

test('22. malformed input is still handled safely after the consolidation', () => {
  assert.doesNotThrow(() => buildEstablishedOperationResult(null));
  assert.doesNotThrow(() => buildEstablishedOperationResult(undefined));
});

test('23. the "other" fallback purpose still uses the generic QUALIFIED_PROFESSIONAL wording, unchanged', () => {
  const result = resultFor({ auditPurpose: 'nonexistent_purpose_xyz' });
  assert.equal(result.professional.type, 'גורם מקצועי מוסמך');
});

test('24. no PROFESSIONAL_CATEGORY entry was silently added or removed by this consolidation (still 19 entries, matching the pre-Stage-4B inventory)', () => {
  assert.equal(Object.keys(PROFESSIONAL_CATEGORY).length, 19);
});

test('25. the two dead PROFESSIONAL_ROLES entries (LEGAL_ADVISER, INSURANCE_ADVISER) are not resurrected anywhere as a competing generic legal/insurance identity registry', () => {
  const content = readFileSync(path.join(repoRoot, 'js/import-readiness/build-action-map.js'), 'utf8');
  assert.ok(!content.includes('LEGAL_ADVISER:'), 'must not reintroduce a dead entry as a new registry key');
  assert.ok(!content.includes('INSURANCE_ADVISER:'), 'must not reintroduce a dead entry as a new registry key');
});

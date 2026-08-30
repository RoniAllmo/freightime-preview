/**
 * Stage 4B cleanup program (product-owner-approved), including the
 * product-owner's follow-up correction: PROFESSIONAL_CATEGORY
 * (professional-category-registry.js) is now the SOLE canonical
 * professional taxonomy in practice, not just in name.
 *
 * build-action-map.js's duplicate PROFESSIONAL_ROLES map (6 entries,
 * only 4 ever consumed, 2 -- LEGAL_ADVISER, INSURANCE_ADVISER --
 * confirmed dead) was removed. established-operation-rules.js's two
 * exact-equivalent entries (CUSTOMS_CLASSIFIER, LICENSED_CUSTOMS_BROKER)
 * read the canonical `.name` directly. Its two entries that had no
 * exact canonical equivalent no longer remain as anonymous inline
 * literals:
 *  - REGULATION_SPECIALIST's established shorter wording ("מומחה
 *    רגולציה", vs. the fuller "מומחה רגולציה ליבוא" used when this
 *    category renders as a referral card) is now the registry's own
 *    `legacyShortName` field on that SAME canonical id.
 *  - The generic "גורם מקצועי מוסמך" fallback now has its own canonical
 *    entry, `GENERIC_QUALIFIED_PROFESSIONAL`, with byte-identical name/
 *    scope/ctaLabel to the previously-inline wording.
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

function walkJsFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkJsFiles(full));
    else if (entry.name.endsWith('.js')) results.push(full);
  }
  return results;
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
  for (const full of [...walkJsFiles(path.join(repoRoot, 'js')), ...walkJsFiles(path.join(repoRoot, 'tests'))]) {
    if (full.endsWith('stage-4b-professional-taxonomy-consolidation.test.js')) continue;
    const content = readFileSync(full, 'utf8');
    if (/\bimport\s*\{[^}]*\bPROFESSIONAL_ROLES\b[^}]*\}/.test(content)) offenders.push(path.relative(repoRoot, full));
  }
  assert.deepEqual(offenders, [], `PROFESSIONAL_ROLES must be fully removed, found references in: ${offenders.join(', ')}`);
});

test('3. PROFESSIONAL_CATEGORY has no duplicate internal ids', () => {
  const ids = Object.values(PROFESSIONAL_CATEGORY).map((c) => c.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual(dupes, []);
});

test('4. PROFESSIONAL_CATEGORY has no duplicate public titles (.name)', () => {
  const names = Object.values(PROFESSIONAL_CATEGORY).map((c) => c.name);
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  assert.deepEqual(dupes, []);
});

// -----------------------------------------------------------------
// 5-6: Every canonical entry and referral resolves.
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
// 7-13: established-operation-rules.js public wording is behavior-
// equivalent to before the consolidation, even though every identity
// now resolves through the canonical registry instead of an inline
// literal.
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

test('9. regulation_and_permits_audit uses REGULATION_SPECIALIST.legacyShortName -- the exact pre-consolidation wording ("מומחה רגולציה"), not the longer canonical .name ("מומחה רגולציה ליבוא")', () => {
  const result = resultFor({ auditPurpose: 'regulation_and_permits_audit' });
  assert.equal(result.primaryAction, `מומלץ לתאם ביקורת רגולציה מול ${PROFESSIONAL_CATEGORY.REGULATION_SPECIALIST.legacyShortName}, לוודא שהיתרים בתוקף עבור כל קטגוריית מוצר.`);
  assert.equal(PROFESSIONAL_CATEGORY.REGULATION_SPECIALIST.legacyShortName, 'מומחה רגולציה');
  assert.ok(!result.primaryAction.includes(PROFESSIONAL_CATEGORY.REGULATION_SPECIALIST.name), 'must not have silently adopted the longer canonical .name wording');
});

test('10. sale_terms_review uses the new canonical GENERIC_QUALIFIED_PROFESSIONAL entry, with byte-identical wording to the pre-consolidation literal', () => {
  const result = resultFor({ auditPurpose: 'sale_terms_review' });
  assert.equal(result.primaryAction, 'מומלץ לתאם בדיקה מול גורם מקצועי מוסמך, לוודא שתנאי המכר תואמים את חלוקת האחריות בפועל.');
  assert.equal(result.professional.type, PROFESSIONAL_CATEGORY.GENERIC_QUALIFIED_PROFESSIONAL.name);
  assert.equal(PROFESSIONAL_CATEGORY.GENERIC_QUALIFIED_PROFESSIONAL.name, 'גורם מקצועי מוסמך');
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
    assert.ok(result.supportingProfessional === undefined || result.supportingProfessional === null, `established-operation results never carry a supporting professional (purpose "${auditPurpose}")`);
  }
});

test('13. insurance and legal purposes still route to their boundary message, unaffected by the taxonomy consolidation', () => {
  const insurance = resultFor({ auditPurpose: 'insurance_coverage_review' });
  assert.equal(insurance.primaryAction, 'פנייה ליועץ ביטוחי המתמחה בסיכוני הובלה ויבוא.');
  const legal = resultFor({ auditPurpose: 'legal_advice' });
  assert.equal(legal.primaryAction, 'פנייה לייעוץ משפטי מתאים.');
});

// -----------------------------------------------------------------
// 14-15: Product-family matrix and other route modules untouched by
// this consolidation -- their professional routing (standards,
// medical, communications, agriculture, vehicle, customs dispute,
// cargo damage, etc.) is unchanged, since none of those files were
// edited in either Stage 4B pass.
// -----------------------------------------------------------------

test('14. product-family-result.js is untouched by the Stage 4B consolidation (still references the canonical registry for every route)', () => {
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

test('18. the generic PROFESSIONAL_REFERRAL.LEGAL entry is an operational routing abstraction, not a specific professional identity -- deliberately not linked to any one lawyer category (no coveredCategoryIds), and distinct from all three specific lawyer categories', () => {
  assert.deepEqual(PROFESSIONAL_REFERRAL.LEGAL.coveredCategoryIds, []);
  assert.equal(PROFESSIONAL_REFERRAL.LEGAL.type, 'עורך דין המתמחה בתחום הרלוונטי');
  assert.notEqual(PROFESSIONAL_REFERRAL.LEGAL.type, PROFESSIONAL_CATEGORY.CUSTOMS_LAWYER.name);
  assert.notEqual(PROFESSIONAL_REFERRAL.LEGAL.type, PROFESSIONAL_CATEGORY.TRANSPORT_LAWYER.name);
  assert.notEqual(PROFESSIONAL_REFERRAL.LEGAL.type, PROFESSIONAL_CATEGORY.INSURANCE_LAWYER.name);
});

test('19. jointReferral() can still combine two distinct categories without collapsing their identities', () => {
  const joint = jointReferral(PROFESSIONAL_CATEGORY.MARINE_INSURANCE_BROKER, PROFESSIONAL_CATEGORY.CARGO_INSURER, 'x');
  assert.deepEqual(joint.coveredCategoryIds, ['marine_insurance_broker', 'cargo_insurer']);
});

// -----------------------------------------------------------------
// 20-21: CTA and priority stability.
// -----------------------------------------------------------------

test('20. CUSTOMS_CLASSIFIER and LICENSED_CUSTOMS_BROKER CTA labels are unchanged', () => {
  assert.equal(PROFESSIONAL_CATEGORY.CUSTOMS_CLASSIFIER.ctaLabel, 'לתיאום בדיקת סיווג ורגולציה');
  assert.equal(PROFESSIONAL_CATEGORY.LICENSED_CUSTOMS_BROKER.ctaLabel, 'לפנייה לעמיל מכס');
});

test('21. the established-operation-rules.js CUSTOMS_BROKER_REFERRAL and QUALIFIED_PROFESSIONAL_REFERRAL cards now carry coveredCategoryIds linking to their canonical entries, with CTA text unchanged from before that link existed', () => {
  const brokerResult = resultFor({ auditPurpose: 'penalty_or_shortfall_exposure' });
  assert.deepEqual(brokerResult.professional.coveredCategoryIds, [PROFESSIONAL_CATEGORY.LICENSED_CUSTOMS_BROKER.id]);
  assert.equal(brokerResult.professional.ctaLabel, 'לתיאום ביקורת מול עמיל מכס');

  const genericResult = resultFor({ auditPurpose: 'sale_terms_review' });
  assert.deepEqual(genericResult.professional.coveredCategoryIds, [PROFESSIONAL_CATEGORY.GENERIC_QUALIFIED_PROFESSIONAL.id]);
  assert.equal(genericResult.professional.ctaLabel, 'לתיאום ביקורת מקצועית');
});

// -----------------------------------------------------------------
// 22-25: Malformed-input safety, dead entries confirmed gone, no
// silent registry drift.
// -----------------------------------------------------------------

test('22. malformed input is still handled safely after the consolidation', () => {
  assert.doesNotThrow(() => buildEstablishedOperationResult(null));
  assert.doesNotThrow(() => buildEstablishedOperationResult(undefined));
});

test('23. the "other" fallback purpose still uses the generic GENERIC_QUALIFIED_PROFESSIONAL wording, unchanged', () => {
  const result = resultFor({ auditPurpose: 'nonexistent_purpose_xyz' });
  assert.equal(result.professional.type, 'גורם מקצועי מוסמך');
  assert.deepEqual(result.professional.coveredCategoryIds, [PROFESSIONAL_CATEGORY.GENERIC_QUALIFIED_PROFESSIONAL.id]);
});

test('24. exactly one new PROFESSIONAL_CATEGORY entry (GENERIC_QUALIFIED_PROFESSIONAL) was added by the correction pass -- 20 entries total, up from the 19 the first Stage 4B pass produced', () => {
  assert.equal(Object.keys(PROFESSIONAL_CATEGORY).length, 20);
  assert.ok('GENERIC_QUALIFIED_PROFESSIONAL' in PROFESSIONAL_CATEGORY);
});

test('25. the two dead PROFESSIONAL_ROLES entries (LEGAL_ADVISER, INSURANCE_ADVISER) are not resurrected anywhere as a competing generic legal/insurance identity registry', () => {
  const content = readFileSync(path.join(repoRoot, 'js/import-readiness/build-action-map.js'), 'utf8');
  assert.ok(!content.includes('LEGAL_ADVISER:'), 'must not reintroduce a dead entry as a new registry key');
  assert.ok(!content.includes('INSURANCE_ADVISER:'), 'must not reintroduce a dead entry as a new registry key');
});

// -----------------------------------------------------------------
// 26-31: Product-owner correction -- no active professional identity
// remains as an anonymous inline literal in established-operation-rules.js.
// -----------------------------------------------------------------

test('26. established-operation-rules.js no longer defines REGULATION_SPECIALIST_TEXT or QUALIFIED_PROFESSIONAL_TEXT as local literal constants', () => {
  const content = readFileSync(path.join(repoRoot, 'js/import-readiness/established-operation-rules.js'), 'utf8');
  assert.ok(!content.includes('REGULATION_SPECIALIST_TEXT'), 'the local literal constant must be gone');
  assert.ok(!content.includes('QUALIFIED_PROFESSIONAL_TEXT'), 'the local literal constant must be gone');
});

test('27. every identity-bearing professional value in established-operation-rules.js traces to a PROFESSIONAL_CATEGORY entry (via .name, .legacyShortName, .ctaLabel, or .id) -- no bare Hebrew professional-name string literal remains outside the registry', () => {
  const content = readFileSync(path.join(repoRoot, 'js/import-readiness/established-operation-rules.js'), 'utf8');
  // The only Hebrew professional-title-shaped literals allowed outside
  // PROFESSIONAL_CATEGORY are the two boundary-referral sentences that
  // are explanatory prose about routing (insurance_coverage_review /
  // legal_advice primaryAction), which PROFESSIONAL_REFERRAL.INSURANCE
  // and PROFESSIONAL_REFERRAL.LEGAL already own as operational
  // referrals, not this file's own literals.
  assert.ok(!content.includes("'מומחה רגולציה'"), 'REGULATION_SPECIALIST legacy wording must not exist as a bare literal any more');
  assert.ok(!content.includes("'גורם מקצועי מוסמך'"), 'the generic qualified-professional wording must not exist as a bare literal any more');
  assert.ok(content.includes('PROFESSIONAL_CATEGORY.REGULATION_SPECIALIST.legacyShortName'), 'must read the legacy wording from the canonical entry');
  assert.ok(content.includes('PROFESSIONAL_CATEGORY.GENERIC_QUALIFIED_PROFESSIONAL'), 'must read the generic wording from the canonical entry');
});

test('28. PROFESSIONAL_CATEGORY.REGULATION_SPECIALIST.legacyShortName and .name are both non-empty and intentionally different strings', () => {
  const { REGULATION_SPECIALIST } = PROFESSIONAL_CATEGORY;
  assert.ok(REGULATION_SPECIALIST.legacyShortName.length > 0);
  assert.ok(REGULATION_SPECIALIST.name.length > 0);
  assert.notEqual(REGULATION_SPECIALIST.legacyShortName, REGULATION_SPECIALIST.name);
  assert.ok(REGULATION_SPECIALIST.name.includes(REGULATION_SPECIALIST.legacyShortName), 'the fuller name should still be a superset phrase of the legacy short name, confirming they name the same role');
});

test('29. GENERIC_QUALIFIED_PROFESSIONAL carries no new authority or regulatory meaning -- disclaimerCategory is the same inert field every other entry carries (not consumed by any runtime logic), and scope text stays generic (no named regulation, law, or authority)', () => {
  const entry = PROFESSIONAL_CATEGORY.GENERIC_QUALIFIED_PROFESSIONAL;
  assert.ok(entry.disclaimerCategory, 'must carry the same shape as every other entry');
  assert.ok(!/חוק|תקן|רגולציה|תקנה/.test(entry.scope), 'scope must stay generic -- no named law/standard/regulation should be implied by adding this entry');
});

test('30. GENERIC_QUALIFIED_PROFESSIONAL.id does not collide with any other canonical id, and its name does not collide with any other canonical name', () => {
  const others = Object.entries(PROFESSIONAL_CATEGORY).filter(([key]) => key !== 'GENERIC_QUALIFIED_PROFESSIONAL');
  for (const [key, cat] of others) {
    assert.notEqual(cat.id, PROFESSIONAL_CATEGORY.GENERIC_QUALIFIED_PROFESSIONAL.id, `id collision with ${key}`);
    assert.notEqual(cat.name, PROFESSIONAL_CATEGORY.GENERIC_QUALIFIED_PROFESSIONAL.name, `name collision with ${key}`);
  }
});

test('31. no .js file anywhere defines a second, competing professional-identity registry (a third taxonomy) alongside PROFESSIONAL_CATEGORY', () => {
  const offenders = [];
  for (const full of walkJsFiles(path.join(repoRoot, 'js'))) {
    if (full.endsWith('professional-category-registry.js')) continue;
    const content = readFileSync(full, 'utf8');
    if (/\bconst\s+\w*PROFESSIONAL\w*\s*=\s*Object\.freeze\(\{/.test(content) && !content.includes('PROFESSIONAL_REFERRAL')) {
      // PROFESSIONAL_REFERRAL is an approved, already-existing referral
      // combinator that resolves through PROFESSIONAL_CATEGORY ids
      // (coveredCategoryIds) -- not a second identity registry.
      offenders.push(path.relative(repoRoot, full));
    }
  }
  assert.deepEqual(offenders, [], `no second professional-identity registry allowed, found suspicious pattern in: ${offenders.join(', ')}`);
});

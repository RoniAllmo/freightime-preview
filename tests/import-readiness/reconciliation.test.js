/**
 * Tests for the explicit matrix-vs-detailed-rule reconciliation layer
 * (product-family-reconciliation.js + question-scheduler.js's
 * excludedRuleIds), proving the required precedence: an explicit user
 * exclusion answer for a detailed rule's regulatory subject suppresses
 * the matching matrix category, exactly like a matched rule's own card
 * already does -- without ever suppressing an unrelated positive
 * category, and without ever being interpreted as a full import
 * exemption.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXISTING_RULE_TO_FAMILY,
  suppressedSignalKeysForFamily,
} from '../../js/import-readiness/product-family-reconciliation.js';
import { excludedRuleIds, isRuleExcludedByAnswers } from '../../js/import-readiness/regulatory-signals/question-scheduler.js';
import { REGULATORY_SIGNAL_RULES } from '../../js/import-readiness/regulatory-signals/rules-registry.js';
import { buildProductFamilyMatrixSection } from '../../js/import-readiness/product-family-result.js';
import { IMPORT_TYPE } from '../../js/import-readiness/scenario-schema.js';
import { ANSWER } from '../../js/import-readiness/regulatory-signals/questions.js';

// --- excludedRuleIds: the shared "excluded" computation ---------------------

test('1. excludedRuleIds returns the glass rule id when its gating question is answered "no"', () => {
  const ids = excludedRuleIds({ glassVesselDirectFoodOrDrinkContact: ANSWER.NO }, REGULATORY_SIGNAL_RULES);
  assert.ok(ids.includes('glass-food-contact-vessel'));
});

test('2. excludedRuleIds returns the plastic rule id when its gating question is answered "no"', () => {
  const ids = excludedRuleIds({ directFoodOrDrinkContact: ANSWER.NO }, REGULATORY_SIGNAL_RULES);
  assert.ok(ids.includes('plastic-direct-food-contact'));
});

test('3. excludedRuleIds returns the polymer rule id when its coating-contact question is answered "no"', () => {
  const ids = excludedRuleIds({ hasInternalCoating: ANSWER.YES, coatingDirectFoodOrDrinkContact: ANSWER.NO }, REGULATORY_SIGNAL_RULES);
  assert.ok(ids.includes('polymer-coated-direct-food-contact'));
});

test('4. excludedRuleIds returns the vehicle-installed rule id when its gating question is answered "no"', () => {
  const ids = excludedRuleIds({ installedAsPartOfVehicle: ANSWER.NO }, REGULATORY_SIGNAL_RULES);
  assert.ok(ids.includes('vehicle-installed-product'));
});

test('5. excludedRuleIds returns the mains-connected rule id when its gating question is answered "no"', () => {
  const ids = excludedRuleIds({ mainsConnectedOrSuppliedAdapter: ANSWER.NO }, REGULATORY_SIGNAL_RULES);
  assert.ok(ids.includes('mains-connected-electrical-product'));
});

test('6. a "yes" answer never counts as excluded', () => {
  const ids = excludedRuleIds({ glassVesselDirectFoodOrDrinkContact: ANSWER.YES }, REGULATORY_SIGNAL_RULES);
  assert.ok(!ids.includes('glass-food-contact-vessel'));
});

test('7. no answer at all never counts as excluded', () => {
  const ids = excludedRuleIds({}, REGULATORY_SIGNAL_RULES);
  assert.equal(ids.length, 0);
});

test('8. isRuleExcludedByAnswers is the single shared primitive both the live question scheduler and the reconciliation layer rely on', () => {
  const rule = REGULATORY_SIGNAL_RULES.find((r) => r.id === 'glass-food-contact-vessel');
  assert.equal(isRuleExcludedByAnswers(rule, { glassVesselDirectFoodOrDrinkContact: ANSWER.NO }), true);
  assert.equal(isRuleExcludedByAnswers(rule, { glassVesselDirectFoodOrDrinkContact: ANSWER.YES }), false);
});

// --- suppressedSignalKeysForFamily: exclusion suppresses the same category as a match

test('9. glass exclusion suppresses the "standards" matrix category for the glass food-contact family', () => {
  const mapping = EXISTING_RULE_TO_FAMILY['glass-food-contact-vessel'];
  const suppressed = suppressedSignalKeysForFamily(mapping.familyId, [], ['glass-food-contact-vessel']);
  assert.ok(suppressed.has('standards'));
});

test('10. plastic exclusion suppresses the "standards" matrix category for the plastic food-contact family', () => {
  const mapping = EXISTING_RULE_TO_FAMILY['plastic-direct-food-contact'];
  const suppressed = suppressedSignalKeysForFamily(mapping.familyId, [], ['plastic-direct-food-contact']);
  assert.ok(suppressed.has('standards'));
});

test('11. polymer exclusion suppresses the "standards" matrix category for the polymer-coating food-contact family', () => {
  const mapping = EXISTING_RULE_TO_FAMILY['polymer-coated-direct-food-contact'];
  const suppressed = suppressedSignalKeysForFamily(mapping.familyId, [], ['polymer-coated-direct-food-contact']);
  assert.ok(suppressed.has('standards'));
});

test('12. vehicle-installed exclusion suppresses the "transportOrVehicleLaboratory" matrix category for the vehicle family', () => {
  const mapping = EXISTING_RULE_TO_FAMILY['vehicle-installed-product'];
  const suppressed = suppressedSignalKeysForFamily(mapping.familyId, [], ['vehicle-installed-product']);
  assert.ok(suppressed.has('transportOrVehicleLaboratory'));
});

test('13. mains-connected exclusion suppresses the "standards" matrix category for the electrical family', () => {
  const mapping = EXISTING_RULE_TO_FAMILY['mains-connected-electrical-product'];
  const suppressed = suppressedSignalKeysForFamily(mapping.familyId, [], ['mains-connected-electrical-product']);
  assert.ok(suppressed.has('standards'));
});

test('14. an excluded rule never suppresses a category for an unrelated family', () => {
  const suppressed = suppressedSignalKeysForFamily('health-and-cosmetics-01', [], ['glass-food-contact-vessel']);
  assert.equal(suppressed.size, 0, 'the glass exclusion must never leak into an unrelated family');
});

test('15. an unrelated, independently-applicable category is never suppressed by an excluded rule for the same family (vehicle exclusion keeps a communications signal)', () => {
  // Hypothetical family with two independent regulatory subjects, one
  // covered by the vehicle-installed rule and one not -- proves the
  // exclusion suppression is scoped to exactly the rule's own covered
  // key(s), not the whole family.
  const mapping = EXISTING_RULE_TO_FAMILY['vehicle-installed-product'];
  const suppressed = suppressedSignalKeysForFamily(mapping.familyId, [], ['vehicle-installed-product']);
  assert.ok(!suppressed.has('communications'), 'communications is not one of the vehicle-installed rule\'s covered keys, so it must survive');
  assert.deepEqual([...suppressed], ['transportOrVehicleLaboratory']);
});

test('16. a matched rule and an excluded rule for the same family suppress identically (no double-suppression, no different behavior)', () => {
  const mapping = EXISTING_RULE_TO_FAMILY['glass-food-contact-vessel'];
  const viaMatch = suppressedSignalKeysForFamily(mapping.familyId, ['glass-food-contact-vessel'], []);
  const viaExclusion = suppressedSignalKeysForFamily(mapping.familyId, [], ['glass-food-contact-vessel']);
  assert.deepEqual([...viaMatch], [...viaExclusion]);
});

// --- End-to-end through buildProductFamilyMatrixSection ----------------------

test('17. glass drinking vessel, direct-contact answered "no": no matched detailed rule, matrix does not reintroduce "standards", a safe fallback verification result remains, no exemption wording', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['כוס זכוכית'],
    importType: IMPORT_TYPE.PERSONAL,
    matchedExistingRuleIds: [],
    excludedExistingRuleIds: ['glass-food-contact-vessel'],
  });
  assert.ok(section, 'a safe professional verification result must remain, not vanish entirely');
  assert.equal(section.hasPositiveCategories, false);
  assert.ok(!section.positiveCategories.includes('תקינה'), 'the standards category must not be reintroduced');
  assert.ok(section.noPositiveSignalMessage);
  assert.ok(section.noPositiveSignalNotExemptNote, 'the not-exempt note must accompany the fallback, never a bare exemption-shaped silence');
  assert.ok(section.professional.primary, 'a safe generic verification route must still be offered');
});

test('18. plastic food-contact, direct-contact answered "no": matrix does not reintroduce "standards"', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['כלי פלסטיק במגע עם מזון'],
    importType: IMPORT_TYPE.PERSONAL,
    matchedExistingRuleIds: [],
    excludedExistingRuleIds: ['plastic-direct-food-contact'],
  });
  assert.ok(section);
  assert.ok(!section.positiveCategories.includes('תקינה'));
});

test('19. polymer coating, coating-contact answered "no": matrix does not reintroduce "standards"', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['מוצר עם ציפוי פולימרי במגע עם מזון'],
    importType: IMPORT_TYPE.PERSONAL,
    matchedExistingRuleIds: [],
    excludedExistingRuleIds: ['polymer-coated-direct-food-contact'],
  });
  assert.ok(section);
  assert.ok(!section.positiveCategories.includes('תקינה'));
});

test('20. vehicle-installed, installation answered "no": matrix does not reintroduce the transport signal', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['פנס לרכב'],
    importType: IMPORT_TYPE.PERSONAL,
    matchedExistingRuleIds: [],
    excludedExistingRuleIds: ['vehicle-installed-product'],
  });
  assert.ok(section);
  assert.ok(!section.positiveCategories.includes('משרד התחבורה / מעבדת רכב'));
});

test('21. mains-connected, mains-connection answered "no": matrix does not reintroduce "standards"', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['מכשיר חשמלי עם תקע או ספק כוח'],
    importType: IMPORT_TYPE.PERSONAL,
    matchedExistingRuleIds: [],
    excludedExistingRuleIds: ['mains-connected-electrical-product'],
  });
  assert.ok(section);
  assert.ok(!section.positiveCategories.includes('תקינה'));
});

test('22. an unrelated family\'s positive categories are untouched by an exclusion that does not apply to it', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['ווקי טוקי'],
    importType: IMPORT_TYPE.COMMERCIAL,
    matchedExistingRuleIds: [],
    excludedExistingRuleIds: ['glass-food-contact-vessel', 'vehicle-installed-product'],
  });
  assert.ok(section);
  assert.deepEqual(section.positiveCategories, ['תקינה', 'משרד התקשורת'], 'walkie-talkie categories must be unaffected by exclusions for unrelated families');
});

test('23. no duplicate categories: a family covered by both a matched rule and an unrelated exclusion still lists each surviving category exactly once', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['ביצים טריות'],
    importType: IMPORT_TYPE.COMMERCIAL,
    matchedExistingRuleIds: [],
    excludedExistingRuleIds: ['glass-food-contact-vessel'],
  });
  assert.ok(section);
  const counts = {};
  for (const label of section.positiveCategories) counts[label] = (counts[label] ?? 0) + 1;
  assert.ok(Object.values(counts).every((n) => n === 1), 'every listed category must appear exactly once');
});

test('24. exclusion is never interpreted as an exemption: the fallback wording explicitly says so, and no result claims the product is exempt', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['כוס זכוכית'],
    importType: IMPORT_TYPE.PERSONAL,
    matchedExistingRuleIds: [],
    excludedExistingRuleIds: ['glass-food-contact-vessel'],
  });
  assert.ok(section);
  assert.equal(section.noPositiveSignalNotExemptNote, 'אין בכך אישור שהמוצר פטור מדרישות יבוא או מתנאים אחרים.');
  const allText = JSON.stringify(section);
  assert.ok(!/המוצר\s*פטור/.test(allText.replace('אין בכך אישור שהמוצר פטור מדרישות יבוא או מתנאים אחרים.', '')), 'no wording elsewhere in the section may claim the product is exempt');
});

test('25. when a rule already MATCHED (a card is shown elsewhere) and that is the family\'s only category, the matrix still contributes nothing (unchanged prior behavior, not a regression)', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['כוס זכוכית'],
    importType: IMPORT_TYPE.PERSONAL,
    matchedExistingRuleIds: ['glass-food-contact-vessel'],
    excludedExistingRuleIds: [],
  });
  assert.equal(section, null, 'a matched rule\'s own card already explains the result; the matrix must add nothing');
});

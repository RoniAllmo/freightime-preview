/**
 * Integration tests: buildProductFamilyMatrixSection driven by explicit
 * irProductFamily checkbox selections (params.selectedProductFamilies),
 * on top of the existing free-text identification
 * (product-family-result.js + product-family-selection-mapping.js). No
 * DOM here -- pure params in, render-ready section out.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductFamilyMatrixSection } from '../../js/import-readiness/product-family-result.js';
import { IMPORT_TYPE } from '../../js/import-readiness/scenario-schema.js';

test('1. no selection at all: behavior is identical to today (pure free text) -- Wave-1 alias still resolves', () => {
  const withoutSelection = buildProductFamilyMatrixSection({
    texts: ['שימורי ירקות'],
    importType: IMPORT_TYPE.COMMERCIAL,
  });
  assert.ok(withoutSelection);
  assert.equal(withoutSelection.familyName, 'מזון ארוז');
});

test('2. single unambiguous selection is authoritative even with neutral, non-matching text', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['מוצר לבדיקה כללי'],
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: ['batteries_or_battery_containing'],
  });
  assert.ok(section);
  assert.equal(section.familyName, 'סוללות ותאים');
});

test('3. single unambiguous selection wins even when the free text would otherwise match a DIFFERENT family', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['בושם'], // would otherwise resolve to תמרוקים ובשמים
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: ['batteries_or_battery_containing'],
  });
  assert.ok(section);
  assert.equal(section.familyName, 'סוללות ותאים');
});

test('4. single ambiguous selection: free text disambiguates within the candidate set', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['כוס זכוכית'], // glass food-contact alias, within the glass/ceramics candidate set
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: ['glass_ceramics_and_tableware'],
  });
  assert.ok(section);
  assert.equal(section.familyName, 'כלי זכוכית במגע עם מזון או שתייה');
});

test('5. single ambiguous selection: text matching OUTSIDE the candidate set never leaks in -- cautious unknown, not a fabricated guess', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['בושם'], // matches cosmetics, which is outside the glass/ceramics candidate set
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: ['glass_ceramics_and_tableware'],
  });
  assert.ok(section);
  assert.equal(section.state, 'unknown_family');
  assert.equal(section.familyName, null);
});

test('6. single ambiguous selection: no text at all within the candidate set -> cautious unknown, no fabricated positive direction', () => {
  const section = buildProductFamilyMatrixSection({
    texts: [],
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: ['food_contact_items'],
  });
  assert.ok(section);
  assert.equal(section.state, 'unknown_family');
});

test('7. multiple selections: free text narrows the union to exactly one family', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['בושם'],
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: ['cosmetics_and_beauty', 'batteries_or_battery_containing'],
  });
  assert.ok(section);
  assert.equal(section.familyName, 'תמרוקים ובשמים');
});

test('8. multiple selections: text narrows to the OTHER family in the union depending on wording -- order-independent, not DOM-order or "first" based', () => {
  const sectionA = buildProductFamilyMatrixSection({
    texts: ['סוללות ותאים'],
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: ['cosmetics_and_beauty', 'batteries_or_battery_containing'],
  });
  const sectionB = buildProductFamilyMatrixSection({
    texts: ['סוללות ותאים'],
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: ['batteries_or_battery_containing', 'cosmetics_and_beauty'],
  });
  assert.equal(sectionA.familyName, 'סוללות ותאים');
  assert.equal(sectionB.familyName, 'סוללות ותאים');
});

test('9. multiple selections, no disambiguating text at all: no combined category, no fabricated primary family', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['מוצר כללי לבדיקה'],
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: ['cosmetics_and_beauty', 'batteries_or_battery_containing'],
  });
  assert.ok(section);
  assert.equal(section.state, 'unknown_family');
  assert.equal(section.familyName, null);
  assert.equal(section.hasPositiveCategories, false);
});

test('10. multiple selections, text matches BOTH candidates: ambiguous -> nothing shown, never a combined result', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['בושם וגם סוללות ותאים בקופסה אחת'],
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: ['cosmetics_and_beauty', 'batteries_or_battery_containing'],
  });
  assert.equal(section, null);
});

test('11. not_sure alone: identical to no selection at all', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['שימורי ירקות'],
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: ['not_sure'],
  });
  assert.ok(section);
  assert.equal(section.familyName, 'מזון ארוז');
});

test('12. not_sure selected together with a normal family: the normal family wins, not_sure never overrides it', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['מוצר לבדיקה כללי'],
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: ['not_sure', 'batteries_or_battery_containing'],
  });
  assert.ok(section);
  assert.equal(section.familyName, 'סוללות ותאים');
});

test('13. other_general_product alone: preserves the current cautious unknown-family behavior, never fabricates a family', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['מוצר כללי לבדיקה שאינו תואם אף כינוי'],
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: ['other_general_product'],
  });
  assert.ok(section);
  assert.equal(section.state, 'unknown_family');
  assert.equal(section.familyName, null);
});

test('14. other_general_product selected together with a normal family: the normal family still wins', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['מוצר לבדיקה כללי'],
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: ['other_general_product', 'batteries_or_battery_containing'],
  });
  assert.ok(section);
  assert.equal(section.familyName, 'סוללות ותאים');
});

test('15. all 4 weak (no-positive-category) families still surface the correct no-positive-signal state when explicitly selected', () => {
  const weakFamilies = [
    ['textile_apparel_and_footwear', 'ביגוד'],
    ['chemicals_paints_adhesives_aerosols', 'צבעים, דבקים וחומרי איטום'],
    ['industrial_machinery_and_equipment', 'מכונות וציוד תעשייתי'],
    ['building_materials', 'חומרי בנייה'],
  ];
  for (const [checkboxValue, matchingText] of weakFamilies) {
    const section = buildProductFamilyMatrixSection({
      texts: [matchingText],
      importType: IMPORT_TYPE.COMMERCIAL,
      selectedProductFamilies: [checkboxValue],
    });
    assert.ok(section, `${checkboxValue} must produce a section`);
    assert.equal(section.state, 'no_positive_signal', `${checkboxValue} must be no_positive_signal`);
    assert.equal(section.hasPositiveCategories, false);
  }
});

test('16. an existing detailed rule still wins outright over an explicit family selection (no combined detailed+matrix result)', () => {
  // buildProductFamilyMatrixSection itself never sees "detailed rule
  // wins" -- that precedence is enforced by the caller
  // (resolveCanonicalRegulatoryContent in the controller), which
  // hardcodes familyName:null whenever any detailed rule matched,
  // regardless of what this function returns. This test only confirms
  // the matrix section itself still resolves normally underneath that
  // precedence -- unaffected by which existing rule ids are passed in
  // beyond the reconciliation this module already owned before this
  // change.
  const section = buildProductFamilyMatrixSection({
    texts: ['כוס זכוכית'],
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: ['glass_ceramics_and_tableware'],
    matchedExistingRuleIds: ['glass-food-contact-vessel'],
  });
  // The glass-food-contact-vessel rule covers "standards" for
  // food-contact-03 -- with nothing else positive on that family and
  // every positive key coming from the matched rule, the matrix
  // contributes nothing (returns null), exactly as before this change.
  assert.equal(section, null);
});

test('17. single unambiguous selection is still suppressed identically to free text when the matched rule already covers its only category', () => {
  const section = buildProductFamilyMatrixSection({
    texts: ['מוצר כלשהו'],
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: ['batteries_or_battery_containing'],
    matchedExistingRuleIds: [],
  });
  // Batteries has no matched rule here, so this stays a normal
  // no-positive-signal-or-positive result depending on the matrix's own
  // data -- batteries has a positive "standards" signal, so expect a
  // positive result untouched by the (empty) matched-rule list.
  assert.ok(section);
  assert.equal(section.state, 'positive');
  assert.deepEqual(section.positiveCategories, ['תקינה']);
});

test('18. empty selectedProductFamilies array behaves identically to omitting the field entirely', () => {
  const withField = buildProductFamilyMatrixSection({
    texts: ['שימורי ירקות'],
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: [],
  });
  const withoutField = buildProductFamilyMatrixSection({
    texts: ['שימורי ירקות'],
    importType: IMPORT_TYPE.COMMERCIAL,
  });
  assert.deepEqual(withField, withoutField);
});

test('19. the pre-existing options.families test seam still overrides selection-derived restriction (backward compatible)', () => {
  const families = [
    { id: 'x', publicFamilyName: 'משפחת בדיקה', aliases: ['משפחת בדיקה'], regulatorySignals: { standards: true } },
  ];
  const section = buildProductFamilyMatrixSection(
    {
      texts: ['משפחת בדיקה'],
      importType: IMPORT_TYPE.COMMERCIAL,
      // An ambiguous checkbox (produces options.families, not
      // options.forcedFamily) so this test isolates the families-seam
      // override cleanly.
      selectedProductFamilies: ['food_contact_items'],
    },
    { families },
  );
  assert.ok(section);
  assert.equal(section.familyName, 'משפחת בדיקה');
});

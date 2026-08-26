/**
 * Final completion pass (product-owner decision, 2026-08-26): the two
 * exact remaining implementation gaps from PR #50 -- batteries/
 * accumulators, and ordinary furniture vs. mattresses. Implemented via
 * the same canonical-data-split mechanism already used elsewhere in
 * this PR (workbook edits + CURATED_ALIASES + FAMILY_NEGATIVE_TERMS +
 * FAMILY_GUIDANCE), never a controller-level product-name check.
 *
 * Every test exercises final resolution and final result behavior
 * (state, positiveCategories, familyName, professional), never string
 * presence alone.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductFamilyMatrixSection } from '../../js/import-readiness/product-family-result.js';
import { IMPORT_TYPE } from '../../js/import-readiness/scenario-schema.js';
import { REGULATORY_FOLLOWUP_QUESTIONS } from '../../js/import-readiness/regulatory-signals/questions.js';
import { REGULATORY_SIGNAL_RULES } from '../../js/import-readiness/regulatory-signals/rules-registry.js';
import { PRODUCT_FAMILY_MATRIX, findFamilyById } from '../../js/import-readiness/product-family-matrix.js';
import { evaluateRegulatorySignals } from '../../js/import-readiness/regulatory-signals/index.js';

function section(texts, checkbox) {
  return buildProductFamilyMatrixSection({
    texts,
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: checkbox ? [checkbox] : [],
  });
}

const BATTERY_CHECKBOX = 'batteries_or_battery_containing';
const FURNITURE_CHECKBOX = 'furniture_and_home_goods';

// ===================== BATTERIES =====================

test('1. standalone battery -> Standards Institution direction', () => {
  const s = section(['סוללה'], BATTERY_CHECKBOX);
  assert.ok(s);
  assert.equal(s.state, 'positive');
  assert.equal(s.familyName, 'סוללות ותאים');
  assert.deepEqual(s.positiveCategories, ['תקינה']);
  assert.ok(s.professional.primary);
  assert.ok(!s.professional.supporting || s.professional.supporting.type !== s.professional.primary.type);
});

test('2. lithium battery -> same direction', () => {
  const s = section(['סוללת ליתיום'], BATTERY_CHECKBOX);
  assert.ok(s);
  assert.deepEqual(s.positiveCategories, ['תקינה']);
});

test('3. battery pack -> same direction', () => {
  const s = section(['battery pack'], BATTERY_CHECKBOX);
  assert.ok(s);
  assert.deepEqual(s.positiveCategories, ['תקינה']);
});

test('4. accumulator -> same direction', () => {
  const s = section(['accumulator'], BATTERY_CHECKBOX);
  assert.ok(s);
  assert.equal(s.familyName, 'סוללות ותאים');
  assert.deepEqual(s.positiveCategories, ['תקינה']);
});

test('5. vehicle battery (free text, no checkbox) -> certified vehicle-laboratory direction, distinct family from standalone battery', () => {
  const s = section(['vehicle battery']);
  assert.ok(s);
  assert.equal(s.familyName, 'מצבר ייעודי לרכב');
  assert.deepEqual(s.positiveCategories, ['משרד התחבורה / מעבדת רכב']);
  assert.notEqual(s.familyName, 'סוללות ותאים');
});

test('6. vehicle accumulator (מצבר לרכב) -> same vehicle-laboratory direction, never two directions at once', () => {
  const s = section(['מצבר לרכב']);
  assert.ok(s);
  assert.equal(s.familyName, 'מצבר ייעודי לרכב');
  assert.deepEqual(s.positiveCategories, ['משרד התחבורה / מעבדת רכב']);
  assert.ok(!s.positiveCategories.includes('תקינה'), 'must never show both standards and vehicle-laboratory at once');
  assert.equal(Object.values(s.professional).filter(Boolean).length <= 2, true, 'never two equal/duplicate CTAs');
});

test('7. equipment supplied with a wall charger -> Standards Institution direction via the existing generic mains-electrical detailed rule (no new electrical rule)', () => {
  const result = evaluateRegulatorySignals(
    { productName: 'ציוד עם מטען קיר' },
    { answers: { mainsConnectedOrSuppliedAdapter: 'yes' } },
  );
  assert.equal(result.signals.length, 1);
  assert.equal(result.signals[0].ruleId, 'mains-connected-electrical-product');
});

test('8. equipment supplied with a mains charger (English) -> same existing rule', () => {
  const result = evaluateRegulatorySignals(
    { productName: 'product supplied with wall charger' },
    { answers: { mainsConnectedOrSuppliedAdapter: 'yes' } },
  );
  assert.equal(result.signals.length, 1);
  assert.equal(result.signals[0].ruleId, 'mains-connected-electrical-product');
});

test('9. equipment merely containing an internal battery -> never fabricated as a standalone battery result', () => {
  for (const text of ['מוצר הכולל סוללה פנימית', 'equipment containing an internal battery']) {
    const s = section([text]);
    if (s) {
      assert.notEqual(s.familyName, 'סוללות ותאים', text);
    }
  }
});

test('10. battery charger -> never a standalone battery result', () => {
  for (const text of ['battery charger', 'מטען לסוללה']) {
    const s = section([text]);
    if (s) {
      assert.notEqual(s.familyName, 'סוללות ותאים', text);
    }
  }
});

test('11. battery tester -> never a standalone battery result', () => {
  for (const text of ['battery tester', 'בודק סוללות']) {
    const s = section([text]);
    if (s) {
      assert.notEqual(s.familyName, 'סוללות ותאים', text);
    }
  }
});

test('12. battery holder -> never a standalone battery result', () => {
  for (const text of ['battery holder', 'מחזיק סוללה']) {
    const s = section([text]);
    if (s) {
      assert.notEqual(s.familyName, 'סוללות ותאים', text);
    }
  }
});

test('13. battery compartment -> never a standalone battery result', () => {
  for (const text of ['battery compartment', 'תא סוללה כחלק ממכשיר']) {
    const s = section([text]);
    if (s) {
      assert.notEqual(s.familyName, 'סוללות ותאים', text);
    }
  }
});

// ===================== FURNITURE =====================

test('14. ordinary table -> recognized family, no-positive guidance', () => {
  const s = section(['שולחן'], FURNITURE_CHECKBOX);
  assert.ok(s);
  assert.equal(s.familyName, 'ריהוט');
  assert.equal(s.state, 'no_positive_signal');
  assert.equal(s.hasPositiveCategories, false);
  assert.ok(!/פטור/.test(s.noPositiveSignalMessage + ' ' + s.note.text), 'no absolute exemption promise');
  assert.ok(s.professional.primary, 'customs-classifier route must remain');
});

test('15. ordinary chair -> same no-positive direction', () => {
  const s = section(['כיסא'], FURNITURE_CHECKBOX);
  assert.ok(s);
  assert.equal(s.familyName, 'ריהוט');
  assert.equal(s.hasPositiveCategories, false);
});

test('16. ordinary cabinet -> same no-positive direction', () => {
  const s = section(['ארון'], FURNITURE_CHECKBOX);
  assert.ok(s);
  assert.equal(s.familyName, 'ריהוט');
  assert.equal(s.hasPositiveCategories, false);
});

test('17. ordinary sofa -> same no-positive direction', () => {
  const s = section(['ספה'], FURNITURE_CHECKBOX);
  assert.ok(s);
  assert.equal(s.familyName, 'ריהוט');
  assert.equal(s.hasPositiveCategories, false);
});

test('18. mattress -> Standards Institution direction, distinct from ordinary furniture', () => {
  const s = section(['מזרן'], FURNITURE_CHECKBOX);
  assert.ok(s);
  assert.equal(s.familyName, 'מזרנים');
  assert.deepEqual(s.positiveCategories, ['תקינה']);
});

test('19. electric recliner (electrically wired furniture) -> Standards Institution direction via the existing generic mains-electrical detailed rule', () => {
  const result = evaluateRegulatorySignals(
    { productName: 'כורסה חשמלית' },
    { answers: { mainsConnectedOrSuppliedAdapter: 'yes' } },
  );
  assert.equal(result.signals.length, 1);
  assert.equal(result.signals[0].ruleId, 'mains-connected-electrical-product');
});

test('20. electric bed -> same existing mains-electrical rule', () => {
  const result = evaluateRegulatorySignals(
    { productName: 'מיטה חשמלית' },
    { answers: { mainsConnectedOrSuppliedAdapter: 'yes' } },
  );
  assert.equal(result.signals.length, 1);
  assert.equal(result.signals[0].ruleId, 'mains-connected-electrical-product');
});

test('21. furniture with a wired electrical system -> same existing mains-electrical rule -- no broad standards category for all furniture', () => {
  const result = evaluateRegulatorySignals(
    { productName: 'ריהוט עם מערכת חשמלית' },
    { answers: { mainsConnectedOrSuppliedAdapter: 'yes' } },
  );
  assert.equal(result.signals.length, 1);
  assert.equal(result.signals[0].ruleId, 'mains-connected-electrical-product');
  // Ordinary (non-electric) furniture must still be no-positive.
  const ordinary = section(['ארון'], FURNITURE_CHECKBOX);
  assert.equal(ordinary.hasPositiveCategories, false);
});

test('22. infant bed -> unchanged Standards Institution direction (correct reconciliation after the furniture/mattress split)', () => {
  const s = section(['מיטת תינוק'], 'childrens_products_and_toys');
  assert.ok(s);
  assert.deepEqual(s.positiveCategories, ['תקינה']);
  assert.notEqual(s.familyName, 'ריהוט');
});

test('23. crib -> unchanged Standards Institution direction', () => {
  const s = section(['לול לתינוק'], 'childrens_products_and_toys');
  assert.ok(s);
  assert.deepEqual(s.positiveCategories, ['תקינה']);
  assert.notEqual(s.familyName, 'ריהוט');
});

test('24. infant walker -> unchanged Standards Institution direction, and a bare "chair" never wins over the infant high-chair compound phrase', () => {
  const walker = section(['הליכון תינוקות'], 'childrens_products_and_toys');
  assert.ok(walker);
  assert.deepEqual(walker.positiveCategories, ['תקינה']);
  const highChair = section(['עגלות, מיטות, לולים וכיסאות אוכל'], 'childrens_products_and_toys');
  assert.ok(highChair);
  assert.notEqual(highChair.familyName, 'ריהוט');
  assert.deepEqual(highChair.positiveCategories, ['תקינה']);
});

// ===================== PART E: ZERO-QUESTION GUARANTEE =====================

test('25. the exact question-ID set is unchanged from the pre-existing PR #50 baseline (10 entries) -- no battery/furniture question added', () => {
  const ids = REGULATORY_FOLLOWUP_QUESTIONS.map((q) => q.id).sort();
  assert.deepEqual(ids, [
    'coatingDirectFoodOrDrinkContact',
    'coatingMaterial',
    'directContactMaterial',
    'directFoodOrDrinkContact',
    'glassVesselDirectFoodOrDrinkContact',
    'hasInternalCoating',
    'installedAsPartOfVehicle',
    'mainsConnectedOrSuppliedAdapter',
    'personalUseOnlyConfirmation',
    'vehicleFunctionCategory',
  ].sort());
});

test('26. no forbidden battery/furniture-specific keyword appears in any question legend', () => {
  const forbidden = [
    'כימיה', 'קיבולת', 'מתח חשמלי', 'הספק מטען', 'סוג רכב', 'תת-סוג', 'מזרן', 'חיווט',
    'גיל התינוק', 'מידות הרהיט', 'מספר תקן',
  ];
  for (const q of REGULATORY_FOLLOWUP_QUESTIONS) {
    for (const term of forbidden) {
      assert.ok(!q.legend.includes(term), `question "${q.id}" must not mention "${term}"`);
    }
  }
});

test('27. zero new detailed regulatory-signal rules were added -- the rule registry is exactly the same 5 pre-existing rules', () => {
  assert.equal(REGULATORY_SIGNAL_RULES.length, 5);
});

// ===================== CANONICAL DATA INTEGRITY =====================

test('28. no duplicate family id and no duplicate family name anywhere in the matrix', () => {
  const ids = PRODUCT_FAMILY_MATRIX.map((f) => f.id);
  const names = PRODUCT_FAMILY_MATRIX.map((f) => f.publicFamilyName);
  assert.equal(new Set(ids).size, ids.length, 'duplicate id found');
  assert.equal(new Set(names).size, names.length, 'duplicate publicFamilyName found');
});

test('29. no duplicate alias within any single family\'s own alias list', () => {
  for (const family of PRODUCT_FAMILY_MATRIX) {
    assert.equal(new Set(family.aliases).size, family.aliases.length, `${family.id} has a duplicate alias`);
  }
});

test('30. the two new final-completion-pass rows are active with the exact expected signals', () => {
  const battery = findFamilyById('vehicles-and-transport-10');
  assert.ok(battery);
  assert.equal(battery.activeStatus, true);
  assert.deepEqual(
    Object.entries(battery.regulatorySignals).filter(([, v]) => v).map(([k]) => k),
    ['transportOrVehicleLaboratory'],
  );
  const furniture = findFamilyById('textiles-and-furniture-05');
  assert.ok(furniture);
  assert.equal(furniture.activeStatus, true);
  assert.deepEqual(Object.values(furniture.regulatorySignals).some(Boolean), false, 'no positive signal for ordinary furniture');
});

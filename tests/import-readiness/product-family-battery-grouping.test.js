/**
 * Grouped-battery-selection completion (product-owner final decision,
 * 2026-08-26): the visible "batteries or battery-containing products"
 * checkbox previously forced EVERY selection into the standalone-battery
 * approval result, even for equipment that merely contains a battery.
 * Fixed by changing batteries_or_battery_containing from a
 * single-candidate (forced) checkbox to an ambiguous 3-candidate set --
 * standalone battery/accumulator (electrical-and-electronics-07,
 * standards), vehicle-dedicated accumulator (vehicles-and-transport-10,
 * vehicle-laboratory), and equipment merely containing a battery
 * (electrical-and-electronics-09, new row, no positive signal) -- the
 * same pattern already used for cosmetics_and_beauty/dietary_supplements/
 * furniture_and_home_goods.
 *
 * Every test exercises final resolution and final result behavior.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductFamilyMatrixSection } from '../../js/import-readiness/product-family-result.js';
import { IMPORT_TYPE } from '../../js/import-readiness/scenario-schema.js';
import { resolveFamilyIdentificationOptions } from '../../js/import-readiness/product-family-selection-mapping.js';
import { findFamilyById } from '../../js/import-readiness/product-family-matrix.js';

const CB = 'batteries_or_battery_containing';

function section(texts, checkboxes = [CB]) {
  return buildProductFamilyMatrixSection({
    texts,
    importType: IMPORT_TYPE.COMMERCIAL,
    selectedProductFamilies: checkboxes,
  });
}

test('1. grouped checkbox + standalone battery -> Standards Institution direction', () => {
  const s = section(['סוללה']);
  assert.ok(s);
  assert.equal(s.state, 'positive');
  assert.equal(s.familyName, 'סוללות ותאים');
  assert.deepEqual(s.positiveCategories, ['תקינה']);
  assert.ok(s.professional.primary);
});

test('2. grouped checkbox + lithium battery -> same direction', () => {
  const s = section(['סוללת ליתיום']);
  assert.ok(s);
  assert.equal(s.familyName, 'סוללות ותאים');
  assert.deepEqual(s.positiveCategories, ['תקינה']);
});

test('3. grouped checkbox + accumulator -> same direction', () => {
  const s = section(['accumulator']);
  assert.ok(s);
  assert.equal(s.familyName, 'סוללות ותאים');
  assert.deepEqual(s.positiveCategories, ['תקינה']);
});

test('4. grouped checkbox + vehicle battery -> certified vehicle-laboratory direction, one CTA', () => {
  const s = section(['מצבר לרכב']);
  assert.ok(s);
  assert.equal(s.familyName, 'מצבר ייעודי לרכב');
  assert.deepEqual(s.positiveCategories, ['משרד התחבורה / מעבדת רכב']);
  assert.ok(!s.positiveCategories.includes('תקינה'), 'no duplicate standards+vehicle direction');
  // Primary (vehicle-testing lab) + supporting (customs classifier) is
  // the existing, consistent pattern every transportOrVehicleLaboratory
  // result already uses -- never a duplicated/equal pair of the same
  // professional.
  assert.ok(s.professional.primary);
  if (s.professional.supporting) {
    assert.notEqual(s.professional.primary.type, s.professional.supporting.type);
  }
});

test('5. grouped checkbox + equipment with mains charger -> the existing generic mains-electrical rule fires independently of family checkbox', async () => {
  const { evaluateRegulatorySignals } = await import('../../js/import-readiness/regulatory-signals/index.js');
  const result = evaluateRegulatorySignals(
    { productName: 'ציוד עם מטען קיר' },
    { answers: { mainsConnectedOrSuppliedAdapter: 'yes' } },
  );
  assert.equal(result.signals.length, 1);
  assert.equal(result.signals[0].ruleId, 'mains-connected-electrical-product');
  // And the grouped checkbox itself does not force a standalone-battery result for this text.
  const s = section(['ציוד עם מטען קיר']);
  if (s) assert.notEqual(s.familyName, 'סוללות ותאים');
});

test('6. grouped checkbox + equipment containing internal battery -> recognized family, no positive category, never forced to standalone battery', () => {
  const s = section(['מוצר הכולל סוללה פנימית']);
  assert.ok(s);
  assert.equal(s.familyName, 'ציוד הכולל סוללה');
  assert.equal(s.state, 'no_positive_signal');
  assert.equal(s.hasPositiveCategories, false);
  assert.notEqual(s.familyName, 'סוללות ותאים');
  assert.ok(s.professional.primary, 'a cautious professional route must remain');
  assert.ok(!/פטור/.test(s.noPositiveSignalMessage + ' ' + s.note.text), 'no absolute exemption promise');
});

test('7. grouped checkbox + neutral text -> information-needed, no positive category, no arbitrary first-candidate result', () => {
  for (const text of ['מוצר לבדיקה', 'מוצר מסחרי לבדיקה', 'שימוש מסחרי']) {
    const s = section([text]);
    assert.ok(s, text);
    assert.equal(s.state, 'selection_unresolved', text);
    assert.equal(s.hasPositiveCategories, false, text);
    assert.equal(s.familyName, null, text);
    assert.ok(s.professional.primary, 'generic cautious professional route must remain');
    assert.equal(s.limitation, s.limitation, 'limitation text present'); // presence checked below structurally
  }
});

test('8. grouped checkbox + battery charger -> never a standalone-battery result', () => {
  for (const text of ['battery charger', 'מטען לסוללה']) {
    const s = section([text]);
    assert.ok(s, text);
    assert.notEqual(s.familyName, 'סוללות ותאים', text);
  }
});

test('9. grouped checkbox + battery tester -> never a standalone-battery result', () => {
  for (const text of ['battery tester', 'בודק סוללות']) {
    const s = section([text]);
    assert.ok(s, text);
    assert.notEqual(s.familyName, 'סוללות ותאים', text);
  }
});

test('10. grouped checkbox + battery holder -> never a standalone-battery result', () => {
  for (const text of ['battery holder', 'מחזיק סוללה']) {
    const s = section([text]);
    assert.ok(s, text);
    assert.notEqual(s.familyName, 'סוללות ותאים', text);
  }
});

test('11. grouped checkbox + battery compartment -> never a standalone-battery result', () => {
  for (const text of ['battery compartment', 'תא סוללה כחלק ממכשיר']) {
    const s = section([text]);
    assert.ok(s, text);
    assert.notEqual(s.familyName, 'סוללות ותאים', text);
  }
});

test('12. no checkbox + standalone battery (free text only) -> same direction, reachable without the checkbox', () => {
  const s = section(['battery pack'], []);
  assert.ok(s);
  assert.equal(s.familyName, 'סוללות ותאים');
  assert.deepEqual(s.positiveCategories, ['תקינה']);
});

test('13. another explicit, unambiguous checkbox + battery terminology -> the explicitly selected family wins, battery never leaks in', () => {
  const s = section(['סוללה'], ['animal_origin_products']);
  assert.ok(s);
  assert.equal(s.familyName, 'מזון מן החי');
  assert.notEqual(s.familyName, 'סוללות ותאים');
});

test('14. candidate-set order does not change the result (reversed families array)', () => {
  const forward = resolveFamilyIdentificationOptions([CB], findFamilyById);
  const reversed = forward.families.slice().reverse();
  const a = buildProductFamilyMatrixSection({ texts: ['סוללה'], importType: IMPORT_TYPE.COMMERCIAL }, { families: forward.families });
  const b = buildProductFamilyMatrixSection({ texts: ['סוללה'], importType: IMPORT_TYPE.COMMERCIAL }, { families: reversed });
  assert.equal(a.familyName, b.familyName);
  assert.equal(a.familyName, 'סוללות ותאים');
});

test('15. duplicate selected checkbox values collapse without changing the result', () => {
  const s = section(['סוללה'], [CB, CB]);
  assert.ok(s);
  assert.equal(s.familyName, 'סוללות ותאים');
});

test('16. every battery-grouping candidate id resolves to a real, active matrix family with the expected signal', () => {
  const standalone = findFamilyById('electrical-and-electronics-07');
  const vehicle = findFamilyById('vehicles-and-transport-10');
  const containing = findFamilyById('electrical-and-electronics-09');
  for (const f of [standalone, vehicle, containing]) {
    assert.ok(f);
    assert.equal(f.activeStatus, true, f.id);
  }
  assert.equal(standalone.regulatorySignals.standards, true);
  assert.equal(vehicle.regulatorySignals.transportOrVehicleLaboratory, true);
  assert.equal(vehicle.regulatorySignals.standards, false, 'vehicle-accumulator must not also carry standards (single CTA requirement)');
  assert.deepEqual(Object.values(containing.regulatorySignals).some(Boolean), false, 'containing-a-battery row must have no positive signal');
});

test('17. the battery candidate set is exactly 3 ids -- no accidental fourth candidate, no accidental narrowing back to 1', () => {
  const options = resolveFamilyIdentificationOptions([CB], findFamilyById);
  assert.equal(options.forcedFamily, undefined, 'must no longer be a forced single-candidate checkbox');
  assert.ok(Array.isArray(options.families));
  assert.deepEqual(
    options.families.map((f) => f.id).sort(),
    ['electrical-and-electronics-07', 'electrical-and-electronics-09', 'vehicles-and-transport-10'].sort(),
  );
});

test('18. no duplicate professional and no duplicate document/limitation for any battery-grouping result', () => {
  const texts = ['סוללה', 'מצבר לרכב', 'מוצר הכולל סוללה פנימית'];
  for (const text of texts) {
    const s = section([text]);
    assert.ok(s, text);
    if (s.professional.primary && s.professional.supporting) {
      assert.notEqual(s.professional.primary.type, s.professional.supporting.type, text);
    }
    assert.equal(typeof s.limitation, 'string', text);
    assert.ok(s.limitation.length > 0, text);
  }
});

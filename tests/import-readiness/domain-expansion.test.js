/**
 * Domain expansion (product-owner decisions, 2026-10-15; registry rules
 * 42-45). Six new matrix rows close four domain gaps:
 *   - rule 42: gas appliances and fittings -> Standards Institution;
 *   - rule 43: air conditioners/refrigerators -> Standards Institution
 *     AND a sustainable-energy approval (Ministry of Energy, carried by
 *     the "אישור / רישיון אחר" column and named in the note);
 *   - rule 44: solar panels -> no positive signal; solar inverters ->
 *     Standards Institution; EV charging stations -> vehicle laboratory;
 *   - rule 45: tobacco/e-cigarettes -> no positive signal, but never a
 *     "no requirement" headline (cautious variant chosen by the product
 *     owner).
 * Rows were appended to the workbook, so every existing id is unchanged.
 *
 * Pure Node, no DOM, no network.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCT_FAMILY_MATRIX, findFamilyById } from '../../js/import-readiness/product-family-matrix.js';
import { identifyProductFamily, IDENTIFICATION_OUTCOME } from '../../js/import-readiness/product-family-identification.js';
import { buildProductFamilyMatrixSection, NO_POSITIVE_SIGNAL_MESSAGE, NO_REQUIREMENT_BOTTOM_LINE } from '../../js/import-readiness/product-family-result.js';
import { PRODUCT_FAMILY_SELECTION_CANDIDATES } from '../../js/import-readiness/product-family-selection-mapping.js';
import { suggestProductFamilyValues } from '../../js/import-readiness/family-material-disclosure.js';
import { IMPORT_TYPE } from '../../js/import-readiness/scenario-schema.js';

const GAS = 'additional-consumer-products-11';
const AC_FRIDGE = 'electrical-and-electronics-11';
const SOLAR_PANELS = 'electrical-and-electronics-12';
const INVERTERS = 'electrical-and-electronics-13';
const EV_CHARGERS = 'vehicles-and-transport-11';
const TOBACCO = 'additional-consumer-products-12';
const NEW_IDS = [GAS, AC_FRIDGE, SOLAR_PANELS, INVERTERS, EV_CHARGERS, TOBACCO];

const positiveKeys = (id) => Object.entries(findFamilyById(id).regulatorySignals).filter(([, on]) => on).map(([key]) => key);
const section = (text) => buildProductFamilyMatrixSection({ texts: [text], importType: IMPORT_TYPE.COMMERCIAL });
const resolvesTo = (text, id) => {
  const r = identifyProductFamily([text]);
  return r.outcome === IDENTIFICATION_OUTCOME.HIGH_CONFIDENCE && r.family.id === id;
};

test('1. the six rows exist, are active, carry the approved names, and are rows 75-80 (appended, so existing ids are stable; the 2026-10-21 expansion appended ten more after them)', () => {
  const names = {
    [GAS]: 'מכשירי גז ואביזרי גז',
    [AC_FRIDGE]: 'מזגנים ומקררים',
    [SOLAR_PANELS]: 'פאנלים סולאריים',
    [INVERTERS]: 'ממירים סולאריים',
    [EV_CHARGERS]: 'עמדות טעינה לרכב חשמלי',
    [TOBACCO]: 'מוצרי טבק וסיגריות אלקטרוניות',
  };
  for (const [id, name] of Object.entries(names)) {
    const family = findFamilyById(id);
    assert.ok(family, `${id} must exist`);
    assert.equal(family.activeStatus, true);
    assert.equal(family.publicFamilyName, name);
  }
  assert.deepEqual(PRODUCT_FAMILY_MATRIX.slice(74, 80).map((f) => f.id).sort(), [...NEW_IDS].sort());
});

test('2. rule 42: gas appliances and fittings carry exactly the Standards Institution signal', () => {
  assert.deepEqual(positiveKeys(GAS), ['standards']);
  for (const text of ['גריל גז', 'כיריים גז', 'בלון גז', 'gas heater', 'gas regulator']) assert.ok(resolvesTo(text, GAS), text);
  const s = section('גריל גז');
  assert.deepEqual(s.positiveCategories, ['תקינה']);
  assert.ok(s.note.text.includes('מכון התקנים'));
});

test('3. rule 43: air conditioners and refrigerators carry Standards AND the other-permit signal, and the note names the Ministry of Energy approval', () => {
  assert.deepEqual(positiveKeys(AC_FRIDGE), ['standards', 'otherPermit']);
  for (const text of ['מזגן', 'מזגנים', 'מקרר', 'מקררים', 'air conditioner', 'fridges']) assert.ok(resolvesTo(text, AC_FRIDGE), text);
  const s = section('מזגן עילי');
  assert.deepEqual(s.positiveCategories, ['תקינה', 'אישור / רישיון אחר']);
  assert.ok(s.note.text.includes('מכון התקנים'));
  assert.ok(s.note.text.includes('אישור אנרגיה מקיימת'));
  assert.ok(s.note.text.includes('משרד האנרגיה'));
});

test('4. rule 43: AC/fridge accessories, spare parts and car air conditioners are never the appliance', () => {
  for (const text of ['מגנט למקרר', 'fridge magnet', 'מסנן מים למקרר', 'שלט למזגן', 'air conditioner remote', 'חלקי חילוף למזגן', 'מזגן לרכב']) {
    assert.ok(!identifyProductFamily([text]).candidates.some((f) => f.id === AC_FRIDGE), text);
  }
});

test('5. rule 44: solar panels have no positive signal and get the bottom-line sentence (rule 46, 2026-10-18) -- no exception form, since the family has no note', () => {
  assert.deepEqual(positiveKeys(SOLAR_PANELS), []);
  for (const text of ['פאנל סולארי', 'פאנלים סולאריים', 'solar panels']) assert.ok(resolvesTo(text, SOLAR_PANELS), text);
  const s = section('solar panels');
  assert.equal(s.state, 'no_positive_signal');
  assert.equal(s.noPositiveSignalMessage, NO_REQUIREMENT_BOTTOM_LINE);
});

test('6. rule 44: solar inverters carry the Standards Institution signal, and an inverter "for solar panels" is the inverter, never the panel', () => {
  assert.deepEqual(positiveKeys(INVERTERS), ['standards']);
  for (const text of ['ממיר סולארי', 'ממיר לפאנלים סולאריים', 'solar inverter', 'inverter for solar panels']) assert.ok(resolvesTo(text, INVERTERS), text);
  assert.ok(!identifyProductFamily(['מעמד לפאנל סולארי']).candidates.some((f) => f.id === SOLAR_PANELS), 'a panel mount is not a panel');
});

test('7. rule 44: EV charging stations carry the vehicle-laboratory signal; a plain 12V car charger is not one', () => {
  assert.deepEqual(positiveKeys(EV_CHARGERS), ['transportOrVehicleLaboratory']);
  for (const text of ['עמדת טעינה לרכב חשמלי', 'מטען לרכב חשמלי', 'EV charger', 'electric vehicle charging station']) assert.ok(resolvesTo(text, EV_CHARGERS), text);
  assert.ok(!identifyProductFamily(['מטען לרכב']).candidates.some((f) => f.id === EV_CHARGERS));
  const s = section('עמדת טעינה לרכב חשמלי');
  assert.deepEqual(s.positiveCategories, ['משרד התחבורה / מעבדת רכב']);
  assert.ok(s.note.text.includes('מעבדת רכב'));
});

test('8. rule 45: tobacco has no positive signal, and its headline never says that no requirement was found', () => {
  assert.deepEqual(positiveKeys(TOBACCO), []);
  for (const text of ['טבק', 'סיגריות', 'סיגריה אלקטרונית', 'vape', 'e-cigarettes']) assert.ok(resolvesTo(text, TOBACCO), text);
  const s = section('סיגריה אלקטרונית');
  assert.equal(s.state, 'no_positive_signal');
  assert.notEqual(s.noPositiveSignalMessage, NO_POSITIVE_SIGNAL_MESSAGE);
  assert.ok(!s.noPositiveSignalMessage.includes('לא זוהתה דרישה'));
  assert.ok(s.note.text.startsWith('ביבוא מסחרי'), 'the note applies the decision to commercial import');
  assert.ok(s.note.text.includes('משרד הבריאות'));
  assert.ok(s.note.text.includes('עשויות'), 'a cautious "may", never an absolute requirement');
  assert.ok(!identifyProductFamily(['cigarette lighter socket']).candidates.some((f) => f.id === TOBACCO), 'a car lighter socket is not tobacco');
});

test('9. every new row except tobacco is reachable from an existing checkbox, and typing the product surfaces it', () => {
  assert.ok(PRODUCT_FAMILY_SELECTION_CANDIDATES.furniture_and_home_goods.includes(GAS));
  for (const id of [AC_FRIDGE, SOLAR_PANELS, INVERTERS, EV_CHARGERS]) {
    assert.ok(PRODUCT_FAMILY_SELECTION_CANDIDATES.electrical_and_electronics.includes(id), id);
  }
  assert.ok(!Object.values(PRODUCT_FAMILY_SELECTION_CANDIDATES).some((ids) => ids.includes(TOBACCO)), 'tobacco has no checkbox yet (documented coverage gap D)');
  assert.deepEqual(suggestProductFamilyValues(['גריל גז']), ['furniture_and_home_goods']);
  assert.deepEqual(suggestProductFamilyValues(['מזגן']), ['electrical_and_electronics']);
  assert.deepEqual(suggestProductFamilyValues(['סיגריה אלקטרונית']), [], 'no checkbox to suggest; the full list stays available');
});

test('10. the new aliases do not pull unrelated products: bare gas, an electric grill, an ordinary car and a plain appliance stay where they were', () => {
  for (const text of ['גז', 'גריל חשמלי', 'רכב חשמלי', 'כיריים אינדוקציה']) {
    assert.ok(!identifyProductFamily([text]).candidates.some((f) => NEW_IDS.includes(f.id)), text);
  }
  assert.ok(resolvesTo('מכשיר חשמלי', 'electrical-and-electronics-01'));
});

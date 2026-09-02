/**
 * Targeted tests for concept-level suggestion completion: the
 * controlled insufficient-input fallback (part 1, DOM-level), the 11
 * previously-thin concept groups (part 3), and generic explicit-
 * negation support (part 4).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { suggestProductFamilyValues } from '../../js/import-readiness/family-material-disclosure.js';

function html() {
  return readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
}

function controllerSource() {
  return readFileSync(new URL('../../js/import-readiness/import-readiness-controller.js', import.meta.url), 'utf8');
}

// -----------------------------------------------------------------
// Part 3: thin-group coverage (parameterized fixtures).
// -----------------------------------------------------------------

const THIN_GROUP_CASES = Object.freeze([
  ['marine equipment', 'אפוד הצלה', 'marine_equipment'],
  ['marine equipment', 'life jacket', 'marine_equipment'],
  ['paints and adhesives', 'צבע לבניין', 'chemicals_paints_adhesives_aerosols'],
  ['paints and adhesives', 'industrial adhesive', 'chemicals_paints_adhesives_aerosols'],
  ['pest control', 'חומר הדברה', 'chemicals_paints_adhesives_aerosols'],
  ['pest control', 'pesticide', 'chemicals_paints_adhesives_aerosols'],
  ['industrial chemicals', 'כימיקל תעשייתי', 'chemicals_paints_adhesives_aerosols'],
  ['cables/electrical accessories', 'כבל חשמלי', 'electrical_and_electronics'],
  ['non-networked electronics', 'מחשבון כיס', 'electrical_and_electronics'],
  ['lighting fixtures', 'גוף תאורה', 'electrical_and_electronics'],
  ['lighting fixtures', 'light bulb', 'electrical_and_electronics'],
  ['brake/steering/safety parts', 'רכיב בלימה לרכב', 'vehicle_parts_and_transport_accessories'],
  ['tires and wheels', 'צמיג לרכב', 'vehicle_parts_and_transport_accessories'],
  ['vehicle comfort/decor', 'כיסוי מושב לרכב', 'vehicle_parts_and_transport_accessories'],
  ['electric/wireless toys', 'צעצוע חשמלי', 'childrens_products_and_toys'],
  ['electric/wireless toys', 'wireless toy', 'childrens_products_and_toys'],
]);

test('thin groups: each now has at least one Hebrew and, where supported, English positive case', () => {
  const failures = [];
  for (const [group, text, expected] of THIN_GROUP_CASES) {
    const suggested = suggestProductFamilyValues([text]);
    if (!suggested.includes(expected)) failures.push(`${group} "${text}" -> ${JSON.stringify(suggested)}, expected ${expected}`);
  }
  assert.deepEqual(failures, []);
});

test('thin groups: pest-control and paint terms never leak into an unrelated family (cross-family conflict check)', () => {
  for (const [, text] of THIN_GROUP_CASES) {
    const suggested = suggestProductFamilyValues([text]);
    assert.ok(!suggested.includes('medicines'), `"${text}" must not suggest medicines`);
    assert.ok(!suggested.includes('food_and_beverage'), `"${text}" must not suggest food_and_beverage`);
  }
});

test('thin groups: vehicle-component terms never resolve as a complete vehicle', () => {
  for (const text of ['רכיב בלימה לרכב', 'צמיג לרכב', 'כיסוי מושב לרכב']) {
    const suggested = suggestProductFamilyValues([text]);
    assert.ok(!suggested.includes('complete_vehicles'), `"${text}" must not resolve as a complete vehicle`);
  }
});

test('thin groups: a generic word (material/liquid/compound/substance, wheel) does not trigger a thin-group family alone', () => {
  for (const generic of ['חומר', 'נוזל', 'תרכובת', 'חומר כימי', 'material', 'liquid', 'compound', 'substance', 'גלגל', 'wheel']) {
    assert.deepEqual(suggestProductFamilyValues([generic]), [], `"${generic}" alone must not suggest any family`);
  }
});

test('thin groups: an electric/wireless toy still resolves to the toy family, not a different family, and a toy accessory does not fabricate a complete toy', () => {
  assert.deepEqual(suggestProductFamilyValues(['צעצוע חשמלי']), ['childrens_products_and_toys']);
  // "toy part"/"toy accessory" is not a positive term anywhere in this
  // registry -- it must stay unmatched (safe fallback), not fabricate a
  // complete-toy suggestion.
  assert.deepEqual(suggestProductFamilyValues(['חלק לצעצוע']), []);
});

// -----------------------------------------------------------------
// Part 4: generic explicit-negation support (parameterized).
// -----------------------------------------------------------------

const NEGATION_CASES = Object.freeze([
  ['מכונת גילוח עם סוללה', true],
  ['מכונת גילוח ללא סוללה', false],
  ['מכונת גילוח בלי סוללה', false],
  ['מכונת גילוח שאינה כוללת סוללה', false],
  ['device with battery', true],
  ['device without battery', false],
]);

test('negation: battery evidence is suppressed only when the battery mention itself is negated', () => {
  const failures = [];
  for (const [text, expectPositive] of NEGATION_CASES) {
    const suggested = suggestProductFamilyValues([text]);
    const hasBatteryFamily = suggested.includes('batteries_or_battery_containing');
    if (hasBatteryFamily !== expectPositive) failures.push(`"${text}" -> ${JSON.stringify(suggested)}, expected battery family ${expectPositive}`);
  }
  assert.deepEqual(failures, []);
});

test('negation: a positive phrase after the negated term in the same description is still honored (bounded, local negation)', () => {
  assert.deepEqual(suggestProductFamilyValues(['מכונת גילוח ללא כבל עם סוללה נטענת']), ['batteries_or_battery_containing']);
});

test('negation: motor and wireless evidence are suppressed only when negated', () => {
  assert.deepEqual(suggestProductFamilyValues(['מוצר עם מנוע']), []); // no positive term for bare motor elsewhere -- stays neutral either way
  assert.deepEqual(suggestProductFamilyValues(['מוצר ללא מנוע']), []);
  assert.deepEqual(suggestProductFamilyValues(['מכשיר עם Bluetooth']), ['wireless_or_transmitting_equipment']);
  assert.deepEqual(suggestProductFamilyValues(['מכשיר ללא Bluetooth']), []);
});

test('negation: one negation word does not negate the entire rest of the description', () => {
  // "ללא סוללה" negates only the battery mention; the shaver concept
  // itself and any OTHER, unrelated positive evidence later in the same
  // text must remain unaffected by this one negation word.
  const suggested = suggestProductFamilyValues(['מכונת גילוח ללא סוללה עם מנורת לד']);
  assert.ok(!suggested.includes('batteries_or_battery_containing'), 'battery evidence stays negated');
  assert.ok(suggested.includes('electrical_and_electronics'), 'unrelated positive evidence later in the text is unaffected');
});

// -----------------------------------------------------------------
// Part 1: controlled insufficient-input fallback -- markup and wiring
// (behavioral DOM verification is covered by the bounded local browser
// check, which includes "מוצר" as scenario 2, per this task's own
// validation plan; these tests confirm the static markup and controller
// wiring the browser check exercises).
// -----------------------------------------------------------------

test('fallback markup: the neutral insufficient-match message exists, initially hidden, immediately after the family expand button, with the exact required Hebrew text', () => {
  const source = html();
  const block = source.match(/<button[^>]*id="irProductFamilyExpand"[^>]*>[^<]*<\/button>\s*<p[^>]*id="irProductFamilyInsufficientMessage"[^>]*>([^<]*)<\/p>/);
  assert.ok(block, 'the message must immediately follow the family expand button');
  assert.match(source.match(/<p[^>]*id="irProductFamilyInsufficientMessage"[^>]*>/)[0], /\bhidden\b/);
  assert.equal(block[1].trim(), 'לא נמצאה התאמה ברורה לפי התיאור שהוזן. מומלץ להוסיף תיאור מדויק יותר או להציג את כל משפחות המוצרים.');
});

test('fallback markup: no duplicate insufficient-message element, and it is not accidentally attached to the material group', () => {
  const source = html();
  const matches = [...source.matchAll(/id="irProductFamilyInsufficientMessage"/g)];
  assert.equal(matches.length, 1);
  assert.doesNotMatch(source, /id="irMaterialInsufficientMessage"/);
});

test('fallback wiring: the controller uses a dedicated family-only disclosure function (material disclosure is unchanged) and passes the message id through the expand handler', () => {
  const source = controllerSource();
  assert.match(source, /applyFamilyDisclosure\(root, 'irProductFamilyGroup', 'irProductFamilyExpand', 'irProductFamilyInsufficientMessage', suggestProductFamilyValues\(texts\)\)/);
  assert.match(source, /applyChecklistDisclosure\(root, 'irMaterialGroup', 'irMaterialExpand', suggestMaterialValues\(texts\)\)/);
  assert.match(source, /expandChecklist\(root, 'irProductFamilyGroup', 'irProductFamilyExpand', 'irProductFamilyInsufficientMessage'\)/);
});

test('fallback: text that still has no identifiable concept ("מוצר" etc.) returns the empty signal that drives this DOM state', () => {
  for (const text of ['מוצר', 'ציוד', 'חלק', 'פריט', 'product', 'item', 'equipment']) {
    assert.deepEqual(suggestProductFamilyValues([text]), []);
  }
});

test('fallback: meaningful descriptions are NOT subject to the insufficient-input fallback -- they still narrow', () => {
  for (const text of ['פרופילי אלומיניום לייצור חלונות', 'מוטות פלדה לבנייה', 'סיר אלומיניום לבישול']) {
    assert.ok(suggestProductFamilyValues([text]).length > 0, `"${text}" must still narrow, not fall back`);
  }
});

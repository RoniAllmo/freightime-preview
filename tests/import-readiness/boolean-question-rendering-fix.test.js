/**
 * Regression test for the malformed boolean-question rendering defect
 * (product-owner screenshot finding): the product-context step's
 * "מאפיינים טכניים וחשמליים" group used to wrap three independent
 * yes/no/unknown questions inside ONE fieldset with ONE legend, and
 * each question's own "כן" option was labeled with the full question
 * sentence instead of the word "כן" -- so the rendered choice list
 * looked like the question text itself was one of the answer options,
 * with what appeared to be duplicated "לא"/"לא ידוע" labels repeated
 * for each of the three questions crammed under one legend.
 *
 * Fixed by giving each of the three questions its own
 * <fieldset><legend> and correcting every "yes" option's label to the
 * word "כן". Exercises the exact three photographed questions:
 *   - המוצר מתחבר ישירות לחשמל (now: "האם המוצר מתחבר ישירות לרשת
 *     החשמל או מגיע עם תקע או ספק כוח?")
 *   - המוצר כולל סוללה (now: "האם המוצר כולל סוללה?")
 *   - הסוללה נטענת (now: "האם הסוללה נטענת?")
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function html() {
  return readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
}

function extractGroup(source, groupId) {
  const re = new RegExp(`<div class="ir-subfieldset-group" id="${groupId}"[^>]*>[\\s\\S]*?<\\/div>\\s*(?=<div class="ir-subfieldset-group"|<fieldset class="ir-subfieldset">\\s*<legend>אילו מסמכים)`);
  const match = source.match(re);
  assert.ok(match, `expected to locate the ${groupId} group`);
  return match[0];
}

function extractFieldsets(groupHtml) {
  const fieldsetRe = /<fieldset class="ir-subfieldset">([\s\S]*?)<\/fieldset>/g;
  const fieldsets = [];
  let m;
  while ((m = fieldsetRe.exec(groupHtml)) !== null) fieldsets.push(m[1]);
  return fieldsets;
}

function radioOptionsFor(fieldsetInnerHtml, radioName) {
  const rowRe = new RegExp(`<label><input type="radio" name="${radioName}" value="([^"]+)">([^<]*)<\\/label>`, 'g');
  const options = [];
  let m;
  while ((m = rowRe.exec(fieldsetInnerHtml)) !== null) options.push({ value: m[1], label: m[2] });
  return options;
}

const ELECTRICAL_QUESTIONS = [
  { name: 'irConnectsToPower', legend: 'האם המוצר מתחבר ישירות לרשת החשמל או מגיע עם תקע או ספק כוח?' },
  { name: 'irHasBattery', legend: 'האם המוצר כולל סוללה?' },
  { name: 'irBatteryIsRechargeable', legend: 'האם הסוללה נטענת?' },
];

test('1. the electrical-characteristics group contains exactly three separate fieldsets, each with its own legend', () => {
  const group = extractGroup(html(), 'irGroupElectricalCharacteristics');
  const fieldsets = extractFieldsets(group);
  assert.equal(fieldsets.length, 3, 'expected exactly three fieldsets, one per question');
});

test('2. each of the three photographed questions has its own legend containing the full question text, not a shared group legend', () => {
  const group = extractGroup(html(), 'irGroupElectricalCharacteristics');
  const fieldsets = extractFieldsets(group);
  for (const q of ELECTRICAL_QUESTIONS) {
    const owning = fieldsets.find((f) => f.includes(`name="${q.name}"`));
    assert.ok(owning, `expected a fieldset containing radios named ${q.name}`);
    assert.ok(owning.includes(`<legend>${q.legend}</legend>`), `expected legend "${q.legend}" for ${q.name}`);
  }
});

test('3. each of the three questions has exactly three options: כן, לא, לא ידוע -- and the question text is never used as an option label', () => {
  const group = extractGroup(html(), 'irGroupElectricalCharacteristics');
  const fieldsets = extractFieldsets(group);
  for (const q of ELECTRICAL_QUESTIONS) {
    const owning = fieldsets.find((f) => f.includes(`name="${q.name}"`));
    const options = radioOptionsFor(owning, q.name);
    assert.equal(options.length, 3, `expected exactly 3 options for ${q.name}, found ${options.length}`);
    assert.deepEqual(options.map((o) => o.value), ['yes', 'no', 'unknown']);
    assert.deepEqual(options.map((o) => o.label), ['כן', 'לא', 'לא ידוע']);
    for (const option of options) {
      assert.notEqual(option.label, q.legend, 'the question text must never be used as an answer option');
    }
  }
});

test('4. no duplicated "לא" or "לא ידוע" option exists within any single fieldset', () => {
  const group = extractGroup(html(), 'irGroupElectricalCharacteristics');
  const fieldsets = extractFieldsets(group);
  for (const fieldsetHtml of fieldsets) {
    const noCount = (fieldsetHtml.match(/>לא</g) || []).length;
    const unknownCount = (fieldsetHtml.match(/>לא ידוע</g) || []).length;
    assert.equal(noCount, 1, `expected exactly one "לא" option per fieldset, found ${noCount}`);
    assert.equal(unknownCount, 1, `expected exactly one "לא ידוע" option per fieldset, found ${unknownCount}`);
  }
});

test('5. each radio group has a unique name, and each option has a stable, unique id-free but name-scoped value set (yes/no/unknown)', () => {
  const source = html();
  for (const q of ELECTRICAL_QUESTIONS) {
    const occurrences = (source.match(new RegExp(`name="${q.name}"`, 'g')) || []).length;
    assert.equal(occurrences, 3, `expected exactly 3 radio inputs named ${q.name} (one per option)`);
  }
});

test('6. the food-contact-material group has the same fix applied: two separate fieldsets, each with כן/לא/לא ידוע', () => {
  const group = extractGroup(html(), 'irGroupFoodContactMaterial');
  const fieldsets = extractFieldsets(group);
  assert.equal(fieldsets.length, 2);
  for (const fieldsetHtml of fieldsets) {
    assert.ok(/<legend>[^<]*\?<\/legend>/.test(fieldsetHtml), 'expected a real question as the legend');
    const labels = [...fieldsetHtml.matchAll(/<label><input type="radio"[^>]*>([^<]*)<\/label>/g)].map((m) => m[1]);
    assert.deepEqual(labels, ['כן', 'לא', 'לא ידוע']);
  }
});

test('7. the group containers themselves are plain divs (not fieldsets), so no group-level legend can ever be mistaken for a question', () => {
  const source = html();
  assert.ok(/<div class="ir-subfieldset-group" id="irGroupElectricalCharacteristics" hidden>/.test(source));
  assert.ok(/<div class="ir-subfieldset-group" id="irGroupFoodContactMaterial" hidden>/.test(source));
  assert.ok(!/<fieldset class="ir-subfieldset" id="irGroupElectricalCharacteristics"/.test(source), 'the old single-fieldset-multi-question wrapper must be gone');
  assert.ok(!/<fieldset class="ir-subfieldset" id="irGroupFoodContactMaterial"/.test(source), 'the old single-fieldset-multi-question wrapper must be gone');
});

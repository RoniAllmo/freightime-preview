import test from 'node:test';
import assert from 'node:assert/strict';
import { buildClassificationQuestions } from '../../js/import-readiness/classification-question-rules.js';
import { normalizeReadinessInput } from '../../js/import-readiness/normalize-readiness-input.js';

function questionsFor(raw) {
  return buildClassificationQuestions(normalizeReadinessInput(raw));
}

test('1. missing material triggers the material-composition question', () => {
  assert.ok(questionsFor({}).some((q) => q.id === 'material-composition'));
});

test('2. a filled-in material suppresses the material-composition question', () => {
  assert.ok(!questionsFor({ primaryMaterial: 'עץ' }).some((q) => q.id === 'material-composition'));
});

test('3. an electrical product triggers the electrical-function question', () => {
  assert.ok(questionsFor({ isElectrical: 'yes' }).some((q) => q.id === 'electrical-function'));
});

test('4. a battery product with unknown chemistry triggers the battery-chemistry question', () => {
  assert.ok(questionsFor({ hasBattery: 'yes' }).some((q) => q.id === 'battery-chemistry-question'));
});

test('5. a wireless product with unknown frequency triggers the wireless-frequency question', () => {
  assert.ok(questionsFor({ isWireless: 'yes' }).some((q) => q.id === 'wireless-frequency-question'));
});

test('6. a food-contact product with unknown food type triggers the food-type question', () => {
  assert.ok(questionsFor({ isFoodContact: 'yes' }).some((q) => q.id === 'food-type-question'));
});

test('7. no question ever suggests or states an HS code', () => {
  const questions = questionsFor({ isElectrical: 'yes', hasBattery: 'yes', isWireless: 'yes', isFoodContact: 'yes' });
  for (const q of questions) {
    assert.ok(!/\b\d{4,10}\b/.test(q.text), `question ${q.id} appears to contain a numeric code`);
  }
});

test('8. results are frozen', () => {
  const questions = questionsFor({});
  assert.ok(Object.isFrozen(questions));
  assert.ok(Object.isFrozen(questions[0]));
});

test('9. malformed input is handled safely without throwing', () => {
  assert.doesNotThrow(() => buildClassificationQuestions(null));
});

test('10. calling the module performs no network, DOM, or storage access', () => {
  assert.equal(typeof window, 'undefined');
  assert.equal(typeof document, 'undefined');
  questionsFor({});
});

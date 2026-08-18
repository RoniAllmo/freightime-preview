/**
 * Tests for conservative product-family identification
 * (product-family-identification.js): local, deterministic substring
 * matching against the reviewed alias lists only -- no fuzzy scoring,
 * no external AI, no network.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { identifyProductFamily, IDENTIFICATION_OUTCOME } from '../../js/import-readiness/product-family-identification.js';

test('1. empty/blank text produces no candidate (never guesses from nothing)', () => {
  const result = identifyProductFamily(['', '  ', undefined, null]);
  assert.equal(result.outcome, IDENTIFICATION_OUTCOME.NONE);
  assert.equal(result.family, null);
  assert.deepEqual(result.candidates, []);
});

test('2. an exact family-name mention is a high-confidence match', () => {
  const result = identifyProductFamily(['כלי זכוכית במגע עם מזון או שתייה']);
  assert.equal(result.outcome, IDENTIFICATION_OUTCOME.HIGH_CONFIDENCE);
  assert.equal(result.family.publicFamilyName, 'כלי זכוכית במגע עם מזון או שתייה');
});

test('3. a curated, explicitly reviewed alias also produces a high-confidence match', () => {
  const result = identifyProductFamily(['כוס זכוכית', 'לשתיה']);
  assert.equal(result.outcome, IDENTIFICATION_OUTCOME.HIGH_CONFIDENCE);
  assert.equal(result.family.publicFamilyName, 'כלי זכוכית במגע עם מזון או שתייה');
});

test('4. text matching no alias at all produces no candidate rather than a forced guess', () => {
  const result = identifyProductFamily(['משהו מופשט שלא קיים באף רשימת כינויים']);
  assert.equal(result.outcome, IDENTIFICATION_OUTCOME.NONE);
  assert.equal(result.family, null);
});

test('5. text matching more than one family produces multiple_candidates, not a forced single guess', () => {
  // A narrow synthetic families list makes this deterministic without
  // depending on which real aliases might collide today.
  const families = [
    { id: 'a', publicFamilyName: 'משפחה א', aliases: ['משפחה א', 'מוצר משותף'], regulatorySignals: {} },
    { id: 'b', publicFamilyName: 'משפחה ב', aliases: ['משפחה ב', 'מוצר משותף'], regulatorySignals: {} },
  ];
  const result = identifyProductFamily(['מוצר משותף'], { families });
  assert.equal(result.outcome, IDENTIFICATION_OUTCOME.MULTIPLE_CANDIDATES);
  assert.equal(result.family, null);
  assert.equal(result.candidates.length, 2);
});

test('6. multiple_candidates never exposes more than three families', () => {
  const families = Array.from({ length: 6 }, (_, i) => ({
    id: `f${i}`,
    publicFamilyName: `משפחה ${i}`,
    aliases: [`משפחה ${i}`, 'מונח משותף'],
    regulatorySignals: {},
  }));
  const result = identifyProductFamily(['מונח משותף'], { families });
  assert.equal(result.outcome, IDENTIFICATION_OUTCOME.MULTIPLE_CANDIDATES);
  assert.ok(result.candidates.length <= 3, `expected at most 3 candidates, got ${result.candidates.length}`);
});

test('7. identification is deterministic -- the same text always produces the same outcome', () => {
  const texts = ['מזון מן החי', 'בשר קפוא'];
  const first = identifyProductFamily(texts);
  const second = identifyProductFamily(texts);
  assert.deepEqual(first, second);
});

test('8. identification never performs network access or uses timers/promises (pure synchronous function)', () => {
  const result = identifyProductFamily(['כוס זכוכית']);
  assert.ok(!(result instanceof Promise));
});

/**
 * Bedding alias collision (2026-10-21): the household-textiles alias
 * "מצעים" (bedding) is the end of "אמצעים" (means), and was matched as a
 * plain substring, so any description mentioning "means" resolved to
 * household textiles. "מצעים" now matches only as its own word (one
 * Hebrew prefix letter allowed) -- see WHOLE_WORD_ALIASES in
 * product-family-identification.js.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { identifyProductFamily } from '../../js/import-readiness/product-family-identification.js';
import { suggestProductFamilyValues } from '../../js/import-readiness/family-material-disclosure.js';

const HOUSEHOLD_TEXTILES = 'textiles-and-furniture-08';
const candidateIds = (text) => identifyProductFamily([text]).candidates.map((f) => f.id);

test('1. "אמצעים" (means) and its inflections never resolve to household textiles', () => {
  for (const text of [
    'אמצעים', 'אמצעים טכנולוגיים', 'באמצעים מכניים', 'האמצעים הנדרשים', 'ואמצעים נוספים',
    'ציוד עם אמצעים בטיחותיים', 'מכונה עם אמצעים להגנה מפני חימום',
  ]) {
    assert.ok(!candidateIds(text).includes(HOUSEHOLD_TEXTILES), text);
    assert.ok(!suggestProductFamilyValues([text]).includes('general_household_textile_products'), `${text} (suggestion)`);
  }
});

test('2. bedding still resolves to household textiles, with or without a Hebrew prefix letter', () => {
  for (const text of ['מצעים', 'סט מצעים', 'מצעים לתינוק', 'המצעים', 'למצעים', 'ומצעים', 'מצעים, וילונות ומגבות']) {
    const r = identifyProductFamily([text]);
    assert.equal(r.outcome, 'high_confidence', text);
    assert.equal(r.family.id, HOUSEHOLD_TEXTILES, text);
  }
});

test('3. a description that names bedding AND uses "means" still finds bedding', () => {
  assert.equal(identifyProductFamily(['סט מצעים וגם אמצעי תשלום']).family.id, HOUSEHOLD_TEXTILES);
});

test('4. the contraceptives row resolves on its own name, without a row-specific exclusion', () => {
  const r = identifyProductFamily(['אמצעים למניעת הריון']);
  assert.equal(r.outcome, 'high_confidence');
  assert.equal(r.family.id, 'health-and-cosmetics-06');
});

/**
 * Unit tests for the answer-reuse adapter (js/import-readiness/
 * regulatory-signals/answer-reuse.js) -- proves the pure derivation
 * logic reuses already-collected structured core answers correctly,
 * never overwrites a live answer, and never guesses from ambiguous or
 * free-text-only input.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { ANSWER } from '../../../js/import-readiness/regulatory-signals/questions.js';
import {
  deriveReusableRegulatoryAnswers,
  mergeReusedAnswers,
} from '../../../js/import-readiness/regulatory-signals/answer-reuse.js';

test('deriveReusableRegulatoryAnswers reuses connectsToPower for the mains-connection question', () => {
  assert.equal(
    deriveReusableRegulatoryAnswers({ connectsToPower: 'yes' }).mainsConnectedOrSuppliedAdapter,
    ANSWER.YES,
  );
  assert.equal(
    deriveReusableRegulatoryAnswers({ connectsToPower: 'no' }).mainsConnectedOrSuppliedAdapter,
    ANSWER.NO,
  );
  assert.equal(
    deriveReusableRegulatoryAnswers({ connectsToPower: 'unknown' }).mainsConnectedOrSuppliedAdapter,
    ANSWER.UNKNOWN,
  );
});

test('deriveReusableRegulatoryAnswers reuses materialTouchesFood for BOTH the plastic and the glass direct-food-contact questions', () => {
  const derived = deriveReusableRegulatoryAnswers({ materialTouchesFood: 'yes' });
  assert.equal(derived.directFoodOrDrinkContact, ANSWER.YES);
  assert.equal(derived.glassVesselDirectFoodOrDrinkContact, ANSWER.YES);
});

test('deriveReusableRegulatoryAnswers reuses materialHasCoating for the internal-coating question', () => {
  assert.equal(deriveReusableRegulatoryAnswers({ materialHasCoating: 'no' }).hasInternalCoating, ANSWER.NO);
});

test('deriveReusableRegulatoryAnswers derives directContactMaterial/coatingMaterial only from a SINGLE unambiguous structured material selection', () => {
  const glassOnly = deriveReusableRegulatoryAnswers({ materials: ['glass'] });
  assert.equal(glassOnly.directContactMaterial, 'glass');

  const plasticOnly = deriveReusableRegulatoryAnswers({ materials: ['plastic_or_polymer'] });
  assert.equal(plasticOnly.directContactMaterial, 'plastic');
  assert.equal(plasticOnly.coatingMaterial, 'plastic_or_polymer');

  // Ambiguous multi-material selection must never be guessed at.
  const multi = deriveReusableRegulatoryAnswers({ materials: ['glass', 'metal'] });
  assert.equal(multi.directContactMaterial, undefined);
  assert.equal(multi.coatingMaterial, undefined);
});

test('deriveReusableRegulatoryAnswers never derives anything from an unset/empty core field', () => {
  const derived = deriveReusableRegulatoryAnswers({});
  assert.deepEqual(derived, {});
  const emptyString = deriveReusableRegulatoryAnswers({ connectsToPower: '', materialTouchesFood: '' });
  assert.deepEqual(emptyString, {});
});

test('deriveReusableRegulatoryAnswers is safe against null/non-object input', () => {
  assert.deepEqual(deriveReusableRegulatoryAnswers(null), {});
  assert.deepEqual(deriveReusableRegulatoryAnswers(undefined), {});
  assert.deepEqual(deriveReusableRegulatoryAnswers('not an object'), {});
});

test('mergeReusedAnswers: a derived default only fills a gap, an existing live answer always wins', () => {
  const merged = mergeReusedAnswers(
    { mainsConnectedOrSuppliedAdapter: ANSWER.NO },
    { mainsConnectedOrSuppliedAdapter: ANSWER.YES, directFoodOrDrinkContact: ANSWER.YES },
  );
  assert.equal(merged.mainsConnectedOrSuppliedAdapter, ANSWER.NO, 'live answer must not be overwritten by a derived one');
  assert.equal(merged.directFoodOrDrinkContact, ANSWER.YES, 'derived answer must fill a genuine gap');
});

test('mergeReusedAnswers never mutates either input object', () => {
  const existing = Object.freeze({ a: '1' });
  const derived = Object.freeze({ b: '2' });
  const merged = mergeReusedAnswers(existing, derived);
  assert.deepEqual(existing, { a: '1' });
  assert.deepEqual(derived, { b: '2' });
  assert.deepEqual(merged, { a: '1', b: '2' });
});

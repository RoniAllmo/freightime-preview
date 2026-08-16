import test from 'node:test';
import assert from 'node:assert/strict';
import { presentSignals, MAX_PRIMARY } from '../../js/import-readiness/multi-signal-presentation.js';

// Synthetic signal-shaped objects only -- never real regulatory-signal
// content -- to prove the generic dedup/priority mechanism works on
// its own terms, independent of whether any real rule is active.
function fakeSignal(id, priority, verificationItems) {
  return { ruleId: id, priority, verificationItems, title: `כותרת ${id}` };
}

test('1. empty input produces an empty, safe result', () => {
  const out = presentSignals([]);
  assert.deepEqual(out.primary, []);
  assert.equal(out.additionalCount, 0);
  assert.deepEqual(out.dedupedVerificationItems, []);
});

test('2. non-array/garbage input never throws', () => {
  assert.doesNotThrow(() => presentSignals(null));
  assert.doesNotThrow(() => presentSignals(undefined));
  assert.doesNotThrow(() => presentSignals('nope'));
  assert.doesNotThrow(() => presentSignals([null, 'x', 42, {}]));
});

test('3. up to 3 signals are shown as primary', () => {
  const signals = [fakeSignal('a', 1, []), fakeSignal('b', 2, []), fakeSignal('c', 3, [])];
  const out = presentSignals(signals);
  assert.equal(out.primary.length, 3);
  assert.equal(out.additionalCount, 0);
});

test('4. beyond MAX_PRIMARY signals, the rest are counted as additional (collapsed) rather than dropped or all shown', () => {
  const signals = [fakeSignal('a', 1, []), fakeSignal('b', 2, []), fakeSignal('c', 3, []), fakeSignal('d', 4, []), fakeSignal('e', 5, [])];
  const out = presentSignals(signals);
  assert.equal(out.primary.length, MAX_PRIMARY);
  assert.equal(out.additionalCount, 2);
});

test('5. signals are prioritized (lower priority number first)', () => {
  const signals = [fakeSignal('low-priority', 50, []), fakeSignal('high-priority', 1, [])];
  const out = presentSignals(signals);
  assert.equal(out.primary[0].ruleId, 'high-priority');
});

test('6. verification items shared across signals are deduplicated', () => {
  const signals = [
    fakeSignal('a', 1, ['מסמך משותף', 'מסמך של a']),
    fakeSignal('b', 2, ['מסמך משותף', 'מסמך של b']),
  ];
  const out = presentSignals(signals);
  assert.deepEqual(out.dedupedVerificationItems, ['מסמך משותף', 'מסמך של a', 'מסמך של b']);
});

test('7. dedup only counts items from the visible primary cards, not collapsed additional ones', () => {
  const signals = [
    fakeSignal('a', 1, ['x']),
    fakeSignal('b', 2, ['y']),
    fakeSignal('c', 3, ['z']),
    fakeSignal('d', 4, ['should-not-appear']),
  ];
  const out = presentSignals(signals);
  assert.ok(!out.dedupedVerificationItems.includes('should-not-appear'));
});

test('8. objects missing a ruleId are filtered out as not signal-like', () => {
  const out = presentSignals([{ priority: 1 }, fakeSignal('real', 2, [])]);
  assert.equal(out.primary.length, 1);
  assert.equal(out.primary[0].ruleId, 'real');
});

test('9. this mechanism, run with the real (currently-empty) regulatory-signals matcher output, produces an empty result -- proving it stays idle while all candidates remain disabled', async () => {
  const { matchRegulatorySignals } = await import('../../js/import-readiness/regulatory-signals/matcher.js');
  const { REGULATORY_SIGNAL_RULES } = await import('../../js/import-readiness/regulatory-signals/rules-registry.js');
  const matched = matchRegulatorySignals({ answers: {} }, new Set(['electrical_mains_product', 'plastic_food_contact', 'polymer_coating_food_contact', 'glass_food_contact', 'vehicle_product']), REGULATORY_SIGNAL_RULES);
  const out = presentSignals(matched.signals);
  assert.deepEqual(out.primary, []);
  assert.equal(out.additionalCount, 0);
});

/**
 * Targeted regression tests for the wireless compound-phrase
 * presentation-suggestion correction (FB-01-WIRELESS-COMPOUND-PHRASES-V2,
 * product-owner-authorized): seven specific wireless compound-device
 * phrases (a wireless charger, wireless earbuds, wireless headphones, a
 * wireless speaker) must surface `wireless_or_transmitting_equipment` as
 * an initial suggestion, without introducing a generic "אלחוטי"/
 * "wireless" alias and without altering the existing, separately
 * approved wireless-router suggestion or the wireless-toy isolation.
 *
 * This targets `suggestProductFamilyValues` (the visitor-facing
 * suggestion mechanism) only. `identifyProductFamily` (the lower-level,
 * already-reviewed free-text identification engine) is not required to
 * change for these seven phrases and is checked here only as read-only
 * evidence that no unexpected lower-level behavior changed.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestProductFamilyValues } from '../../js/import-readiness/family-material-disclosure.js';
import { identifyProductFamily } from '../../js/import-readiness/product-family-identification.js';

const POSITIVE_PHRASES = Object.freeze([
  'מטען אלחוטי',
  'אוזניות אלחוטיות',
  'רמקול אלחוטי',
  'wireless charger',
  'wireless earbuds',
  'wireless headphones',
  'wireless speaker',
]);

const TOY_ISOLATION_PHRASES = Object.freeze(['צעצוע אלחוטי', 'wireless toy']);

const ROUTER_PRESERVATION_PHRASES = Object.freeze(['נתב אלחוטי', 'ראוטר אלחוטי', 'wireless router']);

// -----------------------------------------------------------------
// 1: the seven approved positive compound phrases.
// -----------------------------------------------------------------

test('1. each of the seven approved wireless compound phrases suggests wireless_or_transmitting_equipment, and only that family', () => {
  for (const text of POSITIVE_PHRASES) {
    const suggested = suggestProductFamilyValues([text]);
    assert.ok(
      suggested.includes('wireless_or_transmitting_equipment'),
      `"${text}" must suggest wireless_or_transmitting_equipment, got ${JSON.stringify(suggested)}`,
    );
    assert.deepEqual(suggested, ['wireless_or_transmitting_equipment'], `"${text}" must not suggest any other family, got ${JSON.stringify(suggested)}`);
  }
});

// -----------------------------------------------------------------
// 2: toy isolation -- must never gain the wireless family, and must
// keep resolving to the toy checkbox exactly as before.
// -----------------------------------------------------------------

test('2. wireless-toy phrases never suggest wireless_or_transmitting_equipment, and continue to suggest childrens_products_and_toys', () => {
  for (const text of TOY_ISOLATION_PHRASES) {
    const suggested = suggestProductFamilyValues([text]);
    assert.ok(!suggested.includes('wireless_or_transmitting_equipment'), `"${text}" must not suggest wireless_or_transmitting_equipment, got ${JSON.stringify(suggested)}`);
    assert.ok(suggested.includes('childrens_products_and_toys'), `"${text}" must still suggest childrens_products_and_toys, got ${JSON.stringify(suggested)}`);
  }
});

// -----------------------------------------------------------------
// 3: existing router phrases must be preserved exactly as before --
// this plan explicitly does NOT exclude them.
// -----------------------------------------------------------------

test('3. existing wireless-router phrases continue to suggest wireless_or_transmitting_equipment, unchanged', () => {
  for (const text of ROUTER_PRESERVATION_PHRASES) {
    const suggested = suggestProductFamilyValues([text]);
    assert.deepEqual(suggested, ['wireless_or_transmitting_equipment'], `"${text}" must still suggest exactly wireless_or_transmitting_equipment, got ${JSON.stringify(suggested)}`);
  }
});

// -----------------------------------------------------------------
// 4: Bluetooth positive/negated car-charger evidence, unaffected by
// this change (pre-existing behavior, verified not to have regressed).
// -----------------------------------------------------------------

test('4. "מטען Bluetooth לרכב" continues to suggest wireless_or_transmitting_equipment; "מטען לרכב ללא Bluetooth" continues not to', () => {
  assert.deepEqual(suggestProductFamilyValues(['מטען Bluetooth לרכב']), ['wireless_or_transmitting_equipment']);
  assert.deepEqual(suggestProductFamilyValues(['מטען לרכב ללא Bluetooth']), []);
});

// -----------------------------------------------------------------
// 5: read-only identifyProductFamily evidence -- not required to
// change for the seven new phrases, and not required to change at all
// for the toy/router/Bluetooth evidence. Documents the exact baseline
// so a future accidental change to the lower-level engine is caught.
// -----------------------------------------------------------------

test('5. identifyProductFamily (read-only evidence): unaffected by this presentation-only change', () => {
  for (const text of POSITIVE_PHRASES) {
    const result = identifyProductFamily([text]);
    assert.equal(result.outcome, 'none', `"${text}" is not required to change identifyProductFamily's outcome, but it did: ${JSON.stringify(result)}`);
  }
  for (const text of TOY_ISOLATION_PHRASES) {
    assert.equal(identifyProductFamily([text]).outcome, 'none');
  }
  for (const text of ROUTER_PRESERVATION_PHRASES) {
    assert.equal(identifyProductFamily([text]).outcome, 'none');
  }
  assert.equal(identifyProductFamily(['מטען Bluetooth לרכב']).family.id, 'electrical-and-electronics-05');
  assert.equal(identifyProductFamily(['מטען לרכב ללא Bluetooth']).family.id, 'electrical-and-electronics-05');
});

// -----------------------------------------------------------------
// 6: no broad/generic alias was introduced -- a bare "אלחוטי"/
// "wireless" characteristic must never, on its own, prove this or any
// other family.
// -----------------------------------------------------------------

test('6. a bare wireless characteristic with no product noun does not, on its own, suggest wireless_or_transmitting_equipment', () => {
  assert.deepEqual(suggestProductFamilyValues(['אלחוטי']), []);
  assert.deepEqual(suggestProductFamilyValues(['wireless']), []);
});

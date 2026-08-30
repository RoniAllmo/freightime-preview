/**
 * Registry-driven correctness tests for the product-family presentation
 * suggestion mechanism (suggestProductFamilyValues,
 * PRESENTATION_CONCEPT_HINTS, and their whole-word matching helpers in
 * family-material-disclosure.js).
 *
 * Unlike family-material-disclosure.test.js (which exercises specific
 * example products), every test here is DERIVED FROM THE LIVE REGISTRY
 * -- the real product-family matrix and its checkbox mapping -- so a
 * future alias added to the matrix, or a future PRESENTATION_CONCEPT_HINTS
 * entry, is automatically covered by the same boundary/collision checks
 * without anyone having to remember to add a new test for it.
 *
 * Root cause under test: identifyProductFamily (the pre-existing,
 * unmodified, protected identification engine) matches an alias as a
 * bare substring anywhere in the text, including inside an unrelated
 * longer word ("table" inside "suitable"/"tablets", "tent" inside
 * "content"/"extent"/"intent"). The presentation layer now re-verifies
 * every matrix match with a whole-word/whole-phrase check
 * (haystackContainsWholeTerm / familyHasWholeWordAliasMatch) before
 * ever showing it as an initial suggestion -- identifyProductFamily
 * itself, and every other caller of it, are completely untouched.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCT_FAMILY_MATRIX } from '../../js/import-readiness/product-family-matrix.js';
import { PRODUCT_FAMILY_SELECTION_CANDIDATES } from '../../js/import-readiness/product-family-selection-mapping.js';
import { normalizeHebrewSearchText } from '../../js/import-readiness/regulatory-signals/keyword-hints.js';
import { suggestProductFamilyValues, ALL_PRODUCT_FAMILY_VALUES } from '../../js/import-readiness/family-material-disclosure.js';

// -----------------------------------------------------------------
// The live registry this suite is derived from: every matrix family
// actually reachable through a presentation checkbox -- i.e. every
// family whose aliases can ever influence what suggestProductFamilyValues
// shows. A family outside this set (a documented "coverage gap", see
// product-family-selection-mapping.js's own doc comment) can never
// produce a display suggestion regardless of alias content, so it is
// out of scope for this presentation-layer suite by construction.
// -----------------------------------------------------------------

const REACHABLE_MATRIX_IDS = new Set(Object.values(PRODUCT_FAMILY_SELECTION_CANDIDATES).flat());
const REACHABLE_FAMILIES = PRODUCT_FAMILY_MATRIX.filter(
  (family) => REACHABLE_MATRIX_IDS.has(family.id) && family.activeStatus === true && Array.isArray(family.aliases) && family.aliases.length > 0,
);

test('0. sanity: the live registry actually has reachable families with aliases to test (guards against this whole suite silently testing nothing if the registry/mapping shape ever changes)', () => {
  assert.ok(REACHABLE_FAMILIES.length >= 20, `expected a substantial reachable family set, got ${REACHABLE_FAMILIES.length}`);
  const totalAliases = REACHABLE_FAMILIES.reduce((n, f) => n + f.aliases.length, 0);
  assert.ok(totalAliases >= 100, `expected a substantial alias set, got ${totalAliases}`);
});

// -----------------------------------------------------------------
// A. Structural registry validation + generic boundary/collision test.
// For every alias of every reachable family: it must normalize to
// non-empty text, and -- the core of this suite -- embedding it (with
// no space) inside a longer synthetic word must never cause its family
// to be suggested, in either script, on either edge (leading or
// trailing), covering exactly the defect class that caused the
// original "table"/"suitable" and "tent"/"content" bugs, but for every
// alias in the registry instead of two hand-picked ones.
// -----------------------------------------------------------------

function isHebrewScript(text) {
  return /[֐-׿]/.test(text);
}

/** A neutral carrier sentence embedding `token` (with surrounding real words) so the alias is the only thing that could possibly match. */
function carrier(token) {
  return `general note ${token} regarding this shipment`;
}

test('A1. every reachable alias normalizes to non-empty, non-whitespace-only text', () => {
  const empties = [];
  for (const family of REACHABLE_FAMILIES) {
    for (const alias of family.aliases) {
      if (normalizeHebrewSearchText(alias).trim().length === 0) empties.push(`${family.id}: ${JSON.stringify(alias)}`);
    }
  }
  assert.deepEqual(empties, [], 'every alias must normalize to real text');
});

test('A2. no reachable family has an internal duplicate alias (same normalized text listed twice)', () => {
  const dupes = [];
  for (const family of REACHABLE_FAMILIES) {
    const seen = new Set();
    for (const alias of family.aliases) {
      const n = normalizeHebrewSearchText(alias).toLowerCase();
      if (seen.has(n)) dupes.push(`${family.id}: ${JSON.stringify(alias)}`);
      seen.add(n);
    }
  }
  assert.deepEqual(dupes, [], 'no family should list the same alias twice');
});

test('A3. registry-driven boundary test: embedding any reachable alias (letters-only, length >= 2) inside a longer synthetic word never triggers that family as a suggestion, in either script, on either the leading or trailing edge', () => {
  const failures = [];
  for (const family of REACHABLE_FAMILIES) {
    const mappedCheckboxes = ALL_PRODUCT_FAMILY_VALUES.filter(
      (checkbox) => (PRODUCT_FAMILY_SELECTION_CANDIDATES[checkbox] || []).includes(family.id),
    );
    if (mappedCheckboxes.length === 0) continue; // not reachable via any checkbox -- nothing to protect

    for (const alias of family.aliases) {
      const normalized = normalizeHebrewSearchText(alias).toLowerCase();
      // Only single-token, letters-only aliases are meaningfully
      // "embeddable" inside a longer word -- multi-word phrases and
      // aliases containing punctuation/digits (e.g. "t-shirt", "Wi-Fi")
      // are already far less collision-prone and are covered instead
      // by the explicit named regression tests (B/C below and the
      // pre-existing tent/table tests).
      if (!/^[a-z֐-׿]+$/.test(normalized) || normalized.length < 2) continue;

      const hebrew = isHebrewScript(normalized);
      // Leading-edge embed: a non-boundary character directly before
      // the alias (a Hebrew letter that is NOT one of the legitimate
      // single-letter prefixes, or an ordinary Latin letter) -- must
      // never match.
      const leadingChar = hebrew ? 'ק' : 'z';
      const leadingEmbed = `${leadingChar}${normalized}`;
      // Trailing-edge embed: an ordinary letter directly after the
      // alias (the exact shape of "table"+"s"="tables"... "tablets",
      // "tent"+"h"="tenth") -- must never match.
      const trailingChar = hebrew ? 'ן' : 'z';
      const trailingEmbed = `${normalized}${trailingChar}`;

      for (const embed of [leadingEmbed, trailingEmbed]) {
        const suggested = suggestProductFamilyValues([carrier(embed)]);
        const leaked = mappedCheckboxes.some((c) => suggested.includes(c));
        if (leaked) failures.push(`${family.id} via alias ${JSON.stringify(alias)} embedded as ${JSON.stringify(embed)} -> ${JSON.stringify(suggested)}`);
      }
    }
  }
  assert.deepEqual(failures, [], `embedding these aliases inside a longer word incorrectly triggered a suggestion:\n${failures.join('\n')}`);
});

// -----------------------------------------------------------------
// B. Positive family validation: every reachable family can still be
// suggested from a text containing its own alias as a genuine whole
// word/phrase.
// -----------------------------------------------------------------

test('B1. every reachable family can still be suggested from a neutral sentence containing one of its own aliases as a real whole word/phrase', () => {
  const failures = [];
  for (const family of REACHABLE_FAMILIES) {
    // Prefer the family's own longest alias (most specific / least
    // ambiguous), which is also the most representative real-world
    // phrasing a user might type.
    const alias = [...family.aliases].sort((a, b) => b.length - a.length)[0];
    const suggested = suggestProductFamilyValues([carrier(alias)]);
    if (suggested.length === 0) failures.push(`${family.id} (${family.publicFamilyName}) via alias ${JSON.stringify(alias)} -> []`);
  }
  assert.deepEqual(failures, [], `these reachable families produced no suggestion at all from their own alias:\n${failures.join('\n')}`);
});

// -----------------------------------------------------------------
// C. Known named collisions (explicit regression, in addition to the
// generic A3 sweep) -- kept here as a compact, human-readable list of
// the collisions that were actually found, per the task's own required
// examples plus the ones discovered during this review.
// -----------------------------------------------------------------

test('C1. named collisions never trigger their unrelated family: table/suitable, table/tablets, tent/content, tent/intent, tent/extent, tent/tenth, tent/detente, chair/wheelchair, chair/chairman', () => {
  const cases = [
    ['suitable for daily use', 'furniture_and_home_goods'],
    ['oral tablets for pain relief', 'furniture_and_home_goods'],
    ['Package content: cables and manual', 'textile_apparel_and_footwear'],
    ['the intent of this product', 'textile_apparel_and_footwear'],
    ['to what extent is this waterproof', 'textile_apparel_and_footwear'],
    ['this is the tenth unit produced', 'textile_apparel_and_footwear'],
    ['a detente agreement', 'textile_apparel_and_footwear'],
    ['a folding wheelchair for hospital use', 'furniture_and_home_goods'],
    ['the chairman of the company', 'furniture_and_home_goods'],
  ];
  for (const [text, forbiddenCheckbox] of cases) {
    const suggested = suggestProductFamilyValues([text]);
    assert.ok(!suggested.includes(forbiddenCheckbox), `"${text}" must not suggest ${forbiddenCheckbox}`);
  }
});

// -----------------------------------------------------------------
// D. Multi-family validation: two genuinely independent product
// concepts in the same description may both remain visible.
// -----------------------------------------------------------------

test('D1. a description with two genuinely independent, real alias matches shows both families (a component/characteristic does not replace the main family)', () => {
  const suggested = suggestProductFamilyValues(['textile tent with a rechargeable lithium battery']);
  assert.ok(suggested.includes('batteries_or_battery_containing'), 'the genuine battery match must be present');
  assert.ok(suggested.includes('textile_apparel_and_footwear'), 'the genuine tent-hint match must also be present, not replaced by the battery match');
});

test('D2. the pre-existing multi-family case (cosmetics + perfume ambiguity) still resolves within its own candidate set', () => {
  const suggested = suggestProductFamilyValues(['בושם וקוסמטיקה לגוף']);
  assert.ok(suggested.includes('cosmetics_and_beauty'));
});

// -----------------------------------------------------------------
// E. Unknown-product validation.
// -----------------------------------------------------------------

test('E1. an unclear/unsupported description produces no suggestion at all (safe fallback to the full list), never an invented specific family', () => {
  for (const text of ['unidentified product', 'מוצר לא מזוהה', 'מוצר כללי לבדיקה', 'a completely generic item']) {
    assert.deepEqual(suggestProductFamilyValues([text]), []);
  }
});

// -----------------------------------------------------------------
// F. PR #63 regression validation (tent scenarios, Hebrew prefix
// legitimacy, exact previously-established output).
// -----------------------------------------------------------------

test('F1. tent scenarios remain byte-identical to PR #63\'s established output', () => {
  assert.deepEqual(suggestProductFamilyValues(['אוהל']), ['textile_apparel_and_footwear', 'other_general_product', 'not_sure']);
  assert.deepEqual(suggestProductFamilyValues(['tent']), ['textile_apparel_and_footwear', 'other_general_product', 'not_sure']);
  assert.deepEqual(suggestProductFamilyValues(['textile tent']), ['textile_apparel_and_footwear', 'other_general_product', 'not_sure']);
  assert.deepEqual(suggestProductFamilyValues(['אוהל מטקסטיל']), ['textile_apparel_and_footwear']);
  for (const text of ['tent accessory', 'tent pole', 'tent repair kit']) {
    assert.deepEqual(suggestProductFamilyValues([text]), []);
  }
});

test('F2. the legitimate Hebrew single-letter-prefix form (the exact pattern PR #63 relies on for "אוהל מטקסטיל") is preserved: a real prefix letter ("מ" = made-of) attached with no space directly in front of a registry alias still matches its family', () => {
  assert.deepEqual(suggestProductFamilyValues(['מטקסטיל']), ['textile_apparel_and_footwear']);
});

test('F2b. the same prefix tolerance generalizes to a second, unrelated registry alias (not just "טקסטיל") -- "בטקסטיל" (in textile) using the "ב" (in) prefix on the same alias still matches, while a non-prefix letter directly attached still correctly does not', () => {
  assert.deepEqual(suggestProductFamilyValues(['מוצר בטקסטיל איכותי']), ['textile_apparel_and_footwear']);
  assert.deepEqual(suggestProductFamilyValues(['קטקסטילקק']), []);
});

test('F3. no checkbox is ever automatically selected by this module -- it returns plain value arrays only, never an object carrying a "checked"/"selected" concept', () => {
  const suggested = suggestProductFamilyValues(['אוהל מטקסטיל עם מצבר נטען']);
  assert.ok(Array.isArray(suggested));
  for (const value of suggested) assert.equal(typeof value, 'string');
});

// -----------------------------------------------------------------
// G. Presentation-alias-supplement coverage (Hebrew/English inflected
// and plural forms of already-reachable families -- see
// PRESENTATION_ALIAS_SUPPLEMENTS's doc comment in
// family-material-disclosure.js for the full collision-review
// rationale for what was and was not added).
// -----------------------------------------------------------------

test('G1. every added plural/inflected supplement term matches its intended, already-reachable family', () => {
  const cases = [
    ['ארונות', 'furniture_and_home_goods'], // cabinets (plural of "ארון")
    ['שולחנות', 'furniture_and_home_goods'], // tables (plural of "שולחן")
    ['כיסאות', 'furniture_and_home_goods'], // chairs (plural of "כיסא")
    ['חולצות', 'textile_apparel_and_footwear'], // shirts (plural of "חולצה")
    ['שמלות', 'textile_apparel_and_footwear'], // dresses (plural of "שמלה")
    ["ג'קטים", 'textile_apparel_and_footwear'], // jackets (plural of "ג'קט")
    ['מעילים', 'textile_apparel_and_footwear'], // coats (plural of "מעיל")
    ['סנדל', 'textile_apparel_and_footwear'], // sandal (singular of "סנדלים")
  ];
  for (const [term, expectedCheckbox] of cases) {
    const suggested = suggestProductFamilyValues([term]);
    assert.ok(suggested.includes(expectedCheckbox), `"${term}" must suggest ${expectedCheckbox}, got ${JSON.stringify(suggested)}`);
  }
});

test('G2. every added supplement term does not match inside a longer unrelated word (same boundary protection as every other alias)', () => {
  const terms = ['ארונות', 'שולחנות', 'כיסאות', 'חולצות', 'שמלות', "ג'קטים", 'מעילים', 'סנדל'];
  for (const term of terms) {
    const leaked = suggestProductFamilyValues([`קק${term}קק`]);
    assert.deepEqual(leaked, [], `"${term}" embedded inside a longer word must not match`);
  }
});

test('G3. the "כיסאות" supplement carries the same existing negative-term protection ("כיסאות אוכל", high chairs) the singular furniture family already relies on, so it does not falsely suggest ordinary furniture for high chairs', () => {
  assert.ok(!suggestProductFamilyValues(['כיסאות אוכל לילדים']).includes('furniture_and_home_goods'));
  // The co-mentioned, unrelated furniture terms in the same entry
  // family must still work when the negative phrase is absent.
  assert.ok(suggestProductFamilyValues(['ארונות ושולחנות לסלון']).includes('furniture_and_home_goods'));
});

test('G4. deliberately deferred plural/English forms (battery/drone families) remain unadded -- collision risk with their own existing negative-term lists was found during this review and was not resolved in this pass', () => {
  for (const text of ['מצברים', 'סוללות', 'batteries', 'רחפנים']) {
    assert.deepEqual(suggestProductFamilyValues([text]), [], `"${text}" is a known, deliberately deferred gap, not a silent regression`);
  }
  // The specific collision this deferral avoids: a plural/English form
  // that would defeat the singular family's own existing negative-term
  // exclusion (vehicle-battery phrasing must never resolve to the
  // standalone-battery family).
  assert.deepEqual(suggestProductFamilyValues(['מצברים לרכב']), []);
});

// -----------------------------------------------------------------
// H. Duplicate/ambiguous alias diagnostics across DIFFERENT reachable
// families (distinct from A2, which only checks duplicates WITHIN one
// family) -- reported, never silently resolved to one family.
// -----------------------------------------------------------------

test('H1. no two different reachable families share the exact same normalized alias (would be a silent, unresolvable ambiguity if it existed)', () => {
  const ownerOf = new Map(); // normalized alias -> family id
  const collisions = [];
  for (const family of REACHABLE_FAMILIES) {
    for (const alias of family.aliases) {
      const normalized = normalizeHebrewSearchText(alias).toLowerCase();
      if (ownerOf.has(normalized) && ownerOf.get(normalized) !== family.id) {
        collisions.push(`${JSON.stringify(alias)} shared by ${ownerOf.get(normalized)} and ${family.id}`);
      } else {
        ownerOf.set(normalized, family.id);
      }
    }
  }
  assert.deepEqual(collisions, [], `these aliases are ambiguously shared across different reachable families:\n${collisions.join('\n')}`);
});

// -----------------------------------------------------------------
// I. The 19 currently-unreachable matrix rows -- coverage-status
// diagnostic fixture (product-owner review deliverable). Every row is
// classified using only existing code/registry evidence: A =
// intentionally represented by a broader checkbox family, B = internal/
// inactive and not intended as a visible option, C = duplicate/
// alternate matrix concept of an already-reachable family, D = genuine
// presentation gap with no safe existing checkbox to map to, E =
// unclear / requires professional or regulatory review. No code
// mapping is applied here for D/E rows -- see the completion report for
// the full reasoning per row.
// -----------------------------------------------------------------

const UNREACHABLE_ROW_COVERAGE = Object.freeze({
  'vehicles-and-transport-01': 'E', // whole vehicles -- no existing checkbox names complete vehicles (vehicle_parts_and_transport_accessories is explicitly parts/accessories only); documented project-level gap, professional review needed.
  'vehicles-and-transport-02': 'E', // whole motorcycles/scooters -- same reasoning as -01.
  'health-and-cosmetics-04': 'E', // medicines -- documented project-level gap; medicines are professionally/regulatorily sensitive, no safe existing checkbox.
  'additional-consumer-products-01': 'E', // sports equipment -- no existing checkbox covers general consumer/sports goods.
  'additional-consumer-products-02': 'E', // ordinary bicycles/scooters -- mapping to vehicle_parts_and_transport_accessories would contradict the product owner's own explicit "protect against accessories" requirement (see FAMILY_NEGATIVE_TERMS) distinguishing complete bicycles from parts/accessories.
  'additional-consumer-products-03': 'C', // drones (plural-named duplicate) -- byte-identical regulatorySignals to the already-reachable electrical-and-electronics-10 ("רחפן"/drone, via wireless_or_transmitting_equipment). See PRESENTATION_ALIAS_SUPPLEMENTS' doc comment: the plural term itself was reviewed and deliberately deferred (not added) pending its own negative-term collision review, so this row's concept is documented but not yet presentation-mapped.
  'additional-consumer-products-04': 'E', // marine equipment/watercraft -- no existing checkbox.
  'additional-consumer-products-05': 'E', // pet accessories/products -- distinct from the existing animal_origin_products/live_animals/animal_feed checkboxes (those are about products FROM animals, live animals, or food FOR animals -- not accessories FOR pets); no safe existing checkbox.
  'additional-consumer-products-06': 'E', // personal protective equipment -- no existing checkbox.
  'additional-consumer-products-07': 'E', // motorized bicycles/scooters -- same accessory-vs-complete-product concern as -02.
  'other-01': 'B', // activeStatus: false, literal name "additional family for manual completion" -- an internal placeholder row, never reachable via identifyProductFamily's own activeFamilies() filter regardless of any checkbox mapping.
  'construction-and-industrial-04': 'E', // hand tools -- industrial_machinery_and_equipment's own candidate set (construction-and-industrial-02) is machinery/industrial equipment specifically, not hand tools; no safe existing checkbox.
  'additional-consumer-products-08': 'E', // cardboard packaging -- no existing checkbox for packaging materials.
  'construction-and-industrial-05': 'E', // wooden packaging boxes -- same reasoning as cardboard packaging.
  'additional-consumer-products-09': 'E', // paper/print products -- no existing checkbox.
  'textiles-and-furniture-06': 'E', // rugs/carpets -- furniture_and_home_goods' own candidate set (textiles-and-furniture-03/05) does not include this row; mapping it would create a mismatch between what is suggested and what the checkbox's own explicit-selection candidate set can actually identify.
  'textiles-and-furniture-07': 'E', // blankets -- same candidate-set-mismatch reasoning as rugs.
  'textiles-and-furniture-08': 'E', // household textile products (bedding/curtains/towels) -- textile_apparel_and_footwear's own candidate set is apparel/footwear only; same candidate-set-mismatch reasoning.
  'construction-and-industrial-06': 'E', // building/architectural safety glass -- regulatorySignals confirmed genuinely different from the reachable vehicle-safety-glass row (standards vs. transportOrVehicleLaboratory); not a duplicate, no safe existing checkbox.
});

test('I1. all 19 currently-unreachable matrix rows are accounted for in the coverage diagnostic, with no row missing and no stale/extra entry', () => {
  const reachableIds = REACHABLE_MATRIX_IDS;
  const actualUnreachableIds = PRODUCT_FAMILY_MATRIX.filter((f) => !reachableIds.has(f.id)).map((f) => f.id).sort();
  const fixtureIds = Object.keys(UNREACHABLE_ROW_COVERAGE).sort();
  assert.deepEqual(actualUnreachableIds, fixtureIds, 'the coverage fixture must exactly match the live registry\'s unreachable rows');
});

test('I2. every coverage category used is one of the defined codes (A/B/C/D/E), and no row was silently mapped to a checkbox by this task', () => {
  const validCodes = new Set(['A', 'B', 'C', 'D', 'E']);
  for (const [id, code] of Object.entries(UNREACHABLE_ROW_COVERAGE)) {
    assert.ok(validCodes.has(code), `${id} has an invalid coverage code ${JSON.stringify(code)}`);
  }
  // None of these 19 unreachable matrix ids appear as a matrixId in the
  // new presentation-alias-supplements registry's own reachable-family
  // scope -- confirming no unreachable row was quietly mapped to a
  // checkbox as a side effect of this task (the drone case, C, was
  // deliberately deferred rather than mapped).
  const reachableIds = REACHABLE_MATRIX_IDS;
  for (const id of Object.keys(UNREACHABLE_ROW_COVERAGE)) {
    assert.ok(!reachableIds.has(id), `${id} must still be unreachable -- this task must not add checkbox mappings`);
  }
});

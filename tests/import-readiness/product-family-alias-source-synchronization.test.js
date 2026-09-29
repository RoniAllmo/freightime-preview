/**
 * Alias source-of-truth synchronization guard (FT-ONE-PULSE-COMPLETE-ALL-
 * PRODUCT-FAMILIES-V1 correction).
 *
 * Audit finding: 18 aliases across 9 product-family rows were hand-edited
 * directly into the generated, "do not hand-edit" runtime file
 * (product-family-matrix.js) without a matching entry in the generator's
 * own CURATED_ALIASES dict (scripts/generate_product_family_matrix.py).
 * A future regeneration from the authoritative workbook would have
 * silently discarded them, since CURATED_ALIASES -- not the runtime file
 * -- is the authoritative curated-alias source that survives
 * regeneration.
 *
 * This is a general, reusable synchronization check, not 18 static
 * string-presence assertions: it structurally parses every entry of
 * CURATED_ALIASES directly out of the generator's Python source (a real
 * data extraction, not a text search) and asserts that every alias it
 * lists is present on the correctly-matching row in the committed
 * generated file. It will fail for ANY future family whose curated
 * aliases drift out of sync with the runtime file -- in either
 * direction -- not just for the 9 rows this correction touched.
 *
 * This does not invoke the Python generator itself (openpyxl and a
 * Python setup step are not available in this repository's CI --
 * see the full-system audit's Domain 11 finding), so it cannot prove
 * regeneration determinism by itself; that was proven separately, by
 * hand, for this correction (two consecutive `python3
 * scripts/generate_product_family_matrix.py` runs producing
 * byte-identical output, itself identical to the committed file). What
 * this test *can* and does prove on every CI run, going forward, is
 * that the two files never silently diverge again.
 *
 * Pure Node, no DOM, no network, no live server, no Python required.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRODUCT_FAMILY_MATRIX } from '../../js/import-readiness/product-family-matrix.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GENERATOR_PATH = path.join(REPO_ROOT, 'scripts', 'generate_product_family_matrix.py');

/**
 * Structurally extracts the CURATED_ALIASES Python dict literal from the
 * generator source: { publicFamilyName: [alias, alias, ...], ... }.
 * Strips `#`-to-end-of-line Python comments before scanning for quoted
 * strings, so a comment that itself contains quoted example text (of
 * which this file has several) is never mistaken for a real alias.
 */
function parseCuratedAliases(sourceText) {
  const startMarker = 'CURATED_ALIASES = {';
  const startIndex = sourceText.indexOf(startMarker);
  assert.ok(startIndex !== -1, 'expected to find "CURATED_ALIASES = {" in the generator source');
  const bodyStart = startIndex + startMarker.length;

  // The dict is a flat mapping of string -> flat list of strings, so a
  // simple bracket counter (starting at depth 1, for the outer `{`) is
  // sufficient to find the matching closing brace without a full parser.
  let depth = 1;
  let i = bodyStart;
  while (depth > 0 && i < sourceText.length) {
    if (sourceText[i] === '{') depth += 1;
    else if (sourceText[i] === '}') depth -= 1;
    i += 1;
  }
  assert.ok(depth === 0, 'expected to find the closing brace of CURATED_ALIASES');
  const rawBody = sourceText.slice(bodyStart, i - 1);

  // Strip Python comments (# to end of line). None of the real alias
  // strings in this dict contain '#', so this is safe for this file.
  const withoutComments = rawBody
    .split('\n')
    .map((line) => {
      const hashIndex = line.indexOf('#');
      return hashIndex === -1 ? line : line.slice(0, hashIndex);
    })
    .join('\n');

  // Each entry looks like: "key": [ "a", "b", ... ],
  // Match each `"key": [...]` block by finding the key, then bracket-
  // matching its own `[` ... `]` span (flat lists, no nested brackets).
  const entries = {};
  const keyRegex = /"((?:[^"\\]|\\.)*)"\s*:\s*\[/g;
  let match;
  while ((match = keyRegex.exec(withoutComments)) !== null) {
    const key = match[1];
    let bracketDepth = 1;
    let j = keyRegex.lastIndex;
    while (bracketDepth > 0 && j < withoutComments.length) {
      if (withoutComments[j] === '[') bracketDepth += 1;
      else if (withoutComments[j] === ']') bracketDepth -= 1;
      j += 1;
    }
    const listBody = withoutComments.slice(keyRegex.lastIndex, j - 1);
    // Python string literals may use either quote style -- e.g. a
    // single-quoted string is used at least once specifically to hold a
    // Hebrew abbreviation containing a literal double-quote character
    // ('מקמ"ש'). Match both, alternation-first so each is tried whole.
    const aliasRegex = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g;
    const aliases = [];
    let aliasMatch;
    while ((aliasMatch = aliasRegex.exec(listBody)) !== null) {
      aliases.push(aliasMatch[1] !== undefined ? aliasMatch[1] : aliasMatch[2]);
    }
    entries[key] = aliases;
    keyRegex.lastIndex = j;
  }
  return entries;
}

const generatorSource = fs.readFileSync(GENERATOR_PATH, 'utf8');
const curatedAliases = parseCuratedAliases(generatorSource);

test('CURATED_ALIASES parses to a non-trivial, non-empty structure from the real generator source', () => {
  const keys = Object.keys(curatedAliases);
  assert.ok(keys.length > 20, `expected CURATED_ALIASES to have many entries, found ${keys.length}`);
  // Spot-check one long-standing, well-known entry to confirm the parser
  // itself is working correctly, independent of this correction's own
  // new entries.
  assert.ok(Array.isArray(curatedAliases['מזון ארוז']), 'expected to parse the "מזון ארוז" entry');
  assert.ok(curatedAliases['מזון ארוז'].includes('canned food'), 'expected a known alias inside a known entry');
});

test('every CURATED_ALIASES entry corresponds to a real, active matrix row by publicFamilyName', () => {
  const publicNames = new Set(PRODUCT_FAMILY_MATRIX.map((row) => row.publicFamilyName));
  for (const key of Object.keys(curatedAliases)) {
    assert.ok(
      publicNames.has(key),
      `CURATED_ALIASES key "${key}" does not match any current matrix row's publicFamilyName -- ` +
      'this is exactly the kind of drift this guard exists to catch (a renamed or removed family ' +
      'left behind in the generator\'s curated-alias source).',
    );
  }
});

test('every curated alias is present on its matching row in the committed generated matrix file (no silent runtime-only or source-only drift)', () => {
  for (const [publicFamilyName, curated] of Object.entries(curatedAliases)) {
    const row = PRODUCT_FAMILY_MATRIX.find((r) => r.publicFamilyName === publicFamilyName);
    assert.ok(row, `expected an active matrix row named "${publicFamilyName}"`);
    for (const alias of curated) {
      assert.ok(
        row.aliases.includes(alias),
        `curated alias "${alias}" for "${publicFamilyName}" is missing from the committed ` +
        'product-family-matrix.js runtime file -- regenerate with ' +
        '`python3 scripts/generate_product_family_matrix.py` to resynchronize.',
      );
    }
  }
});

test('the nine families corrected by this reconciliation each have their curated aliases present in the runtime file', () => {
  const expected = {
    'מטענים וספקי כוח': ['מטען לטלפון', 'phone charger'],
    'כבלים ואביזרי חשמל': ['כבל חשמלי', 'electrical cable'],
    'גופי תאורה ונורות': ['נורת חשמל', 'led lamp'],
    'חלקי בלימה, היגוי ובטיחות': ['רפידת בלמים', 'brake pad'],
    'צמיגים וחישוקים': ['צמיג לרכב', 'car tire'],
    'אביזרי נוחות וקישוט לרכב': ['כיסוי מושב לרכב', 'vehicle seat cover'],
    'צעצועים חשמליים או אלחוטיים': ['צעצוע חשמלי', 'electric toy'],
    'מוצרי תינוקות': ['כפית לתינוק', 'infant feeding spoon'],
    'כימיקלים תעשייתיים וחומרים מסוכנים': ['כימיקל תעשייתי', 'industrial chemical'],
  };
  for (const [publicFamilyName, terms] of Object.entries(expected)) {
    assert.deepEqual(
      curatedAliases[publicFamilyName],
      terms,
      `expected CURATED_ALIASES["${publicFamilyName}"] to be exactly ${JSON.stringify(terms)}`,
    );
    const row = PRODUCT_FAMILY_MATRIX.find((r) => r.publicFamilyName === publicFamilyName);
    for (const term of terms) {
      assert.ok(row.aliases.includes(term), `expected "${term}" in the runtime aliases for "${publicFamilyName}"`);
    }
  }
});

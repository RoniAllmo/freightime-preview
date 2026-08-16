/**
 * Regression tests for the product-owner correction to PR #27
 * (2026-08-16): the CBM and air chargeable-weight calculators were
 * narrowed out of the homepage body/scrolling journey, not deleted --
 * they are restored on a dedicated standalone page (`tools.html`)
 * reachable from the Header and Footer.
 *
 * Matches the existing pattern in
 * tests/readiness/product-readiness.test.js and
 * tests/readiness/israeli-compliance-readiness.test.js of asserting
 * against real page markup as strings -- no jsdom, no new framework.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url);

function read(relPath) {
  return readFileSync(new URL(relPath, ROOT), 'utf8');
}

function toolsHtml() {
  return read('tools.html');
}

function indexHtml() {
  return read('index.html');
}

test('1. tools.html exists on disk', () => {
  assert.ok(existsSync(new URL('tools.html', ROOT)));
});

test('2. tools.html declares Hebrew language and RTL direction', () => {
  const source = toolsHtml();
  assert.ok(/<html[^>]*\blang="he"/.test(source));
  assert.ok(/<html[^>]*\bdir="rtl"/.test(source));
});

test('3. tools.html has exactly one <h1> with the approved title, and a non-empty <title>', () => {
  const source = toolsHtml();
  const h1s = [...source.matchAll(/<h1[^>]*>([^<]+)<\/h1>/g)];
  assert.equal(h1s.length, 1);
  assert.equal(h1s[0][1].trim(), 'כלים ומחשבונים');
  const titleMatch = source.match(/<title>([^<]+)<\/title>/);
  assert.ok(titleMatch && titleMatch[1].trim().length > 0);
});

test('4. tools.html carries the approved supporting explanation sentence', () => {
  assert.ok(toolsHtml().includes('כלים שימושיים לחישובים תפעוליים בסיסיים בתהליך השילוח.'));
});

test('5. tools.html has exactly one <main> landmark and a skip link matching the existing legal-page pattern', () => {
  const source = toolsHtml();
  assert.equal((source.match(/<main[\s>]/g) ?? []).length, 1);
  assert.ok(source.includes('<a class="skip-link" href="#main">דלג לתוכן הראשי</a>'));
  assert.ok(source.includes('id="main"'));
});

test('6. tools.html has no duplicate element ids', () => {
  const ids = [...toolsHtml().matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  const seen = new Map();
  for (const id of ids) seen.set(id, (seen.get(id) ?? 0) + 1);
  const duplicates = [...seen.entries()].filter(([, count]) => count > 1);
  assert.deepEqual(duplicates, []);
});

test('7. tools.html never skips a heading level after <h1>', () => {
  const headingTags = [...toolsHtml().matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
  for (let i = 1; i < headingTags.length; i += 1) {
    assert.ok(headingTags[i] - headingTags[i - 1] <= 1);
  }
});

test('8. both calculators are present with native form controls (no clickable divs standing in for real inputs/buttons)', () => {
  const source = toolsHtml();
  assert.ok(source.includes('id="cbmLength"') && /<input[^>]*id="cbmLength"/.test(source));
  assert.ok(source.includes('id="airWeightGross"') && /<input[^>]*id="airWeightGross"/.test(source));
  assert.ok(/<button[^>]*id="cbmCalculate"/.test(source));
  assert.ok(/<button[^>]*id="airWeightCalculate"/.test(source));
  assert.ok(!/<div[^>]*role="button"/.test(source), 'expected no div-as-button substitutes');
});

test('9. both calculator forms group their fields in a <fieldset> with a <legend>', () => {
  const source = toolsHtml();
  const fieldsetCount = (source.match(/<fieldset/g) ?? []).length;
  const legendCount = (source.match(/<legend/g) ?? []).length;
  assert.ok(fieldsetCount >= 2);
  assert.equal(fieldsetCount, legendCount);
});

test('10. every calculator input has an associated <label for="...">', () => {
  const source = toolsHtml();
  const inputIds = [...source.matchAll(/<input[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
  const selectIds = [...source.matchAll(/<select[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
  for (const id of [...inputIds, ...selectIds]) {
    assert.ok(source.includes(`for="${id}"`), `expected a <label for="${id}">`);
  }
});

test('11. calculator errors are announced assertively and results are announced politely, on both panels', () => {
  const source = toolsHtml();
  for (const id of ['cbmError', 'airWeightError']) {
    const re = new RegExp(`id="${id}"[^>]*role="alert"[^>]*aria-live="assertive"`);
    assert.ok(re.test(source), `expected ${id} to be role="alert" aria-live="assertive"`);
  }
  for (const id of ['cbmResult', 'airWeightResult']) {
    const re = new RegExp(`id="${id}"[^>]*aria-live="polite"`);
    assert.ok(re.test(source), `expected ${id} to be aria-live="polite"`);
  }
});

test('12. tools.html restores the same legal-page footer link set used by the other standalone legal pages', () => {
  const source = toolsHtml();
  const footer = source.match(/<footer[\s\S]*<\/footer>/)[0];
  for (const page of ['accessibility-statement.html', 'privacy-policy.html', 'terms-of-use.html']) {
    assert.ok(footer.includes(`href="${page}"`), `expected a footer link to ${page}`);
  }
  assert.ok(footer.includes('href="index.html"'));
});

test('13. tools.html links back to the homepage assessment', () => {
  const source = toolsHtml();
  assert.ok(source.includes('href="index.html#readiness"'), 'expected a working link back to the assessment');
});

test('14. tools.html imports the restored calculator controller module', () => {
  assert.ok(toolsHtml().includes("from './js/tools/tools-controller.js'"));
});

test('15. tools.html performs no network calls, no storage writes, and never mutates history/URL with calculator values', () => {
  const source = toolsHtml();
  for (const needle of ['fetch(', 'XMLHttpRequest', 'localStorage', 'sessionStorage', 'document.cookie', 'history.pushState', 'history.replaceState']) {
    assert.ok(!source.includes(needle), `expected no "${needle}" in tools.html`);
  }
});

test('16. tools.html loads no analytics/tracking script', () => {
  const source = toolsHtml();
  for (const needle of ['google-analytics', 'gtag(', 'googletagmanager', 'analytics.js', 'facebook.net', 'segment.com']) {
    assert.ok(!source.includes(needle));
  }
});

// --- index.html Header/Footer integration -------------------------------

test('17. the Header desktop nav includes a "כלים" link to the dedicated tools page, not a homepage #tools anchor', () => {
  const source = indexHtml();
  const navMatch = source.match(/<div class="navlinks">[\s\S]*?<\/div>/)[0];
  assert.ok(navMatch.includes('<a href="tools.html">כלים</a>'));
  assert.ok(!navMatch.includes('href="#tools"'));
});

test('18. the mobile menu mirrors the same "כלים" link to tools.html', () => {
  const source = indexHtml();
  const menuMatch = source.match(/<div id="mobileMenu">[\s\S]*?<\/div>/)[0];
  assert.ok(menuMatch.includes('<a href="tools.html">כלים</a>'));
});

test('19. the Footer links to both calculators on the dedicated tools page', () => {
  const source = indexHtml();
  const footer = source.match(/<footer>[\s\S]*<\/footer>/)[0];
  assert.ok(footer.includes('href="tools.html#cbm"'));
  assert.ok(footer.includes('href="tools.html#chargeable-weight"'));
});

test('20. index.html itself does not import the calculator controller (calculators are not wired into the homepage)', () => {
  assert.ok(!indexHtml().includes("from './js/tools/"));
});

test('21. index.html still has no duplicate element ids after the Header/Footer additions', () => {
  const ids = [...indexHtml().matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  const seen = new Map();
  for (const id of ids) seen.set(id, (seen.get(id) ?? 0) + 1);
  const duplicates = [...seen.entries()].filter(([, count]) => count > 1);
  assert.deepEqual(duplicates, []);
});

// --- Formula fidelity across the restoration (belt-and-suspenders on top
// of tests/tools/{cbm-calculator,air-chargeable-weight-calculator}.test.js) --

test('22. the CBM markup wires exactly the original CBM formula fields (length, width, height, unit, quantity) with no added/renamed field', () => {
  const cbmPanel = toolsHtml().match(/<section class="tool-panel" id="cbm"[\s\S]*?<\/section>/)[0];
  for (const id of ['cbmLength', 'cbmWidth', 'cbmHeight', 'cbmUnit', 'cbmQuantity', 'cbmCalculate', 'cbmReset']) {
    assert.ok(cbmPanel.includes(`id="${id}"`), `expected #${id} inside the CBM panel`);
  }
});

test('23. the chargeable-weight markup wires exactly the original fields, including the 6000/5000/custom divisor options', () => {
  const panel = toolsHtml().match(/<section class="tool-panel" id="chargeable-weight"[\s\S]*?<\/section>/)[0];
  for (const id of ['airWeightGross', 'airWeightLength', 'airWeightWidth', 'airWeightHeight', 'airWeightUnit', 'airWeightDivisor', 'airWeightCustomDivisor', 'airWeightCalculate', 'airWeightReset']) {
    assert.ok(panel.includes(`id="${id}"`), `expected #${id} inside the chargeable-weight panel`);
  }
  assert.ok(panel.includes('<option value="6000" selected>6000'));
  assert.ok(panel.includes('<option value="5000">5000'));
  assert.ok(panel.includes('<option value="custom">'));
});

test('24. calculator results never claim to be a final quotation, carrier commitment, customs determination, or professional advice', () => {
  const source = read('js/tools/cbm-calculator.js') + read('js/tools/air-chargeable-weight-calculator.js');
  assert.ok(!source.includes('הצעת מחיר סופית'));
  assert.ok(!source.includes('התחייבות מוביל'));
  assert.ok(source.includes('אומדן') || source.includes('מוערך'), 'expected the limitation note to frame the result as an estimate');
});

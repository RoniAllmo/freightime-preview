/**
 * Tests for the Product Readiness V1 fixes -- verifies specific
 * corrections against the real page markup (`index.html`), matching the
 * existing pattern already used in `tests/tracking/ui-controller.test.js`
 * for asserting real-markup invariants (e.g. `target="_blank"` on the
 * official-tracking link) rather than re-testing already-covered logic.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

function html() {
  return readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
}

test('1. every element id in the page is unique (no duplicate IDs)', () => {
  const ids = [...html().matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  const seen = new Map();
  for (const id of ids) {
    seen.set(id, (seen.get(id) ?? 0) + 1);
  }
  const duplicates = [...seen.entries()].filter(([, count]) => count > 1);
  assert.deepEqual(duplicates, []);
});

test('2. the page has exactly one <main> landmark', () => {
  const mainCount = (html().match(/<main[\s>]/g) ?? []).length;
  assert.equal(mainCount, 1);
});

test('3. the heading hierarchy never skips a level after <h1> (no h1 followed directly by h3+)', () => {
  const headingTags = [...html().matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
  for (let i = 1; i < headingTags.length; i += 1) {
    const jump = headingTags[i] - headingTags[i - 1];
    assert.ok(jump <= 1, `heading level jumped from h${headingTags[i - 1]} to h${headingTags[i]} at position ${i}`);
  }
});

test('4. the page declares Hebrew language and RTL direction', () => {
  assert.ok(/<html[^>]*\blang="he"/.test(html()));
  assert.ok(/<html[^>]*\bdir="rtl"/.test(html()));
});

test('5. the page has a non-empty <title> and a meta description', () => {
  const source = html();
  const titleMatch = source.match(/<title>([^<]+)<\/title>/);
  assert.ok(titleMatch && titleMatch[1].trim().length > 0);
  assert.ok(/<meta name="description" content="[^"]+"/.test(source));
});

test('6. the meta description does not claim live/automated carrier tracking', () => {
  const source = html();
  const descMatch = source.match(/<meta name="description" content="([^"]+)"/);
  assert.ok(descMatch);
  const description = descMatch[1];
  assert.ok(!description.includes('מעקב חי אוטומטי'));
  assert.ok(description.includes('מקומית'));
});

test('7. the page has a favicon reference', () => {
  assert.ok(/<link rel="icon"/.test(html()));
});

test('8. the primary tracking input has an accessible label (aria-label, not placeholder alone)', () => {
  const match = html().match(/<input id="trackInput"[^>]*>/);
  assert.ok(match);
  assert.ok(/aria-label="[^"]+"/.test(match[0]));
});

test('9. the contact-form and chat inputs have accessible labels', () => {
  const source = html();
  for (const id of ['cfName', 'cfContact', 'cfMsg', 'chatInput']) {
    const re = new RegExp(`id="${id}"[^>]*>`);
    const match = source.match(re);
    assert.ok(match, `expected to find element with id="${id}"`);
    assert.ok(/aria-label="[^"]+"/.test(match[0]), `expected aria-label on #${id}`);
  }
});

test('10. the footer grid has a responsive single-column rule for narrow viewports', () => {
  assert.ok(/\.foot-grid\{[^}]*grid-template-columns:1fr/.test(html()));
});

test('11. the smart tracking import section heading is an h2 (not skipping a level after h1)', () => {
  const match = html().match(/<h2>פענוח חכם של תוצאת מעקב<\/h2>/);
  assert.ok(match);
});

test('12. no console.log/console.error/console.warn call exists in any tracking-import, tracking, or tools module', () => {
  const glob = readdirSync;
  const dirs = ['js/tracking-import', 'js/tracking', 'js/tools'];
  for (const dir of dirs) {
    const files = glob(new URL(`../../${dir}/`, import.meta.url)).filter((f) => f.endsWith('.js'));
    for (const file of files) {
      const source = readFileSync(new URL(`../../${dir}/${file}`, import.meta.url), 'utf8');
      assert.ok(!/console\.(log|error|warn)\(/.test(source), `unexpected console call in ${dir}/${file}`);
    }
  }
});

test('13. no innerHTML/outerHTML/insertAdjacentHTML/eval usage exists in any tracking-import, tracking, or tools module', () => {
  const glob = readdirSync;
  const dirs = ['js/tracking-import', 'js/tracking', 'js/tools'];
  for (const dir of dirs) {
    const files = glob(new URL(`../../${dir}/`, import.meta.url)).filter((f) => f.endsWith('.js'));
    for (const file of files) {
      const source = readFileSync(new URL(`../../${dir}/${file}`, import.meta.url), 'utf8');
      const codeOnly = source
        .split('\n')
        .filter((line) => !line.trim().startsWith('*') && !line.trim().startsWith('//'))
        .join('\n');
      assert.ok(!/\.innerHTML\s*=/.test(codeOnly), `unexpected innerHTML assignment in ${dir}/${file}`);
      assert.ok(!/\.outerHTML\s*=/.test(codeOnly), `unexpected outerHTML assignment in ${dir}/${file}`);
      assert.ok(!/insertAdjacentHTML\(/.test(codeOnly), `unexpected insertAdjacentHTML in ${dir}/${file}`);
      assert.ok(!/\beval\(/.test(codeOnly), `unexpected eval in ${dir}/${file}`);
    }
  }
});

test('14. a GitHub Actions frontend CI workflow exists and runs the existing test commands', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/frontend-ci.yml', import.meta.url), 'utf8');
  assert.ok(workflow.includes('pull_request'));
  assert.ok(workflow.includes('push'));
  assert.ok(workflow.includes('node --test'));
  assert.ok(workflow.includes('tests/tracking-import/*.test.js'));
});

test('15. the CI workflow uses least-privilege permissions (contents: read)', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/frontend-ci.yml', import.meta.url), 'utf8');
  assert.ok(/permissions:\s*\n\s*contents:\s*read/.test(workflow));
});

test('16. the CI workflow does not reference any secret', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/frontend-ci.yml', import.meta.url), 'utf8');
  assert.ok(!workflow.includes('secrets.'));
});

/**
 * Regression tests for the post-PR#24 professional-routing accessibility
 * and dead-code quality gate: no duplicate ids, every aria-controls /
 * aria-labelledby reference resolves to a real id, the new
 * professional-referral CTAs keep a real touch target and never carry
 * assessment data in their href, and documentSubType is fully removed
 * (not left half-wired). Matches the existing pattern in
 * tests/readiness/design-redesign-v1.test.js and product-readiness.test.js
 * of asserting against the real page markup (index.html) and source
 * files as strings.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

function html() {
  return readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
}

function listJsFiles(dir) {
  return readdirSync(new URL(`../../${dir}/`, import.meta.url)).filter((f) => f.endsWith('.js'));
}

test('1. no duplicate id attributes exist anywhere in index.html', () => {
  const source = html();
  const ids = [...source.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  const seen = new Set();
  const dupes = new Set();
  for (const id of ids) {
    if (seen.has(id)) dupes.add(id);
    seen.add(id);
  }
  assert.deepEqual([...dupes], [], `expected no duplicate ids, found: ${[...dupes].join(', ')}`);
});

test('2. every aria-controls attribute in index.html references an id that exists in the page', () => {
  const source = html();
  const ids = new Set([...source.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  const controls = [...source.matchAll(/aria-controls="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(controls.length > 0, 'expected at least one aria-controls reference to check');
  for (const id of controls) {
    assert.ok(ids.has(id), `aria-controls="${id}" does not reference any element id in the page`);
  }
});

test('3. every aria-labelledby attribute in index.html (if any) references an id that exists in the page', () => {
  const source = html();
  const ids = new Set([...source.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  const labelledby = [...source.matchAll(/aria-labelledby="([^"]+)"/g)].map((m) => m[1]);
  for (const id of labelledby) {
    assert.ok(ids.has(id), `aria-labelledby="${id}" does not reference any element id in the page`);
  }
});

test('4. the professional-referral result container keeps its aria-live wiring', () => {
  const source = html();
  const match = source.match(/<div class="readiness-card" id="readinessResult"[^>]*>/);
  assert.ok(match, 'expected the readinessResult container element');
  assert.ok(/aria-live="polite"/.test(match[0]), 'expected the result container (which now also hosts the professional-referral, urgency, and notification-parties content) to announce via aria-live');
});

test('5. the supporting-professional CTA has a real >=44px touch target, matching the primary CTA and the codebase\'s existing .btn-text pattern', () => {
  const source = html();
  const ruleMatch = source.match(/\.ir-supporting-professional-cta\{([^}]*)\}/);
  assert.ok(ruleMatch, 'expected a .ir-supporting-professional-cta rule');
  assert.ok(/min-height:\s*44px/.test(ruleMatch[1]), 'expected a >=44px min-height touch target on the supporting-professional CTA');
});

test('6. no CSS rule removes the shared focus-visible ring from the new professional-referral CTAs', () => {
  const source = html();
  for (const selector of ['.ir-professional-cta', '.ir-supporting-professional-cta']) {
    const ruleMatch = source.match(new RegExp(`${selector.replace('.', '\\.')}(:focus[^{]*)?\\{([^}]*)\\}`, 'g')) || [];
    for (const rule of ruleMatch) {
      if (/outline:\s*none/.test(rule)) {
        assert.ok(/box-shadow/.test(rule), `${selector} disables outline without restoring a visible focus indicator`);
      }
    }
  }
});

test('7. the shared :focus-visible focus-ring rule still exists (reused, not reinvented, by the new professional-referral markup)', () => {
  const source = html();
  assert.ok(/:focus-visible\{[^}]*box-shadow:var\(--focus-ring\)/.test(source));
});

test('8. neither the professional CTA nor the supporting-professional CTA ever carries a query string or assessment data in its href', () => {
  const controllerSource = readFileSync(
    new URL('../../js/import-readiness/import-readiness-controller.js', import.meta.url),
    'utf8',
  );
  // Every href built for the professional-referral / supporting-professional
  // CTAs must be the literal '#contact' anchor -- never a template, never
  // built from a variable that could carry form answers.
  const ctaBlocks = [...controllerSource.matchAll(/className:\s*'ir-(?:professional|supporting-professional)-cta'[^}]*attrs:\s*\{[^}]*\}/g)];
  assert.ok(ctaBlocks.length >= 2, 'expected both the primary and supporting professional CTA element definitions');
  for (const block of ctaBlocks) {
    assert.ok(/href:\s*'#contact'/.test(block[0]), `expected a literal '#contact' href, got: ${block[0]}`);
  }
});

test('9. no assessment-input variable is ever concatenated into a URL/href/location anywhere in js/import-readiness', () => {
  for (const file of listJsFiles('js/import-readiness')) {
    const source = readFileSync(new URL(`../../js/import-readiness/${file}`, import.meta.url), 'utf8');
    assert.ok(!/location\.(href|search|hash)\s*=/.test(source), `unexpected location mutation in js/import-readiness/${file}`);
    assert.ok(!/URLSearchParams/.test(source), `unexpected URLSearchParams usage in js/import-readiness/${file}`);
    assert.ok(!/[?&]\$\{/.test(source), `unexpected string-templated query string in js/import-readiness/${file}`);
  }
});

test('10. documentSubType / DOCUMENT_SUB_TYPE is fully removed -- not declared, not normalized, not read, not set from the UI', () => {
  const files = [
    ...listJsFiles('js/import-readiness').map((f) => `js/import-readiness/${f}`),
    'index.html',
  ];
  for (const file of files) {
    const source = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
    assert.ok(!/documentSubType/i.test(source), `unexpected documentSubType reference left in ${file}`);
    assert.ok(!/DOCUMENT_SUB_TYPE/.test(source), `unexpected DOCUMENT_SUB_TYPE reference left in ${file}`);
  }
});

test('11. no test file exercises documentSubType (it carried no real behavior and was removed rather than half-wired)', () => {
  for (const dir of ['tests/import-readiness', 'tests/readiness']) {
    for (const file of listJsFiles(dir)) {
      if (dir === 'tests/readiness' && file === 'professional-routing-quality-gate.test.js') continue;
      const source = readFileSync(new URL(`../../${dir}/${file}`, import.meta.url), 'utf8');
      assert.ok(!/documentSubType/i.test(source), `unexpected documentSubType reference left in ${dir}/${file}`);
    }
  }
});

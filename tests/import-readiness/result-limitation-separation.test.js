/**
 * UX correction (product-owner-authorized): the final limitation/
 * disclaimer sentence was previously rendered as a plain trailing
 * paragraph directly inside the same `.readiness-card` element as the
 * professional finding above it -- nothing in the markup or styling
 * distinguished it as separate from that finding. It is now its own
 * labeled, visually secondary "חשוב לדעת" section, still the very last
 * thing rendered, with wording completely unchanged. See
 * import-readiness-controller.js's renderResult() and this test file's
 * sibling, import-readiness-controller.test.js tests 23 and 37-41, for
 * the DOM-level assertions across every result state.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function html() {
  return readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
}

test('1. the .ir-result-limitations section has its own CSS rule, visually separated by a plain top border (no color-only warning/error styling)', () => {
  const source = html();
  assert.match(source, /\.ir-result-limitations\{[^}]*border-top:/, 'must have a visible separator from the content above it');
  const rule = source.match(/\.ir-result-limitations\{[^}]*\}/)[0];
  assert.ok(!/background:\s*(red|orange|yellow|#f00|#ff0)/i.test(rule), 'must not use alarming warning/error colors');
});

test('2. the .ir-result-limitations heading style exists and reuses the existing muted secondary-text color token (not a new ad-hoc color)', () => {
  const source = html();
  const rule = source.match(/\.ir-result-limitations h3\{[^}]*\}/);
  assert.ok(rule, 'heading style must exist');
  assert.match(rule[0], /color:var\(--text-secondary\)/);
});

test('3. no second CTA (link/button) is styled or scoped specifically to .ir-result-limitations', () => {
  const source = html();
  assert.ok(!new RegExp('\\.ir-result-limitations[^{]*(btn|cta)', 'i').test(source), 'the limitations section must never carry its own call-to-action styling');
});

test('4. the controller renders the limitations section with a semantic <section> tag and a real <h3> heading -- never a generic unlabeled <div>', () => {
  const controllerSrc = readFileSync(new URL('../../js/import-readiness/import-readiness-controller.js', import.meta.url), 'utf8');
  assert.match(controllerSrc, /el\(doc, 'section', \{ className: 'ir-result-limitations' \}\)/);
  assert.match(controllerSrc, /limitationsSection\.appendChild\(el\(doc, 'h3', \{ text: 'חשוב לדעת' \}\)\)/);
});

test('5. renderResult appends the limitations section as the very last operation on resultContainer (source-order proxy for DOM-order-last)', () => {
  const controllerSrc = readFileSync(new URL('../../js/import-readiness/import-readiness-controller.js', import.meta.url), 'utf8');
  const renderResultBody = controllerSrc.match(/function renderResult\([\s\S]*?\n\}\n/)[0];
  const lastAppend = [...renderResultBody.matchAll(/resultContainer\.appendChild\(([^;]*?)\);/g)].pop();
  assert.ok(lastAppend[1].includes('limitationsSection'), 'the limitations section must be the final resultContainer.appendChild call');
});

test('6. the disclaimer text constant itself is untouched by this PR (still the exact pre-existing sentence)', () => {
  const buildActionMapSrc = readFileSync(new URL('../../js/import-readiness/build-action-map.js', import.meta.url), 'utf8');
  assert.match(
    buildActionMapSrc,
    /'התוצאה היא הכוונה תפעולית ראשונית ואינה מהווה סיווג מכס, קביעה רגולטורית, ייעוץ משפטי או אישור יבוא\.'/,
  );
});

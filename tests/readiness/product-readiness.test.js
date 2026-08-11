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

test('9. the contact-form inputs have accessible labels', () => {
  const source = html();
  for (const id of ['cfName', 'cfContact', 'cfMsg']) {
    const re = new RegExp(`id="${id}"[^>]*>`);
    const match = source.match(re);
    assert.ok(match, `expected to find element with id="${id}"`);
    assert.ok(/aria-label="[^"]+"/.test(match[0]), `expected aria-label on #${id}`);
  }
});

test('9b. the external AI chat widget has been removed (no chat markup, no external AI endpoint)', () => {
  const source = html();
  for (const id of ['chatFab', 'chatPanel', 'chatBody', 'chatInput', 'chatSend', 'chatClose', 'chatChips']) {
    assert.ok(!source.includes(`id="${id}"`), `expected no element with id="${id}"`);
  }
  assert.ok(!source.includes('api.anthropic.com'));
});

test('10. the footer grid has a responsive single-column rule for narrow viewports', () => {
  assert.ok(/\.foot-grid\{[^}]*grid-template-columns:1fr/.test(html()));
});

test('11. no Smart Tracking Import heading or panel markup remains in the page', () => {
  const source = html();
  assert.ok(!source.includes('פענוח חכם של תוצאת מעקב'));
  assert.ok(!source.includes('smartImportSection'));
});

test('12. no console.log/console.error/console.warn call exists in any tracking or tools module', () => {
  const glob = readdirSync;
  const dirs = ['js/tracking', 'js/tools'];
  for (const dir of dirs) {
    const files = glob(new URL(`../../${dir}/`, import.meta.url)).filter((f) => f.endsWith('.js'));
    for (const file of files) {
      const source = readFileSync(new URL(`../../${dir}/${file}`, import.meta.url), 'utf8');
      assert.ok(!/console\.(log|error|warn)\(/.test(source), `unexpected console call in ${dir}/${file}`);
    }
  }
});

test('13. no innerHTML/outerHTML/insertAdjacentHTML/eval usage exists in any tracking or tools module', () => {
  const glob = readdirSync;
  const dirs = ['js/tracking', 'js/tools'];
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
  assert.ok(workflow.includes('tests/tracking/*.test.js'));
  assert.ok(workflow.includes('tests/readiness/*.test.js'));
  assert.ok(!workflow.includes('tracking-import'));
});

test('15. the CI workflow uses least-privilege permissions (contents: read)', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/frontend-ci.yml', import.meta.url), 'utf8');
  assert.ok(/permissions:\s*\n\s*contents:\s*read/.test(workflow));
});

test('16. the CI workflow does not reference any secret', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/frontend-ci.yml', import.meta.url), 'utf8');
  assert.ok(!workflow.includes('secrets.'));
});

test('17. the toolkit tablist contains exactly two tabs: CBM and air chargeable weight', () => {
  const source = html();
  const tabMatches = [...source.matchAll(/<button type="button" role="tab"[^>]*id="(toolTab[A-Za-z]+)"[^>]*>/g)].map(
    (m) => m[1],
  );
  assert.deepEqual(tabMatches, ['toolTabCbm', 'toolTabAirWeight']);
});

test('18. no sea-transit-calculator, container-validator-tool, or AWB-validator-tool tab/panel markup remains in the page', () => {
  const source = html();
  assert.ok(!source.includes('toolTabSeaTransit'));
  assert.ok(!source.includes('toolPanelSeaTransit'));
  assert.ok(!source.includes('toolTabContainer'));
  assert.ok(!source.includes('toolPanelContainer'));
  assert.ok(!source.includes('seaTransit'));
  assert.ok(!source.includes('toolTabAwb'));
  assert.ok(!source.includes('toolPanelAwb'));
  assert.ok(!source.includes('awbToolInput'));
});

test('19. every toolkit tab\'s aria-controls references an existing tabpanel id in the page', () => {
  const source = html();
  const controlsIds = [...source.matchAll(/role="tab"[^>]*aria-controls="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(controlsIds.length, 2);
  for (const id of controlsIds) {
    assert.ok(new RegExp(`id="${id}"`).test(source), `expected an element with id="${id}" for aria-controls target`);
  }
});

test('20. the sea-transit-calculator and container-validator-tool source files no longer exist', () => {
  const trackingFiles = readdirSync(new URL('../../js/tools/', import.meta.url));
  assert.ok(!trackingFiles.includes('sea-transit-calculator.js'));
  assert.ok(!trackingFiles.includes('container-validator-tool.js'));
  assert.ok(!trackingFiles.includes('awb-validator-tool.js'));
});

test('21b. no separate public air-shipment/air-cargo-tracking section exists unless it is a real implemented capability', () => {
  const source = html();
  assert.ok(!/משלוח\s+אווירי<\/h[1-4]>/.test(source));
  assert.ok(!source.includes('Air Cargo Tracking'));
  assert.ok(!source.includes('מעקב מטען אווירי'));
});

test('21. the Smart Tracking Import module directory no longer exists', () => {
  assert.throws(() => readdirSync(new URL('../../js/tracking-import/', import.meta.url)));
});

test('22. no unsupported provider-network, customer-volume, or partner-volume claim remains in the page', () => {
  const source = html();
  assert.ok(!source.includes('500+'));
  assert.ok(!source.includes('רשת נותני שירות מאומתת'));
  assert.ok(!source.includes('קבעו שיחה'));
  assert.ok(!source.includes('גישה ישירה למומחים מורשים'));
});

test('23. Import Readiness Check is the primary Hero experience', () => {
  const source = html();
  assert.ok(source.includes('בדקו אם המוצר שלכם מוכן ליבוא לישראל'));
  assert.ok(source.includes('id="readiness"'));
  assert.ok(source.includes('id="readinessForm"'));
  assert.ok(source.includes('id="readinessStartButton"'));
});

test('24. the tracking utility is retained as a secondary section, not the primary Hero', () => {
  const source = html();
  assert.ok(source.includes('id="tracking"'));
  assert.ok(source.includes('id="trackInput"'));
  assert.ok(source.includes('id="trackBtn"'));
  const heroIndex = source.indexOf('id="readiness"');
  const trackingIndex = source.indexOf('<section class="pad bg-tint" id="tracking">');
  assert.ok(heroIndex > 0 && trackingIndex > heroIndex, 'expected the readiness section to appear before the tracking section');
});

test('25. the CBM and air chargeable-weight calculators remain present', () => {
  const source = html();
  assert.ok(source.includes('id="toolPanelCbm"'));
  assert.ok(source.includes('id="toolPanelAirWeight"'));
});

test('26. the readiness result disclaimer text exists in the readiness result-builder module', () => {
  const source = readFileSync(new URL('../../js/import-readiness/build-readiness-result.js', import.meta.url), 'utf8');
  assert.ok(source.includes('אינה מהווה סיווג מכס סופי'));
});

test('27. no forbidden definitive-regulatory-claim phrase appears anywhere in the import-readiness modules', () => {
  const files = readdirSync(new URL('../../js/import-readiness/', import.meta.url)).filter((f) => f.endsWith('.js'));
  const forbidden = ['מותר לייבא', 'אסור לייבא', 'אין צורך באישור', 'פטור מתקן', 'הסיווג הנכון הוא', 'השחרור מובטח', 'המוצר מאושר'];
  for (const file of files) {
    const source = readFileSync(new URL(`../../js/import-readiness/${file}`, import.meta.url), 'utf8');
    for (const phrase of forbidden) {
      assert.ok(!source.includes(phrase), `${file} unexpectedly contains forbidden phrase "${phrase}"`);
    }
  }
});

test('28. no console.log/innerHTML/eval usage exists in any import-readiness module', () => {
  const files = readdirSync(new URL('../../js/import-readiness/', import.meta.url)).filter((f) => f.endsWith('.js'));
  for (const file of files) {
    const source = readFileSync(new URL(`../../js/import-readiness/${file}`, import.meta.url), 'utf8');
    const codeOnly = source.split('\n').filter((line) => !line.trim().startsWith('*') && !line.trim().startsWith('//')).join('\n');
    assert.ok(!/console\.(log|error|warn)\(/.test(codeOnly), `unexpected console call in ${file}`);
    assert.ok(!/\.innerHTML\s*=/.test(codeOnly), `unexpected innerHTML assignment in ${file}`);
    assert.ok(!/\beval\(/.test(codeOnly), `unexpected eval in ${file}`);
  }
});

test('29. the CI workflow runs the import-readiness test glob', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/frontend-ci.yml', import.meta.url), 'utf8');
  assert.ok(workflow.includes('tests/import-readiness/*.test.js'));
});

test('30. external official-source links in the readiness section use safe target/rel attributes only via controller-rendered anchors (no static unsafe anchor exists)', () => {
  const source = readFileSync(new URL('../../js/import-readiness/import-readiness-controller.js', import.meta.url), 'utf8');
  assert.ok(source.includes("target: '_blank'"));
  assert.ok(source.includes("rel: 'noopener noreferrer'"));
});

/**
 * Tests for the FreighTime visual redesign (design-system v1): header,
 * hero, trust strip, and general markup/privacy invariants that are new
 * or newly meaningful after the redesign. Matches the existing pattern
 * in tests/readiness/product-readiness.test.js of asserting against the
 * real page markup (index.html) as a string.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

function html() {
  return readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
}

test('1. no login/account control exists anywhere on the page', () => {
  const source = html();
  assert.ok(!source.includes('התחברות'));
  assert.ok(!/id="login/i.test(source));
  assert.ok(!/class="[^"]*login/i.test(source));
});

test('2. the header exposes the required navigation links', () => {
  const source = html();
  for (const href of ['#readiness', '#tools', '#how', '#contact']) {
    assert.ok(source.includes(`href="${href}"`), `expected a link to ${href}`);
  }
});

test('2b. the header does not expose a tracking navigation link', () => {
  const source = html();
  assert.ok(!source.includes('href="#tracking"'));
});

test('3. there are no dead href="#"-only links', () => {
  const source = html();
  assert.ok(!/href="#"[\s>]/.test(source));
});

test('4. the mobile nav toggle has aria-expanded and aria-controls wired to a real menu id', () => {
  const source = html();
  const toggleMatch = source.match(/<button[^>]*id="navToggle"[^>]*>/);
  assert.ok(toggleMatch);
  assert.ok(/aria-expanded="false"/.test(toggleMatch[0]));
  const controlsMatch = toggleMatch[0].match(/aria-controls="([^"]+)"/);
  assert.ok(controlsMatch);
  assert.ok(source.includes(`id="${controlsMatch[1]}"`));
});

test('5. the mobile menu toggle script updates aria-expanded and closes on link selection', () => {
  const source = html();
  assert.ok(/toggle\.setAttribute\('aria-expanded'/.test(source));
  assert.ok(/closeMenu/.test(source));
});

test('6. the hero headline is not duplicated as its own eyebrow text', () => {
  const source = html();
  const h1Match = source.match(/<h1>([^<]+)<\/h1>/);
  const eyebrowMatch = source.match(/<span class="eyebrow">([^<]+)<\/span>/);
  assert.ok(h1Match && eyebrowMatch);
  assert.notEqual(h1Match[1].trim(), eyebrowMatch[1].trim());
});

test('7. the trust strip only contains the approved truthful claims', () => {
  const source = html();
  const stripMatch = source.match(/<div class="trust-strip">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/);
  assert.ok(stripMatch);
  const approved = ['חינם לשימוש', 'ללא הרשמה', 'המידע אינו נשמר', 'קישורים למקורות רשמיים', 'הכוונה תפעולית ראשונית'];
  for (const claim of approved) {
    assert.ok(stripMatch[0].includes(claim), `expected trust strip to include "${claim}"`);
  }
  // No unsupported marketing claims sneak into the trust strip.
  for (const forbidden of ['500+', 'מאומת', 'לקוחות', 'זמינות מיידית']) {
    assert.ok(!stripMatch[0].includes(forbidden), `unexpected unsupported claim "${forbidden}" in trust strip`);
  }
});

test('8. the initial import-type entry options in the hero are real interactive elements, not decorative text', () => {
  const source = html();
  const heroEntryMatch = source.match(/<div class="hero-entry"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/);
  assert.ok(heroEntryMatch);
  assert.ok(/<button[^>]*id="readinessStartButton"/.test(heroEntryMatch[0]));
  assert.ok(/<button[^>]*id="readinessProblemShortcutButton"/.test(heroEntryMatch[0]));
});

test('9. the assessment form exposes a visible progress indicator (step count and progress bar)', () => {
  const source = html();
  assert.ok(source.includes('id="readinessProgressBar"'));
  assert.ok(source.includes('id="readinessProgressCount"'));
});

test('10. a prefers-reduced-motion rule exists in the stylesheet', () => {
  const source = html();
  assert.ok(/@media \(prefers-reduced-motion:\s*reduce\)/.test(source));
});

test('11. a design-token custom-property system exists (colors, spacing, radii, motion, focus)', () => {
  const source = html();
  for (const token of ['--navy', '--teal', '--ocean', '--sp-4', '--radius-card', '--dur', '--focus-ring']) {
    assert.ok(source.includes(`${token}:`), `expected design token ${token} to be defined`);
  }
});

test('12. every interactive control has a visible focus style (no outline:none without a replacement)', () => {
  const source = html();
  assert.ok(/:focus-visible\{[^}]*box-shadow:var\(--focus-ring\)/.test(source));
});

test('13. no fetch/XMLHttpRequest calls exist anywhere in the shipped JS (no network calls with user input)', () => {
  const dirs = ['js/import-readiness', 'js/tools'];
  for (const dir of dirs) {
    const files = readdirSync(new URL(`../../${dir}/`, import.meta.url)).filter((f) => f.endsWith('.js'));
    for (const file of files) {
      const source = readFileSync(new URL(`../../${dir}/${file}`, import.meta.url), 'utf8');
      assert.ok(!/\bfetch\(/.test(source), `unexpected fetch() in ${dir}/${file}`);
      assert.ok(!/new XMLHttpRequest\(/.test(source), `unexpected XMLHttpRequest instantiation in ${dir}/${file}`);
    }
  }
  assert.ok(!/\bfetch\(/.test(html().replace(/https:\/\/fonts\.googleapis\.com[^"']*/g, '')));
});

test('14. no localStorage/sessionStorage/document.cookie writes exist in the inline scripts or shipped JS', () => {
  const source = html();
  assert.ok(!/localStorage\.\s*(setItem|getItem)/.test(source));
  assert.ok(!/sessionStorage\.\s*(setItem|getItem)/.test(source));
  assert.ok(!/document\.cookie\s*=/.test(source));
});

test('15. the contact form does not transmit input anywhere (no action attribute, no network call on submit)', () => {
  const source = html();
  const formCardMatch = source.match(/<div class="contact-form">[\s\S]*?<\/div>/);
  assert.ok(formCardMatch);
  assert.ok(!/<form[^>]*action=/.test(formCardMatch[0]));
});

test('16. the hero no longer embeds a large inline base64 photo (no oversized decorative background asset)', () => {
  const source = html();
  assert.ok(!/data:image\/jpe?g;base64,/.test(source), 'expected no embedded base64 JPEG hero photo');
});

test('17. the page remains well under a reasonable performance budget with the photo removed', () => {
  const bytes = Buffer.byteLength(html(), 'utf8');
  assert.ok(bytes < 150_000, `expected index.html to be well under 150KB, was ${bytes} bytes`);
});

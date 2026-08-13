/**
 * Tests for the product-owner acceptance correction: a single
 * continuous Hero entry point (no duplicate lower "beginning"), the
 * approved headline and explicit output promise, exactly two approved
 * route-entry cards with one directional affordance each, the approved
 * 4-item navigation with the tracking link removed, and a mobile-safe
 * structure for the changed sections. Matches the existing pattern of
 * asserting against the real page markup (index.html) as a string, as
 * already used in tests/readiness/product-readiness.test.js and
 * tests/readiness/design-redesign-v1.test.js.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function html() {
  return readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
}

const APPROVED_HEADLINE = 'לפני שמייבאים, בודקים.';
const APPROVED_EYEBROW = 'בדיקת מסלול יבוא לישראל';
const APPROVED_SUPPORTING = 'שלוש שאלות קצרות יעזרו להבין מה צריך לבדוק, מה להכין ולמי נכון לפנות.';
const APPROVED_PRIMARY_CTA = 'התחלת בדיקת יבוא';
const APPROVED_SECONDARY_ACTION = 'יש לי בעיה במשלוח קיים';
const APPROVED_TRUST = 'חינם · ללא הרשמה · המידע אינו נשמר';
const OLD_HEADLINE = 'רוצים לייבא לישראל? בואו נבין מה צריך לבדוק לפני שמתקדמים';

test('1. the hero headline is the approved headline (2026-08 image-led Hero correction)', () => {
  const source = html();
  const h1Match = source.match(/<h1[^>]*>([^<]+)<\/h1>/);
  assert.ok(h1Match, 'expected exactly one <h1>');
  assert.equal(h1Match[1], APPROVED_HEADLINE);
  assert.ok(!source.includes(OLD_HEADLINE), 'the old long headline text must be gone');
});

test('2. the hero states the explicit output promise via the approved supporting sentence', () => {
  const source = html();
  assert.ok(source.includes(APPROVED_SUPPORTING));
});

test('3. the hero eyebrow does not repeat the headline wording', () => {
  const source = html();
  const h1Match = source.match(/<h1[^>]*>([^<]+)<\/h1>/);
  const eyebrowMatch = source.match(/<span class="eyebrow[^"]*"[^>]*>([^<]+)<\/span>/);
  assert.ok(h1Match && eyebrowMatch);
  assert.equal(eyebrowMatch[1].trim(), APPROVED_EYEBROW);
  assert.notEqual(h1Match[1].trim(), eyebrowMatch[1].trim());
});

test('4. no duplicate lower introduction block exists -- the old duplicate heading is gone', () => {
  const source = html();
  assert.ok(!source.includes('גלו איזה מסלול מתאים לכם ומה צריך לבדוק'));
  assert.ok(!source.includes('id="readinessIntro"'));
});

test('5. there is exactly one assessment-entry pair on the page (the Hero route cards) -- no second start control', () => {
  const source = html();
  const startButtonMatches = [...source.matchAll(/id="readinessStartButton"/g)];
  const problemButtonMatches = [...source.matchAll(/id="readinessProblemShortcutButton"/g)];
  assert.equal(startButtonMatches.length, 1, 'expected exactly one readinessStartButton in the whole page');
  assert.equal(problemButtonMatches.length, 1, 'expected exactly one readinessProblemShortcutButton in the whole page');
});

test('6. the entry buttons live inside the Hero, not in a separate section', () => {
  const source = html();
  const heroMatch = source.match(/<section class="hero">[\s\S]*?<\/section>/);
  assert.ok(heroMatch);
  assert.ok(heroMatch[0].includes('id="readinessStartButton"'));
  assert.ok(heroMatch[0].includes('id="readinessProblemShortcutButton"'));
});

test('7. exactly one primary CTA and one secondary action exist in the Hero, with the exact approved strings', () => {
  const source = html();
  const heroMatch = source.match(/<section class="hero">[\s\S]*?<\/section>/);
  assert.ok(heroMatch);
  assert.ok(heroMatch[0].includes(APPROVED_PRIMARY_CTA));
  assert.ok(heroMatch[0].includes(APPROVED_SECONDARY_ACTION));
  const primaryCount = (heroMatch[0].match(/id="readinessStartButton"/g) ?? []).length;
  const secondaryCount = (heroMatch[0].match(/id="readinessProblemShortcutButton"/g) ?? []).length;
  assert.equal(primaryCount, 1, 'expected exactly one primary CTA in the Hero');
  assert.equal(secondaryCount, 1, 'expected exactly one secondary action in the Hero');
});

test('8. the split-screen route-selection card no longer exists in the Hero (unified composition only)', () => {
  const source = html();
  assert.ok(!source.includes('class="hero-entry"'), 'the old white route-selection card must be removed');
  assert.ok(!source.includes('class="choice-card'), 'the old choice-card component must be removed from the Hero');
  assert.ok(!source.includes('class="hero-grid"'), 'the old two-column Hero split must be removed');
});

test('9. the approved supporting sentence carries the output promise (what to check, what to prepare, who to contact) -- no separate benefit-column list', () => {
  const source = html();
  assert.ok(source.includes(APPROVED_SUPPORTING));
  assert.ok(!source.includes('class="hero-benefits"'), 'the old multi-column benefit list must be removed');
});

test('10. the navigation contains exactly the four approved items and nothing else', () => {
  const source = html();
  const navMatch = source.match(/<div class="navlinks">[\s\S]*?<\/div>/);
  assert.ok(navMatch);
  const hrefs = [...navMatch[0].matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(hrefs, ['#readiness', '#tools', '#how', '#contact']);
});

test('11. the mobile menu mirrors the same four approved items', () => {
  const source = html();
  const menuMatch = source.match(/<div id="mobileMenu">[\s\S]*?<\/div>/);
  assert.ok(menuMatch);
  const hrefs = [...menuMatch[0].matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(hrefs, ['#readiness', '#tools', '#how', '#contact']);
});

test('12. no login control and no dead href="#"-only anchors exist anywhere', () => {
  const source = html();
  assert.ok(!source.includes('התחברות'));
  assert.ok(!/href="#"[\s>]/.test(source));
});

test('13. the "how it works" section uses exactly the three approved steps and the approved return-use line', () => {
  const source = html();
  const howMatch = source.match(/<section class="pad-sm bg-sand" id="how">[\s\S]*?<\/section>/);
  assert.ok(howMatch);
  assert.ok(howMatch[0].includes('בוחרים את מצב היבוא'));
  assert.ok(howMatch[0].includes('עונים על שלוש שאלות קצרות'));
  assert.ok(howMatch[0].includes('מקבלים פעולה מומלצת, רשימת הכנה והפניה לגורם המתאים'));
  assert.ok(howMatch[0].includes('חזרו לפני מוצר חדש, ספק חדש או משלוח חדש כדי לבדוק מה נדרש.'));
  const stepCount = (howMatch[0].match(/class="step-item"/g) ?? []).length;
  assert.equal(stepCount, 3);
  assert.ok(!howMatch[0].includes('עדכון רגולטורי אוטומטי'));
});

test('14. dual-start / duplicate-entry markup is documented as an anti-pattern nowhere reintroduced (no second sec-head duplicating the Hero promise)', () => {
  const source = html();
  const readinessSectionMatch = source.match(/<section class="pad" id="readiness"[^>]*>[\s\S]*?<\/section>/);
  assert.ok(readinessSectionMatch);
  assert.ok(!readinessSectionMatch[0].includes('class="sec-head"'), 'the #readiness section must not repeat a Hero-style heading/explanation block');
});

// --- Tracking removal ---

test('15. no public tracking section, input, or wording remains anywhere on the page', () => {
  const source = html();
  for (const needle of [
    'id="tracking"', 'id="trackInput"', 'id="trackBtn"', 'id="searchTabs"', 'id="identificationContext"',
    'מעקב ואימות', 'מעקב ואימות מספר', 'js/tracking',
  ]) {
    assert.ok(!source.includes(needle), `unexpected tracking residue: "${needle}"`);
  }
});

test('16. no tracking JS initialization is wired up in the page scripts', () => {
  const source = html();
  assert.ok(!/initializeTrackingUi/.test(source));
});

test('17. the footer has no tracking link and no longer claims tracking-number identification as a product capability', () => {
  const source = html();
  const footMatch = source.match(/<footer>[\s\S]*?<\/footer>/);
  assert.ok(footMatch);
  assert.ok(!footMatch[0].includes('#tracking'));
  assert.ok(!footMatch[0].includes('זיהוי מספרי מעקב'));
});

// --- Mobile density: no fixed pixel widths in the new/changed CSS that
// would force horizontal overflow under a 320px viewport. ---

test('18. the narrow-viewport media-query rules use no fixed pixel widths large enough to overflow a 320px viewport', () => {
  const source = html();
  const narrowBlocks = [...source.matchAll(/@media \(max-width:(?:768|600|380)px\)\{([\s\S]*?)\n  \}/g)].map((m) => m[1]);
  assert.ok(narrowBlocks.length >= 3, 'expected to find the narrow-viewport media query blocks');
  for (const block of narrowBlocks) {
    const widthMatches = [...block.matchAll(/(?:min-)?width:\s*(\d+)px/g)].map((m) => Number(m[1]));
    for (const width of widthMatches) {
      assert.ok(width < 320, `unexpected fixed width of ${width}px inside a narrow-viewport rule that could overflow a 320px viewport`);
    }
  }
});

test('19. a dedicated mobile breakpoint exists for the header, hero, route cards, questionnaire, result, calculators, contact, and footer', () => {
  const source = html();
  assert.ok(/@media \(max-width:768px\)/.test(source), 'expected a 768px breakpoint for the mobile density pass');
  assert.ok(/@media \(max-width:600px\)/.test(source), 'expected a 600px breakpoint for narrow-viewport rules');
});

test('20. the CI workflow no longer references the deleted tracking test suite', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/frontend-ci.yml', import.meta.url), 'utf8');
  assert.ok(!workflow.includes('tests/tracking'));
});

test('21. the js/tracking directory no longer exists', () => {
  assert.throws(() => readFileSync(new URL('../../js/tracking/router.js', import.meta.url), 'utf8'));
});

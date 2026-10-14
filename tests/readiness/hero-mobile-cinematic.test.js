/**
 * Mobile Hero: "scroll-driven cinematic-to-functional" layout
 * (product-owner decision, 2026-10-14).
 *
 * On narrow screens (max-width 980px, and tall enough to hold it --
 * min-height 520px) the first screen is the globe with the
 * illustrative posts at full viewport height, and the action column
 * (headline + Composer) starts exactly at the fold. As the user
 * scrolls, the globe stage stays sticky behind and recedes to a
 * watermark (opacity 0.25) while the action panel slides up over it.
 * Desktop is untouched.
 *
 * Opacity only, never a scale: js/hero/hero-globe.js sizes its canvas
 * from getBoundingClientRect(), which includes ancestor transforms, so
 * a scaled stage would make a mid-scroll resize (e.g. the mobile
 * address bar collapsing) redraw the globe at the wrong size.
 *
 * Supersedes the 2026-10-13 mobile rule "action column first, above
 * the fold" (DESIGN_SYSTEM_V1.md §3). The DOM order stays copy-first,
 * so screen-reader and keyboard order still reach the content first;
 * only the visual order changes on mobile.
 *
 * Pure Node: reads index.html and js/hero/hero-scroll.js as text.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url);
const html = () => readFileSync(new URL('index.html', ROOT), 'utf8');
const scrollScript = () => readFileSync(new URL('js/hero/hero-scroll.js', ROOT), 'utf8');

const CINEMATIC_QUERY = '@media (max-width:980px) and (min-height:520px)';

/** The body of the one cinematic media block (balanced braces). */
function cinematicBlock(source) {
  const start = source.indexOf(`${CINEMATIC_QUERY}{`);
  assert.ok(start !== -1, `expected a "${CINEMATIC_QUERY}" block in index.html`);
  let depth = 0;
  for (let i = source.indexOf('{', start); i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(source.indexOf('{', start) + 1, i);
    }
  }
  throw new Error('unbalanced cinematic block');
}

/** The declarations of the first `selector{...}` rule inside `css`. */
function rule(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|[\\s}])${escaped}\\{([^}]*)\\}`));
  assert.ok(match, `expected a "${selector}" rule`);
  return match[1];
}

test('1. there is exactly one cinematic block, scoped to narrow and tall-enough screens', () => {
  const source = html();
  assert.equal(source.split(`${CINEMATIC_QUERY}{`).length - 1, 1);
});

test('2. first screen: the globe stage comes first visually, sticks under the header, and fills the viewport below it', () => {
  const css = cinematicBlock(html());
  const stage = rule(css, '.hero-stage');
  assert.match(stage, /order:-1/);
  assert.match(stage, /position:sticky/);
  assert.match(stage, /top:var\(--hero-header-h\)/);
  // 100vh first as the fallback, then 100svh so the mobile address bar never pushes the panel above the fold
  assert.match(stage, /height:calc\(100vh - var\(--hero-header-h\)\);\s*height:calc\(100svh - var\(--hero-header-h\)\)/);
  assert.match(css, /:root\{\s*--hero-header-h:76px;?\s*\}/, 'header height matches nav.nav (76px)');
  assert.match(css, /@media \(max-width:768px\)\{\s*:root\{\s*--hero-header-h:64px;?\s*\}\s*\}/, 'and 64px where the header shrinks');
});

test('3. nothing pushes the action panel off the fold: no top padding, no gap between stage and panel', () => {
  const css = cinematicBlock(html());
  assert.match(rule(css, '.hero-content'), /padding-block-start:0/);
  assert.match(rule(css, '.hero-layout'), /row-gap:0/);
});

test('4. sticky works: the Hero clips without becoming a scroll container (overflow:clip, not hidden)', () => {
  const css = cinematicBlock(html());
  assert.match(rule(css, '.hero'), /overflow:clip/);
});

test('5. the action panel slides up over the stage: above it in z-order, on a translucent sheet', () => {
  const css = cinematicBlock(html());
  const copy = rule(css, '.hero-copy');
  assert.match(copy, /position:relative/);
  assert.match(copy, /z-index:3/);
  assert.match(copy, /background:rgba\(/);
  assert.match(copy, /backdrop-filter:blur\(/);
});

test('6. the stage recedes to a 20-30% watermark (opacity only, never a transform), driven by scrolling the panel into view', () => {
  const css = cinematicBlock(html());
  const keyframes = css.match(/@keyframes hero-recede\{([\s\S]*?)\}\s*\}/);
  assert.ok(keyframes, 'expected @keyframes hero-recede');
  const opacity = Number(keyframes[1].match(/opacity:([\d.]+)/)[1]);
  assert.ok(opacity >= 0.2 && opacity <= 0.3, `recede opacity ${opacity} must be 0.2-0.3`);
  assert.ok(!/transform|scale/.test(keyframes[1]), 'no transform: the globe canvas measures itself with getBoundingClientRect()');
  const supports = css.match(/@supports \(animation-timeline: view\(\)\)\{([\s\S]*?)\n    \}/);
  assert.ok(supports, 'expected the CSS scroll-driven path inside @supports');
  assert.match(supports[1], /\.hero-layout\{[^}]*timeline-scope:--hero-panel/);
  assert.match(supports[1], /\.hero-copy\{[^}]*view-timeline:--hero-panel block/);
  assert.match(supports[1], /\.hero-stage\{[^}]*animation:hero-recede linear both/);
  assert.match(supports[1], /\.hero-stage\{[^}]*animation-timeline:--hero-panel/);
});

test('7. browsers without scroll timelines get the same recede from a CSS variable the fallback script sets', () => {
  const css = cinematicBlock(html());
  const fallback = css.match(/@supports not \(animation-timeline: view\(\)\)\{([\s\S]*?)\n    \}/);
  assert.ok(fallback, 'expected the fallback path inside @supports not');
  assert.match(fallback[1], /opacity:calc\(1 - 0\.75 \* var\(--hero-recede, 0\)\)/);
  assert.ok(!/transform|scale/.test(fallback[1]), 'no transform in the fallback either');
});

test('8. reduced motion: the recede is a scroll-linked fade with no movement, so it stays on; nothing in the block adds motion', () => {
  const css = cinematicBlock(html());
  assert.ok(!/transition:/.test(css), 'the cinematic block adds no time-based transition');
  // the only transforms allowed: centring the globe canvas, and the scroll hint's
  // limited bounce (test 14) -- never on the stage itself
  const withoutAllowed = css
    .replace(/\.hero-globe\{[^}]*\}/, '')
    .replace(/@keyframes hero-hint-bounce\{[\s\S]*?\}\s*\}/, '');
  assert.ok(!/transform:|scale\(/.test(withoutAllowed), 'no transform except the globe centring and the hint bounce');
});

test('9. the fallback script is local, deferred, and only runs where the CSS path is missing and the cinematic query matches', () => {
  const source = html();
  assert.match(source, /<script src="js\/hero\/hero-scroll\.js" defer><\/script>/);
  const js = scrollScript();
  assert.match(js, /CSS\.supports\('animation-timeline: view\(\)'\)/);
  assert.ok(js.includes(`matchMedia('(max-width:980px) and (min-height:520px)')`), 'the script must use the same query as the CSS');
  assert.match(js, /addEventListener\('scroll', [^)]*\{ passive: true \}\)/);
  assert.match(js, /requestAnimationFrame/);
  assert.match(js, /setProperty\('--hero-recede'/);
});

test('10. the fallback script makes no network request, reads no input and stores nothing', () => {
  const js = scrollScript();
  for (const banned of ['fetch(', 'XMLHttpRequest', 'localStorage', 'sessionStorage', 'document.cookie', '.value', 'import ']) {
    assert.ok(!js.includes(banned), `hero-scroll.js must not use ${banned}`);
  }
});

test('11. desktop is untouched: the base Hero rules are exactly as before', () => {
  const source = html();
  assert.ok(source.includes('.hero-stage{ position:relative; width:100%; aspect-ratio:1 / 1; overflow:hidden; }'));
  assert.ok(source.includes('position:relative; overflow:hidden; color:#fff;\n    min-height:600px; display:flex; align-items:center;'));
  assert.match(source, /\.hero-layout\{\s*display:grid; grid-template-columns:minmax\(0, 1fr\) minmax\(0, 1\.1fr\);/);
  // every new cinematic hook lives inside the mobile block, never in a desktop rule
  const outside = source.replace(cinematicBlock(source), '');
  for (const hook of ['hero-recede', '--hero-header-h', 'view-timeline', 'timeline-scope', 'overflow:clip', 'order:-1']) {
    assert.ok(!outside.includes(hook), `"${hook}" must only appear inside the mobile cinematic block`);
  }
});

// -- Scroll hint (product-owner decision, 2026-10-14) --

test('12. a decorative scroll hint sits inside the stage: hidden from assistive tech, never focusable, label "גללו לחיפוש"', () => {
  const source = html();
  const stage = source.match(/<div class="hero-stage">([\s\S]*?)\n      <\/div>/);
  assert.ok(stage, 'expected the .hero-stage markup');
  const hint = stage[1].match(/<div class="hero-scroll-hint" aria-hidden="true">([\s\S]*?)<\/div>/);
  assert.ok(hint, 'expected an aria-hidden .hero-scroll-hint inside the stage');
  assert.match(hint[1], /גללו לחיפוש/);
  assert.match(hint[1], /<svg[^>]*aria-hidden="true"/);
  assert.ok(!/<a |<button|tabindex/.test(hint[1]), 'the hint is not interactive');
});

test('13. the hint is mobile-only: hidden by default, shown only inside the cinematic block, beside the pause button and clear of the posts', () => {
  const source = html();
  const css = cinematicBlock(source);
  const outside = source.replace(css, '');
  assert.match(outside, /\.hero-scroll-hint\{[^}]*display:none/, 'hidden outside the cinematic layout (desktop, short landscape)');
  const hint = rule(css, '.hero-scroll-hint');
  assert.match(hint, /display:flex/);
  assert.match(hint, /position:absolute/);
  assert.match(hint, /bottom:/);
  assert.match(hint, /pointer-events:none/);
});

test('14. the hint appears once the posts have landed and bounces a fixed number of times, never infinitely', () => {
  const css = cinematicBlock(html());
  assert.match(rule(css, '.hero-scroll-hint-inner'), /opacity:0/);
  const entrance = css.match(/\.hero-posts-in \.hero-scroll-hint-inner\{([^}]*)\}/);
  assert.ok(entrance, 'expected the entrance rule tied to .hero-posts-in');
  assert.match(entrance[1], /animation:hero-hint-in [^,;]*both, hero-hint-bounce [^,;]* 3;/);
  assert.ok(!/infinite/.test(css), 'nothing in the cinematic block animates infinitely');
  assert.match(css, /@keyframes hero-hint-bounce\{/);
});

test('15. the hint fades out fully as the panel rises, on the same recede logic as the stage (CSS timeline or --hero-recede)', () => {
  const css = cinematicBlock(html());
  const supports = css.match(/@supports \(animation-timeline: view\(\)\)\{([\s\S]*?)\n    \}/);
  assert.match(supports[1], /\.hero-scroll-hint\{[^}]*animation:hero-hint-out linear both;[^}]*animation-timeline:--hero-panel;[^}]*animation-range:entry 0% entry 25%/);
  assert.match(css, /@keyframes hero-hint-out\{\s*to\{\s*opacity:0;?\s*\}\s*\}/);
  const fallback = css.match(/@supports not \(animation-timeline: view\(\)\)\{([\s\S]*?)\n    \}/);
  assert.match(fallback[1], /\.hero-scroll-hint\{[^}]*opacity:max\(0, calc\(1 - 4 \* var\(--hero-recede, 0\)\)\)/);
});

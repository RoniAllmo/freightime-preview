/**
 * Tests for the Hero globe redesign (product-owner decision, 2026-10),
 * updated for the two-column precision pass (2026-10-13): an action
 * column with the Composer, and a visual column with the globe, the
 * plane on a fixed route with a route line and Israel marked as the
 * destination, and four illustrative questions. Hotfix 2026-10-13: the
 * fourth post is no longer cut off at the edge; all four are fully
 * visible at every width. String assertions against index.html and the shipped
 * scripts, plus a small fake-DOM run of the Composer script.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import vm from 'node:vm';

const read = (rel) => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');
const html = () => read('index.html');
const heroSection = () => {
  const match = html().match(/<section class="hero">[\s\S]*?<\/section>/);
  assert.ok(match, 'expected to find the <section class="hero"> block');
  return match[0];
};
const globeScript = () => read('js/hero/hero-globe.js');
const composerScript = () => read('js/hero/hero-composer.js');

const APPROVED_POSTS = [
  ['ליטל מלמד', "הזמנתי באינטרנט 100 יחידות של לק ג'ל והכל תקוע במכס, מישהו יודע מה הבעיה?"],
  ['איציק עובדיה', 'המוביל גרם לי לנזק למכולה בזמן הטעינה בנמל. הוא מאשים את המנופאי בנמל! יש לי נזק של מאות אלפי שקלים! מה לעשות?'],
  ['אריק שאולוב', 'אני רוצה לייבא מטענים ניידים לאייפונים. זה יתקע במכס?'],
  ['זיו ישראל', 'אני במשא ומתן עם יצרן בסין. הוא דורש ממני לעשות את המשלוחים בתנאים של סיף, שהוא בוחר את המוביל. מרגיש שהוא מנסה לעקוץ אותי. מה עושים?'],
];
const COMPOSER_PLACEHOLDER = 'איזה מוצר ברצונכם לייבא? פרטו את סוג המוצר או את נושא הבדיקה...';
const APPROVED_ANSWER_LINE = 'מכירים את השאלות האלה? כאן מתחילים לקבל עליהן תשובה.';
const VENDOR_FILES = [
  'assets/vendor/d3-array.min.js',
  'assets/vendor/d3-geo.min.js',
  'assets/vendor/topojson-client.min.js',
  'assets/vendor/world-land-110m.js',
];

test('1. the Hero contains the globe canvas with an accessible description', () => {
  const hero = heroSection();
  assert.ok(/<canvas class="hero-globe" role="img" aria-label="[^"]+"><\/canvas>/.test(hero));
});

test('2. the Hero contains exactly four approved illustrative posts in order, each with comment and like counts; the supplier-search post is gone', () => {
  const hero = heroSection();
  const posts = [...hero.matchAll(/<li class="hero-post( hero-post-partial)?">([\s\S]*?)<\/li>/g)];
  assert.equal(posts.length, APPROVED_POSTS.length);
  posts.forEach(([, partial, post], i) => {
    const [name, text] = APPROVED_POSTS[i];
    assert.ok(post.includes(`<strong>${name}</strong>`), `post ${i + 1} name`);
    assert.ok(post.includes(`<p>${text}</p>`), `post ${i + 1} text`);
    assert.ok(/\d+ תגובות/.test(post), `post ${i + 1} comment count`);
    assert.ok(/<\/svg>\d+<span class="visually-hidden"> לייקים<\/span>/.test(post), `post ${i + 1} like count`);
    // The fourth post keeps its old `hero-post-partial` class in the markup,
    // but no CSS targets it any more (see test 17).
    assert.equal(Boolean(partial), i === 3, 'only the fourth post carries the legacy class');
  });
  assert.ok(!hero.includes('אורי לוי'), 'the supplier-search post is outside the product scope (product-owner decision 2026-10-13)');
  assert.ok(!hero.includes('ספקים או יצרנים'));
});

test('3. the posts are labelled as illustrative examples, and carry no social-network logo or brand name', () => {
  const hero = heroSection();
  assert.ok(hero.includes('aria-label="שאלות של יבואנים, דוגמאות להמחשה"'));
  assert.ok(hero.includes('>דוגמאות להמחשה<'));
  for (const brand of ['facebook', 'instagram', 'פייסבוק', 'אינסטגרם']) {
    assert.ok(!hero.toLowerCase().includes(brand), `unexpected brand reference "${brand}" in the Hero`);
  }
});

test('4. the approved answer line sits in the Hero copy, before the Composer', () => {
  const hero = heroSection();
  const answerAt = hero.indexOf(`<p class="hero-answer">${APPROVED_ANSWER_LINE}</p>`);
  assert.ok(answerAt > 0);
  assert.ok(answerAt < hero.indexOf('class="hero-composer'));
});

test('5. no replay control was shipped (it existed only in the prototype)', () => {
  const hero = heroSection();
  assert.ok(!hero.includes('הצג שוב'));
  assert.ok(!/class="[^"]*replay/.test(hero));
});

test('6. every script the page loads is a local file; the globe dependencies exist on disk with their license notices', () => {
  const source = html();
  const srcs = [...source.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  // hero-scroll.js: the mobile recede fallback (2026-10-14)
  const heroScripts = ['js/hero/hero-globe.js', 'js/hero/hero-composer.js', 'js/hero/hero-scroll.js'];
  assert.deepEqual(srcs, [...VENDOR_FILES, ...heroScripts]);
  for (const file of [...VENDOR_FILES, ...heroScripts]) {
    assert.ok(statSync(new URL(`../../${file}`, import.meta.url)).isFile(), `${file} missing`);
  }
  const licenses = read('assets/vendor/LICENSES.md');
  for (const name of ['d3-array', 'd3-geo', 'topojson-client', 'world-atlas']) {
    assert.ok(licenses.includes(name), `license notice for ${name} missing`);
  }
});

test('7. the globe dependencies are deferred so they never block the assessment entry', () => {
  const source = html();
  for (const file of [...VENDOR_FILES, 'js/hero/hero-globe.js', 'js/hero/hero-composer.js']) {
    assert.ok(source.includes(`<script src="${file}" defer></script>`), `${file} is not deferred`);
  }
});

test('8. the globe script makes no network request, reads no form input and stores nothing', () => {
  const script = globeScript();
  for (const pattern of [/\bfetch\(/, /XMLHttpRequest/, /sendBeacon/, /WebSocket/, /localStorage/, /sessionStorage/, /indexedDB/, /document\.cookie/]) {
    assert.ok(!pattern.test(script), `unexpected ${pattern} in hero-globe.js`);
  }
  assert.ok(!/\.value\b/.test(script), 'the globe script must not read input values');
});

test('9. the land data is loaded as a local global, not fetched', () => {
  const data = read('assets/vendor/world-land-110m.js');
  assert.ok(data.startsWith('/*'));
  assert.ok(/window\.FREIGHTIME_WORLD_LAND_110M = \{"type":"Topology"/.test(data));
  assert.ok(globeScript().includes('window.FREIGHTIME_WORLD_LAND_110M'));
});

test('10. the globe script flies the approved fixed route', () => {
  const script = globeScript();
  const names = [...script.matchAll(/\{ name: '([^']+)', at: \[/g)].map((m) => m[1]);
  assert.deepEqual(names, ['Tel Aviv', 'Madrid', 'New York', 'Los Angeles', 'Tokyo', 'Mumbai']);
  assert.ok(script.includes('const STOPS = [0, 1, 2, 3, 4, 5, 0];'));
});

test('11. the Hero opens on the globe alone for 2.0s (product-owner decision, 2026-10-15); the questions are all in place within another 1.5s', () => {
  assert.ok(/const POSTS_AT_MS = 2000;/.test(globeScript()));
  const source = html();
  const delays = [1, 2, 3, 4].map((n) => {
    const m = source.match(new RegExp(`\\.hero-post:nth-child\\(${n}\\)\\{[^}]*transition-delay:([\\d.]+)s;`));
    assert.ok(m, `delay for post ${n}`);
    return Number(m[1]);
  });
  assert.deepEqual(delays, [0, 0.3, 0.6, 0.9]);
  const duration = source.match(/\.hero-post\{[^}]*transition:transform ([\d.]+)s/);
  assert.ok(duration && delays[3] + Number(duration[1]) <= 1.5, 'last post lands within 1.5s');
});

test('12. reduced motion: the globe keeps turning slowly, the posts show at once; CSS drops the transitions and the CTA pulse', () => {
  const script = globeScript();
  assert.ok(/prefers-reduced-motion: reduce/.test(script));
  assert.ok(/const SPEED = reduceMotion \? 0\.35 : 1;/.test(script));
  assert.ok(/if \(reduceMotion\) showPosts\(\);/.test(script));
  const source = html();
  const block = source.match(/@media \(prefers-reduced-motion: reduce\)\{\s*\.hero-anim\{[^}]*\}([\s\S]*?)\n  \}/);
  assert.ok(block);
  assert.ok(/\.hero-post, \.hero-globe, \.hero p\.hero-answer, \.hero-demo-note\{ transition:none; \}/.test(block[1]));
  assert.ok(/\.hero-posts-in #readinessStartButton\{ animation:none; \}/.test(block[1]));
});

test('13. the globe only animates while the Hero is on screen', () => {
  assert.ok(/new IntersectionObserver\(/.test(globeScript()));
});

test('14. if the map libraries are missing, the globe is skipped and the posts still appear', () => {
  const script = globeScript();
  assert.ok(/if \(!d3 \|\| !d3\.geoOrthographic \|\| !topojson \|\| !landTopo \|\| !ctx\) \{[\s\S]*?canvas\.hidden = true;[\s\S]*?showPosts/.test(script));
});

test('15. the CTA pulse runs a fixed number of times, never infinitely', () => {
  const source = html();
  const rule = source.match(/\.hero-posts-in #readinessStartButton\{ animation:hero-cta-pulse ([^;]+);/);
  assert.ok(rule);
  assert.ok(!/infinite/.test(rule[1]));
  assert.ok(/ 2$/.test(rule[1].trim()));
});

test('16. a pause/play button stops the globe (WCAG 2.2.2), with a 44px target and an accessible state', () => {
  const hero = heroSection();
  assert.ok(/<button type="button" class="hero-globe-toggle" aria-pressed="false" aria-label="עצירת האנימציה">/.test(hero));
  const source = html();
  assert.ok(/\.hero-globe-toggle\{[^}]*width:44px; height:44px;/.test(source));
  assert.ok(/\.hero-globe-toggle\{[^}]*bottom:2%; right:2%;/.test(source), 'pause button in the bottom-right corner, clear of the fourth post');
  const script = globeScript();
  assert.ok(script.includes("toggle.setAttribute('aria-pressed', String(paused));"));
  assert.ok(/if \(paused\) \{ running = false;/.test(script));
});

test('17. all four posts sit fully inside the globe column (hotfix 2026-10-13): odd ones on the right, even ones on the left, none pushed past an edge or masked (no carousel)', () => {
  const script = globeScript();
  assert.ok(!/setInterval\(/.test(script), 'no post carousel timer');
  assert.ok(!/is-current|is-leaving/.test(script + html()), 'no carousel state classes');
  const source = html();
  assert.ok(/\.hero-stage\{[^}]*overflow:hidden;/.test(source), 'the stage still clips, so the slide-in starts at its edge');
  assert.ok(/\.hero-post:nth-child\(odd\)\{ right:1\.5%; --from:60vw; \}/.test(source));
  assert.ok(/\.hero-post:nth-child\(even\)\{ left:1\.5%; --from:-60vw; \}/.test(source));
  assert.ok(!/\.hero-post-partial[^{]*\{/.test(source), 'no CSS rule cuts off or masks the fourth post');
  assert.ok(!/\.hero-post[^{]*\{[^}]*mask-image/.test(source), 'no post is masked');
  const postRules = [...source.matchAll(/\.hero-post[^{]*\{([^}]*)\}/g)].map((m) => m[1]).join('\n');
  assert.ok(!/(?:left|right):\s*-/.test(postRules), 'no post is positioned past the stage edge');
});

test('18. the Composer: a labelled one-row description field with the approved placeholder, and the primary CTA "בואו נבדוק" inside it', () => {
  const hero = heroSection();
  const composer = hero.match(/<div class="hero-composer[^"]*"[^>]*>([\s\S]*?)<\/div>/);
  assert.ok(composer, 'expected the Composer');
  const body = composer[1];
  assert.ok(body.includes('<label class="visually-hidden" for="heroComposerInput">'));
  assert.ok(body.includes(`placeholder="${COMPOSER_PLACEHOLDER}"`));
  assert.ok(/<textarea id="heroComposerInput"[^>]*rows="1"[^>]*maxlength="200"/.test(body));
  assert.ok(/<button type="button" class="btn btn-primary btn-lg" id="readinessStartButton">בואו נבדוק<\/button>/.test(body));
  assert.ok(!body.includes('readinessProblemShortcutButton'), 'the secondary action stays outside the Composer');
});

function runComposer({ text, productField = true }) {
  const listeners = {};
  const make = (id) => ({
    id,
    value: '',
    events: [],
    addEventListener(type, fn) { (listeners[`${id}:${type}`] ||= []).push(fn); },
    dispatchEvent(event) { this.events.push(event.type); return true; },
    click() { for (const fn of listeners[`${id}:click`] || []) fn({ type: 'click' }); },
  });
  const elements = {
    heroComposerInput: Object.assign(make('heroComposerInput'), { value: text }),
    readinessStartButton: make('readinessStartButton'),
    irProductName: productField ? make('irProductName') : null,
  };
  const context = {
    document: { getElementById: (id) => elements[id] ?? null },
    Event: class { constructor(type) { this.type = type; } },
  };
  vm.runInNewContext(composerScript(), context);
  return { elements, listeners };
}

test('19. clicking "בואו נבדוק" copies the trimmed Composer text into #irProductName and fires an input event; an empty Composer leaves the field alone', () => {
  const filled = runComposer({ text: '  מטענים ניידים לאייפון  ' });
  filled.elements.readinessStartButton.click();
  assert.equal(filled.elements.irProductName.value, 'מטענים ניידים לאייפון');
  assert.deepEqual(filled.elements.irProductName.events, ['input']);

  const empty = runComposer({ text: '   ' });
  empty.elements.readinessStartButton.click();
  assert.equal(empty.elements.irProductName.value, '');
  assert.deepEqual(empty.elements.irProductName.events, []);

  const noField = runComposer({ text: 'x', productField: false });
  assert.doesNotThrow(() => noField.elements.readinessStartButton.click());
});

test('20. Enter in the Composer triggers the CTA (not while an IME composition is active)', () => {
  const run = runComposer({ text: 'לק ג׳ל' });
  let prevented = 0;
  const keydown = run.listeners['heroComposerInput:keydown'][0];
  keydown({ key: 'Enter', isComposing: true, preventDefault() { prevented += 1; } });
  assert.equal(run.elements.irProductName.value, '');
  keydown({ key: 'Enter', isComposing: false, preventDefault() { prevented += 1; } });
  assert.equal(prevented, 1);
  assert.equal(run.elements.irProductName.value, 'לק ג׳ל');
});

test('21. the Composer script stays a thin hand-off: no network, no storage, and it does not import or touch the assessment engine', () => {
  // Code only: the header comment is allowed to name the controller it hands off to.
  const script = composerScript().replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  for (const pattern of [/\bfetch\(/, /XMLHttpRequest/, /sendBeacon/, /localStorage/, /sessionStorage/, /indexedDB/, /document\.cookie/, /\bimport\b/, /\brequire\(/, /import-readiness/]) {
    assert.ok(!pattern.test(script), `unexpected ${pattern} in hero-composer.js`);
  }
});

test('22. the plane route: a larger plane, a route line for the current leg, and Tel Aviv marked as Israel, the destination', () => {
  const script = globeScript();
  assert.ok(/drawPlane\(plane\.x, plane\.y, angle, 1\.3 \* \(size \/ 520\)/.test(script), 'plane drawn 1.3x larger');
  assert.ok(/strokeLeg\(state\.f, 1, \[5, 6\]/.test(script), 'dashed line for the rest of the leg');
  assert.ok(/strokeLeg\(0, state\.f, \[\]/.test(script), 'solid line for the flown part');
  assert.ok(script.includes("const label = home ? 'Tel Aviv · Israel' : city.name;"));
  assert.ok(script.includes('const STOPS = [0, 1, 2, 3, 4, 5, 0];'), 'the route still ends back in Israel');
});

test('23. the Composer field holds the full approved placeholder: two lines at every width, three at 380px and below (2026-10-15)', () => {
  const source = html();
  // the base rule (desktop included): two lines of text plus padding
  const base = source.match(/\.hero-composer-input\{([^}]*)\}/);
  assert.ok(base, 'expected the base .hero-composer-input rule');
  assert.match(base[1], /height:calc\(3\.2em \+ 20px\)/);
  assert.match(base[1], /padding:10px var\(--sp-4\)/);
  assert.match(base[1], /line-height:1\.6/);
  // the smallest phones: three lines
  const smallest = source.match(/@media \(max-width:380px\)\{([\s\S]*?)\n  \}/);
  assert.ok(smallest && /\.hero-composer-input\{ height:calc\(4\.8em \+ 20px\); \}/.test(smallest[1]), 'three lines at 380px and below');
});

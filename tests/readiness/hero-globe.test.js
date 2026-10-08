/**
 * Tests for the Hero globe redesign (product-owner decision, 2026-10):
 * a rotating globe with a plane on a fixed route, illustrative importer
 * questions that slide in beside it, and an answer line that ties them
 * to the primary CTA. String assertions against index.html and the
 * shipped script, following hero-image-v2.test.js.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

const read = (rel) => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');
const html = () => read('index.html');
const heroSection = () => {
  const match = html().match(/<section class="hero">[\s\S]*?<\/section>/);
  assert.ok(match, 'expected to find the <section class="hero"> block');
  return match[0];
};
const globeScript = () => read('js/hero/hero-globe.js');

const APPROVED_POSTS = [
  ['ליטל מלמד', "הזמנתי באינטרנט 100 יחידות של לק ג'ל והכל תקוע במכס, מישהו יודע מה הבעיה?"],
  ['איציק עובדיה', 'המוביל גרם לי לנזק למכולה בזמן הטעינה בנמל. הוא מאשים את המנופאי בנמל! יש לי נזק של מאות אלפי שקלים! מה לעשות?'],
  ['אורי לוי', 'אני חושב על מוצר פשוט פשוט מפלסטיק לתעשיית החקלאות, מישהו מכיר ספקים או יצרנים שאני יכול לעבוד מולם בייצור וייבוא לישראל?'],
  ['זיו ישראל', 'אני במשא ומתן עם יצרן בסין. הוא דורש ממני לעשות את המשלוחים בתנאים של סיף, שהוא בוחר את המוביל. מרגיש שהוא מנסה לעקוץ אותי. מה עושים?'],
  ['אריק שאולוב', 'אני רוצה לייבא מטענים ניידים לאייפונים. זה יתקע במכס?'],
];
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

test('2. the Hero contains exactly the five approved illustrative posts, in order, each with comment and like counts', () => {
  const hero = heroSection();
  const posts = [...hero.matchAll(/<li class="hero-post">([\s\S]*?)<\/li>/g)].map((m) => m[1]);
  assert.equal(posts.length, APPROVED_POSTS.length);
  posts.forEach((post, i) => {
    const [name, text] = APPROVED_POSTS[i];
    assert.ok(post.includes(`<strong>${name}</strong>`), `post ${i + 1} name`);
    assert.ok(post.includes(`<p>${text}</p>`), `post ${i + 1} text`);
    assert.ok(/\d+ תגובות/.test(post), `post ${i + 1} comment count`);
    assert.ok(/<\/svg>\d+<span class="visually-hidden"> לייקים<\/span>/.test(post), `post ${i + 1} like count`);
  });
});

test('3. the posts are labelled as illustrative examples, and carry no social-network logo or brand name', () => {
  const hero = heroSection();
  assert.ok(hero.includes('aria-label="שאלות של יבואנים, דוגמאות להמחשה"'));
  assert.ok(hero.includes('>דוגמאות להמחשה<'));
  for (const brand of ['facebook', 'instagram', 'פייסבוק', 'אינסטגרם']) {
    assert.ok(!hero.toLowerCase().includes(brand), `unexpected brand reference "${brand}" in the Hero`);
  }
});

test('4. the approved answer line sits in the Hero copy, before the CTA row', () => {
  const hero = heroSection();
  const answerAt = hero.indexOf(`<p class="hero-answer">${APPROVED_ANSWER_LINE}</p>`);
  assert.ok(answerAt > 0);
  assert.ok(answerAt < hero.indexOf('id="readinessStartButton"'));
});

test('5. no replay control was shipped (it existed only in the prototype)', () => {
  const hero = heroSection();
  assert.ok(!hero.includes('הצג שוב'));
  assert.ok(!/class="[^"]*replay/.test(hero));
});

test('6. every script the page loads is a local file; the globe dependencies exist on disk with their license notices', () => {
  const source = html();
  const srcs = [...source.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(srcs, [...VENDOR_FILES, 'js/hero/hero-globe.js']);
  for (const file of [...VENDOR_FILES, 'js/hero/hero-globe.js']) {
    assert.ok(statSync(new URL(`../../${file}`, import.meta.url)).isFile(), `${file} missing`);
  }
  const licenses = read('assets/vendor/LICENSES.md');
  for (const name of ['d3-array', 'd3-geo', 'topojson-client', 'world-atlas']) {
    assert.ok(licenses.includes(name), `license notice for ${name} missing`);
  }
});

test('7. the globe dependencies are deferred so they never block the assessment entry', () => {
  const source = html();
  for (const file of [...VENDOR_FILES, 'js/hero/hero-globe.js']) {
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

test('11. the posts arrive early (a few seconds in), not after a full lap', () => {
  const match = globeScript().match(/const POSTS_AT_MS = (\d+);/);
  assert.ok(match);
  assert.ok(Number(match[1]) <= 5000, `posts appear after ${match[1]}ms`);
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
  const script = globeScript();
  assert.ok(script.includes("toggle.setAttribute('aria-pressed', String(paused));"));
  assert.ok(/if \(paused\) \{ running = false;/.test(script));
});

test('17. narrow screens show all five posts at once (no one-at-a-time carousel)', () => {
  const script = globeScript();
  assert.ok(!/setInterval\(/.test(script), 'no post carousel timer');
  assert.ok(!/is-current|is-leaving/.test(script + html()), 'no carousel state classes');
  const block = html().match(/@media \(max-width:980px\)\{([\s\S]*?)\n  \}/);
  assert.ok(block);
  assert.ok(/\.hero-post:nth-child\(n\)\{ --dx:0; \}/.test(block[1]), 'desktop stagger offset is cancelled on narrow screens');
  assert.ok(!/\.hero-posts\{[^}]*position:absolute/.test(block[1]), 'posts stay in the flow so all five are visible');
});

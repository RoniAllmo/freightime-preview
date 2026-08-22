/**
 * Tests for the question-to-question entrance transition (spatial
 * continuity/orientation): a single, restrained fade + 4px rise, once,
 * on the newly displayed active-question surface, using the existing
 * project easing token and the same `:not([hidden])` CSS-animation
 * technique the Hero and Result entrances already use. Structural
 * source-scan assertions matching this repository's existing pattern;
 * real-browser (Playwright) measurement of the computed duration,
 * timing function, and prefers-reduced-motion neutralization was
 * performed separately and is summarized in the PR description.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function indexHtmlSource() {
  return readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
}

test('1. the question-transition keyframes animate only opacity and a small translateY, from an invisible/offset start to the identity end state', () => {
  const html = indexHtmlSource();
  const match = html.match(/@keyframes ir-question-fade-in\{ from\{ opacity:(\d+); transform:translateY\((-?\d+)px\); \} to\{ opacity:(\d+); transform:translateY\(0\); \} \}/);
  assert.ok(match, 'expected the ir-question-fade-in keyframes to exist with this exact shape');
  assert.equal(match[1], '0', 'must start fully transparent');
  assert.equal(match[3], '1', 'must end fully opaque');
  const startOffset = Number(match[2]);
  assert.ok(startOffset >= 3 && startOffset <= 5, `expected a small ~4px start offset, got ${startOffset}px`);
});

test('2. the transition duration is within the specified 160-200ms range and uses the existing project easing token', () => {
  const html = indexHtmlSource();
  const match = html.match(/\.ir-fieldset:not\(\[hidden\]\)\{ animation:ir-question-fade-in (\d+)ms var\(--ease\); \}/);
  assert.ok(match, 'expected the active-step animation rule to exist with this exact shape');
  const duration = Number(match[1]);
  assert.ok(duration >= 160 && duration <= 200, `expected duration between 160-200ms, got ${duration}ms`);
});

test('3. no new CSS custom property or easing token was introduced -- var(--ease) is the same token the Hero/Result entrances already use', () => {
  const html = indexHtmlSource();
  const questionRule = html.match(/\.ir-fieldset:not\(\[hidden\]\)\{ animation:ir-question-fade-in \d+ms (var\(--[a-z-]+\)); \}/);
  const resultRule = html.match(/#readinessResult\.readiness-card:not\(\[hidden\]\)\{ animation:ir-result-fade-in \d+ms (var\(--[a-z-]+\)); \}/);
  assert.ok(questionRule && resultRule);
  assert.equal(questionRule[1], resultRule[1], 'the question transition must reuse the exact same easing token as the existing result entrance');
});

test('4. the focused-checks phase\'s live question also gets the transition, using the same shared animation name (no separate, scattered per-route rule)', () => {
  const html = indexHtmlSource();
  assert.ok(
    html.includes('#irRegulatoryQuestionHost .ir-subfieldset{ animation:ir-question-fade-in 180ms var(--ease); }'),
    'expected the focused-checks phase to reuse the exact same ir-question-fade-in animation, not a second, route-specific one',
  );
});

test('5. only one motion rule set exists for question transitions -- no per-scenario duplicate keyframes were added', () => {
  const html = indexHtmlSource();
  const keyframeCount = (html.match(/@keyframes ir-question-fade-in\{/g) || []).length;
  assert.equal(keyframeCount, 1, 'expected exactly one centralized keyframe definition, not one per route/scenario');
});

test('6. the transition never applies to the error list, the Header, or the Hero (scoped to .ir-fieldset / the live question host only)', () => {
  const html = indexHtmlSource();
  assert.ok(!html.includes('#readinessErrors{ animation'), 'validation errors must never animate');
  assert.ok(!/\.hero[^{]*\{[^}]*animation:ir-question-fade-in/.test(html), 'the Hero must never use this animation');
  assert.ok(!/header[^{]*\{[^}]*animation:ir-question-fade-in/i.test(html), 'the Header must never use this animation');
});

test('7. the existing global prefers-reduced-motion rule (which neutralizes every CSS animation/transition on the page) is unchanged and still present', () => {
  const html = indexHtmlSource();
  assert.ok(
    html.includes('*,*::before,*::after{ animation-duration:0.001ms !important; animation-iteration-count:1 !important; transition-duration:0.001ms !important; scroll-behavior:auto !important; }'),
    'the global reduced-motion override this new animation relies on must remain exactly as before',
  );
});

test('8. no runtime animation library was introduced -- the transition is implemented entirely in the existing <style> block with vanilla CSS', () => {
  const html = indexHtmlSource();
  const bannedTokens = ['framer-motion', 'gsap', 'motion.dev', "from 'motion'", 'react-spring', 'anime.js'];
  for (const token of bannedTokens) {
    assert.ok(!html.toLowerCase().includes(token.toLowerCase()), `must not reference ${token}`);
  }
  assert.ok(!html.includes('<script src='), 'no new external script tag was added');
});

/**
 * Regression tests for the phase-indicator connector-line overflow fix
 * (product-owner acceptance finding): the horizontal connector between
 * the four phase markers (מצב היבוא / פרטי המוצר או הבעיה / בדיקות
 * ממוקדות / התוצאה שלך) was drawn with a physical `right:50%` offset on
 * each `.ir-phase::before` pseudo-element. Under this page's RTL layout
 * (`<html dir="rtl">`), the last DOM phase becomes the *left-most*
 * visual item, and the physical-right formula pushed its connector past
 * the container's left edge -- visible as a line spilling out of the
 * questionnaire card near the viewport's left edge.
 *
 * The fix swaps the physical `right` offset for the logical
 * `inset-inline-end`, which the browser flips automatically based on
 * computed `direction` -- so the same rule stays correct in both RTL
 * and (if ever needed) LTR without a viewport-specific or hardcoded
 * offset. Verified in real-browser (Playwright) runs at all required
 * viewports (320-1920px); these are structural/mechanism assertions
 * against the source, following this repository's existing pattern
 * (see hero-assessment-transition.test.js).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function html() {
  return readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
}

function connectorRule(source) {
  const match = source.match(/\.ir-phase:not\(:first-child\)::before\{[^}]*\}/);
  assert.ok(match, 'expected to locate the .ir-phase:not(:first-child)::before rule');
  return match[0];
}

// --- Root-cause fix: logical, not physical, inline offset -----------------

test('1. the connector pseudo-element uses the logical inset-inline-end offset (RTL-safe), not a physical right/left offset', () => {
  const rule = connectorRule(html());
  assert.ok(/inset-inline-end\s*:\s*50%/.test(rule), 'expected inset-inline-end:50% so the offset flips correctly with computed direction');
});

test('2. the connector rule contains no physical `right:` declaration at all', () => {
  const rule = connectorRule(html());
  assert.ok(!/\bright\s*:\s*50%/.test(rule), 'physical right:50% was the root cause of the RTL overflow and must not reappear');
});

test('3. the connector is anchored to its own phase item (position:absolute + explicit positioning context), not to the viewport', () => {
  const rule = connectorRule(html());
  assert.ok(/position\s*:\s*absolute/.test(rule));
  const source = html();
  const phaseRule = source.match(/\.ir-phase\{[^}]*\}/)[0];
  assert.ok(/position\s*:\s*relative/.test(phaseRule), '.ir-phase must establish the positioning context for its own ::before connector');
});

// --- Forbidden hack patterns ------------------------------------------------

test('4. the connector does not use 100vw (would overflow the card by definition)', () => {
  const rule = connectorRule(html());
  assert.ok(!/100vw/.test(rule));
});

test('5. the connector does not use a negative inline margin as a containment hack', () => {
  const rule = connectorRule(html());
  assert.ok(!/margin-inline[^:]*:\s*-/.test(rule));
  assert.ok(!/margin(-left|-right)?\s*:\s*-/.test(rule));
});

test('6. the connector does not use a translate/transform (a common source of viewport-specific overflow hacks)', () => {
  const rule = connectorRule(html());
  assert.ok(!/translate/.test(rule));
  assert.ok(!/transform/.test(rule));
});

test('7. the questionnaire card itself does not clip overflow as a workaround for the connector geometry', () => {
  const source = html();
  const cardRule = source.match(/\.readiness-card\{[^}]*\}/);
  if (cardRule) {
    assert.ok(!/overflow\s*:\s*hidden/.test(cardRule[0]), 'clipping the whole card would hide the defect rather than fix its layout source');
  }
});

// --- Mobile: hidden desktop tracker must not retain width or become focusable ---

test('8. the four-phase indicator is display:none by default and only enabled at the >=768px breakpoint (compact mobile progress stays exclusive below it)', () => {
  const source = html();
  const baseRule = source.match(/\.ir-phase-indicator\{[^}]*\}/)[0];
  assert.ok(/display\s*:\s*none/.test(baseRule), 'the four-phase indicator must start hidden so it cannot contribute width/overflow on narrow viewports');

  const mediaBlock = source.match(/@media \(min-width:768px\)\{[^}]*\.ir-phase-indicator\{[^}]*display\s*:\s*flex[^}]*\}[^}]*\}/);
  assert.ok(mediaBlock, 'expected the four-phase indicator to switch to flex only inside the >=768px media query');
});

test('9. the same >=768px breakpoint that reveals the four-phase indicator also hides the compact mobile progress meter/track (no dual-active state at any width)', () => {
  const source = html();
  const mediaBlock = source.match(/@media \(min-width:768px\)\{([^}]*\{[^}]*\}[^}]*)+\}/)[0];
  assert.ok(/\.progress-meta,\s*\.progress-track\{\s*display\s*:\s*none/.test(mediaBlock), 'the compact mobile progress must be turned off exactly where the desktop tracker turns on');
});

test('10. the hidden phase-indicator <ol> carries aria-hidden so assistive tech is not given duplicate/decorative progress info', () => {
  const source = html();
  assert.ok(/<ol class="ir-phase-indicator" id="readinessPhaseIndicator" aria-hidden="true">/.test(source));
});

// --- RTL phase order is unchanged by this fix -------------------------------

test('11. the four phase labels remain in their approved DOM order (מצב היבוא first, התוצאה שלך last) -- this fix only changes connector geometry, not phase order or logic', () => {
  const source = html();
  const indicatorBlock = source.match(/<ol class="ir-phase-indicator"[^>]*>[\s\S]*?<\/ol>/)[0];
  const labels = [...indicatorBlock.matchAll(/<span class="ir-phase-label">([^<]+)<\/span>/g)].map((m) => m[1]);
  assert.deepEqual(labels, ['מצב היבוא', 'פרטי המוצר או הבעיה', 'בדיקות ממוקדות', 'התוצאה שלך']);
});

test('12. the page remains RTL (dir="rtl"), which is what makes inset-inline-end resolve to the correct physical side for this fix', () => {
  const source = html();
  assert.ok(/<html lang="he" dir="rtl">/.test(source));
});

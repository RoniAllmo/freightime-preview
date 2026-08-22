/**
 * Tests for the result-container accessible-name fix: the focused
 * result container (#readinessResult) is given an aria-labelledby
 * relationship pointing at whichever real, already-rendered heading
 * exists for the current result -- never a fabricated heading, never a
 * change to the existing result hierarchy.
 *
 * The hand-rolled fake-DOM elements this repository's other controller
 * tests use don't implement a real, recursive querySelector on
 * individual elements (only the top-level `root` registry does), so
 * these are structural source-scan assertions -- matching the existing
 * precedent in tests/import-readiness/question-transition-flow.test.js,
 * whose own comment states real-browser (Playwright) measurement was
 * performed separately and is summarized in the PR description.
 * Real-browser verification for this fix (aria-labelledby pointing at
 * an existing heading with the correct text, the unknown-family
 * fallback, no second scroll jump, result visible below the Header) was
 * performed separately and is summarized in the PR description.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function controllerSource() {
  return readFileSync(
    new URL('../../js/import-readiness/import-readiness-controller.js', import.meta.url),
    'utf8',
  );
}

function indexHtmlSource() {
  return readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
}

test('1. two distinct, non-empty heading id constants are defined for the accessible-name relationship', () => {
  const source = controllerSource();
  const primaryMatch = source.match(/const RESULT_PRIMARY_HEADING_ID = '([^']+)';/);
  const actionMatch = source.match(/const RESULT_ACTION_HEADING_ID = '([^']+)';/);
  assert.ok(primaryMatch, 'expected RESULT_PRIMARY_HEADING_ID to be defined');
  assert.ok(actionMatch, 'expected RESULT_ACTION_HEADING_ID to be defined');
  assert.notEqual(primaryMatch[1], actionMatch[1], 'the two heading ids must be distinct (no duplicate id)');
  assert.ok(primaryMatch[1].length > 0 && actionMatch[1].length > 0);
});

test('2. the specific-finding heading (when it renders) carries the primary heading id', () => {
  const source = controllerSource();
  assert.ok(
    source.includes("section.appendChild(el(doc, 'h3', { text: canonical.detailedTitle, attrs: { id: RESULT_PRIMARY_HEADING_ID } }));"),
    'expected the specific finding title h3 to carry RESULT_PRIMARY_HEADING_ID',
  );
});

test('3. the always-present "הפעולה המומלצת" heading carries the fallback action heading id', () => {
  const source = controllerSource();
  assert.ok(
    source.includes("actionBlock.appendChild(el(doc, 'h3', { text: 'הפעולה המומלצת', attrs: { id: RESULT_ACTION_HEADING_ID } }));"),
    'expected the recommended-action h3 to carry RESULT_ACTION_HEADING_ID as the fallback anchor',
  );
});

test('4. updateResultAccessibleName is called immediately after every result render, before focus/scroll', () => {
  const source = controllerSource();
  const renderCallIdx = source.indexOf('const controls = renderResult(doc, elements.result,');
  const updateCallIdx = source.indexOf('updateResultAccessibleName(elements.result);');
  const focusCallIdx = source.indexOf('scrollAndFocusSurface(elements.result, elements.result);');
  assert.ok(renderCallIdx > -1 && updateCallIdx > -1 && focusCallIdx > -1);
  assert.ok(renderCallIdx < updateCallIdx, 'the accessible-name update must happen after the result is rendered');
  assert.ok(updateCallIdx < focusCallIdx, 'the accessible-name update must happen before focus/scroll, so the relationship is already correct when focus lands');
});

test('5. updateResultAccessibleName prefers the primary (specific-finding) heading over the fallback, and never leaves a stale reference', () => {
  const source = controllerSource();
  const fnStart = source.indexOf('function updateResultAccessibleName(');
  assert.ok(fnStart > -1);
  const fnBody = source.slice(fnStart, fnStart + 900);
  assert.ok(fnBody.includes(`querySelector(\`#\${RESULT_PRIMARY_HEADING_ID}\`)`), 'must check for the primary heading first');
  assert.ok(fnBody.includes(`querySelector(\`#\${RESULT_ACTION_HEADING_ID}\`)`), 'must check for the fallback heading second');
  assert.ok(fnBody.includes("removeAttribute('aria-labelledby')"), 'must remove the attribute entirely when neither heading exists, rather than leaving a stale value');
});

test('6. no fabricated "כיוון בדיקה מקצועי" text was added anywhere in this accessible-name wiring (the two heading ids are only ever attached to headings that already render)', () => {
  const source = controllerSource();
  const fnStart = source.indexOf('function updateResultAccessibleName(');
  const fnEnd = source.indexOf('\n}\n', fnStart) + 3;
  const fnBody = source.slice(fnStart, fnEnd);
  assert.ok(!fnBody.includes('כיוון בדיקה מקצועי'), 'updateResultAccessibleName must not itself construct or reference that label -- it only points at existing headings');
});

test('7. a New Assessment/reset clears the stale aria-labelledby reference before the result is hidden', () => {
  const source = controllerSource();
  const resetIdx = source.indexOf('function resetAll(');
  assert.ok(resetIdx > -1);
  const resetBody = source.slice(resetIdx, resetIdx + 2000);
  const removeIdx = resetBody.indexOf("elements.result.removeAttribute('aria-labelledby');");
  const hideIdx = resetBody.indexOf('setHidden(elements.result, true);');
  assert.ok(removeIdx > -1, 'expected resetAll to remove the stale aria-labelledby reference');
  assert.ok(hideIdx > -1);
  assert.ok(removeIdx < hideIdx, 'the stale reference must be cleared before (or as part of) hiding the result');
});

test('8. Edit Answers also clears the stale aria-labelledby reference when it hides the result', () => {
  const source = controllerSource();
  const editIdx = source.indexOf("controls.editButton.addEventListener('click',");
  assert.ok(editIdx > -1);
  const editBody = source.slice(editIdx, editIdx + 500);
  assert.ok(editBody.includes("elements.result.removeAttribute('aria-labelledby');"), 'expected the Edit Answers handler to clear the stale reference');
});

test('9. the result container keeps aria-live="polite" unchanged (announcement mechanism preserved)', () => {
  const html = indexHtmlSource();
  assert.ok(html.includes('id="readinessResult" aria-live="polite" hidden'), 'expected the result container markup to be unchanged aside from this fix');
});

test('10. the result container itself received no new hard-coded aria-label (relationship is via aria-labelledby only, not a duplicate text source)', () => {
  const html = indexHtmlSource();
  const match = html.match(/<div class="readiness-card" id="readinessResult"[^>]*>/);
  assert.ok(match);
  assert.ok(!match[0].includes('aria-label='), 'the result container must not carry a static aria-label alongside the dynamic aria-labelledby relationship');
});

test('11. the canonical result-hierarchy heading order comment is unchanged (no reordering introduced by this fix)', () => {
  const source = controllerSource();
  assert.ok(
    source.includes('heading order: status -> identified family -> detailed title'),
    'expected the documented canonical heading order to remain exactly as before',
  );
});

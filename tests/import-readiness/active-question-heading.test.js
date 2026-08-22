/**
 * Tests for the active-question heading fix: every active questionnaire
 * step's legend now wraps its own existing text in a real <h3> heading
 * instead of plain text -- one visible text source, preserved
 * fieldset/legend semantics, heading-navigation support added on top.
 * Verified in a real browser (Playwright, summarized in the PR
 * description) that this leaves the fieldset's accessible name and the
 * legend's own Legend accessibility role both intact. These are
 * structural source-scan assertions, matching the existing pattern in
 * tests/readiness/hero-assessment-transition.test.js and
 * tests/import-readiness/question-transition-flow.test.js.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function indexHtmlSource() {
  return readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
}

function controllerSource() {
  return readFileSync(
    new URL('../../js/import-readiness/import-readiness-controller.js', import.meta.url),
    'utf8',
  );
}

const EXPECTED_STATIC_QUESTION_HEADINGS = [
  'האם מדובר ביבוא אישי או ביבוא מסחרי?', // first questionnaire question
  'כמה שאלות קצרות להבהרה',
  'האם זה היבוא הראשון שלך?', // importer-experience question
  'מה המוצר שברצונך לייבא?', // product-details question
  'קצת יותר פרטים על המוצר',
  'עוד כמה פרטים על היבוא האישי',
  'במה תרצה להתמקד?',
  'מה מטרת הבדיקה?',
  'מה הבעיה המרכזית?', // shipment-problem question
  'עוד כמה פרטים על המשלוח', // shipment-problem question
];

test('1. every active-question legend wraps its exact existing wording in a real <h3>, once', () => {
  const html = indexHtmlSource();
  for (const text of EXPECTED_STATIC_QUESTION_HEADINGS) {
    const wrapped = `<legend><h3>${text}</h3></legend>`;
    assert.ok(html.includes(wrapped), `expected legend to wrap exactly "${text}" in an h3, unchanged`);
    // The bare, unwrapped legend text must not also appear elsewhere --
    // i.e. this is the only place this exact question wording exists.
    const bareOccurrences = html.split(`<legend>${text}</legend>`).length - 1;
    assert.equal(bareOccurrences, 0, `"${text}" must not also exist as a bare, non-heading legend`);
  }
});

test('2. fieldset and legend elements are untouched -- no fieldset removed, no legend replaced by a div', () => {
  const html = indexHtmlSource();
  const fieldsetOpenCount = (html.match(/<fieldset\b/g) || []).length;
  const fieldsetCloseCount = (html.match(/<\/fieldset>/g) || []).length;
  assert.equal(fieldsetOpenCount, fieldsetCloseCount, 'every <fieldset> must still be closed');
  assert.ok(fieldsetOpenCount >= 10, 'expected the same population of <fieldset> elements as before');
  const legendOpenCount = (html.match(/<legend>/g) || []).length;
  const legendCloseCount = (html.match(/<\/legend>/g) || []).length;
  assert.equal(legendOpenCount, legendCloseCount, 'every <legend> must still be closed');
});

test('3. no visible text duplication: no legend contains both a heading and a second copy of the same text', () => {
  const html = indexHtmlSource();
  const legendBlocks = html.match(/<legend>[\s\S]*?<\/legend>/g) || [];
  for (const block of legendBlocks) {
    const innerH3Matches = block.match(/<h3>([\s\S]*?)<\/h3>/);
    if (!innerH3Matches) continue;
    const headingText = innerH3Matches[1];
    // Remove the h3 wrapper and confirm no leftover duplicate text node
    // of the same content remains inside the legend.
    const withoutHeading = block.replace(/<h3>[\s\S]*?<\/h3>/, '');
    assert.ok(!withoutHeading.includes(headingText), `legend containing "${headingText}" must not also repeat it as plain text`);
  }
});

test('4. no separate visually-hidden heading duplicates a question -- headings only exist nested inside their own legend', () => {
  const html = indexHtmlSource();
  // A visually-hidden duplicate would typically use a sr-only-style
  // class alongside an <h1-h6> outside of any <legend>. Confirm every
  // <h3> that names one of the known question texts is inside a
  // <legend>...</legend> pair.
  for (const text of EXPECTED_STATIC_QUESTION_HEADINGS) {
    const idx = html.indexOf(`<h3>${text}</h3>`);
    assert.ok(idx > -1, `expected to find the heading for "${text}"`);
    const before = html.slice(0, idx);
    const lastLegendOpen = before.lastIndexOf('<legend>');
    const lastLegendClose = before.lastIndexOf('</legend>');
    assert.ok(lastLegendOpen > lastLegendClose, `heading "${text}" must be nested inside an open <legend>`);
    const occurrences = (html.match(new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    assert.equal(occurrences, 1, `"${text}" must appear exactly once in the page (no duplicate visible or hidden copy)`);
  }
});

test('5. the visual-reset CSS rule exists so the nested heading never changes appearance', () => {
  const html = indexHtmlSource();
  assert.ok(
    html.includes('.ir-fieldset legend h3, .ir-subfieldset legend h3{ all:unset; display:block; font:inherit; color:inherit; }'),
    'expected the nested-heading visual-reset rule to exist unchanged',
  );
});

test('6. the dynamic regulatory-question renderer (focused regulatory question, personal-use clarification) also nests a real heading in its legend, not a plain-text legend', () => {
  const source = controllerSource();
  assert.ok(
    source.includes("const legend = el(doc, 'legend', { attrs: { tabindex: '-1' } });") ,
    'expected the legend to no longer set plain text directly (text now lives in the nested heading)',
  );
  assert.ok(
    source.includes("legend.appendChild(el(doc, 'h3', { text: question.legend }));"),
    'expected the dynamic legend to append a single h3 child carrying the question wording',
  );
});

test('7. the dynamic regulatory-question legend keeps its tabindex="-1" focus target (question focus behavior preserved)', () => {
  const source = controllerSource();
  const fnStart = source.indexOf('function renderRegulatoryQuestion(');
  assert.ok(fnStart > -1);
  const fnBody = source.slice(fnStart, fnStart + 1200);
  assert.ok(fnBody.includes("attrs: { tabindex: '-1' }"), 'the legend must remain the programmatic focus target, unchanged');
});

test('8. no aria-label was added to any legend (no duplicate-announcement source alongside the nested heading)', () => {
  const html = indexHtmlSource();
  const legendBlocks = html.match(/<legend[^>]*>/g) || [];
  for (const openTag of legendBlocks) {
    assert.ok(!openTag.includes('aria-label'), `legend open tag "${openTag}" must not carry an aria-label`);
  }
});

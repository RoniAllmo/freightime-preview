/**
 * Structural tests for the PR #45 "completion pass" additions: the
 * product-intake three-group structure (Q3 + the productContext step),
 * the flat divided choice-list system, and the two-tier semantic
 * urgency treatment. These are source-scan / DOM-structure assertions
 * against index.html (matching this repo's existing pattern, e.g.
 * premium-shell.test.js and result-premium-redesign.test.js) -- no
 * pixel-perfect screenshot assertions, per this task's own instruction.
 *
 * These tests protect structure and presence, never wording content
 * that belongs to regulatory-content/protected-behavior tests
 * elsewhere in this suite.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function html() {
  return readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
}

function q3Fieldset() {
  const source = html();
  const match = source.match(/<fieldset class="ir-fieldset" id="irStepQ3"[\s\S]*?<\/fieldset>\s*\n\s*<fieldset class="ir-fieldset" id="irStepProductContext"/);
  assert.ok(match, 'expected to locate the Q3 fieldset in index.html');
  return match[0];
}

function productContextFieldset() {
  const source = html();
  const match = source.match(/<fieldset class="ir-fieldset" id="irStepProductContext"[\s\S]*?\n        <\/fieldset>\n\n\s*<div class="ir-fieldset" id="irStepRegulatoryFollowup"/);
  assert.ok(match, 'expected to locate the productContext fieldset in index.html');
  return match[0];
}

// --- Product intake: three coherent groups ---------------------------------

test('1. Q3 (product-details) contains exactly three .ir-form-group sections, in order: identity, documents, customs info', () => {
  const section = q3Fieldset();
  const titles = [...section.matchAll(/class="ir-form-group-title">([^<]+)/g)].map((m) => m[1].trim());
  assert.deepEqual(titles, ['זהות המוצר', 'מידע ומסמכים זמינים', 'מידע מכסי']);
});

test('2. Q3\'s identity group contains exactly the three existing identity fields, unchanged IDs', () => {
  const section = q3Fieldset();
  const identityGroup = section.split('ir-form-group-title">זהות המוצר')[1].split('ir-form-group-title')[0];
  for (const id of ['irProductName', 'irCommercialDescription', 'irIntendedUse']) {
    assert.ok(identityGroup.includes(`id="${id}"`), `expected ${id} inside the identity group`);
  }
});

test('3. the productContext step (family/material/context characteristics) carries its own "מאפיינים שמשפיעים על הבדיקה" group title, distinct from its own step legend', () => {
  const section = productContextFieldset();
  assert.ok(/<legend><h3>קצת יותר פרטים על המוצר<\/h3><\/legend>/.test(section), 'the step\'s own heading must remain exactly as protected by active-question-heading.test.js');
  assert.ok(/ir-form-group-title">מאפיינים שמשפיעים על הבדיקה</.test(section), 'expected a group title distinguishing the characteristics group from the step heading');
});

test('4. every existing characteristic field (family, material, food-contact, electrical) is inside the new group wrapper, and the wrapper closes before the unrelated documents question', () => {
  const section = productContextFieldset();
  const groupStart = section.indexOf('ir-form-group-title">מאפיינים שמשפיעים על הבדיקה');
  const groupOpenTagStart = section.lastIndexOf('<div class="ir-form-group">', groupStart);
  assert.ok(groupOpenTagStart > -1);
  const documentsIdx = section.indexOf('id="irDocumentsGroup"');
  assert.ok(documentsIdx > -1);
  const between = section.slice(groupOpenTagStart, documentsIdx);
  for (const id of ['irProductFamilyGroup', 'irMaterialGroup', 'irGroupFoodContactMaterial', 'irGroupElectricalCharacteristics']) {
    assert.ok(between.includes(`id="${id}"`), `expected ${id} inside the characteristics group, before the documents question`);
  }
  // Track actual <div> nesting depth (not a raw open/close count, which
  // would also count the two unrelated .ir-subfieldset-group divs
  // nested inside and could pass even if the wrapper itself were left
  // open) to find exactly where the .ir-form-group wrapper itself
  // closes, and confirm that happens before the documents question.
  const tagPattern = /<div\b[^>]*>|<\/div>/g;
  let depth = 0;
  let wrapperCloseIdx = -1;
  let match;
  while ((match = tagPattern.exec(section)) !== null) {
    if (match.index < groupOpenTagStart) continue;
    if (match.index >= documentsIdx) break;
    if (match[0].startsWith('</div>')) {
      depth -= 1;
      if (depth === 0) { wrapperCloseIdx = match.index; break; }
    } else {
      depth += 1;
    }
  }
  assert.ok(wrapperCloseIdx > -1, 'the .ir-form-group wrapper never actually closes (returns to nesting depth 0) before the documents question');
  assert.ok(wrapperCloseIdx < documentsIdx, 'the .ir-form-group wrapper must close before the documents question, not wrap it');
});

test('5. no product-intake field ID appears more than once across Q3 and productContext (no accidental duplication introduced by regrouping)', () => {
  const source = html();
  const ids = [...source.matchAll(/\sid="(ir(?:Product|Commercial|Intended|Has|Hs)[A-Za-z]+)"/g)].map((m) => m[1]);
  const seen = new Set();
  for (const id of ids) {
    assert.ok(!seen.has(id), `duplicate id found: ${id}`);
    seen.add(id);
  }
});

// --- Choice system: flat divided list, non-color-only selected state -------

test('6. .ir-radio-row no longer uses overflow:hidden (would clip the keyboard focus-visible ring)', () => {
  const source = html();
  const rule = source.match(/\.ir-radio-row\{[^}]*\}/);
  assert.ok(rule);
  assert.ok(!/overflow:\s*hidden/.test(rule[0]), 'overflow:hidden on the row container would clip the focus ring on end rows');
});

test('7. the selected choice state changes border, background, AND font-weight together -- never color alone', () => {
  const source = html();
  const rule = source.match(/\.ir-radio-row label:has\(input:checked\)\{([^}]*)\}/);
  assert.ok(rule);
  assert.ok(/border-inline-start-color/.test(rule[1]));
  assert.ok(/background/.test(rule[1]));
  assert.ok(/font-weight:\s*600/.test(rule[1]));
});

test('8. the selected choice state also renders a checkmark glyph (a fourth, non-color signal)', () => {
  const source = html();
  assert.ok(source.includes(".ir-radio-row label:has(input:checked)::after{\n    content:'✓';"));
});

test('9. keyboard focus-visible on a choice row is never clipped: corners are rounded on the end labels, not via overflow:hidden on the container', () => {
  const source = html();
  assert.ok(/\.ir-radio-row label:first-child\{[^}]*border-start-start-radius/.test(source));
  assert.ok(/\.ir-radio-row label:last-child\{[^}]*border-end-start-radius/.test(source));
});

// --- Result masthead ---------------------------------------------------------

test('10. the result header (route context + status) is visually set off from the finding below by its own bottom border, forming one masthead band', () => {
  const source = html();
  const rule = source.match(/\.ir-result-header\{([^}]*)\}/);
  assert.ok(rule);
  assert.ok(/border-bottom/.test(rule[1]));
});

// --- Semantic status system: urgency is never all one color -----------------

test('11. only the genuinely urgent badge ("דחוף") uses the error/red tone; the base/attention tone is warning-colored, not error-colored', () => {
  const source = html();
  const baseRule = source.match(/\.ir-urgency-badge\{([^}]*)\}/);
  assert.ok(baseRule);
  assert.ok(/status-warning/.test(baseRule[1]), 'the default (attention) urgency badge must not use the error/red tokens');
  const urgentRule = source.match(/\.ir-urgency-badge\[data-urgency="דחוף"\]\{([^}]*)\}/);
  assert.ok(urgentRule, 'expected a dedicated, more severe rule specifically for the urgent case');
  assert.ok(/status-error/.test(urgentRule[1]));
});

test('12. no invented urgency wording -- the CSS only ever selects the two existing approved urgency strings', () => {
  const source = html();
  const attrSelectors = [...source.matchAll(/\[data-urgency="([^"]+)"\]/g)].map((m) => m[1]);
  for (const value of attrSelectors) {
    assert.ok(value === 'דחוף' || value === 'דורש תשומת לב', `unexpected urgency value referenced in CSS: ${value}`);
  }
});

test('13. the result-status dot color is a secondary cue layered on distinct, already-explicit status wording -- not a new status vocabulary', () => {
  const source = html();
  const statusSelectors = [...source.matchAll(/\.ir-result-header\[data-status="([^"]+)"\]/g)].map((m) => m[1]);
  assert.ok(statusSelectors.length >= 2, 'expected at least two distinct status-keyed color rules');
  for (const value of statusSelectors) {
    assert.ok(
      ['נדרש טיפול דחוף', 'נדרשת פעולה תפעולית בהקדם', 'מומלץ להשלים פרטים לפני הזמנה', 'מומלץ לבצע בדיקה מקצועית לפני שילוח', 'ניתן להתקדם באיסוף מידע'].includes(value),
      `status value must be one of the five approved RESULT_STATUS strings, got: ${value}`,
    );
  }
});

// --- No dashboard-shaped markup introduced ----------------------------------

test('14. no sidebar/dashboard/KPI/analytics-grid class names were introduced by this pass', () => {
  const source = html();
  for (const forbidden of ['dashboard', 'kpi', 'sidebar', 'analytics-grid', 'metric-tile']) {
    assert.ok(!source.toLowerCase().includes(forbidden), `unexpected dashboard-pattern class/term found: ${forbidden}`);
  }
});

// --- Geometry/overflow protection (static, tolerant-range assertions --
//     this repo has no browser/Playwright dependency in its `node --test`
//     suite (no package.json, CI runs bare `node --check` + `node --test`
//     with nothing to install), so live pixel measurement is out of
//     scope for the canonical suite; that verification was instead
//     performed manually via a real Playwright run outside the repo and
//     is summarized in the PR body. These tests catch the static-source
//     causes of overflow: fixed pixel widths wide enough to overflow a
//     320px viewport, and a missing mobile padding override for the new
//     workspace wrapper. ---------------------------------------------

test('15. the new .assessment-workspace wrapper has an explicit mobile padding override (would otherwise double up with .readiness-card padding and crush content at narrow widths)', () => {
  const source = html();
  const start = source.indexOf('@media (max-width:600px)');
  assert.ok(start > -1, 'expected to find the <=600px responsive block');
  const nextMediaStart = source.indexOf('@media', start + 1);
  const mobileBlock = nextMediaStart > -1 ? source.slice(start, nextMediaStart) : source.slice(start);
  assert.ok(/\.assessment-workspace\{[^}]*padding/.test(mobileBlock), 'expected an explicit .assessment-workspace padding override in the mobile block');
});

test('16. no rule for the newly-touched selectors sets a bare width/min-width in px wide enough to overflow a 320px viewport, and every tracked selector actually has at least one rule to check', () => {
  const source = html();
  const newRuleSelectors = ['.assessment-workspace', '.ir-radio-row', '.ir-form-group', '.ir-result-header', '.ir-urgency-badge'];
  for (const selector of newRuleSelectors) {
    const escaped = selector.replace(/[.[\]]/g, '\\$&');
    // Exact-selector match only: the selector must be followed by `{`,
    // whitespace, or a combinator/attribute-selector character -- never
    // by another class-name character, so `.ir-form-group` doesn't also
    // match `.ir-form-group-title`.
    const ruleMatches = [...source.matchAll(new RegExp(`${escaped}(?![\\w-])([^{]*)\\{([^}]*)\\}`, 'g'))];
    assert.ok(ruleMatches.length > 0, `expected at least one CSS rule for the exact selector ${selector} (renamed/removed class would otherwise silently drop coverage)`);
    for (const [, , body] of ruleMatches) {
      const widths = [...body.matchAll(/(?<![\w-])(?:min-)?width:\s*(\d+)px/g)].map((m) => Number(m[1]));
      for (const w of widths) {
        assert.ok(w <= 320, `rule for ${selector} sets a fixed/min width of ${w}px, which would overflow a 320px viewport`);
      }
    }
  }
});

test('17. every irProductFamily/irMaterial/irDocument checkbox value in the productContext step appears exactly once in the whole file (regrouping introduced no duplicated option)', () => {
  const source = html();
  const groups = { irProductFamily: [], irMaterial: [], irDocument: [] };
  for (const m of source.matchAll(/name="(irProductFamily|irMaterial|irDocument)" value="([^"]+)"/g)) {
    groups[m[1]].push(m[2]);
  }
  for (const [name, values] of Object.entries(groups)) {
    assert.ok(values.length > 0, `expected at least one ${name} option`);
    assert.equal(new Set(values).size, values.length, `duplicate ${name} option value found`);
  }
});

// -- Cross-round CSS-cascade regressions (found by a full-diff code
//    review spanning all 5 rounds' combined changes -- neither was
//    visible in any single round's own diff). -----------------------

test('18. the active-question teal accent bar (.ir-fieldset legend) does not leak onto nested sub-question legends (.ir-subfieldset legend), which explicitly reset it', () => {
  const source = html();
  const rule = source.match(/\.ir-subfieldset legend\{([^}]*)\}/);
  assert.ok(rule, 'expected the base .ir-subfieldset legend rule');
  assert.ok(/border-inline-start:\s*none/.test(rule[1]), 'expected .ir-subfieldset legend to explicitly reset border-inline-start, since it is a descendant of .ir-fieldset and would otherwise inherit the active-question accent bar meant only for the one top-level question');
});

test('19. hovering a selected choice inside a tinted .ir-form-group never overrides the selected-state background back to white (the group-hover fix must not win over :has(input:checked))', () => {
  const source = html();
  const rule = source.match(/\.ir-form-group \.ir-checklist label(?:[^{]*)\{([^}]*)\}/);
  assert.ok(rule, 'expected the .ir-form-group choice-hover rule');
  assert.ok(/:not\(:has\(input:checked\)\)/.test(rule[0] ?? ''), 'expected the hover-background-fix selector to exclude the checked state, so it never wins the cascade over the selected-state background');
});

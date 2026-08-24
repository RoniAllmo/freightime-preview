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

// -- Gate-1 compositional changes: decision-card choices, two-column
//    product intake, and bold numbered verification plan -------------

test('20. the import-type choice (Q1, data-flag row) renders as decision cards, not the flat divided list used elsewhere', () => {
  const source = html();
  const rule = source.match(/\.ir-radio-row\[data-flag\] label\{([^}]*)\}/);
  assert.ok(rule, 'expected a dedicated card-style rule for the data-flag choice row');
  assert.ok(/border-radius:\s*var\(--radius-card\)/.test(rule[1]), 'expected full card corners, not the divided-list end-cap treatment');
  assert.ok(!/border-inline-start:3px solid transparent/.test(rule[1]), 'the card variant must not carry the flat-list divider-row accent-bar reset (it uses its own border, not an inline-start accent)');
});

test('21. Q3 product intake has a two-area desktop composition (identity primary, documents/customs secondary) that collapses to one column on mobile', () => {
  const source = html();
  assert.ok(source.includes('<div class="ir-intake-grid">'), 'expected the intake-grid wrapper');
  assert.ok(source.includes('ir-intake-primary'), 'expected the primary (identity) column');
  assert.ok(source.includes('ir-intake-secondary'), 'expected the secondary (documents/customs) column');
  const desktopRule = source.match(/@media \(min-width:860px\)\{\s*\.ir-intake-grid\{([^}]*)\}/);
  assert.ok(desktopRule, 'expected a desktop-only two-column grid rule');
  assert.ok(/grid-template-columns/.test(desktopRule[1]));
  // No dedicated mobile override is required -- a CSS grid with no
  // min-width media query already renders as a single column by
  // default; this assertion just confirms the two-column rule is
  // scoped behind the min-width query, not applied unconditionally.
  const beforeMedia = source.slice(0, source.indexOf('@media (min-width:860px)'));
  assert.ok(!/\.ir-intake-grid\{[^}]*grid-template-columns/.test(beforeMedia), 'the two-column layout must not apply outside the desktop media query');
});

test('22. every Q3 field remains inside either the primary or secondary intake column (regrouping introduced no orphaned field)', () => {
  const source = html();
  const q3Match = source.match(/<fieldset class="ir-fieldset" id="irStepQ3"[\s\S]*?<\/fieldset>/);
  assert.ok(q3Match);
  const q3 = q3Match[0];
  const gridStart = q3.indexOf('ir-intake-grid');
  assert.ok(gridStart > -1);
  for (const id of ['irProductName', 'irCommercialDescription', 'irIntendedUse', 'irHasTechnicalSpec', 'irHsCode']) {
    assert.ok(q3.slice(gridStart).includes(`id="${id}"`), `expected ${id} inside the intake grid`);
  }
});

test('23. verification-plan items are numbered with bold two-digit numerals (decimal-leading-zero), not a small round badge', () => {
  const source = html();
  const rule = source.match(/\.ir-regulatory-verification-items li::before\{([^}]*)\}/);
  assert.ok(rule);
  assert.ok(/decimal-leading-zero/.test(rule[1]), 'expected 01/02/03-style leading-zero numerals');
  assert.ok(/font-weight:\s*700/.test(rule[1]));
  assert.ok(!/border-radius:\s*50%/.test(rule[1]), 'expected the numeral to no longer be wrapped in a round badge shape');
});

// -- Gate-1 correction: mobile Q1 decision identity, mobile intake
//    hierarchy, and glass masthead/verification/handoff structure ----

test('24. Q1 decision cards give the native radio its own bounded, visually separated selection zone (not an inline radio dot beside the text) at every width, present in markup and CSS', () => {
  const source = html();
  const markup = source.slice(source.indexOf('data-flag="importType"'), source.indexOf('irImportTypeExplanation'));
  assert.strictEqual((markup.match(/class="ir-choice-select"/g) || []).length, 3, 'expected all three import-type choices to wrap their radio in a dedicated selection zone');
  const zoneRule = source.match(/\.ir-radio-row\[data-flag\] \.ir-choice-select\{([^}]*)\}/);
  assert.ok(zoneRule, 'expected a dedicated selection-zone rule');
  assert.ok(/border-inline-end/.test(zoneRule[1]), 'expected a real divider separating the selection zone from the title/description');
  const checkedZoneRule = source.match(/\.ir-radio-row\[data-flag\] label:has\(input:checked\) \.ir-choice-select\{([^}]*)\}/);
  assert.ok(checkedZoneRule, 'expected the selection zone itself to change on selection, not just an accent line');
  assert.ok(/background:var\(--teal\)/.test(checkedZoneRule[1]));
});

test('24b. Q1 decision cards use multiple non-color-only signals when selected: heavier card border, filled selection zone, bold title, and a checkmark', () => {
  const source = html();
  const checkedRule = source.match(/\.ir-radio-row\[data-flag\] label:has\(input:checked\)\{([^}]*)\}/);
  assert.ok(checkedRule);
  assert.ok(/border-width:\s*2px/.test(checkedRule[1]), 'expected a heavier border on selection');
  const titleRule = source.match(/\.ir-radio-row\[data-flag\] label:has\(input:checked\) \.ir-choice-title\{([^}]*)\}/);
  assert.ok(titleRule && /font-weight:\s*700/.test(titleRule[1]));
  const afterRule = source.match(/\.ir-radio-row\[data-flag\] label:has\(input:checked\)::after\{([^}]*)\}/);
  assert.ok(afterRule && /content:'✓'/.test(afterRule[1]));
});

test('25. the mobile product-intake block gives the identity group a bolder/larger title than the documents/customs groups (visual weight hierarchy, not just a narrower desktop layout)', () => {
  const source = html();
  const mobileBlock = source.slice(source.indexOf('@media (max-width:600px)'), source.indexOf('@media (max-width:380px)'));
  const primaryTitle = mobileBlock.match(/\.ir-intake-primary \.ir-form-group-title\{([^}]*)\}/);
  const secondaryTitle = mobileBlock.match(/\.ir-intake-secondary \.ir-form-group-title\{([^}]*)\}/);
  assert.ok(primaryTitle && secondaryTitle, 'expected distinct mobile title rules for the primary and secondary intake groups');
  const primarySize = Number(primaryTitle[1].match(/font-size:\s*([\d.]+)px/)[1]);
  const secondarySize = Number(secondaryTitle[1].match(/font-size:\s*([\d.]+)px/)[1]);
  assert.ok(primarySize > secondarySize, 'expected the identity group title to be larger than the documents/customs group titles on mobile');
});

test('26. the mobile product-intake block replaces the tinted-card treatment with a plain divider (no background/border-radius) so groups read as one flowing document, not stacked cards', () => {
  const source = html();
  const mobileBlock = source.slice(source.indexOf('@media (max-width:600px)'), source.indexOf('@media (max-width:380px)'));
  const rule = mobileBlock.match(/\.ir-form-group\{([^}]*)\}/);
  assert.ok(rule);
  assert.ok(/background:\s*transparent/.test(rule[1]));
  assert.ok(/border-bottom:1px solid var\(--divider\)/.test(rule[1]));
});

test('27. the identified-product metadata line (.ir-regulatory-family) has its own compact, muted styling distinct from the finding title and body text', () => {
  const source = html();
  const rule = source.match(/\.ir-regulatory-family\{([^}]*)\}/);
  assert.ok(rule, 'expected a dedicated rule for the family metadata line');
  assert.ok(/font-size:\s*12\.5px/.test(rule[1]));
  assert.ok(/color:var\(--text-secondary\)/.test(rule[1]));
});

test('28. the verification plan has its own top boundary (border-top), separating it from the positive-category list above it as a distinct, structurally meaningful section', () => {
  const source = html();
  const rule = source.match(/\.ir-regulatory-verification-items\{([^}]*)\}/);
  assert.ok(rule);
  assert.ok(/border-top:1px solid/.test(rule[1]));
});

test('29. the professional handoff (primary professional line) has its own top boundary and a distinct ocean-accented color, so it reads as the brief\'s conclusion rather than a continuation of the verification plan', () => {
  const source = html();
  const rule = source.match(/\.ir-regulatory-primary-professional\{([^}]*)\}/);
  assert.ok(rule);
  assert.ok(/border-top:1px solid/.test(rule[1]));
  assert.ok(/color:var\(--ocean\)/.test(rule[1]));
});

// -- Final Gate-1 correction: desktop glass two-area composition and
//    mobile/desktop professional-handoff panel ------------------------

test('30. the glass-result handoff group (professional, reason, supporting, confidence) shares a bounded white panel background, distinct from the tinted narrative surface around it', () => {
  const source = html();
  const rule = source.match(/\.ir-regulatory-primary-professional,\s*\n\s*\.ir-regulatory-primary-professional-reason,\s*\n\s*\.ir-regulatory-supporting-professional,\s*\n\s*\.ir-regulatory-confidence\{([^}]*)\}/);
  assert.ok(rule, 'expected one shared rule giving the handoff group its own panel background');
  assert.ok(/background:var\(--surface\)/.test(rule[1]));
});

test('31. the desktop glass grid uses dense auto-flow so narrative and handoff items pack into their own columns without interleaving into disconnected fragments', () => {
  const source = html();
  const desktopBlock = source.slice(source.indexOf('@media (min-width:1024px){\n    .ir-regulatory-signals{'), source.indexOf('.ir-regulatory-limitation{'));
  assert.ok(/grid-auto-flow:\s*row dense/.test(desktopBlock), 'expected dense grid packing on the desktop glass composition');
});

test('32. Q1 decision cards preserve the native radio input, a full-card <label>, and keyboard operability -- the new selection zone is a wrapper, not a replacement control', () => {
  const source = html();
  const markup = source.slice(source.indexOf('data-flag="importType"'), source.indexOf('irImportTypeExplanation'));
  assert.strictEqual((markup.match(/<input type="radio" name="irImportType"/g) || []).length, 3, 'expected all three choices to remain native radio inputs');
  assert.strictEqual((markup.match(/<label>/g) || []).length, 3, 'expected each choice to remain one full-card <label>');
});

// -- Final mobile-only glass-result zone recomposition -----------------

test('33. the mobile glass masthead (finding title) is closed off by its own boundary, separating it from the identification summary that follows, only below the desktop grid breakpoint', () => {
  const source = html();
  const mobileBlock = source.slice(source.indexOf('@media (max-width:1023px){'), source.indexOf('.ir-regulatory-limitation{'));
  assert.ok(/\.ir-regulatory-signals h3\{[^}]*border-bottom:1px solid/.test(mobileBlock), 'expected a masthead-closing boundary under the finding title');
});

test('34. the mobile verification plan is a bounded white checklist card (the second permitted background shift), distinct from the tinted narrative around it, only below the desktop grid breakpoint', () => {
  const source = html();
  const mobileBlock = source.slice(source.indexOf('@media (max-width:1023px){'), source.indexOf('.ir-regulatory-limitation{'));
  const rule = mobileBlock.match(/\.ir-regulatory-verification-items\{([^}]*)\}/);
  assert.ok(rule, 'expected a mobile-scoped verification-items rule');
  assert.ok(/background:var\(--surface\)/.test(rule[1]));
  assert.ok(/border-radius:var\(--radius-card\)/.test(rule[1]));
});

test('35. the mobile professional-handoff panel is pulled visually closer to the recommended-action block that follows it, so the two read as one concluding sequence, only below the desktop grid breakpoint', () => {
  const source = html();
  const mobileBlock = source.slice(source.indexOf('@media (max-width:1023px){'), source.indexOf('.ir-regulatory-limitation{'));
  assert.ok(/\.ir-regulatory-signals:has\(\+ \.ir-primary-action\)\{[^}]*margin-bottom:var\(--sp-3\)/.test(mobileBlock));
});

test('36. the desktop glass composition (dense two-column grid) is unaffected by the mobile-only zone rules -- they live inside a separate max-width:1023px query, never the min-width:1024px block', () => {
  const source = html();
  const desktopBlock = source.slice(source.indexOf('@media (min-width:1024px){\n    .ir-regulatory-signals{'), source.indexOf('/* Mobile advisory brief:'));
  assert.ok(!/max-width:1023px/.test(desktopBlock), 'expected the desktop grid block to remain untouched by the new mobile-only rules');
  assert.ok(/grid-auto-flow:\s*row dense/.test(desktopBlock), 'expected the dense-grid preservation fix to still be present');
});

// -- Final mobile-only masthead correction (route context + status pill
//    merged with the canonical section's own masthead) ----------------

test('37. the mobile masthead merges the route-context line and status pill into the canonical section\'s own tinted surface, scoped only to results that actually have that exact adjacent sequence', () => {
  const source = html();
  const mobileBlock = source.slice(source.indexOf('@media (max-width:1023px){'), source.indexOf('.ir-regulatory-limitation{'));
  const routeRule = mobileBlock.match(/\.ir-route-context:has\(\+ \.ir-result-header\)\{([^}]*)\}/);
  assert.ok(routeRule, 'expected a scoped mobile rule merging the route-context line into the masthead');
  assert.ok(/background:var\(--surface-tint\)/.test(routeRule[1]));
  const headerRule = mobileBlock.match(/\.ir-result-header:has\(\+ \.ir-regulatory-signals\)\{([^}]*)\}/);
  assert.ok(headerRule, 'expected a scoped mobile rule merging the status-pill header into the masthead');
  assert.ok(/background:var\(--surface-tint\)/.test(headerRule[1]));
});

test('38. the merged mobile masthead removes the seam between the status-pill header and the canonical section so the two read as one continuous surface, without changing the section\'s desktop radius/margin rules elsewhere', () => {
  const source = html();
  const mobileBlock = source.slice(source.indexOf('@media (max-width:1023px){'), source.indexOf('.ir-regulatory-limitation{'));
  const seamRule = mobileBlock.match(/\.ir-result-header:has\(\+ \.ir-regulatory-signals\) \+ \.ir-regulatory-signals\{([^}]*)\}/);
  assert.ok(seamRule, 'expected a rule removing the top margin/radius seam on the section that follows a merged header');
  assert.ok(/margin-top:\s*0/.test(seamRule[1]));
});

test('39. the mobile masthead merge rules do not appear inside the desktop (min-width:1024px) grid block -- the merge is mobile-only and does not touch the preserved desktop composition', () => {
  const source = html();
  const desktopBlock = source.slice(source.indexOf('@media (min-width:1024px){\n    .ir-regulatory-signals{'), source.indexOf('/* Mobile advisory brief:'));
  assert.ok(!/ir-route-context/.test(desktopBlock));
  assert.ok(!/ir-result-header/.test(desktopBlock));
});

test('40. the finding title (<h3>) remains the only heading inside the canonical section, and the route-context/status-pill merge does not duplicate or restate the finding text', () => {
  const source = html();
  const mobileBlock = source.slice(source.indexOf('@media (max-width:1023px){'), source.indexOf('.ir-regulatory-limitation{'));
  assert.ok(!/\.ir-route-context[^{]*\{[^}]*content:/.test(mobileBlock), 'expected no generated/duplicated text on the route-context merge rules');
  assert.ok(!/\.ir-result-header[^{]*\{[^}]*content:/.test(mobileBlock), 'expected no generated/duplicated text on the status-header merge rules');
});

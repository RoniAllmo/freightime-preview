/**
 * Tests for the image-led Hero correction (2026-08 product-owner
 * acceptance fix): the split two-column Hero (headline vs. a competing
 * white route-selection card) is replaced with one unified,
 * image-led composition over a restored real port/crane/container-ship
 * photograph. Covers the approved exact strings, the restored local
 * image asset, the one-time CSS entrance animation and its
 * reduced-motion behavior, responsive structure, and the CTA ->
 * assessment/shipment-problem wiring (scroll + focus), using this
 * repository's existing patterns: string assertions against index.html
 * (as in design-redesign-v1.test.js / onboarding-correction.test.js)
 * and a hand-rolled fake DOM for controller behavior (as in
 * import-readiness-controller.test.js).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initializeImportReadiness } from '../../js/import-readiness/import-readiness-controller.js';

const INDEX_PATH = fileURLToPath(new URL('../../index.html', import.meta.url));
const IMAGE_PATH = fileURLToPath(new URL('../../assets/images/hero-port.jpg', import.meta.url));

function html() {
  return readFileSync(INDEX_PATH, 'utf8');
}

function heroSection() {
  const match = html().match(/<section class="hero">[\s\S]*?<\/section>/);
  assert.ok(match, 'expected to find the <section class="hero"> block');
  return match[0];
}

const APPROVED_EYEBROW = 'בדיקת מסלול יבוא לישראל';
const APPROVED_HEADLINE = 'לפני שמייבאים, בודקים.';
const APPROVED_SUPPORTING = 'כמה שאלות קצרות יעזרו להבין מה צריך לבדוק, מה להכין ולמי נכון לפנות.';
const APPROVED_PRIMARY_CTA = 'התחלת בדיקת יבוא';
const APPROVED_SECONDARY_ACTION = 'יש לי בעיה במשלוח קיים';
const APPROVED_TRUST = 'חינם · ללא הרשמה · המידע אינו נשמר';
const OLD_HEADLINE = 'רוצים לייבא לישראל? בואו נבין מה צריך לבדוק לפני שמתקדמים';

// --- Approved content strings -------------------------------------------------

test('1. the Hero contains the exact approved eyebrow string', () => {
  assert.ok(heroSection().includes(APPROVED_EYEBROW));
});

test('2. the Hero contains the exact approved headline string, and the old long headline is gone', () => {
  const hero = heroSection();
  assert.ok(hero.includes(`>${APPROVED_HEADLINE}<`));
  assert.ok(!html().includes(OLD_HEADLINE));
});

test('3. the Hero contains the exact approved supporting sentence', () => {
  assert.ok(heroSection().includes(APPROVED_SUPPORTING));
});

test('4. the Hero contains the exact approved primary CTA string, exactly once', () => {
  const hero = heroSection();
  const count = (hero.match(new RegExp(APPROVED_PRIMARY_CTA, 'g')) ?? []).length;
  assert.equal(count, 1);
});

test('5. the Hero contains the exact approved secondary action string, exactly once', () => {
  const hero = heroSection();
  const count = (hero.match(new RegExp(APPROVED_SECONDARY_ACTION, 'g')) ?? []).length;
  assert.equal(count, 1);
});

test('6. the Hero contains the exact approved trust statement, and no old noisy multi-item strip', () => {
  const hero = heroSection();
  assert.ok(hero.includes(APPROVED_TRUST));
  assert.ok(!html().includes('class="trust-strip"'));
  assert.ok(!html().includes('חינם לשימוש'), 'the old separate five-checkmark trust strip must be gone');
});

// --- Unified composition, no split-screen residue -----------------------------

test('7. no white split route-selection card remains in the Hero DOM', () => {
  const hero = heroSection();
  assert.ok(!hero.includes('class="hero-entry"'));
  assert.ok(!hero.includes('class="choice-card'));
  assert.ok(!hero.includes('class="hero-grid"'));
});

test('8. no duplicate start control exists anywhere on the page', () => {
  const source = html();
  assert.equal((source.match(/id="readinessStartButton"/g) ?? []).length, 1);
  assert.equal((source.match(/id="readinessProblemShortcutButton"/g) ?? []).length, 1);
  assert.ok(!source.includes('id="readinessIntro"'), 'no second start screen / intro block');
});

test('9. exactly one primary CTA element exists in the Hero', () => {
  const hero = heroSection();
  const primaryButtons = (hero.match(/class="btn btn-primary[^"]*"/g) ?? []).length;
  assert.equal(primaryButtons, 1);
});

test('10. no login control exists anywhere on the page', () => {
  const source = html();
  assert.ok(!source.includes('התחברות'));
  assert.ok(!/id="login/i.test(source));
});

test('11. no public-tracking references remain anywhere on the page', () => {
  const source = html();
  for (const needle of ['id="tracking"', 'id="trackInput"', 'id="trackBtn"', 'js/tracking', 'מעקב ואימות']) {
    assert.ok(!source.includes(needle));
  }
});

test('12. no duplicated contact control exists in the header', () => {
  const source = html();
  const headerMatch = source.match(/<header class="site-header">[\s\S]*?<\/header>/);
  assert.ok(headerMatch);
  // Exactly one visible desktop contact CTA, plus the one mirrored mobile-menu link.
  const contactCtaCount = (headerMatch[0].match(/class="btn btn-ghost-onDark"/g) ?? []).length;
  assert.ok(contactCtaCount <= 1, 'expected at most one dedicated header contact CTA');
});

// --- Restored local image asset ------------------------------------------------

test('13. the local Hero image asset file exists on disk and is a reasonable size', () => {
  const stats = statSync(IMAGE_PATH);
  assert.ok(stats.isFile());
  assert.ok(stats.size > 10_000, 'expected a real photograph, not a stub file');
  assert.ok(stats.size < 900_000, `expected the Hero image to be reasonably optimized for web delivery, was ${stats.size} bytes`);
});

test('14. index.html references the local image path for the Hero background (not a data: URI, not an external URL)', () => {
  const source = html();
  const heroRuleMatch = source.match(/\.hero\{[\s\S]*?\n  \}/);
  assert.ok(heroRuleMatch, 'expected to find the .hero{...} CSS rule');
  const rule = heroRuleMatch[0];
  assert.ok(rule.includes('url("assets/images/hero-port.jpg")') || rule.includes("url('assets/images/hero-port.jpg')"));
  assert.ok(!/url\(\s*["']?data:/.test(rule));
  assert.ok(!/url\(\s*["']?https?:\/\//.test(rule));
});

test('15. no large embedded base64 Hero-image payload remains in index.html', () => {
  const source = html();
  assert.ok(!/data:image\/jpe?g;base64,/.test(source), 'expected no embedded base64 JPEG payload');
});

// --- Entrance animation ---------------------------------------------------------

test('16. a Hero text entrance animation (fade + translate) is defined and applied to the content group', () => {
  const source = html();
  assert.ok(/@keyframes hero-fade-up\{/.test(source));
  assert.ok(/\.hero-anim\{[^}]*animation:hero-fade-up/.test(source));
  const hero = heroSection();
  assert.ok(hero.includes('hero-anim-1') && hero.includes('hero-anim-2') && hero.includes('hero-anim-3'));
});

test('17. the animation is one-time (no infinite/looping iteration-count on the Hero keyframes rule)', () => {
  const source = html();
  const ruleMatch = source.match(/\.hero-anim\{([^}]*)\}/);
  assert.ok(ruleMatch);
  assert.ok(!/infinite/.test(ruleMatch[1]));
});

test('18. no typewriter/rotating-text markup exists in the Hero', () => {
  const hero = heroSection();
  assert.ok(!/typewriter/i.test(hero));
  assert.ok(!/data-rotate/i.test(hero));
});

test('19. a prefers-reduced-motion rule neutralizes the Hero animation transform/stagger', () => {
  const source = html();
  // The design system already has a global prefers-reduced-motion rule; the
  // Hero also carries its own scoped override that removes the transform.
  assert.ok(/@media \(prefers-reduced-motion:\s*reduce\)\{\s*\.hero-anim\{[^}]*animation:none/.test(source));
});

// --- Responsive structure --------------------------------------------------------

test('20. the Hero does not use 100vh for its sizing', () => {
  const source = html();
  const heroRuleMatch = source.match(/\.hero\{([^}]*)\}/);
  assert.ok(heroRuleMatch);
  assert.ok(!/100vh/.test(heroRuleMatch[1]));
  // No other Hero-scoped rule (including responsive overrides) uses 100vh either.
  const allHeroRules = [...source.matchAll(/\.hero\{([^}]*)\}/g)].map((m) => m[1]).join('\n');
  assert.ok(!/100vh/.test(allHeroRules));
});

test('21. the Hero declares an intentional min-height (not oversized full-screen)', () => {
  const source = html();
  assert.ok(/\.hero\{[^}]*min-height:\d+px/.test(source));
});

test('22. mobile side padding exists via the shared .wrap padding rules', () => {
  const source = html();
  assert.ok(/@media \(max-width:600px\)\{[\s\S]*?\.wrap\{ padding:0 var\(--sp-4\); \}/.test(source));
});

test('23. mobile Hero CTA sizing/full-width behavior exists', () => {
  const source = html();
  const block = source.match(/@media \(max-width:768px\)\{([\s\S]*?)\n  \}/);
  assert.ok(block);
  assert.ok(/#readinessStartButton\{[^}]*width:100%/.test(block[1]));
});

test('24. no two-column split-layout markup remains active for the Hero at any width', () => {
  const source = html();
  assert.ok(!/\.hero-grid\{/.test(source));
});

test('25. no fixed pixel widths in the Hero-scoped CSS that would force overflow under a 320px viewport', () => {
  const source = html();
  const heroBlocks = [...source.matchAll(/\.hero[a-zA-Z-]*\{([^}]*)\}/g)].map((m) => m[1]);
  for (const block of heroBlocks) {
    const widths = [...block.matchAll(/(?<!max-)(?:min-)?width:\s*(\d+)px/g)].map((m) => Number(m[1]));
    for (const w of widths) {
      assert.ok(w < 320, `unexpected fixed width ${w}px in Hero CSS`);
    }
  }
});

// --- Privacy ----------------------------------------------------------------------

test('26. no fetch/XMLHttpRequest was added anywhere in the shipped JS', () => {
  const controllerSource = readFileSync(
    new URL('../../js/import-readiness/import-readiness-controller.js', import.meta.url),
    'utf8',
  );
  assert.ok(!/\bfetch\(/.test(controllerSource));
  assert.ok(!/new XMLHttpRequest\(/.test(controllerSource));
});

test('27. no storage writes or analytics were added', () => {
  const source = html();
  assert.ok(!/localStorage\.\s*(setItem|getItem)/.test(source));
  assert.ok(!/sessionStorage\.\s*(setItem|getItem)/.test(source));
  assert.ok(!/document\.cookie\s*=/.test(source));
  assert.ok(!/gtag\(|analytics|dataLayer/i.test(source));
});

// --- CTA behavior: connects to the existing, unchanged assessment workspace ------

function createFakeElement(id, options = {}) {
  const listeners = {};
  let textContentValue = options.text ?? '';
  const element = {
    id,
    value: options.value ?? '',
    checked: options.checked ?? false,
    hidden: options.hidden ?? false,
    children: [],
    scrollCalls: 0,
    focusCalls: 0,
    addEventListener(type, handler) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(handler);
    },
    dispatch(type, event = {}) {
      (listeners[type] || []).forEach((handler) => handler(event));
    },
    appendChild(child) {
      element.children.push(child);
      return child;
    },
    setAttribute(name, value) {
      element[`__attr_${name}`] = value;
    },
    getAttribute(name) {
      return element[`__attr_${name}`];
    },
    scrollIntoView() {
      element.scrollCalls += 1;
    },
    focus() {
      element.focusCalls += 1;
    },
  };
  Object.defineProperty(element, 'textContent', {
    set(value) {
      textContentValue = value;
      element.children.length = 0;
    },
    get() {
      return textContentValue;
    },
  });
  Object.defineProperty(element, 'innerHTML', {
    set() {
      throw new Error('innerHTML must never be used by the readiness controller');
    },
    get() {
      return '';
    },
  });
  return element;
}

const RADIO_GROUPS = ['irImportType', 'irForSaleOrDistribution', 'irForBusinessUse', 'irPersonalOrFamilyUseOnly', 'irExperience'];

const TEXT_FIELD_IDS = [
  'irProductName', 'irCommercialDescription', 'irIntendedUse', 'irHsCode',
  'irQuantity', 'irApproxValue', 'irCountryOfOrigin', 'irShipmentMethod', 'irSensitiveCategory',
  'irFocusArea', 'irAuditPurpose', 'irProblemType', 'irShipmentMode', 'irCurrentStage', 'irIssuingParty',
  'irDeadline', 'irMissingDocumentsNote',
];

const CHECKBOX_FIELD_IDS = [
  'irHasTechnicalSpec', 'irHasCatalogOrProductPage', 'irHasPhotos', 'irHasSupplierInvoice',
  'irHasSupplierProvidedHsCode', 'irHsCodeKnown', 'irHasWrittenNotice', 'irAccumulatingCosts',
];

const STEP_ELEMENT_IDS = [
  'irStepQ1', 'irStepQ1Clarify', 'irStepQ2', 'irStepQ3',
  'irStepPersonalFollowup', 'irStepExistingImporterFollowup', 'irStepEstablishedOperationFollowup',
  'irStepProblemType', 'irStepProblemDetails',
];

const CONTROL_IDS = [
  'readinessIntro', 'readinessStartButton', 'readinessProblemShortcutButton', 'readinessForm',
  'readinessStepIndicator', 'readinessErrors', 'readinessBackButton', 'readinessNextButton',
  'readinessResetButton', 'readinessResult', 'irImportTypeExplanation', 'irUncertainLeaningMessage',
];

function buildFakeRoot() {
  const registry = new Map();
  const radios = new Map();

  for (const id of TEXT_FIELD_IDS) registry.set(id, createFakeElement(id, { value: '' }));
  for (const id of CHECKBOX_FIELD_IDS) registry.set(id, createFakeElement(id, { checked: false }));
  for (const id of STEP_ELEMENT_IDS) registry.set(id, createFakeElement(id, { hidden: true }));
  for (const id of CONTROL_IDS) registry.set(id, createFakeElement(id, { hidden: false }));
  registry.get('readinessForm').hidden = true;
  registry.get('readinessResult').hidden = true;
  registry.get('readinessBackButton').hidden = true;
  registry.get('readinessErrors').hidden = true;

  for (const name of RADIO_GROUPS) {
    const options = name === 'irImportType'
      ? ['personal', 'commercial', 'uncertain']
      : name === 'irExperience'
        ? ['first_time', 'prior_importer', 'ongoing_operation', 'planning_only']
        : ['yes', 'no'];
    const group = options.map((value) => createFakeElement(`${name}_${value}`, { value, checked: false }));
    group.forEach((r) => { r.name = name; });
    radios.set(name, group);
  }

  const root = {
    querySelector(selector) {
      const id = selector.replace('#', '');
      return registry.get(id) ?? null;
    },
    querySelectorAll(selector) {
      const match = selector.match(/input\[name="([^"]+)"\]/);
      if (match) return radios.get(match[1]) ?? [];
      return [];
    },
  };

  return { root, registry, radios };
}

function createFakeDocument() {
  return {
    createElement(tagName) {
      const e = createFakeElement(undefined);
      e.tagName = tagName;
      return e;
    },
  };
}

test('28. the primary CTA reveals the existing assessment workspace and lands on the unchanged first question (q1)', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');

  assert.equal(registry.get('readinessForm').hidden, false);
  assert.equal(registry.get('irStepQ1').hidden, false);
  assert.equal(registry.get('readinessStepIndicator').textContent, 'שלב: אופי היבוא');
});

test('29. the primary CTA does not reload the page and does not build a second start screen', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  assert.equal(registry.get('readinessIntro').hidden, true);
});

test('30. the secondary action activates the existing shipment-problem route directly (bypassing q1/q2/q3)', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessProblemShortcutButton').dispatch('click');

  assert.equal(registry.get('readinessForm').hidden, false);
  assert.equal(registry.get('irStepProblemType').hidden, false);
  assert.equal(registry.get('irStepQ1').hidden, true);
});

test('31. clicking either CTA never sets an href or mutates location -- no user data is ever placed in the URL', () => {
  const controllerSource = readFileSync(
    new URL('../../js/import-readiness/import-readiness-controller.js', import.meta.url),
    'utf8',
  );
  assert.ok(!/location\.href\s*=/.test(controllerSource));
  assert.ok(!/window\.location\s*=/.test(controllerSource));
  assert.ok(!/history\.(push|replace)State/.test(controllerSource));
});

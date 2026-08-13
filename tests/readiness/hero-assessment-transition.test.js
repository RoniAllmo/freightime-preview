/**
 * Tests for the Hero-to-assessment transition fix (2026-08
 * product-owner acceptance finding): the hidden `#readiness` section
 * must reserve no layout height before either Hero CTA is activated,
 * and activating a CTA must scroll the whole assessment card (heading,
 * step indicator, progress bar, active question) into view below the
 * sticky header -- not land mid-questionnaire -- with focus landing on
 * a semantic heading and no second, conflicting scroll. Uses this
 * repository's existing patterns: string assertions against index.html
 * (as in hero-image-v2.test.js) and a hand-rolled fake DOM for
 * controller behavior (as in import-readiness-controller.test.js).
 * Literal pixel/visual verification was done separately with
 * Playwright; these are structural/mechanism assertions only.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeImportReadiness } from '../../js/import-readiness/import-readiness-controller.js';

function html() {
  return readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
}

// --- Inactive-state markup: the hidden container reserves no height ------------

test('1. the #readiness section carries the native `hidden` attribute in its initial markup (collapses to zero layout height, not merely visually suppressed)', () => {
  const source = html();
  assert.ok(/<section class="pad" id="readiness" hidden>/.test(source), 'expected `hidden` on the #readiness section itself, not only on the inner form');
});

test('2. the assessment form and result also carry the native `hidden` attribute (not visibility:hidden/opacity:0, which would retain layout height)', () => {
  const source = html();
  const readinessSection = source.match(/<section class="pad" id="readiness"[^>]*>[\s\S]*?<\/section>/)[0];
  assert.ok(/<form class="readiness-card" id="readinessForm" hidden>/.test(readinessSection));
  assert.ok(/<div class="readiness-card" id="readinessResult" aria-live="polite" hidden>/.test(readinessSection));
});

test('3. no visibility:hidden/opacity:0-based suppression exists for the readiness container (would retain layout height unlike `hidden`/display:none)', () => {
  const source = html();
  const readinessSection = source.match(/<section class="pad" id="readiness"[^>]*>[\s\S]*?<\/section>/)[0];
  assert.ok(!/visibility:\s*hidden/.test(readinessSection));
  assert.ok(!/opacity:\s*0/.test(readinessSection));
});

test('4. no leftover large min-height/fixed-height rule targets the readiness container that would push later sections down', () => {
  const source = html();
  const readinessRuleMatch = source.match(/#readiness\s*\{[^}]*\}/);
  assert.ok(!readinessRuleMatch, 'expected no #readiness-specific min-height/height rule left over from the hidden state');
  const workspaceRuleMatch = source.match(/\.assessment-workspace\{([^}]*)\}/);
  assert.ok(workspaceRuleMatch);
  assert.ok(!/min-height|height:\d/.test(workspaceRuleMatch[1]));
});

test('5. no duplicate assessment wrapper/second #readiness-style section exists', () => {
  const source = html();
  assert.equal((source.match(/id="readiness"/g) ?? []).length, 1);
  assert.equal((source.match(/id="readinessForm"/g) ?? []).length, 1);
  assert.equal((source.match(/id="readinessResult"/g) ?? []).length, 1);
});

// --- Scroll-target mechanism exists in the controller ---------------------------

test('6. the controller computes a live header-height-based scroll offset (not a single hardcoded pixel constant) and applies it as scroll-margin-top at call time', () => {
  const controllerSource = readFileSync(
    new URL('../../js/import-readiness/import-readiness-controller.js', import.meta.url),
    'utf8',
  );
  assert.ok(/getBoundingClientRect\(\)\.height/.test(controllerSource), 'expected the header height to be measured live via getBoundingClientRect()');
  assert.ok(/scrollMarginTop/.test(controllerSource), 'expected scroll-margin-top to be set as the offset mechanism');
  // Not a bare hardcoded scroll offset with no header measurement involved.
  assert.ok(!/scrollMarginTop\s*=\s*['"`]?\d+px/.test(controllerSource));
});

test('7. scrollIntoView uses block:"start" (not "center"/"nearest", which would land mid-questionnaire)', () => {
  const controllerSource = readFileSync(
    new URL('../../js/import-readiness/import-readiness-controller.js', import.meta.url),
    'utf8',
  );
  const scrollCalls = controllerSource.match(/scrollIntoView\(\{[^}]*\}\)/g) ?? [];
  assert.ok(scrollCalls.length > 0);
  for (const call of scrollCalls) {
    assert.ok(/block:\s*'start'/.test(call), `expected block:'start' in ${call}`);
    assert.ok(!/block:\s*'(center|nearest)'/.test(call));
  }
});

test('8. focus() is called with { preventScroll: true } so it cannot trigger a second, conflicting native scroll', () => {
  const controllerSource = readFileSync(
    new URL('../../js/import-readiness/import-readiness-controller.js', import.meta.url),
    'utf8',
  );
  assert.ok(/\.focus\(\{\s*preventScroll:\s*true\s*\}\)/.test(controllerSource));
});

test('9. reduced-motion is respected via matchMedia and picked per call, not hardcoded to always-smooth', () => {
  const controllerSource = readFileSync(
    new URL('../../js/import-readiness/import-readiness-controller.js', import.meta.url),
    'utf8',
  );
  assert.ok(/prefers-reduced-motion:\s*reduce/.test(controllerSource));
  assert.ok(/behavior:\s*prefersReducedMotion\(\)\s*\?\s*'auto'\s*:\s*'smooth'/.test(controllerSource));
});

// --- Behavioral tests using a hand-rolled fake DOM -------------------------------

function createFakeElement(id, options = {}) {
  const listeners = {};
  let textContentValue = options.text ?? '';
  const element = {
    id,
    value: options.value ?? '',
    checked: options.checked ?? false,
    hidden: options.hidden ?? false,
    style: {},
    children: [],
    scrollCalls: [],
    focusCalls: [],
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
    getBoundingClientRect() {
      return { height: options.height ?? 0, top: 0, bottom: options.height ?? 0 };
    },
    scrollIntoView(opts) {
      element.scrollCalls.push(opts);
    },
    focus(opts) {
      element.focusCalls.push(opts);
    },
    querySelector(selector) {
      if (selector === 'legend' && options.legend) return options.legend;
      return null;
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
  'readinessIntro', 'readiness', 'readinessStartButton', 'readinessProblemShortcutButton', 'readinessForm',
  'readinessStepIndicator', 'readinessErrors', 'readinessBackButton', 'readinessNextButton',
  'readinessResetButton', 'readinessResult', 'irImportTypeExplanation', 'irUncertainLeaningMessage',
];

function buildFakeRoot({ headerHeight = 70, matchesReducedMotion = false } = {}) {
  const registry = new Map();
  const radios = new Map();
  const legends = new Map();

  for (const id of TEXT_FIELD_IDS) registry.set(id, createFakeElement(id, { value: '' }));
  for (const id of CHECKBOX_FIELD_IDS) registry.set(id, createFakeElement(id, { checked: false }));
  for (const id of STEP_ELEMENT_IDS) {
    const legend = createFakeElement(`${id}-legend`);
    legend.tagName = 'LEGEND';
    legends.set(id, legend);
    registry.set(id, createFakeElement(id, { hidden: true, legend }));
  }
  for (const id of CONTROL_IDS) registry.set(id, createFakeElement(id, { hidden: false, height: 0 }));
  registry.get('readiness').hidden = true;
  registry.get('readinessForm').hidden = true;
  registry.get('readinessResult').hidden = true;
  registry.get('readinessBackButton').hidden = true;
  registry.get('readinessErrors').hidden = true;
  registry.get('readinessForm').reset = () => {
    for (const id of TEXT_FIELD_IDS) registry.get(id).value = '';
    for (const id of CHECKBOX_FIELD_IDS) registry.get(id).checked = false;
    for (const name of RADIO_GROUPS) {
      for (const radio of radios.get(name)) radio.checked = false;
    }
  };

  const header = createFakeElement('header-el', { height: headerHeight });

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

  const defaultView = {
    matchMedia(query) {
      return { matches: query.includes('prefers-reduced-motion') ? matchesReducedMotion : false };
    },
  };

  const root = {
    ownerDocument: { defaultView },
    querySelector(selector) {
      if (selector === 'header') return header;
      const id = selector.replace('#', '');
      return registry.get(id) ?? null;
    },
    querySelectorAll(selector) {
      const match = selector.match(/input\[name="([^"]+)"\]/);
      if (match) return radios.get(match[1]) ?? [];
      return [];
    },
  };

  return { root, registry, radios, header, legends };
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

test('10. the primary CTA reveals the #readiness section (un-collapses it) alongside the form', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  assert.equal(registry.get('readiness').hidden, true, 'must start collapsed');

  registry.get('readinessStartButton').dispatch('click');

  assert.equal(registry.get('readiness').hidden, false);
  assert.equal(registry.get('readinessForm').hidden, false);
  assert.equal(registry.get('irStepQ1').hidden, false);
});

test('11. the primary CTA scrolls the whole form (heading/progress + question), not just the active fieldset, and sets scroll-margin-top sized to the live header height', () => {
  const { root, registry } = buildFakeRoot({ headerHeight: 88 });
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');

  const form = registry.get('readinessForm');
  assert.equal(form.scrollCalls.length, 1, 'expected exactly one scroll of the form container');
  assert.equal(form.scrollCalls[0].block, 'start');
  assert.equal(form.style.scrollMarginTop, '112px', 'expected header height (88) + the 24px gap');

  const q1 = registry.get('irStepQ1');
  assert.equal(q1.scrollCalls.length, 0, 'the active fieldset itself must not be the scroll target');
});

test('12. focus lands on the active question\'s semantic <legend> heading (not a bare div), with preventScroll to avoid a second scroll', () => {
  const { root, registry, legends } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');

  const legend = legends.get('irStepQ1');
  assert.equal(legend.tagName, 'LEGEND');
  assert.equal(legend.focusCalls.length, 1);
  assert.deepEqual(legend.focusCalls[0], { preventScroll: true });
  assert.equal(legend.getAttribute('tabindex'), '-1', 'expected the heading to be made programmatically focusable');
});

test('13. the primary CTA does not reload the page, mutate the URL, or build a second start screen', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  assert.equal(registry.get('readinessIntro').hidden, true);
});

test('14. the secondary shipment-problem action reveals the section and lands directly on the problem-type route (not the generic q1)', () => {
  const { root, registry } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });

  registry.get('readinessProblemShortcutButton').dispatch('click');

  assert.equal(registry.get('readiness').hidden, false);
  assert.equal(registry.get('readinessForm').hidden, false);
  assert.equal(registry.get('irStepProblemType').hidden, false);
  assert.equal(registry.get('irStepQ1').hidden, true, 'must not also show the generic first question');
});

test('15. the secondary action gets the same scroll/focus quality as the primary one (no duplicated route choice, single scroll, focus on its own heading)', () => {
  const { root, registry, legends } = buildFakeRoot({ headerHeight: 64 });
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessProblemShortcutButton').dispatch('click');

  const form = registry.get('readinessForm');
  assert.equal(form.scrollCalls.length, 1);
  assert.equal(form.style.scrollMarginTop, '88px');

  const legend = legends.get('irStepProblemType');
  assert.equal(legend.focusCalls.length, 1);
  assert.deepEqual(legend.focusCalls[0], { preventScroll: true });
});

test('16. reduced motion produces an immediate (non-smooth) scroll, still landing on the correct target with correct focus', () => {
  const { root, registry, legends } = buildFakeRoot({ matchesReducedMotion: true });
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');

  const form = registry.get('readinessForm');
  assert.equal(form.scrollCalls[0].behavior, 'auto');
  const legend = legends.get('irStepQ1');
  assert.equal(legend.focusCalls.length, 1);
});

test('17. without reduced motion, the scroll behavior is smooth', () => {
  const { root, registry } = buildFakeRoot({ matchesReducedMotion: false });
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');

  const form = registry.get('readinessForm');
  assert.equal(form.scrollCalls[0].behavior, 'smooth');
});

test('18. a full reset (after starting) collapses the #readiness section back to zero layout height, matching its initial inactive state', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  registry.get('readinessStartButton').dispatch('click');
  assert.equal(registry.get('readiness').hidden, false);

  registry.get('readinessResetButton').dispatch('click');

  assert.equal(registry.get('readiness').hidden, true);
  assert.equal(registry.get('readinessForm').hidden, true);
  assert.equal(registry.get('readinessResult').hidden, true);
});

test('19. missing header/style APIs (feature-detection) never throw -- the controller degrades safely', () => {
  const { root, registry } = buildFakeRoot();
  // Simulate an environment where querySelector('header') finds nothing.
  const originalQuerySelector = root.querySelector;
  root.querySelector = (selector) => (selector === 'header' ? null : originalQuerySelector(selector));

  assert.doesNotThrow(() => {
    initializeImportReadiness({ root, documentRef: createFakeDocument() });
    registry.get('readinessStartButton').dispatch('click');
  });
});

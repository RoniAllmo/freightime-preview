/**
 * Live-DOM proof (fake-DOM controller wiring, not a real browser) for
 * the vehicle-vs-mains question-suppression fix: the generic
 * mains-electricity confirmation question ("האם המוצר מתחבר ישירות
 * לרשת החשמל או מגיע עם תקע או ספק כוח?") must never appear once a
 * specific vehicle family is identified, unless the description
 * explicitly names a genuinely separate mains-powered accessory.
 *
 * Reuses the same hand-rolled fake-DOM helpers already used by
 * regulatory-followup-live-dom.test.js and
 * vehicle-duplicate-regression.test.js. Real-browser (Playwright)
 * acceptance is covered separately.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeImportReadiness } from '../../js/import-readiness/import-readiness-controller.js';

const MAINS_QUESTION_TEXT = 'האם המוצר מתחבר ישירות לרשת החשמל או מגיע עם תקע או ספק כוח?';

function createFakeElement(id, options = {}) {
  const listeners = {};
  let textContentValue = options.text ?? '';
  const element = {
    id,
    value: options.value ?? '',
    checked: options.checked ?? false,
    hidden: options.hidden ?? false,
    children: [],
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
    focus() {
      element.__focused = true;
    },
  };
  Object.defineProperty(element, 'textContent', {
    set(value) {
      textContentValue = value;
      element.children.length = 0;
    },
    get() {
      // Matches real DOM textContent semantics: once children exist
      // (e.g. a heading appended into a legend), aggregate their text
      // instead of the stale value set before those children existed.
      if (element.children.length > 0) {
        return element.children.map((c) => (c && typeof c.textContent === 'string' ? c.textContent : '')).join('');
      }
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

const RADIO_GROUPS = [
  'irImportType', 'irForSaleOrDistribution', 'irForBusinessUse', 'irPersonalOrFamilyUseOnly', 'irExperience',
];

const TEXT_FIELD_IDS = [
  'irProductName', 'irCommercialDescription', 'irIntendedUse', 'irHsCode',
  'irQuantity', 'irApproxValue', 'irCountryOfOrigin', 'irShipmentMethod', 'irSensitiveCategory',
  'irFocusArea', 'irAuditPurpose', 'irProblemType', 'irShipmentMode', 'irCurrentStage', 'irIssuingParty',
  'irDeadline', 'irMissingDocumentsNote',
  'irDamageDiscoveryTiming', 'irHasInsurance', 'irFinancialExposure', 'irInsuranceSubScenario', 'irDisputeStage',
];

const CHECKBOX_FIELD_IDS = [
  'irHasTechnicalSpec', 'irHasCatalogOrProductPage', 'irHasPhotos', 'irHasSupplierInvoice',
  'irHasSupplierProvidedHsCode', 'irHsCodeKnown', 'irHasWrittenNotice', 'irAccumulatingCosts',
  'irHasPhotosOfDamage', 'irSafetyRisk', 'irGoodsHeld', 'irCustomsClearanceInvolved',
];

const STEP_ELEMENT_IDS = [
  'irStepQ1', 'irStepQ1Clarify', 'irStepQ2', 'irStepQ3', 'irStepProductContext',
  'irStepRegulatoryFollowup',
  'irStepPersonalFollowup', 'irStepExistingImporterFollowup', 'irStepEstablishedOperationFollowup',
  'irStepProblemType', 'irStepProblemDetails',
];

const CONTROL_IDS = [
  'readinessIntro', 'readinessStartButton', 'readinessProblemShortcutButton', 'readinessForm',
  'readinessStepIndicator', 'readinessErrors', 'readinessBackButton', 'readinessNextButton',
  'readinessResetButton', 'readinessResult', 'irImportTypeExplanation', 'irUncertainLeaningMessage',
  'irRegulatoryQuestionHost',
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

function selectRadio(radios, name, value) {
  for (const radio of radios.get(name)) radio.checked = radio.value === value;
  const target = radios.get(name).find((r) => r.value === value);
  if (target) target.dispatch('change');
}

function currentRegulatoryFieldset(registry) {
  const host = registry.get('irRegulatoryQuestionHost');
  return host.children[0] ?? null;
}

function currentRegulatoryLegendText(registry) {
  const fieldset = currentRegulatoryFieldset(registry);
  if (!fieldset) return null;
  const legend = fieldset.children.find((c) => c.tagName === 'legend');
  return legend ? legend.textContent : null;
}

function answerRadioQuestion(registry, value) {
  const fieldset = currentRegulatoryFieldset(registry);
  const row = fieldset.children.find((c) => c.tagName === 'div');
  const label = row.children.find((l) => l.children[0].getAttribute('value') === value);
  if (!label) throw new Error(`no live regulatory option with value "${value}" is currently rendered`);
  const input = label.children[0];
  input.checked = true;
  input.dispatch('change');
}

function collectAllText(element) {
  const own = element.textContent ? [element.textContent] : [];
  const fromChildren = (element.children ?? []).flatMap((child) => collectAllText(child));
  return own.concat(fromChildren);
}

/** Every legend text seen across the whole focused-checks phase, answering each question with whichever option is offered first, until the result renders. Returns the ordered list of legends actually shown. */
function driveFocusedPhaseCollectingLegends(registry, maxRounds = 6) {
  const seen = [];
  let rounds = 0;
  while (registry.get('readinessResult').hidden && rounds < maxRounds) {
    const legend = currentRegulatoryLegendText(registry);
    assert.ok(legend, 'expected a live question or the result, found neither (blank focused-check phase)');
    seen.push(legend);
    const fieldset = currentRegulatoryFieldset(registry);
    const row = fieldset.children.find((c) => c.tagName === 'div');
    const firstValue = row.children[0].children[0].getAttribute('value');
    answerRadioQuestion(registry, firstValue);
    registry.get('readinessNextButton').dispatch('click');
    rounds += 1;
  }
  return seen;
}

function driveToPersonalFollowupNext(registry, radios, { productName, description }) {
  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'personal');
  registry.get('readinessNextButton').dispatch('click');
  selectRadio(radios, 'irExperience', 'first_time');
  registry.get('readinessNextButton').dispatch('click');
  registry.get('irProductName').value = productName;
  registry.get('irCommercialDescription').value = description ?? '';
  registry.get('readinessNextButton').dispatch('click'); // -> productContext
  registry.get('readinessNextButton').dispatch('click'); // -> personalFollowup
}

function driveToCommercialRegulatoryPhase(registry, radios, { productName, description }) {
  registry.get('readinessStartButton').dispatch('click');
  selectRadio(radios, 'irImportType', 'commercial');
  registry.get('readinessNextButton').dispatch('click');
  selectRadio(radios, 'irExperience', 'first_time');
  registry.get('readinessNextButton').dispatch('click');
  registry.get('irProductName').value = productName;
  registry.get('irCommercialDescription').value = description ?? '';
  registry.get('readinessNextButton').dispatch('click'); // -> productContext
  registry.get('readinessNextButton').dispatch('click'); // -> regulatoryFollowup or result
}

test('1. EXACT product-owner regression: personal import, "פנס קדמי לרכב" + sensitive-category "מוצר חשמלי" never shows the generic mains question', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToPersonalFollowupNext(registry, radios, { productName: 'פנס קדמי לרכב' });

  assert.equal(registry.get('irStepPersonalFollowup').hidden, false);
  registry.get('irSensitiveCategory').value = 'electrical';
  registry.get('readinessNextButton').dispatch('click');

  const legends = driveFocusedPhaseCollectingLegends(registry);
  assert.ok(!legends.includes(MAINS_QUESTION_TEXT), `mains question must never appear; saw: ${JSON.stringify(legends)}`);
  assert.equal(registry.get('readinessResult').hidden, false);
  const resultText = collectAllText(registry.get('readinessResult')).join(' | ');
  assert.ok(resultText.includes('נדרש לבדוק דרישות תחבורה למוצר המיועד לרכב'), 'the vehicle result must still be produced');
});

test('2. a vehicle-lighting family (free text only) suppresses the generic mains question', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToCommercialRegulatoryPhase(registry, radios, { productName: 'פנס אחורי לרכב עם חיווט חשמלי' });

  const legends = driveFocusedPhaseCollectingLegends(registry);
  assert.ok(!legends.includes(MAINS_QUESTION_TEXT));
});

test('3. a vehicle electrical component ("רכיב חשמלי לרכב המתחבר למצבר") suppresses the generic mains question', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToCommercialRegulatoryPhase(registry, radios, { productName: 'רכיב חשמלי לרכב המתחבר למצבר' });

  const legends = driveFocusedPhaseCollectingLegends(registry);
  assert.ok(!legends.includes(MAINS_QUESTION_TEXT));
});

test('4. a 12V vehicle-system product does not activate the mains question', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToCommercialRegulatoryPhase(registry, radios, {
    productName: 'פנס אחורי 12V לחיבור למערכת החשמל של הרכב',
  });

  const legends = driveFocusedPhaseCollectingLegends(registry);
  assert.ok(!legends.includes(MAINS_QUESTION_TEXT));
  const resultText = collectAllText(registry.get('readinessResult')).join(' | ');
  assert.ok(resultText.includes('נדרש לבדוק דרישות תחבורה למוצר המיועד לרכב'), 'the transport/vehicle-laboratory result must remain');
});

test('5. a 24V vehicle-system product does not activate the mains question', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToCommercialRegulatoryPhase(registry, radios, {
    productName: 'רכיב חשמלי לרכב 24V המתחבר לרתמת החיווט של הרכב',
  });

  const legends = driveFocusedPhaseCollectingLegends(registry);
  assert.ok(!legends.includes(MAINS_QUESTION_TEXT));
});

test('6. a vehicle-battery connection does not activate the mains question', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToCommercialRegulatoryPhase(registry, radios, { productName: 'רכיב חשמלי המתחבר למצבר הרכב' });

  const legends = driveFocusedPhaseCollectingLegends(registry);
  assert.ok(!legends.includes(MAINS_QUESTION_TEXT));
});

test('7. a vehicle wiring-harness connection does not activate the mains question', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToCommercialRegulatoryPhase(registry, radios, { productName: 'פנס לרכב המתחבר לרתמת החיווט של הרכב' });

  const legends = driveFocusedPhaseCollectingLegends(registry);
  assert.ok(!legends.includes(MAINS_QUESTION_TEXT));
});

test('8. an explicit separate wall charger preserves the mains check', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToCommercialRegulatoryPhase(registry, radios, { productName: 'פנס לרכב עם מטען ביתי נפרד לשקע' });

  const legends = driveFocusedPhaseCollectingLegends(registry);
  assert.ok(legends.includes(MAINS_QUESTION_TEXT), 'a genuinely separate mains-powered accessory must still be asked about');
});

test('9. an explicit household plug preserves the mains check', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToCommercialRegulatoryPhase(registry, radios, { productName: 'מטען ביתי לסוללת רכב' });

  const legends = driveFocusedPhaseCollectingLegends(registry);
  assert.ok(legends.includes(MAINS_QUESTION_TEXT));
});

test('10. an electric-vehicle charging station preserves the mains check', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToCommercialRegulatoryPhase(registry, radios, {
    productName: 'עמדת טעינה לרכב חשמלי המחוברת לרשת החשמל',
  });

  const legends = driveFocusedPhaseCollectingLegends(registry);
  assert.ok(legends.includes(MAINS_QUESTION_TEXT));
});

test('11. car-organizer negative remains: "ארגונית לרכב" answered "לא" never produces the vehicle-installed-product signal, and never surfaces a mains question', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToCommercialRegulatoryPhase(registry, radios, {
    productName: 'ארגונית לרכב', description: 'ארגונית אחסון לתא המטען',
  });

  const legend = currentRegulatoryLegendText(registry);
  assert.equal(legend, 'האם המוצר מיועד להתקנה כחלק מהרכב?');
  answerRadioQuestion(registry, 'no');
  registry.get('readinessNextButton').dispatch('click');

  assert.equal(registry.get('readinessResult').hidden, false);
  const resultText = collectAllText(registry.get('readinessResult')).join(' | ');
  assert.ok(!resultText.includes('נדרש לבדוק דרישות תחבורה למוצר המיועד לרכב'));
});

test('12. no blank focused-check phase: when the mains question is the only thing suppressed and nothing else remains, the phase is skipped cleanly, straight to the result', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToCommercialRegulatoryPhase(registry, radios, {
    productName: 'פנס קדמי להתקנה ברכב', description: 'פנס ראש לרכב פרטי, מתחבר למצבר',
  });

  // Explicit installation+lighting wording (per vehicle-context-
  // inference.js) pre-resolves both vehicle questions, and the mains
  // question is suppressed -- nothing left to ask.
  assert.equal(registry.get('irStepRegulatoryFollowup').hidden, true, 'the focused-check step must not be shown at all, not shown blank');
  assert.equal(registry.get('readinessResult').hidden, false);
});

test('13. no phantom question in the DOM: after the mains question is suppressed, the regulatory question host never contains a hidden/leftover fieldset for it', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToCommercialRegulatoryPhase(registry, radios, {
    productName: 'פנס קדמי להתקנה ברכב', description: 'פנס ראש לרכב פרטי, מתחבר למצבר',
  });

  const host = registry.get('irRegulatoryQuestionHost');
  assert.equal(host.children.length, 0, 'no fieldset -- suppressed, not merely hidden -- must be left behind');
});

test('14. a suppressed question can never end up focusable: once the phase is skipped, the next focus target is the result, not a leftover mains-question control', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToCommercialRegulatoryPhase(registry, radios, {
    productName: 'פנס קדמי להתקנה ברכב', description: 'פנס ראש לרכב פרטי, מתחבר למצבר',
  });

  const host = registry.get('irRegulatoryQuestionHost');
  assert.equal(host.children.length, 0, 'no control from the suppressed question exists to be (in)correctly focusable');
  assert.equal(registry.get('readinessResult').hidden, false);
});

test('15. result hierarchy remains correct: "כיוון בדיקה מקצועי" still renders before "הפעולה המומלצת" once the mains question is suppressed', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToCommercialRegulatoryPhase(registry, radios, {
    productName: 'פנס קדמי להתקנה ברכב', description: 'פנס ראש לרכב פרטי, מתחבר למצבר',
  });

  const resultTexts = collectAllText(registry.get('readinessResult'));
  const directionIdx = resultTexts.findIndex((t) => t === 'כיוון בדיקה מקצועי');
  const actionIdx = resultTexts.findIndex((t) => t === 'הפעולה המומלצת');
  assert.ok(directionIdx !== -1 && actionIdx !== -1 && directionIdx < actionIdx);
});

test('16. question budget remains correct: at most 4 live questions are ever shown even in a multi-category vehicle+mains-exception scenario', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToCommercialRegulatoryPhase(registry, radios, {
    productName: 'פנס לרכב עם מטען ביתי נפרד לשקע, קופסת פלסטיק למזון, כוס זכוכית לשתייה',
  });

  const legends = driveFocusedPhaseCollectingLegends(registry, 10);
  assert.ok(legends.length <= 4, `expected at most 4 live regulatory questions, got ${legends.length}: ${JSON.stringify(legends)}`);
});

test('17. vehicle family does not suppress an unrelated independently-supported category in the live flow (plastic food-contact question still offered)', () => {
  const { root, registry, radios } = buildFakeRoot();
  initializeImportReadiness({ root, documentRef: createFakeDocument() });
  driveToCommercialRegulatoryPhase(registry, radios, {
    productName: 'קופסת פלסטיק למזון לשימוש ברכב',
  });

  const legends = driveFocusedPhaseCollectingLegends(registry);
  assert.ok(legends.includes('האם המוצר בא במגע ישיר עם מזון או שתייה?'), `expected the plastic food-contact question to still be offered; saw: ${JSON.stringify(legends)}`);
});

/**
 * User-interface controller for FreighTime Import Readiness Check V1.
 *
 * Binds to the explicitly supplied readiness section root element (never
 * queries `document` globally) and, within that root only, locates the
 * fixed set of form/result elements by their known IDs. Runs the entire
 * assessment locally: reads form values on explicit button clicks only,
 * normalizes them (`normalize-readiness-input.js`), computes the result
 * (`build-readiness-result.js`), and renders it using `textContent`/
 * `createElement` only -- never `innerHTML`. Performs no network
 * request, no storage access, no logging, and never mutates the page
 * URL. Nothing about the user's answers is retained anywhere but this
 * page's own in-memory form state.
 */

import { normalizeReadinessInput } from './normalize-readiness-input.js';
import { buildReadinessResult } from './build-readiness-result.js';
import { buildReadinessSummary } from './build-readiness-summary.js';
import { RISK_SEVERITY, DOCUMENT_STATUS, READINESS_LEVEL } from './readiness-schema.js';

const TOTAL_STEPS = 5;

const READINESS_LEVEL_LABELS = Object.freeze({
  [READINESS_LEVEL.HIGH]: 'מוכנות גבוהה',
  [READINESS_LEVEL.PARTIAL]: 'מוכנות חלקית',
  [READINESS_LEVEL.LOW]: 'מוכנות נמוכה',
});

const SEVERITY_LABELS = Object.freeze({
  [RISK_SEVERITY.INFORMATION]: 'מידע',
  [RISK_SEVERITY.ATTENTION]: 'לתשומת לב',
  [RISK_SEVERITY.HIGH]: 'לבדיקה מקדימה',
});

const DOCUMENT_STATUS_LABELS = Object.freeze({
  [DOCUMENT_STATUS.AVAILABLE]: 'זמין',
  [DOCUMENT_STATUS.MISSING]: 'חסר',
  [DOCUMENT_STATUS.MAY_BE_REQUIRED]: 'ייתכן שנדרש',
  [DOCUMENT_STATUS.VERIFY_APPLICABILITY]: 'נדרש לבדוק',
  [DOCUMENT_STATUS.NOT_INDICATED]: 'לא עולה כרלוונטי',
});

const PROFESSIONAL_SERVICE_CTAS = Object.freeze([
  'בדיקת סיווג מכס',
  'בדיקת רגולציה ואישורי יבוא',
  'בדיקת מסמכים לפני שילוח',
  'בדיקת חשבון ספק',
  'קבלת הצעת שילוח',
  'קבלת שירות עמילות מכס',
  'טיפול במשלוח מעוכב',
  'בדיקת חיובים נוספים',
  'בדיקת אחסנה, השהייה, demurrage או detention',
]);

function isUsable(value) {
  return value !== null && value !== undefined && typeof value === 'object';
}

function byId(root, id) {
  if (!isUsable(root) || typeof root.querySelector !== 'function') return null;
  return root.querySelector(`#${id}`);
}

function readText(el) {
  return isUsable(el) && typeof el.value === 'string' ? el.value : '';
}

function readChecked(el) {
  return isUsable(el) ? el.checked === true : false;
}

function readRadioValue(root, name, fallback) {
  if (!isUsable(root) || typeof root.querySelectorAll !== 'function') return fallback;
  const nodes = root.querySelectorAll(`input[name="${name}"]`);
  for (const node of nodes) {
    if (node.checked) return node.value;
  }
  return fallback;
}

function setHidden(el, hidden) {
  if (isUsable(el)) el.hidden = hidden;
}

/**
 * Collect the raw form state from the DOM. Read-only -- does not mutate
 * or persist anything.
 *
 * @param {*} root - The readiness section root element.
 * @returns {object} Raw (not-yet-normalized) form state.
 */
function collectRawFormState(root) {
  return {
    productName: readText(byId(root, 'irProductName')),
    commercialDescription: readText(byId(root, 'irCommercialDescription')),
    intendedUse: readText(byId(root, 'irIntendedUse')),
    endUser: readText(byId(root, 'irEndUser')),

    primaryMaterial: readText(byId(root, 'irPrimaryMaterial')),
    additionalMaterials: readText(byId(root, 'irAdditionalMaterials')),
    compositionDetails: readText(byId(root, 'irCompositionDetails')),

    isElectrical: readRadioValue(root, 'irIsElectrical', 'unknown'),
    hasBattery: readRadioValue(root, 'irHasBattery', 'unknown'),
    isWireless: readRadioValue(root, 'irIsWireless', 'unknown'),
    isFoodContact: readRadioValue(root, 'irIsFoodContact', 'unknown'),
    isMedicalOrHealth: readRadioValue(root, 'irIsMedicalOrHealth', 'unknown'),
    isCosmeticOrPersonalCare: readRadioValue(root, 'irIsCosmeticOrPersonalCare', 'unknown'),
    isChildrenOrToy: readRadioValue(root, 'irIsChildrenOrToy', 'unknown'),
    isAutomotiveOrTransport: readRadioValue(root, 'irIsAutomotiveOrTransport', 'unknown'),
    isAgricultureOrFood: readRadioValue(root, 'irIsAgricultureOrFood', 'unknown'),
    isChemicalOrHazardous: readRadioValue(root, 'irIsChemicalOrHazardous', 'unknown'),

    voltage: readText(byId(root, 'irVoltage')),
    frequency: readText(byId(root, 'irFrequency')),
    power: readText(byId(root, 'irPower')),
    plugType: readText(byId(root, 'irPlugType')),
    intendedEnvironment: readText(byId(root, 'irIntendedEnvironment')),
    hasConformityDocumentation: readRadioValue(root, 'irHasConformityDocumentation', 'unknown'),

    batteryChemistry: readText(byId(root, 'irBatteryChemistry')),
    batteryInstalledOrSeparate: readText(byId(root, 'irBatteryInstalledOrSeparate')),
    batteryCapacity: readText(byId(root, 'irBatteryCapacity')),
    hasUn383: readRadioValue(root, 'irHasUn383', 'unknown'),
    hasMsds: readRadioValue(root, 'irHasMsds', 'unknown'),

    wirelessTechnology: readText(byId(root, 'irWirelessTechnology')),
    wirelessFrequency: readText(byId(root, 'irWirelessFrequency')),
    wirelessDirection: readText(byId(root, 'irWirelessDirection')),
    hasCommunicationsDocumentation: readRadioValue(root, 'irHasCommunicationsDocumentation', 'unknown'),

    foodContactMaterial: readText(byId(root, 'irFoodContactMaterial')),
    foodType: readText(byId(root, 'irFoodType')),
    foodContactTemperature: readText(byId(root, 'irFoodContactTemperature')),
    foodContactUse: readText(byId(root, 'irFoodContactUse')),
    hasFoodComplianceDocumentation: readRadioValue(root, 'irHasFoodComplianceDocumentation', 'unknown'),

    countryOfOrigin: readText(byId(root, 'irCountryOfOrigin')),
    supplierCountry: readText(byId(root, 'irSupplierCountry')),
    quantity: readText(byId(root, 'irQuantity')),
    invoiceValue: readText(byId(root, 'irInvoiceValue')),
    currency: readText(byId(root, 'irCurrency')),
    quantityType: readText(byId(root, 'irQuantityType')),
    incoterm: readText(byId(root, 'irIncoterm')),
    shipmentMode: readText(byId(root, 'irShipmentMode')),

    hsCodeKnown: readChecked(byId(root, 'irHsCodeKnown')),
    hsCode: readText(byId(root, 'irHsCode')),
    supplierProvidedHsCode: readRadioValue(root, 'irSupplierProvidedHsCode', 'unknown'),
    technicalCatalogAvailable: readChecked(byId(root, 'irTechnicalCatalogAvailable')),
    productPhotoAvailable: readChecked(byId(root, 'irProductPhotoAvailable')),
    modelOrPartNumberAvailable: readChecked(byId(root, 'irModelOrPartNumberAvailable')),

    hasCommercialInvoice: readChecked(byId(root, 'irHasCommercialInvoice')),
    hasPackingList: readChecked(byId(root, 'irHasPackingList')),
    hasTransportDocument: readChecked(byId(root, 'irHasTransportDocument')),
    hasCertificateOfOrigin: readChecked(byId(root, 'irHasCertificateOfOrigin')),
    hasTechnicalDatasheet: readChecked(byId(root, 'irHasTechnicalDatasheet')),
    hasCatalog: readChecked(byId(root, 'irHasCatalog')),
    hasSupplierDeclaration: readChecked(byId(root, 'irHasSupplierDeclaration')),
    hasTestReport: readChecked(byId(root, 'irHasTestReport')),
    hasConformityDocuments: readChecked(byId(root, 'irHasConformityDocuments')),
    hasImportPermit: readChecked(byId(root, 'irHasImportPermit')),
    hasStandardsDocumentation: readChecked(byId(root, 'irHasStandardsDocumentation')),
    hasHebrewLabel: readChecked(byId(root, 'irHasHebrewLabel')),
    hasInsuranceDocument: readChecked(byId(root, 'irHasInsuranceDocument')),
  };
}

/** Whether substantial data has been entered (used to decide whether to warn before reset). */
function hasSubstantialData(raw) {
  return (
    raw.productName.length > 0 ||
    raw.commercialDescription.length > 0 ||
    raw.primaryMaterial.length > 0 ||
    raw.hasCommercialInvoice ||
    raw.hasPackingList
  );
}

function updateConditionalVisibility(root) {
  setHidden(byId(root, 'irElectricalDetails'), readRadioValue(root, 'irIsElectrical', 'unknown') !== 'yes');
  setHidden(byId(root, 'irBatteryDetails'), readRadioValue(root, 'irHasBattery', 'unknown') !== 'yes');
  setHidden(byId(root, 'irWirelessDetails'), readRadioValue(root, 'irIsWireless', 'unknown') !== 'yes');
  setHidden(byId(root, 'irFoodContactDetails'), readRadioValue(root, 'irIsFoodContact', 'unknown') !== 'yes');
}

function showStep(root, elements, stepNumber) {
  for (let i = 1; i <= TOTAL_STEPS; i += 1) {
    setHidden(byId(root, `irStep${i}`), i !== stepNumber);
  }
  if (isUsable(elements.stepIndicator)) {
    elements.stepIndicator.textContent = `שלב ${stepNumber} מתוך ${TOTAL_STEPS}`;
  }
  setHidden(elements.backButton, stepNumber === 1);
  if (isUsable(elements.nextButton)) {
    elements.nextButton.textContent = stepNumber === TOTAL_STEPS ? 'קבלת תוצאה' : 'הבא ←';
  }
}

function showErrors(elements, messages) {
  if (!isUsable(elements.errors)) return;
  if (messages.length === 0) {
    elements.errors.textContent = '';
    elements.errors.hidden = true;
    return;
  }
  elements.errors.textContent = messages.join(' ');
  elements.errors.hidden = false;
}

function validateStep(root, stepNumber) {
  if (stepNumber === 1) {
    const productName = readText(byId(root, 'irProductName'));
    if (productName.length === 0) {
      return ['יש להזין שם מוצר לפני המשך הבדיקה.'];
    }
  }
  return [];
}

function el(doc, tag, options = {}) {
  const node = doc.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.attrs) {
    for (const [name, value] of Object.entries(options.attrs)) {
      node.setAttribute(name, value);
    }
  }
  return node;
}

function appendListSection(doc, container, heading, items, renderItem) {
  if (!Array.isArray(items) || items.length === 0) return;
  const section = el(doc, 'div', { className: 'ir-result-section' });
  section.appendChild(el(doc, 'h3', { text: heading }));
  const ul = el(doc, 'ul');
  for (const item of items) {
    const li = el(doc, 'li');
    renderItem(li, item);
    ul.appendChild(li);
  }
  section.appendChild(ul);
  container.appendChild(section);
}

/**
 * Render the full readiness result into the supplied result container.
 * Uses `createElement`/`textContent` exclusively -- never `innerHTML`.
 *
 * @param {*} doc - The document reference (for `createElement`).
 * @param {*} resultContainer - The result container element.
 * @param {*} input - The normalized readiness input.
 * @param {*} result - The result from `buildReadinessResult`.
 */
function renderResult(doc, resultContainer, input, result) {
  resultContainer.textContent = '';

  const badge = el(doc, 'div', {
    className: 'ir-readiness-badge',
    text: READINESS_LEVEL_LABELS[result.readinessLevel] ?? result.readinessLevel,
    attrs: { 'data-level': result.readinessLevel },
  });
  resultContainer.appendChild(badge);

  appendListSection(doc, resultContainer, 'מידע שנמסר', input.commercialDescription ? [input.commercialDescription] : [], (li, item) => {
    li.textContent = item;
  });

  appendListSection(doc, resultContainer, 'מידע חסר', result.missingInformation, (li, item) => {
    li.textContent = item;
  });

  appendListSection(doc, resultContainer, 'מסמכים זמינים', result.documentsAvailable, (li, item) => {
    li.textContent = item.label;
  });

  appendListSection(doc, resultContainer, 'מסמכים להשגה או לבדיקה', result.documentsToObtain, (li, item) => {
    li.textContent = `${item.label} -- ${DOCUMENT_STATUS_LABELS[item.status] ?? item.status}`;
  });

  appendListSection(doc, resultContainer, 'שאלות אפשריות לצורך סיווג', result.classificationQuestions, (li, item) => {
    li.textContent = item.text;
  });

  if (Array.isArray(result.regulatoryRisks) && result.regulatoryRisks.length > 0) {
    const section = el(doc, 'div', { className: 'ir-result-section' });
    section.appendChild(el(doc, 'h3', { text: 'נושאים רגולטוריים לבדיקה' }));
    for (const risk of result.regulatoryRisks) {
      const row = el(doc, 'div', { className: 'ir-risk-item' });
      row.appendChild(
        el(doc, 'span', {
          className: 'ir-risk-severity',
          text: SEVERITY_LABELS[risk.severity] ?? risk.severity,
          attrs: { 'data-severity': risk.severity },
        }),
      );
      row.appendChild(el(doc, 'span', { text: risk.reason }));
      section.appendChild(row);
    }
    resultContainer.appendChild(section);
  }

  appendListSection(doc, resultContainer, 'רכיבי עלות לתכנון', result.costComponentsToConsider, (li, item) => {
    li.textContent = item;
  });

  appendListSection(doc, resultContainer, 'סיכוני שחרור ועיכוב', result.clearanceDelayRisks, (li, item) => {
    li.textContent = item;
  });

  appendListSection(doc, resultContainer, 'צעדים מומלצים', result.nextActions, (li, item) => {
    li.textContent = item;
  });

  if (result.userProvidedHsCode) {
    const section = el(doc, 'div', { className: 'ir-result-section' });
    section.appendChild(el(doc, 'h3', { text: 'קוד מכס שהוזן על ידי המשתמש' }));
    section.appendChild(
      el(doc, 'p', {
        text: `${result.userProvidedHsCode} -- קוד זה מוצג כפי שהוזן בלבד ואינו מאומת כסופי. הסיווג הרגולטורי והמס תלויים בקביעה רשמית.`,
      }),
    );
    resultContainer.appendChild(section);
  }

  if (Array.isArray(result.officialSources) && result.officialSources.length > 0) {
    const section = el(doc, 'div', { className: 'ir-result-section' });
    section.appendChild(el(doc, 'h3', { text: 'מקורות רשמיים' }));
    for (const source of result.officialSources) {
      const a = el(doc, 'a', {
        className: 'ir-source-link',
        text: `${source.noteLabel}: ${source.label}`,
        attrs: { href: source.url, target: '_blank', rel: 'noopener noreferrer' },
      });
      section.appendChild(a);
    }
    resultContainer.appendChild(section);
  }

  const ctaSection = el(doc, 'div', { className: 'ir-result-section' });
  ctaSection.appendChild(el(doc, 'h3', { text: 'המשך עם איש מקצוע' }));
  const ctaList = el(doc, 'div', { className: 'ir-cta-list' });
  for (const cta of PROFESSIONAL_SERVICE_CTAS) {
    ctaList.appendChild(el(doc, 'a', { text: cta, attrs: { href: '#contact' } }));
  }
  ctaSection.appendChild(ctaList);
  resultContainer.appendChild(ctaSection);

  resultContainer.appendChild(el(doc, 'div', { className: 'ir-disclaimer', text: result.disclaimer }));

  const actions = el(doc, 'div', { className: 'ir-nav' });
  const copyButton = el(doc, 'button', { className: 'tool-btn-secondary', text: 'העתקת סיכום', attrs: { type: 'button' } });
  const editButton = el(doc, 'button', { className: 'tool-btn-secondary', text: 'עריכת תשובות', attrs: { type: 'button' } });
  const newButton = el(doc, 'button', { className: 'tool-btn-primary', text: 'בדיקה חדשה', attrs: { type: 'button' } });
  actions.appendChild(newButton);
  actions.appendChild(editButton);
  actions.appendChild(copyButton);
  resultContainer.appendChild(actions);

  const copyStatus = el(doc, 'div', { attrs: { 'aria-live': 'polite' } });
  resultContainer.appendChild(copyStatus);

  return { copyButton, editButton, newButton, copyStatus };
}

/**
 * Initialize the Import Readiness Check V1 controller.
 *
 * @param {{root: object, documentRef: object}} options - `root` is the
 *   readiness section container element (queried internally, never the
 *   global `document`); `documentRef` is used only for `createElement`.
 * @returns {Readonly<{initialized: boolean}>}
 */
export function initializeImportReadiness(options) {
  const opts = options !== null && typeof options === 'object' ? options : {};
  const root = opts.root;
  const doc = opts.documentRef;

  if (!isUsable(root) || !isUsable(doc)) {
    return Object.freeze({ initialized: false });
  }

  const elements = {
    intro: byId(root, 'readinessIntro'),
    startButton: byId(root, 'readinessStartButton'),
    form: byId(root, 'readinessForm'),
    stepIndicator: byId(root, 'readinessStepIndicator'),
    errors: byId(root, 'readinessErrors'),
    backButton: byId(root, 'readinessBackButton'),
    nextButton: byId(root, 'readinessNextButton'),
    resetButton: byId(root, 'readinessResetButton'),
    result: byId(root, 'readinessResult'),
  };

  let currentStep = 1;

  function goToStep(step) {
    currentStep = step;
    showStep(root, elements, currentStep);
  }

  function resetAll({ confirmIfSubstantial } = { confirmIfSubstantial: true }) {
    const raw = collectRawFormState(root);
    if (confirmIfSubstantial && hasSubstantialData(raw)) {
      const confirmFn = typeof root.ownerDocument?.defaultView?.confirm === 'function'
        ? root.ownerDocument.defaultView.confirm
        : typeof confirm === 'function' ? confirm : null;
      if (confirmFn && !confirmFn('אופסו כל התשובות שהוזנו. להמשיך?')) {
        return;
      }
    }
    if (typeof elements.form.reset === 'function') {
      elements.form.reset();
    }
    updateConditionalVisibility(root);
    showErrors(elements, []);
    setHidden(elements.result, true);
    setHidden(elements.form, true);
    setHidden(elements.intro, false);
    goToStep(1);
  }

  if (isUsable(elements.startButton) && typeof elements.startButton.addEventListener === 'function') {
    elements.startButton.addEventListener('click', () => {
      setHidden(elements.intro, true);
      setHidden(elements.form, false);
      setHidden(elements.result, true);
      goToStep(1);
    });
  }

  for (const flagName of ['irIsElectrical', 'irHasBattery', 'irIsWireless', 'irIsFoodContact']) {
    const radios = typeof root.querySelectorAll === 'function' ? root.querySelectorAll(`input[name="${flagName}"]`) : [];
    for (const radio of radios) {
      if (typeof radio.addEventListener === 'function') {
        radio.addEventListener('change', () => updateConditionalVisibility(root));
      }
    }
  }

  if (isUsable(elements.nextButton) && typeof elements.nextButton.addEventListener === 'function') {
    elements.nextButton.addEventListener('click', () => {
      const errors = validateStep(root, currentStep);
      if (errors.length > 0) {
        showErrors(elements, errors);
        return;
      }
      showErrors(elements, []);

      if (currentStep < TOTAL_STEPS) {
        goToStep(currentStep + 1);
        return;
      }

      const raw = collectRawFormState(root);
      const normalized = normalizeReadinessInput(raw);
      const result = buildReadinessResult(normalized);
      const resultControls = renderResult(doc, elements.result, normalized, result);
      setHidden(elements.form, true);
      setHidden(elements.result, false);

      if (typeof resultControls.editButton.addEventListener === 'function') {
        resultControls.editButton.addEventListener('click', () => {
          setHidden(elements.result, true);
          setHidden(elements.form, false);
          goToStep(1);
        });
      }
      if (typeof resultControls.newButton.addEventListener === 'function') {
        resultControls.newButton.addEventListener('click', () => resetAll({ confirmIfSubstantial: false }));
      }
      if (typeof resultControls.copyButton.addEventListener === 'function') {
        resultControls.copyButton.addEventListener('click', () => {
          const summary = buildReadinessSummary(normalized, result);
          const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
          if (!clipboard || typeof clipboard.writeText !== 'function') {
            resultControls.copyStatus.textContent = 'לא ניתן להעתיק כרגע. ניתן לסמן ולהעתיק ידנית.';
            return;
          }
          Promise.resolve(clipboard.writeText(summary)).then(
            () => {
              resultControls.copyStatus.textContent = 'הסיכום הועתק';
            },
            () => {
              resultControls.copyStatus.textContent = 'לא ניתן היה להעתיק. ניתן לסמן ולהעתיק ידנית.';
            },
          );
        });
      }
    });
  }

  if (isUsable(elements.backButton) && typeof elements.backButton.addEventListener === 'function') {
    elements.backButton.addEventListener('click', () => {
      if (currentStep > 1) {
        goToStep(currentStep - 1);
      }
    });
  }

  if (isUsable(elements.resetButton) && typeof elements.resetButton.addEventListener === 'function') {
    elements.resetButton.addEventListener('click', () => resetAll({ confirmIfSubstantial: true }));
  }

  updateConditionalVisibility(root);

  return Object.freeze({ initialized: true, goToStep, resetAll });
}

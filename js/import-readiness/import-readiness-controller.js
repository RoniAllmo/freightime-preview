/**
 * User-interface controller for FreighTime's scenario-routed Import
 * Readiness experience.
 *
 * Binds to the explicitly supplied readiness section root element
 * (never queries `document` globally) and, within that root only,
 * locates the fixed set of form/result elements by their known IDs.
 * Runs entirely locally: reads form values on explicit button clicks
 * only, routes to one of five scenarios, computes the scenario's
 * result, and renders it using `textContent`/`createElement` only --
 * never `innerHTML`. Performs no network request, no storage access,
 * no logging, and never mutates the page URL.
 *
 * The assessment begins with exactly three primary questions (import
 * type, import experience, product identity) and then routes into one
 * of four scenario-specific follow-ups, or -- via an explicit shortcut
 * offered on the intro screen -- directly into the fifth
 * (shipment-already-in-progress) scenario, bypassing the three primary
 * questions entirely, since a shipment problem is rarely well-served by
 * first asking whether the import is personal or commercial.
 */

import { normalizeReadinessInput } from './normalize-readiness-input.js';
import { normalizeImportTypeAnswer, resolveUncertainImportType, IMPORT_TYPE_EXPLANATIONS } from './import-type-routing.js';
import { decideScenario } from './experience-routing.js';
import { buildPersonalImportResult } from './personal-import-rules.js';
import { buildFirstCommercialImportResult } from './first-commercial-import-rules.js';
import { buildExistingImporterResult } from './existing-importer-rules.js';
import { buildEstablishedOperationResult } from './established-operation-rules.js';
import { buildShipmentProblemResult } from './shipment-problem-rules.js';
import { buildScenarioSummary } from './build-scenario-summary.js';
import { SCENARIO } from './scenario-schema.js';
import { describeProgress } from './journey-phase-model.js';
import { needsTechnicalCharacteristicsLayer, needsFoodContactMaterialFollowup } from './layered-question-model.js';
import { computeDocumentReadiness } from './document-readiness.js';
import { buildResultBrief } from './result-brief.js';
import { evaluateRegulatorySignals, computeHintedCategories } from './regulatory-signals/index.js';
import { REGULATORY_SIGNAL_RULES } from './regulatory-signals/rules-registry.js';
import { findQuestionById } from './regulatory-signals/questions.js';
import { deriveReusableRegulatoryAnswers, mergeReusedAnswers } from './regulatory-signals/answer-reuse.js';
import { buildFocusedCheckContextLabel } from './regulatory-signals/focused-check-context.js';
import {
  computeNextFollowUpQuestionId,
  pruneStaleRegulatoryAnswers,
  pruneAnswersInvalidatedByExclusion,
} from './regulatory-signals/question-scheduler.js';

const STEP_LABELS = Object.freeze({
  q1: 'אופי היבוא',
  q1clarify: 'הבהרת אופי היבוא',
  q2: 'ניסיון ביבוא',
  q3: 'זיהוי המוצר',
  productContext: 'הקשר המוצר',
  personalFollowup: 'פרטי יבוא אישי',
  existingImporterFollowup: 'נושא לבדיקה',
  establishedOperationFollowup: 'מטרת הבדיקה',
  problemType: 'סוג הבעיה',
  problemDetails: 'פרטי המשלוח',
  regulatoryFollowup: 'בדיקות ממוקדות',
});

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

/** Reads every checked checkbox sharing a name -- the layered questionnaire's multi-select groups (product family, materials, documents). */
function readCheckedValues(root, name) {
  if (!isUsable(root) || typeof root.querySelectorAll !== 'function') return [];
  const nodes = root.querySelectorAll(`input[name="${name}"]`);
  const values = [];
  for (const node of nodes) {
    if (node.checked) values.push(node.value);
  }
  return values;
}

function setHidden(el, hidden) {
  if (isUsable(el)) el.hidden = hidden;
}

function collectRawFormState(root) {
  return {
    importType: readRadioValue(root, 'irImportType', ''),
    forSaleOrDistribution: readRadioValue(root, 'irForSaleOrDistribution', 'no') === 'yes',
    forBusinessUse: readRadioValue(root, 'irForBusinessUse', 'no') === 'yes',
    personalOrFamilyUseOnly: readRadioValue(root, 'irPersonalOrFamilyUseOnly', 'no') === 'yes',

    experience: readRadioValue(root, 'irExperience', ''),

    productName: readText(byId(root, 'irProductName')),
    commercialDescription: readText(byId(root, 'irCommercialDescription')),
    intendedUse: readText(byId(root, 'irIntendedUse')),
    hasTechnicalSpec: readChecked(byId(root, 'irHasTechnicalSpec')),
    hasCatalogOrProductPage: readChecked(byId(root, 'irHasCatalogOrProductPage')),
    hasPhotos: readChecked(byId(root, 'irHasPhotos')),
    hasSupplierInvoice: readChecked(byId(root, 'irHasSupplierInvoice')),
    hasSupplierProvidedHsCode: readChecked(byId(root, 'irHasSupplierProvidedHsCode')),
    hsCodeKnown: readChecked(byId(root, 'irHsCodeKnown')),
    hsCode: readText(byId(root, 'irHsCode')),

    quantity: readText(byId(root, 'irQuantity')),
    approxValue: readText(byId(root, 'irApproxValue')),
    countryOfOrigin: readText(byId(root, 'irCountryOfOrigin')),
    shipmentMethod: readText(byId(root, 'irShipmentMethod')),
    sensitiveCategory: readText(byId(root, 'irSensitiveCategory')),

    focusArea: readText(byId(root, 'irFocusArea')),
    auditPurpose: readText(byId(root, 'irAuditPurpose')),

    // Layered questionnaire architecture: product-context layers
    // (family, materials, technical characteristics, documents).
    // Purely structured data collection -- see
    // js/import-readiness/layered-question-model.js. Feeds only the
    // mechanical document-readiness checklist and the presentation
    // layer, never a fabricated regulatory claim.
    productFamilies: readCheckedValues(root, 'irProductFamily'),
    materials: readCheckedValues(root, 'irMaterial'),
    selectedDocuments: readCheckedValues(root, 'irDocument'),
    connectsToPower: readRadioValue(root, 'irConnectsToPower', ''),
    hasBattery: readRadioValue(root, 'irHasBattery', ''),
    batteryIsRechargeable: readRadioValue(root, 'irBatteryIsRechargeable', ''),
    materialTouchesFood: readRadioValue(root, 'irMaterialTouchesFood', ''),
    materialHasCoating: readRadioValue(root, 'irMaterialHasCoating', ''),

    problemType: readText(byId(root, 'irProblemType')),
    shipmentMode: readText(byId(root, 'irShipmentMode')),
    currentStage: readText(byId(root, 'irCurrentStage')),
    issuingParty: readText(byId(root, 'irIssuingParty')),
    deadline: readText(byId(root, 'irDeadline')),
    missingDocumentsNote: readText(byId(root, 'irMissingDocumentsNote')),
    hasWrittenNotice: readChecked(byId(root, 'irHasWrittenNotice')),
    accumulatingCosts: readChecked(byId(root, 'irAccumulatingCosts')),

    // Family-specific progressive-disclosure follow-ups.
    damageDiscoveryTiming: readText(byId(root, 'irDamageDiscoveryTiming')),
    hasInsurance: readText(byId(root, 'irHasInsurance')),
    hasPhotosOfDamage: readChecked(byId(root, 'irHasPhotosOfDamage')),
    safetyRisk: readChecked(byId(root, 'irSafetyRisk')),
    financialExposure: readText(byId(root, 'irFinancialExposure')),
    goodsHeld: readChecked(byId(root, 'irGoodsHeld')),
    customsClearanceInvolved: readChecked(byId(root, 'irCustomsClearanceInvolved')),
    insuranceSubScenario: readText(byId(root, 'irInsuranceSubScenario')),
    disputeStage: readText(byId(root, 'irDisputeStage')),
  };
}

/**
 * Which conditional follow-up group(s) (by element id) should be
 * visible for a given `problemType` -- progressive disclosure: only
 * the question group relevant to the selected problem type is shown,
 * never every sub-scenario's questions at once.
 */
const CONDITIONAL_GROUP_IDS = ['irGroupDamage', 'irGroupCustomsPenalty', 'irGroupStorage', 'irGroupInsurance', 'irGroupCarrierDispute'];

function updateProblemDetailsVisibility(root) {
  const problemType = readText(byId(root, 'irProblemType'));
  for (const groupId of CONDITIONAL_GROUP_IDS) {
    const groupEl = byId(root, groupId);
    if (!isUsable(groupEl)) continue;
    const showFor = typeof groupEl.getAttribute === 'function' ? (groupEl.getAttribute('data-show-for') ?? '') : '';
    const shouldShow = showFor.split(/\s+/).includes(problemType);
    setHidden(groupEl, !shouldShow);
  }
}

function hasSubstantialData(raw) {
  return (
    raw.importType.length > 0 ||
    raw.productName.length > 0 ||
    raw.commercialDescription.length > 0 ||
    raw.problemType.length > 0
  );
}

/**
 * Clears every input inside a now-hidden conditional group -- back
 * navigation and changing an earlier answer (e.g. product family) must
 * never leave a stale, no-longer-visible answer behind that would
 * still be read on submit.
 */
function clearGroupInputs(root, groupId) {
  const groupEl = byId(root, groupId);
  if (!isUsable(groupEl) || typeof groupEl.querySelectorAll !== 'function') return;
  for (const input of groupEl.querySelectorAll('input')) {
    if (isUsable(input)) input.checked = false;
  }
}

/**
 * Layered questionnaire architecture (see layered-question-model.js):
 * the product-context step's conditional follow-up groups (electrical/
 * technical characteristics, food-contact material follow-up) are only
 * relevant for certain product-family/material combinations. Only the
 * relevant group(s) are shown -- a furniture-only product never sees
 * electrical questions -- and a group's answers are cleared the moment
 * it becomes irrelevant, so back navigation never leaves stale hidden
 * state behind.
 */
function updateProductContextVisibility(root) {
  const productFamilies = readCheckedValues(root, 'irProductFamily');
  const materials = readCheckedValues(root, 'irMaterial');

  const showElectrical = needsTechnicalCharacteristicsLayer({ productFamilies });
  const electricalGroup = byId(root, 'irGroupElectricalCharacteristics');
  if (isUsable(electricalGroup)) {
    if (!showElectrical) clearGroupInputs(root, 'irGroupElectricalCharacteristics');
    setHidden(electricalGroup, !showElectrical);
  }

  const showFoodContact = needsFoodContactMaterialFollowup({ productFamilies, materials });
  const foodContactGroup = byId(root, 'irGroupFoodContactMaterial');
  if (isUsable(foodContactGroup)) {
    if (!showFoodContact) clearGroupInputs(root, 'irGroupFoodContactMaterial');
    setHidden(foodContactGroup, !showFoodContact);
  }
}

const ALL_STEP_IDS = [
  'irStepQ1', 'irStepQ1Clarify', 'irStepQ2', 'irStepQ3', 'irStepProductContext',
  'irStepRegulatoryFollowup',
  'irStepPersonalFollowup', 'irStepExistingImporterFollowup', 'irStepEstablishedOperationFollowup',
  'irStepProblemType', 'irStepProblemDetails',
];

const STEP_ID_TO_ELEMENT_ID = Object.freeze({
  q1: 'irStepQ1',
  q1clarify: 'irStepQ1Clarify',
  q2: 'irStepQ2',
  q3: 'irStepQ3',
  productContext: 'irStepProductContext',
  regulatoryFollowup: 'irStepRegulatoryFollowup',
  personalFollowup: 'irStepPersonalFollowup',
  existingImporterFollowup: 'irStepExistingImporterFollowup',
  establishedOperationFollowup: 'irStepEstablishedOperationFollowup',
  problemType: 'irStepProblemType',
  problemDetails: 'irStepProblemDetails',
});

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

const BRIEF_SECTION_HEADING = Object.freeze({
  documentsToObtain: 'מסמכים שכדאי להשיג',
  missingInformation: 'מידע שחסר להמשך בדיקה',
});

function renderBriefList(doc, parent, heading, items) {
  if (!Array.isArray(items) || items.length === 0) return;
  const block = el(doc, 'div', { className: 'ir-brief-section' });
  block.appendChild(el(doc, 'h4', { text: heading }));
  const ul = el(doc, 'ul');
  for (const item of items) ul.appendChild(el(doc, 'li', { text: item }));
  block.appendChild(ul);
  parent.appendChild(block);
}

/**
 * Renders one radio option label (input + text span) for a live
 * regulatory follow-up question -- never uses `doc.createTextNode`
 * directly, matching the `el()`-only construction pattern already used
 * throughout this file.
 */
function renderRegulatoryOptionLabel(doc, questionId, option, existingAnswer, onChange) {
  const inputId = `irReg-${questionId}-${option.value}`;
  const label = el(doc, 'label', { attrs: { for: inputId } });
  const input = el(doc, 'input', {
    attrs: { type: 'radio', name: `irReg-${questionId}`, id: inputId, value: option.value },
  });
  input.checked = existingAnswer === option.value;
  if (typeof input.addEventListener === 'function') {
    input.addEventListener('change', () => onChange(option.value));
  }
  label.appendChild(input);
  label.appendChild(el(doc, 'span', { text: option.label }));
  return label;
}

/**
 * Renders exactly one live regulatory follow-up question -- fieldset,
 * legend, native radio controls with stable unique ids, always
 * including the question's own "לא ידוע" option, pre-selecting a
 * previously-given answer when one exists. Reads its wording and
 * options entirely from the canonical rule registry's question data
 * (`questions.js`) -- this function never hard-codes any of the
 * approved rules' Hebrew wording.
 *
 * @returns {(value: string) => void} setter the caller uses to read the
 *   live-selected value without needing to query the DOM back (the
 *   hand-rolled test doubles used by this repository's unit tests don't
 *   support querying into dynamically-appended children).
 */
function renderRegulatoryQuestion(doc, host, question, existingAnswer, onAnswerChange, contextLabel) {
  host.textContent = '';
  // Continuity line: echoes only already-confirmed structured data (see
  // focused-check-context.js) so this phase reads as a natural
  // continuation of the assessment rather than a separate, bolted-on
  // form. Omitted entirely when nothing confirmed is available to echo.
  if (typeof contextLabel === 'string' && contextLabel.length > 0) {
    host.appendChild(el(doc, 'p', { className: 'ir-focused-context', text: contextLabel }));
  }
  const fieldset = el(doc, 'fieldset', { className: 'ir-subfieldset' });
  const legend = el(doc, 'legend', { text: question.legend, attrs: { tabindex: '-1' } });
  fieldset.appendChild(legend);

  const row = el(doc, 'div', { className: 'ir-radio-row' });
  for (const option of question.options) {
    row.appendChild(renderRegulatoryOptionLabel(doc, question.id, option, existingAnswer, onAnswerChange));
  }
  fieldset.appendChild(row);
  host.appendChild(fieldset);
}

/**
 * Renders the live regulatory-signal result card: one fully-expanded
 * primary (highest-priority) signal -- status label, title,
 * identification, implication, up to 3 verification items, primary
 * professional, at most one supporting professional, confidence label,
 * limitation, and one collapsed "למה התקבלה התוצאה?" area -- plus a
 * compact one-line-each list for any additional matched signals (never
 * a second fully-expanded card, per the "no information overload"
 * requirement). Renders only fields the gate-enforced matcher already
 * produced -- never the rule's internal id, status, author metadata, or
 * internal notes.
 */
function renderRegulatorySignalsBlock(doc, resultContainer, evaluation) {
  if (evaluation === null || typeof evaluation !== 'object') return;
  const signals = Array.isArray(evaluation.signals) ? evaluation.signals : [];
  if (signals.length === 0) return;

  const [primary, ...rest] = signals;
  const section = el(doc, 'section', { className: 'ir-regulatory-signals', attrs: { 'aria-label': primary.statusLabel || 'כיוון בדיקה מקצועי' } });

  section.appendChild(el(doc, 'p', { className: 'ir-regulatory-status-label', text: primary.statusLabel }));
  section.appendChild(el(doc, 'h3', { text: primary.title }));
  section.appendChild(el(doc, 'p', { text: primary.identification }));
  section.appendChild(el(doc, 'p', { text: primary.implication }));

  if (Array.isArray(primary.verificationItems) && primary.verificationItems.length > 0) {
    const ul = el(doc, 'ul', { className: 'ir-regulatory-verification-items' });
    for (const item of primary.verificationItems.slice(0, 3)) ul.appendChild(el(doc, 'li', { text: item }));
    section.appendChild(ul);
  }

  // Professional line(s): the exact wording the product owner supplied
  // per rule (professionalDisplayText/supportingProfessionalDisplayText
  // on rules-registry.js), not the shared professional-category
  // registry's more verbose default names.
  if (primary.professionalDisplayText) {
    section.appendChild(el(doc, 'p', { className: 'ir-regulatory-primary-professional', text: primary.professionalDisplayText }));
  }
  if (primary.professionalReason) {
    section.appendChild(el(doc, 'p', { className: 'ir-regulatory-primary-professional-reason', text: primary.professionalReason }));
  }
  if (primary.supportingProfessionalDisplayText) {
    section.appendChild(el(doc, 'p', { className: 'ir-regulatory-supporting-professional', text: primary.supportingProfessionalDisplayText }));
  }

  section.appendChild(el(doc, 'p', { className: 'ir-regulatory-confidence', text: primary.confidence }));
  section.appendChild(el(doc, 'p', { className: 'ir-regulatory-limitation', text: primary.limitation }));

  if (primary.details && primary.details.whyVerificationStillMatters) {
    const why = el(doc, 'details', { className: 'ir-regulatory-why' });
    why.appendChild(el(doc, 'summary', { text: 'למה התקבלה התוצאה?' }));
    why.appendChild(el(doc, 'p', { text: primary.details.whyVerificationStillMatters }));
    if (primary.details.verifiedLabel) why.appendChild(el(doc, 'p', { text: primary.details.verifiedLabel }));
    section.appendChild(why);
  }

  if (rest.length > 0) {
    const moreBlock = el(doc, 'div', { className: 'ir-regulatory-additional-signals' });
    moreBlock.appendChild(el(doc, 'h4', { text: 'תחומי בדיקה נוספים שזוהו' }));
    const ul = el(doc, 'ul');
    for (const signal of rest) {
      ul.appendChild(el(doc, 'li', { text: `${signal.title} — ${signal.implication}` }));
    }
    moreBlock.appendChild(ul);
    section.appendChild(moreBlock);
  }

  if (evaluation.extraSignalCount > 0) {
    section.appendChild(el(doc, 'p', { className: 'ir-regulatory-extra-note', text: 'זוהו תחומי בדיקה נוספים.' }));
  }

  resultContainer.appendChild(section);
}

/**
 * Renders the parts of the eight-section brief (see result-brief.js)
 * that are NOT already shown elsewhere in the rendered result --
 * `brief.status`/`situation`/`checkpoints`/`professional`/
 * `prioritizedActions`/`disclaimer` restate content the primary result
 * (route context, "הפעולה המומלצת", "למה", the professional-referral
 * block, "פעולות מיידיות", "מה להכין", the visible disclaimer) already
 * renders above this, so this block intentionally renders only the two
 * genuinely new, non-duplicated sections: the document checklist
 * (`documentsToObtain`, mechanical bookkeeping absent elsewhere) and,
 * for no-match/insufficient-information cases, `missingInformation`.
 * Renders nothing when both are empty, so a fully-matched result never
 * shows an empty trailing section.
 */
function renderResultBrief(doc, resultContainer, brief) {
  const hasContent = brief.documentsToObtain.length > 0 || brief.missingInformation.length > 0;
  if (!hasContent) return;

  const section = el(doc, 'section', { className: 'ir-result-brief', attrs: { 'aria-label': 'מסמכים ומידע נוסף' } });
  renderBriefList(doc, section, BRIEF_SECTION_HEADING.documentsToObtain, brief.documentsToObtain);
  renderBriefList(doc, section, BRIEF_SECTION_HEADING.missingInformation, brief.missingInformation);

  resultContainer.appendChild(section);
}

/**
 * Compact result header: the one-line operational status (see
 * `result-brief.js`'s `deriveStatus`), rendered first so the user
 * understands the overall situation before reading the detailed
 * recommendation below it. This is genuinely new content -- the status
 * label itself is not shown anywhere else in the result -- not a
 * restatement of the primary reason/action that follow.
 */
function renderResultHeader(doc, resultContainer, brief) {
  const header = el(doc, 'div', { className: 'ir-result-header', attrs: { 'data-status': brief.status } });
  header.appendChild(el(doc, 'p', { className: 'ir-result-status', text: brief.status }));
  resultContainer.appendChild(header);
}

/**
 * Render one compact result: route context, urgency (if any), the one
 * primary action, its short reason, a short preparation checklist, up
 * to two CTAs, a concise visible disclaimer, and a single collapsed
 * `<details>` region for everything secondary (extended disclaimer,
 * extra points, official-source links). Never renders more than one
 * `<details>`, never repeats the primary recommendation in a second
 * section, and never uses `innerHTML`.
 */
function renderResult(doc, resultContainer, result, brief, regulatoryEvaluation) {
  resultContainer.textContent = '';

  if (result.routeLabel) {
    resultContainer.appendChild(el(doc, 'p', { className: 'ir-route-context', text: `המסלול: ${result.routeLabel}` }));
  }

  if (brief) {
    renderResultHeader(doc, resultContainer, brief);
  }

  if (result.urgency) {
    resultContainer.appendChild(
      el(doc, 'div', { className: 'ir-urgency-badge', text: result.urgency, attrs: { 'data-urgency': result.urgency } }),
    );
  }

  if (result.primaryAction) {
    const actionBlock = el(doc, 'div', { className: 'ir-primary-action' });
    actionBlock.appendChild(el(doc, 'h3', { text: 'הפעולה המומלצת' }));
    actionBlock.appendChild(el(doc, 'p', { text: result.primaryAction }));
    resultContainer.appendChild(actionBlock);
  }

  if (result.primaryReason) {
    const reasonBlock = el(doc, 'div', { className: 'ir-primary-reason' });
    reasonBlock.appendChild(el(doc, 'h3', { text: 'למה' }));
    reasonBlock.appendChild(el(doc, 'p', { text: result.primaryReason }));
    resultContainer.appendChild(reasonBlock);
  }

  // Professional-referral component: one concrete WHO, one concrete WHY,
  // one dedicated action CTA. Always positioned right after the primary
  // recommendation + reason and before the preparation checklist --
  // never buried below it, never inside the collapsed details, never
  // more than one professional/CTA pairing per result. The CTA only
  // navigates to the existing #contact section -- it never appends
  // assessment answers to the URL and never auto-submits anything.
  const professional = result.professional !== null && typeof result.professional === 'object' ? result.professional : null;
  if (professional && professional.type) {
    const referralBlock = el(doc, 'div', { className: 'ir-professional-referral' });
    referralBlock.appendChild(el(doc, 'h3', { text: 'מי צריך לבדוק?' }));
    referralBlock.appendChild(el(doc, 'p', { className: 'ir-professional-type', text: professional.type }));
    if (professional.reason) {
      referralBlock.appendChild(el(doc, 'p', { className: 'ir-professional-reason', text: professional.reason }));
    }
    if (professional.ctaLabel) {
      referralBlock.appendChild(
        el(doc, 'a', { className: 'ir-professional-cta', text: professional.ctaLabel, attrs: { href: '#contact' } }),
      );
    }
    resultContainer.appendChild(referralBlock);
  } else if (result.primaryCta) {
    // Defensive fallback only -- every current scenario supplies a
    // `professional` referral, so this path is not expected to run.
    const ctaRow = el(doc, 'div', { className: 'ir-cta-row' });
    ctaRow.appendChild(el(doc, 'a', { className: 'tool-btn-primary', text: result.primaryCta.label, attrs: { href: '#contact' } }));
    resultContainer.appendChild(ctaRow);
  }

  // Optional secondary professional -- rendered as one quieter card
  // right after the primary referral, never a second equal-weight
  // card, and never more than this single supporting professional.
  const supportingProfessional = result.supportingProfessional !== null && typeof result.supportingProfessional === 'object' ? result.supportingProfessional : null;
  if (supportingProfessional && supportingProfessional.type) {
    const supportBlock = el(doc, 'div', { className: 'ir-supporting-professional' });
    supportBlock.appendChild(el(doc, 'h3', { text: 'גורם מקצועי משלים' }));
    supportBlock.appendChild(el(doc, 'p', { className: 'ir-supporting-professional-type', text: supportingProfessional.type }));
    if (supportingProfessional.reason) {
      supportBlock.appendChild(el(doc, 'p', { className: 'ir-supporting-professional-reason', text: supportingProfessional.reason }));
    }
    if (supportingProfessional.ctaLabel) {
      supportBlock.appendChild(
        el(doc, 'a', { className: 'ir-supporting-professional-cta', text: supportingProfessional.ctaLabel, attrs: { href: '#contact' } }),
      );
    }
    resultContainer.appendChild(supportBlock);
  }

  // Live regulatory-signals result card -- the same gate-enforced
  // evaluation the result brief's section G already used, rendered here
  // as its own prominent block: one expanded primary signal plus a
  // compact list for any additional matched signals (max 3 total, per
  // the existing matcher's own cap).
  renderRegulatorySignalsBlock(doc, resultContainer, regulatoryEvaluation);

  if (Array.isArray(result.immediateActions) && result.immediateActions.length > 0) {
    const block = el(doc, 'div', { className: 'ir-immediate-actions' });
    block.appendChild(el(doc, 'h3', { text: 'פעולות מיידיות' }));
    const ul = el(doc, 'ul');
    for (const action of result.immediateActions) ul.appendChild(el(doc, 'li', { text: action }));
    block.appendChild(ul);
    resultContainer.appendChild(block);
  }

  if (result.deadlineWarning) {
    resultContainer.appendChild(el(doc, 'p', { className: 'ir-deadline-warning', text: result.deadlineWarning }));
  }
  if (result.accumulatingCostWarning) {
    resultContainer.appendChild(el(doc, 'p', { className: 'ir-accumulating-warning', text: result.accumulatingCostWarning }));
  }

  if (Array.isArray(result.notificationParties) && result.notificationParties.length > 0) {
    const block = el(doc, 'div', { className: 'ir-notification-parties' });
    block.appendChild(el(doc, 'h3', { text: 'גורמים שכדאי לעדכן' }));
    const ul = el(doc, 'ul');
    for (const party of result.notificationParties) ul.appendChild(el(doc, 'li', { text: party }));
    block.appendChild(ul);
    resultContainer.appendChild(block);
  }

  if (Array.isArray(result.preparationItems) && result.preparationItems.length > 0) {
    const prepBlock = el(doc, 'div', { className: 'ir-preparation' });
    prepBlock.appendChild(el(doc, 'h3', { text: 'מה להכין' }));
    const ul = el(doc, 'ul');
    for (const item of result.preparationItems) {
      ul.appendChild(el(doc, 'li', { text: item }));
    }
    prepBlock.appendChild(ul);
    resultContainer.appendChild(prepBlock);
  }

  if (result.secondaryCta) {
    const ctaRow = el(doc, 'div', { className: 'ir-cta-row' });
    ctaRow.appendChild(el(doc, 'a', { className: 'tool-btn-secondary', text: result.secondaryCta.label, attrs: { href: '#contact' } }));
    resultContainer.appendChild(ctaRow);
  }

  const secondary = result.secondaryDetails !== null && typeof result.secondaryDetails === 'object' ? result.secondaryDetails : {};
  const hasSecondaryContent =
    (Array.isArray(secondary.points) && secondary.points.length > 0) ||
    (Array.isArray(secondary.officialSources) && secondary.officialSources.length > 0) ||
    (typeof secondary.note === 'string' && secondary.note.length > 0) ||
    (typeof result.extendedDisclaimer === 'string' && result.extendedDisclaimer.length > 0);

  if (hasSecondaryContent) {
    const details = el(doc, 'details', { className: 'ir-secondary-details' });
    details.appendChild(el(doc, 'summary', { text: 'מידע נוסף והסברים' }));

    if (Array.isArray(secondary.points) && secondary.points.length > 0) {
      const ul = el(doc, 'ul');
      for (const point of secondary.points) ul.appendChild(el(doc, 'li', { text: point }));
      details.appendChild(ul);
    }
    if (typeof secondary.note === 'string' && secondary.note.length > 0) {
      details.appendChild(el(doc, 'p', { text: secondary.note }));
    }
    if (Array.isArray(secondary.officialSources) && secondary.officialSources.length > 0) {
      for (const source of secondary.officialSources) {
        details.appendChild(
          el(doc, 'a', {
            className: 'ir-source-link',
            text: `${source.noteLabel}: ${source.label}`,
            attrs: { href: source.url, target: '_blank', rel: 'noopener noreferrer' },
          }),
        );
      }
    }
    if (typeof result.extendedDisclaimer === 'string' && result.extendedDisclaimer.length > 0) {
      details.appendChild(el(doc, 'p', { className: 'ir-extended-disclaimer', text: result.extendedDisclaimer }));
    }

    resultContainer.appendChild(details);
  }

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

  // Disclaimer last: after the primary recommendation, the professional
  // referral, the preparation checklist, the edit/copy actions, and the
  // collapsed secondary details -- never buried mid-result.
  resultContainer.appendChild(el(doc, 'p', { className: 'ir-disclaimer', text: result.visibleDisclaimer }));

  // New professional result-presentation layer (see result-brief.js):
  // rendered last, as a distinct labeled "תקציר מוכנות ליבוא" region
  // that restructures this same already-rendered content into the new
  // 8-section brief -- never a second, competing recommendation.
  if (brief) {
    renderResultBrief(doc, resultContainer, brief);
  }

  return { copyButton, editButton, newButton, copyStatus };
}

/**
 * Initialize the Import Readiness controller.
 *
 * @param {{root: object, documentRef: object}} options
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
    // The whole `#readiness` section that hosts the workspace. Kept in
    // sync with the form/result visibility so the section reserves no
    // layout height (via the native `hidden` attribute) while neither
    // is showing -- otherwise its own section padding is left behind
    // as an empty gap below the Hero even though nothing in it is
    // visible. See DESIGN_SYSTEM_V1.md §8 ("hidden sections must not
    // reserve layout height").
    section: byId(root, 'readiness'),
    startButton: byId(root, 'readinessStartButton'),
    problemShortcutButton: byId(root, 'readinessProblemShortcutButton'),
    form: byId(root, 'readinessForm'),
    stepIndicator: byId(root, 'readinessStepIndicator'),
    errors: byId(root, 'readinessErrors'),
    backButton: byId(root, 'readinessBackButton'),
    nextButton: byId(root, 'readinessNextButton'),
    resetButton: byId(root, 'readinessResetButton'),
    result: byId(root, 'readinessResult'),
    // Optional visual progress elements. Both are feature-detected --
    // markup that omits them keeps working exactly as before.
    progressBar: byId(root, 'readinessProgressBar'),
    progressCount: byId(root, 'readinessProgressCount'),
    // Live regulatory-signals focused-checks question host -- feature-
    // detected like the progress elements; markup that omits it simply
    // never shows a live regulatory question.
    regulatoryQuestionHost: byId(root, 'irRegulatoryQuestionHost'),
  };

  let stepHistory = [];
  let currentStepId = null;
  let currentScenario = null;

  // Live regulatory-signals focused-checks state -- kept only in this
  // closure's memory, never written to localStorage/sessionStorage/
  // IndexedDB/cookies/the URL. Cleared entirely on reset.
  let regulatoryAnswers = {};
  let regulatoryHintedCategories = new Set();
  let regulatoryQuestionHistory = []; // ids shown this session, in order
  let currentRegulatoryQuestionId = null;
  let currentRegulatoryAnswerValue;
  let pendingResultScenario = null;
  let lastStepBeforeResult = null;

  /**
   * Purely presentational: maps the step being shown to one of four
   * STABLE journey phases (see journey-phase-model.js) and drives the
   * optional progress bar/label from that -- never from a question
   * count. The phase count never changes regardless of how many
   * questions a given path asks, whether a step is skipped, or whether
   * the conditional regulatory-focus phase is shown at all, so this
   * never affects routing or result content and never promises a fixed
   * number of questions.
   */
  function updateProgressDisplay(stepId) {
    const progress = describeProgress(stepId);
    if (isUsable(elements.progressCount)) {
      elements.progressCount.textContent = progress.label;
    }
    if (isUsable(elements.progressBar)) {
      elements.progressBar.style.width = `${progress.percent}%`;
      elements.progressBar.setAttribute('aria-valuemin', '1');
      elements.progressBar.setAttribute('aria-valuemax', String(progress.count));
      elements.progressBar.setAttribute('aria-valuenow', String(progress.index));
      elements.progressBar.setAttribute('aria-valuetext', `שלב ${progress.index} מתוך ${progress.count}: ${progress.label}`);
      elements.progressBar.setAttribute('aria-current', 'step');
    }
  }

  function showStep(stepId) {
    currentStepId = stepId;
    for (const elId of ALL_STEP_IDS) {
      setHidden(byId(root, elId), true);
    }
    setHidden(byId(root, STEP_ID_TO_ELEMENT_ID[stepId]), false);
    if (stepId === 'problemDetails') updateProblemDetailsVisibility(root);
    if (stepId === 'productContext') updateProductContextVisibility(root);
    if (isUsable(elements.stepIndicator)) {
      elements.stepIndicator.textContent = `שלב: ${STEP_LABELS[stepId] ?? stepId}`;
    }
    updateProgressDisplay(stepId);
    setHidden(elements.backButton, stepHistory.length === 0);
    elements.nextButton.textContent = 'הבא ←';
  }

  function goForward(stepId) {
    if (currentStepId !== null) stepHistory.push(currentStepId);
    showStep(stepId);
  }

  /**
   * The gap left, in pixels, between the sticky header's bottom edge
   * and the scrolled-to assessment card -- purely visual breathing
   * room, not a layout dependency.
   */
  const SCROLL_HEADER_GAP_PX = 24;

  /**
   * Resolves the real `window` for this root, whether `root` is the
   * live document (production) or a plain object (this repository's
   * hand-rolled test doubles) -- mirrors the existing
   * `root.ownerDocument?.defaultView` fallback pattern used by
   * `resetAll` below for `confirm()`.
   */
  function getView() {
    if (isUsable(root) && isUsable(root.ownerDocument) && isUsable(root.ownerDocument.defaultView)) {
      return root.ownerDocument.defaultView;
    }
    return typeof window !== 'undefined' ? window : null;
  }

  function prefersReducedMotion() {
    const view = getView();
    if (!isUsable(view) || typeof view.matchMedia !== 'function') return false;
    const mq = view.matchMedia('(prefers-reduced-motion: reduce)');
    return isUsable(mq) ? mq.matches === true : false;
  }

  /**
   * Purely presentational: after the Hero's primary/secondary CTA reveals
   * the assessment workspace, scroll the whole assessment card -- heading,
   * step indicator, progress bar, and the active question together, not
   * just the active fieldset -- into view below the sticky header, and
   * move focus to the active question's heading so keyboard/screen-reader
   * users land on the right content. Never affects routing, result
   * content, or the URL. Fully feature-detected so environments without
   * these DOM APIs (including this repository's hand-rolled test doubles)
   * no-op safely.
   *
   * The scroll target is the whole form (not the active fieldset) because
   * the step indicator/progress bar sit above the fieldset in the DOM --
   * scrolling only the fieldset into view left them scrolled above the
   * top edge. The header offset is measured live via
   * `getBoundingClientRect()` (rather than a fixed pixel constant or a
   * breakpoint-matched CSS value) so it stays correct across every
   * viewport and orientation, including the header's own mobile/desktop
   * height change.
   */
  function focusAndScrollToCurrentStep() {
    const stepEl = byId(root, STEP_ID_TO_ELEMENT_ID[currentStepId]);
    if (!isUsable(stepEl)) return;

    const scrollTarget = isUsable(elements.form) ? elements.form : stepEl;
    if (typeof scrollTarget.scrollIntoView === 'function') {
      const headerEl = typeof root.querySelector === 'function' ? root.querySelector('header') : null;
      const headerHeight = isUsable(headerEl) && typeof headerEl.getBoundingClientRect === 'function'
        ? headerEl.getBoundingClientRect().height
        : 0;
      if (isUsable(scrollTarget.style)) {
        scrollTarget.style.scrollMarginTop = `${headerHeight + SCROLL_HEADER_GAP_PX}px`;
      }
      scrollTarget.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start',
      });
    }

    const heading = typeof stepEl.querySelector === 'function' ? stepEl.querySelector('legend') : null;
    if (isUsable(heading)) {
      if (typeof heading.setAttribute === 'function' && !heading.getAttribute?.('tabindex')) {
        heading.setAttribute('tabindex', '-1');
      }
      // `preventScroll: true` -- the scroll above is the one, intentional
      // scroll; focusing the heading must not trigger a second, conflicting
      // native scroll on top of it.
      if (typeof heading.focus === 'function') heading.focus({ preventScroll: true });
    }
  }

  function goBack() {
    const previous = stepHistory.pop();
    if (previous) showStep(previous);
  }

  /** Displays exactly one live regulatory question and tracks its live-selected value in closure state (never read back from the DOM). */
  function showRegulatoryQuestion(questionId) {
    const question = findQuestionById(questionId);
    if (!isUsable(elements.regulatoryQuestionHost) || question === null) return;
    currentRegulatoryQuestionId = questionId;
    currentRegulatoryAnswerValue = regulatoryAnswers[questionId];
    const contextLabel = buildFocusedCheckContextLabel(collectRawFormState(root));
    renderRegulatoryQuestion(doc, elements.regulatoryQuestionHost, question, currentRegulatoryAnswerValue, (value) => {
      currentRegulatoryAnswerValue = value;
    }, contextLabel);
  }

  /**
   * Recomputes and shows the next live regulatory question, or -- once
   * none remain (budget exhausted or every candidate rule answered/
   * excluded) -- proceeds to the result for whichever scenario the
   * focused-checks phase was entered on behalf of.
   */
  function advanceRegulatoryPhaseOrFinish() {
    const nextId = computeNextFollowUpQuestionId({
      hintedCategories: regulatoryHintedCategories,
      answers: regulatoryAnswers,
      rules: REGULATORY_SIGNAL_RULES,
    });
    if (nextId) {
      regulatoryQuestionHistory.push(nextId);
      showRegulatoryQuestion(nextId);
      focusAndScrollToCurrentStep();
      return;
    }
    computeAndRenderResult(pendingResultScenario, normalizeReadinessInput(collectRawFormState(root)));
  }

  /**
   * Entry point for the focused-checks phase, called from every scenario
   * path right before it would otherwise go straight to the result.
   * Recomputes hinted categories from the current product information,
   * drops any previously-stored regulatory answer that no longer
   * belongs to a hinted category (product info may have been edited
   * since an earlier pass through this phase), and either shows the
   * next live question or skips the phase cleanly when nothing is
   * relevant -- never leaving blank space, never promising a fixed
   * question count.
   */
  function proceedToRegulatoryPhaseOrResult(scenario, raw) {
    pendingResultScenario = scenario;
    regulatoryHintedCategories = computeHintedCategories(raw);
    regulatoryAnswers = pruneStaleRegulatoryAnswers(regulatoryAnswers, regulatoryHintedCategories);
    // Reuse already-collected structured core answers (e.g. connects-to-
    // power, food-contact material, coating) so the focused-checks phase
    // never re-asks a concept already reliably known -- see
    // answer-reuse.js. A derived value only ever fills a gap; any answer
    // already given live in this phase always takes precedence.
    regulatoryAnswers = mergeReusedAnswers(regulatoryAnswers, deriveReusableRegulatoryAnswers(raw));

    const nextId = computeNextFollowUpQuestionId({
      hintedCategories: regulatoryHintedCategories,
      answers: regulatoryAnswers,
      rules: REGULATORY_SIGNAL_RULES,
    });
    if (nextId) {
      regulatoryQuestionHistory = [nextId];
      showRegulatoryQuestion(nextId);
      goForward('regulatoryFollowup');
      focusAndScrollToCurrentStep();
      return;
    }
    computeAndRenderResult(scenario, normalizeReadinessInput(raw));
  }

  /** Back navigation while inside the focused-checks phase steps backward through previously-shown live questions before falling back to normal step history. */
  function regulatoryBack() {
    regulatoryQuestionHistory.pop();
    const previousId = regulatoryQuestionHistory[regulatoryQuestionHistory.length - 1];
    if (previousId) {
      showRegulatoryQuestion(previousId);
      focusAndScrollToCurrentStep();
      return;
    }
    goBack();
  }

  function resetRegulatoryFollowupState() {
    regulatoryAnswers = {};
    regulatoryHintedCategories = new Set();
    regulatoryQuestionHistory = [];
    currentRegulatoryQuestionId = null;
    currentRegulatoryAnswerValue = undefined;
    pendingResultScenario = null;
    lastStepBeforeResult = null;
    if (isUsable(elements.regulatoryQuestionHost)) elements.regulatoryQuestionHost.textContent = '';
  }

  function showErrors(messages) {
    if (!isUsable(elements.errors)) return;
    if (messages.length === 0) {
      elements.errors.textContent = '';
      elements.errors.hidden = true;
      return;
    }
    elements.errors.textContent = messages.join(' ');
    elements.errors.hidden = false;
  }

  function updateImportTypeExplanation() {
    const explanationEl = byId(root, 'irImportTypeExplanation');
    if (!isUsable(explanationEl)) return;
    const value = readRadioValue(root, 'irImportType', '');
    explanationEl.textContent = IMPORT_TYPE_EXPLANATIONS[value] ?? '';
  }

  function updateUncertainLeaning() {
    const messageEl = byId(root, 'irUncertainLeaningMessage');
    if (!isUsable(messageEl)) return;
    const raw = collectRawFormState(root);
    const resolved = resolveUncertainImportType({
      forSaleOrDistribution: raw.forSaleOrDistribution,
      forBusinessUse: raw.forBusinessUse,
      personalOrFamilyUseOnly: raw.personalOrFamilyUseOnly,
    });
    messageEl.textContent = resolved.message;
  }

  function computeAndRenderResult(scenario, normalized) {
    lastStepBeforeResult = currentStepId;

    let result;
    if (scenario === SCENARIO.PERSONAL) result = buildPersonalImportResult(normalized);
    else if (scenario === SCENARIO.EXISTING_IMPORTER) result = buildExistingImporterResult(normalized);
    else if (scenario === SCENARIO.ESTABLISHED_OPERATION) result = buildEstablishedOperationResult(normalized);
    else if (scenario === SCENARIO.SHIPMENT_PROBLEM) result = buildShipmentProblemResult(normalized);
    else result = buildFirstCommercialImportResult(normalized);

    // New professional result-presentation layer (result-brief.js):
    // restructures this same, already-safe result into the 8-section
    // brief, fed only by the mechanical document-readiness checklist
    // and the existing, gate-enforced regulatory-signals evaluation --
    // never a new regulatory claim. Live regulatory answers collected
    // through the focused-checks phase (regulatoryAnswers) are passed
    // in here so a genuinely confirmed, gate-cleared signal can surface
    // -- the shipment-problem route never collects or passes them,
    // matching its existing unaltered "no focused direction" framing.
    const documentReadiness = computeDocumentReadiness({ selectedDocuments: normalized.selectedDocuments });
    const regulatoryEvaluation = scenario === SCENARIO.SHIPMENT_PROBLEM
      ? evaluateRegulatorySignals(normalized)
      : evaluateRegulatorySignals(normalized, { answers: regulatoryAnswers });
    const noFocusedDirection = scenario !== SCENARIO.SHIPMENT_PROBLEM
      && (!regulatoryEvaluation || regulatoryEvaluation.signals.length === 0);
    const brief = buildResultBrief(result, { documentReadiness, regulatoryEvaluation, noFocusedDirection });

    const controls = renderResult(doc, elements.result, result, brief, regulatoryEvaluation);
    setHidden(elements.form, true);
    setHidden(elements.result, false);
    updateProgressDisplay('result');
    if (isUsable(elements.stepIndicator)) {
      elements.stepIndicator.textContent = 'שלב: התוצאה שלך';
    }
    // Focus lands on the result region so keyboard/screen-reader users
    // land on the new content predictably -- the region already carries
    // `aria-live="polite"` in the markup, the existing accessible
    // mechanism that announces it.
    if (isUsable(elements.result)) {
      if (typeof elements.result.getAttribute === 'function' && !elements.result.getAttribute('tabindex')) {
        elements.result.setAttribute('tabindex', '-1');
      }
      if (typeof elements.result.focus === 'function') elements.result.focus({ preventScroll: false });
    }

    if (typeof controls.editButton.addEventListener === 'function') {
      controls.editButton.addEventListener('click', () => {
        setHidden(elements.result, true);
        setHidden(elements.form, false);
        // If the focused-checks phase ran, editing returns to the last
        // live regulatory question shown (with its answer preserved) so
        // the user can revisit it directly, rather than jumping past it
        // back to the product-context/scenario-followup step.
        if (lastStepBeforeResult === 'regulatoryFollowup' && regulatoryQuestionHistory.length > 0) {
          showRegulatoryQuestion(regulatoryQuestionHistory[regulatoryQuestionHistory.length - 1]);
          showStep('regulatoryFollowup');
          focusAndScrollToCurrentStep();
          return;
        }
        const previous = stepHistory.length > 0 ? stepHistory[stepHistory.length - 1] : 'q1';
        showStep(previous);
      });
    }
    if (typeof controls.newButton.addEventListener === 'function') {
      controls.newButton.addEventListener('click', () => resetAll({ confirmIfSubstantial: false }));
    }
    if (typeof controls.copyButton.addEventListener === 'function') {
      controls.copyButton.addEventListener('click', () => {
        const summary = buildScenarioSummary(result);
        const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
        if (!clipboard || typeof clipboard.writeText !== 'function') {
          controls.copyStatus.textContent = 'לא ניתן להעתיק כרגע. ניתן לסמן ולהעתיק ידנית.';
          return;
        }
        Promise.resolve(clipboard.writeText(summary)).then(
          () => { controls.copyStatus.textContent = 'הסיכום הועתק'; },
          () => { controls.copyStatus.textContent = 'לא ניתן היה להעתיק. ניתן לסמן ולהעתיק ידנית.'; },
        );
      });
    }
  }

  function resetAll({ confirmIfSubstantial }) {
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
    stepHistory = [];
    currentStepId = null;
    currentScenario = null;
    resetRegulatoryFollowupState();
    showErrors([]);
    setHidden(elements.result, true);
    setHidden(elements.form, true);
    setHidden(elements.intro, false);
    // Neither the form nor the result is visible after a full reset --
    // collapse the section itself back to zero layout height too, same
    // as its initial pre-activation state.
    setHidden(elements.section, true);
  }

  if (isUsable(elements.startButton) && typeof elements.startButton.addEventListener === 'function') {
    elements.startButton.addEventListener('click', () => {
      setHidden(elements.section, false);
      setHidden(elements.intro, true);
      setHidden(elements.form, false);
      setHidden(elements.result, true);
      stepHistory = [];
      showStep('q1');
      focusAndScrollToCurrentStep();
    });
  }

  if (isUsable(elements.problemShortcutButton) && typeof elements.problemShortcutButton.addEventListener === 'function') {
    elements.problemShortcutButton.addEventListener('click', () => {
      setHidden(elements.section, false);
      setHidden(elements.intro, true);
      setHidden(elements.form, false);
      setHidden(elements.result, true);
      stepHistory = [];
      currentScenario = SCENARIO.SHIPMENT_PROBLEM;
      showStep('problemType');
      focusAndScrollToCurrentStep();
    });
  }

  const problemTypeSelect = byId(root, 'irProblemType');
  if (isUsable(problemTypeSelect) && typeof problemTypeSelect.addEventListener === 'function') {
    problemTypeSelect.addEventListener('change', () => updateProblemDetailsVisibility(root));
  }

  if (typeof root.querySelectorAll === 'function') {
    for (const checkbox of root.querySelectorAll('input[name="irProductFamily"], input[name="irMaterial"]')) {
      if (typeof checkbox.addEventListener === 'function') {
        checkbox.addEventListener('change', () => updateProductContextVisibility(root));
      }
    }
  }

  if (typeof root.querySelectorAll === 'function') {
    for (const radio of root.querySelectorAll('input[name="irImportType"]')) {
      if (typeof radio.addEventListener === 'function') {
        radio.addEventListener('change', updateImportTypeExplanation);
      }
    }
    for (const name of ['irForSaleOrDistribution', 'irForBusinessUse', 'irPersonalOrFamilyUseOnly']) {
      for (const radio of root.querySelectorAll(`input[name="${name}"]`)) {
        if (typeof radio.addEventListener === 'function') {
          radio.addEventListener('change', updateUncertainLeaning);
        }
      }
    }
  }

  if (isUsable(elements.nextButton) && typeof elements.nextButton.addEventListener === 'function') {
    elements.nextButton.addEventListener('click', () => {
      showErrors([]);
      const raw = collectRawFormState(root);

      if (currentStepId === 'q1') {
        if (raw.importType.length === 0) {
          showErrors(['יש לבחור אופי יבוא לפני המשך.']);
          return;
        }
        const importType = normalizeImportTypeAnswer(raw.importType);
        if (importType === 'uncertain') {
          updateUncertainLeaning();
          goForward('q1clarify');
        } else {
          goForward('q2');
        }
        return;
      }

      if (currentStepId === 'q1clarify') {
        goForward('q2');
        return;
      }

      if (currentStepId === 'q2') {
        if (raw.experience.length === 0) {
          showErrors(['יש לבחור תשובה לפני המשך.']);
          return;
        }
        goForward('q3');
        return;
      }

      if (currentStepId === 'q3') {
        if (raw.productName.length === 0) {
          showErrors(['יש להזין שם מוצר לפני המשך.']);
          return;
        }
        const scenario = decideScenario({
          importType: normalizeImportTypeAnswer(raw.importType),
          experience: raw.experience,
        });
        currentScenario = scenario;
        // Layered questionnaire architecture: every scenario reached
        // through the primary questions passes through the shared
        // product-context layers (family, materials, technical
        // characteristics, documents) before its scenario-specific
        // follow-up -- see layered-question-model.js. The dedicated
        // shipment-problem route (reached via the intro shortcut, never
        // via q3) is untouched and never passes through this step.
        goForward('productContext');
        return;
      }

      if (currentStepId === 'productContext') {
        if (currentScenario === SCENARIO.PERSONAL) {
          goForward('personalFollowup');
        } else if (currentScenario === SCENARIO.EXISTING_IMPORTER) {
          goForward('existingImporterFollowup');
        } else if (currentScenario === SCENARIO.ESTABLISHED_OPERATION) {
          goForward('establishedOperationFollowup');
        } else {
          proceedToRegulatoryPhaseOrResult(SCENARIO.FIRST_COMMERCIAL, raw);
        }
        return;
      }

      if (currentStepId === 'personalFollowup') {
        proceedToRegulatoryPhaseOrResult(SCENARIO.PERSONAL, raw);
        return;
      }
      if (currentStepId === 'existingImporterFollowup') {
        proceedToRegulatoryPhaseOrResult(SCENARIO.EXISTING_IMPORTER, raw);
        return;
      }
      if (currentStepId === 'establishedOperationFollowup') {
        proceedToRegulatoryPhaseOrResult(SCENARIO.ESTABLISHED_OPERATION, raw);
        return;
      }

      if (currentStepId === 'regulatoryFollowup') {
        if (currentRegulatoryAnswerValue === undefined) {
          showErrors(['יש לבחור תשובה לפני המשך.']);
          return;
        }
        regulatoryAnswers = pruneAnswersInvalidatedByExclusion(
          { ...regulatoryAnswers, [currentRegulatoryQuestionId]: currentRegulatoryAnswerValue },
          REGULATORY_SIGNAL_RULES,
        );
        advanceRegulatoryPhaseOrFinish();
        return;
      }

      if (currentStepId === 'problemType') {
        if (raw.problemType.length === 0) {
          showErrors(['יש לבחור סוג בעיה לפני המשך.']);
          return;
        }
        goForward('problemDetails');
        return;
      }
      if (currentStepId === 'problemDetails') {
        computeAndRenderResult(SCENARIO.SHIPMENT_PROBLEM, normalizeReadinessInput(raw));
      }
    });
  }

  if (isUsable(elements.backButton) && typeof elements.backButton.addEventListener === 'function') {
    elements.backButton.addEventListener('click', () => {
      if (currentStepId === 'regulatoryFollowup') {
        regulatoryBack();
        return;
      }
      goBack();
    });
  }

  if (isUsable(elements.resetButton) && typeof elements.resetButton.addEventListener === 'function') {
    elements.resetButton.addEventListener('click', () => resetAll({ confirmIfSubstantial: true }));
  }

  return Object.freeze({ initialized: true, showStep, resetAll });
}

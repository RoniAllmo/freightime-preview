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
import { SCENARIO, IMPORT_TYPE } from './scenario-schema.js';
import { describeProgress } from './journey-phase-model.js';
import { needsTechnicalCharacteristicsLayer, needsFoodContactMaterialFollowup } from './layered-question-model.js';
import { computeDocumentReadiness } from './document-readiness.js';
import { buildResultBrief } from './result-brief.js';
import { evaluateRegulatorySignals, computeHintedCategories } from './regulatory-signals/index.js';
import { NO_MATCH_MESSAGE, NO_MATCH_NOT_EXEMPT_NOTE } from './regulatory-signals/matcher.js';
import { REGULATORY_SIGNAL_RULES } from './regulatory-signals/rules-registry.js';
import { findQuestionById } from './regulatory-signals/questions.js';
import { deriveReusableRegulatoryAnswers, mergeReusedAnswers } from './regulatory-signals/answer-reuse.js';
import { VEHICLE_PRODUCT_CATEGORY, ELECTRICAL_MAINS_PRODUCT_CATEGORY } from './regulatory-signals/keyword-hints.js';
import { inferVehicleContextAnswers } from './regulatory-signals/vehicle-context-inference.js';
import { buildFocusedCheckContextLabel } from './regulatory-signals/focused-check-context.js';
import { buildProductFamilyMatrixSection } from './product-family-result.js';
import { RESULT_STATE, resolveResultState, isNoDirectionMessageAllowed } from './result-state.js';
import { identifyProductFamily, IDENTIFICATION_OUTCOME } from './product-family-identification.js';
import { suggestProductFamilyValues, suggestMaterialValues } from './family-material-disclosure.js';
import {
  PERSONAL_USE_CLARIFICATION_RULE,
  PERSONAL_USE_CLARIFICATION_CATEGORY,
  PERSONAL_USE_CLARIFICATION_QUESTION_ID,
  shouldAskPersonalUseClarification,
  personalUseClarificationMessage,
} from './personal-use-clarification.js';
import {
  computeNextFollowUpQuestionId,
  pruneStaleRegulatoryAnswers,
  pruneAnswersInvalidatedByExclusion,
  excludedRuleIds,
} from './regulatory-signals/question-scheduler.js';

// The five reviewed detailed-signal rules PLUS the personal-use
// clarification pseudo-rule (personal-use-clarification.js) -- used
// wherever the live follow-up question flow needs to know about every
// rule that can ever ask a question, so the personal-use question
// shares the exact same scheduler, answer store, and global question
// budget as the five detailed rules (never a separate mechanism).
// Never passed to matchRegulatorySignals()/evaluateRegulatorySignals():
// the personal-use pseudo-rule has no public-signal-card content and
// must never produce one.
const REGULATORY_AND_PERSONAL_USE_RULES = Object.freeze([
  ...REGULATORY_SIGNAL_RULES,
  PERSONAL_USE_CLARIFICATION_RULE,
]);

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

/**
 * Progressive disclosure (UX correction): shows only a small suggested
 * subset of a checklist's `<label>` options at first, with a "show all"
 * button to reveal the rest. Purely visual -- every option remains in
 * the DOM with its existing id/name/value, `checked` state is never
 * touched, and once expanded a group never re-collapses (so an
 * expand/collapse toggle can never accidentally hide a checked option).
 * A checked option is always shown regardless of the suggested set, and
 * an empty suggested set means "no safe suggestion" -- the full list is
 * shown and the expand button stays hidden (there is nothing to expand).
 */
function applyChecklistDisclosure(root, groupId, buttonId, suggestedValues) {
  const group = byId(root, groupId);
  const button = byId(root, buttonId);
  if (!isUsable(group) || !isUsable(button) || typeof group.querySelectorAll !== 'function') return;
  if (button.getAttribute('aria-expanded') === 'true') return; // already expanded -- never re-collapse

  const suggestedSet = new Set(suggestedValues);
  let anyHidden = false;
  for (const label of group.querySelectorAll('label')) {
    const input = label.querySelector('input');
    if (!isUsable(input)) continue;
    const show = input.checked === true || suggestedSet.size === 0 || suggestedSet.has(input.value);
    label.hidden = !show;
    if (!show) anyHidden = true;
  }
  setHidden(button, !anyHidden);
}

function expandChecklist(root, groupId, buttonId) {
  const group = byId(root, groupId);
  const button = byId(root, buttonId);
  if (!isUsable(group) || typeof group.querySelectorAll !== 'function') return;
  for (const label of group.querySelectorAll('label')) {
    label.hidden = false;
  }
  if (isUsable(button)) {
    button.setAttribute('aria-expanded', 'true');
    setHidden(button, true);
  }
}

/**
 * Recomputes the suggested family/material subsets from the free text
 * already collected in Q3 (product name, commercial description,
 * intended use) -- read-only, presentation-only (see
 * family-material-disclosure.js). Run on every entry into the
 * productContext step, so revisiting it after editing that text (e.g.
 * via Back, or Edit Answers) reflects the current text; a group that
 * has already been expanded by the user is left alone.
 */
function updateFamilyMaterialDisclosure(root) {
  const texts = [
    readText(byId(root, 'irProductName')),
    readText(byId(root, 'irCommercialDescription')),
    readText(byId(root, 'irIntendedUse')),
  ];
  applyChecklistDisclosure(root, 'irProductFamilyGroup', 'irProductFamilyExpand', suggestProductFamilyValues(texts));
  applyChecklistDisclosure(root, 'irMaterialGroup', 'irMaterialExpand', suggestMaterialValues());
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
  // The legend keeps the programmatic focus target (tabindex="-1", same
  // as before) and its native Legend/group semantics; a real heading
  // nested inside it (verified in a real browser to leave both the
  // group's accessible name and the Legend role intact) is the single
  // visible text source that also makes the active question
  // discoverable through heading navigation -- see the matching static
  // markup in index.html for the same pattern.
  const legend = el(doc, 'legend', { attrs: { tabindex: '-1' } });
  legend.appendChild(el(doc, 'h3', { text: question.legend }));
  fieldset.appendChild(legend);

  const row = el(doc, 'div', { className: 'ir-radio-row' });
  for (const option of question.options) {
    row.appendChild(renderRegulatoryOptionLabel(doc, question.id, option, existingAnswer, onAnswerChange));
  }
  fieldset.appendChild(row);
  host.appendChild(fieldset);
}

/**
 * Result-container accessible-name relationship (Phase: result-heading
 * focus): the focused result container (`#readinessResult`) is given an
 * `aria-labelledby` pointing at whichever of these two headings actually
 * rendered -- the specific finding title when one exists (every
 * detailed-rule match, matrix-positive match, and recognized-family-
 * no-positive state all render one), falling back to the always-present
 * "הפעולה המומלצת" heading for the one state with no specific finding
 * title (unrecognized family). Never a fabricated "כיוון בדיקה מקצועי"
 * label, never a new visible heading, never a change to the existing
 * result hierarchy -- both ids are attached to headings that already
 * render today; see updateResultAccessibleName() below for the id
 * selection and stale-reference cleanup.
 */
const RESULT_PRIMARY_HEADING_ID = 'irResultPrimaryHeading';
const RESULT_ACTION_HEADING_ID = 'irResultActionHeading';

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
/**
 * Adapts the existing detailed-rule matcher's primary signal card (see
 * regulatory-signals/matcher.js's buildSignalCard) into the canonical
 * shape renderCanonicalRegulatoryResult() renders. The approved detailed
 * wording (title/identification/implication/verificationItems/
 * professional display text) is carried through unchanged -- only the
 * DOM structure it renders into is shared with the matrix path.
 */
function canonicalFromDetailedSignal(evaluation) {
  if (evaluation === null || typeof evaluation !== 'object') return null;
  const signals = Array.isArray(evaluation.signals) ? evaluation.signals : [];
  if (signals.length === 0) return null;
  const [primary, ...rest] = signals;

  return {
    statusLabel: primary.statusLabel || 'כיוון בדיקה מקצועי',
    familyName: null,
    detailedTitle: primary.title,
    identification: primary.identification,
    implication: primary.implication,
    positiveCategories: [],
    note: null,
    personalUseClarificationMessage: null,
    verificationItems: Array.isArray(primary.verificationItems) ? primary.verificationItems.slice(0, 3) : [],
    professionalPrimaryText: primary.professionalDisplayText || null,
    professionalPrimaryReason: primary.professionalReason || null,
    professionalSupportingText: primary.supportingProfessionalDisplayText || null,
    // Canonical professional-category ids (never guessed from visible
    // text) -- used only to detect when the generic, scenario-level
    // professional referral names the exact same professional this
    // finding already named, so that duplicate referral is suppressed
    // rather than shown a second time (see resolveProfessionalDedup()).
    professionalPrimaryCategoryIds: primary.primaryProfessional ? primary.primaryProfessional.coveredCategoryIds : [],
    professionalPrimaryCtaLabel: primary.primaryProfessional ? primary.primaryProfessional.ctaLabel : null,
    professionalSupportingCategoryIds: primary.supportingProfessional ? primary.supportingProfessional.coveredCategoryIds : [],
    confidence: primary.confidence || null,
    limitation: primary.limitation,
    noFamilyMatchMessage: null,
    noFamilyMatchHelp: null,
    noPositiveSignalMessage: null,
    noPositiveSignalNotExemptNote: null,
    why: primary.details && primary.details.whyVerificationStillMatters
      ? { text: primary.details.whyVerificationStillMatters, verifiedLabel: primary.details.verifiedLabel }
      : null,
    additionalSignals: rest.map((s) => ({ title: s.title, implication: s.implication })),
    extraSignalCount: evaluation.extraSignalCount > 0 ? evaluation.extraSignalCount : 0,
  };
}

/**
 * Adapts the product-family matrix section (see product-family-result.js)
 * into the same canonical shape.
 */
function canonicalFromMatrixSection(section) {
  if (!section || typeof section !== 'object') return null;
  return {
    // Kept as a distinguishing marker class (in addition to the shared
    // canonical `ir-regulatory-signals` class) so existing exact-match
    // DOM assertions that specifically target a detailed-rule signal
    // card can still tell the two content sources apart.
    sourceClassName: 'ir-regulatory-signals ir-family-matrix-signals',
    // "כיוון בדיקה מקצועי" is a claim that a real professional finding
    // exists -- it must never label the two neutral explanation states
    // (unknown family / recognized family with no positive matrix
    // signal), which have their own approved wording instead (Phase H).
    statusLabel: section.hasPositiveCategories ? 'כיוון בדיקה מקצועי' : null,
    familyName: section.familyName,
    detailedTitle: section.familyName ? 'נמצאו תחומי חוקיות יבוא לבדיקה' : null,
    identification: null,
    implication: null,
    positiveCategories: section.hasPositiveCategories ? section.positiveCategories : [],
    note: section.note ? section.note.text : null,
    personalUseClarificationMessage: section.personalUseClarificationMessage || null,
    verificationItems: Array.isArray(section.verificationItems) ? section.verificationItems.slice(0, 3) : [],
    professionalPrimaryText: section.professional && section.professional.primary
      ? `${section.professional.primary.type} — ${section.professional.primary.reason}` : null,
    professionalPrimaryReason: null,
    professionalSupportingText: section.professional && section.professional.supporting
      ? `${section.professional.supporting.type} — ${section.professional.supporting.reason}` : null,
    // See canonicalFromDetailedSignal() above for what these are for.
    professionalPrimaryCategoryIds: section.professional && section.professional.primary
      ? section.professional.primary.coveredCategoryIds : [],
    professionalPrimaryCtaLabel: section.professional && section.professional.primary
      ? section.professional.primary.ctaLabel : null,
    professionalSupportingCategoryIds: section.professional && section.professional.supporting
      ? section.professional.supporting.coveredCategoryIds : [],
    confidence: null,
    limitation: section.limitation,
    noFamilyMatchMessage: section.noFamilyMatchMessage || null,
    noFamilyMatchHelp: section.noFamilyMatchHelp || null,
    noPositiveSignalMessage: section.noPositiveSignalMessage || null,
    noPositiveSignalNotExemptNote: section.noPositiveSignalNotExemptNote || null,
    why: null,
    additionalSignals: [],
    extraSignalCount: 0,
  };
}

/**
 * ONE canonical result renderer (Phase C/G "canonical unified result
 * component") used by every regulatory-signal-bearing state: a
 * detailed-rule match, a matrix-only positive match, a recognized
 * family with no positive category, and an unrecognized-family state.
 * Renders nothing when there is genuinely nothing to show. Required
 * heading order: status -> identified family -> detailed title ->
 * positive categories -> identification/implication -> note -> up to
 * three verification items -> primary professional -> supporting
 * professional -> one limitation.
 */
function renderCanonicalRegulatoryResult(doc, resultContainer, canonical) {
  if (!canonical) return;

  // The section's accessible label always names the specific finding
  // (or, for the two neutral explanation states, their own approved
  // message) -- never generic, and never "כיוון בדיקה מקצועי" unless
  // that label is actually shown (see canonicalFromMatrixSection).
  const accessibleLabel = canonical.statusLabel
    || canonical.noFamilyMatchMessage
    || canonical.noPositiveSignalMessage
    || canonical.detailedTitle
    || 'תוצאת בדיקה';
  const section = el(doc, 'section', {
    className: canonical.sourceClassName || 'ir-regulatory-signals',
    attrs: { 'aria-label': accessibleLabel },
  });

  if (canonical.statusLabel) {
    section.appendChild(el(doc, 'p', { className: 'ir-regulatory-status-label', text: canonical.statusLabel }));
  }

  if (canonical.familyName) {
    section.appendChild(el(doc, 'p', { className: 'ir-regulatory-family', text: `משפחת המוצר שזוהתה: ${canonical.familyName}` }));
  }

  if (canonical.detailedTitle) {
    section.appendChild(el(doc, 'h3', { text: canonical.detailedTitle, attrs: { id: RESULT_PRIMARY_HEADING_ID } }));
  }

  // Two logical content groups, each wrapped in its own plain
  // structural <div> (no styling of its own -- background, padding,
  // and every existing selector still target the elements inside it
  // exactly as before) so that on the desktop two-column composition
  // each group becomes exactly one grid item with its own independent
  // height. This is the fix for the excessive gap that could appear
  // between a short item (e.g. this narrative group's own category
  // label and its list) and the content below it: previously every
  // child of this section was its own flat grid item, so CSS Grid's
  // row-based auto-placement could pair a short narrative item with a
  // much taller item from the handoff group in the same implicit row,
  // inflating that row to the taller item's height and leaving dead
  // space under the shorter one. Grouping means a row's height is now
  // only ever determined by that group's own content -- never by an
  // unrelated column. No DOM reordering: every element below still
  // appends in exactly its previous relative order, just inside a
  // wrapper at its existing position.
  const narrativeGroup = el(doc, 'div', { className: 'ir-regulatory-narrative' });
  const handoffGroup = el(doc, 'div', { className: 'ir-regulatory-handoff' });

  if (canonical.positiveCategories.length > 0) {
    narrativeGroup.appendChild(el(doc, 'p', { text: 'תחומי בדיקה רלוונטיים:' }));
    const ul = el(doc, 'ul', { className: 'ir-regulatory-category-list' });
    for (const category of canonical.positiveCategories) ul.appendChild(el(doc, 'li', { text: category }));
    narrativeGroup.appendChild(ul);
  }

  if (canonical.identification) narrativeGroup.appendChild(el(doc, 'p', { text: canonical.identification }));
  if (canonical.implication) narrativeGroup.appendChild(el(doc, 'p', { text: canonical.implication }));

  if (canonical.noFamilyMatchMessage) {
    narrativeGroup.appendChild(el(doc, 'p', { className: 'ir-no-family-match-message', text: canonical.noFamilyMatchMessage }));
    narrativeGroup.appendChild(el(doc, 'p', { className: 'ir-no-family-match-help', text: canonical.noFamilyMatchHelp }));
  }
  if (canonical.noPositiveSignalMessage) {
    narrativeGroup.appendChild(el(doc, 'p', { className: 'ir-no-positive-signal-message', text: canonical.noPositiveSignalMessage }));
    narrativeGroup.appendChild(el(doc, 'p', { className: 'ir-no-positive-signal-note', text: canonical.noPositiveSignalNotExemptNote }));
  }

  if (canonical.note) narrativeGroup.appendChild(el(doc, 'p', { text: canonical.note }));
  if (canonical.personalUseClarificationMessage) narrativeGroup.appendChild(el(doc, 'p', { className: 'ir-personal-use-clarification', text: canonical.personalUseClarificationMessage }));

  if (canonical.verificationItems.length > 0) {
    const ul = el(doc, 'ul', { className: 'ir-regulatory-verification-items' });
    for (const item of canonical.verificationItems) ul.appendChild(el(doc, 'li', { text: item }));
    narrativeGroup.appendChild(ul);
  }

  if (canonical.professionalPrimaryText) {
    handoffGroup.appendChild(el(doc, 'p', { className: 'ir-regulatory-primary-professional', text: canonical.professionalPrimaryText }));
  }
  if (canonical.professionalPrimaryReason) {
    handoffGroup.appendChild(el(doc, 'p', { className: 'ir-regulatory-primary-professional-reason', text: canonical.professionalPrimaryReason }));
  }
  if (canonical.professionalSupportingText) {
    handoffGroup.appendChild(el(doc, 'p', { className: 'ir-regulatory-supporting-professional', text: canonical.professionalSupportingText }));
  }

  // The one primary CTA, placed inside the canonical professional
  // section immediately after the professional it belongs to -- only
  // rendered here when the generic professional-referral block outside
  // this section was suppressed as a duplicate of this same finding's
  // own primary professional (see resolveProfessionalDedup()), so the
  // approved CTA is never lost, and never shown twice.
  if (canonical.showPrimaryCta && canonical.professionalPrimaryCtaLabel) {
    handoffGroup.appendChild(
      el(doc, 'a', { className: 'ir-professional-cta ir-regulatory-primary-cta', text: canonical.professionalPrimaryCtaLabel, attrs: { href: '#contact' } }),
    );
  }

  if (canonical.confidence) handoffGroup.appendChild(el(doc, 'p', { className: 'ir-regulatory-confidence', text: canonical.confidence }));

  if (narrativeGroup.children.length > 0) section.appendChild(narrativeGroup);
  if (handoffGroup.children.length > 0) section.appendChild(handoffGroup);

  // Everything from here on is narrative-column content that comes
  // after the handoff group in existing document order (the limitation,
  // "why", and additional-signals blocks) -- kept in its own trailing
  // group, appended after handoffGroup, so DOM order is completely
  // unchanged from before while each group still gets its own
  // independent grid-row height.
  const narrativeTailGroup = el(doc, 'div', { className: 'ir-regulatory-narrative' });
  narrativeTailGroup.appendChild(el(doc, 'p', { className: 'ir-regulatory-limitation', text: canonical.limitation }));

  if (canonical.why) {
    const why = el(doc, 'details', { className: 'ir-regulatory-why' });
    why.appendChild(el(doc, 'summary', { text: 'למה התקבלה התוצאה?' }));
    why.appendChild(el(doc, 'p', { text: canonical.why.text }));
    if (canonical.why.verifiedLabel) why.appendChild(el(doc, 'p', { text: canonical.why.verifiedLabel }));
    narrativeTailGroup.appendChild(why);
  }

  if (canonical.additionalSignals.length > 0) {
    const moreBlock = el(doc, 'div', { className: 'ir-regulatory-additional-signals' });
    moreBlock.appendChild(el(doc, 'h4', { text: 'תחומי בדיקה נוספים שזוהו' }));
    const ul = el(doc, 'ul');
    for (const signal of canonical.additionalSignals) {
      ul.appendChild(el(doc, 'li', { text: `${signal.title} — ${signal.implication}` }));
    }
    moreBlock.appendChild(ul);
    narrativeTailGroup.appendChild(moreBlock);
  }

  if (canonical.extraSignalCount > 0) {
    narrativeTailGroup.appendChild(el(doc, 'p', { className: 'ir-regulatory-extra-note', text: 'זוהו תחומי בדיקה נוספים.' }));
  }

  section.appendChild(narrativeTailGroup);

  resultContainer.appendChild(section);
}

/**
 * Dedicated, neutral no-match presentation (Phase F): shown only when a
 * candidate regulatory category WAS hinted by the product details but
 * no rule actually matched (excluded, or an unresolved/negative answer)
 * -- distinct from simply having no regulatory hint at all, which is
 * the ordinary case for most products and needs no such block. Neither
 * a success nor an error state: calm, neutral, same visual language as
 * the rest of the result, never colored red or green. Shows the exact
 * two approved sentences plus exactly one useful next action -- no
 * fabricated suggestions, no legal explanation.
 */
function renderNoMatchBlock(doc, resultContainer, evaluation, resultState) {
  if (evaluation === null || typeof evaluation !== 'object') return;
  // Gated on the canonical result-state resolver (result-state.js), not
  // just this evaluation's own narrow signal list -- a matched matrix
  // direction (state B/C) can leave regulatoryEvaluation.signals empty
  // (the 5-rule engine and the matrix are separate systems) while still
  // carrying a real, already-shown finding; this block's "no direction
  // identified" wording must never render alongside that finding.
  // SELECTION_INFORMATION_NEEDED (an explicit family selection whose
  // candidate set free text couldn't resolve) is also eligible: when a
  // detailed rule's own no-match explanation already exists,
  // resolveCanonicalRegulatoryContent() suppresses the matrix section's
  // own "selection unresolved" message so the two never render
  // together -- this block is then the only thing left to explain the
  // result, so it must still fire.
  if (resultState !== RESULT_STATE.UNKNOWN_FAMILY && resultState !== RESULT_STATE.SELECTION_INFORMATION_NEEDED) return;
  const signals = Array.isArray(evaluation.signals) ? evaluation.signals : [];
  if (signals.length > 0 || !evaluation.noMatchMessage) return;

  const section = el(doc, 'section', { className: 'ir-no-match', attrs: { 'aria-label': 'לא זוהה כיוון בדיקה ממוקד' } });
  section.appendChild(el(doc, 'p', { className: 'ir-no-match-message', text: evaluation.noMatchMessage }));
  if (evaluation.noMatchNotExemptNote) {
    section.appendChild(el(doc, 'p', { className: 'ir-no-match-note', text: evaluation.noMatchNotExemptNote }));
  }
  section.appendChild(el(doc, 'p', {
    className: 'ir-no-match-action',
    text: 'ניתן לערוך את פרטי המוצר שנמסרו ולנסות שוב, אם יש מידע נוסף להוסיף.',
  }));
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
/**
 * @param {object|null} existingPreparationList - the `<ul>` of an
 *   already-rendered route-specific "מה להכין" checklist (see
 *   `preparationList` in `renderResult()`), when this same result has
 *   one. When present, the document-readiness checklist below joins
 *   that SAME list instead of opening a second, separately headed
 *   "documents to prepare" section -- per the requirement that a result
 *   shows at most one dedicated document/preparation section. Its items
 *   are already deduplicated against that checklist's own text (see
 *   document-dedup.js via buildResultBrief()), so nothing appended here
 *   repeats an item already in the list.
 */
function renderResultBrief(doc, resultContainer, brief, existingPreparationList) {
  // The no-match sentences are already rendered by the dedicated
  // renderNoMatchBlock() (Phase F) when applicable -- filtered out here
  // so they never appear a second time in this trailing block.
  const missingInformation = brief.missingInformation.filter(
    (line) => line !== NO_MATCH_MESSAGE && line !== NO_MATCH_NOT_EXEMPT_NOTE,
  );

  if (existingPreparationList && brief.documentsToObtain.length > 0) {
    for (const item of brief.documentsToObtain) {
      existingPreparationList.appendChild(el(doc, 'li', { text: item }));
    }
  }

  const documentsToObtain = existingPreparationList ? [] : brief.documentsToObtain;
  const hasContent = documentsToObtain.length > 0 || missingInformation.length > 0;
  if (!hasContent) return;

  const section = el(doc, 'section', { className: 'ir-result-brief', attrs: { 'aria-label': 'מסמכים ומידע נוסף' } });
  renderBriefList(doc, section, BRIEF_SECTION_HEADING.documentsToObtain, documentsToObtain);
  renderBriefList(doc, section, BRIEF_SECTION_HEADING.missingInformation, missingInformation);

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
/**
 * @param {object} dedup - see resolveProfessionalDedup(); null when this
 *   result carries no canonical regulatory/matrix section at all (the
 *   generic professional referral is never a duplicate of nothing).
 */
function renderPrimaryActionAndProfessionalGroup(doc, resultContainer, result, dedup) {
  if (result.primaryAction) {
    const actionBlock = el(doc, 'div', { className: 'ir-primary-action' });
    actionBlock.appendChild(el(doc, 'h3', { text: 'הפעולה המומלצת', attrs: { id: RESULT_ACTION_HEADING_ID } }));
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
  // one dedicated action CTA. Positioned right after the primary
  // recommendation + reason and before the preparation checklist --
  // never buried below it, never inside the collapsed details, never
  // more than one professional/CTA pairing per result. The CTA only
  // navigates to the existing #contact section -- it never appends
  // assessment answers to the URL and never auto-submits anything.
  //
  // Suppressed entirely when it would duplicate the canonical
  // regulatory/matrix section's own primary professional (same
  // canonical category id, compared in resolveProfessionalDedup() --
  // never guessed from text) -- that section already named the
  // professional, the reason, and (via `showPrimaryCta`) the CTA, so
  // showing this generic version again would be the same handoff
  // twice under two different headings.
  const professional = result.professional !== null && typeof result.professional === 'object' ? result.professional : null;
  const suppressPrimaryReferral = Boolean(dedup && dedup.suppressGenericPrimary);
  if (professional && professional.type) {
    if (!suppressPrimaryReferral) {
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
    }
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
  // Suppressed identically to the primary referral above when it
  // would duplicate the canonical section's own supporting
  // professional.
  const supportingProfessional = result.supportingProfessional !== null && typeof result.supportingProfessional === 'object' ? result.supportingProfessional : null;
  const suppressSupportingReferral = Boolean(dedup && dedup.suppressGenericSupporting);
  if (!suppressSupportingReferral && supportingProfessional && supportingProfessional.type) {
    const supportBlock = el(doc, 'div', { className: 'ir-supporting-professional' });
    supportBlock.appendChild(el(doc, 'h3', { text: 'גורם מקצועי נוסף' }));
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
}

/**
 * Compares the generic, scenario-level professional referral(s)
 * (`result.professional` / `result.supportingProfessional`) against
 * the canonical regulatory/matrix section's own professional(s) by
 * canonical professional-category id(s) -- never by visible text,
 * which could misfire on coincidental wording overlap or miss a real
 * duplicate hidden behind slightly different phrasing. A referral's
 * `coveredCategoryIds` is populated only by `professionalReferral()`/
 * `jointReferral()` (professional-category-registry.js) for a
 * single-category referral, or by an explicit, reviewed
 * `coveredCategoryIds` annotation on a joint-worded generic referral
 * (e.g. `PROFESSIONAL_REFERRAL.CLASSIFICATION_AND_REGULATION` in
 * build-action-map.js, whose own label text literally enumerates the
 * categories it covers) -- never inferred at runtime from text. A
 * referral with no known covered ids (empty array) is NEVER treated as
 * a duplicate of anything, by construction -- suppression only ever
 * fires on a confirmed overlap: at least one of the generic referral's
 * covered category ids is also one of the canonical finding's own
 * (primary or supporting) category ids.
 *
 * Never changes WHICH professional a scenario or rule selects (that
 * selection logic is untouched) -- only whether the generic referral
 * is rendered a second time after the canonical section already named
 * the same one.
 *
 * @returns {{suppressGenericPrimary: boolean, suppressGenericSupporting: boolean}}
 */
function resolveProfessionalDedup(result, canonical) {
  if (!canonical) return { suppressGenericPrimary: false, suppressGenericSupporting: false };

  const canonicalIds = new Set([
    ...(Array.isArray(canonical.professionalPrimaryCategoryIds) ? canonical.professionalPrimaryCategoryIds : []),
    ...(Array.isArray(canonical.professionalSupportingCategoryIds) ? canonical.professionalSupportingCategoryIds : []),
  ]);

  const genericPrimaryIds = result && result.professional && Array.isArray(result.professional.coveredCategoryIds)
    ? result.professional.coveredCategoryIds : [];
  const genericSupportingIds = result && result.supportingProfessional && Array.isArray(result.supportingProfessional.coveredCategoryIds)
    ? result.supportingProfessional.coveredCategoryIds : [];

  return {
    suppressGenericPrimary: genericPrimaryIds.some((id) => canonicalIds.has(id)),
    suppressGenericSupporting: genericSupportingIds.some((id) => canonicalIds.has(id)),
  };
}

/**
 * Resolves the ONE canonical regulatory-result component's content
 * (Phase C/G) for this result, or null when there is genuinely no
 * specific professional/regulatory direction to show -- the single,
 * content-driven signal (not a route/scenario check) that decides the
 * whole result's section order below. A matched detailed rule always
 * takes precedence (its approved specific wording is never reduced to
 * the generic matrix presentation); the matrix section only renders
 * when no detailed rule produced a signal for this result -- which
 * also covers the recognized-family-no-positive-signal and
 * unknown-family states, since product-family-result.js already
 * returns those as the same section shape.
 */
function resolveCanonicalRegulatoryContent(regulatoryEvaluation, productFamilySection) {
  const canonicalDetailed = canonicalFromDetailedSignal(regulatoryEvaluation);
  if (canonicalDetailed) return canonicalDetailed;

  // The "unknown family"/"selection unresolved" states are suppressed
  // only when a detailed rule's own dedicated no-match block already
  // explains the result (regulatoryEvaluation.noMatchMessage) -- that
  // block is the approved wording for "a category was hinted but
  // excluded" and must never be duplicated by either banner. An
  // unrecognized product with genuinely no hint at all still gets its
  // message: these states exist precisely to explain results the
  // dedicated no-match block does not cover. A recognized family with
  // no positive category is unaffected by this guard and always
  // renders.
  const isUnresolvedFamilyState = productFamilySection
    && (productFamilySection.state === 'unknown_family' || productFamilySection.state === 'selection_unresolved');
  const suppressUnresolvedFamily = isUnresolvedFamilyState
    && regulatoryEvaluation !== null && Boolean(regulatoryEvaluation.noMatchMessage);
  return suppressUnresolvedFamily ? null : canonicalFromMatrixSection(productFamilySection);
}

function renderResult(doc, resultContainer, result, brief, regulatoryEvaluation, productFamilySection, resultState) {
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

  // Canonical result-ordering model (content-driven, not route-specific):
  // when this result carries a specific professional/regulatory
  // direction -- a matched detailed rule, a matrix positive category, a
  // recognized-family-no-positive-signal state, or an unknown-family
  // state -- that finding is the primary result and is promoted above
  // "הפעולה המומלצת" and the generic professional referral, which now
  // read as a natural next step once the user already understands what
  // was identified and why it matters. Results with no such finding at
  // all (cargo damage, customs disputes, insurance, storage/demurrage,
  // and any other route where the regulatory-signals/matrix engines
  // produced nothing) keep their original, unaltered order: the
  // operational action stays first, since there is no specific finding
  // to lead with. This one boolean is the entire branch -- no per-route
  // special-casing exists anywhere in this function.
  const canonicalRegulatoryContent = resolveCanonicalRegulatoryContent(regulatoryEvaluation, productFamilySection);
  if (canonicalRegulatoryContent) {
    // Dedup by canonical professional-category id (Phase: professional-
    // referral deduplication) -- when the generic, scenario-level
    // referral names the exact same professional this finding's own
    // canonical professional already named, that generic block is
    // suppressed and its CTA moves inside the canonical section
    // instead, so the user sees one clear handoff, not the same
    // professional twice under two headings.
    const professionalDedup = resolveProfessionalDedup(result, canonicalRegulatoryContent);
    if (professionalDedup.suppressGenericPrimary && canonicalRegulatoryContent.professionalPrimaryCtaLabel) {
      canonicalRegulatoryContent.showPrimaryCta = true;
    }
    renderCanonicalRegulatoryResult(doc, resultContainer, canonicalRegulatoryContent);
    renderNoMatchBlock(doc, resultContainer, regulatoryEvaluation, resultState);
    renderPrimaryActionAndProfessionalGroup(doc, resultContainer, result, professionalDedup);
  } else {
    renderPrimaryActionAndProfessionalGroup(doc, resultContainer, result, null);
    renderNoMatchBlock(doc, resultContainer, regulatoryEvaluation, resultState);
  }

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

  // Tracked so the document-readiness checklist below (Phase F) can
  // join this same list instead of opening a second, overlapping
  // "documents to prepare" heading -- see renderResultBrief().
  let preparationList = null;
  if (Array.isArray(result.preparationItems) && result.preparationItems.length > 0) {
    const prepBlock = el(doc, 'div', { className: 'ir-preparation' });
    prepBlock.appendChild(el(doc, 'h3', { text: 'מה להכין' }));
    const ul = el(doc, 'ul');
    for (const item of result.preparationItems) {
      ul.appendChild(el(doc, 'li', { text: item }));
    }
    prepBlock.appendChild(ul);
    resultContainer.appendChild(prepBlock);
    preparationList = ul;
  }

  if (result.secondaryCta) {
    const ctaRow = el(doc, 'div', { className: 'ir-cta-row' });
    ctaRow.appendChild(el(doc, 'a', { className: 'tool-btn-secondary', text: result.secondaryCta.label, attrs: { href: '#contact' } }));
    resultContainer.appendChild(ctaRow);
  }

  // Canonical document/preparation region (Phase F): the new
  // professional result-presentation layer's document checklist (see
  // result-brief.js) belongs immediately beside the preparation
  // checklist above -- both are "what to gather" content -- so it
  // renders here, before the utility actions, not after the disclaimer
  // where it previously sat disconnected from the rest of this result's
  // document guidance. It was already deduplicated against the
  // preparation checklist in buildResultBrief() itself (see
  // document-dedup.js), so nothing rendered here repeats what the
  // preparation list above already named.
  if (brief) {
    renderResultBrief(doc, resultContainer, brief, preparationList);
  }

  const actions = el(doc, 'div', { className: 'ir-nav' });
  // Action hierarchy: the one true primary CTA of the result is the
  // professional-referral action (.ir-professional-cta) or, on routes
  // without one, .ir-primary-action's own recommendation -- never a
  // second, competing "primary"-styled button here. Edit/copy/new are
  // peer secondary actions; none uses tool-btn-primary.
  const copyButton = el(doc, 'button', { className: 'btn-text ir-nav-copy', text: 'העתקת סיכום', attrs: { type: 'button' } });
  const editButton = el(doc, 'button', { className: 'tool-btn-secondary', text: 'עריכת תשובות', attrs: { type: 'button' } });
  const newButton = el(doc, 'button', { className: 'tool-btn-secondary ir-nav-new', text: 'בדיקה חדשה', attrs: { type: 'button' } });
  const secondaryRow = el(doc, 'div', { className: 'ir-nav-secondary-row' });
  secondaryRow.appendChild(editButton);
  secondaryRow.appendChild(newButton);
  actions.appendChild(secondaryRow);
  actions.appendChild(copyButton);
  resultContainer.appendChild(actions);

  const copyStatus = el(doc, 'div', { attrs: { 'aria-live': 'polite' } });
  resultContainer.appendChild(copyStatus);

  // "מידע נוסף והסברים" (Phase H): the final expandable section --
  // after the document/preparation content and the utility actions,
  // with nothing following it except the one final disclaimer below.
  // Previously rendered before the utility actions, which read as
  // appearing too early in the result; moved here without changing any
  // of its own content or logic.
  const secondary = result.secondaryDetails !== null && typeof result.secondaryDetails === 'object' ? result.secondaryDetails : {};
  // Defensive backstop (belt-and-braces alongside the answer-threading
  // fix in the scenario builders themselves): a scenario builder's own
  // secondary-details note can only ever be this exact, known "no
  // direction identified" sentence (see matcher.js's NO_MATCH_MESSAGE) --
  // never free text -- so it is safe to compare against the constant
  // and suppress it whenever the canonical result-state resolver says
  // this result already carries a real finding.
  const showSecondaryNote = typeof secondary.note === 'string' && secondary.note.length > 0
    && !(secondary.note === NO_MATCH_MESSAGE && !isNoDirectionMessageAllowed(resultState));
  const hasSecondaryContent =
    (Array.isArray(secondary.points) && secondary.points.length > 0) ||
    (Array.isArray(secondary.officialSources) && secondary.officialSources.length > 0) ||
    showSecondaryNote ||
    (typeof result.extendedDisclaimer === 'string' && result.extendedDisclaimer.length > 0);

  if (hasSecondaryContent) {
    const details = el(doc, 'details', { className: 'ir-secondary-details' });
    details.appendChild(el(doc, 'summary', { text: 'מידע נוסף והסברים' }));

    if (Array.isArray(secondary.points) && secondary.points.length > 0) {
      const ul = el(doc, 'ul');
      for (const point of secondary.points) ul.appendChild(el(doc, 'li', { text: point }));
      details.appendChild(ul);
    }
    if (showSecondaryNote) {
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

  // Disclaimer last: the one final limitation, after everything else --
  // the primary recommendation, the professional referral, the
  // preparation/document content, the utility actions, and the
  // collapsed "מידע נוסף והסברים" section -- never buried mid-result.
  resultContainer.appendChild(el(doc, 'p', { className: 'ir-disclaimer', text: result.visibleDisclaimer }));

  return { copyButton, editButton, newButton, copyStatus };
}

/**
 * Gives the focused result container a meaningful accessible-name
 * relationship, without changing the visible result hierarchy: points
 * `aria-labelledby` at whichever real, already-rendered heading exists
 * for this result -- the specific finding title
 * (`RESULT_PRIMARY_HEADING_ID`) when one rendered, otherwise the
 * always-present "הפעולה המומלצת" heading (`RESULT_ACTION_HEADING_ID`).
 * Never invents a heading and never leaves a stale reference: since
 * renderResult() clears and fully rebuilds `resultContainer` on every
 * call, this always re-checks the CURRENT DOM rather than trusting a
 * previous decision, and removes the attribute entirely on the rare
 * chance neither heading rendered (defensive; not expected in practice).
 */
function updateResultAccessibleName(resultContainer) {
  if (!isUsable(resultContainer) || typeof resultContainer.querySelector !== 'function') return;
  if (resultContainer.querySelector(`#${RESULT_PRIMARY_HEADING_ID}`)) {
    resultContainer.setAttribute('aria-labelledby', RESULT_PRIMARY_HEADING_ID);
  } else if (resultContainer.querySelector(`#${RESULT_ACTION_HEADING_ID}`)) {
    resultContainer.setAttribute('aria-labelledby', RESULT_ACTION_HEADING_ID);
  } else {
    resultContainer.removeAttribute('aria-labelledby');
  }
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
    phaseIndicator: byId(root, 'readinessPhaseIndicator'),
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
    if (isUsable(elements.phaseIndicator) && elements.phaseIndicator.children) {
      Array.from(elements.phaseIndicator.children).forEach((li, i) => {
        const stepNumber = i + 1;
        const state = stepNumber < progress.index ? 'complete' : stepNumber === progress.index ? 'current' : 'upcoming';
        li.setAttribute('data-state', state);
        li.setAttribute('aria-current', state === 'current' ? 'step' : 'false');
      });
    }
  }

  function showStep(stepId) {
    currentStepId = stepId;
    for (const elId of ALL_STEP_IDS) {
      setHidden(byId(root, elId), true);
    }
    setHidden(byId(root, STEP_ID_TO_ELEMENT_ID[stepId]), false);
    if (stepId === 'problemDetails') updateProblemDetailsVisibility(root);
    if (stepId === 'productContext') {
      updateProductContextVisibility(root);
      updateFamilyMaterialDisclosure(root);
    }
    if (isUsable(elements.stepIndicator)) {
      elements.stepIndicator.textContent = `שלב: ${STEP_LABELS[stepId] ?? stepId}`;
    }
    updateProgressDisplay(stepId);
    setHidden(elements.backButton, stepHistory.length === 0);
    elements.nextButton.textContent = 'הבא ←';
    // Canonical transition point (Phase C): every step change -- forward,
    // Back, Edit Answers, or the initial Hero-reveal -- scrolls/focuses
    // through this one call site, so no call site can forget it. Root
    // cause of the reported "landing too low" defect: this call previously
    // existed only as a helper that individual call sites had to remember
    // to invoke explicitly, and most forward `goForward(...)` transitions
    // (q1->q2, q2->q3, q3->productContext, and beyond) simply never called
    // it at all -- the page was left wherever it happened to be when the
    // "הבא" button was clicked (typically scrolled to the previous
    // fieldset's bottom), never corrected. Back and Edit Answers had the
    // same gap. Centralizing the call here closes it for every path at once.
    focusAndScrollToCurrentStep();
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
   * Canonical transition helper (Phase C): every questionnaire-phase,
   * focused-check, and result transition scrolls and focuses through this
   * one function, so there is exactly one scroll implementation and one
   * intentional scroll call site pattern in the whole controller.
   *
   * `surfaceEl` is the element scrolled into view -- the whole surface
   * (assessment card or result card), never an inner fieldset/CTA/answer
   * control, so everything above the active content (step indicator,
   * phase context, result status/title) scrolls into view together, not
   * just the first interactive piece. The header offset is measured live
   * via `getBoundingClientRect()` (never a fixed pixel constant or a
   * breakpoint-matched CSS value) so it stays correct across every
   * viewport, orientation, and the header's own mobile/desktop height
   * change, recalculated fresh on every call.
   *
   * `focusTargetEl` (defaults to `surfaceEl`) receives keyboard/screen-
   * reader focus via `focus({ preventScroll: true })` -- always AFTER the
   * one intentional `scrollIntoView` call, and always with
   * `preventScroll: true`, so focusing never triggers a second,
   * competing, browser-generated scroll on top of the intentional one.
   * (This is the exact defect that existed in the result-transition path:
   * it called focus() on the result region while explicitly allowing the
   * native scroll-on-focus behavior, with no scrollIntoView call at all,
   * letting the browser's native "scroll nearest edge into view"
   * heuristic decide the landing position for a tall result container --
   * which is what produced the reported "landing roughly two-thirds down
   * the result" symptom.)
   *
   * Reduced motion: the scroll call below uses an immediate (non-smooth)
   * behavior in that case, landing at the same final position without a
   * forced animation.
   * Fully feature-detected so environments without these DOM APIs
   * (including this repository's hand-rolled test doubles) no-op safely.
   */
  function scrollAndFocusSurface(surfaceEl, focusTargetEl) {
    if (!isUsable(surfaceEl)) return;

    const headerEl = typeof root.querySelector === 'function' ? root.querySelector('header') : null;
    const headerHeight = isUsable(headerEl) && typeof headerEl.getBoundingClientRect === 'function'
      ? headerEl.getBoundingClientRect().height
      : 0;

    // scroll-margin-top is still set (useful for any native browser-driven
    // scroll-into-view outside this function's own control, e.g. an
    // in-page anchor jump).
    if (isUsable(surfaceEl.style)) {
      surfaceEl.style.scrollMarginTop = `${headerHeight + SCROLL_HEADER_GAP_PX}px`;
    }

    // Focus moves first (preventScroll:true, so it cannot itself move the
    // viewport) -- matching the canonical sequence: update state, render,
    // wait for layout, measure, focus, THEN scroll.
    const focusTarget = isUsable(focusTargetEl) ? focusTargetEl : surfaceEl;
    if (isUsable(focusTarget)) {
      if (typeof focusTarget.setAttribute === 'function' && !focusTarget.getAttribute?.('tabindex')) {
        focusTarget.setAttribute('tabindex', '-1');
      }
      if (typeof focusTarget.focus === 'function') focusTarget.focus({ preventScroll: true });
    }

    const view = getView();
    if (!isUsable(view) || typeof view.scrollTo !== 'function' || typeof surfaceEl.getBoundingClientRect !== 'function') {
      // Fallback for environments without a resolvable `window` (e.g. this
      // repository's hand-rolled test doubles) -- same intent, native API.
      if (typeof surfaceEl.scrollIntoView === 'function') {
        surfaceEl.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
      }
      return;
    }

    // The actual scroll is computed explicitly via getBoundingClientRect()
    // + the current window.scrollY (rather than left to scrollIntoView()'s
    // own scroll-margin interpretation) and deferred one animation frame.
    // Measured empirically: computing and scrolling synchronously,
    // back-to-back across rapid phase transitions, lands at the wrong
    // position in this browser/engine -- some other native adjustment
    // (most likely the browser keeping the still-focused, about-to-move
    // "הבא" button in view as the page reflows under it) executes AFTER our
    // scroll and overrides it. Deferring to the next animation frame lets
    // that native post-reflow adjustment (if any) happen FIRST, so our
    // explicit scroll is always the final, authoritative word -- this is
    // what produced the reported "landing too low" symptom.
    const runScroll = () => {
      const currentScrollY = typeof view.scrollY === 'number' ? view.scrollY : 0;
      const targetTop = Math.max(0, surfaceEl.getBoundingClientRect().top + currentScrollY - (headerHeight + SCROLL_HEADER_GAP_PX));
      view.scrollTo({
        top: targetTop,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    };
    if (typeof view.requestAnimationFrame === 'function') {
      view.requestAnimationFrame(runScroll);
    } else {
      runScroll();
    }
  }

  /**
   * Questionnaire-phase/focused-check transition: scrolls the whole
   * assessment card (heading, step indicator, progress bar, and the
   * active question together -- not just the active fieldset, since the
   * step indicator/progress bar sit above the fieldset in the DOM and
   * would otherwise scroll above the top edge) and focuses the active
   * question's legend.
   */
  function focusAndScrollToCurrentStep() {
    const stepEl = byId(root, STEP_ID_TO_ELEMENT_ID[currentStepId]);
    if (!isUsable(stepEl)) return;

    const scrollTarget = isUsable(elements.form) ? elements.form : stepEl;
    const heading = typeof stepEl.querySelector === 'function' ? stepEl.querySelector('legend') : null;
    scrollAndFocusSurface(scrollTarget, heading);
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
      rules: REGULATORY_AND_PERSONAL_USE_RULES,
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
    // Personal-use clarification (personal-use-clarification.js): not a
    // free-text category hint like the ones above -- gated instead by
    // import type, a product-owner-maintained sensitive-family list,
    // and an entered quantity. Added into the SAME hinted-categories set
    // so the SAME scheduler call below decides whether to ask it,
    // sharing the same question budget as every other live question.
    // Personal import only -- proceedToRegulatoryPhaseOrResult is also
    // called for commercial-leaning scenarios, which must never see
    // this category hinted.
    if (scenario === SCENARIO.PERSONAL) {
      const identification = identifyProductFamily([raw.productName, raw.commercialDescription, raw.intendedUse]);
      const family = identification.outcome === IDENTIFICATION_OUTCOME.HIGH_CONFIDENCE ? identification.family : null;
      if (shouldAskPersonalUseClarification({ importType: IMPORT_TYPE.PERSONAL, family, rawQuantity: raw.quantity })) {
        regulatoryHintedCategories.add(PERSONAL_USE_CLARIFICATION_CATEGORY);
      }
    }
    regulatoryAnswers = pruneStaleRegulatoryAnswers(regulatoryAnswers, regulatoryHintedCategories);
    // Reuse already-collected structured core answers (e.g. connects-to-
    // power, food-contact material, coating) so the focused-checks phase
    // never re-asks a concept already reliably known -- see
    // answer-reuse.js. A derived value only ever fills a gap; any answer
    // already given live in this phase always takes precedence.
    //
    // Vehicle-vs-mains precedence for the reused connects-to-power
    // structured answer specifically: the current, already-computed
    // hinted categories are the single source of truth for whether the
    // current candidate is vehicle-related with no explicit separate
    // mains equipment described -- the same decision
    // applyVehicleMainsSuppression() already made for a fresh hint.
    // When that is the case, a stale or reused "connects to power"
    // answer must not be reused into the generic mains question either
    // -- it is treated as inapplicable to the current candidate, never
    // erased, so it becomes reusable again the moment the product is
    // edited back to a non-vehicle one.
    const suppressMainsPowerReuse = regulatoryHintedCategories.has(VEHICLE_PRODUCT_CATEGORY)
      && !regulatoryHintedCategories.has(ELECTRICAL_MAINS_PRODUCT_CATEGORY);
    regulatoryAnswers = mergeReusedAnswers(
      regulatoryAnswers,
      deriveReusableRegulatoryAnswers(raw, { suppressMainsPowerReuse }),
    );
    // Same reuse principle, for the vehicle-installed-product rule's two
    // questions specifically: when the description already explicitly
    // states installation ("להתקנה ברכב") or a lighting function
    // ("פנס"), that question is redundant and must not be asked (see
    // vehicle-context-inference.js). A derived value only ever fills a
    // gap here too.
    regulatoryAnswers = mergeReusedAnswers(regulatoryAnswers, inferVehicleContextAnswers([
      raw.productName, raw.commercialDescription, raw.intendedUse,
    ]));

    const nextId = computeNextFollowUpQuestionId({
      hintedCategories: regulatoryHintedCategories,
      answers: regulatoryAnswers,
      rules: REGULATORY_AND_PERSONAL_USE_RULES,
    });
    if (nextId) {
      regulatoryQuestionHistory = [nextId];
      showRegulatoryQuestion(nextId);
      // goForward() -> showStep() already performs the canonical scroll/
      // focus for this transition; no separate call needed here.
      goForward('regulatoryFollowup');
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
    if (scenario === SCENARIO.PERSONAL) result = buildPersonalImportResult(normalized, regulatoryAnswers);
    else if (scenario === SCENARIO.EXISTING_IMPORTER) result = buildExistingImporterResult(normalized);
    else if (scenario === SCENARIO.ESTABLISHED_OPERATION) result = buildEstablishedOperationResult(normalized);
    else if (scenario === SCENARIO.SHIPMENT_PROBLEM) result = buildShipmentProblemResult(normalized);
    else result = buildFirstCommercialImportResult(normalized, regulatoryAnswers);

    const documentReadiness = computeDocumentReadiness({ selectedDocuments: normalized.selectedDocuments });
    const regulatoryEvaluation = scenario === SCENARIO.SHIPMENT_PROBLEM
      ? evaluateRegulatorySignals(normalized)
      : evaluateRegulatorySignals(normalized, { answers: regulatoryAnswers });

    // Product-family matrix contribution (see product-family-result.js):
    // identified from product text already collected above, now also
    // informed by any explicit irProductFamily checkbox selection (see
    // product-family-selection-mapping.js for the exact precedence) --
    // no new question, no network. Only shipment-problem (no stable
    // product identity) and personal/uncertain-import-type-still-
    // unresolved routes skip it; every matched existing detailed rule's
    // ruleId is passed in so the matrix never repeats a category that
    // rule's own card already shows. Every EXCLUDED existing detailed
    // rule's ruleId (the user explicitly answered "לא" to its gating
    // question) is also passed in, so an explicit exclusion answer
    // overrides a same-subject matrix signal too -- see
    // product-family-reconciliation.js for the precedence this
    // implements (explicit answer > detailed rule trigger/exclusion >
    // confirmed family > matrix positive category > generic routing).
    const matchedExistingRuleIds = regulatoryEvaluation && Array.isArray(regulatoryEvaluation.signals)
      ? regulatoryEvaluation.signals.map((signal) => signal.ruleId).filter(Boolean)
      : [];
    const excludedExistingRuleIds = scenario === SCENARIO.SHIPMENT_PROBLEM
      ? []
      : excludedRuleIds(regulatoryAnswers, REGULATORY_SIGNAL_RULES);
    // The personal-use clarification message (see
    // personal-use-clarification.js) is resolved here from the live
    // question's own answer, already collected through the same
    // focused-checks phase as every other regulatory follow-up -- never
    // re-derived from the quantity number itself.
    const resolvedPersonalUseClarificationMessage = personalUseClarificationMessage(
      regulatoryAnswers[PERSONAL_USE_CLARIFICATION_QUESTION_ID],
    );
    const productFamilySection = scenario === SCENARIO.SHIPMENT_PROBLEM
      ? null
      : buildProductFamilyMatrixSection({
        texts: [normalized.productName, normalized.commercialDescription, normalized.intendedUse],
        importType: normalized.importType,
        selectedProductFamilies: normalized.productFamilies,
        personalUseClarificationMessage: resolvedPersonalUseClarificationMessage,
        matchedExistingRuleIds,
        excludedExistingRuleIds,
      });

    // Canonical result-state resolver (see result-state.js): computed
    // once, here, only after every input it depends on (detailed-rule
    // evaluation, family identification, matrix evaluation, exclusion
    // reconciliation, and category deduplication via
    // matchedExistingRuleIds/excludedExistingRuleIds above) has already
    // run. Every "no direction identified" decision below -- the result
    // brief's missing-information section and the dedicated no-match
    // block inside renderResult() -- consults this ONE state instead of
    // independently re-deriving the same decision from a narrower,
    // sometimes-stale signal.
    const resultState = resolveResultState({
      isOperationalRoute: scenario === SCENARIO.SHIPMENT_PROBLEM,
      regulatoryEvaluation,
      productFamilySection,
    });

    // New professional result-presentation layer (result-brief.js):
    // restructures the same, already-safe result into the 8-section
    // brief, fed only by the mechanical document-readiness checklist
    // and the gate-enforced regulatory-signals evaluation -- never a
    // new regulatory claim. "No focused direction" text is eligible
    // only in the three states isNoDirectionMessageAllowed() (result-state.js)
    // allows it for (a recognized family with no positive category, a
    // genuinely unknown family, or an explicit-selection candidate set
    // free text couldn't narrow to one family) -- never for a matched
    // detailed, matrix, or combined direction, and never for an
    // operational result.
    const noFocusedDirection = isNoDirectionMessageAllowed(resultState);
    const brief = buildResultBrief(result, { documentReadiness, regulatoryEvaluation, noFocusedDirection });

    const controls = renderResult(doc, elements.result, result, brief, regulatoryEvaluation, productFamilySection, resultState);
    updateResultAccessibleName(elements.result);
    setHidden(elements.form, true);
    setHidden(elements.result, false);
    updateProgressDisplay('result');
    if (isUsable(elements.stepIndicator)) {
      elements.stepIndicator.textContent = 'שלב: התוצאה שלך';
    }
    // Scroll and focus land on the result region via the same canonical
    // transition helper the questionnaire phases use (see
    // scrollAndFocusSurface) -- one intentional scrollIntoView to the
    // result's own beginning (status + title, never the professional CTA,
    // regulatory-signal body, or an inner interactive control), then
    // focus with `preventScroll: true` so it can never trigger a second,
    // competing scroll. The region already carries `aria-live="polite"`
    // in the markup, the existing accessible mechanism that announces it.
    scrollAndFocusSurface(elements.result, elements.result);

    if (typeof controls.editButton.addEventListener === 'function') {
      controls.editButton.addEventListener('click', () => {
        if (typeof elements.result.removeAttribute === 'function') {
          elements.result.removeAttribute('aria-labelledby');
        }
        setHidden(elements.result, true);
        setHidden(elements.form, false);
        // If the focused-checks phase ran, editing returns to the last
        // live regulatory question shown (with its answer preserved) so
        // the user can revisit it directly, rather than jumping past it
        // back to the product-context/scenario-followup step.
        if (lastStepBeforeResult === 'regulatoryFollowup' && regulatoryQuestionHistory.length > 0) {
          showRegulatoryQuestion(regulatoryQuestionHistory[regulatoryQuestionHistory.length - 1]);
          showStep('regulatoryFollowup'); // performs the canonical scroll/focus itself
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
    // Native form.reset() restores checkbox `checked` state but not the
    // progressive-disclosure expand buttons' aria-expanded/hidden state
    // set by expandChecklist() -- reset those explicitly too, so a
    // group expanded before Reset starts collapsed (suggested-subset)
    // again on the next pass through productContext, same as a fresh
    // assessment.
    for (const buttonId of ['irProductFamilyExpand', 'irMaterialExpand']) {
      const button = byId(root, buttonId);
      if (isUsable(button)) {
        button.setAttribute('aria-expanded', 'false');
        setHidden(button, false);
      }
    }
    stepHistory = [];
    currentStepId = null;
    currentScenario = null;
    resetRegulatoryFollowupState();
    showErrors([]);
    // A New Assessment/reset can leave the result container's markup in
    // place (only [hidden] toggles here -- renderResult() itself is what
    // clears and rebuilds it, on the next result). Removing the stale
    // aria-labelledby reference now means the container is never left
    // pointing at a heading id from the previous result while empty or
    // between resets.
    if (typeof elements.result.removeAttribute === 'function') {
      elements.result.removeAttribute('aria-labelledby');
    }
    setHidden(elements.result, true);
    setHidden(elements.form, true);
    setHidden(elements.intro, false);
    // Neither the form nor the result is visible after a full reset --
    // collapse the section itself back to zero layout height too, same
    // as its initial pre-activation state.
    setHidden(elements.section, true);
    // Clear any stale scroll position left over from the result -- the
    // user returns to the Hero/intro state, so the page should too.
    const view = getView();
    if (isUsable(view) && typeof view.scrollTo === 'function') {
      view.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  }

  if (isUsable(elements.startButton) && typeof elements.startButton.addEventListener === 'function') {
    elements.startButton.addEventListener('click', () => {
      setHidden(elements.section, false);
      setHidden(elements.intro, true);
      setHidden(elements.form, false);
      setHidden(elements.result, true);
      stepHistory = [];
      showStep('q1'); // performs the canonical scroll/focus itself
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
      showStep('problemType'); // performs the canonical scroll/focus itself
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

  const familyExpandButton = byId(root, 'irProductFamilyExpand');
  if (isUsable(familyExpandButton) && typeof familyExpandButton.addEventListener === 'function') {
    familyExpandButton.addEventListener('click', () => expandChecklist(root, 'irProductFamilyGroup', 'irProductFamilyExpand'));
  }
  const materialExpandButton = byId(root, 'irMaterialExpand');
  if (isUsable(materialExpandButton) && typeof materialExpandButton.addEventListener === 'function') {
    materialExpandButton.addEventListener('click', () => expandChecklist(root, 'irMaterialGroup', 'irMaterialExpand'));
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
          // The standalone "במה תרצה להתמקד?" focus-area screen is
          // skipped for this route (product-owner acceptance finding):
          // the user has already entered product details in this same
          // phase, so asking them to separately confirm "checking a
          // product" adds friction without a meaningful decision. The
          // underlying `irFocusArea` control still exists in the markup
          // (hidden, never shown/navigated to) so `raw.focusArea` keeps
          // reading its unchanged default value ("מוצר חדש" /
          // 'new_product') -- preserving the exact existing scenario
          // outcome for this route without requiring any change to
          // existing-importer-rules.js or normalize-readiness-input.js.
          proceedToRegulatoryPhaseOrResult(SCENARIO.EXISTING_IMPORTER, raw);
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
          REGULATORY_AND_PERSONAL_USE_RULES,
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

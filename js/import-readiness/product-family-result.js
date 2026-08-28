/**
 * Pure result-building for the product-family matrix engine: takes the
 * free text already collected by the questionnaire (no new questions),
 * identifies a family conservatively, reconciles it against any
 * existing detailed rule that already matched, and returns a
 * render-ready section -- or null when there is nothing safe to show.
 *
 * No DOM here. No network. No storage. See product-family-matrix.js
 * for the data and docs/product-family-matrix-engine.md for the full
 * interpretation rules this module implements.
 */

import { identifyProductFamily, IDENTIFICATION_OUTCOME } from './product-family-identification.js';
import { suppressedSignalKeysForFamily } from './product-family-reconciliation.js';
import { PROFESSIONAL_CATEGORY, professionalReferral } from './professional-category-registry.js';
import { IMPORT_TYPE } from './scenario-schema.js';
import { resolveFamilyIdentificationOptions, hasNormalFamilySelection } from './product-family-selection-mapping.js';
import { findFamilyById } from './product-family-matrix.js';
import { familyGuidanceFor } from './product-family-guidance.js';

const SIGNAL_LABEL = Object.freeze({
  standards: 'תקינה',
  healthUmbrella: 'משרד הבריאות',
  transportOrVehicleLaboratory: 'משרד התחבורה / מעבדת רכב',
  communications: 'משרד התקשורת',
  agriculture: 'משרד החקלאות',
  otherPermit: 'אישור / רישיון אחר',
});

// Display/operational priority order -- matches the matrix's own
// column order, which the product owner authored in priority order.
const SIGNAL_ORDER = Object.freeze([
  'standards',
  'healthUmbrella',
  'transportOrVehicleLaboratory',
  'communications',
  'agriculture',
  'otherPermit',
]);

const GENERIC_COMMERCIAL_VERIFICATION_NOTE =
  'יש לאמת את הדרישה, פרט המכס ומסלול האישור לפני ההזמנה או השילוח.';

// Process-level verification steps, not specific regulatory facts --
// the same three generic actions regardless of which categories are
// positive, matching the canonical result component's "maximum three
// verification items" requirement without inventing family-specific
// detail the matrix does not supply.
const GENERIC_VERIFICATION_ITEMS = Object.freeze([
  'לוודא את זיהוי משפחת המוצר',
  'לבדוק את סיווג המכס התואם',
  'לבדוק את מסלול האישור הרלוונטי',
]);

export const SHARED_LIMITATION_TEXT =
  'התוצאה היא כיוון בדיקה ראשוני ואינה מהווה סיווג מכס או אישור יבוא.';

export const NO_POSITIVE_SIGNAL_MESSAGE =
  'לא זוהה תחום חוקיות יבוא חיובי במטריצה עבור המשפחה שנבחרה.';
const NO_POSITIVE_SIGNAL_NOT_EXEMPT_NOTE =
  'אין בכך אישור שהמוצר פטור מדרישות יבוא או מתנאים אחרים.';

// Distinct from NO_POSITIVE_SIGNAL_MESSAGE above -- that one means "we
// recognized the family, but it has no positive matrix category."
// This one means the family itself was never recognized at all. The
// two must never share wording, since they describe different states
// and call for different next actions.
export const NO_FAMILY_MATCH_MESSAGE =
  'לא זוהתה משפחת מוצר מתאימה מתוך המידע שנמסר.';
const NO_FAMILY_MATCH_HELP =
  'ניתן לדייק את תיאור המוצר, השימוש והחומר העיקרי, או להעביר את הפרטים לבדיקה מקצועית.';

// Distinct again from both messages above: the user DID explicitly
// select a product-family checkbox (so, unlike NO_FAMILY_MATCH_MESSAGE,
// "no family-related information was given" would be false), but that
// selection names a group of several possible matrix families (or
// several distinct selections together) and free text couldn't narrow
// it to exactly one -- so, unlike NO_POSITIVE_SIGNAL_MESSAGE, no single
// family was ever confirmed either. Saying "no family identified" here
// would be untruthful; this is its own state (see
// PRODUCT_FAMILY_SELECTION_CANDIDATES in
// product-family-selection-mapping.js for how a checkbox becomes an
// unresolved candidate set). Pairs with the same NO_FAMILY_MATCH_HELP
// text above and the same customs-classifier referral wording
// NO_POSITIVE_SIGNAL_MESSAGE's branch already uses below -- no new
// regulatory content, only this one new operational, non-regulatory
// sentence.
export const SELECTION_CANDIDATES_UNRESOLVED_MESSAGE =
  'משפחת המוצר שנבחרה כוללת כמה אפשרויות, ולא ניתן היה לצמצם לזיהוי חד-משמעי מתוך המידע שנמסר.';

export const MATRIX_RESULT_STATE = Object.freeze({
  POSITIVE: 'positive',
  NO_POSITIVE_SIGNAL: 'no_positive_signal',
  UNKNOWN_FAMILY: 'unknown_family',
  // A normal product-family checkbox was explicitly selected (a single
  // ambiguous checkbox, or several selections together), but free text
  // could not narrow the resulting candidate set to exactly one matrix
  // family. Distinct from UNKNOWN_FAMILY (which means no family-related
  // information was given at all) -- see SELECTION_CANDIDATES_UNRESOLVED_MESSAGE.
  SELECTION_UNRESOLVED: 'selection_unresolved',
});

function professionalForSignalKey(signalKey) {
  switch (signalKey) {
    case 'standards':
      return {
        primary: professionalReferral(PROFESSIONAL_CATEGORY.STANDARDS_SPECIALIST, 'לבדיקת התאמת המוצר לדרישות תקינה.'),
        supporting: professionalReferral(PROFESSIONAL_CATEGORY.CUSTOMS_CLASSIFIER, 'לבדיקת סיווג מכס תואם.'),
      };
    case 'healthUmbrella':
      return {
        primary: professionalReferral(PROFESSIONAL_CATEGORY.REGULATION_SPECIALIST, 'לבדיקת דרישות רגולציה בתחום הבריאות הרלוונטי למוצר.'),
        supporting: null,
      };
    case 'transportOrVehicleLaboratory':
      return {
        primary: professionalReferral(PROFESSIONAL_CATEGORY.VEHICLE_TESTING_LAB, 'לבדיקת התאמת המוצר לדרישות משרד התחבורה.'),
        supporting: professionalReferral(PROFESSIONAL_CATEGORY.CUSTOMS_CLASSIFIER, 'לבדיקת סיווג מכס תואם.'),
      };
    case 'communications':
      return {
        primary: professionalReferral(PROFESSIONAL_CATEGORY.GOV_REGULATOR, 'לבירור דרישות רישוי תקשורת רלוונטיות למוצר.'),
        supporting: professionalReferral(PROFESSIONAL_CATEGORY.CUSTOMS_CLASSIFIER, 'לבדיקת סיווג מכס תואם.'),
      };
    case 'agriculture':
      return {
        primary: professionalReferral(PROFESSIONAL_CATEGORY.GOV_REGULATOR, 'לבירור דרישות רגולציה חקלאית רלוונטיות למוצר.'),
        supporting: null,
      };
    case 'otherPermit':
      return {
        primary: professionalReferral(PROFESSIONAL_CATEGORY.GOV_REGULATOR, 'לבירור דרישת אישור או רישיון נוספת שזוהתה עבור המוצר.'),
        supporting: null,
      };
    default:
      return { primary: null, supporting: null };
  }
}

function selectPrimaryAndSupportingProfessional(activeSignalKeys) {
  // One primary + at most one supporting overall, chosen from the
  // highest-priority active category -- never one professional per
  // category (Phase L.90-92).
  for (const key of SIGNAL_ORDER) {
    if (activeSignalKeys.includes(key)) {
      return professionalForSignalKey(key);
    }
  }
  return { primary: null, supporting: null };
}

function activeSignalKeysForFamily(family, suppressedKeys) {
  return SIGNAL_ORDER.filter((key) => family.regulatorySignals[key] === true && !suppressedKeys.has(key));
}

function noteForImportType(family, importType, guidance) {
  // A product-owner-approved, family-specific guidance note (see
  // product-family-guidance.js) takes precedence over the matrix's own
  // (workbook-sourced) note when present -- the smallest compatible
  // extension point, same rendering slot, no new DOM/state.
  if (guidance && guidance.note) {
    return { kind: importType === IMPORT_TYPE.PERSONAL ? 'personal' : 'commercial', text: guidance.note };
  }
  if (importType === IMPORT_TYPE.PERSONAL) {
    return family.personalImportNote ? { kind: 'personal', text: family.personalImportNote } : null;
  }
  // Commercial (and any non-personal import type): show the matrix's
  // note when present, otherwise the approved generic verification
  // sentence -- never a blank subsection, never an invented note.
  return {
    kind: 'commercial',
    text: family.commercialImportNote || GENERIC_COMMERCIAL_VERIFICATION_NOTE,
  };
}

/**
 * @param {object} params
 * @param {string[]} params.texts - product name / description / intended use.
 * @param {string} params.importType - IMPORT_TYPE.PERSONAL or .COMMERCIAL.
 * @param {string[]} [params.matchedExistingRuleIds] - ids of existing detailed
 *   rules that already produced a public signal card for this result.
 * @param {string[]} [params.excludedExistingRuleIds] - ids of existing
 *   detailed rules explicitly excluded by the user's own live answers
 *   (e.g. answering "לא" to a rule's gating question) -- suppresses the
 *   same matrix category that rule would have covered had it matched,
 *   so an explicit exclusion answer is never contradicted by an
 *   independent matrix signal for the same regulatory subject.
 * @param {string[]} [params.selectedProductFamilies] - raw irProductFamily
 *   checkbox values the user explicitly selected (normalized.productFamilies).
 *   See product-family-selection-mapping.js for exactly how these
 *   restrict or authoritatively resolve identification.
 * @param {string|null} [params.personalUseClarificationMessage] - the
 *   already-resolved message from the live personal-use clarification
 *   question (see personal-use-clarification.js), or null when that
 *   question was never asked or not yet answered. Computed by the
 *   caller from the live answer -- this module never infers commercial
 *   character from a quantity number itself.
 * @param {object} [options] - test seam, see identifyProductFamily.
 * @returns {object|null} render-ready section, or null when identification
 *   was ambiguous/absent and there is nothing safe to show.
 */
export function buildProductFamilyMatrixSection(params, options = {}) {
  const texts = Array.isArray(params && params.texts) ? params.texts : [];
  const importType = params && params.importType;
  const matchedExistingRuleIds = Array.isArray(params && params.matchedExistingRuleIds)
    ? params.matchedExistingRuleIds
    : [];
  const excludedExistingRuleIds = Array.isArray(params && params.excludedExistingRuleIds)
    ? params.excludedExistingRuleIds
    : [];
  const personalUseClarificationMessage = (params && typeof params.personalUseClarificationMessage === 'string')
    ? params.personalUseClarificationMessage
    : null;
  const selectedProductFamilies = Array.isArray(params && params.selectedProductFamilies)
    ? params.selectedProductFamilies
    : [];

  // Explicit product-family checkbox selections (see
  // product-family-selection-mapping.js) restrict/authoritatively
  // resolve identification -- computed here from the live selection,
  // never cached. An explicit `options.families`/`options.forcedFamily`
  // (the pre-existing test seam) always takes precedence when a caller
  // provides one directly, so existing tests keep working unchanged.
  const selectionOptions = resolveFamilyIdentificationOptions(selectedProductFamilies, findFamilyById);
  const identificationOptions = {
    ...selectionOptions,
    ...options,
  };

  const identification = identifyProductFamily(texts, identificationOptions);

  // Did the user explicitly select a normal irProductFamily checkbox
  // (as opposed to nothing, or only not_sure/other_general_product)?
  // Computed from the raw selection only -- never from the test-seam
  // `options` override above -- so it reflects what the user actually
  // told us. See SELECTION_CANDIDATES_UNRESOLVED_MESSAGE: an explicit
  // selection that free text couldn't narrow to one family must never
  // be presented as "no family-related information was given at all."
  const explicitSelectionMade = hasNormalFamilySelection(selectedProductFamilies);

  function selectionUnresolvedSection() {
    return Object.freeze({
      state: MATRIX_RESULT_STATE.SELECTION_UNRESOLVED,
      familyName: null,
      hasPositiveCategories: false,
      positiveCategories: [],
      note: null,
      personalUseClarificationMessage: null,
      professional: Object.freeze({
        // Same customs-classifier referral wording the no-positive-
        // signal state below already uses -- no new professional
        // content, only reused, already-approved text.
        primary: professionalReferral(PROFESSIONAL_CATEGORY.CUSTOMS_CLASSIFIER, 'לבדיקת סיווג מכס וודאות לפני ההזמנה או השילוח.'),
        supporting: null,
      }),
      limitation: SHARED_LIMITATION_TEXT,
      noFamilyMatchMessage: SELECTION_CANDIDATES_UNRESOLVED_MESSAGE,
      noFamilyMatchHelp: NO_FAMILY_MATCH_HELP,
      noPositiveSignalMessage: null,
      noPositiveSignalNotExemptNote: null,
    });
  }

  if (identification.outcome === IDENTIFICATION_OUTCOME.NONE) {
    // Genuinely no family match at all -- distinct from "recognized
    // family with no positive category" (below). Only shown when no
    // existing detailed rule already produced its own full result for
    // this product; otherwise that rule's card already explains the
    // situation and an "unknown family"/"selection unresolved" banner
    // alongside it would be contradictory noise.
    if (matchedExistingRuleIds.length > 0) return null;
    if (explicitSelectionMade) return selectionUnresolvedSection();
    return Object.freeze({
      state: MATRIX_RESULT_STATE.UNKNOWN_FAMILY,
      familyName: null,
      hasPositiveCategories: false,
      positiveCategories: [],
      note: null,
      personalUseClarificationMessage: null,
      professional: Object.freeze({ primary: null, supporting: null }),
      limitation: SHARED_LIMITATION_TEXT,
      noFamilyMatchMessage: NO_FAMILY_MATCH_MESSAGE,
      noFamilyMatchHelp: NO_FAMILY_MATCH_HELP,
      noPositiveSignalMessage: null,
      noPositiveSignalNotExemptNote: null,
    });
  }

  if (identification.outcome !== IDENTIFICATION_OUTCOME.HIGH_CONFIDENCE || !identification.family) {
    // Ambiguous (multiple candidates within the restricted/selected
    // candidate set, or -- with no selection at all -- within the full
    // matrix): never guess which one applies. With an explicit
    // selection behind it, this is a truthful "more information needed"
    // result rather than silence (see selectionUnresolvedSection above);
    // with no selection, the matrix still contributes nothing, exactly
    // as before this change (Phase H/Q boundary -- see
    // docs/product-family-matrix-engine.md "Known limitations").
    if (explicitSelectionMade && matchedExistingRuleIds.length === 0) return selectionUnresolvedSection();
    return null;
  }

  const family = identification.family;
  const suppressed = suppressedSignalKeysForFamily(family.id, matchedExistingRuleIds, excludedExistingRuleIds);
  const activeKeys = activeSignalKeysForFamily(family, suppressed);
  const allKeysBeforeSuppression = SIGNAL_ORDER.filter((key) => family.regulatorySignals[key] === true);
  // Suppression coming ONLY from a matched rule means a card for that
  // category is already shown elsewhere in this same result -- nothing
  // left for the matrix to add, full stop (see the `return null` below).
  // Suppression coming (even partly) from an EXCLUDED rule is
  // different: an excluded rule never rendered a card at all, so the
  // user still needs a safe fallback -- falls through to the
  // no-positive-signal state below instead of vanishing silently.
  const suppressedByMatchOnly = suppressedSignalKeysForFamily(family.id, matchedExistingRuleIds, []);
  const everySuppressedKeyIsFromAMatchedCard = allKeysBeforeSuppression.length > 0
    && allKeysBeforeSuppression.every((key) => suppressedByMatchOnly.has(key));

  if (activeKeys.length === 0 && allKeysBeforeSuppression.length > 0 && everySuppressedKeyIsFromAMatchedCard) {
    // Every positive category this family has is already covered by an
    // existing detailed rule's own card (e.g. the glass-vessel rule
    // already shows "standards" publicly) -- nothing left for the
    // matrix to add, and no neutral "no signal" message either, since
    // that would contradict the existing rule's card shown elsewhere
    // in the same result (Phase D.34: never present the same category
    // twice, never claim no signal when one is already shown).
    return null;
  }

  const guidance = familyGuidanceFor(family.id);
  const note = noteForImportType(family, importType, guidance);
  // The message is only ever relevant for personal import -- a
  // commercial-import result must never carry the personal-use
  // clarification message. It arrives fully resolved from the caller
  // (see personal-use-clarification.js): this module never infers
  // commercial character from a quantity number itself.
  const resolvedPersonalUseClarificationMessage = importType === IMPORT_TYPE.PERSONAL
    ? personalUseClarificationMessage
    : null;

  if (activeKeys.length === 0) {
    // No positive matrix category exists for this family at all -- still
    // offer one safe, universal verification route (customs
    // classification) rather than leaving the user with nothing
    // actionable, without inventing a specific regulatory authority.
    return Object.freeze({
      state: MATRIX_RESULT_STATE.NO_POSITIVE_SIGNAL,
      familyName: family.publicFamilyName,
      hasPositiveCategories: false,
      positiveCategories: [],
      note,
      personalUseClarificationMessage: resolvedPersonalUseClarificationMessage,
      professional: Object.freeze({
        primary: professionalReferral(PROFESSIONAL_CATEGORY.CUSTOMS_CLASSIFIER, 'לבדיקת סיווג מכס וודאות לפני ההזמנה או השילוח.'),
        supporting: null,
      }),
      limitation: SHARED_LIMITATION_TEXT,
      noFamilyMatchMessage: null,
      noFamilyMatchHelp: null,
      // A product-owner-approved, family-specific no-positive headline
      // (see product-family-guidance.js) replaces the generic,
      // byte-identical wording for the small set of authorized families
      // that have one; every other no-positive family keeps the exact
      // existing generic message, unchanged.
      noPositiveSignalMessage: (guidance && guidance.noPositiveMessage) || NO_POSITIVE_SIGNAL_MESSAGE,
      noPositiveSignalNotExemptNote: NO_POSITIVE_SIGNAL_NOT_EXEMPT_NOTE,
    });
  }

  const professional = selectPrimaryAndSupportingProfessional(activeKeys);

  return Object.freeze({
    state: MATRIX_RESULT_STATE.POSITIVE,
    familyName: family.publicFamilyName,
    hasPositiveCategories: true,
    positiveCategories: Object.freeze(activeKeys.map((key) => SIGNAL_LABEL[key])),
    note,
    personalUseClarificationMessage: resolvedPersonalUseClarificationMessage,
    verificationItems: GENERIC_VERIFICATION_ITEMS,
    professional: Object.freeze(professional),
    limitation: SHARED_LIMITATION_TEXT,
    noFamilyMatchMessage: null,
    noFamilyMatchHelp: null,
    noPositiveSignalMessage: null,
    noPositiveSignalNotExemptNote: null,
  });
}

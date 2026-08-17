/**
 * Adaptive journey-phase model for the Import Readiness assessment's
 * visible progress indicator.
 *
 * Replaces the previous fixed "שלב X מתוך Y" question-count promise
 * (accurate only while the flow could never grow) with four STABLE
 * phases that never change in number regardless of how many questions
 * a given path actually asks, whether a step is skipped, or whether a
 * conditional regulatory follow-up (Phase C) is shown at all:
 *
 *   A. מצב היבוא               -- import type / experience / shipment-problem identification
 *   B. פרטי המוצר או הבעיה      -- core product/issue information
 *   C. בדיקות ממוקדות           -- conditional regulatory/operational follow-ups (shown only when needed)
 *   D. התוצאה שלך               -- the result
 *
 * A phase may contain zero, one, or several questions; the public
 * interface must never equate phase-count with question-count, and
 * this module exposes no "total questions" value anywhere -- only a
 * stable 4-phase index. Progress may only move forward; a step that
 * maps to an earlier phase than the current one never regresses the
 * displayed phase (see `advancePhaseIndex`).
 *
 * Pure, deterministic, DOM-free, network-free, storage-free.
 */

export const JOURNEY_PHASE = Object.freeze({
  IMPORT_MODE: 'A',
  PRODUCT_OR_ISSUE: 'B',
  FOCUSED_CHECKS: 'C',
  RESULT: 'D',
});

export const JOURNEY_PHASE_LABEL = Object.freeze({
  [JOURNEY_PHASE.IMPORT_MODE]: 'מצב היבוא',
  [JOURNEY_PHASE.PRODUCT_OR_ISSUE]: 'פרטי המוצר או הבעיה',
  [JOURNEY_PHASE.FOCUSED_CHECKS]: 'בדיקות ממוקדות',
  [JOURNEY_PHASE.RESULT]: 'התוצאה שלך',
});

/** Stable, ordered list of phases -- length is fixed at 4 forever; never derived from question counts. */
export const JOURNEY_PHASE_ORDER = Object.freeze([
  JOURNEY_PHASE.IMPORT_MODE,
  JOURNEY_PHASE.PRODUCT_OR_ISSUE,
  JOURNEY_PHASE.FOCUSED_CHECKS,
  JOURNEY_PHASE.RESULT,
]);

export const JOURNEY_PHASE_COUNT = JOURNEY_PHASE_ORDER.length;

/**
 * Maps each existing controller step id to the phase it belongs to.
 * Steps not listed default to Phase A (safe fallback, never crashes).
 * `result` is a synthetic step id the controller passes when it shows
 * the result container, not a form step element.
 */
const STEP_ID_TO_PHASE = Object.freeze({
  q1: JOURNEY_PHASE.IMPORT_MODE,
  q1clarify: JOURNEY_PHASE.IMPORT_MODE,
  q2: JOURNEY_PHASE.IMPORT_MODE,
  problemType: JOURNEY_PHASE.IMPORT_MODE,

  q3: JOURNEY_PHASE.PRODUCT_OR_ISSUE,
  productContext: JOURNEY_PHASE.PRODUCT_OR_ISSUE,
  personalFollowup: JOURNEY_PHASE.PRODUCT_OR_ISSUE,
  existingImporterFollowup: JOURNEY_PHASE.PRODUCT_OR_ISSUE,
  establishedOperationFollowup: JOURNEY_PHASE.PRODUCT_OR_ISSUE,
  problemDetails: JOURNEY_PHASE.PRODUCT_OR_ISSUE,

  // The live, dynamically-rendered regulatory-signal follow-up step
  // (see js/import-readiness/regulatory-signals/ and
  // import-readiness-controller.js's proceedToRegulatoryPhaseOrResult)
  // -- shown only when the current product information hints at one of
  // the approved candidate categories; skipped cleanly otherwise.
  regulatoryFollowup: JOURNEY_PHASE.FOCUSED_CHECKS,

  result: JOURNEY_PHASE.RESULT,
});

export function phaseForStepId(stepId) {
  return STEP_ID_TO_PHASE[stepId] ?? JOURNEY_PHASE.IMPORT_MODE;
}

export function phaseLabel(phase) {
  return JOURNEY_PHASE_LABEL[phase] ?? '';
}

export function phaseIndex(phase) {
  const idx = JOURNEY_PHASE_ORDER.indexOf(phase);
  return idx >= 0 ? idx + 1 : 1;
}

/**
 * Builds the full presentational payload for one step: which phase it
 * belongs to, that phase's stable 1-based index (out of the fixed
 * JOURNEY_PHASE_COUNT), its label, and an ARIA-ready progress
 * percentage. Never includes a question total. Reflects the step
 * actually being shown right now -- including honestly moving backward
 * if the user navigates back into an earlier phase, since a progress
 * indicator that kept claiming a later phase after the user returned to
 * an earlier one would itself be a false/misleading promise.
 *
 * @param {string} stepId
 * @returns {Readonly<{ phase: string, index: number, count: number, label: string, percent: number }>}
 */
export function describeProgress(stepId) {
  const phase = phaseForStepId(stepId);
  const index = phaseIndex(phase);
  return Object.freeze({
    phase,
    index,
    count: JOURNEY_PHASE_COUNT,
    label: phaseLabel(phase),
    percent: Math.round((index / JOURNEY_PHASE_COUNT) * 100),
  });
}

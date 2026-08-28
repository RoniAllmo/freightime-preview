/**
 * Canonical result-state resolver.
 *
 * Computed exactly once, after detailed-rule evaluation, family
 * identification, matrix evaluation, exclusion reconciliation, and
 * category deduplication have all already run -- see
 * import-readiness-controller.js's `computeAndRenderResult()`, the
 * single call site. Every renderer or secondary-content builder that
 * needs to decide whether a "no direction identified" message is ever
 * eligible to appear must consult the ONE state this module returns,
 * instead of independently re-deriving that decision from a narrower,
 * sometimes-stale signal (a scenario builder's own secondary-details
 * note, the result brief's missing-information section, and a
 * dedicated no-match block previously each decided this separately,
 * which could disagree with each other and with the primary finding
 * already shown above them in the same result).
 *
 * Pure, deterministic, DOM-free, network-free.
 */

import { MATRIX_RESULT_STATE as MATRIX_STATE } from './product-family-result.js';

export const RESULT_STATE = Object.freeze({
  // A. A detailed approved rule produced a result.
  MATCHED_DETAILED_DIRECTION: 'matched_detailed_direction',
  // B. A recognized family produced one or more positive matrix categories, with no detailed-rule match.
  MATCHED_MATRIX_DIRECTION: 'matched_matrix_direction',
  // C. A detailed rule AND additional non-duplicated matrix categories together produced one combined result.
  MATCHED_COMBINED_DIRECTION: 'matched_combined_direction',
  // D. A family was recognized, but no positive matrix category remains after reconciliation and exclusions.
  RECOGNIZED_NO_POSITIVE_DIRECTION: 'recognized_no_positive_direction',
  // E. No reliable family was identified.
  UNKNOWN_FAMILY: 'unknown_family',
  // E2. An explicit product-family checkbox selection was made, but free
  // text could not narrow the resulting candidate set to exactly one
  // matrix family -- distinct from UNKNOWN_FAMILY, which means no
  // family-related information was given at all (see
  // SELECTION_CANDIDATES_UNRESOLVED_MESSAGE in product-family-result.js).
  SELECTION_INFORMATION_NEEDED: 'selection_information_needed',
  // F. A shipment-problem/operational route produced a result -- never carries a regulatory no-direction message.
  OPERATIONAL_RESULT: 'operational_result',
  // Defensive fallback only -- reachable in practice only if a future
  // scenario skips both the regulatory-signals and matrix engines
  // without being flagged as operational.
  GENERIC_ONLY: 'generic_only',
});

/**
 * @param {{
 *   isOperationalRoute: boolean,
 *   regulatoryEvaluation: { signals?: object[] } | null,
 *   productFamilySection: { state?: string, hasPositiveCategories?: boolean } | null,
 * }} params
 * @returns {string} one of RESULT_STATE
 */
export function resolveResultState(params) {
  const p = params !== null && typeof params === 'object' ? params : {};

  // Precedence 1: operational result, where the selected route is operational.
  if (p.isOperationalRoute === true) return RESULT_STATE.OPERATIONAL_RESULT;

  const signals = p.regulatoryEvaluation && Array.isArray(p.regulatoryEvaluation.signals)
    ? p.regulatoryEvaluation.signals
    : [];
  const detailedMatched = signals.length > 0;

  const section = p.productFamilySection !== null && typeof p.productFamilySection === 'object'
    ? p.productFamilySection
    : null;
  const matrixPositive = Boolean(section && section.hasPositiveCategories === true);
  const matrixState = section ? section.state : null;

  // Precedence 2/3: matched detailed direction, or combined when the
  // matrix independently contributes non-duplicated positive categories
  // alongside it (product-family-result.js already suppresses any
  // matrix category the matched rule itself covers, so a still-positive
  // matrix section here means a genuinely additional category).
  if (detailedMatched && matrixPositive) return RESULT_STATE.MATCHED_COMBINED_DIRECTION;
  if (detailedMatched) return RESULT_STATE.MATCHED_DETAILED_DIRECTION;

  // Precedence 4: matched matrix direction alone.
  if (matrixPositive) return RESULT_STATE.MATCHED_MATRIX_DIRECTION;

  // Precedence 5/6/6b: recognized family with no positive direction,
  // unresolved explicit selection, or unknown family.
  if (matrixState === MATRIX_STATE.NO_POSITIVE_SIGNAL) return RESULT_STATE.RECOGNIZED_NO_POSITIVE_DIRECTION;
  if (matrixState === MATRIX_STATE.SELECTION_UNRESOLVED) return RESULT_STATE.SELECTION_INFORMATION_NEEDED;
  if (matrixState === MATRIX_STATE.UNKNOWN_FAMILY) return RESULT_STATE.UNKNOWN_FAMILY;

  // Precedence 7: generic routing only when no more specific state exists.
  return RESULT_STATE.GENERIC_ONLY;
}

/**
 * Only these three states may ever surface a "no professional direction"
 * or "no positive result" explanation to the user. Every other state
 * (matched, combined, matrix-only, or operational) must never display
 * one, regardless of what any narrower sub-engine's own internal
 * evaluation independently concluded.
 *
 * @param {string} state one of RESULT_STATE
 * @returns {boolean}
 */
export function isNoDirectionMessageAllowed(state) {
  return state === RESULT_STATE.RECOGNIZED_NO_POSITIVE_DIRECTION
    || state === RESULT_STATE.UNKNOWN_FAMILY
    || state === RESULT_STATE.SELECTION_INFORMATION_NEEDED;
}

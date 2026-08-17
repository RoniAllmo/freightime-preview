/**
 * Public entry point for the Product Regulatory Signals pilot. Wires
 * free-text keyword hints + the real canonical rule registry (all
 * currently `expert_authored` with empty public content fields, hence
 * structurally silent -- see rules-registry.js) into the deterministic
 * matcher, and shapes the result for the Import Readiness result
 * renderer.
 *
 * Runs entirely locally on data already collected by the existing
 * assessment form. No network request, no storage, no logging of user
 * answers, no AI call.
 *
 * Pure, deterministic, DOM-free, network-free, storage-free.
 */

import { detectCategoryHints, sensitiveCategoryHint, hsCodeCategoryHint } from './keyword-hints.js';
import { matchRegulatorySignals } from './matcher.js';
import { REGULATORY_SIGNAL_RULES } from './rules-registry.js';
import { findQuestionById } from './questions.js';

/**
 * The single, canonical "which candidate categories does this product
 * information hint at" computation -- used both by
 * `evaluateRegulatorySignals()` below and directly by
 * `import-readiness-controller.js` to schedule the live focused-checks
 * question flow, so the two can never diverge (a mismatch there would
 * mean the controller offers a question the matcher would never have
 * opened, or the reverse). Considers every relevant already-collected
 * product-context field -- free text (product name, commercial
 * description, intended use), the sensitive-category answer, and a
 * known HS code's chapter -- never just one field in isolation. An HS
 * code can only ever contribute a hint that opens a question, exactly
 * like every other source here; it can never itself satisfy a rule's
 * trigger or produce a classification.
 *
 * @param {{
 *   productName?: string, commercialDescription?: string, intendedUse?: string,
 *   sensitiveCategory?: string, hsCode?: string, hsCodeKnown?: boolean,
 * }} input
 * @returns {Set<string>}
 */
export function computeHintedCategories(input) {
  const i = input !== null && typeof input === 'object' ? input : {};
  const hinted = detectCategoryHints([i.productName, i.commercialDescription, i.intendedUse]);

  const sensitiveHint = sensitiveCategoryHint(i.sensitiveCategory);
  if (sensitiveHint) hinted.add(sensitiveHint);

  if (i.hsCodeKnown === true) {
    const hsHint = hsCodeCategoryHint(i.hsCode);
    if (hsHint) hinted.add(hsHint);
  }

  return hinted;
}

/**
 * @param {{
 *   productName?: string, commercialDescription?: string, intendedUse?: string,
 *   sensitiveCategory?: string, hsCode?: string, hsCodeKnown?: boolean,
 * }} normalizedInput - fields already collected by the existing assessment.
 * @param {{ answers?: Record<string,string>, now?: Date, rules?: object[] }} [options]
 * @returns {Readonly<{
 *   hasAnyHint: boolean,
 *   relevantQuestions: object[],
 *   signals: object[],
 *   extraSignalCount: number,
 *   summaryHeading: string|null,
 *   noMatchMessage: string|null,
 *   noMatchNotExemptNote: string|null,
 * }> | null} null when nothing in the free text or already-collected
 *   answers hints at any candidate category -- the assessment stays
 *   exactly as short as it is today for those users.
 */
export function evaluateRegulatorySignals(normalizedInput, options) {
  const input = normalizedInput !== null && typeof normalizedInput === 'object' ? normalizedInput : {};
  const opts = options !== null && typeof options === 'object' ? options : {};
  const rules = Array.isArray(opts.rules) ? opts.rules : REGULATORY_SIGNAL_RULES;

  const hinted = computeHintedCategories(input);

  if (hinted.size === 0) return null;

  const result = matchRegulatorySignals({ answers: opts.answers, now: opts.now }, hinted, rules);

  const relevantQuestions = result.relevantQuestionIds
    .map((id) => findQuestionById(id))
    .filter((q) => q !== null);

  const summaryHeading = result.signals.length >= 2
    ? `זוהו ${result.signals.length} תחומי בדיקה לפני היבוא`
    : null;

  return Object.freeze({
    hasAnyHint: result.hasAnyHint,
    relevantQuestions: Object.freeze(relevantQuestions),
    signals: result.signals,
    extraSignalCount: result.extraSignalCount,
    summaryHeading,
    noMatchMessage: result.noMatchMessage,
    noMatchNotExemptNote: result.noMatchNotExemptNote,
  });
}

/**
 * Adapt an `evaluateRegulatorySignals()` result into the flat
 * `{ points, note }` shape the existing compact-result
 * `secondaryDetails` already supports (see build-action-map.js) --
 * kept in the pilot module rather than duplicated per scenario file.
 * Renders only inside the collapsed "מידע נוסף" area, never the
 * primary visible card, and never claims a signal that did not
 * actually clear the publication gate.
 *
 * @param {ReturnType<typeof evaluateRegulatorySignals>} evaluation
 * @returns {{ points: string[], note: string }}
 */
export function toSecondaryDetailContent(evaluation) {
  if (evaluation === null || typeof evaluation !== 'object') return { points: [], note: '' };

  const points = [];
  if (evaluation.summaryHeading) points.push(evaluation.summaryHeading);

  for (const signal of evaluation.signals) {
    points.push(`${signal.title}: ${signal.identification} ${signal.implication} (${signal.confidence})`);
  }
  if (evaluation.extraSignalCount > 0) {
    points.push('זוהו תחומי בדיקה נוספים.');
  }

  const noteParts = [];
  if (evaluation.noMatchMessage) noteParts.push(evaluation.noMatchMessage);
  if (evaluation.noMatchNotExemptNote) noteParts.push(evaluation.noMatchNotExemptNote);

  return { points, note: noteParts.join(' ') };
}

export { REGULATORY_SIGNAL_RULES };

/**
 * Normalized-result assembly for FreighTime's Smart Tracking Import V1.
 *
 * Responsibility: combine the pure normalization and mode-specific
 * extractors into one honest, evidence-bearing summary, and decide the
 * shipment's support level (`'partial'` or `'detection_only'`) using the
 * exact "meaningful useful group" rules from the product spec -- never
 * upgraded to `'partial'` on the strength of a single unverified
 * (low-confidence / ambiguous) value alone.
 *
 * This module performs no DOM/network/storage access and no logging. It
 * never invents a field, never infers an unsupported carrier or airline,
 * and never claims FreighTime contacted a carrier -- every field it
 * returns was read directly from the pasted text under a recognized
 * label.
 */

import { normalizeImportedText } from './normalize-imported-text.js';
import { extractOceanFields, OCEAN_MEANINGFUL_GROUPS } from './extract-ocean-fields.js';
import { extractAirFields, AIR_MEANINGFUL_GROUPS } from './extract-air-fields.js';
import { extractCourierFields, COURIER_MEANINGFUL_GROUPS } from './extract-courier-fields.js';

const CONFIDENCE_RANK = Object.freeze({ low: 0, medium: 1, high: 2 });

/**
 * Evaluate a mode's meaningful-group rules against its extracted fields.
 * A group only qualifies when every one of its fields is present *and*
 * carries confidence other than `'low'` -- a low-confidence value (e.g.
 * an ambiguous date) is real evidence for the "requires verification"
 * section, but it does not by itself make a result "partial" (verified).
 *
 * @param {Readonly<object>} fields - A mode's extracted field map.
 * @param {ReadonlyArray<ReadonlyArray<string>>} groups - That mode's meaningful-group definitions.
 * @returns {{qualifies: boolean, groupFieldNames: ReadonlyArray<string>, confidence: 'high'|'medium'|null}}
 */
function evaluateMeaningfulGroups(fields, groups) {
  let best = null;
  for (const group of groups) {
    const present = group.every((name) => fields[name] && fields[name].confidence !== 'low');
    if (!present) {
      continue;
    }
    const worstRank = Math.min(...group.map((name) => CONFIDENCE_RANK[fields[name].confidence]));
    if (best === null || worstRank > best.rank) {
      best = { rank: worstRank, groupFieldNames: group };
    }
  }
  if (!best) {
    return { qualifies: false, groupFieldNames: [], confidence: null };
  }
  return {
    qualifies: true,
    groupFieldNames: best.groupFieldNames,
    confidence: best.rank === CONFIDENCE_RANK.high ? 'high' : 'medium',
  };
}

function countExtractedFields(fields) {
  return Object.values(fields).filter((field) => field !== null).length;
}

const DISCLAIMER =
  'התקציר מבוסס על הטקסט שהודבק ואינו מחליף את המידע באתר המוביל הרשמי. יש לאמת שינויים, עיכובים ונתונים חסרים מול המקור הרשמי.';

const NO_GROUP_MESSAGE = 'לא הצלחנו לזהות מספיק מידע תפעולי בטקסט שהודבק';

/**
 * Build a normalized tracking-import summary from raw pasted text.
 *
 * @param {{text: *, sourceType?: 'ocean'|'air'|'courier'|'auto'|'unknown', now?: Date}} input
 *   `sourceType` defaults to `'auto'` (also the behavior for `'unknown'`):
 *   every mode is evaluated and the strongest qualifying mode is chosen
 *   (tie-broken deterministically in the fixed order ocean, air, courier).
 *   `now` defaults to the current time and is only used for `importedAt`.
 * @returns {Readonly<object>} A frozen result. On a rejected input,
 *   `{valid: false, error: 'empty_input'|'too_long', length?}`. On a
 *   successful parse (even with no useful group), `valid: true` plus
 *   `detectedMode`, `supportLevel`, `sourceType`, `importedAt`,
 *   `overallConfidence`, `fields`, `meaningfulGroupFields`,
 *   `limitations`, and `message`.
 */
export function buildTrackingSummary(input) {
  const opts = input && typeof input === 'object' ? input : {};
  const normalized = normalizeImportedText(opts.text);
  if (!normalized.valid) {
    return Object.freeze({ valid: false, error: normalized.error, length: normalized.length });
  }

  const requestedSourceType =
    typeof opts.sourceType === 'string' && opts.sourceType.length > 0 ? opts.sourceType : 'auto';
  const now = opts.now instanceof Date && !Number.isNaN(opts.now.getTime()) ? opts.now : new Date();

  const oceanFields = extractOceanFields(normalized.lines);
  const airFields = extractAirFields(normalized.lines);
  const courierFields = extractCourierFields(normalized.lines);

  const oceanEval = evaluateMeaningfulGroups(oceanFields, OCEAN_MEANINGFUL_GROUPS);
  const airEval = evaluateMeaningfulGroups(airFields, AIR_MEANINGFUL_GROUPS);
  const courierEval = evaluateMeaningfulGroups(courierFields, COURIER_MEANINGFUL_GROUPS);

  const candidates = Object.freeze([
    Object.freeze({ mode: 'ocean', fields: oceanFields, evalResult: oceanEval }),
    Object.freeze({ mode: 'air', fields: airFields, evalResult: airEval }),
    Object.freeze({ mode: 'courier', fields: courierFields, evalResult: courierEval }),
  ]);

  let chosen;
  if (requestedSourceType === 'ocean' || requestedSourceType === 'air' || requestedSourceType === 'courier') {
    chosen = candidates.find((candidate) => candidate.mode === requestedSourceType);
  } else {
    // auto / unknown: prefer a qualifying mode, breaking ties by evidence
    // volume (extracted field count), then by fixed mode order.
    const qualifying = candidates.filter((candidate) => candidate.evalResult.qualifies);
    if (qualifying.length > 0) {
      chosen = qualifying.reduce((best, candidate) =>
        countExtractedFields(candidate.fields) > countExtractedFields(best.fields) ? candidate : best,
      );
    } else {
      chosen = candidates.reduce((best, candidate) =>
        countExtractedFields(candidate.fields) > countExtractedFields(best.fields) ? candidate : best,
      );
    }
  }

  const supportLevel = chosen.evalResult.qualifies ? 'partial' : 'detection_only';
  const detectedMode = chosen.evalResult.qualifies || requestedSourceType !== 'auto' ? chosen.mode : 'unknown';

  return Object.freeze({
    valid: true,
    detectedMode,
    supportLevel,
    sourceType: requestedSourceType,
    importedAt: now.toISOString(),
    overallConfidence: chosen.evalResult.confidence,
    fields: chosen.fields,
    meaningfulGroupFields: chosen.evalResult.groupFieldNames,
    limitations: Object.freeze([DISCLAIMER]),
    message: supportLevel === 'partial' ? null : NO_GROUP_MESSAGE,
  });
}

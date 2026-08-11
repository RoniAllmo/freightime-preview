/**
 * Normalized-result assembly for FreighTime's Smart Tracking Import.
 *
 * Responsibility: combine text normalization, combined-line/table
 * parsing, the three mode-specific field extractors, and the event
 * timeline extractor into one honest, evidence-bearing summary, and
 * decide the shipment's support level (`'partial'` or `'detection_only'`)
 * using the exact "meaningful useful group" rules from the product spec
 * -- never upgraded to `'partial'` on the strength of a single
 * unverified (low-confidence / ambiguous / conflicted) value alone.
 *
 * V2 additions over V1:
 * - Field extraction now runs over `expandedLines` (combined-line- and
 *   table-aware), not just single "Label: value" lines.
 * - A conflict (two different values found for the same field) is never
 *   silently resolved -- the field's confidence drops to `'low'` and its
 *   candidates are preserved for the "מידע שדורש אימות" section (see
 *   `build-field-value.js`), while unrelated fields/groups are
 *   unaffected (rule 34).
 * - An event timeline (`extract-events.js`) is extracted from any
 *   detected table or repeated date/event/location labeled blocks, and
 *   can itself grant `'partial'` support (>= 2 high/medium-confidence
 *   dated events) even when no single field-based group qualifies.
 * - A source "last updated" timestamp, if present, is exposed purely as
 *   recency metadata -- it is never treated as an event/departure/
 *   arrival/delivery time (rule 38).
 * - User-facing (never internal) diagnostic notes describe what kind of
 *   pasted structure was recognized (rule 57).
 *
 * This module performs no DOM/network/storage access and no logging. It
 * never invents a field, never infers an unsupported carrier or airline,
 * and never claims FreighTime contacted a carrier -- every field it
 * returns was read directly from the pasted text under a recognized
 * label.
 */

import { normalizeImportedText, findAllLabeledValues, UPDATE_LABELS } from './normalize-imported-text.js';
import { parseTables } from './parse-table.js';
import { extractEventTimeline } from './extract-events.js';
import { parseDateValue } from './extract-dates.js';
import { extractOceanFields, OCEAN_MEANINGFUL_GROUPS } from './extract-ocean-fields.js';
import { extractAirFields, AIR_MEANINGFUL_GROUPS } from './extract-air-fields.js';
import { extractCourierFields, COURIER_MEANINGFUL_GROUPS } from './extract-courier-fields.js';

const CONFIDENCE_RANK = Object.freeze({ low: 0, medium: 1, high: 2 });

/** Minimum number of high/medium-confidence dated timeline events that alone can grant `'partial'` support (rule 44). */
const MIN_TIMELINE_EVENTS_FOR_PARTIAL = 2;

/**
 * Evaluate a mode's meaningful-group rules against its extracted fields.
 * A group only qualifies when every one of its fields is present, is not
 * a conflict, and carries confidence other than `'low'`.
 *
 * @param {Readonly<object>} fields - A mode's extracted field map.
 * @param {ReadonlyArray<ReadonlyArray<string>>} groups - That mode's meaningful-group definitions.
 * @returns {{qualifies: boolean, groupFieldNames: ReadonlyArray<string>, confidence: 'high'|'medium'|null}}
 */
function evaluateMeaningfulGroups(fields, groups) {
  let best = null;
  for (const group of groups) {
    const present = group.every((name) => fields[name] && fields[name].confidence !== 'low' && !fields[name].conflict);
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

/** Evaluate whether the event timeline alone qualifies as a meaningful group (rule 44). */
function evaluateTimelineGroup(timeline) {
  const qualifyingEvents = timeline.events.filter((e) => e.confidence !== 'low' && e.dateIso !== null);
  if (qualifyingEvents.length < MIN_TIMELINE_EVENTS_FOR_PARTIAL) {
    return { qualifies: false, confidence: null };
  }
  const worstRank = Math.min(...qualifyingEvents.map((e) => CONFIDENCE_RANK[e.confidence]));
  return { qualifies: true, confidence: worstRank === CONFIDENCE_RANK.high ? 'high' : 'medium' };
}

/** If the timeline confidently determined a single latest event, it supersedes the field-level latestEvent/*Time/*Location (stronger, chronologically-verified evidence over a single unverified label claim). */
function applyTimelineLatestEventOverride(fields, timeline) {
  if (!timeline.latestEvent) {
    return fields;
  }
  const le = timeline.latestEvent;
  return {
    ...fields,
    latestEvent: Object.freeze({
      value: le.description,
      semantic: 'unknown',
      confidence: le.confidence,
      evidence: le.evidence,
      inferred: false,
      conflict: false,
    }),
    latestEventTime: le.dateIso
      ? Object.freeze({
          value: le.dateIso,
          rawText: le.rawDateText,
          semantic: 'actual',
          confidence: le.confidence,
          evidence: le.evidence,
          inferred: false,
          ambiguous: false,
          timeText: le.timeText,
          timezoneText: le.timezoneText,
          conflict: false,
        })
      : fields.latestEventTime,
    latestEventLocation: le.location
      ? Object.freeze({
          value: le.location,
          semantic: 'unknown',
          confidence: 'medium',
          evidence: le.evidence,
          inferred: false,
          conflict: false,
        })
      : fields.latestEventLocation,
  };
}

function countExtractedNonConflict(fields) {
  return Object.values(fields).filter((field) => field !== null && !field.conflict).length;
}

function collectFieldsRequiringVerification(fields) {
  return Object.entries(fields)
    .filter(([, field]) => field && (field.confidence === 'low' || field.conflict))
    .map(([name, field]) => ({ name, field }));
}

function collectDiagnostics({ tables, timeline, chosenFields, sourceUpdatedAt }) {
  const diagnostics = [];
  if (tables.tables.length > 0) {
    diagnostics.push('זוהה מבנה של טבלה');
  }
  if (timeline.events.length >= 2) {
    diagnostics.push('זוהו מספר אירועים');
  }
  if (chosenFields.eta && chosenFields.eta.conflict) {
    diagnostics.push('נמצאו מספר ערכי ETA');
  }
  const otherConflicts = Object.entries(chosenFields).some(([name, field]) => field && field.conflict && name !== 'eta');
  if (otherConflicts) {
    diagnostics.push('נמצאו ערכים סותרים בטקסט שהודבק ויש לאמת מול המקור הרשמי');
  }
  if (timeline.orderConfidence === 'source-order' && timeline.events.length > 0) {
    diagnostics.push('סדר האירועים אינו חד-משמעי');
  }
  const hasUnverifiedDate = Object.values(chosenFields).some(
    (field) => field && !field.conflict && field.confidence === 'low' && 'ambiguous' in field,
  );
  if (hasUnverifiedDate) {
    diagnostics.push('חלק מהתאריכים דורשים אימות');
  }
  if (sourceUpdatedAt) {
    diagnostics.push('נמצא זמן עדכון מקור בטקסט שהודבק');
  }
  return diagnostics;
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
 *   `overallConfidence`, `fields`, `meaningfulGroupFields`, `timeline`,
 *   `sourceUpdatedAt`, `diagnostics`, `limitations`, and `message`.
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

  const tables = parseTables(normalized.lines);
  const timeline = extractEventTimeline({ lines: normalized.expandedLines, tables });

  const updateMatch = findAllLabeledValues(normalized.expandedLines, UPDATE_LABELS)[0] ?? null;
  const sourceUpdatedAt = updateMatch
    ? (() => {
        const parsed = parseDateValue(updateMatch.value);
        return parsed.parsed ? Object.freeze({ value: parsed.isoDate, timeText: parsed.timeText, raw: updateMatch.value }) : null;
      })()
    : null;

  let oceanFields = extractOceanFields(normalized.expandedLines);
  let airFields = extractAirFields(normalized.expandedLines);
  let courierFields = extractCourierFields(normalized.expandedLines);

  oceanFields = applyTimelineLatestEventOverride(oceanFields, timeline);
  airFields = applyTimelineLatestEventOverride(airFields, timeline);
  courierFields = applyTimelineLatestEventOverride(courierFields, timeline);

  const oceanEval = evaluateMeaningfulGroups(oceanFields, OCEAN_MEANINGFUL_GROUPS);
  const airEval = evaluateMeaningfulGroups(airFields, AIR_MEANINGFUL_GROUPS);
  const courierEval = evaluateMeaningfulGroups(courierFields, COURIER_MEANINGFUL_GROUPS);
  const timelineEval = evaluateTimelineGroup(timeline);

  function combineWithTimeline(fieldEval) {
    if (fieldEval.qualifies) {
      return fieldEval;
    }
    if (timelineEval.qualifies) {
      return { qualifies: true, groupFieldNames: ['eventTimeline'], confidence: timelineEval.confidence };
    }
    return fieldEval;
  }

  const candidates = Object.freeze([
    Object.freeze({ mode: 'ocean', fields: oceanFields, evalResult: combineWithTimeline(oceanEval) }),
    Object.freeze({ mode: 'air', fields: airFields, evalResult: combineWithTimeline(airEval) }),
    Object.freeze({ mode: 'courier', fields: courierFields, evalResult: combineWithTimeline(courierEval) }),
  ]);

  let chosen;
  if (requestedSourceType === 'ocean' || requestedSourceType === 'air' || requestedSourceType === 'courier') {
    chosen = candidates.find((candidate) => candidate.mode === requestedSourceType);
  } else {
    const qualifying = candidates.filter((candidate) => candidate.evalResult.qualifies);
    if (qualifying.length > 0) {
      chosen = qualifying.reduce((best, candidate) =>
        countExtractedNonConflict(candidate.fields) > countExtractedNonConflict(best.fields) ? candidate : best,
      );
    } else {
      chosen = candidates.reduce((best, candidate) =>
        countExtractedFields(candidate.fields) > countExtractedFields(best.fields) ? candidate : best,
      );
    }
  }

  const supportLevel = chosen.evalResult.qualifies ? 'partial' : 'detection_only';
  const detectedMode = chosen.evalResult.qualifies || requestedSourceType !== 'auto' ? chosen.mode : 'unknown';

  const diagnostics = collectDiagnostics({ tables, timeline, chosenFields: chosen.fields, sourceUpdatedAt });
  const fieldsRequiringVerification = collectFieldsRequiringVerification(chosen.fields);

  return Object.freeze({
    valid: true,
    detectedMode,
    supportLevel,
    sourceType: requestedSourceType,
    importedAt: now.toISOString(),
    overallConfidence: chosen.evalResult.confidence,
    fields: chosen.fields,
    meaningfulGroupFields: chosen.evalResult.groupFieldNames,
    fieldsRequiringVerification: Object.freeze(fieldsRequiringVerification),
    timeline,
    sourceUpdatedAt,
    diagnostics: Object.freeze(diagnostics),
    limitations: Object.freeze([DISCLAIMER]),
    message: supportLevel === 'partial' ? null : NO_GROUP_MESSAGE,
    linesTruncated: normalized.linesTruncated,
  });
}

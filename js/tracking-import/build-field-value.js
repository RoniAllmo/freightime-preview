/**
 * Shared, conflict-aware field-value construction for FreighTime's Smart
 * Tracking Import V2.
 *
 * Responsibility: given every candidate match found for a field's labels
 * (via `findAllLabeledValues`, not just the first), decide whether the
 * field is a clean single value, a duplicate (the same value repeated --
 * collapsed safely, never lowering confidence), or a genuine conflict
 * (two or more different values -- confidence forced to `'low'` and the
 * candidates preserved for the "מידע שדורש אימות" section, per rule 31:
 * a conflict is never silently resolved).
 *
 * This module replaces the small per-file `buildTextField`/`buildDateField`/
 * `buildLocationField` helpers that were duplicated across
 * `extract-ocean-fields.js`, `extract-air-fields.js`, and
 * `extract-courier-fields.js` in V1 -- a focused, fully-tested shared
 * helper instead of continuing to triplicate the same logic (per the V2
 * task's guidance to prefer shared helpers over a full rewrite).
 *
 * Performs no DOM/network/storage access and no logging.
 */

import { parseDateValue } from './extract-dates.js';
import { extractLocationValue } from './extract-locations.js';

const CONFIDENCE_RANK = Object.freeze({ low: 0, medium: 1, high: 2 });

function evidenceFor(match) {
  return `"${match.lineText}" (label: ${match.matchedLabel})`;
}

/**
 * Build a plain-text field (status/vessel/voyage/flight/event description,
 * etc.) from every candidate match for its labels.
 *
 * @param {ReadonlyArray} matches - Output of `findAllLabeledValues`.
 * @param {'high'|'medium'|'low'} baseConfidence - Confidence assigned to a single, unconflicted match.
 * @returns {Readonly<object>|null}
 */
export function buildTextFieldFromMatches(matches, baseConfidence) {
  if (!Array.isArray(matches) || matches.length === 0) {
    return null;
  }
  const distinctByValue = new Map();
  for (const match of matches) {
    if (!distinctByValue.has(match.value)) {
      distinctByValue.set(match.value, { match, count: 0 });
    }
    distinctByValue.get(match.value).count += 1;
  }

  if (distinctByValue.size === 1) {
    const [[value, { match, count }]] = distinctByValue.entries();
    return Object.freeze({
      value,
      semantic: 'unknown',
      confidence: baseConfidence,
      evidence: evidenceFor(match),
      inferred: false,
      occurrenceCount: count,
      conflict: false,
    });
  }

  const candidates = Object.freeze(
    Array.from(distinctByValue.values()).map(({ match }) => Object.freeze({ value: match.value, evidence: evidenceFor(match) })),
  );
  return Object.freeze({
    value: null,
    semantic: 'unknown',
    confidence: 'low',
    evidence: candidates.map((c) => c.evidence).join('; '),
    inferred: false,
    conflict: true,
    candidates,
  });
}

/**
 * Build a location field from every candidate match for its labels.
 * Duplicate/conflict logic mirrors `buildTextFieldFromMatches`.
 *
 * @param {ReadonlyArray} matches - Output of `findAllLabeledValues`.
 * @returns {Readonly<object>|null}
 */
export function buildLocationFieldFromMatches(matches) {
  if (!Array.isArray(matches) || matches.length === 0) {
    return null;
  }
  const located = matches.map((match) => ({ match, located: extractLocationValue(match.value) })).filter((x) => x.located);
  if (located.length === 0) {
    return null;
  }
  const distinctByValue = new Map();
  for (const { match, located: loc } of located) {
    if (!distinctByValue.has(loc.value)) {
      distinctByValue.set(loc.value, { match, located: loc, count: 0 });
    }
    distinctByValue.get(loc.value).count += 1;
  }

  if (distinctByValue.size === 1) {
    const [[value, { match, located: loc, count }]] = distinctByValue.entries();
    return Object.freeze({
      value,
      semantic: 'unknown',
      confidence: loc.confidence,
      evidence: evidenceFor(match),
      inferred: false,
      occurrenceCount: count,
      conflict: false,
    });
  }

  const candidates = Object.freeze(
    Array.from(distinctByValue.values()).map(({ match, located: loc }) => Object.freeze({ value: loc.value, evidence: evidenceFor(match) })),
  );
  return Object.freeze({
    value: null,
    semantic: 'unknown',
    confidence: 'low',
    evidence: candidates.map((c) => c.evidence).join('; '),
    inferred: false,
    conflict: true,
    candidates,
  });
}

/**
 * Build a date/time field from every candidate match for its labels.
 * Two matches that parse to the *same* ISO date are a duplicate (safely
 * collapsed, confidence unaffected); two matches that parse to
 * *different* ISO dates are a genuine conflict (rule 30) -- confidence
 * forced to `'low'`, candidates preserved, never silently resolved
 * (rule 31). A single ambiguous/unparseable match still behaves exactly
 * as in V1 (semantic falls back to `'unknown'`, confidence from
 * `parseDateValue`).
 *
 * @param {ReadonlyArray} matches - Output of `findAllLabeledValues`.
 * @param {'scheduled'|'estimated'|'actual'} defaultSemantic
 * @returns {Readonly<object>|null}
 */
export function buildDateFieldFromMatches(matches, defaultSemantic) {
  if (!Array.isArray(matches) || matches.length === 0) {
    return null;
  }

  const parsedMatches = matches.map((match) => ({ match, parsed: parseDateValue(match.value) }));

  // Group by a comparison key: the parsed ISO date when available, otherwise the raw trimmed text
  // (so two unparseable-but-identical values are still treated as a duplicate, not a conflict).
  const distinctByKey = new Map();
  for (const entry of parsedMatches) {
    const key = entry.parsed.isoDate ?? `raw:${entry.match.value}`;
    if (!distinctByKey.has(key)) {
      distinctByKey.set(key, { entry, count: 0 });
    }
    distinctByKey.get(key).count += 1;
  }

  if (distinctByKey.size === 1) {
    const [[, { entry, count }]] = distinctByKey.entries();
    const { match, parsed } = entry;
    const semantic = parsed.parsed ? defaultSemantic : 'unknown';
    return Object.freeze({
      value: parsed.isoDate ?? match.value,
      rawText: match.value,
      semantic,
      confidence: parsed.confidence,
      evidence: evidenceFor(match),
      inferred: false,
      ambiguous: parsed.ambiguous,
      timeText: parsed.timeText,
      timezoneText: parsed.timezoneText,
      occurrenceCount: count,
      conflict: false,
    });
  }

  const candidates = Object.freeze(
    Array.from(distinctByKey.values()).map(({ entry }) =>
      Object.freeze({
        value: entry.parsed.isoDate ?? entry.match.value,
        evidence: evidenceFor(entry.match),
      }),
    ),
  );
  return Object.freeze({
    value: null,
    semantic: 'unknown',
    confidence: 'low',
    evidence: candidates.map((c) => c.evidence).join('; '),
    inferred: false,
    ambiguous: false,
    conflict: true,
    candidates,
  });
}

export { CONFIDENCE_RANK };

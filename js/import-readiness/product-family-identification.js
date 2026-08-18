/**
 * Conservative, local, deterministic product-family identification
 * against the reviewed product-family matrix
 * (product-family-matrix.js). No external AI, no network, no fuzzy
 * scoring that could produce an unsafe match -- a family is only
 * identified when its own name or one of its curated, explicitly
 * reviewed aliases appears as a substring of the free text the user
 * already typed (product name, commercial description, intended use).
 *
 * This module never asks a new question: it runs once, silently, over
 * text the questionnaire already collected, exactly like the existing
 * regulatory-signals keyword-hint mechanism. When more than one family
 * matches, or none does, it reports that outcome rather than guessing.
 */

import { activeFamilies } from './product-family-matrix.js';
import { normalizeHebrewSearchText } from './regulatory-signals/keyword-hints.js';

export const IDENTIFICATION_OUTCOME = Object.freeze({
  HIGH_CONFIDENCE: 'high_confidence',
  MULTIPLE_CANDIDATES: 'multiple_candidates',
  NONE: 'none',
});

const MAX_CANDIDATES = 3;

function isUsableArray(value) {
  return Array.isArray(value);
}

/**
 * @param {string[]} texts - free-text answer strings to scan.
 * @param {object} [options]
 * @param {Array} [options.families] - override the family list (tests).
 * @returns {{ outcome: string, family: object|null, candidates: object[] }}
 */
export function identifyProductFamily(texts, options = {}) {
  const haystack = normalizeHebrewSearchText(
    (isUsableArray(texts) ? texts : []).filter((t) => typeof t === 'string').join(' '),
  );
  const families = isUsableArray(options.families) ? options.families : activeFamilies();

  if (!haystack) {
    return { outcome: IDENTIFICATION_OUTCOME.NONE, family: null, candidates: [] };
  }

  const matches = families.filter((family) =>
    (family.aliases || []).some((alias) => {
      const normalizedAlias = normalizeHebrewSearchText(alias);
      return normalizedAlias.length > 0 && haystack.includes(normalizedAlias);
    }),
  );

  if (matches.length === 0) {
    return { outcome: IDENTIFICATION_OUTCOME.NONE, family: null, candidates: [] };
  }

  if (matches.length === 1) {
    return {
      outcome: IDENTIFICATION_OUTCOME.HIGH_CONFIDENCE,
      family: matches[0],
      candidates: matches,
    };
  }

  return {
    outcome: IDENTIFICATION_OUTCOME.MULTIPLE_CANDIDATES,
    family: null,
    candidates: matches.slice(0, MAX_CANDIDATES),
  };
}

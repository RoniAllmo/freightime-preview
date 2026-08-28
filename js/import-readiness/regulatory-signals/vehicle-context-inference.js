/**
 * Conservative text-based pre-answering for the vehicle-installed-
 * product rule's follow-up question (installedAsPartOfVehicle). When
 * the product description already explicitly states the fact the
 * question would ask for, the question is redundant and must not be
 * shown (product-owner acceptance finding: "פנס קדמי להתקנה ברכב"
 * should not be asked whether it is installed in the vehicle -- that
 * is already explicit in the description).
 *
 * Deliberately narrow, phrase-based matching -- not broad fuzzy
 * matching. A description that only vaguely mentions "רכב" without an
 * explicit installation phrase still gets asked normally; this only
 * skips the question when the answer is genuinely already stated,
 * never when it is merely likely.
 *
 * A second, sibling question (vehicleFunctionCategory) previously had
 * its own inference here (a lighting phrase pre-answering "תפקידו
 * העיקרי ברכב" as "lighting"). That question was removed entirely in
 * the post-Wave-3 cleanup pass (2026-08-28) -- proven to have zero
 * effect on any rendered result -- so its inference logic was removed
 * with it, not left as a dead pre-answer for a question that no
 * longer exists.
 *
 * Pure string matching. No DOM, no network.
 */

import { normalizeHebrewSearchText } from './keyword-hints.js';

const EXPLICIT_INSTALLATION_PHRASES = Object.freeze([
  'להתקנה ברכב', 'להתקנה כחלק מהרכב', 'מותקן ברכב', 'מותקן כחלק מהרכב',
  'מיועד להתקנה ברכב', 'חלק מובנה ברכב',
]);

/**
 * @param {string[]} texts - product name / description / intended use.
 * @returns {{ installedAsPartOfVehicle?: 'yes' }}
 */
export function inferVehicleContextAnswers(texts) {
  const haystack = normalizeHebrewSearchText(
    (Array.isArray(texts) ? texts : []).filter((t) => typeof t === 'string').join(' '),
  );
  const answers = {};
  if (haystack.length === 0) return answers;

  if (EXPLICIT_INSTALLATION_PHRASES.some((p) => haystack.includes(normalizeHebrewSearchText(p)))) {
    answers.installedAsPartOfVehicle = 'yes';
  }
  return answers;
}

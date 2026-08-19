/**
 * Conservative text-based pre-answering for the vehicle-installed-
 * product rule's two follow-up questions
 * (installedAsPartOfVehicle/vehicleFunctionCategory). When the product
 * description already explicitly states the fact a question would ask
 * for, the question is redundant and must not be shown (product-owner
 * acceptance finding: "פנס קדמי להתקנה ברכב" should not be asked
 * whether it is installed in the vehicle, nor what its function is --
 * both are already explicit in the description).
 *
 * Deliberately narrow, phrase-based matching -- not broad fuzzy
 * matching. A description that only vaguely mentions "רכב" without an
 * explicit installation or lighting phrase still gets asked normally;
 * this only skips a question when the answer is genuinely already
 * stated, never when it is merely likely.
 *
 * Pure string matching. No DOM, no network.
 */

import { normalizeHebrewSearchText } from './keyword-hints.js';

const EXPLICIT_INSTALLATION_PHRASES = Object.freeze([
  'להתקנה ברכב', 'להתקנה כחלק מהרכב', 'מותקן ברכב', 'מותקן כחלק מהרכב',
  'מיועד להתקנה ברכב', 'חלק מובנה ברכב',
]);

// A lighting phrase alone establishes the vehicle-function answer;
// vehicle-ness itself is already handled by the caller only invoking
// this once vehicle_product is hinted.
const EXPLICIT_LIGHTING_PHRASES = Object.freeze([
  'פנס', 'פנסים', 'גוף תאורה', 'גופי תאורה', 'תאורה לרכב', 'נורת רכב',
]);

/**
 * @param {string[]} texts - product name / description / intended use.
 * @returns {{ installedAsPartOfVehicle?: 'yes', vehicleFunctionCategory?: 'lighting' }}
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
  if (EXPLICIT_LIGHTING_PHRASES.some((p) => haystack.includes(normalizeHebrewSearchText(p)))) {
    answers.vehicleFunctionCategory = 'lighting';
  }
  return answers;
}

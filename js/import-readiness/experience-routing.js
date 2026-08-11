/**
 * Scenario routing from import type (Question 1) + import experience
 * (Question 2) to one of the four "planning" scenarios. The fifth
 * scenario (shipment already in progress / a problem) is a separate,
 * explicit entry point on the intro screen -- a shipment problem is
 * rarely well-served by first answering "personal or commercial" and
 * "is this your first import," so it bypasses Questions 1-2 entirely
 * (see `import-readiness-controller.js`). This module never routes into
 * that scenario.
 *
 * Pure, deterministic, DOM-free, network-free, storage-free.
 */

import { IMPORT_TYPE, EXPERIENCE, SCENARIO } from './scenario-schema.js';

/**
 * @param {{importType: string, experience: string}} answers
 * @returns {string} One of `SCENARIO`'s values (never SHIPMENT_PROBLEM).
 */
export function decideScenario(answers) {
  const a = answers !== null && typeof answers === 'object' ? answers : {};
  const importType = a.importType;
  const experience = a.experience;

  if (importType === IMPORT_TYPE.PERSONAL) {
    return SCENARIO.PERSONAL;
  }

  // Commercial or still-uncertain import type: route by experience.
  // Uncertain-type users are conservatively routed the same as
  // commercial users, since a commercial-leaning uncertainty carries
  // more regulatory exposure than a personal-leaning one, and every
  // scenario result still states the import type is not finally
  // determined (see import-type-routing.js).
  if (experience === EXPERIENCE.ONGOING_OPERATION) {
    return SCENARIO.ESTABLISHED_OPERATION;
  }
  if (experience === EXPERIENCE.PRIOR_IMPORTER) {
    return SCENARIO.EXISTING_IMPORTER;
  }
  // FIRST_TIME and PLANNING_ONLY (and any unrecognized value) both get
  // the same educational, preparation-focused first-commercial-import
  // scenario -- a planning-only user benefits from the same guidance,
  // just without an active shipment yet.
  return SCENARIO.FIRST_COMMERCIAL;
}

/**
 * Evidence package intake slot: glass-food-contact-vessel.
 *
 * =====================================================================
 * INTENTIONALLY EMPTY -- placeholder scaffolding only.
 *
 * This file is the EXACT place the product owner should fill in a
 * reviewed regulatory evidence package for the `glass_food_contact`
 * candidate (the existing disabled `RS-GLASS-FOOD-001` entry in
 * `../rules-registry.js`) once real, human-verified source material is
 * available. Nothing below is real regulatory content: every field is
 * an explicit empty/placeholder value, never an invented fact, number,
 * URL, or Hebrew wording. Do NOT treat any value in this file as a
 * real claim about Israeli import regulation.
 *
 * Every field matches the schema documented in
 * `../evidence-package.js` (`EVIDENCE_PACKAGE_REQUIRED_FIELDS`) and
 * `docs/evidence-package-schema.md`. `activeOrDisabledStatus` is
 * pinned to `RULE_STATUS.DISABLED` here on purpose, so this template
 * can never accidentally validate or activate no matter what else is
 * filled in later by mistake -- the product owner must deliberately
 * change it to `RULE_STATUS.APPROVED_FOR_PILOT` (imported from
 * `../rule-status.js`) as an explicit, separate, reviewed step after
 * every other field below is genuinely filled in and
 * `validateEvidencePackage()` passes.
 *
 * How to fill this in:
 *   1. Replace every placeholder value below with real, verified
 *      content -- read the primary official source directly, do not
 *      rely on a secondhand summary (see docs/regulatory-signals-pilot.md §2
 *      for why that bar exists).
 *   2. Run `validateEvidencePackage(GLASS_FOOD_CONTACT_VESSEL_EVIDENCE)`
 *      from `../evidence-package.js` and confirm `{ valid: true }`.
 *   3. Only then, as a deliberate final step, change
 *      `activeOrDisabledStatus` to `RULE_STATUS.APPROVED_FOR_PILOT`.
 *   4. Wire this package into the matcher via
 *      `eligibleRuleShapesFromPackages()` (see `./index.js`) -- a
 *      follow-up engineering task, not part of filling in this file.
 * =====================================================================
 */

import { RULE_STATUS } from '../rule-status.js';
import { REVIEWER_STATUS } from '../evidence-package.js';

export const GLASS_FOOD_CONTACT_VESSEL_EVIDENCE = Object.freeze({
  // Reuses the existing candidate's public identifier for traceability
  // -- this is an ID label carried over from the already-disabled
  // rules-registry.js entry, not a new regulatory fact.
  ruleId: 'RS-GLASS-FOOD-001',
  publicCategory: 'glass_food_contact',

  // --- Everything below is an explicit placeholder. Fill in with real,
  // --- verified content only. Leave empty (not invented) until then.
  triggerPhrases: Object.freeze([]),
  confirmationQuestions: Object.freeze([]),
  activationConditions: Object.freeze([]),
  exclusions: Object.freeze([]),
  publicHebrewWording: Object.freeze({ identification: '', implication: '' }),
  verificationItems: Object.freeze([]),
  primaryVerificationProfessional: '',
  professionalReason: '',
  officialSourceTitle: '',
  issuingAuthority: '',
  exactSourceUrl: '',
  tariffOrStandardReference: '',
  verificationDate: '',
  reviewDueDate: '',
  reviewerStatus: REVIEWER_STATUS.NOT_YET_REVIEWED,

  // Pinned DISABLED -- see file header. Do not change this alongside
  // any other placeholder edit; change it last, deliberately, alone.
  activeOrDisabledStatus: RULE_STATUS.DISABLED,

  publicLimitationWording: '',
});

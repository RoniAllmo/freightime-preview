/**
 * Evidence package intake slot: electrical-products.
 *
 * =====================================================================
 * INTENTIONALLY EMPTY -- placeholder scaffolding only.
 *
 * This file is the EXACT place the product owner should fill in a
 * reviewed regulatory evidence package for the `electrical_mains_product`
 * candidate (the existing disabled `RS-ELEC-001` entry in
 * `../rules-registry.js`) once real, human-verified source material is
 * available. Nothing below is real regulatory content: every field is
 * an explicit empty/placeholder value, never an invented fact, number,
 * URL, or Hebrew wording. Do NOT treat any value in this file as a
 * real claim about Israeli import regulation.
 *
 * Content in this section must be entered directly by the FreighTime
 * product owner. The scaffold must remain inactive until
 * productOwnerAuthored is true and the required content validator
 * passes.
 *
 * Every field matches the schema documented in `../evidence-package.js`
 * (`EVIDENCE_PACKAGE_REQUIRED_FIELDS`, `AUTHORING_SCAFFOLD_EXTRA_FIELDS`)
 * and `docs/product-owner-rule-authoring-guide.md`. `activeOrDisabledStatus`
 * is pinned to `RULE_STATUS.DISABLED` here on purpose, so this template
 * can never accidentally validate or activate no matter what else is
 * filled in later by mistake -- the product owner must deliberately
 * change it to `RULE_STATUS.APPROVED_FOR_PILOT` (imported from
 * `../rule-status.js`) as an explicit, separate, reviewed step after
 * every other field below is genuinely filled in,
 * `productOwnerAuthored` is set to `true`, and
 * `validateEvidencePackage()` / `validateAuthoringScaffoldReadyForReview()`
 * both pass.
 *
 * How to fill this in: see `docs/product-owner-rule-authoring-guide.md`
 * for the full field-by-field walkthrough and the Hebrew field-heading
 * authoring template (labels only, no content).
 * =====================================================================
 */

import { RULE_STATUS } from '../rule-status.js';
import { REVIEWER_STATUS } from '../evidence-package.js';

export const ELECTRICAL_PRODUCTS_EVIDENCE = Object.freeze({
  // Reuses the existing candidate's public identifier for traceability
  // -- this is an ID label carried over from the already-disabled
  // rules-registry.js entry, not a new regulatory fact.
  ruleId: 'RS-ELEC-001',
  publicCategory: 'electrical_mains_product',

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

  // --- Authoring-scaffold extras (see ../evidence-package.js
  // --- AUTHORING_SCAFFOLD_EXTRA_FIELDS). Same "explicit empty
  // --- placeholder only" rule applies.
  authorityType: 'product_owner',
  productOwnerAuthored: false,
  lastProductOwnerReview: null,
  internalName: 'electrical-products',
  changeNotes: Object.freeze([]),
});

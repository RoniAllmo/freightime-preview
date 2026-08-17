/**
 * Evidence package intake slot: cosmetics-and-toiletries.
 *
 * =====================================================================
 * INTENTIONALLY EMPTY -- placeholder scaffolding only.
 *
 * This file is a NEW candidate slot -- unlike the other 4 category
 * scaffolds in this directory, there is no existing disabled entry for
 * a cosmetics/toiletries category in `../rules-registry.js` to trace
 * this id back to (the original 5 researched candidates there are
 * electrical, plastic-food-contact, polymer-coating-food-contact,
 * glass-food-contact, and vehicle-installed only -- see
 * `docs/regulatory-signals-pilot.md` §2). `RS-COSMETICS-001` is
 * therefore a freshly-assigned id, reserved here purely as an empty
 * intake slot; it carries no research history and no prior review.
 * Nothing below is real regulatory content: every field is an explicit
 * empty/placeholder value, never an invented fact, number, URL, or
 * Hebrew wording. Do NOT treat any value in this file as a real claim
 * about Israeli import regulation.
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

export const COSMETICS_AND_TOILETRIES_EVIDENCE = Object.freeze({
  // A freshly-assigned id -- see file header for why this has no
  // rules-registry.js entry to trace back to.
  ruleId: 'RS-COSMETICS-001',
  publicCategory: 'cosmetics_and_toiletries',

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
  internalName: 'cosmetics-and-toiletries',
  changeNotes: Object.freeze([]),
});

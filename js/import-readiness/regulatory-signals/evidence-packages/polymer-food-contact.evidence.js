/**
 * Evidence package intake slot: polymer-food-contact.
 *
 * =====================================================================
 * INTENTIONALLY EMPTY -- placeholder scaffolding only.
 *
 * This file is the place the product owner should fill in a reviewed
 * regulatory evidence package for a single, unified "polymer or
 * polymer-coated food-contact product" candidate. Note this is a
 * distinct scaffold id (`RS-POLYMER-FOOD-CONTACT-001`) rather than a
 * reuse of either existing disabled `rules-registry.js` entry
 * (`RS-PLASTIC-FOOD-001` plastic-in-direct-contact, or
 * `RS-POLYMER-COATING-001` polymer-coating-in-contact) -- the product
 * owner may, as a deliberate later decision documented in this file's
 * `changeNotes`, choose to keep this as one combined category or split
 * it back into the two existing registry candidates; nothing here
 * decides that question. Nothing below is real regulatory content:
 * every field is an explicit empty/placeholder value, never an
 * invented fact, number, URL, or Hebrew wording. Do NOT treat any
 * value in this file as a real claim about Israeli import regulation.
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

export const POLYMER_FOOD_CONTACT_EVIDENCE = Object.freeze({
  // A new, distinct id -- see file header for why this does not reuse
  // either existing related rules-registry.js candidate id.
  ruleId: 'RS-POLYMER-FOOD-CONTACT-001',
  publicCategory: 'polymer_food_contact',

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
  internalName: 'polymer-food-contact',
  changeNotes: Object.freeze([]),
});

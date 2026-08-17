/**
 * Evidence-package intake format for the Product Regulatory Signals
 * pilot.
 *
 * This module does NOT add or activate any regulatory content. It
 * defines the structured shape a product owner must fill in, per
 * candidate rule, before that rule can ever be considered for public
 * output -- and a real, deterministic validator that rejects any
 * package missing the fields the pilot's verification bar requires.
 *
 * Relationship to `rules-registry.js`: this is a formalization of the
 * same field set already used by the 5 existing candidates there (see
 * that file's own field-list comment), not a parallel/incompatible
 * format. `toRuleShape()` below adapts a validated, approved package
 * into the exact object shape `matcher.js` and `rule-status.js`
 * already consume, so an approved package flows through the SAME hard
 * gate (`isPubliclyEligible()`) the existing candidates are already
 * held to -- nothing new is weakened, nothing is bypassed.
 *
 * Pure, deterministic, DOM-free, network-free, storage-free.
 */

import { RULE_STATUS, isPubliclyEligible, isKnownStatus } from './rule-status.js';

/**
 * The exact 19 required fields for a reviewed regulatory evidence
 * package, as specified by the product owner. Every field must be
 * present and non-empty for a package to pass `validateEvidencePackage`.
 *
 *   ruleId                       -- unique candidate id, e.g. "RS-GLASS-FOOD-001"
 *   publicCategory                -- internal/public category key, e.g. "glass_food_contact"
 *   triggerPhrases                -- string[] of loose keyword hints (feeds keyword-hints.js style matching)
 *   confirmationQuestions         -- array of { questionId, legend } closed-choice questions
 *   activationConditions          -- array of { questionId, equals } -- ALL must hold to trigger
 *   exclusions                    -- array of { questionId, equals } -- ANY holding excludes the match
 *   publicHebrewWording           -- { identification, implication } -- the two public-facing sentences
 *   verificationItems             -- string[] (<=3) of things a professional should confirm
 *   primaryVerificationProfessional -- professional-category key (must exist in professional-category-registry.js)
 *   professionalReason            -- why that professional is the right verification path
 *   officialSourceTitle           -- title of the primary official source document/page
 *   issuingAuthority              -- the authority that issued/publishes the source
 *   exactSourceUrl                -- the exact https URL of the official source
 *   tariffOrStandardReference     -- tariff item / order clause / standard number this rests on
 *   verificationDate              -- ISO date string the source was actually read & confirmed
 *   reviewDueDate                 -- ISO date string this evidence must be re-verified by
 *   reviewerStatus                -- one of REVIEWER_STATUS below
 *   activeOrDisabledStatus        -- one of RULE_STATUS from rule-status.js
 *   publicLimitationWording       -- the safe, non-absolute limitation sentence shown with every card
 */
export const EVIDENCE_PACKAGE_REQUIRED_FIELDS = Object.freeze([
  'ruleId',
  'publicCategory',
  'triggerPhrases',
  'confirmationQuestions',
  'activationConditions',
  'exclusions',
  'publicHebrewWording',
  'verificationItems',
  'primaryVerificationProfessional',
  'professionalReason',
  'officialSourceTitle',
  'issuingAuthority',
  'exactSourceUrl',
  'tariffOrStandardReference',
  'verificationDate',
  'reviewDueDate',
  'reviewerStatus',
  'activeOrDisabledStatus',
  'publicLimitationWording',
]);

/**
 * Workflow status of the human review itself -- distinct from
 * `activeOrDisabledStatus` (which is the RULE_STATUS publication
 * state). A package can be `product_owner_reviewed` and still be kept
 * `disabled`/`professional_review_required` in `activeOrDisabledStatus`
 * -- these are two independent axes on purpose.
 */
export const REVIEWER_STATUS = Object.freeze({
  NOT_YET_REVIEWED: 'not_yet_reviewed',
  IN_REVIEW: 'in_review',
  PRODUCT_OWNER_REVIEWED: 'product_owner_reviewed',
  REJECTED: 'rejected',
});

const VALID_REVIEWER_STATUSES = new Set(Object.values(REVIEWER_STATUS));

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function isValidDateString(value) {
  if (!isNonEmptyString(value)) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

function isValidHttpsUrl(value) {
  return isNonEmptyString(value) && value.startsWith('https://');
}

function isValidConditionList(value) {
  return (
    Array.isArray(value) &&
    value.every(
      (c) => c !== null && typeof c === 'object' && isNonEmptyString(c.questionId) && isNonEmptyString(c.equals)
    )
  );
}

function isValidConfirmationQuestions(value) {
  return (
    Array.isArray(value) &&
    value.every((q) => q !== null && typeof q === 'object' && isNonEmptyString(q.questionId) && isNonEmptyString(q.legend))
  );
}

function isValidPublicHebrewWording(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    isNonEmptyString(value.identification) &&
    isNonEmptyString(value.implication)
  );
}

/**
 * Full-schema, field-by-field validation. Returns `{ valid: true }`
 * only when every one of the 19 required fields is present and
 * well-formed. Otherwise returns `{ valid: false, errors: string[] }`
 * naming every missing/invalid field -- deterministic, no partial
 * credit, no field skipped because an earlier one already failed.
 *
 * This is the genuine code-level check: a package that does not pass
 * this function can never reach `toRuleShape()` /
 * `isEligibleForControlledPilot()` below, and therefore can never be
 * considered by the matcher at all.
 *
 * @param {*} pkg
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateEvidencePackage(pkg) {
  const errors = [];

  if (pkg === null || typeof pkg !== 'object') {
    return Object.freeze({ valid: false, errors: Object.freeze(['package must be a non-null object']) });
  }

  if (!isNonEmptyString(pkg.ruleId)) errors.push('ruleId is required');
  if (!isNonEmptyString(pkg.publicCategory)) errors.push('publicCategory is required');
  if (!isNonEmptyArray(pkg.triggerPhrases) || !pkg.triggerPhrases.every((t) => isNonEmptyString(t))) {
    errors.push('triggerPhrases is required (non-empty string[])');
  }
  if (!isValidConfirmationQuestions(pkg.confirmationQuestions) || !isNonEmptyArray(pkg.confirmationQuestions)) {
    errors.push('confirmationQuestions is required (non-empty array of {questionId, legend})');
  }
  if (!isValidConditionList(pkg.activationConditions) || !isNonEmptyArray(pkg.activationConditions)) {
    errors.push('activationConditions is required (non-empty array of {questionId, equals})');
  }
  // exclusions MAY be an empty array (no exclusions identified is a
  // legitimate, honestly-documented outcome -- see rules-registry.js's
  // existing candidates) but the field itself must exist as an array.
  if (!Array.isArray(pkg.exclusions) || !isValidConditionList(pkg.exclusions)) {
    errors.push('exclusions is required (array of {questionId, equals}, may be empty but must be present)');
  }
  if (!isValidPublicHebrewWording(pkg.publicHebrewWording)) {
    errors.push('publicHebrewWording is required ({identification, implication})');
  }
  if (
    !isNonEmptyArray(pkg.verificationItems) ||
    !pkg.verificationItems.every((v) => isNonEmptyString(v)) ||
    pkg.verificationItems.length > 3
  ) {
    errors.push('verificationItems is required (1-3 non-empty strings)');
  }
  if (!isNonEmptyString(pkg.primaryVerificationProfessional)) errors.push('primaryVerificationProfessional is required');
  if (!isNonEmptyString(pkg.professionalReason)) errors.push('professionalReason is required');
  if (!isNonEmptyString(pkg.officialSourceTitle)) errors.push('officialSourceTitle is required');
  if (!isNonEmptyString(pkg.issuingAuthority)) errors.push('issuingAuthority is required');
  if (!isValidHttpsUrl(pkg.exactSourceUrl)) errors.push('exactSourceUrl is required (must be a real https:// URL)');
  if (!isNonEmptyString(pkg.tariffOrStandardReference)) errors.push('tariffOrStandardReference is required');
  if (!isValidDateString(pkg.verificationDate)) errors.push('verificationDate is required (valid ISO date)');
  if (!isValidDateString(pkg.reviewDueDate)) errors.push('reviewDueDate is required (valid ISO date)');
  if (!VALID_REVIEWER_STATUSES.has(pkg.reviewerStatus)) errors.push('reviewerStatus is required (must be a known REVIEWER_STATUS)');
  if (!isKnownStatus(pkg.activeOrDisabledStatus)) errors.push('activeOrDisabledStatus is required (must be a known RULE_STATUS)');
  if (!isNonEmptyString(pkg.publicLimitationWording)) errors.push('publicLimitationWording is required');

  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

/**
 * Adapt a package that has ALREADY passed `validateEvidencePackage`
 * into the exact object shape `matcher.js` / `rule-status.js` expect
 * for a candidate rule (see rules-registry.js's own field-list
 * comment). Deterministic, pure data transformation -- builds real
 * predicate functions from the package's declarative
 * `activationConditions`/`exclusions` condition lists rather than
 * accepting a predicate function directly from the package (so a
 * package can never smuggle in arbitrary trigger logic outside this
 * documented shape).
 *
 * Does NOT itself check the publication gate -- callers must still run
 * the result through `isPubliclyEligible()` (or use
 * `isEligibleForControlledPilot()` below, which does both steps).
 *
 * @param {object} pkg - a package that already passed validateEvidencePackage.
 * @returns {object} a rule-shaped object.
 */
export function toRuleShape(pkg) {
  const conditionsToPredicate = (conditions, mode) => (ctx) => {
    const list = Array.isArray(conditions) ? conditions : [];
    const check = (c) => ctx && ctx.answers && ctx.answers[c.questionId] === c.equals;
    return mode === 'every' ? list.every(check) : list.some(check);
  };

  return Object.freeze({
    id: pkg.ruleId,
    publicTitle: pkg.publicHebrewWording.identification,
    internalCategory: pkg.publicCategory,
    status: pkg.activeOrDisabledStatus,
    triggerPredicate: conditionsToPredicate(pkg.activationConditions, 'every'),
    exclusionPredicate: conditionsToPredicate(pkg.exclusions, 'some'),
    followUpQuestionIds: Object.freeze(pkg.confirmationQuestions.map((q) => q.questionId)),
    primaryExplanation: pkg.publicHebrewWording.identification,
    potentialImplication: pkg.publicHebrewWording.implication,
    verificationItems: Object.freeze([...pkg.verificationItems]),
    professionalCategory: pkg.primaryVerificationProfessional,
    secondaryProfessionalCategory: null,
    professionalReason: pkg.professionalReason,
    confidenceIfMatched: pkg.confidenceIfMatched ?? 'התאמה חלקית',
    operationalImpactPriority: pkg.operationalImpactPriority ?? 99,
    officialSources: Object.freeze([
      Object.freeze({
        title: pkg.officialSourceTitle,
        authority: pkg.issuingAuthority,
        url: pkg.exactSourceUrl,
        dateChecked: pkg.verificationDate,
        tariffOrStandardReference: pkg.tariffOrStandardReference,
      }),
    ]),
    verifiedDate: pkg.verificationDate,
    reviewDueDate: pkg.reviewDueDate,
    ruleVersion: pkg.ruleVersion ?? '0.1.0-evidence-package',
    reviewedBy: pkg.reviewerStatus === REVIEWER_STATUS.PRODUCT_OWNER_REVIEWED ? 'product_owner' : null,
    internalNotes: pkg.internalNotes ?? '',
    publicLimitationText: pkg.publicLimitationWording,
  });
}

/**
 * THE activation gate for the evidence-package intake path. A package
 * may only ever be considered eligible for public matching when:
 *
 *   1. it passes full schema validation (`validateEvidencePackage`), AND
 *   2. its `activeOrDisabledStatus` is exactly `RULE_STATUS.APPROVED_FOR_PILOT`
 *      -- this codebase's existing "approved for controlled pilot"
 *      concept, reused as-is, not a second parallel status system, AND
 *   3. the adapted rule shape itself clears the existing, unmodified
 *      `isPubliclyEligible()` hard gate from `rule-status.js`.
 *
 * Anything else -- disabled, deprecated, professional_review_required,
 * draft, expired, or simply invalid/incomplete -- returns `false` and
 * produces zero public output. This function performs the schema
 * check itself (does not trust a caller to have already validated),
 * so it is safe to call directly on any package from any source.
 *
 * @param {*} pkg
 * @returns {boolean}
 */
export function isEligibleForControlledPilot(pkg) {
  const { valid } = validateEvidencePackage(pkg);
  if (!valid) return false;
  if (pkg.activeOrDisabledStatus !== RULE_STATUS.APPROVED_FOR_PILOT) return false;
  return isPubliclyEligible(toRuleShape(pkg));
}

/**
 * Convenience combinator: given a list of evidence packages, return
 * only the rule-shaped objects for packages that are genuinely
 * eligible for the controlled pilot (schema-valid, explicitly
 * approved, and gate-cleared). Anything not eligible is silently
 * dropped -- never partially included, never included with a warning
 * label instead of being excluded.
 *
 * @param {object[]} packages
 * @returns {object[]} rule-shaped objects, matcher-ready.
 */
export function eligibleRuleShapesFromPackages(packages) {
  const list = Array.isArray(packages) ? packages : [];
  return Object.freeze(
    list.filter((pkg) => isEligibleForControlledPilot(pkg)).map((pkg) => toRuleShape(pkg))
  );
}

/**
 * =====================================================================
 * Product-owner authoring-scaffold extras.
 *
 * These fields are carried on top of the 19 required fields above for
 * every package registered under `evidence-packages/` as an intake
 * scaffold awaiting direct product-owner content entry. They do not
 * replace or duplicate the 19-field schema/gate above -- a scaffold
 * package must still pass `validateEvidencePackage()` and clear
 * `isEligibleForControlledPilot()` before it can ever produce public
 * output, exactly like any other package. These extras exist purely so
 * an authoring scaffold can carry an explicit, machine-checkable
 * "has a human actually authored this yet" marker and a literal
 * authorship-type tag, independent of (and in addition to) the
 * existing `reviewerStatus` workflow field.
 * =====================================================================
 */
export const AUTHORING_SCAFFOLD_EXTRA_FIELDS = Object.freeze([
  'authorityType',
  'productOwnerAuthored',
  'lastProductOwnerReview',
  'internalName',
  'changeNotes',
]);

export const AUTHORITY_TYPE = Object.freeze({
  PRODUCT_OWNER: 'product_owner',
});

/**
 * Validates the authoring-scaffold extra fields ON TOP OF the existing
 * 19-field schema check -- an extension of `validateEvidencePackage`,
 * not a parallel/duplicate validator. A scaffold must pass BOTH this
 * function and `validateEvidencePackage()` before it may ever be
 * considered content-complete; either failing keeps it out of
 * `isEligibleForControlledPilot()` (which already independently re-runs
 * the base 19-field check and the RULE_STATUS gate regardless of what
 * this function reports).
 *
 * @param {*} pkg
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateAuthoringScaffoldExtras(pkg) {
  const errors = [];
  if (pkg === null || typeof pkg !== 'object') {
    return Object.freeze({ valid: false, errors: Object.freeze(['package must be a non-null object']) });
  }
  if (typeof pkg.authorityType !== 'string' || pkg.authorityType !== AUTHORITY_TYPE.PRODUCT_OWNER) {
    errors.push(`authorityType must be exactly "${AUTHORITY_TYPE.PRODUCT_OWNER}"`);
  }
  if (typeof pkg.productOwnerAuthored !== 'boolean') {
    errors.push('productOwnerAuthored is required (boolean)');
  }
  if (pkg.lastProductOwnerReview !== null) {
    const d = new Date(pkg.lastProductOwnerReview);
    if (typeof pkg.lastProductOwnerReview !== 'string' || Number.isNaN(d.getTime())) {
      errors.push('lastProductOwnerReview must be null or a valid ISO date string');
    }
  }
  if (!isNonEmptyString(pkg.internalName)) {
    errors.push('internalName is required (non-empty string)');
  }
  if (!Array.isArray(pkg.changeNotes)) {
    errors.push('changeNotes is required (array, may be empty)');
  }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

/**
 * A scaffold is genuinely content-complete and ready for activation
 * only when it clears the base 19-field schema, the authoring-scaffold
 * extras above, AND has been explicitly marked `productOwnerAuthored:
 * true`. This function performs NO judgment on whether the (future)
 * content is factually correct -- structural completeness and the
 * explicit authorship marker only. Still does not itself flip
 * `activeOrDisabledStatus` -- that remains a deliberate, separate,
 * human step (see each scaffold file's header comment).
 *
 * @param {*} pkg
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateAuthoringScaffoldReadyForReview(pkg) {
  const base = validateEvidencePackage(pkg);
  const extras = validateAuthoringScaffoldExtras(pkg);
  const errors = [...base.errors, ...extras.errors];
  if (pkg && typeof pkg === 'object' && pkg.productOwnerAuthored !== true) {
    errors.push('productOwnerAuthored must be true before this scaffold can be considered content-complete');
  }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

/**
 * Finds duplicate `ruleId`/`id` values across a list of evidence
 * packages and (optionally) a list of already-existing registry rule
 * shapes (e.g. `REGULATORY_SIGNAL_RULES`). An id that is intentionally
 * reused for traceability between a disabled registry candidate and its
 * matching disabled evidence-package scaffold (see each scaffold
 * file's header comment) is NOT reported here as a duplicate -- this
 * function only flags an id that repeats WITHIN the `packages` list
 * itself, which would always be a genuine authoring mistake.
 *
 * @param {object[]} packages
 * @returns {string[]} any `ruleId` value that appears more than once within `packages`.
 */
export function findDuplicateRuleIdsWithinPackages(packages) {
  const list = Array.isArray(packages) ? packages : [];
  const seen = new Map();
  for (const pkg of list) {
    const id = pkg && typeof pkg === 'object' ? pkg.ruleId : undefined;
    if (typeof id !== 'string' || id.length === 0) continue;
    seen.set(id, (seen.get(id) ?? 0) + 1);
  }
  return Object.freeze([...seen.entries()].filter(([, count]) => count > 1).map(([id]) => id));
}

/**
 * Review-state model and the hard publication gate for the Product
 * Regulatory Signals pilot rule engine.
 *
 * Knowledge-basis model (product-owner-directed redesign): FreighTime's
 * product owner is a qualified customs professional and is the
 * professional author/reviewer of pilot rule content. External official
 * sources remain valuable *optional* supporting evidence, but they are
 * not a mandatory technical precondition for a rule to be authored,
 * reviewed, or approved for controlled-pilot use. A rule is data ONLY --
 * it can carry any trigger conditions, any wording, any confidence
 * label. Whether it is ever allowed to reach a user is decided in
 * exactly one place: `isPubliclyEligible()` below. No rendering code,
 * no matcher branch, and no rule content field may substitute for this
 * check. This is the literal code-level gate required by the pilot
 * spec -- not a naming convention.
 *
 * Pure, deterministic, DOM-free, network-free, storage-free.
 */

export const RULE_STATUS = Object.freeze({
  /** Professional rule content exists (product-owner-authored) but has
   * not yet been deliberately approved for public pilot use. Never
   * public. */
  EXPERT_AUTHORED: 'expert_authored',
  /** The product owner has explicitly reviewed and approved this rule's
   * trigger, exclusions, questions, public wording, verification items,
   * and professional route for a controlled pilot. May produce a public
   * preliminary operational signal. An official source is NOT required
   * for this status. */
  EXPERT_APPROVED_FOR_PILOT: 'expert_approved_for_pilot',
  /** Same bar as EXPERT_APPROVED_FOR_PILOT, plus the rule also carries
   * an official supporting reference. May produce a public signal. This
   * status does not make the result binding or final -- it only means
   * an official reference is attached as optional supporting evidence. */
  OFFICIAL_SOURCE_SUPPORTED: 'official_source_supported',
  /** The rule has gone stale relative to its own review-due date and
   * requires professional re-review. Must never produce a current
   * high-confidence signal. */
  REVIEW_DUE: 'review_due',
  /** Never public, regardless of any other field. Does not ask
   * questions, does not affect confidence, does not affect routing. */
  DISABLED: 'disabled',
});

/** Statuses that may ever produce a public signal. Exactly these two --
 * nothing else, ever. */
const PUBLICLY_ELIGIBLE_STATUSES = new Set([
  RULE_STATUS.EXPERT_APPROVED_FOR_PILOT,
  RULE_STATUS.OFFICIAL_SOURCE_SUPPORTED,
]);

const VALID_STATUSES = new Set(Object.values(RULE_STATUS));

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidDateString(value) {
  if (!isNonEmptyString(value)) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

function hasCompleteOfficialSources(rule) {
  if (!Array.isArray(rule.officialSources) || rule.officialSources.length === 0) return false;
  for (const source of rule.officialSources) {
    if (!source || typeof source !== 'object') return false;
    if (!isNonEmptyString(source.title) || !isNonEmptyString(source.authority) || !isNonEmptyString(source.url)) {
      return false;
    }
  }
  return true;
}

/**
 * Hard gate: only a rule whose status is exactly `expert_approved_for_pilot`
 * or `official_source_supported`, carrying a professional-reviewed date,
 * a review-due date, explicit exclusions, a professional verification
 * route, and safe public limitation wording, may ever be considered for
 * public matching -- regardless of what conditions it claims to trigger
 * on. An official source is required ONLY for `official_source_supported`;
 * it is explicitly NOT required for `expert_approved_for_pilot`. Called
 * by the matcher before any trigger/exclusion logic runs, and re-checked
 * here defensively even if a caller forgets to check it first.
 *
 * @param {*} rule
 * @returns {boolean}
 */
export function isPubliclyEligible(rule) {
  if (rule === null || typeof rule !== 'object') return false;
  if (!PUBLICLY_ELIGIBLE_STATUSES.has(rule.status)) return false;
  if (!isValidDateString(rule.verifiedDate)) return false;
  if (!isValidDateString(rule.reviewDueDate)) return false;
  if (!isNonEmptyString(rule.professionalCategory)) return false;
  if (!isNonEmptyString(rule.publicLimitationText)) return false;
  if (!isNonEmptyString(rule.publicTitle)) return false;
  if (!isNonEmptyString(rule.primaryExplanation)) return false;
  if (!isNonEmptyString(rule.potentialImplication)) return false;
  if (typeof rule.exclusionPredicate !== 'function') return false;
  if (rule.status === RULE_STATUS.OFFICIAL_SOURCE_SUPPORTED && !hasCompleteOfficialSources(rule)) return false;
  return true;
}

/**
 * Whether an otherwise-eligible rule's professional review has gone
 * stale relative to `now` (an injectable clock for testability -- never
 * a bare `new Date()` call inside matching logic). A stale rule must
 * never be presented as current/high-confidence: the matcher downgrades
 * its label and swaps in a "needs professional re-review" note rather
 * than silently continuing to claim currency. This is a
 * professional-review-freshness concept, not an official-source-expiry
 * concept -- it applies identically whether or not the rule happens to
 * also carry an optional official source.
 *
 * @param {*} rule
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isStale(rule, now = new Date()) {
  if (rule === null || typeof rule !== 'object') return true;
  if (!isValidDateString(rule.reviewDueDate)) return true;
  const clock = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  return clock.getTime() > new Date(rule.reviewDueDate).getTime();
}

/** Centralized professional-review interval used when computing a
 * `reviewDueDate` from a `verifiedDate` for a newly-approved rule -- 6
 * months, a conservative period appropriate to a static, unbuilt site
 * with no automated re-crawling, and to professional knowledge that
 * itself needs periodic re-confirmation regardless of any external
 * source's own freshness. */
const REVIEW_PERIOD_MONTHS = 6;

/**
 * Compute a review-due date `REVIEW_PERIOD_MONTHS` after a verified
 * date. Pure date arithmetic, no clock access.
 * @param {string} verifiedDateStr - ISO date string (YYYY-MM-DD).
 * @returns {string} ISO date string.
 */
export function computeReviewDueDate(verifiedDateStr) {
  const d = new Date(verifiedDateStr);
  if (Number.isNaN(d.getTime())) return '';
  d.setMonth(d.getMonth() + REVIEW_PERIOD_MONTHS);
  return d.toISOString().slice(0, 10);
}

function isKnownStatus(status) {
  return VALID_STATUSES.has(status);
}

export function isPubliclyEligibleStatus(status) {
  return PUBLICLY_ELIGIBLE_STATUSES.has(status);
}

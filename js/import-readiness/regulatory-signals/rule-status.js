/**
 * Review-state model and the hard publication gate for the Product
 * Regulatory Signals pilot rule engine.
 *
 * A rule is data ONLY -- it can carry any trigger conditions, any
 * wording, any confidence label. Whether it is ever allowed to reach a
 * user is decided in exactly one place: `isPubliclyEligible()` below.
 * No rendering code, no matcher branch, and no rule content field may
 * substitute for this check. This is the literal code-level gate
 * required by the pilot spec -- not a naming convention.
 *
 * Pure, deterministic, DOM-free, network-free, storage-free.
 */

export const RULE_STATUS = Object.freeze({
  DRAFT: 'draft',
  SOURCE_VERIFIED: 'source_verified',
  PROFESSIONAL_REVIEW_REQUIRED: 'professional_review_required',
  APPROVED_FOR_PILOT: 'approved_for_pilot',
  EXPIRED: 'expired',
  DISABLED: 'disabled',
});

const VALID_STATUSES = new Set(Object.values(RULE_STATUS));

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidDateString(value) {
  if (!isNonEmptyString(value)) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

/**
 * Hard gate: only a rule whose status is exactly `approved_for_pilot`,
 * carrying a verified date, a review-due date, and at least one real
 * official source, may ever be considered for public matching --
 * regardless of what conditions it claims to trigger on. Called by the
 * matcher before any trigger/exclusion logic runs, and re-checked here
 * defensively even if a caller forgets to check it first.
 *
 * @param {*} rule
 * @returns {boolean}
 */
export function isPubliclyEligible(rule) {
  if (rule === null || typeof rule !== 'object') return false;
  if (rule.status !== RULE_STATUS.APPROVED_FOR_PILOT) return false;
  if (!isValidDateString(rule.verifiedDate)) return false;
  if (!isValidDateString(rule.reviewDueDate)) return false;
  if (!Array.isArray(rule.officialSources) || rule.officialSources.length === 0) return false;
  for (const source of rule.officialSources) {
    if (!source || typeof source !== 'object') return false;
    if (!isNonEmptyString(source.title) || !isNonEmptyString(source.authority) || !isNonEmptyString(source.url)) {
      return false;
    }
  }
  if (!isNonEmptyString(rule.professionalCategory)) return false;
  if (!isNonEmptyString(rule.publicLimitationText)) return false;
  return true;
}

/**
 * Whether an otherwise-eligible rule's evidence has gone stale relative
 * to `now` (an injectable clock for testability -- never a bare
 * `new Date()` call inside matching logic). A stale rule must never be
 * presented as current/high-confidence: the matcher downgrades its
 * label and swaps in a "source needs re-verification" note rather than
 * silently continuing to claim currency.
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

/** Review period used when computing a `reviewDueDate` from a `verifiedDate` for a newly-approved rule -- 6 months, a conservative period appropriate to a static, unbuilt site with no automated re-crawling. */
export const REVIEW_PERIOD_MONTHS = 6;

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

export function isKnownStatus(status) {
  return VALID_STATUSES.has(status);
}

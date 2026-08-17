/**
 * Deterministic, gate-enforced matcher for the Product Regulatory
 * Signals pilot. No AI, no scoring heuristics -- every rule either
 * clears the hard publication gate and its own trigger/exclusion
 * predicates, or it contributes nothing to the output. Free text alone
 * (`hintedCategories`) can only ever *offer* a follow-up question; it
 * can never itself satisfy a trigger.
 *
 * Pure, deterministic, DOM-free, network-free, storage-free.
 */

import { isPubliclyEligible, isStale } from './rule-status.js';
import { CONFIDENCE } from './confidence.js';
import { PROFESSIONAL_CATEGORY, professionalReferral, jointReferral } from '../professional-category-registry.js';

const MAX_SIGNALS = 3;

const NO_MATCH_MESSAGE =
  'לא זוהה כיוון בדיקה מקצועי במאגר המצומצם שנבדק.';
const NO_MATCH_NOT_EXEMPT_NOTE =
  'אין בכך אישור שהמוצר פטור מדרישות יבוא.';

/** Shared public framing for every signal card, regardless of which
 * rule matched -- one consistent status label and one consistent short
 * limitation sentence, so the user never has to parse per-rule legal
 * phrasing. The longer, once-only expanded limitation lives in
 * `EXPANDED_LIMITATION_TEXT` and is surfaced exactly once per result by
 * the caller (never repeated per signal card). */
export const SIGNAL_STATUS_LABEL = 'כיוון בדיקה מקצועי';
export const SHORT_LIMITATION_TEXT =
  'התוצאה היא כיוון בדיקה ראשוני ואינה מהווה סיווג מכס או אישור יבוא.';
export const EXPANDED_LIMITATION_TEXT =
  'התוצאה מבוססת על מאפייני המוצר ועל כללים מקצועיים שהוגדרו במערכת. היא נועדה לסייע בזיהוי נושאים שכדאי לבדוק לפני היבוא ואינה מהווה סיווג מכס, אישור תקן או החלטת רשות מוסמכת.';

const STALE_NOTE = 'נדרש עדכון מקצועי של הכלל.';

function resolveProfessional(rule) {
  const primary = PROFESSIONAL_CATEGORY[rule.professionalCategory] ?? null;
  const secondary = rule.secondaryProfessionalCategory ? PROFESSIONAL_CATEGORY[rule.secondaryProfessionalCategory] : null;
  if (primary && secondary) {
    return jointReferral(primary, secondary, rule.professionalReason);
  }
  if (primary) {
    return professionalReferral(primary, rule.professionalReason);
  }
  return Object.freeze({ type: '', reason: rule.professionalReason ?? '', ctaLabel: '' });
}

function formatCheckedDate(dateStr) {
  if (typeof dateStr !== 'string' || dateStr.length === 0) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

/**
 * Build one public signal card from an eligible, matched rule. Concise
 * by design: identification sentence, implication sentence, up to 3
 * verification items, one professional action, one word-confidence
 * label, one limitation line -- plus a collapsed-detail payload for
 * the "why" disclosure. Never includes the rule's internal notes.
 */
function buildSignalCard(rule, { stale }) {
  const confidence = stale ? CONFIDENCE.MORE_INFO_NEEDED : rule.confidenceIfMatched;
  return Object.freeze({
    ruleId: rule.id, // internal only -- never rendered in public UI
    statusLabel: SIGNAL_STATUS_LABEL,
    title: rule.publicTitle,
    identification: rule.primaryExplanation,
    implication: rule.potentialImplication,
    verificationItems: Object.freeze((rule.verificationItems ?? []).slice(0, 3)),
    professional: resolveProfessional(rule),
    confidence,
    limitation: SHORT_LIMITATION_TEXT,
    priority: rule.operationalImpactPriority ?? 99,
    details: Object.freeze({
      detectedCharacteristic: rule.primaryExplanation,
      regulatoryArea: rule.publicTitle,
      officialSourceNames: Object.freeze((rule.officialSources ?? []).map((s) => `${s.title} (${s.authority})`)),
      verifiedLabel: stale
        ? STALE_NOTE
        : `נבדק לאחרונה: ${formatCheckedDate(rule.verifiedDate)}`,
      whyVerificationStillMatters: 'המידע במאגר הוא סימון ראשוני בלבד; רק בדיקה מול הגורם המקצועי והמקור הרשמי המעודכן קובעת את הדרישה בפועל.',
    }),
  });
}

/**
 * @param {{
 *   freeTextAnswers?: string[],
 *   sensitiveCategoryHint?: string|null,
 *   answers?: Record<string, string>,
 *   now?: Date,
 *   rules?: object[],
 * }} params
 * @returns {Readonly<{
 *   hintedCategories: string[],
 *   relevantQuestionIds: string[],
 *   signals: object[],
 *   extraSignalCount: number,
 *   hasAnyHint: boolean,
 *   noMatchMessage: string|null,
 *   noMatchNotExemptNote: string|null,
 * }>}
 */
export function matchRegulatorySignals(params, hintedCategories, rules) {
  const p = params !== null && typeof params === 'object' ? params : {};
  const now = p.now instanceof Date ? p.now : new Date();
  const answers = p.answers !== null && typeof p.answers === 'object' ? p.answers : {};
  const categories = hintedCategories instanceof Set ? hintedCategories : new Set();
  const allRules = Array.isArray(rules) ? rules : [];

  const ctx = { answers };
  const candidateRules = allRules.filter((r) => categories.has(r.internalCategory));

  const matched = [];
  for (const rule of candidateRules) {
    // HARD GATE -- checked first and unconditionally, before any
    // trigger/exclusion logic runs. A rule that fails this can never
    // reach the output list below, no matter what its predicates say.
    if (!isPubliclyEligible(rule)) continue;
    if (typeof rule.triggerPredicate !== 'function' || !rule.triggerPredicate(ctx)) continue;
    if (typeof rule.exclusionPredicate === 'function' && rule.exclusionPredicate(ctx)) continue;
    matched.push(buildSignalCard(rule, { stale: isStale(rule, now) }));
  }

  matched.sort((a, b) => a.priority - b.priority);
  const signals = matched.slice(0, MAX_SIGNALS);
  const extraSignalCount = Math.max(0, matched.length - MAX_SIGNALS);

  const relevantQuestionIds = [...categories]
    .flatMap((cat) => allRules.filter((r) => r.internalCategory === cat).flatMap((r) => r.followUpQuestionIds ?? []));

  return Object.freeze({
    hintedCategories: Object.freeze([...categories]),
    relevantQuestionIds: Object.freeze([...new Set(relevantQuestionIds)]),
    signals: Object.freeze(signals),
    extraSignalCount,
    hasAnyHint: categories.size > 0,
    noMatchMessage: categories.size > 0 && signals.length === 0 ? NO_MATCH_MESSAGE : null,
    noMatchNotExemptNote: categories.size > 0 && signals.length === 0 ? NO_MATCH_NOT_EXEMPT_NOTE : null,
  });
}

export { NO_MATCH_MESSAGE, NO_MATCH_NOT_EXEMPT_NOTE, MAX_SIGNALS };

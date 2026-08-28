/**
 * Generic multi-signal presentation mechanics for the Import Readiness
 * result.
 *
 * Takes a list of already-gate-cleared, already-built "signal card"
 * objects (the shape produced by regulatory-signals/matcher.js's
 * `buildSignalCard`, capped at 3 with the remainder reported as
 * `extraSignalCount`) and derives the presentation-layer view: up to 3
 * primary cards, an `additionalCount` for a collapsed area, and a
 * deduplicated, priority-ordered list of shared verification items
 * (the closest thing signals have to "recommended documents") so the
 * same item is never listed twice across cards.
 *
 * NOT WIRED INTO THE CURRENT RUNTIME. This module carries no rule
 * content of its own and asserts nothing about any product category --
 * it is a pure re-shaping function over whatever signals the matcher
 * decided are publicly eligible. import-readiness-controller.js
 * already handles the multi-signal case, but with its own simpler,
 * deliberately chosen presentation: one fully-expanded primary card
 * plus a compact one-line-each list for any additional matched signals
 * -- never a second fully-expanded card, per the product's
 * "no information overload" requirement (see
 * `canonicalFromDetailedSignal()` in import-readiness-controller.js).
 * This module's fuller layout (up to 3 primary cards plus a collapsed
 * "additionalCount" area) was built for a richer presentation the
 * product never actually adopted. It is kept future-ready, not
 * speculative dead code: if a future product decision favors that
 * fuller layout over the current one-card-plus-list approach, this is
 * the module to wire in rather than re-deriving the same dedup/cap/
 * priority logic inline. It must not be imported into the controller
 * without an actual product decision driving that -- its tests
 * exercise it directly with synthetic signal-shaped objects to prove
 * the mechanism itself works, independent of the controller.
 *
 * Pure, deterministic, DOM-free, network-free, storage-free.
 */

const MAX_PRIMARY = 3;

function isSignalLike(value) {
  return value !== null && typeof value === 'object' && typeof value.ruleId === 'string' && value.ruleId.length > 0;
}

/**
 * @param {object[]} signals - already gate-cleared signal cards, any
 *   order (will be re-sorted by `priority`, lower first).
 * @returns {Readonly<{
 *   primary: object[],
 *   additionalCount: number,
 *   dedupedVerificationItems: string[],
 * }>}
 */
export function presentSignals(signals) {
  const list = Array.isArray(signals) ? signals.filter(isSignalLike) : [];
  const sorted = [...list].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));

  const primary = sorted.slice(0, MAX_PRIMARY);
  const additionalCount = Math.max(0, sorted.length - MAX_PRIMARY);

  const seen = new Set();
  const dedupedVerificationItems = [];
  for (const signal of primary) {
    const items = Array.isArray(signal.verificationItems) ? signal.verificationItems : [];
    for (const item of items) {
      if (typeof item !== 'string' || item.length === 0) continue;
      if (seen.has(item)) continue;
      seen.add(item);
      dedupedVerificationItems.push(item);
    }
  }

  return Object.freeze({
    primary: Object.freeze(primary),
    additionalCount,
    dedupedVerificationItems: Object.freeze(dedupedVerificationItems),
  });
}

export { MAX_PRIMARY };

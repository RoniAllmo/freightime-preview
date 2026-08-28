/**
 * Regression guard against absolute regulatory claims. Scans any set of
 * shipped user-facing strings for the exact class of wording the pilot
 * must never produce -- unconditional obligation/exemption/approval
 * claims that this static preview site cannot actually make.
 *
 * TEST-ONLY UTILITY, INTENTIONALLY NOT IMPORTED BY RUNTIME CODE. This
 * module exists to be called from test files (see
 * regulatory-signal-candidates-remain-disabled.test.js and the other
 * safety-boundary test suites) that scan the actual shipped rule
 * content for banned wording -- it is a static-analysis check that
 * runs at test time, not a runtime filter that could reject or alter
 * live user-facing content. It must not be imported into
 * import-readiness-controller.js or any other production module; doing
 * so would not add a real safety guarantee (the rule content it checks
 * is already fixed, expert-authored, and covered by this same scan in
 * CI) and would only add DOM-path cost for no behavioral benefit.
 *
 * Pure string matching. No DOM, no network.
 */

// Hebrew letters are not `\w` in JS regex, so plain `\b` boundaries do
// not work reliably around Hebrew words (a boundary needs one word and
// one non-word side; two adjacent Hebrew letters are both "non-word"
// to the engine, so `\b` silently fails to fire between them). Every
// pattern below either avoids trailing `\b` entirely or uses an
// explicit negative lookbehind against the Hebrew alphabet range so a
// prefixed word (e.g. "שהמוצר") is correctly excluded from matching
// "המוצר" as its own token -- this is what lets the mandated SAFE
// no-exemption wording ("אין בכך אישור שהמוצר פטור מדרישות יבוא")
// avoid tripping the "המוצר פטור מ..." absolute-exemption pattern.
const HEB = 'א-ת';

const BANNED_PATTERNS = Object.freeze([
  // "any product with electrical wiring MUST have standards approval"
  /כל\s+מוצר[^.]{0,40}(חייב|מחייב)/,
  // "the product is exempt from approval" -- NOT when it's the negated
  // "there is no confirmation that the product is exempt" safe phrasing.
  new RegExp(`(?<![${HEB}])המוצר\\s+פטור\\s+מ`),
  // "no standard applies"
  /לא\s+נדרש\s+תקן/,
  // "the import is approved"
  /היבוא\s+מאושר/,
  // "the classification is ..."
  /הסיווג\s+הוא/,
  // "the applicable standard is certainly ..."
  /התקן\s+החל\s+הוא\s+בוודאות/,
  // generic absolute certainty markers paired with an obligation/approval word
  /בוודאות\s+(חייב|מאושר|פטור|נדרש)/,
  // "no approval is required" -- NOT the negated "there is no confirmation
  // that the product doesn't require approval" safe phrasing.
  new RegExp(`(?<![${HEB}])אינו\\s+דורש\\s+אישור`),
  /היבוא\s+מותר\s+ללא/,
]);

/**
 * @param {string[]} strings - shipped user-facing strings to scan.
 * @returns {{ ok: boolean, violations: Array<{ text: string, pattern: string }> }}
 */
export function scanForBannedAbsoluteClaims(strings) {
  const list = Array.isArray(strings) ? strings : [];
  const violations = [];
  for (const text of list) {
    if (typeof text !== 'string' || text.length === 0) continue;
    for (const pattern of BANNED_PATTERNS) {
      if (pattern.test(text)) {
        violations.push({ text, pattern: pattern.source });
      }
    }
  }
  return Object.freeze({ ok: violations.length === 0, violations: Object.freeze(violations) });
}

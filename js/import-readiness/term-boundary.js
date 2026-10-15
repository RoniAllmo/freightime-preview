/**
 * Shared word-boundary, negation and modifier helpers for free-text
 * term matching (Short Alias guards, product-owner decisions D1-D6,
 * 2026-10-15).
 *
 * The whole-word and negation helpers were moved here unchanged from
 * the presentation-only suggestion layer (family-material-disclosure.js),
 * so that layer and the real identification layer
 * (product-family-identification.js) share one implementation instead
 * of two drifting copies. The presentation layer's behavior is
 * unchanged.
 *
 * New here: `containsShortTerm`, the guard for SHORT terms only. Plain
 * substring matching stays the rule for every longer term -- it is what
 * lets an inflected or plural form match today, and the long aliases
 * have been reviewed for collisions. A short term is different: as a
 * bare substring it fires inside unrelated words ("rug" inside
 * "drugs", "בשר" inside "בשרשרת", "רכב" inside "הרכבה"), which routed
 * a medicine to the carpets family and a jewelry chain to the
 * animal-origin food family. These guards replace the pattern of
 * adding ever more negative terms for such collisions; they add no
 * negative term of their own.
 *
 * Pure, deterministic, DOM-free, network-free, storage-free.
 */

/**
 * Standard single-letter Hebrew prefix particles ("מ"=from/made-of,
 * "ב"=in, "ל"=to, "ו"=and, "ה"=the, "כ"=as/when, "ש"=that) -- ordinary
 * Hebrew morphology attaches these directly to the following word with
 * no space (e.g. "מטקסטיל" = "made of textile"). A trailing-edge word
 * boundary is still required unconditionally; only the leading edge
 * tolerates exactly one of these letters immediately preceded by a
 * real boundary, so "טקסטיל" is still recognized inside "מטקסטיל" --
 * this must keep working, since PR #63's own tent/textile matching
 * already relies on it (see product-family-matrix.js's "טקסטיל" alias
 * and the "אוהל מטקסטיל" scenario).
 */
export const HEBREW_PREFIX_LETTERS = 'מבלוהכש';

/**
 * Whole-word/whole-phrase containment, not a plain substring check.
 * Both the presentation hint registry's short positive terms ("tent",
 * colliding with "content"/"extent"/"tentative") and the whole-word
 * re-check in suggestProductFamilyValues (the furniture alias "table",
 * colliding with "suitable"/"tablets") need the term to appear as its
 * own word, not embedded inside an unrelated longer one --
 * code-review-caught in both cases. `haystack` and `term` are already
 * normalizeHebrewSearchText()-normalized to single-spaced, trimmed
 * text before this is called.
 */
export function haystackContainsWholeTerm(haystack, term) {
  if (term.length === 0) return false;
  const padded = ` ${haystack} `;
  let searchFrom = 0;
  while (true) {
    const index = padded.indexOf(term, searchFrom);
    if (index === -1) return false;
    const before = padded[index - 1];
    const after = padded[index + term.length];
    const trailingBoundary = after === ' ';
    const leadingBoundary = before === ' '
      || (HEBREW_PREFIX_LETTERS.includes(before) && padded[index - 2] === ' ');
    if (trailingBoundary && leadingBoundary) return true;
    searchFrom = index + 1;
  }
}

/**
 * Bounded, deterministic explicit-negation support. Not a
 * natural-language parser: a positive-term match is treated as negated
 * only when one of the fixed negation-marker phrases below appears in
 * the short run of words immediately before the match, with the search
 * stopped as soon as a "reconnector" word (עם/with, which re-asserts a
 * positive relationship) or the start of the text is reached. This
 * keeps negation strictly local to the term it precedes -- "מכונת
 * גילוח ללא כבל עם סוללה נטענת" ("shaver without a cable, with a
 * rechargeable battery") negates only "כבל", never "סוללה", because the
 * intervening "עם" resets the window before "ללא" is reached.
 */
export const NEGATION_MARKER_PHRASES = Object.freeze([
  'ללא', 'בלי', 'אינו כולל', 'אינה כוללת', 'לא כולל', 'לא כוללת',
  'without', 'no', 'does not include', 'not included',
]);
export const NEGATION_RECONNECTOR_TOKENS = Object.freeze(['עם', 'with']);
const NEGATION_WINDOW_TOKENS = 6;

function windowContainsNegationMarker(windowTokens) {
  return NEGATION_MARKER_PHRASES.some((marker) => (
    marker.includes(' ') ? windowTokens.join(' ').includes(marker) : windowTokens.includes(marker)
  ));
}

/**
 * @param {string} paddedHaystack - space-padded haystack (see
 *   haystackContainsWholeTerm), already normalized/lowercased.
 * @param {number} matchIndex - index (in `paddedHaystack`) of the start
 *   of a term match.
 */
export function isMatchNegated(paddedHaystack, matchIndex) {
  const tokens = paddedHaystack.slice(0, matchIndex).split(' ').filter(Boolean);
  const windowTokens = [];
  for (let i = tokens.length - 1; i >= 0 && windowTokens.length < NEGATION_WINDOW_TOKENS; i--) {
    if (NEGATION_RECONNECTOR_TOKENS.includes(tokens[i])) break;
    windowTokens.unshift(tokens[i]);
  }
  return windowContainsNegationMarker(windowTokens);
}

/**
 * Same whole-word/phrase boundary rules as haystackContainsWholeTerm,
 * but a match immediately preceded (within the bounded window above) by
 * an explicit negation marker does not count as positive evidence.
 * Used for presentation-suggestion positive-term checks
 * (PRESENTATION_ALIAS_SUPPLEMENTS / PRESENTATION_CONCEPT_HINTS) -- never
 * for negativeTerms exclusion checks (those stay exactly as strict as
 * before).
 */
export function haystackContainsPositiveTerm(haystack, term) {
  if (term.length === 0) return false;
  // A term whose own first word IS a reconnector ("עם סוללה", "with
  // battery") already explicitly reasserts a positive relationship --
  // never subject to the preceding-negation check (which only exists to
  // catch a negation marker immediately before the term's own start).
  const termStartsWithReconnector = NEGATION_RECONNECTOR_TOKENS.some((token) => term === token || term.startsWith(`${token} `));
  const padded = ` ${haystack} `;
  let searchFrom = 0;
  while (true) {
    const index = padded.indexOf(term, searchFrom);
    if (index === -1) return false;
    const before = padded[index - 1];
    const after = padded[index + term.length];
    const trailingBoundary = after === ' ';
    const leadingBoundary = before === ' '
      || (HEBREW_PREFIX_LETTERS.includes(before) && padded[index - 2] === ' ');
    if (trailingBoundary && leadingBoundary && (termStartsWithReconnector || !isMatchNegated(padded, index))) return true;
    searchFrom = index + 1;
  }
}

// -- Short-term guard (D2-D4, D6) --

const HEBREW_LETTER = /[א-ת]/;

/**
 * A short term is a single word of at most 4 Hebrew letters or at most
 * 5 Latin characters (product-owner threshold, D2). `term` is already
 * normalized and lowercased; anything with a space is a phrase, never
 * short.
 */
export function isShortTerm(term) {
  if (typeof term !== 'string' || term.length === 0 || term.includes(' ')) return false;
  return HEBREW_LETTER.test(term) ? term.length <= 4 : term.length <= 5;
}

/**
 * Food-derivative modifiers (D4): a short term right after a Hebrew
 * modifier ("בטעם בשר", meat-flavored; "בניחוח דבש", honey-scented),
 * optionally with "של" between them, or right before an English one
 * ("honey scented" -- normalization already turns "honey-scented" into
 * two words), describes a flavor or scent, not the product itself.
 * Deliberately tiny and hardcoded; never a general negative-term list.
 */
export const HEBREW_MODIFIER_PREFIXES = Object.freeze(['בטעם', 'בניחוח']);
export const ENGLISH_MODIFIER_SUFFIXES = Object.freeze(['flavored', 'scented']);
const MODIFIER_LINK_TOKEN = 'של';

function isModifiedOccurrence(padded, wordStart, wordEnd) {
  const tokensBefore = padded.slice(0, wordStart).split(' ').filter(Boolean);
  const last = tokensBefore[tokensBefore.length - 1];
  const secondLast = tokensBefore[tokensBefore.length - 2];
  if (HEBREW_MODIFIER_PREFIXES.includes(last)) return true;
  if (last === MODIFIER_LINK_TOKEN && HEBREW_MODIFIER_PREFIXES.includes(secondLast)) return true;
  const next = padded.slice(wordEnd).split(' ').filter(Boolean)[0];
  return ENGLISH_MODIFIER_SUFFIXES.includes(next);
}

const WORD_JOINERS = /[/\\|+&]/g;

/** English plural endings accepted after a short Latin term in whole-word mode ("rugs", "chairs", "shoes"). */
const LATIN_PLURAL_SUFFIXES = Object.freeze(['s', 'es']);

/**
 * Guarded match for one SHORT term (see isShortTerm). A match counts
 * only when all of these hold:
 *  - leading edge: a word start, or one Hebrew prefix letter at a word
 *    start (same rule as haystackContainsWholeTerm);
 *  - trailing edge: a word end -- or, for a Latin term, an English
 *    plural ending then a word end; with `wordStart: true` (a
 *    product-owner-approved stem, D2) the word may simply continue;
 *  - not negated (D3, same bounded window as haystackContainsPositiveTerm);
 *  - not a flavor/scent modifier's object (D4).
 * `forms` lists explicit inflected forms (e.g. Hebrew plurals) that
 * count as the same term; each is matched by the same rules.
 *
 * @param {string} haystack - normalized, lowercased, single-spaced text.
 * @param {string} term - normalized, lowercased short term.
 * @param {{ wordStart?: boolean, forms?: string[] }} [options]
 */
export function containsShortTerm(haystack, term, options = {}) {
  const wordStart = options.wordStart === true;
  const forms = Array.isArray(options.forms) ? options.forms : [];
  // Slash-like joiners ("כיסא/ספה", "AC/DC") separate words here too;
  // same length, so every index below stays valid.
  const padded = ` ${haystack.replace(WORD_JOINERS, ' ')} `;
  for (const candidate of [term, ...forms]) {
    if (typeof candidate !== 'string' || candidate.length === 0) continue;
    const latin = !HEBREW_LETTER.test(candidate);
    let searchFrom = 0;
    while (true) {
      const index = padded.indexOf(candidate, searchFrom);
      if (index === -1) break;
      searchFrom = index + 1;
      const before = padded[index - 1];
      const atWordStart = before === ' ';
      const afterPrefix = HEBREW_PREFIX_LETTERS.includes(before) && padded[index - 2] === ' ';
      if (!atWordStart && !afterPrefix) continue;
      const end = index + candidate.length;
      let wordEnd = -1;
      if (wordStart) {
        wordEnd = padded.indexOf(' ', end);
      } else if (padded[end] === ' ') {
        wordEnd = end;
      } else if (latin) {
        const suffix = LATIN_PLURAL_SUFFIXES.find((s) => padded.startsWith(`${s} `, end));
        if (suffix) wordEnd = end + suffix.length;
      }
      if (wordEnd === -1) continue;
      const wordStartIndex = atWordStart ? index : index - 1;
      if (isMatchNegated(padded, wordStartIndex)) continue;
      if (isModifiedOccurrence(padded, wordStartIndex, wordEnd)) continue;
      return true;
    }
  }
  return false;
}

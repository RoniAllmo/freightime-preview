/**
 * Centralized presentation-layer document deduplication.
 *
 * Suppresses a canonical "commonly useful document" suggestion
 * (document-readiness.js's COMMONLY_RELEVANT_DOCUMENTS) when the exact
 * same document has already been mentioned, under different free-text
 * wording, in higher-precedence result content -- a route-specific
 * preparation checklist, a recommended action, an immediate-action
 * item. This is the one place that decision is made; callers never
 * implement their own overlap check.
 *
 * Deliberately conservative: matches only the explicit, reviewed alias
 * list below (never broad fuzzy/similarity scoring, never "shares one
 * word"). A document with no alias entry here is never suppressed,
 * regardless of how similar its wording looks to something else --
 * distinct documents (e.g. a technical specification vs. a catalogue,
 * a certificate of origin vs. a manufacturer declaration, a damage
 * photograph vs. a survey report) are preserved as separate items.
 *
 * Pure, deterministic, DOM-free, network-free, storage-free.
 */

/**
 * Reviewed equivalence map: canonical document id (from
 * document-readiness.js) -> free-text phrases that name the exact same
 * document elsewhere in a result. Each entry was checked by hand
 * against a live duplication case; this list is not meant to be
 * exhaustive or grown by pattern-matching -- add an entry only when a
 * genuine duplicate has been confirmed.
 */
const DOCUMENT_ALIAS_PATTERNS = Object.freeze({
  // 'חשבונית ספק' (existing-importer-rules.js's own preparation-item
  // wording) was confirmed NOT to be a substring match against the
  // canonical 'חשבון ספק' alias -- Hebrew's word-final letter form
  // ("ן", used in חשבון) differs from its mid-word form ("נ", used in
  // חשבונית), so the two phrases never literally overlap even though
  // they name the same document. Added as its own alias, alongside the
  // matching English variant, so the canonical supplier_invoice
  // suggestion is correctly suppressed against that route's own item
  // instead of rendering as a second, differently-worded invoice line.
  supplier_invoice: ['חשבון ספק', 'חשבונית ספק', 'חשבון מסחרי', 'חשבונית מסחרית', 'commercial invoice', 'supplier invoice'],
  packing_list: ['packing list', 'רשימת אריזה'],
  technical_spec: ['מפרט טכני'],
  certificate_of_origin: ['תעודת מקור'],
  product_photos: ['תמונות מוצר', 'תמונות של המוצר'],
  label_photo: ['תמונת תווית', 'תמונת התווית'],
});

function normalize(text) {
  return String(text).toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * @param {Array<{id:string,label:string}>} candidateDocs - documents
 *   eligible for suggestion (e.g. document-readiness.js's
 *   `worthObtaining`).
 * @param {string} alreadyShownText - free text already rendered
 *   elsewhere in this same result, at equal or higher precedence than
 *   the candidate list (e.g. the preparation checklist, the primary
 *   action, immediate-action items), joined into one string.
 * @returns {Array<{id:string,label:string}>} the candidates that are
 *   not already covered by `alreadyShownText`, in their original order.
 */
export function dedupeDocumentsAgainstText(candidateDocs, alreadyShownText) {
  const docs = Array.isArray(candidateDocs) ? candidateDocs : [];
  const haystack = normalize(alreadyShownText || '');
  if (!haystack) return docs;
  return docs.filter((doc) => {
    const patterns = DOCUMENT_ALIAS_PATTERNS[doc && doc.id];
    if (!patterns) return true;
    return !patterns.some((pattern) => haystack.includes(normalize(pattern)));
  });
}

export { DOCUMENT_ALIAS_PATTERNS };

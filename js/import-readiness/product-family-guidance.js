/**
 * Product-owner-approved, family-specific guidance overlay for a small,
 * explicitly authorized set of matrix families (product-family-matrix.js).
 *
 * Deliberately NOT matrix data, NOT an alias, NOT a regulatory signal:
 * this is a presentation-layer overlay only, keyed by the matrix's own
 * family id, consumed by product-family-result.js at the exact same
 * rendering slots the matrix's own `commercialImportNote`/
 * `personalImportNote` (the "note") and `noPositiveSignalMessage`
 * already use -- no new DOM slot, no new result-state, no new question.
 *
 * Every entry here is the smallest compatible extension for one
 * product-owner-approved general direction:
 *
 *   - toys (children-and-infants-01): the matrix already carries a
 *     positive `standards: true` signal -- this only adds the
 *     family-specific "Standards Institution" note the matrix's own
 *     (workbook-sourced, currently blank) note field does not supply.
 *   - products of animal origin (food-and-beverages-04): the matrix
 *     already carries positive `healthUmbrella`/`agriculture` signals
 *     -- this only adds the family-specific "Veterinary Services" note.
 *   - industrial machinery and equipment (construction-and-industrial-02)
 *     and building materials (construction-and-industrial-01): the
 *     matrix carries no positive signal for either (recognized family,
 *     no positive category) -- `noPositiveMessage` replaces the
 *     otherwise byte-identical generic no-positive headline with a
 *     family-specific one, and `note` supplies the supporting
 *     explanation. No positive category is added or implied.
 *
 * Cautious-wording safeguards (apply to every entry):
 *   - never state an absolute exemption or that no requirement can
 *     ever apply;
 *   - never attempt to enumerate every exception (bows/arrows, animal
 *     subtype, pressure vessels, cement, ...) -- those are explicitly
 *     deferred to the professional reviewing the exact product;
 *   - never add a new focused question -- this module is read-only
 *     presentation text, never gates a question.
 */

export const FAMILY_GUIDANCE = Object.freeze({
  // Toys (existing positive `standards` signal already applies).
  'children-and-infants-01': Object.freeze({
    note:
      'נדרש לבדוק את מסלול אישור מכון התקנים לצעצוע. ' +
      'דרישות היבוא עשויות להשתנות בהתאם לסוג הצעצוע, למאפייני המוצר, למבנהו ולדרישות החלות על המוצר הספציפי, ולכן מומלץ להעביר את המפרט המדויק לבדיקה מקצועית.',
  }),
  // Products of animal origin (existing positive `healthUmbrella` +
  // `agriculture` signals already apply).
  'food-and-beverages-04': Object.freeze({
    note:
      'נדרש לבדוק אישור של השירותים הווטרינריים במשרד החקלאות. ' +
      'הדרישה המדויקת עשויה להשתנות בהתאם לסוג המוצר, מקורו, הרכבו, אופן עיבודו, השימוש המיועד ומסמכי היצרן.',
  }),
  // Industrial machinery and equipment (no positive signal -- useful,
  // family-specific recognized-no-positive guidance instead of the
  // generic byte-identical wording).
  'construction-and-industrial-02': Object.freeze({
    noPositiveMessage:
      'ככלל, על בסיס משפחת המוצר שנבחרה, לא זוהתה דרישה כללית להמצאת אישור יבוא ייעודי לצורך השחרור ביבוא מסחרי.',
    note:
      'דרישות היבוא עשויות להשתנות בהתאם לסוג המכונה, השימוש, המפרט הטכני, מצב הטובין, רכיבים מיוחדים ופרט המכס. ' +
      'מומלץ להעביר את המפרט והמסמכים לבדיקה מקצועית לפני השילוח.',
  }),
  // Building materials (no positive signal -- useful, family-specific
  // recognized-no-positive guidance instead of the generic
  // byte-identical wording).
  'construction-and-industrial-01': Object.freeze({
    noPositiveMessage:
      'ככלל, על בסיס משפחת המוצר שנבחרה, לא זוהתה דרישה כללית להמצאת אישור יבוא ייעודי לצורך השחרור.',
    note:
      'דרישות היבוא עשויות להשתנות בהתאם לסוג החומר, השימוש, פרט המכס והתקנים החלים על המוצר. ' +
      'קיימים מוצרים מסוימים בתחום חומרי הבניין שעשויים להיות כפופים לדרישות נוספות, ולכן מומלץ לבצע בדיקה מקצועית לפי המוצר המדויק.',
  }),
});

/**
 * @param {string} familyId
 * @returns {{ note?: string, noPositiveMessage?: string } | null}
 */
export function familyGuidanceFor(familyId) {
  return FAMILY_GUIDANCE[familyId] || null;
}

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
 *     -- this adds the family-specific "Veterinary Services" note,
 *     which (a deliberate, product-owner-accepted choice -- see
 *     `noteForImportType` below) takes precedence over the matrix's own
 *     distinct `personalImportNote` ("כמות לא מסחרית") for personal
 *     imports too, so this family's personal and commercial notes are
 *     intentionally the same Veterinary Services text.
 *   - industrial machinery and equipment (construction-and-industrial-02)
 *     and building materials (construction-and-industrial-01): the
 *     matrix carries no positive signal for either (recognized family,
 *     no positive category) -- `noPositiveMessage` replaces the
 *     otherwise byte-identical generic no-positive headline with a
 *     family-specific one, and `note` supplies the supporting
 *     explanation. No positive category is added or implied.
 *
 * Wave 2 (product-owner-approved guidance for medical products,
 * pesticide products, ordinary footwear, and vehicle accessories):
 *   - medical products (health-and-cosmetics-02, health-and-cosmetics-03):
 *     the matrix already carries a positive `healthUmbrella` signal --
 *     this only adds the family-specific "AMAR / Medical Devices
 *     Division" note. Known professional exceptions (defibrillators,
 *     infant incubators, which also require Standards Institution
 *     review) are deliberately NOT added here -- the current matrix has
 *     no safe, narrower row or signal for that specific subset, so they
 *     remain a documented, deferred exception for the professional.
 *   - pesticide products (chemicals-and-materials-03): the matrix
 *     already carries a positive `healthUmbrella` signal (the poisons
 *     permit route) -- this only adds the family-specific note. The
 *     aerosol/pressure-container Standards Institution exception is
 *     deliberately NOT added -- same reasoning as above.
 *   - ordinary footwear (textiles-and-furniture-02): the matrix carries
 *     no positive signal (recognized family, no positive category) --
 *     same treatment as industrial machinery/building materials above.
 *     Safety footwear cannot be distinguished from ordinary footwear by
 *     this one matrix row (both share the same row and the same "no
 *     signal" value), so no positive Standards Institution direction is
 *     added for either -- a documented, deferred limitation.
 *   - vehicle accessories (vehicles-and-transport-03, the general
 *     "spare parts for a vehicle" row used for generic accessory/part
 *     text within the vehicle_parts_and_transport_accessories checkbox's
 *     candidate set): the matrix already carries a positive
 *     `transportOrVehicleLaboratory` signal -- this only adds the
 *     family-specific note clarifying that non-integral goods may be
 *     treated differently, without FreighTime making that determination
 *     itself.
 *
 * Wave 2 completion (2026-08-26, product-owner decision: the Wave-2
 * deferrals above were "not accepted as completion" -- these primary
 * directions are now implemented via new/renamed matrix rows, see
 * scripts/generate_product_family_matrix.py and
 * docs/product-family-matrix-engine.md's "Wave 2 completion" section):
 *   - perfume (health-and-cosmetics-05, new row, split off from the
 *     cosmetics row): no positive signal -- family-specific
 *     recognized-no-positive guidance, same treatment as industrial
 *     machinery/building materials above.
 *   - safety footwear (textiles-and-furniture-04, new row, split off
 *     from the footwear row): positive `standards` signal -- note only.
 *   - personal protective equipment (additional-consumer-products-06,
 *     new row, split off from the sports-equipment row): positive
 *     `standards` signal -- note only.
 *   - ordinary sports/fitness equipment (additional-consumer-products-01,
 *     renamed/narrowed row): no positive signal -- family-specific
 *     recognized-no-positive guidance.
 *   - bicycle/scooter with an auxiliary motor
 *     (additional-consumer-products-07, new row, split off from the
 *     bicycles/scooters row): positive `transportOrVehicleLaboratory`
 *     signal -- note only.
 *   - vitamins for animal consumption (food-and-beverages-06, new row):
 *     positive `agriculture` signal (the same Veterinary Services
 *     authority the animal-origin family above already uses) -- note
 *     only.
 *   - vitamins for pharmaceutical manufacturing (food-and-beverages-07,
 *     new row): positive `healthUmbrella` signal -- note names the more
 *     specific Pharmaceutical Division ("אגף הרוקחות") within the
 *     Ministry of Health, distinguishing it from the ordinary human-use
 *     supplement note without a new signal key or professional
 *     category.
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

// Shared verbatim between health-and-cosmetics-02 and -03 (both reach
// the same AMAR direction) -- one constant so the two entries cannot
// silently drift apart on a future wording edit.
const AMAR_MEDICAL_DEVICES_NOTE =
  'נדרש לבדוק את מסלול אישור מנהל המכשור הרפואי (אמ"ר) במשרד הבריאות. ' +
  'הדרישה חלה גם על מוצרים המיועדים לשימוש ביתי, במרפאה, בבית חולים, לניטור, לאבחון או לטיפול. ' +
  'זהו כיוון בדיקה ראשוני בלבד ואינו רישום אמ"ר או אישור יבוא -- דרישות נוספות ספציפיות למוצר עשויות להתברר בבדיקה המקצועית.';

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
  // Medical equipment (existing positive `healthUmbrella` signal already
  // applies).
  'health-and-cosmetics-02': Object.freeze({
    note: AMAR_MEDICAL_DEVICES_NOTE,
  }),
  // Product carrying a medical claim (same existing positive
  // `healthUmbrella` signal and the same AMAR direction as ordinary
  // medical equipment -- shares AMAR_MEDICAL_DEVICES_NOTE verbatim so
  // the two families cannot silently drift apart on a future edit).
  'health-and-cosmetics-03': Object.freeze({
    note: AMAR_MEDICAL_DEVICES_NOTE,
  }),
  // Pesticide products (existing positive `healthUmbrella` signal
  // already applies -- the poisons permit route).
  'chemicals-and-materials-03': Object.freeze({
    note:
      'נדרש לבדוק רישיון רעלים במשרד הבריאות. ' +
      'הדרישה המדויקת עשויה להשתנות בהתאם לסוג התכשיר, ייעודו וצורת האריזה, ולכן מומלץ להעביר את המפרט המדויק לבדיקה מקצועית.',
  }),
  // Ordinary footwear (no positive signal -- useful, family-specific
  // recognized-no-positive guidance instead of the generic
  // byte-identical wording). This matrix row covers all footwear, so
  // this same wording also applies when the text cannot be safely
  // distinguished as safety footwear.
  'textiles-and-furniture-02': Object.freeze({
    noPositiveMessage:
      'ככלל, על בסיס משפחת המוצר שנבחרה, לא זוהתה דרישה כללית להמצאת אישור יבוא ייעודי לצורך השחרור.',
    note:
      'הנעלה ייעודית לבטיחות או להגנה עשויה לחייב בדיקת תקינה נפרדת. ' +
      'מומלץ להעביר את המפרט המדויק לבדיקה מקצועית לפני השילוח.',
  }),
  // Vehicle accessories (general "spare parts for a vehicle" row --
  // existing positive `transportOrVehicleLaboratory` signal already
  // applies).
  'vehicles-and-transport-03': Object.freeze({
    note:
      'נדרש לבדוק אישור מול משרד התחבורה או מעבדת רכב מוסמכת. ' +
      'טובין שאינם חלק אינטגרלי מהרכב עשויים להיבחן באופן שונה -- קביעה זו אינה נעשית על ידי המערכת, ולכן מומלץ להעביר את המוצר, אופן ההתקנה והשימוש בו לבדיקה מקצועית.',
  }),

  // ---------------------------------------------------------------
  // Wave 2 completion (2026-08-26)
  // ---------------------------------------------------------------

  // Perfume (new row, split off from cosmetics -- no positive signal).
  'health-and-cosmetics-05': Object.freeze({
    noPositiveMessage:
      'ככלל, על בסיס משפחת המוצר שנבחרה, לא זוהתה דרישה כללית להמצאת אישור יבוא ייעודי לצורך השחרור.',
    note:
      'דרישות היבוא עשויות להשתנות בהתאם להרכב המוצר ולמסמכי היצרן, ולכן מומלץ להעביר את המפרט המדויק לבדיקה מקצועית לפני השילוח.',
  }),
  // Safety footwear (new row, split off from ordinary footwear --
  // existing positive `standards` signal already applies).
  'textiles-and-furniture-04': Object.freeze({
    note:
      'נדרש לבדוק את מסלול אישור מכון התקנים להנעלת בטיחות. ' +
      'הדרישה המדויקת עשויה להשתנות בהתאם לסוג ההגנה, לתקן החל ולשימוש המיועד, ולכן מומלץ להעביר את המפרט המדויק לבדיקה מקצועית.',
  }),
  // Personal protective equipment (new row, split off from sports
  // equipment -- existing positive `standards` signal already applies).
  'additional-consumer-products-06': Object.freeze({
    note:
      'נדרש לבדוק את מסלול אישור מכון התקנים למוצר ההגנה. ' +
      'מוצרי הגנה שונים עשויים לחול עליהם תקנים ישראליים שונים, ולכן מומלץ להעביר את המפרט המדויק לבדיקה מקצועית.',
  }),
  // Ordinary sports/fitness equipment (renamed/narrowed row -- no
  // positive signal).
  'additional-consumer-products-01': Object.freeze({
    noPositiveMessage:
      'ככלל, על בסיס משפחת המוצר שנבחרה, לא זוהתה דרישה כללית להמצאת אישור יבוא ייעודי לצורך השחרור.',
    note:
      'ציוד ספורט וכושר עם חיווט חשמלי עשוי לחייב בדיקת תקינה נפרדת. ' +
      'מומלץ להעביר את המפרט המדויק לבדיקה מקצועית לפני השילוח.',
  }),
  // Bicycle/scooter with an auxiliary motor (new row, split off from
  // ordinary bicycles/scooters -- existing positive
  // `transportOrVehicleLaboratory` signal already applies).
  'additional-consumer-products-07': Object.freeze({
    note:
      'נדרש לבדוק אישור מול מעבדת רכב מוסמכת. ' +
      'הדרישה המדויקת עשויה להשתנות בהתאם למאפייני מנוע העזר ולשימוש המיועד, ולכן מומלץ להעביר את המפרט המדויק לבדיקה מקצועית.',
  }),
  // Vitamins for animal consumption (new row -- existing positive
  // `agriculture` signal already applies, the same Veterinary Services
  // authority the animal-origin family above already uses).
  'food-and-beverages-06': Object.freeze({
    note:
      'נדרש לבדוק אישור של השירותים הווטרינריים במשרד החקלאות. ' +
      'הדרישה המדויקת עשויה להשתנות בהתאם לסוג המוצר, ייעודו ומסמכי היצרן.',
  }),
  // Vitamins for pharmaceutical manufacturing (new row -- existing
  // positive `healthUmbrella` signal already applies; the note names
  // the more specific Pharmaceutical Division within the Ministry of
  // Health, distinguishing it from the ordinary human-use supplement
  // note without a new signal key or professional category).
  'food-and-beverages-07': Object.freeze({
    note:
      'נדרש לבדוק אישור של אגף הרוקחות במשרד הבריאות. ' +
      'הדרישה המדויקת עשויה להשתנות בהתאם לייעוד חומר הגלם ולמסמכי היצרן, ולכן מומלץ להעביר את המפרט המדויק לבדיקה מקצועית.',
  }),

  // ---------------------------------------------------------------
  // Final completion pass (2026-08-26)
  // ---------------------------------------------------------------

  // Ordinary furniture (new row, split off from the furniture/mattress
  // row -- no positive signal). Electrically wired furniture instead
  // reuses the existing, family-independent mains-connected-electrical-
  // product detailed rule -- no signal or guidance on this row for that
  // case.
  'textiles-and-furniture-05': Object.freeze({
    noPositiveMessage:
      'ככלל, על בסיס משפחת המוצר שנבחרה, לא זוהתה דרישה כללית להמצאת אישור תקינה עבור הריהוט.',
    note:
      'יש לאמת את סוג המוצר, מבנהו, השימוש והרכיבים מול גורם מקצועי -- בפרט אם הרהיט כולל חיווט או מערכת חשמלית. ' +
      'מומלץ להעביר את המפרט המדויק לבדיקה מקצועית לפני השילוח.',
  }),
  // Vehicle-dedicated accumulator (new row -- existing positive
  // `transportOrVehicleLaboratory` signal already applies; `standards`
  // is deliberately not set on this row so exactly one direction/CTA
  // shows, per the approved rule).
  'vehicles-and-transport-10': Object.freeze({
    note:
      'נדרש לבדוק אישור מול מעבדת רכב מוסמכת. ' +
      'הדרישה המדויקת עשויה להשתנות בהתאם למאפייני המצבר ולשימוש המיועד, ולכן מומלץ להעביר את המפרט המדויק לבדיקה מקצועית.',
  }),
  // Equipment merely containing a battery (new row, grouped-battery-
  // selection completion) -- no positive signal. A Standards
  // Institution battery category is never fabricated just because
  // equipment happens to contain a battery; the guidance instead points
  // to checking the complete product's own requirements (which may
  // still separately require standards review, e.g. via the existing
  // mains-electrical rule if it is also supplied with a mains charger).
  'electrical-and-electronics-09': Object.freeze({
    noPositiveMessage:
      'ככלל, על בסיס משפחת המוצר שנבחרה, לא זוהתה דרישה כללית להמצאת אישור תקינה עבור סוללה כרכיב במוצר.',
    note:
      'יש לבדוק את דרישות התקינה החלות על המוצר השלם -- בפרט אם הוא מתחבר לרשת החשמל או מגיע עם מטען. ' +
      'מומלץ להעביר את המפרט המדויק לבדיקה מקצועית לפני השילוח.',
  }),

  // ---------------------------------------------------------------
  // Live-animals completion (2026-08-26)
  // ---------------------------------------------------------------

  // Live animals (new row -- existing positive `agriculture` signal
  // already applies, the same Veterinary Services authority the
  // products-of-animal-origin and animal-vitamins families above
  // already use). Deliberately distinct from "מזון מן החי" (food-and-
  // beverages-04, products OF animal origin): a live animal is not
  // itself a product of animal origin. The primary direction does not
  // depend on the animal type -- exact conditions (species, origin,
  // purpose, health documentation, transport) are explicitly deferred
  // to professional review after referral, never asked here.
  'food-and-beverages-08': Object.freeze({
    note:
      'נדרש לבדוק אישור של השירותים הווטרינריים במשרד החקלאות. ' +
      'הדרישה המדויקת עשויה להשתנות בהתאם לסוג בעל החיים, מקורו, מטרת היבוא, מסמכי הבריאות ואופן ההובלה, ולכן מומלץ להעביר את הפרטים לבדיקה מקצועית לפני השילוח. ' +
      'התוצאה אינה מהווה אישור וטרינרי.',
  }),
});

/**
 * @param {string} familyId
 * @returns {{ note?: string, noPositiveMessage?: string } | null}
 */
export function familyGuidanceFor(familyId) {
  return FAMILY_GUIDANCE[familyId] || null;
}

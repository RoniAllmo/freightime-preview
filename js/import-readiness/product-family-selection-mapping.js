/**
 * ONE centralized, explicit, reviewed mapping from the questionnaire's
 * explicit product-family checkbox selections (irProductFamily, see the
 * 21-value PRODUCT_FAMILY enum in layered-question-model.js) to the
 * matrix family id(s) that selection can identify
 * (product-family-matrix.js). This is the only place in the codebase
 * that knows this mapping -- never duplicated or re-derived elsewhere.
 *
 * Every checkbox maps to one of two shapes:
 *   - a single matrix family id: the checkbox alone is unambiguous and
 *     authoritative (see resolveFamilyIdentificationOptions below).
 *   - two or more matrix family ids: the checkbox names a genuinely
 *     ambiguous group -- several matrix rows could apply, and the
 *     checkbox alone cannot pick one. Free text is then used only to
 *     disambiguate WITHIN this candidate set (never outside it); if no
 *     unique candidate emerges, no family is claimed (see
 *     docs/extending-product-family-guidance.md and
 *     product-family-identification.js's MULTIPLE_CANDIDATES/NONE
 *     outcomes, which this module deliberately relies on instead of
 *     re-implementing ambiguity handling).
 *
 * `other_general_product` and `not_sure` are intentionally absent: they
 * never map to any matrix family (see resolveFamilyIdentificationOptions).
 *
 * Known coverage gaps (checkbox has no matching matrix row, or a matrix
 * row has no checkbox): whole vehicles (vehicles-and-transport-01/02),
 * medicines (health-and-cosmetics-04), and the "additional consumer
 * products" category (sports/protective gear, bikes/scooters, drones,
 * marine equipment, pet products) are not reachable via any checkbox.
 * Documented, not fixed -- adding checkboxes or matrix content is out of
 * scope for this change.
 */

/**
 * Candidate-set-scoped identification hints: extra terms that only ever
 * strengthen matching for ONE specific matrix family WITHIN an already-
 * ambiguous checkbox's own candidate set -- never a global alias, never
 * consulted unless that exact checkbox is the sole normal selection
 * driving the restricted candidate set (see resolveFamilyIdentificationOptions
 * below). This is the safe way to teach identification a term that would
 * be too broad or collision-prone as a real matrix alias (which applies
 * everywhere, unconditionally): scoping it to "only when this checkbox
 * already narrowed the field to these few rows" removes the cross-family
 * collision risk entirely, so only intra-set correctness needs review.
 *
 * childrens_products_and_toys -> children-and-infants-01 ("צעצועים"):
 * the matrix's own sole alias is the plural "צעצועים", which does not
 * match ordinary singular product text ("צעצוע פלסטיק", "בובה"). Every
 * term below was individually reviewed for substring collisions against
 * every alias in the full matrix and the other 3 candidates in this same
 * set (children-and-infants-02/03/04) before being added -- see
 * docs/product-family-matrix-engine.md. Bare English "toy"/"game" were
 * deliberately rejected (collision risk: "toy" is a substring of
 * "Toyota"; "game" is a substring of "gaming"/"game controller") in
 * favor of the exact compound phrases below.
 *
 * Wave 2 additions (product-owner-approved guidance for medical
 * products, plants/seeds/produce, vehicle accessories, communications/
 * wireless equipment, pesticide products, footwear, and specified
 * infant products): every new term below follows the same review
 * discipline -- an exact compound phrase or a term reviewed against
 * every alias in the full matrix and every other candidate in its own
 * set, never a bare generic English/Hebrew word.
 *
 * (Wave 2 completion (2026-08-26) later moved the concrete footwear
 * words -- "shoes", "boots", "sandals", etc. -- from a scoped hint here
 * into global curated aliases on the workbook-generator side, once the
 * ordinary/safety footwear split made that safe; see
 * scripts/generate_product_family_matrix.py's CURATED_ALIASES and
 * FAMILY_NEGATIVE_TERMS in product-family-identification.js.)
 *
 * childrens_products_and_toys -> children-and-infants-04 ("עגלות, מיטות,
 * לולים וכיסאות אוכל"): the sole alias is that one long compound name,
 * which does not match ordinary product text for one specific item
 * ("crib", "infant bed", "infant walker"). Reviewed against every alias
 * in the matrix and the other 3 candidates in this set: "לול" does not
 * collide with any other alias; "מיטת תינוק" is distinct from the
 * generic textile/furniture aliases (no "מיטה" alias exists elsewhere);
 * "הליכון" (walker) is distinct from every toy/electronics alias.
 *
 * childrens_products_and_toys -> children-and-infants-03 ("מוצרי
 * תינוקות"): one narrow addition for infant-feeding cutlery, reviewed
 * against every food-contact alias (food-contact-01/02/05) -- no
 * collision, since none of those aliases mention infants.
 */
export const CANDIDATE_SET_SCOPED_HINTS = Object.freeze({
  childrens_products_and_toys: Object.freeze({
    'children-and-infants-01': Object.freeze([
      'צעצוע', // covers "צעצוע פלסטיק", "צעצוע ללא חשמל", "מכונית צעצוע" (all contain this as a substring)
      'בובה', // "doll" -- construct-state "בובת" (e.g. "בובת תצוגה") does not contain this exact substring, so a display doll described that way is unaffected
      'משחק קופסה', // "board game" -- exact compound, not bare "משחק" (too broad)
      'toy car',
      'board game',
      'plastic toy',
    ]),
    'children-and-infants-04': Object.freeze([
      'מיטת תינוק', // infant bed
      'לול', // crib/playpen
      'הליכון תינוקות', // infant walker (compound -- bare "הליכון" alone can mean a generic walker/treadmill, so kept compound)
      'infant bed',
      'crib',
      'infant walker',
    ]),
    'children-and-infants-03': Object.freeze([
      'כפית לתינוק', // infant feeding spoon
      'כפית האכלה לתינוקות', // infant-feeding spoon (alt phrasing)
      'infant feeding cutlery',
      'infant feeding spoon',
    ]),
  }),
  // Rule 1 (medical products): the matrix's own aliases for
  // health-and-cosmetics-02 are "ציוד רפואי"/"מכשיר רפואי" -- generic
  // umbrella terms that do not match a specific named device
  // ("מד לחץ דם", "מד חום", "מד סוכר", "פולס אוקסימטר"). Reviewed
  // against every alias in the full matrix and health-and-cosmetics-03
  // (the other candidate in this set): none collide -- no other family
  // mentions blood pressure, thermometers, glucose, or oximetry.
  medical_equipment_or_medical_use: Object.freeze({
    'health-and-cosmetics-02': Object.freeze([
      'מד לחץ דם', // blood-pressure monitor
      'מד חום', // thermometer
      'מד סוכר', // glucose meter
      'פולס אוקסימטר', // pulse oximeter
      'מד ריווי חמצן', // pulse oximeter (alt Hebrew phrasing)
      'blood pressure monitor',
      'thermometer',
      'glucose meter',
      'pulse oximeter',
    ]),
  }),
  // Rule 5 (plants, seeds, agricultural produce): food-and-beverages-05
  // already carries broad aliases ("תוצרת חקלאית", "זרעים", "שתילים",
  // "צמחים", "פירות וירקות") -- flowers are the one gap. Reviewed
  // against every alias in the matrix and construction-and-industrial-03
  // (the other candidate in this set): no collision.
  plant_origin_products: Object.freeze({
    'food-and-beverages-05': Object.freeze([
      'פרח', // flower
      'flower',
    ]),
  }),
  // Rule 6 (vehicle accessories): every one of the 7 candidates in this
  // set already carries the identical positive
  // transportOrVehicleLaboratory signal, so a genuinely generic
  // accessory/part description (not naming a specific part like a
  // headlamp) is scoped to the one general "spare parts for a vehicle"
  // row (vehicles-and-transport-03) rather than left unmatched.
  // Reviewed against every alias in the matrix and the other 6
  // candidates in this set: the singular compound phrases below do not
  // appear as a substring of any other candidate's own (longer/more
  // specific) alias, so no collision is possible.
  vehicle_parts_and_transport_accessories: Object.freeze({
    'vehicles-and-transport-03': Object.freeze([
      'אביזר לרכב', // vehicle accessory
      'אביזר רכב', // vehicle accessory (alt phrasing)
      'vehicle accessory',
      'vehicle part',
    ]),
  }),
  // Rule 7 (communications/wireless equipment): a generic "wireless
  // device" or "transmitter" description does not name Wi-Fi/Bluetooth
  // specifically (electrical-and-electronics-05's own aliases) or a
  // cellular/communications compound (electrical-and-electronics-06's
  // own aliases) -- scoped to -06 (the broader communications-equipment
  // row) so a generic description still reaches the required Ministry of
  // Communications direction. Reviewed against every alias in the matrix
  // and -05 (the other candidate in this set): no collision.
  wireless_or_transmitting_equipment: Object.freeze({
    'electrical-and-electronics-06': Object.freeze([
      'מכשיר אלחוטי', // wireless device
      'משדר', // transmitter
      'wireless device',
      'transmitter',
    ]),
  }),
  // Rule 3 (pesticide products): chemicals-and-materials-03's sole
  // alias is the plural "חומרי הדברה", which does not match ordinary
  // singular/specific pest-control text. Reviewed against every alias
  // in the matrix and the other 3 candidates in this set
  // (chemicals-and-materials-01/02/04): no collision -- no other family
  // mentions pest control, insecticides, herbicides, or fungicides.
  chemicals_paints_adhesives_aerosols: Object.freeze({
    'chemicals-and-materials-03': Object.freeze([
      'קוטל חרקים', // insecticide
      'קוטל עשבים', // herbicide
      'קוטל פטריות', // fungicide
      'תכשיר הדברה', // pest-control preparation (singular form, covers household/agricultural phrasing)
      'חומר הדברה', // pest-control substance (singular form)
      'insecticide',
      'pesticide',
      'herbicide',
      'fungicide',
    ]),
  }),
});

/**
 * Returns `family` (a real matrix family object) augmented with any
 * candidate-set-scoped hint terms for `checkboxValue`, WITHOUT mutating
 * the original matrix object or writing a new alias into it -- a fresh,
 * frozen object whose `aliases` list has the scoped hints appended,
 * used only as this one identification call's in-memory family list.
 */
function withScopedHints(family, checkboxValue) {
  const hintsForCheckbox = CANDIDATE_SET_SCOPED_HINTS[checkboxValue];
  const extraTerms = hintsForCheckbox && hintsForCheckbox[family.id];
  if (!isUsableArray(extraTerms) || extraTerms.length === 0) return family;
  return Object.freeze({ ...family, aliases: Object.freeze([...family.aliases, ...extraTerms]) });
}

export const PRODUCT_FAMILY_SELECTION_CANDIDATES = Object.freeze({
  // Ambiguous (Wave 2 completion, 2026-08-26): cosmetics vs. perfume --
  // was a single-candidate (forced) checkbox before the approved rule
  // required two different primary directions (cosmetics: Ministry of
  // Health positive; perfume: no positive). Free text now disambiguates
  // within this set; genuinely ambiguous text ("מוצר קוסמטי ובושם")
  // correctly stays unresolved.
  cosmetics_and_beauty: Object.freeze(['health-and-cosmetics-01', 'health-and-cosmetics-05']),
  // Ambiguous: packaged food vs. beverages -- free text disambiguates.
  food_and_beverage: Object.freeze(['food-and-beverages-01', 'food-and-beverages-02']),
  // Ambiguous (Wave 2 completion, 2026-08-26): human-use vs. animal-use
  // vs. pharmaceutical-manufacturing-use vitamins/supplements -- was a
  // single-candidate (forced) checkbox before the approved rule
  // required three different primary directions. Free text now
  // disambiguates within this set; genuinely ambiguous text (bare
  // "ויטמינים"/"vitamin product"/"supplement") correctly stays
  // unresolved rather than defaulting to any one authority.
  dietary_supplements: Object.freeze(['food-and-beverages-03', 'food-and-beverages-06', 'food-and-beverages-07']),
  // Ambiguous: the five food-contact material rows.
  food_contact_items: Object.freeze([
    'food-contact-01',
    'food-contact-02',
    'food-contact-03',
    'food-contact-04',
    'food-contact-05',
  ]),
  // Ambiguous: which electrical row (mains-connected, charger/power
  // supply, cable/accessory, no-network-connection, or lighting).
  // Wireless/cellular (-05/-06) and batteries (-07) have their own
  // dedicated checkboxes below, so are excluded here.
  electrical_and_electronics: Object.freeze([
    'electrical-and-electronics-01',
    'electrical-and-electronics-02',
    'electrical-and-electronics-03',
    'electrical-and-electronics-04',
    'electrical-and-electronics-08',
  ]),
  // Ambiguous: Wi-Fi/Bluetooth vs. cellular/communications equipment.
  wireless_or_transmitting_equipment: Object.freeze([
    'electrical-and-electronics-05',
    'electrical-and-electronics-06',
  ]),
  batteries_or_battery_containing: Object.freeze(['electrical-and-electronics-07']),
  // Ambiguous: plain toys, electric/wireless toys, baby products, or
  // nursery furniture (strollers/cribs/high chairs).
  childrens_products_and_toys: Object.freeze([
    'children-and-infants-01',
    'children-and-infants-02',
    'children-and-infants-03',
    'children-and-infants-04',
  ]),
  // Ambiguous: apparel/textile vs. ordinary footwear vs. safety
  // footwear (the safety-footwear candidate added Wave 2 completion,
  // 2026-08-26, once the ordinary/safety footwear split made the
  // distinct direction expressible).
  textile_apparel_and_footwear: Object.freeze([
    'textiles-and-furniture-01',
    'textiles-and-furniture-02',
    'textiles-and-furniture-04',
  ]),
  furniture_and_home_goods: Object.freeze(['textiles-and-furniture-03']),
  // Ambiguous: glass vs. ceramic food-contact tableware -- the matrix
  // has no non-food-contact glass/ceramics row, so both candidates here
  // are the food-contact ones (deliberately overlaps food_contact_items
  // below -- see the module doc comment above).
  glass_ceramics_and_tableware: Object.freeze(['food-contact-03', 'food-contact-04']),
  // Ambiguous: plastic vs. polymer-coated food-contact items.
  plastics_polymers_and_coated_products: Object.freeze(['food-contact-01', 'food-contact-02']),
  // Ambiguous: seven distinct vehicle-parts/accessories rows. The
  // vehicle-installed-product detailed rule (mapping to
  // vehicles-and-transport-05) still takes precedence outright over
  // whatever this selection would otherwise contribute -- unaffected by
  // this mapping, see product-family-reconciliation.js.
  vehicle_parts_and_transport_accessories: Object.freeze([
    'vehicles-and-transport-03',
    'vehicles-and-transport-04',
    'vehicles-and-transport-05',
    'vehicles-and-transport-06',
    'vehicles-and-transport-07',
    'vehicles-and-transport-08',
    'vehicles-and-transport-09',
  ]),
  // Ambiguous: medical equipment vs. a product carrying a medical claim.
  medical_equipment_or_medical_use: Object.freeze(['health-and-cosmetics-02', 'health-and-cosmetics-03']),
  // Ambiguous: cleaning/disinfecting, paints/adhesives/sealants,
  // industrial chemicals/hazardous materials, or pesticide products.
  // Pesticides (chemicals-and-materials-03) were added (Wave 2,
  // product-owner-approved pesticide guidance): the checkbox's own label
  // ("חומרים כימיים, צבעים, דבקים ותרסיסים") names "תרסיסים"
  // (sprays/aerosols), a natural umbrella for aerosol/spray-form
  // pesticide products -- purely additive, does not remove or change any
  // of the 3 existing candidates.
  chemicals_paints_adhesives_aerosols: Object.freeze([
    'chemicals-and-materials-01',
    'chemicals-and-materials-02',
    'chemicals-and-materials-03',
    'chemicals-and-materials-04',
  ]),
  animal_origin_products: Object.freeze(['food-and-beverages-04']),
  // Ambiguous: agricultural produce/seeds/plants vs. wood/plant-origin
  // raw material.
  plant_origin_products: Object.freeze(['food-and-beverages-05', 'construction-and-industrial-03']),
  industrial_machinery_and_equipment: Object.freeze(['construction-and-industrial-02']),
  building_materials: Object.freeze(['construction-and-industrial-01']),
  // other_general_product and not_sure: intentionally absent, see above.
});

function isUsableArray(value) {
  return Array.isArray(value);
}

// Mirrors activeFamilies()'s own filter (product-family-matrix.js) --
// findFamilyById() itself does not filter inactive rows, so this
// mapping must apply the same activeStatus check the free-text path
// gets for free via activeFamilies(). Keeps a checkbox selection from
// ever forcing/offering a retired matrix family if one is ever marked
// inactive in a future matrix update.
function findActiveFamilyById(id, findFamilyById) {
  const family = findFamilyById(id);
  return family && family.activeStatus === true ? family : null;
}

function normalSelectionsOf(selectedFamilyValues) {
  const selected = isUsableArray(selectedFamilyValues) ? selectedFamilyValues : [];
  return selected.filter((value) => value !== 'not_sure' && value !== 'other_general_product');
}

/**
 * True when the raw irProductFamily checked values contain at least one
 * "normal" family (i.e. something other than just `not_sure` and/or
 * `other_general_product`, or nothing at all). The single, shared
 * definition of "did the user actually give us explicit family
 * information" -- used by product-family-result.js to decide whether an
 * unresolved candidate set must produce a truthful "more information
 * needed" result instead of the plain "no family identified at all"
 * wording (see docs/product-family-matrix-engine.md).
 *
 * @param {string[]} selectedFamilyValues
 * @returns {boolean}
 */
export function hasNormalFamilySelection(selectedFamilyValues) {
  return normalSelectionsOf(selectedFamilyValues).length > 0;
}

/**
 * Applies the exact 5-case precedence for explicit family-selection
 * checkboxes, per docs/extending-product-family-guidance.md:
 *   1. Single normal selection, unambiguous candidate -> authoritative
 *      (forcedFamily): identifies that family regardless of free text.
 *   2. Single normal selection, ambiguous candidate set -> restricts
 *      identification to that set; free text disambiguates within it.
 *   3. No normal selection (nothing selected, or only not_sure and/or
 *      other_general_product) -> no restriction at all: identical to
 *      today's free-text-only behavior.
 *   4. Multiple normal selections -> restricts identification to the
 *      union of every selected checkbox's candidate set; free text must
 *      narrow it to exactly one family or nothing is claimed. Never
 *      resolved by selection/DOM order, never a fabricated "primary"
 *      family.
 *   5. `not_sure` never maps to a family and never overrides a
 *      co-selected normal family (it is simply excluded from
 *      "normal selections" below); `other_general_product` preserves
 *      today's cautious unmapped behavior the same way.
 *
 * @param {string[]} selectedFamilyValues - raw irProductFamily checked
 *   values (normalized.productFamilies).
 * @param {(id: string) => object|null} findFamilyById
 * @returns {{ forcedFamily?: object, families?: object[] }} options to
 *   merge into identifyProductFamily's options.
 */
export function resolveFamilyIdentificationOptions(selectedFamilyValues, findFamilyById) {
  const normalSelections = normalSelectionsOf(selectedFamilyValues);

  if (normalSelections.length === 0) {
    return {};
  }

  if (normalSelections.length === 1) {
    const checkboxValue = normalSelections[0];
    const candidateIds = PRODUCT_FAMILY_SELECTION_CANDIDATES[checkboxValue];
    if (!isUsableArray(candidateIds) || candidateIds.length === 0) return {};
    const families = candidateIds
      .map((id) => findActiveFamilyById(id, findFamilyById))
      .filter(Boolean)
      .map((family) => withScopedHints(family, checkboxValue));
    if (families.length === 0) return {};
    if (families.length === 1) return { forcedFamily: families[0] };
    return { families };
  }

  const unionEntries = []; // [{ id, checkboxValue }], first-seen checkbox wins for a shared id
  for (const value of normalSelections) {
    const candidateIds = PRODUCT_FAMILY_SELECTION_CANDIDATES[value];
    if (!isUsableArray(candidateIds)) continue;
    for (const id of candidateIds) {
      if (!unionEntries.some((entry) => entry.id === id)) unionEntries.push({ id, checkboxValue: value });
    }
  }
  if (unionEntries.length === 0) return {};
  const families = unionEntries
    .map(({ id, checkboxValue }) => {
      const family = findActiveFamilyById(id, findFamilyById);
      return family ? withScopedHints(family, checkboxValue) : null;
    })
    .filter(Boolean);
  if (families.length === 0) return {};
  if (families.length === 1) {
    // Every selected checkbox's candidate set collapsed onto the same
    // single active matrix family -- unambiguous after all, same as
    // case 1.
    return { forcedFamily: families[0] };
  }
  return { families };
}

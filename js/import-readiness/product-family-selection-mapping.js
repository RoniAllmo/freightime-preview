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

export const PRODUCT_FAMILY_SELECTION_CANDIDATES = Object.freeze({
  cosmetics_and_beauty: Object.freeze(['health-and-cosmetics-01']),
  // Ambiguous: packaged food vs. beverages -- free text disambiguates.
  food_and_beverage: Object.freeze(['food-and-beverages-01', 'food-and-beverages-02']),
  dietary_supplements: Object.freeze(['food-and-beverages-03']),
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
  // Ambiguous: apparel/textile vs. footwear.
  textile_apparel_and_footwear: Object.freeze(['textiles-and-furniture-01', 'textiles-and-furniture-02']),
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
  // Ambiguous: cleaning/disinfecting, paints/adhesives/sealants, or
  // industrial chemicals/hazardous materials. Pesticides
  // (chemicals-and-materials-03) are deliberately excluded -- not implied
  // by "paints, adhesives, aerosols" wording.
  chemicals_paints_adhesives_aerosols: Object.freeze([
    'chemicals-and-materials-01',
    'chemicals-and-materials-02',
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
  const selected = isUsableArray(selectedFamilyValues) ? selectedFamilyValues : [];
  const normalSelections = selected.filter(
    (value) => value !== 'not_sure' && value !== 'other_general_product',
  );

  if (normalSelections.length === 0) {
    return {};
  }

  if (normalSelections.length === 1) {
    const candidateIds = PRODUCT_FAMILY_SELECTION_CANDIDATES[normalSelections[0]];
    if (!isUsableArray(candidateIds) || candidateIds.length === 0) return {};
    if (candidateIds.length === 1) {
      const forcedFamily = findFamilyById(candidateIds[0]);
      return forcedFamily ? { forcedFamily } : {};
    }
    const families = candidateIds.map((id) => findFamilyById(id)).filter(Boolean);
    return families.length > 0 ? { families } : {};
  }

  const unionIds = [];
  for (const value of normalSelections) {
    const candidateIds = PRODUCT_FAMILY_SELECTION_CANDIDATES[value];
    if (!isUsableArray(candidateIds)) continue;
    for (const id of candidateIds) {
      if (!unionIds.includes(id)) unionIds.push(id);
    }
  }
  if (unionIds.length === 0) return {};
  if (unionIds.length === 1) {
    // Every selected checkbox's candidate set collapsed onto the same
    // single matrix family -- unambiguous after all, same as case 1.
    const forcedFamily = findFamilyById(unionIds[0]);
    return forcedFamily ? { forcedFamily } : {};
  }
  const families = unionIds.map((id) => findFamilyById(id)).filter(Boolean);
  return families.length > 0 ? { families } : {};
}

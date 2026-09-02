/**
 * Canonical, declarative concept-COVERAGE MANIFEST for every visible
 * product-family checkbox value (family-material-disclosure.js
 * `ALL_PRODUCT_FAMILY_VALUES`). This is a manifest, not a second
 * matching registry: it carries no term-matching logic of its own, no
 * copy of any positive/negative term, and never participates in
 * `suggestProductFamilyValues`. It exists solely so the coverage GATE
 * test (family-concept-coverage-gate.test.js) can prove, from the live
 * registries, that every visible family has a reviewed, documented
 * status backed by a real, verifiable presentation mechanism -- with
 * zero manual copy-paste of the family list or its terms into a
 * separate report.
 *
 * Coverage statuses (exactly one per visible family; the two special
 * options always carry S):
 *   A - safe, specific matrix terminology already identifies this
 *       family (the matrix row's own aliases include concrete product
 *       nouns, not merely the row's own umbrella category name).
 *   B - an existing (pre-dating this task and the prior material/
 *       context correction) presentation concept hint, alias
 *       supplement, or candidate-set-scoped identification hint already
 *       provides safe coverage.
 *   C - a new presentation-alias-supplement entry was added (this task
 *       or the prior material/context correction) to close a genuine
 *       gap where the matrix row carried only its own umbrella phrase.
 *   D - deliberately left without a specific-family presentation term;
 *       every D entry states the concrete technical reason (never "not
 *       yet written"). None currently exist in this registry -- every
 *       visible family was safely coverable.
 *   S - special option (other_general_product / not_sure): never a
 *       concept target, always available, exempt from every other
 *       status's evidence requirement.
 *
 * coverageSource names WHICH presentation mechanism backs the status,
 * so the coverage-gate test can verify it actually exists rather than
 * trusting the free-text justification alone:
 *   matrix           - PRODUCT_FAMILY_MATRIX row(s) named in matrixIds.
 *   alias_supplement - PRESENTATION_ALIAS_SUPPLEMENTS has an entry
 *                       whose matrixId is one of this family's matrixIds
 *                       (family-material-disclosure.js).
 *   concept_hint      - PRESENTATION_CONCEPT_HINTS has an entry whose
 *                       suggestedFamilyValues includes this family
 *                       (family-material-disclosure.js).
 *   scoped_hint       - CANDIDATE_SET_SCOPED_HINTS has a top-level key
 *                       equal to this family value
 *                       (product-family-selection-mapping.js).
 *   special_option    - other_general_product / not_sure only.
 * A status A entry's coverageSource is always 'matrix' (its matrixIds
 * are real, active rows -- validated by the gate test); status B/C
 * entries must declare, and the gate test verifies, one of
 * alias_supplement / concept_hint / scoped_hint that genuinely exists
 * for that family. No family is marked B or C without one of these
 * three actually being present.
 */

export const COVERAGE_STATUS = Object.freeze({
  A: 'A', B: 'B', C: 'C', D: 'D', S: 'S',
});

export const COVERAGE_SOURCE = Object.freeze({
  MATRIX: 'matrix',
  ALIAS_SUPPLEMENT: 'alias_supplement',
  CONCEPT_HINT: 'concept_hint',
  SCOPED_HINT: 'scoped_hint',
  SPECIAL_OPTION: 'special_option',
});

/**
 * @typedef {{
 *   familyValue: string,
 *   status: 'A'|'B'|'C'|'D'|'S',
 *   coverageSource: 'matrix'|'alias_supplement'|'concept_hint'|'scoped_hint'|'special_option',
 *   matrixIds: string[],
 *   justification: string,
 * }} FamilyCoverageEntry
 */

/** @type {FamilyCoverageEntry[]} */
export const FAMILY_CONCEPT_COVERAGE = Object.freeze([
  Object.freeze({ familyValue: 'cosmetics_and_beauty', status: 'A', coverageSource: 'matrix', matrixIds: Object.freeze(['health-and-cosmetics-01', 'health-and-cosmetics-05']), justification: 'Matrix aliases already name concrete cosmetic/perfume products (קרם פנים, דיאודורנט, בושם, ...); deodorant spelling variant added as a C-tier supplement.' }),
  Object.freeze({ familyValue: 'food_and_beverage', status: 'A', coverageSource: 'matrix', matrixIds: Object.freeze(['food-and-beverages-01', 'food-and-beverages-02']), justification: 'Matrix aliases already name concrete packaged-food/beverage products.' }),
  Object.freeze({ familyValue: 'dietary_supplements', status: 'A', coverageSource: 'matrix', matrixIds: Object.freeze(['food-and-beverages-03', 'food-and-beverages-06', 'food-and-beverages-07']), justification: 'Matrix aliases already name concrete supplement/vitamin products; a human-vitamins wording variant added as a C-tier supplement.' }),
  Object.freeze({ familyValue: 'food_contact_items', status: 'A', coverageSource: 'matrix', matrixIds: Object.freeze(['food-contact-01', 'food-contact-02', 'food-contact-03', 'food-contact-04', 'food-contact-05']), justification: 'Matrix aliases already name concrete food-contact vessels; aluminum-cookware wording added as a C-tier supplement.' }),
  Object.freeze({ familyValue: 'electrical_and_electronics', status: 'C', coverageSource: 'alias_supplement', matrixIds: Object.freeze(['electrical-and-electronics-01', 'electrical-and-electronics-02', 'electrical-and-electronics-03', 'electrical-and-electronics-04', 'electrical-and-electronics-08']), justification: 'Row 01 already had a generic-appliance alias, extended with a shaving-machine concept; rows 02/03/04/08 (charger, cables, non-networked electronics, lighting) carried only their own umbrella phrase -- closed with new supplements (phone charger/power supply, electrical cable, pocket calculator/digital watch, light fixture/bulb).' }),
  Object.freeze({ familyValue: 'wireless_or_transmitting_equipment', status: 'A', coverageSource: 'matrix', matrixIds: Object.freeze(['electrical-and-electronics-05', 'electrical-and-electronics-06', 'electrical-and-electronics-10', 'additional-consumer-products-03']), justification: 'Matrix aliases already name Wi-Fi/Bluetooth/drone products; a wireless-router wording variant added as a C-tier supplement.' }),
  Object.freeze({ familyValue: 'batteries_or_battery_containing', status: 'C', coverageSource: 'alias_supplement', matrixIds: Object.freeze(['electrical-and-electronics-07', 'electrical-and-electronics-09', 'vehicles-and-transport-10']), justification: 'Standalone/vehicle-battery rows already well covered; the battery-containing-equipment row (electrical-and-electronics-09) had no positive alias of its own for the "with a battery" phrasing its sibling row deliberately excludes -- closed with a new supplement, now negation-aware.' }),
  Object.freeze({ familyValue: 'childrens_products_and_toys', status: 'C', coverageSource: 'alias_supplement', matrixIds: Object.freeze(['children-and-infants-01', 'children-and-infants-02', 'children-and-infants-03', 'children-and-infants-04', 'children-and-infants-05', 'children-and-infants-06']), justification: 'Toys (01) and several infant items already covered via scoped hints; rows 02 (electric/wireless toys) and 04 (infant bed/crib/cradle) carried only umbrella phrasing -- closed with new supplements.' }),
  Object.freeze({ familyValue: 'textile_apparel_and_footwear', status: 'A', coverageSource: 'matrix', matrixIds: Object.freeze(['textiles-and-furniture-01', 'textiles-and-furniture-02', 'textiles-and-furniture-04']), justification: 'Matrix aliases already name concrete garment/footwear products.' }),
  Object.freeze({ familyValue: 'furniture_and_home_goods', status: 'A', coverageSource: 'matrix', matrixIds: Object.freeze(['textiles-and-furniture-03', 'textiles-and-furniture-05']), justification: 'Matrix aliases already name concrete furniture/mattress products.' }),
  Object.freeze({ familyValue: 'glass_ceramics_and_tableware', status: 'A', coverageSource: 'matrix', matrixIds: Object.freeze(['food-contact-03', 'food-contact-04']), justification: 'Matrix aliases already name concrete glass/ceramic tableware products.' }),
  Object.freeze({ familyValue: 'plastics_polymers_and_coated_products', status: 'A', coverageSource: 'matrix', matrixIds: Object.freeze(['food-contact-01', 'food-contact-02']), justification: 'Matrix aliases already name concrete plastic/coated-product items.' }),
  Object.freeze({ familyValue: 'vehicle_parts_and_transport_accessories', status: 'C', coverageSource: 'alias_supplement', matrixIds: Object.freeze(['vehicles-and-transport-03', 'vehicles-and-transport-04', 'vehicles-and-transport-05', 'vehicles-and-transport-06', 'vehicles-and-transport-07', 'vehicles-and-transport-08', 'vehicles-and-transport-09']), justification: 'Rows 03/04/05/08 already well covered (generic parts, motorcycle parts, lights, glass); rows 06/07/09 (brake/steering/safety, tires/wheels, comfort/decor) carried only umbrella phrasing -- closed with new vehicle-context-bound supplements; aluminum-for-vehicle wording also added to row 03.' }),
  Object.freeze({ familyValue: 'medical_equipment_or_medical_use', status: 'B', coverageSource: 'scoped_hint', matrixIds: Object.freeze(['health-and-cosmetics-02', 'health-and-cosmetics-03']), justification: 'CANDIDATE_SET_SCOPED_HINTS already names specific devices (blood pressure monitor, thermometer, ...); a "מכשיר רפואי" wording variant added as a C-tier supplement.' }),
  Object.freeze({ familyValue: 'chemicals_paints_adhesives_aerosols', status: 'C', coverageSource: 'alias_supplement', matrixIds: Object.freeze(['chemicals-and-materials-01', 'chemicals-and-materials-02', 'chemicals-and-materials-03', 'chemicals-and-materials-04']), justification: 'Row 01 already had concrete cleaning-product aliases; rows 02/03/04 (paints/adhesives, pest control, industrial chemicals) carried only their own umbrella phrase -- closed with new supplements naming the product itself (paint, adhesive, sealant, pest-control product, industrial chemical/hazardous material), never a bare "material"/"substance" word.' }),
  Object.freeze({ familyValue: 'animal_origin_products', status: 'A', coverageSource: 'matrix', matrixIds: Object.freeze(['food-and-beverages-04']), justification: 'Matrix aliases already name concrete animal-origin foods.' }),
  Object.freeze({ familyValue: 'live_animals', status: 'A', coverageSource: 'matrix', matrixIds: Object.freeze(['food-and-beverages-08']), justification: 'Matrix alias "בעלי חיים" directly names the concept.' }),
  Object.freeze({ familyValue: 'animal_feed', status: 'A', coverageSource: 'matrix', matrixIds: Object.freeze(['food-and-beverages-09']), justification: 'Matrix aliases already name concrete pet/livestock feed products.' }),
  Object.freeze({ familyValue: 'plant_origin_products', status: 'C', coverageSource: 'alias_supplement', matrixIds: Object.freeze(['food-and-beverages-05', 'construction-and-industrial-03']), justification: 'Produce/seed aliases already present; a live-plant singular-wording gap closed with a new supplement, deliberately excluding cosmetic plant-ingredient phrasing.' }),
  Object.freeze({ familyValue: 'industrial_machinery_and_equipment', status: 'C', coverageSource: 'alias_supplement', matrixIds: Object.freeze(['construction-and-industrial-02']), justification: 'Root-cause gap: the row carried only its own umbrella phrase, no product/component noun. Closed with a new supplement combining "machine"/"machine component" with steel/industrial-production context -- never the bare material alone. No dedicated "machine parts" checkbox exists in the 41-family model, so a component description is presented under this same general row (its own label is "industrial machinery and equipment", not "complete machine").' }),
  Object.freeze({ familyValue: 'building_materials', status: 'C', coverageSource: 'alias_supplement', matrixIds: Object.freeze(['construction-and-industrial-01']), justification: 'Root-cause gap (reproduced defect): the row carried only its own umbrella phrase. Closed with a new supplement combining aluminum/steel/wood/concrete/gypsum with an explicit construction/building use -- never the bare material alone.' }),
  Object.freeze({ familyValue: 'building_glass', status: 'A', coverageSource: 'matrix', matrixIds: Object.freeze(['construction-and-industrial-06']), justification: 'Matrix aliases already name the concrete building-safety-glass concept, distinct from vehicle safety glass (vehicles-and-transport-08).' }),
  Object.freeze({ familyValue: 'medicines', status: 'A', coverageSource: 'matrix', matrixIds: Object.freeze(['health-and-cosmetics-04']), justification: 'The bare product noun "תרופות" (medicines) is itself the direct, unambiguous product name -- no material or characteristic term is involved.' }),
  Object.freeze({ familyValue: 'sports_and_fitness_equipment', status: 'A', coverageSource: 'matrix', matrixIds: Object.freeze(['additional-consumer-products-01']), justification: 'Matrix aliases already name concrete sports-equipment products, kept distinct from PPE per the sports-vs-PPE product-owner rule (unchanged, out of this task\'s scope).' }),
  Object.freeze({ familyValue: 'personal_protective_equipment', status: 'B', coverageSource: 'alias_supplement', matrixIds: Object.freeze(['additional-consumer-products-06']), justification: 'Matrix aliases plus a pre-existing sports-vs-occupational presentation-alias-supplement already provide safe, reviewed coverage (unchanged, out of this task\'s scope).' }),
  Object.freeze({ familyValue: 'ordinary_bicycles', status: 'B', coverageSource: 'alias_supplement', matrixIds: Object.freeze(['additional-consumer-products-02']), justification: 'Real matrix aliases already name concrete bicycle products (אופניים, mountain bicycle); a pre-existing presentation-alias-supplement provides additional coverage (unchanged, out of this task\'s scope).' }),
  Object.freeze({ familyValue: 'motorized_bicycles', status: 'A', coverageSource: 'matrix', matrixIds: Object.freeze(['additional-consumer-products-07']), justification: 'Matrix aliases already name concrete electric-bicycle products.' }),
  Object.freeze({ familyValue: 'non_motorized_scooters', status: 'B', coverageSource: 'concept_hint', matrixIds: Object.freeze(['additional-consumer-products-02']), justification: 'Qualified-phrase matrix aliases already present; the bare "קורקינט"/"scooter" concept resolving to this subtype is covered by the PR #66 concept-level scooter presentation hint (unchanged, out of this task\'s scope).' }),
  Object.freeze({ familyValue: 'motorized_scooters', status: 'B', coverageSource: 'concept_hint', matrixIds: Object.freeze(['additional-consumer-products-07']), justification: 'Qualified-phrase matrix aliases already present; the bare "קורקינט"/"scooter" concept resolving to this subtype is covered by the PR #66 concept-level scooter presentation hint (unchanged, out of this task\'s scope).' }),
  Object.freeze({ familyValue: 'complete_vehicles', status: 'B', coverageSource: 'scoped_hint', matrixIds: Object.freeze(['vehicles-and-transport-01', 'vehicles-and-transport-02']), justification: 'Covered via CANDIDATE_SET_SCOPED_HINTS (motorcycle presentation/resolution correction, unchanged, out of this task\'s scope).' }),
  Object.freeze({ familyValue: 'marine_equipment', status: 'C', coverageSource: 'alias_supplement', matrixIds: Object.freeze(['additional-consumer-products-04']), justification: 'The row carried only its own umbrella phrase. Closed with new supplements naming concrete marine-safety products (life jacket, life buoy, boat anchor) only -- deliberately excludes "waterproof" or "used near water" wording per product-owner rule E.' }),
  Object.freeze({ familyValue: 'pet_products', status: 'C', coverageSource: 'alias_supplement', matrixIds: Object.freeze(['additional-consumer-products-05']), justification: 'Matrix aliases already name most concrete pet-accessory products; a dog/cat-bed wording gap closed with a new supplement.' }),
  Object.freeze({ familyValue: 'hand_tools', status: 'A', coverageSource: 'matrix', matrixIds: Object.freeze(['construction-and-industrial-04']), justification: 'Matrix aliases already name concrete hand-tool products (hammer, screwdriver, pliers, wrench, saw).' }),
  Object.freeze({ familyValue: 'cardboard_packaging', status: 'A', coverageSource: 'matrix', matrixIds: Object.freeze(['additional-consumer-products-08']), justification: 'Matrix aliases already name concrete cardboard-packaging products.' }),
  Object.freeze({ familyValue: 'wooden_packaging', status: 'A', coverageSource: 'matrix', matrixIds: Object.freeze(['construction-and-industrial-05']), justification: 'Matrix aliases already name concrete wooden-packaging products.' }),
  Object.freeze({ familyValue: 'paper_and_printed_products', status: 'A', coverageSource: 'matrix', matrixIds: Object.freeze(['additional-consumer-products-09']), justification: 'Matrix aliases already name concrete paper/printed products.' }),
  Object.freeze({ familyValue: 'rugs_and_carpets', status: 'A', coverageSource: 'matrix', matrixIds: Object.freeze(['textiles-and-furniture-06']), justification: 'Matrix alias directly names the concrete product.' }),
  Object.freeze({ familyValue: 'blankets', status: 'A', coverageSource: 'matrix', matrixIds: Object.freeze(['textiles-and-furniture-07']), justification: 'Matrix alias directly names the concrete product; electrically-wired-blanket distinction preserved (unchanged, out of this task\'s scope).' }),
  Object.freeze({ familyValue: 'general_household_textile_products', status: 'C', coverageSource: 'alias_supplement', matrixIds: Object.freeze(['textiles-and-furniture-08']), justification: 'Matrix aliases already name bedding/towels/upholstery; a curtain singular-wording gap closed with a new supplement.' }),
  Object.freeze({ familyValue: 'other_general_product', status: 'S', coverageSource: 'special_option', matrixIds: Object.freeze([]), justification: 'Special catch-all option: never a concept target, always available in every fallback and narrowed state.' }),
  Object.freeze({ familyValue: 'not_sure', status: 'S', coverageSource: 'special_option', matrixIds: Object.freeze([]), justification: 'Special catch-all option: never a concept target, always available in every fallback and narrowed state.' }),
]);

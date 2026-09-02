/**
 * Canonical, declarative concept-coverage status registry for every
 * visible product-family checkbox value (family-material-disclosure.js
 * `ALL_PRODUCT_FAMILY_VALUES`). This module carries no term-matching
 * logic of its own and never participates in `suggestProductFamilyValues`
 * -- it exists solely so the coverage GATE test
 * (family-concept-coverage-gate.test.js) can prove, from the live
 * registries, that every visible family has a reviewed, documented
 * status, with zero manual copy-paste of the family list into a
 * separate report.
 *
 * Coverage statuses:
 *   A - safe, specific matrix terminology already identifies this
 *       family (the matrix row's own aliases include concrete product
 *       nouns, not merely the row's own umbrella category name).
 *   B - an existing presentation concept hint or candidate-set-scoped
 *       identification hint (product-family-selection-mapping.js)
 *       already provides safe coverage.
 *   C - a new presentation-alias-supplement entry was added (this task
 *       or the prior material/context correction) to close a genuine
 *       gap where the matrix row carried only its own umbrella phrase.
 *   D - deliberately left without a specific-family presentation term;
 *       every D entry below states the concrete technical reason (never
 *       "not yet written").
 *   S - special option (other_general_product / not_sure): never a
 *       concept target, always available, exempt from every other
 *       status's evidence requirement.
 */

export const COVERAGE_STATUS = Object.freeze({
  A: 'A', B: 'B', C: 'C', D: 'D', S: 'S',
});

/**
 * @typedef {{
 *   familyValue: string,
 *   status: 'A'|'B'|'C'|'D'|'S',
 *   matrixIds: string[],
 *   justification: string,
 * }} FamilyCoverageEntry
 */

/** @type {FamilyCoverageEntry[]} */
export const FAMILY_CONCEPT_COVERAGE = Object.freeze([
  Object.freeze({ familyValue: 'cosmetics_and_beauty', status: 'A', matrixIds: Object.freeze(['health-and-cosmetics-01', 'health-and-cosmetics-05']), justification: 'Matrix aliases already name concrete cosmetic/perfume products (קרם פנים, דיאודורנט, בושם, ...); deodorant spelling variant added as a C-tier supplement.' }),
  Object.freeze({ familyValue: 'food_and_beverage', status: 'A', matrixIds: Object.freeze(['food-and-beverages-01', 'food-and-beverages-02']), justification: 'Matrix aliases already name concrete packaged-food/beverage products.' }),
  Object.freeze({ familyValue: 'dietary_supplements', status: 'A', matrixIds: Object.freeze(['food-and-beverages-03', 'food-and-beverages-06', 'food-and-beverages-07']), justification: 'Matrix aliases already name concrete supplement/vitamin products; a human-vitamins wording variant added as a C-tier supplement.' }),
  Object.freeze({ familyValue: 'food_contact_items', status: 'A', matrixIds: Object.freeze(['food-contact-01', 'food-contact-02', 'food-contact-03', 'food-contact-04', 'food-contact-05']), justification: 'Matrix aliases already name concrete food-contact vessels; aluminum-cookware wording added as a C-tier supplement.' }),
  Object.freeze({ familyValue: 'electrical_and_electronics', status: 'C', matrixIds: Object.freeze(['electrical-and-electronics-01', 'electrical-and-electronics-02', 'electrical-and-electronics-03', 'electrical-and-electronics-04', 'electrical-and-electronics-08']), justification: 'Row 01 already had a generic-appliance alias; rows 02/03/04/08 (charger, cables, non-networked electronics, lighting) carried only their own umbrella phrase -- closed with new supplements (phone charger/power supply, electrical cable, pocket calculator/digital watch, light fixture/bulb).' }),
  Object.freeze({ familyValue: 'wireless_or_transmitting_equipment', status: 'A', matrixIds: Object.freeze(['electrical-and-electronics-05', 'electrical-and-electronics-06', 'electrical-and-electronics-10', 'additional-consumer-products-03']), justification: 'Matrix aliases already name Wi-Fi/Bluetooth/drone products; a wireless-router wording variant added as a C-tier supplement.' }),
  Object.freeze({ familyValue: 'batteries_or_battery_containing', status: 'C', matrixIds: Object.freeze(['electrical-and-electronics-07', 'electrical-and-electronics-09', 'vehicles-and-transport-10']), justification: 'Standalone/vehicle-battery rows already well covered; the battery-containing-equipment row (electrical-and-electronics-09) had no positive alias of its own for the "with a battery" phrasing its sibling row deliberately excludes -- closed with a new supplement, now negation-aware.' }),
  Object.freeze({ familyValue: 'childrens_products_and_toys', status: 'C', matrixIds: Object.freeze(['children-and-infants-01', 'children-and-infants-02', 'children-and-infants-03', 'children-and-infants-04', 'children-and-infants-05', 'children-and-infants-06']), justification: 'Toys (01) and several infant items already covered via scoped hints; rows 02 (electric/wireless toys) and 04 (infant bed/crib/cradle) carried only umbrella phrasing -- closed with new supplements.' }),
  Object.freeze({ familyValue: 'textile_apparel_and_footwear', status: 'A', matrixIds: Object.freeze(['textiles-and-furniture-01', 'textiles-and-furniture-02', 'textiles-and-furniture-04']), justification: 'Matrix aliases already name concrete garment/footwear products.' }),
  Object.freeze({ familyValue: 'furniture_and_home_goods', status: 'A', matrixIds: Object.freeze(['textiles-and-furniture-03', 'textiles-and-furniture-05']), justification: 'Matrix aliases already name concrete furniture/mattress products.' }),
  Object.freeze({ familyValue: 'glass_ceramics_and_tableware', status: 'A', matrixIds: Object.freeze(['food-contact-03', 'food-contact-04']), justification: 'Matrix aliases already name concrete glass/ceramic tableware products.' }),
  Object.freeze({ familyValue: 'plastics_polymers_and_coated_products', status: 'A', matrixIds: Object.freeze(['food-contact-01', 'food-contact-02']), justification: 'Matrix aliases already name concrete plastic/coated-product items.' }),
  Object.freeze({ familyValue: 'vehicle_parts_and_transport_accessories', status: 'C', matrixIds: Object.freeze(['vehicles-and-transport-03', 'vehicles-and-transport-04', 'vehicles-and-transport-05', 'vehicles-and-transport-06', 'vehicles-and-transport-07', 'vehicles-and-transport-08', 'vehicles-and-transport-09']), justification: 'Rows 03/04/05/08 already well covered (generic parts, motorcycle parts, lights, glass); rows 06/07/09 (brake/steering/safety, tires/wheels, comfort/decor) carried only umbrella phrasing -- closed with new vehicle-context-bound supplements; aluminum-for-vehicle wording also added to row 03.' }),
  Object.freeze({ familyValue: 'medical_equipment_or_medical_use', status: 'B', matrixIds: Object.freeze(['health-and-cosmetics-02', 'health-and-cosmetics-03']), justification: 'CANDIDATE_SET_SCOPED_HINTS already names specific devices (blood pressure monitor, thermometer, ...); a "מכשיר רפואי" wording variant added as a C-tier supplement.' }),
  Object.freeze({ familyValue: 'chemicals_paints_adhesives_aerosols', status: 'C', matrixIds: Object.freeze(['chemicals-and-materials-01', 'chemicals-and-materials-02', 'chemicals-and-materials-03', 'chemicals-and-materials-04']), justification: 'Row 01 already had concrete cleaning-product aliases; rows 02/03/04 (paints/adhesives, pest control, industrial chemicals) carried only their own umbrella phrase -- closed with new supplements naming the product itself (paint, adhesive, sealant, pest-control product, industrial chemical/hazardous material), never a bare "material"/"substance" word.' }),
  Object.freeze({ familyValue: 'animal_origin_products', status: 'A', matrixIds: Object.freeze(['food-and-beverages-04']), justification: 'Matrix aliases already name concrete animal-origin foods.' }),
  Object.freeze({ familyValue: 'live_animals', status: 'A', matrixIds: Object.freeze(['food-and-beverages-08']), justification: 'Matrix alias "בעלי חיים" directly names the concept.' }),
  Object.freeze({ familyValue: 'animal_feed', status: 'A', matrixIds: Object.freeze(['food-and-beverages-09']), justification: 'Matrix aliases already name concrete pet/livestock feed products.' }),
  Object.freeze({ familyValue: 'plant_origin_products', status: 'C', matrixIds: Object.freeze(['food-and-beverages-05', 'construction-and-industrial-03']), justification: 'Produce/seed aliases already present; a live-plant singular-wording gap closed with a new supplement, deliberately excluding cosmetic plant-ingredient phrasing (see negative-context review below).' }),
  Object.freeze({ familyValue: 'industrial_machinery_and_equipment', status: 'C', matrixIds: Object.freeze(['construction-and-industrial-02']), justification: 'Root-cause gap: the row carried only its own umbrella phrase, no product/component noun. Closed with a new supplement combining "machine"/"machine component" with steel/industrial-production context -- never the bare material alone. No dedicated "machine parts" checkbox exists in the 41-family model, so a component description is presented under this same general row (its own label is "industrial machinery and equipment", not "complete machine").' }),
  Object.freeze({ familyValue: 'building_materials', status: 'C', matrixIds: Object.freeze(['construction-and-industrial-01']), justification: 'Root-cause gap (reproduced defect): the row carried only its own umbrella phrase. Closed with a new supplement combining aluminum/steel/wood/concrete/gypsum with an explicit construction/building use -- never the bare material alone.' }),
  Object.freeze({ familyValue: 'building_glass', status: 'A', matrixIds: Object.freeze(['construction-and-industrial-06']), justification: 'Matrix aliases already name the concrete building-safety-glass concept, distinct from vehicle safety glass (vehicles-and-transport-08).' }),
  Object.freeze({ familyValue: 'medicines', status: 'A', matrixIds: Object.freeze(['health-and-cosmetics-04']), justification: 'The bare product noun "תרופות" (medicines) is itself the direct, unambiguous product name -- no material or characteristic term is involved.' }),
  Object.freeze({ familyValue: 'sports_and_fitness_equipment', status: 'A', matrixIds: Object.freeze(['additional-consumer-products-01']), justification: 'Matrix aliases already name concrete sports-equipment products, kept distinct from PPE per the sports-vs-PPE product-owner rule (unchanged, out of this task\'s scope).' }),
  Object.freeze({ familyValue: 'personal_protective_equipment', status: 'B', matrixIds: Object.freeze(['additional-consumer-products-06']), justification: 'Matrix aliases plus an existing sports-vs-occupational presentation hint already provide safe, reviewed coverage (unchanged, out of this task\'s scope).' }),
  Object.freeze({ familyValue: 'ordinary_bicycles', status: 'B', matrixIds: Object.freeze(['additional-consumer-products-02']), justification: 'Covered via real matrix aliases and the PR #66 concept-level scooter/bicycle presentation work (unchanged, out of this task\'s scope).' }),
  Object.freeze({ familyValue: 'motorized_bicycles', status: 'A', matrixIds: Object.freeze(['additional-consumer-products-07']), justification: 'Matrix aliases already name concrete electric-bicycle products.' }),
  Object.freeze({ familyValue: 'non_motorized_scooters', status: 'B', matrixIds: Object.freeze(['additional-consumer-products-02']), justification: 'Covered via the PR #66 concept-level scooter presentation work (unchanged, out of this task\'s scope).' }),
  Object.freeze({ familyValue: 'motorized_scooters', status: 'B', matrixIds: Object.freeze(['additional-consumer-products-07']), justification: 'Covered via the PR #66 concept-level scooter presentation work (unchanged, out of this task\'s scope).' }),
  Object.freeze({ familyValue: 'complete_vehicles', status: 'B', matrixIds: Object.freeze(['vehicles-and-transport-01', 'vehicles-and-transport-02']), justification: 'Covered via CANDIDATE_SET_SCOPED_HINTS (motorcycle presentation/resolution correction, unchanged, out of this task\'s scope).' }),
  Object.freeze({ familyValue: 'marine_equipment', status: 'C', matrixIds: Object.freeze(['additional-consumer-products-04']), justification: 'The row carried only its own umbrella phrase. Closed with new supplements naming concrete marine-safety products (life jacket, life buoy, boat anchor) only -- deliberately excludes "waterproof" or "used near water" wording per product-owner rule E.' }),
  Object.freeze({ familyValue: 'pet_products', status: 'C', matrixIds: Object.freeze(['additional-consumer-products-05']), justification: 'Matrix aliases already name most concrete pet-accessory products; a dog/cat-bed wording gap closed with a new supplement.' }),
  Object.freeze({ familyValue: 'hand_tools', status: 'A', matrixIds: Object.freeze(['construction-and-industrial-04']), justification: 'Matrix aliases already name concrete hand-tool products (hammer, screwdriver, pliers, wrench, saw).' }),
  Object.freeze({ familyValue: 'cardboard_packaging', status: 'A', matrixIds: Object.freeze(['additional-consumer-products-08']), justification: 'Matrix aliases already name concrete cardboard-packaging products.' }),
  Object.freeze({ familyValue: 'wooden_packaging', status: 'A', matrixIds: Object.freeze(['construction-and-industrial-05']), justification: 'Matrix aliases already name concrete wooden-packaging products.' }),
  Object.freeze({ familyValue: 'paper_and_printed_products', status: 'A', matrixIds: Object.freeze(['additional-consumer-products-09']), justification: 'Matrix aliases already name concrete paper/printed products.' }),
  Object.freeze({ familyValue: 'rugs_and_carpets', status: 'A', matrixIds: Object.freeze(['textiles-and-furniture-06']), justification: 'Matrix alias directly names the concrete product.' }),
  Object.freeze({ familyValue: 'blankets', status: 'A', matrixIds: Object.freeze(['textiles-and-furniture-07']), justification: 'Matrix alias directly names the concrete product; electrically-wired-blanket distinction preserved (unchanged, out of this task\'s scope).' }),
  Object.freeze({ familyValue: 'general_household_textile_products', status: 'C', matrixIds: Object.freeze(['textiles-and-furniture-08']), justification: 'Matrix aliases already name bedding/towels/upholstery; a curtain singular-wording gap closed with a new supplement.' }),
  Object.freeze({ familyValue: 'other_general_product', status: 'S', matrixIds: Object.freeze([]), justification: 'Special catch-all option: never a concept target, always available in every fallback and narrowed state.' }),
  Object.freeze({ familyValue: 'not_sure', status: 'S', matrixIds: Object.freeze([]), justification: 'Special catch-all option: never a concept target, always available in every fallback and narrowed state.' }),
]);

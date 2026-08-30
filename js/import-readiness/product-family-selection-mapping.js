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
  // Ambiguous (Wave 3, 2026-08-27): drones added as a third candidate
  // -- a drone is wireless/transmitting equipment for the purpose of
  // this checkbox, but requires its own Ministry of Communications
  // routing, disambiguated by free text via the "רחפן"/"drone"
  // aliases.
  // Drone duplicate resolved (coverage completion, product-owner-
  // directed): additional-consumer-products-03 ("רחפנים", plural-named)
  // is a genuine duplicate of electrical-and-electronics-10 ("רחפן")
  // -- byte-identical regulatorySignals, confirmed during review. Added
  // as a fourth candidate here rather than exposing a second visible
  // drone checkbox: this checkbox's own free-text disambiguation
  // already resolves either row to the identical outcome, and
  // resolveFamilyIdentificationOptions's own union-of-candidates logic
  // (product-family-identification.js) already collapses multiple
  // candidates that land on the same result correctly. Its own
  // accessory/part exclusions were added to FAMILY_NEGATIVE_TERMS
  // (product-family-identification.js) mirroring
  // electrical-and-electronics-10's existing ones, extended to also
  // cover plural Hebrew/English forms for both matrix ids.
  wireless_or_transmitting_equipment: Object.freeze([
    'electrical-and-electronics-05',
    'electrical-and-electronics-06',
    'electrical-and-electronics-10',
    'additional-consumer-products-03',
  ]),
  // Ambiguous (grouped-battery-selection completion, 2026-08-26): was a
  // single-candidate (forced) checkbox before the product-owner-final
  // decision that this grouping must not force equipment merely
  // containing an internal battery into the standalone-battery
  // approval result. Now restricts to 3 genuinely different directions
  // -- standalone battery/accumulator (standards), a vehicle-dedicated
  // accumulator (vehicle-laboratory), or equipment that merely contains
  // a battery (no positive category, cautious guidance) -- free text
  // disambiguates within this set via the aliases/exclusions already
  // added (scripts/generate_product_family_matrix.py,
  // FAMILY_NEGATIVE_TERMS in product-family-identification.js).
  batteries_or_battery_containing: Object.freeze([
    'electrical-and-electronics-07',
    'electrical-and-electronics-09',
    'vehicles-and-transport-10',
  ]),
  // Ambiguous: plain toys, electric/wireless toys, baby products, or
  // nursery furniture (strollers/cribs/high chairs). Wave 3
  // (2026-08-27) added two more genuinely distinct child-product
  // candidates -- pacifier holder and infant carrier -- both already
  // reaching the same Standards Institution direction as the existing
  // candidates in this set, disambiguated by their own narrow aliases.
  childrens_products_and_toys: Object.freeze([
    'children-and-infants-01',
    'children-and-infants-02',
    'children-and-infants-03',
    'children-and-infants-04',
    'children-and-infants-05',
    'children-and-infants-06',
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
  // Ambiguous (final completion pass, 2026-08-26): ordinary furniture
  // vs. mattresses -- was a single-candidate (forced) checkbox before
  // the approved rule required two different primary directions
  // (mattress: standards positive; ordinary furniture: no positive).
  // Free text now disambiguates within this set via the row-specific
  // aliases already added (scripts/generate_product_family_matrix.py).
  furniture_and_home_goods: Object.freeze(['textiles-and-furniture-03', 'textiles-and-furniture-05']),
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
  // Live animals (live-animals completion, 2026-08-26): a new, distinct
  // checkbox and row -- deliberately NOT merged into animal_origin_products
  // above, per the product owner's explicit rule that a live animal is not
  // merely "a product of animal origin" from the user's perspective.
  live_animals: Object.freeze(['food-and-beverages-08']),
  // Animal feed (animal-feed completion, 2026-08-27): a new, distinct
  // checkbox and row -- animal feed is not a live animal, not a
  // product of animal origin, and not a non-food pet product/
  // accessory (the pre-existing, unmapped-by-checkbox
  // additional-consumer-products-05 row, unchanged).
  animal_feed: Object.freeze(['food-and-beverages-09']),
  // Ambiguous: agricultural produce/seeds/plants vs. wood/plant-origin
  // raw material.
  plant_origin_products: Object.freeze(['food-and-beverages-05', 'construction-and-industrial-03']),
  industrial_machinery_and_equipment: Object.freeze(['construction-and-industrial-02']),
  building_materials: Object.freeze(['construction-and-industrial-01']),
  // Building glass (coverage completion, product-owner-directed): kept
  // as its OWN dedicated checkbox rather than grouped into
  // building_materials -- grouping would have turned building_materials
  // from a single-candidate (unambiguous, forced) checkbox into an
  // ambiguous two-candidate one, breaking its existing, already-tested
  // "explicit selection alone resolves the result with neutral text"
  // guarantee (product-family-guidance.test.js test 20,
  // product-family-wave2-guidance.test.js test 35) for every existing
  // user of that checkbox -- exactly the kind of already-covered-family
  // regression this task must not introduce. Distinct from the
  // reachable vehicles-and-transport-08 vehicle-safety-glass row
  // (different regulatorySignal: standards vs
  // transportOrVehicleLaboratory, confirmed not a duplicate) per
  // principle 8 (building glass must remain distinct from vehicle
  // glass).
  building_glass: Object.freeze(['construction-and-industrial-06']),
  // Medicines (coverage completion): a dedicated checkbox, deliberately
  // NOT merged into medical_equipment_or_medical_use -- a medicine is
  // not a medical device or a product carrying a medical claim, and
  // this matrix row's own regulatory signal (healthUmbrella) is
  // unrelated to that checkbox's own candidate set's signals.
  medicines: Object.freeze(['health-and-cosmetics-04']),
  // Sports and fitness equipment (correction pass, product-owner rule
  // 2): SPLIT from the previous combined "sports_and_protective_equipment"
  // checkbox -- that grouping risked a sports-protective-equipment
  // description resolving through the same ambiguous set as general
  // PPE, and grouping a no-positive-signal row with a standards-signal
  // row under one label misrepresented the scope. Now a dedicated,
  // single-candidate (unambiguous, forced), no-positive-signal
  // checkbox -- ordinary sports/fitness equipment only.
  sports_and_fitness_equipment: Object.freeze(['additional-consumer-products-01']),
  // General personal protective equipment (correction pass): SPLIT out
  // as its own dedicated, single-candidate checkbox with the existing
  // standards signal. Sports-context protective equipment must remain
  // in the sports checkbox above and never resolve here (see the
  // PRESENTATION_ALIAS_SUPPLEMENTS entries in family-material-
  // disclosure.js for the "ציוד מגן לספורט" vs. "ציוד מגן לעבודה"
  // presentation-level distinction, since neither matrix row has an
  // alias for either exact compound phrase).
  personal_protective_equipment: Object.freeze(['additional-consumer-products-06']),
  // Bicycles and scooters (correction pass, product-owner rule E):
  // SPLIT the previous combined "bicycles_and_scooters" checkbox into
  // four fully deterministic (single-candidate, forced) checkboxes.
  // The active matrix does NOT have separate rows for bicycles vs.
  // scooters -- inspection confirmed both concepts are already aliased
  // onto the SAME two existing rows, split only by motorization state:
  //   - additional-consumer-products-02 ("אופניים וקורקינטים רגילים"):
  //     aliases already include "קורקינט רגיל"/"non-motorized scooter"
  //     alongside "אופניים"/"bicycle" -- standards signal.
  //   - additional-consumer-products-07 ("אופניים או קורקינט עם מנוע
  //     עזר"): aliases already include "קורקינט חשמלי"/"electric
  //     scooter" alongside "אופניים חשמליים"/"electric bicycle" --
  //     transportOrVehicleLaboratory signal.
  // No regulatory signal was modified. Two checkboxes intentionally
  // point at the SAME matrix id each (ordinary_bicycles and
  // non_motorized_scooters both force additional-consumer-products-02;
  // motorized_bicycles and motorized_scooters both force
  // additional-consumer-products-07) -- this is not an ambiguity, each
  // checkbox alone is a single-candidate, fully deterministic forced
  // selection.
  ordinary_bicycles: Object.freeze(['additional-consumer-products-02']),
  motorized_bicycles: Object.freeze(['additional-consumer-products-07']),
  non_motorized_scooters: Object.freeze(['additional-consumer-products-02']),
  motorized_scooters: Object.freeze(['additional-consumer-products-07']),
  // Complete vehicles and motorcycles (correction pass, product-owner
  // rule C): kept as ONE combined checkbox -- confirmed deterministic:
  // vehicles-and-transport-01's own alias ("כלי רכב שלמים") and
  // vehicles-and-transport-02's own alias ("אופנועים וקטנועים שלמים")
  // are lexically disjoint, so free text always resolves to exactly one
  // of the two candidates (never both), same precedent as every other
  // ambiguous-candidate-set checkbox in this file. Both rows share the
  // identical transportOrVehicleLaboratory (Ministry of Transport)
  // regulatory signal -- unmodified. Visible label updated to the
  // product-owner's own example wording ("כלי רכב שלמים ואופנועים") to
  // make the scope explicit.
  complete_vehicles: Object.freeze(['vehicles-and-transport-01', 'vehicles-and-transport-02']),
  // Marine equipment and watercraft (coverage completion): a single,
  // unambiguous matrix row.
  marine_equipment: Object.freeze(['additional-consumer-products-04']),
  // Pet products (coverage completion): ordinary pet accessories
  // (leashes, collars, beds, bowls, toys, grooming brushes, aquarium
  // accessories) -- deliberately kept separate from
  // animal_origin_products/live_animals/animal_feed, which are about
  // products FROM animals, live animals themselves, or food FOR
  // animals, not accessories FOR pets.
  pet_products: Object.freeze(['additional-consumer-products-05']),
  // Hand tools (coverage completion): non-electric hand tools --
  // deliberately NOT merged into industrial_machinery_and_equipment
  // (that checkbox's own candidate set, construction-and-industrial-02,
  // is machines/industrial equipment specifically; a hammer or
  // screwdriver is not machinery).
  hand_tools: Object.freeze(['construction-and-industrial-04']),
  // Cardboard packaging (coverage completion): kept as its own
  // checkbox, separate from wooden packaging below -- the two rows'
  // regulatory signals genuinely differ (cardboard: no positive
  // category; wooden packaging: agriculture-related signal, a real
  // wood-packaging-material concern distinct from cardboard), and
  // separate from the existing food-contact-02 (polymer-coated
  // cardboard for FOOD CONTACT specifically), which remains reachable
  // only through food_contact_items/plastics_polymers_and_coated_products
  // as before -- ordinary, non-food-contact cardboard packaging is a
  // different, unrelated concept from that food-contact row.
  cardboard_packaging: Object.freeze(['additional-consumer-products-08']),
  // Wooden packaging (coverage completion): kept separate from
  // cardboard packaging above -- see that entry's comment for why.
  wooden_packaging: Object.freeze(['construction-and-industrial-05']),
  // Paper and printed products (coverage completion): a single,
  // unambiguous matrix row (printing paper, notebooks, ordinary books,
  // labels, printed products generally).
  paper_and_printed_products: Object.freeze(['additional-consumer-products-09']),
  // Rugs/carpets, blankets, and general household textiles (correction
  // pass): SPLIT the previous combined "household_textile_products"
  // checkbox into three dedicated, single-candidate (unambiguous,
  // forced) checkboxes -- each maps to exactly its own intended matrix
  // row, no free-text disambiguation needed, no shared regulatory
  // result. Preserves the existing per-row professional distinctions
  // unmodified:
  //   - rugs_and_carpets -> textiles-and-furniture-06: existing
  //     standards signal (Standards Institution review direction).
  //   - blankets -> textiles-and-furniture-07: no positive signal by
  //     default; an electrically wired blanket separately reaches
  //     Standards via the existing, unrelated mains-connected-
  //     electrical-product detailed rule (see product-family-
  //     guidance.js's own note on this row) -- untouched by this
  //     checkbox split.
  //   - general_household_textile_products -> textiles-and-furniture-08
  //     (bedding/curtains/towels/upholstery fabric/fabric bags): no
  //     positive signal, per the existing project rule that ordinary
  //     household textiles (not apparel, not protective equipment, not
  //     a dedicated baby product) generally require no approval
  //     direction.
  // Still deliberately NOT merged into textile_apparel_and_footwear
  // (apparel/footwear only) or furniture_and_home_goods (furniture
  // only) -- a rug, blanket, or curtain is neither.
  rugs_and_carpets: Object.freeze(['textiles-and-furniture-06']),
  blankets: Object.freeze(['textiles-and-furniture-07']),
  general_household_textile_products: Object.freeze(['textiles-and-furniture-08']),
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

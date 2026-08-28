/**
 * Layered questionnaire data model for FreighTime's Import Readiness
 * assessment.
 *
 * This module is the architecture container described in
 * IMPORT_READINESS_V1.md's "layered questionnaire architecture" note:
 * it defines the eight conceptual layers of an import-readiness check,
 * the option lists for each layer's questions, and the pure, DOM-free
 * conditional-branching logic that decides which layers/questions a
 * given in-progress answer set actually needs.
 *
 * IMPORTANT SAFETY BOUNDARY: this module collects and organizes
 * structured product data (family, use, materials, technical
 * characteristics, documents, commercial status). It never itself
 * asserts a regulatory fact, a compliance conclusion, or a
 * category-specific safety claim. Turning collected answers into
 * result content is the job of the existing, already-reviewed
 * scenario result builders (personal-import-rules.js,
 * first-commercial-import-rules.js, existing-importer-rules.js) and
 * the existing, gate-enforced regulatory-signals pilot -- never this
 * module. See rules-registry.js for the safety gate itself.
 *
 * Pure, deterministic, DOM-free, network-free, storage-free.
 */

/** The eight conceptual layers, in their natural order. Not every layer is shown for every path -- see `applicableLayers`. */
export const LAYER = Object.freeze({
  OBJECTIVE_AND_STAGE: 'objective_and_stage',
  PRODUCT_FAMILY: 'product_family',
  USE_AND_TARGET_USER: 'use_and_target_user',
  MATERIALS: 'materials',
  TECHNICAL_CHARACTERISTICS: 'technical_characteristics',
  DOCUMENTS_AND_MARKING: 'documents_and_marking',
  SHIPMENT_AND_COMMERCIAL: 'shipment_and_commercial',
  SIGNALS_AND_NEXT_ACTIONS: 'signals_and_next_actions',
});

export const LAYER_ORDER = Object.freeze(Object.values(LAYER));

/** Product-family selector -- multi-select, "not sure" always available. Classification stays a data-collection concern only; see the safety boundary note above. */
export const PRODUCT_FAMILY = Object.freeze([
  'cosmetics_and_beauty',
  'food_and_beverage',
  'dietary_supplements',
  'food_contact_items',
  'electrical_and_electronics',
  'wireless_or_transmitting_equipment',
  'batteries_or_battery_containing',
  'childrens_products_and_toys',
  'textile_apparel_and_footwear',
  'furniture_and_home_goods',
  'glass_ceramics_and_tableware',
  'plastics_polymers_and_coated_products',
  'vehicle_parts_and_transport_accessories',
  'medical_equipment_or_medical_use',
  'chemicals_paints_adhesives_aerosols',
  'animal_origin_products',
  'live_animals',
  'animal_feed',
  'plant_origin_products',
  'industrial_machinery_and_equipment',
  'building_materials',
  'other_general_product',
  'not_sure',
]);

/** Families that make the technical-characteristics (electrical/battery) layer relevant. */
const ELECTRICAL_RELEVANT_FAMILIES = Object.freeze([
  'electrical_and_electronics',
  'wireless_or_transmitting_equipment',
  'batteries_or_battery_containing',
]);

/** Families for which a food-contact materials follow-up is meaningful. */
const FOOD_CONTACT_RELEVANT_FAMILIES = Object.freeze([
  'food_contact_items',
  'glass_ceramics_and_tableware',
  'plastics_polymers_and_coated_products',
]);

export const MATERIAL = Object.freeze([
  'plastic_or_polymer',
  'metal',
  'glass',
  'ceramic',
  'wood',
  'textile',
  'leather',
  'rubber',
  'paper_or_cardboard',
  'chemical_substance',
  'animal_origin_material',
  'plant_origin_material',
  'mixed_materials',
  'unknown',
]);

/** Materials whose follow-up questions (food-contact use, coating) only make sense together with a food-contact-relevant family. */
const FOOD_CONTACT_FOLLOWUP_MATERIALS = Object.freeze(['plastic_or_polymer', 'glass']);

export const DOCUMENT_TYPE = Object.freeze([
  'supplier_invoice',
  'packing_list',
  'quote',
  'catalog',
  'technical_spec',
  'product_photos',
  'label_photo',
  'usage_instructions',
  'manufacturer_declaration',
  'certificate_of_origin',
  'test_reports',
  'sds_or_msds',
  'battery_documents',
  'bill_of_lading',
  'none_received_yet',
]);

/**
 * Given the current answer set, decide which layers are relevant right
 * now. Conditional branching, not a fixed sequence: a simple product
 * with no electrical/food-contact signal never sees the technical or
 * material-follow-up questions. Layer 1 and 2 are always relevant once
 * the user has chosen a non-problem-oriented objective (problem-oriented
 * objectives skip straight to the existing shipment-problem flow and
 * never reach this model at all).
 *
 * @param {{ productFamilies?: string[], materials?: string[] }} answers
 * @returns {string[]} ordered subset of LAYER_ORDER
 */
export function applicableLayers(answers) {
  const a = answers !== null && typeof answers === 'object' ? answers : {};
  const families = Array.isArray(a.productFamilies) ? a.productFamilies : [];
  const materials = Array.isArray(a.materials) ? a.materials : [];

  const layers = [LAYER.OBJECTIVE_AND_STAGE, LAYER.PRODUCT_FAMILY, LAYER.USE_AND_TARGET_USER];

  const familiesKnown = families.length > 0 && !families.includes('not_sure');
  if (familiesKnown) {
    layers.push(LAYER.MATERIALS);
  }

  if (needsTechnicalCharacteristicsLayer({ productFamilies: families })) {
    layers.push(LAYER.TECHNICAL_CHARACTERISTICS);
  }

  layers.push(LAYER.DOCUMENTS_AND_MARKING, LAYER.SHIPMENT_AND_COMMERCIAL, LAYER.SIGNALS_AND_NEXT_ACTIONS);

  return layers;
}

/** Whether the electrical/technical-characteristics follow-up is relevant for the selected product families. */
export function needsTechnicalCharacteristicsLayer(answers) {
  const a = answers !== null && typeof answers === 'object' ? answers : {};
  const families = Array.isArray(a.productFamilies) ? a.productFamilies : [];
  return families.some((f) => ELECTRICAL_RELEVANT_FAMILIES.includes(f));
}

/** Whether the food-contact / coating materials follow-up is relevant. */
export function needsFoodContactMaterialFollowup(answers) {
  const a = answers !== null && typeof answers === 'object' ? answers : {};
  const families = Array.isArray(a.productFamilies) ? a.productFamilies : [];
  const materials = Array.isArray(a.materials) ? a.materials : [];
  const familyRelevant = families.some((f) => FOOD_CONTACT_RELEVANT_FAMILIES.includes(f));
  const materialRelevant = materials.some((m) => FOOD_CONTACT_FOLLOWUP_MATERIALS.includes(m));
  return familyRelevant && materialRelevant;
}

/**
 * Rough count of meaningful questions the standard route asks for a
 * given answer set -- used only to keep the "typical case is ~5-9
 * questions" discipline honest in tests; never surfaced to the user as
 * a promised fixed total (the visible progress model stays the
 * existing 4-phase journey-phase-model.js).
 *
 * @param {object} answers
 * @returns {number}
 */
export function estimatedStandardRouteQuestionCount(answers) {
  const layers = applicableLayers(answers);
  // One representative question per applicable layer except the always
  // richer product-family/use layers (2 each) and the final
  // signals/next-actions layer, which produces output rather than
  // asking a question.
  let count = 0;
  for (const layer of layers) {
    if (layer === LAYER.SIGNALS_AND_NEXT_ACTIONS) continue;
    if (layer === LAYER.OBJECTIVE_AND_STAGE) count += 2;
    else if (layer === LAYER.PRODUCT_FAMILY) count += 1;
    else if (layer === LAYER.USE_AND_TARGET_USER) count += 2;
    else if (layer === LAYER.MATERIALS) count += needsFoodContactMaterialFollowup(answers) ? 2 : 1;
    else if (layer === LAYER.TECHNICAL_CHARACTERISTICS) count += 1;
    else if (layer === LAYER.DOCUMENTS_AND_MARKING) count += 1;
    else if (layer === LAYER.SHIPMENT_AND_COMMERCIAL) count += 1;
  }
  return count;
}

/**
 * Back-navigation compatibility: given a previously-collected answer
 * set and the id of a field that just changed, return a NEW answers
 * object with only the genuinely-incompatible downstream answers
 * cleared. Compatible answers (e.g. documents already indicated,
 * shipment/commercial status) are always preserved.
 *
 * @param {object} answers
 * @param {string} changedFieldId
 * @returns {object} a new object -- never mutates the input
 */
export function clearIncompatibleAnswers(answers, changedFieldId) {
  const a = answers !== null && typeof answers === 'object' ? { ...answers } : {};

  if (changedFieldId === 'productFamilies') {
    if (!needsTechnicalCharacteristicsLayer(a)) {
      delete a.connectsToPower;
      delete a.hasPlug;
      delete a.voltage;
      delete a.hasPowerSupply;
      delete a.hasBattery;
      delete a.batteryIsRechargeable;
    }
    if (!needsFoodContactMaterialFollowup(a)) {
      delete a.materialTouchesFood;
      delete a.materialHasCoating;
    }
  }

  if (changedFieldId === 'materials') {
    if (!needsFoodContactMaterialFollowup(a)) {
      delete a.materialTouchesFood;
      delete a.materialHasCoating;
    }
  }

  return a;
}

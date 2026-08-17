/**
 * Purely presentational "focused-check continuity" label -- a short
 * line (e.g. "זכוכית · מגע עם מזון") shown above a live regulatory
 * follow-up question so the focused-checks phase reads as a natural
 * continuation of the product-details answers already collected,
 * rather than a bolted-on separate form.
 *
 * HARD BOUNDARY: built exclusively from confirmed, already-collected
 * STRUCTURED core answers (product family / material selections,
 * connects-to-power). Never derived from free text, never invented,
 * never a regulatory claim -- purely a short label echoing data the
 * user already gave through a closed-choice control.
 *
 * Pure, deterministic, DOM-free, network-free, storage-free.
 */

/** Short Hebrew labels for the subset of product-family values relevant to a focused-check continuity line. */
const FAMILY_SHORT_LABEL = Object.freeze({
  glass_ceramics_and_tableware: 'זכוכית',
  plastics_polymers_and_coated_products: 'פלסטיק או פולימר',
  food_contact_items: 'כלי מגע עם מזון',
  electrical_and_electronics: 'חשמלי',
  wireless_or_transmitting_equipment: 'אלחוטי',
  batteries_or_battery_containing: 'כולל סוללה',
  vehicle_parts_and_transport_accessories: 'לרכב',
});

/** Short Hebrew labels for the subset of material values relevant to a focused-check continuity line. */
const MATERIAL_SHORT_LABEL = Object.freeze({
  glass: 'זכוכית',
  plastic_or_polymer: 'פלסטיק או פולימר',
  metal: 'מתכת',
  paper_or_cardboard: 'נייר או קרטון',
});

const YES = 'yes';

/**
 * @param {{ productFamilies?: string[], materials?: string[],
 *   materialTouchesFood?: string, materialHasCoating?: string,
 *   connectsToPower?: string }} raw
 * @returns {string} a short " · "-joined label, or '' when nothing
 *   confirmed is available to echo.
 */
export function buildFocusedCheckContextLabel(raw) {
  const r = raw !== null && typeof raw === 'object' ? raw : {};
  const parts = [];

  const families = Array.isArray(r.productFamilies) ? r.productFamilies : [];
  for (const family of families) {
    const label = FAMILY_SHORT_LABEL[family];
    if (label && !parts.includes(label)) parts.push(label);
  }

  const materials = Array.isArray(r.materials) ? r.materials : [];
  for (const material of materials) {
    const label = MATERIAL_SHORT_LABEL[material];
    if (label && !parts.includes(label)) parts.push(label);
  }

  if (r.materialTouchesFood === YES && !parts.includes('מגע עם מזון')) parts.push('מגע עם מזון');
  if (r.connectsToPower === YES && !parts.includes('מתחבר לחשמל')) parts.push('מתחבר לחשמל');

  return parts.join(' · ');
}

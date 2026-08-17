/**
 * Registry of evidence packages supplied through the intake format.
 * Static imports only (no dynamic filesystem scanning -- this
 * codebase ships as plain browser-loadable ES modules with no build
 * step), so adding a new package is a deliberate, reviewable one-line
 * addition here, not something that happens implicitly by dropping a
 * file in this directory.
 *
 * `getEligiblePilotRuleShapes()` is the only thing downstream code
 * should call: it runs every registered package through the full
 * schema validator AND the "approved for controlled pilot" gate in
 * `../evidence-package.js`, and returns ONLY rule-shaped objects for
 * packages that genuinely cleared both. Today that list is always
 * empty, because every registered package is an intentionally-empty
 * placeholder pinned to `RULE_STATUS.DISABLED` -- see each file's
 * header comment. Five product-owner authoring scaffolds are
 * registered here (one per candidate category:
 * cosmetics-and-toiletries, electrical-products, polymer-food-contact,
 * glass-food-contact-vessel, vehicle-installed-product) -- see
 * `docs/product-owner-rule-authoring-guide.md` for how the product
 * owner fills each one in.
 */

import { eligibleRuleShapesFromPackages } from '../evidence-package.js';
import { GLASS_FOOD_CONTACT_VESSEL_EVIDENCE } from './glass-food-contact-vessel.evidence.js';
import { COSMETICS_AND_TOILETRIES_EVIDENCE } from './cosmetics-and-toiletries.evidence.js';
import { ELECTRICAL_PRODUCTS_EVIDENCE } from './electrical-products.evidence.js';
import { POLYMER_FOOD_CONTACT_EVIDENCE } from './polymer-food-contact.evidence.js';
import { VEHICLE_INSTALLED_PRODUCT_EVIDENCE } from './vehicle-installed-product.evidence.js';

export const EVIDENCE_PACKAGES = Object.freeze([
  COSMETICS_AND_TOILETRIES_EVIDENCE,
  ELECTRICAL_PRODUCTS_EVIDENCE,
  POLYMER_FOOD_CONTACT_EVIDENCE,
  GLASS_FOOD_CONTACT_VESSEL_EVIDENCE,
  VEHICLE_INSTALLED_PRODUCT_EVIDENCE,
]);

/**
 * @returns {object[]} rule-shaped objects for every registered package
 *   that is schema-valid, explicitly `approved_for_pilot`, and clears
 *   the existing hard publication gate. Empty today by design.
 */
export function getEligiblePilotRuleShapes() {
  return eligibleRuleShapesFromPackages(EVIDENCE_PACKAGES);
}

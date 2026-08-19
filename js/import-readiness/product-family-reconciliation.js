/**
 * Reconciles the reviewed product-family matrix
 * (product-family-matrix.js) with the five existing expert-approved
 * detailed regulatory rules (regulatory-signals/rules-registry.js).
 *
 * The five detailed rules stay the single source of truth for their
 * product families: when one of them is the active/matched signal for
 * a result, the matrix must not repeat the same regulatory category as
 * a second, generic card. This module is the only place that knows the
 * mapping between an existing rule id and its matrix family id, so the
 * suppression logic lives in one reviewed spot rather than being
 * duplicated wherever the matrix result gets rendered.
 */

// Maps each existing detailed rule id to the matrix family it
// corresponds to, and the regulatorySignals key(s) that rule already
// covers publicly (so the matrix never re-presents that category).
export const EXISTING_RULE_TO_FAMILY = Object.freeze({
  'plastic-direct-food-contact': Object.freeze({
    familyId: 'food-contact-01',
    coveredSignalKeys: Object.freeze(['standards']),
  }),
  'polymer-coated-direct-food-contact': Object.freeze({
    familyId: 'food-contact-02',
    coveredSignalKeys: Object.freeze(['standards']),
  }),
  'glass-food-contact-vessel': Object.freeze({
    familyId: 'food-contact-03',
    coveredSignalKeys: Object.freeze(['standards']),
  }),
  'mains-connected-electrical-product': Object.freeze({
    familyId: 'electrical-and-electronics-01',
    coveredSignalKeys: Object.freeze(['standards']),
  }),
  'vehicle-installed-product': Object.freeze({
    familyId: 'vehicles-and-transport-05',
    coveredSignalKeys: Object.freeze(['transportOrVehicleLaboratory']),
  }),
});

function isUsableArray(value) {
  return Array.isArray(value);
}

/**
 * Given the family id the matrix identified and the ids of existing
 * detailed rules that already matched (produced a public signal card)
 * for this result, returns the set of regulatorySignals keys the
 * matrix is still allowed to contribute -- i.e. every positive
 * category minus whatever an active existing rule already covers for
 * that same family.
 */
export function suppressedSignalKeysForFamily(familyId, matchedExistingRuleIds) {
  const suppressed = new Set();
  if (!familyId || !isUsableArray(matchedExistingRuleIds)) return suppressed;
  for (const ruleId of matchedExistingRuleIds) {
    const mapping = EXISTING_RULE_TO_FAMILY[ruleId];
    if (mapping && mapping.familyId === familyId) {
      mapping.coveredSignalKeys.forEach((key) => suppressed.add(key));
    }
  }
  return suppressed;
}

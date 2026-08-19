/**
 * Reconciles the reviewed product-family matrix
 * (product-family-matrix.js) with the five existing expert-approved
 * detailed regulatory rules (regulatory-signals/rules-registry.js).
 *
 * The five detailed rules stay the single source of truth for their
 * product families in BOTH directions:
 *   - when one of them is the active/matched signal for a result, the
 *     matrix must not repeat the same regulatory category as a second,
 *     generic card (a matched rule's card already covers it);
 *   - when one of them was explicitly EXCLUDED by the user's own
 *     answer (e.g. "האם כלי הזכוכית מיועד למגע ישיר עם מזון או
 *     שתייה?" answered "לא"), the matrix must not reintroduce the same
 *     regulatory category on its own, independent path -- an explicit
 *     exclusion answer for a regulatory subject overrides a same-
 *     subject matrix signal (see docs/product-family-matrix-engine.md,
 *     "Matrix-vs-detailed-rule reconciliation" and the precedence
 *     order: explicit answer > detailed rule trigger/exclusion >
 *     confirmed family > matrix positive category > generic routing).
 *
 * Suppression is scoped to exactly the regulatory subject the
 * exclusion answered -- an excluded rule only suppresses its own
 * `coveredSignalKeys` for its own matrix family, never a whole
 * family's other, independently-applicable positive categories (e.g.
 * a wireless vehicle product excluded from the vehicle-installed rule
 * keeps its own communications signal). Exclusion is never interpreted
 * as a full import exemption -- it only removes one duplicated
 * category from the matrix's own contribution; any other positive
 * category, and the neutral non-exemption wording when nothing
 * remains, is unaffected.
 *
 * This module is the ONE explicit place that knows the mapping between
 * an existing rule id and its matrix family id -- both the "matched"
 * and "excluded" suppression logic live here, never scattered across
 * the controller.
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

function addCoveredKeysForFamily(suppressed, familyId, ruleIds) {
  if (!isUsableArray(ruleIds)) return;
  for (const ruleId of ruleIds) {
    const mapping = EXISTING_RULE_TO_FAMILY[ruleId];
    if (mapping && mapping.familyId === familyId) {
      mapping.coveredSignalKeys.forEach((key) => suppressed.add(key));
    }
  }
}

/**
 * Given the family id the matrix identified, the ids of existing
 * detailed rules that already matched (produced a public signal card)
 * for this result, and the ids of existing detailed rules explicitly
 * excluded by the user's own answers, returns the set of
 * regulatorySignals keys the matrix is still allowed to contribute --
 * i.e. every positive category minus whatever an active OR excluded
 * existing rule already covers for that same family. A matched rule
 * and an excluded rule suppress the matrix identically: either way,
 * the detailed rule -- not the matrix -- is the reviewed authority on
 * that specific regulatory subject, so the matrix never contradicts it
 * by reintroducing the same category on an independent path.
 *
 * @param {string} familyId
 * @param {string[]} matchedExistingRuleIds
 * @param {string[]} [excludedExistingRuleIds]
 */
export function suppressedSignalKeysForFamily(familyId, matchedExistingRuleIds, excludedExistingRuleIds) {
  const suppressed = new Set();
  if (!familyId) return suppressed;
  addCoveredKeysForFamily(suppressed, familyId, matchedExistingRuleIds);
  addCoveredKeysForFamily(suppressed, familyId, excludedExistingRuleIds);
  return suppressed;
}

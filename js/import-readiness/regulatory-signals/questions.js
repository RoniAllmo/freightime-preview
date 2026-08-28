/**
 * Closed-choice regulatory follow-up question definitions. A question
 * is only ever asked when a free-text hint already suggests it might
 * matter -- free text alone never answers it. Every question includes
 * an explicit "לא ידוע" option; an unknown answer must lower certainty
 * or add a verification item, never terminate the assessment.
 *
 * Wording below is exactly as specified by the FreighTime product
 * owner (a qualified customs professional) for the five expert-authored
 * pilot rules -- one to three questions per rule, matching the
 * documented normal/exceptional question-budget limits.
 *
 * Pure data. No DOM, no network.
 */

export const ANSWER = Object.freeze({
  YES: 'yes',
  NO: 'no',
  UNKNOWN: 'unknown',
});

/**
 * id            unique key, also used as the answer-map key
 * category      internal candidate-rule category this question serves
 * legend        fieldset legend / question text
 * options       [{ value, label }] -- always includes an unknown option
 */
export const REGULATORY_FOLLOWUP_QUESTIONS = Object.freeze([
  // Rule 1: mains-connected-electrical-product (1 question)
  Object.freeze({
    id: 'mainsConnectedOrSuppliedAdapter',
    category: 'electrical_mains_product',
    legend: 'האם המוצר מתחבר ישירות לרשת החשמל או מגיע עם תקע או ספק כוח?',
    options: Object.freeze([
      { value: ANSWER.YES, label: 'כן' },
      { value: ANSWER.NO, label: 'לא' },
      { value: ANSWER.UNKNOWN, label: 'לא ידוע' },
    ]),
  }),

  // Rule 2: plastic-direct-food-contact (2 questions)
  Object.freeze({
    id: 'directFoodOrDrinkContact',
    category: 'plastic_food_contact',
    legend: 'האם המוצר בא במגע ישיר עם מזון או שתייה?',
    options: Object.freeze([
      { value: ANSWER.YES, label: 'כן' },
      { value: ANSWER.NO, label: 'לא' },
      { value: ANSWER.UNKNOWN, label: 'לא ידוע' },
    ]),
  }),
  Object.freeze({
    id: 'directContactMaterial',
    category: 'plastic_food_contact',
    legend: 'מהו החומר שבא במגע הישיר?',
    options: Object.freeze([
      { value: 'plastic', label: 'פלסטיק' },
      { value: 'glass', label: 'זכוכית' },
      { value: 'metal', label: 'מתכת' },
      { value: 'paper_or_cardboard', label: 'נייר או קרטון' },
      { value: 'polymer_coating', label: 'ציפוי פולימרי' },
      { value: 'other_material', label: 'חומר אחר' },
      { value: ANSWER.UNKNOWN, label: 'לא ידוע' },
    ]),
  }),

  // Rule 3: polymer-coated-direct-food-contact (3 questions)
  Object.freeze({
    id: 'hasInternalCoating',
    category: 'polymer_coating_food_contact',
    legend: 'האם יש למוצר ציפוי פנימי או שכבת פלסטיק?',
    options: Object.freeze([
      { value: ANSWER.YES, label: 'כן' },
      { value: ANSWER.NO, label: 'לא' },
      { value: ANSWER.UNKNOWN, label: 'לא ידוע' },
    ]),
  }),
  Object.freeze({
    id: 'coatingDirectFoodOrDrinkContact',
    category: 'polymer_coating_food_contact',
    legend: 'האם הציפוי בא במגע ישיר עם מזון או שתייה?',
    options: Object.freeze([
      { value: ANSWER.YES, label: 'כן' },
      { value: ANSWER.NO, label: 'לא' },
      { value: ANSWER.UNKNOWN, label: 'לא ידוע' },
    ]),
  }),
  Object.freeze({
    id: 'coatingMaterial',
    category: 'polymer_coating_food_contact',
    legend: 'ממה עשוי הציפוי, אם ידוע?',
    options: Object.freeze([
      { value: 'plastic_or_polymer', label: 'פלסטיק או פולימר' },
      { value: 'other_material', label: 'חומר אחר' },
      { value: ANSWER.UNKNOWN, label: 'לא ידוע' },
    ]),
  }),

  // Rule 4: glass-food-contact-vessel (1 question)
  Object.freeze({
    id: 'glassVesselDirectFoodOrDrinkContact',
    category: 'glass_food_contact',
    legend: 'האם כלי הזכוכית מיועד למגע ישיר עם מזון או שתייה?',
    options: Object.freeze([
      { value: ANSWER.YES, label: 'כן' },
      { value: ANSWER.NO, label: 'לא' },
      { value: ANSWER.UNKNOWN, label: 'לא ידוע' },
    ]),
  }),

  // Rule 5: vehicle-installed-product (1 question). A second question,
  // vehicleFunctionCategory ("מה תפקידו העיקרי ברכב?"), was removed in
  // the post-Wave-3 cleanup pass (2026-08-28): its answer was proven,
  // by exhaustive trace through every consumer plus a live 9-option
  // browser behavior matrix, to have zero effect on canonical family,
  // result state, matrix signal, detailed-rule activation/exclusion,
  // positive category, professional routing, CTA, documents, or
  // limitation -- the rule's trigger only ever reads
  // installedAsPartOfVehicle, and the question's own answer was never
  // read anywhere else. See tests/import-readiness/
  // stage-3-no-effect-question-removal.test.js.
  Object.freeze({
    id: 'installedAsPartOfVehicle',
    category: 'vehicle_product',
    legend: 'האם המוצר מיועד להתקנה כחלק מהרכב?',
    options: Object.freeze([
      { value: ANSWER.YES, label: 'כן' },
      { value: ANSWER.NO, label: 'לא' },
      { value: ANSWER.UNKNOWN, label: 'לא ידוע' },
    ]),
  }),

  // Personal-use clarification (see personal-use-clarification.js) --
  // not one of the five detailed regulatory-signal rules above: gated
  // by import type + a product-owner-maintained sensitive-family list +
  // an entered quantity, not by a free-text category hint. Shares this
  // same question flow, answer store, and question budget regardless.
  Object.freeze({
    id: 'personalUseOnlyConfirmation',
    category: 'personal_use_sensitive_family',
    legend: 'האם המוצרים מיועדים לשימוש אישי שלך בלבד, ללא מכירה, חלוקה או שימוש עסקי?',
    options: Object.freeze([
      { value: ANSWER.YES, label: 'כן' },
      { value: ANSWER.NO, label: 'לא' },
      { value: ANSWER.UNKNOWN, label: 'לא בטוח' },
    ]),
  }),
]);

export function findQuestionById(id) {
  return REGULATORY_FOLLOWUP_QUESTIONS.find((q) => q.id === id) ?? null;
}

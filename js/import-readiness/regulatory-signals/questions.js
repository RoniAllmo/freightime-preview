/**
 * Closed-choice regulatory follow-up question definitions. A question
 * is only ever asked when a free-text hint already suggests it might
 * matter -- free text alone never answers it. Every question includes
 * an explicit "לא ידוע" option; an unknown answer must lower certainty
 * or add a verification item, never terminate the assessment.
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
  Object.freeze({
    id: 'mainsConnected',
    category: 'electrical_mains_product',
    legend: 'האם המוצר מתחבר ישירות לשקע החשמל (מתח רשת)?',
    options: Object.freeze([
      { value: ANSWER.YES, label: 'כן' },
      { value: ANSWER.NO, label: 'לא, פועל בסוללה בלבד או ללא חשמל' },
      { value: ANSWER.UNKNOWN, label: 'לא ידוע' },
    ]),
  }),
  Object.freeze({
    id: 'plasticDirectFoodContact',
    category: 'plastic_food_contact',
    legend: 'האם חלק פלסטיק במוצר נועד למגע ישיר עם מזון או משקאות?',
    options: Object.freeze([
      { value: ANSWER.YES, label: 'כן' },
      { value: ANSWER.NO, label: 'לא, אין מגע ישיר עם מזון' },
      { value: ANSWER.UNKNOWN, label: 'לא ידוע' },
    ]),
  }),
  Object.freeze({
    id: 'polymerCoatingDirectFoodContact',
    category: 'polymer_coating_food_contact',
    legend: 'האם ציפוי פולימרי (למשל ציפוי לא-דביק) על המוצר נועד למגע ישיר עם מזון?',
    options: Object.freeze([
      { value: ANSWER.YES, label: 'כן' },
      { value: ANSWER.NO, label: 'לא, אין מגע ישיר עם מזון' },
      { value: ANSWER.UNKNOWN, label: 'לא ידוע' },
    ]),
  }),
  Object.freeze({
    id: 'glassDirectFoodOrDrinkContact',
    category: 'glass_food_contact',
    legend: 'האם כלי הזכוכית מיועד למגע ישיר עם מזון או משקאות (לדוגמה כוס שתייה או קערת הגשה)?',
    options: Object.freeze([
      { value: ANSWER.YES, label: 'כן' },
      { value: ANSWER.NO, label: 'לא, מיועד לתצוגה או לשימוש אחר' },
      { value: ANSWER.UNKNOWN, label: 'לא ידוע' },
    ]),
  }),
  Object.freeze({
    id: 'vehicleInstallationOrUse',
    category: 'vehicle_product',
    legend: 'האם המוצר מיועד להתקנה קבועה או לשימוש רגולטורי ברכב מנועי (למשל מערכת בטיחות, תאורה או חלק הקשור לרישוי הרכב)?',
    options: Object.freeze([
      { value: ANSWER.YES, label: 'כן' },
      { value: ANSWER.NO, label: 'לא, אינו קשור להתקנה או לרישוי רכב' },
      { value: ANSWER.UNKNOWN, label: 'לא ידוע' },
    ]),
  }),
]);

export function findQuestionById(id) {
  return REGULATORY_FOLLOWUP_QUESTIONS.find((q) => q.id === id) ?? null;
}

export function findQuestionsForCategory(category) {
  return Object.freeze(REGULATORY_FOLLOWUP_QUESTIONS.filter((q) => q.category === category));
}

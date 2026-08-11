/**
 * Classification-question rules for FreighTime Import Readiness Check V1.
 *
 * These are questions a customs classifier would typically need answered
 * -- never a classification itself, never an HS code guess. Pure,
 * deterministic, DOM-free, network-free, storage-free.
 */

function question(id, trigger, text, reason) {
  return Object.freeze({ id, trigger, text, reason });
}

const QUESTIONS = Object.freeze([
  question(
    'material-composition',
    (i) => i.primaryMaterial.length === 0,
    'מהו חומר ההרכב העיקרי של המוצר, ומהם חומרי ההרכב הנוספים (אם יש)?',
    'הרכב חומרי הוא לרוב הגורם המכריע בסיווג מכס',
  ),
  question(
    'function-purpose',
    (i) => i.intendedUse.length === 0,
    'מהי פעולת/תכלית המוצר בפועל, להבדיל משם המוצר בלבד?',
    'הסיווג נקבע לפי הפעולה והייעוד בפועל ולא רק לפי שם מסחרי',
  ),
  question(
    'electrical-function',
    (i) => i.isElectrical === 'yes',
    'מהי פעולת המוצר החשמלית העיקרית (למשל: הנעה, חימום, תאורה, עיבוד אות)?',
    'סעיפי המכס למוצרים חשמליים נבדלים לפי הפונקציה החשמלית העיקרית',
  ),
  question(
    'battery-chemistry-question',
    (i) => i.hasBattery === 'yes' && i.batteryChemistry.length === 0,
    'מהו הרכב הכימי של הסוללה (למשל ליתיום-יון, ניקל-מתכת-הידריד)?',
    'משפיע הן על הסיווג והן על דרישות ההובלה',
  ),
  question(
    'wireless-frequency-question',
    (i) => i.isWireless === 'yes' && i.wirelessFrequency.length === 0,
    'באיזה פס תדרים פועל המכשיר האלחוטי?',
    'רלוונטי הן לסיווג והן לבדיקת אישור תדרים',
  ),
  question(
    'food-type-question',
    (i) => i.isFoodContact === 'yes' && i.foodType.length === 0,
    'עם אילו סוגי מזון המוצר בא במגע, ובאילו טמפרטורות שימוש?',
    'רלוונטי לבדיקת עמידה בדרישות מגע-מזון',
  ),
  question(
    'model-or-part-number',
    (i) => !i.modelOrPartNumberAvailable && !i.hsCodeKnown,
    'האם קיים מספר דגם/קטלוגי של המוצר אצל היצרן?',
    'מספר דגם מסייע לאיתור תיעוד טכני מדויק לצורך סיווג',
  ),
]);

/**
 * Build classification-context questions relevant to a normalized input.
 * Returns only questions whose trigger matched -- never a classification
 * result, never an HS code suggestion.
 *
 * @param {*} input - A normalized input, or any other malformed value.
 * @returns {ReadonlyArray<Readonly<{id: string, text: string, reason: string}>>}
 */
export function buildClassificationQuestions(input) {
  const in_ = input !== null && typeof input === 'object' ? input : {};
  const triggered = QUESTIONS.filter((q) => {
    try {
      return q.trigger(in_) === true;
    } catch {
      return false;
    }
  }).map((q) => Object.freeze({ id: q.id, text: q.text, reason: q.reason }));
  return Object.freeze(triggered);
}

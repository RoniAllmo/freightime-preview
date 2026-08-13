/**
 * Customs-classification dispute and penalty/deficit-demand result
 * builder (families B and E's penalty stage).
 *
 * A plain classification disagreement, without a significant financial
 * demand, routes to a customs classifier or licensed customs broker --
 * never a lawyer by default. A significant financial demand, penalty,
 * seizure, or held goods routes primarily to a customs/import-taxation
 * lawyer, with the classifier/broker as the supporting professional.
 *
 * Never states a final classification, never concludes the customs
 * demand is valid or invalid, never assigns negligence to a broker or
 * any other party, never invents a response/appeal deadline -- only
 * conditional wording pointing at whatever deadline the customs notice
 * itself may contain.
 *
 * Pure, deterministic, DOM-free, network-free, storage-free.
 */

import { buildCompactResult, CUSTOMS_DISPUTE_DISCLAIMER } from './build-action-map.js';
import { PROFESSIONAL_CATEGORY, professionalReferral, jointReferral } from './professional-category-registry.js';
import { ISSUE_FAMILY } from './scenario-schema.js';

const URGENT = 'דחוף';
const ATTENTION = 'דורש תשומת לב';

const DEADLINE_WARNING =
  'אם קיים מועד במכתב המכס, יש לפעול לפיו בדחיפות ולקבל ייעוץ מקצועי לפני הגשת מענה.';

/**
 * @param {object} input - Normalized readiness input.
 * @returns {Readonly<object>} Compact result.
 */
export function buildCustomsDisputeResult(input) {
  const i = input !== null && typeof input === 'object' ? input : {};
  const isPenaltyType = i.problemType === 'customs_penalty_or_deficit_demand';
  const highExposure = i.financialExposure === 'high';
  const heldGoods = i.goodsHeld === true;
  const escalate = isPenaltyType && (highExposure || heldGoods);

  const classifierOrBroker = jointReferral(
    PROFESSIONAL_CATEGORY.CUSTOMS_CLASSIFIER,
    PROFESSIONAL_CATEGORY.LICENSED_CUSTOMS_BROKER,
    'לצורך ניתוח הסיווג, תיאור הטובין, המסמכים והרשימונים הרלוונטיים.',
  );

  if (!escalate) {
    const urgency = i.hasWrittenNotice === true || heldGoods ? URGENT : ATTENTION;
    return buildCompactResult({
      scenario: 'shipment_problem',
      issueFamily: ISSUE_FAMILY.CUSTOMS_DISPUTE,
      issueType: isPenaltyType ? 'customs_penalty_or_deficit_demand' : 'classification_dispute',
      routeLabel: 'בעיה במשלוח קיים — סיווג במחלוקת',
      primaryAction: 'יש לאסוף את הסיווג שהוצע, הסיווג שנקבע והנימוק שנמסר, ולבדוק את הנושא מול מסווג מכס או עמיל מכס מורשה לפני מתן מענה סופי.',
      primaryReason: '',
      immediateActions: [
        'שמירת ההודעה או הרשימון הרלוונטי',
        'איסוף מסמכים תומכים (הצהרות, חשבוניות, מפרט, קטלוג)',
        'בירור מועד מענה, אם קיים',
      ],
      preparationItems: ['הסיווג שהוצע', 'הסיווג שנקבע על ידי הרשות', 'נימוק שנמסר, אם קיים', 'מסמכי היבוא הרלוונטיים'],
      urgency,
      professional: classifierOrBroker,
      supportingProfessional: null,
      notificationParties: ['עמיל המכס'],
      deadlineWarning: i.hasWrittenNotice === true ? DEADLINE_WARNING : null,
      accumulatingCostWarning: null,
      primaryCta: { id: 'classification-and-regulation-check', label: classifierOrBroker.ctaLabel },
      secondaryCta: null,
      secondaryDetails: { note: CUSTOMS_DISPUTE_DISCLAIMER },
    });
  }

  // Significant financial exposure or goods held: legal review is
  // primary. Never states the broker was negligent, never states the
  // customs demand is correct or incorrect.
  const lawyer = professionalReferral(
    PROFESSIONAL_CATEGORY.CUSTOMS_LAWYER,
    'לצורך בדיקת דרישת המכס, מועדי ההשגה או הערעור, החשיפה הכספית והטענות האפשריות.',
  );

  const immediateActions = [
    'שמירת ההודעה הכתובה מהמכס',
    'איסוף הצהרות, מסמכים תומכים, חשבוניות, קטלוגים, מפרטים, פסיקות קודמות והתכתבויות',
    'זיהוי מועד מענה או ערעור, אם צוין',
    'הימנעות ממשלוח הודאה בטעות לפני בדיקה מקצועית',
    'שחזור היסטוריית היבוא הרלוונטית, אם ייתכן שהצהרות קודמות מושפעות',
  ];

  return buildCompactResult({
    scenario: 'shipment_problem',
    issueFamily: ISSUE_FAMILY.CUSTOMS_DISPUTE,
    issueType: 'customs_penalty_or_deficit_demand_significant',
    routeLabel: 'בעיה במשלוח קיים — דרישת מכס משמעותית או קנס',
    primaryAction: 'מדובר בדרישה כספית משמעותית או בטובין שמעוכבים. יש לשמור את ההודעה, לאסוף את המסמכים הרלוונטיים ולפנות לבדיקה משפטית לפני כל מענה למכס.',
    primaryReason: '',
    immediateActions,
    preparationItems: ['ההודעה הכתובה מהמכס', 'הצהרות ורשימונים רלוונטיים', 'חשבוניות ומפרט טכני', 'התכתבות קודמת עם המכס או העמיל'],
    urgency: URGENT,
    professional: lawyer,
    supportingProfessional: classifierOrBroker,
    notificationParties: ['עמיל המכס', 'רואה חשבון או יועץ מס, ככל שרלוונטי'],
    deadlineWarning: DEADLINE_WARNING,
    accumulatingCostWarning: null,
    primaryCta: { id: 'customs-lawyer-referral', label: lawyer.ctaLabel },
    secondaryCta: { id: 'classification-and-regulation-check', label: classifierOrBroker.ctaLabel },
    secondaryDetails: { note: CUSTOMS_DISPUTE_DISCLAIMER },
  });
}

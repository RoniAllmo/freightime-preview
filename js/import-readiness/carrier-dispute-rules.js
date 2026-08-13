/**
 * Carrier / forwarder / terminal dispute result builder (family I).
 *
 * Distinguishes an operational issue still fixable, a formal claim,
 * a significant financial dispute, and a legal proceeding/notice
 * already received -- routing progressively more specifically as the
 * stage escalates. Never assigns fault or states a party breached the
 * contract.
 *
 * Pure, deterministic, DOM-free, network-free, storage-free.
 */

import { buildCompactResult, LEGAL_ROUTE_DISCLAIMER } from './build-action-map.js';
import { PROFESSIONAL_CATEGORY, professionalReferral } from './professional-category-registry.js';
import { ISSUE_FAMILY } from './scenario-schema.js';

const URGENT = 'דחוף';
const ATTENTION = 'דורש תשומת לב';

function claimsDepartmentFor(shipmentMode) {
  if (shipmentMode === 'sea') return PROFESSIONAL_CATEGORY.CARRIER_CLAIMS;
  if (shipmentMode === 'air') return PROFESSIONAL_CATEGORY.AIRLINE_CLAIMS;
  if (shipmentMode === 'courier') return PROFESSIONAL_CATEGORY.COURIER_CLAIMS;
  return PROFESSIONAL_CATEGORY.FREIGHT_FORWARDER;
}

/**
 * @param {object} input - Normalized readiness input.
 * @returns {Readonly<object>} Compact result.
 */
export function buildCarrierDisputeResult(input) {
  const i = input !== null && typeof input === 'object' ? input : {};
  const stage = i.disputeStage;

  if (stage === 'legal_notice_received' || stage === 'significant_dispute') {
    const lawyer = professionalReferral(
      PROFESSIONAL_CATEGORY.TRANSPORT_LAWYER,
      'לבדוק את זכויות והתחייבויות הצדדים במחלוקת מול המוביל, המשלח או המסוף.',
    );
    const claims = professionalReferral(claimsDepartmentFor(i.shipmentMode), 'להגיש או להשלים תביעה מול הגורם המפעיל.');

    return buildCompactResult({
      scenario: 'shipment_problem',
      issueFamily: ISSUE_FAMILY.CARRIER_OR_FORWARDER_DISPUTE,
      issueType: `carrier_dispute_${stage}`,
      routeLabel: 'בעיה במשלוח קיים — סכסוך משמעותי מול מוביל/משלח',
      primaryAction: stage === 'legal_notice_received'
        ? 'התקבלה הודעה משפטית או פנייה פורמלית. יש לשמור את כל המסמכים ולפנות לבדיקה משפטית לפני מענה.'
        : 'מדובר בסכסוך כספי משמעותי. מומלץ לבדוק את הנושא מול עורך דין המתמחה בהובלה ושילוח לפני המשך התכתבות.',
      primaryReason: '',
      immediateActions: [
        'שמירת כל ההתכתבות, ההזמנות ומסמכי ההובלה',
        'הימנעות ממתן הודאה או ויתור על זכויות לפני בדיקה משפטית',
        'תיעוד ציר הזמן של האירועים',
      ],
      preparationItems: ['מסמכי הובלה (שטר מטען/AWB)', 'התכתבות עם המוביל/המשלח', 'הודעה משפטית, אם התקבלה'],
      urgency: URGENT,
      professional: lawyer,
      supportingProfessional: claims,
      notificationParties: ['המשלח הבינלאומי'],
      deadlineWarning: 'אם צוין מועד בהודעה שהתקבלה, יש לפעול לפיו בדחיפות ולקבל ייעוץ משפטי לפני מענה.',
      accumulatingCostWarning: null,
      primaryCta: { id: 'transport-lawyer-referral', label: lawyer.ctaLabel },
      secondaryCta: { id: 'carrier-claims-referral', label: claims.ctaLabel },
      secondaryDetails: { note: LEGAL_ROUTE_DISCLAIMER },
    });
  }

  if (stage === 'claim_required') {
    const claims = professionalReferral(
      claimsDepartmentFor(i.shipmentMode),
      'להגיש תביעה פורמלית מול הגורם המפעיל בגין הנזק, האובדן או העיכוב.',
    );
    return buildCompactResult({
      scenario: 'shipment_problem',
      issueFamily: ISSUE_FAMILY.CARRIER_OR_FORWARDER_DISPUTE,
      issueType: 'carrier_dispute_claim_required',
      routeLabel: 'בעיה במשלוח קיים — נדרשת תביעה מול המוביל/המשלח',
      primaryAction: 'יש להגיש תביעה פורמלית מול מחלקת התביעות הרלוונטית, בצירוף כל המסמכים התומכים.',
      primaryReason: '',
      immediateActions: ['איסוף מסמכי ההובלה והתכתבות רלוונטית', 'תיעוד הנזק/העיכוב/האובדן', 'בירור מועד הגשת תביעה מול הגורם המפעיל'],
      preparationItems: ['מסמכי הובלה (שטר מטען/AWB)', 'תיעוד האירוע', 'התכתבות קודמת עם המוביל/המשלח'],
      urgency: ATTENTION,
      professional: claims,
      supportingProfessional: null,
      notificationParties: ['המשלח הבינלאומי'],
      deadlineWarning: 'למוביל או למשלח עשוי להיות מועד הגשת תביעה מוגבל. מומלץ לבדוק זאת מיד.',
      accumulatingCostWarning: null,
      primaryCta: { id: 'carrier-claims-referral', label: claims.ctaLabel },
      secondaryCta: null,
      secondaryDetails: {},
    });
  }

  // operational_issue -- default, still resolvable without a claim or
  // legal process.
  const forwarder = professionalReferral(
    PROFESSIONAL_CATEGORY.FREIGHT_FORWARDER,
    'לבדוק ולפתור את הבעיה התפעולית מול המוביל, המשלח או המסוף.',
  );
  return buildCompactResult({
    scenario: 'shipment_problem',
    issueFamily: ISSUE_FAMILY.CARRIER_OR_FORWARDER_DISPUTE,
    issueType: 'carrier_dispute_operational',
    routeLabel: 'בעיה במשלוח קיים — סוגיה תפעולית מול מוביל/משלח',
    primaryAction: 'יש לפנות למשלח הבינלאומי או לגורם התפעולי הרלוונטי לפתרון הנושא.',
    primaryReason: '',
    immediateActions: ['תיעוד הבעיה ומועד היווצרותה', 'פנייה למשלח או למוביל לבירור ופתרון'],
    preparationItems: ['מספר הזמנה/מעקב', 'תיאור הבעיה'],
    urgency: ATTENTION,
    professional: forwarder,
    supportingProfessional: null,
    notificationParties: [],
    deadlineWarning: null,
    accumulatingCostWarning: null,
    primaryCta: { id: 'freight-forwarder-referral', label: forwarder.ctaLabel },
    secondaryCta: null,
    secondaryDetails: {},
  });
}

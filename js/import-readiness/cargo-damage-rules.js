/**
 * Cargo/container damage (family F) and cargo shortage/loss (family G)
 * result builders.
 *
 * Primary professional is always the marine-insurance broker or cargo
 * insurer, with the marine surveyor as the supporting professional for
 * damage discovered after unloading -- this stays fixed across
 * discovery timing per the product's routing principles; only wording
 * and urgency vary. A safety risk overrides everything else with a
 * safety-first, no-technical-instructions referral.
 *
 * Never states insurance coverage exists, never assigns carrier
 * liability, never advises disposal/repair/moving of goods.
 *
 * Pure, deterministic, DOM-free, network-free, storage-free.
 */

import { buildCompactResult, INSURANCE_ROUTE_DISCLAIMER } from './build-action-map.js';
import { PROFESSIONAL_CATEGORY, professionalReferral, jointReferral } from './professional-category-registry.js';
import { ISSUE_FAMILY } from './scenario-schema.js';

const URGENT = 'דחוף';
const ATTENTION = 'דורש תשומת לב';

const NOTIFICATION_PARTIES = Object.freeze(['המשלח הבינלאומי', 'חברת הספנות או המוביל', 'המסוף או המחסן']);
const NOTIFICATION_PARTIES_WITH_CLEARANCE = Object.freeze([...NOTIFICATION_PARTIES, 'עמיל המכס']);

const DAMAGE_IMMEDIATE_ACTION =
  'יש לתעד את הנזק, לשמור את האריזה והטובין ככל שניתן, להימנע מהשלכת ראיות, ולדווח ללא דיחוי למבטח ולגורמים המעורבים.';

const DEADLINE_WARNING =
  'ייתכנו מועדי הודעה קצרים לפי הפוליסה, שטר המטען או תנאי ההתקשרות. יש לבדוק אותם מיד.';

function evidenceItems() {
  return [
    'תיעוד מצולם של הנזק ושל האריזה',
    'הודעת נזק כתובה, אם נרשמה בעת המסירה',
    'שטר המטען או מסמך ההובלה',
    'חשבון מסחרי ורשימת אריזה',
    'פוליסת הביטוח, אם קיימת',
  ];
}

/**
 * @param {object} input - Normalized readiness input.
 * @returns {Readonly<object>} Compact result.
 */
export function buildCargoDamageResult(input) {
  const i = input !== null && typeof input === 'object' ? input : {};

  // Safety risk overrides every other consideration: route toward a
  // safety-first process, no technical handling instructions, no
  // routine insurance/surveyor framing.
  if (i.safetyRisk === true) {
    return buildCompactResult({
      scenario: 'shipment_problem',
      issueFamily: ISSUE_FAMILY.CARGO_DAMAGE,
      issueType: 'cargo_or_container_damage_safety_risk',
      routeLabel: 'בעיה במשלוח קיים — נזק למטען עם חשש בטיחותי',
      primaryAction: 'קיים חשש לסיכון בטיחותי. יש לפעול בזהירות, לא לגעת בטובין ולא לנסות לטפל בהם עצמאית, ולערב מיידית את המסוף/המחסן והגורמים המוסמכים.',
      primaryReason: '',
      immediateActions: [
        'יש להימנע ממגע ישיר או מטיפול בטובין החשודים כמסוכנים',
        'יש לדווח מיידית למסוף, למחסן או לגורם המוסמך באתר',
        'יש לשמור על מרחק ולפעול לפי הנחיות הגורם המוסמך במקום',
      ],
      preparationItems: ['תיאור קצר של הסיכון שהתגלה', 'מיקום המטען הנוכחי'],
      urgency: URGENT,
      professional: professionalReferral(
        PROFESSIONAL_CATEGORY.HAZMAT_SPECIALIST,
        'קיים חשש בטיחותי -- נדרש טיפול מיידי מול הגורם המוסמך באתר ומומחה טובין מסוכנים, ולא הנחיה טכנית מרחוק.',
      ),
      supportingProfessional: null,
      notificationParties: NOTIFICATION_PARTIES_WITH_CLEARANCE,
      deadlineWarning: null,
      accumulatingCostWarning: null,
      primaryCta: { id: 'urgent-case-review', label: 'בדיקה דחופה של המקרה' },
      secondaryCta: null,
      secondaryDetails: { note: INSURANCE_ROUTE_DISCLAIMER },
    });
  }

  const discoveredAfterDischarge = ['after_unloading_at_terminal', 'after_delivery', 'concealed_discovered_later'].includes(i.damageDiscoveryTiming);
  const urgency = discoveredAfterDischarge || i.hasInsurance === 'unknown' ? URGENT : ATTENTION;

  const professional = jointReferral(
    PROFESSIONAL_CATEGORY.MARINE_INSURANCE_BROKER,
    PROFESSIONAL_CATEGORY.CARGO_INSURER,
    'כדי לדווח על האירוע, לבדוק את תנאי הכיסוי ולקבל הנחיות לשמירת זכויות וראיות.',
  );
  const supportingProfessional = professionalReferral(
    PROFESSIONAL_CATEGORY.MARINE_SURVEYOR,
    'לצורך תיעוד הנזק, בדיקת היקפו ואיסוף ממצאים מקצועיים.',
  );

  return buildCompactResult({
    scenario: 'shipment_problem',
    issueFamily: ISSUE_FAMILY.CARGO_DAMAGE,
    issueType: 'cargo_or_container_damage',
    routeLabel: 'בעיה במשלוח קיים — נזק למטען או למכולה',
    primaryAction: DAMAGE_IMMEDIATE_ACTION,
    primaryReason: '',
    immediateActions: [
      'תיעוד מיידי של הנזק בתמונות, לפני כל טיפול נוסף בטובין',
      'שמירת האריזה, הטובין וכל ראיה רלוונטית במקום, ככל שניתן',
      'דיווח ללא דיחוי למבטח ולגורמים המעורבים במשלוח',
    ],
    preparationItems: evidenceItems(),
    urgency,
    professional,
    supportingProfessional,
    notificationParties: i.currentStage || i.issuingParty ? NOTIFICATION_PARTIES_WITH_CLEARANCE : NOTIFICATION_PARTIES,
    deadlineWarning: DEADLINE_WARNING,
    accumulatingCostWarning: null,
    primaryCta: { id: 'marine-insurance-referral', label: professional.ctaLabel },
    secondaryCta: { id: 'marine-survey-referral', label: supportingProfessional.ctaLabel },
    secondaryDetails: { note: INSURANCE_ROUTE_DISCLAIMER },
  });
}

/**
 * Cargo shortage/loss (family G) -- missing quantity or a lost
 * shipment, without physical damage. Routes to the same
 * insurance-first primary when insurance may be relevant, with the
 * freight forwarder as supporting to trace the shipment; routes
 * primarily to the freight forwarder when insurance is explicitly
 * absent.
 */
export function buildCargoShortageOrLossResult(input) {
  const i = input !== null && typeof input === 'object' ? input : {};
  const hasInsurance = i.hasInsurance;

  if (hasInsurance === 'no') {
    const professional = professionalReferral(
      PROFESSIONAL_CATEGORY.FREIGHT_FORWARDER,
      'לאתר את המטען החסר מול המוביל והמסוף ולברר את שלב האספקה בפועל.',
    );
    return buildCompactResult({
      scenario: 'shipment_problem',
      issueFamily: ISSUE_FAMILY.CARGO_SHORTAGE_OR_LOSS,
      issueType: 'cargo_shortage_or_loss',
      routeLabel: 'בעיה במשלוח קיים — חוסר או אובדן מטען',
      primaryAction: 'יש לתעד את הכמות שהתקבלה מול הכמות שהוזמנה ולפנות מיידית למשלח ולמוביל לאיתור המטען החסר.',
      primaryReason: '',
      immediateActions: [
        'השוואת רשימת האריזה למטען שהתקבל בפועל',
        'דיווח מיידי למשלח ולמוביל על החוסר',
        'שמירת כל מסמכי ההובלה עד לבירור',
      ],
      preparationItems: ['רשימת אריזה', 'שטר המטען או מסמך ההובלה', 'תיעוד הכמות שהתקבלה'],
      urgency: URGENT,
      professional,
      supportingProfessional: null,
      notificationParties: NOTIFICATION_PARTIES,
      deadlineWarning: DEADLINE_WARNING,
      accumulatingCostWarning: null,
      primaryCta: { id: 'freight-forwarder-referral', label: professional.ctaLabel },
      secondaryCta: null,
      secondaryDetails: {},
    });
  }

  const professional = jointReferral(
    PROFESSIONAL_CATEGORY.MARINE_INSURANCE_BROKER,
    PROFESSIONAL_CATEGORY.CARGO_INSURER,
    'כדי לדווח על החוסר או האובדן ולבדוק את תנאי הכיסוי לפני תביעה.',
  );
  const supportingProfessional = professionalReferral(
    PROFESSIONAL_CATEGORY.FREIGHT_FORWARDER,
    'לאתר את המטען מול המוביל והמסוף במקביל לבדיקת הכיסוי הביטוחי.',
  );

  return buildCompactResult({
    scenario: 'shipment_problem',
    issueFamily: ISSUE_FAMILY.CARGO_SHORTAGE_OR_LOSS,
    issueType: 'cargo_shortage_or_loss',
    routeLabel: 'בעיה במשלוח קיים — חוסר או אובדן מטען',
    primaryAction: 'יש לתעד את הכמות שהתקבלה מול הכמות שהוזמנה, לדווח למבטח וגם למשלח ולמוביל ללא דיחוי.',
    primaryReason: '',
    immediateActions: [
      'השוואת רשימת האריזה למטען שהתקבל בפועל',
      'דיווח ללא דיחוי למבטח על החוסר או האובדן',
      'דיווח מקביל למשלח ולמוביל לאיתור המטען',
    ],
    preparationItems: ['רשימת אריזה', 'שטר המטען או מסמך ההובלה', 'פוליסת הביטוח, אם קיימת', 'תיעוד הכמות שהתקבלה'],
    urgency: URGENT,
    professional,
    supportingProfessional,
    notificationParties: NOTIFICATION_PARTIES,
    deadlineWarning: DEADLINE_WARNING,
    accumulatingCostWarning: null,
    primaryCta: { id: 'marine-insurance-referral', label: professional.ctaLabel },
    secondaryCta: { id: 'freight-forwarder-referral', label: supportingProfessional.ctaLabel },
    secondaryDetails: { note: INSURANCE_ROUTE_DISCLAIMER },
  });
}

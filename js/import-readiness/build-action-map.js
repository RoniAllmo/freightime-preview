/**
 * Shared "action map" result-composition helpers for every Import
 * Readiness scenario. Classifies actions, never the user -- see
 * `ACTION_STATUS_LABELS` in `scenario-schema.js`.
 *
 * Pure, deterministic, DOM-free, network-free, storage-free.
 */

export const RESULT_DISCLAIMER =
  'המסלול והצעדים המוצגים הם כלי עזר תפעולי בלבד. FreighTime אינו קובע סיווג מכס סופי, חוקיות יבוא, החלטה רגולטורית, אישור יבוא, קביעת מס, ייעוץ משפטי או ייעוץ ביטוחי, ואינו מבטיח שחרור או אישור יבוא של הטובין.';

export const TECHNICAL_DETAIL_BOUNDARY_MESSAGE =
  'פרטים כגון שימוש המוצר, אופן הפעולה, הרכב חומרים, נתוני חשמל, דגם, מפרט ותמונות עשויים להיות חשובים לצורך בדיקת סיווג המכס, חוקיות היבוא והרגולציה. המשמעות של כל פרט תלויה במוצר ובמסמכים ויש לבחון אותה מקצועית.';

export const CLASSIFICATION_REVIEW_NEEDED_MESSAGE =
  'על בסיס המידע שנמסר, נדרשת בדיקת סיווג מקצועית. אין מספיק מידע לקביעת פרט מכס סופי במסגרת הבדיקה המקוונת.';

export const USER_PROVIDED_HS_CODE_NOTE =
  'קוד זה מוצג כפי שהוזן על ידי המשתמש בלבד ואינו מאומת כסופי. מומלץ לוודא את הסיווג ואת המסים וההיתרים הנגזרים ממנו לפני הגשה או שילוח.';

export const LEGAL_OR_INSURANCE_BOUNDARY_MESSAGE =
  'הנושא דורש בחינה של עורך דין, יועץ ביטוחי או גורם מקצועי מתאים. FreighTime אינו מספק ייעוץ משפטי או ביטוחי.';

/** Professional roles a scenario may recommend -- never an invented network. */
export const PROFESSIONAL_ROLES = Object.freeze({
  CUSTOMS_CLASSIFIER: 'מסווג מכס מקצועי',
  LICENSED_CUSTOMS_BROKER: 'עמיל מכס מורשה',
  REGULATION_SPECIALIST: 'מומחה רגולציה',
  QUALIFIED_PROFESSIONAL: 'גורם מקצועי מוסמך',
  LEGAL_ADVISER: 'עורך דין',
  INSURANCE_ADVISER: 'יועץ ביטוחי',
});

/** Official-source category link registry -- static, safe, never carries user input. */
export const OFFICIAL_SOURCES = Object.freeze({
  'customs-tariff': Object.freeze({ label: 'תעריף המכס ומס הקנייה', url: 'https://www.gov.il/he/departments/general/customs_tariff' }),
  'free-import-order': Object.freeze({ label: 'צו יבוא חופשי', url: 'https://www.gov.il/he/departments/policies/free_import_order' }),
  'standards-institution': Object.freeze({ label: 'מכון התקנים הישראלי', url: 'https://www.sii.org.il/' }),
  'health-ministry': Object.freeze({ label: 'משרד הבריאות -- יבוא מוצרים', url: 'https://www.gov.il/he/departments/ministry_of_health' }),
  'transport-ministry': Object.freeze({ label: 'משרד התחבורה', url: 'https://www.gov.il/he/departments/ministry_of_transportation' }),
  'agriculture-ministry': Object.freeze({ label: 'משרד החקלאות ופיתוח הכפר', url: 'https://www.gov.il/he/departments/ministry_of_agriculture_and_rural_development' }),
  'environmental-protection-ministry': Object.freeze({ label: 'המשרד להגנת הסביבה', url: 'https://www.gov.il/he/departments/ministry_of_environmental_protection' }),
  'communications-ministry': Object.freeze({ label: 'משרד התקשורת', url: 'https://www.gov.il/he/departments/ministry_of_communications' }),
});

/** Resolve official-source categories to link objects, labeled "נדרש לבדוק" (never "נדרש אישור"). */
export function resolveOfficialSources(categories) {
  const list = Array.isArray(categories) ? categories : [];
  return Object.freeze(
    [...new Set(list)]
      .filter((c) => OFFICIAL_SOURCES[c])
      .map((c) => Object.freeze({ category: c, ...OFFICIAL_SOURCES[c], noteLabel: 'נדרש לבדוק' })),
  );
}

/**
 * @typedef {Readonly<{id: string, label: string, status: string, note: string}>} ActionItem
 */

export function actionItem(id, label, status, note = '') {
  return Object.freeze({ id, label, status, note });
}

/**
 * Compose the standard scenario result (personal / first-commercial /
 * existing-importer): sections A-K, only the non-empty ones included.
 *
 * @param {{scenario: string, routeLabel: string, sections: object, officialSources: Array, ctas: Array}} input
 */
export function buildStandardResult({ scenario, routeLabel, sections, officialSources, ctas }) {
  const s = sections !== null && typeof sections === 'object' ? sections : {};
  const nonEmpty = (arr) => Array.isArray(arr) && arr.length > 0;

  const result = {
    scenario,
    routeLabel,
    disclaimer: RESULT_DISCLAIMER,
    sections: {},
  };

  const ordered = [
    ['known', s.known],
    ['missing', s.missing],
    ['toCheck', s.toCheck],
    ['documentsToPrepare', s.documentsToPrepare],
    ['beforeOrder', s.beforeOrder],
    ['beforeShipment', s.beforeShipment],
    ['risks', s.risks],
    ['nextStep', s.nextStep],
    ['whenProfessionalReviewNeeded', s.whenProfessionalReviewNeeded],
  ];
  for (const [key, value] of ordered) {
    if (nonEmpty(value)) result.sections[key] = Object.freeze(value);
  }

  result.officialSources = Object.freeze(nonEmpty(officialSources) ? officialSources : []);
  result.ctas = Object.freeze(nonEmpty(ctas) ? ctas : []);

  return Object.freeze({ ...result, sections: Object.freeze(result.sections) });
}

/**
 * Compose the established-operation audit-style result (Phase M item
 * 58): purpose, audit points, exposures, documents/sample, professional
 * role, next step -- never a compliance certificate or readiness score.
 */
export function buildAuditResult({ routeLabel, purposeLabel, auditPoints, exposures, documentsAndSample, recommendedProfessional, nextStep, officialSources, ctas }) {
  const nonEmpty = (arr) => Array.isArray(arr) && arr.length > 0;
  const sections = {};
  if (purposeLabel) sections.purpose = purposeLabel;
  if (nonEmpty(auditPoints)) sections.auditPoints = Object.freeze(auditPoints);
  if (nonEmpty(exposures)) sections.exposures = Object.freeze(exposures);
  if (nonEmpty(documentsAndSample)) sections.documentsAndSample = Object.freeze(documentsAndSample);
  if (recommendedProfessional) sections.recommendedProfessional = recommendedProfessional;
  if (nextStep) sections.nextStep = nextStep;

  return Object.freeze({
    scenario: 'established_operation',
    routeLabel,
    disclaimer: RESULT_DISCLAIMER,
    sections: Object.freeze(sections),
    officialSources: Object.freeze(nonEmpty(officialSources) ? officialSources : []),
    ctas: Object.freeze(nonEmpty(ctas) ? ctas : []),
  });
}

/**
 * Compose the shipment-problem result (Phase M item 59): urgency, data/
 * documents to gather, timeline to reconstruct, party to check with,
 * accumulating costs, recommended action, escalation trigger.
 */
export function buildProblemResult({ routeLabel, urgencyLabel, dataToGather, timelineNote, partyToCheckWith, accumulatingCosts, recommendedAction, whenToEscalate, officialSources, ctas }) {
  const nonEmpty = (arr) => Array.isArray(arr) && arr.length > 0;
  const sections = {};
  if (urgencyLabel) sections.urgency = urgencyLabel;
  if (nonEmpty(dataToGather)) sections.dataToGather = Object.freeze(dataToGather);
  if (timelineNote) sections.timelineNote = timelineNote;
  if (partyToCheckWith) sections.partyToCheckWith = partyToCheckWith;
  if (nonEmpty(accumulatingCosts)) sections.accumulatingCosts = Object.freeze(accumulatingCosts);
  if (recommendedAction) sections.recommendedAction = recommendedAction;
  if (whenToEscalate) sections.whenToEscalate = whenToEscalate;

  return Object.freeze({
    scenario: 'shipment_problem',
    routeLabel,
    disclaimer: RESULT_DISCLAIMER,
    sections: Object.freeze(sections),
    officialSources: Object.freeze(nonEmpty(officialSources) ? officialSources : []),
    ctas: Object.freeze(nonEmpty(ctas) ? ctas : []),
  });
}

/**
 * Builds a plain-text, privacy-safe, copyable summary of a scenario
 * result for the user to copy manually. Never includes personal data,
 * full supplier contact details, or hidden diagnostics -- only the
 * route, the visible section content, and the disclaimer.
 *
 * Pure, DOM-free, network-free, storage-free.
 */

import { ACTION_STATUS_LABELS } from './scenario-schema.js';

function pushItems(lines, heading, items) {
  if (!Array.isArray(items) || items.length === 0) return;
  lines.push(`${heading}:`);
  for (const item of items) {
    if (typeof item === 'string') {
      lines.push(`- ${item}`);
    } else if (item && typeof item === 'object' && typeof item.label === 'string') {
      const statusLabel = ACTION_STATUS_LABELS[item.status] ?? item.status;
      lines.push(`- ${item.label} (${statusLabel})`);
    }
  }
  lines.push('');
}

const SECTION_HEADINGS = Object.freeze({
  known: 'מה כבר ידוע',
  missing: 'מה חסר',
  toCheck: 'מה מומלץ לבדוק',
  documentsToPrepare: 'מסמכים שכדאי להכין',
  beforeOrder: 'לפני הזמנה',
  beforeShipment: 'לפני שילוח',
  risks: 'סיכונים אפשריים',
  nextStep: 'הצעד הבא',
  whenProfessionalReviewNeeded: 'מתי נדרשת בדיקה מקצועית',
  purpose: 'מטרת הבדיקה',
  auditPoints: 'נקודות לביקורת',
  exposures: 'חשיפות אפשריות',
  documentsAndSample: 'מסמכים ומדגם לבדיקה',
  recommendedProfessional: 'גורם מקצועי מומלץ',
  urgency: 'רמת דחיפות',
  dataToGather: 'נתונים ומסמכים לאיסוף',
  timelineNote: 'ציר הזמן שיש לשחזר',
  partyToCheckWith: 'הגורם שמולו נדרש לבדוק',
  accumulatingCosts: 'עלויות שעלולות להמשיך להצטבר',
  recommendedAction: 'פעולה מומלצת',
  whenToEscalate: 'מתי להסלים',
});

/**
 * @param {*} result - A result from any scenario's build*Result function.
 * @returns {string} A plain-text summary, never HTML.
 */
export function buildScenarioSummary(result) {
  const r = result !== null && typeof result === 'object' ? result : {};
  const sections = r.sections !== null && typeof r.sections === 'object' ? r.sections : {};

  const lines = [];
  lines.push('בדיקת מוכנות ליבוא -- FreighTime');
  lines.push('');
  if (r.routeLabel) {
    lines.push(`המסלול שזוהה: ${r.routeLabel}`);
    lines.push('');
  }

  for (const [key, heading] of Object.entries(SECTION_HEADINGS)) {
    const value = sections[key];
    if (Array.isArray(value)) {
      pushItems(lines, heading, value);
    } else if (typeof value === 'string' && value.length > 0) {
      lines.push(`${heading}: ${value}`);
      lines.push('');
    }
  }

  if (typeof r.disclaimer === 'string' && r.disclaimer.length > 0) {
    lines.push(r.disclaimer);
  }

  return lines.join('\n');
}

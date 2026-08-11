/**
 * Builds a plain-text, privacy-safe, copyable summary of an Import
 * Readiness Check V1 result for the user to copy manually (e.g. to send
 * to a supplier or professional). Never includes personal data, full
 * supplier contact details, uploaded files, hidden diagnostics, or
 * browser metadata -- only the product/commercial fields the user
 * themselves entered plus the computed result sections.
 *
 * Pure, DOM-free, network-free, storage-free. Returns a plain string;
 * the caller is responsible for the actual clipboard write.
 */

const READINESS_LEVEL_LABELS = Object.freeze({
  high: 'גבוהה',
  partial: 'חלקית',
  low: 'נמוכה',
});

/**
 * @param {*} input - A normalized readiness input.
 * @param {*} result - A result from `buildReadinessResult`.
 * @returns {string} A plain-text summary, never HTML.
 */
export function buildReadinessSummary(input, result) {
  const in_ = input !== null && typeof input === 'object' ? input : {};
  const res = result !== null && typeof result === 'object' ? result : {};

  const lines = [];
  lines.push('בדיקת מוכנות ליבוא -- FreighTime');
  lines.push('');
  lines.push(`מוצר: ${in_.productName || '(לא הוזן)'}`);
  if (in_.commercialDescription) lines.push(`תיאור: ${in_.commercialDescription}`);
  lines.push(`רמת מוכנות: ${READINESS_LEVEL_LABELS[res.readinessLevel] ?? res.readinessLevel ?? '-'}`);
  lines.push('');

  if (Array.isArray(res.missingInformation) && res.missingInformation.length > 0) {
    lines.push('מידע חסר:');
    for (const item of res.missingInformation) lines.push(`- ${item}`);
    lines.push('');
  }

  if (Array.isArray(res.documentsToObtain) && res.documentsToObtain.length > 0) {
    lines.push('מסמכים להשגה/לבדיקה:');
    for (const doc of res.documentsToObtain) lines.push(`- ${doc.label}`);
    lines.push('');
  }

  if (Array.isArray(res.regulatoryRisks) && res.regulatoryRisks.length > 0) {
    lines.push('נושאים רגולטוריים לבדיקה:');
    for (const risk of res.regulatoryRisks) lines.push(`- ${risk.reason}`);
    lines.push('');
  }

  if (Array.isArray(res.nextActions) && res.nextActions.length > 0) {
    lines.push('צעדים מומלצים:');
    for (const action of res.nextActions) lines.push(`- ${action}`);
    lines.push('');
  }

  if (typeof res.disclaimer === 'string' && res.disclaimer.length > 0) {
    lines.push(res.disclaimer);
  }

  return lines.join('\n');
}

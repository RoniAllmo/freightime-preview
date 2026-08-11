/**
 * Builds a plain-text, privacy-safe, copyable summary of a compact
 * scenario result -- matches the visible result exactly. Never includes
 * hidden long explanations, all possible service categories, all
 * official links, internal rule IDs, diagnostics, or empty headings.
 *
 * Pure, DOM-free, network-free, storage-free.
 */

/**
 * @param {*} result - A result from `buildCompactResult` (via any
 *   scenario's build*Result function).
 * @returns {string} A plain-text summary, never HTML.
 */
export function buildScenarioSummary(result) {
  const r = result !== null && typeof result === 'object' ? result : {};

  const lines = ['סיכום FreighTime', ''];

  if (r.routeLabel) {
    lines.push('המסלול:', r.routeLabel, '');
  }
  if (r.primaryAction) {
    lines.push('הפעולה המומלצת:', r.primaryAction, '');
  }
  if (r.primaryReason) {
    lines.push('למה:', r.primaryReason, '');
  }
  if (Array.isArray(r.preparationItems) && r.preparationItems.length > 0) {
    lines.push('מה להכין:');
    for (const item of r.preparationItems) lines.push(`• ${item}`);
    lines.push('');
  }
  if (r.urgency) {
    lines.push(`רמת דחיפות: ${r.urgency}`, '');
  }

  lines.push('הערה:', typeof r.visibleDisclaimer === 'string' ? r.visibleDisclaimer : '');

  return lines.join('\n');
}

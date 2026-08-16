/**
 * Confidence vocabulary for the Product Regulatory Signals pilot.
 * Words only -- never a number, never an AI-style score. Even the
 * "high" label is not a final import decision; every card carries the
 * limitation line regardless of label.
 */
export const CONFIDENCE = Object.freeze({
  HIGH: 'התאמה גבוהה',
  PARTIAL: 'התאמה חלקית',
  MORE_INFO_NEEDED: 'נדרש מידע נוסף',
});

export const CONFIDENCE_VALUES = Object.freeze(Object.values(CONFIDENCE));

export function isWordConfidenceLabel(value) {
  return CONFIDENCE_VALUES.includes(value);
}

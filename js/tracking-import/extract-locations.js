/**
 * Conservative location-value handling for FreighTime's Smart Tracking
 * Import V1.
 *
 * Responsibility: take a raw text value already isolated as the content
 * following a recognized location-ish label (port, origin, destination,
 * event location) and package it as an evidence-bearing field value.
 * This module has no gazetteer and never verifies that a value is a real
 * place -- it can only report that readable text was found under a
 * matching label, so its confidence ceiling is `'medium'`, never
 * `'high'`.
 *
 * Performs no DOM/network/storage access and no logging.
 */

/** A location value longer than this is treated as unreliable label matching rather than a real place name. */
const MAX_LOCATION_LENGTH = 200;

/**
 * @param {*} rawValue - The raw text value (already isolated from its label).
 * @returns {Readonly<{value: string, confidence: 'medium'|'low'}>|null}
 *   `null` when the value is empty after trimming.
 */
export function extractLocationValue(rawValue) {
  const value = typeof rawValue === 'string' ? rawValue.trim() : '';
  if (value.length === 0) {
    return null;
  }
  if (value.length > MAX_LOCATION_LENGTH) {
    return Object.freeze({ value: value.slice(0, MAX_LOCATION_LENGTH), confidence: 'low' });
  }
  const looksPlausible = /[A-Za-z֐-׿]/.test(value);
  return Object.freeze({ value, confidence: looksPlausible ? 'medium' : 'low' });
}

/**
 * ISO 6346 ocean-container-number validator tool -- pure calculation
 * module for FreighTime's logistics toolkit (`OPERATIONS_TOOLKIT_V1.md`).
 *
 * This tool reuses the exact same normalization
 * (`normalizeTrackingInput`, normalize.js) and ISO 6346 structure/
 * check-digit logic (`CONTAINER_STRUCTURE_PATTERN`,
 * `calculateIso6346CheckDigit`, detect-container.js) already used by the
 * primary tracking search -- it does not duplicate or fork either. It
 * only adds a component breakdown (owner code, equipment category
 * identifier, serial number, supplied vs. calculated check digit) that
 * the tracking-search detector itself does not need to expose.
 *
 * Consistent with `detect-container.js`, this module never infers or
 * claims an operating shipping line from the 4-letter prefix -- the
 * prefix is a BIC-registered owner/equipment-category code, not proof of
 * which carrier currently operates the container.
 *
 * Performs no network I/O, no DOM access, no storage access, and no
 * logging of any kind.
 */

import { normalizeTrackingInput } from '../tracking/normalize.js';
import { CONTAINER_STRUCTURE_PATTERN, calculateIso6346CheckDigit } from '../tracking/detect-container.js';

const NO_CARRIER_INFERENCE_NOTE =
  'קידומת האותיות מזהה בעלים/מפעיל ציוד רשום (BIC) בלבד. אין בכך כדי להעיד באיזו חברת ספנות מפעילה כיום את המכולה בפועל.';

/**
 * Validate and break down a user-supplied ocean container number.
 *
 * @param {*} rawInput - The raw value from the tool's input field. Any
 *   type is accepted; unsupported types safely normalize to an empty
 *   working value (see `normalizeTrackingInput`).
 * @returns {Readonly<object>} A frozen result. `normalizedIdentifier` is
 *   always the normalized alphanumeric value (possibly empty).
 *   `structureValid` reports whether the value matches the 4-letters
 *   + 7-digits ISO 6346 shape; when it does, `ownerCode`,
 *   `equipmentCategoryIdentifier`, `serialNumber`, `suppliedCheckDigit`,
 *   and `calculatedCheckDigit` are populated and `checkDigitValid`
 *   reports whether the supplied and calculated check digits match.
 *   `valid` is `true` only when both the structure and the check digit
 *   are correct.
 */
export function validateContainerNumber(rawInput) {
  const normalized = normalizeTrackingInput(rawInput);
  const candidate = normalized.alphanumericInput;

  if (candidate.length === 0) {
    return Object.freeze({
      valid: false,
      error: 'empty_input',
      normalizedIdentifier: '',
      structureValid: false,
      checkDigitValid: null,
      ownerCode: null,
      equipmentCategoryIdentifier: null,
      serialNumber: null,
      suppliedCheckDigit: null,
      calculatedCheckDigit: null,
      carrierInferenceNote: NO_CARRIER_INFERENCE_NOTE,
    });
  }

  if (candidate.length !== 11 || !CONTAINER_STRUCTURE_PATTERN.test(candidate)) {
    return Object.freeze({
      valid: false,
      error: 'invalid_structure',
      normalizedIdentifier: candidate,
      structureValid: false,
      checkDigitValid: null,
      ownerCode: null,
      equipmentCategoryIdentifier: null,
      serialNumber: null,
      suppliedCheckDigit: null,
      calculatedCheckDigit: null,
      carrierInferenceNote: NO_CARRIER_INFERENCE_NOTE,
    });
  }

  const ownerCode = candidate.slice(0, 3);
  const equipmentCategoryIdentifier = candidate.slice(3, 4);
  const serialNumber = candidate.slice(4, 10);
  const suppliedCheckDigit = Number(candidate[10]);
  const calculatedCheckDigit = calculateIso6346CheckDigit(candidate.slice(0, 10));
  const checkDigitValid = suppliedCheckDigit === calculatedCheckDigit;

  return Object.freeze({
    valid: checkDigitValid,
    error: checkDigitValid ? null : 'invalid_check_digit',
    normalizedIdentifier: candidate,
    structureValid: true,
    checkDigitValid,
    ownerCode,
    equipmentCategoryIdentifier,
    serialNumber,
    suppliedCheckDigit,
    calculatedCheckDigit,
    carrierInferenceNote: NO_CARRIER_INFERENCE_NOTE,
  });
}

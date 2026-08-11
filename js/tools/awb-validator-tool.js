/**
 * Air waybill (AWB) number validator tool -- pure calculation module for
 * FreighTime's logistics toolkit (`OPERATIONS_TOOLKIT_V1.md`).
 *
 * This tool reuses the exact same normalization
 * (`normalizeTrackingInput`, normalize.js) and Modulus-7 structure/
 * check-digit logic (`AWB_STRUCTURE_PATTERN`,
 * `calculateModulus7CheckDigit`, detect-awb.js) already used by the
 * primary tracking search -- it does not duplicate or fork either. It
 * only adds a component breakdown (airline accounting prefix, serial
 * number, supplied vs. calculated check digit) that the tracking-search
 * detector itself does not need to expose.
 *
 * No airline-prefix-to-carrier mapping exists anywhere in this
 * repository yet (per detect-awb.js's own documentation, this is an
 * explicitly deferred later stage). This module never invents or infers
 * one -- it always reports the fixed, honest
 * `airlinePrefixNote: 'קוד חברת התעופה טרם אומת במערכת'` for any
 * structurally valid prefix, rather than guessing an airline name.
 *
 * Performs no network I/O, no DOM access, no storage access, and no
 * logging of any kind.
 */

import { normalizeTrackingInput } from '../tracking/normalize.js';
import { AWB_STRUCTURE_PATTERN, calculateModulus7CheckDigit } from '../tracking/detect-awb.js';

const AIRLINE_PREFIX_NOT_VERIFIED_NOTE = 'קוד חברת התעופה טרם אומת במערכת';

/**
 * Validate and break down a user-supplied air waybill number.
 *
 * @param {*} rawInput - The raw value from the tool's input field. Any
 *   type is accepted; unsupported types safely normalize to an empty
 *   working value (see `normalizeTrackingInput`).
 * @returns {Readonly<object>} A frozen result. `normalizedIdentifier` is
 *   always the normalized digits-only value (possibly empty).
 *   `structureValid` reports whether the value matches the 11-digit AWB
 *   shape; when it does, `prefix`, `serialNumber`, `suppliedCheckDigit`,
 *   and `calculatedCheckDigit` are populated and `checkDigitValid`
 *   reports whether the supplied and calculated check digits match.
 *   `valid` is `true` only when both the structure and the check digit
 *   are correct. `airlinePrefixNote` is always the fixed
 *   not-yet-verified note when a prefix was extracted -- never an
 *   invented airline name.
 */
export function validateAwbNumber(rawInput) {
  const normalized = normalizeTrackingInput(rawInput);
  const candidate = normalized.alphanumericInput;

  if (candidate.length === 0) {
    return Object.freeze({
      valid: false,
      error: 'empty_input',
      normalizedIdentifier: '',
      structureValid: false,
      checkDigitValid: null,
      prefix: null,
      serialNumber: null,
      suppliedCheckDigit: null,
      calculatedCheckDigit: null,
      airlinePrefixNote: null,
    });
  }

  if (candidate.length !== 11 || !AWB_STRUCTURE_PATTERN.test(candidate)) {
    return Object.freeze({
      valid: false,
      error: 'invalid_structure',
      normalizedIdentifier: candidate,
      structureValid: false,
      checkDigitValid: null,
      prefix: null,
      serialNumber: null,
      suppliedCheckDigit: null,
      calculatedCheckDigit: null,
      airlinePrefixNote: null,
    });
  }

  const prefix = candidate.slice(0, 3);
  const serialNumber = candidate.slice(3, 10);
  const suppliedCheckDigit = Number(candidate[10]);
  const calculatedCheckDigit = calculateModulus7CheckDigit(serialNumber);
  const checkDigitValid = suppliedCheckDigit === calculatedCheckDigit;

  return Object.freeze({
    valid: checkDigitValid,
    error: checkDigitValid ? null : 'invalid_check_digit',
    normalizedIdentifier: candidate,
    structureValid: true,
    checkDigitValid,
    prefix,
    serialNumber,
    suppliedCheckDigit,
    calculatedCheckDigit,
    airlinePrefixNote: AIRLINE_PREFIX_NOT_VERIFIED_NOTE,
  });
}

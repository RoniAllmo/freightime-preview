/**
 * Air-freight chargeable-weight calculator -- pure calculation module for
 * FreighTime's logistics toolkit (`OPERATIONS_TOOLKIT_V1.md`).
 *
 * Formula (dimensions normalized to centimeters):
 *   volumetric weight (kg) = length(cm) x width(cm) x height(cm) x quantity / divisor
 *   chargeable weight (kg) = max(actual gross weight, volumetric weight)
 *
 * This module performs no network I/O, no DOM access, no storage access,
 * and no logging of any kind. It never presents its result as a binding
 * freight charge -- every result carries a fixed limitation note the
 * caller can display verbatim.
 */

const UNIT_TO_CM = Object.freeze({ mm: 0.1, cm: 1, m: 100 });

const DEFAULT_DIVISOR = 6000;
const ALTERNATE_DIVISOR = 5000;
const MIN_DIVISOR = 1;
const MAX_DIVISOR = 1_000_000;

/** Sanity guard: reject a single dimension larger than this many centimeters. */
const MAX_DIMENSION_CM = 10_000;
const MAX_QUANTITY = 1_000_000;
const MAX_GROSS_WEIGHT_KG = 1_000_000;

const LIMITATION_NOTE =
  'זהו אומדן תפעולי בלבד ואינו מהווה חיוב מחיר סופי. חברת התעופה, המשלח, המוצר, המסלול או תעריפי החברה עשויים לקבוע כללי עיגול או מכפיל נפח שונים.';

function isPositiveFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isPositiveInteger(value) {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function roundTo(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Round up to the nearest half-kilogram, the common air-freight practical rounding rule. */
function roundUpToHalfKg(value) {
  return Math.ceil(value * 2) / 2;
}

function buildError(reason) {
  return Object.freeze({ valid: false, error: reason });
}

/**
 * Calculate chargeable weight from user-supplied gross weight and
 * dimensions.
 *
 * @param {{
 *   grossWeightKg: *,
 *   length: *,
 *   width: *,
 *   height: *,
 *   unit: 'mm'|'cm'|'m',
 *   quantity: *,
 *   divisor?: *,
 * }} input - `divisor` defaults to 6000 when omitted or `null`/`undefined`.
 * @returns {Readonly<object>} A frozen result. On success, `valid: true`
 *   with full-precision and rounded weight/volume fields plus which
 *   factor controls. On failure, `valid: false` with a stable `error`
 *   code.
 */
export function calculateChargeableWeight(input) {
  if (input === null || typeof input !== 'object') {
    return buildError('invalid_input');
  }

  const { grossWeightKg, length, width, height, unit, quantity } = input;
  const divisor = input.divisor === null || input.divisor === undefined ? DEFAULT_DIVISOR : input.divisor;

  const unitFactor = UNIT_TO_CM[unit];
  if (!unitFactor) {
    return buildError('invalid_unit');
  }

  if (!isPositiveFiniteNumber(grossWeightKg) || grossWeightKg > MAX_GROSS_WEIGHT_KG) {
    return buildError('invalid_gross_weight');
  }

  if (!isPositiveFiniteNumber(length) || !isPositiveFiniteNumber(width) || !isPositiveFiniteNumber(height)) {
    return buildError('invalid_dimensions');
  }

  if (!isPositiveInteger(quantity)) {
    return buildError('invalid_quantity');
  }

  if (!isPositiveFiniteNumber(divisor) || divisor < MIN_DIVISOR || divisor > MAX_DIVISOR) {
    return buildError('invalid_divisor');
  }

  const lengthCm = length * unitFactor;
  const widthCm = width * unitFactor;
  const heightCm = height * unitFactor;

  if (lengthCm > MAX_DIMENSION_CM || widthCm > MAX_DIMENSION_CM || heightCm > MAX_DIMENSION_CM) {
    return buildError('dimension_too_large');
  }
  if (quantity > MAX_QUANTITY) {
    return buildError('quantity_too_large');
  }

  const totalVolumeCm3 = lengthCm * widthCm * heightCm * quantity;
  const volumetricWeightKg = totalVolumeCm3 / divisor;
  const chargeableWeightKg = Math.max(grossWeightKg, volumetricWeightKg);

  let controllingFactor;
  if (volumetricWeightKg > grossWeightKg) {
    controllingFactor = 'volumetric';
  } else if (grossWeightKg > volumetricWeightKg) {
    controllingFactor = 'actual';
  } else {
    controllingFactor = 'equal';
  }

  return Object.freeze({
    valid: true,
    error: null,
    grossWeightKg,
    volumetricWeightKg,
    volumetricWeightKgRounded: roundTo(volumetricWeightKg, 2),
    chargeableWeightKg,
    chargeableWeightKgPracticalRounded: roundUpToHalfKg(chargeableWeightKg),
    totalVolumeCm3,
    divisorUsed: divisor,
    isDefaultDivisor: divisor === DEFAULT_DIVISOR,
    isAlternateDivisor: divisor === ALTERNATE_DIVISOR,
    controllingFactor,
    packageCount: quantity,
    limitationNote: LIMITATION_NOTE,
  });
}

export { DEFAULT_DIVISOR, ALTERNATE_DIVISOR };

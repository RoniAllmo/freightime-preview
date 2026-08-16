/**
 * CBM (cubic-meter volume) calculator -- pure calculation module for
 * FreighTime's logistics toolkit (`OPERATIONS_TOOLKIT_V1.md`).
 *
 * Formula: CBM = length(m) x width(m) x height(m) x quantity.
 *
 * This module performs no network I/O, no DOM access, no storage access,
 * and no logging of any kind. It never claims its output is a final
 * carrier or warehouse measurement -- every result carries a fixed
 * limitation note the caller can display verbatim.
 */

const UNIT_TO_METERS = Object.freeze({ mm: 0.001, cm: 0.01, m: 1 });

/** Sanity guard: reject a single dimension larger than this many meters. */
const MAX_DIMENSION_METERS = 100;
/** Sanity guard: reject an unrealistic package count. */
const MAX_QUANTITY = 1_000_000;

const LIMITATION_NOTE =
  'זהו חישוב תפעולי מוערך בלבד. המידה והמשקל הסופיים ייקבעו על ידי המוביל או המחסן בפועל, וייתכנו הפרשים.';

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

function buildError(reason) {
  return Object.freeze({ valid: false, error: reason });
}

/**
 * Calculate per-package and total CBM from user-supplied dimensions.
 *
 * @param {{length: *, width: *, height: *, unit: 'mm'|'cm'|'m', quantity: *}} input
 * @returns {Readonly<object>} A frozen result. On success, `valid: true`
 *   with `cbmPerPackage`/`totalCbm` (full precision) and their rounded
 *   (3-decimal) display counterparts. On failure, `valid: false` with a
 *   stable `error` code.
 */
export function calculateCbm(input) {
  if (input === null || typeof input !== 'object') {
    return buildError('invalid_input');
  }

  const { length, width, height, unit, quantity } = input;

  const unitFactor = UNIT_TO_METERS[unit];
  if (!unitFactor) {
    return buildError('invalid_unit');
  }

  if (!isPositiveFiniteNumber(length) || !isPositiveFiniteNumber(width) || !isPositiveFiniteNumber(height)) {
    return buildError('invalid_dimensions');
  }

  if (!isPositiveInteger(quantity)) {
    return buildError('invalid_quantity');
  }

  const lengthMeters = length * unitFactor;
  const widthMeters = width * unitFactor;
  const heightMeters = height * unitFactor;

  if (lengthMeters > MAX_DIMENSION_METERS || widthMeters > MAX_DIMENSION_METERS || heightMeters > MAX_DIMENSION_METERS) {
    return buildError('dimension_too_large');
  }
  if (quantity > MAX_QUANTITY) {
    return buildError('quantity_too_large');
  }

  const cbmPerPackage = lengthMeters * widthMeters * heightMeters;
  const totalCbm = cbmPerPackage * quantity;

  return Object.freeze({
    valid: true,
    error: null,
    cbmPerPackage,
    cbmPerPackageRounded: roundTo(cbmPerPackage, 3),
    totalCbm,
    totalCbmRounded: roundTo(totalCbm, 3),
    packageCount: quantity,
    normalizedDimensionsMeters: Object.freeze({
      length: lengthMeters,
      width: widthMeters,
      height: heightMeters,
    }),
    limitationNote: LIMITATION_NOTE,
  });
}

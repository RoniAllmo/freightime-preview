/**
 * Input normalization layer for the FreighTime Single-input tracking router.
 *
 * Responsibility: convert a raw user-entered value into a normalized input
 * model (see TRACKING_ROUTER_DESIGN.md, Section 4) that downstream
 * detectors can consume without each re-implementing trimming, casing,
 * compacting, or digit-extraction rules.
 *
 * This module performs normalization only. It does not infer or return an
 * identifier type, a carrier, a routing decision, or a tracking URL — that
 * logic belongs in the detect-*.js modules, carrier-registry.js, and
 * router.js respectively.
 *
 * Supported input types: `string`, `number`, `bigint`, `null`, `undefined`.
 * Unsupported input types (`boolean`, `symbol`, `function`, `Array`, plain
 * `object`, and any other non-primitive value) never throw; they safely
 * produce an empty working string and empty/zero/false derived fields (see
 * `isSupportedRawInput` below).
 *
 * Must NOT contain: identifier-type detection, carrier logic, routing
 * decisions, or any DOM/UI manipulation. This module only transforms a
 * value into a structured normalized representation.
 */

/**
 * Determine whether a raw input value is one of the primitive types this
 * function knows how to convert into a working string (`string`, `number`,
 * `bigint`, `null`, `undefined`). Anything else (including `boolean`,
 * `symbol`, `function`, arrays, and plain objects) is treated as
 * unsupported.
 *
 * @param {*} rawInput - The value to classify.
 * @returns {boolean} Whether the value is a supported primitive type.
 */
function isSupportedRawInput(rawInput) {
  if (rawInput === null || rawInput === undefined) {
    return true;
  }
  const type = typeof rawInput;
  return type === 'string' || type === 'number' || type === 'bigint';
}

/**
 * Produce a normalized input object from raw user input.
 *
 * Returns a new, frozen object on every call. Never mutates the supplied
 * value, accesses the DOM, logs the input, writes to storage, or makes a
 * network request. Performs no identifier-type or carrier inference.
 *
 * @param {string|number|bigint|null|undefined|*} rawInput - The raw value
 *   from the tracking input. Supported types are `string`, `number`,
 *   `bigint`, `null`, and `undefined`. Any other type (e.g. `boolean`,
 *   `symbol`, `function`, `Array`, plain `object`) is treated as
 *   unsupported and normalized to safe empty/zero/false defaults.
 * @returns {Readonly<{
 *   originalInput: string|number|bigint|null|undefined,
 *   stringInput: string,
 *   trimmedInput: string,
 *   uppercaseInput: string,
 *   compactInput: string,
 *   alphanumericInput: string,
 *   digitsOnly: string,
 *   inputLength: number,
 *   compactLength: number,
 *   hasLetters: boolean,
 *   hasDigits: boolean,
 *   isEmpty: boolean
 * }>} A frozen normalized-input object.
 *
 * Field notes:
 * - `originalInput` preserves the exact supplied value for supported types
 *   (`string`, `number`, `bigint`, `null`, `undefined`). For unsupported
 *   types it is set to `null` rather than retaining a reference to an
 *   array, object, function, or symbol.
 * - `stringInput` is the safe working-string conversion of `rawInput`
 *   (empty string for `null`, `undefined`, or any unsupported type).
 * - `trimmedInput` removes leading/trailing Unicode whitespace from
 *   `stringInput`; internal whitespace is preserved.
 * - `uppercaseInput` is `trimmedInput` converted to uppercase, with no
 *   shipment-type detection or locale-specific business rules applied.
 * - `compactInput` removes all Unicode whitespace from `uppercaseInput`
 *   while preserving punctuation and separators such as hyphens.
 * - `alphanumericInput` retains only ASCII letters `A-Z` and digits `0-9`
 *   from `uppercaseInput`. This is intentionally ASCII-only: non-ASCII
 *   letters (including Hebrew and other scripts) are removed, not
 *   transliterated.
 * - `digitsOnly` retains only digits `0-9` from `uppercaseInput`.
 * - `inputLength` is the character length of `trimmedInput`.
 * - `compactLength` is the character length of `alphanumericInput`.
 * - `hasLetters` / `hasDigits` reflect whether `alphanumericInput` contains
 *   at least one ASCII letter / digit.
 * - `isEmpty` is `true` when `alphanumericInput` is an empty string.
 */
export function normalizeTrackingInput(rawInput) {
  const supported = isSupportedRawInput(rawInput);

  const stringInput = supported && rawInput !== null && rawInput !== undefined
    ? String(rawInput)
    : '';

  const trimmedInput = stringInput.trim();
  const uppercaseInput = trimmedInput.toUpperCase();
  const compactInput = uppercaseInput.replace(/\s+/gu, '');
  const alphanumericInput = uppercaseInput.replace(/[^A-Z0-9]/g, '');
  const digitsOnly = uppercaseInput.replace(/[^0-9]/g, '');

  const originalInput = supported ? rawInput : null;

  return Object.freeze({
    originalInput,
    stringInput,
    trimmedInput,
    uppercaseInput,
    compactInput,
    alphanumericInput,
    digitsOnly,
    inputLength: trimmedInput.length,
    compactLength: alphanumericInput.length,
    hasLetters: /[A-Z]/.test(alphanumericInput),
    hasDigits: /[0-9]/.test(alphanumericInput),
    isEmpty: alphanumericInput.length === 0,
  });
}

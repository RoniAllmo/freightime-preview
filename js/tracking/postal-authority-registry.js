/**
 * Issuing postal-administration identification for the FreighTime
 * Single-input tracking router (UPU S10 / EMS).
 *
 * Responsibility: given a structurally- and check-digit-valid UPU S10
 * identifier's final two-letter country suffix, identify the issuing
 * country (and, for a smaller set of countries, the recognized national
 * postal operator name) from a local, deterministic table -- purely as
 * contextual information alongside the existing official EMS
 * continuation action, never as a new tracking destination.
 *
 * The UPU S10 standard's final two letters are the issuing postal
 * administration's ISO 3166-1 alpha-2 country code -- this is a fixed,
 * unambiguous, globally standardized identifier, unlike a carrier or
 * airline attribution. This module still never overreaches beyond what
 * that code actually establishes: it never claims the destination
 * country (an item can be issued in one country and addressed to
 * another), never claims the current last-mile operator, and never
 * claims the issuing administration still controls or is tracking the
 * item -- the suffix identifies where the tracking number was *issued*,
 * nothing about the item's current custody or route.
 *
 * This module adds no new official tracking destination. The existing
 * single EMS continuation action (`carrier-registry.js`'s `'ems'`
 * record, rendered by `official-routing.js`) remains exactly as-is;
 * `decidePostalAuthorityContext` below only supplies contextual country/
 * authority information to display alongside it.
 *
 * Only a representative set of ISO 3166-1 alpha-2 codes is populated
 * (major trading/logistics nations) -- an unmapped code honestly reports
 * `routingConfidence: 'none'` rather than a guess. Performs no DOM
 * access, no network request, no browser storage access, and no
 * logging. The tracking number itself is never sent anywhere; only the
 * already-normalized two-letter suffix is ever inspected, and only in
 * memory.
 */

/**
 * ISO 3166-1 alpha-2 country code to country name, for a representative
 * set of major trading/logistics nations. `postalAuthorityName` is
 * included only where the current national postal operator's name is
 * confidently known; otherwise it is `null` (country identification is
 * still shown, per rule 57, without an unverified operator name).
 *
 * @type {Readonly<Object<string, Readonly<{countryName: string, postalAuthorityName: string|null}>>>}
 */
export const POSTAL_AUTHORITY_REGISTRY = Object.freeze({
  IL: Object.freeze({ countryName: 'ישראל', postalAuthorityName: 'דואר ישראל' }),
  US: Object.freeze({ countryName: 'ארצות הברית', postalAuthorityName: 'USPS' }),
  GB: Object.freeze({ countryName: 'בריטניה', postalAuthorityName: 'Royal Mail' }),
  DE: Object.freeze({ countryName: 'גרמניה', postalAuthorityName: 'Deutsche Post' }),
  FR: Object.freeze({ countryName: 'צרפת', postalAuthorityName: 'La Poste' }),
  CN: Object.freeze({ countryName: 'סין', postalAuthorityName: 'China Post' }),
  JP: Object.freeze({ countryName: 'יפן', postalAuthorityName: 'Japan Post' }),
  CA: Object.freeze({ countryName: 'קנדה', postalAuthorityName: 'Canada Post' }),
  AU: Object.freeze({ countryName: 'אוסטרליה', postalAuthorityName: 'Australia Post' }),
  IT: Object.freeze({ countryName: 'איטליה', postalAuthorityName: 'Poste Italiane' }),
  ES: Object.freeze({ countryName: 'ספרד', postalAuthorityName: 'Correos' }),
  NL: Object.freeze({ countryName: 'הולנד', postalAuthorityName: 'PostNL' }),
  BE: Object.freeze({ countryName: 'בלגיה', postalAuthorityName: 'bpost' }),
  CH: Object.freeze({ countryName: 'שווייץ', postalAuthorityName: 'Swiss Post' }),
  TR: Object.freeze({ countryName: 'טורקיה', postalAuthorityName: 'PTT' }),
  IN: Object.freeze({ countryName: 'הודו', postalAuthorityName: 'India Post' }),
  KR: Object.freeze({ countryName: 'דרום קוריאה', postalAuthorityName: 'Korea Post' }),
  SG: Object.freeze({ countryName: 'סינגפור', postalAuthorityName: 'SingPost' }),
  HK: Object.freeze({ countryName: 'הונג קונג', postalAuthorityName: 'Hongkong Post' }),
  AE: Object.freeze({ countryName: 'איחוד האמירויות', postalAuthorityName: 'Emirates Post' }),
  BR: Object.freeze({ countryName: 'ברזיל', postalAuthorityName: null }),
  MX: Object.freeze({ countryName: 'מקסיקו', postalAuthorityName: null }),
  ZA: Object.freeze({ countryName: 'דרום אפריקה', postalAuthorityName: null }),
  PL: Object.freeze({ countryName: 'פולין', postalAuthorityName: null }),
  SE: Object.freeze({ countryName: 'שוודיה', postalAuthorityName: null }),
  AT: Object.freeze({ countryName: 'אוסטריה', postalAuthorityName: null }),
  IE: Object.freeze({ countryName: 'אירלנד', postalAuthorityName: null }),
  PT: Object.freeze({ countryName: 'פורטוגל', postalAuthorityName: null }),
  GR: Object.freeze({ countryName: 'יוון', postalAuthorityName: null }),
  CZ: Object.freeze({ countryName: 'צ׳כיה', postalAuthorityName: null }),
  RO: Object.freeze({ countryName: 'רומניה', postalAuthorityName: null }),
  TH: Object.freeze({ countryName: 'תאילנד', postalAuthorityName: null }),
  VN: Object.freeze({ countryName: 'וייטנאם', postalAuthorityName: null }),
  ID: Object.freeze({ countryName: 'אינדונזיה', postalAuthorityName: null }),
  PH: Object.freeze({ countryName: 'הפיליפינים', postalAuthorityName: null }),
  NZ: Object.freeze({ countryName: 'ניו זילנד', postalAuthorityName: null }),
});

const SOURCE_NAME = 'תקן ISO 3166-1 alpha-2 (קידומת מדינת הנפקה לפי תקן UPU S10)';
const LIMITATION_KNOWN =
  'מדינת ההנפקה מזוהה לפי קוד ה-S10. אין בכך אישור למדינת היעד, לגורם המחלק בפועל, או להמשך מעורבות רשות הדואר המנפיקה.';
const LIMITATION_UNKNOWN =
  'קוד מדינת ההנפקה אינו מזוהה עדיין במאגר המאומת של FreighTime.';

function buildUnknownAuthority(countryCode) {
  return Object.freeze({
    countryCode: typeof countryCode === 'string' ? countryCode.toUpperCase() : null,
    issuingCountryName: null,
    postalAuthorityName: null,
    officialTrackingDestinationId: null,
    routingConfidence: 'none',
    sourceName: null,
    limitation: LIMITATION_UNKNOWN,
  });
}

/**
 * Identify the issuing country (and, when known, national postal
 * authority) for a two-letter S10 country suffix.
 *
 * Never assumes the destination country (rule 53), never assumes the
 * last-mile operator (rule 54), and never claims the issuing
 * administration still controls the item (rule 55).
 *
 * @param {*} countryCode - The two-letter S10 country suffix, or any
 *   other value (handled safely).
 * @param {Readonly<object>} [registry] - Defaults to the real verified
 *   registry; a caller (tests only) may inject an alternate registry.
 * @returns {Readonly<{
 *   countryCode: string|null,
 *   issuingCountryName: string|null,
 *   postalAuthorityName: string|null,
 *   officialTrackingDestinationId: null,
 *   routingConfidence: 'high'|'none',
 *   sourceName: string|null,
 *   limitation: string,
 * }>}
 */
export function identifyPostalAuthority(countryCode, registry = POSTAL_AUTHORITY_REGISTRY) {
  if (typeof countryCode !== 'string' || !/^[A-Za-z]{2}$/.test(countryCode)) {
    return buildUnknownAuthority(countryCode);
  }
  const normalizedCode = countryCode.toUpperCase();
  const entry = registry && typeof registry === 'object' ? registry[normalizedCode] : undefined;
  if (!entry) {
    return buildUnknownAuthority(normalizedCode);
  }
  return Object.freeze({
    countryCode: normalizedCode,
    issuingCountryName: entry.countryName,
    postalAuthorityName: entry.postalAuthorityName ?? null,
    // No new official destination is ever added by this module -- the
    // existing single EMS continuation action is unaffected (rule 56).
    officialTrackingDestinationId: null,
    routingConfidence: 'high',
    sourceName: SOURCE_NAME,
    limitation: LIMITATION_KNOWN,
  });
}

function isRouterResultShaped(routerResult) {
  if (routerResult === null || typeof routerResult !== 'object' || Array.isArray(routerResult)) {
    return false;
  }
  return (
    typeof routerResult.status === 'string' &&
    typeof routerResult.identifierType === 'string' &&
    typeof routerResult.normalizedIdentifier === 'string'
  );
}

function buildUnavailableContext() {
  return Object.freeze({ available: false, authorityInfo: null });
}

/**
 * Decide the issuing postal-authority context for an existing router
 * result.
 *
 * Only produces a result for `identifierType: 'international-postal'`,
 * `status: 'recognized-valid'` -- applies equally to EMS and generic S10
 * results (rules 56-57), since the country suffix's meaning does not
 * depend on the EMS/generic distinction. The suffix is extracted from
 * the final two characters of `normalizedIdentifier` only after
 * structure and check-digit validation have already succeeded. Every
 * other case safely returns an unavailable context.
 *
 * Performs no DOM access, no network request, no navigation, and no
 * logging. Never mutates `routerResult`.
 *
 * @param {*} routerResult - An existing router result from
 *   `routeTrackingInput` (router.js), or any other value (handled safely).
 * @returns {Readonly<{available: boolean, authorityInfo: object|null}>}
 */
export function decidePostalAuthorityContext(routerResult) {
  if (!isRouterResultShaped(routerResult)) {
    return buildUnavailableContext();
  }
  if (routerResult.identifierType !== 'international-postal' || routerResult.status !== 'recognized-valid') {
    return buildUnavailableContext();
  }
  if (routerResult.normalizedIdentifier.length < 2) {
    return buildUnavailableContext();
  }

  const countryCode = routerResult.normalizedIdentifier.slice(-2);
  const authorityInfo = identifyPostalAuthority(countryCode);

  return Object.freeze({ available: true, authorityInfo });
}

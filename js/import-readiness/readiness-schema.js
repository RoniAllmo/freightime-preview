/**
 * Field IDs, enumerated option values, and category constants for
 * FreighTime Import Readiness Check V1.
 *
 * This module holds no logic -- it is the single source of truth for
 * field identifiers so the controller (DOM), the normalizer, and every
 * rule module agree on the same names without duplicating string
 * literals. Nothing here reads or writes the DOM, the network, or
 * storage.
 */

export const YES_NO_UNKNOWN = Object.freeze(['yes', 'no', 'unknown']);

export const END_USER_OPTIONS = Object.freeze(['consumer', 'industrial', 'professional', 'unknown']);

export const INCOTERM_OPTIONS = Object.freeze([
  'EXW', 'FCA', 'FOB', 'CIF', 'CFR', 'CPT', 'CIP', 'DAP', 'DDP', 'other', 'unknown',
]);

export const SHIPMENT_MODE_OPTIONS = Object.freeze(['air', 'sea', 'courier', 'postal', 'unknown']);

/** Composition/product-flag fields, each a YES_NO_UNKNOWN value. */
export const PRODUCT_FLAG_FIELDS = Object.freeze([
  'isElectrical',
  'hasBattery',
  'isWireless',
  'isFoodContact',
  'isMedicalOrHealth',
  'isCosmeticOrPersonalCare',
  'isChildrenOrToy',
  'isAutomotiveOrTransport',
  'isAgricultureOrFood',
  'isChemicalOrHazardous',
]);

/** Core document checklist item IDs, always assessed. */
export const CORE_DOCUMENT_IDS = Object.freeze([
  'commercialInvoice',
  'packingList',
  'transportDocument',
  'technicalDescription',
]);

/** Conditional document checklist item IDs, assessed only when relevant flags trigger them. */
export const CONDITIONAL_DOCUMENT_IDS = Object.freeze([
  'certificateOfOrigin',
  'technicalDatasheet',
  'catalog',
  'productPhotos',
  'supplierDeclaration',
  'testReport',
  'msds',
  'un383',
  'conformityDeclaration',
  'importPermit',
  'standardsDocumentation',
  'hebrewLabel',
  'insuranceDocument',
])
;

export const DOCUMENT_STATUS = Object.freeze({
  AVAILABLE: 'available',
  MISSING: 'missing',
  MAY_BE_REQUIRED: 'may_be_required',
  VERIFY_APPLICABILITY: 'verify_applicability',
  NOT_INDICATED: 'not_indicated',
});

export const RISK_SEVERITY = Object.freeze({
  INFORMATION: 'information',
  ATTENTION: 'attention',
  HIGH: 'high',
});

export const READINESS_LEVEL = Object.freeze({
  HIGH: 'high',
  PARTIAL: 'partial',
  LOW: 'low',
});

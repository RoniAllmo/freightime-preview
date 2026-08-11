/**
 * Input normalization for FreighTime Import Readiness Check V1.
 *
 * Takes a raw form-state object (whatever shape the controller collects
 * from the DOM) and returns a frozen, safely-typed normalized object.
 * Never throws on malformed input -- every field safely defaults to an
 * empty string, `false`, or `'unknown'` rather than crashing. Performs
 * no DOM access, no network, no storage.
 */

import {
  YES_NO_UNKNOWN,
  END_USER_OPTIONS,
  INCOTERM_OPTIONS,
  SHIPMENT_MODE_OPTIONS,
  PRODUCT_FLAG_FIELDS,
} from './readiness-schema.js';

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEnum(value, allowed, fallback) {
  return typeof value === 'string' && allowed.includes(value) ? value : fallback;
}

function normalizeYesNoUnknown(value) {
  return normalizeEnum(value, YES_NO_UNKNOWN, 'unknown');
}

function normalizeBoolean(value) {
  return value === true;
}

function normalizeNumberString(value) {
  const trimmed = normalizeString(value);
  if (trimmed.length === 0) return '';
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? trimmed : '';
}

/**
 * Normalize raw Import Readiness form state.
 *
 * @param {*} raw - Raw form-state object, or any other value (handled safely).
 * @returns {Readonly<object>} A frozen, fully-typed normalized input.
 */
export function normalizeReadinessInput(raw) {
  const source = raw !== null && typeof raw === 'object' ? raw : {};

  const productFlags = {};
  for (const field of PRODUCT_FLAG_FIELDS) {
    productFlags[field] = normalizeYesNoUnknown(source[field]);
  }

  return Object.freeze({
    // Product identity
    productName: normalizeString(source.productName),
    commercialDescription: normalizeString(source.commercialDescription),
    intendedUse: normalizeString(source.intendedUse),
    endUser: normalizeEnum(source.endUser, END_USER_OPTIONS, 'unknown'),

    // Composition
    primaryMaterial: normalizeString(source.primaryMaterial),
    additionalMaterials: normalizeString(source.additionalMaterials),
    compositionDetails: normalizeString(source.compositionDetails),
    ...productFlags,

    // Conditional: electrical
    voltage: normalizeString(source.voltage),
    frequency: normalizeString(source.frequency),
    power: normalizeString(source.power),
    plugType: normalizeString(source.plugType),
    intendedEnvironment: normalizeString(source.intendedEnvironment),
    hasConformityDocumentation: normalizeYesNoUnknown(source.hasConformityDocumentation),

    // Conditional: battery
    batteryChemistry: normalizeString(source.batteryChemistry),
    batteryInstalledOrSeparate: normalizeEnum(
      source.batteryInstalledOrSeparate,
      ['installed', 'separate', 'unknown'],
      'unknown',
    ),
    batteryCapacity: normalizeString(source.batteryCapacity),
    hasUn383: normalizeYesNoUnknown(source.hasUn383),
    hasMsds: normalizeYesNoUnknown(source.hasMsds),

    // Conditional: wireless
    wirelessTechnology: normalizeString(source.wirelessTechnology),
    wirelessFrequency: normalizeString(source.wirelessFrequency),
    wirelessDirection: normalizeEnum(
      source.wirelessDirection,
      ['transmitting', 'receiving', 'both', 'unknown'],
      'unknown',
    ),
    hasCommunicationsDocumentation: normalizeYesNoUnknown(source.hasCommunicationsDocumentation),

    // Conditional: food-contact
    foodContactMaterial: normalizeString(source.foodContactMaterial),
    foodType: normalizeString(source.foodType),
    foodContactTemperature: normalizeString(source.foodContactTemperature),
    foodContactUse: normalizeEnum(source.foodContactUse, ['single-use', 'repeated-use', 'unknown'], 'unknown'),
    hasFoodComplianceDocumentation: normalizeYesNoUnknown(source.hasFoodComplianceDocumentation),

    // Commercial details
    countryOfOrigin: normalizeString(source.countryOfOrigin),
    supplierCountry: normalizeString(source.supplierCountry),
    quantity: normalizeNumberString(source.quantity),
    invoiceValue: normalizeNumberString(source.invoiceValue),
    currency: normalizeString(source.currency),
    quantityType: normalizeEnum(source.quantityType, ['sample', 'commercial', 'unknown'], 'unknown'),
    incoterm: normalizeEnum(source.incoterm, INCOTERM_OPTIONS, 'unknown'),
    shipmentMode: normalizeEnum(source.shipmentMode, SHIPMENT_MODE_OPTIONS, 'unknown'),

    // Classification context
    hsCodeKnown: source.hsCodeKnown === true,
    hsCode: normalizeString(source.hsCode),
    supplierProvidedHsCode: normalizeYesNoUnknown(source.supplierProvidedHsCode),
    technicalCatalogAvailable: normalizeBoolean(source.technicalCatalogAvailable),
    productPhotoAvailable: normalizeBoolean(source.productPhotoAvailable),
    modelOrPartNumberAvailable: normalizeBoolean(source.modelOrPartNumberAvailable),

    // Documents on hand
    hasCommercialInvoice: normalizeBoolean(source.hasCommercialInvoice),
    hasPackingList: normalizeBoolean(source.hasPackingList),
    hasTransportDocument: normalizeBoolean(source.hasTransportDocument),
    hasCertificateOfOrigin: normalizeBoolean(source.hasCertificateOfOrigin),
    hasTechnicalDatasheet: normalizeBoolean(source.hasTechnicalDatasheet),
    hasCatalog: normalizeBoolean(source.hasCatalog),
    hasSupplierDeclaration: normalizeBoolean(source.hasSupplierDeclaration),
    hasTestReport: normalizeBoolean(source.hasTestReport),
    hasConformityDocuments: normalizeBoolean(source.hasConformityDocuments),
    hasImportPermit: normalizeBoolean(source.hasImportPermit),
    hasStandardsDocumentation: normalizeBoolean(source.hasStandardsDocumentation),
    hasHebrewLabel: normalizeBoolean(source.hasHebrewLabel),
    hasInsuranceDocument: normalizeBoolean(source.hasInsuranceDocument),
  });
}

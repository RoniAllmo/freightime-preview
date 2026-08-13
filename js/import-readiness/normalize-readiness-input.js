/**
 * Input normalization for FreighTime's scenario-routed Import Readiness
 * experience. Takes a raw form-state object and returns a frozen,
 * safely-typed normalized object. Never throws on malformed input.
 * Performs no DOM access, no network, no storage.
 */

import {
  IMPORT_TYPE, EXPERIENCE, SHIPMENT_METHOD, SENSITIVE_CATEGORY, EXISTING_IMPORTER_FOCUS,
  ESTABLISHED_OPERATION_PURPOSE, SHIPMENT_PROBLEM_TYPE, DAMAGE_DISCOVERY_TIMING, YES_NO_UNKNOWN,
  FINANCIAL_EXPOSURE, CHARGING_PARTY, INSURANCE_SUB_SCENARIO, CARRIER_DISPUTE_STAGE,
} from './scenario-schema.js';

function str(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function bool(value) {
  return value === true;
}

function oneOf(value, allowed, fallback) {
  return typeof value === 'string' && allowed.includes(value) ? value : fallback;
}

/**
 * @param {*} raw - Raw form-state object, or any other value (handled safely).
 * @returns {Readonly<object>} A frozen, fully-typed normalized input.
 */
export function normalizeReadinessInput(raw) {
  const s = raw !== null && typeof raw === 'object' ? raw : {};

  return Object.freeze({
    // Question 1: personal vs. commercial
    importType: oneOf(s.importType, Object.values(IMPORT_TYPE), IMPORT_TYPE.UNCERTAIN),
    forSaleOrDistribution: bool(s.forSaleOrDistribution),
    forBusinessUse: bool(s.forBusinessUse),
    personalOrFamilyUseOnly: bool(s.personalOrFamilyUseOnly),

    // Question 2: import experience
    experience: oneOf(s.experience, Object.values(EXPERIENCE), EXPERIENCE.FIRST_TIME),

    // Question 3: product identity
    productName: str(s.productName),
    commercialDescription: str(s.commercialDescription),
    intendedUse: str(s.intendedUse),
    hasTechnicalSpec: bool(s.hasTechnicalSpec),
    hasCatalogOrProductPage: bool(s.hasCatalogOrProductPage),
    hasPhotos: bool(s.hasPhotos),
    hasSupplierInvoice: bool(s.hasSupplierInvoice),
    hasSupplierProvidedHsCode: bool(s.hasSupplierProvidedHsCode),

    // Classification context (shared across scenarios)
    hsCodeKnown: s.hsCodeKnown === true,
    hsCode: str(s.hsCode),

    // Personal-import scenario
    quantity: str(s.quantity),
    approxValue: str(s.approxValue),
    countryOfOrigin: str(s.countryOfOrigin),
    shipmentMethod: oneOf(s.shipmentMethod, SHIPMENT_METHOD, 'unknown'),
    sensitiveCategory: oneOf(s.sensitiveCategory, SENSITIVE_CATEGORY, 'not_sure'),

    // Existing-importer scenario
    focusArea: oneOf(s.focusArea, EXISTING_IMPORTER_FOCUS, 'other'),

    // Established-operation scenario
    auditPurpose: oneOf(s.auditPurpose, ESTABLISHED_OPERATION_PURPOSE, 'other'),

    // Shipment-problem scenario
    problemType: oneOf(s.problemType, SHIPMENT_PROBLEM_TYPE, 'other'),
    shipmentMode: oneOf(s.shipmentMode, SHIPMENT_METHOD, 'unknown'),
    currentStage: str(s.currentStage),
    issuingParty: str(s.issuingParty),
    deadline: str(s.deadline),
    missingDocumentsNote: str(s.missingDocumentsNote),
    hasWrittenNotice: bool(s.hasWrittenNotice),
    accumulatingCosts: bool(s.accumulatingCosts),

    // Cargo/container damage and shortage/loss follow-ups (family F/G)
    damageDiscoveryTiming: oneOf(s.damageDiscoveryTiming, DAMAGE_DISCOVERY_TIMING, 'unknown'),
    hasInsurance: oneOf(s.hasInsurance, YES_NO_UNKNOWN, 'unknown'),
    hasPhotosOfDamage: bool(s.hasPhotosOfDamage),
    safetyRisk: bool(s.safetyRisk),

    // Customs classification-dispute / penalty follow-ups (family B/E)
    financialExposure: oneOf(s.financialExposure, FINANCIAL_EXPOSURE, 'unknown'),
    goodsHeld: bool(s.goodsHeld),

    // Storage / demurrage / detention follow-ups (family H)
    chargingParty: oneOf(s.chargingParty, CHARGING_PARTY, 'unknown'),
    customsClearanceInvolved: bool(s.customsClearanceInvolved),

    // Insurance follow-ups (family J)
    insuranceSubScenario: oneOf(s.insuranceSubScenario, INSURANCE_SUB_SCENARIO, 'notification_of_loss'),

    // Carrier/forwarder/terminal dispute follow-ups (family I)
    disputeStage: oneOf(s.disputeStage, CARRIER_DISPUTE_STAGE, 'operational_issue'),
  });
}

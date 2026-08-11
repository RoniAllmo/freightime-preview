/**
 * Field IDs, scenario keys, and enumerated option constants for
 * FreighTime's scenario-routed Import Readiness experience.
 *
 * This module holds no logic -- it is the single source of truth for
 * identifiers so the controller (DOM) and every routing/rule module
 * agree on the same names without duplicating string literals.
 */

export const IMPORT_TYPE = Object.freeze({
  PERSONAL: 'personal',
  COMMERCIAL: 'commercial',
  UNCERTAIN: 'uncertain',
});

export const EXPERIENCE = Object.freeze({
  FIRST_TIME: 'first_time',
  PRIOR_IMPORTER: 'prior_importer',
  ONGOING_OPERATION: 'ongoing_operation',
  PLANNING_ONLY: 'planning_only',
});

export const SCENARIO = Object.freeze({
  PERSONAL: 'personal',
  FIRST_COMMERCIAL: 'first_commercial',
  EXISTING_IMPORTER: 'existing_importer',
  ESTABLISHED_OPERATION: 'established_operation',
  SHIPMENT_PROBLEM: 'shipment_problem',
});

export const SHIPMENT_METHOD = Object.freeze(['postal', 'courier', 'air', 'sea', 'unknown']);

export const SENSITIVE_CATEGORY = Object.freeze([
  'food',
  'cosmetics',
  'health_or_medical',
  'communications_or_wireless',
  'vehicle_or_transport',
  'agriculture',
  'chemical_or_hazardous',
  'electrical',
  'battery',
  'toy_or_childrens',
  'none_known',
  'not_sure',
]);

export const EXISTING_IMPORTER_FOCUS = Object.freeze([
  'new_product',
  'new_supplier',
  'customs_classification',
  'regulation_and_permits',
  'supplier_documents',
  'taxes_and_costs',
  'incoterms',
  'sea_or_air_shipping',
  'clearance_delay',
  'additional_charges',
  'other',
]);

export const ESTABLISHED_OPERATION_PURPOSE = Object.freeze([
  'existing_classifications_audit',
  'regulation_and_permits_audit',
  'document_process_audit',
  'penalty_or_shortfall_exposure',
  'storage_demurrage_charges',
  'sale_terms_review',
  'insurance_coverage_review',
  'supplier_process_review',
  'brokerage_and_clearance_process',
  'legal_advice',
  'other',
]);

export const SHIPMENT_PROBLEM_TYPE = Object.freeze([
  'missing_document',
  'missing_import_permit',
  'customs_inspection',
  'classification_dispute',
  'value_dispute',
  'clearance_delay',
  'storage',
  'demurrage',
  'detention',
  'penalty_or_additional_charge',
  'supplier_not_responding',
  'carrier_not_responding',
  'other',
]);

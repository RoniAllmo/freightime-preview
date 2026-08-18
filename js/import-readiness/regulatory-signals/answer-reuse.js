/**
 * Answer-reuse adapter for the live regulatory focused-checks phase.
 *
 * PURPOSE: eliminate duplicate questions where the focused-checks phase
 * would otherwise re-ask a concept the core product-details layers
 * (layered-question-model.js / normalize-readiness-input.js) already
 * collected via a reliable structured (not free-text) answer.
 *
 * HARD BOUNDARY: this module never changes a rule's trigger or
 * exclusion predicate, never invents a value the user did not actually
 * provide through a structured control, and never answers a question
 * more specifically than the reused source answer actually supports.
 * It only ever pre-fills the SAME regulatory-answer map entry a live
 * question would otherwise have written, using the exact same
 * ANSWER.YES / ANSWER.NO / ANSWER.UNKNOWN vocabulary
 * (questions.js/ANSWER) -- the scheduler (question-scheduler.js) then
 * naturally skips any question id already present in that map, exactly
 * as it already does for a question the user answered live. Downstream
 * trigger/exclusion predicates in rules-registry.js are completely
 * unaware of and unmodified by this module.
 *
 * Pure, deterministic, DOM-free, network-free, storage-free.
 */

import { ANSWER } from './questions.js';

const YES_NO_UNKNOWN = Object.freeze([ANSWER.YES, ANSWER.NO, ANSWER.UNKNOWN]);

function reusableYesNoUnknown(value) {
  return YES_NO_UNKNOWN.includes(value) ? value : undefined;
}

/** Direct-contact-material options that a single, unambiguous core MATERIAL selection can confidently answer. */
const MATERIAL_TO_DIRECT_CONTACT_MATERIAL = Object.freeze({
  plastic_or_polymer: 'plastic',
  glass: 'glass',
  metal: 'metal',
  paper_or_cardboard: 'paper_or_cardboard',
});

/** Coating-material options a single, unambiguous core MATERIAL selection can confidently answer. */
const MATERIAL_TO_COATING_MATERIAL = Object.freeze({
  plastic_or_polymer: 'plastic_or_polymer',
});

/**
 * Given the raw (pre-normalized, string-valued) product-details form
 * state already collected earlier in the journey, derive whichever
 * regulatory follow-up answers are already reliably known -- so the
 * live focused-checks phase never re-asks the exact same concept.
 *
 * Each mapping below corresponds to a concrete, already-collected
 * structured field asking the SAME concept as a regulatory follow-up
 * question:
 *  - connectsToPower ("המוצר מתחבר ישירות לחשמל")
 *      -> mainsConnectedOrSuppliedAdapter ("מתחבר ישירות לרשת החשמל או
 *         מגיע עם תקע או ספק כוח")
 *  - materialTouchesFood ("המוצר בא במגע ישיר עם מזון או משקה")
 *      -> directFoodOrDrinkContact / glassVesselDirectFoodOrDrinkContact
 *         (both ask the identical "direct food/drink contact" concept
 *         about the whole product, just from two different rules)
 *  - materialHasCoating ("יש ציפוי או שכבת עיבוד על המוצר")
 *      -> hasInternalCoating ("יש למוצר ציפוי פנימי או שכבת פלסטיק")
 *
 * A single, unambiguous MATERIAL selection additionally answers the
 * material-identity follow-ups (directContactMaterial / coatingMaterial)
 * when it maps cleanly onto one of their closed-choice options -- never
 * derived from free text, and never when more than one material was
 * selected (an ambiguous multi-material selection is left for the live
 * question, exactly as before).
 *
 * @param {{
 *   connectsToPower?: string, materialTouchesFood?: string,
 *   materialHasCoating?: string, materials?: string[],
 * }} raw
 * @returns {Record<string, string>} a plain object of qId -> ANSWER.*
 *   value, containing only entries that could be confidently derived --
 *   never a partial/placeholder guess.
 */
export function deriveReusableRegulatoryAnswers(raw) {
  const r = raw !== null && typeof raw === 'object' ? raw : {};
  const derived = {};

  const power = reusableYesNoUnknown(r.connectsToPower);
  if (power !== undefined) derived.mainsConnectedOrSuppliedAdapter = power;

  const foodContact = reusableYesNoUnknown(r.materialTouchesFood);
  if (foodContact !== undefined) {
    derived.directFoodOrDrinkContact = foodContact;
    derived.glassVesselDirectFoodOrDrinkContact = foodContact;
  }

  const coating = reusableYesNoUnknown(r.materialHasCoating);
  if (coating !== undefined) derived.hasInternalCoating = coating;

  const materials = Array.isArray(r.materials) ? r.materials : [];
  if (materials.length === 1) {
    const [onlyMaterial] = materials;
    const directContactMaterial = MATERIAL_TO_DIRECT_CONTACT_MATERIAL[onlyMaterial];
    if (directContactMaterial !== undefined) derived.directContactMaterial = directContactMaterial;
    const coatingMaterial = MATERIAL_TO_COATING_MATERIAL[onlyMaterial];
    if (coatingMaterial !== undefined) derived.coatingMaterial = coatingMaterial;
  }

  return derived;
}

/**
 * Merge derived (reused) answers under any already-present live answers
 * -- an explicit answer the user actually gave through the focused-check
 * phase itself always wins over a derived default, and a derived
 * default only ever fills a gap, never overwrites a live answer.
 *
 * @param {Record<string,string>} existingAnswers
 * @param {Record<string,string>} derivedAnswers
 * @returns {Record<string,string>} a new object -- never mutates either input
 */
export function mergeReusedAnswers(existingAnswers, derivedAnswers) {
  const existing = existingAnswers !== null && typeof existingAnswers === 'object' ? existingAnswers : {};
  const derived = derivedAnswers !== null && typeof derivedAnswers === 'object' ? derivedAnswers : {};
  return { ...derived, ...existing };
}

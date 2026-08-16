import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { REGULATORY_SIGNAL_RULES } from '../../js/import-readiness/regulatory-signals/rules-registry.js';
import { RULE_STATUS, isPubliclyEligible } from '../../js/import-readiness/regulatory-signals/rule-status.js';
import { evaluateRegulatorySignals } from '../../js/import-readiness/regulatory-signals/index.js';
import { matchRegulatorySignals } from '../../js/import-readiness/regulatory-signals/matcher.js';

// THIS IS THE SAFETY-BOUNDARY TEST FOR THE QUESTIONNAIRE-ARCHITECTURE
// UPGRADE. It exists at this top-level path (not nested under
// regulatory-signals/) specifically so it is picked up by the CI glob
// in .github/workflows/frontend-ci.yml, which does not recurse into
// subdirectories. It must never be deleted, weakened, or moved out of
// CI's reach.
//
// The 5 candidate categories (electrical, plastic-food-contact,
// polymer-coating-food-contact, glass-food-contact, vehicle) MUST stay
// exactly as they already were before this architecture upgrade:
// disabled (professional_review_required), untouched, and producing
// zero public output no matter what new questionnaire-layer data is
// collected.

const EXPECTED_IDS = ['RS-ELEC-001', 'RS-PLASTIC-FOOD-001', 'RS-POLYMER-COATING-001', 'RS-GLASS-FOOD-001', 'RS-VEHICLE-001'];

// Byte-for-byte content hash of rules-registry.js as it existed on
// main (commit 6932484b7707b8ea54fd83c7131fa2dc54a5e6b8) BEFORE this
// architecture upgrade branch touched anything. If this hash ever
// changes, the file was edited -- which this task explicitly forbids.
const EXPECTED_REGISTRY_SHA256 = '37484ed761cd72b3ad86a9855c8efd796b1208baef7cba99a8a881bfd991d157';

test('1. the registry still has exactly 5 candidates, with the same 5 ids as before this upgrade', () => {
  assert.equal(REGULATORY_SIGNAL_RULES.length, 5);
  assert.deepEqual(REGULATORY_SIGNAL_RULES.map((r) => r.id).sort(), [...EXPECTED_IDS].sort());
});

test('2. every candidate remains exactly professional_review_required -- never approved_for_pilot, never any other status', () => {
  for (const rule of REGULATORY_SIGNAL_RULES) {
    assert.equal(rule.status, RULE_STATUS.PROFESSIONAL_REVIEW_REQUIRED, `${rule.id} status must stay professional_review_required`);
  }
});

test('3. every candidate therefore still fails the hard publication gate', () => {
  for (const rule of REGULATORY_SIGNAL_RULES) {
    assert.equal(isPubliclyEligible(rule), false, `${rule.id} must not clear the gate`);
  }
});

test('4. rules-registry.js is byte-for-byte unchanged from before this architecture upgrade', () => {
  const path = fileURLToPath(new URL('../../js/import-readiness/regulatory-signals/rules-registry.js', import.meta.url));
  const content = readFileSync(path, 'utf8');
  const hash = createHash('sha256').update(content).digest('hex');
  assert.equal(hash, EXPECTED_REGISTRY_SHA256, 'rules-registry.js must stay byte-for-byte identical -- this task never edits rule content/status');
});

test('5. no candidate produces a signal card through the real matcher, for any hinted category combination', () => {
  const allCategories = new Set(REGULATORY_SIGNAL_RULES.map((r) => r.internalCategory));
  const result = matchRegulatorySignals({
    answers: {
      mainsConnected: 'yes',
      plasticDirectFoodContact: 'yes',
      polymerCoatingDirectFoodContact: 'yes',
      glassDirectFoodOrDrinkContact: 'yes',
      vehicleInstallationOrUse: 'yes',
    },
  }, allCategories, REGULATORY_SIGNAL_RULES);
  assert.equal(result.signals.length, 0, 'no rule should ever produce a public signal while all 5 stay disabled');
});

test('6. the public evaluateRegulatorySignals() entry point never surfaces a signal for any product-name/description hint', () => {
  const hints = [
    'מוצר חשמלי המתחבר לחשמל', 'קופסת פלסטיק לאחסון מזון', 'מצופה פוליmer למגע עם מזון',
    'כוס זכוכית להגשת מזון', 'חלק רכב', 'רכיב חשמלי לרכב',
  ];
  for (const hint of hints) {
    const evaluation = evaluateRegulatorySignals({ productName: hint, commercialDescription: hint });
    if (evaluation !== null) {
      assert.equal(evaluation.signals.length, 0, `"${hint}" must not produce a public signal`);
    }
  }
});

test('7. no new questionnaire-architecture module imports or re-exports an approved_for_pilot-eligible rule set of its own', async () => {
  const layered = await import('../../js/import-readiness/layered-question-model.js');
  const brief = await import('../../js/import-readiness/result-brief.js');
  const docs = await import('../../js/import-readiness/document-readiness.js');
  const multiSignal = await import('../../js/import-readiness/multi-signal-presentation.js');
  for (const mod of [layered, brief, docs, multiSignal]) {
    assert.ok(!('REGULATORY_SIGNAL_RULES' in mod), 'new architecture modules must not re-export or shadow the rule registry');
  }
});

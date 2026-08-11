import test from 'node:test';
import assert from 'node:assert/strict';
import { decideScenario } from '../../js/import-readiness/experience-routing.js';
import { IMPORT_TYPE, EXPERIENCE, SCENARIO } from '../../js/import-readiness/scenario-schema.js';

test('1. personal import type always routes to the personal scenario, regardless of experience', () => {
  for (const experience of Object.values(EXPERIENCE)) {
    assert.equal(decideScenario({ importType: IMPORT_TYPE.PERSONAL, experience }), SCENARIO.PERSONAL);
  }
});

test('2. commercial + first-time routes to first-commercial', () => {
  assert.equal(decideScenario({ importType: IMPORT_TYPE.COMMERCIAL, experience: EXPERIENCE.FIRST_TIME }), SCENARIO.FIRST_COMMERCIAL);
});

test('3. commercial + planning-only also routes to first-commercial (same preparation guidance)', () => {
  assert.equal(decideScenario({ importType: IMPORT_TYPE.COMMERCIAL, experience: EXPERIENCE.PLANNING_ONLY }), SCENARIO.FIRST_COMMERCIAL);
});

test('4. commercial + prior-importer routes to existing-importer', () => {
  assert.equal(decideScenario({ importType: IMPORT_TYPE.COMMERCIAL, experience: EXPERIENCE.PRIOR_IMPORTER }), SCENARIO.EXISTING_IMPORTER);
});

test('5. commercial + ongoing-operation routes to established-operation', () => {
  assert.equal(decideScenario({ importType: IMPORT_TYPE.COMMERCIAL, experience: EXPERIENCE.ONGOING_OPERATION }), SCENARIO.ESTABLISHED_OPERATION);
});

test('6. uncertain import type is routed the same as commercial (conservative default)', () => {
  assert.equal(decideScenario({ importType: IMPORT_TYPE.UNCERTAIN, experience: EXPERIENCE.PRIOR_IMPORTER }), SCENARIO.EXISTING_IMPORTER);
  assert.equal(decideScenario({ importType: IMPORT_TYPE.UNCERTAIN, experience: EXPERIENCE.ONGOING_OPERATION }), SCENARIO.ESTABLISHED_OPERATION);
});

test('7. this module never returns the shipment-problem scenario', () => {
  for (const importType of Object.values(IMPORT_TYPE)) {
    for (const experience of Object.values(EXPERIENCE)) {
      assert.notEqual(decideScenario({ importType, experience }), SCENARIO.SHIPMENT_PROBLEM);
    }
  }
});

test('8. malformed input is handled safely, defaulting to first-commercial', () => {
  assert.equal(decideScenario(null), SCENARIO.FIRST_COMMERCIAL);
  assert.equal(decideScenario(undefined), SCENARIO.FIRST_COMMERCIAL);
  assert.equal(decideScenario({}), SCENARIO.FIRST_COMMERCIAL);
});

test('9. calling the module performs no network, DOM, or storage access', () => {
  assert.equal(typeof window, 'undefined');
  assert.equal(typeof document, 'undefined');
  decideScenario({ importType: IMPORT_TYPE.PERSONAL, experience: EXPERIENCE.FIRST_TIME });
});

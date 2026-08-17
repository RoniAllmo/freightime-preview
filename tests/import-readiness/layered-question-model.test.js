import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LAYER, LAYER_ORDER, PRODUCT_FAMILY, MATERIAL,
  applicableLayers, needsTechnicalCharacteristicsLayer, needsFoodContactMaterialFollowup,
  estimatedStandardRouteQuestionCount, clearIncompatibleAnswers,
} from '../../js/import-readiness/layered-question-model.js';

test('1. all 8 layers are defined, in a stable order', () => {
  assert.equal(LAYER_ORDER.length, 8);
  assert.deepEqual(new Set(LAYER_ORDER), new Set(Object.values(LAYER)));
});

test('2. a simple general product does not pull in the materials or technical layers', () => {
  const layers = applicableLayers({ productFamilies: ['not_sure'], materials: [] });
  assert.ok(!layers.includes(LAYER.MATERIALS));
  assert.ok(!layers.includes(LAYER.TECHNICAL_CHARACTERISTICS));
});

test('3. an electrical-family product pulls in the technical-characteristics layer', () => {
  const layers = applicableLayers({ productFamilies: ['electrical_and_electronics'], materials: [] });
  assert.ok(layers.includes(LAYER.TECHNICAL_CHARACTERISTICS));
});

test('4. a wireless-equipment family also pulls in the technical-characteristics layer', () => {
  assert.equal(needsTechnicalCharacteristicsLayer({ productFamilies: ['wireless_or_transmitting_equipment'] }), true);
});

test('5. a furniture-only family does not need the technical-characteristics layer', () => {
  assert.equal(needsTechnicalCharacteristicsLayer({ productFamilies: ['furniture_and_home_goods'] }), false);
});

test('6. food-contact material follow-up needs BOTH a relevant family AND a relevant material', () => {
  assert.equal(
    needsFoodContactMaterialFollowup({ productFamilies: ['glass_ceramics_and_tableware'], materials: ['glass'] }),
    true,
  );
  assert.equal(
    needsFoodContactMaterialFollowup({ productFamilies: ['glass_ceramics_and_tableware'], materials: ['metal'] }),
    false,
  );
  assert.equal(
    needsFoodContactMaterialFollowup({ productFamilies: ['furniture_and_home_goods'], materials: ['glass'] }),
    false,
  );
});

test('7. a known product family pulls in the materials layer; "not sure" does not', () => {
  const known = applicableLayers({ productFamilies: ['textile_apparel_and_footwear'], materials: [] });
  assert.ok(known.includes(LAYER.MATERIALS));
  const unsure = applicableLayers({ productFamilies: ['not_sure'], materials: [] });
  assert.ok(!unsure.includes(LAYER.MATERIALS));
});

test('8. objective/family/use/documents/shipment/signals layers are always present', () => {
  const layers = applicableLayers({ productFamilies: [], materials: [] });
  assert.ok(layers.includes(LAYER.OBJECTIVE_AND_STAGE));
  assert.ok(layers.includes(LAYER.PRODUCT_FAMILY));
  assert.ok(layers.includes(LAYER.USE_AND_TARGET_USER));
  assert.ok(layers.includes(LAYER.DOCUMENTS_AND_MARKING));
  assert.ok(layers.includes(LAYER.SHIPMENT_AND_COMMERCIAL));
  assert.ok(layers.includes(LAYER.SIGNALS_AND_NEXT_ACTIONS));
});

test('9. the standard route stays within roughly 5-9 questions for a typical simple case', () => {
  const n = estimatedStandardRouteQuestionCount({ productFamilies: ['not_sure'], materials: [] });
  assert.ok(n >= 5 && n <= 9, `expected 5-9, got ${n}`);
});

test('10. a more complex electrical + food-contact-material case still stays in a bounded range (never unbounded)', () => {
  const n = estimatedStandardRouteQuestionCount({
    productFamilies: ['electrical_and_electronics', 'glass_ceramics_and_tableware'],
    materials: ['glass'],
  });
  assert.ok(n >= 5 && n <= 12, `expected a bounded count, got ${n}`);
});

test('11. changing product family away from electrical clears incompatible electrical answers', () => {
  const answers = {
    productFamilies: ['furniture_and_home_goods'],
    materials: [],
    connectsToPower: true,
    hasPlug: true,
    voltage: '220',
    hasBattery: true,
    batteryIsRechargeable: true,
  };
  const cleared = clearIncompatibleAnswers(answers, 'productFamilies');
  assert.equal(cleared.connectsToPower, undefined);
  assert.equal(cleared.hasPlug, undefined);
  assert.equal(cleared.voltage, undefined);
  assert.equal(cleared.hasBattery, undefined);
  assert.equal(cleared.batteryIsRechargeable, undefined);
});

test('12. changing product family to something still electrical-relevant PRESERVES electrical answers', () => {
  const answers = {
    productFamilies: ['electrical_and_electronics'],
    materials: [],
    connectsToPower: true,
    voltage: '220',
  };
  const cleared = clearIncompatibleAnswers(answers, 'productFamilies');
  assert.equal(cleared.connectsToPower, true);
  assert.equal(cleared.voltage, '220');
});

test('13. changing materials away from glass/plastic clears the food-contact follow-up answers', () => {
  const answers = {
    productFamilies: ['glass_ceramics_and_tableware'],
    materials: ['metal'],
    materialTouchesFood: true,
    materialHasCoating: false,
  };
  const cleared = clearIncompatibleAnswers(answers, 'materials');
  assert.equal(cleared.materialTouchesFood, undefined);
  assert.equal(cleared.materialHasCoating, undefined);
});

test('14. compatible answers (shipment/commercial status, documents) are never touched by clearIncompatibleAnswers', () => {
  const answers = {
    productFamilies: ['furniture_and_home_goods'],
    materials: [],
    selectedDocuments: ['supplier_invoice'],
    shipmentMethod: 'sea',
  };
  const cleared = clearIncompatibleAnswers(answers, 'productFamilies');
  assert.deepEqual(cleared.selectedDocuments, ['supplier_invoice']);
  assert.equal(cleared.shipmentMethod, 'sea');
});

test('15. clearIncompatibleAnswers never mutates the input object', () => {
  const answers = Object.freeze({ productFamilies: ['furniture_and_home_goods'], materials: [], connectsToPower: true });
  assert.doesNotThrow(() => clearIncompatibleAnswers(answers, 'productFamilies'));
});

test('16. PRODUCT_FAMILY always includes a "not sure" escape hatch', () => {
  assert.ok(PRODUCT_FAMILY.includes('not_sure'));
});

test('17. PRODUCT_FAMILY supports mixed/multiple product declarations by being a plain array (multi-select ready)', () => {
  assert.ok(Array.isArray(PRODUCT_FAMILY));
  assert.ok(PRODUCT_FAMILY.length >= 19);
});

test('18. MATERIAL includes an "unknown" escape hatch', () => {
  assert.ok(MATERIAL.includes('unknown'));
});

/**
 * PR F (product-owner decisions 4-5, 2026-10-17): tobacco and
 * industrial-chemicals wording no longer repeats the professional
 * referral that the "הצעד הבא" block already makes, and the tobacco
 * note -- which is about commercial import -- shows on commercial
 * routes only.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { familyGuidanceFor, FAMILY_GUIDANCE } from '../../js/import-readiness/product-family-guidance.js';
import { buildProductFamilyMatrixSection } from '../../js/import-readiness/product-family-result.js';
import { IMPORT_TYPE } from '../../js/import-readiness/scenario-schema.js';

const TOBACCO = 'additional-consumer-products-12';
const CHEMICALS = 'chemicals-and-materials-04';
const TOBACCO_HEADLINE = 'לא ניתן לקבוע כיוון בדיקה כללי למוצרי טבק, לסיגריות אלקטרוניות ולמוצרי ניקוטין ללא בדיקה של המוצר המדויק.';
const TOBACCO_NOTE = 'ביבוא מסחרי של מוצרי טבק, סיגריות אלקטרוניות ומוצרי ניקוטין עשויות לחול הגבלות של משרד הבריאות.';
const CHEMICALS_NOTE = 'יש לבדוק את הייעוד המדויק של המוצר ואת הרכב החומר לפני קביעת דרישות היבוא.';

const section = (text, importType) => buildProductFamilyMatrixSection({ texts: [text], importType });

test('1. tobacco headline: shortened to "...ללא בדיקה של המוצר המדויק."', () => {
  assert.equal(familyGuidanceFor(TOBACCO).noPositiveMessage, TOBACCO_HEADLINE);
  for (const importType of [IMPORT_TYPE.COMMERCIAL, IMPORT_TYPE.PERSONAL]) {
    assert.equal(section('סיגריה אלקטרונית', importType).noPositiveSignalMessage, TOBACCO_HEADLINE);
  }
});

test('2. tobacco note: exactly one sentence, the second (referral) sentence removed', () => {
  assert.equal(familyGuidanceFor(TOBACCO).note, TOBACCO_NOTE);
  assert.ok(!TOBACCO_NOTE.includes('גורם מקצועי'));
});

test('3. tobacco note is commercial-only: shown on a commercial route, absent on the personal route', () => {
  assert.equal(familyGuidanceFor(TOBACCO).commercialOnly, true);
  for (const text of ['סיגריה אלקטרונית', 'טבק', 'vape']) {
    const commercial = section(text, IMPORT_TYPE.COMMERCIAL);
    assert.deepEqual(commercial.note, { kind: 'commercial', text: TOBACCO_NOTE }, `${text}: commercial note`);
    const personal = section(text, IMPORT_TYPE.PERSONAL);
    assert.ok(!personal.note || personal.note.text !== TOBACCO_NOTE, `${text}: the commercial note must not show on the personal route`);
    assert.equal(personal.noPositiveSignalMessage, TOBACCO_HEADLINE, `${text}: the personal route still gets the cautious headline`);
  }
});

test('4. commercialOnly is a narrow flag: no other family note is suppressed on the personal route', () => {
  for (const [familyId, guidance] of Object.entries(FAMILY_GUIDANCE)) {
    if (familyId !== TOBACCO) assert.equal(guidance.commercialOnly, undefined, `${familyId} must not be commercial-only`);
  }
});

test('5. industrial chemicals note: the last (referral) sentence removed; the classifier referral is still offered', () => {
  assert.equal(familyGuidanceFor(CHEMICALS).note, CHEMICALS_NOTE);
  const s = section('כימיקל תעשייתי', IMPORT_TYPE.COMMERCIAL);
  assert.equal(s.note.text, CHEMICALS_NOTE);
  assert.deepEqual(s.professional.primary.coveredCategoryIds, ['customs_classifier']);
});

test('6. guard: neither note nor headline names a professional (the "הצעד הבא" block is the one place for WHO)', () => {
  for (const familyId of [TOBACCO, CHEMICALS]) {
    const g = familyGuidanceFor(familyId);
    for (const text of [g.note, g.noPositiveMessage]) {
      for (const name of ['מסווג מכס', 'עמיל מכס', 'גורם מקצועי', 'בדיקה מקצועית', 'מומלץ להתייעץ']) {
        assert.ok(!text.includes(name), `${familyId}: "${name}" in "${text}"`);
      }
    }
  }
});

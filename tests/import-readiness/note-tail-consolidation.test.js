/**
 * Note-tail consolidation (UX audit C5, product-owner decision
 * 2026-10-17). The family guidance notes no longer end with the generic
 * "...להעביר את המפרט המדויק לבדיקה מקצועית לפני השילוח" sentence: the
 * result's next-step panel (professional referral + CTA) says it once
 * for every family. Each note keeps its own content, including its
 * "the exact requirement may vary by ..." caveat.
 *
 * Pure Node, no DOM, no network.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { FAMILY_GUIDANCE, familyGuidanceFor } from '../../js/import-readiness/product-family-guidance.js';
import { buildProductFamilyMatrixSection } from '../../js/import-readiness/product-family-result.js';
import { IMPORT_TYPE } from '../../js/import-readiness/scenario-schema.js';

const TAIL = 'לבדיקה מקצועית לפני השילוח';
const guidanceTexts = () => Object.entries(FAMILY_GUIDANCE).flatMap(([id, g]) => (
  ['note', 'noPositiveMessage'].filter((k) => typeof g[k] === 'string').map((k) => [id, k, g[k]])
));

test('1. no family guidance text carries the generic professional-review tail', () => {
  for (const [id, key, text] of guidanceTexts()) assert.ok(!text.includes(TAIL), `${id}.${key} still has the tail`);
});

test('2. removing the tail left every note well formed: trimmed, single-spaced, ending with a full stop', () => {
  for (const [id, key, text] of guidanceTexts()) {
    assert.equal(text, text.trim(), `${id}.${key} has stray outer whitespace`);
    assert.ok(!/\s{2,}/.test(text), `${id}.${key} has a double space`);
    assert.ok(text.endsWith('.'), `${id}.${key} must end with a full stop`);
  }
});

test('3. the variability caveat stays; only the tail clause is gone', () => {
  assert.equal(
    familyGuidanceFor('electrical-and-electronics-11').note,
    'נדרש לבדוק את מסלול אישור מכון התקנים וגם אישור אנרגיה מקיימת מול משרד האנרגיה. הדרישה המדויקת עשויה להשתנות בהתאם לדגם ולמאפייני המוצר.',
  );
  assert.equal(
    familyGuidanceFor('chemicals-and-materials-02').note,
    'נדרש לבדוק היתר רעלים מול המשרד להגנת הסביבה. הדרישה המדויקת עשויה להשתנות בהתאם להרכב החומר ולשימוש המיועד.',
  );
  assert.equal(
    familyGuidanceFor('textiles-and-furniture-01').note,
    'ביגוד לילדים ובגדי שינה מחייבים בדיקה של מסלול אישור מכון התקנים.',
  );
});

test('4. notes kept by PR C, and their PR F trims: tobacco and industrial chemicals lost their referral sentence (the "הצעד הבא" block names WHO); AMAR is untouched', () => {
  assert.equal(
    familyGuidanceFor('additional-consumer-products-12').note,
    'ביבוא מסחרי של מוצרי טבק, סיגריות אלקטרוניות ומוצרי ניקוטין עשויות לחול הגבלות של משרד הבריאות.',
  );
  assert.equal(
    familyGuidanceFor('chemicals-and-materials-04').note,
    'יש לבדוק את הייעוד המדויק של המוצר ואת הרכב החומר לפני קביעת דרישות היבוא.',
  );
  assert.ok(familyGuidanceFor('health-and-cosmetics-02').note.includes('דרישות נוספות ספציפיות למוצר עשויות להתברר בבדיקה המקצועית.'));
});

test('5. the professional referral that replaces the tail is still there for families whose note lost it', () => {
  for (const text of ['מזגן עילי', 'צבעים, דבקים וחומרי איטום', 'ביגוד']) {
    const section = buildProductFamilyMatrixSection({ texts: [text], importType: IMPORT_TYPE.COMMERCIAL });
    assert.ok(section.professional && section.professional.primary, `${text}: a professional referral is still offered`);
    assert.ok(!section.note.text.includes(TAIL), `${text}: no tail in the rendered note`);
  }
});

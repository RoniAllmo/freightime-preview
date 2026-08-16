import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Scan-based safety net for the questionnaire-architecture upgrade: no
// NEW file introduced by this task may assert a specific
// category-bound regulatory/compliance claim. This does not scan the
// pre-existing, already-reviewed rules-registry.js (that file is
// covered separately by its own byte-for-byte hash test) -- it scans
// the NEW architecture modules this task actually added, to prove
// they stayed data-collection/presentation-only.

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

const NEW_MODULE_FILES = [
  'js/import-readiness/layered-question-model.js',
  'js/import-readiness/document-readiness.js',
  'js/import-readiness/multi-signal-presentation.js',
  'js/import-readiness/result-brief.js',
];

// Phrases that would indicate a fabricated, category-specific
// regulatory conclusion being asserted as fact (as opposed to being
// collected as a question, or hedged as "worth checking").
const FORBIDDEN_PATTERNS = [
  /תקן ישראלי מחייב/, // "mandatory Israeli standard" asserted as fact
  /פטור מ(בדיקה|רישוי|תקינה)/, // "exempt from inspection/licensing/standards"
  /מותר לייבא ללא/, // "permitted to import without ..."
  /אסור לייבא/, // "forbidden to import"
  /require[sd]? by law/i,
  /exempt from (inspection|regulation|certification)/i,
  /is (safe|approved|certified) for/i,
];

test('1. none of the new architecture modules contain a forbidden category-specific regulatory-claim phrase', () => {
  for (const relPath of NEW_MODULE_FILES) {
    const content = readFileSync(join(repoRoot, relPath), 'utf8');
    for (const pattern of FORBIDDEN_PATTERNS) {
      assert.ok(!pattern.test(content), `${relPath} matched forbidden pattern ${pattern}`);
    }
  }
});

test('2. every new architecture module file actually exists (sanity check the scan list itself is real)', () => {
  for (const relPath of NEW_MODULE_FILES) {
    assert.doesNotThrow(() => statSync(join(repoRoot, relPath)));
  }
});

test('3. the new architecture modules never import a rule status of approved_for_pilot as a literal string', () => {
  for (const relPath of NEW_MODULE_FILES) {
    const content = readFileSync(join(repoRoot, relPath), 'utf8');
    assert.ok(!content.includes('approved_for_pilot'), `${relPath} must not reference approved_for_pilot`);
  }
});

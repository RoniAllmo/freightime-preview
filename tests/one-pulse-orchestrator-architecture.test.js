/**
 * FreighTime One-Pulse Agent Architecture Refactor (FT-ONE-PULSE-AGENT-ARCHITECTURE-V1).
 *
 * This guard mechanically validates the declarative Agent-definition
 * contracts introduced or changed by the orchestrator refactor: required
 * sections, forbidden actions, tool allowlists, and orchestration
 * boundaries -- not just that certain strings exist, but that the specific
 * structural guarantees the workflow requires are actually present in the
 * files that govern agent behavior. Agent definitions are Markdown with
 * YAML frontmatter, so "run" here means "read the real file and assert on
 * its real, load-bearing content" rather than exercising executable code.
 *
 * Pure Node, no DOM, no network, no live server required.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AGENTS_DIR = path.join(REPO_ROOT, '.claude', 'agents');

const ORCHESTRATOR_PATH = path.join(AGENTS_DIR, 'freightime-one-pulse-orchestrator.md');
const IMPLEMENTATION_PATH = path.join(AGENTS_DIR, 'freightime-implementation.md');
const REVIEW_PATH = path.join(AGENTS_DIR, 'freightime-read-only-review.md');
const RELEASE_PATH = path.join(AGENTS_DIR, 'freightime-release-verification.md');
const REGISTRY_PATH = path.join(REPO_ROOT, 'PRODUCT_OWNER_DECISION_REGISTRY.md');

function read(p) {
  assert.ok(fs.existsSync(p), `expected file to exist: ${path.relative(REPO_ROOT, p)}`);
  return fs.readFileSync(p, 'utf8');
}

function parseFrontmatterTools(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(match, 'expected YAML frontmatter block');
  const toolsLine = match[1].split('\n').find((l) => l.startsWith('tools:'));
  assert.ok(toolsLine, 'expected a tools: line in frontmatter');
  return toolsLine.replace('tools:', '').split(',').map((s) => s.trim());
}

const orchestrator = read(ORCHESTRATOR_PATH);
const implementation = read(IMPLEMENTATION_PATH);
const review = read(REVIEW_PATH);
const release = read(RELEASE_PATH);
const registry = read(REGISTRY_PATH);

/** Collapses all whitespace (including line wraps inside prose) to single spaces, so phrase checks are not brittle against Markdown line width. */
function normalize(text) {
  return text.replace(/\s+/g, ' ');
}

function assertContains(haystack, phrase, message) {
  assert.ok(normalize(haystack).includes(normalize(phrase)), message || `expected to find: "${phrase}"`);
}

test('1. product-family One-Pulse workflow: orchestrator classifies PRODUCT_FAMILY and routes family-suggestion-quality + product-rule-authoring', () => {
  assert.match(orchestrator, /PRODUCT_FAMILY/);
  assert.match(orchestrator, /freightime-family-suggestion-quality/);
  assert.match(orchestrator, /freightime-product-rule-authoring/);
});

test('2. matching-correction One-Pulse workflow: orchestrator classifies MATCHING_CORRECTION and routes the matching Skill', () => {
  assert.match(orchestrator, /MATCHING_CORRECTION/);
  assert.match(orchestrator, /Product family \/ matching[\s\S]{0,200}freightime-family-suggestion-quality/);
});

test('3. UX One-Pulse workflow: orchestrator classifies UX_CHANGE and routes ux-review + product-quality', () => {
  assert.match(orchestrator, /UX_CHANGE/);
  assert.match(orchestrator, /freightime-ux-review/);
  assert.match(orchestrator, /freightime-product-quality/);
});

test('4. generated-workbook workflow: Phase D requires updating the authoritative source, never hand-editing the generated file, and byte-identical double generation', () => {
  assert.match(orchestrator, /Phase D — Source-of-truth handling/);
  assert.match(orchestrator, /never hand-edit the generated file/);
  assert.match(orchestrator, /byte-identical output/);
});

test('5. temporary generator dependency workflow: Phase D requires an isolated out-of-repo environment, never a global install, never a repository dependency-file change', () => {
  assertContains(orchestrator, 'temporary isolated environment outside the repository');
  assertContains(orchestrator, 'never a global install');
  assertContains(orchestrator, 'never a repository dependency file change for a generator-only package');
});

test('6. mechanical count ripple effect: orchestrator DO-NOT-STOP list includes count changes', () => {
  assert.match(orchestrator, /Do NOT stop for[\s\S]{0,400}count changes/);
});

test('7. manifest ripple effect: orchestrator DO-NOT-STOP list includes manifests', () => {
  assert.match(orchestrator, /Do NOT stop for[\s\S]{0,400}manifests/);
});

test('8. direct test-file discovery: orchestrator Phase F validation always runs every directly changed and adjacent test', () => {
  assertContains(orchestrator, 'every directly changed test');
  assertContains(orchestrator, 'every directly relevant adjacent test');
});

test('9. Reviewer Level 1: read-only review defines REVIEW_LEVEL_1 with its stated minimum evidence', () => {
  assert.match(review, /REVIEW_LEVEL_1.*for bounded CSS changes/);
  assert.match(review, /identity; scope; exact behavior; targeted tests; diff check/);
});

test('10. Reviewer Level 2: read-only review defines REVIEW_LEVEL_2 with its stated minimum evidence', () => {
  assert.match(review, /REVIEW_LEVEL_2.*for product-family changes/);
  assert.match(review, /behavior matrix; professional boundary; collision behavior/);
});

test('11. Reviewer Level 3: read-only review defines REVIEW_LEVEL_3 with its stated minimum evidence', () => {
  assert.match(review, /REVIEW_LEVEL_3.*for new family architecture/);
  assert.match(review, /full source-of-truth chain; full architecture/);
});

test('12. one correction cycle: orchestrator Phase I permits reinvoking implementation and the reviewer exactly once', () => {
  assert.match(orchestrator, /Phase I — Correction cycle \(at most once\)/);
  assert.match(orchestrator, /reinvoke `freightime-implementation`/);
  assert.match(orchestrator, /reinvoke `freightime-read-only-review`/);
});

test('13. correction-cycle maximum: orchestrator stops and does not Push if a second correction is required', () => {
  assert.match(orchestrator, /Do not exceed one correction cycle/);
  assert.match(orchestrator, /this Agent stops, does not Push, and returns a\s*\nblocked report/);
});

test('14. stop on Product Owner policy ambiguity', () => {
  assert.match(orchestrator, /A genuinely new product-policy decision is required\./);
});

test('15. stop on regulatory ambiguity', () => {
  assert.match(orchestrator, /Regulatory meaning is ambiguous\./);
});

test('16. stop on architectural conflict', () => {
  assert.match(orchestrator, /Two credible repository precedents conflict\./);
});

test('17. stop when a shared matching-algorithm change is required', () => {
  assert.match(orchestrator, /A shared matching-algorithm change is required\./);
});

test('18. stop when origin/main advances after implementation', () => {
  assert.match(orchestrator, /`origin\/main` advanced after implementation\./);
  assert.match(orchestrator, /do not rebase automatically, do not merge `main` into the/);
});

test('19. no Push before independent GO: Phase J is gated on a final GO FOR PUSH AND PR', () => {
  assert.match(orchestrator, /Only after a final `GO FOR PUSH AND PR`/);
});

test('20. Push and PR after independent GO: Phase J pushes the branch and opens exactly one PR', () => {
  assert.match(orchestrator, /`git push -u origin <authorized branch>`/);
  assert.match(orchestrator, /Create exactly one Pull Request/);
});

test('21. no Merge in the One-Pulse workflow: orchestrator holds no merge tool and states it never merges', () => {
  const tools = parseFrontmatterTools(orchestrator);
  assert.ok(!tools.includes('mcp__github__merge_pull_request'), 'orchestrator must not hold the merge tool');
  assert.match(orchestrator, /never Merges under any authorization it holds/);
  assert.match(orchestrator, /Do not Merge under any circumstance in this invocation\./);
});

test('22. short release-verification gate: release-verification consumes existing review evidence instead of repeating a full audit', () => {
  assertContains(release, 'never repeats a full product-domain audit when an independent review already covers the exact HEAD');
  assertContains(release, 'no structural change was needed for this requirement');
});

test('23. Product Owner decision-registry lookup: orchestrator consults the registry, and the registry exists seeded with exactly 15 approved rules', () => {
  assert.match(orchestrator, /PRODUCT_OWNER_DECISION_REGISTRY\.md/);
  const ruleLines = registry.match(/^\d+\.\s/gm) || [];
  assert.equal(ruleLines.length, 15, 'registry must be seeded with exactly the 15 already-approved rules');
});

test('24. no reuse of an unapproved decision: the registry explicitly refuses to substitute for current authorization', () => {
  assertContains(registry, 'Do not add a rule that has not already been approved and merged.');
  assertContains(registry, 'not** a substitute for current Product Owner authorization');
  assertContains(orchestrator, 'consult it; do not treat it as authorization for a new rule');
});

test('25. preservation of legacy Agent modes: all three existing Agents keep their original operating-mode names', () => {
  assert.match(implementation, /MODE A — PLAN_VERIFICATION/);
  assert.match(implementation, /MODE B — EXPLICITLY_AUTHORIZED_IMPLEMENTATION/);
  assert.match(release, /MODE A — READ_ONLY_VERIFICATION/);
  assert.match(release, /MODE B — EXPLICITLY_AUTHORIZED_MERGE/);
});

test('independence: orchestrator never edits files directly and never approves its own implementation', () => {
  const tools = parseFrontmatterTools(orchestrator);
  assert.ok(!tools.includes('Edit'), 'orchestrator must not hold Edit');
  assert.ok(!tools.includes('Write'), 'orchestrator must not hold Write');
  assert.match(orchestrator, /never approves its own implementation/);
  assert.match(orchestrator, /never edits repository files itself/);
});

test('backward compatibility: implementation and release agents document orchestrator invocation without a new required mode', () => {
  assert.match(implementation, /freightime-one-pulse-orchestrator/);
  assert.match(implementation, /No new operating mode is required for this/);
  assert.match(release, /freightime-one-pulse-orchestrator/);
});

test('all four governed Agent files declare a tools: allowlist with no unexpected write-capable GitHub tool', () => {
  for (const [name, content, forbidden] of [
    ['orchestrator', orchestrator, ['mcp__github__merge_pull_request', 'mcp__github__push_files', 'mcp__github__create_or_update_file']],
    ['implementation', implementation, ['mcp__github__merge_pull_request', 'mcp__github__create_pull_request']],
    ['review', review, ['mcp__github__merge_pull_request', 'mcp__github__create_pull_request']],
  ]) {
    const tools = parseFrontmatterTools(content);
    for (const f of forbidden) {
      assert.ok(!tools.includes(f), `${name} must not hold ${f}`);
    }
  }
  const releaseTools = parseFrontmatterTools(release);
  assert.ok(releaseTools.includes('mcp__github__merge_pull_request'), 'release-verification is the only Agent holding the merge tool');
});

/**
 * Structural coverage for Agent and Skill definition files
 * (FT-ONE-PULSE-FULL-SYSTEM-AUDIT-AND-CLEANUP-V1, Item B).
 *
 * Audit finding: tests/one-pulse-orchestrator-architecture.test.js already
 * mechanically validates .claude/agents/freightime-one-pulse-orchestrator.md's
 * frontmatter and contracts, but no test file validated the other 3 Agent
 * files, or any of the 6 Skill directories under .claude/skills/. This file
 * closes that gap with the same style already used by
 * tests/one-pulse-orchestrator-architecture.test.js and
 * tests/ci-workflow-completeness.test.js: real fs.readFileSync of the real
 * files, with assertions on real, load-bearing content -- never a
 * fake/trivial always-true assertion. It is purely additive: it only reads
 * Agent and Skill files, never modifies them, and does not duplicate the
 * existing orchestrator-specific checks already covered elsewhere.
 *
 * Because this file lives directly in tests/ (isTopLevelTestsFile in
 * tests/ci-workflow-completeness.test.js), it is automatically reachable by
 * the canonical `node --test` command with no CI or workflow change needed.
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
const SKILLS_DIR = path.join(REPO_ROOT, '.claude', 'skills');

const AGENT_FILES = Object.freeze({
  orchestrator: path.join(AGENTS_DIR, 'freightime-one-pulse-orchestrator.md'),
  implementation: path.join(AGENTS_DIR, 'freightime-implementation.md'),
  review: path.join(AGENTS_DIR, 'freightime-read-only-review.md'),
  release: path.join(AGENTS_DIR, 'freightime-release-verification.md'),
});

const SKILL_DIR_NAMES = Object.freeze([
  'freightime-safe-git-workflow',
  'freightime-regression-validation',
  'freightime-family-suggestion-quality',
  'freightime-product-rule-authoring',
  'freightime-ux-review',
  'freightime-product-quality',
]);

function read(p) {
  assert.ok(fs.existsSync(p), `expected file to exist: ${path.relative(REPO_ROOT, p)}`);
  return fs.readFileSync(p, 'utf8');
}

function parseFrontmatterToolsLine(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(match, 'expected YAML frontmatter block');
  const toolsLine = match[1].split('\n').find((l) => l.startsWith('tools:'));
  assert.ok(toolsLine, 'expected a tools: line in frontmatter');
  return toolsLine;
}

function parseFrontmatterTools(content) {
  return parseFrontmatterToolsLine(content)
    .replace('tools:', '')
    .split(',')
    .map((s) => s.trim());
}

const implementation = read(AGENT_FILES.implementation);
const review = read(AGENT_FILES.review);
const release = read(AGENT_FILES.release);
const orchestrator = read(AGENT_FILES.orchestrator);

test('1. freightime-implementation.md has valid YAML frontmatter with a tools: line', () => {
  const tools = parseFrontmatterTools(implementation);
  assert.ok(tools.length > 0, 'expected at least one declared tool');
});

test('2. freightime-read-only-review.md has valid YAML frontmatter with a tools: line', () => {
  const tools = parseFrontmatterTools(review);
  assert.ok(tools.length > 0, 'expected at least one declared tool');
});

test('3. freightime-release-verification.md has valid YAML frontmatter with a tools: line', () => {
  const tools = parseFrontmatterTools(release);
  assert.ok(tools.length > 0, 'expected at least one declared tool');
});

test('4. only freightime-release-verification.md holds the write-capable merge tool, and it holds exactly one', () => {
  const releaseTools = parseFrontmatterTools(release);
  const mergeToolCount = releaseTools.filter((t) => t === 'mcp__github__merge_pull_request').length;
  assert.equal(mergeToolCount, 1, 'freightime-release-verification.md must hold exactly one merge tool');

  for (const [name, content] of [
    ['implementation', implementation],
    ['review', review],
    ['orchestrator', orchestrator],
  ]) {
    const tools = parseFrontmatterTools(content);
    assert.ok(
      !tools.includes('mcp__github__merge_pull_request'),
      `${name} must not hold mcp__github__merge_pull_request`,
    );
  }
});

test('5. freightime-read-only-review.md holds no Edit/Write and no write-capable GitHub tool at all', () => {
  const tools = parseFrontmatterTools(review);
  assert.ok(!tools.includes('Edit'), 'review Agent must not hold Edit');
  assert.ok(!tools.includes('Write'), 'review Agent must not hold Write');
  const writeCapableGithubTools = tools.filter(
    (t) => t.startsWith('mcp__github__') && /merge|create|push|update|delete/i.test(t),
  );
  assert.deepEqual(
    writeCapableGithubTools,
    [],
    `review Agent must hold no write-capable GitHub tool, found: ${writeCapableGithubTools.join(', ')}`,
  );
});

test('6. freightime-implementation.md holds no GitHub tool of any kind', () => {
  const toolsLine = parseFrontmatterToolsLine(implementation);
  assert.ok(
    !/mcp__github__/.test(toolsLine),
    'implementation Agent tools: line must contain no mcp__github__ tool',
  );
});

test('7. freightime-implementation.md has no Push/PR/Merge/Deployment tool at all (Edit/Write/Bash only plus read helpers)', () => {
  const tools = parseFrontmatterTools(implementation);
  for (const forbidden of ['mcp__github__merge_pull_request', 'mcp__github__create_pull_request']) {
    assert.ok(!tools.includes(forbidden), `implementation Agent must not hold ${forbidden}`);
  }
});

for (const skillName of SKILL_DIR_NAMES) {
  test(`8. Skill directory ${skillName} exists and contains a non-empty SKILL.md`, () => {
    const dir = path.join(SKILLS_DIR, skillName);
    assert.ok(fs.existsSync(dir) && fs.statSync(dir).isDirectory(), `expected Skill directory: ${skillName}`);
    const skillMdPath = path.join(dir, 'SKILL.md');
    assert.ok(fs.existsSync(skillMdPath), `expected SKILL.md inside ${skillName}`);
    const content = fs.readFileSync(skillMdPath, 'utf8');
    assert.ok(content.trim().length > 0, `SKILL.md inside ${skillName} must not be empty`);
  });
}

test('9. exactly the 6 expected Skill directories exist under .claude/skills/ (no extra, no missing)', () => {
  const actualDirs = fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  assert.deepEqual(actualDirs, [...SKILL_DIR_NAMES].sort());
});

test('10. every Skill name referenced by freightime-one-pulse-orchestrator.md corresponds to a real Skill directory', () => {
  const referenced = new Set(
    (orchestrator.match(/freightime-[a-z-]+/g) || []).filter((name) => SKILL_DIR_NAMES.includes(name)),
  );
  assert.ok(referenced.size > 0, 'expected the orchestrator to reference at least one Skill by name');
  for (const name of referenced) {
    assert.ok(fs.existsSync(path.join(SKILLS_DIR, name)), `orchestrator references nonexistent Skill directory: ${name}`);
  }
});

test('11. every Skill name referenced by freightime-implementation.md corresponds to a real Skill directory', () => {
  const referenced = new Set(
    (implementation.match(/freightime-[a-z-]+/g) || []).filter((name) => SKILL_DIR_NAMES.includes(name)),
  );
  assert.ok(referenced.size > 0, 'expected freightime-implementation.md to reference at least one Skill by name');
  for (const name of referenced) {
    assert.ok(
      fs.existsSync(path.join(SKILLS_DIR, name)),
      `freightime-implementation.md references nonexistent Skill directory: ${name}`,
    );
  }
});

test('12. every Skill name referenced by freightime-read-only-review.md corresponds to a real Skill directory', () => {
  const referenced = new Set(
    (review.match(/freightime-[a-z-]+/g) || []).filter((name) => SKILL_DIR_NAMES.includes(name)),
  );
  for (const name of referenced) {
    assert.ok(
      fs.existsSync(path.join(SKILLS_DIR, name)),
      `freightime-read-only-review.md references nonexistent Skill directory: ${name}`,
    );
  }
});

test('13. every Skill name referenced by freightime-release-verification.md corresponds to a real Skill directory', () => {
  const referenced = new Set(
    (release.match(/freightime-[a-z-]+/g) || []).filter((name) => SKILL_DIR_NAMES.includes(name)),
  );
  for (const name of referenced) {
    assert.ok(
      fs.existsSync(path.join(SKILLS_DIR, name)),
      `freightime-release-verification.md references nonexistent Skill directory: ${name}`,
    );
  }
});

test('14. this file lives directly in tests/ so it is covered by the ci-workflow-completeness top-level rule', () => {
  const relative = path.relative(REPO_ROOT, fileURLToPath(import.meta.url));
  assert.equal(path.dirname(relative), 'tests');
});

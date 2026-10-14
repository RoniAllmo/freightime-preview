/**
 * Fail-closed boundary pins for the four FreighTime Agent definitions
 * (P3 maintenance, 2026-10-14).
 *
 * Audit finding: the Agents' tool allowlists were already pinned
 * (tests/agent-and-skill-structure.test.js,
 * tests/one-pulse-orchestrator-architecture.test.js), but the written
 * fail-closed rules that each Agent file says are the ONLY guard on
 * `Bash` -- and the "a GO never authorizes the next action" rules --
 * were pinned by no test. The project handover allows reducing repeated
 * Agent text only if these boundaries stay explicit and tested, so they
 * are pinned here, per Agent, before any trimming.
 *
 * Agents are loaded one at a time and cannot import shared text, so each
 * boundary must stay written out in each Agent file -- this test checks
 * every file separately rather than once for a shared source.
 *
 * Whitespace (including line wrapping) and Markdown blockquote markers
 * are normalized before matching, so re-wrapping a paragraph never
 * breaks a pin, but removing or rewording a boundary does.
 *
 * Pure Node, no DOM, no network.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AGENTS_DIR = path.join(REPO_ROOT, '.claude', 'agents');

function readAgent(name) {
  return fs.readFileSync(path.join(AGENTS_DIR, `${name}.md`), 'utf8');
}

/** Collapse whitespace and strip leading blockquote markers. */
function normalize(text) {
  return text
    .split('\n')
    .map((line) => line.replace(/^\s*>\s?/, ''))
    .join(' ')
    .replace(/\s+/g, ' ');
}

function assertPinned(agentName, phrases) {
  const body = normalize(readAgent(agentName));
  for (const phrase of phrases) {
    assert.ok(
      body.includes(normalize(phrase)),
      `${agentName}.md must keep the fail-closed boundary: "${phrase}"`,
    );
  }
}

// -- freightime-implementation --

test('1. implementation: refuses Agent/Skill/Plugin/MCP creation and redirects', () => {
  assertPinned('freightime-implementation', [
    'create another Agent; create or modify a Skill unless separately authorized; install a Plugin; or create an MCP server.',
    'must refuse and redirect such a request',
  ]);
});

test('2. implementation: Bash is bounded only by instruction, and the never-through-Bash list stays explicit', () => {
  assertPinned('freightime-implementation', [
    'technically broad; bounded entirely by instruction, not by tool schema.',
    'Never through Bash or any other tool:',
    '`git push`, `git push --force`, any PR-creation or PR-modification command',
    'any Auto-merge action, any deployment command',
    'any GitHub write via `gh`, `curl`, `wget`, or an API client',
    'No GitHub tool of any kind is granted.',
  ]);
});

test('3. implementation: a GO or a successful implementation never authorizes the next action', () => {
  assertPinned('freightime-implementation', [
    'A GO recommendation never changes the operating mode.',
    'A successful implementation never authorizes Push, PR creation, Merge, Deployment, branch deletion, Auto-merge, or additional scope beyond the exact approved plan.',
  ]);
});

// -- freightime-read-only-review --

test('4. review: refuses implementation/Git/Agent creation and redirects', () => {
  assertPinned('freightime-read-only-review', [
    'create another Agent; create a Skill; install a Plugin; or create an MCP server.',
    'must refuse and redirect such a request',
  ]);
});

test('5. review: Bash is not read-only at the platform level and no stronger enforcement is claimed', () => {
  assertPinned('freightime-read-only-review', [
    '`Bash` itself is not a read-only tool at the platform level',
    'rests entirely on its own written instructions below, not on technical sandboxing.',
    'Do not claim stronger enforcement than this.',
    'Prohibited, regardless of what `Bash` could technically execute',
    'staging (`git add`); Push; force push; PR creation or modification; Merge; enabling auto-merge; Deployment;',
  ]);
});

test('6. review: a GO/VERIFIED never authorizes the next action, and every report carries the non-authorization footer', () => {
  assertPinned('freightime-read-only-review', [
    'A GO/VERIFIED recommendation is never interpreted as permission for this agent to perform the next action.',
    'This review recommendation does not authorize implementation, file changes, Commit, Push, PR creation or modification, Merge, Auto-merge, Deployment, branch deletion, workflow control, or GitHub settings changes.',
  ]);
});

// -- freightime-release-verification --

test('7. release: refuses implementation/Git/Agent creation and redirects', () => {
  assertPinned('freightime-release-verification', [
    'create another Agent; create a Skill; install a Plugin; or create an MCP server.',
    'must refuse and redirect such a request',
  ]);
});

test('8. release: Bash remains write-capable, no stronger enforcement is claimed, and the prohibited-via-Bash list stays explicit', () => {
  assertPinned('freightime-release-verification', [
    'Bash remains technically write-capable.',
    'therefore rest entirely on this file\'s own written instructions, not on technical sandboxing. Do not claim stronger enforcement than this.',
    'Prohibited via Bash, in every mode, without exception:',
    'in-place file editing (`sed -i`, `perl -i`',
  ]);
});

test('9. release: a GO FOR MERGE never authorizes the merge, and every report carries the non-authorization footer', () => {
  assertPinned('freightime-release-verification', [
    'A `GO FOR MERGE` recommendation never authorizes this Agent to merge.',
    'This Agent never treats `freightime-read-only-review`\'s `GO FOR MERGE` as this Agent\'s own merge authorization',
    'This report does not, by itself, authorize Merge, Auto-merge, Deployment, branch deletion, workflow control, or GitHub settings changes',
  ]);
});

// -- freightime-one-pulse-orchestrator --

test('10. orchestrator: no Edit/Write, no merge tool, and Bash never edits files or merges', () => {
  assertPinned('freightime-one-pulse-orchestrator', [
    'This Agent has `Edit`/`Write` capability **nowhere in its tool set**.',
    'but **no** `mcp__github__merge_pull_request` and no other repository-mutating GitHub tool.',
    'never for file edits, never for `git commit --amend`, never for force-push, never for Merge-equivalent operations',
  ]);
});

// -- Review-level drift guard --

/** Extracts each REVIEW_LEVEL_n's required-evidence list as a normalized set. */
function requiredEvidenceByLevel(agentName, requiredLabel) {
  const body = normalize(readAgent(agentName));
  const levels = {};
  for (const level of [1, 2, 3]) {
    const start = body.indexOf(`REVIEW_LEVEL_${level}**`);
    assert.ok(start !== -1, `${agentName}.md must define REVIEW_LEVEL_${level}`);
    const labelIndex = body.indexOf(requiredLabel, start);
    assert.ok(labelIndex !== -1, `${agentName}.md REVIEW_LEVEL_${level} must list its required evidence`);
    const listStart = labelIndex + requiredLabel.length;
    const listEnd = body.indexOf('.', listStart);
    levels[level] = body
      .slice(listStart, listEnd)
      .split(/[;,]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .sort();
  }
  return levels;
}

test('11. orchestrator: its copy of the review levels requires exactly the same evidence as the reviewer\'s own definition', () => {
  const reviewer = requiredEvidenceByLevel('freightime-read-only-review', 'Minimum required:');
  const orchestrator = requiredEvidenceByLevel('freightime-one-pulse-orchestrator', 'Required:');
  for (const level of [1, 2, 3]) {
    assert.ok(reviewer[level].length >= 5, `REVIEW_LEVEL_${level} must list its evidence items`);
    assert.deepEqual(
      orchestrator[level],
      reviewer[level],
      `REVIEW_LEVEL_${level}: the orchestrator's required evidence has drifted from freightime-read-only-review.md`,
    );
  }
});

// -- Moved evaluation scenarios --

test('12. each Agent points to its moved evaluation scenarios, and that file exists and still holds them', () => {
  for (const name of ['freightime-implementation', 'freightime-read-only-review', 'freightime-release-verification']) {
    const relative = `docs/agent-evaluations/${name}.md`;
    assert.ok(normalize(readAgent(name)).includes(`\`${relative}\``), `${name}.md must point to ${relative}`);
    const scenariosPath = path.join(REPO_ROOT, relative);
    assert.ok(fs.existsSync(scenariosPath), `${relative} must exist`);
    const scenarios = fs.readFileSync(scenariosPath, 'utf8');
    // Scenario 1 opens as either "**1. Title.**" or "1. **Title.**".
    const firstScenario = /^(\*\*1\. |1\. \*\*)/m;
    assert.match(scenarios, firstScenario, `${relative} must still contain the numbered scenarios`);
    assert.ok(!/^## Evaluation scenarios\n[\s\S]*^(\*\*1\. |1\. \*\*)/m.test(readAgent(name)), `${name}.md must not keep a second, drifting copy of the scenarios`);
  }
});

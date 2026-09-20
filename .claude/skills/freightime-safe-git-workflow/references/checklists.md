# Quick Checklists — FreighTime Safe Git Workflow

Compact, reusable checklists. The full rules and rationale live in
`SKILL.md`; this file is a fast-reference companion, not a substitute.

## Preflight
- [ ] Repository path confirmed
- [ ] `git fetch origin` run once
- [ ] Current branch reported
- [ ] Local HEAD reported
- [ ] `origin/main` HEAD reported
- [ ] Working tree status + untracked files reported
- [ ] Ahead/behind vs `origin/main` reported
- [ ] Relevant open PRs identified
- [ ] No conflicting active branch for this task
- [ ] If on `main` and editing: feature branch created first
- [ ] If tree dirty: stopped, reported, nothing discarded/stashed

## Pre-push
- [ ] Current branch is not `main`
- [ ] Local HEAD shown
- [ ] Tracking branch / exact remote destination shown
- [ ] Commits about to be pushed listed
- [ ] Destination confirmed not `main`
- [ ] No `--force` / `--force-with-lease` without specific, current
      product-owner authorization
- [ ] Push command is `git push -u origin <feature-branch>`
- [ ] After push: `origin/main` unchanged; remote branch SHA confirmed

## Pre-PR
- [ ] Base is `main`; head is the intended feature branch
- [ ] Description covers scope, behavior, validation, risk, rollback
- [ ] Non-draft only if implementation is complete
- [ ] No unrelated changes included
- [ ] Not a retrospective PR for code already on `main`
- [ ] No duplicate PR already open for this branch
- [ ] CI checked once (bounded wait rule applies, see SKILL.md §9)

## Pre-merge
- [ ] Explicit, current authorization for this exact PR number
- [ ] Head SHA matches what was authorized
- [ ] Base is `main`
- [ ] PR open, non-draft
- [ ] `mergeable_state` clean
- [ ] CI completed + success on the exact head SHA
- [ ] No unresolved blocking review thread
- [ ] Working tree clean
- [ ] Auto-merge not enabled (unless separately authorized)
- [ ] Merge method: squash

## Post-merge
- [ ] Squash SHA recorded
- [ ] Local `main` fast-forwarded to match `origin/main`
- [ ] Main CI checked on exact SHA (bounded wait rule applies)
- [ ] Pages checked on exact SHA if frontend behavior changed (bounded
      wait rule applies)
- [ ] Post-merge smoke labeled correctly (local vs. public)
- [ ] Any local dev server stopped
- [ ] Working tree still clean

## Branch deletion
- [ ] Explicit product-owner authorization for this exact branch/list
- [ ] Not `main`, not infrastructure/deployment branch
- [ ] No open PR uses it as head or base
- [ ] No active worktree uses it
- [ ] Useful work preserved (merged, or declared obsolete)
- [ ] Unique commits reviewed
- [ ] Exact branch name shown before deletion
- [ ] On HTTP 403: stop immediately, report blocker, hand back list —
      do not retry other branches

## Accidental direct-push recovery
- [ ] Stopped immediately, no further pushes
- [ ] Exact commit + files reported
- [ ] No reset, force-push, or history rewrite
- [ ] No fabricated retrospective PR
- [ ] CI verified on the exact commit
- [ ] Pages verified on the exact commit
- [ ] Containment validation run (targeted tests minimum)
- [ ] If valid: recommend leaving history intact, revert-via-PR if ever undone
- [ ] If defective: new branch from current `main`, normal PR
- [ ] Branch-protection recommendation offered as a separate, explicitly
      authorized follow-up

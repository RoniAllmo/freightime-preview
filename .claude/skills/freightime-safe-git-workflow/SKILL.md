---
name: freightime-safe-git-workflow
description: Enforce safe Git/GitHub workflow discipline for FreighTime — branch creation, commit scope, push destination, PR opening, merge authorization, CI/Pages verification, branch deletion, and accidental-direct-push recovery. Use before any git or GitHub operation that could touch main or origin (branching, committing, pushing, opening/updating a PR, merging, verifying CI/Pages, deleting a branch, or recovering from a bad push). Does not cover product-family rules, regulatory content, or UX quality — see freightime-product-quality for that.
---

# FreighTime Safe Git Workflow

## Purpose

Prevent the Git/GitHub process failures this project has actually hit:
editing on `main`, pushing feature work directly to `main`, merging or
deleting without explicit authorization, retrospective PRs for code
already on `main`, open-ended CI/Pages polling, and full-suite reruns
after every small edit. This skill is a procedure, not a knowledge base
— it does not contain product, regulatory, or UX rules.

**Boundary with `freightime-product-quality`:** that skill owns *what*
UX/quality work is safe to do and how to validate it. This skill owns
*how* any Git/GitHub operation around that work (or any other work) is
sequenced safely. Use both together when a quality-skill task reaches
the commit/push/PR stage — this skill governs that stage.

This skill does not itself define the targeted or full test commands —
it defines *when* each validation level is required. Use whatever the
current project's directly-related tests and full suite command are
(see `CLAUDE.md` §11 and the repository's own `node --test` usage).

## Stop conditions (apply throughout)

- Do the requested Git operation only. Do not discover or start
  additional work while performing it.
- Do not begin a new phase automatically because a gate passed.
- Do not modify files during a status-only request.
- Do not turn a cleanup or verification task into development.
- Stop and report the moment the requested step is done — do not chain
  into the next stage without a new instruction, except where a step
  below explicitly requires it (e.g. push after commit in the same
  authorized task).

## Reporting discipline

Every report must separate these labels and never blur them:

- **Completed** — done and verified this turn.
- **Pending** — still running (CI, Pages); not waited out further.
- **Failed** — ran and did not pass; state the exact job/step/test.
- **Blocked** — could not proceed (permission, conflict, dirty tree).
- **Not run** — deliberately skipped per this skill's rules; say why.
- **Inferred** — deduced from indirect evidence (e.g. "main accepts
  direct pushes" inferred from a past push succeeding), never stated as
  a directly-read setting unless it was actually read from repository
  settings.
- **Directly verified** — read from the source of truth itself (API,
  git, test output).

A test-harness problem (flaky selector, wrong assumption in a smoke
script) must be reported as a harness issue, not a product defect. A
local smoke check against a checked-out SHA is "post-merge local smoke
on the exact candidate SHA" — never "post-deployment" unless the public
deployment itself was actually checked.

---

## 1. Preflight (before touching any file)

Run once, report all of it before making a decision:

- Confirm repository path.
- `git fetch origin` (once).
- Current branch.
- Local HEAD SHA.
- `origin/main` HEAD SHA.
- Working-tree status (`git status --short`) and untracked files.
- Ahead/behind vs `origin/main`.
- Any open PR relevant to this task.
- Whether another active branch already covers this task.

**If the current branch is `main` and the task requires an application
edit:** create a dedicated feature branch first (see §2). Never make
the first application edit while checked out on `main`.

**If the working tree is dirty:** do not discard, reset, or
auto-stash. Report the existing changes and stop — ask before mixing
them with the new task.

## 2. Branch creation

For new work:

1. Synchronize local `main`: `git fetch origin && git merge --ff-only origin/main`.
   If fast-forward fails, **stop** — do not reset or rebase `main`;
   report the discrepancy.
2. Create the feature branch from synchronized `main`:
   `git checkout -b claude/<kebab-case-task-name>`.
3. Record the exact base SHA (the `main` SHA the branch was cut from).
4. Confirm the new branch is checked out before any edit.

Continuing an existing feature branch is allowed only when it is
explicitly the branch for the current task, its base and PR state are
known, its tree is clean, and it carries no unrelated work.

## 3. Development validation (targeted vs. release)

**Targeted validation** (during implementation, after each meaningful
change):
- Run only the narrowest directly-related tests for the change made.
- Do not rerun a test that already passed unless the code it covers
  changed again.
- Do not run the full frontend suite after a small edit.
- Stop any command producing no useful progress for 5 minutes; never
  replace it with an open-ended polling loop.

**Release validation** (once, before publishing — i.e. before opening
or updating a PR meant for review):
- Targeted tests for the actual change, plus:
- `git diff --check`
- `git status --short`
- The full frontend suite, run **once**, only at this point — not
  after every edit.
- Backend checked read-only (branch/HEAD/status only) when the change
  is frontend-only and not expected to affect it.

Use `references/checklists.md` for the compact per-stage checklists.

## 4. Commit safety

Before committing:

- Confirm the branch is not `main`.
- Show the exact changed-file list and confirm it matches the
  requested scope — no secrets, screenshots, logs, scratch files, or
  unrelated changes.
- Prefer one focused commit per logical change.
- Never create an empty commit.
- Never amend already-pushed/shared history unless the product owner
  explicitly authorizes it for a specific, narrow reason.

## 5. Push safety

Before pushing, print: current branch, local HEAD, tracking branch,
exact remote destination, the commits about to be pushed, and whether
the destination is `main`.

**Hard stops:**
- Never push application changes directly to `main`.
- Never run `git push origin main` for feature work.
- Never use `--force` or `--force-with-lease` unless the product owner
  explicitly authorizes a specific, narrow recovery — an authorization
  from an earlier task never carries over.

Push explicitly to the feature branch:
```
git push -u origin <current-feature-branch>
```

After push: confirm `origin/main` did not move, and the remote feature
branch points at the intended commit.

## 6. Pull Request safety

A PR must target `main`, use the intended feature branch as head, and
describe scope, behavior, validation, risk, and rollback. Mark
non-draft only when the implementation is complete.

Do not: open a retrospective PR for code that already reached `main`
some other way; open a duplicate PR for the same branch; poll CI
continuously; modify the PR after opening unless a verified correction
is needed; report CI as green while it is still queued or running.

Check CI once. If still running and the task needs the result now,
wait once for at most 3 minutes, check once more, then report the
current state (pending) and stop — no further polling.

## 7. Merge authorization

**Merge only when the current instruction explicitly authorizes
merging the specific, identified PR.** Authorization for a different
PR, or from an earlier task/turn, does not count.

Verify before merging, all in this same turn:
- Exact PR number and exact head SHA.
- Base is `main`.
- PR is open and non-draft.
- `mergeable_state` is clean.
- CI is completed and successful on the exact head SHA.
- No unresolved blocking review thread.
- Working tree clean.
- Auto-merge is not enabled (never enable it without explicit,
  separate authorization).

Preferred method: **squash merge**. Do not merge because a PR merely
looks ready, merge while CI is pending, merge multiple PRs unless each
one is explicitly named in the authorization, or merge after a
test-harness failure without first confirming it is a harness issue
and not a product regression.

## 8. Post-merge verification

After an authorized merge:
- Record the complete squash SHA.
- Synchronize local `main` by fast-forward only; confirm local `main`
  equals `origin/main`.
- Verify Main CI on the exact SHA (check once; one bounded 3-minute
  wait at most; check once more; else report pending and stop).
- Verify Pages on the exact SHA when frontend production behavior
  changed (same bounded-check rule).
- Run only the approved post-merge smoke scope — call it "post-merge
  local smoke on the exact candidate SHA" unless the public deployment
  itself was checked.
- Stop any local server started for validation.
- Confirm the tree remains clean.

Do not rerun a large validation suite when the exact same SHA already
passed the required CI gate, unless a specific policy requires it.

## 9. CI and deployment waiting (no open-ended waiting, ever)

- Check status once.
- If still running and the task explicitly requires the result, allow
  **one** bounded wait (≤3 minutes), then check once more.
- If still running after that, report the current state as pending and
  **stop** — do not check again in the same turn.
- Never use `while`, `watch`, `tail -f`, recurring `sleep`, background
  log monitors, or scheduled wakeups to keep checking CI/Pages/logs.
- Never say a task is complete while CI or Pages is still pending.

## 10. Branch deletion

Delete a branch only when **all** of the following hold:
- The product owner explicitly authorized deleting this exact branch
  (by name, or by an unambiguous, exactly-reconciled category list).
- It is not `main` and not an infrastructure/deployment branch.
- No open PR uses it as head or base.
- No active worktree uses it.
- Its useful work is already preserved (merged PR, or explicitly
  declared obsolete by the product owner).
- Its unique commits (if any) have been reviewed and accounted for.

Show the exact branch name before deleting it. Never request broad
GitHub write/settings permissions merely to perform cleanup.

If deletion returns HTTP 403 or any permission error: stop further
deletion attempts immediately, do not retry other branches "just in
case," report the exact permission blocker, and hand back the
authorized-but-undeleted branch list for manual execution.

## 11. Accidental direct-push recovery

If a feature commit was pushed straight to `main`:

1. Stop immediately — do not make it worse.
2. Report the exact commit SHA and changed files.
3. Do **not** reset, force-push, or rewrite `main` history.
4. Do **not** fabricate a retrospective PR as if review happened first.
5. Verify CI and Pages on the exact commit that landed.
6. Run containment validation appropriate to the change (targeted
   tests at minimum).
7. If the commit is valid and CI/Pages are green: recommend leaving
   history intact — a revert-via-PR is the correct tool for undoing it
   later, not history rewriting.
8. If a real defect is found: create a normal corrective branch from
   the current `main` and fix it through a normal PR — do not patch
   `main` directly again.
9. Recommend enabling branch protection as a separate, explicitly
   authorized follow-up (see `references/checklists.md`).

## 12. Scope control

- Do only the requested Git/GitHub operation.
- Do not discover or start unrelated product work while doing it.
- Do not begin cleanup, refactors, or the next phase without being
  asked.
- Do not modify application code during a status-only or cleanup task.
- Stop after the requested report.

## References

- `references/checklists.md` — compact preflight / pre-push / pre-PR /
  pre-merge / post-merge / branch-deletion / direct-push-recovery
  checklists, for quick reuse. This SKILL.md is self-sufficient on its
  own; the checklist file is a convenience, not a dependency.
- `evaluations/scenarios.md` — the 12 required scenario walkthroughs
  used to validate this skill's rules before first use.

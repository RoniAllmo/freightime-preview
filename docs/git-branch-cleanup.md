# Git Branch Cleanup

This document describes the actual branch lifecycle this repository uses,
what evidence to gather before considering a branch for deletion, and the
safe inspection commands to gather it. **It does not delete anything
itself, and it does not include a bulk-delete command.** Branch deletion
is a separate, explicitly authorized action — see "Authorization" below.

## The actual repository workflow

- Feature branches are named `claude/<short-description>` and are almost
  always **squash-merged** into `main` via a single Pull Request.
- After a squash merge, the remote feature branch is commonly deleted
  automatically by GitHub (visible as "no remote branch" for a
  long-merged PR, even though the PR itself still references the branch
  name).
- The corresponding **local** feature branch is not automatically
  deleted, and commonly remains in the local clone indefinitely.
- Because a squash merge rewrites history into one new commit on `main`,
  git's own ancestry check does **not** see the original feature branch
  as "merged" — `git branch --merged main` will not list it, even though
  every line the branch introduced is present on `main`.
- As a direct consequence, `git branch -d <branch>` (git's safe delete,
  which refuses to delete a branch containing commits unreachable from
  the current branch) **will typically refuse to delete a squash-merged
  feature branch**, reporting it as "not fully merged."

## Refusal does not prove unique work remains

`git branch -d` refusing to delete a branch is expected, routine
behavior for a squash-merged branch in this repository's normal
workflow — it is not, by itself, evidence that the branch holds work
`main` doesn't already have. Confirm the branch's content actually
landed on `main` (see "Evidence required" below) before treating a
`-d` refusal as a reason to force-delete.

## `git branch -D` is irreversible locally

`git branch -D` force-deletes a branch regardless of merge status. Once
deleted, the branch's commits become unreachable from any ref and are
only recoverable (if at all, and only for a limited window) via
`git reflog` on the machine that had the branch checked out. This
repository does **not** authorize automatic use of `-D` — see
"Authorization" below.

## Remote deletion is a separate action

Deleting a local branch (`git branch -d`/`-D`) never touches the remote.
Deleting a remote branch (`git push origin --delete <branch>`) never
touches any local copy. Treat them as two independent decisions, each
requiring its own evidence and its own authorization — do not assume
one covers the other.

## Evidence required before considering any branch for deletion

Before recommending deletion of a specific branch, confirm **all** of
the following:

1. **Associated Pull Request** — find the PR that was opened from this branch.
2. **PR merged state** — the PR's state is `merged` (not merely `closed`).
3. **Squash commit is on current main** — the PR's squash-merge commit SHA is an ancestor of (or exactly) the current `main` HEAD.
4. **Branch has no open PR** — no other, later PR is currently open from the same branch name.
5. **Branch contains no unique unmerged work** — every file change the branch introduces, compared against its merge-base with `main`, is present in the squashed commit already on `main`.
6. **Branch is not used by a worktree** — `git worktree list` does not show this branch checked out elsewhere.
7. **Branch is not the current branch** — `git branch --show-current` is not this branch.
8. **Working tree is clean** — `git status --short` is empty (no uncommitted work that might be tied to this branch's context).
9. **No relevant stash depends on the branch** — `git stash list` contains nothing that assumes this branch still exists.

## Safe inspection commands

Read-only — none of these delete or modify anything.

```bash
# Current branch and any uncommitted work
git branch --show-current
git status --short

# Every local branch, its upstream, and ahead/behind counts
git branch -vv

# Which local branches git's own ancestry check considers merged
git branch --merged main
git branch --no-merged main

# Remote branches currently on origin (a long-merged branch is commonly already gone here)
git branch -r
git ls-remote --heads origin

# Worktrees using a branch
git worktree list

# Any stash
git stash list

# Confirm a specific branch's squash-merge commit is an ancestor of main
git log main --oneline | grep -F "(#<PR-number>)"

# Compare a branch's own changes against what main already has
git merge-base main <branch-name>
git diff <branch-name> main -- $(git diff --name-only $(git merge-base main <branch-name>) <branch-name>)
```

Use `mcp__github__pull_request_read` (or the GitHub web UI) to look up a
branch's PR number, merged state, and merge commit SHA when working from
an automated session.

## Authorization

- **`git branch -d`** (safe delete) is the default action once every item
  in "Evidence required" above is confirmed true. It refuses on its own
  if the branch is genuinely unmerged, which is itself a useful final
  safety check.
- **`git branch -D`** (force delete) requires **explicit product-owner
  authorization** for that specific branch or set of branches — never
  run automatically, and never as a blanket response to `-d` refusing.
- **Remote branch deletion** (`git push origin --delete <branch>`)
  requires its own **separate, explicit authorization** — confirming a
  local branch is safe to delete does not imply the remote copy (if one
  still exists) is also authorized for deletion.

No task in this repository should perform bulk branch deletion. Delete
branches one at a time, only after the evidence above is gathered for
that specific branch, and only with the authorization level the
deletion actually requires.

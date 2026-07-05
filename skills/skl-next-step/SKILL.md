---
name: skl-next-step
description: "Answer \"what should I do now?\" — the read-only triage advisor. Sweeps the project's skl state — issue loop-* lifecycle labels, open skl-pickup/* PRs + unmerged review branches (skl-run/* / skl-fix/* / skl-refactor/*), Loop-Status plans, and setup/housekeeping drift — prints a CURRENT-STATE snapshot first, then ranks the findings on a fixed unblock-first ladder (setup blockers → unblock the pipeline → start new work → housekeeping), names the SINGLE next step, and offers (human-gated) to run it via the Skill tool. The triage itself changes nothing: no labels, no comments, no branches, no pushes, no file writes. Collectors that can't run (no remote, CLI unauthenticated, no specs/) are skipped with a reason — never an abort."
argument-hint: "(none) — every run is a full sweep"
compatibility: "Richest with a GitHub/GitLab remote + its CLI authenticated (gh / glab — they power the issue + PR collectors); without them it degrades gracefully and still triages local state. Reuses skl-pickup-ticket/resources/pickup-loop.md for provider/host/auth resolution and skl-fix/resources/issue-access.md if a fetch hits an auth wall."
metadata:
  author: "khairul"
  version: "1.0.0"
  source: "skills/skl-next-step"
user-invocable: true
disable-model-invocation: true
---

## User Input

```text
$ARGUMENTS
```

No arguments are expected — every run is a full sweep. Ignore any input.

---

## What this command does

`/skl-next-step` answers **"what should I do now?"**. It sweeps every piece of skl state a project
accumulates — the issue label lifecycle, PRs and review branches awaiting a human, queued plans,
setup + housekeeping drift — prints a **current-state snapshot**, ranks the findings on the fixed
**unblock-first ladder** below, names the **single next step**, then offers (human-gated) to run it.

It is **strictly read-only**: the triage never applies labels, posts comments, creates branches,
pushes, or writes files. Only your explicit pick at the end starts a skill — and that skill owns
its own changes and gates. Like `/skl-help` it reads live state on every run and hard-codes
nothing — no issue numbers, branch names, or versions.

---

## Phase 1 — Sweep (four collectors, all failure-tolerant)

Run all four. A collector that can't run is recorded as `skipped: <reason>` in the snapshot and
the triage proceeds on whatever remains. Absent state (no `specs/`, no state file) = empty
findings, not an error.

1. **Setup** —
   - Initialized? `ls .claude/skills/skl-*/resources/project.config.md 2>/dev/null | head -1`
     (any hit = yes).
   - Spec Kit? `[ -d .specify ]`.
2. **Issues** — needs a GitHub/GitLab remote + authenticated CLI; resolve provider / host / auth
   per `.claude/skills/skl-pickup-ticket/resources/pickup-loop.md` (no remote or unauthenticated →
   skip with reason). Per lifecycle label — `loop-in-progress`, `loop-done`, `loop-needs-info`,
   `loop-deferred`, `loop-ready` — fetch count + oldest, plus the unlabeled-open count:

   ```bash
   # GitHub — for each label L above:
   gh issue list --search "label:\"$L\" state:open sort:created-asc" --limit 50 --json number,title,url,createdAt
   gh issue list --search 'state:open no:label' --limit 50 --json number        # unlabeled candidates
   ```
   ```bash
   # GitLab — same labels; unlabeled via labels=None; self-hosted prefixes GITLAB_HOST=<host>
   glab api "projects/:id/issues?labels=$L&state=opened&order_by=created_at&sort=asc&per_page=50"
   glab api "projects/:id/issues?labels=None&state=opened&per_page=50"
   ```
3. **PRs + review branches** —

   ```bash
   gh pr list --state open --limit 50 --json number,title,headRefName,url      # keep headRefName skl-pickup/*
   # GitLab: glab api "projects/:id/merge_requests?state=opened&per_page=50"   # keep source_branch skl-pickup/*
   BASE=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||'); BASE=${BASE:-main}
   git branch --list 'skl-run/*' 'skl-fix/*' 'skl-refactor/*' 'skl-pickup/*' --no-merged "$BASE"
   ```
4. **Plans + housekeeping** —

   ```bash
   grep -H "^Loop-Status:" specs/*/spec.md 2>/dev/null      # ready | running | deferred | done
   cat .claude/.skl-version 2>/dev/null                     # installed version
   [ -d ~/.skl ] && git -C ~/.skl fetch -q origin && git -C ~/.skl show origin/main:VERSION  # upstream
   git status --porcelain                                   # dirty tree?
   ```
   Plus `.skl-pickup/state.md` if present: the `State:` line, `in_flight`, and the results rows.
   (The `~/.skl` fetch touches only that cache clone, never the project — the read-only invariant
   is about project state.)

**Stranded check:** a `loop-in-progress` issue is **stranded** when no loop can be waiting on
it — `.skl-pickup/state.md` is absent, says `State: exited(...)`, or says
`State: waiting(next poll <t>)` with `<t>` already in the past. Otherwise report it as *in flight
(a loop appears active)* — informational, not a recommendation.

---

## Phase 2 — Triage: the unblock-first ladder (fixed, deterministic)

Rank every finding by tier, **oldest first within a tier**. Same state in → same order out — no
agent spawn, no judgment calls beyond this ladder.

- **T0 — Setup blockers.** Not initialized (no `project.config.md` / no `.specify/`) →
  **`/skl-init`**. Always the top recommendation when present.
- **T1 — Unblock the pipeline** (in this order):
  1. **Stranded `loop-in-progress`** → resume **`/skl-pickup-ticket`** (its resume tier re-picks it).
  2. **`loop-done` issues / open `skl-pickup/*` PRs** → *review & merge the PR* (human — link it).
  3. **Unmerged `skl-run/*` / `skl-fix/*` / `skl-refactor/*` branches** → *review & merge* (human).
  4. **`loop-needs-info` issues** → *answer the comment, remove the label, re-add `loop-ready`* (human).
  5. **`loop-deferred` issues + `Loop-Status: deferred` plans** → *human rescue: read the commented
     findings, fix or re-scope*.
- **T2 — Start new work** (in this order):
  1. `Loop-Status: ready` plans → **`/skl-run`**.
  2. Non-empty `loop-ready` queue → **`/skl-pickup-ticket`**.
  3. Unlabeled open issues → *curate: promote workable ones to `loop-ready`* (human), or file new
     ones via **`/skl-create-ticket`**.
- **T3 — Housekeeping:** installed version behind upstream → **`/skl-update`** · dirty working
  tree (commit or stash — human) · stale `.skl-pickup/state.md` (e.g. `State: exited` leftovers —
  informational only, no action needed).

**Empty fallback:** nothing found in any tier (a healthy, drained project) → recommend queueing
new work: **`/skl-plan <next feature>`** (or `/skl-create-ticket`). There is always a next step.

---

## Phase 3 — Report

Print **state first, then advice**. The snapshot shows **every** collector — including
healthy/zero lines — so the whole picture is visible at a glance; the recommended steps show only
non-empty tiers, one line per finding: what was found, count/id, and the exact command (or human
action). Shape (values are examples):

```text
# skl — current state                    (github · base: main)

## Issues (loop-* lifecycle)
- loop-ready: 2 (oldest #14, 3d)         - loop-needs-info: 1 — #17 (awaiting your answers)
- loop-in-progress: 1 — #12 ⚠ stranded   - loop-deferred: 0
- loop-done: 1 — #9 (PR #31 open)        - unlabeled open: 4

## PRs & review branches
- open skl-pickup PRs: 1 — #31 (closes #9)
- unmerged review branches: skl-run/0705-1130

## Plans (specs/)
- ready: 2 (004-export-csv, 006-dark-mode) · running: 0 · deferred: 1 (005-retry-queue)

## Setup & housekeeping
- config: OK · Spec Kit: OK · version: 1.3.0 installed → 1.4.0 upstream (update available)
- working tree: clean · pickup state: exited (2 results logged)
- skipped: (none)

## Recommended steps (unblock-first)
1. [T1] ⚠ #12 is stranded on loop-in-progress → /skl-pickup-ticket (resumes it first)
2. [T1] Review & merge PR #31 (closes #9, loop-done) — human: <url>
3. [T1] Review & merge branch skl-run/0705-1130 — human
4. [T1] Answer #17's needs-info comment, re-label loop-ready — human: <url>
5. [T1] Rescue deferred plan 005-retry-queue (read its findings, fix or re-scope) — human
6. [T2] 2 ready plans → /skl-run
7. [T2] 2 loop-ready tickets → /skl-pickup-ticket
8. [T2] Curate 4 unlabeled issues — promote workable ones to loop-ready — human
9. [T3] Update skl 1.3.0 → 1.4.0 → /skl-update

Next step: /skl-pickup-ticket — #12 was claimed but no loop is running; resuming it frees the
oldest in-flight work before anything new starts.
```

---

## Phase 4 — The offer (the only interactive moment)

1. Determine the **top pick** — the first recommended step. If it is **human-only** (review /
   merge / answer / curate), it stays the named *Next step*, and the **run offer** falls to the
   highest *runnable* recommendation (one that maps to a skl skill).
2. Fire the await-input ping:
   `bash ~/.claude/notify-telegram.sh "[<project>] /skl-next-step → <top pick, one line> — awaiting your choice"`
   (skip silently if the notifier is absent).
3. `AskUserQuestion` — exactly three options:
   - **Run it now** — the label carries the command (e.g. "Run /skl-run"); on pick, invoke it via
     the **Skill tool** with the derived arguments. That skill owns everything from there
     (its own gates, prompts, Telegram pings).
   - **Pick another** — a second `AskUserQuestion` listing up to 4 runnable recommendations,
     top-down; invoke the choice via the Skill tool.
   - **Just the report** — end the turn; nothing is invoked.
4. **No runnable recommendation at all** (every finding is human-only) → skip the offer: the
   report itself is the deliverable; end the turn.

---

## Rules & invariants

- **Strictly read-only triage.** The triage never applies labels, posts comments, creates
  branches, pushes, or writes files. Only the user's explicit pick starts a skill — and that
  skill owns its own changes and gates.
- **Deterministic ranking.** The ladder is the whole policy: same state in → same recommendation
  out. No BA-agent scoring, no per-run judgment calls.
- **Failure-tolerant.** Any collector may be skipped with a reason; the triage runs on whatever
  remains. Absent state = empty findings, not an error.
- **Human-gated execution.** Nothing auto-runs; the offer goes through `AskUserQuestion`, and
  "Just the report" is always available.
- **Dynamic.** Reads live state on every run — never caches, never hard-codes ids, branches, or
  versions.
- **Telegram** prefix `[<project>]` (repo basename): one await-input ping immediately before the
  offer; none after (read-only, single turn); skip silently if `~/.claude/notify-telegram.sh` is
  absent.

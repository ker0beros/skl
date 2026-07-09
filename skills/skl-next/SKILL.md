---
name: skl-next
description: "Answer \"what should I do now?\" — the read-only triage advisor. Sweeps the project's skl state — issue loop-* lifecycle labels, open skl-do/* PRs, and setup/housekeeping drift — prints a CURRENT-STATE snapshot first, then ranks the findings on a fixed unblock-first ladder (setup blockers → unblock the pipeline → start new work → housekeeping), names the SINGLE next step, and offers (human-gated) to run it via the Skill tool. The triage itself changes nothing: no labels, no comments, no branches, no pushes, no file writes. Collectors that can't run (no remote, CLI unauthenticated, no specs/) are skipped with a reason — never an abort."
argument-hint: "(none) — full sweep. `--post` publishes a deduped L1 digest to a Discussion (report-only); add `--dry-run` to preview without posting."
compatibility: "Richest with a GitHub/GitLab remote + its CLI authenticated (gh / glab — they power the issue + PR collectors); without them it degrades gracefully and still triages local state. Reuses skl-do/resources/pickup-loop.md for provider/host/auth resolution and skl-do/resources/issue-access.md if a fetch hits an auth wall."
metadata:
  author: "khairul"
  version: "1.2.0"
  source: "skills/skl-next"
user-invocable: true
disable-model-invocation: true
---

## User Input

```text
$ARGUMENTS
```

Interactive default: no arguments — a full sweep (Phases 1–4). Two report-only flags:
- `--post` — after the sweep + ladder, publish a deduped digest per `resources/l1-post.md` instead of the interactive offer. Implies unattended (no prompts).
- `--post --dry-run` — render the digest + hash and print would-post/would-skip; write nothing.

---

## What this command does

`/skl-next` answers **"what should I do now?"**. It sweeps every piece of skl state a project
accumulates — the issue label lifecycle, open PRs awaiting a human, setup + housekeeping drift —
prints a **current-state snapshot**, ranks the findings on the fixed **unblock-first ladder** below,
names the **single next step**, then offers (human-gated) to run it.

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
   per `.claude/skills/skl-do/resources/pickup-loop.md` (no remote or unauthenticated →
   skip with reason). Per lifecycle label — `loop-in-progress`, `loop-done`, `loop-needs-info`,
   `loop-human`, `loop-deferred`, `loop-ready` — fetch count + oldest, plus the unlabeled-open count:

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
3. **PRs** —

   ```bash
   gh pr list --state open --limit 50 --json number,title,headRefName,url,createdAt   # keep headRefName skl-do/*
   # GitLab: glab api "projects/:id/merge_requests?state=opened&per_page=50"   # keep source_branch skl-do/*
   # oldest first via createdAt; a PR's issue number is the <n> in its skl-do/<n>-<slug> head branch
   ```
   Each open `skl-do/*` PR corresponds to a `loop-done` ticket awaiting a human review + merge.
4. **Housekeeping** —

   ```bash
   cat .claude/.skl-version 2>/dev/null                     # installed version
   [ -d ~/.skl ] && git -C ~/.skl fetch -q origin && git -C ~/.skl show origin/main:VERSION  # upstream
   git status --porcelain                                   # dirty tree?
   ```
   Plus `.skl-do/state.md` if present: the `State:` line and the `in_flight` ticket.
   (The `~/.skl` fetch touches only that cache clone, never the project — the read-only invariant
   is about project state.)

**Stranded check:** a `loop-in-progress` issue is **stranded** when no run is working it —
`.skl-do/state.md` is absent or says `State: done`. Otherwise (`State: running`) report it as
*in flight (a run appears active)* — informational, not a recommendation.

---

## Phase 2 — Triage: the unblock-first ladder (fixed, deterministic)

Rank every finding by tier, **oldest first within a tier**. Same state in → same order out — no
agent spawn, no judgment calls beyond this ladder.

- **T0 — Setup blockers.** Not initialized (no `project.config.md` / no `.specify/`) →
  **`/skl-init`**. Always the top recommendation when present.
- **T1 — Unblock the pipeline** (in this order):
  1. **Stranded `loop-in-progress`** → resume **`/skl-do`** (its resume tier re-picks it).
  2. **`loop-done` issues / open `skl-do/*` PRs** → *review & merge the PR* (**human** — link it).
  3. **`loop-needs-info` issues** → *answer the comment, remove the label, re-add `loop-ready`* (human).
  4. **`loop-human` issues** → *make the decision / grant the missing access, record it, re-add `loop-ready`* (human).
  5. **`loop-deferred` issues** → *human rescue: read the commented findings, fix or re-scope*.
- **T2 — Start new work** (in this order):
  1. Non-empty `loop-ready` queue → **`/skl-do`** (works the oldest one into a PR, then stops).
  2. Unlabeled open issues → *curate: promote workable ones to `loop-ready`* (human), or file new
     ones via **`/skl-ticket`**.
- **T3 — Housekeeping:** installed version behind upstream → **`/skl-update`** · dirty working
  tree (commit or stash — human) · stale `.skl-do/state.md` (e.g. `State: done` leftovers —
  informational only, no action needed).

**Empty fallback:** nothing found in any tier (a healthy, drained project) → recommend queueing
new work: plan it (Superpowers), then file a ticket via **`/skl-ticket`** and label it `loop-ready`
for **`/skl-do`** to work. There is always a next step.

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
- loop-in-progress: 1 — #12 ⚠ stranded   - loop-human: 1 — #19 (awaiting your decision)
- loop-done: 1 — #9 (PR #31 open)        - loop-deferred: 0
- unlabeled open: 4

## Open PRs
- open skl-pickup PRs: 1 — #31 (closes #9, awaiting your review + merge)

## Setup & housekeeping
- config: OK · Spec Kit: OK · version: 1.3.0 installed → 2.0.0 upstream (update available)
- working tree: clean · pickup state: done
- skipped: (none)

## Recommended steps (unblock-first)
1. [T1] ⚠ #12 is stranded on loop-in-progress → /skl-do (resumes it first)
2. [T1] Review & merge PR #31 (closes #9, loop-done) — human: <url>
3. [T1] Answer #17's needs-info comment, re-label loop-ready — human: <url>
4. [T1] Decide #19's loop-human question, record it, re-label loop-ready — human: <url>
5. [T2] 2 loop-ready tickets → /skl-do (works the oldest, then stops)
6. [T2] Curate 4 unlabeled issues — promote workable ones to loop-ready — human
7. [T3] Update skl 1.3.0 → 2.0.0 → /skl-update

Next step: /skl-do — #12 was claimed but no run is working it; resuming it frees the
oldest in-flight work before anything new starts.
```

---

## Phase 4 — The offer (the only interactive moment)

1. Determine the **top pick** — the first recommended step. If it is **human-only** (review /
   merge / answer / curate), it stays the named *Next step*, and the **run offer** falls to the
   highest *runnable* recommendation (one that maps to a skl skill). **No runnable
   recommendation at all** (every finding is human-only) → skip the offer entirely — no ping, no
   question: the report itself is the deliverable; end the turn.
2. Fire the await-input ping:
   `bash ~/.claude/notify-telegram.sh "[<project>] /skl-next → <top pick, one line> — awaiting your choice"`
   (skip silently if the notifier is absent).
3. `AskUserQuestion` — exactly three options:
   - **Run it now** — the label carries the command (e.g. "Run /skl-do"); on pick, invoke it
     via the **Skill tool** with the derived arguments. That skill owns everything from there
     (its own gates, prompts, Telegram pings).
   - **Pick another** — a second `AskUserQuestion` listing up to 4 runnable recommendations,
     top-down; invoke the choice via the Skill tool.
   - **Just the report** — end the turn; nothing is invoked.

---

## Phase 4′ — Posting mode (`--post`, report-only)

When invoked with `--post`, skip Phase 4's interactive offer. Reuse Phase 1 (sweep) + Phase 2
(ladder) to build the state, then follow **`resources/l1-post.md`**: compute the digest hash,
compare to the rolling thread's last posted hash, and append a dated comment **only if it
changed** (silent otherwise). `--dry-run` stops before any write and prints the digest + decision.
This is the sole path in this skill that writes anything, and it writes only to its own digest
thread — see the invariant below.

---

## Rules & invariants

- **Strictly read-only triage.** The triage never applies labels, posts comments, creates
  branches, pushes, or writes files. Only the user's explicit pick starts a skill — and that
  skill owns its own changes and gates.
- **`--post` is the one bounded exception.** It writes to NOTHING but its own rolling digest
  thread (create once, append on change). No labels, PR comments, branches, or writes to any
  ticket. That single, declared side-effect is what keeps `--post` at L1 (report-only), not L2.
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

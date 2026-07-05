# `/skl-next-step` — triage advisor design

**Date:** 2026-07-05
**Status:** approved (brainstorm 2026-07-05)

## Purpose

A read-only **triage advisor**: sweep every piece of skl state a project accumulates — issue
lifecycle labels, PRs and review branches, queued plans, setup/housekeeping drift — rank the
findings on a fixed **unblock-first** ladder, print a compact dashboard, name **the single next
step**, then offer to launch it (human-gated, one keystroke from advice to action).

It answers the question every skl user has between loops: *"what should I do now?"*

## Interaction model

**Recommend + offer to run.** The triage itself changes nothing. After the dashboard:

1. Print **"Next step:"** — the top-ranked item + a one-line why.
2. Fire the await-input Telegram ping, then `AskUserQuestion`:
   - **Run it now** — only offered when the top pick maps to a skl skill; invoked via the Skill
     tool with the right arguments (e.g. `skl-run`, `skl-pickup-ticket #N`).
   - **Pick another** — the top ~3 findings as options.
   - **Just the report** — end the turn, nothing invoked.
3. If the top pick is a **human-only action** (e.g. "review & merge PR #12"), it is shown as an
   instruction with its URL/command, and the *run* offer falls to the highest **runnable** item.

## Sweep — four collectors, all failure-tolerant

| Collector | Reads | Findings |
|---|---|---|
| **Setup** | `.claude/skills/skl-*/resources/project.config.md`, `.specify/` | missing config / Spec Kit → project not initialized |
| **Issues** | git remote → provider (`gh`/`glab`), commands reused from `skl-pickup-ticket/resources/pickup-loop.md` | per `loop-*` label: count + oldest for `loop-in-progress` (possibly stranded), `loop-done`, `loop-needs-info`, `loop-deferred`, `loop-ready`; count of open **unlabeled** issues (promotion candidates) |
| **PRs + branches** | open PRs from `skl-pickup/*`; local unmerged `skl-run/*` / `skl-fix/*` / `skl-refactor/*` / `skl-pickup/*` branches vs the base branch | work awaiting human review/merge |
| **Plans + housekeeping** | `specs/*/spec.md` `Loop-Status` (ready / running / deferred); installed `.claude/.skl-version` vs upstream (`git -C ~/.skl fetch -q origin && git -C ~/.skl show origin/main:VERSION`, skip if `~/.skl` absent); `git status`; `.skl-pickup/state.md` (in-flight, `State:`) | ready plans, deferred plans, update available, dirty tree, stale loop state |

A collector that cannot run (no remote, CLI unauthenticated, no `specs/`, no state file) degrades
to a `skipped: <reason>` line in the dashboard — **never an abort**. Absent state = empty
findings, not errors.

## Triage ladder — fixed, deterministic

Oldest-first within a tier. No agent spawn; the rubric lives in the SKILL.md.

- **T0 — Setup blockers.** No `project.config.md` / no `.specify/` → `/skl-init`. Nothing else
  works right without it; always the top recommendation when present.
- **T1 — Unblock the pipeline** (work already in flight that a human or a resume can free):
  1. Stranded `loop-in-progress` (label present but state.md shows no running loop) → resume
     `/skl-pickup-ticket`.
  2. `loop-done` issues / open `skl-pickup/*` PRs → **review & merge the PR** (human).
  3. Unmerged `skl-run/*` / `skl-fix/*` / `skl-refactor/*` review branches → **review & merge**
     (human).
  4. `loop-needs-info` issues → **answer the comment**, remove the label, re-add `loop-ready`
     (human).
  5. `loop-deferred` issues + `Loop-Status: deferred` plans → **human rescue** (read the
     commented findings, fix or re-scope).
- **T2 — Start new work:**
  1. `Loop-Status: ready` plans → `/skl-run`.
  2. Non-empty `loop-ready` queue → `/skl-pickup-ticket`.
  3. Unlabeled open issues → curate: promote the good ones to `loop-ready` (human), or file new
     ones via `/skl-create-ticket`.
- **T3 — Housekeeping:** installed `.claude/.skl-version` behind upstream → `/skl-update`; dirty
  working tree; stale `.skl-pickup/state.md` (e.g. `State: exited` with leftovers).

## Output format

A compact dashboard of **only the non-empty tiers** — one line per finding: what was found, the
count/id, and the exact command (or human action). Then the **Next step** line and the offer.
Skipped collectors are listed at the bottom with their reason.

## Rules & invariants

- **Strictly read-only triage.** Never applies labels, comments, branches, pushes, or file writes.
  Only the user's explicit pick starts a skill — and that skill owns its own changes and gates.
- **Dynamic.** Reads live state on every run; hard-codes no issue numbers, branch names, or
  versions. Same posture as `/skl-help`.
- **Deterministic ranking.** Same state in → same recommendation out. The ladder is the spec;
  no BA-agent scoring (considered, rejected: slower, costlier, less predictable).
- **Failure-tolerant.** Any collector may be skipped with a reason; triage runs on whatever
  remains.
- **Human-gated execution.** `Run it now` goes through `AskUserQuestion`; nothing auto-runs.
- **Telegram** per global rule: `[<project>]`-prefixed await-input ping immediately before the
  offer question. No completion ping needed (read-only, single turn).

## Structure & release

- **One self-contained `skills/skl-next-step/SKILL.md`** — no own `resources/`: the rubric is
  ~15 lines, and provider commands are reused from `skl-pickup-ticket/resources/pickup-loop.md`
  (cross-skill reuse precedent: pickup-ticket ↔ skl-fix's `issue-access.md`).
- Frontmatter follows house style: `user-invocable: true`, `disable-model-invocation: true`,
  `argument-hint` = none (no arguments; every run is a full sweep).
- **Release rule:** VERSION `1.3.0` → **`1.4.0`** (new skill = minor) + CHANGELOG section +
  README table row + "What's in here" line + a home in `/skl-help`'s grouped list (under
  **Help**: `skl-help` · `skl-next-step`), so it never lands in "Other".

## Alternatives considered

- **Read-only report only** (no run offer) — simplest, but leaves the user re-typing the command
  the triage just derived. Rejected in favor of a human-gated offer.
- **Auto-run top pick** — violates the repo's human-gate posture for state-changing loops.
  Rejected.
- **BA-agent scored / hybrid ranking** — smarter about issue content but slower, costlier,
  non-deterministic. Rejected; the fixed ladder is explainable and free.

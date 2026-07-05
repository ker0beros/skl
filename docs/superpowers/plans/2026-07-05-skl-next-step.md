# /skl-next-step Triage Advisor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/skl-next-step` — a read-only triage advisor that sweeps all skl state, prints a current-state snapshot, ranks findings on a fixed unblock-first ladder, and offers (human-gated) to run the next step.

**Architecture:** One self-contained `skills/skl-next-step/SKILL.md` (no own `resources/` — provider commands are reused from `skl-pickup-ticket/resources/pickup-loop.md`), plus release chores (skl-help grouping, README, VERSION 1.4.0, CHANGELOG). Spec: `docs/superpowers/specs/2026-07-05-skl-next-step-design.md`.

**Tech Stack:** Markdown skill files only (no executable code). "Tests" are subagent wording tests per superpowers:writing-skills — seed a fresh subagent with the skill text + a synthetic state, verify the triage order it produces.

## Global Constraints

- Release rule (repo `CLAUDE.md`): this change MUST ship with `VERSION` bumped 1.3.0 → **1.4.0** and a matching `## 1.4.0 — 2026-07-05` section at the TOP of `CHANGELOG.md`.
- Commits land on `dev`; never push or merge to main/dev as part of this plan — the user decides merge/push.
- The read-only invariant, verbatim everywhere it appears: *the triage never applies labels, posts comments, creates branches, pushes, or writes files.*
- Ladder tier order is fixed: **T0 setup blockers → T1 unblock the pipeline → T2 start new work → T3 housekeeping**; within T1: stranded → loop-done PRs → review branches → needs-info → deferred; within T2: ready plans → loop-ready queue → unlabeled curation. Oldest-first within a tier.
- Output order is fixed: **current-state snapshot first** (all collectors, including healthy/zero lines), **recommended steps second** (non-empty tiers only), then the Next-step line + offer.
- House style: match the existing skills' bold-label bullets, `backtick` literals, long descriptive frontmatter `description`, `user-invocable: true`, `disable-model-invocation: true`.

---

### Task 1: Create `skills/skl-next-step/SKILL.md`

**Files:**
- Create: `skills/skl-next-step/SKILL.md`

**Interfaces:**
- Produces: the skill name `skl-next-step`, the four collector names (Setup / Issues / PRs + review branches / Plans + housekeeping), the ladder tiers T0–T3, and the three offer options (Run it now / Pick another / Just the report). Tasks 2–5 reference these verbatim.

- [ ] **Step 1: Write the file with exactly this content**

````markdown
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
````

- [ ] **Step 2: Verify the file parses as a skill**

Run: `head -15 skills/skl-next-step/SKILL.md`
Expected: YAML frontmatter opens/closes with `---`, `name: skl-next-step` on line 2, `user-invocable: true` present.

Run: `grep -c '^## ' skills/skl-next-step/SKILL.md`
Expected: `12` — 7 section headers (User Input, What this command does, Phase 1, Phase 2, Phase 3, Phase 4, Rules & invariants) + 5 `## ` lines inside the Phase 3 fenced example (grep can't see fences).

- [ ] **Step 3: Commit**

```bash
git add skills/skl-next-step/SKILL.md
git commit -m "feat(skl-next-step): read-only triage advisor — state snapshot + unblock-first next step + human-gated offer"
```

---

### Task 2: Subagent wording tests (two scenarios)

**Files:**
- Modify (only if a test fails): `skills/skl-next-step/SKILL.md`

**Interfaces:**
- Consumes: the Phase 2 ladder + Phase 4 offer sections from Task 1, verbatim.
- Produces: verified triage wording (deterministic order + human-only fallback).

- [ ] **Step 1: Scenario A — runnable top pick**

Invoke the Agent tool (`subagent_type: general-purpose`, `run_in_background: false`). The prompt is the literal text below, with `<PASTE PHASE 2>` and `<PASTE PHASE 4>` replaced by the full "Phase 2 — Triage" and "Phase 4 — The offer" sections copied verbatim from `skills/skl-next-step/SKILL.md`:

```
You are executing a read-only triage-advisor skill. Here are its ranking and offer rules, verbatim:

---
<PASTE PHASE 2>

<PASTE PHASE 4>
---

SYNTHETIC STATE (already collected; the project IS initialized, config + Spec Kit present):
- loop-in-progress: #12 (oldest, 5d) — .skl-pickup/state.md says "State: exited(3 empty polls)"
- loop-done: #9 — open PR #31 closes it
- loop-needs-info: #17
- loop-deferred: none · unlabeled open: 0
- ready plans: 004, 006 · deferred plans: none
- loop-ready: #14, #20
- installed 1.3.0, upstream 1.4.0 · tree clean

QUESTION (no tools — just answer): (a) List the recommended steps in exact rank order with their tier tags. (b) Name the top pick. (c) Which single command does the "Run it now" offer carry? Answer compactly.
```

- [ ] **Step 2: Verify Scenario A (expected ranking)**

Expected answer, exactly this order:
(a) 1. [T1] stranded #12 → `/skl-pickup-ticket` · 2. [T1] review & merge PR #31 (human) · 3. [T1] answer #17 needs-info (human) · 4. [T2] ready plans → `/skl-run` · 5. [T2] loop-ready queue → `/skl-pickup-ticket` · 6. [T3] `/skl-update`.
(b) Top pick = resume stranded #12. (c) Run-offer command = `/skl-pickup-ticket`.
If the order differs or the subagent invents a tier, tighten the Phase 2 wording (the ladder's numbered sub-order is the contract), re-run, repeat until it matches.

- [ ] **Step 3: Scenario B — human-only top pick falls back**

Same Agent-tool setup and the same prompt skeleton (both sections verbatim), with the SYNTHETIC STATE block replaced by:

```
SYNTHETIC STATE (already collected; the project IS initialized, config + Spec Kit present):
- loop-in-progress: none · loop-needs-info: none · loop-deferred: none · unlabeled open: 0
- loop-done: #9 — open PR #31 closes it
- ready plans: 004 · loop-ready: none
- installed 1.3.0, upstream 1.4.0 · tree clean
```

And the QUESTION replaced by:

```
QUESTION (no tools — just answer): (a) What is the named "Next step"? (b) Is it runnable by the skill or human-only? (c) Which command does the "Run it now" offer carry instead? Answer in 3 short lines.
```

- [ ] **Step 4: Verify Scenario B (expected fallback)**

Expected: (a) Next step = review & merge PR #31 · (b) human-only · (c) the run offer carries `/skl-run` (the highest runnable item). If the subagent offers to "run" the merge or picks `/skl-update` over `/skl-run`, tighten the Phase 4 step-1 wording, re-run, repeat until it matches.

- [ ] **Step 5: Commit (only if wording was fixed)**

```bash
git add skills/skl-next-step/SKILL.md
git commit -m "fix(skl-next-step): tighten triage/offer wording per subagent test"
```

---

### Task 3: Add `/skl-next-step` to `/skl-help`'s groups + workflow blurb

**Files:**
- Modify: `skills/skl-help/SKILL.md:51` (the Help group line) and `skills/skl-help/SKILL.md:58` (the workflow blockquote sentence "`skl-update` to pull the latest.")

**Interfaces:**
- Consumes: the skill name `skl-next-step` from Task 1.

- [ ] **Step 1: Edit the group list**

In `skills/skl-help/SKILL.md`, replace the line:

```markdown
   - **Help** — `skl-help`
```

with:

```markdown
   - **Help** — `skl-help` · `skl-next-step` (what should I do now?)
```

- [ ] **Step 2: Edit the workflow blurb**

In the step-4 blockquote, replace the sentence ending:

```markdown
   > `skl-update` to pull the latest.
```

with:

```markdown
   > `skl-update` to pull the latest. Not sure what's next? `skl-next-step` triages your
   > issues / PRs / plans into one recommended step.
```

- [ ] **Step 3: Verify**

Run: `grep -n "skl-next-step" skills/skl-help/SKILL.md`
Expected: exactly 2 matching lines (the group line + the blurb).

- [ ] **Step 4: Commit**

```bash
git add skills/skl-help/SKILL.md
git commit -m "feat(skl-help): list skl-next-step under Help + point the workflow blurb at it"
```

---

### Task 4: README — table row + section + repo-layout line

**Files:**
- Modify: `README.md` (three spots: the skill table after the `/skl-pickup-ticket` row; a new section between the `/skl-pickup-ticket` section's closing blockquote and `## /skl-gate`; the "What's in here" tree after the `skills/skl-pickup-ticket/` line)

**Interfaces:**
- Consumes: the skill name + collector/ladder vocabulary from Task 1.

- [ ] **Step 1: Add the table row**

Immediately after the `| **`/skl-pickup-ticket`** | … |` row, insert:

```markdown
| **`/skl-next-step`** | (none) | Read-only **triage advisor** — sweeps issues / PRs / plans / config, prints the **current state**, then recommends the **single next step** on an unblock-first ladder and offers (human-gated) to run it |
```

- [ ] **Step 2: Add the section**

Between the `/skl-pickup-ticket` section's closing blockquote (ends "…human-gate + PR-not-merge posture in practice.") and the `## `/skl-gate`` heading, insert:

````markdown
## `/skl-next-step` — what should I do now?

```
/skl-next-step
```
The read-only **triage advisor**. Sweeps the project's skl state — issue `loop-*` labels, open
`skl-pickup/*` PRs + unmerged review branches (`skl-run/*` / `skl-fix/*` / `skl-refactor/*`),
`Loop-Status` plans, and setup/housekeeping drift — prints a **current-state snapshot** first,
then ranks the findings on a fixed **unblock-first ladder**: setup blockers (`/skl-init`) →
unblock the pipeline (stranded tickets, PRs awaiting merge, `loop-needs-info` answers, deferred
rescues) → start new work (ready plans → `/skl-run`, `loop-ready` queue → `/skl-pickup-ticket`) →
housekeeping (`/skl-update`, dirty tree). It names the single next step and **offers (human-gated)
to run it** — the triage itself changes nothing: no labels, comments, branches, or writes.
Collectors it can't run (no remote, CLI unauthenticated) are skipped with a reason.

````

- [ ] **Step 3: Add the repo-layout line**

In the "What's in here" code block, immediately after the `skills/skl-pickup-ticket/` line, insert:

```text
skills/skl-next-step/  # SKILL.md — read-only triage advisor: current-state snapshot → unblock-first next step + offer
```

- [ ] **Step 4: Verify**

Run: `grep -c "skl-next-step" README.md`
Expected: `4` or more (row, heading, section body, tree line).

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs(README): /skl-next-step — table row, section, repo-layout line"
```

---

### Task 5: Release — VERSION 1.4.0 + CHANGELOG

**Files:**
- Modify: `VERSION` (single line `1.3.0` → `1.4.0`)
- Modify: `CHANGELOG.md` (new section at the top, directly under the intro paragraph, above `## 1.3.0 — 2026-07-05`)

**Interfaces:**
- Consumes: everything shipped in Tasks 1–4.

- [ ] **Step 1: Bump VERSION**

Replace the entire content of `VERSION` with:

```text
1.4.0
```

- [ ] **Step 2: Add the CHANGELOG section**

Insert above the `## 1.3.0 — 2026-07-05` heading:

```markdown
## 1.4.0 — 2026-07-05

- **New skill `/skl-next-step`** — the read-only triage advisor: sweeps issue `loop-*` labels,
  open `skl-pickup/*` PRs + unmerged review branches, `Loop-Status` plans, and setup/housekeeping
  drift; prints a current-state snapshot first, ranks the findings on a fixed unblock-first
  ladder (setup → unblock the pipeline → start new work → housekeeping), names the single next
  step, and offers (human-gated) to run it. Strictly read-only — no labels, comments, branches,
  or writes; collectors it can't run are skipped with a reason.
- skl-help: `skl-next-step` listed under **Help**; the workflow blurb points at it for "what now?".

```

- [ ] **Step 3: Cross-file consistency check**

Run: `cat VERSION && head -8 CHANGELOG.md | tail -2 && grep -l "skl-next-step" README.md skills/skl-help/SKILL.md skills/skl-next-step/SKILL.md`
Expected: `1.4.0`; the `## 1.4.0 — 2026-07-05` heading; all three file paths listed.

- [ ] **Step 4: Commit**

```bash
git add VERSION CHANGELOG.md
git commit -m "feat: release 1.4.0 — /skl-next-step triage advisor"
```

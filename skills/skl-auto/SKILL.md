---
name: skl-auto
description: "The hands-off driver: run /skl-next-step's triage, then PROCEED autonomously through everything already authorized — resume stranded tickets and drain the loop-ready queue via /skl-pickup-ticket (--auto --drain), batch-run ready plans via /skl-run --auto — opening PRs that AUTO-MERGE into dev once CI passes (provider merge-when-green; never main/master; --no-merge opts out). Human-only work (PRs to review, loop-needs-info answers, loop-deferred rescues) is never attempted — it lands in ONE deduped Telegram digest. With --promote[=N] (default OFF) it may also promote up to N unlabeled tickets from TRUSTED authors (repo owner/member/collaborator) to loop-ready — the one sanctioned, flag-gated exception to the human queue gate — and work them. Truly nothing to do → it says so and stops; --alive re-polls every 30 min instead. Zero-prompt by design: it never asks a question."
argument-hint: "(optional) --promote[=N] to allow up to N trusted-author promotions (default OFF, N=1); --alive to re-poll every 30 min when idle; --no-merge to leave PRs for human merge"
compatibility: "Requires skl-next-step, skl-pickup-ticket (with --drain / --merge-on-green), skl-run, skl-fix and skl-feature installed alongside, plus a GitHub/GitLab remote with its CLI authenticated (write scope). Auto-merge additionally needs an automerge_base branch (default dev) that is not main/master, and — GitHub — the repo's allow-auto-merge setting plus required status checks on the base (GitLab: merge-when-pipeline-succeeds). Config (labels, poll interval, automerge_base, automerge_method) is read from skl-pickup-ticket's resources/project.config.md."
metadata:
  author: "khairul"
  version: "1.0.0"
  source: "skills/skl-auto"
user-invocable: true
disable-model-invocation: true
---

## User Input

```text
$ARGUMENTS
```

Parse, in any order (anything else is ignored):
- **`--promote[=N]`** → allow up to **N** trusted-author promotions this run (bare `--promote` = 1).
  Absent → promotion is **OFF** (the default).
- **`--alive`** → never exit on idle; re-poll every `pickup_poll_interval` via `ScheduleWakeup`.
- **`--no-merge`** → do not enable merge-when-green on any PR this run (PRs await a human).

Everything is implicitly **`--auto`**: this skill NEVER asks a question (`AskUserQuestion` is
forbidden here) and propagates zero-prompt mode to every sub-skill it invokes.

---

## What this command does

`/skl-auto` is skl's **hands-off driver** — one command that *does the next thing*. It runs
`/skl-next-step`'s triage, then **proceeds autonomously** through everything a human already
authorized: it resumes stranded tickets and drains the `loop-ready` queue through
`/skl-pickup-ticket`, batch-runs `Loop-Status: ready` plans through `/skl-run`, and opens PRs
that **merge themselves into `dev` once CI passes** (the provider's merge-when-green — never
main/master). Work only a human can do — reviewing PRs, answering `loop-needs-info`, rescuing
`loop-deferred` — is never attempted; it lands in **one deduped Telegram digest**. When there is
truly nothing, it says "nothing to be done" and stops (`--alive` re-polls instead).

It is a **thin driver**: sequencing, promotion policy, merge policy, and the idle loop live here;
every build is delegated — triage = `skl-next-step` Phases 1–2, tickets = `skl-pickup-ticket`
(with `--drain` so control returns), plans = `skl-run`, QA gates = theirs. Autonomy posture: the
default run is **L2+** (pre-authorized work only); **`--promote`** and **`--alive`** are the
explicit loop-engineering **L3+ opt-ins**.

---

## Config (from `.claude/skills/skl-pickup-ticket/resources/project.config.md`; defaults if absent)

- The five lifecycle labels (`pickup_label` … `pickup_needsinfo_label`) and
  **`pickup_poll_interval`** (default 30 m → 1800 s) — pickup's keys, read as-is.
- **`automerge_base`** — merge-when-green target (default **`dev`**; never `main`/`master`).
- **`automerge_method`** — merge method (default **`squash`**).
- Promotion trust (fixed policy, not config): GitHub `author_association` ∈ **OWNER | MEMBER |
  COLLABORATOR**; GitLab project member with **`access_level ≥ 30`** (Developer+). Details +
  commands: `resources/promotion.md`.

---

## Phase 0 — Preconditions & single-flight guard (every entry, including wakeups)

1. **Config + provider.** Read the config above; resolve provider/host/auth per
   `.claude/skills/skl-pickup-ticket/resources/pickup-loop.md`. Auth failure → Telegram + STOP.
2. **Clean tree.** `git status --porcelain` must be empty → else fire
   `bash ~/.claude/notify-telegram.sh "[<project>] /skl-auto ⛔ dirty working tree — commit/stash, then re-run"`
   and **STOP** (even under `--alive`: a 30-min nag loop about a dirty tree is spam).
3. **Starting branch.** Record `git branch --show-current` in the state file; every sub-skill
   invocation starts from here and the cycle ends back here.
4. **Labels.** Ensure the five lifecycle labels exist (pickup Phase-0 commands, idempotent).
5. **Auto-merge preconditions** (skipped under `--no-merge` → merge **off(--no-merge)**):
   - `automerge_base` exists on origin (`git ls-remote --exit-code --heads origin <base>`) and is
     **not** `main`/`master` → else merge **off(<reason>)** (hard refusal — a digest note, never
     an error).
   - GitHub: `gh api repos/{owner}/{repo} --jq .allow_auto_merge` is `true` AND required checks
     exist on the base (`gh api repos/{owner}/{repo}/branches/<base>/protection/required_status_checks`
     — HTTP 404/403 → treat as **no checks**; zero required checks would merge instantly, i.e. on
     the QA panel alone) → else merge **off(<reason>)**.
   - GitLab: `glab api projects/:id --jq .only_allow_merge_if_pipeline_succeeds` is `true`, or
     `glab api "projects/:id/pipelines?per_page=1"` is non-empty → else merge **off(<reason>)**.
   - Record `Merge-on-green: on | off(<reason>)` in the state file. When **on**, Phase 2/3 pass
     `--merge-on-green` to pickup and enable merge-when-green on driver-opened PRs; when **off**,
     PRs open normally for human merge and the reason joins the digest.
6. **Single-flight guard** (ownership-aware, in this order):
   - `.skl-auto/state.md` shows `State: waiting(next poll <t>)` with `<t>` in the **future** → a
     wakeup is already armed → report + **STOP** (never double-arm).
   - `.skl-auto/state.md` shows `State: running` with `Phase: executing(pickup)` or
     `promoting(#<n>)` → an interrupted run → this entry IS the resume: invoke
     `/skl-pickup-ticket --auto --drain` (+ `--merge-on-green` if merge is on) — its resume tier
     re-picks the in-flight ticket — then continue this cycle from Phase 2. For
     `Phase: executing(run)` → re-invoke `/skl-run --auto` (it resumes `running` plans), then
     continue.
   - Otherwise, `.skl-pickup/state.md` live (`State: running`, or `waiting(<t>)` with `<t>`
     future) → **not ours** → report: *"another pickup loop appears active; if none is, run
     `/skl-pickup-ticket --auto --drain` to resume/clear it, or edit its `State:` line to
     `exited(stale)`"* → Telegram + **STOP**.
7. **State file.** Read/create `.skl-auto/state.md` (template: `resources/state-template.md`).
   Fresh manual start → reset `promotions_used: 0`, `State: running`. Wakeup re-entry
   (`waiting(<t>)` with `<t>` ≤ now) → keep `promotions_used`, set `State: running`.

---

## Phase 1 — Triage (reused, strictly read-only)

Execute **Phases 1 and 2 of `.claude/skills/skl-next-step/SKILL.md` exactly as written there** —
the four collectors (failure-tolerant, skipped-with-reason) and the fixed unblock-first ladder.
Do **NOT** execute its Phase 3 (report) or Phase 4 (offer) — no offer, no ping, no question.
Next-step's invariant applies verbatim during this phase: the triage never applies labels, posts
comments, creates branches, pushes, or writes files.

Classify every ranked finding:

- **runnable-preauthorized** — stranded `loop-in-progress` · non-empty `loop-ready` queue ·
  `Loop-Status: ready` plans → **Phase 2**.
- **promotable** — open issues carrying none of the five lifecycle labels (evaluated only in
  **Phase 3**, only under `--promote`).
- **human-only** — `loop-done` issues / open PRs awaiting review · `loop-needs-info` answers ·
  `loop-deferred` issues + `Loop-Status: deferred` plan rescues · unlabeled curation beyond the
  promotion budget → **digest** (Phase 4).
- **report-only** — T3: version drift (NEVER auto-run `/skl-update` — it would refresh this very
  skill mid-session; `/skl-init` likewise), stale pickup state → **digest**.

---

## Phase 2 — Execute pre-authorized work (ladder order)

1. **Sequence:** stranded ticket present → **pickup first**, then plans. No stranded → **plans
   first** (if any ready), then pickup (if the queue is non-empty). Skip an invocation entirely
   when its tier has no findings.
2. Before EACH sub-skill invocation: `git checkout <starting-branch>`, and set
   `Phase: executing(pickup)` / `executing(run)` in the state file (crash-safe resume marker).
3. **Tickets:** invoke (Skill tool) `/skl-pickup-ticket --auto --drain` (+ `--merge-on-green`
   when merge is on). It resumes any in-flight ticket, drains the ready queue — one PR per
   ticket, each merging itself on green when enabled — then exits `State: exited(drained)` and
   control returns here.
4. **Plans:** invoke (Skill tool) `/skl-run --auto`. When it returns with ≥ 1 shipped plan:
   `git push -u origin skl-run/<stamp>`, then open a PR to `automerge_base` (merge **off** → to
   `pr_base_branch` instead, matching pickup's fallback) — title
   `feat: skl-run batch <stamp> (<N> plans)`, body = the per-plan results from
   `.skl-run/report.md` (write it to a scratch temp file first) — and, when merge is on, enable
   merge-when-green (same commands as pickup's, in
   `.claude/skills/skl-pickup-ticket/resources/pickup-loop.md`). 0 shipped → nothing to push;
   deferred plans join the digest.
5. After the LAST invocation: `git checkout <starting-branch>`, clear the `Phase:` marker, and
   record the results in the state file's cycle log.

---

## Phase 3 — Promotion (only under `--promote`)

Preconditions — ALL must hold, else skip to Phase 4: Phase 2 fully drained (pickup exited
`drained`, no ready plans left) · the `loop-ready` queue is empty **right now** ·
`promotions_used < promote_budget`.

Repeat while slots AND candidates remain:

1. **Find the oldest eligible candidate** per `resources/promotion.md`: open, none of the five
   lifecycle labels, **trusted author** (GitHub `author_association` OWNER/MEMBER/COLLABORATOR;
   GitLab member `access_level ≥ 30`). None → done (if unlabeled issues by untrusted authors
   exist, note "unlabeled issues need human curation" for the digest).
2. **Promote:** apply `loop-ready` to `#<n>` (commands in `resources/promotion.md`), increment
   `promotions_used` in the state file (**before** invoking — crash-safe; an attempt consumes a
   slot regardless of outcome), set `Phase: promoting(#<n>)`, fire
   `bash ~/.claude/notify-telegram.sh "[<project>] /skl-auto ⬆ auto-promoted #<n> (<author>, <association>) under --promote (<used>/<budget>)"`.
3. **Work it:** `git checkout <starting-branch>`, then invoke `/skl-pickup-ticket --auto --drain`
   (+ `--merge-on-green` when merge is on) — **loop mode, never `#N` mode**: `#N` mode never
   claims, so the ticket would finish still carrying `loop-ready` (residue → the next cycle
   re-counts it → churn); loop mode claims it cleanly, and its step-2.5 readiness gate routes a
   vague ticket to `loop-needs-info` with a comment (that slot is spent — correct: the reporter
   now knows what to add).
4. Record the outcome (shipped / deferred / needs-info) in the cycle log; clear `Phase:`.

---

## Phase 4 — Digest, report, idle

1. **Digest items:** every human-only + report-only finding, plus `Merge-on-green: off(<reason>)`
   when auto-merge was disabled, plus the "unlabeled issues need human curation" note when
   applicable. Idle (nothing ran, nothing promoted, no items) is itself the digest `(idle)`.
2. **Dedupe:** fingerprint = the sorted item ids (e.g. `PR#31,issue#17,plan-005,update-1.5.0`, or
   `(idle)`). If it differs from the state file's `digest:` line → send ONE compact Telegram
   digest — `bash ~/.claude/notify-telegram.sh "[<project>] /skl-auto 📋 for you: <item> · <item> · …"`
   (idle: `"[<project>] /skl-auto ✅ nothing to be done"`) — and update the fingerprint. Same
   fingerprint → send nothing (no 30-min re-ping of the same facts under `--alive`).
3. **Cycle report** (terminal): the snapshot summary, what ran, results (PRs opened / merging on
   green / promoted / deferred / needs-info), merge mode + reason, promotion budget state, and
   what remains for humans.
4. **Continue or stop:**
   - not `--alive` → `State: exited(cycle-complete)` (idle: `exited(nothing-to-do)`) → **STOP**.
   - `--alive` → `ScheduleWakeup(delaySeconds = pickup_poll_interval, prompt = "/skl-auto <verbatim
     original flags>", reason = "idle re-poll (alive)")`, write `State: waiting(next poll <t>)`,
     and **end the turn**. `promotions_used` carries over (the budget is per run, not per cycle).

---

## Stop conditions

- **Phase 0 failures** — dirty tree, auth failure, foreign live pickup state, already-armed
  wakeup → report (+ Telegram) + STOP.
- **Cycle complete without `--alive`** → STOP (re-run to go again).
- **Systemic error** from a sub-skill (push denied, PR-create permission, auth wall) → Telegram +
  STOP — skipping won't fix a systemic problem.
- **Usage cap mid-run** → the `rate_limit` StopFailure hook alerts; `/skl-resume` re-enters
  **`/skl-auto <same flags>`** (it checks `.skl-auto/state.md` first) and the Phase-0 ownership
  guard resumes the interrupted phase.

---

## Rules & invariants

- **Never merges or pushes to main/master.** Merges happen only into `automerge_base` (default
  `dev`), only via the provider's CI-gated merge-when-green, and only when the Phase-0
  preconditions held. `--no-merge` disables even that. **dev → main promotion is the human gate.**
- **Promotion only under `--promote`.** The flag is the human's standing authorization (the
  loop-engineering **L3+ opt-in**) — the one sanctioned, flag-gated exception to "a human only
  ever sets `loop-ready`" (which stays literally true of `/skl-pickup-ticket` itself: the DRIVER
  applies the label, never pickup). Trusted authors only; budget N per run; an audit ping per
  promotion; only after the authorized queue is drained.
- **T3 is report-only.** NEVER auto-run `/skl-update` (it refreshes the running skill text
  mid-session) or `/skl-init`.
- **Triage is strictly read-only** (next-step's invariant, verbatim).
- **Zero-prompt.** No `AskUserQuestion`, no picker, no approval gate; `--auto` propagates to
  every sub-skill.
- **Reuse, never fork.** Triage = skl-next-step Phases 1–2 · tickets = skl-pickup-ticket · plan
  batches = skl-run · QA gates = theirs. This driver adds sequencing, promotion policy, merge
  policy, and the idle loop — nothing else.
- **Single-pass cycle.** One triage per cycle; work arriving mid-cycle waits for the next cycle
  (or the next `--alive` poll).
- **Branch hygiene.** `git checkout <starting-branch>` before every sub-skill invocation and at
  cycle end — never stack one loop's work on another's leftover branch.
- **Idempotent + resumable.** All driver state lives in `.skl-auto/state.md`; every entry
  re-reads it; `promotions_used` survives wakeups; a fresh manual start resets it.
- **Telegram** prefix `[<project>]`: sub-skills own their per-ticket/per-plan pings; the driver
  adds the promotion audits, the deduped digest, `nothing to be done`, and failure pings; skip
  silently if `~/.claude/notify-telegram.sh` is absent.
- **Known limitation:** a concurrently running `/skl-run` is undetectable (it keeps no live
  state file); the single-flight guard covers pickup and skl-auto itself.

## Working files

- `.skl-auto/state.md` at the repo root (flags, merge mode, promotion budget, phase marker,
  starting branch, digest fingerprint, cycle log, `State:` line).
- Everything else stays under the sub-skills' own dirs (`.skl-pickup/`, `.skl-run/`,
  `specs/<feature>/…`).

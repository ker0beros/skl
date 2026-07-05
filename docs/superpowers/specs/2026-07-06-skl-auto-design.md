# `/skl-auto` — autonomous next-step driver design

**Date:** 2026-07-06
**Status:** approved (risk assessment + plan-agent gap analysis, 2026-07-05/06)

## Purpose

One command that *does the next thing*: run `/skl-next-step`'s triage, then **proceed
autonomously** through everything already authorized; optionally **auto-promote** a trusted
ticket when the queue is dry; **auto-merge** loop PRs into `dev` when CI is green; and say
"nothing to be done" when that is the truth.

`/skl-auto` is a **thin driver** — it owns sequencing, promotion, merging policy, and the
idle loop, and delegates every build to the existing QA-gated machinery (`/skl-pickup-ticket`,
`/skl-run`). It reuses `/skl-next-step`'s Phase 1+2 (collectors + unblock-first ladder) by
reference and never triggers its Phase 3/4 report/offer.

## Autonomy posture (loop-engineering)

- Default run = **L2+**: executes only pre-authorized work — tickets a human labeled
  `loop-ready`, plans a human queued via `/skl-plan`, in-flight tickets to resume.
- **`--promote[=N]`** (default OFF, N=1) = the explicit **L3+ opt-in** and the one sanctioned
  exception to "a human only ever sets `loop-ready`" — passing the flag IS the human's
  standing authorization. Guardrails: trusted authors only (GitHub `author_association` ∈
  OWNER/MEMBER/COLLABORATOR; GitLab project member with `access_level ≥ 30`/Developer),
  only after all pre-authorized work is drained, budget N per run, one at a time, an audit
  Telegram ping per promotion. Pickup's own invariant text stays literally true — pickup
  never applies `loop-ready`; the driver does, under this flag.
- **`--alive`** = L3 indefinite: re-poll every 30 min when idle (`ScheduleWakeup`).
- **Auto-merge is default-ON, dev-only** (`--no-merge` opts out): the human gate moves from
  per-PR merges to **dev → main promotion**. Never main/master — hard refusal.

## Flags

| Flag | Default | Meaning |
|---|---|---|
| `--promote[=N]` | off (N=1) | allow up to N trusted-author promotions this run |
| `--alive` | off | never exit on idle; re-poll every `pickup_poll_interval` |
| `--no-merge` | off (merge on) | do not enable merge-when-green on any PR this run |

Everything is implicitly `--auto`: zero prompts, no `AskUserQuestion`, ever.

## Auto-merge design

- Config: `automerge_base` (default **`dev`**), `automerge_method` (default **`squash`**),
  read from pickup's `project.config.md` (fallback defaults if absent).
- **Phase 0 preconditions, checked once per run** — ALL must hold, else PRs open normally
  for human merge + one digest note (today's behavior):
  - `automerge_base` exists and is **not** `main`/`master` (hard refusal of the merge step);
  - GitHub: repo `allow_auto_merge` is true (`gh api repos/{owner}/{repo} --jq
    .allow_auto_merge`) AND required status checks exist on the base
    (`gh api repos/{owner}/{repo}/branches/<base>/protection/required_status_checks` —
    404/403 → treat as **no checks** → skip auto-merge; zero required checks would merge
    instantly, i.e. merging on the QA panel alone);
  - GitLab: `only_allow_merge_if_pipeline_succeeds` is true, or the project demonstrably
    runs pipelines.
- **Mechanism — the provider merges, not us:** immediately after PR/MR creation, run
  `gh pr merge <n> --auto --<method>` / `glab mr merge <iid> --auto-merge`. CI green →
  provider merges; no polling, no wait states in the driver.
- **Scope — unified:** ticket PRs (pickup, via its new `--merge-on-green` flag) AND plan
  batches — after `/skl-run --auto` returns, the **driver** pushes `skl-run/<stamp>`, opens
  a PR to `automerge_base` (title `feat: skl-run batch <stamp> (<N> plans)`, body = per-plan
  results), and enables merge-when-green. `/skl-run` itself is untouched (driver-owned push).
- `loop-done` semantics under auto-merge: "PR up, merges itself on green CI" — the issue
  still closes via `Closes #n` at merge.

## Flow

**Phase 0 — Preconditions + single-flight guard.** Pickup-style checks (config, provider +
auth, lifecycle labels exist; **dirty tree = hard STOP + ping**, even under `--alive`).
Record the **starting branch**. Auto-merge precondition check (above). Guard, ownership-aware:

- `.skl-pickup/state.md` live (`running`, or `waiting(<future t>)`) and NOT owned by an
  skl-auto run → report + STOP. The report includes the manual override: "if no loop is
  actually running, run `/skl-pickup-ticket --auto --drain` to resume/clear it, or edit the
  `State:` line to `exited(stale)`".
- `.skl-auto/state.md` shows an interrupted `executing(pickup)` phase → this re-entry is a
  **resume**: re-invoke `/skl-pickup-ticket --auto --drain [--merge-on-green]` (its resume
  tier re-picks the in-flight ticket), then continue the cycle — no self-deadlock.
- `.skl-auto/state.md` `waiting(<future t>)` → a wakeup is already armed → report + STOP.

Read/create `.skl-auto/state.md` (template in `resources/state-template.md`).

**Phase 1 — Triage (reused, read-only).** Execute `.claude/skills/skl-next-step/SKILL.md`
Phases 1+2 exactly as written; skip its Phases 3–4. Classify every finding:
**runnable-preauthorized** (stranded, `loop-ready` queue, ready plans) / **promotable**
(unlabeled trusted-author issues — only meaningful under `--promote`) / **human-only**
(`loop-done` PRs, needs-info answers, deferred rescues, curation) / **report-only** (T3:
version drift, stale state — never auto-run `/skl-update` or `/skl-init`).

**Phase 2 — Execute pre-authorized work (ladder order).**

- Stranded `loop-in-progress` and/or non-empty `loop-ready` queue →
  **`/skl-pickup-ticket --auto --drain [--merge-on-green]`** — one invocation covers the
  resume tier then the queue, then exits `drained` and returns control.
- `Loop-Status: ready` plans → **`/skl-run --auto`**, then the driver pushes the
  `skl-run/<stamp>` integration branch, opens the batch PR, enables merge-when-green.
- Sequencing: stranded present → pickup first; else skl-run first, then pickup.
- **Branch restore:** `git checkout <starting-branch>` before each sub-skill invocation and
  at cycle end (skl-run branches off the current branch; pickup ends on the last
  `skl-pickup/*` branch — never stack one loop's work on another's leftover branch).
- Update the state phase marker around each invocation (`executing(pickup)` /
  `executing(run)` → crash-safe resume per Phase 0).

**Phase 3 — Promotion (only under `--promote`).** Preconditions: Phase 2 drained AND the
`loop-ready` queue is empty AND `promotions_used < N`. Then, per `resources/promotion.md`:
oldest open issue carrying **none of the five configured lifecycle labels** whose author is
trusted → apply `loop-ready` → **increment `promotions_used` in the state file** (before
invoking — crash-safe; an attempt consumes a slot regardless of outcome) → Telegram
`auto-promoted #<n> under --promote` → **`/skl-pickup-ticket --auto --drain
[--merge-on-green]` in loop mode**. Loop mode (not `#N`): single-ticket mode never claims,
so the ticket would finish still carrying `loop-ready` (residue → re-triage churn; under
`--alive`, an infinite 30-min loop on a vague ticket). Loop mode claims cleanly and its
step-2.5 readiness gate routes vague tickets to `loop-needs-info`. Slots remaining +
candidates remaining → repeat.

**Phase 4 — Digest, report, idle.**

- **One Telegram digest** of human-only + report-only findings, **fingerprint-deduped**: the
  state file stores the last digest's sorted item ids (`PR#31,issue#17,plan-005,update-1.5.0`);
  re-send only when the set changes (else the same unmerged PR re-pings every 30 min forever
  under `--alive`).
- Print the cycle report: snapshot, what ran, results (PRs opened / merged-on-green pending /
  promoted / deferred / needs-info), what's left for humans.
- Idle (nothing ran, nothing promotable, no digest-worthy findings) → Telegram
  `nothing to be done` + STOP; under `--alive` → `ScheduleWakeup(pickup_poll_interval,
  "/skl-auto <verbatim flags>", "idle re-poll (alive)")`, `State: waiting(next poll <t>)`,
  end turn. `promotions_used` survives wakeups (budget is per run); a fresh manual start
  resets it (pickup's reset semantics).

## Required amendments to existing skills

- **`skl-pickup-ticket --drain`** — driver-invocation mode: on the FIRST empty poll, write
  `State: exited(drained)`, brief report, STOP — no `ScheduleWakeup`, no empty-poll counter,
  no wait ping. Mutually exclusive with `--alive` (refuse with a message). Without this,
  pickup's empty-poll wakeup re-fires *pickup* and the driver's later phases are unreachable.
- **`skl-pickup-ticket --merge-on-green`** — PR base becomes `automerge_base`; immediately
  after PR/MR creation, run the provider merge-when-green command; `loop-done` = "merges
  itself on green".
- **`skl-resume`** — resume inference checks `.skl-auto/state.md` BEFORE
  `.skl-pickup/state.md` and re-enters `/skl-auto <flags>` (else a usage-cap resume restarts
  the inner pickup directly and the driver's digest/promotion phases are silently dropped).

## Structure

```
skills/skl-auto/SKILL.md                    # the driver (sequencing, flags, phases, invariants)
skills/skl-auto/resources/state-template.md # .skl-auto/state.md shape (flags, promotions_used,
                                            #   phase marker, starting branch, digest fingerprint,
                                            #   cycle log, State line)
skills/skl-auto/resources/promotion.md      # eligibility + label-apply commands (gh/glab), trusted
                                            #   sets, calibration notes
```

Config comes from **pickup's** `resources/project.config.md` (labels, poll interval, +
`automerge_base` / `automerge_method` / promotion keys with in-skill defaults) — no
`/skl-init` changes needed.

## Rules & invariants

- **Never pushes/merges to main/master.** Dev merges happen only via the provider's
  CI-gated merge-when-green; `--no-merge` or failed preconditions → no merge-enable anywhere.
- **Promotion only under `--promote`** — trusted authors, budget N, after the authorized
  queue is drained; every promotion is Telegram-audited.
- **T3 report-only.** Never auto-runs `/skl-update` (it would refresh the running skill text
  mid-session) or `/skl-init`.
- **Triage is strictly read-only** (inherits next-step's invariant verbatim).
- **Single-pass cycle.** Triage once → execute → promote → digest; new arrivals wait for the
  next cycle (or the next `--alive` poll).
- **Zero-prompt.** No `AskUserQuestion` anywhere; implicit `--auto` propagates to sub-skills.
- **Reuse, never fork.** Triage = next-step Phases 1+2; queue/ticket machinery = pickup;
  plan batches = skl-run; QA gates = theirs.
- **Telegram** prefix `[<project>]`: per-event pings come from the sub-skills; the driver adds
  the promotion audit ping, the deduped digest, `nothing to be done`, and failure pings.
- **Known limitation:** a concurrently running `/skl-run` is undetectable (it has no live
  state file); the single-flight guard covers pickup and skl-auto itself.

## Alternatives considered

- **Promotion via `/skl-pickup-ticket #N`** — rejected: `#N` mode never claims, leaving
  `loop-ready` residue after both success (`+ loop-done`) and needs-info (`+ loop-needs-info`)
  → the next triage re-counts it; infinite churn under `--alive`.
- **Driver polls CI then merges** — rejected: the provider's native merge-when-green
  (`gh pr merge --auto` / GitLab MWPS) is race-free and needs no wait states.
- **Always-on promotion (original ask)** — rejected in the risk assessment: dissolves the
  human gate; anyone who can file an issue steers an autonomous PR-writing loop
  (prompt-injection surface). Flag + trusted-author + budget instead.
- **Riding on `.skl-pickup/state.md`** — rejected: pickup owns and resets that file;
  `promotions_used`, the phase marker, and the digest fingerprint must survive wakeups
  independently.
- **`gh issue list --json authorAssociation`** — impossible: the field is not exposed by
  `gh --json` (verified against gh 2.94.0); REST `gh api` + `.author_association` instead.

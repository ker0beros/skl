# .skl-do/state.md — durable progress checkpoint (template)

> `/skl-do` reads/writes this file at the repo root **at every phase and iteration boundary**. It is
> the durable checkpoint that makes a ticket **resumable in a fresh context**: after a usage cap, a
> crash, or a context `/clear`, `/skl-resume` re-reads this file + the `loop-in-progress` label + the
> per-build `specs/<feature>/.skl-do/` artifacts and continues the **same** ticket from exactly where
> it stopped. Copy this shape on first run; keep it current as you go.

```md
# skl-do — progress checkpoint

Mode: oldest          # oldest | single(#N)
Flags: --auto         # whichever were passed (verbatim, for a clean /skl-resume re-invoke)
Provider: github      # github | gitlab   (host: <host> if self-hosted)
PR base: main
Started: <ISO-8601>
Updated: <ISO-8601>   # bumped on every checkpoint write

## In-flight ticket (the one being worked; cleared when it resolves)
in_flight: #12 — null-guard          # "#<n> — <slug>"; — (empty) once resolved
branch:    skl-do/12-null-guard
spec_dir:  specs/012-null-guard      # once speckit-specify has created it

## Progress (where this ticket is — /skl-resume continues from here)
phase:     build          # select | readiness | spec | spec-review | build | resolve
iteration: 3              # 1..10 (Phase B); — before Phase B
last_step: implement      # last completed speckit step this iteration (plan|tasks|analyze|checklist|implement)
remediation: specs/012-null-guard/.skl-do/remediation-iter-2.md   # latest brief, if any

## Result (filled once the ticket resolves)
| # | type | branch | outcome | label | PR/MR | iterations | at |
|---|------|--------|---------|-------|-------|------------|----|
| 12 | bug | skl-do/12-null-guard | shipped | loop-done | <pr-url> | 3 | <ISO-8601> |

## Status
State: running        # running | built | done | deferred | needs-info | needs-human
```

## Notes
- **Checkpoint on every boundary.** Write `phase` when it changes, `iteration` + `last_step` after each
  speckit step, `remediation` when a brief is written — so `/skl-resume` can re-enter mid-build and
  continue the exact next step, not restart the ticket.
- **`loop-in-progress` is the durable signal.** The label alone lets a cold `/skl-do` (or `/skl-resume`)
  re-pick the in-flight ticket via the resume tier; this file adds the fine-grained phase/step so the
  continue is precise. Clear `in_flight` when the ticket resolves to `loop-done` / `loop-deferred` /
  `loop-needs-info` / `loop-human`.
- **Result / `State`.** `outcome` is `shipped` = **PR opened** (not merged — a human merges it),
  `deferred`, `needs-info`, or `needs-human`. `State` walks `running → built → done` (or `deferred` /
  `needs-info` / `needs-human`).
- **One ticket per invocation** — `/skl-do` never polls, waits, or advances to another ticket. To do
  the next ticket, merge the PR, then re-run `/skl-do`.

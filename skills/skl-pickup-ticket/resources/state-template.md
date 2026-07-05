# .skl-pickup/state.md — loop state (template)

> `/skl-pickup-ticket` reads/writes this file at the repo root. It is the single source of truth that
> makes the loop **idempotent + resumable**: every `ScheduleWakeup` re-entry (and `/skl-resume`) re-reads
> it — the empty-poll counter, the session skip-list, and the per-ticket results. Keep it up to date after
> every poll and every ticket. Copy this shape on first run.

```md
# skl-pickup — loop state

Mode: loop            # loop | single(#N)
Flags: --auto --alive # whichever were passed (verbatim, for re-arming ScheduleWakeup)
Provider: github      # github | gitlab   (host: <host> if self-hosted)
PR base: main
Started: <ISO-8601>
Last poll: <ISO-8601>

## Counters
empty_polls: 0        # consecutive empty polls; reset to 0 whenever a ticket is found
empty_limit: 3        # from pickup_empty_limit (ignored under --alive)

## In-flight (the ticket currently claimed as loop-in-progress; cleared when it resolves)
in_flight: —          # e.g. "#12 — null-guard — started <ISO-8601>"; — (empty) between tickets

## Skip-list (deferred / needs-info this session — not re-picked)
- #<iid> — <slug> — deferred <ISO-8601>

## Results (append one row per resolved ticket)
| # | type | branch | outcome | label | PR/MR | iterations | at |
|---|------|--------|---------|-------|-------|------------|----|
| 12 | bug | skl-pickup/12-null-guard | shipped | loop-done | <pr-url> | 3 | <ISO-8601> |
| 15 | feature | skl-pickup/15-export-csv | deferred | loop-deferred | — | 10 | <ISO-8601> |
| 18 | bug | — | needs-info | loop-needs-info | — | 0 | <ISO-8601> |

## Status
State: running        # running | waiting(next poll <ISO-8601>) | exited(<reason>)
```

## Notes
- **empty_polls** is the exit trigger: at `empty_limit` (default 3) the loop **exits** (manual re-run
  needed). `--alive` never exits, so `empty_polls` is informational only.
- **Skip-list** holds tickets deferred in this session so neither poll tier re-picks them; because
  deferral / the readiness gate flips the label to `loop-deferred` / `loop-needs-info` (off both `loop-ready` and `loop-in-progress`), they drop
  out of the poll queries anyway — the skip-list is the belt-and-suspenders guard within a session.
- **In-flight** records the ticket currently labeled `loop-in-progress`. On re-entry (ScheduleWakeup or a
  cold restart) the **resume** poll re-picks any `loop-in-progress` ticket, so the label is the durable
  source of truth and this field is the human-readable mirror; clear it when the ticket resolves to
  `loop-done` / `loop-deferred` / `loop-needs-info` (or an interactive readiness-gate Skip).
- **Results** doubles as the run report shown on exit.
- On a clean exit or a fresh manual start, reset `empty_polls: 0` and `State: running`.
- **`exited(drained)`** is the `--drain` driver-mode exit: first empty poll, no wakeup, no ping —
  the calling `/skl-auto` reads it as "queue empty, continue the cycle".

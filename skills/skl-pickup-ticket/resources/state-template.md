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

## Skip-list (deferred/blocked this session — not re-picked)
- #<iid> — <slug> — deferred <ISO-8601>

## Results (append one row per resolved ticket)
| # | type | branch | outcome | PR/MR | iterations | at |
|---|------|--------|---------|-------|------------|----|
| 12 | bug | skl-pickup/12-null-guard | shipped | <pr-url> | 3 | <ISO-8601> |
| 15 | feature | skl-pickup/15-export-csv | deferred | — | 10 | <ISO-8601> |

## Status
State: running        # running | waiting(next poll <ISO-8601>) | exited(<reason>)
```

## Notes
- **empty_polls** is the exit trigger: at `empty_limit` (default 3) the loop **exits** (manual re-run
  needed). `--alive` never exits, so `empty_polls` is informational only.
- **Skip-list** holds tickets deferred/blocked in this session so oldest-first won't re-pick them;
  because deferral also removes the `loop-ready` label, they drop out of the poll query anyway — the
  skip-list is the belt-and-suspenders guard within a session.
- **Results** doubles as the run report shown on exit.
- On a clean exit or a fresh manual start, reset `empty_polls: 0` and `State: running`.

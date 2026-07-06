# .skl-auto/state.md — driver state (template)

> `/skl-auto` reads/writes this file at the repo root. It is what makes the driver **idempotent +
> resumable**: every entry (fresh run, `ScheduleWakeup` re-poll, `/skl-resume` after a usage cap)
> re-reads it — the flags, the promotion budget, the crash-safe phase marker, and the digest
> fingerprint. Copy this shape on first run.

```md
# skl-auto — driver state

Flags: --promote=2 --alive   # verbatim (re-used for ScheduleWakeup re-arm and /skl-resume)
Provider: github             # github | gitlab (host: <host> if self-hosted)
Starting branch: dev         # restored before every sub-skill invocation + at cycle end
Merge-on-green: on           # on | off(<reason>) — Phase 0 preconditions result
Started: <ISO-8601>
Last cycle: <ISO-8601>

## Promotion budget
promote_budget: 2            # N from --promote[=N]; 0 = promotion off
promotions_used: 0           # incremented BEFORE each promoted invocation (crash-safe);
                             # survives wakeups (budget is per run); reset on fresh manual start

## Phase (crash-safe resume marker)
Phase: —                     # — | triage | executing(pickup) | executing(run) | promoting(#<n>)
                             # an interrupted executing/promoting phase makes the next entry a RESUME

## Digest
digest: —                    # last digest fingerprint: sorted item ids, e.g.
                             # "PR#31,issue#17,plan-005,update-1.5.0" — or "(idle)"; — = never sent

## Cycle log (append one row per cycle)
| cycle | at | ran | results | promoted | digest |
|---|---|---|---|---|---|
| 1 | <ISO-8601> | pickup(drained: 2 shipped), run(1 shipped) | PR#31+PR#32 merge-on-green | — | sent |
| 2 | <ISO-8601> | — | — | #41 → PR#33 | unchanged |

## Status
State: running               # running | waiting(next poll <ISO-8601>) | exited(<reason>)
```

## Notes

- **`promotions_used`** is the `--promote` stop rule: at `promote_budget` no further promotion
  happens in this run, however many `--alive` cycles follow. A fresh **manual** start resets it
  (pickup's reset semantics); a wakeup or `/skl-resume` re-entry does not.
- **`Phase:`** is what makes a usage-cap interrupt safe: `executing(pickup)` / `promoting(#<n>)`
  → the next entry re-invokes `/skl-pickup-ticket --auto --drain` (resume tier picks up the
  in-flight ticket); `executing(run)` → re-invokes `/skl-run --auto`. Clear it (`—`) after each
  sub-skill returns.
- **`digest:`** deduplicates Telegram across `--alive` cycles — identical fingerprint = silent
  cycle. `(idle)` is a fingerprint too, so "nothing to be done" pings once, not every 30 min.
- **`State: waiting(next poll <t>)`** with a future `<t>` makes a manual re-run a no-op (report +
  STOP) — never double-arm wakeups.

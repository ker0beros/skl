---
name: skl-resume
description: "Continue the last /skl-do run after any interruption — a usage-limit reset, a crash, or a context /clear. It reads the durable checkpoint at .skl-do/state.md plus the loop-in-progress issue label (no reliance on in-session memory), figures out which ticket and which phase/iteration it stopped at, and re-invokes /skl-do to continue that exact ticket from there. If the stop was a usage cap, it waits (ScheduleWakeup) until the cap resets + a safety buffer before continuing; otherwise it continues immediately. You can clear the context and just run /skl-resume."
argument-hint: "(optional) a reset time/countdown from the status bar (e.g. '2h15m' or '18:30') if a usage cap stopped the run; empty = read the checkpoint and continue now"
metadata:
  author: "khairul"
  version: "1.0.0"
  source: "skills/skl-resume"
user-invocable: true
disable-model-invocation: true
---

## User Input

```text
$ARGUMENTS
```

Parse as any of: a **reset time or countdown** (e.g. `2h15m`, `1:45`, `18:30`) if a usage cap stopped the run, and/or a **buffer override** (e.g. `buffer=5m`). Everything is optional — with no arguments, read the checkpoint and continue immediately (buffer defaults to **3 min** when a reset wait applies).

---

## What this command does

`/skl-do` checkpoints its progress to **`.skl-do/state.md`** at every phase/iteration boundary, and the
**`loop-in-progress`** label on the issue is the durable "this ticket is mid-flight" signal. So if a run
stops — a **usage-limit cap**, a crash, or you **`/clear` the context** — nothing is lost. `/skl-resume`
reads that durable state (not in-session memory), works out which ticket and where in the build it
stopped, and **re-invokes `/skl-do` to continue the same ticket** from its last checkpoint.

- If the stop was a **usage cap**, it schedules the continuation for after the cap resets (in-session via
  `ScheduleWakeup`, re-arming hourly for multi-hour waits).
- Otherwise (e.g. right after a `/clear`), it **continues immediately**.

`/skl-do` itself does the continuing: its Phase 0 **resume tier** re-picks the `loop-in-progress` ticket
and reads `.skl-do/state.md` to pick up at the checkpointed `phase` / `iteration` / `last_step`.

---

## Steps

1. **Locate the interrupted run (durable state only).** Read **`.skl-do/state.md`** at the repo root:
   - `State: running` with a non-empty `in_flight` → there is a ticket to continue; note its `#n`,
     `branch`, `phase`, `iteration`, `last_step`, `spec_dir`, and `Flags`.
   - `State: done` / `deferred` / `needs-info`, or no `in_flight`, or no file → nothing to resume from the
     checkpoint. Cross-check the remote for any open **`loop-in-progress`** issue (the durable signal — a
     ticket claimed but not resolved). If one exists, that is the run to continue (its label alone lets
     `/skl-do` re-pick it); if none, tell the user there's nothing to resume and offer to start fresh with
     `/skl-do`, then stop.
2. **Was it a usage cap?** If `$ARGUMENTS` gives a reset time, or the **status-bar limit timer** is
   showing, treat it as a cap stop → step 3. Otherwise (no timer — e.g. after a `/clear` or a crash) →
   **skip the wait**, go to step 5 and continue now.
3. **Get the reset time.** In priority order: (a) a time/countdown in `$ARGUMENTS`; (b) the status-bar
   limit timer if accessible; (c) ask the user *"what does the status-bar limit timer say?"*. Convert to
   an absolute `reset_at`.
4. **Arm the wait (ScheduleWakeup).** `resume_at = reset_at + buffer` (buffer default **3 min**). Let
   `wait = resume_at − now`:
   - `wait ≤ 0` → go to step 5 now.
   - `0 < wait ≤ 3600` → `ScheduleWakeup(delaySeconds = max(60, wait), prompt = "/skl-resume <same args>", reason = "resume /skl-do at usage-limit reset + buffer")`, then **end the turn**.
   - `wait > 3600` → `ScheduleWakeup(delaySeconds = 3600, prompt = "/skl-resume <same args>", reason = "heartbeat toward usage-limit reset for /skl-do")`, then **end the turn** (re-arms hourly until within range).
   On the **first** arm, fire `bash ~/.claude/notify-telegram.sh "[<project>] /skl-resume armed — resuming /skl-do ~<resume_at>"`.
5. **Continue.** Re-invoke **`/skl-do <same flags from the checkpoint>`** via the **Skill tool** (pass the
   `Flags:` recorded in `.skl-do/state.md`, e.g. `--auto`). `/skl-do` re-reads `.skl-do/state.md` + the
   `loop-in-progress` label and continues the **same** ticket from its checkpointed `phase` / `iteration`
   / `last_step` — it does not restart the ticket. Fire `bash ~/.claude/notify-telegram.sh "[<project>] /skl-resume ▶ continuing /skl-do #<n> (<phase> iter <iteration>)"`.

---

## Rules & invariants

- **Resumes from disk, not memory.** Everything needed to continue lives in `.skl-do/state.md` + the
  `loop-in-progress` label + `specs/<feature>/.skl-do/` artifacts — so `/skl-resume` works in a **fresh
  context** after a `/clear`, not just within the original session.
- **Never resume before a cap clears.** If it was a usage-cap stop, always wait to `reset + buffer`
  (default 3 min); if the reset time is unknown, **ask** rather than guess — a premature resume just
  re-trips the cap. For a non-cap stop (crash / `/clear`), continue immediately.
- **In-session wait.** Use ScheduleWakeup for the cap wait (re-arm hourly past its 1 h cap). Do **not**
  use a cloud cron — it can't drive the local build loop.
- **Idempotent.** Re-invoking just re-reads the checkpoint + clock; it continues once (via `/skl-do`,
  which never double-starts a resolved ticket), and it only waits while a cap is pending.
- **One ticket.** `/skl-do` continues the one in-flight ticket to a PR (or defer), then stops — it does
  not advance to the next ticket. Merge the PR, then run `/skl-do` for the next.
- **Telegram** prefix `[<project>]` (project root basename); ping on arm and on continue; skip silently if
  `~/.claude/notify-telegram.sh` is absent. The `rate_limit` StopFailure hook's alert is your cue to run
  this after a cap.

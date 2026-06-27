---
name: loop-resume
description: "Auto-resume a stopped loop (/loop-feature or /loop-refactor) after Claude's usage limit resets. Reads the reset time from the status-bar limit timer (or takes it as an argument), waits via ScheduleWakeup until reset + a 3-minute safety buffer — re-arming hourly for long waits — then re-invokes the loop so it continues where it left off. Run it when the rate-limit alert fires."
argument-hint: "(optional) the reset time/countdown from the status bar (e.g. '2h15m' or '18:30'), and/or which loop to resume"
metadata:
  author: "khairul"
  version: "1.0.0"
  source: "skills/loop-resume"
user-invocable: true
disable-model-invocation: true
---

## User Input

```text
$ARGUMENTS
```

Parse as any of: a **reset time or countdown** (e.g. `2h15m`, `1:45`, `18:30`), a **loop name** (`loop-feature` | `loop-refactor`), and/or a **buffer override** (e.g. `buffer=5m`). Anything missing is detected or defaulted (buffer = **3 min**).

---

## What this command does

When a long `/loop-feature` or `/loop-refactor` run hits Claude's **5-hour or weekly usage cap**, the loop stops mid-flight (the `rate_limit` StopFailure hook fires the Telegram alert). `/loop-resume` schedules the loop to **continue itself** shortly after the cap resets — no babysitting.

It finds where the loop stopped, reads the **reset time from the status-bar limit timer**, waits until **reset + 3 min** (a safety buffer so the window has definitely cleared), then resumes the loop.

The wait uses **ScheduleWakeup** — in-session, so it resumes the **same** loop in the **same** context. A single wakeup sleeps at most 1 hour, so for a multi-hour reset it **re-arms itself each hour** until the buffer has elapsed.

> Invoke this **as soon as the rate-limit alert fires** (the status bar still shows the timer). If the session is hard-blocked until reset, the message is processed at reset and resumes right away — the buffer still applies. If the wakeup can't be scheduled standalone, run it under the built-in loop: `/loop /loop-resume <reset>` (it self-paces, no interval needed).

---

## Steps

1. **Identify the stopped loop + where it left off.** From `$ARGUMENTS`, else infer the most recent loop: `loop-refactor` if `.loop-refactor/backlog.md` has unfinished items (status not `done`/`DEFERRED`); otherwise `loop-feature` from the newest `specs/<feature>/.loop-feature/`. Note the feature / scope so you can re-invoke it precisely.
2. **Get the reset time.** In priority order: (a) a time/countdown in `$ARGUMENTS`; (b) read the **status-bar limit timer** if accessible; (c) ask the user *"what does the status-bar limit timer say?"* (they can read it off the bar). Convert to an absolute `reset_at`.
3. **Compute `resume_at = reset_at + buffer`** (buffer default **3 min**; override via `buffer=<dur>`).
4. **Arm the wait (ScheduleWakeup).** Let `wait = resume_at − now`, in seconds:
   - `wait ≤ 0` → the cap already cleared → go to **step 5** now.
   - `0 < wait ≤ 3600` → `ScheduleWakeup(delaySeconds = max(60, wait), prompt = "/loop-resume <same args>", reason = "resume <loop> at usage-limit reset + buffer")`, then **end the turn**.
   - `wait > 3600` → `ScheduleWakeup(delaySeconds = 3600, prompt = "/loop-resume <same args>", reason = "heartbeat toward usage-limit reset for <loop>")`, then **end the turn** (re-arms hourly until within range).
   On the **first** arm, fire `bash ~/.claude/notify-telegram.sh "[<project>] /loop-resume armed — resuming <loop> ~<resume_at>"`.
5. **Resume.** Once `now ≥ resume_at`: re-invoke the stopped loop via the **Skill tool** — `loop-feature <design> — <intent>` or `loop-refactor [scope]` — which reads its working files and continues (or send a plain `continue` if that loop is still the active thread). Fire `bash ~/.claude/notify-telegram.sh "[<project>] /loop-resume ▶ resumed <loop>"`.

---

## Rules & invariants

- **Never resume before the cap clears.** Always wait to `reset + buffer` (default 3 min). If the reset time is unknown, **ask** rather than guess — a premature resume just re-trips the cap and wastes the attempt.
- **In-session resume.** Use ScheduleWakeup so the same loop continues in the same context; for waits > 1 h, re-arm hourly (that's ScheduleWakeup's cap). Do **not** use a cloud cron — it wouldn't continue the local loop.
- **Idempotent.** Re-invoking just re-reads the clock and re-arms; it only resumes once `now ≥ resume_at`, so it never double-starts.
- **Loops are resumable.** `loop-feature` / `loop-refactor` pick up from their working files (`specs/<feature>/.loop-feature/`, `.loop-refactor/backlog.md` status) — re-invoking **continues**, it doesn't restart from scratch.
- **Telegram** prefix `[<project>]` (project root basename); ping on arm and on resume; skip silently if `~/.claude/notify-telegram.sh` is absent. The `rate_limit` StopFailure hook's alert is your cue to run this.

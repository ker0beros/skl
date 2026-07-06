# Ticket-readiness check for `/skl-do` (Phase 0 step 6)

> Runs after classify (Phase 0 step 5), before the build (Phase A). The driver spawns `skl-business-analyst`
> with the seed below; the agent reports per-item findings + a `READINESS:` verdict; the **driver**
> routes (proceed / ask the human / `loop-needs-info`). Rationale: a vague ticket must cost one
> comment, not 10 QA-gated iterations — this is the constitution's Loop Engineering
> readiness-scoring principle applied at the queue boundary.

## The standard (calibration)

**Ready = could a competent engineer with repo access start this ticket without asking the
reporter anything?** An item is **missing** ONLY when it can't be reliably inferred from the
issue (title + body + labels + comments) **plus the repo**. Template fields are NOT required —
terse is fine when the repo fills the gaps ("fix typo in README heading" is ready). The gate
stops wasted iterations; it does not bounce workable tickets for form.

## Rubric

**Bug (built inline in Phase B, intent framed as a fix):**

| Item | Ready when… |
|---|---|
| Observable symptom | The wrong behavior is stated concretely (error text, crash, wrong output) |
| Reproduction path or evidence | Steps / context / logs / a stack trace — enough to attempt a repro |
| Expected vs actual | Both sides stated, or unambiguously inferable |

**Feature (built inline in Phase B):**

| Item | Ready when… |
|---|---|
| Intended outcome | The user value / end state is clear enough to spec |
| Scope boundary | What's in (and implicitly out) is discernible |
| Acceptance criteria | Present, or derivable from the description + repo conventions |

## Seed prompt (driver → `skl-business-analyst`, Agent tool)

```
You are performing the ticket-readiness check (see agents/skl-business-analyst.md, secondary
task). Classification: <bug|feature>. Standard: could a competent engineer with repo access
start this ticket without asking the reporter anything? Check the rubric items for this
classification; an item is missing ONLY if it can't be reliably inferred from the issue plus
the repo — you have Read/Grep/Glob: look in the repo before declaring a gap.

Issue #<n> — <title>
Labels: <labels>
<body>
--- comments ---
<comments or "(none)">

Return: per-item status (present / inferred — say from where / missing), a draft request-info
comment (only if anything is missing; template in
.claude/skills/skl-do/resources/readiness-check.md), and the mandatory last line:
`READINESS: ready` or `READINESS: not-ready — missing: <item>; <item>`.
```

## Request-info comment template (posted on the needs-info route)

```md
🤖 **skl-do — more info needed.** This ticket was labeled `loop-ready`, but it's
missing what the loop needs to build it reliably:

- **<item>** — <concrete ask, e.g. "the steps or context that trigger the failure, or a log/stack trace">
- **<item>** — <concrete ask>

Once the description is updated: remove the `loop-needs-info` label and re-add `loop-ready` —
then re-run `/skl-do` to work it.
```

## Routing (driver-owned — the agent only reports)

- **`READINESS: ready`** → Phase A (build the ticket). No comment, no label change.
- **`not-ready` + `--auto`** →
  1. flip `pickup_inprogress_label` → `pickup_needsinfo_label` (commands in `pickup-loop.md`);
  2. post the request-info comment (the agent's draft, driver-reviewed);
  3. record the result as `needs-info` and clear the in-flight ticket;
  4. `bash ~/.claude/notify-telegram.sh "[<project>] /skl-do ⏸ #<n> needs info — labeled loop-needs-info"`;
  5. then **STOP** (one ticket per run — a human answers the comment and re-labels `loop-ready`, then re-runs).
- **`not-ready`, interactive (no `--auto`)** → fire the await ping, then `AskUserQuestion`
  listing the missing items, options:
  - **Answer now** → post the user's answers as an issue comment (the durable record), seed
    them into the build, → Phase A.
  - **Route to needs-info** → the `--auto` path above.
  - **Skip this ticket** → flip `pickup_inprogress_label` back to `pickup_label` (a future run
    can claim it), clear the in-flight ticket, then **STOP**.
- **`#N` tickets may carry no lifecycle label** (an explicit number bypasses the gate) — use
  add-only labeling and tolerate a failed remove (`--remove-label` on an absent label is not an
  error worth stopping for).

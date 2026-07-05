# Ticket-readiness check for `/skl-pickup-ticket` (step 2.5)

> Runs after classify (step 2), before work (step 3). The driver spawns `skl-business-analyst`
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

**Bug (routes to `/skl-fix`):**

| Item | Ready when… |
|---|---|
| Observable symptom | The wrong behavior is stated concretely (error text, crash, wrong output) |
| Reproduction path or evidence | Steps / context / logs / a stack trace — enough to attempt a repro |
| Expected vs actual | Both sides stated, or unambiguously inferable |

**Feature (routes to `/skl-feature`):**

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
.claude/skills/skl-pickup-ticket/resources/readiness-check.md), and the mandatory last line:
`READINESS: ready` or `READINESS: not-ready — missing: <item>; <item>`.
```

## Request-info comment template (posted on the needs-info route)

```md
🤖 **skl pickup loop — more info needed.** This ticket was labeled `loop-ready`, but it's
missing what the autonomous loop needs to work it reliably:

- **<item>** — <concrete ask, e.g. "the steps or context that trigger the failure, or a log/stack trace">
- **<item>** — <concrete ask>

Once the description is updated: remove the `loop-needs-info` label and re-add `loop-ready` —
the loop will pick the ticket up on its next poll.
```

## Routing (driver-owned — the agent only reports)

- **`READINESS: ready`** → step 3 (work the ticket). No comment, no label change.
- **`not-ready` + `--auto`** →
  1. flip `pickup_inprogress_label` → `pickup_needsinfo_label` (commands in `pickup-loop.md`);
  2. post the request-info comment (the agent's draft, driver-reviewed);
  3. add the id to the state-file skip-list; record the result as `needs-info` and clear the in-flight ticket;
  4. `bash ~/.claude/notify-telegram.sh "[<project>] /skl-pickup-ticket ⏸ #<n> needs info — labeled loop-needs-info"`;
  5. **loop mode → step 1** (next ticket); **`#N` mode → STOP**.
- **`not-ready`, interactive (no `--auto`)** → fire the await ping, then `AskUserQuestion`
  listing the missing items, options:
  - **Answer now** → post the user's answers as an issue comment (the durable record), seed
    them into the step-3 sub-skill invocation, → step 3.
  - **Route to needs-info** → the `--auto` path above.
  - **Skip this ticket** → flip `pickup_inprogress_label` back to `pickup_label` (a future run
    can claim it), skip-list the id + clear the in-flight ticket, → step 1 (loop) / STOP (`#N`).
- **`#N` tickets may carry no lifecycle label** (an explicit number bypasses the gate) — use
  add-only labeling and tolerate a failed remove (`--remove-label` on an absent label is not an
  error worth stopping for).

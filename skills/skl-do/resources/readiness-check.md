# Ticket-readiness check (shared: `/skl-do` Phase 0 step 6 · `/skl-ticket` Step 2.5)

> In `/skl-do` this runs after classify (Phase 0 step 5), before the build (Phase A): the driver spawns
> `skl-business-analyst` with the seed below; the agent reports per-item findings + a `READINESS:` verdict;
> the **driver** routes (proceed / `loop-needs-info` / `loop-human`). `/skl-ticket` reuses the same
> **standard + rubric + three-way verdict** at creation time to pre-select the intake label it proposes in
> its gate (it self-assesses the draft — no agent spawn). Rationale: a vague ticket must cost one comment,
> not 10 QA-gated iterations — the constitution's Loop Engineering readiness-scoring principle applied at
> the queue boundary.

## The standard (calibration)

**Ready = could a competent engineer with repo access start this ticket without asking the
reporter anything?** An item is **missing** ONLY when it can't be reliably inferred from the
issue (title + body + labels + comments) **plus the repo**. Template fields are NOT required —
terse is fine when the repo fills the gaps ("fix typo in README heading" is ready). The gate
stops wasted iterations; it does not bounce workable tickets for form.

**Three outcomes.** The verdict is exactly one of:
- **ready** — every rubric item below is present or inferable; the loop can build it unattended.
- **needs-info** — an *information* gap: a rubric item is missing but is a **fact the reporter can just
  supply** (a repro path, the expected behavior, an acceptance criterion). Answerable → then ready.
- **needs-human** — a *decision* gap: the ticket needs a **human judgment or out-of-band action the loop
  cannot make**, even when fully described — a design/UX/architecture direction chosen among real
  tradeoffs, a secret/credential, access to an external system, or an explicit approval. More facts won't
  unblock it; a human must decide or act.

Discriminator: *needs-info is answered with facts; needs-human requires a call or an action.* When both
apply, prefer **needs-human** (the decision dominates).

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

Also flag whether the ticket needs a **human decision/action** the loop can't make (design/architecture
tradeoff, secret/credential, external access, approval) — that is `needs-human`, not `needs-info`.

Return: per-item status (present / inferred — say from where / missing), a draft comment when anything is
missing or a decision is needed (only then; templates in
.claude/skills/skl-do/resources/readiness-check.md), and the mandatory last line — exactly one of:
`READINESS: ready`
`READINESS: needs-info — missing: <item>; <item>`
`READINESS: needs-human — decision: <item>; <item>`
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

## Decision-needed comment template (posted on the needs-human route)

```md
🤖 **skl-do — needs a human decision.** This ticket can't be built unattended: it needs a call the
loop shouldn't make on its own —

- **<decision/action>** — <what must be decided or provided, e.g. "which onboarding layout to ship", "a
  staging API key", "confirm we may drop the legacy column">

Once decided: capture the decision here (or in the ticket body), remove `loop-human`, re-add
`loop-ready` — then re-run `/skl-do` to build it.
```

## Routing (driver-owned — the agent only reports)

- **`READINESS: ready`** → Phase A (build the ticket). No comment, no label change.
- **`needs-info`, unattended** →
  1. flip `pickup_inprogress_label` → `pickup_needsinfo_label` (commands in `pickup-loop.md`);
  2. post the request-info comment (the agent's draft, driver-reviewed);
  3. record the result as `needs-info` and clear the in-flight ticket;
  4. `bash ~/.claude/notify-telegram.sh "[<project>] /skl-do ⏸ #<n> needs info — labeled loop-needs-info"`;
  5. then **STOP** (one ticket per run — a human answers the comment and re-labels `loop-ready`, then re-runs).
- **`needs-info`, interactive** → fire the await ping, then `AskUserQuestion`
  listing the missing items, options:
  - **Answer now** → post the user's answers as an issue comment (the durable record), seed
    them into the build, → Phase A.
  - **Route to needs-info** → the unattended path above.
  - **Skip this ticket** → flip `pickup_inprogress_label` back to `pickup_label` (a future run
    can claim it), clear the in-flight ticket, then **STOP**.
- **`needs-human`, unattended** → same shape, one hop over: flip `pickup_inprogress_label` →
  `pickup_human_label`, post the **decision-needed** comment (the agent's draft, driver-reviewed), record
  the result as `needs-human` and clear the in-flight ticket,
  `bash ~/.claude/notify-telegram.sh "[<project>] /skl-do ⏸ #<n> needs a human decision — labeled loop-human"`,
  then **STOP** (a human decides, re-labels `loop-ready`, re-runs).
- **`needs-human`, interactive** → fire the await ping, then `AskUserQuestion`
  listing the pending decisions, options:
  - **Decide now** → post the decision as an issue comment (the durable record), seed it into the
    build, → Phase A.
  - **Route to loop-human** → the unattended path above.
  - **Skip this ticket** → flip `pickup_inprogress_label` back to `pickup_label`, clear the in-flight
    ticket, then **STOP**.
- **`#N` tickets may carry no lifecycle label** (an explicit number bypasses the gate) — use
  add-only labeling and tolerate a failed remove (`--remove-label` on an absent label is not an
  error worth stopping for).

# Design: ticket-readiness gate for `/skl-pickup-ticket`

**Date:** 2026-07-05
**Status:** approved
**Release:** minor — `VERSION` 1.2.0 → 1.3.0

## Problem

`/skl-pickup-ticket` commits every claimed `loop-ready` ticket to a QA-gated build loop capped at
10 iterations, even when the ticket lacks the information the loop needs to work autonomously
(a bug with no reproduction path, a feature with no discernible acceptance criteria). Under
`--auto` the one clarify opportunity (`speckit-clarify`) is also suppressed, so a vague ticket
burns iterations and lands on `loop-deferred` — the most expensive possible way to discover that
the ticket needed one more sentence from its reporter. The constitution's Loop Engineering
principle already names **readiness scoring** as a gate for autonomous work; the ticket queue is
its natural application point.

## Decision summary (user-approved forks)

1. **Not-ready outcome:** a new lifecycle label **`loop-needs-info`** (config key
   `pickup_needsinfo_label`), plus a comment listing exactly what's missing. Not `loop-deferred`
   (that means "couldn't converge in 10 iterations" — a different human action) and not
   de-labeling (the ticket would silently leave the loop ecosystem).
2. **Who scores:** the **`skl-business-analyst`** agent — independent judgment (maker/checker),
   consistent with v1.2.0 where the BA owns requirements quality; it also drafts the
   request-info comment. One sonnet spawn per ticket.
3. **When a human is present** (interactive runs and explicit `#N`): **ask inline** via
   `AskUserQuestion` — the user can supply the missing info on the spot (posted to the issue as a
   comment for the record, then work proceeds) or route to `loop-needs-info`. Unattended
   (`--auto`): always route to `loop-needs-info` and move on.

## Flow placement — step 2.5

The check runs **after step 2 (classify)** — the bug/feature classification selects which rubric
applies — and **before step 3 (work the ticket)**. The ticket is already claimed
(`loop-in-progress`); the not-ready transition mirrors the existing defer transition. Single-ticket
`#N` mode runs the same check; `#N` tickets may carry no lifecycle label (they bypass the label
gate), so label transitions must tolerate a missing source label (add-only where needed).

## The readiness check

**Seed:** issue title + body + labels + comments, the bug/feature classification, and the rubric
from `resources/readiness-check.md`. The BA has Read/Grep repo access.

**Standard (the calibration that keeps the gate honest):** *could a competent engineer with repo
access start this ticket without asking the reporter anything?* An item is missing only when it
can't be reliably inferred from the issue **plus the repo**. Template fields are not required —
"fix typo in README heading" is ready; "checkout is broken" with no symptom detail is not. The
gate exists to stop wasted iterations, not to bounce terse-but-workable tickets.

**Rubric — bug:** an observable symptom; a reproduction path or evidence (steps, logs, stack
trace); expected vs actual.
**Rubric — feature:** the intended outcome / user value; a rough scope boundary; acceptance
criteria present or derivable.

**Contract:** missing-item findings (no severity ladder — items are just present or missing), a
**draft request-info comment**, and a mandatory last line:
`READINESS: ready` or `READINESS: not-ready — missing: <item>; <item>`.
The driver owns the routing decision — same report-vs-decide split as the QA gates.

## Routing

**Ready** → proceed to step 3 unchanged.

**Not ready, unattended (`--auto`):**
1. Flip `pickup_inprogress_label` → `pickup_needsinfo_label`.
2. Post the comment: what's missing, what to add, and "edit the ticket, then re-label
   `loop-ready`" (the BA's draft, driver-reviewed).
3. Add the id to the state-file skip-list; record the result as `needs-info`.
4. Telegram: `[<project>] /skl-pickup-ticket ⏸ #<n> needs info — labeled loop-needs-info`.
5. Loop mode → next ticket; `#N` mode → STOP.

**Not ready, interactive:** fire the await ping, then `AskUserQuestion` presenting the missing
items — **Answer now** (answers posted to the issue as a comment for the record, then proceed to
step 3 with the answers seeded into `/skl-fix` / `/skl-feature`) / **Route to needs-info** (the
unattended path above) / **Skip this ticket** (flip `loop-in-progress` back to `loop-ready` so a
future run can claim it; the session skip-list stops this run from re-picking it).

**Human re-entry:** a human answers the comment / edits the ticket, removes `loop-needs-info`,
re-adds `loop-ready`. The loop never picks `loop-needs-info` tickets itself — a human only ever
sets `loop-ready`, unchanged.

## Label lifecycle (after)

```
loop-ready ──claim──▶ loop-in-progress ──PR opened──▶ loop-done
 (human)              ├──cap hit────▶ loop-deferred   (findings commented, skipped)
                      └──not ready──▶ loop-needs-info (missing info commented; human re-labels loop-ready)
```

## Config + provider commands

- New key **`pickup_needsinfo_label`** (default `loop-needs-info`) in `project.config.md`,
  falling back to the default when absent (same pattern as the other pickup keys).
- Phase 0 label bootstrap creates it idempotently alongside the other four; `gh label create` /
  `glab label create` commands added to `resources/pickup-loop.md` (suggested color `#d4c5f9`,
  description "Loop needs more info — answer the comment, then re-label loop-ready").

## File changes

| File | Change |
|---|---|
| `skills/skl-pickup-ticket/SKILL.md` | Step 2.5; config key; lifecycle diagram; description frontmatter |
| `skills/skl-pickup-ticket/resources/readiness-check.md` | NEW — rubric, BA seed prompt, comment template |
| `skills/skl-pickup-ticket/resources/pickup-loop.md` | needs-info label create + relabel commands (gh + glab) |
| `skills/skl-pickup-ticket/resources/state-template.md` | `needs-info` as a recordable per-ticket result |
| `agents/skl-business-analyst.md` | Secondary task: ticket-readiness check (rubric standard + READINESS contract) |
| `README.md` | Pickup section + lifecycle diagram + agents paragraph |
| `VERSION` / `CHANGELOG.md` | 1.3.0 + entry |

## Testing (writing-skills TDD)

- **RED (baseline):** subagent given the current step 2→3 text + a vague bug ticket proceeds
  straight to work — documented verbatim.
- **GREEN (verification reps):** with the edited text — (a) vague ticket under `--auto` routes to
  `loop-needs-info` + comment + next; (b) vague ticket interactive asks the user with the three
  options; (c) **terse-but-workable ticket proceeds untouched** — the negative case that proves
  the gate doesn't bounce ready tickets.

## Out of scope

- Readiness checks inside `/skl-fix` / `/skl-feature` when invoked directly (a human is present
  and clarify runs there; the gate belongs at the autonomous queue boundary).
- Auto-re-picking tickets whose reporter answered the comment (the human re-labels `loop-ready`;
  keeping that gate human preserves the loop-engineering posture).
- Numeric readiness scores (0–10): named missing items are more actionable than a number; the
  binary verdict + item list *is* the score.

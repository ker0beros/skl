# refactor-loop — QA pass matrix

Gate definition for Phase 2 step 8 of `SKILL.md`. The driver owns the pass/fail call; the agents
only **report** severity-tagged findings (Critical / High / Medium / Low).

## Pass rule

A single gate **passes** iff it reports **0 Critical, 0 High, AND 0 Medium** findings (Low is logged,
non-blocking). The **whole round passes** iff:
1. The automated gates (from `project.config.md`) exit 0 — **this proves behavior is preserved**.
2. All 6 QA gate-agents pass.

A refactor that makes a gate red, or that any agent flags at Medium+, is **not** done — it goes to
`ultrathink-debugger` → next `plan` iteration (cap 10, then the item is deferred).

## Automated gates (run first — the regression net)

Run the commands `project.config.md` lists for this surface (`mobile_gates` / `web_gates`); all must
exit 0. For a refactor these are non-negotiable: **green analyze + green tests = observable behavior
unchanged.** If the project's tests are thin, note it in the report — the safety net has holes.

## The 6 gate agents (refactor-framed)

Spawn all six in parallel. Shared context to prepend:

> This is a **refactor** — structure changes, behavior must NOT. Target organization:
> `.refactor-loop/organization.md`. Item spec: `specs/<feature>/spec.md` (`Refactor-Item: <id>`).
> Working diff: `git diff <integration-base>...HEAD`. Pre-refactor behavior is the baseline —
> any change in observable behavior is a regression. Report findings with severity + file:line.
> End with a `VERDICT:` line (counts → PASS/FAIL).

| Gate | `subagent_type` | Refactor ask |
|------|------------------|--------------|
| Behavior / reality | `karen` | Run it. Confirm behavior is identical to before the refactor; any regression is Critical/High. |
| Target org | `Jenny` | Verify the change actually moves the code to the `organization.md` target (not a half-move), with **no** behavior change. |
| Compliance | `claude-md-compliance-checker` | The result must be **more** compliant with CLAUDE.md + the constitution than before — flag any new violation. |
| Simplicity | `code-quality-pragmatist` | Flag over-engineering / needless abstraction the refactor introduced. A refactor should simplify, not gold-plate. |
| Completion | `task-completion-validator` | Every task in `tasks.md` actually done end-to-end (e.g. all call-sites updated, no dangling old paths). |
| No regression | `ui-comprehensive-tester` | UI surfaces: no behavioral/visual/UX change vs before. Non-UI: runtime smoke of the touched paths. |

`ultrathink-debugger` is **not** in the matrix — it's the failure-time synthesizer that turns the
findings into the next iteration's plan.

## Refactor-specific failure rules
- **Weakened/deleted tests to make a gate pass** → Critical (defeats the safety net). Tests may be
  updated for moved/renamed symbols, but not weakened.
- **Behavior change** (any) → at least High, usually Critical.
- **Half-finished move** (old + new code coexisting, stale call-sites) → High via `task-completion-validator`.

# skl-fix — QA pass matrix

Gate definition for Phase 1 steps 8–9 of `SKILL.md`. The driver owns the pass/fail call; the agents
only **report** severity-tagged findings (Critical / High / Medium / Low / Info).

## Pass rule

The threshold depends on **`gate_strictness`** in `project.config.md` (toggle it with `/skl-gate`; treat a missing field as `standard`). Severity ladder: **Critical › High › Medium › Low › Info** (Info = info-level lint diagnostics). **Medium and above always block**:
- **`low`** — a single gate **passes** iff it reports **0 Critical, 0 High, AND 0 Medium** (**Low + Info** logged, non-blocking).
- **`standard`** (default) — passes only at **0 Critical, 0 High, 0 Medium, AND 0 Low** (**Info** logged, non-blocking).
- **`strict`** — passes only at **0 Critical, 0 High, 0 Medium, 0 Low, AND 0 Info**: even info-level lints must be clean, so the analyze gate must be run fatal-on-info (e.g. `--fatal-infos` / `--max-warnings 0`), not merely exit 0.

The **whole round passes** iff ALL of:
1. The automated gates (from `project.config.md`) exit 0 (under `strict`, clean of info-level diagnostics too).
2. All 8 QA gate-agents pass at the active threshold.
3. **Superpowers `verification-before-completion`** confirms, with fresh evidence, that the **original
   symptom now passes** and the full suite reports **0 failures** (SKILL step 9). This is a hard gate —
   a fix is not done without it, regardless of the agents.

A fix that makes a gate red, that any agent flags at the blocking level, or whose symptom still
reproduces is **not** done — it goes to `skl-debugger` (or back to `systematic-debugging` if the
root cause was wrong) → next `plan` iteration (cap 10, then the bug is deferred).

## Automated gates (run first)

Run the commands `project.config.md` lists for this surface (`mobile_gates` / `web_gates`); all must
exit 0. The **reproduction test added this round must pass**, and the **full suite must stay green**
(no regression). If the project's tests are thin, note it in the report — the safety net has holes.

## The 8 gate agents (fix-framed)

Spawn all eight in parallel (one Agent message). Shared context to prepend:

> This is a **bug fix** — the change flips wrong→right behavior; **no other behavior may regress**.
> Bug spec: `specs/<feature>/spec.md` (`Fix-Issue: <id>`), including the confirmed **root cause** and
> the **reproduction**. Working diff: `git diff <integration-base>...HEAD`. Report findings with
> severity (Critical/High/Medium/Low/Info — Info = info-level lint/hint) and file:line evidence. End
> with a `VERDICT:` line summarising counts.

| Gate | `subagent_type` | Fix ask |
|------|------------------|---------|
| Symptom gone / reality | `skl-reality-checker` | Run it. Reproduce the original symptom — it must be **gone**. Then smoke the surrounding flows: any **new** broken behavior (regression) is Critical/High. |
| Root cause & completion | `skl-spec-auditor` | Verify the change addresses the **confirmed root cause** in the spec (not a symptom patch), the acceptance criterion ("repro now passes") is met, and every task in `tasks.md` is done end-to-end — no dangling TODOs. |
| Simplicity | `skl-pragmatist` | Flag symptom-patching, band-aids, or over-engineering. A fix should remove the cause, not paper over it. |
| Compliance | `skl-guideline-auditor` | The diff follows `CLAUDE.md` + `.specify/memory/constitution.md` (incl. the TDD principle — a repro test must exist), and — where the fix touches agentic / loop / automation code — the constitution's **Loop Engineering principle** (the agent owns that checklist); a fix must not remove a safety gate or budget to make the symptom go away. |
| Correctness | `skl-code-reviewer` | Adversarially review the fix diff: does it introduce new defects — logic errors, missed edges around the changed code, error-handling gaps, races, leaks? Every High+ finding must include a concrete failure scenario. |
| Security | `skl-security-auditor` | The fix introduces no new vulnerability; if the bug was security-relevant, verify the fix closes it **fully** (no variant left open). Every High+ finding must include a plausible exploit path. |
| Test integrity | `skl-test-integrity-auditor` | The **reproduction test exists and genuinely exercises the bug** (fails without the fix, passes with it), and **no test or gate was weakened** to make the suite green. |
| No regression (UI) | `skl-ui-tester` | UI surfaces: the fixed flow works and nothing visible regressed. Non-UI: runtime smoke of the touched paths. |

`skl-debugger` is **not** in the matrix — it's the failure-time synthesizer that turns the
findings into the next iteration's plan. When the **symptom itself still reproduces**, prefer
re-running Superpowers `systematic-debugging` (the root cause was wrong) over re-planning the same fix.

## Fix-specific failure rules
- **Symptom still reproduces** → Critical (the fix didn't work); re-diagnose the root cause.
- **Weakened/deleted tests to make a gate pass**, or a repro test that doesn't actually exercise the
  bug → Critical (defeats the proof) — owned by `skl-test-integrity-auditor`.
- **New regression** anywhere in the suite → at least High.
- **No reproduction test** for a code-testable bug → High via `skl-test-integrity-auditor`.

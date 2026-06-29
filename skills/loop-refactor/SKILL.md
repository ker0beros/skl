---
name: loop-refactor
description: "Autonomously refactor a codebase toward its declared architecture. Maps the code organization from the constitution (researching best practices and stopping for your sign-off to seed it if the constitution is silent), uses a refactoring-specialist agent to audit deviations into a prioritized backlog, then refactors each item through the speckit workflow (plan→tasks→analyze→checklist) with the refactoring-specialist carrying out the behavior-preserving transformation, QA-gates it, commits on a review branch, and loops — re-auditing until no Critical/High refactors remain and all gates are green."
argument-hint: "(optional) a path / package / theme to scope the refactor — empty = whole codebase; add --auto for zero prompts (auto-seeds the constitution org if missing)"
compatibility: "Requires the .specify/ spec-kit structure, the speckit-* skills, and the agents in .claude/agents/ (the QA panel — Jenny, karen, claude-md-compliance-checker, code-quality-pragmatist, task-completion-validator, ui-comprehensive-tester, ultrathink-debugger — plus the refactoring-specialist, which audits the code and performs the behavior-preserving refactors). Surface + gate commands come from resources/project.config.md (written by install.sh)."
metadata:
  author: "khairul"
  version: "1.0.0"
  source: "skills/loop-refactor"
user-invocable: true
disable-model-invocation: true
---

## User Input

```text
$ARGUMENTS
```

If non-empty, treat the input as a **scope** (a path, package, or theme) to focus the refactor on. If empty, the scope is the **whole codebase**.

**`--auto`** — fully autonomous: removes the **one** human gate. If the constitution doesn't declare the code organization, `--auto` does **not** stop for sign-off — it picks the **best-practice organization it judges best** (the top web-searched recommendation for the stack), seeds the constitution with it, notes the choice, and proceeds. (Strip `--auto` from the argument before reading the scope.)

---

## What this command does

`/loop-refactor` drives an **autonomous** refactor of the codebase toward its own declared architecture, and keeps going until the code is clean enough:

- **Phase 0 — Map**: read the **target code organization from the constitution** — or, if it's silent, research best-practice organization, get your sign-off, and seed it into the constitution — then write it as the refactor target.
- **Phase 1 — Audit**: list every deviation as a prioritized **refactor backlog**.
- **Phase 2 — Loop**: refactor each backlog item through the speckit workflow, QA-gate it, commit it on a review branch, then move to the next — **re-auditing** until no Critical/High items remain and all gates are green.

It is **autonomous**, with **one** approval gate: a one-time stop in Phase 0 *if* the constitution doesn't declare the code organization — it researches best practices and asks you to sign off before seeding the constitution. After that it does **not** stop for approval between phases. **With `--auto`, even that gate is removed** — it picks the best-practice organization itself and proceeds (zero prompts). The cardinal rule is **behavior preservation**: a refactor changes structure, never observable behavior. The automated gates (analyze + tests) are the regression net; an item is only "done" when they stay green **and** its QA panel passes.

**Read `resources/project.config.md` (next to this skill) FIRST** — it carries this project's `surface_default`, gate commands (`mobile_gates` / `web_gates`), and dev-server command. Honor the project's **constitution** at `.specify/memory/constitution.md` and `CLAUDE.md` throughout — they define the target architecture you are refactoring toward.

This command does **not** use `speckit-all`; it chains the individual `speckit-*` skills directly via the Skill tool. It is a sibling of `/loop-feature` and shares the same QA agents.

---

## Phase 0 — Map (define the code organization)

1. Read `resources/project.config.md` (surface + gate commands) and the project's `.specify/memory/constitution.md` + `CLAUDE.md`.
2. Run a **parallel, read-only analysis** (Agent tool, one message): spawn the **`refactoring-specialist`** agent to detect **smells**, measure complexity, assess test coverage, and **rank refactoring priorities** (files over LOC ceilings, layer/boundary violations, duplication, dead code, cyclic dependencies, inconsistent patterns, missing tests, god-objects, leaky abstractions), and `Explore` / general agents to map the package/module layout, layering/dependency direction, and naming + file conventions. Respect the `$ARGUMENTS` scope if given. (Read-only — no code changes in this phase.) See `agents/refactoring-specialist.md`.
3. **Establish the target from the constitution.** The **code organization must be declared in `.specify/memory/constitution.md`** — that is the source of truth this refactor drives toward. Two paths:
   - **Constitution declares it** (topology / layering / package boundaries / naming / LOC budgets) → write `.loop-refactor/organization.md` as the **target**, **derived from** the constitution + CLAUDE.md + the dominant existing patterns (do **not** invent an opinionated target when the project already declares one). Include: the intended layer/package topology, the conventions, and the "definition of well-organized" this refactor drives toward. Use `resources/organization-template.md` as the shape.
   - **Constitution is silent on it** → **WebSearch** best-practice code organization for this project's stack/domain (cite the sources), synthesize a recommended organization (topology + conventions + LOC budgets, reconciled with the dominant existing patterns). Then:
     - **Default** → **present it to the user and STOP for approval** (the loop's **one human gate**). On approval (incorporate any edits the user gives), write the agreed organization into the constitution.
     - **`--auto`** → **do not stop** — adopt the **highest-confidence** recommendation from the WebSearch (the one you judge best for this stack/domain), write it into the constitution, and clearly note what you chose (in your output + `.loop-refactor/report.md`) so the user can review it later.
     Either way, write the organization **into `.specify/memory/constitution.md`** as a *Code Organization* principle, then derive `.loop-refactor/organization.md` from the now-updated constitution exactly as above. Do not proceed to Phase 1 until the constitution declares it.

## Phase 1 — Audit (the refactor backlog)

4. From the analysis (the **`refactoring-specialist`'s ranked smells** + the topology map), write `.loop-refactor/backlog.md` — a **prioritized** list (highest severity first), each item mapping a smell to its `organization.md` target: `id · title · why · files · current → target state · risk · severity (Critical/High/Medium/Low) · est. effort`. Use `resources/refactor-backlog-template.md`. No human gate — proceed straight to Phase 2.

## Phase 2 — Autonomous refactor loop

5. **Set up the review branch.** Create an integration branch `loop-refactor/<short-stamp>` off the current branch and stay on it. All passing items merge here; this branch is what the user reviews at the end. **Never push, and never merge into the default / main / dev branch.**

Then, for each backlog item, highest-severity first, with `iter = 1`:

6. **Scaffold (the audit is the spec → start at plan).** Invoke `speckit-specify` (Skill tool) **non-interactively**, seeded with the item description + the `.loop-refactor/organization.md` target state. It creates branch `NNN-refactor-<slug>` + `specs/NNN-refactor-<slug>/spec.md` off the integration tip. **Skip `speckit-clarify`** — the audit item is the spec. Record `Refactor-Item: <id>` in the spec.
7. **Build.** Plan the item with the speckit chain — `speckit-plan → speckit-tasks → speckit-analyze → speckit-checklist` (Skill tool). Then the **`refactoring-specialist`** agent (Agent tool) **carries out the refactor**: apply the planned tasks in **small, incremental, behavior-preserving** steps (run the gates/tests after each step; smallest viable change; update all call-sites; never weaken tests), moving the code to the `.loop-refactor/organization.md` target. On `iter > 1`, seed both `speckit-plan` and the agent with the previous remediation brief (`specs/<feature>/.loop-refactor/remediation-iter-<iter-1>.md`). See `agents/refactoring-specialist.md`.
8. **Gate.** Run the automated gates from `project.config.md` (the **behavior-preservation net** — e.g. `make analyze`, `make test`); if red, this round failed. Then spawn the **6 QA agents** (Agent tool, parallel) seeded per `resources/refactor-pass-matrix.md`. A gate passes with **0 Critical / 0 High / 0 Medium**, plus — by `gate_strictness` in `project.config.md` (default `standard`; toggle with `/loop-gate`) — **0 Low** in `standard`, **0 Low + 0 Info** in `strict` (run analyze fatal-on-info), or neither in `low` (Low + Info logged).
9. **Resolve the item.**
   - **All pass** → `git add -A && git commit -m "refactor(NNN): <slug>"` on the item branch; `git checkout <integration> && git merge --no-ff <item-branch>`; fire `bash ~/.claude/notify-telegram.sh "[<project>] /loop-refactor ✅ <id> <slug>"`; mark **done**; next item.
   - **Fail & `iter < 10`** → spawn `ultrathink-debugger` with the aggregated findings + failing gate output; it writes `specs/<feature>/.loop-refactor/remediation-iter-<iter>.md` (root cause + ordered, file-keyed fix list) using `resources/remediation-brief-template.md`; `iter += 1`; **go to step 7**.
   - **Fail & `iter == 10`** → mark the item **DEFERRED** (log why); `git checkout <integration>` and leave the item branch unmerged; fire `bash ~/.claude/notify-telegram.sh "[<project>] /loop-refactor ⚠️ DEFERRED <id> after 10 tries"`; next item.

## Stop condition — re-audit-clean

10. When the backlog is drained, **re-audit** the integration tip (repeat Phase 0/1 analysis, scope-limited). 
    - If it surfaces **new Critical/High** items (not already deferred) → append them to the backlog and continue the loop.
    - If it surfaces **no Critical/High** (only Low/nice-to-haves) **and** the latest automated gates + QA panel are green → write `.loop-refactor/report.md` (items done / deferred / per-iteration history / remaining Low items), fire `bash ~/.claude/notify-telegram.sh "[<project>] /loop-refactor done — <N> refactored, <M> deferred"`, present the summary + the integration branch name, and **STOP**.
    - Cap re-audit rounds at **3** as a backstop; if still not clean, stop and report what remains.

---

## Rules & invariants

- **Behavior preservation is cardinal.** Structure changes; observable behavior must not. Automated gates (analyze + tests) staying green is the proof; `karen` independently confirms by running it. Tests may be updated for moved/renamed symbols, but assertions/expectations must not be weakened to make a refactor "pass."
- **Autonomous after Phase 0** — the only approval gate is a one-time Phase 0 stop *when the constitution doesn't declare the code organization* (WebSearch best practices → user sign-off → seed the constitution). Otherwise no approval gate between phases; the user steers by interrupting and reviews the integration branch at the end. **`--auto` removes that one gate** — it auto-seeds the best-practice organization (noting the choice) and runs end-to-end with zero prompts.
- **Commit per item, never push, never merge to main/dev.** Passing items land on the `loop-refactor/*` integration branch only. The user merges when satisfied.
- **Per-item cap 10 → defer**, re-audit cap 3. Deferred items are always reported, never silently dropped.
- **Pass threshold = 0 Critical / 0 High / 0 Medium**, then by mode: `standard` (default) also requires **0 Low** (Info logged); `strict` also requires **0 Low + 0 Info** (analyze fatal-on-info); `low` requires neither (Low + Info logged). Read `gate_strictness` from `project.config.md` (missing ⇒ `standard`); toggle with `/loop-gate`. See `resources/refactor-pass-matrix.md`.
- **Telegram** prefix `[<project>]` where `<project>` is the project root dir basename; skip silently if `~/.claude/notify-telegram.sh` is absent.
- **Working files**: `.loop-refactor/` at the repo root (organization, backlog, report); per-item remediation under `specs/<feature>/.loop-refactor/`.

# spec-loop

Portable Claude Code skills for **spec-driven, QA-gated, autonomous loops** — a one-time setup
command plus two loops, sharing one QA-agent panel and one installer. Built on
[Spec Kit](https://github.com/github/spec-kit).

| Skill | Input | What it does |
|-------|-------|--------------|
| **`/loop-init`** | your **tech stack** | **Run once first.** Installs Spec Kit + verifies the QA panel, then authors the **constitution** — web-searching the best-fit code organization for you to choose |
| **`/loop-design`** | a **feature flow** to design | Brainstorms (Superpowers) a Claude Design prompt — design system + platforms (mobile/tablet/web) + screens/states — then auto-writes the plan |
| **`/loop-feature`** | a **feature** (text, or a **claude.ai/design** project for UI) | Loops until a 6-agent QA panel passes for the feature (max 10 iterations) |
| **`/loop-refactor`** | the **codebase itself** | Loops until a re-audit finds no Critical/High refactors left and all gates are green |
| **`/loop-fix`** | **bug(s)** — text or a **GitHub/GitLab issue URL** | Fetches linked issues (with your access), diagnoses each bug's root cause (Superpowers), fixes it test-first through the speckit loop, QA-gates + verifies the symptom is gone, loops until fixed-or-deferred |
| **`/loop-plan`** | a **feature** (text, or a **claude.ai/design** project for UI) | Plans only — specify + clarify (asking you questions) → a numbered, ready-to-run plan. Run it repeatedly to queue many |
| **`/loop-run`** | (optional) plan numbers / `all` | Lists ready plans, you pick one/multiple/all, then batch-runs each through the loop-feature QA loop, committing each on a review branch |
| **`/loop-gate`** | `strict` \| `standard` \| `low` | 3-stop slider (like `/effort`) for how strict the QA gates are — how far below Medium also blocks (Low / Info) |
| **`/loop-update`** | (none) | Pull the latest spec-loop from GitHub and refresh this project's skills + agents (keeps your config) |
| **`/loop-resume`** | (optional) reset time | Auto-continue a loop after Claude's usage limit resets — waits for the status-bar timer + 3 min, then resumes |
| **`/loop-help`** | (optional) command name | Lists every spec-loop command + a one-line explanation and the workflow (reads the installed skills, so it's always current) |

The build/refactor/fix loops chain the individual `speckit-*` skills (`specify → … → implement`), then
gate the result with the QA panel; a gate passes only with **0 Critical / 0 High / 0 Medium** findings
(and, per `/loop-gate`, also 0 Low and/or 0 Info). On failure, `ultrathink-debugger` turns the findings into the
next iteration's plan.

## `/loop-init` — first-time setup (run this once)

```
/loop-init [optional tech-stack hint]
```
Bootstraps a project for the loops. Installs the prerequisites (**Spec Kit** + the `speckit-*`
skills, optional Playwright), verifies the QA panel, then authors the project's **constitution**:
it asks your **tech stack**, **web-searches** the best-fit code organization (melos, clean
architecture, feature-first, …) and lets you **choose**, then runs `speckit-constitution` to encode
*code quality, testing/TDD, UX consistency, performance,* and the **chosen code organization**.
Idempotent — re-run anytime. (After a fresh Spec Kit init it stops once for a Claude Code reload,
then resumes.) The constitution it writes is what `/loop-refactor` reads as its target.

## `/loop-design` — brainstorm a Claude Design prompt, then plan

```
/loop-design [feature flow to design]
```
Upstream design ideation. Asks whether your **design system** already exists in claude.ai/design (and
helps you define one step-by-step if not), which **platforms** to design for (**mobile / tablet (iPad) /
web** — some or all), and your **feature flow**; then uses [Superpowers](https://github.com/obra/Superpowers)
`brainstorming` to expand the flow into screens / states / interactions and **writes a ready-to-paste
Claude Design prompt** (`.loop-design/<slug>/claude-design-prompt.md`). Finally it **auto-chains into
`/loop-plan`** to create the numbered, ready-to-run spec. It writes a prompt — it never writes to your
Claude Design account. Pipeline: `/loop-design` → paste prompt into claude.ai/design → `/loop-run`.

## `/loop-feature` — feature → shipped & QA-verified

```
/loop-feature <one-line intent>                              # text-only (any feature, UI or not)
/loop-feature <claude-design project name or uuid> — <intent>   # design-driven (UI)
```
The design reference is **optional** — not every feature has a UI. Generates `spec.md` (speckit
`specify` + `clarify`), **stops for your approval**, then runs
`plan → tasks → analyze → checklist → implement → QA-gates`, looping until the 6-agent panel passes.
With a design (design-driven mode) it also pulls it (read-only, via `DesignSync`), renders it as the
visual spec, and verifies design **and animation** parity (keyframe + behavior checklist). Without one
(text-only mode) it works straight from your description and skips all the visual/animation steps.

> Building **several** features? Decouple planning from execution: queue specs with **`/loop-plan`**,
> then batch-run them with **`/loop-run`** (below).

## `/loop-plan` + `/loop-run` — queue specs, then batch-run them

`/loop-feature` does one feature end-to-end. To plan a backlog and run it as a batch, split the two:

```
/loop-plan <one-line intent>                                # text-only
/loop-plan <claude-design project name or uuid> — <intent>  # design-driven (UI)
/loop-run [3 5 7 | all]
```

- **`/loop-plan`** does only the planning half — optional design ingest → `specify` → `clarify`
  (asking you questions) — and writes a **numbered, ready-to-run** spec (`Loop-Status: ready`). It
  **never builds**. Run it as many times as you want to queue plans. Same optional-design behavior as
  `/loop-feature` (design-driven or text-only).
- **`/loop-run`** lists every `ready` plan, asks which to run (**one / multiple / all**), then runs each
  through the **same QA loop as `/loop-feature`** — committing each passing plan `feat(NNN)` on a
  `loop-run/<stamp>` integration branch and moving to the next automatically. Never pushes or merges to
  main/dev; you review the branch at the end. Plans you don't select stay `ready` for later.

It reuses loop-feature's QA pass-matrix + renderer (one source of truth), so the gate is identical.

## `/loop-refactor` — codebase → cleaner codebase

```
/loop-refactor [optional scope: path / package / theme]
```
Reads the **target organization from the constitution** (if the constitution is silent on code
organization, it web-searches best practices, gets your sign-off, and seeds the constitution — the
loop's one approval gate), audits the code into a prioritized **backlog**, then **autonomously**
refactors each item through the speckit workflow, QA-gates it (behavior-preservation centric),
commits it on a `loop-refactor/*` review branch, and **re-audits** until nothing Critical/High
remains. Never pushes or merges to main/dev — you review the integration branch.

## `/loop-fix` — fix bugs by root cause

```
/loop-fix <bug(s): symptom / repro / expected-vs-actual>     # free text
/loop-fix https://github.com/OWNER/REPO/issues/123           # or a GitHub/GitLab issue URL
```
Bugs can be **plain text or a GitHub/GitLab issue URL** (incl. self-hosted GitLab). For a linked issue
it fetches the title + body + comments via the `gh` / `glab` CLI using **your** access — and if access
is missing it walks you through granting it, step by step (`resources/issue-access.md`). Then it
diagnoses each bug's **root cause** with [Superpowers](https://github.com/obra/Superpowers)
`systematic-debugging` (not the symptom), writes a prioritized **fix backlog**, then **autonomously**
fixes each bug through the speckit workflow **test-first** (a failing reproduction test → the
root-cause fix → green), QA-gates it, and **proves the symptom is gone** with Superpowers
`verification-before-completion` (fresh evidence, full suite green — no regression). Commits each fix
on a `loop-fix/*` review branch; never pushes or merges to main/dev. If the symptom still reproduces it
**re-diagnoses** rather than re-patching. Requires the **Superpowers** plugin (see Prerequisites).

## `/loop-gate` — how strict the QA gates are

```
/loop-gate [strict | standard | low]
```
A 3-stop slider (like `/effort`) that sets the QA pass threshold both loops use. **Medium and above
always block**; the mode decides how far below that also blocks, down the ladder
*Critical › High › Medium › Low › Info* (Info = info-level lint diagnostics):

- **strict** — passes only at *0 Critical / High / Medium / Low / Info*; even info-level lints must be
  clean (the analyze gate runs fatal-on-info, not merely exit 0).
- **standard** *(default)* — passes at *0 Critical / High / Medium / Low*; **Info** is logged, non-blocking.
- **low** — passes at *0 Critical / High / Medium*; **Low + Info** are logged, non-blocking (fastest to converge).

Writes `gate_strictness` into each skill's `project.config.md`; takes effect on the next loop run.

## `/loop-resume` — auto-continue after a usage-limit reset

```
/loop-resume [reset time from the status bar, e.g. 2h15m]
```
Long `/loop-feature` / `/loop-refactor` runs can hit Claude's 5-hour or weekly cap and stop mid-flight.
When the rate-limit alert fires, run `/loop-resume`: it reads the reset time from the **status-bar
timer**, waits until **reset + 3 min** (a safety buffer), then re-invokes the loop so it continues
where it left off. The wait is in-session via `ScheduleWakeup` (re-arming hourly for multi-hour
resets), so the same loop resumes in the same context — the loops pick up from their working files.

## What's in here

```
agents/               # 7 QA subagents (shared by the loops)
skills/loop-init/     # SKILL.md + resources/ (code-org playbook) — one-time setup + constitution
skills/loop-design/   # SKILL.md + resources/ (design-system checklist + Claude Design prompt template)
skills/loop-gate/     # SKILL.md — strict|standard|low QA-gate slider (sets gate_strictness)
skills/loop-update/   # SKILL.md — pull latest from GitHub + re-install (keeps project.config.md)
skills/loop-resume/   # SKILL.md — auto-continue a loop after a usage-limit reset
skills/loop-feature/  # SKILL.md + resources/ (pass-matrix, render-keyframes.mjs, templates, config example)
skills/loop-refactor/ # SKILL.md + resources/ (organization + backlog + pass-matrix + remediation templates)
skills/loop-fix/      # SKILL.md + resources/ (fix backlog + fix pass-matrix + remediation templates)
skills/loop-plan/     # SKILL.md — plan only (specify + clarify), queue ready-to-run plans
skills/loop-run/      # SKILL.md + resources/ (run-report) — batch-run ready plans (reuses loop-feature's gate)
skills/loop-help/     # SKILL.md — lists all commands + the workflow (reads installed skills)
install.sh            # installs all skills + the agents into a target, stamping its gate commands
```

The 6 gate agents — `Jenny` (spec/target compliance), `claude-md-compliance-checker`,
`code-quality-pragmatist`, `karen` (reality check), `task-completion-validator`,
`ui-comprehensive-tester` — plus `ultrathink-debugger` (the failure-time fixer).

## Prerequisites (on the target project)

- **Spec Kit** — `.specify/` + the `speckit-*` skills. The loops orchestrate these.
  `/loop-init` installs this for you; or init by hand with
  `uvx --from git+https://github.com/github/spec-kit.git specify init --here`
- **Superpowers** *(loop-fix + loop-design)* — the [obra/Superpowers](https://github.com/obra/Superpowers)
  plugin: `loop-fix` uses `systematic-debugging` + `verification-before-completion`, `loop-design` uses
  `brainstorming`. Install in Claude Code: `/plugin marketplace add obra/superpowers-marketplace` then
  `/plugin install superpowers@superpowers-marketplace` (or `…@claude-plugins-official`), then reload.
  `/loop-init` checks for it.
- **Design access** *(design-driven loop-feature only)* — the `DesignSync` tool / claude.ai login
  (`/design-login`). Not needed for text-only features.
- **Playwright** *(design-driven loop-feature, web surfaces only)* — for rendering the design reference
  + web parity. Mobile / refactor / text-only work doesn't need it.

## Install

```bash
# from anywhere:
~/Documents/spec-loop/install.sh /path/to/your/project

# or from inside the target:
cd /path/to/your/project && ~/Documents/spec-loop/install.sh
```

The installer auto-detects the surface (web / mobile / both) and gate commands (Makefile targets →
melos → flutter / npm), then writes `.claude/skills/<skill>/resources/project.config.md` into each
skill. Override anything:

```bash
install.sh /path/to/project --surface mobile --analyze-cmd "make analyze" --test-cmd "make test"
install.sh /path/to/project --with-playwright      # bootstrap Playwright into loop-feature (any project)
install.sh /path/to/project --force                # overwrite files that differ
install.sh /path/to/project --agents-global        # agents → ~/.claude/agents (shared across projects)
```

After installing:

1. **Install the Superpowers plugin** (needed by `/loop-fix`) — in Claude Code, run:
   ```
   /plugin marketplace add obra/superpowers-marketplace
   /plugin install superpowers@superpowers-marketplace
   ```
   (or `/plugin install superpowers@claude-plugins-official`). It's a `/plugin` command, so it can't be
   installed by `install.sh` — do it in the Claude Code session.
2. **Reload Claude Code** in the target so the new skills (`/loop-init`, `/loop-feature`,
   `/loop-refactor`, `/loop-fix`, `/loop-gate`, `/loop-update`, `/loop-resume`), the agents, and the
   Superpowers plugin all register.
3. Run **`/loop-init`** first to set up Spec Kit and author the constitution (it also checks that
   Superpowers is present).

### Remote install (no local checkout)

Clone-to-cache and run in one line — uses your existing git/GitHub auth, so it works on the private
repo. Re-running updates the cache first, so this doubles as the update command:

```bash
{ [ -d ~/.spec-loop ] && git -C ~/.spec-loop pull -q || gh repo clone ker0beros/spec-loop ~/.spec-loop; } \
  && ~/.spec-loop/install.sh "$PWD"
```

> A bare `curl … install.sh | bash` is **not** offered: the repo is private (the raw URL needs a
> token) and the installer needs the bundled `agents/` + `skills/` beside it, which a piped script
> lacks. The clone-to-cache one-liner above is the equivalent that actually works.

## Per-project config

`install.sh` generates `resources/project.config.md` (from `project.config.example.md`) into **each**
skill. The skills read it at runtime for `surface_default`, the `mobile_gates` / `web_gates`
commands, and the `web_dev_server`. Edit by hand anytime; re-running the installer keeps your edits
unless you pass `--force`.

## Updating

From inside a project that already has spec-loop installed, just run **`/loop-update`** — it refreshes
the clone-to-cache (`~/.spec-loop`), shows what's new, and re-installs with `--update` (skills + agents
to latest, **keeping** each `project.config.md`). Reload Claude Code afterward.

By hand, the equivalent is the clone-to-cache one-liner followed by `--update`:

```bash
{ [ -d ~/.spec-loop ] && git -C ~/.spec-loop pull -q || gh repo clone ker0beros/spec-loop ~/.spec-loop; } \
  && ~/.spec-loop/install.sh "$PWD" --update
```

`--update` overwrites the skill + agent files but **preserves** your config; `--force` overwrites
everything **including** regenerating `project.config.md`.

## Credits

QA agents are vendored from [darcyegb/ClaudeCodeAgents](https://github.com/darcyegb/ClaudeCodeAgents).

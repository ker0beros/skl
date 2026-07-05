# skl

Portable Claude Code skills for **spec-driven, QA-gated, autonomous loops** — a one-time setup
command plus two loops, sharing one QA-agent panel and one installer. Built on
[Spec Kit](https://github.com/github/spec-kit) and the
[loop-engineering](https://github.com/cobusgreyling/loop-engineering) methodology — skl is an
implementation of its five-building-blocks + memory framework (automations, worktrees, skills,
plugins/MCP, sub-agents, durable state), with phased **L1→L2→L3** autonomy rollout, human safety
gates, transparent cost budgeting, and readiness scoring baked into the loops and the constitution.

| Skill | Input | What it does |
|-------|-------|--------------|
| **`/skl-init`** | your **tech stack** | **Run once first.** Installs Spec Kit + verifies the QA panel, then authors the **constitution** — web-searching the best-fit code organization for you to choose |
| **`/skl-design`** | a **feature flow** to design | Brainstorms (Superpowers) a Claude Design prompt — design system + platforms (mobile/tablet/web) + screens/states — then auto-writes the plan |
| **`/skl-feature`** | a **feature** (text, or a **claude.ai/design** project for UI) | Loops until an 8-agent QA panel passes for the feature (max 10 iterations) |
| **`/skl-refactor`** | the **codebase itself** | Loops until a re-audit finds no Critical/High refactors left and all gates are green |
| **`/skl-fix`** | **bug(s)** — text or a **GitHub/GitLab issue URL** | Fetches linked issues (with your access), diagnoses each bug's root cause (Superpowers), fixes it test-first through the speckit loop, QA-gates + verifies the symptom is gone, loops until fixed-or-deferred |
| **`/skl-create-ticket`** | a **rough issue** to file | Drafts a structured ticket in the repo's house style, then after a **Create/Edit/Cancel** gate files it on **GitHub / GitLab / Jira** (auto-detects the provider from the git remote) |
| **`/skl-pickup-ticket`** | (optional) **`#N`**; `--auto` / `--alive` | Drains the **`loop-ready`** issue queue oldest-first — routes each to `/skl-fix` or `/skl-feature`, QA-gates it, **opens a PR** (never merges), then the next; empty queue → polls every 30 min, exits after 3 empty (`--alive` = forever). `#N` = one ticket then stop. Drives a label lifecycle: `loop-ready → loop-in-progress → loop-done` (or `loop-deferred`) |
| **`/skl-plan`** | a **feature** (text, or a **claude.ai/design** project for UI) | Plans only — specify + clarify (asking you questions) → a numbered, ready-to-run plan. Run it repeatedly to queue many |
| **`/skl-run`** | (optional) plan numbers / `all` | Lists ready plans, you pick one/multiple/all, then batch-runs each through the skl-feature QA loop, committing each on a review branch |
| **`/skl-gate`** | `strict` \| `standard` \| `low` | 3-stop slider (like `/effort`) for how strict the QA gates are — how far below Medium also blocks (Low / Info) |
| **`/skl-update`** | (none) | Pull the latest skl from GitHub and refresh this project's skills + agents (keeps your config) |
| **`/skl-resume`** | (optional) reset time | Auto-continue a loop after Claude's usage limit resets — waits for the status-bar timer + 3 min, then resumes |
| **`/skl-help`** | (optional) command name | Lists every skl command + a one-line explanation and the workflow (reads the installed skills, so it's always current) |

The build/refactor/fix loops chain the individual `speckit-*` skills (`specify → … → implement`), then
gate the result with the QA panel; a gate passes only with **0 Critical / 0 High / 0 Medium** findings
(and, per `/skl-gate`, also 0 Low and/or 0 Info). On failure, `skl-debugger` turns the findings into the
next iteration's plan.

## `/skl-init` — first-time setup (run this once)

```
/skl-init [optional tech-stack hint]
```
Bootstraps a project for the loops. Installs the prerequisites (**Spec Kit** + the `speckit-*`
skills, optional Playwright), verifies the QA panel, then authors the project's **constitution**:
it asks your **tech stack**, **web-searches** the best-fit code organization (melos, clean
architecture, feature-first, …) and lets you **choose**, then runs `speckit-constitution` to encode
*code quality, testing/TDD, UX consistency, performance,* the **chosen code organization**, and a
**Loop Engineering** principle (the [loop-engineering](https://github.com/cobusgreyling/loop-engineering)
methodology — phased L1→L2→L3 autonomy, human safety gates, cost budgeting, readiness scoring).
Idempotent — re-run anytime. (After a fresh Spec Kit init it stops once for a Claude Code reload,
then resumes.) The constitution it writes is what `/skl-refactor` reads as its target.

## `/skl-design` — brainstorm a Claude Design prompt, then plan

```
/skl-design [feature flow to design]
```
Upstream design ideation. Asks whether your **design system** already exists in claude.ai/design (and
helps you define one step-by-step if not), which **platforms** to design for (**mobile / tablet (iPad) /
web** — some or all), and your **feature flow**; then uses [Superpowers](https://github.com/obra/Superpowers)
`brainstorming` to expand the flow into screens / states / interactions and **writes a ready-to-paste
Claude Design prompt** (`.skl-design/<slug>/claude-design-prompt.md`). Finally it **auto-chains into
`/skl-plan`** to create the numbered, ready-to-run spec. It writes a prompt — it never writes to your
Claude Design account. Pipeline: `/skl-design` → paste prompt into claude.ai/design → `/skl-run`.

## `/skl-feature` — feature → shipped & QA-verified

```
/skl-feature <one-line intent>                              # text-only (any feature, UI or not)
/skl-feature <claude-design project name or uuid> — <intent>   # design-driven (UI)
```
The design reference is **optional** — not every feature has a UI. Generates `spec.md` (speckit
`specify` + `clarify`), **stops for your approval**, then runs
`plan → tasks → analyze → checklist → implement → QA-gates`, looping until the 8-agent panel passes.
With a design (design-driven mode) it also pulls it (read-only, via `DesignSync`), renders it as the
visual spec, and verifies design **and animation** parity (keyframe + behavior checklist). Without one
(text-only mode) it works straight from your description and skips all the visual/animation steps.

> Building **several** features? Decouple planning from execution: queue specs with **`/skl-plan`**,
> then batch-run them with **`/skl-run`** (below).

## `/skl-plan` + `/skl-run` — queue specs, then batch-run them

`/skl-feature` does one feature end-to-end. To plan a backlog and run it as a batch, split the two:

```
/skl-plan <one-line intent>                                # text-only
/skl-plan <claude-design project name or uuid> — <intent>  # design-driven (UI)
/skl-run [3 5 7 | all] [--auto]
```

- **`/skl-plan`** does only the planning half — optional design ingest → `specify` → `clarify`
  (asking you questions) → an `skl-business-analyst` cross-check of the spec against the design
  (design mode) or your intent + answers (text-only) — and writes a **numbered, ready-to-run** spec
  (`Loop-Status: ready`). It
  **never builds**. Run it as many times as you want to queue plans. Same optional-design behavior as
  `/skl-feature` (design-driven or text-only).
- **`/skl-run`** lists every `ready` plan, asks which to run (**one / multiple / all**), then runs each
  through the **same QA loop as `/skl-feature`** — committing each passing plan `feat(NNN)` on a
  `skl-run/<stamp>` integration branch and moving to the next automatically. Never pushes or merges to
  main/dev; you review the branch at the end. Plans you don't select stay `ready` for later. Add
  **`--auto`** to skip the selection prompt and run all ready plans, fully unattended.

It reuses skl-feature's QA pass-matrix + renderer (one source of truth), so the gate is identical.

## `/skl-refactor` — codebase → cleaner codebase

```
/skl-refactor [optional scope: path / package / theme] [--auto]
```
Reads the **target organization from the constitution** (if the constitution is silent on code
organization, it web-searches best practices, gets your sign-off, and seeds the constitution — the
loop's one approval gate; **`--auto`** removes even that, auto-picking the best-practice organization),
uses a `skl-refactoring-specialist` agent to audit the code into a prioritized **backlog**, then **autonomously**
refactors each item through the speckit workflow, QA-gates it (behavior-preservation centric),
commits it on a `skl-refactor/*` review branch, and **re-audits** until nothing Critical/High
remains. Never pushes or merges to main/dev — you review the integration branch.

## `/skl-fix` — fix bugs by root cause

```
/skl-fix <bug(s): symptom / repro / expected-vs-actual>     # free text
/skl-fix https://github.com/OWNER/REPO/issues/123           # or a GitHub/GitLab issue URL
```
Bugs can be **plain text or a GitHub/GitLab issue URL** (incl. self-hosted GitLab). For a linked issue
it fetches the title + body + comments via the `gh` / `glab` CLI using **your** access — and if access
is missing it walks you through granting it, step by step (`resources/issue-access.md`). Then it
diagnoses each bug's **root cause** with [Superpowers](https://github.com/obra/Superpowers)
`systematic-debugging` (not the symptom), writes a prioritized **fix backlog**, then **autonomously**
fixes each bug through the speckit workflow **test-first** (a failing reproduction test → the
root-cause fix → green), QA-gates it, and **proves the symptom is gone** with Superpowers
`verification-before-completion` (fresh evidence, full suite green — no regression). Commits each fix
on a `skl-fix/*` review branch; never pushes or merges to main/dev. If the symptom still reproduces it
**re-diagnoses** rather than re-patching. Requires the **Superpowers** plugin (see Prerequisites).

## `/skl-create-ticket` — file a ticket on GitHub / GitLab / Jira

```
/skl-create-ticket <rough description>          # auto-detects the provider from the git remote
/skl-create-ticket jira: <rough description>    # or name the provider explicitly
```
Turns a rough description into a well-structured ticket in the repo's house style, shows the full
draft, and files it **only after you pick Create** (a Create / Edit / Cancel gate — the whole point).
Auto-detects the provider from the git remote — **GitHub** (`gh`), **GitLab** (`glab`, incl.
self-hosted), or **Jira** (Atlassian MCP) — asking only when it's unsure. It never applies a `loop-*`
label: promoting an issue to **`loop-ready`** is a human decision (that queue is what `/skl-pickup-ticket`
drains).

## `/skl-pickup-ticket` — autonomously drain the `loop-ready` queue

```
/skl-pickup-ticket                 # loop the loop-ready queue, oldest first
/skl-pickup-ticket #42             # work just issue #42, then stop
/skl-pickup-ticket --auto --alive  # zero-prompt, poll forever
```
The autonomous **ticket runner**. With no number it pulls the **oldest open issue labeled
`loop-ready`**, classifies it (bug → `/skl-fix`, feature → `/skl-feature`), works it through that
QA-gated loop (max 10 iterations), **opens a PR that `Closes` the issue** — pushing a `skl-pickup/*`
branch; it **never merges** to main/dev — then picks up the next-oldest. When the queue is empty it
**waits 30 min via `ScheduleWakeup` and re-polls**; after **3 empty polls it exits** (re-run to resume),
unless **`--alive`**, which polls indefinitely. **`--auto`** runs zero-prompt (no spec-clarification
questions). A ticket that can't converge in 10 iterations is relabeled **`loop-deferred`**, commented
with the findings, and skipped — so the loop never re-picks it. An explicit **`#N`** works that one
ticket (bypassing the label gate), opens its PR, and stops.

As it works, the loop drives a **label lifecycle** on the issue so you can see each ticket's state at a
glance:

```
loop-ready ──claim──▶ loop-in-progress ──PR opened──▶ loop-done   (stays open until you merge the PR)
 (you set)            (loop working it)  └──cap hit──▶ loop-deferred (findings commented, skipped)
```

A human only ever sets **`loop-ready`**; the loop owns every transition after that. On start-up it
**resumes** any ticket left on `loop-in-progress` by an interrupted / rate-limited run *before* claiming
new `loop-ready` ones, so a crash never strands a ticket. (Missing labels are auto-created on first run.)

> **The `loop-ready` queue is the human gate.** `/skl-pickup-ticket` only *starts* work on issues a human
> has labeled `loop-ready` — it never applies that label itself (though it does drive the downstream
> `loop-in-progress` / `loop-done` / `loop-deferred` transitions). Curate the queue (label issues
> `loop-ready`, optionally filed via `/skl-create-ticket`), then let the loop drain it into reviewable
> PRs; you review + merge (`loop-done` = PR up, awaiting you). `/skl-resume` can continue a pickup loop
> after a usage-limit reset. This is the loop-engineering human-gate + PR-not-merge posture in practice.

## `/skl-gate` — how strict the QA gates are

```
/skl-gate [strict | standard | low]
```
A 3-stop slider (like `/effort`) that sets the QA pass threshold both loops use. **Medium and above
always block**; the mode decides how far below that also blocks, down the ladder
*Critical › High › Medium › Low › Info* (Info = info-level lint diagnostics):

- **strict** — passes only at *0 Critical / High / Medium / Low / Info*; even info-level lints must be
  clean (the analyze gate runs fatal-on-info, not merely exit 0).
- **standard** *(default)* — passes at *0 Critical / High / Medium / Low*; **Info** is logged, non-blocking.
- **low** — passes at *0 Critical / High / Medium*; **Low + Info** are logged, non-blocking (fastest to converge).

Writes `gate_strictness` into each skill's `project.config.md`; takes effect on the next loop run.

## `/skl-resume` — auto-continue after a usage-limit reset

```
/skl-resume [reset time from the status bar, e.g. 2h15m]
```
Long `/skl-feature` / `/skl-refactor` runs can hit Claude's 5-hour or weekly cap and stop mid-flight.
When the rate-limit alert fires, run `/skl-resume`: it reads the reset time from the **status-bar
timer**, waits until **reset + 3 min** (a safety buffer), then re-invokes the loop so it continues
where it left off. The wait is in-session via `ScheduleWakeup` (re-arming hourly for multi-hour
resets), so the same loop resumes in the same context — the loops pick up from their working files.

## What's in here

```
agents/               # 11 subagents — 8 QA gate agents + skl-debugger (failure-time) + skl-business-analyst (skl-feature/plan) + skl-refactoring-specialist (skl-refactor)
skills/skl-init/     # SKILL.md + resources/ (code-org playbook) — one-time setup + constitution
skills/skl-design/   # SKILL.md + resources/ (design-system checklist + Claude Design prompt template)
skills/skl-gate/     # SKILL.md — strict|standard|low QA-gate slider (sets gate_strictness)
skills/skl-update/   # SKILL.md — pull latest from GitHub + re-install (keeps project.config.md)
skills/skl-resume/   # SKILL.md — auto-continue a loop after a usage-limit reset
skills/skl-feature/  # SKILL.md + resources/ (pass-matrix, render-keyframes.mjs [web-only], mobile-render + no-overflow-testing [mobile], templates, config example)
skills/skl-refactor/ # SKILL.md + resources/ (organization + backlog + pass-matrix + remediation templates)
skills/skl-fix/      # SKILL.md + resources/ (fix backlog + fix pass-matrix + remediation templates)
skills/skl-create-ticket/  # SKILL.md + resources/ (providers) — file a ticket on GitHub/GitLab/Jira
skills/skl-pickup-ticket/  # SKILL.md + resources/ (pickup-loop + state template) — autonomous loop-ready → PR runner
skills/skl-plan/     # SKILL.md — plan only (specify + clarify), queue ready-to-run plans
skills/skl-run/      # SKILL.md + resources/ (run-report) — batch-run ready plans (reuses skl-feature's gate)
skills/skl-help/     # SKILL.md — lists all commands + the workflow (reads installed skills)
```

Install = pull this repo and copy `skills/` + `agents/` into your project's `.claude/` (there is no
install script). `/skl-init` then generates each skill's `project.config.md`.

The 8 gate agents — `skl-spec-auditor` (spec + task completion), `skl-guideline-auditor`
(CLAUDE.md + constitution), `skl-pragmatist` (simplicity), `skl-reality-checker` (runs it),
`skl-code-reviewer` (adversarial bug hunt), `skl-security-auditor` (security pass),
`skl-test-integrity-auditor` (test/gate tampering), `skl-ui-tester` (UI + design/animation parity) —
plus `skl-debugger` (the failure-time fixer), `skl-business-analyst` (used in `/skl-feature` +
`/skl-plan` Phase A of **both modes** to cross-check the spec against its source — the rendered
design when there is one, the intent + clarify answers text-only), and `skl-refactoring-specialist`
(used in `/skl-refactor` to audit smells and perform behavior-preserving refactors).

## Prerequisites (on the target project)

- **Loop Engineering** *(methodology — required reading + adherence, nothing to install)* — skl
  is an implementation of [cobusgreyling/loop-engineering](https://github.com/cobusgreyling/loop-engineering),
  and its principles are **required** for any autonomous / agentic / loop or scheduled-automation
  capability a skl project ships: the phased **L1 (report-only) → L2 (assisted) → L3 (unattended)**
  rollout, explicit human safety gates + denylists, transparent cost/token budgeting with a stop rule,
  and a measurable readiness score gating promotion to a higher autonomy level. `/skl-init` encodes
  these as a **Loop Engineering** principle in the constitution and every loop's QA compliance gate
  enforces it.
- **Spec Kit** — `.specify/` + the `speckit-*` skills. The loops orchestrate these.
  `/skl-init` installs this for you; or init by hand with
  `uvx --from git+https://github.com/github/spec-kit.git specify init --here`
- **Superpowers** *(skl-fix + skl-design)* — the [obra/Superpowers](https://github.com/obra/Superpowers)
  plugin: `skl-fix` uses `systematic-debugging` + `verification-before-completion`, `skl-design` uses
  `brainstorming`. Install in Claude Code: `/plugin marketplace add obra/superpowers-marketplace` then
  `/plugin install superpowers@superpowers-marketplace` (or `…@claude-plugins-official`), then reload.
  `/skl-init` checks for it.
- **Design access** *(design-driven skl-feature only)* — the `DesignSync` tool / claude.ai login
  (`/design-login`). Not needed for text-only features.
- **Playwright** *(design-driven skl-feature, web surfaces only)* — for rendering the design reference
  + web parity. Mobile / refactor / text-only work doesn't need it.

## Install

Installation **pulls the repo from GitHub** and copies the skills + agents into your project's
`.claude/` — there is no install script. Uses your existing git/GitHub auth (the repo is private). From
**inside the target project**:

```bash
# clone-to-cache (or refresh it), then copy skills + agents into this project's .claude/
{ [ -d ~/.skl ] && git -C ~/.skl fetch -q origin && git -C ~/.skl reset -q --hard origin/main \
   || gh repo clone ker0beros/skl ~/.skl; } \
  && mkdir -p .claude/skills .claude/agents \
  && rsync -a --exclude=project.config.md ~/.skl/skills/ .claude/skills/ \
  && rsync -a ~/.skl/agents/ .claude/agents/
```

(Prefer agents shared across projects? `rsync -a ~/.skl/agents/ ~/.claude/agents/` instead.) The
`--exclude=project.config.md` keeps any per-project config you already have; `/skl-init` generates it
on first run.

Then:

1. **Reload Claude Code** so the skills (`/skl-init`, `/skl-feature`, `/skl-refactor`, `/skl-fix`,
   `/skl-plan`, `/skl-run`, `/skl-design`, `/skl-gate`, `/skl-update`, `/skl-resume`,
   `/skl-help`) and the agents register.
2. **Install the Superpowers plugin** (needed by `/skl-fix` + `/skl-design`) — in Claude Code:
   ```
   /plugin marketplace add obra/superpowers-marketplace
   /plugin install superpowers@superpowers-marketplace
   ```
   (or `/plugin install superpowers@claude-plugins-official`), then reload again.
3. Run **`/skl-init`** first — it sets up Spec Kit, **generates each skill's `project.config.md`**
   (auto-detecting surface + gate commands), checks Superpowers, and authors the constitution.

## Per-project config

`/skl-init` generates `resources/project.config.md` into **each** skill (auto-detecting the surface
web / mobile / both and the gate commands: Makefile targets → melos → flutter / npm). The skills read
it at runtime for `surface_default`, the `mobile_gates` / `web_gates` commands, `web_dev_server`, and
`gate_strictness` (set by `/skl-gate`). Edit by hand anytime — `/skl-init` and `/skl-update` never
overwrite an existing `project.config.md`.

## Updating

From inside a project that already has skl installed, just run **`/skl-update`** — it pulls
`origin/main`, shows what's new, and syncs the skill + agent files (**keeping** each
`project.config.md`). Reload Claude Code afterward.

By hand, it's the same pull-and-copy one-liner as **Install** above (the `--exclude=project.config.md`
makes it safe to re-run as an update).

Every release bumps the root `VERSION` and adds a `CHANGELOG.md` entry (rule in `CLAUDE.md`),
so `/skl-update` can show you installed → new version and exactly what changed.

## Credits

skl's design follows the **loop-engineering** methodology by Cobus Greyling
([cobusgreyling/loop-engineering](https://github.com/cobusgreyling/loop-engineering)) — the
five-building-blocks + memory framework, phased L1→L2→L3 autonomy rollout, human safety gates, and
readiness scoring, which `/skl-init` bakes into the constitution and the QA gates enforce.

The agents are skl's own. The panel's original design drew inspiration from
[darcyegb/ClaudeCodeAgents](https://github.com/darcyegb/ClaudeCodeAgents) and
[VoltAgent/awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents);
the current 8-gate panel — including the security, correctness, and test-integrity gates — follows
the agentic-review practice in Addy Osmani's
[Loop Engineering](https://addyosmani.com/blog/loop-engineering/) and
[Agentic Code Review](https://addyosmani.com/blog/agentic-code-review/) (maker/checker separation,
adversarial diff review, test-change scrutiny, driver-owned verdicts).

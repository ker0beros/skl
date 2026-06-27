# spec-loop

Portable Claude Code skills for **spec-driven, QA-gated, autonomous loops** — a one-time setup
command plus two loops, sharing one QA-agent panel and one installer. Built on
[Spec Kit](https://github.com/github/spec-kit).

| Skill | Input | What it does |
|-------|-------|--------------|
| **`/loop-init`** | your **tech stack** | **Run once first.** Installs Spec Kit + verifies the QA panel, then authors the **constitution** — web-searching the best-fit code organization for you to choose |
| **`/loop-feature`** | a **claude.ai/design** project | Loops until a 6-agent QA panel passes for the feature (max 10 iterations) |
| **`/loop-refactor`** | the **codebase itself** | Loops until a re-audit finds no Critical/High refactors left and all gates are green |
| **`/loop-gate`** | `strict` \| `standard` \| `low` | 3-stop slider (like `/effort`) for how strict the QA gates are — how far below Medium also blocks (Low / Info) |
| **`/loop-update`** | (none) | Pull the latest spec-loop from GitHub and refresh this project's skills + agents (keeps your config) |

Both loops chain the individual `speckit-*` skills (`specify → … → implement`), then gate the result
with the QA panel; a gate passes only with **0 Critical / 0 High / 0 Medium** findings (and, per
`/loop-gate`, also 0 Low and/or 0 Info). On failure, `ultrathink-debugger` turns the findings into the
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

## `/loop-feature` — design → feature

```
/loop-feature <claude-design project name or uuid> — <one-line intent>
```
Pulls the design (read-only, via `DesignSync`), generates `spec.md` (speckit `specify` + `clarify`),
renders the design as the visual spec, **stops for your approval**, then runs
`plan → tasks → analyze → checklist → implement → QA-gates`, looping until the panel passes.
Verifies design **and animation** parity (keyframe + behavior checklist).

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

## What's in here

```
agents/               # 7 QA subagents (shared by the loops)
skills/loop-init/     # SKILL.md + resources/ (code-org playbook) — one-time setup + constitution
skills/loop-gate/     # SKILL.md — strict|standard|low QA-gate slider (sets gate_strictness)
skills/loop-update/   # SKILL.md — pull latest from GitHub + re-install (keeps project.config.md)
skills/loop-feature/  # SKILL.md + resources/ (pass-matrix, render-keyframes.mjs, templates, config example)
skills/loop-refactor/ # SKILL.md + resources/ (organization + backlog + pass-matrix + remediation templates)
install.sh            # installs all skills + the agents into a target, stamping its gate commands
```

The 6 gate agents — `Jenny` (spec/target compliance), `claude-md-compliance-checker`,
`code-quality-pragmatist`, `karen` (reality check), `task-completion-validator`,
`ui-comprehensive-tester` — plus `ultrathink-debugger` (the failure-time fixer).

## Prerequisites (on the target project)

- **Spec Kit** — `.specify/` + the `speckit-*` skills. The loops orchestrate these.
  `/loop-init` installs this for you; or init by hand with
  `uvx --from git+https://github.com/github/spec-kit.git specify init --here`
- **Design access** *(loop-feature only)* — the `DesignSync` tool / claude.ai login (`/design-login`).
- **Playwright** *(loop-feature, web surfaces only)* — for rendering the design reference + web parity.
  Mobile / refactor work doesn't need it.

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

After installing, **reload Claude Code** in the target so the new skills (`/loop-init`,
`/loop-feature`, `/loop-refactor`, `/loop-gate`, `/loop-update`) and the agents register — then run
**`/loop-init`** first to set up Spec Kit and author the constitution.

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

# spec-loop

Two portable Claude Code skills for **spec-driven, QA-gated, autonomous loops** — sharing one
QA-agent panel and one installer. Built on [Spec Kit](https://github.com/github/spec-kit).

| Skill | Input | Loops until |
|-------|-------|-------------|
| **`/go-loop`** | a **claude.ai/design** project | a 6-agent QA panel passes for the feature (max 10 iterations) |
| **`/refactor-loop`** | the **codebase itself** | a re-audit finds no Critical/High refactors left and all gates are green |

Both chain the individual `speckit-*` skills (`specify → … → implement`), then gate the result with
the QA panel; a gate passes only with **0 Critical / 0 High / 0 Medium** findings. On failure,
`ultrathink-debugger` turns the findings into the next iteration's plan.

## `/go-loop` — design → feature

```
/go-loop <claude-design project name or uuid> — <one-line intent>
```
Pulls the design (read-only, via `DesignSync`), generates `spec.md` (speckit `specify` + `clarify`),
renders the design as the visual spec, **stops for your approval**, then runs
`plan → tasks → analyze → checklist → implement → QA-gates`, looping until the panel passes.
Verifies design **and animation** parity (keyframe + behavior checklist).

## `/refactor-loop` — codebase → cleaner codebase

```
/refactor-loop [optional scope: path / package / theme]
```
Analyzes the code and defines the **target organization** (from the constitution + CLAUDE.md +
dominant patterns), audits it into a prioritized **backlog**, then **autonomously** refactors each
item through the speckit workflow, QA-gates it (behavior-preservation centric), commits it on a
`refactor-loop/*` review branch, and **re-audits** until nothing Critical/High remains. Never pushes
or merges to main/dev — you review the integration branch.

## What's in here

```
agents/              # 7 QA subagents (shared by both skills)
skills/go-loop/      # SKILL.md + resources/ (pass-matrix, render-keyframes.mjs, templates, config example)
skills/refactor-loop/# SKILL.md + resources/ (organization + backlog + pass-matrix + remediation templates)
install.sh           # installs both skills + the agents into a target, stamping its gate commands
```

The 6 gate agents — `Jenny` (spec/target compliance), `claude-md-compliance-checker`,
`code-quality-pragmatist`, `karen` (reality check), `task-completion-validator`,
`ui-comprehensive-tester` — plus `ultrathink-debugger` (the failure-time fixer).

## Prerequisites (on the target project)

- **Spec Kit** — `.specify/` + the `speckit-*` skills. Both skills orchestrate these.
  Init with: `uvx --from git+https://github.com/github/spec-kit.git specify init --here`
- **Design access** *(go-loop only)* — the `DesignSync` tool / claude.ai login (`/design-login`).
- **Playwright** *(go-loop, web surfaces only)* — for rendering the design reference + web parity.
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
install.sh /path/to/project --with-playwright      # bootstrap Playwright into go-loop (any project)
install.sh /path/to/project --force                # overwrite files that differ
install.sh /path/to/project --agents-global        # agents → ~/.claude/agents (shared across projects)
```

After installing, **reload Claude Code** in the target so `/go-loop`, `/refactor-loop`, and the
agents register.

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

Pull this repo (or re-run the remote one-liner), then `install.sh <project> --force` to refresh the
skills + agents. Your `project.config.md` files are preserved unless `--force` is given.

## Credits

QA agents are vendored from [darcyegb/ClaudeCodeAgents](https://github.com/darcyegb/ClaudeCodeAgents).

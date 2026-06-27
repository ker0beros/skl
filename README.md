# go-loop

A portable Claude Code skill that turns a **claude.ai/design** project into a spec-driven,
implemented, and **QA-gated** feature — and auto-iterates until a panel of QA agents all pass.

```
/go-loop <claude-design project name or uuid> — <one-line intent of what to build>
```

It runs in three stages:

1. **Ingest** — pull the design (read-only, via the `DesignSync` tool) and decide which feature it maps to.
2. **Spec + review gate** — generate `spec.md` (speckit `specify` + `clarify`), capture the rendered design as the visual spec, then **stop for your approval**.
3. **Autonomous QA loop** — on approval, run `plan → tasks → analyze → checklist → implement → gates`. If the 6-agent QA panel doesn't all pass, hand the findings to `ultrathink-debugger`, fold its remediation brief into the next `plan`, and loop — **max 10 iterations**.

A gate **passes** only with **0 Critical / 0 High / 0 Medium** findings.

## What's in here

```
agents/              # 7 QA subagents (from github.com/darcyegb/ClaudeCodeAgents)
skills/go-loop/      # the skill (SKILL.md) + resources/ (pass-matrix, render helper, templates, config example)
install.sh           # installs the above into a target project + stamps its gate commands
```

The 6 gate agents — `Jenny` (spec compliance), `claude-md-compliance-checker`, `code-quality-pragmatist`,
`karen` (reality check), `task-completion-validator`, `ui-comprehensive-tester` (UI + design/animation parity) —
plus `ultrathink-debugger`, which synthesizes failing findings into the next plan iteration.

## Prerequisites (on the target project)

- **Spec Kit** — `.specify/` + the `speckit-*` skills. go-loop is a thin orchestrator over them.
  Init with: `uvx --from git+https://github.com/github/spec-kit.git specify init --here`
- **Design access** — the `DesignSync` tool / claude.ai login (run `/design-login` once if needed).
- **Playwright** *(web only)* — for rendering the HTML design reference and driving web parity.
  Not needed for mobile-only projects (they use Mobile MCP / Flutter integration screenshots).

## Install

```bash
# from anywhere:
~/Documents/go-loop/install.sh /path/to/your/project

# or from inside the target:
cd /path/to/your/project && ~/Documents/go-loop/install.sh
```

The installer auto-detects the surface (web / mobile / both) and gate commands (Makefile targets →
melos → flutter / npm), then writes `.claude/skills/go-loop/resources/project.config.md` with them.
Override anything:

```bash
install.sh /path/to/project --surface mobile --analyze-cmd "make analyze" --test-cmd "make test"
install.sh /path/to/project --with-playwright      # bootstrap Playwright into the skill (any project)
install.sh /path/to/project --force                # overwrite files that differ
install.sh /path/to/project --agents-global        # agents → ~/.claude/agents (shared across projects)
```

After installing, **reload Claude Code** in the target so `/go-loop` and the agents register.

### Remote install (no local checkout)

Clone-to-cache and run in one line — uses your existing git/GitHub auth, so it works on the
private repo. Re-running updates the cache first, so this doubles as the update command:

```bash
{ [ -d ~/.go-loop ] && git -C ~/.go-loop pull -q || gh repo clone ker0beros/go-loop ~/.go-loop; } \
  && ~/.go-loop/install.sh "$PWD"
```

Pass a target + flags as usual, e.g. `~/.go-loop/install.sh /path/to/project --surface mobile`.

> A bare `curl … install.sh | bash` is **not** offered: the repo is private (the raw URL needs a
> token) and the installer needs the bundled `agents/` + `skills/` beside it, which a piped script
> lacks. The clone-to-cache one-liner above is the equivalent that actually works.

## Per-project config

`install.sh` generates `resources/project.config.md` from `project.config.example.md`. The skill reads
it at runtime for `surface_default`, the `mobile_gates` / `web_gates` commands, and the `web_dev_server`.
Edit it by hand anytime; re-running the installer keeps your edits unless you pass `--force`.

## Updating

Pull this repo, then re-run `install.sh <project> --force` to refresh the skill + agents. Your
`project.config.md` is preserved unless `--force` is given.

## Credits

QA agents are vendored from [darcyegb/ClaudeCodeAgents](https://github.com/darcyegb/ClaudeCodeAgents).
